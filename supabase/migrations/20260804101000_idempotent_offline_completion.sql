CREATE TABLE public.offline_completion_receipts (
  idempotency_key uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reading_session_id uuid NOT NULL REFERENCES public.reading_sessions(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  PRIMARY KEY (user_id, idempotency_key)
);

CREATE INDEX offline_completion_receipts_user_accepted_idx
  ON public.offline_completion_receipts (user_id, accepted_at DESC);

ALTER TABLE public.offline_completion_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.offline_completion_receipts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.complete_offline_reading_session(
  p_session_id uuid,
  p_idempotency_key uuid,
  p_occurred_at timestamptz
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
  v_uid uuid := auth.uid();
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_existing_session uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = 'P0001';
  END IF;
  IF p_occurred_at < v_now - interval '8 days' OR p_occurred_at > v_now + interval '5 minutes' THEN
    RAISE EXCEPTION 'OFFLINE_ACTION_INVALID' USING ERRCODE = 'P0001';
  END IF;

  SELECT reading_session_id
  INTO v_existing_session
  FROM public.offline_completion_receipts
  WHERE idempotency_key = p_idempotency_key
    AND user_id = v_uid;

  IF FOUND AND v_existing_session <> p_session_id THEN
    RAISE EXCEPTION 'OFFLINE_ACTION_INVALID' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
  SELECT * FROM public.complete_reading_session(p_session_id);

  INSERT INTO public.offline_completion_receipts (
    idempotency_key,
    user_id,
    reading_session_id,
    occurred_at,
    accepted_at
  )
  VALUES (p_idempotency_key, v_uid, p_session_id, p_occurred_at, v_now)
  ON CONFLICT (user_id, idempotency_key) DO NOTHING;
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_offline_reading_session(uuid, uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_offline_reading_session(uuid, uuid, timestamptz) TO authenticated;
