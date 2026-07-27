---
baseline_commit: 03e32a4
story_key: 12-11-first-run-coach-mark-guide-map-legend-feature-tour
epic_num: 12
story_num: 11
tea_risk: med
tea_selected:
  - automate
---

# Story 12.11: First-Run Coach-Mark Guide (Map Legend + Feature Tour)

Status: ready-for-dev

screen_id: coach-mark-first
screen_id: coach-mark-middle

## Story

As a **first-time user**,
I want a short, skippable guide that shows what a sunny vs grey pin means and how the
main features work,
So that I understand the app immediately (and can revisit it later).

## Source Context (Verbatim From Epic)

_Context (2026-07-08, maintainer request):_ first-time users don't know what the pins
mean or how the planner/tags/list/feedback work. A brief, skippable coach-mark guide on
first map entry teaches the essentials. Distinct from the existing `OnboardingGate`
(geolocation permission) — this is a post-onboarding feature tour, re-openable from
Settings.

## Acceptance Criteria (Verbatim From Epic)

**Given** a user reaches the map for the first time (after onboarding/geolocation)
**When** a coach-mark guide appears highlighting, in a few steps: the sunny (amber) vs
not-sunny (grey/cloud) pin meaning, the time slider, the date planner, the tag chips,
the venue list/sheet, and favourites — each step a short caption anchored to a real element
**that is actually present on the initial map screen**. The "stämmer det?" feedback control
is NOT — `FeedbackFlow` only mounts inside the detail overlay (`MapView.tsx:601`, gated on
an open venue), so a feedback step must NOT anchor to a non-existent target on first entry:
either drop it from the first-run tour (mention feedback in copy only), or have the guide
deterministically open a venue's detail before any feedback-specific step (no step ever
points at a hidden/unmounted element)
**Then** it can be dismissed at ANY step via an always-visible "Hoppa över"/close (one
tap exits the whole guide), and it never auto-shows again (a persisted `localStorage`
seen-flag, cross-tab safe like the onboarding flag)

**Given** a returning user wants to see it again
**When** they open Settings
**Then** a "Visa guide igen" entry re-launches the guide on demand

**Given** the app is mobile + desktop with very different layouts
**When** the guide renders
**Then** each step's anchor/caption is positioned correctly for the current breakpoint
(mobile bottom-sheet + top slider vs desktop side panel + chip strip) — the guide is
responsive, not a fixed-coordinate overlay

**Given** WCAG 2.1 AA
**When** the guide is open
**Then** focus is trapped in the current step, ESC exits, the highlighted element has an
accessible description, copy is Swedish-first (`next-intl`), and it respects
`prefers-reduced-motion`

**Design Gate Criteria:**
- **Visual:** Coach-mark styling matches the design tokens (no raw colours/shadows);
  amber-pin and grey-pin swatches match the real pins
- **Behaviour:** Skippable at any step (one tap); shows once; re-openable from Settings;
  correct anchoring on mobile AND desktop
- **Animation:** Gentle step transitions honoring `prefers-reduced-motion`
- **Visual validation:** First-run guide (mobile + desktop, first + a middle step) vs a
  new reference passes

## Locked Decisions For Implementation

### Feedback Step Policy

Use the **copy-only feedback guidance** path. Do not open a venue detail solely to target
feedback, and do not create a feedback-specific coach step. The tour may mention feedback
in copy, for example in the venue-list or final step: users can answer "Stämmer det?" after
opening a place/detail when they have visited. There must be no `feedback` tour anchor,
no `_state=feedback` transition, and no synthetic detail open just for this tour.

This is locked because the current code still mounts `FeedbackFlow` only from the detail
overlay slot in `MapView.tsx`; a first-run map entry has no feedback control mounted.

### Forced Visual State Names

Use the UX-spec names exactly:

- `coach-mark-first`
- `coach-mark-middle`

Add these rows to `project-context.md` during implementation, one per viewport:

| Screen ID | Route | Viewport | Contract |
|---|---|---|---|
| `coach-mark-first` | `/?_state=coach-mark-first&_time=14:00` | mobile | First guide step open, both pin presentations explained in the coach card, focus on guide heading, skip/close visible. |
| `coach-mark-first` | `/?_state=coach-mark-first&_time=16:30` | desktop | Same first guide step on desktop layout. |
| `coach-mark-middle` | `/?_state=coach-mark-middle&_time=14:00` | mobile | Middle guide step anchored to the mounted mobile time/date planner, with the row-count sheet and controls stable. |
| `coach-mark-middle` | `/?_state=coach-mark-middle&_time=16:30` | desktop | Middle guide step anchored to the mounted desktop time/date planner. |

The story file already includes `screen_id: coach-mark-first` and
`screen_id: coach-mark-middle` so the review gate can discover the intended visual states
after implementation updates the route map.

### Exact Tour Anchors

Add stable `data-tour-anchor` attributes to real mounted elements. The guide must resolve
anchors by these attributes and never by fixed viewport coordinates or incidental DOM shape.

| Step | Mobile target | Desktop target | Notes |
|---|---|---|---|
| `pin-legend` | `data-tour-anchor="map-surface"` on the map viewport/container; caption contains both amber and grey/cloud pin swatches matching `VenuePin`. | Same `map-surface` target. | UX spec says the first step anchors to the persistent map surface so it does not depend on a sunny venue existing. Swatches must use Story 12.6 semantics: amber sun + percentage for public sunny; grey cloud/no percentage for not-sunny. |
| `time-slider` | `data-tour-anchor="time-slider"` on the mobile `TimeSliderPanel`/slider region (`data-testid="time-slider-panel"` exists today). | Same anchor on the desktop bottom planner bar. | Preserve Epic 11/Story 12.9 scrub contracts: same-date scrub remains zero fetch; date change remains one fetch. |
| `date-planner` | `data-tour-anchor="date-planner"` on the existing `planner-date-trigger`. | Same `planner-date-trigger` in desktop `TimeSliderPanel`. | Do not open the date picker just to highlight the trigger. |
| `tags` | `data-tour-anchor="tag-chips"` on `MobileTagChips` in the bottom-sheet chrome. | `data-tour-anchor="tag-chips"` on `DesktopNavBar`'s `desktop-tag-chip-strip`. | Wait for tags to load. If no tags exist in an environment, skip this step rather than highlighting stale coordinates; deterministic visual/test data must include tags. |
| `venue-list` | `data-tour-anchor="venue-list"` on the mounted `MobileBottomSheet` or its body when `data-visible-rows >= 1`; for the tour path prefer `N=3` complete rows when `maxRows` allows. | `data-tour-anchor="venue-list"` on `desktop-venue-list-panel`. | Preserve Story 12.9 row-count model and metrics (`data-visible-rows`, `data-max-rows`, `data-sheet-height`). |
| `favourites` | `data-tour-anchor="favourites"` on `mobile-nav-tab-favoriter`. | `data-tour-anchor="favourites"` on the desktop side-panel `Favoriter` segment in `VenueListControls`. | This is present on the initial map screen at both breakpoints; prefer it over a card heart if the list is loading. |

Anchor resolution rules:

- Before moving focus to a step, verify the target exists and has a non-empty
  `getBoundingClientRect()`.
- If a non-critical target is absent, skip to the next available step. Do not render a
  coach card pointing to hidden, inert, or zero-size DOM.
- If the first/core `map-surface` target is absent, do not auto-show the tour or write the
  seen flag; let the next map entry try again.
- The forced states must make the required first and middle targets present deterministically.

## Pre-Implementation Dependency Gate

1. From `nextjs-app/`, run the required baseline before editing:
   - `npx tsc --noEmit`
   - `npx eslint . --quiet`
2. Stop for unrelated baseline failures. Do not hide failures with `eslint-disable`,
   `@ts-ignore`, ignore globs, or shim fixes.
3. Read the current source surfaces named in "Current Implementation Facts" below.
4. Reconfirm these existing contracts before changing code:
   - Story 12.6 public sunny predicate remains
     `sunExposurePercent > 50 && weatherGateState !== 'gated'`.
   - Story 12.8 public About legend semantics remain aligned: the percentage is seating
     share at the selected time, not probability/confidence.
   - Story 12.9 mobile sheet remains row-quantized (`N=0..maxRows`) and its real touch,
     keyboard, reduced-motion, and recenter behavior must not regress.
   - Story 12.10 detail prefetch must not restart on guide steps, same-date scrub, or
     date changes beyond its own settled-candidate rules.
   - Story 12.13 removed public confidence; the guide must not teach or reintroduce a
     confidence number.

## Tasks / Subtasks

- [ ] **Task 0 - Reconfirm sources, baseline, and route-state names** (AC: all)
  - [ ] Run the baseline typecheck and lint from `nextjs-app/` before editing.
  - [ ] Read `AGENTS.md`, `project-context.md`, `nextjs-app/docs/design/DESIGN.md`,
        `_bmad-output/planning-artifacts/epics.md`, PRD, UX spec, architecture, and
        `_bmad-output/qa/epic-12-test-design-2026-07-12.md`.
  - [ ] Confirm the visual forced states use `coach-mark-first` and `coach-mark-middle`
        from the UX spec, not a new alias.
  - [ ] Confirm no new package is needed. Use existing React, Motion, lucide icons,
        shadcn/ui primitives where present, and local focus-trap helpers.

- [ ] **Task 1 - Add stable mounted anchors without changing core behavior** (AC: 1, 3, 4)
  - [ ] Add `data-tour-anchor="map-surface"` to the map viewport/root region around
        `MapContainer`/the persistent map surface.
  - [ ] Add `data-tour-anchor="time-slider"` and `data-tour-anchor="date-planner"` to
        the actual mounted planner elements in `TimeSliderPanel` / `CalendarButton`.
  - [ ] Add `data-tour-anchor="tag-chips"` to `MobileTagChips` and `DesktopNavBar`'s
        tag strip.
  - [ ] Add `data-tour-anchor="venue-list"` to `MobileBottomSheet` and
        `desktop-venue-list-panel`.
  - [ ] Add `data-tour-anchor="favourites"` to the mobile favourites nav tab and the
        desktop favourites segment.
  - [ ] Keep every anchored control's existing role, label, tab behavior, 44x44 target,
        and focus ring. Do not make inert/decorative duplicates of controls just for the
        tour.

- [ ] **Task 2 - Build the coach guide UI and step resolver** (AC: 1, 3, 4; Design Gate)
  - [ ] Add a focused guide component under `components/custom/coach-tour/` or equivalent
        feature folder. If a reusable card/dialog wrapper is created, put it under
        `components/composed/coach-tour/` and depend only on `components/ui/`.
  - [ ] Define a typed step registry with ids: `pin-legend`, `time-slider`, `date-planner`,
        `tags`, `venue-list`, and `favourites`.
  - [ ] Implement the guide as a modal teaching layer with a coach card, visible target
        highlight, and no fixed-coordinate placement. Position from the target rect and
        recompute on resize/scroll/step change.
  - [ ] The first step's card must include both pin swatches and copy that matches Story
        12.8 semantics. Do not display a confidence number.
  - [ ] Use design tokens only: no raw hex, arbitrary shadows, or arbitrary z-index values.
        Prefer existing `z-modal`/modal layering. If a new z token is truly required, add it
        in `DESIGN.md`/CSS token files deliberately and document why.
  - [ ] Use Motion token constants (`DURATION_FAST_S`, `DURATION_SLOW_S`, `EASE_ENTER`,
        `EASE_EXIT`) or existing CSS transition utilities. With reduced motion, remove
        animated travel between targets.

- [ ] **Task 3 - Implement first-run persistence, cross-tab sync, and Settings relaunch**
        (AC: 1, 2, 4)
  - [ ] Add a constant such as `FIRST_RUN_GUIDE_SEEN_KEY = 'sunnyseat_first_run_guide_seen'`
        near `ONBOARDED_FLAG_KEY` or in a dedicated coach-tour constants file.
  - [ ] Follow the `OnboardingGate` `useSyncExternalStore` + `storage` event pattern for
        synchronous first client render and cross-tab safety.
  - [ ] Auto-show only after onboarding is complete (`ONBOARDED_FLAG_KEY === '1'`), the map
        route is active, no guide seen flag is set, and the required first target is mounted.
  - [ ] Do not auto-show over onboarding, Settings, date picker, venue detail, feedback,
        offline shell, or forced non-guide visual states.
  - [ ] Dismiss/close/complete writes the seen flag once and hides any open guide in other
        tabs through the storage listener.
  - [ ] Settings gets a Swedish-first `Visa guide igen` row. Activating it closes Settings
        and launches the guide at step one even when the seen flag is already set.
  - [ ] Settings relaunch must not clear the seen flag permanently; it is an explicit,
        current-session start command.
  - [ ] Forced visual states must bypass the seen flag and must not mutate localStorage.

- [ ] **Task 4 - Wire dev-only forced states and visual route map** (AC: 3; Design Gate)
  - [ ] Extend `MapView` forced-state handling so `coach-mark-first` and
        `coach-mark-middle` render deterministic guide states in development/test only.
  - [ ] `coach-mark-first` starts at `pin-legend`.
  - [ ] `coach-mark-middle` starts at the middle planner step (`time-slider`/date trigger
        visible and mounted).
  - [ ] Add `coach-mark-first` and `coach-mark-middle` rows to `project-context.md` for
        mobile and desktop exactly as specified above.
  - [ ] `docs/dev/state-forcing.md` can keep pointing at `project-context.md`; do not
        duplicate the route table there.
  - [ ] If visual reference PNGs are added or replaced, update
        `nextjs-app/docs/design/references/REBASELINE-LOG.md` in the same operation with
        source, candidate path, viewport, route, and human approval status.

- [ ] **Task 5 - Copy, accessibility, and motion** (AC: 1, 2, 4; Design Gate)
  - [ ] Add Swedish and English next-intl keys symmetrically, preferably in the existing
        `map` namespace for tour copy and `common.settings` for the Settings relaunch row.
  - [ ] Copy must be short and user-facing Swedish by default. Use "Hoppa över", "Nästa",
        "Tillbaka", "Stäng guide", and "Visa guide igen" or clearly equivalent Swedish.
  - [ ] The guide card has `role="dialog"`/modal semantics, an accessible title, and focus
        starts on the current step heading.
  - [ ] Trap focus inside the current coach card using existing local focus-trap utilities
        or shadcn Dialog behavior; `Escape` exits.
  - [ ] Every button in the coach card is at least 44x44 px and has a visible token-based
        focus indicator.
  - [ ] While a step is active, add/restore `aria-describedby` on the target element so the
        highlighted element has an accessible description. Do not leave stale ids after step
        change or close.
  - [ ] Restore focus on close: to the invoking Settings row after relaunch, or to a stable
        map/shell element after auto-show.
  - [ ] Respect `prefers-reduced-motion`; no target-travel animation or scroll animation for
        reduced-motion users.

- [ ] **Task 6 - Preserve existing contracts and avoid scope creep** (AC: all)
  - [ ] Do not change API routes, Supabase clients, `lib/solar`, `lib/weather`,
        `lib/buildings`, or server-only modules.
  - [ ] Do not change pin truth semantics, ranking, tag filtering, bottom-sheet snapping,
        detail prefetch, or feedback submission.
  - [ ] Do not wire premium/Season Pass/paywall/lock-badge state into the MVP tour.
  - [ ] Do not add live Met.no, Google, or production Supabase dependencies to tests.
  - [ ] Do not open detail during the tour solely to mention feedback.

- [ ] **Task 7 - Prove behavior, accessibility, and visual states** (AC: all; Design Gate)
  - [ ] Add unit/component coverage for the seen-flag store: first render, write failure
        degradation, same-tab close, cross-tab `storage` event, and `localStorage.clear()`.
  - [ ] Add component tests for the step registry: each breakpoint maps to mounted anchors,
        absent optional anchors are skipped, and no feedback target exists.
  - [ ] Add `SettingsModal`/provider tests proving "Visa guide igen" is present, keyboard
        reachable, 44x44, Swedish/English keyed, and calls the relaunch path.
  - [ ] Add guide component tests for focus trap, heading initial focus, ESC close,
        skip/close at every step, `aria-describedby` attach/restore, reduced-motion mode,
        and pin swatches matching Story 12.6 public states.
  - [ ] Add mobile+desktop E2E coverage:
        - first post-onboarding map entry auto-shows once;
        - skip writes the seen flag and reload does not auto-show;
        - returning user with seen flag gets no auto-show;
        - Settings relaunch opens step one despite the seen flag;
        - `coach-mark-first` and `coach-mark-middle` forced states mount expected anchors;
        - no route/detail/feedback transition happens during the copy-only feedback mention.
  - [ ] Run the full relevant gate set from `nextjs-app/`:
        - `npx tsc --noEmit`
        - `npx eslint . --quiet`
        - `npx vitest run`
        - `npx playwright test` including `--project=a11y` and `--project=a11y-mobile`.
  - [ ] If full Vitest times out on Windows under concurrent load, retry with
        `$env:VITEST_MAX_WORKERS='4'; npx vitest run` and record both attempts.
  - [ ] Run visual validation through the repo wrapper for all four mapped states:
        - `.\scripts\run-sh.ps1 scripts/visual-validate.sh coach-mark-first '/?_state=coach-mark-first&_time=14:00' mobile`
        - `.\scripts\run-sh.ps1 scripts/visual-validate.sh coach-mark-first '/?_state=coach-mark-first&_time=16:30' desktop`
        - `.\scripts\run-sh.ps1 scripts/visual-validate.sh coach-mark-middle '/?_state=coach-mark-middle&_time=14:00' mobile`
        - `.\scripts\run-sh.ps1 scripts/visual-validate.sh coach-mark-middle '/?_state=coach-mark-middle&_time=16:30' desktop`
  - [ ] If the visual provider is unavailable because credentials such as
        `ANTHROPIC_API_KEY` are absent, capture candidates and stop for explicit Rasmus
        approval before treating manual validation/rebaseline as accepted.
  - [ ] Transition through `.\scripts\run-sh.ps1 scripts/story-review.sh 12-11-first-run-coach-mark-guide-map-legend-feature-tour`
        only after the functional, a11y, visual, and route-map gates are satisfied.

## Current Implementation Facts

- `SettingsModal.tsx` currently exposes feedback and About rows only. Its row primitive is
  token-based, keyboard reachable, and focus-trapped with local `focusableElements` /
  `trapFocus` helpers. It needs a third Settings row for guide relaunch.
- `SettingsContext.tsx` currently supports `activeView: 'settings' | 'feedback' | null`.
  Relaunching the guide from Settings likely needs either a small guide context or an
  explicit callback wired from `SettingsModalRoot`.
- `AppContextProviders.tsx` mounts `SettingsProvider`, `SearchParamTimeProviders`, the app
  children, and `SettingsModalRoot` in one subtree. Any guide command needed by both MapView
  and Settings must be mounted where both can read it.
- `OnboardingGate.tsx` already has the cross-tab-safe localStorage pattern this story should
  mirror: `useSyncExternalStore`, synchronous client snapshot, `storage` listener, guarded
  writes, and forced-state bypass.
- `VenuePin.tsx` renders a focusable `button` with `data-testid="venue-pin"`,
  `data-pin-state="sunny|shaded"`, `data-pin-icon="sun|cloud"`, and public-sun semantics from
  `isVenuePubliclySunny`.
- `VenuePinLayer.tsx` strips MapLibre wrapper roles so screen readers see the inner button.
  Do not re-add nested-interactive wrapper semantics while adding tour descriptions.
- `TimeSliderPanel.tsx` exposes `data-testid="time-slider-panel"` and `planner-date-trigger`.
  Mobile and desktop variants share the component but render different layouts.
- `MobileBottomSheet.tsx` exposes `data-testid="mobile-bottom-sheet"`, `data-visible-rows`,
  `data-max-rows`, `data-row-height`, `data-sheet-height`, and `data-dragging`.
- `DesktopNavBar.tsx` exposes `desktop-tag-chip-strip` and desktop settings/location buttons.
  The desktop favourites entry is in the side-panel `VenueListControls`, not the top nav.
- `MobileNavBar.tsx` exposes `mobile-nav-tab-favoriter`; the link is already a 44px-minimum
  bottom nav target.
- `VenueListControls.tsx` contains the desktop `Favoriter` segment and mobile sort buttons.
  If a `data-tour-anchor` prop is added, keep segmented-button behavior unchanged.
- `VenueCard.tsx` has 44x44 favourite heart buttons, but the initial desktop map already has
  a better favourites target in the side-panel segment. Prefer that deterministic anchor.
- `MapView.tsx` uses `useForcedState()` for visual states and currently recognizes map,
  selected venue, obscured, photo, feedback, and review states. Extend this pattern for the
  guide without affecting production because `useForcedState()` returns `null` in production.
- `FeedbackFlow` is only rendered from the detail overlay slot when a detail venue is present
  and either the planner is live or `_state=feedback` is forced. This is why the tour uses
  copy-only feedback guidance.
- `i18n/request.ts` currently loads a fixed set of message scopes. If implementation chooses a
  new `coachTour.json` scope instead of using existing `map` keys, update `SCOPES` and message
  parity tests deliberately.

## Design And UX Notes

- The guide is optional teaching. It must not block the core map indefinitely or repeatedly
  interrupt returning users.
- The first step should explain both pin presentations while anchored to the persistent map
  surface. The coach card can contain static swatches, but they must visually match the real
  `VenuePin` token classes/icons and Story 12.6 public semantics.
- Amber means public sunny: `sunExposurePercent > 50 && weatherGateState !== 'gated'`.
- Grey/cloud means not public sunny: shade, low exposure, or weather-gated; no percentage on
  the grey pin.
- The sun percentage is seating-area share at the selected time. It is not probability and
  not confidence.
- Existing visual tokens from `DESIGN.md` are binding: `bg-amber-pin`, `bg-pin-shaded`,
  `text-text-primary`, `text-text-body`, panel radii/shadows, and motion constants.
- Do not copy prototype DOM/CSS. Match visual outcome through the production component system.
- No rounded text pills for controls when an icon button is the expected pattern, except where
  the existing design system already uses pills for guide actions.

## Retro Carry-Ins

- Story 12.6: use the shared public-sun predicate and fail-closed weather semantics so pin,
  card, About, and guide copy cannot drift.
- Story 12.6: `a11y-mobile` evidence must be executable, not vacuous.
- Story 12.6 / 12.12: the visual provider may be credential-gated on this host. Do not
  replace references or declare a manual pass without explicit human approval.
- Story 12.9: visual pickup needs explicit `screen_id:` markers, DOM state assertions before
  capture, and the mobile sheet row-count model rather than old mid-snap semantics.
- Story 12.10: detail prefetch has strict request-count and restart guards. The tour should
  not create detail-prefetch churn or reset candidates during same-date scrub/date changes.
- Story 12.13: confidence is no longer public. Avoid copy that teaches or implies a confidence
  number.

## Deferred-Work Fold-Ins

- The TimeSlider lost-pointer/capture deferrals are not part of this story unless guide work
  touches TimeSlider handlers. If those handlers are touched, preserve Story 11/12.9 pointer
  behavior and add focused regression tests.
- The Story 11.5 recenter padding deferred note is not in scope. Tour highlighting must not
  re-fly or recenter the map without a user locate action.
- The existing About contrast/rebaseline deferrals are not absorbed here unless this story
  changes the same visual references.

## Testing Requirements

- Baseline before edits: `npx tsc --noEmit` and `npx eslint . --quiet` from `nextjs-app/`.
- Required completion gates: typecheck, lint, full or story-relevant Vitest, Playwright with
  mobile+desktop coverage, `a11y`, `a11y-mobile`, and visual validation for both new screen
  IDs at both viewports.
- Component coverage should include:
  - storage store and cross-tab behavior;
  - step registry/anchor resolver;
  - guide focus trap, ESC, skip/close, reduced motion, and target `aria-describedby`;
  - Settings relaunch row;
  - Swedish and English message parity.
- E2E coverage should include:
  - first-run auto-show after onboarding flag;
  - seen flag persists and suppresses returning auto-show;
  - Settings relaunch despite seen flag;
  - forced `coach-mark-first` and `coach-mark-middle` states;
  - no feedback/detail open caused by the tour.
- Visual validation must cover:
  - `coach-mark-first` mobile and desktop;
  - `coach-mark-middle` mobile and desktop.
- Tests must use deterministic fixtures/mocks only. No live Met.no, Google, production
  Supabase, or protected service dependency.

## Anticipated Files Impacted

- Guide UI/state:
  - `nextjs-app/components/custom/coach-tour/FirstRunCoachMarkGuide.tsx`
  - optional `nextjs-app/components/composed/coach-tour/CoachMarkCard.tsx`
  - `nextjs-app/lib/constants/onboarding.ts` or
    `nextjs-app/lib/constants/coach-tour.ts`
  - optional `nextjs-app/lib/contexts/FirstRunGuideContext.tsx`
- Wiring and anchors:
  - `nextjs-app/components/custom/layout/AppContextProviders.tsx`
  - `nextjs-app/components/custom/settings/SettingsModal.tsx`
  - `nextjs-app/components/custom/settings/SettingsModalRoot.tsx`
  - `nextjs-app/lib/contexts/SettingsContext.tsx` if the Settings API is extended
  - `nextjs-app/components/custom/map/MapView.tsx`
  - `nextjs-app/components/custom/map/VenuePin.tsx` / `VenuePinLayer.tsx` only if target
    description or swatch reuse requires it
  - `nextjs-app/components/custom/time/TimeSliderPanel.tsx`
  - `nextjs-app/components/custom/sheets/MobileBottomSheet.tsx`
  - `nextjs-app/components/composed/venue/MobileTagChips.tsx`
  - `nextjs-app/components/custom/layout/DesktopNavBar.tsx`
  - `nextjs-app/components/custom/layout/MobileNavBar.tsx`
  - `nextjs-app/components/composed/venue/VenueListControls.tsx`
- Copy and route-map:
  - `nextjs-app/messages/sv/map.json`
  - `nextjs-app/messages/en/map.json`
  - `nextjs-app/messages/sv/common.json`
  - `nextjs-app/messages/en/common.json`
  - `nextjs-app/i18n/request.ts` only if a new message scope is added
  - `project-context.md`
  - `nextjs-app/docs/design/references/REBASELINE-LOG.md` if references are added/replaced
- Tests:
  - `nextjs-app/test/components/SettingsModal.test.tsx`
  - `nextjs-app/test/components/AppContextProviders.test.tsx`
  - new guide component tests under `nextjs-app/test/components/`
  - `nextjs-app/test/components/MapView.test.tsx` or focused Story 12.11 ATDD component tests
  - `nextjs-app/test/e2e/coach-mark-guide.spec.ts` or `story-12-11-*.spec.ts`
  - `nextjs-app/test/e2e/axe.spec.ts`
  - `nextjs-app/test/e2e/axe-mobile.spec.ts`

## Out Of Scope

- No API/schema/Supabase migration.
- No feedback POST, review, route overlay, or accuracy aggregation changes.
- No detail auto-open to target feedback.
- No pin predicate, ranking, or public sunny threshold changes.
- No Story 12.14 selected-instant hours filtering work.
- No premium/paywall/Season Pass copy or state.
- No global visual rebaseline outside the four coach-mark states unless an actual affected
  reference requires it and Rasmus approves.

## References

- [Source: `AGENTS.md` - repo rules, BMAD workflow, design/token/a11y/API-boundary requirements]
- [Source: `project-context.md` - Screen ID -> Route Map, Epic 12 public-sun invariant, route forcing convention]
- [Source: `_bmad-output/auto-bmad/state/12-11-first-run-coach-mark-guide-map-legend-feature-tour.yaml` - risk, sequencing, and locked feedback decision input]
- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 12.11 ACs and Design Gate]
- [Source: `_bmad-output/planning-artifacts/prd.md` - LR3 guided first use, first-session narrative, feedback trust loop]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - CoachMarkGuide sequence/behavior/accessibility and `coach-mark-first`/`coach-mark-middle` forced states]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - next-intl, localStorage, component layering, API boundary, E12 decisions]
- [Source: `_bmad-output/qa/epic-12-test-design-2026-07-12.md` - R-017/R-019, a11y and visual expectations for Story 12.11]
- [Source: `nextjs-app/docs/design/DESIGN.md` - design tokens, pin states, motion, z-index, and accessibility constraints]
- [Source: `nextjs-app/docs/design/references/claude-design/README.md` - visual-source discipline]
- [Source: `_bmad-output/auto-bmad/retro-notes/epic-12.md` - visual/a11y/rebaseline carry-ins]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md` - overlapping deferred constraints]
- [Source: `_bmad-output/implementation-artifacts/12-6-simplify-map-pins-one-grey-not-sunny-pin-no-number.md` - public pin semantics]
- [Source: `_bmad-output/implementation-artifacts/12-8-about-page-pin-legend-so-reads-the-sun-figure.md` - public legend semantics]
- [Source: `_bmad-output/implementation-artifacts/12-9-mobile-bottom-sheet-row-quantized-drag-slim-time-slider.md` - row-count sheet model]
- [Source: `_bmad-output/implementation-artifacts/12-10-venue-detail-preload-instant-mer-info.md` - detail prefetch/request-count constraints]
- [Source: `_bmad-output/implementation-artifacts/12-13-remove-the-user-facing-confidence-indicator-keep-it-internal.md` - no public confidence contract]
- [Source: `nextjs-app/components/custom/map/MapView.tsx` - current forced-state, detail, feedback, sheet, and planner wiring]
- [Source: `nextjs-app/components/custom/map/VenuePin.tsx` and `VenuePinLayer.tsx` - current real pin DOM/semantics]
- [Source: `nextjs-app/components/custom/time/TimeSliderPanel.tsx` - current planner/date trigger anchors]
- [Source: `nextjs-app/components/custom/sheets/MobileBottomSheet.tsx` - current row-count sheet metrics]
- [Source: `nextjs-app/components/custom/settings/SettingsModal.tsx`, `SettingsModalRoot.tsx`, `SettingsContext.tsx` - current Settings modal wiring]
- [Source: `nextjs-app/components/custom/onboarding/OnboardingGate.tsx` and `lib/constants/onboarding.ts` - localStorage/cross-tab pattern]

## Dev Agent Record

### Agent Model Used

Codex GPT-5

### Debug Log References

- 2026-07-27 create-story pass: story authored from state YAML, planning artifacts, design docs,
  current code surfaces, previous Story 12.6/12.8/12.9/12.10/12.13 contexts, retro notes, and
  deferred-work review.

### Completion Notes List

- Locked deterministic feedback approach to copy-only guidance; no detail open or feedback anchor.
- Locked visual forced states to UX-spec `coach-mark-first` and `coach-mark-middle`.
- Defined exact mobile and desktop anchors against currently mounted Story 12.6/12.9 surfaces.
- Added story-level `screen_id:` markers for both new visual states.

### File List

- `_bmad-output/implementation-artifacts/12-11-first-run-coach-mark-guide-map-legend-feature-tour.md`

## Story File Audit

| Criterion | Status | Fix Applied |
|---|---|---|
| ACs preserved | pass | ACs and Design Gate copied verbatim from `epics.md` Story 12.11. |
| Design gate criteria | pass | Visual, behaviour, animation, and visual-validation gates are present and expanded into implementation/test tasks. |
| Task sequencing | pass | Tasks run baseline/source checks, anchors, guide UI, persistence/Settings, forced states, accessibility/copy, contract preservation, then verification. |
| No invented requirements | pass | Added constraints only refine existing PRD/UX/QA/story inputs; copy-only feedback path is selected from the epic's allowed options and state YAML. |
| File impact list | pass | Lists the likely UI, context, copy, route-map, reference-log, and test files without API/schema scope. |
| Doc references | pass | Includes AGENTS, project-context, epics, PRD, UX, architecture, QA, DESIGN, retro, deferred work, previous stories, and current source files. |
| Test gate | pass | Matches repo commands, requires a11y/a11y-mobile, Playwright, visual validation through the Windows wrapper, and story-review gate usage. |

All checks pass, story ready for dev.
