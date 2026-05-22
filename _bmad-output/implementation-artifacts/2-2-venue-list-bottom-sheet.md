# Story 2.2: Venue List & Bottom Sheet

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **MVP scope correction (2026-05-19):** Favourites are now free MVP scope in Story 2.7. Any old favourites lock-badge drift is intentionally removed/rebaselined rather than implemented as gating.

## Story

As a **user**,
I want to browse a list of nearby venues ranked by sun exposure,
So that I can compare options linearly when I prefer a list over scanning map pins.

## Acceptance Criteria

**Given** the user is on the map screen (mobile)
**When** the venue list bottom sheet is in peek state
**Then** the sheet shows ~100px above the bottom nav bar with `radius-panel` (32px) top corners, `shadow-sheet-peek-up`, `color-surface-cream` background
**And** a drag handle pill (40px wide, `color-drag-handle-map` at 40% opacity) is visible at the top
**And** the map remains visible and interactive behind the sheet

**Given** the bottom sheet is in peek state
**When** the user drags the handle upward
**Then** the sheet expands to full state (300ms, `easing-spring`) with `radius-sheet-full` (40px), `shadow-sheet-full-up`
**And** the drag handle changes to 48px wide, `color-drag-handle`
**And** a "Hitta solen nu" header appears with venue cards below
**And** the map is dimmed but visible behind the full sheet

**Given** the sheet is in full state
**When** the user drags down
**Then** the sheet transitions back to peek (300ms, `easing-spring`) or dismisses off-screen depending on velocity/position

**Given** venue data is loaded
**When** the venue list renders
**Then** venues are sorted sunny-first, then closest-first within sunny
**And** each VenueCard shows: thumbnail (87x72px, `radius-venue-image`), sun badge overlay (28x28px circle, `color-amber-primary`), venue name (`text-heading-md`), sun time range + confidence in `color-amber-dark`, and distance
**And** cards stagger fade-in on sheet expand (50ms delay between cards, 150ms fade each)

**Given** the user taps a venue card in the list
**When** the card is selected
**Then** the sheet dismisses to peek, the map centres on that venue, its pin enters selected state, and the VenueQuickInfo card appears

**Given** the user is on desktop (viewport >= 1024px)
**When** the venue list renders
**Then** it appears as a 190px side panel overlaying the left edge of the map with "TOPPVAL NÄRA DIG" header
**And** the panel contains compact scrollable venue cards
**And** the map canvas is not reduced — the panel overlays it

**Given** there are no venues in the visible area
**When** the venue list renders
**Then** it shows "Inga platser hittades i det här området." with no illustration

**Given** `prefers-reduced-motion` is enabled
**When** cards appear or the sheet transitions
**Then** no stagger animation (instant card appear), sheet uses opacity transition only

**Design Gate Criteria:**
- **Visual:** Matches Figma frame `map-panel-venues` (https://www.figma.com/design/Oh75qPnFfSWKHSsyVSBQbT/SunnySeat)
- **Behaviour:** All interactions and states defined in UX spec §VenueList and §BottomSheet are implemented
- **Animation:** Sheet drag, snap, and card stagger animations match spec timings (±50 ms tolerance)
- **Visual validation:** Screenshot comparison against Figma reference passes before QA handoff

## Tasks / Subtasks

- [x] **Task 1: Baseline and source-context check** (AC: all)
  - [x] 1.1 Run `cd nextjs-app && npx tsc --noEmit` before editing. Stop and surface any errors outside story scope.
  - [x] 1.2 Run `cd nextjs-app && npx eslint . --quiet` before editing. Stop and surface any errors outside story scope.
  - [x] 1.3 Read `nextjs-app/docs/design/DESIGN.md`, `nextjs-app/docs/design/references/claude-design/README.md`, `project-context.md` Screen ID map, and UX spec sections `BottomSheet`, `map-panel-venues`, `map-primary` mobile/desktop, and `map-with-selected-venue`.
  - [x] 1.4 Read prototype sources `project/src-free/BottomSheet.jsx` and `project/src-desktop/Sidebar.jsx` for visual intent only. Do not copy DOM structure, inline CSS values, or prototype-only tabs/favourite behaviours into production.

- [x] **Task 2: Add reusable venue list presentation components** (AC: #4, #6, #7, #8)
  - [x] 2.1 Add `components/composed/venue/VenueCard.tsx` for the 87x72 thumbnail, 28x28 sun badge, name, sun range, confidence, and distance display.
  - [x] 2.2 Add `components/custom/venue/VenueList.tsx` to map `VenueDataDto[]` into cards, own list empty/loading states, and call selection callbacks. Keep API calls out of this component.
  - [x] 2.3 Use existing DTO fields from `/api/venues` and `mapVenueDtoToPinData` patterns; do not add a parallel venue model. If list-only formatting helpers are needed, put them under `lib/utils/` and test them.
  - [x] 2.4 Add Swedish/English `next-intl` venue-list keys for `Hitta solen nu`, `TOPPVAL NÄRA DIG`, count/subtitle text, empty state, loading labels, and card ARIA labels.

- [x] **Task 3: Implement mobile bottom sheet states and drag physics** (AC: #1, #2, #3, #8)
  - [x] 3.1 Add `components/custom/sheets/MobileBottomSheet.tsx` or an equivalently focused sheet component using Motion 12 (`motion/react`) and `@use-gesture/react`.
  - [x] 3.2 Use token-backed snap states: peek approximately 100px above `--size-mobile-nav-h`, full state with `radius-sheet-full`, and dismissed off-screen. Preserve map interaction in peek state.
  - [x] 3.3 Handle upward/downward drag by `movement`, `offset`, `velocity`, `direction`, and `last` from `useDrag`; decide snap target by release position and velocity.
  - [x] 3.4 Use `touch-action` and gesture options deliberately so sheet dragging does not block list scrolling inside the full sheet. Do not let a scroll gesture accidentally pan the map through the sheet.
  - [x] 3.5 Full-state backdrop/dim must be token-based and must not use raw ad-hoc colors. The map remains visible behind the sheet.
  - [x] 3.6 Reduced motion: no transform drag/settle animation; use opacity transition only and render cards instantly.

- [x] **Task 4: Wire the list into `MapView` without breaking map lifecycle** (AC: #1, #4, #5, #6, #7)
  - [x] 4.1 Orchestrate list data in `components/custom/map/MapView.tsx` from the existing `useVenueSearch()` result. Query keys stay inside `useVenueSearch`; no inline keys.
  - [x] 4.2 Mobile default route renders the venue-list sheet in peek state. Forced route `/?_state=map-panel-venues` renders it in full state for visual validation.
  - [x] 4.3 Desktop renders a 190px overlay side panel above the map. The map canvas width must remain full; do not convert it to a reduced-width layout.
  - [x] 4.4 Selecting a card calls existing map-selection state, dismisses mobile sheet to peek, recentres the map with `map.easeTo()`/`flyTo()` using token duration constants, and lets existing `VenueQuickInfo` render.
  - [x] 4.5 Keep `MapContainer` mounted across sheet state changes. Add or extend a regression test if implementation work risks remounting the map.

- [x] **Task 5: Fix the carried responsive-hook defect while this story touches viewport logic** (Supporting infrastructure)
  - [x] 5.1 Preserve `useMediaQuery`'s hydration-safe `useState(false)` initializer and sync to `window.matchMedia(query).matches` after mount. Round 2 review superseded the original lazy-initializer task because deterministic SSR/first-client output is required.
  - [x] 5.2 Preserve deterministic SSR output expectations in tests and add coverage for post-mount matching when `window.matchMedia(query).matches` is already true.

- [x] **Task 6: Accessibility, interaction, and i18n hardening** (AC: all)
  - [x] 6.1 Sheet handle is keyboard operable, has an accessible name, visible focus ring, and at least a 44x44px effective target.
  - [x] 6.2 Venue cards are buttons or links with semantic activation, accessible names containing venue name and sun/distance summary, and visible focus state.
  - [x] 6.3 Do not rely on color alone for sun state. Pair amber/grey status with text and the sun badge/icon.
  - [x] 6.4 Full-state sheet must trap neither focus nor pointer interaction incorrectly: users can scroll the list, drag the handle, and return to the map.
  - [x] 6.5 All user-facing copy is Swedish by default through scoped `useTranslations('venue')` keys.

- [x] **Task 7: Tests and visual validation** (AC: all)
  - [x] 7.1 Add component/unit tests for `VenueCard`, `VenueList`, `MobileBottomSheet`, and `useMediaQuery`.
  - [x] 7.2 Extend `MapView` tests for peek/full forced state, desktop side panel, empty state, card selection, map recenter call, and QuickInfo handoff.
  - [x] 7.3 Extend Playwright coverage for mobile sheet expand/collapse/selection, desktop side panel selection, reduced-motion behaviour, and no overlap with fixed nav/map controls.
  - [x] 7.4 Run `cd nextjs-app && npx tsc --noEmit`.
  - [x] 7.5 Run `cd nextjs-app && npx eslint . --quiet`.
  - [x] 7.6 Run `cd nextjs-app && npx vitest run`.
  - [x] 7.7 Run `cd nextjs-app && npx playwright test` because this story changes map interaction, drag behaviour, and accessibility-critical UI.
  - [x] 7.8 Run `scripts/visual-validate.sh map-panel-venues "/?_state=map-panel-venues" mobile`.
  - [x] 7.9 Final regression for Story 2.1 accepted scope drift: run `scripts/visual-validate.sh map-with-selected-venue "/?venue=test-venue-sunny&_state=map-with-selected-venue" mobile`. It must no longer fail for the missing venue-list peek sheet; the peek sheet must coexist under selected QuickInfo while the map remains visible.

### Review Findings

- [x] [Review][Patch] AC4 sunny-first ordering can rank `Partial` venues ahead of true `Sunny` venues [nextjs-app/components/custom/venue/VenueList.tsx:87]
- [x] [Review][Patch] AC8 reduced-motion mode disables drag state changes instead of only removing transform animation [nextjs-app/components/custom/sheets/MobileBottomSheet.tsx:42]
- [x] [Review][Patch] AC2 sheet state changes are layout jumps, not the required 300ms `easing-spring` settle animation [nextjs-app/components/custom/sheets/MobileBottomSheet.tsx:92]
- [x] [Review][Patch] AC3 dismissed state unmounts immediately, so the off-screen dismiss animation is unreachable [nextjs-app/components/custom/sheets/MobileBottomSheet.tsx:55]
- [x] [Review][Patch] UX spec body swipe-down dismissal is missing because drag is bound only to the handle [nextjs-app/components/custom/sheets/MobileBottomSheet.tsx:108]
- [x] [Review][Patch] Keyboard `ArrowDown` from peek can permanently remove the venue list without a reopen affordance [nextjs-app/components/custom/sheets/MobileBottomSheet.tsx:115]
- [x] [Review][Patch] Selecting malformed venue rows can crash while recentering because raw list venues are not location-guarded like pins [nextjs-app/components/custom/map/MapView.tsx:237]
- [x] [Review][Patch] Localized UI still exposes hardcoded Swedish `Sol` text in English locale [nextjs-app/components/custom/venue/VenueList.tsx:100]
- [x] [Review][Patch] Required Task 7.9 selected-venue visual validation has no recorded result or acceptance rationale [2-2-venue-list-bottom-sheet.md:110] — result recorded; human accept-with-rationale granted by Rasmus on 2026-05-14 because the Story 2.2-owned venue-list peek sheet is no longer flagged missing, while the remaining failures map to later story scope and have deferred verification targets documented in `deferred-work.md` and `epics.md`.
- [x] [Review][Patch] Codex hook wrapper is invoked by a relative path that fails outside the repo root [.codex/hooks.json:9]
- [x] [Review][Decision] Round 2: `useMediaQuery` now conflicts with SSR-safe hydration semantics — resolved per Rasmus "go with reviewer recommendations": restored deterministic server/first-client `false` state and post-hydration `matchMedia` sync in `hooks/useMediaQuery.ts`; updated unit coverage.
- [x] [Review][Decision] Round 2: dismissed venue-list state has no recovery affordance — resolved per Rasmus "go with reviewer recommendations": full-sheet downward drag now collapses to peek for Story 2.2. The off-screen `dismissed` state remains only as an exit-rendering state until a future story designs a reopen affordance.
- [x] [Review][Patch] Round 2: peek state renders full-state header/content [nextjs-app/components/custom/map/MapView.tsx:263]
- [x] [Review][Patch] Round 2: reduced-motion mode can still run layout/backdrop/chevron motion [nextjs-app/components/custom/sheets/MobileBottomSheet.tsx:78]
- [x] [Review][Patch] Round 2: body drag binding can fight native list scrolling in full state [nextjs-app/components/custom/sheets/MobileBottomSheet.tsx:139]
- [x] [Review][Patch] Round 2: venue-card confidence is not styled with `color-amber-dark` [nextjs-app/components/composed/venue/VenueCard.tsx:78]
- [x] [Review][Patch] Round 2: required E2E coverage misses drag collapse, desktop selection, and sheet reduced-motion assertions [nextjs-app/test/e2e/map-primary.spec.ts:128]
- [x] [Review][Patch] Round 2: singular venue count copy is grammatically wrong in Swedish and English [nextjs-app/messages/sv/venue.json:15]
- [x] [Review][Patch] Round 3: Downward drag on the peek handle can be followed by the button click toggle and reopen the sheet [nextjs-app/components/custom/sheets/MobileBottomSheet.tsx:64]
- [x] [Review][Patch] Round 3: Full-sheet snap point uses arbitrary `top-[22dvh]` instead of a token-backed snap value [nextjs-app/components/custom/sheets/MobileBottomSheet.tsx:123]
- [x] [Review][Patch] Round 3: Story Task 5.1 still describes the rejected lazy `useMediaQuery` initializer after the approved Round 2 hydration decision [_bmad-output/implementation-artifacts/2-2-venue-list-bottom-sheet.md:92]
- [x] [Review][Patch] Round 3: Venue-list loading skeleton lacks semantic status/busy announcement [nextjs-app/components/custom/venue/VenueList.tsx:30]
- [x] [Review][Patch] Round 3: Venue-card stagger delay and duration bypass shared motion constants [nextjs-app/components/composed/venue/VenueCard.tsx:62]

## Dev Notes

### Current Implementation Surface

- `nextjs-app/components/custom/map/MapView.tsx` currently owns venue search, maps `VenueDataDto` to `VenuePinData`, renders `VenuePinLayer`, `VenueQuickInfo`, `MapControls`, loading/error pills, and the tile-paint cover.
- `nextjs-app/components/composed/venue/VenueQuickInfo.tsx` already contains thumbnail, confidence, distance, Motion/reduced-motion, and token usage patterns that `VenueCard` should follow where relevant.
- `nextjs-app/hooks/queries/useVenueSearch.ts` is the only client query wrapper for `/api/venues`; use it rather than fetching directly.
- `nextjs-app/lib/contexts/MapSelectionContext.tsx` provides selected venue state. Reuse it for card selection. Do not introduce a second selected-venue store.
- `nextjs-app/lib/contexts/MapInstanceContext.tsx` provides the MapLibre instance. Use it for recentering from a selected card.
- `nextjs-app/hooks/useMediaQuery.ts` currently returns `false` on initial client render before `useEffect`; Task 5 carries the targeted fix from deferred work.
- There is no existing production `VenueList`, `VenueCard`, or custom `MobileBottomSheet` implementation. `components/ui/sheet.tsx` is available as a shadcn primitive, but this map bottom sheet needs custom drag/snap behaviour.

### Design and Behaviour Requirements

- Binding tokens come from `nextjs-app/docs/design/DESIGN.md`: `color-surface-cream`, `radius-panel`, `radius-sheet-full`, `radius-venue-image`, `shadow-sheet-peek-up`, `shadow-sheet-full-up`, `color-drag-handle-map`, `color-drag-handle`, `color-amber-primary`, `color-amber-dark`, `text-heading-md`, `text-heading-xl`, and z-index tokens.
- Mobile peek state uses `z-bottom-sheet-peek`; full state uses `z-bottom-sheet-full`. Keep QuickInfo (`z-glass-panel`) visually above peek sheet when a venue is selected, matching the Story 2.1 accepted composite reference.
- UX spec requires the map to remain interactive behind peek state. Full state dims but keeps the map visible.
- Prototype `BottomSheet.jsx` includes mid-state, sort chips, favourites, and category filters. Story 2.2 ACs require peek/full/dismiss, ranked list, selection, desktop side panel, empty state, and reduced motion. Do not add favourites/filter/search behaviour here; those belong to later stories.
- Desktop side panel is 190px overlaying the map, not a layout column. It must not shrink or remount the map canvas.
- Use shadcn `Skeleton` for list loading placeholders. No full-page spinner.

### Architecture Guardrails

- Client components must not import from `lib/solar`, `lib/weather`, `lib/supabase`, `lib/middleware`, or `lib/buildings`.
- Three-layer dependency direction holds: `components/custom/` orchestrates, `components/composed/` presents reusable UI, `components/ui/` remains shadcn primitives only.
- All server state remains in TanStack Query. Context may hold selected venue id, map instance, time, locale, and browser-derived geolocation, but not copied API payloads. Premium/future paid status is dormant Future Monetization state and must not gate MVP list/planner/favourites flows.
- Query keys must come from `nextjs-app/lib/query-keys.ts`; this story should consume existing query hooks.
- MapLibre stays behind the existing dynamic `MapView` boundary. Do not add static MapLibre imports outside map-specific custom components already in the dynamic chunk.
- Swedish is default user-facing copy. Use scoped `next-intl` keys such as `useTranslations('venue')`.
- Respect `prefers-reduced-motion` using `useReducedMotion()` from `motion/react`.

### Latest Technical Notes

- Current package versions in `nextjs-app/package.json`: Next.js 16.2.2, React 19.2.5, Tailwind CSS 4.2.2, MapLibre GL 5.23.0, Motion 12.38.0, `@use-gesture/react` 10.3.1, TanStack Query 5.99.0.
- Context7 for `@use-gesture/react` v10 confirms `useDrag` state exposes `movement`, `offset`, `lastOffset`, `velocity`, `direction`, `first`, `last`, `active`, and pointer metadata. Use those for snap decisions instead of ad-hoc pointer bookkeeping.
- Context7 for `@use-gesture/react` notes `pointer.capture` defaults to true, `preventScroll` is experimental, and `rubberband` requires `bounds`. Choose options explicitly if list scrolling and handle dragging conflict.
- Motion React docs confirm `AnimatePresence` enables exit animations via the child `exit` prop, and reduced-motion guidance is to replace transform animations with opacity-only transitions.

### Previous Story Intelligence

- Story 2.1 completed the selected-pin `VenueQuickInfo` flow, provider-backed geolocation, venue API hardening, DTO normalization, and visual-validator readiness fixes.
- Story 2.1 accepted remaining `map-with-selected-venue` visual failures as future-scope drift. The Story 2.2-owned portion is now mandatory: the selected-venue composite gate must show the venue-list peek sheet under/coexisting with QuickInfo.
- Story 2.1 final validation: typecheck pass, eslint pass, Vitest 131 passed / 17 files, Playwright 30 passed / 17 skipped. Playwright dev server logged a pre-existing onboarding hydration warning but the suite passed.
- Recent commit `5a4faf2 feat(2): 2.1 venue quick-info card` is the implementation baseline. Review the changed files listed in Story 2.1 before editing overlapping map/venue surfaces.

### File Impact

Likely files to modify:

- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/venue/VenueList.tsx` (new)
- `nextjs-app/components/custom/sheets/MobileBottomSheet.tsx` (new)
- `nextjs-app/components/composed/venue/VenueCard.tsx` (new)
- `nextjs-app/hooks/useMediaQuery.ts`
- `nextjs-app/lib/constants/animation.ts` if a token-backed `DURATION_SLOW_S` or `EASE_SPRING` constant is needed for Motion.
- `nextjs-app/messages/sv/venue.json`
- `nextjs-app/messages/en/venue.json`
- `nextjs-app/test/components/VenueCard.test.tsx` (new)
- `nextjs-app/test/components/VenueList.test.tsx` (new)
- `nextjs-app/test/components/MobileBottomSheet.test.tsx` (new)
- `nextjs-app/test/components/MapView.test.tsx`
- `nextjs-app/test/unit/useMediaQuery.test.ts`
- `nextjs-app/test/e2e/map-primary.spec.ts`
- `nextjs-app/test/e2e/axe.spec.ts` if the accessibility route setup needs waiting for the sheet/cards.

Avoid unless truly required:

- `nextjs-app/lib/solar/**`
- `nextjs-app/lib/weather/**`
- `nextjs-app/lib/supabase/**`
- `nextjs-app/lib/buildings/**`
- Reference PNGs or `REBASELINE-LOG.md` unless visual validation proves a legitimate rebaseline is needed and Rasmus approves.

### References

- `AGENTS.md` - design tokens, API boundary, component architecture, Swedish copy, accessibility, story workflow.
- `project-context.md` - Screen ID route map; `map-panel-venues` uses `/?_state=map-panel-venues` on mobile; `map-with-selected-venue` uses `/?venue=test-venue-sunny&_state=map-with-selected-venue`.
- `_bmad-output/planning-artifacts/epics.md` - Epic 2 and Story 2.2 source ACs/design gate/deferred items.
- `_bmad-output/planning-artifacts/architecture.md` - map lifecycle, bottom sheet / side panel structure, TanStack Query, API boundary, component layers, performance budget.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - `BottomSheet`, `map-panel-venues`, `map-primary`, `map-with-selected-venue`, desktop side panel behaviour.
- `nextjs-app/docs/design/DESIGN.md` - binding tokens and component patterns.
- `nextjs-app/docs/design/references/claude-design/README.md` - prototype reading discipline.
- `nextjs-app/docs/design/references/claude-design/STATE-MAPPING.md` - prototype route/state mapping for `map-panel-venues`.
- `nextjs-app/docs/design/references/claude-design/project/src-free/BottomSheet.jsx` - mobile visual reference source only.
- `nextjs-app/docs/design/references/claude-design/project/src-desktop/Sidebar.jsx` - desktop side-panel visual reference source only.
- `_bmad-output/implementation-artifacts/2-1-venue-quick-info-card.md` - previous story implementation, review findings, validation status, and downstream visual obligations.
- Context7 `/pmndrs/use-gesture` - current `@use-gesture/react` v10 drag state/options.
- Context7 `/websites/motion_dev_react` - current Motion React `AnimatePresence` and reduced-motion guidance.

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- Baseline before edits: `cd nextjs-app && npx tsc --noEmit` PASS; `cd nextjs-app && npx eslint . --quiet` PASS.
- TDD red checks: new `VenueCard`, `VenueList`, and `MobileBottomSheet` tests failed on missing component imports before implementation.
- Final checks before review gate: `cd nextjs-app && npx tsc --noEmit` PASS; `cd nextjs-app && npx eslint . --quiet` PASS; `cd nextjs-app && npx vitest run` PASS (142 tests / 20 files); `cd nextjs-app && npx playwright test` PASS (34 passed / 21 skipped).
- Visual validation blocker: initial PowerShell `scripts\visual-validate.sh ...` invocations did not execute the shell script and are not counted. Real Git Bash `bash scripts/story-review.sh 2-2-venue-list-bottom-sheet` ran lint/typecheck/Vitest successfully, then failed visual validation because `ANTHROPIC_API_KEY` is not set for the legacy Claude visual provider. WSL bash also failed before visual validation because the Windows `node_modules` tree lacks Linux Rolldown optional bindings.
- Visual validation rerun after `ANTHROPIC_API_KEY` became available: `scripts/visual-validate.sh map-panel-venues "/?_state=map-panel-venues" mobile` still FAILS, but no longer reports the prior "missing map canvas entirely" defect after the full-sheet snap point was changed from `top-6` to `top-[22dvh]`. Remaining flags are reference-scope drift or upstream chrome outside Story 2.2 ACs: time slider/date navigation, settings button, filter chips, favourite tabs, rating/percentage card format, forced placeholder thumbnails, and existing map style/chrome.
- Human accept-with-rationale granted by Rasmus on 2026-05-14 for remaining `map-panel-venues` visual drift, conditional on thorough documentation and deferred follow-up verification. Deferred items were added to `_bmad-output/implementation-artifacts/deferred-work.md` and source backlog story notes in `_bmad-output/planning-artifacts/epics.md` for Stories 2.4, 2.5, 2.6, 3.3, and 6.1, plus a conditional map-style decision item.
- Code review Round 1 selected-venue visual regression: `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-with-selected-venue "/?venue=test-venue-sunny&_state=map-with-selected-venue" mobile` FAILS on out-of-scope reference chrome: missing time slider/date navigation, warm map tint, settings button, and old favourites lock badge. The validator did not report the Story 2.2-owned missing venue-list peek sheet failure, so Task 7.9's regression target is satisfied pending human accept-with-rationale for the remaining reference drift. The 2026-05-19 MVP correction intentionally removes favourites gating; Story 2.7 implements free favourites and should rebaseline if the old lock badge remains in a reference.
- Human accept-with-rationale granted by Rasmus on 2026-05-14 for the remaining `map-with-selected-venue` visual drift, conditional on thorough documentation and deferred follow-up verification. Deferred items were added to `_bmad-output/implementation-artifacts/deferred-work.md` and source backlog story notes in `_bmad-output/planning-artifacts/epics.md` for Stories 2.4, 2.5, and 6.1, plus a conditional map-style decision item.
- Playwright dev server still logs the pre-existing onboarding hydration warning noted in Story 2.1; suite passes.
- Code review Round 2 patches applied per Rasmus's reviewer-recommendation approval: restored `useMediaQuery` hydration safety, collapsed full-sheet downward drag to peek until a reopen affordance exists, hid full-state sheet content in peek, disabled reduced-motion layout/chevron transform motion, narrowed body drag handling to avoid stealing upward scroll, styled confidence with `text-amber-dark`, pluralized venue count copy, and extended E2E coverage for drag collapse, desktop selection, and reduced-motion sheet transform.
- Accepted visual-validation drift audit: existing Story 2.2 `map-panel-venues` and `map-with-selected-venue` accepted failures remain documented in `_bmad-output/implementation-artifacts/deferred-work.md` under "Deferred from: Story 2.2 visual validation acceptance (2026-05-14)" with target-story tags and mirrored final verification notes in `_bmad-output/planning-artifacts/epics.md` for Stories 2.4, 2.5, 2.6, 3.3, and 6.1. No new accepted visual failure was introduced in Round 2.
- Round 2 verification: `cd nextjs-app && npx tsc --noEmit` PASS; `cd nextjs-app && npx eslint . --quiet` PASS; `cd nextjs-app && npx vitest run` PASS (147 tests / 20 files); `cd nextjs-app && npx playwright test` PASS (34 passed / 21 skipped). Playwright still logs the pre-existing onboarding hydration warning noted above, but the suite passes.
- Code review Round 3 patches applied via batch-apply: suppressed click-after-drag reopening on the peek handle, moved the full-sheet top offset into `--size-bottom-sheet-full-top` and DESIGN.md, corrected the superseded `useMediaQuery` task wording, added semantic loading status/busy state for VenueList skeletons, and moved venue-card stagger timing into shared animation constants.
- Round 3 verification: `cd nextjs-app && npx tsc --noEmit` PASS; `cd nextjs-app && npx eslint . --quiet` PASS; `cd nextjs-app && npx vitest run` PASS (149 tests / 20 files); `cd nextjs-app && npx playwright test` PASS (34 passed / 21 skipped). Playwright still logs the pre-existing onboarding hydration warning noted above, but the suite passes.

### Completion Notes List

- Story drafted by SM (Bob) on 2026-05-13.
- Ultimate context engine analysis completed - comprehensive developer guide created.
- Implemented token-backed `VenueCard`, `VenueList`, and `MobileBottomSheet` with sunny-first/closest sorting, empty/loading states, keyboard-operable handle, drag snap states, reduced-motion opacity-only sheet motion, and Swedish/English venue-list copy.
- Wired venue list into `MapView`: mobile peek/full state with `_state=map-panel-venues`, desktop 190px overlay panel, selection through `MapSelectionContext`, map recenter via `easeTo({ duration: DURATION_FLY_MS })`, and QuickInfo handoff through existing selected venue state.
- Fixed `useMediaQuery` client first-render behavior with a lazy `matchMedia` initializer while preserving server false fallback.
- Fixed the Story 2.2-owned visual geometry defect where the full sheet covered effectively all map content; the full sheet now leaves a visible dimmed map band above it.
- Remaining `map-panel-venues` and `map-with-selected-venue` visual gate failures are accepted-with-rationale for Story 2.2 because they map to later story scope and have deferred verification targets documented for review.
- Code review Round 2 resolved all 2 decision-needed items and all 6 patch findings; no new deferred items were created.
- Code review Round 3 resolved all 5 patch findings; no decision-needed or deferred items were created. Story status moved to done.

### File List

- nextjs-app/components/composed/venue/VenueCard.tsx
- nextjs-app/components/custom/map/MapView.tsx
- nextjs-app/components/custom/sheets/MobileBottomSheet.tsx
- nextjs-app/components/custom/venue/VenueList.tsx
- nextjs-app/app/globals.css
- nextjs-app/docs/design/DESIGN.md
- nextjs-app/hooks/useMediaQuery.ts
- nextjs-app/lib/constants/animation.ts
- nextjs-app/messages/en/venue.json
- nextjs-app/messages/sv/venue.json
- nextjs-app/test/components/MapView.test.tsx
- nextjs-app/test/components/MobileBottomSheet.test.tsx
- nextjs-app/test/components/VenueCard.test.tsx
- nextjs-app/test/components/VenueList.test.tsx
- nextjs-app/test/e2e/map-primary.spec.ts
- nextjs-app/test/unit/useMediaQuery.test.ts
- _bmad-output/implementation-artifacts/2-2-venue-list-bottom-sheet.md
- _bmad-output/implementation-artifacts/deferred-work.md
- _bmad-output/planning-artifacts/epics.md
- .codex/hooks.json
- .codex/scripts/git-bash-hook.cmd
- AGENTS.md
- CODEX_MIGRATION_NOTES.md
- scripts/run-sh.ps1

## Change Log

| Date       | Author   | Note |
|------------|----------|------|
| 2026-05-13 | SM (Bob) | Story drafted from epics.md Story 2.2, architecture, UX spec, design system, Claude Design BottomSheet/Sidebar sources, Story 2.1 learnings, and deferred-work entries targeted at 2.2. Status -> ready-for-dev. |
| 2026-05-13 | Dev (Amelia) | Implemented venue list bottom sheet, desktop venue overlay, selection handoff, responsive hook fix, and unit/component/E2E coverage; visual validation is blocked by missing legacy provider credentials. |
| 2026-05-14 | Dev (Amelia) | Fixed full-sheet map visibility defect, documented accepted visual scope drift, and deferred future verification targets for later story-owned reference gaps. |
| 2026-05-16 | Dev (Amelia) | Applied Round 3 code-review fixes, reran typecheck/lint/Vitest/Playwright, and moved story to done. |
