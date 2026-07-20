---
baseline_commit: NO_VCS
---

# Story 12.9: Mobile Bottom-Sheet Row-Quantized Drag + Slim Time-Slider

Status: ready-for-dev

## Story

As a **mobile user**,
I want to drag the venue sheet up and down and have it settle one venue row at a time —
all the way down to just the handle — with no map gap, and a slimmer time slider,
So that I control exactly how much of the list I see and the mobile map feels tight.

## Source Context (Verbatim From Epic)

_Context (2026-07-08, maintainer decision):_ Story 11.3's sheet is close, but the snap
model is still wrong: it translates fixed-height sheets, leaving a visible map gap while
dragging, and it jumps between peek/mid/full rather than tracking visible venue rows. The
maintainer wants the sheet bottom anchored to the 52 px nav bar, height-driven while the
finger moves, and row-quantized at rest. The same cleanup trims the mobile time slider's
vertical padding. The old Claude prototype, project-context route note, and capture recipe
still describe the fixed `mid` snap and are stale for this screen; the revised UX spec and
the ACs below are the controlling source for Story 12.9.

## Acceptance Criteria (Verbatim From Epic)

**Given** old fixed-height snaps translated by CSS transform  
**When** re-driven by **height/max-height/bottom** so bottom stays pinned to the 52 px nav
anchor and height follows finger  
**Then** no bare map gap at drag positions/velocity incl notched safe-area

**Given** maintainer wants one-row control  
**When** snaps to whole venue-row increments: height = handle + persistent chrome above list
(`VenueListControls + MobileTagChips`, shown once `N >= 1`) + `N × rowHeight`, N 0..maxRows,
header/chrome separate term  
**Then** downward crosses one fewer row, upward one more, slow drag walks, fling honours
velocity, `rowHeight` derived from actual rendered row variant; current sheet uses compact
cards only in peek and taller non-compact once expanded so model must either use compact
cards consistently or measure real variant. No half-clipped row.

**Given** N=0 reachable by dragging visible list not just handle  
**When** user drags down on venue row/handle past last row  
**Then** collapses to handle-only and drags up reveals rows. Old `bodyBind if (!isFull)
return` removed; scroll-vs-drag: drag moves sheet while list at `scrollTop===0`, else list
scrolls.

**Given** maxRows must not overflow  
**When** content needs more rows than fit  
**Then** maxRows caps at tallest height clearing top chrome; beyond that list scrolls
internally; controls/chips re-gated on row-count/height e.g. N>=1; including
`computeRecenterPadding` and tests migrating from `MobileBottomSheetState` hardcoded snap
heights to row-count height.

**Given** mobile slider panel stacks pt-5 + min-h-12 pt-4  
**When** `TimeSliderPanel.tsx:56 pt-5 -> pt-3` and `TimeSlider.tsx:129 min-h-12 pt-4 ->
min-h-11 pt-3` mobile-only  
**Then** ~16px reclaimed, badge still clears, panel slimmer mobile, desktop unchanged.

**Given** keyboard ArrowUp/ArrowDown  
**When** row model lands  
**Then** keyboard preserved mapped one row at a time reaching 0/max with focus and accessible
announcement.

**Design Gate Criteria:**
- Visual: No bare-map gap at any drag position; rows never half-clipped at rest; slimmer
  mobile slider; desktop unchanged
- Behaviour: Sheet settles one row at a time from 0 to max; drag from list row works;
  internal scroll past max; drag follows finger
- Animation: Drag tracks 1:1; row-snap settle uses gentle spring honoring reduced motion;
  no entrance flash
- Visual validation: Mobile sheet at several row counts (0 / 1 / a few / max) + mid-drag
  frame, and slim slider, vs a rebaselined reference pass

## Knock-On Test Migration (Verbatim From Epic)

This replaces the four-snap sheet from Story 11.3 and must migrate:

1. touch-gesture e2e `epic-11-sheet-touch-gestures.spec.ts` from snap-name to row-count
   assertions incl row-start drag and keyboard ladder to 0/back
2. `test/e2e/map-primary.spec.ts` data-state peek/mid/full assertions
3. `?_state=map-panel-venues` forced state re-map and Screen ID/`use-forced-state`
4. `computeRecenterPadding`

## Pre-Implementation Dependency Gate

Start with these checks before editing:

1. From `nextjs-app/`, run `npx tsc --noEmit` and `npx eslint . --quiet`. Stop for
   unrelated failures instead of hiding them with ignores or local shims.
2. Confirm the branch contains the already-created Epic 12 presentation contracts:
   Story 12.6's public sunny/not-sunny predicate, Story 12.13's no-user-facing-confidence
   contract, and Story 12.12's final venue photo contract. This story must preserve those
   surfaces while changing sheet mechanics.
3. Confirm the current screen-reference situation before capture work:
   `project-context.md` still describes `map-panel-venues` as the old partial-list/`mid`
   snap; `nextjs-app/docs/design/references/claude-design/project/src/BottomSheet.jsx`
   uses fixed `PEEK=120`, `MID=320`, `FULL=620`; and
   `nextjs-app/scripts/capture-claude-design-refs.mjs` still clicks the prototype sheet
   handle. Treat those as stale inputs, not implementation requirements.
4. Do not introduce a new package, map API, database/API route, Supabase read, premium
   state, or server/client boundary shortcut. This is a frontend interaction and visual
   reference story.
5. Do not directly edit `_bmad-output/implementation-artifacts/sprint-status.yaml` to move
   implementation to `review`; use `.\scripts\run-sh.ps1 scripts/story-review.sh
   12-9-mobile-bottom-sheet-row-quantized-drag-slim-time-slider` after gates pass.

## Tasks / Subtasks

- [ ] **Task 0 - Reconfirm sources, seams, and baseline** (AC: all)
  - [ ] Run the required baseline checks from `nextjs-app/`: `npx tsc --noEmit` and
    `npx eslint . --quiet`.
  - [ ] Read `AGENTS.md`, `project-context.md`, `nextjs-app/docs/design/DESIGN.md`,
    `_bmad-output/planning-artifacts/ux-design-specification.md`,
    `_bmad-output/planning-artifacts/architecture.md`,
    `_bmad-output/qa/epic-12-test-design-2026-07-12.md`, `REBASELINE-LOG.md`, the Claude
    Design README/`STATE-MAPPING.md`/`BottomSheet.jsx`, and the current source/test files
    named in "Current Implementation Facts".
  - [ ] Verify `map-panel-venues` is the only active mobile visual reference owned by this
    story; no desktop `map-panel-venues` reference exists, so desktop coverage is a
    `map-primary`/layout regression check rather than a new desktop sheet baseline.
  - [ ] Record current package versions if they changed from creation-time evidence:
    `@use-gesture/react ^10.3.1`, `motion ^12.38.0`, `maplibre-gl ^5.23.0`, `next ^16.2.2`.

- [ ] **Task 1 - Replace fixed snap state with a row-count sheet contract** (AC: 1, 2, 3, 4, 6)
  - [ ] Replace `MobileBottomSheetState = 'collapsed' | 'peek' | 'mid' | 'full' |
    'dismissed'` for the venue-list sheet with a row-count model such as `visibleRows`
    (`N`) plus `maxRows`; retain a non-list/dismissed concept only if a real caller needs
    it.
  - [ ] Drive the sheet by `height`/`max-height` and `bottom-[var(--size-mobile-nav-h)]`;
    remove resting/dragging `translateY` mechanics that expose bare map behind the sheet.
    During drag, the bottom edge remains pinned above the 52 px nav bar including
    `env(safe-area-inset-bottom)` devices.
  - [ ] Expose deterministic test hooks, for example `data-visible-rows`, `data-max-rows`,
    `data-row-height`, `data-sheet-height`, and `data-dragging`, so unit/E2E/visual capture
    can assert the row model without reading private React state.
  - [ ] Measure the actual rendered venue row variant with `ResizeObserver`/layout
    measurement or render a single compact/non-compact card variant consistently across
    all `N`. Do not compute row height from the old `peek`/`mid`/`full` tokens while
    rendering a different row size.
  - [ ] Treat handle strip and persistent chrome separately from rows. `VenueListControls`
    and `MobileTagChips` render once `N >= 1`; at `N=0`, the sheet is handle-only and body
    content is hidden/inert to pointer and assistive tech.
  - [ ] Compute `maxRows` from the available viewport height after safe-area, the 52 px
    mobile nav, top chrome, time-slider/search chrome, and measured row/chrome heights.
    Cap `N` at `maxRows`; rows beyond the cap scroll inside the list body.
  - [ ] Preserve keyboard support: ArrowUp increments one row, ArrowDown decrements one
    row, both saturate at `0..maxRows`, focus remains visible, and an `aria-live` or
    equivalent status announces the current visible-row count/range.

- [ ] **Task 2 - Make drag, fling, scroll, and reduced-motion behavior row-aware** (AC: 1, 2, 3, 4, 6; Design Gate)
  - [ ] Keep `@use-gesture/react` `useDrag` axis-filtered to vertical intent and derive
    release decisions from accumulated movement sign plus velocity. Do not regress the
    Epic 11 finding that `direction` can be `0` at release.
  - [ ] Do not force `pointer: { touch: true }`; the current project convention relies on
    pointer events unless a browser-specific defect proves otherwise.
  - [ ] Let drag track finger height 1:1 during the gesture, then settle to the nearest
    whole row; slow drags walk one row at a time and flings may skip rows only when velocity
    clearly warrants it.
  - [ ] Bind body/list drag even when not full: dragging down from a visible venue row at
    `scrollTop === 0` moves the sheet toward `N=0`; when the list body has `scrollTop > 0`,
    the list scrolls instead of stealing the gesture.
  - [ ] Use Motion's gentle spring for settle and honor `prefers-reduced-motion` by
    disabling spring/height animation while keeping the final row count identical.
  - [ ] If touching `TimeSlider` pointer handlers, close or explicitly preserve the existing
    low-risk deferrals: keyboard commits during an unreleased pointer drag can leave stale
    `dragValue`, and lost pointer capture can leave `isDraggingRef` stuck. Do not mix an
    incomplete slider gesture refactor into the sheet work.

- [ ] **Task 3 - Rewire MapView and map-control obstruction state to rows** (AC: 2, 3, 4, 6)
  - [ ] Replace `MapView`'s `mobileSheetState` enum state and old `setMobileSheetState('mid' |
    'peek' | 'full')` call sites with row-count state. The default/few-row visual state
    should be `N=3` clamped to `maxRows`, matching the revised UX forced-state contract.
  - [ ] Replace `mobileSheetState !== 'peek'` gates with row-count gates: controls and
    chips show for `N >= 1`; card compactness/animation is either independent of `N` or
    intentionally tied to a measured row variant, never to old snap names.
  - [ ] Preserve the UX behavior that selecting a venue from the list does not collapse the
    row-quantized sheet back to the old peek snap. If the implementation chooses to adjust
    rows on selection, make that a deterministic row-count rule and cover it in tests.
  - [ ] Update `MapControls` to accept current row-sheet obstruction data instead of
    `MobileBottomSheetState`, while preserving Story 11.5's invariant that obstruction refs
    are read at locate/fly time and do not cause a refly on sheet changes.
  - [ ] Update `MOBILE_PLANNER_HEIGHT_PX` or equivalent quick-info/top-panel clearance math
    after the mobile slider loses ~16 px. Keep desktop navbar/panel offsets unchanged.

- [ ] **Task 4 - Migrate recenter padding away from snap constants** (AC: 4)
  - [ ] Replace `computeRecenterPadding({ mobileSheetState })` with an input based on the
    actual row-model obstruction, for example measured `mobileSheetHeightPx` plus mobile
    nav height, or `visibleRows` + measured row/chrome metrics.
  - [ ] Remove `SHEET_COVER_H` dependence on `peek`/`mid`/`full` for mobile list recenter.
    Desktop left/right padding behavior remains unchanged.
  - [ ] Keep padding finite, non-negative, and bounded. If map/canvas dimensions are
    available at the call site, clamp bottom/top padding against the actual canvas so the
    inherited high-priority recenter-clamp deferral is resolved rather than carried forward.
    If the clamp cannot be safely added in this story, document why and preserve the
    deferred-work item.
  - [ ] Update `test/unit/utils/recenter-padding.test.ts` so it proves row-count/height
    padding, handle-only `N=0`, max-row cap behavior, desktop non-regression, and no
    phantom bottom padding on desktop.

- [ ] **Task 5 - Slim the mobile TimeSlider panel only** (AC: 5; Design Gate)
  - [ ] In `TimeSliderPanel.tsx`, change the mobile panel class from `pt-5` to `pt-3` while
    leaving the desktop `px-6 py-3` branch unchanged.
  - [ ] In `TimeSlider.tsx`, change the top-panel row from `min-h-12 pt-4` to
    `min-h-11 pt-3`. Confirm this only affects the mobile top-panel usage and does not
    shrink the desktop/detail slider variants.
  - [ ] Confirm the current time badge still clears the thumb/track and remains accessible,
    with no raw pixel nudges or non-token Tailwind colors.
  - [ ] Add focused tests that assert the new mobile classes and desktop unchanged branch.

- [ ] **Task 6 - Update forced states, visual references, and stale docs/capture recipes** (AC: 1, 2, 4; Design Gate)
  - [ ] Update `project-context.md` Screen ID -> Route Map for `map-panel-venues` from the
    old partial-list/`mid` snap wording to the row-count contract, using
    `/?_state=map-panel-venues&_time=14:00` and `N=3` complete rows unless viewport
    constraints reduce `maxRows`.
  - [ ] Update `nextjs-app/docs/dev/state-forcing.md`, `use-forced-state` consumers, and
    `MapView` forced-state handling so `?_state=map-panel-venues` asserts the row model
    before capture. Prefer URL-readable variants for candidate capture, e.g.
    `_sheetRows=0|1|3|max` and a controlled mid-drag fixture if this can be implemented
    without shipping user-visible debug controls.
  - [ ] Update or explicitly de-authorize the stale Claude capture recipe for
    `map-panel-venues`. The old prototype `BottomSheet.jsx` fixed-snap click sequence must
    not overwrite the implementation-driven row-count reference.
  - [ ] Add `screen_id: map-panel-venues` evidence markers in the Dev Agent Record so
    `scripts/story-review.sh` can discover the visual gate.
  - [ ] Capture candidate evidence for mobile row counts `N=0`, `N=1`, `N=3`/few, `N=max`,
    a mid-drag frame, and the slim slider. Promote only the canonical mapped reference after
    explicit human approval; keep extra candidates as validation artifacts unless the route
    map is deliberately extended.
  - [ ] If any reference PNG or capture recipe changes, update
    `nextjs-app/docs/design/references/REBASELINE-LOG.md` in the same operation with source
    paths, route, viewport, DOM-state assertions, before/after hashes, and approval status.
    A stale-reference mismatch is a rebaseline decision, not permission to make the
    implementation match the old prototype.

- [ ] **Task 7 - Rewrite focused automated coverage and browser gates** (AC: all; Design Gate)
  - [ ] Rewrite `test/components/MobileBottomSheet.test.tsx` around row counts, measured
    row/chrome terms, `N=0` inert body, `N>=1` controls/chips, keyboard ladder, reduced
    motion, no transform gap, maxRows/internal scroll, and deterministic data attributes.
  - [ ] Rewrite `test/e2e/epic-11-sheet-touch-gestures.spec.ts` from snap-name assertions
    to row-count assertions, including handle-origin drag, row-origin drag at `scrollTop=0`,
    internal scroll when above top, fling direction/velocity, keyboard to `0` and back, and
    touch project execution.
  - [ ] Update `test/e2e/map-primary.spec.ts` and any `data-state="peek|mid|full"` callers
    to assert row-count state, forced-state `map-panel-venues`, no clipped rows at rest, no
    bare-map gap during drag, desktop unchanged, and slim mobile slider.
  - [ ] Add/update `TimeSliderPanel` and `TimeSlider` component tests for the mobile padding
    change and desktop non-regression.
  - [ ] Preserve Epic 11/12 request-count behavior. If row/slider changes touch planner or
    selected-minute wiring, run the same-date scrub zero-fetch/date-change exactly-one-fetch
    specs and keep API access through hooks/routes only.
  - [ ] Include non-vacuous accessibility coverage for the row-count sheet in both desktop
    and mobile accessibility projects where applicable. Story 12.6/12.13 retro notes showed
    `a11y-mobile` must be explicitly executed; do not rely on a desktop-only axe pass.

- [ ] **Task 8 - Run verification and transition through the review gate** (AC: all; Design Gate)
  - [ ] Focused Vitest during development, for example:
    `npx vitest run test/components/MobileBottomSheet.test.tsx
    test/unit/utils/recenter-padding.test.ts test/components/TimeSlider.test.tsx
    test/components/TimeSliderPanel.test.tsx test/components/MapView.test.tsx`.
  - [ ] Full required local checks from `nextjs-app/`: `npx tsc --noEmit`,
    `npx eslint . --quiet`, and `npx vitest run`. On this Windows host, set
    `VITEST_MAX_WORKERS=4` if the full Vitest suite otherwise times out.
  - [ ] Browser checks covering the changed interactions:
    `npx playwright test test/e2e/epic-11-sheet-touch-gestures.spec.ts --project=touch`,
    `npx playwright test test/e2e/map-primary.spec.ts --project=mobile --project=desktop`,
    and the relevant `--project=a11y --project=a11y-mobile` scenarios. If responsive
    interaction changes leak beyond those files, run the full five-project matrix:
    `npx playwright test --project=mobile --project=desktop --project=touch --project=a11y
    --project=a11y-mobile`.
  - [ ] Visual validation from the repository root after approved/reviewed references are
    in place:
    `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-panel-venues
    '/?_state=map-panel-venues&_time=14:00' mobile`. Add candidate evidence for
    `N=0/1/few/max/mid-drag` even if only `map-panel-venues` is the canonical mapped
    screen.
  - [ ] Run the canonical story gate only when functional, browser, accessibility, visual,
    and rebaseline evidence is complete:
    `.\scripts\run-sh.ps1 scripts/story-review.sh
    12-9-mobile-bottom-sheet-row-quantized-drag-slim-time-slider`.

## Dev Notes

### Binding Contract Summary

- The mobile venue-list sheet is no longer a four-snap enum. It rests on visible row
  counts `N=0..maxRows` and moves by measured height, not transform.
- `N=0` is handle-only and reachable from the list body as well as the handle. `N>=1`
  renders the filter controls/chips once plus whole venue rows only.
- Backdrop decision: the venue-list row sheet should not use the old full-screen backdrop
  semantics. Keep the map visible/interactable outside the bottom-anchored sheet and prevent
  the sheet itself from exposing gaps; venue-detail/full overlay behavior remains governed
  by the existing detail-sheet contract.
- `map-panel-venues` is redefined as a row-count visual state, normally `N=3` complete
  rows at `/?_state=map-panel-venues&_time=14:00`.
- The old Claude prototype and capture recipe remain useful for overall visual tone but
  are stale for sheet mechanics. Do not copy fixed `PEEK/MID/FULL` behavior back into the
  app.
- Desktop map/list/detail behavior is a regression surface only. This story does not add a
  desktop bottom-sheet variant.

### Current Implementation Facts

- `nextjs-app/components/custom/sheets/MobileBottomSheet.tsx` currently exports
  `MobileBottomSheetState = 'collapsed' | 'peek' | 'mid' | 'full' | 'dismissed'`, uses
  `useDrag`, gates body drag with snap state, renders `data-state`, and selects heights from
  `--size-bottom-sheet-collapsed/peek/mid/full-h`.
- `MobileBottomSheet.tsx` currently animates `y` via `sheetMotionState(...)`, which is the
  core source of the bare-map gap during drag. Story 12.9 should animate height/settle
  instead.
- `nextjs-app/components/custom/map/MapView.tsx` currently initializes
  `mobileSheetState` to `'mid'`; forced `map-panel-venues` also sets `'mid'`; venue
  selection and some list transitions set `'peek'`; controls/chips are gated by
  `mobileSheetState !== 'peek'`; card compactness is tied to `'peek'`; and `MapControls`
  receives the snap enum.
- `MapView.tsx` defines `MOBILE_PLANNER_HEIGHT_PX = 80` to keep top-panel clearance in sync
  with `TimeSliderPanel`. Re-evaluate this after AC5's slimmer mobile slider.
- `nextjs-app/components/custom/map/MapControls.tsx` stores mobile obstruction state in
  refs and reads it only at geolocation `flyTo` time. Preserve that no-refly invariant while
  changing the obstruction type.
- `nextjs-app/lib/utils/recenter-padding.ts` currently has hardcoded mobile snap cover
  heights: collapsed 68-ish including safe-area approximation, peek 120, mid 320, full 560,
  dismissed 0, plus 52 px mobile nav. This must migrate to row-height/current-height input.
- `nextjs-app/components/custom/time/TimeSliderPanel.tsx` mobile class currently includes
  `pt-5`; desktop class uses `px-6 py-3` and must remain unchanged.
- `nextjs-app/components/composed/time/TimeSlider.tsx` top-panel row currently uses
  `min-h-12 pt-4`; pointer handlers have known conditional deferrals around stale
  `dragValue` and lost pointer capture if the story touches them.
- `nextjs-app/test/components/MobileBottomSheet.test.tsx`,
  `nextjs-app/test/unit/utils/recenter-padding.test.ts`,
  `nextjs-app/test/e2e/epic-11-sheet-touch-gestures.spec.ts`, and
  `nextjs-app/test/e2e/map-primary.spec.ts` intentionally pin the old snap behavior and
  must be rewritten, not preserved.

### UX, Design, and Visual Source Notes

- UX spec §BottomSheet / §Sheet overlay behavior / §Epic 12 forced visual states controls
  this story: row-count sheet, bottom pinned, row drag, internal scroll after max, ArrowUp /
  ArrowDown row count, and `map-panel-venues` as `N=3` complete rows.
- DESIGN.md still documents legacy `size-bottom-sheet-peek-h`, `mid-h`, and `full-h`
  tokens. If implementation removes or repurposes these tokens, update DESIGN.md in the
  same story. If retained for migration/detail surfaces, add a clear note that they no
  longer define the active mobile venue-list sheet.
- Design tokens remain binding. Use existing `@theme` tokens/utilities, shadcn primitives
  where applicable, Motion, and the existing component layering. Do not introduce raw hex,
  ad-hoc pixel spacing, copied prototype CSS, or custom shadows.
- Swedish remains the default for new user-facing/accessibility copy, including row-count
  announcements.
- The `screen_id: map-panel-venues` marker is required in the Dev Agent Record so the
  story-review visual gate can discover the affected reference.

### Latest Technical Notes

- Current `@use-gesture/react` documentation for `useDrag` exposes movement/offset,
  velocity/swipe/tap state and options such as `filterTaps`, `axis`, `preventScroll`,
  `pointer.capture`, `pointer.keys`, and `pointer.touch`. For this project, use vertical
  axis intent and movement/velocity for snap decisions, keep keyboard behavior explicit,
  and do not opt into `pointer.touch: true` unless a verified browser defect requires it.
- `@use-gesture/react` pointer events may be cancelled by normal touch scrolling; that is
  part of the scroll-vs-drag design. The story must decide gesture ownership from the list
  body's `scrollTop` rather than globally preventing scroll.

### Deferred-Work and Retro Notes Folded In

- Story 12.6/12.13 retro notes: run `a11y-mobile` explicitly and avoid vacuous mobile a11y
  evidence; full Vitest on Windows may require `VITEST_MAX_WORKERS=4`.
- Story 12.12 retro note: put explicit `screen_id:` markers in the story record and assert
  forced DOM state before visual capture. Human-style candidate review previously caught a
  wrong loaded-state capture; do not promote row-count screenshots without DOM assertions.
- Epic 11 standing deferral: `computeRecenterPadding` lacks real canvas-size clamping. This
  story touches the exact helper, so resolve the clamp if feasible or leave a precise
  deferred note.
- Epic 11 standing deferrals in `TimeSlider`: if pointer handling is modified, handle
  keyboard commit during in-flight drag and lost pointer capture; if only the class names
  change, explicitly leave those deferrals untouched.
- Epic 11 chip-overflow deferral: if the mobile sheet/chip strip changes overflow behavior,
  preserve or add real-browser proof instead of relying only on jsdom-mocked scroll metrics.

### File Impact Inventory

Expected edits:

- `nextjs-app/components/custom/sheets/MobileBottomSheet.tsx`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/map/MapControls.tsx`
- `nextjs-app/lib/utils/recenter-padding.ts`
- `nextjs-app/components/custom/time/TimeSliderPanel.tsx`
- `nextjs-app/components/composed/time/TimeSlider.tsx`
- `nextjs-app/test/components/MobileBottomSheet.test.tsx`
- `nextjs-app/test/unit/utils/recenter-padding.test.ts`
- `nextjs-app/test/components/TimeSliderPanel.test.tsx`
- `nextjs-app/test/components/TimeSlider.test.tsx`
- `nextjs-app/test/e2e/epic-11-sheet-touch-gestures.spec.ts`
- `nextjs-app/test/e2e/map-primary.spec.ts`
- `project-context.md`
- `nextjs-app/docs/dev/state-forcing.md`
- `nextjs-app/docs/design/references/claude-design/STATE-MAPPING.md`
- `nextjs-app/scripts/capture-claude-design-refs.mjs` or an explicit replacement/retirement
  note for the stale `map-panel-venues` recipe
- `nextjs-app/docs/design/references/REBASELINE-LOG.md` and
  `nextjs-app/docs/design/references/screens/mobile/map-panel-venues.png` after human
  approval if the canonical reference is promoted

Conditional edits:

- `nextjs-app/app/globals.css` and `nextjs-app/docs/design/DESIGN.md` if bottom-sheet tokens
  are renamed, removed, or re-scoped to migration/detail behavior.
- Additional component tests around `MapView` and accessibility if the implementation
  extracts row-sheet helpers or aria-live copy into separate modules.

Not expected:

- API routes, Supabase clients/types, Postgres migrations, weather/solar engine modules,
  middleware, premium/payment code, or new runtime dependencies.

## Testing

- Unit/component:
  - Row-count `MobileBottomSheet` coverage for measured row height, `N=0`, `N=1`, `N=few`,
    `N=max`, keyboard, reduced motion, inert body, scroll-vs-drag, and no old transform
    class dependence.
  - `computeRecenterPadding` row-height/current-height coverage, desktop non-regression, and
    finite/clamped padding.
  - `TimeSliderPanel`/`TimeSlider` class and badge-clearance coverage.
  - `MapView` forced `map-panel-venues` row-count and controls/chips gating coverage where
    component tests already exist.
- Browser:
  - Touch project sheet ladder, row-origin drag, internal scroll, fling, no map gap, and
    keyboard row count.
  - Mobile `map-panel-venues` forced visual state at `N=3` plus candidate captures for
    `N=0/1/max/mid-drag`.
  - Desktop `map-primary` and desktop layout non-regression.
  - `a11y` and `a11y-mobile` executed evidence for the row-count announcement/focus model.
- Full gate before review:
  - `cd nextjs-app && npx tsc --noEmit`
  - `cd nextjs-app && npx eslint . --quiet`
  - `cd nextjs-app && npx vitest run`
  - `cd nextjs-app && npx playwright test --project=mobile --project=desktop --project=touch --project=a11y --project=a11y-mobile` when responsive interaction changes are not fully bounded by focused specs
  - repository root: `.\scripts\run-sh.ps1 scripts/story-review.sh 12-9-mobile-bottom-sheet-row-quantized-drag-slim-time-slider`

## References

- `AGENTS.md`
- `project-context.md`
- `_bmad-output/planning-artifacts/epics.md` — Story 12.9, lines 3966-4074
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/qa/epic-12-test-design-2026-07-12.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/auto-bmad/retro-notes/epic-12.md`
- `nextjs-app/docs/design/DESIGN.md`
- `nextjs-app/docs/design/references/claude-design/README.md`
- `nextjs-app/docs/design/references/claude-design/STATE-MAPPING.md`
- `nextjs-app/docs/design/references/claude-design/project/src/BottomSheet.jsx`
- `nextjs-app/docs/design/references/REBASELINE-LOG.md`
- `nextjs-app/docs/dev/state-forcing.md`
- `nextjs-app/scripts/capture-claude-design-refs.mjs`
- `nextjs-app/components/custom/sheets/MobileBottomSheet.tsx`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/map/MapControls.tsx`
- `nextjs-app/lib/utils/recenter-padding.ts`
- `nextjs-app/components/custom/time/TimeSliderPanel.tsx`
- `nextjs-app/components/composed/time/TimeSlider.tsx`
- `nextjs-app/test/components/MobileBottomSheet.test.tsx`
- `nextjs-app/test/unit/utils/recenter-padding.test.ts`
- `nextjs-app/test/e2e/epic-11-sheet-touch-gestures.spec.ts`
- `nextjs-app/test/e2e/map-primary.spec.ts`
- Context7 `/pmndrs/use-gesture` docs checked 2026-07-20 for `useDrag` state/options

## Story-File Audit

- PASS — ACs and Design Gate copied verbatim from Epic 12.9, including the row-height
  formula, `N=0..maxRows`, `bodyBind` removal, TimeSlider class changes, and visual
  validation requirements.
- PASS — Design gate present and explicitly reconciled against stale prototype/reference
  sources.
- PASS — Tasks are sequenced baseline/source check -> sheet row model -> gestures/scroll ->
  MapView/recenter -> slider -> forced states/rebaseline -> tests/gate.
- PASS — No invented backend/schema/API/dependency requirements; conditional deferred items
  are scoped to seams this story already touches.
- PASS — File impact is realistic and bounded to frontend interaction, visual-state docs,
  references, and tests.
- PASS — References include AGENTS/project context, epic, PRD, architecture, UX, QA,
  DESIGN, Claude reference bundle, current source, tests, deferred work, retro notes, and
  current gesture docs.
- PASS — Test gate matches repository commands, Windows shell wrapper convention, visual
  validation, full Vitest, Playwright mobile/desktop/touch/a11y/a11y-mobile, and the
  canonical story-review transition.
