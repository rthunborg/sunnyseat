# Story 2.3: Venue Detail View

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **MVP scope correction (2026-05-19):** Favourites are now free MVP scope in Story 2.7. Sharing is now Story 6.4 after the Epic 6 reshuffle.

## Story

As a **user**,
I want to see full venue information including a sun timeline,
So that I can make a confident decision about where to go.

## Acceptance Criteria

**Given** the user navigates to venue detail (via QuickInfo tap or "Mer Info")
**When** the venue detail renders on mobile
**Then** a full bottom sheet slides up (300ms, `easing-spring`) containing:
- Drag handle (48px, `color-drag-handle`)
- Hero image (full-width) with sun badge overlay (28x28px, "85%" + sun icon, `color-amber-gold` at 90% opacity, `blur-standard`)
- Venue name in `text-display-xl` (28px/ExtraBold/Plus Jakarta Sans, tracking -0.75px)
- Description in `text-body-lg` / `color-text-body`
- "SOLTIDER IDAG" InfoCard (`color-surface-muted`, `radius-card`) with section label in `text-heading-sm` / uppercase / tracking +1.4px
- SunTimeline gradient bar (`gradient-timeline-bar`, 12px height) with current time marker
- Opening hours row with clock icon
- Address row with pin icon + "ÖPPNA I KARTOR" link in `color-amber-dark`
- Full-width "Visa Rutt" RouteButton (`gradient-route-button`, `shadow-route-button`) — placeholder action for Epic 3
**And** the URL updates to `/?venue=[slug]` for deep-linking

**Given** the venue detail renders on desktop
**When** the panel appears
**Then** it renders as a 390px right-side panel sliding in from the right edge (300ms, `easing-spring`)
**And** includes a close button (top-right) and favourite/share button placeholders
**And** the map remains interactive behind the panel (not dimmed)
**And** the left venue list panel remains visible

**Given** the venue has a sun timeline for today
**When** the SunTimeline component renders
**Then** it displays a gradient bar showing solid amber segments for sun windows and transparent for shaded periods
**And** the gradient fill animates from left to current-time position (400ms, `easing-enter`) on first render
**And** current time is indicated with `text-time` styling (14px/ExtraBold/Plus Jakarta Sans)

**Given** the venue will lose sun soon
**When** shadow is imminent (within configurable threshold)
**Then** a warning text "Blir skuggigt om X min" appears in `color-error` (#ba1a1a) below opening hours

**Given** venue data is loading
**When** the detail sheet/panel opens
**Then** venue name appears immediately, with shimmer skeleton placeholders for hero image, timeline, and detail rows

**Given** the user drags down on the sheet handle (mobile)
**When** the sheet dismisses
**Then** it slides down (250ms, `easing-exit`) and returns to the map with the venue pin still selected

**Given** `prefers-reduced-motion` is enabled
**When** the venue detail renders
**Then** no SunTimeline gradient animation (instant fill), sheet uses opacity-only transition

**Design Gate Criteria:**
- **Visual:** Matches Figma frame `venue-detail` (https://www.figma.com/design/Oh75qPnFfSWKHSsyVSBQbT/SunnySeat)
- **Behaviour:** All interactions and states defined in UX spec §VenueDetail and §SunTimeline are implemented
- **Animation:** Sheet slide-up, timeline gradient fill, and dismiss animations match spec timings (±50 ms tolerance)
- **Visual validation:** Screenshot comparison against Figma reference passes before QA handoff

## Tasks / Subtasks

- [x] **Task 1: Baseline and source-context check** (AC: all)
  - [x] 1.1 Run `cd nextjs-app && npx tsc --noEmit` before editing. Stop and surface any errors outside story scope.
  - [x] 1.2 Run `cd nextjs-app && npx eslint . --quiet` before editing. Stop and surface any errors outside story scope.
  - [x] 1.3 Read `nextjs-app/docs/design/DESIGN.md`, `nextjs-app/docs/design/references/claude-design/README.md`, `project-context.md`, and UX spec sections `venue-detail` mobile/desktop, `SunTimeline`, `Sheet & Overlay Behaviour`, `feedback`, and `review`.
  - [x] 1.4 Read prototype sources `project/src-free/VenueDetail.jsx` and `project/src-desktop/VenueDetail.jsx` for visual intent only. Do not copy prototype DOM structure, inline CSS values, ratings/reviews data, or prototype-only favourite/share behaviour into production.

- [x] **Task 2: Add venue detail data contract and query hook** (AC: #1, #3, #4, #5)
  - [x] 2.1 Extend `lib/types/api.ts` with a detail DTO that covers fields the UI needs now: slug/id/name, description, address, opening-hours display, location, confidence, thumbnail, current sun status, sun window/timeline windows, optional shadow-warning minutes, and partner flag.
  - [x] 2.2 Add `hooks/queries/useVenueDetail.ts` that fetches `GET /api/venues/[slug]` or the agreed detail route, uses `queryKeys.venues.detail(slug)`, returns the TanStack Query result directly, and passes the request `signal`.
  - [x] 2.3 If no detail API route exists, add `app/api/venues/[slug]/route.ts` as a thin API-boundary wrapper. It may use existing fixture data for dev parity, but client components must not import fixture, Supabase, solar, weather, middleware, or building modules.
  - [x] 2.4 Ensure detail loading can render from the selected list DTO while the detail query resolves, so the venue name appears immediately and skeletons fill the rest.

- [x] **Task 3: Build reusable detail presentation components** (AC: #1, #3, #4, #5, #7)
  - [x] 3.1 Add `components/composed/venue/SunTimeline.tsx` using `gradient-timeline-bar`, `size-timeline-h`, `text-time`, and Motion. It must render solid amber sun-window segments, transparent shaded gaps, tick labels, and current-time marker.
  - [x] 3.2 Add `components/composed/venue/VenueDetailContent.tsx` for the hero image, sun badge, title, description, `SOLTIDER IDAG` InfoCard, opening-hours row, address row, and RouteButton placeholder.
  - [x] 3.3 Reuse existing thumbnail/sun badge patterns from `VenueQuickInfo` and `VenueCard` where practical. Do not duplicate competing venue-card models.
  - [x] 3.4 Use lucide icons for clock, map pin, external-link, navigation, close, heart, and share controls. Every icon button must have an accessible name and visible focus state.
  - [x] 3.5 Add Swedish/English `next-intl` keys under `venue.detail` for labels: `SOLTIDER IDAG`, `Toppar kl ...`, `ÖPPNA I KARTOR`, `Visa Rutt`, close, favourite/share placeholders, loading labels, shadow warning, and unavailable detail fallbacks.

- [x] **Task 4: Implement mobile full detail sheet** (AC: #1, #5, #6, #7)
  - [x] 4.1 Add a focused mobile detail sheet component or extend `MobileBottomSheet` only if the extension keeps Story 2.2 venue-list behaviour unchanged.
  - [x] 4.2 Mobile detail sheet opens full-screen above the map with `radius-sheet-full`, `shadow-sheet-full-up`, 48px `color-drag-handle`, and 300ms `easing-spring`.
  - [x] 4.3 Dragging down on the handle dismisses the detail sheet with 250ms `easing-exit`; it must clear the detail URL state while keeping the venue pin selected.
  - [x] 4.4 The sheet body scrolls independently without panning the map through the sheet; the handle remains keyboard operable.
  - [x] 4.5 Reduced motion: no transform slide or timeline fill animation; use opacity-only transition and instant timeline fill.

- [x] **Task 5: Implement desktop right-side detail panel** (AC: #2, #5, #7)
  - [x] 5.1 Render a 390px right-side overlay panel on `lg` and up; it must not shrink, remount, or dim the map canvas.
  - [x] 5.2 Preserve the Story 2.2 left 190px venue list panel while the right detail panel is open.
  - [x] 5.3 Add close, favourite placeholder, and share placeholder buttons in the panel chrome. Placeholders are visual/disabled or no-op only; saving favourites belongs to Story 2.7 and sharing belongs to Story 6.4.
  - [x] 5.4 Panel enters from the right in 300ms `easing-spring` and exits in 250ms `easing-exit`; reduced motion uses opacity only.

- [x] **Task 6: Wire URL, selection, and deep-link state into `MapView`** (AC: #1, #2, #5, #6)
  - [x] 6.1 Parse the `venue` search param on load and `_state=venue-detail` for visual validation; select the matching venue once list data is available.
  - [x] 6.2 Harden `VenuePinLayer` selection-effect handling for non-null initial selection: if a just-selected pin is being added in the same venue-data commit, avoid duplicate render work and keep the marker selected after mount.
  - [x] 6.3 `VenueQuickInfo` "Mer Info" opens the detail sheet/panel and updates the URL to `/?venue=[slug]` without losing selected pin state.
  - [x] 6.4 Closing/dismissing detail removes the detail URL state and returns to map + selected pin. It must not force a full page navigation or remount MapLibre.
  - [x] 6.5 Keep query keys inside query hooks. Do not construct TanStack keys inline in components.

- [x] **Task 7: Carry 2.3 deferred routing/i18n infrastructure** (Supporting infrastructure)
  - [x] 7.1 Narrow `nextjs-app/proxy.ts` matcher away from blanket `.*\\..*` exclusion toward explicit static asset extensions so venue slugs containing dots remain middleware-routed.
  - [x] 7.2 Add `nextjs-app/i18n/navigation.ts` using `createNavigation(routing)` from `next-intl/navigation`.
  - [x] 7.3 Migrate existing `next/link` imports in `MobileNavBar.tsx` and `DesktopNavBar.tsx` to the locale-aware `Link`.
  - [x] 7.4 Where app code programmatically navigates between locale-owned internal routes, prefer the generated `useRouter` from `i18n/navigation`. Keep raw `next/navigation` only for APIs not provided by next-intl wrappers, such as `useSearchParams`, `notFound`, or dev-only forced-state reads.

- [x] **Task 8: Accessibility, copy, and scope boundaries** (AC: all)
  - [x] 8.1 The detail sheet/panel has semantic labelling, visible focus states, 44x44px minimum touch targets, and no keyboard trap.
  - [x] 8.2 Dynamic loading state uses shadcn `Skeleton` with meaningful `aria-busy`/status labelling where appropriate. No full-page spinner.
  - [x] 8.3 Sun state is never color-only: pair amber/transparent timeline states with labels/markers, and provide accessible text for the timeline.
  - [x] 8.4 "ÖPPNA I KARTOR" opens an external maps URL based on venue coordinates/address; use a safe fallback if coordinates are unavailable.
  - [x] 8.5 Do not implement real route overlay, favourites persistence, share API, feedback form, or reviews in this story. Use placeholders only where ACs require them.

- [x] **Task 9: Tests and visual validation** (AC: all)
  - [x] 9.1 Add component tests for `SunTimeline`, `VenueDetailContent`, mobile detail sheet behaviour, desktop detail panel, loading skeletons, reduced-motion behaviour, and shadow-warning rendering.
  - [x] 9.2 Add query/API tests for `useVenueDetail` and `/api/venues/[slug]` if the route is added.
  - [x] 9.3 Extend `MapView` tests for QuickInfo-to-detail, direct `?venue=test-venue-sunny&_state=venue-detail`, dismiss/close preserving selected pin, desktop right panel coexisting with left list, and URL cleanup.
  - [x] 9.4 Extend Playwright coverage for mobile detail open/dismiss, desktop detail open/close, keyboard close/handle interactions, maps link, and reduced-motion behaviour.
  - [x] 9.5 Run `cd nextjs-app && npx tsc --noEmit`.
  - [x] 9.6 Run `cd nextjs-app && npx eslint . --quiet`.
  - [x] 9.7 Run `cd nextjs-app && npx vitest run`.
  - [x] 9.8 Run `cd nextjs-app && npx playwright test` because this story changes deep-link navigation, map overlays, keyboard interaction, and responsive behaviour.
  - [x] 9.9 Run `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail" mobile`. Automated provider failed on accepted reference-scope drift; Rasmus accepted with documentation/deferred-verification requirements on 2026-05-16.
  - [x] 9.10 Run `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail" desktop`. Automated provider failed on accepted reference-scope drift; Rasmus accepted with documentation/deferred-verification requirements on 2026-05-16.

### Review Findings

**Round 1 of 3**

- [x] [Review][Patch] Route CTA is an enabled no-op; resolved decision: keep it visible but disabled/aria-disabled until Story 3.1 owns routing [nextjs-app/components/custom/map/MapView.tsx:341]
- [x] [Review][Patch] Public `?venue=` deep links do not select the pin or show the detail loading/error state [nextjs-app/components/custom/map/MapView.tsx:198]
- [x] [Review][Patch] Forced venue-detail initial frame persists beside the hydrated map and can mask the real overlay [nextjs-app/app/[locale]/page.tsx:15]
- [x] [Review][Patch] SunTimeline base progress paints amber through shaded gaps instead of limiting amber fill to sun windows [nextjs-app/components/composed/venue/SunTimeline.tsx:47]
- [x] [Review][Patch] Venue detail loading state omits the required hero-image skeleton [nextjs-app/components/composed/venue/VenueDetailContent.tsx:53]
- [x] [Review][Patch] Detail overlay exit uses the 300ms spring entrance transition instead of 250ms easing-exit [nextjs-app/components/custom/venue/VenueDetailOverlay.tsx:85]
- [x] [Review][Patch] Mobile detail close handle lacks normal click/Enter/Space activation [nextjs-app/components/custom/venue/VenueDetailOverlay.tsx:140]
- [x] [Review][Patch] Mobile detail drag handler can block handle dismissal after body scroll and can leave drag offset uncleared [nextjs-app/components/custom/venue/VenueDetailOverlay.tsx:54]
- [x] [Review][Patch] Hero sun badge is left-positioned and pill-sized instead of the specified 28px top-right badge [nextjs-app/components/composed/venue/VenueDetailContent.tsx:190]
- [x] [Review][Patch] MapView programmatic navigation bypasses the locale-aware router and detail close replaces the path with `/` [nextjs-app/components/custom/map/MapView.tsx:6]
- [x] [Review][Patch] `SOL NU` title badge is hardcoded, tied to partner status, and duplicates Story 5.2 scope [nextjs-app/components/composed/venue/VenueDetailContent.tsx:58]
- [x] [Review][Patch] Detail route can throw a 500 for malformed percent-encoded slugs [nextjs-app/app/api/venues/[slug]/route.ts:75]
- [x] [Review][Patch] `shadowWarningMinutes: 0` is silently omitted from detail DTOs [nextjs-app/app/api/venues/[slug]/route.ts:125]
- [x] [Review][Patch] SunTimeline tick labels ignore the provided timeline range [nextjs-app/components/composed/venue/SunTimeline.tsx:20]
- [x] [Review][Patch] Story-specific panel widths and section tracking use arbitrary utilities without adding matching design tokens [nextjs-app/components/custom/map/MapView.tsx:311]
- [x] [Review][Patch] Proxy matcher can locale-route static assets with unlisted extensions after narrowing dotted-path exclusion [nextjs-app/proxy.ts:9]

**Round 2 of 3**

- [x] [Review][Patch] Forced venue-detail initial frame is statically imported into the production home route bundle [nextjs-app/app/[locale]/page.tsx:2]
- [x] [Review][Patch] Hero sun badge still omits the required sun icon [nextjs-app/components/composed/venue/VenueDetailContent.tsx:193]
- [x] [Review][Patch] URL detail fallback can label the dialog with a stale selected venue when the URL slug differs from selection [nextjs-app/components/custom/map/MapView.tsx:194]

## Dev Notes

### Current Implementation Surface

- `nextjs-app/components/custom/map/MapView.tsx` currently owns venue search, selected DTO lookup, `VenueQuickInfo`, `VenueList`, `MobileBottomSheet`, desktop venue-list panel, MapLibre controls, and URL push for `?_state=venue-detail`.
- `MapView.handleOpenDetails()` currently pushes `?venue=<slug>&_state=venue-detail`; Story 2.3 should make this render real detail content. For production-like navigation, the durable public URL remains `/?venue=[slug]`; `_state=venue-detail` is only the dev visual-validation forcing state.
- `nextjs-app/components/custom/sheets/MobileBottomSheet.tsx` is tuned for the Story 2.2 venue list. Extending it is allowed only if peek/full venue-list behaviour remains covered and unchanged.
- `nextjs-app/components/composed/venue/VenueQuickInfo.tsx` already contains token-backed thumbnail, sun badge, Motion/reduced-motion, and loading skeleton patterns.
- There is currently no production `VenueDetail`, `SunTimeline`, `useVenueDetail`, or `/api/venues/[slug]` implementation.
- `nextjs-app/lib/query-keys.ts` already defines `queryKeys.venues.detail(slug)`.
- `nextjs-app/proxy.ts` still uses the deferred blanket dotted-path exclusion: `.*\\..*`.
- Raw `next/link` imports currently exist in `MobileNavBar.tsx` and `DesktopNavBar.tsx`; `MapView.tsx`, `use-locale-sync.ts`, and dev hooks use `next/navigation`.

### Data and API Guardrails

- Client components must not import from `lib/solar`, `lib/weather`, `lib/supabase`, `lib/middleware`, `lib/buildings`, or `lib/services/venues-fixture.ts`.
- If a detail route is added, keep backend/data access inside `app/api/venues/[slug]/route.ts` and return typed DTOs through `lib/types/api.ts`.
- Reuse existing `VenueDataDto` fields where they satisfy the UI. Add only detail-specific fields needed by ACs. Do not invent reviews/ratings contracts for this story; those belong to Story 3.3.
- SunTimeline can derive its first implementation from `sunWindow` plus current time if richer timeline data is unavailable, but the DTO and component should be shaped so future sun-window arrays can replace the simplified source without changing presentation APIs.

### Design and Behaviour Requirements

- Binding tokens include `color-surface-cream`, `radius-sheet-full`, `shadow-sheet-full-up`, `color-drag-handle`, `color-amber-gold`, `color-amber-dark`, `color-error`, `blur-standard`, `text-display-xl`, `text-body-lg`, `text-heading-sm`, `text-time`, `gradient-timeline-bar`, `size-timeline-h`, `gradient-route-button`, and `shadow-route-button`.
- Mobile detail is a full bottom sheet. Desktop detail is a 390px right overlay panel. The map remains persistent and mounted in both cases.
- Desktop detail must coexist with the Story 2.2 190px left venue-list panel.
- UX spec allows feedback/review content lower in detail, but Story 2.3 does not implement feedback/review flows. Keep placeholders or omit future sections unless needed for matching the reference above the fold; Stories 3.2 and 3.3 own real flows.
- Swedish copy is default. Use scoped `useTranslations('venue.detail')` keys.
- Use shadcn `Skeleton` for loading. No full-page spinner.

### Architecture Guardrails

- Three-layer dependency direction holds: `components/custom/` orchestrates map/detail shell, `components/composed/` owns reusable venue detail/timeline presentation, `components/ui/` remains shadcn primitives only.
- All server state remains in TanStack Query. Selected venue id remains in `MapSelectionContext`; do not add a second selection store.
- MapLibre stays behind the existing dynamic map boundary. Do not add static MapLibre imports outside map-specific custom components already in the dynamic chunk.
- Preserve Story 2.2 `VenueList` and `MobileBottomSheet` tests while adding detail behaviour.
- Keep CSS values token-backed through Tailwind v4 `@theme`; no raw hex, ad-hoc px spacing, or inline styles in production UI.

### Previous Story Intelligence

- Story 2.2 completed `VenueList`, `VenueCard`, mobile peek/full sheet, desktop 190px venue-list overlay, card selection recentering, and selected QuickInfo handoff.
- Story 2.2 code review settled reduced-motion and drag behaviour: reduced motion should remove transform/layout motion but not disable state changes; full-sheet downward drag collapses to peek until a reopen affordance exists.
- Story 2.2 final checks passed: typecheck, eslint, Vitest 149 tests / 20 files, Playwright 34 passed / 21 skipped. Playwright still logs the pre-existing onboarding hydration warning.
- Story 2.2 accepted visual drift for future search/time/favourites/reviews/map-style scope. Do not let this story absorb those future items except the venue-detail visual gate explicitly targeted here.
- Story 2.1 manually accepted `venue-detail` visual checks because it only owned QuickInfo-to-detail handoff. Story 2.3 must make both mobile and desktop `venue-detail` visual gates real passes.

### Latest Technical Notes

- Current package versions in `nextjs-app/package.json`: Next.js 16.2.2, React 19.2.5, next-intl 4.9.1, TanStack Query 5.99.0, Motion 12.38.0, `@use-gesture/react` 10.3.1, MapLibre GL 5.23.0, Tailwind CSS 4.2.2.
- Current next-intl docs for App Router recommend a central `i18n/navigation.ts` using `createNavigation(routing)` and exporting locale-aware `Link`, `redirect`, `usePathname`, `useRouter`, and `getPathname`. Use this to replace internal `next/link` usage and route pushes that need locale awareness.
- Motion timing constants already exist in `lib/constants/animation.ts`: `DURATION_SLOW_S` = 300ms, `DURATION_FAST_S` = 150ms, `EASE_SPRING`, `EASE_ENTER`, `EASE_EXIT`. Add a 250ms exit or 400ms timeline constant only if needed, keeping CSS tokens and docs synchronized.

### File Impact

Likely files to modify:

- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/map/VenuePinLayer.tsx`
- `nextjs-app/components/custom/sheets/MobileBottomSheet.tsx` only if safely reused/extended
- `nextjs-app/components/custom/venue/VenueDetailOverlay.tsx` or equivalent new orchestrator
- `nextjs-app/components/composed/venue/VenueDetailContent.tsx` (new)
- `nextjs-app/components/composed/venue/SunTimeline.tsx` (new)
- `nextjs-app/hooks/queries/useVenueDetail.ts` (new)
- `nextjs-app/lib/types/api.ts`
- `nextjs-app/lib/query-keys.ts` if detail key signature needs expansion
- `nextjs-app/app/api/venues/[slug]/route.ts` if detail route is added
- `nextjs-app/i18n/navigation.ts` (new)
- `nextjs-app/proxy.ts`
- `nextjs-app/components/custom/layout/MobileNavBar.tsx`
- `nextjs-app/components/custom/layout/DesktopNavBar.tsx`
- `nextjs-app/messages/sv/venue.json`
- `nextjs-app/messages/en/venue.json`
- `nextjs-app/test/components/MapView.test.tsx`
- `nextjs-app/test/components/VenueDetailContent.test.tsx` (new)
- `nextjs-app/test/components/SunTimeline.test.tsx` (new)
- `nextjs-app/test/unit/queries/useVenueDetail.test.ts` (new, if query hook is added)
- `nextjs-app/test/unit/api/venue-detail-route.test.ts` (new, if API route is added)
- `nextjs-app/test/e2e/map-primary.spec.ts`

Avoid unless explicitly required:

- `nextjs-app/lib/solar/**`
- `nextjs-app/lib/weather/**`
- `nextjs-app/lib/supabase/**`
- `nextjs-app/lib/buildings/**`
- Reference PNGs or `REBASELINE-LOG.md` unless visual validation proves a legitimate rebaseline is needed and Rasmus approves.

### References

- `AGENTS.md` - design tokens, visual source of truth, API boundary, component architecture, Swedish copy, accessibility, story workflow.
- `project-context.md` - Screen ID route map; `venue-detail` uses `/?venue=test-venue-sunny&_state=venue-detail` on mobile and desktop.
- `_bmad-output/planning-artifacts/epics.md` - Epic 2 and Story 2.3 source ACs/design gate/deferred items.
- `_bmad-output/planning-artifacts/architecture.md` - map lifecycle, venue-detail data flow, API boundary, TanStack Query, component layers, performance budget.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - `venue-detail` mobile/desktop, SunTimeline behaviour, sheet/panel animations, loading/error states.
- `nextjs-app/docs/design/DESIGN.md` - binding tokens and component patterns.
- `nextjs-app/docs/design/references/claude-design/README.md` - prototype reading discipline.
- `nextjs-app/docs/design/references/claude-design/project/src-free/VenueDetail.jsx` - mobile visual reference source only.
- `nextjs-app/docs/design/references/claude-design/project/src-desktop/VenueDetail.jsx` - desktop visual reference source only.
- `_bmad-output/implementation-artifacts/2-2-venue-list-bottom-sheet.md` - previous story implementation, review findings, validation status, and downstream visual obligations.
- Context7 `/amannn/next-intl` - current `createNavigation(routing)` API for locale-aware navigation wrappers.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

- 2026-05-16: Task 1 baseline passed: `npx tsc --noEmit`; `npx eslint . --quiet`.
- 2026-05-16: Read design/token source, Claude Design README/chats, UX spec VenueDetail/SunTimeline/sheet/feedback/review sections, and mobile/desktop VenueDetail prototype sources for visual intent.
- 2026-05-16: Task 2 RED: `npx vitest run test/unit/api/venue-detail-route.test.ts test/unit/queries/useVenueDetail.test.ts` failed on missing route/hook.
- 2026-05-16: Task 2 GREEN: focused tests passed (6), `npx tsc --noEmit` passed, full `npx vitest run` passed (155), `npx eslint . --quiet` passed.
- 2026-05-16: Task 3 RED: component tests failed on missing `SunTimeline` and `VenueDetailContent`.
- 2026-05-16: Task 3 GREEN: focused component tests passed (4), `npx tsc --noEmit` passed, `npx eslint . --quiet` passed, full `npx vitest run` passed (159).
- 2026-05-16: Task 4 RED: mobile overlay tests failed on missing `VenueDetailOverlay`.
- 2026-05-16: Task 4 GREEN: focused overlay/MapView tests passed (22), `npx tsc --noEmit` passed, `npx eslint . --quiet` passed, full `npx vitest run` passed (164).
- 2026-05-16: Task 5 RED: desktop overlay tests failed because only mobile mode existed.
- 2026-05-16: Task 5 GREEN: focused overlay/MapView tests passed (24), `npx tsc --noEmit` passed, `npx eslint . --quiet` passed, full `npx vitest run` passed (166).
- 2026-05-16: Task 6 GREEN: MapView URL/deep-link tests passed (20), `npx tsc --noEmit` passed, `npx eslint . --quiet` passed, full `npx vitest run` passed (168). Existing VenuePinLayer initial-selection regression covers 6.2.
- 2026-05-16: Task 7 RED: tests failed on missing `i18n/navigation` and old proxy matcher/import friction.
- 2026-05-16: Task 7 GREEN: focused proxy/navigation/nav tests passed (13), `npx tsc --noEmit` passed, `npx eslint . --quiet` passed, full `npx vitest run` passed (170).
- 2026-05-16: Task 8 GREEN: focused detail content/overlay tests passed (9), `npx tsc --noEmit` passed, `npx eslint . --quiet` passed, full `npx vitest run` passed (171).
- 2026-05-16: Task 9 deterministic gates passed: `npx tsc --noEmit`, `npx eslint . --quiet`, full `npx vitest run` passed (172), full `npx playwright test` passed (34 passed / 21 skipped).
- 2026-05-16: Visual-validation first-paint defect fixed with a dev-only seeded `venue-detail` initial frame so the no-wait capture renders the Story 2.3 detail UI immediately.
- 2026-05-16: Task 9 HALT: official mobile and desktop visual gates still fail after implementation-owned first-paint and detail-hero fixes. Remaining failures are reference-scope drift outside Story 2.3, including ratings/review count, amenity tags, stat-card grid, mobile hero action buttons, list filters/tabs, time slider, and map pin/percentage overlays. Awaiting Rasmus accept-with-rationale before review transition.
- 2026-05-16: Rasmus accepted the remaining visual-gate failures as reference scope drift, conditional on thorough documentation and deferred verification in the owning later stories.
- 2026-05-16: Added Story 2.3 deferred-work queue entries and mirrored target-story verification notes into `epics.md`: 2.4 list tabs/sorts, 2.5 time/date slider, 2.6 percentage pins/confidence, 3.2 amenity/tag attributes, 3.3 ratings/reviews, 5.2 `SOL NU`, 6.1 favourites, 6.5 share/action chrome.
- 2026-05-16: Canonical review gate passed with manual visual acceptance: `.\scripts\run-sh.ps1 scripts/story-review.sh 2-3-venue-detail-view` using `VISUAL_VALIDATE_PROVIDER=none` and `ALLOW_MANUAL_VISUAL_VALIDATION=1`; validation artifact `2-3-venue-detail-view-review-20260516-181432.log`.
- 2026-05-17: Code review Round 1 completed with parallel Blind Hunter / Edge Case Hunter / Acceptance Auditor layers. Rasmus chose route CTA decision option 2: keep visible but disabled/aria-disabled until Story 3.1 owns routing.
- 2026-05-17: Round 1 batch patches applied and focused verification passed: `npx tsc --noEmit`, focused Vitest affected files (41 pass), `npx eslint . --quiet`, full `npx vitest run` (178 pass).
- 2026-05-17: Round 1 final verification passed after token-utility fixes: `npx tsc --noEmit`, `npx eslint . --quiet`, full `npx vitest run` (178 pass), full `npx playwright test` (34 passed / 21 skipped). Visual wrapper not rerun; existing 2026-05-16 manual visual acceptance remains in force for known reference-scope drift.
- 2026-05-18: Code review Round 2 completed on narrowed Story 2.3 File List scope. Three patches applied: forced venue-detail initial frame removed from static home-page import path and kept behind a dev-only dynamic loading fallback, detail hero sun badge now includes the required sun icon, and URL-owned detail data now wins over stale selected-venue fallback for detail overlay labelling/content. Verification passed: `npx tsc --noEmit`, `npx eslint . --quiet`, focused `npx vitest run test/components/VenueDetailContent.test.tsx test/components/MapView.test.tsx` (26 pass), full `npx vitest run` (179 pass). Rasmus approved transition to `done`.

### Completion Notes List

- Story drafted by SM (Bob) on 2026-05-16.
- Ultimate context engine analysis completed - comprehensive developer guide created.
- Task 1 complete: baseline checks are clean and source context is loaded before implementation.
- Task 2 complete: added venue detail DTOs, fixture-backed `/api/venues/[slug]`, and `useVenueDetail` with query-key and abort-signal coverage. Loading fallback will be consumed by the overlay in Task 4/5/6 from the selected list DTO.
- Task 3 complete: added token-backed SunTimeline and VenueDetailContent composed components with loading skeletons, accessible timeline labels, maps link, shadow warning, and locale keys.
- Task 4 complete: added mobile full-screen venue detail sheet with independent scroll, keyboard/drag-handle dismissal, reduced-motion path, and MapView URL cleanup that preserves selected venue state.
- Task 5 complete: added desktop 390px right-side venue detail panel with close/favourite/share chrome, no map dimming, and preserved left venue-list panel.
- Task 6 complete: wired public `?venue=slug` detail URLs, `_state=venue-detail` visual-validation deep links, selected-pin preservation on dismiss, and kept TanStack detail keys inside `useVenueDetail`.
- Task 7 complete: added locale-aware navigation wrappers, migrated nav links, switched locale sync to generated navigation helpers, and narrowed proxy static-asset exclusions so dotted venue slugs remain middleware-routed.
- Task 8 complete: verified semantic detail dialog/panel labeling, skeleton loading states, accessible timeline labels, maps fallback behavior, disabled placeholder controls, and no future feedback/review flows.
- Task 9 complete: deterministic checks and E2E pass. Visual validation ran for mobile and desktop; remaining provider failures are accepted Story 2.3 reference-scope drift with deferred verification documented in `_bmad-output/implementation-artifacts/deferred-work.md` and the target backlog stories.
- Code review Round 1 patches complete: public `?venue=` deep links now select matching pins, route CTA is disabled as a placeholder, detail exit timing uses the 250ms exit token, mobile close/drag behavior is keyboard/click safe, SunTimeline preserves shaded gaps, loading includes a hero skeleton, forced visual frame no longer masks hydrated UI, locale-aware routing is used for programmatic map navigation, malformed slugs return 400, zero-minute shadow warnings are preserved, and new panel-width/tracking tokens replace arbitrary utilities.
- Code review Round 2 patches complete: forced detail first-paint code no longer sits on the static home-page import path, the hero badge renders percent plus sun icon, and detail overlay fallback data follows the URL slug before any selected-pin fallback.

### Visual Gate Acceptance Rationale

Rasmus accepted the Story 2.3 mobile/desktop `venue-detail` visual-gate failures on 2026-05-16 because the implementation-owned detail UI is present and the remaining differences are features assigned to later stories, not Story 2.3 regressions:

- Story 2.4 owns venue-list tabs/sorts/search/filter chrome that the desktop detail reference shows around the left panel.
- Story 2.5 owns the global time/date slider chrome and selected-time coordination across map/list/QuickInfo/detail.
- Story 2.6 owns percentage-labelled map pins and final confidence/sun-percentage formatting across surfaces.
- Story 3.2 or the first venue-attribute story owns detail amenity/tag chips if they remain in scope.
- Story 3.3 owns ratings/review counts and aggregate rating metadata.
- Story 5.2 owns `SOL NU` partner title badges.
- Story 2.7 owns real favourite/heart actions and persisted favourite state as free MVP scope.
- Story 6.5 owns real share/action chrome and screenshot-friendly share composition.

Deferred verification was added to `_bmad-output/implementation-artifacts/deferred-work.md` and mirrored into each target story in `_bmad-output/planning-artifacts/epics.md` so future review can verify these visual gaps close when their owning stories land, or require an explicit rebaseline with rationale if the product scope changes.

### File List

- `_bmad-output/implementation-artifacts/2-3-venue-detail-view.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `nextjs-app/app/[locale]/page.tsx`
- `nextjs-app/app/globals.css`
- `nextjs-app/app/api/venues/[slug]/route.ts`
- `nextjs-app/components/composed/venue/SunTimeline.tsx`
- `nextjs-app/components/composed/venue/VenueDetailContent.tsx`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/map/MapViewDynamic.tsx`
- `nextjs-app/components/custom/layout/DesktopNavBar.tsx`
- `nextjs-app/components/custom/layout/MobileNavBar.tsx`
- `nextjs-app/components/custom/venue/ForcedVenueDetailInitialFrame.tsx`
- `nextjs-app/components/custom/venue/VenueDetailOverlay.tsx`
- `nextjs-app/components/custom/venue/forced-venue-detail.ts`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/planning-artifacts/epics.md`
- `nextjs-app/hooks/queries/useVenueDetail.ts`
- `nextjs-app/hooks/use-locale-sync.ts`
- `nextjs-app/i18n/navigation.ts`
- `nextjs-app/lib/types/api.ts`
- `nextjs-app/messages/en/venue.json`
- `nextjs-app/messages/sv/venue.json`
- `nextjs-app/proxy.ts`
- `nextjs-app/test/components/DesktopNavBar.test.tsx`
- `nextjs-app/test/components/SunTimeline.test.tsx`
- `nextjs-app/test/components/MapView.test.tsx`
- `nextjs-app/test/components/MobileNavBar.test.tsx`
- `nextjs-app/test/components/VenueDetailContent.test.tsx`
- `nextjs-app/test/components/VenueDetailOverlay.test.tsx`
- `nextjs-app/test/e2e/map-primary.spec.ts`
- `nextjs-app/test/unit/i18n-navigation.test.ts`
- `nextjs-app/test/unit/api/venue-detail-route.test.ts`
- `nextjs-app/test/unit/proxy-matcher.test.ts`
- `nextjs-app/test/unit/queries/useVenueDetail.test.ts`

## Change Log

| Date       | Author   | Note |
|------------|----------|------|
| 2026-05-16 | SM (Bob) | Story drafted from epics.md Story 2.3, architecture, UX spec, design system, Claude Design VenueDetail sources, Story 2.2 learnings, next-intl navigation docs, and deferred-work entries targeted at 2.3. Status -> ready-for-dev. |
