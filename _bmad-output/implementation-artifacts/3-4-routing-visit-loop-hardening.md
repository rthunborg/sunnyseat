---
baseline_commit: 2dfe1dc
drafted_at: 2026-06-11T13:15:44+02:00
---

# Story 3.4: Routing & Visit Loop Hardening

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Sequencing:** Stories 3.0, 3.0.1-3.0.7, 3.1, 3.2, and 3.3 are all done. This is the final Epic 3 story: a hardening/audit pass over the routing, feedback, and review flows those stories built. When this story reaches done, Epic 3 is complete.
>
> **Scope boundary:** This story audits, hardens, and regression-proofs existing Epic 3 behaviour. It must not add new product features, new API routes, route recalculation backends, admin surfaces, accounts/auth, moderation, premium/payment/Swish paths, geodata imports, confidence recalibration, or live SQL execution. Prefer verifying and pinning existing behaviour with tests over rewriting working code; fix only what the audit shows is broken or out of contract.
>
> **Audit-story note:** Several ACs are phrased as audits ("when route actions are audited..."). For each audit AC the dev agent must (a) perform the audit, (b) fix in-scope violations found, and (c) record the audit basis (commands run, files inspected, findings) in the Completion Notes so the claim is verifiable. An audit that finds nothing must still state what was checked.

## Story

As a **user**,
I want routing, feedback, and review flows to preserve my venue context across the full visit loop,
So that I can move from finding a sunny venue to getting there and confirming it without losing state or trust.

## Acceptance Criteria

**Given** Stories 3.1, 3.2, and 3.3 have landed
**When** route actions are audited across VenueQuickInfo, venue detail, venue list/favourite entry points, and feedback/review-adjacent surfaces
**Then** all route actions use the shared routing helper/orchestrator contract
**And** no duplicate hand-rolled native-map URL builders or direct `window.open` calls remain outside the approved routing boundary

**Given** a user opens a venue from the map, list, favourite view, or a deep link
**When** they dismiss the route overlay, close feedback/review forms, or use browser Back
**Then** the app preserves selected venue, planner/date/time state, map/list context, and venue-detail scroll position where applicable
**And** invalid venue slugs, loading states, and API errors render localized not-found or retry/error states instead of blank panels

**Given** a mobile user taps "Visa Rutt"
**When** the native-map handoff is initiated
**Then** the route overlay shows the destination, confidence context, and estimated walk time before the app attempts to leave
**And** if the handoff is blocked, the overlay remains visible with a localized retry/open-directions action

**Given** route, feedback, and review controls are keyboard or screen-reader operated
**When** the user navigates through the Epic 3 visit loop
**Then** every interactive element has an accessible name, visible focus state, semantic role, and at least a 44x44 px target
**And** `prefers-reduced-motion` users get instant or opacity-only state changes

**Given** all Epic 3 user-facing copy is rendered
**When** Swedish or English locale is active
**Then** route, feedback, review, error, retry, and confirmation text uses scoped `next-intl` keys
**And** no English hardcoded copy appears in Swedish UI

**Given** the Epic 3 hardening pass is complete
**When** the final regression gate runs
**Then** `tsc`, `eslint`, `vitest`, and required Playwright coverage pass
**And** visual validation covers `map-with-selected-venue`, `venue-detail` mobile/desktop, `feedback`, and `review` states, with any approved rebaseline documented in `REBASELINE-LOG.md`

**Given** MVP scope excludes active monetization
**When** Epic 3 runtime paths are scanned
**Then** no Season Pass, Swish, premium, payment, paywall, or lock-badge dependency is wired into routing, feedback, or reviews
**And** client components still respect the API boundary by avoiding direct imports from backend engine modules

**Design Gate Criteria:**
- **Behaviour:** Final Epic 3 route, feedback, review, Back, dismiss, blocked-handoff, loading, error, and deep-link flows preserve user context as specified above
- **Accessibility:** Keyboard, screen-reader, reduced-motion, focus, and touch-target checks are included in the story test gate
- **Visual validation:** Parent screen/state visual validation passes for `map-with-selected-venue`, `venue-detail` mobile/desktop, `feedback`, and `review`; reference changes require explicit rationale and `REBASELINE-LOG.md` update

> **No standalone Visual design gate criterion is defined in `epics.md` for this story.** This is intentional: Story 3.4 introduces no new screen. It is validated through the existing parent screen/state references listed above plus behaviour, accessibility, and regression gates.

## Tasks / Subtasks

- [x] **Task 1: Baseline and source-context check** (AC: all)
  - [x] 1.1 Run `cd nextjs-app && npx.cmd tsc --noEmit` before editing. Stop and surface any errors outside this story's scope.
  - [x] 1.2 Run `cd nextjs-app && npx.cmd eslint . --quiet` before editing. Stop and surface any errors outside this story's scope.
  - [x] 1.3 Read `AGENTS.md`, `project-context.md`, this story, `_bmad-output/planning-artifacts/epics.md` (Story 3.4 and Epic 3 intro), `_bmad-output/planning-artifacts/ux-design-specification.md` (route overlay, feedback, review, Back/dismiss patterns), and `nextjs-app/docs/design/DESIGN.md`.
  - [x] 1.4 Read the Dev Agent Records of `_bmad-output/implementation-artifacts/3-1-routing-navigation-to-venue.md`, `3-2-sun-accuracy-feedback.md`, and `3-3-venue-reviews.md` — their Review Findings sections enumerate the defect classes this hardening pass must prove are still fixed.
  - [x] 1.5 Confirm sprint sequencing: Stories 3.0 through 3.3 are `done` in `sprint-status.yaml`; Story 3.4 is the only remaining Epic 3 story.
  - [x] 1.6 Confirm `_bmad-output/implementation-artifacts/deferred-work.md` has no active Story 3.4 carry-in entry (none existed at draft time). Do not pull Story 5.x/6.x/7.x targeted items into this story.

- [x] **Task 2: Route-action contract audit** (AC: #1)
  - [x] 2.1 Enumerate every route/open-map action across `VenueQuickInfo`, `VenueDetailContent`, `VenueDetailOverlay`, `VenueList`/`VenueCard`, `FavouritesList`, `RouteButton`, `RouteOverlay`, `FeedbackFlow`/`FeedbackPrompt`, `ReviewFlow`/`ReviewForm`/`ReviewCard`, and `MapView`. Record the list in completion notes.
  - [x] 2.2 Run `rg -n "window\.open|maps\.apple|google\.com/maps|geo:" nextjs-app/app nextjs-app/components nextjs-app/hooks nextjs-app/lib` and verify every match in runtime code resolves to `nextjs-app/lib/services/routing.ts` URL builders, with the single user-gesture `window.open` call site in `MapView` as the approved routing boundary. At draft time this already held (MapView.tsx:663 was the only runtime `window.open`); the audit must confirm it still holds and pin it.
  - [x] 2.3 If any surface builds its own maps URL or opens windows outside the boundary, refactor it onto the shared helper contract without changing user-visible behaviour.
  - [x] 2.4 Add a regression test (unit or lint-style scan test) that pins the routing boundary so a future story cannot silently reintroduce a hand-rolled URL builder or stray `window.open`.

- [x] **Task 3: Visit-loop context preservation and deep-link/error hardening** (AC: #2)
  - [x] 3.1 Audit and exercise the entry paths: pin tap on map, list/bottom-sheet card, favourites view (`/favoriter`), and direct deep link (`/?venue=<slug>`). Verify each leads to a coherent selected-venue/detail state.
  - [x] 3.2 Verify dismissing `RouteOverlay`, closing the feedback form, and closing the review form each return to the prior surface with selected venue, planner/date/time (`_time`/TimeProvider) state, map/list context, and venue-detail scroll position preserved where applicable. `MapView` already routes venue selection through the `?venue=` query param (`queryWithout(searchParams, ['venue', '_state'])` updates) — verify browser Back through those URL transitions restores the previous state instead of stranding or duplicating overlays.
  - [x] 3.3 Verify an invalid/unknown venue slug in `/?venue=<bad-slug>` renders a localized not-found/error state with a way back to the map — not a blank panel, not an infinite skeleton, not an unhandled error. Verify venue-detail API errors surface the localized retry/error treatment (the `MapVenueError`-with-retry pattern already exists for the venue list query; detail must be equivalent).
  - [x] 3.4 Verify loading states across the loop use `Skeleton`-style treatments per the existing pattern, not blank panels or full-page spinners.
  - [x] 3.5 Fix any gaps found, keeping fixes minimal and inside the existing component/state architecture (no new global state managers, no URL schema redesign).

- [x] **Task 4: Native-map handoff hardening** (AC: #3)
  - [x] 4.1 Verify the mobile "Visa Rutt" path renders the route overlay with destination name, confidence context, and estimated walk time before `window.open` is invoked from the same user gesture — the estimate must be visible before the app attempts to leave.
  - [x] 4.2 Verify the blocked/unsupported-handoff path: when `window.open` returns null or is blocked, the overlay must remain visible with a localized retry/open-directions action that preserves the directions intent (directions URL, not place-search URL — this exact regression was Story 3.1 Round 1 finding #4; pin it with a test).
  - [x] 4.3 Verify the overlay is dismissed or re-keyed when the selected venue changes or the venue surface is dismissed, so stale route text for a previous venue can never show (Story 3.1 Round 1 finding #3; pin with a test if not already pinned).
  - [x] 4.4 Confirm "confidence context" in the overlay means the existing public confidence/uncertainty presentation already shown on venue surfaces. Do not invent a new confidence calculation, and do not leak geodata/source internals (EPSG, Baskarta, DTM, SQL/RPC names) into overlay copy. If the overlay currently lacks any confidence context, add it from the already-loaded venue DTO fields (`predictionUncertainty` and existing confidence display helpers) only.

- [x] **Task 5: Accessibility hardening across the Epic 3 loop** (AC: #4)
  - [x] 5.1 Audit every interactive element in the route/feedback/review loop (RouteButton, RouteOverlay controls and fallback link, feedback prompt/buttons, review CTA, review form fields/photo control/submit/close, retry/error actions) for accessible name, semantic role, visible focus indicator, and >=44x44 px target.
  - [x] 5.2 Verify keyboard operability end to end: open route overlay, dismiss with Escape and with the close control, focus is moved into and restored out of dialog surfaces (Story 3.1 Round 1 finding #1 fixed this for RouteOverlay — verify it held and that feedback/review surfaces meet the same bar).
  - [x] 5.3 Verify `prefers-reduced-motion` yields instant or opacity-only state changes across route overlay, feedback transitions, and review form open/close/confirmation.
  - [x] 5.4 Run the existing axe Playwright project (`test/e2e/axe.spec.ts` a11y project) and ensure zero violations on the Epic 3 surfaces; extend its coverage to the route overlay/feedback/review forced states if they are not already visited.
  - [x] 5.5 Fix violations found; do not waive any with rationale-free exclusions.

- [x] **Task 6: Localization audit** (AC: #5)
  - [x] 6.1 Audit all Epic 3 user-facing copy (route, feedback, review, error, retry, confirmation, not-found) for scoped `next-intl` keys in `nextjs-app/messages/sv/*.json` with matching English fallbacks in `nextjs-app/messages/en/*.json` (`venue.json` and `feedback.json` are the existing namespaces for these flows).
  - [x] 6.2 Run a hardcoded-copy scan over the Epic 3 components (for example `rg -n "'[A-Za-z].*'" --type tsx` narrowed to the route/feedback/review components, or an equivalent structured check) and verify no English user-facing strings are rendered in Swedish UI. Record the scan command in completion notes.
  - [x] 6.3 Verify sv/en key parity for every key the Epic 3 flows consume (no missing-key fallback to raw key names at runtime). Pin parity with a unit test over the message files if one does not already exist.
  - [x] 6.4 Fix any hardcoded or unkeyed copy found. Swedish stays the source language; keep exact punctuation/casing for copy already validated by visual gates (for example "Tack för ditt omdöme.").

- [x] **Task 7: Regression coverage for the hardened loop** (AC: #2, #3, #4, #5)
  - [x] 7.1 Add or extend Vitest coverage pinning: routing-boundary contract (Task 2.4), Back/dismiss state preservation, invalid-slug not-found state, detail API-error retry state, blocked-handoff fallback intent, stale-overlay prevention, and sv/en key parity.
  - [x] 7.2 Add or extend Playwright coverage for the mobile visit loop where feasible: select venue -> route overlay -> dismiss -> state preserved; deep link to `/?venue=test-venue-sunny` -> detail renders; invalid slug -> localized error state; browser Back from detail -> map state restored. Stub `window.open` as `test/e2e/map-primary.spec.ts` already does; never navigate the runner into a real maps app.
  - [x] 7.3 Update existing tests rather than duplicating assertions; `MapView.test.tsx`, `RouteOverlay.test.tsx`, `VenueQuickInfo.test.tsx`, `VenueDetailOverlay.test.tsx`, `FeedbackFlow`/`ReviewFlow` tests already cover adjacent behaviour.
  - [x] 7.4 Keep tests deterministic: fixture/intercepted API responses only, no live Supabase dependency, no real geolocation/camera.

- [x] **Task 8: Scope quarantine and API-boundary scans** (AC: #7)
  - [x] 8.1 Run the MVP monetization quarantine scan: `rg -n "PremiumContext|usePremiumStatus|queryKeys\.premium|/api/payments|Swish|swish|paywall|premium gate|lock badge|Season Pass|Säsongskortet" nextjs-app/app nextjs-app/components nextjs-app/hooks nextjs-app/lib nextjs-app/messages`. Routing, feedback, and review paths must show zero monetization wiring.
  - [x] 8.2 Run the API-boundary scan: `rg -n "lib/(solar|weather|supabase|middleware|buildings)" nextjs-app/app nextjs-app/components nextjs-app/hooks nextjs-app/lib`. Matches must be confined to server-side routes/lib internals and the documented server-only persistence adapters; no client component may import backend engine modules.
  - [x] 8.3 Record both scan outcomes (and any approved pre-existing matches) in completion notes.

- [x] **Task 9: Final verification and review gate** (AC: #6, all)
  - [x] 9.1 Run `cd nextjs-app && npx.cmd tsc --noEmit`.
  - [x] 9.2 Run `cd nextjs-app && npx.cmd eslint . --quiet`.
  - [x] 9.3 Run `cd nextjs-app && npx.cmd vitest run`.
  - [x] 9.4 Run `cd nextjs-app && npx.cmd playwright test`.
  - [x] 9.5 Run visual validation for all five required states:
    - `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-with-selected-venue "/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00" mobile`
    - `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=14:00" mobile`
    - `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=16:30" desktop`
    - `.\scripts\run-sh.ps1 scripts/visual-validate.sh feedback "/?venue=test-venue-sunny&_state=feedback" mobile`
    - `.\scripts\run-sh.ps1 scripts/visual-validate.sh review "/?venue=test-venue-sunny&_state=review" mobile`
  - [x] 9.6 If any reference PNG or capture recipe must change, update `nextjs-app/docs/design/references/REBASELINE-LOG.md` in the same operation with explicit rationale and Rasmus's approval. Hardening fixes should not normally change visual output; treat any visual diff as a signal to re-check the fix first. *(No reference or recipe changed — all five gates passed against existing references; REBASELINE-LOG.md untouched.)*
  - [x] 9.7 Before changing sprint status to `review`, run `.\scripts\run-sh.ps1 scripts/story-review.sh 3-4-routing-visit-loop-hardening`. *(Gate passed; artifact: `validation/3-4-routing-visit-loop-hardening-review-20260611-135723.log`.)*

## Dev Notes

### Current Implementation State

- **Routing (Story 3.1):** `nextjs-app/lib/services/routing.ts` is the pure helper for Google Maps search/directions URLs, Apple Maps walking directions, platform detection, WGS84 distance, walk/bike estimates, and direction labels. `components/composed/routing/RouteButton.tsx` is the shared CTA; `components/custom/routing/RouteOverlay.tsx` shows walk/bike/direction with dismiss, Escape handling, focus management, and a blocked-popup fallback link. `MapView.tsx` owns route orchestration and contains the single approved runtime `window.open(directionsUrl, '_blank', 'noopener,noreferrer')` call (line ~663 at draft time). Story 3.1 Round 1 already fixed: dialog focus/Escape, accessible-name estimate, stale overlay on venue change, fallback link using search-instead-of-directions URL, and degenerate-coordinate handling — this story verifies those fixes still hold and pins them against regression.
- **Feedback (Story 3.2):** `FeedbackFlow`/`FeedbackPrompt` (custom/composed), `useSubmitFeedback`, server-only feedback persistence, sessionStorage duplicate suppression, likely-visited eligibility, forced `_state=feedback`, and the shared `components/composed/shared/AmberCTAButton.tsx`. Feedback renders through a `feedbackSlot` passed into `VenueDetailContent` from `MapView`.
- **Reviews (Story 3.3):** `/api/reviews` GET/POST, `useVenueReviews`/`useSubmitReview`, `ReviewCard`/`ReviewForm` (composed), `ReviewFlow` (custom) rendered through a dedicated `reviewSlot` below the route CTA, forced `_state=review`, review-backed detail summary metadata, and unique per-instance IDs for the mobile/desktop duplicate-mount fix.
- **Venue selection/deep links:** `MapView` reads `searchParams.get('venue')` and updates the URL via `queryWithout(searchParams, ['venue', '_state'])` patterns, so selected-venue state is URL-addressable and browser Back transitions are router-driven. `useVenueDetail` powers detail data; `venueDetailQuery.isError` is consumed in `MapView`, and the venue list query has a `MapVenueError` retry treatment.
- **Messages:** route/venue copy lives in `nextjs-app/messages/{sv,en}/venue.json`; feedback/review copy in `nextjs-app/messages/{sv,en}/feedback.json`. Swedish is the source language.
- **Tests at draft time:** 62 Vitest files / 494 tests, Playwright suite with mobile/desktop/a11y projects, all green. Existing route/feedback/review specs: `test/unit/routing.test.ts`, `test/components/RouteOverlay.test.tsx`, `MapView.test.tsx`, `VenueQuickInfo.test.tsx`, `VenueDetailContent.test.tsx`, `VenueDetailOverlay.test.tsx`, `ReviewFlow.test.tsx`, `test/e2e/map-primary.spec.ts` (stubs `window.open`), `test/e2e/review.spec.ts`, and the axe a11y project.

### Architecture Guardrails

- Client components must not import from `nextjs-app/lib/solar`, `lib/weather`, `lib/supabase`, `lib/middleware`, or `lib/buildings`. Data access stays behind `app/api/*` routes wrapped by `hooks/queries/`/`hooks/mutations/`; query keys come from `nextjs-app/lib/query-keys.ts` only.
- Component direction: `components/custom/ -> components/composed/ -> components/ui/`. No reverse imports, no layer skipping.
- Keep MapLibre dynamically loaded; hardening work must not remount `MapContainer`/`VenuePinLayer` or statically import MapLibre anywhere new (`verify-maplibre-async` gate).
- Design tokens are binding (`nextjs-app/docs/design/DESIGN.md`). Hardening fixes must not introduce raw hex, ad-hoc spacing, or custom shadows.
- Do not add new API routes, route-calculation services, or paid maps APIs. The client-side estimate + native-map handoff contract from Story 3.1 is the approved design.
- Public copy must not leak geodata internals (EPSG, Baskarta, DTM, SQL/RPC names, import batches) or recalibrate confidence semantics.
- Performance budget unchanged: <=600 KB gzipped total JS, initial route <=280 KB, MapLibre chunk <=320 KB. An audit story must not regress bundle size.

### Previous Story Intelligence

- **Defect classes to re-verify (this is the heart of the story):** Story 3.1 Round 1 found dialog-focus/Escape gaps, stale overlays on venue change, and a blocked-fallback URL that lost directions intent. Story 3.3 Rounds 1-2 found cache staleness after submit, duplicate mounted flows with duplicate IDs across mobile/desktop overlays, non-plural-aware copy, text overflow, and persistence-failure handling gaps. All were fixed — Story 3.4's job is to prove the fixes still hold across *all* entry points (map, list, favourites, deep link) and pin them with regression tests, not to re-fix them.
- Story 3.2/3.3 established the pattern: inline venue-detail flows via slots (`feedbackSlot`, `reviewSlot`), forced `_state` for visual/E2E reachability, user-triggered-only retry semantics, and no automatic flow opening. Preserve all of these.
- The favourites surface (`/favoriter`, Story 2.7) and the bottom-sheet list (Story 2.2) are venue entry points that predate the routing helper — the Task 2 audit must explicitly include them; they may route only indirectly via selection, which is fine, but any direct route action there must use the shared contract.
- `useGeolocation()` always exposes coordinates (Gothenburg centrum fallback), so route estimates are never blocked on permission state.
- Visual gates for all five required states passed most recently on 2026-06-10 (Story 3.3 Round 2 gate). Any failure during this story is more likely a real regression than reference drift; investigate before considering rebaseline.

### External References (carried from Story 3.1 — no new technologies in this story)

- Google Maps URLs (`api=1`, `/maps/dir/`, `travelmode=walking`, `dir_action=navigate`): https://developers.google.com/maps/documentation/urls/get-started
- Apple Map Links (`daddr`, `dirflg=w`): https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html
- `rel="noopener"` semantics for external opens: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/noopener

No new libraries, framework upgrades, or API integrations are introduced by this story, so no further version research is required; the installed stack (Next.js 16.2.2, TanStack Query 5.x, Motion 12.x, next-intl, MapLibre 5.x) is unchanged.

### Expected File Impact

This is an audit story — the file impact is mostly tests plus targeted fixes. Expected:

Expected files created:

- `nextjs-app/test/unit/routing-boundary.test.ts` (or equivalent home for the routing-boundary pin, Task 2.4)
- `nextjs-app/test/unit/messages-parity.test.ts` (or equivalent sv/en key-parity pin, Task 6.3) — only if no existing test covers it
- `nextjs-app/test/e2e/visit-loop.spec.ts` (or extension of `map-primary.spec.ts`) for the Back/dismiss/deep-link/invalid-slug loop

Expected files modified (as audit findings require — possibly none beyond tests):

- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/routing/RouteOverlay.tsx`
- `nextjs-app/components/composed/routing/RouteButton.tsx`
- `nextjs-app/components/custom/feedback/FeedbackFlow.tsx` / `nextjs-app/components/custom/feedback/ReviewFlow.tsx`
- `nextjs-app/components/custom/venue/VenueDetailOverlay.tsx` / `nextjs-app/components/composed/venue/VenueDetailContent.tsx`
- `nextjs-app/components/custom/favourites/FavouritesList.tsx`
- `nextjs-app/messages/sv/venue.json`, `nextjs-app/messages/en/venue.json`, `nextjs-app/messages/sv/feedback.json`, `nextjs-app/messages/en/feedback.json`
- Existing test files listed under Current Implementation State

Files intentionally not created:

- No new `/api/*` route, no route-calculation backend, no paid maps integration.
- No admin/moderation surface, account/auth provider, or analytics dashboard.
- No premium/payment/Swish/Season Pass/paywall/lock-badge runtime path.
- No geodata/import/confidence script changes.
- No new global state manager or URL-schema redesign — state preservation fixes stay inside the existing router/query-param + context architecture.

### Project Structure Notes

- Story files live directly under `_bmad-output/implementation-artifacts/` with dash-separated names; sprint key is `3-4-routing-visit-loop-hardening`.
- All app commands run from `nextjs-app/`; shell scripts run through `.\scripts\run-sh.ps1` on Windows (Git Bash wrapper).
- No structural conflicts detected: the audit consumes existing architecture; any fix that seems to require a new layer, route, or provider is out of scope and must be surfaced instead of implemented.

### References

- `AGENTS.md` — canonical repo rulebook: commands, API boundary, design tokens, Swedish copy, accessibility, visual validation, sprint workflow, review guidelines.
- `CLAUDE.md` — temporary compatibility shim pointing Claude Code agents at `AGENTS.md`; read first when running under Claude Code.
- `project-context.md` — Screen ID -> Route Map (the five gate states and their routes), state-forcing convention, seeded `test-venue-sunny`.
- `_bmad-output/planning-artifacts/epics.md` — Story 3.4 source of truth (ACs verbatim) and Epic 3 intro/sequencing notes.
- `_bmad-output/planning-artifacts/architecture.md` — API boundary, three-layer component architecture, route/feedback/review component mapping, query-key rule, i18n namespaces, performance NFRs.
- `_bmad-output/planning-artifacts/ux-design-specification.md` — route overlay, feedback, review behaviour, Back/dismiss patterns, motion timings, error/loading patterns.
- `nextjs-app/docs/design/DESIGN.md` — binding tokens for any visual-affecting fix.
- `_bmad-output/implementation-artifacts/3-1-routing-navigation-to-venue.md` — routing contract, Review Findings Round 1, file map.
- `_bmad-output/implementation-artifacts/3-2-sun-accuracy-feedback.md` — feedback flow contract and review-round learnings.
- `_bmad-output/implementation-artifacts/3-3-venue-reviews.md` — review flow contract, Rounds 1-2 findings, slot architecture, plural/wrapping/duplicate-ID lessons.
- `_bmad-output/implementation-artifacts/deferred-work.md` — confirmed: no active Story 3.4 carry-in at draft time.
- Sprint note 2026-05-30: Story 3.4 was added from BMAD party-mode recommendations to verify the shared routing contract, native-map handoff fallback, Back/dismiss state preservation, accessibility, i18n, visual validation, API boundary, and MVP monetization quarantine after Stories 3.1-3.3 landed.

### Draft Verification

- Draft baseline passed before writing this story at commit `2dfe1dc`:
  - `cd nextjs-app && npx.cmd tsc --noEmit` (0 errors)
  - `cd nextjs-app && npx.cmd eslint . --quiet` (0 errors)
- No active deferred-work queue item targets Story 3.4.
- Acceptance criteria are preserved verbatim from `_bmad-output/planning-artifacts/epics.md` §Story 3.4.

## Dev Agent Record

### Agent Model Used

Claude Code (Fable 5, `claude-fable-5`)

### Debug Log References

- Baseline before editing (Task 1): `npx.cmd tsc --noEmit` 0 errors, `npx.cmd eslint . --quiet` 0 errors.
- Red phase evidence: the 4 new MapView behaviour tests (route-overlay confidence context, not-found state, deep-link retry state, behind-overlay retry) failed against the unmodified implementation before the fixes landed (vitest run 2026-06-11, 4 failed / 58 passed), then passed after.

### Completion Notes List

- **Task 2 audit basis (route-action enumeration, 2.1):** route/open-map actions found: (1) `VenueQuickInfo` → shared `RouteButton` → `MapView.handleRouteSelectedVenue`; (2) `VenueDetailContent` → shared `RouteButton` → `MapView.handleRouteDetailVenue`, plus the "ÖPPNA I KARTOR" anchor built with `buildGoogleMapsSearchUrl`; (3) `FeedbackFlow` "Hitta hit" `mapHref` built with `buildGoogleMapsSearchUrl`; (4) `RouteOverlay` fallback anchor receives `buildGoogleMapsDirectionsUrl` from MapView (directions intent preserved — Story 3.1 R1 #4 still fixed); (5) `MapView.handleRouteVenue` owns the single `window.open(directionsUrl, '_blank', 'noopener,noreferrer')` call. `VenueList`/`VenueCard`, `FavouritesList`, `VenueDetailOverlay`, `ReviewFlow`/`ReviewForm`/`ReviewCard` have no direct route actions (selection-only entry points).
- **Task 2.2 scan:** `grep -rnE "window\.open|maps\.apple|google\.com/maps|geo:"` over `app components hooks lib` returned only `lib/services/routing.ts` URL constants and the single `MapView.tsx` `window.open` call site. Boundary holds; no refactor needed (2.3 no-op). Pinned by new `test/unit/routing-boundary.test.ts` (window.open confinement, URL-pattern confinement, approved helper-consumer set).
- **Task 3 audit:** entry paths verified — pin tap (MapSelectionContext), bottom-sheet/list card (`handleSelectVenueFromList`), favourites (`/favoriter` + `FavouritesList.onSelectVenue`), deep link (`?venue=` effect). Back/dismiss verified by existing MapView tests plus new `test/e2e/visit-loop.spec.ts` (route-overlay dismiss preserves venue+`_time`; browser Back from detail closes the overlay, restores map pins, keeps planner param; both mobile and desktop projects). Loading states use `Skeleton` treatments throughout (`VenueDetailContent`, `VenueQuickInfo`, `VenueList`, `MapLoadingFallback`).
- **Task 3.3 fix (gap found):** an invalid `/?venue=<bad-slug>` deep link previously showed a skeleton then silently unmounted the overlay with no message and a stale `?venue=` param (the existing test only pinned "no fabricated sheet"). Added a localized `VenueDetailError` notice in `MapView`: 404 → `detail.notFound` + "Tillbaka till kartan" (clears the venue param); other errors → `detail.loadFailed` + "Försök igen" (refetch) + back action; when fallback venue content renders behind a failed detail query, a retry-only notice shows at `z-toast` (404-with-fallback is suppressed because contradicting visible venue content would mislead). Added `isVenueNotFoundError` to `hooks/queries/venue-query-options.ts` mirroring the existing 4xx message pattern. New sv/en keys: `detail.notFound`, `detail.loadFailed`, `detail.retry`, `detail.backToMap`.
- **Task 4 audit:** 4.1 — `setRouteOverlay(...)` is invoked before `window.open` inside the same user-gesture handler; destination, walk estimate, and (now) confidence context are part of the overlay state before the handoff. 4.2 — `window.open` returning null leaves the overlay mounted with the localized `route.openMaps` fallback anchor carrying the *directions* URL (pinned by existing MapView test and new visit-loop e2e). 4.3 — stale overlay prevention via the `activeRouteVenueId` effect plus per-venue `key` (pinned by existing "clears a route overlay when the selected venue is cleared" test).
- **Task 4.4 fix (gap found):** the route overlay had no confidence context (AC #3). Added an optional `confidence` row to `RouteOverlayLabels`/`RouteOverlay` and a `routeConfidenceLabel()` in MapView that reuses the existing public presentation only: `getConfidenceDisplayState` (with the surface-appropriate `SunFreshnessMeta` from quick-info/detail) + `getPredictionUncertaintyDisplay` visible label, joined as e.g. "Säkerhet 95% · Osäker prognos". Hidden confidence renders nothing — no invented numbers, no geodata internals. New sv/en keys: `route.confidence`, `route.confidenceApproximate`, `route.confidenceUnavailable`.
- **Task 5 audit basis:** manual element-by-element audit of RouteButton, RouteOverlay, feedback prompt/buttons, review CTA/form/photo control/retry/close, detail chrome buttons (all have accessible names, semantic `<button>`/`<a>`/`<input>` roles, `focus-visible:ring-2` indicators, and ≥44px targets via `min-h-11`/`size-11`/`min-h-12`); keyboard/Escape/focus-restore for RouteOverlay verified held (Story 3.1 R1 #1); reduced-motion verified via `useReducedMotion`/`motion-reduce:` across route/feedback/review surfaces. Findings fixed: (1) ReviewForm photo-selected confirmation was not announced to AT — added `role="status"`; (2) axe color-contrast (serious) on `text-text-muted` review-count "(2)" in `VenueDetailContent` and "Plats inom SunnySeat" subtitle in `ReviewForm` — both moved to the AA-passing `text-text-body` token (plus the identical photo-selected paragraph). Assessed-not-a-violation (with rationale, not an exclusion): `maxLength`-capped textareas without live character-count announcements — fields have visible labels, the cap is browser-enforced, and no status message exists for any user, so no WCAG 2.1 AA SC fails.
- **Task 5.4:** extended `test/e2e/axe.spec.ts` with venue-detail, route-overlay (opened via stubbed `window.open` gesture), feedback, and review forced states. Full a11y project: 7/7 passed, zero violations after fixes.
- **Task 6 audit:** all Epic 3 copy resolves to scoped `next-intl` keys in `venue.json`/`feedback.json`; sv/en structural parity verified for all 7 namespaces and pinned by new `test/unit/messages-parity.test.ts` (both directions, per-namespace). Scan command recorded: `grep -rnE ">[A-ZÅÄÖ][a-zåäö]+( [a-zåäöA-ZÅÄÖ]+)*<|'[A-ZÅÄÖ][a-zåäö]+( [a-zåäö]+)+'"` over the routing/feedback components → zero matches after fix. Finding fixed (6.4): `VenueQuickInfo` carried hardcoded Swedish fallbacks (`?? 'Ta bort favorit'` / `?? 'Spara som favorit'`) — fallbacks removed and `favouriteAdd`/`favouriteRemove` made required label props (MapView already always passes localized values).
- **Task 8 scan outcomes (8.3):** monetization quarantine scan → zero matches across `app components hooks lib messages`. API-boundary scan matches are confined to: two comments (`app/api/venues/route.ts:6`, `lib/services/venues-fixture.ts:2`), the documented server-only persistence adapters (`venue-feedback-persistence.ts`, `venue-reviews-persistence.ts` dynamic `@/lib/supabase/server` imports), and backend-internal imports inside `lib/solar`/`lib/weather`. No client component imports backend engine modules.
- **Known limitation noted (not a gate failure):** the axe a11y project runs on a desktop viewport, so mobile-only muted-text (e.g. `FactCard` `text-label-sm text-text-muted` labels in the mobile venue-detail sheet) is outside the automated gate. Left untouched in this story because those surfaces are pinned by approved mobile visual references; flagged as a candidate for a future mobile-viewport axe extension.
- Scope exclusions held: no new API routes, route-calculation backends, admin/auth/moderation, premium/payment/Swish paths, geodata imports, confidence recalibration, global state managers, or URL schema changes.
- **Scroll-position audit basis (AC #2 "where applicable", recorded per review R1-P11):** structural audit of the three in-loop dismiss paths. (1) `RouteOverlay` renders as an absolutely positioned sibling of the detail surfaces in `MapView` — opening/dismissing it never unmounts or re-renders the detail scroll container, so the browser-retained scroll position is untouched. (2) `FeedbackFlow` and `ReviewFlow` render inline through `feedbackSlot`/`reviewSlot` *inside* `VenueDetailContent`'s existing scroll container — open/close collapses only the slot's own height in place; the container itself persists. (3) Browser Back from venue detail unmounts the detail surface entirely (scroll preservation not applicable by design — the map state, selection, and planner params are what Back restores, pinned by `visit-loop.spec.ts`). No code path stores or restores scroll manually, and no fix was needed; preservation relies on the surfaces never unmounting mid-loop, which the slot architecture guarantees.

### File List

- `_bmad-output/implementation-artifacts/3-4-routing-visit-loop-hardening.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/validation/3-4-routing-visit-loop-hardening-review-20260611-135723.log`
- `nextjs-app/components/composed/feedback/ReviewForm.tsx`
- `nextjs-app/components/composed/venue/VenueDetailContent.tsx`
- `nextjs-app/components/composed/venue/VenueQuickInfo.tsx`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/routing/RouteOverlay.tsx`
- `nextjs-app/hooks/queries/venue-query-options.ts`
- `nextjs-app/messages/en/venue.json`
- `nextjs-app/messages/sv/venue.json`
- `nextjs-app/test/components/MapView.test.tsx`
- `nextjs-app/test/components/RouteOverlay.test.tsx`
- `nextjs-app/test/e2e/axe.spec.ts`
- `nextjs-app/test/e2e/visit-loop.spec.ts`
- `nextjs-app/test/unit/messages-parity.test.ts`
- `nextjs-app/test/unit/routing-boundary.test.ts`

### Review Findings

**Round 1 of 3** — reviewed 2026-06-11 via `bmad-code-review` (Blind Hunter + Edge Case Hunter + Acceptance Auditor layers). Auditor independently re-verified the routing-boundary, monetization-quarantine, API-boundary, and regression-gate claims (all hold; per-AC verdicts: #1, #3–#7 SATISFIED, #2 PARTIAL pending the scroll-audit basis). After deduplication and orchestrator code-verification: 0 decision-needed, 11 patch, 2 defer, 10 dismissed as noise/false-positive (including the "double confidence label" and "venue/meta mismatch" claims, both disproven against `confidence-display.ts` and the `selectedQuickInfoVenue` derivation).

*All 11 patches applied 2026-06-12 (R1-P1…R1-P11):* synthetic-fallback meta withheld via `detailFallback.isSynthetic` (P1, pinned by new MapView test); detail error notice suppressed while a retry is in flight (P2, pinned) and when `MapVenueError` already occupies the alert slot (P3, pinned); `RouteOverlayConfidence` `{visible, accessible}` pair carries `getConfidenceDisplayState().accessibleText` to a `sr-only` span so screen readers hear "Säkerhet cirka 88%" and the `route.confidenceApproximate` key is genuinely consumed (P4, pinned in RouteOverlay test); ReviewForm photo `role="status"` region now always mounted (`sr-only` when empty, no layout/visual-gate impact) (P5); visit-loop e2e now asserts `/Säkerhet \d+%/` in the overlay (P6, passes against the live fixture); new axe test covers the `VenueDetailError` not-found surface (P7, zero violations); messages-parity treats empty objects as leaves (P8) and pins ICU placeholder parity per key with a brace-depth ICU argument parser (P9 — immediately caught and correctly handles the `feedback.review.summary` plural); `refetch` made required in the MapView detail-hook mock and the production `?.` dropped (P10); scroll-position audit basis recorded in Completion Notes (P11, closes the AC #2 PARTIAL). Gate rerun 2026-06-12: lint 0, tsc 0, Vitest 64 files / 525 tests, focused Playwright 16/16 (visit-loop mobile+desktop, axe a11y 8/8 zero violations), story-review gate passed with all five visual validations PASS and no rebaseline (`validation/3-4-routing-visit-loop-hardening-review-20260612-111840.log`).

- [x] [Review][Patch] P1 (HIGH): Route overlay can show "Säkerhet 0%" for the synthetic loading-fallback venue — `fallbackVenueFromSlug` hardcodes `confidence: 0`; clicking "Visa Rutt" on the loading detail overlay with fresh list meta renders an invented confidence, contradicting the helper's own "shows nothing rather than inventing a number" contract [nextjs-app/components/custom/map/MapView.tsx:643,991]
- [x] [Review][Patch] P2 (MEDIUM): Clicking "Försök igen" on the deep-link error notice flips the notice variant mid-refetch — `isFetching` makes `detailFallbackVenue` synthesize a venue, so the Back button vanishes under the pointer and a fabricated slug-titled sheet mounts until the retry fails again [nextjs-app/components/custom/map/MapView.tsx:683-690,377-379]
- [x] [Review][Patch] P3 (MEDIUM): `VenueDetailError` fully occludes `MapVenueError` when both queries fail (offline deep link) — identical placement, `z-toast` above `z-floating-buttons`, map-retry unreachable, two stacked `role="alert"` regions [nextjs-app/components/custom/map/MapView.tsx:925-935]
- [x] [Review][Patch] P4 (MEDIUM): Approximate/unavailable confidence semantics dropped in the route overlay — `routeConfidenceLabel` discards `accessibleText`, so `route.confidenceApproximate`/`route.confidenceUnavailable` never reach output and screen readers cannot distinguish "~88%" from "88%" [nextjs-app/components/custom/map/MapView.tsx:1176-1186]
- [x] [Review][Patch] P5 (MEDIUM): ReviewForm photo `role="status"` live region mounts together with its content — live regions must exist before content changes or most SR/browser pairs announce nothing on the one event the role was added for [nextjs-app/components/composed/feedback/ReviewForm.tsx:216]
- [x] [Review][Patch] P6 (MEDIUM): visit-loop e2e title claims "confidence context" coverage but asserts none — the only real-browser pin for the AC #3 confidence clause is vacuous [nextjs-app/test/e2e/visit-loop.spec.ts:44]
- [x] [Review][Patch] P7 (LOW): The new `VenueDetailError` surface is reachable in no axe scan — add an a11y test for the invalid-slug not-found state [nextjs-app/test/e2e/axe.spec.ts]
- [x] [Review][Patch] P8 (LOW): messages-parity `flattenKeys` is blind to empty-object subtrees — sv `"section": {}` vs en missing `section` passes parity [nextjs-app/test/unit/messages-parity.test.ts:25-31]
- [x] [Review][Patch] P9 (LOW): messages-parity pins key names only, not ICU placeholders — a dropped `{minutes}` in one locale passes the test while breaking runtime formatting [nextjs-app/test/unit/messages-parity.test.ts:44-47]
- [x] [Review][Patch] P10 (LOW): Production `void venueDetailQuery.refetch?.()` optional-chains solely to accommodate the test-mock shape — tighten the mock contract and drop the `?.` [nextjs-app/components/custom/map/MapView.tsx:687, nextjs-app/test/components/MapView.test.tsx:70-78]
- [x] [Review][Patch] P11 (LOW): AC #2 scroll-position preservation has no recorded audit basis and no test — perform the structural check and record it in Completion Notes per the audit-story note [this story file, Task 3 Completion Note]
- [x] [Review][Defer] D1: axe a11y project is desktop-viewport only, leaving mobile-sheet variants outside the automated gate [nextjs-app/playwright.config.ts] — deferred, pre-existing and disclosed in Completion Notes as a future mobile-viewport axe extension
- [x] [Review][Defer] D2: `VenueCard` still carries hardcoded Swedish sun-label fallbacks (`?? 'FULL SOL'` etc.), the same defect class Task 6.4 removed from VenueQuickInfo [nextjs-app/components/composed/venue/VenueCard.tsx:110-113] — deferred, pre-existing, non-violating (AC #5 forbids English copy; callers always pass localized labels)

## Change Log

| Date | Author | Note |
|------|--------|------|
| 2026-06-11 | Bob | Drafted Story 3.4 ready-for-dev hardening brief from epics.md, Stories 3.1-3.3 contracts and review-finding history, current routing/feedback/review implementation state, AGENTS.md gates, and the five-state visual validation matrix. |
| 2026-06-11 | Amelia | Started implementation; baseline typecheck/lint passed; Task 1 source-context reading completed; sprint status moved to in-progress. |
| 2026-06-11 | Amelia | Tasks 2-8: routing-boundary audit + pin test, invalid-slug/detail-error localized not-found/retry states, route-overlay confidence context, a11y fixes (photo-selected `role="status"`, contrast token fixes) with axe coverage extended to all Epic 3 surfaces, VenueQuickInfo hardcoded-fallback removal, sv/en parity pin test, visit-loop Playwright spec, monetization + API-boundary scans clean. |
| 2026-06-11 | Amelia | Task 9 final gates passed: tsc 0 errors, eslint 0 errors, Vitest 64 files / 515 tests, Playwright 61 passed / 30 skipped, axe a11y 7/7 zero violations, all five visual validations PASS without rebaseline, story-review gate passed and sprint status moved to review. |
| 2026-06-11 | Claude (review) | Code review Round 1 of 3 (Blind Hunter + Edge Case Hunter + Acceptance Auditor): 0 decision-needed, 11 patch, 2 defer, 10 dismissed. Defers recorded in deferred-work.md. |
| 2026-06-12 | Claude (review) | All 11 Round 1 patches applied and pinned (synthetic-fallback confidence, retry/notice variant stability, alert stacking, accessible approximate confidence, always-mounted photo status region, e2e confidence assertion, VenueDetailError axe coverage, parity empty-object + ICU placeholder pins, mock contract tightening, scroll-audit basis). Gate rerun green: lint 0, tsc 0, Vitest 64 files / 525 tests, Playwright 16/16 focused, five visual gates PASS, no rebaseline. Status review → done. |
