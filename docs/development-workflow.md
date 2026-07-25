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

Documentation

- Behavioural changes must include documentation updates under `docs/`.

Reviewing Codex changes

- Verify the repository state, run verification commands, and confirm tests pass.

Definition of done

- Code compiles with no TypeScript errors, passes linting, tests, and build.
- Tests added for new logic.
- Documentation updated where behaviour changed.
