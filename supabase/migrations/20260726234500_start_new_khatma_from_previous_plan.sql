CREATE OR REPLACE FUNCTION public.start_new_khatma_from_previous_plan(
  p_effective_from date
)
RETURNS TABLE (
  plan_id uuid,
  khatma_id uuid,
  cycle_number integer,
  effective_from date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_profile_id uuid;
  v_existing_id uuid;
  v_previous_plan public.reading_plans%ROWTYPE;
  v_previous_khatma public.khatmas%ROWTYPE;
  v_plan_id uuid;
  v_khatma_id uuid;
  v_cycle_number integer;
  v_local_today date;
  v_schedule_count integer;
  v_min_order smallint;
  v_max_order smallint;
  v_distinct_order_count integer;
  v_distinct_time_count integer;
  v_previous_time time;
  v_schedule record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_uid::text, 0)
  );

  SELECT p.id
  INTO v_profile_id
  FROM public.profiles AS p
  WHERE p.id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  SELECT rp.id
  INTO v_existing_id
  FROM public.reading_plans AS rp
  WHERE rp.user_id = v_uid
    AND rp.status = 'active'
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION 'ACTIVE_PLAN_EXISTS' USING ERRCODE = 'P0001';
  END IF;

  SELECT k.id
  INTO v_existing_id
  FROM public.khatmas AS k
  WHERE k.user_id = v_uid
    AND k.status = 'active'
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION 'ACTIVE_KHATMA_EXISTS' USING ERRCODE = 'P0001';
  END IF;

  SELECT rp.*
  INTO v_previous_plan
  FROM public.reading_plans AS rp
  WHERE rp.user_id = v_uid
    AND rp.status = 'completed'
  ORDER BY rp.completed_at DESC NULLS LAST, rp.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COMPLETED_PLAN_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  SELECT k.*
  INTO v_previous_khatma
  FROM public.khatmas AS k
  WHERE k.user_id = v_uid
    AND k.reading_plan_id = v_previous_plan.id
    AND k.status = 'completed'
  ORDER BY k.completed_at DESC NULLS LAST, k.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COMPLETED_KHATMA_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  IF v_previous_plan.completed_at IS NULL
     OR v_previous_plan.current_unread_page <> 604
     OR v_previous_plan.start_page NOT BETWEEN 1 AND 604
     OR v_previous_plan.daily_pages NOT BETWEEN 1 AND 604
     OR v_previous_plan.sessions_per_day NOT BETWEEN 1 AND 6
     OR v_previous_plan.sessions_per_day > v_previous_plan.daily_pages
     OR v_previous_plan.timezone IS NULL
     OR pg_catalog.char_length(pg_catalog.btrim(v_previous_plan.timezone)) = 0
     OR v_previous_khatma.completed_at IS NULL
  THEN
    RAISE EXCEPTION 'INVALID_PREVIOUS_PLAN_CONFIGURATION'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_timezone_names AS tzn
    WHERE tzn.name = v_previous_plan.timezone
  ) THEN
    RAISE EXCEPTION 'INVALID_TIMEZONE' USING ERRCODE = 'P0001';
  END IF;

  v_local_today := (pg_catalog.now() AT TIME ZONE v_previous_plan.timezone)::date;
  IF p_effective_from IS NULL OR p_effective_from < v_local_today THEN
    RAISE EXCEPTION 'INVALID_EFFECTIVE_DATE' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pst.id
  FROM public.plan_schedule_times AS pst
  WHERE pst.plan_id = v_previous_plan.id
  FOR UPDATE;

  SELECT
    pg_catalog.count(pst.id)::integer,
    pg_catalog.min(pst.session_order)::smallint,
    pg_catalog.max(pst.session_order)::smallint,
    pg_catalog.count(DISTINCT pst.session_order)::integer,
    pg_catalog.count(DISTINCT pst.scheduled_time)::integer
  INTO
    v_schedule_count,
    v_min_order,
    v_max_order,
    v_distinct_order_count,
    v_distinct_time_count
  FROM public.plan_schedule_times AS pst
  WHERE pst.plan_id = v_previous_plan.id;

  IF v_schedule_count <> v_previous_plan.sessions_per_day
     OR v_min_order <> 1
     OR v_max_order <> v_previous_plan.sessions_per_day
     OR v_distinct_order_count <> v_previous_plan.sessions_per_day
     OR v_distinct_time_count <> v_previous_plan.sessions_per_day
  THEN
    RAISE EXCEPTION 'INVALID_PREVIOUS_PLAN_CONFIGURATION'
      USING ERRCODE = 'P0001';
  END IF;

  v_previous_time := NULL;
  FOR v_schedule IN
    SELECT pst.session_order, pst.scheduled_time
    FROM public.plan_schedule_times AS pst
    WHERE pst.plan_id = v_previous_plan.id
    ORDER BY pst.session_order
  LOOP
    IF v_previous_time IS NOT NULL
       AND v_schedule.scheduled_time <= v_previous_time
    THEN
      RAISE EXCEPTION 'INVALID_PREVIOUS_PLAN_CONFIGURATION'
        USING ERRCODE = 'P0001';
    END IF;
    v_previous_time := v_schedule.scheduled_time;
  END LOOP;

  INSERT INTO public.reading_plans (
    user_id,
    status,
    start_page,
    current_unread_page,
    daily_pages,
    sessions_per_day,
    timezone,
    effective_from,
    paused_at,
    completed_at,
    replaced_at
  )
  VALUES (
    v_uid,
    'active',
    1,
    1,
    v_previous_plan.daily_pages,
    v_previous_plan.sessions_per_day,
    v_previous_plan.timezone,
    p_effective_from,
    NULL,
    NULL,
    NULL
  )
  RETURNING reading_plans.id INTO v_plan_id;

  INSERT INTO public.plan_schedule_times (
    plan_id,
    session_order,
    scheduled_time
  )
  SELECT
    v_plan_id,
    pst.session_order,
    pst.scheduled_time
  FROM public.plan_schedule_times AS pst
  WHERE pst.plan_id = v_previous_plan.id
  ORDER BY pst.session_order;

  SELECT COALESCE(pg_catalog.max(k.cycle_number), 0) + 1
  INTO v_cycle_number
  FROM public.khatmas AS k
  WHERE k.user_id = v_uid;

  INSERT INTO public.khatmas (
    user_id,
    reading_plan_id,
    cycle_number,
    status,
    start_page,
    completed_at,
    abandoned_at
  )
  VALUES (
    v_uid,
    v_plan_id,
    v_cycle_number,
    'active',
    1,
    NULL,
    NULL
  )
  RETURNING khatmas.id INTO v_khatma_id;

  RETURN QUERY
  SELECT
    v_plan_id,
    v_khatma_id,
    v_cycle_number,
    p_effective_from;
EXCEPTION
  WHEN SQLSTATE 'P0001' THEN
    RAISE;
  WHEN OTHERS THEN
    RAISE WARNING
      'start_new_khatma_from_previous_plan failed (SQLSTATE %)',
      SQLSTATE;
    RAISE EXCEPTION 'INTERNAL_ERROR' USING ERRCODE = 'P0001';
END;
$function$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_schedule_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khatmas ENABLE ROW LEVEL SECURITY;

REVOKE ALL
ON FUNCTION public.start_new_khatma_from_previous_plan(date)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.start_new_khatma_from_previous_plan(date)
FROM anon;

GRANT EXECUTE
ON FUNCTION public.start_new_khatma_from_previous_plan(date)
TO authenticated;
