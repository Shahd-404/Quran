# Wird — MVP Scope, Assumptions, and Acceptance Checklist

## Included in MVP

- Account registration and authentication.
- One active reading plan per user.
- Plan creation with: starting page (1–604), daily pages, 1–6 sessions, scheduled times, and timezone.
- Deterministic page distribution across sessions and example behaviour.
- Daily assignment generation per local calendar day.
- Reader that displays assigned page ranges and prevents accidental navigation outside the session.
- Explicit session completion with confirmation and timestamp.
- Dashboard showing today’s assigned pages, completed pages, progress %, session list and times, current unread page, and khatma progress.
- Persistent current unread page and khatma records.
- Missed-session continuity policy (no automatic skipping or advancing).
- Completing page 604 records khatma completion and allows starting a new khatma.
- Arabic RTL interface and mobile-first responsive layout.
- Accessible light/dark themes with saved browser preference and system default.
- Basic loading, empty, offline, and error states.
- PWA foundation (manifest/service-worker ready for later enhancement; no platform-specific packaging).
- Opt-in Web Push reminders and explicit notification permission flow.
- Basic automated tests for core business rules.

## Explicitly excluded from MVP

- Social feed, friends, groups, or public profiles.
- Competitive leaderboards or streak punishment mechanics.
- Payments, subscriptions, or donations.
- Audio recitation, tafsir, translations, or memorisation-specific features.
- Native iOS or Android apps.
- Admin dashboard (unless operational need arises).

## Deferred until after MVP

- Cross-device real-time push syncing of progress when offline.
- Advanced carry-over or adaptive daily targets for missed sessions.
- Rich analytics, social sharing, or community features.
- Multiple simultaneous reading plans.

## Technical assumptions

- Quran page model uses pages 1–604.
- Quran text provider is pluggable; the MVP will integrate a provider via a simple abstraction but selection is deferred.
- Server will store authoritative state for plans, daily assignments, sessions, completions, and khatma records.
- Timestamps saved in a timezone-safe format (e.g., UTC) and presented in the user's saved timezone.
- Timezone detection attempts browser detection first; fallback `Africa/Cairo`.

## Product assumptions

- Users prefer Arabic-first UI and expect RTL layout.
- Users will explicitly confirm completion and value preserving unread pages rather than automatic skipping.
- Notifications require user permission and may be unavailable on some browsers; core experience must work without them.

## MVP release acceptance checklist

- [ ] Account creation and sign-in works end-to-end.
- [ ] User can create a valid reading plan (validation rules enforced).
- [ ] Daily assignments generate correctly and idempotently.
- [ ] Reader opens assigned session pages and prevents accidental page escape.
- [ ] Explicit session completion records timestamp and advances unread page correctly.
- [ ] Completing page 604 records khatma completion and stores start/completion dates.
- [ ] Dashboard shows today's pages, completed count, progress %, and session list.
- [ ] Plan editing applies changes as specified (next-day for times/counts, immediate for pause).
- [ ] Missed-session policy maintained (no automatic page advancement).
- [ ] Arabic RTL layout across screens and accessible text sizes.
- [x] Notification permission flow implemented without prompting on first load.
- [ ] Basic automated tests cover critical business rules and flows.

## Operational notes

- The product must log failures to generate daily assignments and surface errors to maintainers (implementation detail later).

## Open questions and assumptions recorded

- Default fallback timezone is `Africa/Cairo` when detection fails (assumption).
- Numeral formatting: default to locale-aware formatting; final decision deferred.
- Authentication method (email/password or email link) left to implementer.

---

This document, together with `product-spec.md`, `user-flows.md`, and `business-rules.md`, forms the MVP product specification for Wird.
