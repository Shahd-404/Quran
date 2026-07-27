CREATE OR REPLACE FUNCTION public.update_active_reading_plan_configuration(
  p_daily_pages smallint,
  p_sessions jsonb
)
RETURNS TABLE (
  plan_id uuid,
  daily_pages smallint,
  sessions_per_day smallint,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_profile_id uuid;
  v_plan_id uuid;
  v_sessions_count integer;
  v_item jsonb;
  v_index integer;
  v_session_order integer;
  v_time_text text;
  v_previous_time time;
  v_updated_at timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(v_uid::text)::bigint
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
  INTO v_plan_id
  FROM public.reading_plans AS rp
  WHERE rp.user_id = v_uid
    AND rp.status = 'active'
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACTIVE_PLAN_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  IF p_daily_pages IS NULL
     OR p_daily_pages < 1
     OR p_daily_pages > 604
  THEN
    RAISE EXCEPTION 'INVALID_DAILY_PAGES' USING ERRCODE = 'P0001';
  END IF;

  IF pg_catalog.jsonb_typeof(p_sessions) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'INVALID_SESSIONS' USING ERRCODE = 'P0001';
  END IF;

  v_sessions_count := pg_catalog.jsonb_array_length(p_sessions);
  IF v_sessions_count < 1
     OR v_sessions_count > 6
     OR v_sessions_count > p_daily_pages
  THEN
    RAISE EXCEPTION 'INVALID_SESSIONS' USING ERRCODE = 'P0001';
  END IF;

  v_previous_time := NULL;
  FOR v_index IN 0 .. v_sessions_count - 1 LOOP
    v_item := p_sessions -> v_index;

    BEGIN
      v_session_order := (v_item ->> 'sessionOrder')::integer;
    EXCEPTION
      WHEN invalid_text_representation
        OR numeric_value_out_of_range
      THEN
        RAISE EXCEPTION 'INVALID_SESSIONS' USING ERRCODE = 'P0001';
    END;

    v_time_text := v_item ->> 'scheduledTime';
    IF v_session_order IS NULL
       OR v_session_order <> v_index + 1
    THEN
      RAISE EXCEPTION 'INVALID_SESSIONS' USING ERRCODE = 'P0001';
    END IF;

    IF v_time_text IS NULL
       OR v_time_text !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    THEN
      RAISE EXCEPTION 'INVALID_SCHEDULE' USING ERRCODE = 'P0001';
    END IF;

    IF v_previous_time IS NOT NULL
       AND v_time_text::time <= v_previous_time
    THEN
      RAISE EXCEPTION 'INVALID_SCHEDULE' USING ERRCODE = 'P0001';
    END IF;
    v_previous_time := v_time_text::time;
  END LOOP;

  PERFORM pst.id
  FROM public.plan_schedule_times AS pst
  WHERE pst.plan_id = v_plan_id
  FOR UPDATE;

  UPDATE public.reading_plans AS rp
  SET
    daily_pages = p_daily_pages,
    sessions_per_day = v_sessions_count::smallint
  WHERE rp.id = v_plan_id
  RETURNING rp.updated_at INTO v_updated_at;

  DELETE FROM public.plan_schedule_times AS pst
  WHERE pst.plan_id = v_plan_id;

  FOR v_index IN 0 .. v_sessions_count - 1 LOOP
    v_item := p_sessions -> v_index;

    INSERT INTO public.plan_schedule_times (
      plan_id,
      session_order,
      scheduled_time
    )
    VALUES (
      v_plan_id,
      (v_item ->> 'sessionOrder')::smallint,
      (v_item ->> 'scheduledTime')::time
    );
  END LOOP;

  RETURN QUERY
  SELECT
    v_plan_id,
    p_daily_pages,
    v_sessions_count::smallint,
    v_updated_at;
EXCEPTION
  WHEN SQLSTATE 'P0001' THEN
    RAISE;
  WHEN OTHERS THEN
    RAISE WARNING
      'update_active_reading_plan_configuration failed (SQLSTATE %)',
      SQLSTATE;
    RAISE EXCEPTION 'INTERNAL_ERROR' USING ERRCODE = 'P0001';
END;
$function$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_schedule_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khatmas ENABLE ROW LEVEL SECURITY;

REVOKE ALL
ON FUNCTION public.update_active_reading_plan_configuration(smallint, jsonb)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.update_active_reading_plan_configuration(smallint, jsonb)
FROM anon;

GRANT EXECUTE
ON FUNCTION public.update_active_reading_plan_configuration(smallint, jsonb)
TO authenticated;
