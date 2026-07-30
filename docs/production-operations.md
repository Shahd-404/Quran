# Production deployment and operations

Do not reuse credentials that appeared in development logs, chat, local
history, or Git history.

## Environment model

| Environment | Application | Supabase | Notifications |
| --- | --- | --- | --- |
| Local | `localhost` with ignored `.env.local` | Linked development project | Development-only keys |
| Preview | Vercel pull-request deployment | Preview-safe variables/project | May remain disabled |
| Production | Vercel HTTPS production domain | Production project | Rotated VAPID, Edge Function, Vault, and Cron |

Preview and production credentials must never be mixed.

## Variable checklist

Vercel Preview and Production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (exact trusted application origin; production is
  `https://quran-seven-lyart.vercel.app`)
- `QF_CLIENT_ID` (server-only)
- `QF_CLIENT_SECRET` (server-only)
- `QF_ENV` (`prelive` for staging; `production` only with approved credentials)

Use separate Vercel targets for `QF_ENV`: `prelive` for Preview and
`production` for Production. The server rejects `QF_ENV=prelive` when
`VERCEL_ENV=production` so a live reader cannot silently use the limited
prelive Quran dataset.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

The Next.js runtime does not use `SUPABASE_SERVICE_ROLE_KEY`; do not configure
it in Vercel.

Supabase Edge Function `send-due-reading-reminders`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `REMINDER_INVOCATION_TOKEN`

Vault names used by Cron:

- `wird_project_url`
- `wird_reminder_invocation_token`

Rotate every previously exposed service-role secret, Quran Foundation secret,
VAPID pair, invocation token, and Vault value before production. Enter values
through the Vercel and Supabase secret interfaces, never in Git or shell history.

## Release workflow and order

1. Feature branch and pull request.
2. CI and Vercel Preview review.
3. Apply backward-compatible Supabase migrations.
4. Deploy the Edge Function and verify unauthorised requests return `401`.
5. Merge to `main` and verify the Vercel production deployment.
6. Configure exact Supabase Auth production and permitted redirect URLs.
7. Verify Vault and exactly one active Cron job.
8. Run controlled smoke tests with isolated test data.

Application code that requires a migration must not be released before its
backward-compatible migration. Remove deprecated behavior only in a later
release.

## Supabase and notification deployment

Run individually and review the linked project reference before applying:

```text
npx supabase migration list --linked
npx supabase db push --linked --dry-run
npx supabase db push --linked
npx supabase functions deploy send-due-reading-reminders
```

The Edge Function dependencies are pinned. Its responses contain aggregate
counts or stable error codes. It must not log endpoints, keys, tokens, or users.

The migration schedules `wird-send-due-reading-reminders` once per minute only
when both Vault names exist. Safe operational SQL:

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'wird-send-due-reading-reminders';

update cron.job set active = false
where jobname = 'wird-send-due-reading-reminders';

update cron.job set active = true
where jobname = 'wird-send-due-reading-reminders';

select cron.unschedule(jobid)
from cron.job
where jobname = 'wird-send-due-reading-reminders';
```

Inspect Vault names only, never `decrypted_secret`. Review executions through
`cron.job_run_details`. Users must subscribe again on a new production origin.

## Auth, Quran, security, and PWA verification

- Set the production Site URL and explicit localhost/preview/production redirect
  URLs in Supabase Auth; never use an unrestricted wildcard.
- For password recovery, set the Supabase Auth Site URL to
  `https://quran-seven-lyart.vercel.app` and explicitly allow
  `https://quran-seven-lyart.vercel.app/auth/reset-password`. For local
  development, allow `http://localhost:3000/auth/reset-password`. Add preview
  reset URLs individually only when a preview recovery test is required; do not
  add a broad wildcard.
- Keep the hosted Reset Password email template compatible with Supabase's
  `{{ .ConfirmationURL }}` value. Do not replace it with a raw token or copy
  recovery URLs into logs. Because the application uses SSR/PKCE, open the
  recovery link in the browser that requested it so the verifier cookie is
  available.
- Keep Supabase's password-change security notification enabled where supported.
  After a controlled reset, verify that the new password works, the old password
  fails, the local recovery session is signed out, and unrelated sessions and
  reading data are unchanged.
- Verify registration, login, logout, SSR cookies, middleware, and `/app`.
- Confirm Quran pages load server-side and no provider secret/token appears in
  browser bundles or logs.
- Confirm CSP, `nosniff`, Referrer Policy, Permissions Policy, clickjacking
  protection, and HSTS on production HTTPS.
- Confirm `/manifest.webmanifest`, icons, and `/sw.js` return `200`.
- Confirm the Service Worker controls `/`, does not cache APIs or authenticated
  HTML, retains Push handlers, and provides only the public offline shell.
- Create a new production-origin subscription and send one controlled Push to an
  isolated account.

These are deployment smoke checks, not Task 19 final acceptance testing.

## Monitoring

Review Vercel deployment/runtime logs, Supabase database and Auth logs, Edge
Function logs, `cron.job_run_details`, failed deliveries, and inactive
subscriptions. Use aggregate counts and stable error codes. Never log cookies,
tokens, secrets, Push endpoints, encryption keys, access tokens, or full users.

## Backup and recovery

Confirm backup/PITR availability for the selected Supabase plan in its dashboard.
Keep migration history and a reviewed schema export. Restore into a separate
project first. During recovery, disable Cron, restore and validate data, rotate
incident-related secrets, deploy compatible versions, then re-enable Cron.

## Rollback

- Vercel: promote the previous successful deployment.
- Database: preserve migration history and use a forward corrective migration;
  never reset production.
- Edge Function: disable Cron, redeploy the previous known-good function, verify
  an authorised empty batch, then re-enable Cron.
- Notifications: preserve subscriptions and deliveries and inspect their states
  before re-enabling to prevent duplicate sends.

Rollback for authentication failure, RLS/ownership regression, incorrect progress
changes, duplicate notification delivery, or a material security/runtime failure.
