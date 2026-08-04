CREATE TABLE public.offline_download_rate_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_started_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  request_count smallint NOT NULL DEFAULT 0 CHECK (request_count BETWEEN 0 AND 6)
);

ALTER TABLE public.offline_download_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.offline_download_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reserve_offline_quran_download()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_rate public.offline_download_rate_limits%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('offline-download:' || v_uid::text, 0)
  );

  SELECT *
  INTO v_rate
  FROM public.offline_download_rate_limits
  WHERE user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.offline_download_rate_limits (user_id, window_started_at, request_count)
    VALUES (v_uid, v_now, 1);
    RETURN true;
  END IF;

  IF v_rate.window_started_at <= v_now - interval '15 minutes' THEN
    UPDATE public.offline_download_rate_limits
    SET window_started_at = v_now, request_count = 1
    WHERE user_id = v_uid;
    RETURN true;
  END IF;

  IF v_rate.request_count >= 6 THEN
    RETURN false;
  END IF;

  UPDATE public.offline_download_rate_limits
  SET request_count = request_count + 1
  WHERE user_id = v_uid;
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.reserve_offline_quran_download() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_offline_quran_download() TO authenticated;
