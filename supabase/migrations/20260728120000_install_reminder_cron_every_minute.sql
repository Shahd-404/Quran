-- Invoke the deployed reminder Edge Function once per minute.
-- Sensitive values remain in Vault and are resolved only at execution time.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

DO $$
DECLARE
  v_project_url_count integer;
  v_invocation_token_count integer;
BEGIN
  SELECT count(*)
  INTO v_project_url_count
  FROM vault.secrets
  WHERE name = 'wird_project_url';

  SELECT count(*)
  INTO v_invocation_token_count
  FROM vault.secrets
  WHERE name = 'wird_reminder_invocation_token';

  IF v_project_url_count <> 1 THEN
    RAISE EXCEPTION 'VAULT_SECRET_NAME_MISSING: wird_project_url';
  END IF;

  IF v_invocation_token_count <> 1 THEN
    RAISE EXCEPTION 'VAULT_SECRET_NAME_MISSING: wird_reminder_invocation_token';
  END IF;

  -- Remove only the two exact Cron names owned by Wird.
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname IN (
    'wird-send-due-reading-reminders',
    'send-due-reading-reminders-every-minute'
  );

  PERFORM cron.schedule(
    'send-due-reading-reminders-every-minute',
    '* * * * *',
    $cron$
      SELECT net.http_post(
        url := rtrim(
          (SELECT decrypted_secret
           FROM vault.decrypted_secrets
           WHERE name = 'wird_project_url'),
          '/'
        ) || '/functions/v1/send-due-reading-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            SELECT decrypted_secret
            FROM vault.decrypted_secrets
            WHERE name = 'wird_reminder_invocation_token'
          )
        ),
        body := '{}'::jsonb
      );
    $cron$
  );
END;
$$;
