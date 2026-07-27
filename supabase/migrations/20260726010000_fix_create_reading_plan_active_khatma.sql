-- Update create_reading_plan to handle active-khatma collisions explicitly.

CREATE OR REPLACE FUNCTION public.create_reading_plan(
  p_start_page smallint,
  p_daily_pages smallint,
  p_sessions jsonb,
  p_timezone text,
  p_effective_from date
)
RETURNS TABLE(plan_id uuid, khatma_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
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
  v_order int;
  v_time_text text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_uid::text)::bigint);

  IF p_start_page IS NULL OR p_start_page < 1 OR p_start_page > 604 THEN
    RAISE EXCEPTION 'INVALID_START_PAGE' USING ERRCODE = 'P0001';
  END IF;

  IF p_daily_pages IS NULL OR p_daily_pages < 1 OR p_daily_pages > 604 THEN
    RAISE EXCEPTION 'INVALID_DAILY_PAGES' USING ERRCODE = 'P0001';
  END IF;

  IF p_timezone IS NULL OR char_length(trim(p_timezone)) = 0 THEN
    RAISE EXCEPTION 'INVALID_TIMEZONE' USING ERRCODE = 'P0001';
  END IF;

  IF p_effective_from IS NULL THEN
    RAISE EXCEPTION 'INVALID_EFFECTIVE_DATE' USING ERRCODE = 'P0001';
  END IF;

  IF pg_catalog.jsonb_typeof(p_sessions) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'INVALID_SESSIONS' USING ERRCODE = 'P0001';
  END IF;

  SELECT pg_catalog.jsonb_array_length(p_sessions) INTO v_sessions_count;
  IF v_sessions_count < 1 OR v_sessions_count > 6 THEN
    RAISE EXCEPTION 'INVALID_SESSIONS' USING ERRCODE = 'P0001';
  END IF;

  IF v_sessions_count > p_daily_pages THEN
    RAISE EXCEPTION 'INVALID_SESSIONS' USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_exists FROM public.profiles WHERE id = v_uid;
  IF v_exists IS NULL THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_exists FROM public.reading_plans WHERE user_id = v_uid AND status = 'active' LIMIT 1;
  IF v_exists IS NOT NULL THEN
    RAISE EXCEPTION 'ACTIVE_PLAN_EXISTS' USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_exists FROM public.khatmas WHERE user_id = v_uid AND status = 'active' LIMIT 1;
  IF v_exists IS NOT NULL THEN
    RAISE EXCEPTION 'ACTIVE_PLAN_EXISTS' USING ERRCODE = 'P0001';
  END IF;

  v_prev_time := NULL;
  FOR v_i IN 0 .. pg_catalog.jsonb_array_length(p_sessions)-1 LOOP
    v_item := p_sessions->v_i;
    v_order := (v_item->>'sessionOrder')::int;
    v_time_text := v_item->>'scheduledTime';

    IF v_order IS NULL OR v_order < 1 OR v_order > 6 THEN
      RAISE EXCEPTION 'INVALID_SESSIONS' USING ERRCODE = 'P0001';
    END IF;

    IF v_order <> v_i + 1 THEN
      RAISE EXCEPTION 'INVALID_SESSIONS' USING ERRCODE = 'P0001';
    END IF;

    IF v_time_text IS NULL OR v_time_text !~ '^[0-2][0-9]:[0-5][0-9]$' THEN
      RAISE EXCEPTION 'INVALID_SCHEDULE' USING ERRCODE = 'P0001';
    END IF;

    BEGIN
      PERFORM (v_time_text::time);
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'INVALID_SCHEDULE' USING ERRCODE = 'P0001';
    END;

    IF v_prev_time IS NOT NULL THEN
      IF (v_time_text::time) <= v_prev_time THEN
        RAISE EXCEPTION 'INVALID_SCHEDULE' USING ERRCODE = 'P0001';
      END IF;
    END IF;
    v_prev_time := v_time_text::time;
  END LOOP;

  INSERT INTO public.reading_plans(user_id, start_page, current_unread_page, daily_pages, sessions_per_day, timezone, effective_from)
  VALUES (v_uid, p_start_page, p_start_page, p_daily_pages, v_sessions_count, p_timezone, p_effective_from)
  RETURNING id INTO v_plan_id;

  FOR v_i IN 0 .. pg_catalog.jsonb_array_length(p_sessions)-1 LOOP
    v_item := p_sessions->v_i;
    INSERT INTO public.plan_schedule_times(plan_id, session_order, scheduled_time)
    VALUES (v_plan_id, (v_item->>'sessionOrder')::int, (v_item->>'scheduledTime')::time);
  END LOOP;

  SELECT pg_catalog.coalesce(MAX(cycle_number),0) + 1 INTO v_cycle_num FROM public.khatmas WHERE user_id = v_uid;

  INSERT INTO public.khatmas(user_id, reading_plan_id, cycle_number, status, start_page)
  VALUES (v_uid, v_plan_id, v_cycle_num, 'active', p_start_page)
  RETURNING id INTO v_khatma_id;

  plan_id := v_plan_id;
  khatma_id := v_khatma_id;
  RETURN NEXT;
EXCEPTION WHEN others THEN
  IF SQLERRM LIKE '%UNAUTHENTICATED%' THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = 'P0001';
  ELSIF SQLERRM LIKE '%PROFILE_NOT_FOUND%' THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND' USING ERRCODE = 'P0001';
  ELSIF SQLERRM LIKE '%ACTIVE_PLAN_EXISTS%' THEN
    RAISE EXCEPTION 'ACTIVE_PLAN_EXISTS' USING ERRCODE = 'P0001';
  ELSIF SQLERRM LIKE '%idx_khatmas_unique_active_per_user%' THEN
    RAISE EXCEPTION 'ACTIVE_PLAN_EXISTS' USING ERRCODE = 'P0001';
  ELSIF SQLERRM LIKE '%INVALID_START_PAGE%' THEN
    RAISE EXCEPTION 'INVALID_START_PAGE' USING ERRCODE = 'P0001';
  ELSIF SQLERRM LIKE '%INVALID_DAILY_PAGES%' THEN
    RAISE EXCEPTION 'INVALID_DAILY_PAGES' USING ERRCODE = 'P0001';
  ELSIF SQLERRM LIKE '%INVALID_SESSIONS%' THEN
    RAISE EXCEPTION 'INVALID_SESSIONS' USING ERRCODE = 'P0001';
  ELSIF SQLERRM LIKE '%INVALID_SCHEDULE%' THEN
    RAISE EXCEPTION 'INVALID_SCHEDULE' USING ERRCODE = 'P0001';
  ELSIF SQLERRM LIKE '%INVALID_TIMEZONE%' THEN
    RAISE EXCEPTION 'INVALID_TIMEZONE' USING ERRCODE = 'P0001';
  ELSIF SQLERRM LIKE '%INVALID_EFFECTIVE_DATE%' THEN
    RAISE EXCEPTION 'INVALID_EFFECTIVE_DATE' USING ERRCODE = 'P0001';
  ELSE
    RAISE EXCEPTION 'INTERNAL_ERROR' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.create_reading_plan(smallint, smallint, jsonb, text, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_reading_plan(smallint, smallint, jsonb, text, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_reading_plan(smallint, smallint, jsonb, text, date) TO authenticated;
