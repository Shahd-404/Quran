# Production rollback

## Triggers

Rollback or mitigate immediately for authentication outage, ownership/RLS leak,
incorrect or duplicate progress, duplicate Push delivery, private offline cache,
secret exposure, or sustained Quran provider/runtime failure.

## Vercel

Promote the previous known-good deployment in Vercel. Confirm `/`, `/login`, and
protected-route behavior before restoring normal traffic.

## Database

Never reset production or remove migration history. Disable affected operations
and create a new forward corrective migration. Test recovery against a separate
project or restored backup first.

## Edge Function and notifications

1. Disable `wird-send-due-reading-reminders` in `cron.job`.
2. Preserve subscriptions and delivery rows.
3. Redeploy the previous known-good Edge Function.
4. Verify unauthorised `401` and one authorised empty batch.
5. Inspect processing/delivery states for duplicate-send risk.
6. Re-enable exactly one Cron job only after verification.

## Security incident

Rotate affected Supabase, Quran Foundation, VAPID, invocation, and Vault secrets.
Invalidate compromised sessions when applicable. Verify no secret remains in
Git, browser bundles, deployment logs, or build artifacts.
