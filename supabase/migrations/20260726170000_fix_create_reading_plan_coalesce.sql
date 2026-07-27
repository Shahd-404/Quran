-- Fix create_reading_plan:
-- COALESCE is a SQL expression and must not be schema-qualified.

CREATE OR REPLACE FUNCTION public.create_reading_plan(
  p_start_page smallint,
  p_daily_pages smallint,
  p_sessions jsonb,
  p_timezone text,
  p_effective_from date
)
RETURNS TABLE (
  plan_id uuid,
  khatma_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_exists uuid;
  v_plan_id uuid;
  v_khatma_id uuid;
  v_cycle_num integer;
  v_sessions_count integer;
  v_prev_time time;
  v_i integer := 0;
  v_item jsonb;
  v_order integer;
  v_time_text text;

  v_sqlstate text;
  v_message text;
  v_detail text;
  v_hint text;
  v_context text;
  v_constraint text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(v_uid::text)::bigint
  );

  IF p_start_page IS NULL
     OR p_start_page < 1
     OR p_start_page > 604
  THEN
    RAISE EXCEPTION 'INVALID_START_PAGE'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_daily_pages IS NULL
     OR p_daily_pages < 1
     OR p_daily_pages > 604
  THEN
    RAISE EXCEPTION 'INVALID_DAILY_PAGES'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_timezone IS NULL
     OR pg_catalog.char_length(pg_catalog.btrim(p_timezone)) = 0
  THEN
    RAISE EXCEPTION 'INVALID_TIMEZONE'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_effective_from IS NULL THEN
    RAISE EXCEPTION 'INVALID_EFFECTIVE_DATE'
      USING ERRCODE = 'P0001';
  END IF;

  IF pg_catalog.jsonb_typeof(p_sessions) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'INVALID_SESSIONS'
      USING ERRCODE = 'P0001';
  END IF;

  v_sessions_count := pg_catalog.jsonb_array_length(p_sessions);

  IF v_sessions_count < 1 OR v_sessions_count > 6 THEN
    RAISE EXCEPTION 'INVALID_SESSIONS'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_sessions_count > p_daily_pages THEN
    RAISE EXCEPTION 'INVALID_SESSIONS'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT p.id
  INTO v_exists
  FROM public.profiles AS p
  WHERE p.id = v_uid;

  IF v_exists IS NULL THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;

  v_exists := NULL;

  SELECT rp.id
  INTO v_exists
  FROM public.reading_plans AS rp
  WHERE rp.user_id = v_uid
    AND rp.status = 'active'
  LIMIT 1;

  IF v_exists IS NOT NULL THEN
    RAISE EXCEPTION 'ACTIVE_PLAN_EXISTS'
      USING ERRCODE = 'P0001';
  END IF;

  v_exists := NULL;

  SELECT k.id
  INTO v_exists
  FROM public.khatmas AS k
  WHERE k.user_id = v_uid
    AND k.status = 'active'
  LIMIT 1;

  IF v_exists IS NOT NULL THEN
    RAISE EXCEPTION 'ACTIVE_PLAN_EXISTS'
      USING ERRCODE = 'P0001';
  END IF;

  v_prev_time := NULL;

  FOR v_i IN 0 .. v_sessions_count - 1 LOOP
    v_item := p_sessions -> v_i;

    BEGIN
      v_order := (v_item ->> 'sessionOrder')::integer;
    EXCEPTION
      WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'INVALID_SESSIONS'
          USING ERRCODE = 'P0001';
    END;

    v_time_text := v_item ->> 'scheduledTime';

    IF v_order IS NULL
       OR v_order < 1
       OR v_order > 6
       OR v_order <> v_i + 1
    THEN
      RAISE EXCEPTION 'INVALID_SESSIONS'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_time_text IS NULL
       OR v_time_text !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    THEN
      RAISE EXCEPTION 'INVALID_SCHEDULE'
        USING ERRCODE = 'P0001';
    END IF;

    BEGIN
      PERFORM v_time_text::time;
    EXCEPTION
      WHEN invalid_datetime_format
        OR datetime_field_overflow
      THEN
        RAISE EXCEPTION 'INVALID_SCHEDULE'
          USING ERRCODE = 'P0001';
    END;

    IF v_prev_time IS NOT NULL
       AND v_time_text::time <= v_prev_time
    THEN
      RAISE EXCEPTION 'INVALID_SCHEDULE'
        USING ERRCODE = 'P0001';
    END IF;

    v_prev_time := v_time_text::time;
  END LOOP;

  INSERT INTO public.reading_plans (
    user_id,
    start_page,
    current_unread_page,
    daily_pages,
    sessions_per_day,
    timezone,
    effective_from
  )
  VALUES (
    v_uid,
    p_start_page,
    p_start_page,
    p_daily_pages,
    v_sessions_count,
    pg_catalog.btrim(p_timezone),
    p_effective_from
  )
  RETURNING id INTO v_plan_id;

  FOR v_i IN 0 .. v_sessions_count - 1 LOOP
    v_item := p_sessions -> v_i;

    INSERT INTO public.plan_schedule_times (
      plan_id,
      session_order,
      scheduled_time
    )
    VALUES (
      v_plan_id,
      (v_item ->> 'sessionOrder')::integer,
      (v_item ->> 'scheduledTime')::time
    );
  END LOOP;

  -- Important fix:
  -- COALESCE must not be written as pg_catalog.coalesce.
  SELECT COALESCE(MAX(k.cycle_number), 0) + 1
  INTO v_cycle_num
  FROM public.khatmas AS k
  WHERE k.user_id = v_uid;

  INSERT INTO public.khatmas (
    user_id,
    reading_plan_id,
    cycle_number,
    status,
    start_page
  )
  VALUES (
    v_uid,
    v_plan_id,
    v_cycle_num,
    'active',
    p_start_page
  )
  RETURNING id INTO v_khatma_id;

  plan_id := v_plan_id;
  khatma_id := v_khatma_id;

  RETURN NEXT;

EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS
      v_sqlstate = RETURNED_SQLSTATE,
      v_message = MESSAGE_TEXT,
      v_detail = PG_EXCEPTION_DETAIL,
      v_hint = PG_EXCEPTION_HINT,
      v_context = PG_EXCEPTION_CONTEXT,
      v_constraint = CONSTRAINT_NAME;

    RAISE LOG
      'create_reading_plan failed user=% state=% message=% constraint=% detail=% hint=% context=%',
      v_uid,
      v_sqlstate,
      v_message,
      v_constraint,
      v_detail,
      v_hint,
      v_context;

    IF v_message IN (
      'UNAUTHENTICATED',
      'PROFILE_NOT_FOUND',
      'ACTIVE_PLAN_EXISTS',
      'INVALID_START_PAGE',
      'INVALID_DAILY_PAGES',
      'INVALID_SESSIONS',
      'INVALID_SCHEDULE',
      'INVALID_TIMEZONE',
      'INVALID_EFFECTIVE_DATE'
    ) THEN
      RAISE EXCEPTION
        USING MESSAGE = v_message, ERRCODE = 'P0001';

    ELSIF v_sqlstate = '23505'
      AND v_constraint IN (
        'idx_unique_active_plan_per_user',
        'idx_khatmas_unique_active_per_user'
      )
    THEN
      RAISE EXCEPTION 'ACTIVE_PLAN_EXISTS'
        USING ERRCODE = 'P0001';

    ELSE
      RAISE EXCEPTION 'INTERNAL_ERROR'
        USING ERRCODE = 'P0001';
    END IF;
END;
$function$;

REVOKE ALL
ON FUNCTION public.create_reading_plan(
  smallint,
  smallint,
  jsonb,
  text,
  date
)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.create_reading_plan(
  smallint,
  smallint,
  jsonb,
  text,
  date
)
FROM anon;

GRANT EXECUTE
ON FUNCTION public.create_reading_plan(
  smallint,
  smallint,
  jsonb,
  text,
  date
)
TO authenticated;