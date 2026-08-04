# Wird release checklist

- Production URL: `https://quran-seven-lyart.vercel.app`
- Release date: `TBD`
- Repository HEAD inspected: `578e26366db6d8a0c078f72d2c30acc018d7c74a`
- Production deployment commit: `NOT VERIFIED`
- Release version: keep `0.1.0` until launch blockers are cleared

## Required evidence

- [x] Production HTTPS URL returns `200`.
- [x] Anonymous protected routes redirect to `/login`.
- [x] Manifest, icons, Service Worker, and public offline page return `200`.
- [x] Production security headers are present.
- [x] Supabase linked migration dry-run reports the remote database is current.
- [x] Reminder Edge Function rejects an unauthorised invocation with `401`.
- [ ] Confirm the deployed Vercel commit and Ready state in the dashboard.
- [ ] Confirm required Vercel variable names are configured.
- [ ] Confirm rotated secrets by variable name.
- [ ] Confirm Edge Function secret names, Vault names, and one active Cron job.
- [ ] Complete the controlled authenticated journey.
- [ ] Receive one controlled Web Push notification.
- [ ] Complete keyboard, responsive, and cross-browser manual verification.
- [ ] Run dependency audit after repairing the machine CA trust chain.
- [ ] Upgrade vulnerable `next@13.4.10` to the officially recommended patched
  `14.2.35` or a newer supported secure line, then repeat the full regression
  suite and deploy it.

Do not mark the release GO while an unchecked blocking item remains.

## Production configuration names

Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `QF_CLIENT_ID`
- `QF_CLIENT_SECRET`
- `QF_ENV`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

Supabase Edge Function:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `REMINDER_INVOCATION_TOKEN`

Vault:

- `wird_project_url`
- `wird_reminder_invocation_token`

## Known limitations

- Quran pages are available offline only for explicitly downloaded owned sessions
  and are retained locally for no more than seven days.
- Push subscriptions are origin- and device-specific.
- Safari/iOS behavior has not been verified in the current environment.
- Production acceptance requires a disposable test account and interactive
  browser access.
- The currently installed and deployed Next.js line is security-blocked pending
  the required patched-version upgrade.

## First 24 hours

- Review Vercel deployment and runtime errors after launch.
- Review Supabase Auth and database errors.
- Check Edge Function failures and `cron.job_run_details`.
- Check failed notification deliveries and inactive subscriptions using
  aggregate counts only.
- Watch for duplicate assignments, progress events, and Push deliveries.
- Check Quran provider failure codes and latency.
- Disable notification Cron immediately if duplicate or unsafe sends appear.
