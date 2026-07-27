-- Opt-in, per-device Web Push reminders for due reading sessions.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_endpoint_length,
  ADD CONSTRAINT push_subscriptions_endpoint_length CHECK (char_length(endpoint) BETWEEN 12 AND 2048),
  DROP CONSTRAINT IF EXISTS push_subscriptions_endpoint_https,
  ADD CONSTRAINT push_subscriptions_endpoint_https CHECK (endpoint ~ '^https://'),
  DROP CONSTRAINT IF EXISTS push_subscriptions_p256dh_length,
  ADD CONSTRAINT push_subscriptions_p256dh_length CHECK (char_length(p256dh_key) BETWEEN 40 AND 512),
  DROP CONSTRAINT IF EXISTS push_subscriptions_auth_length,
  ADD CONSTRAINT push_subscriptions_auth_length CHECK (char_length(auth_key) BETWEEN 8 AND 256),
  DROP CONSTRAINT IF EXISTS push_subscriptions_failure_count_nonnegative,
  ADD CONSTRAINT push_subscriptions_failure_count_nonnegative CHECK (failure_count >= 0);

DROP POLICY IF EXISTS push_subscriptions_insert_own ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_update_own ON public.push_subscriptions;

CREATE OR REPLACE FUNCTION public.save_push_subscription(
  p_endpoint text,
  p_p256dh_key text,
  p_auth_key text,
  p_user_agent text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '42501'; END IF;
  IF p_endpoint !~ '^https://' OR char_length(p_endpoint) NOT BETWEEN 12 AND 2048
     OR char_length(p_p256dh_key) NOT BETWEEN 40 AND 512
     OR char_length(p_auth_key) NOT BETWEEN 8 AND 256 THEN
    RAISE EXCEPTION USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.push_subscriptions AS ps
    (user_id, endpoint, p256dh_key, auth_key, user_agent, active, revoked_at, failure_count)
  VALUES
    (v_user_id, p_endpoint, p_p256dh_key, p_auth_key, left(p_user_agent, 512), true, NULL, 0)
  ON CONFLICT (endpoint) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    p256dh_key = EXCLUDED.p256dh_key,
    auth_key = EXCLUDED.auth_key,
    user_agent = EXCLUDED.user_agent,
    active = true,
    revoked_at = NULL,
    failure_count = 0
  WHERE ps.user_id = v_user_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '42501'; END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_push_subscription(p_endpoint text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE = '42501'; END IF;
  UPDATE public.push_subscriptions
  SET active = false, revoked_at = now()
  WHERE user_id = auth.uid() AND endpoint = p_endpoint AND active;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.save_push_subscription(text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_push_subscription(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_push_subscription(text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_push_subscription(text) TO authenticated;

DO $$ BEGIN
  CREATE TYPE public.notification_delivery_status AS ENUM
    ('pending', 'processing', 'sent', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reading_session_id uuid NOT NULL REFERENCES public.reading_sessions(id) ON DELETE CASCADE,
  push_subscription_id uuid NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  notification_kind text NOT NULL DEFAULT 'session_due' CHECK (notification_kind = 'session_due'),
  scheduled_for timestamptz NOT NULL,
  status public.notification_delivery_status NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 3),
  claimed_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  last_error_code text CHECK (last_error_code IS NULL OR char_length(last_error_code) <= 64),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reading_session_id, push_subscription_id, notification_kind)
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status
  ON public.notification_deliveries(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_due_reading_sessions
  ON public.reading_sessions(scheduled_for, user_id) WHERE status <> 'completed';
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_deliveries_select_own ON public.notification_deliveries;
CREATE POLICY notification_deliveries_select_own ON public.notification_deliveries
  FOR SELECT USING (auth.uid() = user_id);
DROP TRIGGER IF EXISTS trg_updated_at_notification_deliveries ON public.notification_deliveries;
CREATE TRIGGER trg_updated_at_notification_deliveries BEFORE UPDATE
  ON public.notification_deliveries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();

CREATE OR REPLACE FUNCTION public.claim_due_reading_reminders(p_batch_size integer DEFAULT 100)
RETURNS TABLE (
  delivery_id uuid, subscription_id uuid, endpoint text, p256dh_key text,
  auth_key text, reading_session_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH eligible AS (
    SELECT rs.id AS session_id, rs.user_id, rs.scheduled_for, ps.id AS subscription_id
    FROM public.reading_sessions rs
    JOIN public.daily_assignments da ON da.id = rs.daily_assignment_id AND da.user_id = rs.user_id
    JOIN public.reading_plans rp ON rp.id = da.reading_plan_id AND rp.user_id = rs.user_id
    JOIN public.push_subscriptions ps ON ps.user_id = rs.user_id
    WHERE rs.scheduled_for <= now()
      AND rs.scheduled_for > now() - interval '30 minutes'
      AND rs.status IN ('pending', 'in_progress')
      AND da.status IN ('pending', 'in_progress')
      AND rp.status = 'active'
      AND ps.active AND ps.revoked_at IS NULL
    ORDER BY rs.scheduled_for
    LIMIT LEAST(GREATEST(p_batch_size, 1), 200)
    FOR UPDATE OF rs SKIP LOCKED
  ), retried AS (
    UPDATE public.notification_deliveries nd
    SET status = 'processing', attempt_count = nd.attempt_count + 1,
        claimed_at = now(), last_error_code = NULL
    FROM eligible e
    WHERE nd.reading_session_id = e.session_id
      AND nd.push_subscription_id = e.subscription_id
      AND nd.notification_kind = 'session_due'
      AND nd.status = 'failed' AND nd.attempt_count < 3
    RETURNING nd.id, nd.reading_session_id, nd.push_subscription_id
  ), inserted AS (
    INSERT INTO public.notification_deliveries
      (user_id, reading_session_id, push_subscription_id, scheduled_for, status, attempt_count, claimed_at)
    SELECT e.user_id, e.session_id, e.subscription_id, e.scheduled_for, 'processing', 1, now()
    FROM eligible e
    ON CONFLICT (reading_session_id, push_subscription_id, notification_kind) DO NOTHING
    RETURNING id, reading_session_id, push_subscription_id
  ), claimed AS (
    SELECT * FROM retried UNION ALL SELECT * FROM inserted
  )
  SELECT c.id, ps.id, ps.endpoint, ps.p256dh_key, ps.auth_key, c.reading_session_id
  FROM claimed c JOIN public.push_subscriptions ps ON ps.id = c.push_subscription_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_notification_delivery(
  p_delivery_id uuid, p_status public.notification_delivery_status, p_error_code text DEFAULT NULL,
  p_deactivate_subscription boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF p_status NOT IN ('sent','failed','skipped') THEN RAISE EXCEPTION USING ERRCODE = '22023'; END IF;
  UPDATE public.notification_deliveries
  SET status = p_status,
      sent_at = CASE WHEN p_status = 'sent' THEN now() ELSE sent_at END,
      failed_at = CASE WHEN p_status = 'failed' THEN now() ELSE failed_at END,
      last_error_code = left(p_error_code, 64)
  WHERE id = p_delivery_id AND status = 'processing';

  UPDATE public.push_subscriptions ps SET
    active = CASE WHEN p_deactivate_subscription THEN false ELSE active END,
    revoked_at = CASE WHEN p_deactivate_subscription THEN now() ELSE revoked_at END,
    failure_count = CASE WHEN p_status = 'sent' THEN 0 ELSE failure_count + 1 END,
    last_success_at = CASE WHEN p_status = 'sent' THEN now() ELSE last_success_at END
  FROM public.notification_deliveries nd
  WHERE nd.id = p_delivery_id AND ps.id = nd.push_subscription_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_reading_reminders(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_notification_delivery(uuid,public.notification_delivery_status,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_reading_reminders(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_notification_delivery(uuid,public.notification_delivery_status,text,boolean) TO service_role;

-- Cron reads these named values from Vault at runtime:
-- wird_project_url and wird_reminder_invocation_token.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'wird_project_url')
     AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'wird_reminder_invocation_token') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'wird-send-due-reading-reminders';
    PERFORM cron.schedule(
      'wird-send-due-reading-reminders', '* * * * *',
      $job$SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='wird_project_url')
          || '/functions/v1/send-due-reading-reminders',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='wird_reminder_invocation_token')
        ),
        body := '{}'::jsonb
      );$job$
    );
  END IF;
END $$;
