# Wird — Business Rules (Testable)

This document lists stable, testable business rules grouped by domain. Each rule includes an ID, statement, reason/intent, examples, and relevant edge cases.

Section keys: BR-USER-*, BR-PLAN-*, BR-SCHEDULE-*, BR-DISTRIBUTION-*, BR-DAILY-*, BR-SESSION-*, BR-COMPLETE-*, BR-MISSED-*, BR-PAGE-*, BR-KHATMA-*, BR-TIME-*, BR-NOTIF-*, BR-EDIT-*, BR-INTEGRITY-*.

User and account rules

- BR-USER-001: A user must have an authenticated account to create or run a reading plan.
  - Reason: MVP requires server-authoritative state and cross-device consistency.
  - Example: Unauthenticated visitors see an empty state prompting registration.
  - Edge cases: Account creation may be blocked by network errors (retry).

Reading plan rules

- BR-PLAN-001: A user may have at most one active reading plan at any time.
  - Reason: Simplifies progress model and avoids conflicting daily assignments.
  - Example: Creating a new plan requires pausing or replacing the existing active plan.
  - Edge: Replacing a plan preserves khatma history.

- BR-PLAN-002: A plan must include starting page (1–604), pages per day (>=1, <=604), sessions per day (1–6), and a scheduled time for each session.
  - Reason: Ensures valid page ranges and reasonable session counts.
  - Example: A plan with 3 pages/day and 3 sessions must specify 3 distinct times.
  - Edge: Sessions per day cannot exceed daily pages (see BR-DISTRIBUTION-002).

- BR-PLAN-003: Sessions per day must not exceed the number of daily pages.
  - Reason: Prevents zero-page sessions.
  - Example: 2 pages/day and 3 sessions/day is invalid.

Schedule rules

- BR-SCHEDULE-001: Each session must have a scheduled time; two sessions cannot share the same scheduled time.
  - Reason: Prevents ambiguity in chronological order and notifications.
  - Example: Times 06:30, 14:00, 21:30 are valid; 06:30, 06:30, 21:30 is invalid.

- BR-SCHEDULE-002: Session times must be stored in chronological order within the plan.
  - Reason: Ensures deterministic page distribution and presentation.

Page distribution rules

- BR-DISTRIBUTION-001: Daily pages are divided as evenly as possible across the sessions; remainder pages are assigned to earlier sessions.
  - Reason: Deterministic, fair allocation.
  - Example: 5 pages, 3 sessions -> [2,2,1].

- BR-DISTRIBUTION-002: No session may be assigned zero pages.
  - Reason: Each scheduled session must contain at least one page to read.
  - Example: 1 page/day with 2 sessions is invalid.

- BR-DISTRIBUTION-003: Pages assigned to a session must be consecutive and follow Quran page order.
  - Reason: Preserve reading order and avoid repetition.
  - Example: Session pages [10–11], next session [12–13].

Daily assignment rules

- BR-DAILY-001: The system creates exactly one daily assignment per local calendar day for an active plan.
  - Reason: Provide a single authoritative assignment per day.
  - Example: On 2026-07-25 (user timezone), one assignment is generated.
  - Edge: Assignment generation must be idempotent (do not create duplicates).

- BR-DAILY-002: A daily assignment contains one or more reading sessions derived deterministically from the active plan.
  - Reason: Keep daily structure predictable.

- BR-DAILY-003: A page must not appear more than once in the same daily assignment.
  - Reason: Prevent double-counting and inconsistent progress.

Session state rules

- BR-SESSION-001: Valid session states are `upcoming`, `available`, `in_progress`, `completed`, and `missed`.
  - Reason: Standardize session presentation and lifecycle.

- BR-SESSION-002: A session is `upcoming` when its scheduled time is in the future and it has not been opened.
  - Example: Scheduled 21:30 and current time 18:00 -> `upcoming`.

- BR-SESSION-003: A session is `available` when its scheduled time has passed and it has not been opened or completed.
  - Example: Scheduled 06:30 and current time 07:00 and not opened -> `available`.

- BR-SESSION-004: Opening the reader for a session transitions it to `in_progress` for presentation.
  - Reason: Distinguishes reading activity from completion.
  - Edge: Opening does not by itself mark completion.

- BR-SESSION-005: Only an explicit user confirmation can transition a session to `completed`.
  - Reason: Respect user's explicit intent and avoid silent progress.

- BR-SESSION-006: A `completed` session stores a completion timestamp and cannot be completed twice.
  - Example: Attempting to mark already-completed session returns an idempotent success or error preventing duplicate recording.

- BR-SESSION-007: `missed` is a presentation-only state indicating a scheduled time has passed without completion; it does not imply pages were skipped.
  - Reason: Avoid automatic changes to unread page or progress.

Completion rules

- BR-COMPLETE-001: When completing a session the server must: verify session ownership, verify not already completed, record timestamp, mark session completed, update daily assignment progress, advance current unread page across explicitly completed pages, and detect khatma completion.
  - Reason: Maintain atomic, consistent progress updates.
  - Edge: Network failure should retry or queue until successful; client-side UI must protect against duplicate submissions.

Missed session rules

- BR-MISSED-001: Missing a scheduled session does not automatically advance the current unread page nor mark pages as completed.
  - Reason: Prevent silent skipping of pages.
  - Example: User misses morning session but completes evening session later; unread pages remain until explicitly completed.

- BR-MISSED-002: Missed sessions remain available to be completed later.

Quran page boundary rules

- BR-PAGE-001: Quran pages are defined as integers 1 through 604 inclusive.
  - Reason: Fixed page boundary for MVP.
  - Edge: Attempts to set start page <1 or >604 must be rejected.

Khatma rules

- BR-KHATMA-001: Completing page 604 completes the current khatma cycle.
  - Reason: Page 604 is definitive end-of-Quran in the page model.

- BR-KHATMA-002: A khatma record contains its start date and completion date.
  - Example: Khatma start 2026-01-01, completed 2026-07-25.

- BR-KHATMA-003: Completing a khatma does not automatically start a new khatma; user must explicitly start a new khatma.
  - Reason: Respect user agency.

Timezone rules

- BR-TIME-001: The timezone should be detected from the browser during onboarding; if detection fails the timezone defaults to `Africa/Cairo`.
  - Reason: Ensure schedule uses a reasonable default.

- BR-TIME-002: All displayed completion times must use the user's saved timezone for presentation.
  - Reason: Avoid confusing mixed-time displays across devices.

- BR-TIME-003: Underlying timestamps must be stored in a timezone-safe format (e.g., UTC plus offsets) for later conversion.

Notification rules (behavioural; implementation later)

- BR-NOTIF-001: Notifications require explicit permission and the permission prompt must not be shown automatically on first load.
  - Reason: Respect user privacy and avoid intrusive prompts.

- BR-NOTIF-002: A notification must identify the relevant reading session and, when tapped, open the correct session in the app.

- BR-NOTIF-003: A notification must not mark a session as completed.

- BR-NOTIF-004: No notification should be sent if the session is already completed.

Plan editing rules

- BR-EDIT-001: Changes to daily pages, session counts, or session times apply from the next local calendar day.
  - Reason: Avoid changing the current day's assignments unexpectedly.

- BR-EDIT-002: Pausing a plan takes effect immediately and prevents future daily assignments from being generated.

- BR-EDIT-003: Replacing a plan preserves khatma history and does not delete past completion records.

- BR-EDIT-004: Changing the starting page requires an explicit warning and confirmation because it can alter the current unread page.

Data integrity rules

- BR-INTEGRITY-001: Daily assignment generation is idempotent: invoking assignment generation twice for the same local calendar day and plan must not create duplicate assignments.

- BR-INTEGRITY-002: A page cannot be marked `completed` by more than one user action; completion operations must be idempotent and atomic.

- BR-INTEGRITY-003: Cross-device state must be authoritative on the server; clients must reconcile local caches with server state during sign-in.

---

Notes:

- These rules are written to be automated in tests (unit and integration). Each rule can be translated into assertions against the server API and database state.
