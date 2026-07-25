# Architecture — Wird (initial)

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
- Domain modules: `src/modules/*` (auth, quran, reading-plan, daily-assignment, reading-session, notifications, khatma, settings).
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
- `src/modules/notifications`
- `src/modules/khatma`
- `src/modules/settings`

Notes:
- Quran provider access will be behind a provider interface to allow replacement.
- Reading-plan calculations will be implemented in a module separate from UI to allow unit testing.
- Database access and migrations are reserved for future tasks and must be implemented on trusted server boundaries.

## State management approach (initial)

- Prefer server-rendered data for initial pages and minimal client-side state.
- Use local state only for UI concerns; persist authoritative state via server APIs in later tasks.

## Error handling and recovery

- Surface friendly error messages to users.
- Log operational errors to an observability system in later tasks.

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

## Decisions deferred

- Choice of database, authentication provider, and Quran content provider are deferred.
