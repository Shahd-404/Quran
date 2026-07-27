CREATE OR REPLACE FUNCTION public.complete_reading_session(
  p_session_id uuid
)
RETURNS TABLE (
  session_id uuid,
  session_completed boolean,
  assignment_completed boolean,
  khatma_completed boolean,
  plan_completed boolean,
  current_unread_page smallint,
  already_completed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_uid uuid;
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_session public.reading_sessions%ROWTYPE;
  v_assignment public.daily_assignments%ROWTYPE;
  v_plan public.reading_plans%ROWTYPE;
  v_khatma public.khatmas%ROWTYPE;
  v_frontier smallint;
  v_completed_end_page smallint;
  v_assignment_completed boolean := false;
  v_khatma_completed boolean := false;
  v_plan_completed boolean := false;
  v_reached_page_604 boolean := false;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_uid::text, 0)
  );

  SELECT rs.*
  INTO v_session
  FROM public.reading_sessions AS rs
  WHERE rs.id = p_session_id
  FOR UPDATE;

  IF NOT FOUND OR v_session.user_id <> v_uid THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  SELECT da.*
  INTO v_assignment
  FROM public.daily_assignments AS da
  WHERE da.id = v_session.daily_assignment_id
  FOR UPDATE;

  IF NOT FOUND OR v_assignment.user_id <> v_uid THEN
    RAISE EXCEPTION 'SESSION_OWNERSHIP_INVALID' USING ERRCODE = 'P0001';
  END IF;

  SELECT rp.*
  INTO v_plan
  FROM public.reading_plans AS rp
  WHERE rp.id = v_assignment.reading_plan_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAN_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  IF v_plan.user_id <> v_uid THEN
    RAISE EXCEPTION 'SESSION_OWNERSHIP_INVALID' USING ERRCODE = 'P0001';
  END IF;

  SELECT k.*
  INTO v_khatma
  FROM public.khatmas AS k
  WHERE k.id = v_assignment.khatma_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'KHATMA_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  IF
    v_khatma.user_id <> v_uid
    OR v_khatma.reading_plan_id IS DISTINCT FROM v_plan.id
  THEN
    RAISE EXCEPTION 'SESSION_OWNERSHIP_INVALID' USING ERRCODE = 'P0001';
  END IF;

  IF
    v_assignment.reading_plan_id <> v_plan.id
    OR v_assignment.khatma_id <> v_khatma.id
    OR v_plan.current_unread_page NOT BETWEEN 1 AND 604
    OR v_session.start_page NOT BETWEEN 1 AND 604
    OR v_session.end_page NOT BETWEEN v_session.start_page AND 604
  THEN
    RAISE EXCEPTION 'INVALID_PROGRESS_CONFIGURATION' USING ERRCODE = 'P0001';
  END IF;

  IF v_session.status = 'completed' THEN
    RETURN QUERY
    SELECT
      v_session.id,
      true,
      v_assignment.status = 'completed',
      v_khatma.status = 'completed',
      v_plan.status = 'completed',
      v_plan.current_unread_page,
      true;
    RETURN;
  END IF;

  IF v_session.status NOT IN ('pending', 'in_progress') THEN
    RAISE EXCEPTION 'INVALID_SESSION_STATE' USING ERRCODE = 'P0001';
  END IF;
  IF v_plan.status <> 'active' OR v_khatma.status <> 'active' THEN
    RAISE EXCEPTION 'INVALID_PROGRESS_CONFIGURATION' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.reading_sessions AS rs
  SET
    status = 'completed',
    completed_at = v_now
  WHERE rs.id = v_session.id;

  INSERT INTO public.reading_progress_events (
    user_id,
    reading_plan_id,
    khatma_id,
    daily_assignment_id,
    reading_session_id,
    start_page,
    end_page,
    completed_at
  )
  VALUES (
    v_uid,
    v_plan.id,
    v_khatma.id,
    v_assignment.id,
    v_session.id,
    v_session.start_page,
    v_session.end_page,
    v_now
  )
  ON CONFLICT (reading_session_id) DO NOTHING;

  SELECT NOT EXISTS (
    SELECT 1
    FROM public.reading_sessions AS rs
    WHERE rs.daily_assignment_id = v_assignment.id
      AND rs.status <> 'completed'
  )
  INTO v_assignment_completed;

  IF v_assignment_completed THEN
    UPDATE public.daily_assignments AS da
    SET
      status = 'completed',
      completed_at = v_now
    WHERE da.id = v_assignment.id;
  ELSE
    UPDATE public.daily_assignments AS da
    SET
      status = 'in_progress',
      completed_at = NULL
    WHERE da.id = v_assignment.id;
  END IF;

  v_frontier := v_plan.current_unread_page;
  LOOP
    SELECT pg_catalog.max(rs.end_page)::smallint
    INTO v_completed_end_page
    FROM public.reading_sessions AS rs
    INNER JOIN public.daily_assignments AS da
      ON da.id = rs.daily_assignment_id
    WHERE da.reading_plan_id = v_plan.id
      AND da.khatma_id = v_khatma.id
      AND da.user_id = v_uid
      AND rs.user_id = v_uid
      AND rs.status = 'completed'
      AND rs.start_page = v_frontier;

    EXIT WHEN v_completed_end_page IS NULL;

    IF v_completed_end_page = 604 THEN
      v_frontier := 604;
      v_reached_page_604 := true;
      EXIT;
    END IF;

    v_frontier := (v_completed_end_page + 1)::smallint;
  END LOOP;

  IF v_reached_page_604 THEN
    UPDATE public.khatmas AS k
    SET
      status = 'completed',
      completed_at = v_now
    WHERE k.id = v_khatma.id;

    UPDATE public.reading_plans AS rp
    SET
      status = 'completed',
      current_unread_page = 604,
      completed_at = v_now
    WHERE rp.id = v_plan.id;

    v_khatma_completed := true;
    v_plan_completed := true;
  ELSE
    UPDATE public.reading_plans AS rp
    SET current_unread_page = v_frontier
    WHERE rp.id = v_plan.id;
  END IF;

  RETURN QUERY
  SELECT
    v_session.id,
    true,
    v_assignment_completed,
    v_khatma_completed,
    v_plan_completed,
    v_frontier,
    false;
EXCEPTION
  WHEN SQLSTATE 'P0001' THEN
    RAISE;
  WHEN OTHERS THEN
    RAISE WARNING 'complete_reading_session failed (SQLSTATE %)', SQLSTATE;
    RAISE EXCEPTION 'INTERNAL_ERROR' USING ERRCODE = 'P0001';
END;
$function$;

ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khatmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON FUNCTION public.complete_reading_session(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_reading_session(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_reading_session(uuid) TO authenticated;
