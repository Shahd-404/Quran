# AGENTS — Repository Rules and Guidance for Codex Tasks

This file defines the required rules, expectations, and structure that future Codex tasks must follow when modifying this repository. Read this file and the `docs/` product documents before implementing changes.

1) Project overview

- Product: Wird — Arabic-first Quran daily-reading planner.
- Application name (UI): ورد
- Authoritative product docs: files under `docs/` (see list below).
- Quran page model: pages 1 through 604.
- Reading progress must never advance without explicit user confirmation.

2) Source-of-truth documents

The following documents must be read before implementing tasks that affect behaviour:

- docs/product-spec.md
- docs/user-flows.md
- docs/business-rules.md
- docs/mvp-scope.md
- docs/architecture.md
- docs/development-workflow.md

3) Technology stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- Vitest + React Testing Library
- npm

4) Project structure responsibilities

- `src/app` — routing, layouts, and page composition.
- `src/components` — reusable UI.
- `src/modules` — product-domain code (business logic, separate from UI).
- `src/lib` — shared helpers and utilities.
- `src/config` — environment-independent constants.
- `src/types` — global shared types.
- `src/test` — test setup and helpers.

5) Coding rules

- Strict TypeScript mode is required. Avoid `any` and prefer explicit types.
- Keep modules focused and small; avoid speculative abstractions.
- Do not implement product features out of scope of the current task.
- No automatic advancement of Quran progress anywhere in the codebase.

6) React and Next.js rules

- Prefer Server Components. Use `"use client"` only when necessary.
- Do not perform privileged server operations in client components.
- Keep client boundaries small and well-documented.

7) Styling rules

- Mobile-first design and RTL support by default.
- Use CSS logical properties where applicable.

8) Testing rules

- Add tests for new business logic and regressions.
- Prefer behaviour-first tests. Avoid snapshot-only tests.

9) Security and data rules

- Never commit secrets. Use `.env` files locally (ignored in Git) and `.env.example` for templates.
- Do not expose server secrets to client bundles.

10) Task execution protocol (required for Codex)

Every task must:

1. Inspect the repository and read relevant docs.
2. State a concise implementation plan.
3. Modify only files relevant to the task.
4. Add or update tests.
5. Run lint, typecheck, and tests locally.
6. Report changed files and commands run.

11) Completion report format

Future tasks must end responses using the following headings:

Summary

Files changed

Implementation notes

Tests added or updated

Commands run

Command results

Assumptions

Remaining issues

Confirmation
