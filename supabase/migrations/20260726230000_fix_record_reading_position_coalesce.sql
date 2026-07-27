CREATE OR REPLACE FUNCTION public.record_reading_position(
  p_session_id uuid,
  p_page smallint
)
RETURNS TABLE (
  session_status public.reading_session_status,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  last_opened_page smallint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid;
  v_now timestamptz := pg_catalog.now();
  v_session public.reading_sessions%ROWTYPE;
  v_status public.reading_session_status;
  v_first_opened_at timestamptz;
  v_last_opened_at timestamptz;
  v_last_opened_page smallint;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'UNAUTHENTICATED', ERRCODE = 'P0001';
  END IF;

  SELECT rs.*
  INTO v_session
  FROM public.reading_sessions AS rs
  WHERE rs.id = p_session_id
    AND rs.user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'SESSION_NOT_FOUND', ERRCODE = 'P0001';
  END IF;

  IF p_page IS NULL
    OR p_page < 1
    OR p_page > 604
    OR p_page < v_session.start_page
    OR p_page > v_session.end_page
  THEN
    RAISE EXCEPTION USING MESSAGE = 'PAGE_OUT_OF_RANGE', ERRCODE = 'P0001';
  END IF;

  IF v_session.status = 'completed' THEN
    RETURN QUERY
    SELECT
      v_session.status,
      v_session.first_opened_at,
      v_session.last_opened_at,
      v_session.last_opened_page;
    RETURN;
  END IF;

  UPDATE public.reading_sessions AS rs
  SET
    status = 'in_progress',
    first_opened_at = CASE
      WHEN rs.first_opened_at IS NULL THEN v_now
      ELSE rs.first_opened_at
    END,
    last_opened_at = v_now,
    last_opened_page = p_page
  WHERE rs.id = v_session.id
    AND rs.user_id = v_uid
  RETURNING
    rs.status,
    rs.first_opened_at,
    rs.last_opened_at,
    rs.last_opened_page
  INTO
    v_status,
    v_first_opened_at,
    v_last_opened_at,
    v_last_opened_page;

  RETURN QUERY
  SELECT
    v_status,
    v_first_opened_at,
    v_last_opened_at,
    v_last_opened_page;
END;
$$;

ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON FUNCTION public.record_reading_position(uuid, smallint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_reading_position(uuid, smallint) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_reading_position(uuid, smallint) TO authenticated;
