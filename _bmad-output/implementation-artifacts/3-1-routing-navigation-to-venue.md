---
baseline_commit: 8cc897f
drafted_at: 2026-06-07T17:45:08+02:00
---

# Story 3.1: Routing & Navigation to Venue

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Sequencing:** Story 3.0 and the full Epic 3 Prelude block, Stories 3.0.1-3.0.7, are done. Story 3.1 is unblocked and should now build on the corrected shadow-data/confidence/copy model without reopening it.
>
> **Scope boundary:** Implement route CTA behaviour, route estimates, native maps opening, and the route/open-map URL helper. Do not add feedback, reviews, visit-loop hardening beyond this story's required dismiss/back basics, admin surfaces, premium/payment logic, Swish, Season Pass copy, paywalls, lock badges, geodata imports, SQL, confidence recalibration, or new backend route-calculation APIs.
>
> **Repair note:** `sprint-status.yaml` already lists `3-1-routing-navigation-to-venue` as `ready-for-dev`, but the story file was missing in this checkout. This file recreates the ready-for-dev brief from the current artifacts; the sprint row is intentionally left unchanged.

## Story

As a **user**,
I want to get directions to a sunny venue and see how long it takes to walk or bike there,
So that I can navigate there confidently.

## Acceptance Criteria

**Given** the user is viewing a VenueQuickInfo card or venue detail
**When** they tap the "Visa Rutt" RouteButton
**Then** a route overlay appears showing walk/bike time and direction to the venue
**And** the RouteButton uses `gradient-route-button` (gold-to-dark), `shadow-route-button`, `radius-pill` — the primary action on the screen

**Given** the "Visa Rutt" button is tapped on mobile
**When** routing is initiated
**Then** the device's native map application opens with directions to the venue coordinates (via geo: URI or platform-specific intent)
**And** estimated walk time is displayed before the user leaves the app

**Given** the venue detail shows an address row
**When** the "ÖPPNA I KARTOR" link is displayed
**Then** the link text uses `color-amber-dark` with an external link icon
**And** tapping it opens the venue location in the device's native map application (Google Maps, Apple Maps, etc.)

**Given** the "Visa Rutt" button is loading route data
**When** the route calculation is in progress
**Then** the button shows a spinner replacing the icon (`duration-default`) — the button remains interactive once complete

**Given** routing is accessed via VenueQuickInfo
**When** the user taps "Visa Rutt" on the quick-info card
**Then** the same routing behaviour occurs without requiring the user to open the full venue detail first

**Given** all routing UI text uses i18n keys
**When** the locale is Swedish or English
**Then** button labels, time estimates, and link text render in the correct language

**Design Gate Criteria:**
- **Behaviour:** All interactions and states defined in UX spec §RouteOverlay and §RouteButton are implemented
- **Animation:** Button spinner and route overlay entrance animations match spec timings (±50 ms tolerance)
- **Visual validation:** No standalone screenshot gate. This component is validated as part of the parent screen(s) that render it (`map-primary`, `venue-detail`), plus component-level unit tests and the UX behaviour spec.

> **No standalone Visual design gate criterion is defined in `epics.md` for this story.** This is intentional: the route UI is validated through the parent `map-with-selected-venue` and `venue-detail` screens plus component tests.

## Tasks / Subtasks

- [x] **Task 1: Baseline and source-context check** (AC: all)
  - [x] 1.1 Run `cd nextjs-app && npx.cmd tsc --noEmit` before editing. Stop and surface any errors outside this story's scope. *(Supporting infrastructure: repo workflow guardrail.)*
  - [x] 1.2 Run `cd nextjs-app && npx.cmd eslint . --quiet` before editing. Stop and surface any errors outside this story's scope. *(Supporting infrastructure: repo workflow guardrail.)*
  - [x] 1.3 Read `AGENTS.md`, `project-context.md`, this story, `_bmad-output/planning-artifacts/epics.md`, `_bmad-output/planning-artifacts/prd.md`, `_bmad-output/planning-artifacts/architecture.md`, `_bmad-output/planning-artifacts/ux-design-specification.md`, and `nextjs-app/docs/design/DESIGN.md`. *(Supporting infrastructure: source-context guardrail.)*
  - [x] 1.4 Read `nextjs-app/docs/design/references/claude-design/README.md` and the relevant MVP `VenueDetail` / selected-venue prototype source before changing visible route UI. Match visual outcome, not prototype implementation. *(Supporting infrastructure: visual-source guardrail.)*
  - [x] 1.5 Confirm `_bmad-output/implementation-artifacts/deferred-work.md` still has no active Story 3.1 target. Do not pull later Story 3.2/3.3/3.4 deferred work into this story. *(Supporting infrastructure: scope guardrail.)*
  - [x] 1.6 Confirm sprint sequencing: Stories 3.0, 3.0.1, 3.0.2, 3.0.3, 3.0.4, 3.0.5, 3.0.7, and 3.0.6 are `done`; Story 3.1 is `ready-for-dev`. *(Supporting infrastructure: sequencing guardrail.)*

- [x] **Task 2: Create a pure routing helper contract** (AC: #1, #2, #3, #5)
  - [x] 2.1 Add a small pure helper under `nextjs-app/lib/services/` such as `routing.ts`. It must have zero React imports and no imports from `lib/solar`, `lib/weather`, `lib/supabase`, `lib/middleware`, or `lib/buildings`.
  - [x] 2.2 Move current ad hoc URL construction out of `MapView.openDirections()` and `VenueDetailContent.mapsUrl()` into the helper. Both QuickInfo and detail must use the same URL builder.
  - [x] 2.3 Build map-search URLs for the "ÖPPNA I KARTOR" address row using venue coordinates when finite, with address/name fallback only when coordinates are unavailable.
  - [x] 2.4 Build direction URLs for the RouteButton using venue coordinates when finite. Include a walking intent by default. Keep the existing Google Maps universal URL as the web fallback, but support native-friendly mobile targets such as Apple Map Links on iOS and/or `geo:` where the chosen scheme preserves directions semantics.
  - [x] 2.5 Do not call the paid Google Directions API, Routes API, Apple Maps Server API, or any route-calculation endpoint. This story estimates local travel time client-side and then opens the user's maps app for real navigation.
  - [x] 2.6 Preserve `noopener,noreferrer` for external `window.open`/`target="_blank"` paths. Avoid delayed `window.open` after async work because browsers can treat it as non-user-initiated.

- [x] **Task 3: Estimate walk/bike times and direction text** (AC: #1, #2, #6)
  - [x] 3.1 Add deterministic time-estimate helpers that consume `VenueDataDto.distanceMeters` when available and fall back to a great-circle distance between `useGeolocation().coords` and `venue.location` when needed.
  - [x] 3.2 Display estimates as approximate user copy, for example "ca 11 min promenad" and "ca 4 min cykel" in Swedish, with matching English fallback. Do not imply turn-by-turn route accuracy.
  - [x] 3.3 Show a simple direction label derived from origin and destination, for example a cardinal/intercardinal direction ("norrut", "nordost") or a concise "mot {neighborhood}" fallback. Keep copy useful without adding map-polyline rendering.
  - [x] 3.4 Handle missing/invalid distance or coordinates gracefully: keep the maps link available if a fallback query exists, hide unavailable estimates with accessible text, and never render `NaN`, `Infinity`, or raw coordinates as normal user copy.
  - [x] 3.5 Keep all helper math in public WGS84 latitude/longitude terms. Do not expose CRS, EPSG:3007, Baskarta, DTM, source geometry, import batches, SQL/RPC names, or confidence internals in user copy.

- [x] **Task 4: Implement RouteButton state without duplicating CTA logic** (AC: #1, #4, #5, #6)
  - [x] 4.1 Either extract the existing QuickInfo/detail route button markup into a reusable presentational component, or update both existing buttons together if extraction would add unnecessary abstraction. If extracted, keep presentation under `components/composed/` and route orchestration under `components/custom/`.
  - [x] 4.2 Preserve `gradient-route-button`, `shadow-route-button`, `rounded-pill`/`radius-pill`, project typography tokens, and at least a 44x44 px touch target.
  - [x] 4.3 Ensure there is only one primary `gradient-route-button` action in a given venue surface. Secondary actions such as "Mer Info" and "ÖPPNA I KARTOR" must not visually compete with it.
  - [x] 4.4 Add a loading state where a spinner replaces the navigation icon for `duration-default` timing. Use `lucide-react` where possible, provide accessible loading text, and respect `prefers-reduced-motion`.
  - [x] 4.5 The button must become interactive again after route preparation completes, and it must not stay disabled after a failed/blocked native-map open attempt.

- [x] **Task 5: Add route overlay behaviour in the existing map/detail flow** (AC: #1, #2, #5)
  - [x] 5.1 Add a route overlay surface, likely `nextjs-app/components/custom/routing/RouteOverlay.tsx`, or a minimal equivalent inside the existing map/detail orchestration if that keeps the implementation smaller. It must show walk time, bike time, and direction.
  - [x] 5.2 Wire `MapView` so `VenueQuickInfo.onRoute` opens the overlay for the selected venue and invokes the native-map URL helper from the same user gesture.
  - [x] 5.3 Wire `VenueDetailOverlay` / `VenueDetailContent` so the full detail RouteButton uses the exact same route action and estimate contract as QuickInfo.
  - [x] 5.4 Ensure estimated walk time is visible before the user leaves the app. Prefer precomputing and rendering the estimate in the CTA context and overlay before the click path can navigate away; do not rely on a delayed paint after `window.open`.
  - [x] 5.5 On mobile, the route action should open the native maps target. On desktop, opening the same maps URL in a new tab is acceptable while the in-app overlay remains visible.
  - [x] 5.6 Add a dismiss control with an accessible name. Dismissing the overlay returns to the current selected venue/detail state without clearing the selected pin or unmounting the MapLibre canvas. *(Supporting infrastructure: required overlay lifecycle and accessibility.)*
  - [x] 5.7 If the native maps open is blocked or unsupported, keep the overlay visible and provide a token-styled "ÖPPNA I KARTOR" fallback link using the same helper.

- [x] **Task 6: Localize all routing copy** (AC: #6)
  - [x] 6.1 Add scoped keys under `nextjs-app/messages/sv/venue.json` and `nextjs-app/messages/en/venue.json`; keep Swedish as the source language and English as the fallback.
  - [x] 6.2 Keep existing labels `venue.quickInfo.route`, `venue.detail.route`, and `venue.detail.openMaps` unless the component contract requires moving them. If keys move, update every caller and test fixture.
  - [x] 6.3 Add keys for walk estimate, bike estimate, approximate prefix, route loading, route unavailable/fallback, overlay title/close label, and direction text.
  - [x] 6.4 Do not hardcode English user-facing copy in components, tests that render localized UI, or fallback states.

- [x] **Task 7: Focused regression coverage** (AC: all)
  - [x] 7.1 Add unit tests for the pure routing helper: Google fallback directions URL, Apple/native-friendly URL if implemented, map-search URL, URL encoding, invalid coordinates, estimated walk/bike minutes, and direction labels.
  - [x] 7.2 Update `VenueQuickInfo` component tests so the route CTA renders the estimate/loading state and calls the route handler without requiring full detail.
  - [x] 7.3 Update `VenueDetailContent` and `VenueDetailOverlay` tests so the maps link uses the shared helper, the external link icon remains, and the route CTA is disabled/loading only when intended.
  - [x] 7.4 Update `MapView` component tests that currently assert a bare Google Maps URL. They should assert the new helper contract, route overlay visibility, same QuickInfo/detail behaviour, and restoration after dismiss.
  - [x] 7.5 Add or update Playwright coverage for the mobile parent flows when feasible: selected QuickInfo `Visa Rutt`, venue detail `Visa Rutt`, and `ÖPPNA I KARTOR`. Stub or intercept `window.open`/popup handling; do not actually navigate the test runner into an external maps app.
  - [x] 7.6 Add accessibility checks for keyboard activation, accessible names, focus indicators, overlay dismiss, spinner state, and 44x44 touch targets.

- [x] **Task 8: Final verification and review gate** (AC: all)
  - [x] 8.1 Run `cd nextjs-app && npx.cmd tsc --noEmit`. *(Supporting infrastructure: required quality gate.)*
  - [x] 8.2 Run `cd nextjs-app && npx.cmd eslint . --quiet`. *(Supporting infrastructure: required quality gate.)*
  - [x] 8.3 Run `cd nextjs-app && npx.cmd vitest run`. *(Supporting infrastructure: required quality gate.)*
  - [x] 8.4 Run `cd nextjs-app && npx.cmd playwright test` if route/open-map E2E tests are added. If only component tests cover external navigation safely, document the skip rationale. *(Supporting infrastructure: route workflow regression gate.)*
  - [x] 8.5 Run visual validation for changed parent screens. Expected minimum if visible route UI changes: `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-with-selected-venue "/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00" mobile`, `venue-detail` mobile, and `venue-detail` desktop. *(Supporting infrastructure: parent-screen visual gate.)*
  - [x] 8.6 If the route overlay becomes visible in a forced `_state` screen or a capture recipe/reference PNG changes, update `nextjs-app/docs/design/references/REBASELINE-LOG.md` in the same operation. Do not rebaseline to hide implementation mistakes. *(Supporting infrastructure: visual-source audit trail.)*
  - [x] 8.7 Run the API-boundary scan: `rg -n "lib/(solar|weather|supabase|middleware|buildings)" nextjs-app/app nextjs-app/components nextjs-app/hooks nextjs-app/lib`. *(Supporting infrastructure: repo API-boundary guardrail.)*
  - [x] 8.8 Run the MVP monetization quarantine scan: `rg -n "PremiumContext|usePremiumStatus|queryKeys\\.premium|/api/payments|Swish|swish|paywall|premium gate|lock badge|Season Pass|Säsongskortet" nextjs-app/app nextjs-app/components nextjs-app/hooks nextjs-app/lib nextjs-app/messages`. *(Supporting infrastructure: MVP scope guardrail.)*
  - [x] 8.9 Before changing sprint status to `review`, run `.\scripts\run-sh.ps1 scripts/story-review.sh 3-1-routing-navigation-to-venue`. *(Supporting infrastructure: canonical review transition gate.)*

## Dev Notes

### Current Implementation State

- `nextjs-app/components/composed/venue/VenueQuickInfo.tsx` already renders a token-backed `Visa Rutt` button and receives `onRoute` from its parent. The button is currently inline and has no estimate text, no loading spinner, and no overlay contract.
- `nextjs-app/components/custom/map/MapView.tsx` currently implements `handleRouteSelectedVenue()` by calling a local `openDirections(venue)` helper. That helper opens `https://www.google.com/maps/dir/?api=1&destination=...` with `window.open(..., '_blank', 'noopener,noreferrer')`.
- `nextjs-app/components/composed/venue/VenueDetailContent.tsx` currently builds its own Google Maps search URL in a local `mapsUrl()` helper and renders the "ÖPPNA I KARTOR" link with `text-amber-dark` and an external-link icon.
- `nextjs-app/messages/{sv,en}/venue.json` already has the basic route/open-map labels. It does not yet have route estimate, overlay, loading, unavailable, or direction text keys.
- `nextjs-app/lib/types/api.ts` exposes `VenueDataDto.location`, `distanceMeters`, `venueName`, `venueSlug`, `neighborhood`, and safe `predictionUncertainty`. These are enough for route estimates and map URLs without adding an API.
- `useGeolocation()` in `nextjs-app/hooks/useGeolocation.tsx` always exposes coordinates, using Gothenburg centrum fallback before permission or after denial. Use that as the route-estimate origin when a user coordinate is not available.
- Existing tests already cover the bare route/open-map behaviour in `nextjs-app/test/components/MapView.test.tsx`, `VenueQuickInfo.test.tsx`, `VenueDetailContent.test.tsx`, `VenueDetailOverlay.test.tsx`, and `test/e2e/map-primary.spec.ts`. Update them instead of adding parallel duplicate assertions.

### Architecture Guardrails

- Client components must not import from `nextjs-app/lib/solar`, `lib/weather`, `lib/supabase`, `lib/middleware`, or `lib/buildings`.
- Data access continues through existing public venue API routes and TanStack hooks. Do not add a routing API route unless Rasmus explicitly approves a future route-calculation backend.
- Query keys stay in `nextjs-app/lib/query-keys.ts`. Story 3.1 should not need new server-state query keys.
- Follow the component dependency direction: `components/custom/` may consume `components/composed/`; `components/composed/` may consume `components/ui/`; never reverse it.
- Keep MapLibre dynamically loaded and mounted. The route overlay is UI chrome above the map; it must not remount `MapContainer` or `VenuePinLayer`.
- Use only project design tokens and Tailwind v4 `@theme` utilities. Do not introduce raw hex values, arbitrary spacing, custom shadows, or copied prototype CSS.

### UX And Design Notes

- `nextjs-app/docs/design/DESIGN.md` defines `gradient-route-button`, `shadow-route-button`, `radius-pill`, `duration-default`, `duration-fast`, and `duration-slow`. These are binding.
- UX spec states QuickInfo appears in under 200 ms, selected-pin transition uses 200 ms, sheet transitions use 250-300 ms, and RouteButton is the single primary action on route-capable venue surfaces.
- Venue detail address row must keep the `color-amber-dark` / `text-amber-dark` open-maps link and external-link icon.
- The route overlay has no standalone visual validation ID. Validate via `map-with-selected-venue` and `venue-detail` parent screens, component tests, and UX timing assertions.
- `prefers-reduced-motion` must remove non-essential overlay/spinner animation while preserving state changes and accessible loading feedback.

### Latest External Routing References

- Google Maps URLs are the current no-key cross-platform fallback for search and directions. They require `api=1`, support `/maps/dir/` for directions, and support `travelmode=walking` / `travelmode=bicycling` plus `dir_action=navigate` where available. Source: https://developers.google.com/maps/documentation/urls/get-started
- Apple Map Links use normal `http://maps.apple.com/` / `https://maps.apple.com/` links and support `daddr` directions from "here" plus `dirflg=w` for walking. Source: https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html
- RFC 5870 defines `geo:` URIs for WGS84 geographic locations. Use it only if the implemented mobile strategy still opens directions, not just a point display. Source: https://www.rfc-editor.org/info/rfc5870
- External links/new windows should preserve `noopener` semantics so the opened context cannot access `window.opener`. Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/noopener

### Previous Story Intelligence

- Story 3.0 removed admin runtime scope. Do not introduce admin venue configuration, admin route telemetry, or admin auth helpers while adding routing.
- Story 3.0.5 made confidence semantics coverage-aware. Story 3.1 must not recalibrate confidence or infer route confidence from shadow coverage.
- Story 3.0.7 corrected the Baskarta/source-geometry contract. Story 3.1 user copy must avoid geodata/source terms.
- Story 3.0.6 added safe uncertainty copy and public `predictionUncertainty` metadata. Preserve those surfaces in QuickInfo and detail when adding route estimates.
- Recent commits `07d52ba` and `8cc897f` changed geodata/uncertainty and visual-reference alignment. Do not regress the passed visual gates for `map-panel-venues`, `map-with-selected-venue`, or `venue-detail`.

### Expected File Impact

Expected files created:

- `nextjs-app/lib/services/routing.ts`
- `nextjs-app/test/unit/routing.test.ts`
- `nextjs-app/components/composed/routing/RouteButton.tsx` only if extracting the shared presentational button is useful
- `nextjs-app/components/custom/routing/RouteOverlay.tsx` if the overlay is not kept inside existing map/detail orchestration
- `nextjs-app/test/components/RouteOverlay.test.tsx` if `RouteOverlay.tsx` is created

Expected files modified:

- `nextjs-app/components/composed/venue/VenueQuickInfo.tsx`
- `nextjs-app/components/composed/venue/VenueDetailContent.tsx`
- `nextjs-app/components/custom/venue/VenueDetailOverlay.tsx`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/messages/sv/venue.json`
- `nextjs-app/messages/en/venue.json`
- `nextjs-app/test/components/VenueQuickInfo.test.tsx`
- `nextjs-app/test/components/VenueDetailContent.test.tsx`
- `nextjs-app/test/components/VenueDetailOverlay.test.tsx`
- `nextjs-app/test/components/MapView.test.tsx`

Possible files modified:

- `nextjs-app/test/e2e/map-primary.spec.ts`
- `nextjs-app/docs/design/references/REBASELINE-LOG.md` only if a reference PNG or capture recipe changes.

Files intentionally not created:

- No `tailwind.config.ts`; Tailwind v4 uses CSS-first `@theme` in `nextjs-app/app/globals.css`.
- No new `/api/routes`, `/api/directions`, or paid maps service route.
- No new Supabase migration or geodata script.
- No premium/payment/future-monetization provider, route, hook, or component.

Avoid unless explicitly approved:

- New `/api/routes`, `/api/directions`, or paid maps API integrations
- `nextjs-app/lib/solar/*`
- `nextjs-app/lib/weather/*`
- `nextjs-app/lib/supabase/*`
- `scripts/geodata/*`
- Supabase migrations or live database operations
- Story 3.2 feedback, Story 3.3 reviews, or Story 3.4 full visit-loop hardening
- Admin, premium, payment, Swish, Season Pass, paywall, or lock-badge runtime paths

### Project Structure Notes

- The architecture and UX spec mention `RouteButton` and `RouteOverlay`, but the current app has only inline route buttons and local URL helpers. This story should consolidate those behaviours just enough to meet the ACs.
- If a presentational RouteButton is extracted, it belongs in `components/composed/` because it is shared display logic. Route state, native-map opening, overlay visibility, and selected-venue coordination belong in `components/custom/`.
- No conflict found with the API boundary or query-key architecture; routing uses already-loaded public venue DTOs and geolocation state.

### References

- `AGENTS.md` - repo rules for commands, API boundary, design tokens, visual validation, Swedish copy, accessibility, and sprint workflow.
- `project-context.md` - current project state, Screen ID -> Route Map, design-source discipline, and Epic 3 prelude completion context.
- `_bmad-output/planning-artifacts/epics.md` - Story 3.1 source of truth for story statement, acceptance criteria, design gate criteria, and Epic 3 sequencing.
- `_bmad-output/planning-artifacts/prd.md` - FR15/FR16 route/native-map requirements and NFR8 performance budget.
- `_bmad-output/planning-artifacts/architecture.md` - API boundary, three-layer component architecture, route component mapping, app structure, performance constraints.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - VenueQuickInfo, VenueDetail, RouteButton, route overlay, navigation patterns, motion timings, and accessibility behaviour.
- `nextjs-app/docs/design/DESIGN.md` - binding `gradient-route-button`, `shadow-route-button`, `radius-pill`, `duration-default`, typography, spacing, and touch-target tokens.
- `nextjs-app/docs/design/references/claude-design/README.md` - visual source-of-truth reading discipline.
- `_bmad-output/implementation-artifacts/3-0-remove-admin-surface.md` - admin runtime removal and manual operations boundary.
- `_bmad-output/implementation-artifacts/3-0-5-confidence-engine-data-coverage.md` - confidence semantics handoff.
- `_bmad-output/implementation-artifacts/3-0-7-baskarta-xyz-inventory-data-contract-realignment.md` - corrected Baskarta/source-geometry handoff.
- `_bmad-output/implementation-artifacts/3-0-6-ux-content-uncertainty-copy.md` - uncertainty copy and safe public metadata handoff.
- Google Maps URLs: https://developers.google.com/maps/documentation/urls/get-started
- Apple Map Links: https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html
- RFC 5870 `geo:` URI scheme: https://www.rfc-editor.org/info/rfc5870
- MDN `rel="noopener"`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/noopener

### Draft Verification

- Draft baseline passed before writing this story:
  - `cd nextjs-app && npx.cmd tsc --noEmit`
  - `cd nextjs-app && npx.cmd eslint . --quiet`
- Sprint status already has `3-1-routing-navigation-to-venue: ready-for-dev`; no tracker status edit was required for this repair.
- No active deferred-work queue item targets Story 3.1.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex (Amelia, BMAD Dev Agent)

### Debug Log References

- 2026-06-07: Baseline before edits passed: `cd nextjs-app && npx.cmd tsc --noEmit`.
- 2026-06-07: Baseline before edits passed: `cd nextjs-app && npx.cmd eslint . --quiet`.
- 2026-06-07: Source-context read completed for AGENTS.md, project-context.md, Story 3.1, planning artifacts, DESIGN.md, Claude Design README, QuickInfo/VenueDetail prototype sources, and deferred-work.md.
- 2026-06-07: Focused routing helper tests passed: `cd nextjs-app && npx.cmd vitest run test/unit/routing.test.ts`.
- 2026-06-07: Focused component route tests passed: `cd nextjs-app && npx.cmd vitest run test/components/VenueQuickInfo.test.tsx test/components/VenueDetailContent.test.tsx test/components/VenueDetailOverlay.test.tsx test/components/RouteOverlay.test.tsx test/components/MapView.test.tsx`.
- 2026-06-07: Final typecheck passed: `cd nextjs-app && npx.cmd tsc --noEmit`.
- 2026-06-07: Final lint passed: `cd nextjs-app && npx.cmd eslint . --quiet`.
- 2026-06-07: Final full unit/component tests passed: `cd nextjs-app && npx.cmd vitest run` (49 files, 413 tests).
- 2026-06-07: Final full E2E tests passed: `cd nextjs-app && npx.cmd playwright test` (43 passed, 30 skipped).
- 2026-06-07: Visual validation passed for `map-with-selected-venue` mobile, `venue-detail` mobile, and `venue-detail` desktop via `.\scripts\run-sh.ps1 scripts/visual-validate.sh ...`.
- 2026-06-07: API-boundary scan ran; matches were limited to existing server/lib references, not client component imports.
- 2026-06-07: MVP monetization quarantine scan returned no matches.
- 2026-06-07: Story review gate passed: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-1-routing-navigation-to-venue`; validation artifact `_bmad-output/implementation-artifacts/validation/3-1-routing-navigation-to-venue-review-20260607-191920.log`.
- 2026-06-07: Round 1 BMAD code-review findings batch-applied; focused routing/component regression tests passed: `cd nextjs-app && npx.cmd vitest run test/unit/routing.test.ts test/components/RouteOverlay.test.tsx test/components/MapView.test.tsx test/components/VenueQuickInfo.test.tsx test/components/VenueDetailOverlay.test.tsx test/components/VenueDetailContent.test.tsx` (6 files, 101 tests).
- 2026-06-07: Round 1 fix verification passed: `cd nextjs-app && npx.cmd tsc --noEmit`, `cd nextjs-app && npx.cmd eslint . --quiet`, `cd nextjs-app && npx.cmd vitest run` (49 files, 416 tests), and `cd nextjs-app && npx.cmd playwright test` (43 passed, 30 skipped).
- 2026-06-07: Round 1 fix visual validation passed and was logged for `map-with-selected-venue` mobile, `venue-detail` mobile, and `venue-detail` desktop in `_bmad-output/implementation-artifacts/validation/3-1-routing-navigation-to-venue-visual-*-review-fix-20260607.log`.
- 2026-06-07: Round 1 fix API-boundary and MVP monetization quarantine scans reran; no new story-scope violations found.
- 2026-06-07: Round 1 fix story review gate rerun passed: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-1-routing-navigation-to-venue`; validation artifact `_bmad-output/implementation-artifacts/validation/3-1-routing-navigation-to-venue-review-20260607-201035.log`.
- 2026-06-07: Rasmus approved Story 3.1 for `done` after Round 1 fixes and the clean review-gate rerun.

### Completion Notes List

- Task 1 complete: clean baseline gates, required source context, visual-source context, deferred-work scope, and Epic 3 sequencing were confirmed before implementation edits.
- Story file recreated by Bob/Codex on 2026-06-07 because sprint status already referenced Story 3.1 as ready-for-dev but the implementation artifact was missing.
- Acceptance criteria are preserved verbatim from `_bmad-output/planning-artifacts/epics.md`.
- Story is frontend/routing scoped and intentionally does not reopen geodata, confidence math, feedback, reviews, admin, or premium/payment work.
- Story-file-audit: all seven checks pass.
- Added a pure routing helper for Google Maps search/directions, Apple Maps walking directions on iOS, platform detection, WGS84 distance fallback, walk/bike estimates, cardinal direction labels, and invalid-coordinate handling.
- Extracted the shared token-backed RouteButton and added RouteOverlay for walk/bike/direction summaries, dismiss behaviour, blocked-popup fallback links, and reduced-motion-aware Motion transitions.
- Wired QuickInfo and venue detail to the same route estimate/native-map/open-map helper contract without adding paid route APIs or new backend routes.
- Added Swedish and English routing copy, including compact QuickInfo estimates to preserve the selected-venue layout.
- Updated component, unit, and Playwright coverage for route estimates, loading state, shared maps links, native handoff, overlay lifecycle, external-link security, and mobile layout.

### Review Findings

**Round 1 of 3**

- [x] [Review][Patch] Route overlay dialog needs keyboard focus and Escape dismissal [nextjs-app/components/custom/routing/RouteOverlay.tsx:40] — The new `role="dialog"` surface appears with a close button but does not move focus into the dialog, restore/contain usable keyboard focus, or handle Escape. Keyboard and screen-reader users can miss the newly opened route summary, especially when `window.open` is blocked and the overlay is the active fallback.
- [x] [Review][Patch] Route CTA accessible name omits the visible estimate [nextjs-app/components/composed/routing/RouteButton.tsx:30] — `aria-label={isLoading ? loadingLabel : label}` overrides the button contents, so assistive tech hears only "Visa Rutt" / "Show Route" while sighted users also see the walk estimate such as "ca 6 min". The estimate should be included in the non-loading accessible name.
- [x] [Review][Patch] Route overlay can stay visible for a dismissed or changed venue [nextjs-app/components/custom/map/MapView.tsx:608] — `routeOverlay` is cleared only by the overlay close control. Dismissing QuickInfo/detail or selecting a different venue can leave stale route text and fallback links for a venue that is no longer the current selected/detail venue.
- [x] [Review][Patch] Blocked route fallback opens place search instead of route directions [nextjs-app/components/custom/map/MapView.tsx:607] — `window.open` uses the directions helper, but the persistent overlay fallback receives `buildGoogleMapsSearchUrl(venue)`. If the native-map handoff is blocked or unsupported, the user loses the walking-directions intent and gets a place search link instead.
- [x] [Review][Patch] Routing helper still accepts misleading invalid or degenerate coordinates [nextjs-app/lib/services/routing.ts:109] — `hasValidCoordinates` only checks finiteness, so out-of-range latitude/longitude values are treated as valid; invalid-coordinate directions ignore an available address and fall back directly to the venue name; identical origin/destination coordinates can produce a bogus `north` direction.
- [x] [Review][Patch] Venue-detail visual gates are claimed but not evidenced [ _bmad-output/implementation-artifacts/validation/3-1-routing-navigation-to-venue-review-20260607-191920.log:37] — Task 8.5 requires `map-with-selected-venue` mobile plus `venue-detail` mobile and desktop. The Story 3.1 validation artifact records only the `map-with-selected-venue` mobile gate before moving the story to review, so the changed detail CTA/open-map surfaces do not have recorded visual-gate evidence in this story.

### File List

- `_bmad-output/implementation-artifacts/3-1-routing-navigation-to-venue.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `nextjs-app/lib/services/routing.ts`
- `_bmad-output/implementation-artifacts/validation/3-1-routing-navigation-to-venue-visual-map-selected-review-fix-20260607.log`
- `_bmad-output/implementation-artifacts/validation/3-1-routing-navigation-to-venue-visual-venue-detail-mobile-review-fix-20260607.log`
- `_bmad-output/implementation-artifacts/validation/3-1-routing-navigation-to-venue-visual-venue-detail-desktop-review-fix-20260607.log`
- `_bmad-output/implementation-artifacts/validation/3-1-routing-navigation-to-venue-review-20260607-201035.log`
- `nextjs-app/components/composed/routing/RouteButton.tsx`
- `nextjs-app/components/custom/routing/RouteOverlay.tsx`
- `nextjs-app/components/composed/venue/VenueQuickInfo.tsx`
- `nextjs-app/components/composed/venue/VenueDetailContent.tsx`
- `nextjs-app/components/custom/venue/VenueDetailOverlay.tsx`
- `nextjs-app/components/custom/venue/ForcedVenueDetailInitialFrame.tsx`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/messages/sv/venue.json`
- `nextjs-app/messages/en/venue.json`
- `nextjs-app/test/unit/routing.test.ts`
- `nextjs-app/test/components/VenueQuickInfo.test.tsx`
- `nextjs-app/test/components/VenueDetailContent.test.tsx`
- `nextjs-app/test/components/VenueDetailOverlay.test.tsx`
- `nextjs-app/test/components/RouteOverlay.test.tsx`
- `nextjs-app/test/components/MapView.test.tsx`
- `nextjs-app/test/e2e/map-primary.spec.ts`

## Change Log

| Date | Author | Note |
|------|--------|------|
| 2026-06-07 | Bob | Recreated missing Story 3.1 ready-for-dev brief from current epics, sprint status, architecture/API boundary, UX spec, design tokens, current route/open-map implementation, completed Epic 3 Prelude learnings, and latest primary map-link references. |
| 2026-06-07 | Bob | Story-file-audit completed with all seven checks passing; sprint status was already ready-for-dev and left unchanged. |
| 2026-06-07 | Amelia | Started implementation; baseline typecheck/lint and Task 1 source-context guardrails completed. |
| 2026-06-07 | Amelia | Implemented routing helper, shared RouteButton, RouteOverlay, QuickInfo/detail route wiring, localized estimates, and focused unit/component/E2E coverage. |
| 2026-06-07 | Amelia | Final typecheck, lint, Vitest, Playwright, parent visual validation, API-boundary scan, and monetization quarantine scan completed. |
| 2026-06-07 | Amelia | Story review gate passed and sprint status moved to review. |
| 2026-06-07 | Codex | Round 1 BMAD code-review fixes applied, verification rerun passed, and Rasmus approved story transition to done. |
