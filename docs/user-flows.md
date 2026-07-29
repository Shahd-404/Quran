# Wird — User Flows

## Delete all reading data

1. The signed-in user opens `/app/settings/privacy`.
2. The first destructive action opens confirmation and performs no mutation.
3. The dialog requires `حذف بياناتي` exactly. Cancel and Escape do nothing.
4. One authenticated same-origin mutation atomically deletes only the current
   user's reading records.
5. The browser attempts local Push unsubscription and redirects the still
   signed-in user to `/app/plan/new`.
6. Success and local-cleanup outcomes are shown without exposing private data.

Failures preserve all database data. There is no fake undo or retained copy.

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
- System responses: Validate inputs, show deterministic session allocation and
  a live, non-persisted expected khatma date in the detected plan timezone, and
  allow edits.
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
- System responses: Display today's date, total assigned pages, completed count,
  progress %, list of sessions with scheduled times and states, current unread
  page, khatma progress, and a motivational expected completion date derived
  from the saved plan target and timezone.
- Success: User sees clear action to begin next session.
- Mobile hierarchy: The compact daily summary, next session, daily progress,
  and completion estimate appear first. Remaining daily sessions are disclosed
  only after the user selects `عرض جميع جلسات اليوم`; opening or closing the
  disclosure never opens, completes, or mutates a session.
- Mobile navigation: Authenticated pages provide fixed access to Today,
  History, Plan, and Settings. Account and privacy actions remain under
  Settings rather than competing with the daily reading action.
- Edge: If offline, show cached state and indicate offline; if plan paused, show paused state.
- Offline navigation never replays cached authenticated Dashboard HTML; it shows
  the public Arabic offline page until connectivity returns.

4a) Choosing the display theme

- Preconditions: Any application page is open in a supported browser.
- User actions: Use the theme button in the global header.
- System responses: Switch between light and dark tokens immediately and save
  the preference in `localStorage`.
- Success: The choice is applied before hydration on future visits. With no
  saved choice, the initial theme follows the operating-system preference.
- Edge: Theme state is presentation-only and never changes reading data,
  assignments, notifications, or progress.

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
- System responses: Record completion timestamp, mark the existing active khatma and plan completed, and keep `current_unread_page` explicitly at 604.
- Success: Dashboard shows khatma completed state; user offered calm congratulatory state and option to start a new khatma.

12) Completing a khatma

- Preconditions: Page 604 is completed.
- User actions: View completion state; optionally start new khatma.
- System responses: Persist khatma completion record; keep `current_unread_page` at 604; do not create another plan, khatma, or daily assignment automatically.
- Success: A dedicated Arabic completion state shows the completion date, cycle number, starting page, completed page count, and the explicit `ابدأ ختمة جديدة` action.

13) Starting a new khatma

- Preconditions: The authenticated user has no active plan or khatma and has a completed plan linked to a completed khatma with a complete schedule.
- User actions: Choose `ابدأ ختمة جديدة`; review the previous daily pages, session count, schedule, and timezone; then choose `ابدأ بنفس الخطة` or `إنشاء خطة مختلفة`. Reusing the plan requires a second explicit confirmation and an effective date.
- System responses: For reuse, atomically create a new active plan and active khatma from page 1, copy the complete previous configuration into new rows, and assign the next cycle number. Never mutate the completed records. For a different plan, open the existing onboarding flow without creating anything first.
- Success: If effective today, the dashboard may create the first assignment normally. If effective in the future, the dashboard shows `الخطة ستبدأ في…` and creates no assignment until that local date.
- Edge: A repeated or concurrent confirmation returns `ACTIVE_PLAN_EXISTS` after the first succeeds and creates no duplicates.

14) Editing a reading plan

- Preconditions: Active plan exists.
- User actions: Choose the visible `إعدادات الخطة` action from the active-plan summary, open `/app/plan/settings`, change daily pages, session count, or session times, preview the new page distribution, review old and new settings, and confirm with `حفظ تعديلات الخطة`.
- System responses: Preview the revised expected khatma date immediately without
  saving, then atomically update only the active plan configuration and
  schedule after confirmation. Preserve all previously created assignments and
  sessions, including their page ranges, times, and statuses. Apply the new
  values to the first assignment generated after the save.
- Success: Return to `/app`, show `تم حفظ تعديلات الخطة`, and display the updated plan summary while the current assignment cards retain their original page ranges and scheduled timestamps.
- Edge: The settings flow cannot change unread page, completed progress, active khatma, existing assignments, or existing sessions. Changing the starting page or resetting progress requires a separate warned operation.

15) Viewing reading history and the khatma archive

- Preconditions: Authenticated user; history may be empty.
- User actions: Choose `سجل القراءة` from the Dashboard, browse paginated completed sessions, and optionally choose `عرض تفاصيل الختمة`.
- System responses: Read append-only `reading_progress_events` as the authoritative history source, group events by the saved assignment local date, format completion times in the historical assignment or plan timezone, and show current and completed khatmas without mutating any record.
- Success: The user sees total pages, completed sessions, completed khatmas, daily session groups, and a khatma-specific chronological timeline.
- Edge: Invalid pages fall back to page 1. A malformed or foreign khatma ID returns the same not-found state and reveals no ownership information. Empty history shows a calm Arabic state.

16) Pausing a reading plan

- Preconditions: Active plan exists.
- User actions: Tap `Pause Plan`, confirm.
- System responses: Mark plan `paused` immediately; existing progress and history preserved; daily assignments for future days are not created while paused.
- Success: Dashboard shows paused state and option to resume.

17) Notification permission accepted

- Preconditions: User has interacted with an action (e.g., `Enable reminders`).
- User actions: Tap `Enable reminders`, accept browser notification permission.
- System responses: Register this device securely, persist its subscription, and
  send one reminder per due session within the allowed delivery window.
- Success: Notifications may be delivered at scheduled times; tapping a notification opens the correct session.
- Edge: If permission granted but push endpoint fails, show a non-blocking error and continue core functionality.
- Edge: Disabling reminders deactivates only the current browser subscription;
  subscriptions on the user's other devices remain active.

18) Notification permission denied

- Preconditions: User triggers `Enable reminders` flow and denies permission.
- User actions: Deny permission.
- System responses: Store preference; do not attempt to send notifications; offer non-intrusive instructions for enabling later.
- Success: Core reading features work without reminders.

19) Recovering from a Quran page loading error

- Preconditions: Reader fails to load assigned page(s).
- User actions: Tap retry, or open network status.
- System responses: Load the stored start and end pages as one inclusive,
  ascending range. If any required page fails, show one safe error state with a
  correlation ID and provide retry; render no incomplete range as successful
  and do not record an opened position. Retry repeats only the complete content
  loading operation. If offline, show a clear offline indicator; if a page is
  permanently missing from the provider, show a fallback message and contact
  support.
- Success: User recovers by retrying or using cached content.
- Quran text is not claimed as offline content. A connectivity failure displays
  a safe Arabic error and retry action without recording position or completion.

20) Installing and updating the PWA

- Preconditions: A supporting browser exposes its install prompt.
- User actions: Choose `تثبيت تطبيق ورد`, then confirm through the browser.
- System responses: Show the prompt only after the explicit click and hide it
  after acceptance or dismissal. Installed standalone mode shows no install action.
- Update: A waiting Service Worker shows `يتوفر تحديث جديد`; activation and
  reload occur only after choosing `تحديث التطبيق`, never automatically while reading.

20) Signing out and returning on another device

- Preconditions: User has account with progress saved.
- User actions: Sign out on device A. On device B, sign in with same account.
- System responses: Load user state from server (active plan, current unread page, khatma records). Ensure timezone handling: server stores timestamps timezone-safe; presentation uses user's saved timezone.
- Success: User sees consistent current unread page and daily progress on device B.
- Edge: If device B has different local time, scheduled session times are interpreted in the user's saved timezone; this may cause notifications to fire at different local wall times if device timezone differs — document for later consideration.
