Wird — Product Specification (MVP)

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
3. PWA-installable behaviour is supported in the future.
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
- Reminder notification foundation (permission flow documented — implementation later).

## Functional requirements

- The interface language is Arabic and layout is RTL.
- A reading plan must specify: starting page (1–604), pages per day (>=1, <=604), sessions per day (1–6), scheduled time for each session, and timezone.
- Session times must be distinct and stored in chronological order.
- Pages per day are divided deterministically across sessions; remainder assigned to earliest sessions.
- Daily assignments are created once per local calendar day from the active plan.
- A session becomes `in_progress` when opened; only explicit user confirmation marks it `completed`.
- Completion stores a timestamp (presentation uses user timezone) and advances the current unread page only for explicitly completed pages.
- Completing page 604 completes the khatma and records start and completion dates.

## Non-functional requirements

- Responsive design optimized for mobile viewports.
- RTL layout correctness throughout.
-- Offline-friendly read caching where possible (no syncing guarantees offline).
- Deterministic behaviour across devices; server-authoritative state ensures consistency.
- Minimal latency for opening assigned pages and marking completion.

## Accessibility requirements

- Arabic-visible text and semantics for screen readers.
- Scalable text sizes and high-contrast themes supported.
- Touch targets sized for mobile interaction.
- Keyboard navigation for desktop.

## Arabic and RTL requirements

- All user-facing strings default to Arabic.
- Visual alignment and reading order must follow RTL conventions.
- Date/time input and presentation should use localized Arabic numerals where appropriate but preserve clear timezone designators.

## Privacy considerations

- User accounts required; minimal personal data collected (email/identifier, timezone preference).
- Reading progress and khatma history are personal data and must be stored securely.
- Notifications require explicit permission and are not requested on first load.
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
