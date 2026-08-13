# Architecture — Wird (initial)

## Reading-data deletion boundary

`public.delete_my_reading_data(text)` is the sole trusted deletion primitive.
It derives ownership from `auth.uid()`, takes a per-user transaction advisory
lock, and deletes dependent reading and notification rows atomically. Its
`SECURITY DEFINER` boundary is required because ordinary RLS policies do not
grant direct DELETE access. Execution is revoked from PUBLIC and anon and granted
only to authenticated users. It never deletes `auth.users` or `public.profiles`
and returns aggregate counts only.

## Purpose

This architecture document describes the high-level structure and design principles for the Wird application foundation. It is intentionally introductory and records decisions that guide future implementation tasks.

## Stack
- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS

## Database decisions (Supabase)

- This project uses Supabase PostgreSQL for authoritative server-side storage.
- Row Level Security (RLS) is a mandatory security boundary; all application tables enable RLS.
- Database migrations are the source of truth for structural changes and live under `supabase/migrations`.
- Generated TypeScript database types will be produced from the migrations when a local Supabase stack is available and saved to `src/types/database.generated.ts`.
- Server-authoritative progress changes (e.g., recording a session completion and advancing unread page) will be implemented as trusted database operations in later tasks to ensure atomicity.
- Trusted database functions may use `SECURITY DEFINER` when needed to permit strict RLS enforcement while allowing a single controlled write entry point for multi-table operations.
- The `create_reading_plan` RPC uses `SECURITY DEFINER`, `auth.uid()`, and advisory locking instead of broad insert policies or service-role keys.


## High-level layers
- Presentation: Next.js routes and Server/Client components in `src/app` and `src/components`.
- Domain modules: `src/modules/*` (auth, quran, reading-plan, daily-assignment, reading-session, history, notifications, khatma, settings).
- Libraries/helpers: `src/lib` for non-domain shared utilities.
- Config: `src/config` for constants and environment-agnostic values.

## Folder responsibilities

- `src/app`: routing, layouts, and composition.
- `src/components`: presentational and generic UI components.
- `src/modules`: domain code; keep calculations and business rules separate from UI.
- `src/lib`: shared utilities that are environment-agnostic.

## Server / client boundary principles

- Keep authoritative operations on server boundaries.
- Avoid placing business logic inside client components.
- Use Server Components by default; add `"use client"` to components that require interactivity.

## Planned product-domain modules (not yet implemented)

- `src/modules/auth`
- `src/modules/quran` (provider interface)
- `src/modules/reading-plan`
- `src/modules/daily-assignment`
- `src/modules/reading-session`
- `src/modules/history`
- `src/modules/notifications`
- `src/modules/khatma`
- `src/modules/settings`

Notes:
- Quran provider access will be behind a provider interface to allow replacement.
- The current reader's provider adapter requests Quran Foundation
  `/content/api/v4/verses/by_page/{page}` with Mushaf ID 1, `words=true`,
  `code_v2`, QCF V2 page metadata, official line numbers, and Arabic accessible
  text. Normalization preserves provider word order, rejects page/font mixing,
  and emits a versioned line-based page model before it reaches React.
- Reading-plan calculations will be implemented in a module separate from UI to allow unit testing.
- Database access and migrations are reserved for future tasks and must be implemented on trusted server boundaries.
- Reading history is server-rendered from authenticated Supabase clients. Its
  aggregate read models are `SECURITY INVOKER`, derive ownership from
  `auth.uid()`, and keep RLS active.
- `reading_progress_events` remains append-only and authoritative. History event
  queries are bounded to 20 rows, ordered by completion timestamp plus event ID,
  and joined only to owned assignments, sessions, plans, and khatmas for
  historical display context.

## State management approach (initial)

- Prefer server-rendered data for initial pages and minimal client-side state.
- Use local state only for UI concerns; persist authoritative state via server APIs in later tasks.

## Error handling and recovery

### Android local reading reminders

The installed Android TWA accepts bounded, versioned reminder commands only through a postMessage channel whose relationship is verified for `https://quran-seven-lyart.vercel.app`. Future session metadata is stored in private SharedPreferences and scheduled with `AlarmManager.setAndAllowWhileIdle`. Alarm delivery, notification construction, tapping, and reboot/clock-change restoration are native and perform no network request. Notification opening never completes a session or advances reading progress. Android Force Stop remains outside the delivery guarantee.

- Surface friendly error messages to users.
- Log operational errors to an observability system in later tasks.
- The root `public/sw.js` has shared Web Push and PWA responsibilities. It
  caches only public static assets and a dedicated offline document. Navigation
  is network-first and authenticated HTML is never written to Cache Storage.
- Wird-owned static cache names are versioned per production UI release.
  Service Worker scripts bypass the HTTP cache when checked for updates. A
  waiting worker activates and reloads the page only after the user presses the
  explicit update action; install and update discovery never call
  `skipWaiting` automatically.
- The worker treats official QCF V2 WOFF2 files as public static assets through
  one exact Quran Foundation CDN allowlist. It caches only successful font
  responses, stores separate cache-age metadata, and removes them after seven
  days. No Quran API response or authenticated page enters this cache.
- Quran pages, Supabase traffic, application APIs, mutations, credentials,
  subscription material, assignments, and progress data are excluded from
  offline caching.

## Testing strategy

- Unit tests for pure business logic.
- Integration tests for API endpoints (future tasks).
- Behavioural tests for core flows.

## Accessibility and RTL considerations

- All UI should be developed RTL-first.
- Use semantic HTML and accessible focus states.

## Security principles

- Never store secrets in the repository.
- Keep data access on trusted server boundaries.
- Web Push subscriptions are written through authenticated RPCs that derive
  ownership from `auth.uid()`. Delivery claiming and status updates are
  service-role-only operations used by the scheduled Edge Function.
- The reminder sender uses VAPID and an invocation token stored as Supabase Edge
  Function secrets. Cron resolves its project URL and invocation token from
  Vault; no private key or service-role credential is stored in migrations.

## Decisions deferred

- Choice of database, authentication provider, and Quran content provider are deferred.
