Wird — Product Specification (MVP)

## Reading-data deletion

An authenticated user may permanently delete all reading plans, schedules,
khatmas, assignments, sessions, progress history, notification deliveries, and
Push subscriptions. This is distinct from account deletion: the Auth account,
email credentials, profile, display name, locale, and timezone are preserved.
The action requires the exact irreversible phrase `حذف بياناتي`. After success
the signed-in user returns to onboarding as a new reader.

Database subscription deletion stops reminders for every device. The current
browser also attempts local Push unsubscription; removed database records prevent
future sends to other browsers.

## Product summary

Wird is a mobile-first Arabic (RTL) web application that helps Muslims maintain a daily Quran reading routine by creating and following a deterministic, time-scheduled reading plan (خطة الورد) that assigns Quran pages to reading sessions each day.

## User problem

Many users want to complete regular Quran khatmas but struggle to maintain a calm, repeatable daily habit that fits their schedule. They need a simple, respectful tool that schedules small, consistent reading sessions and records progress reliably across devices.

## Product goals

- Make daily Quran reading predictable, calm, and repeatable.
- Provide a clear, accountable way to mark reading sessions as completed.
- Keep progress consistent and safe across devices and timezones.
- Respect Arabic-first, RTL presentation and accessibility.

## Non-goals

- Audio recitation, tafsir, translations, social features, or monetisation are out of scope for the MVP.

## Target users

- Arabic-speaking Muslims who prefer a focused, non-gamified tool to maintain daily Quran reading and complete khatmas.

## Main value proposition

Wird reduces planning friction by splitting a user's daily page target into scheduled sessions, reminding them, and recording explicit completions so they can reliably complete a Quran khatma over time.

## Product principles

1. Arabic-first and RTL interface.
2. Mobile browsers are the primary target platform.
3. The application is installable as a PWA with a safe public offline shell.
4. Calm, non-manipulative user experience.
5. Quran text comes from a trusted, reviewable source (provider pluggable later).
6. Explicit user confirmation is required to mark sessions completed.
7. No automatic advancement of user progress; no silent completion.
8. Time-based behaviour uses the user’s saved timezone.

## Core terminology (English — Arabic label)

- Reading plan — خطة الورد
- Daily assignment — مهمة اليوم
- Reading session — جلسة الورد
- Current unread page — الصفحة التالية غير المقروءة
- Completed page — صفحة مقروءة
- Scheduled time — وقت مجدول
- Missed session — جلسة فائتة
- Khatma — ختمة
- Khatma cycle — دورة الختمة
- Quran page — صفحة (1–604)
- Active plan — خطة نشطة
- Paused plan — خطة موقوفة

## Main features (MVP)

- Account registration and authentication.
- Create one active reading plan (start page, pages/day, sessions/day, session times, timezone).
- Deterministic page distribution across sessions.
- Daily assignments generated per local calendar day.
- Mobile-first RTL reader that displays assigned page ranges for a session.
- Explicit session completion with confirmation and timestamp.
- Persistent current unread page and khatma progress.
- Basic dashboard showing today’s progress and sessions.
- A derived, motivational khatma completion estimate based on the next unread
  page, daily page target, effective date, and saved plan timezone.
- Read-only Arabic reading history with completed-session timelines and current
  and completed khatma archives.
- Opt-in Web Push reminders for scheduled reading sessions on each subscribed device.
- Installable PWA metadata, local icons, connectivity feedback, and a private-data-safe offline fallback.

## Functional requirements

- The interface language is Arabic and layout is RTL.
- A reading plan must specify: starting page (1–604), pages per day (>=1, <=604), sessions per day (1–6), scheduled time for each session, and timezone.
- Session times must be distinct and stored in chronological order.
- Pages per day are divided deterministically across sessions; remainder assigned to earliest sessions.
- Daily assignments are created once per local calendar day from the active plan.
- The reader loads every page from a session's stored start page through its
  stored end page as one validated inclusive range. It renders no partial range
  as a successful session, and it records no open position until the complete
  initial range has loaded.
- A session becomes `in_progress` when opened; only explicit user confirmation marks it `completed`.
- Completion stores a timestamp (presentation uses user timezone) and advances the current unread page only for explicitly completed pages.
- Completing page 604 completes the khatma and records start and completion dates.
- Plan creation, plan settings, and the active-plan Dashboard show an
  informational expected completion date. The estimate is never persisted and
  never changes assignments, sessions, or reading progress.
- `reading_progress_events` is the authoritative append-only source for reading
  history. History pages never regenerate events or infer completion from mutable
  session state alone.
- History groups events by the saved assignment local date and formats times in
  the historical assignment or plan timezone. Event lists use stable, bounded
  server-side pagination.

## Non-functional requirements

- Responsive design optimized for mobile viewports.
- RTL layout correctness throughout.
- Public application assets and the offline shell may be cached. Authenticated
  pages, assignments, progress, API responses, and Quran text are not cached.
- Deterministic behaviour across devices; server-authoritative state ensures consistency.
- Minimal latency for opening assigned pages and marking completion.

## Accessibility requirements

- Arabic-visible text and semantics for screen readers.
- Scalable text sizes and high-contrast themes supported.
- Touch targets sized for mobile interaction.
- Keyboard navigation for desktop.
- The interface provides explicit light and dark themes. The saved browser
  preference is applied before hydration; when no preference exists, the
  operating-system color preference is the initial value.

## Arabic and RTL requirements

- All user-facing strings default to Arabic.
- Visual alignment and reading order must follow RTL conventions.
- Date/time input and presentation should use localized Arabic numerals where appropriate but preserve clear timezone designators.

## Visual system requirements

- Alexandria is the primary Arabic UI typeface, with IBM Plex Sans Arabic,
  Cairo, and system Arabic fonts as fallbacks.
- The mobile type scale uses 14px regular body text, 12–13px supporting text,
  17–18px semibold card titles, 24px mobile page titles, and 32px desktop page
  titles. Bold weight is reserved for the primary page heading and essential
  numeric values.
- Light mode uses a warm off-white canvas, white surfaces, deep green actions,
  and restrained beige/gold accents.
- Dark mode uses a deep charcoal canvas, elevated dark surfaces, readable
  neutral text, and a soft green accent.
- Shared spacing, radii, shadows, fields, buttons, badges, progress bars,
  dialogs, status messages, header, and footer use semantic design tokens.
- Authenticated mobile pages expose Today, History, Plan, and Settings through
  a compact bottom navigation. The active Dashboard keeps one dominant reading
  action and places remaining sessions and secondary settings behind
  presentation-only disclosures.
- Authenticated desktop navigation exposes Dashboard, History, Plan, and
  Settings at the same breakpoint where the mobile navigation is hidden.
- Application controls and statuses use the Lucide outline icon system with
  visible Arabic labels and accessible names where an icon stands alone.
- Every application page includes the footer text
  `صُنع بمحبة — إهداء لعبدالله الفيل`.

## Privacy considerations

- User accounts required; minimal personal data collected (email/identifier, timezone preference).
- Reading progress and khatma history are personal data and must be stored securely.
- Notifications require explicit permission and are not requested on first load.
- Reminder delivery uses the stored `scheduled_for` timestamp, remains optional,
  and never changes session or reading progress. Browser and operating-system
  scheduling may delay display slightly.
- No sharing of progress to external services by default.

## Success criteria for the MVP

- A user can register, create a plan, follow daily sessions, explicitly mark sessions completed, and finish a khatma.
- Progress is consistent across two devices using the same account.
- Notifications permission flow does not trigger on first load and opens the correct session when tapped.
- No automatic marking of pages as read occurs.

## Open questions (do not block initial development)

- Which trusted Quran data provider(s) will be used in production? (Choose later; provider must be replaceable.)
- Should Arabic-Indic numerals be used everywhere, or only in specific UI elements? (Default: use locale-aware formatting.)
- Should the fallback timezone be `Africa/Cairo` or configurable during onboarding? (MVP: fallback to `Africa/Cairo`.)
- Will account authentication require email verification or OAuth? (MVP: minimal email/password or email link — implementer choice.)

---

References: page boundaries use pages 1 through 604 throughout this specification.
