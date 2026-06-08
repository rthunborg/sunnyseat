---
baseline_commit: 87e8747
drafted_at: 2026-06-07T20:32:20+02:00
---

# Story 3.2: Sun Accuracy Feedback

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Sequencing:** Stories 3.0, 3.0.1-3.0.7, and 3.1 are done. Story 3.2 now follows the corrected shadow-data/confidence/copy model and the completed routing/native-map flow.
>
> **Scope boundary:** Implement sun accuracy feedback and outdoor seating confirmation only. Do not add reviews, review aggregates, ratings persistence, admin/candidate-review queues, premium/payment logic, Swish, Season Pass copy, paywalls, lock badges, geodata imports, SQL execution against live environments, route-calculation APIs, or confidence/shadow recalibration.
>
> **Source conflict note:** UX spec "Feedback & Confirmation Patterns" says outdoor seating is an optional follow-up after sun feedback, while Story 3.2 AC and the `feedback` screen inventory show both questions in the card. Implement the Story 3.2 AC and active visual reference unless Rasmus changes the story.

## Story

As a **user**,
I want to report whether the sun prediction was correct when I arrived at a venue,
So that I can help improve prediction accuracy for everyone.

## Acceptance Criteria

**Given** the user is viewing a venue detail that they have likely visited (based on proximity + time since last view)
**When** the feedback section renders
**Then** an inline FeedbackPrompt card appears within the venue detail scroll area (not as a modal)
**And** the card shows: venue name + address, "Har det här stället uteservering?" with "Ja"/"Nej" buttons, "Var det soligt när du kom?" with "Ja"/"Nej"/clock buttons

**Given** the feedback prompt is displayed
**When** the user taps "Ja" or "Nej" for any question
**Then** the tapped button fills to selected state (amber background, 150ms `easing-default`), the other button dims
**And** selection is single-choice per question

**Given** at least one question is answered
**When** the "Skicka" button state is evaluated
**Then** the button becomes enabled (full opacity, AmberCTAButton styling)
**And** when no questions are answered, the button is disabled at 40% opacity

**Given** the user has answered questions and optionally typed in the text area
**When** they tap "Skicka"
**Then** feedback is submitted to `POST /api/venues/[id]/feedback`
**And** during submission the button shows a subtle spinner and inputs are disabled
**And** on success: inline confirmation "Tack för din feedback." replaces the form, fades after 3 seconds (300ms `easing-exit`)
**And** on failure: inline error "Kunde inte skicka. Försök igen." appears below the form with a retry option

**Given** the feedback prompt is dismissible
**When** the user taps "Stäng"
**Then** the feedback section collapses and the user returns to the venue detail scroll position

**Given** the user has already submitted feedback for this venue in the current session
**When** they revisit the venue detail
**Then** the feedback prompt is not shown again (tracked via sessionStorage to prevent duplicates, per NFR11)

**Given** `prefers-reduced-motion` is enabled
**When** feedback animations occur
**Then** button selection is instant (no fill transition), form-to-confirmation is instant (no crossfade)

**Design Gate Criteria:**
- **Visual:** Matches active visual reference `feedback` from the current source-of-truth bundle
- **Behaviour:** All interactions and states defined in UX spec §FeedbackPrompt are implemented
- **Animation:** Button fill, form-to-confirmation crossfade, and dismiss animations match spec timings (±50 ms tolerance)
- **Visual validation:** Screenshot comparison against the active visual reference passes before QA handoff

## Tasks / Subtasks

- [x] **Task 1: Baseline and source-context check** (AC: all)
  - [x] 1.1 Run `cd nextjs-app && npx.cmd tsc --noEmit` before editing. Stop and surface any errors outside this story's scope.
  - [x] 1.2 Run `cd nextjs-app && npx.cmd eslint . --quiet` before editing. Stop and surface any errors outside this story's scope.
  - [x] 1.3 Read `AGENTS.md`, `project-context.md`, this story, `_bmad-output/planning-artifacts/epics.md`, `_bmad-output/planning-artifacts/prd.md`, `_bmad-output/planning-artifacts/architecture.md`, `_bmad-output/planning-artifacts/ux-design-specification.md`, and `nextjs-app/docs/design/DESIGN.md`.
  - [x] 1.4 Read `nextjs-app/docs/design/references/claude-design/README.md`, `STATE-MAPPING.md`, and the MVP mobile/desktop `feedback` and `venue-detail` prototype source before changing visible feedback UI. Match visual outcome, not prototype implementation.
  - [x] 1.5 Confirm `_bmad-output/implementation-artifacts/deferred-work.md` no longer has active Story 3.2 carry-in items. Do not pull Story 3.3 reviews, Story 3.4 visit-loop hardening, Story 5 partner tags, Story 6 share, or Story 7 platform work into this story.
  - [x] 1.6 Confirm sprint sequencing: Story 3.1 is `done`; Story 3.2 is `ready-for-dev`.

- [x] **Task 2: Define the feedback API contract and server route** (AC: #4)
  - [x] 2.1 Add `nextjs-app/app/api/venues/[slug]/feedback/route.ts`. Use `[slug]` to avoid a Next.js dynamic-segment conflict with the existing `app/api/venues/[slug]/route.ts`; the public URL still satisfies `/api/venues/[id]/feedback`.
  - [x] 2.2 Accept the path segment as a venue identifier and resolve against existing venue identifiers (`id`, `venueId`, `slug`, or `venueSlug`) using the current fixture/API contract until a real venue table contract is wired.
  - [x] 2.3 Validate request JSON with Zod v4 or an equivalent structured validator. Required: `userTimestamp`, `predictedState`, and at least one of `wasSunny`, `outdoorSeatingConfirmed`, or `note`. Include `confidenceAtPrediction` when available. Reject malformed booleans, invalid timestamps, impossible confidence values, unknown predicted states, oversized text, control characters, and unknown venues with stable 4xx responses.
  - [x] 2.4 Update `nextjs-app/lib/types/api.ts` so `SubmitFeedbackRequest` and `FeedbackResponse` match the implemented payload, including optional outdoor seating confirmation and optional text note. Keep camelCase API fields.
  - [x] 2.5 Use server-only persistence only. If writing to Supabase, import service-role infrastructure only inside the route or a server-only service, never from client code. If the required `feedback` table contract is missing, add an explicit SQL/contract artifact such as `_bmad-output/implementation-artifacts/3-2-feedback-contract.sql`; do not run live SQL or assume production schema changes happened.
  - [x] 2.6 Do not create admin review queues, candidate venue queues, accuracy dashboards, cron jobs, analytics events, or review/rating tables in this story.

- [x] **Task 3: Add the TanStack feedback mutation hook** (AC: #4, #6)
  - [x] 3.1 Add `nextjs-app/hooks/mutations/useSubmitFeedback.ts` to POST to `/api/venues/${identifier}/feedback`.
  - [x] 3.2 Keep mutation retry disabled or strictly user-triggered so duplicate feedback is not submitted automatically.
  - [x] 3.3 On success, mark the venue as submitted in sessionStorage through a small helper; on failure, leave the form state intact for retry.
  - [x] 3.4 Do not invalidate venue detail/list query data unless the implemented API response actually changes public venue fields. The current story does not require changing sun confidence, tags, rating, review count, or list ordering after feedback.
  - [x] 3.5 Keep all query keys in `nextjs-app/lib/query-keys.ts` if any mutation-driven invalidation is introduced; do not construct keys inline.

- [x] **Task 4: Build reusable feedback presentation and Amber CTA** (AC: #1, #2, #3, #4, #5, #7)
  - [x] 4.1 Extract the onboarding-local Amber CTA styling into a reusable composed component, for example `nextjs-app/components/composed/shared/AmberCTAButton.tsx` or `components/composed/feedback/AmberCTAButton.tsx`, only if it stays token-backed and does not introduce a broad design-system abstraction.
  - [x] 4.2 Preserve `gradient-cta-amber`, amber CTA text token, `rounded-pill`/`radius-pill`, `shadow-cta`, 44x44 px minimum touch target, disabled 40% opacity, visible focus ring, accessible loading text, and reduced-motion behaviour.
  - [x] 4.3 Add `nextjs-app/components/composed/feedback/FeedbackPrompt.tsx` for the card, questions, selected states, optional text area, submit button, close action, success confirmation, and inline error.
  - [x] 4.4 Use lucide icons where appropriate, including the clock response for "Var det soligt när du kom?". Do not use color alone for selected/unselected state; include `aria-pressed`, text, and focus styling.
  - [x] 4.5 Keep Swedish copy in `nextjs-app/messages/sv/feedback.json` and matching English fallback in `nextjs-app/messages/en/feedback.json` unless the existing message namespace pattern makes `venue.json` the smaller change. Do not hardcode English UI copy.
  - [x] 4.6 Use Motion 12 (`motion/react`) for the fill/crossfade/dismiss states only where useful, with `useReducedMotion()` forcing instant state changes.

- [x] **Task 5: Add feedback flow orchestration inside venue detail** (AC: #1, #4, #5, #6, #7)
  - [x] 5.1 Add `nextjs-app/components/custom/feedback/FeedbackFlow.tsx` to own eligibility, local form state, mutation calls, success/failure state, sessionStorage duplicate suppression, and forced-state behaviour.
  - [x] 5.2 Render the flow inside the existing venue detail scroll area on mobile and desktop without changing the MapLibre canvas lifecycle or selected venue state.
  - [x] 5.3 Use the existing `_state=feedback` forced-state route from `project-context.md` so visual validation can always show the prompt for `test-venue-sunny`, regardless of real proximity/time/session state.
  - [x] 5.4 On dismiss, collapse the feedback section in place and preserve the venue detail scroll position. Do not close venue detail, clear the selected pin, or navigate.
  - [x] 5.5 After successful submit, show "Tack för din feedback.", wait 3 seconds, fade for 300ms `easing-exit`, then collapse. In reduced motion, confirmation and collapse are instant or delay-only without crossfade.
  - [x] 5.6 Ensure failure copy "Kunde inte skicka. Försök igen." appears below the form with an accessible retry path and does not erase the user's selections or note.

- [x] **Task 6: Implement a testable likely-visited/session helper** (AC: #1, #6)
  - [x] 6.1 Add a small client-only helper, for example `nextjs-app/lib/services/feedback-session.ts`, with named storage keys and safe try/catch handling for disabled sessionStorage.
  - [x] 6.2 Record venue detail views in sessionStorage with venue identifier, timestamp, and the current planner/user timestamp needed for feedback payload construction.
  - [x] 6.3 Prompt only when the user has likely visited: current geolocation status is `success`, current coordinates are within a named constant distance threshold of the venue, and enough time has elapsed since the previous detail view. Do not treat Gothenburg centrum fallback (`status: 'fallback'`) as a real visit.
  - [x] 6.4 Keep constants conservative and documented in the helper, with unit tests. The forced `_state=feedback` path bypasses eligibility only in dev/preview via `useForcedState()`.
  - [x] 6.5 Suppress repeat prompts only after a successful submission for that venue in the current session. A simple close/dismiss should not poison future eligible prompts unless explicitly added and tested.

- [x] **Task 7: Close the carried venue-attribute/tag debt** (AC: #1, Design Gate)
  - [x] 7.1 Audit `nextjs-app/lib/utils/venue-visual-metadata.ts`, `VenueDetailContent`, and existing detail tests for hardcoded amenity/tag chips such as `Innergård`, `Hund ok`, `Wifi`, and `Bakverk`.
  - [x] 7.2 Decide inside this story whether Story 3.2's outdoor seating confirmation is the first durable venue-attribute source or only a feedback signal. Document the decision in completion notes.
  - [x] 7.3 If tags remain hardcoded visual metadata, do not falsely present them as user-confirmed. Either keep them as fixture/display metadata with tests, or retarget durable amenity/tag persistence to a later explicit venue-attribute story with rationale.
  - [x] 7.4 Run venue-detail visual validation mobile and desktop after any tag/detail composition change. If a reference PNG or capture recipe changes, update `nextjs-app/docs/design/references/REBASELINE-LOG.md` in the same operation.

- [x] **Task 8: Focused regression coverage** (AC: all)
  - [x] 8.1 Add API route tests for validation failures, unknown venue, successful payload shape, persistence adapter behaviour or mocked Supabase insert, and no admin/review side effects.
  - [x] 8.2 Add mutation-hook tests for success, failure, no automatic duplicate retry, and sessionStorage marking after success only.
  - [x] 8.3 Add `FeedbackPrompt` component tests for both questions, single-choice selection, disabled/enabled submit, loading disabled inputs, success confirmation, failure retry, close action, reduced-motion behaviour, keyboard access, `aria-pressed`, focus ring, and 44x44 touch targets.
  - [x] 8.4 Add `FeedbackFlow` tests for likely-visited eligibility, fallback geolocation suppression, forced `_state=feedback`, submitted-session suppression, and scroll/detail preservation.
  - [x] 8.5 Update venue detail and MapView tests so the feedback state can render inside the existing detail scroll area without breaking route buttons, open-maps links, favourites, uncertainty copy, or selected-pin state.
  - [x] 8.6 Add or update Playwright coverage for the mobile `feedback` forced state and safe submit failure/success flows. Intercept the feedback POST; do not depend on live Supabase in E2E.

- [x] **Task 9: Final verification and review gate** (AC: all)
  - [x] 9.1 Run `cd nextjs-app && npx.cmd tsc --noEmit`.
  - [x] 9.2 Run `cd nextjs-app && npx.cmd eslint . --quiet`.
  - [x] 9.3 Run `cd nextjs-app && npx.cmd vitest run`.
  - [x] 9.4 Run `cd nextjs-app && npx.cmd playwright test` if feedback E2E coverage is added; otherwise document why component/API tests provide the required coverage.
  - [x] 9.5 Run visual validation for `feedback` mobile: `.\scripts\run-sh.ps1 scripts/visual-validate.sh feedback "/?venue=test-venue-sunny&_state=feedback" mobile`.
  - [x] 9.6 Run parent detail validation after integration: `venue-detail` mobile and desktop using the routes in `project-context.md`.
  - [x] 9.7 Run the API-boundary scan: `rg -n "lib/(solar|weather|supabase|middleware|buildings)" nextjs-app/app nextjs-app/components nextjs-app/hooks nextjs-app/lib`.
  - [x] 9.8 Run the MVP monetization quarantine scan: `rg -n "PremiumContext|usePremiumStatus|queryKeys\.premium|/api/payments|Swish|swish|paywall|premium gate|lock badge|Season Pass|Säsongskortet" nextjs-app/app nextjs-app/components nextjs-app/hooks nextjs-app/lib nextjs-app/messages`.
  - [x] 9.9 Before changing sprint status to `review`, run `.\scripts\run-sh.ps1 scripts/story-review.sh 3-2-sun-accuracy-feedback`.

## Dev Notes

### Current Implementation State

- `nextjs-app/lib/types/api.ts` already has feedback DTO stubs, but they only cover `wasSunny` and do not include outdoor seating confirmation, optional note text, or a route response aligned with Story 3.2.
- No feedback endpoint exists under `nextjs-app/app/api/venues/`. Existing venue API routes are fixture-backed and server-only; client components consume them through hooks.
- Existing dynamic route folder is `nextjs-app/app/api/venues/[slug]/route.ts`. Add the feedback route under `[slug]/feedback/route.ts`, not a sibling `[id]` folder.
- `nextjs-app/hooks/mutations/` currently contains only `.gitkeep`; this story creates the first real mutation hook.
- `nextjs-app/components/custom/feedback/` currently contains only `.gitkeep`; no feedback UI exists yet.
- `VenueDetailContent` currently renders route/open-map/favourite-adjacent detail surfaces and hardcoded visual metadata tags from `getVenueVisualMetadata()`. Integrate feedback without regressing these surfaces.
- Story 3.1 added `RouteButton`, `RouteOverlay`, route estimates, native-map helper tests, and visual validation for selected/detail parent screens. Preserve those behaviours.

### Architecture Guardrails

- Client components must not import from `nextjs-app/lib/solar`, `lib/weather`, `lib/supabase`, `lib/middleware`, or `lib/buildings`.
- Data access must flow through `app/api/*` routes and hooks/mutations. Feedback submission belongs in `hooks/mutations/useSubmitFeedback.ts`; no component should call Supabase directly.
- Component dependency direction remains `components/custom/ -> components/composed/ -> components/ui/`. A composed `FeedbackPrompt` can be consumed by custom `FeedbackFlow`; do not import custom components into composed/UI layers.
- Query keys must come from `nextjs-app/lib/query-keys.ts` if any query invalidation is introduced.
- Use only project design tokens and Tailwind v4 `@theme` utilities. Do not introduce raw hex values, arbitrary pixel spacing, custom shadows, or copied prototype CSS.
- MapLibre must stay dynamically loaded and mounted. Feedback is detail-scroll UI; it must not remount `MapContainer`, `VenuePinLayer`, or the selected venue state.

### UX And Design Notes

- `nextjs-app/docs/design/DESIGN.md` defines the relevant tokens: `gradient-cta-amber`, `shadow-cta`, `radius-pill`, `radius-card`, `color-amber-dark`, `color-amber-cta-text`, `duration-default`, `duration-fast`, and `duration-slow`.
- UX spec `Screen: feedback` lists the card layout: venue header, address/map link, outdoor seating question, sun accuracy question with clock option, optional text area, `Skicka`, and `Stäng`.
- Button selection animation is 150ms `easing-default`. Success fade is 300ms `easing-exit` after 3 seconds. Reduced motion removes fill/crossfade animation.
- Error tone is matter-of-fact Swedish: "Kunde inte skicka. Försök igen." No exclamation marks, apologies, or toast/modal replacement.
- The `feedback` screen has only a mobile reference in `project-context.md`. Desktop feedback should still integrate cleanly in the 390px venue detail panel and be covered by `venue-detail` desktop validation.

### API Contract Guidance

- Suggested request shape:
  - `venueId`: string, from `venue.id` or `venue.venueId`
  - `userTimestamp`: ISO 8601 string
  - `predictedState`: `Sunny | Partial | Shaded | NoSun`
  - `confidenceAtPrediction`: number 0-100 when available
  - `wasSunny`: boolean optional
  - `outdoorSeatingConfirmed`: boolean optional
  - `note`: optional trimmed string with a small max length
- The route should derive trusted venue identity from the path/fixture lookup and reject mismatched body venue IDs if both are supplied.
- Persist only safe product feedback fields. Do not store raw precise user coordinates unless Rasmus explicitly approves privacy scope; the eligibility helper can use coordinates client-side without sending them.
- If persistence is unavailable locally, tests should mock the persistence adapter and UI should exercise success/failure via intercepted responses. Do not make visual validation depend on live Supabase credentials.

### Previous Story Intelligence

- Story 3.0 removed admin runtime scope. Feedback must remain consumer-facing feedback for existing venues, not an admin candidate queue or venue CRUD surface.
- Story 3.0.5 made confidence semantics coverage-aware. Feedback records may include the current confidence value, but this story must not recalculate or reinterpret confidence.
- Story 3.0.6 added safe public uncertainty copy. Preserve uncertainty display in venue detail and do not expose CRS, EPSG:3007, Baskarta, DTM, SQL/RPC, source geometry, or import internals in user copy.
- Story 3.0.7 corrected Baskarta/source-geometry handling. Feedback copy should discuss observed sun/outdoor seating only, not geodata provenance.
- Story 3.1 completed route/open-map helpers and RouteButton extraction. Do not duplicate route/open-map logic while adding the venue header/map link inside feedback.

### Latest Technical Context

- Use installed project versions from `nextjs-app/package.json`: Next.js 16.2.2 App Router, React 19.2.5, TanStack Query 5.99.0, Motion 12.38.0, Zod 4.3.6, MapLibre 5.23.0, Tailwind CSS 4.2.2, and next-intl 4.9.1.
- No new external library is required for this story. Prefer existing project patterns over introducing form libraries, analytics SDKs, or schema tooling.

### Expected File Impact

Expected files created:

- `nextjs-app/app/api/venues/[slug]/feedback/route.ts`
- `nextjs-app/hooks/mutations/useSubmitFeedback.ts`
- `nextjs-app/components/composed/feedback/FeedbackPrompt.tsx`
- `nextjs-app/components/custom/feedback/FeedbackFlow.tsx`
- `nextjs-app/lib/services/feedback-session.ts`
- `nextjs-app/test/unit/api/venue-feedback-route.test.ts`
- `nextjs-app/test/unit/mutations/useSubmitFeedback.test.ts`
- `nextjs-app/test/components/FeedbackPrompt.test.tsx`
- `nextjs-app/test/components/FeedbackFlow.test.tsx`

Expected files modified:

- `nextjs-app/lib/types/api.ts`
- `nextjs-app/lib/query-keys.ts` only if mutation invalidation requires a new key
- `nextjs-app/components/composed/venue/VenueDetailContent.tsx` and/or `nextjs-app/components/custom/venue/VenueDetailOverlay.tsx`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/onboarding/OnboardingScreen.tsx` if Amber CTA extraction changes the onboarding CTA consumer
- `nextjs-app/messages/sv/feedback.json` and `nextjs-app/messages/en/feedback.json`, or existing venue message files if that is the established local pattern
- `nextjs-app/test/components/VenueDetailContent.test.tsx`
- `nextjs-app/test/components/VenueDetailOverlay.test.tsx`
- `nextjs-app/test/components/MapView.test.tsx`
- `nextjs-app/test/e2e/map-primary.spec.ts` or a focused feedback E2E spec if added

Possible files created or modified:

- `_bmad-output/implementation-artifacts/3-2-feedback-contract.sql` if the missing `feedback` table contract must be documented for manual application.
- `nextjs-app/docs/design/references/REBASELINE-LOG.md` only if reference PNGs or capture recipes change.

Files intentionally not created:

- No `nextjs-app/app/api/reviews/*` route; Story 3.3 owns reviews.
- No admin routes, admin components, admin auth, venue candidate review queue, or accuracy dashboard.
- No `/api/payments`, Swish, premium, paywall, Season Pass, or lock-badge runtime paths.
- No `tailwind.config.ts`; Tailwind v4 tokens live in `nextjs-app/app/globals.css`.
- No client import from `lib/supabase`, `lib/solar`, `lib/weather`, `lib/middleware`, or `lib/buildings`.

### Project Structure Notes

- The architecture references `components/composed/FeedbackPrompt` and `components/custom/feedback/FeedbackFlow`; current repo structure has `.gitkeep` in `components/custom/feedback` and no composed feedback folder. Creating these paths matches the intended architecture.
- The route folder name mismatch (`[slug]` existing vs AC `[id]`) is an implementation detail. Public callers still use `/api/venues/{identifier}/feedback`.
- Venue detail feedback should be a child of the existing detail scroll area, not a new page, modal, or top-level route.

### References

- `AGENTS.md` - repo commands, API boundary, design-token rules, Swedish copy, accessibility, visual validation, and sprint workflow.
- `project-context.md` - current project state, Screen ID -> Route Map for `feedback` and `venue-detail`, and design-source discipline.
- `_bmad-output/planning-artifacts/epics.md` - Story 3.2 source of truth for story statement, acceptance criteria, design gate criteria, and deferred carry-ins.
- `_bmad-output/planning-artifacts/prd.md` - FR17/FR18, accuracy-trust metric, privacy/GDPR NFRs, accessibility NFRs, and MVP scope.
- `_bmad-output/planning-artifacts/architecture.md` - API route map, feedback component/hook mapping, naming conventions, TanStack server-state rule, and component layering.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - FeedbackPrompt, feedback screen inventory, venue-detail scroll behaviour, error tone, and motion timings.
- `nextjs-app/docs/design/DESIGN.md` - binding CTA, radius, typography, colour, shadow, motion, and touch-target tokens.
- `nextjs-app/docs/design/references/claude-design/README.md` - visual source-of-truth reading discipline.
- `_bmad-output/implementation-artifacts/3-1-routing-navigation-to-venue.md` - completed route/open-map patterns and detail integration learnings.
- `_bmad-output/implementation-artifacts/deferred-work.md` - Story 3.2 carry-in source for Amber CTA extraction and venue tag/attribute resolution.

### Draft Verification

- Draft baseline passed before writing this story:
  - `cd nextjs-app && npx.cmd tsc --noEmit`
  - `cd nextjs-app && npx.cmd eslint . --quiet`
- Story-file-audit: all seven checks pass.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex (Amelia, BMAD Dev)

### Debug Log References

- 2026-06-07: Baseline typecheck passed before implementation: `cd nextjs-app && npx.cmd tsc --noEmit`.
- 2026-06-07: Baseline lint passed before implementation: `cd nextjs-app && npx.cmd eslint . --quiet`.
- 2026-06-08: Focused feedback E2E passed: `cd nextjs-app && npx.cmd playwright test test/e2e/feedback.spec.ts` (4 passed).
- 2026-06-08: Full Playwright passed: `cd nextjs-app && npx.cmd playwright test` (47 passed, 30 skipped).
- 2026-06-08: Final typecheck passed: `cd nextjs-app && npx.cmd tsc --noEmit`.
- 2026-06-08: Final lint passed: `cd nextjs-app && npx.cmd eslint . --quiet`.
- 2026-06-08: Final Vitest passed: `cd nextjs-app && npx.cmd vitest run` (54 files, 437 tests).
- 2026-06-08: Visual validation passed for `feedback` mobile and parent `venue-detail` mobile/desktop.
- 2026-06-08: API-boundary scan found only existing server/internal imports; monetization quarantine scan found no live premium/payment matches.
- 2026-06-08: Story review gate passed and moved sprint status to review: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-2-sun-accuracy-feedback`. Validation artifact: `_bmad-output/implementation-artifacts/validation/3-2-sun-accuracy-feedback-review-20260608-080224.log`.
- 2026-06-08: Round 1 review fixes applied for 10 patch findings: server persistence adapter, explicit `sunAccuracy` clock state, likely-visited timer/preservation, forced fixture detail, exit animation, multiline note validation, current-value retry, persisted parent visual evidence, and Amber CTA reuse.
- 2026-06-08: Post-review focused tests passed: `cd nextjs-app && npx.cmd vitest run test/unit/api/venue-feedback-route.test.ts test/components/FeedbackPrompt.test.tsx test/components/FeedbackFlow.test.tsx test/unit/services/feedback-session.test.ts test/unit/mutations/useSubmitFeedback.test.tsx test/components/OnboardingScreen.test.tsx test/components/OnboardingGate.test.tsx` (7 files, 48 tests).
- 2026-06-08: Post-review focused feedback E2E passed: `cd nextjs-app && npx.cmd playwright test test/e2e/feedback.spec.ts` (4 passed).
- 2026-06-08: Post-review full Playwright passed after isolating and rerunning two unrelated `map-primary` parallel-run flakes: `cd nextjs-app && npx.cmd playwright test` (47 passed, 30 skipped).
- 2026-06-08: Post-review final typecheck, lint, and Vitest passed: `cd nextjs-app && npx.cmd tsc --noEmit`; `cd nextjs-app && npx.cmd eslint . --quiet`; `cd nextjs-app && npx.cmd vitest run` (54 files, 443 tests).
- 2026-06-08: Post-review visual validation passed for `feedback` mobile plus parent `venue-detail` mobile/desktop. Artifact: `_bmad-output/implementation-artifacts/validation/3-2-sun-accuracy-feedback-parent-visual-20260608-codex.log`.
- 2026-06-08: Post-review API-boundary scan found only server/internal references, including the server-side feedback persistence adapter; monetization quarantine scan found no live premium/payment matches.
- 2026-06-08: Post-review story-review gate passed and moved sprint status to review: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-2-sun-accuracy-feedback`. Validation artifact: `_bmad-output/implementation-artifacts/validation/3-2-sun-accuracy-feedback-review-20260608-095627.log`.
- 2026-06-08: Round 2 review fixes applied after Rasmus chose Option 2 for planner-time feedback: prompt is suppressed outside live/current planner time except forced visual state, feedback waits for detail-address data, Supabase persistence is explicit opt-in, decisive `sunAccuracy` derives `wasSunny`, exit interactions are disabled, storage-blocked duplicate suppression has an in-memory fallback, success uses status text and 200ms replacement timing, and venue/geolocation state regressions are covered.
- 2026-06-08: Round 2 verification passed: `cd nextjs-app && npx.cmd vitest run test/unit/api/venue-feedback-route.test.ts test/components/FeedbackPrompt.test.tsx test/components/FeedbackFlow.test.tsx test/unit/services/feedback-session.test.ts test/unit/services/venue-feedback-persistence.test.ts test/unit/mutations/useSubmitFeedback.test.tsx` (6 files, 34 tests); `cd nextjs-app && npx.cmd tsc --noEmit`; `cd nextjs-app && npx.cmd eslint . --quiet`; `cd nextjs-app && npx.cmd vitest run` (55 files, 450 tests); `cd nextjs-app && npx.cmd playwright test test/e2e/feedback.spec.ts` (4 passed); `cd nextjs-app && npx.cmd next build`; `.\scripts\run-sh.ps1 scripts/visual-validate.sh feedback "/?venue=test-venue-sunny&_state=feedback" mobile` (PASS).
- 2026-06-08: Round 2 story-review gate passed and left sprint status at review because it was already in review: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-2-sun-accuracy-feedback`. Validation artifact: `_bmad-output/implementation-artifacts/validation/3-2-sun-accuracy-feedback-review-20260608-132337.log`.
- 2026-06-08: Round 3 review fixes applied: note-only submit remains disabled until a feedback question is answered, overlong notes are capped client-side, same-session duplicate suppression is reactive across responsive feedback instances, feedback uses the stored prediction snapshot for the qualifying visit, placeholder planner detail data is withheld from live feedback, and explicit Supabase persistence opt-in fails closed when credentials are incomplete. Verification passed: focused feedback Vitest (6 files, 38 tests), `cd nextjs-app && npx.cmd tsc --noEmit`, `cd nextjs-app && npx.cmd eslint . --quiet`, `cd nextjs-app && npx.cmd vitest run` (55 files, 454 tests), and `cd nextjs-app && npx.cmd playwright test test/e2e/feedback.spec.ts` (4 passed).
- 2026-06-08: Round 3 story-review gate passed and left sprint status at review because it was already in review: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-2-sun-accuracy-feedback`. Validation artifact: `_bmad-output/implementation-artifacts/validation/3-2-sun-accuracy-feedback-review-20260608-165929.log`.

### Review Findings

**Round 1 of 3** — reviewed 2026-06-08 via `bmad-code-review` (Blind Hunter + Edge Case Hunter + Acceptance Auditor layers). After deduplication: 0 decision-needed, 10 patch, 0 defer, 1 dismissed as noise.

- [x] [Review][Patch] Feedback POST is accepted but not durably persisted [nextjs-app/app/api/venues/[slug]/feedback/route.ts:44] — Accepted submissions live only in the module-local `feedbackSubmissions` array and are pushed at route runtime, so Vercel/server restarts or another instance lose the feedback. The array also grows without a durable storage boundary. Add a server-only persistence adapter that writes to the feedback table contract when configured, mock that adapter in tests, and keep local visual/E2E paths independent of live Supabase credentials.
- [x] [Review][Patch] Clock response cannot be selected or submitted [nextjs-app/components/composed/feedback/FeedbackPrompt.tsx:119] — The clock / "Inte säker" answer always renders `selected={false}` and calls `setSunny(undefined)`, while `canSubmit` treats `undefined` as unanswered. This violates the AC requiring single-choice selected state for the clock button and enabling `Skicka` after at least one answered question. Model an explicit third sun-answer state and update DTO/schema/tests as needed.
- [x] [Review][Patch] Likely-visited eligibility can overwrite or miss the qualifying visit [nextjs-app/components/custom/feedback/FeedbackFlow.tsx:34] — The flow records a fresh detail-view timestamp on mount before eligibility is evaluated, so a previously qualifying visit can be overwritten while geolocation is still pending. It also has no timer/state recheck when the 10-minute threshold in `feedback-session.ts` elapses. Preserve the prior view record until evaluated, and schedule or trigger eligibility recalculation at the threshold.
- [x] [Review][Patch] Forced feedback state is suppressed by same-session submission [nextjs-app/components/custom/feedback/FeedbackFlow.tsx:50] — `visible` still applies submitted-session suppression when `_state=feedback` is active, even though Task 5.3 says the forced route must always show the prompt regardless of real proximity/time/session state. Forced visual state should bypass submitted-session suppression while production/non-forced paths still hide duplicates.
- [x] [Review][Patch] Forced feedback can submit fallback `Shaded` / zero-confidence data [nextjs-app/components/custom/map/MapView.tsx:768] — `_state=feedback` does not resolve the deterministic forced venue detail, so the prompt can render against `fallbackVenueFromSlug()` before the detail query resolves. The E2E test only waits for the prompt, so it can submit/assert fallback `Shaded` data instead of the sunny seeded venue. Reuse the forced detail fixture for feedback or hold the prompt until matching detail data is ready.
- [x] [Review][Patch] Success confirmation and close collapse skip the required exit animation [nextjs-app/components/custom/feedback/FeedbackFlow.tsx:54] — After the three-second success delay, the flow sets `dismissed` and immediately returns `null`, so the 300ms `easing-exit` fade/collapse never runs. Close uses the same immediate unmount path. Keep the prompt mounted through an exit state or wrap the whole flow in `AnimatePresence`, while preserving instant removal for reduced motion.
- [x] [Review][Patch] Multiline textarea input is rejected by server validation [nextjs-app/app/api/venues/[slug]/feedback/route.ts:11] — The note validator rejects all control characters, including newline and tab, but the UI exposes a multiline `<textarea>`. A normal multiline comment fails with only the generic submit error. Either normalize allowed whitespace before validation or allow safe line breaks while still rejecting unsafe control characters.
- [x] [Review][Patch] Retry button can submit stale values after the user edits the failed form [nextjs-app/components/custom/feedback/FeedbackFlow.tsx:91] — `Försök igen` resubmits `lastPayload`, but the form remains editable after failure. If the user changes an answer or note and clicks the inline retry button, the old failed payload is sent. Make retry submit the current form state or make the retry affordance clearly retry the unchanged payload.
- [x] [Review][Patch] Story 3.2 parent venue-detail visual evidence is not persisted with the story [ _bmad-output/implementation-artifacts/validation/3-2-sun-accuracy-feedback-review-20260608-080224.log:37] — Task 9.6 requires `venue-detail` mobile and desktop validation after integration, but the only Story 3.2 validation artifact records `feedback` mobile. The story and rebaseline log say parent gates passed, but no Story 3.2 artifact records those commands/results. Run or attach the parent visual validations for the project-context routes before acceptance.
- [x] [Review][Patch] Amber CTA extraction left onboarding duplicate implementations active [nextjs-app/components/custom/onboarding/OnboardingScreen.tsx:175] — Story 3.2 Task 4.1 and the deferred carry-in require the onboarding-local Amber CTA styling to be extracted once feedback becomes the second consumer. `AmberCTAButton` was added, but onboarding still owns separate CTA class strings in `OnboardingScreen` and the hydration placeholder in `OnboardingGate`. Reuse the shared component where practical, or leave the deferred-work item active with rationale.

**Round 2 of 3** — reviewed 2026-06-08 via `bmad-code-review` (Blind Hunter + Edge Case Hunter + Acceptance Auditor layers). After deduplication: 1 decision-needed, 9 patch, 0 defer, 1 dismissed as noise.

- [x] [Review][Decision] Feedback currently submits planner-simulated prediction state as arrival feedback — Rasmus selected Option 2: suppress the prompt outside live/current planner time. `MapView` passes the planner-query venue into `FeedbackFlow`, and `FeedbackFlow` submits `venue.currentSunStatus` plus the planner timestamp. If the user is physically near a venue while viewing a future/planner time, this can corrupt the "when you arrived" accuracy signal. Choose whether feedback should submit the real current prediction, suppress the prompt outside live/current time, or intentionally support planner-time feedback with clearer semantics. [nextjs-app/components/custom/map/MapView.tsx:767]
- [x] [Review][Patch] Supabase feedback persistence auto-enables against an unapplied/incompatible table contract [nextjs-app/lib/services/venue-feedback-persistence.ts:57] — The adapter switches to Supabase whenever normal Supabase env vars exist, while the Story 3.2 SQL artifact says it is not applied automatically. The contract also declares `venue_id uuid`, but the current fixture-backed route inserts fixture IDs such as `"1"`. A deployed environment with service-role config but no compatible table can turn every accepted POST into `503`.
- [x] [Review][Patch] API accepts decisive `sunAccuracy` payloads that the persistence contract rejects [nextjs-app/app/api/venues/[slug]/feedback/route.ts:54] — The route accepts `{ sunAccuracy: "sunny" }` without `wasSunny`, but the SQL contract requires `was_sunny is true`; the same mismatch exists for `"not_sunny"`. Derive `wasSunny` server-side or reject incomplete decisive `sunAccuracy` payloads before persistence.
- [x] [Review][Patch] Feedback prompt can render neighborhood instead of the required address [nextjs-app/components/custom/feedback/FeedbackFlow.tsx:167] — `MapView` passes `detailVenue ?? detailFallbackVenue` into feedback, and list DTOs only provide `neighborhood`. An eligible prompt can appear while detail data is still loading, so the card may show a neighborhood under the address label instead of the specified venue address.
- [x] [Review][Patch] Feedback dismissal state can leak to the next venue [nextjs-app/components/custom/map/MapView.tsx:767] — The mobile and desktop slots render `FeedbackFlow` without a venue key, while `FeedbackFlow` owns `removed`, `isExiting`, and `showSuccess` state. If the detail overlay stays mounted while switching venues, closing or completing feedback for one venue can suppress the prompt for the next.
- [x] [Review][Patch] Eligibility recheck can be delayed when geolocation resolves late [nextjs-app/components/custom/feedback/FeedbackFlow.tsx:82] — `eligibilityNow` is captured on mount and used to schedule the visit-threshold timer after geolocation becomes `success`. If location resolves several minutes later, the prompt can be delayed by an extra threshold instead of appearing when the existing detail-view record is already eligible.
- [x] [Review][Patch] Dismiss fade leaves the form interactive during exit [nextjs-app/components/custom/feedback/FeedbackFlow.tsx:101] — `startExit()` only sets `isExiting`; the prompt remains mounted and its submit controls are not disabled during the 300ms fade. A fast tap after `Stäng` can still submit feedback after the user chose to close the card.
- [x] [Review][Patch] Disabled sessionStorage drops same-session duplicate suppression [nextjs-app/lib/services/feedback-session.ts:58] — Successful submissions are remembered only through `sessionStorage`, and `safeSessionSet` silently drops write failures. In storage-blocked contexts, revisiting the same venue in the same JS session can show the prompt again after a successful submit.
- [x] [Review][Patch] Submit-to-success replacement is not the specified 200ms crossfade [nextjs-app/components/composed/feedback/FeedbackPrompt.tsx:84] — The prompt uses `AnimatePresence mode="wait"` with a 150ms form exit and no explicit success-enter transition, so the replacement is serialized and Motion's enter timing is uncontrolled rather than a 200ms crossfade.
- [x] [Review][Patch] Success confirmation is not a reliable live announcement [nextjs-app/components/composed/feedback/FeedbackPrompt.tsx:79] — `aria-live` is added only when `submitState === "success"` and the confirmation is a plain paragraph. Live regions are more reliable when present before the content changes or when the new message uses `role="status"`.

**Round 3 of 3** — reviewed 2026-06-08 via `bmad-code-review` (Blind Hunter + Edge Case Hunter + Acceptance Auditor layers). After deduplication: 0 decision-needed, 6 patch, 0 defer, 3 dismissed as noise/scope-covered.

- [x] [Review][Patch] Submit enables with no question answered [nextjs-app/components/composed/feedback/FeedbackPrompt.tsx:64] — `canSubmit` includes `note.trim().length > 0`, so typing only a comment enables `Skicka` even when neither feedback question has been answered. This violates AC #3, which says the button is disabled when no questions are answered. Require at least one question answer for the button state; keep the note optional once a question is answered.
- [x] [Review][Patch] Placeholder venue detail can submit a stale planner prediction as live feedback [nextjs-app/components/custom/map/MapView.tsx:340] — `useVenueDetail` keeps previous data as placeholder for the same slug across query changes, and `feedbackVenue` accepts `detailVenue` while `plannerTime.isLiveNow` is true. If the user resets from a future planner time to live/current time, the prompt can render before the live detail refetch completes and submit the previous planner `currentSunStatus`/confidence as arrival feedback. Gate feedback on non-placeholder/live detail data or clear `feedbackVenue` until the live refetch resolves.
- [x] [Review][Patch] Same-session duplicate suppression is not reactive across responsive feedback instances [nextjs-app/components/custom/feedback/FeedbackFlow.tsx:81] — `MapView` mounts separate mobile and desktop `FeedbackFlow` instances (`MapView.tsx:780` and `MapView.tsx:802`). Submitting in one instance writes session storage and re-renders that instance, but the hidden sibling does not subscribe to storage or shared React state, so switching viewport can expose a stale prompt and allow a duplicate submission in the same session. Lift the submitted/dismissed state to the shared parent or provide a reactive storage state that both instances observe.
- [x] [Review][Patch] Stored visit timestamp can be paired with a refreshed prediction state [nextjs-app/components/custom/feedback/FeedbackFlow.tsx:204] — The detail-view record stores only `plannerTimestamp`, while live `useVenueDetail` refetches every five minutes and the visit threshold is ten minutes. Submission uses the stored timestamp but the current `venue.currentSunStatus` and `venue.confidence`, so a payload can mix the original viewed time with a later refreshed prediction. Store the prediction state/confidence with the visit record, or submit a coherent current timestamp/prediction pair.
- [x] [Review][Patch] Supabase opt-in with incomplete credentials silently falls back to volatile memory [nextjs-app/lib/services/venue-feedback-persistence.ts:54] — `hasSupabaseFeedbackConfig()` returns false when `SUNNYSEAT_FEEDBACK_PERSISTENCE=supabase` is set but a required Supabase env var is missing, so accepted feedback is stored in process memory instead of failing closed. Treat explicit Supabase opt-in with incomplete config as a persistence error so the route returns 503.
- [x] [Review][Patch] Client accepts overlong notes that the API rejects as a generic submit failure [nextjs-app/components/composed/feedback/FeedbackPrompt.tsx:169] — The server caps `note` at 500 characters, but the textarea has no matching `maxLength` or client validation. Users can enter a note the UI treats as valid, submit it, and only see the generic retry error. Add client-side length enforcement or validation that matches the API contract.

### Completion Notes List

- Implemented `POST /api/venues/[slug]/feedback` with Zod validation, stable 4xx failures, fixture-backed server persistence, venue identifier resolution, and no admin/review side effects.
- Added the feedback DTO contract and `_bmad-output/implementation-artifacts/3-2-feedback-contract.sql` as the future Supabase table contract; no live SQL was run.
- Added `useSubmitFeedback`, sessionStorage duplicate suppression, likely-visited eligibility, and forced `_state=feedback` rendering inside the existing venue detail scroll area.
- Built the reusable token-backed Amber CTA and composed `FeedbackPrompt` with Swedish/English messages, selected states, loading, inline error/retry, dismiss, success confirmation, and reduced-motion behavior.
- Rebaselined the active `feedback` mobile reference because the previous prototype mapping pointed at an obsolete modal. Updated the capture recipe, state mapping, visual validation wait selector, PNG, and rebaseline log.
- Outdoor seating confirmation is treated as a feedback signal only in Story 3.2. Existing amenity/tag chips remain fixture/display metadata, not user-confirmed durable venue attributes.
- Addressed Round 1 review findings: feedback now persists through a server adapter when Supabase is configured, the clock answer submits as explicit `sunAccuracy: "unsure"`, likely-visited state preserves qualifying prior views and rechecks at the threshold, forced feedback always uses the seeded sunny venue detail, success/close run the exit fade, multiline notes are accepted safely, retry submits current form state, parent visual validation is logged, and onboarding/placeholder CTA styling reuses the shared amber CTA primitive.
- Addressed Round 2 review findings: feedback is live/current-time only in normal flows, forced feedback remains available for validation, the prompt waits for venue detail/address data, Supabase feedback persistence is explicit opt-in with a string-ID contract artifact, decisive sun answers normalize `wasSunny`, exit fades disable form controls, storage-blocked duplicate suppression falls back to memory, success replacement uses 200ms timing with `role="status"`, and regression tests cover the patched edge cases.
- Addressed Round 3 review findings: note-only submit no longer enables `Skicka`, the prompt caps notes at the API limit, same-session duplicate suppression updates sibling responsive flows, feedback payloads use the stored prediction snapshot from the qualifying visit, placeholder planner detail data is withheld from live feedback, and explicit Supabase opt-in with incomplete credentials fails closed.
- Scope exclusions held: no reviews, admin/candidate queues, analytics dashboards, premium/payment/Season Pass paths, geodata imports, route recalculation, or confidence/shadow recalibration.

### File List

- `_bmad-output/implementation-artifacts/3-2-feedback-contract.sql`
- `_bmad-output/implementation-artifacts/3-2-sun-accuracy-feedback.md`
- `_bmad-output/implementation-artifacts/validation/3-2-sun-accuracy-feedback-parent-visual-20260608-codex.log`
- `_bmad-output/implementation-artifacts/validation/3-2-sun-accuracy-feedback-review-20260608-080224.log`
- `_bmad-output/implementation-artifacts/validation/3-2-sun-accuracy-feedback-review-20260608-095627.log`
- `_bmad-output/implementation-artifacts/validation/3-2-sun-accuracy-feedback-review-20260608-132337.log`
- `_bmad-output/implementation-artifacts/validation/3-2-sun-accuracy-feedback-review-20260608-165929.log`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `.claude/scripts/visual-validate.sh`
- `nextjs-app/app/api/venues/[slug]/feedback/route.ts`
- `nextjs-app/components/composed/feedback/FeedbackPrompt.tsx`
- `nextjs-app/components/composed/shared/AmberCTAButton.tsx`
- `nextjs-app/components/composed/venue/VenueDetailContent.tsx`
- `nextjs-app/components/custom/feedback/FeedbackFlow.tsx`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/map/MapViewDynamic.tsx`
- `nextjs-app/components/custom/onboarding/OnboardingGate.tsx`
- `nextjs-app/components/custom/onboarding/OnboardingScreen.tsx`
- `nextjs-app/components/custom/venue/ForcedVenueDetailInitialFrame.tsx`
- `nextjs-app/components/custom/venue/VenueDetailOverlay.tsx`
- `nextjs-app/components/custom/venue/forced-venue-detail.ts`
- `nextjs-app/docs/design/references/REBASELINE-LOG.md`
- `nextjs-app/docs/design/references/claude-design/STATE-MAPPING.md`
- `nextjs-app/docs/design/references/screens/mobile/feedback.png`
- `nextjs-app/hooks/mutations/useSubmitFeedback.ts`
- `nextjs-app/lib/services/feedback-session.ts`
- `nextjs-app/lib/services/venue-feedback-persistence.ts`
- `nextjs-app/lib/types/api.ts`
- `nextjs-app/messages/en/feedback.json`
- `nextjs-app/messages/sv/feedback.json`
- `nextjs-app/scripts/capture-claude-design-refs.mjs`
- `nextjs-app/test/components/FeedbackFlow.test.tsx`
- `nextjs-app/test/components/FeedbackPrompt.test.tsx`
- `nextjs-app/test/e2e/feedback.spec.ts`
- `nextjs-app/test/setup/setup.ts`
- `nextjs-app/test/unit/api/venue-feedback-route.test.ts`
- `nextjs-app/test/unit/mutations/useSubmitFeedback.test.tsx`
- `nextjs-app/test/unit/services/feedback-session.test.ts`
- `nextjs-app/test/unit/services/venue-feedback-persistence.test.ts`

## Change Log

| Date | Author | Note |
|------|--------|------|
| 2026-06-07 | Bob | Drafted Story 3.2 ready-for-dev brief from current epics, Story 3.1 completion context, feedback API/UI architecture, UX/design references, installed package versions, and deferred-work carry-ins. |
| 2026-06-07 | Bob | Story-file-audit completed with all seven checks passing; Story 3.2 sprint status moved from backlog to ready-for-dev. |
| 2026-06-08 | Amelia | Implemented Story 3.2 feedback API, mutation/session helper, inline venue-detail feedback UI, forced feedback state, focused tests, active feedback visual rebaseline, final verification, and story-review transition to review. |
| 2026-06-08 | Amelia | Addressed Round 1 review findings: durable server persistence adapter, explicit clock/unsure answer state, eligibility preservation/timer, forced sunny fixture detail, exit animation, multiline note validation, current-value retry, persisted parent visual evidence, and shared onboarding Amber CTA reuse. |
| 2026-06-08 | Amelia | Addressed Round 3 review findings: question-gated submit, note max length, reactive duplicate suppression, prediction snapshot payloads, placeholder-detail feedback gating, and explicit Supabase opt-in failure handling. |
