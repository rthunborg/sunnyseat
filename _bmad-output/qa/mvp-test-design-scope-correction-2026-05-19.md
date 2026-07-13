# MVP Test Design Scope Correction — Free Planner, Date Picker, Favourites

**Date:** 2026-05-19
**Status:** Active MVP QA addendum
**Supersedes for active MVP:** `test-design-qa.md`, `test-design-progress.md`, `test-design-architecture.md`, and `test-design/sunnyseat-handoff.md` wherever those documents treat Season Pass, Swish, premium activation, payment failure, premium recovery, premium JWTs, or premium-only date planning as active scope.

## Active MVP Scope

Planner, future date selection, future sun simulation, confidence display, auto-refresh, and favourites are free MVP functionality. No active MVP test should require a Season Pass, premium flag, Swish flow, payment route, premium recovery, or lock badge.

> **Forward-work supersession (2026-07-12):** Story 12.13 supersedes this addendum's user-facing confidence-display clauses. Confidence remains computed internally, but forward work expects no visible or screen-reader confidence number. Weather and prediction-uncertainty honesty remain required. See the [Epic 12 test-design delta](epic-12-test-design-2026-07-12.md).

Future Monetization remains preserved in `_bmad-output/planning-artifacts/future-monetization-season-pass.md`.

## Story-Level QA Requirements

### Story 2.5 — Free Time & Date Planner

- Unit/component tests cover time slider rendering, reduced-motion snap behaviour, date picker selection, Swedish date/time formatting, and slow-response behaviour that keeps existing pin state visible.
- Integration tests cover selected date/time flowing through map pins, VenueQuickInfo, venue list cards, and venue detail.
- E2E or visual validation confirms planner/date chrome appears on the active map composites without locked-planning prompts, Season Pass copy, Swish CTA, payment UI, or paywall affordances.
- Review includes the MVP monetization quarantine scan from `epics.md`.

### Story 2.6 — Confidence Display & Auto-Refresh

- Unit/component tests cover blended confidence, stale weather tilde display, hidden confidence when weather is unavailable, and silent geometry-only degradation.
- Query tests cover centralized query keys, 5-minute stale/refetch behaviour, retry exhaustion, and background refresh without visible loading overlays.
- Tests cover confidence behaviour for both today's real-time state and Story 2.5 selected future date/time state without reading premium/payment status.
- Review includes the MVP monetization quarantine scan from `epics.md`.

### Story 2.7 — Save & View Favourites

- Unit/component tests cover favourite button labels, toggled heart state, focus visibility, and localStorage persistence of venue IDs only.
- Integration tests cover saved favourites appearing in QuickInfo, venue detail, venue cards, and the `/favoriter` destination.
- E2E or visual validation covers save, remove, reload persistence, empty state, and navigation active-state behaviour.
- Tests explicitly prove free users can use favourites without account, premium flag, Swish flow, paywall, lock badge, or recovery path.
- Review includes the MVP monetization quarantine scan from `epics.md`.

## Deferred Future Monetization Tests

The following remain deferred until a future Season Pass story reactivates them:

- Swish mobile deep-link purchase.
- Desktop Swish QR payment.
- Payment status polling, timeout, failure, and retry.
- Premium activation persistence/JWT.
- Premium recovery by transaction ID.
- Tests that paid gates do not block unrelated free features.

## Required Story Review Evidence

For Stories 2.5, 2.6, and 2.7, the Dev Agent Record should include:

- Typecheck, lint, and relevant unit/component test results.
- Any required Playwright and visual-validation results.
- The MVP monetization quarantine scan result, with every active-runtime hit resolved or explained as an inactive preserved reference.
- Confirmation that any useful dormant premium/payment code touched during the story was moved out of live runtime paths or preserved in the Future Monetization archive.
