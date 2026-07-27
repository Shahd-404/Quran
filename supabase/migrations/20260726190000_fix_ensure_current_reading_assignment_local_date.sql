-- Migration: fix ambiguous local_date references in ensure_current_reading_assignment
-- Timestamped: 2026-07-26T19:00:00

SET search_path = public, pg_catalog;

CREATE OR REPLACE FUNCTION public.ensure_current_reading_assignment()
RETURNS TABLE(
  assignment_id uuid,
  local_date date,
  created_now boolean,
  carried_over boolean,
  target_pages smallint,
  session_count smallint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_exists uuid;
  v_assignment_id uuid;
  v_local_date date;
  v_plan_id uuid;
  v_khatma_id uuid;
  v_plan_timezone text;
  v_current_unread smallint;
  v_daily_pages smallint;
  v_sessions_per_day smallint;
  v_remaining integer;
  v_assigned integer;
  v_sessions_to_use integer;
  v_base integer;
  v_remainder integer;
  v_idx integer;
  v_start_page integer;
  v_end_page integer;
  v_sched_times time[];
  v_time time;
  v_sqlstate text;
  v_message text;
  v_detail text;
  v_hint text;
  v_context text;
  -- explicit return-temporary variables
  v_created_now boolean;
  v_carried_over boolean;
  v_target_pages smallint;
  v_session_count smallint;
BEGIN
  -- Authentication
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = 'P0001';
  END IF;

  -- 1) Carry-over: oldest incomplete assignment for user
  SELECT da.id, da.local_date, da.target_pages, (SELECT count(*) FROM public.reading_sessions rs WHERE rs.daily_assignment_id = da.id) as sess_count
  INTO v_assignment_id, v_local_date, v_assigned, v_sessions_to_use
  FROM public.daily_assignments AS da
  WHERE da.user_id = v_uid AND da.status IN ('pending','in_progress')
  ORDER BY da.created_at ASC
  LIMIT 1;

  IF v_assignment_id IS NOT NULL THEN
    v_created_now := false;
    v_carried_over := true;
    v_target_pages := COALESCE(v_assigned, 0)::smallint;
    v_session_count := COALESCE(v_sessions_to_use, 0)::smallint;
    RETURN QUERY
    SELECT v_assignment_id, v_local_date, v_created_now, v_carried_over, v_target_pages, v_session_count;
    RETURN;
  END IF;

  -- Acquire advisory lock per user to serialize creation
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_uid::text)::bigint);

  -- Verify profile exists
  SELECT id INTO v_exists FROM public.profiles WHERE id = v_uid;
  IF v_exists IS NULL THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  -- Load active plan
  SELECT id, timezone, current_unread_page, daily_pages, sessions_per_day, effective_from
  INTO v_plan_id, v_plan_timezone, v_current_unread, v_daily_pages, v_sessions_per_day, v_local_date
  FROM public.reading_plans
  WHERE user_id = v_uid AND status = 'active'
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'ACTIVE_PLAN_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  -- Load active khatma for user and plan
  SELECT id INTO v_khatma_id FROM public.khatmas WHERE user_id = v_uid AND reading_plan_id = v_plan_id AND status = 'active' LIMIT 1;
  IF v_khatma_id IS NULL THEN
    RAISE EXCEPTION 'ACTIVE_KHATMA_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  -- Load schedule times
  SELECT array_agg(scheduled_time ORDER BY session_order) INTO v_sched_times
  FROM public.plan_schedule_times WHERE plan_id = v_plan_id;

  IF v_sched_times IS NULL THEN
    RAISE EXCEPTION 'INVALID_PLAN_CONFIGURATION' USING ERRCODE = 'P0001';
  END IF;

  -- Validate schedule count
  IF array_length(v_sched_times,1) IS NULL OR array_length(v_sched_times,1) <> v_sessions_per_day THEN
    RAISE EXCEPTION 'INVALID_PLAN_CONFIGURATION' USING ERRCODE = 'P0001';
  END IF;

  -- Compute local date in plan timezone
  v_local_date := (now() AT TIME ZONE v_plan_timezone)::date;

  -- Plan effective_from check
  IF (SELECT effective_from FROM public.reading_plans WHERE id = v_plan_id) > v_local_date THEN
    RAISE EXCEPTION 'PLAN_NOT_EFFECTIVE' USING ERRCODE = 'P0001';
  END IF;

  -- If assignment exists for today for the active plan, return it
  SELECT da.id, da.local_date, da.target_pages, (SELECT count(*) FROM public.reading_sessions rs WHERE rs.daily_assignment_id = da.id)
  INTO v_assignment_id, v_local_date, v_assigned, v_sessions_to_use
  FROM public.daily_assignments AS da
  WHERE da.reading_plan_id = v_plan_id AND da.local_date = v_local_date
  LIMIT 1;

  IF v_assignment_id IS NOT NULL THEN
    v_created_now := false;
    v_carried_over := false;
    v_target_pages := COALESCE(v_assigned, 0)::smallint;
    v_session_count := COALESCE(v_sessions_to_use, 0)::smallint;
    RETURN QUERY
    SELECT v_assignment_id, v_local_date, v_created_now, v_carried_over, v_target_pages, v_session_count;
    RETURN;
  END IF;

  -- Compute remaining and assigned pages
  SELECT 604 - v_current_unread + 1 INTO v_remaining;
  IF v_remaining < 0 THEN
    v_remaining := 0;
  END IF;

  v_assigned := LEAST(v_daily_pages::integer, v_remaining);

  IF v_assigned <= 0 THEN
    -- Nothing to assign today
    RAISE EXCEPTION 'INTERNAL_ERROR' USING ERRCODE = 'P0001';
  END IF;

  v_sessions_to_use := LEAST(v_sessions_per_day::integer, v_assigned);
  v_base := v_assigned / v_sessions_to_use;
  v_remainder := v_assigned % v_sessions_to_use;

  -- Create daily_assignments row
  INSERT INTO public.daily_assignments(user_id, reading_plan_id, khatma_id, local_date, timezone, target_pages, status)
  VALUES (v_uid, v_plan_id, v_khatma_id, v_local_date, v_plan_timezone, v_assigned, 'pending')
  RETURNING id INTO v_assignment_id;

  -- Insert reading_sessions
  v_start_page := v_current_unread;
  FOR v_idx IN 1 .. v_sessions_to_use LOOP
    v_end_page := v_start_page + (v_base + CASE WHEN v_idx <= v_remainder THEN 1 ELSE 0 END) - 1;
    v_time := v_sched_times[v_idx];
    -- Build scheduled_for as timestamptz from local_date + scheduled time in plan timezone
    INSERT INTO public.reading_sessions(user_id, daily_assignment_id, session_order, start_page, end_page, scheduled_for, status)
    VALUES (
      v_uid,
      v_assignment_id,
      v_idx,
      v_start_page::smallint,
      v_end_page::smallint,
      ((v_local_date::timestamp + v_time)::timestamp) AT TIME ZONE v_plan_timezone,
      'pending'
    );
    v_start_page := v_end_page + 1;
  END LOOP;

  v_created_now := true;
  v_carried_over := false;
  v_target_pages := v_assigned::smallint;
  v_session_count := v_sessions_to_use::smallint;

  RETURN QUERY
  SELECT v_assignment_id, v_local_date, v_created_now, v_carried_over, v_target_pages, v_session_count;
  RETURN;
EXCEPTION WHEN others THEN
  GET STACKED DIAGNOSTICS
    v_sqlstate = RETURNED_SQLSTATE,
    v_message = MESSAGE_TEXT,
    v_detail = PG_EXCEPTION_DETAIL,
    v_hint = PG_EXCEPTION_HINT,
    v_context = PG_EXCEPTION_CONTEXT;

  RAISE LOG 'ensure_current_reading_assignment failure user=% state=% message=% detail=% hint=% context=%',
    v_uid, v_sqlstate, v_message, COALESCE(v_detail, ''), COALESCE(v_hint, ''), COALESCE(v_context, '');

  IF v_message LIKE '%UNAUTHENTICATED%' THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = 'P0001';
  ELSIF v_message LIKE '%PROFILE_NOT_FOUND%' THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND' USING ERRCODE = 'P0001';
  ELSIF v_message LIKE '%ACTIVE_PLAN_NOT_FOUND%' THEN
    RAISE EXCEPTION 'ACTIVE_PLAN_NOT_FOUND' USING ERRCODE = 'P0001';
  ELSIF v_message LIKE '%ACTIVE_KHATMA_NOT_FOUND%' THEN
    RAISE EXCEPTION 'ACTIVE_KHATMA_NOT_FOUND' USING ERRCODE = 'P0001';
  ELSIF v_message LIKE '%PLAN_NOT_EFFECTIVE%' THEN
    RAISE EXCEPTION 'PLAN_NOT_EFFECTIVE' USING ERRCODE = 'P0001';
  ELSIF v_message LIKE '%INVALID_PLAN_CONFIGURATION%' THEN
    RAISE EXCEPTION 'INVALID_PLAN_CONFIGURATION' USING ERRCODE = 'P0001';
  ELSIF v_message LIKE '%INVALID_TIMEZONE%' THEN
    RAISE EXCEPTION 'INVALID_TIMEZONE' USING ERRCODE = 'P0001';
  ELSE
    RAISE EXCEPTION 'INTERNAL_ERROR [%]: %', v_sqlstate, v_message USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_current_reading_assignment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_current_reading_assignment() FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_current_reading_assignment() TO authenticated;
