# Production smoke tests

Target: `https://quran-seven-lyart.vercel.app`

Use a disposable production test account. Never use a real user's data or print
the test password.

## Public preflight

- [x] `/` returns `200` over HTTPS.
- [x] `/app` redirects anonymous users to `/login`.
- [x] Reader, history, settings, and new-khatma routes are protected.
- [x] `/manifest.webmanifest`, `/sw.js`, `/offline.html`, and every manifest icon
  return `200`.
- [x] Cross-origin login mutation returns `403`.
- [x] Malformed login JSON returns a safe `400`.
- [x] `GET /api/notifications/subscription` cannot mutate and returns `405`.

## Controlled account journey

- [ ] Register and verify profile creation and production-domain redirects.
- [ ] Verify invalid login, valid login, refresh persistence, logout, browser
  Back behavior, and offline privacy.
- [ ] Create the 17/5/3 plan and verify one plan, three times, one khatma, and no
  duplicate submission.
- [ ] Verify session ranges 17–18, 19–20, and 21–21 and one assignment.
- [ ] Verify Quran rendering, bounded navigation, resume, and position writes.
- [ ] Verify explicit, idempotent completion and contiguous frontier movement.
- [ ] Verify out-of-order completion does not skip a gap.
- [ ] Verify settings update only affects future assignments.
- [ ] Verify history totals, grouping, ownership, and read-only behavior.
- [ ] Verify page-604 completion and explicit new-khatma behavior.

Record database evidence using the authenticated test user's identifier only.
Do not expose private payloads.

## Notifications and PWA

- [ ] Confirm exactly one active Cron job and required Vault names.
- [ ] Confirm rotated Edge Function secrets by name.
- [ ] Subscribe on the production origin.
- [ ] Trigger and receive one controlled reminder.
- [ ] Verify click opens the same-origin reader without changing progress.
- [ ] Verify idempotent delivery and per-device deactivation.
- [ ] Install in Chromium and verify standalone start, offline privacy, and
  explicit Service Worker update behavior.

## Manual accessibility and browser matrix

Test keyboard flow, focus, dialogs, reduced motion, touch targets, and 200% zoom
at 375px, 430px, 768px, and desktop. Test core flows in current Chromium, Edge,
and Firefox. Mark Safari/iOS unverified when no suitable environment exists.
