# Wird — User Flows

All flows assume the interface language is Arabic and layout is RTL. Page boundaries use pages 1–604.

For each flow we document: Preconditions, User actions, System responses, Success outcome, and Important errors/edge states.

1) New user registration

- Preconditions: None; user opens the app in a supported mobile browser.
- User actions: Tap `Register`, provide required credentials (email/password or email link), accept minimal terms.
- System responses: Create account, store timezone detected from browser (fallback `Africa/Cairo`), show onboarding offering to create a reading plan.
- Success outcome: Authenticated user lands on plan creation screen or dashboard with empty state.
- Errors/edge: Email already in use (show message), timezone detection failed (use fallback and show note), network error (retry prompt).

2) Creating the first reading plan

- Preconditions: Authenticated user, no active plan.
- User actions: Open `Create Plan`, enter starting page (1–604), daily pages (>=1), sessions per day (1–6), set distinct scheduled times, review detected timezone, tap `Review`.
- System responses: Validate inputs, show deterministic session allocation preview, allow edits.
- Success outcome: User confirms plan; system saves active plan and creates today's daily assignment.
- Errors/edge: Invalid page number, sessions > daily pages (prevent), duplicate times (prevent), missing times (prevent).

3) Reviewing and confirming the plan

- Preconditions: Plan draft present.
- User actions: Inspect session-by-session page ranges, adjust times or counts, confirm.
- System responses: Persist plan, generate today's assignment and session instances for current local day.
- Success: Plan active, dashboard shows today's assignment.
- Edge: Appears to start on same day — if confirmed late, assignment still created for current local day; plan edits apply next day unless user explicitly replaces current unread page.

4) Viewing today’s dashboard

- Preconditions: Authenticated user with active plan.
- User actions: Open app or dashboard.
- System responses: Display today's date, total assigned pages, completed count, progress %, list of sessions with scheduled times and states, current unread page, khatma progress.
- Success: User sees clear action to begin next session.
- Edge: If offline, show cached state and indicate offline; if plan paused, show paused state.

5) Opening a scheduled session

- Preconditions: User has a session (state upcoming or available).
- User actions: Tap the session at or after its scheduled time.
- System responses: Mark session `in_progress` (presentation), open reader to the session's first page (or last-opened page if returning). Do not mark as completed.
- Success: Reader opens and user may read assigned pages.
- Edge: If pages fail to load, show retry and error recovery (see flow 18).

6) Opening a session early

- Preconditions: Session scheduled for later today.
- User actions: Tap the future session from dashboard.
- System responses: Allow opening; mark `in_progress` on open, open reader showing assigned pages.
- Success: User may complete session early and explicitly confirm completion.
- Edge: Ensure times remain unchanged for other sessions; opening early does not reorder or change assignments.

7) Completing a reading session

- Preconditions: Session `in_progress` for authenticated user.
- User actions: Tap `تمت قراءة الورد` (Complete session), confirm on the confirmation dialog.
- System responses: Verify session belongs to user and is not already completed; record completion timestamp (store in timezone-safe format; show in user's timezone), mark session `completed`, update daily assignment progress, advance current unread page across pages that were completed, mark daily assignment completed if all sessions completed; if page 604 completed, record khatma completion.
- Success: Session `completed`, dashboard updates counts and next session highlighted.
- Edge: Confirm rejection if network failure (retry), prevent double-completion.

8) Returning to an incomplete session

- Preconditions: A session `in_progress` or `available` with incomplete pages.
- User actions: Reopen session from dashboard.
- System responses: Open reader at the last-opened page for that session; show `تمت قراءة الورد` action available.
- Success: User continues reading; progress not advanced until explicit completion.

9) Missing a scheduled session

- Preconditions: Session scheduled time passed and user did not complete it.
- User actions: User does nothing at scheduled time.
- System responses: Session is presented as `missed` in the dashboard (presentation only); session remains available and may be completed later; no automatic advancement.
- Success: User can still complete session later and mark it completed.
- Edge: Missed flag must not imply pages were skipped.

10) Completing all sessions for the day

- Preconditions: All sessions exist for today's assignment.
- User actions: Complete each session with explicit confirmations.
- System responses: Mark each session completed and update daily assignment; when all sessions are completed, mark assignment complete and set next unread page accordingly.
- Success: Dashboard shows 100% daily progress.

11) Reaching page 604

- Preconditions: User completes a session that includes page 604.
- User actions: Finish session and confirm completion.
- System responses: Record completion timestamp and detect khatma completion; create a khatma record with start and completion dates.
- Success: Dashboard shows khatma completed state; user offered calm congratulatory state and option to start a new khatma.

12) Completing a khatma

- Preconditions: Page 604 is completed.
- User actions: View completion state; optionally start new khatma.
- System responses: Persist khatma completion record; do not change current unread page until user chooses to start a new khatma.
- Success: Historical khatma visible; if user starts new khatma, create new cycle and reset unread page to page 1.

13) Starting a new khatma

- Preconditions: User completed previous khatma or is starting manually.
- User actions: Choose `Start New Khatma`, confirm starting page (default 1) and confirm.
- System responses: Create new khatma cycle, set active plan start page as chosen (if user chooses to replace plan), or create a new plan if required.
- Success: New khatma cycle begins with unread page set to page 1.

14) Editing a reading plan

- Preconditions: Active plan exists.
- User actions: Open `Edit Plan`, change daily pages / sessions / times / starting page / pause, then save.
- System responses: Validate edits. For changes to counts/times, apply from next local calendar day; for pause, apply immediately. Do not modify existing sessions for the current day unless user explicitly replaces the reading start.
- Success: New plan parameters take effect as specified.
- Edge: Changing starting page requires explicit confirmation and warning because it changes unread page; replacing plan does not delete khatma history.

15) Pausing a reading plan

- Preconditions: Active plan exists.
- User actions: Tap `Pause Plan`, confirm.
- System responses: Mark plan `paused` immediately; existing progress and history preserved; daily assignments for future days are not created while paused.
- Success: Dashboard shows paused state and option to resume.

16) Notification permission accepted

- Preconditions: User has interacted with an action (e.g., `Enable reminders`).
- User actions: Tap `Enable reminders`, accept browser notification permission.
- System responses: Register notification subscriptions where supported; schedule reminder behaviour (implementation detail later); show success state.
- Success: Notifications may be delivered at scheduled times; tapping a notification opens the correct session.
- Edge: If permission granted but push endpoint fails, show a non-blocking error and continue core functionality.

17) Notification permission denied

- Preconditions: User triggers `Enable reminders` flow and denies permission.
- User actions: Deny permission.
- System responses: Store preference; do not attempt to send notifications; offer non-intrusive instructions for enabling later.
- Success: Core reading features work without reminders.

18) Recovering from a Quran page loading error

- Preconditions: Reader fails to load assigned page(s).
- User actions: Tap retry, or open network status.
- System responses: Show error state and explanatory message; provide retry; if offline, show cached pages if available and a clear offline indicator; if page permanently missing from provider, show fallback message and contact support.
- Success: User recovers by retrying or using cached content.

19) Signing out and returning on another device

- Preconditions: User has account with progress saved.
- User actions: Sign out on device A. On device B, sign in with same account.
- System responses: Load user state from server (active plan, current unread page, khatma records). Ensure timezone handling: server stores timestamps timezone-safe; presentation uses user's saved timezone.
- Success: User sees consistent current unread page and daily progress on device B.
- Edge: If device B has different local time, scheduled session times are interpreted in the user's saved timezone; this may cause notifications to fire at different local wall times if device timezone differs — document for later consideration.
