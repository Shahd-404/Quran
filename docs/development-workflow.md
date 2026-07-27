# Development Workflow

This document describes the expected development workflow for contributors and for Codex-driven tasks.

Prerequisites

- Node.js LTS and npm

Installation

```bash
npm install
```

Development server

```bash
npm run dev
```

Lint

```bash
npm run lint
```

Typecheck

```bash
npm run typecheck
```

Tests

```bash
npm run test
npm run test:watch
```

Build

```bash
npm run build
```

Full verification

```bash
npm run check
```

PWA verification

- Run on localhost in Chromium and inspect Application → Manifest and Service Workers.
- Confirm every manifest icon loads and `/sw.js` controls `/app`.
- Test installation only through the explicit Arabic install action.
- Switch Network to Offline and reload an authenticated route; verify the
  public offline page appears and no private Dashboard HTML is replayed.
- Restore connectivity and retry. Verify notifications still use the same
  Service Worker and that updates reload only after explicit confirmation.

Branch and commit guidance

- Create a feature branch per task: `feat/short-description` or `fix/short-description`.
- Commit messages use `type(scope): short description`.
- Include tests and update docs for behavioural changes.

One task per commit and keep changes focused.

Environment files

- Use `.env` locally and do not commit it. Keep `.env.example` updated.

Database migrations

- Will be introduced in future tasks. Migration files must be committed and applied via documented tooling.
- Trusted database functions that perform multi-table writes may use `SECURITY DEFINER` and advisory locking to preserve RLS and ensure atomicity.

Scheduled reminder deployment

1. Create VAPID keys outside the repository. Put only the public key in the web
   app environment as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
2. Store `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
   `REMINDER_INVOCATION_TOKEN`, and the platform-provided Supabase credentials
   with `supabase secrets set`; never echo secret values into logs.
3. Create Vault secrets named `wird_project_url` and
   `wird_reminder_invocation_token`, then apply the migration. Enable `pg_cron`,
   `pg_net`, and Vault if the project does not already provide them.
4. Deploy with `supabase functions deploy send-due-reading-reminders`. Verify
   exactly one `wird-send-due-reading-reminders` row in `cron.job`.
5. Remove the schedule safely with
   `select cron.unschedule(jobid) from cron.job where jobname =
   'wird-send-due-reading-reminders';`.

Documentation

- Behavioural changes must include documentation updates under `docs/`.

Reviewing Codex changes

- Verify the repository state, run verification commands, and confirm tests pass.

Definition of done

- Code compiles with no TypeScript errors, passes linting, tests, and build.
- Tests added for new logic.
- Documentation updated where behaviour changed.
