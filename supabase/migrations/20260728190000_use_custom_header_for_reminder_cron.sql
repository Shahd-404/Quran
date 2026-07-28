-- Replace only the Wird reminder job so the shared invocation secret bypasses
-- Supabase gateway JWT parsing and is verified by the Edge Function itself.
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

  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'send-due-reading-reminders-every-minute';

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
          'x-wird-reminder-token', (
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
