BEGIN;
SELECT plan(5);

SELECT is(
  (SELECT count(*) FROM cron.job WHERE jobname = 'send-due-reading-reminders-every-minute'),
  1::bigint,
  'exactly one Wird reminder Cron job exists'
);
SELECT is(
  (SELECT schedule FROM cron.job WHERE jobname = 'send-due-reading-reminders-every-minute'),
  '* * * * *',
  'the reminder Cron still runs every minute'
);
SELECT like(
  (SELECT command FROM cron.job WHERE jobname = 'send-due-reading-reminders-every-minute'),
  '%x-wird-reminder-token%',
  'the Cron sends the shared secret in the custom header'
);
SELECT unlike(
  (SELECT command FROM cron.job WHERE jobname = 'send-due-reading-reminders-every-minute'),
  '%''Authorization''%',
  'the Cron does not send an Authorization header'
);
SELECT unlike(
  (SELECT command FROM cron.job WHERE jobname = 'send-due-reading-reminders-every-minute'),
  '%Bearer%',
  'the Cron does not format the Vault token as a bearer JWT'
);

SELECT * FROM finish();
ROLLBACK;
