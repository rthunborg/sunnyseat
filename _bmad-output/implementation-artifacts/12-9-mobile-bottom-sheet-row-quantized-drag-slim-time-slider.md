---
baseline_commit: 5dbaee54c8ea2f50fed267d3b88e5fef6fc43088
---

# Story 12.9: Mobile Bottom-Sheet Row-Quantized Drag + Slim Time-Slider

Status: review

## Story

As a **mobile user**,
I want to drag the venue sheet up and down and have it settle one venue row at a time —
all the way down to just the handle — with no map gap, and a slimmer time slider,
So that I control exactly how much of the list I see and the mobile map feels tight.

## Source Context (Verbatim From Epic)

_Context (2026-07-08, root-caused + maintainer redesign):_ two mobile issues on the
same surface, plus a redesign of the sheet's drag behaviour.

1. **Drag gap (VERIFIED).** `MobileBottomSheet.tsx` is a fixed-height, bottom-anchored
   panel moved mid-drag by a CSS **transform** (`animate y: dragY`, :181/:303). A
   transform doesn't re-anchor the box, so a drag lifts its bottom edge off the 52px
   nav anchor and a strip of bare map shows through (`bg-surface-cream` paints only
   inside the box; the sheet's sibling is `<MapContainer/>`). This is fixed for free by
   the redesign below (height-driven drag pins the box bottom to the anchor).
2. **Snap model → ROW-QUANTIZED (MAINTAINER DECISION 2026-07-08).** Replace the four
   fixed snaps (collapsed/peek/mid/full, `globals.css:207-210`) with a continuous,
   **one-row-at-a-time** model: the sheet height = the handle + **N visible venue
   rows**, and it snaps to whole-row increments. Dragging DOWN reveals one fewer row per
   interval, all the way to **0 rows (handle only)**; dragging UP reveals one more row
   per interval, up to a max. This makes the collapse-to-handle reachable by dragging
   the list itself (the current defect — collapse only fired from the 44px handle) AND
   gives granular expansion. It also inherently fixes the gap, because the box is driven
   by height from the pinned bottom anchor, never translated off it.
3. **Time-slider padding too tall.** Two top insets stack on mobile: the panel's
   `pt-5` (20px, `TimeSliderPanel.tsx:56`) + the slider row's `min-h-12 pt-4`
   (`TimeSlider.tsx:129`, 16px badge-reserve). Desktop is a separate branch, so mobile-only.

## Acceptance Criteria (Verbatim From Epic)

**Given** the sheet uses four fixed-height snaps and is translated by a CSS transform
(exposing bare map mid-drag)
**When** it is re-driven by **height** (or a `max-height`/`bottom` offset) so the box
bottom stays pinned to the 52px nav anchor at all times, and the height follows the
finger continuously during a drag
**Then** NO bare map ever shows between the sheet and the nav bar at any drag position
or velocity (incl. notched safe-area devices) — the gap defect is gone

**Given** the maintainer wants one-row-at-a-time control
**When** the sheet snaps to **whole venue-row increments**: height = handle **+ the
persistent chrome above the list (VenueListControls + MobileTagChips, shown once `N ≥ 1`)**
+ `N × rowHeight`, `N` from **0 (handle only)** up to `maxRows` — the header/chrome height
is a SEPARATE term in the formula (or those controls sit outside the measured row area), so
a snap that promises N rows actually shows N un-clipped rows, not chrome eating a row's space
**Then** a downward drag that crosses a row boundary settles showing one FEWER row, and
an upward drag settles showing one MORE row; a slow drag can walk the list open/closed a
row at a time, and a fling honours velocity by snapping to the nearest row boundary in
the flung direction. `rowHeight` is derived from the **actual rendered row variant** (one
source of truth, not a magic number) — NOTE the current sheet uses compact cards only in
peek (`compactCards={mobileSheetState === 'peek'}`) and taller non-compact `VenueCard`s
(extra metadata/tags) once expanded, so the row model must EITHER use compact cards
consistently in the row-count sheet OR measure the real variant that renders at N rows;
deriving from the compact height while rendering non-compact rows would under-size the snap
and still clip. So a row is never half-clipped at a resting snap

**Given** `N = 0` must be reachable by dragging the visible list, not just the handle
**When** the user drags down on a venue ROW (or the handle) past the last row
**Then** the sheet collapses to **handle-only (0 rows)** and stays put; dragging up from
there reveals rows one at a time again. (The old `bodyBind` `if (!isFull) return` no-op
is removed; the scroll-vs-drag rule becomes: drag moves the sheet while the list is at
`scrollTop === 0`, otherwise the list scrolls — standard bottom-sheet behaviour)

**Given** `maxRows` must not overflow the screen
**When** the content needs more rows than fit under the top framing (search bar / safe
area)
**Then** `maxRows` caps at the tallest height that still clears the top chrome; beyond
that the list **scrolls internally** (the sheet doesn't grow further), and the tag
chips / list controls that were gated on the discrete `'peek'` state are re-gated on the
new row-count/height model (e.g. shown once `N ≥ 1`) so nothing depends on the removed
snap enum — INCLUDING `computeRecenterPadding` (+ its tests), which today keys off
`MobileBottomSheetState` and the hard-coded snap heights to keep the locate/recenter fly-to
centered in the unobscured map; it must migrate to the row-count height or the user dot
lands behind/away from the visible map center

**Given** the mobile slider panel stacks 20px + 16px of top padding above a 6px track
**When** `TimeSliderPanel.tsx:56` `pt-5`→`pt-3` and `TimeSlider.tsx:129` `min-h-12 pt-4`
→`min-h-11 pt-3` (mobile-only branches; desktop `px-6 py-3` untouched)
**Then** ~16px is reclaimed, the value badge still clears, and the panel reads slimmer on
mobile with no desktop change

**Given** the current sheet has keyboard ArrowUp/ArrowDown control across the snap ladder
(WCAG 2.1 AA), which the snap enum removal would break
**When** the row-quantized model lands
**Then** keyboard control is PRESERVED, mapped to the new model: ArrowUp/ArrowDown expand/
collapse **one row at a time**, reaching the **0-row handle-only** state and the max, with
a visible focus state and an accessible announcement of the change — no keyboard regression
for the row model

**Design Gate Criteria:**
- **Visual:** No bare-map gap at any drag position; rows are never half-clipped at a
  rest snap; slimmer mobile slider; desktop unchanged
- **Behaviour:** Sheet settles one row at a time from 0 (handle-only) to max; drag from a
  list row works (not just the handle); internal scroll past max; drag follows the finger
- **Animation:** Drag tracks 1:1; the row-snap settle uses a gentle spring honoring
  `prefers-reduced-motion`; no entrance flash
- **Visual validation:** Mobile sheet at several row counts (0 / 1 / a few / max) + a
  mid-drag frame, and the slim slider, vs a rebaselined reference pass

## Knock-On Test Migration (Verbatim From Epic)

> **Note:** this replaces the four-snap sheet from Story 11.3, and the snap names are
> load-bearing beyond one spec — the migration scope includes ALL of: (1) the touch-gesture
> e2e (`epic-11-sheet-touch-gestures.spec.ts`) from snap-name to row-count assertions
> (incl. a spec that drags starting on a venue ROW, not the handle, AND a keyboard spec
> that walks the row ladder to 0-row and back); (2) `test/e2e/map-primary.spec.ts`, which
> asserts `data-state` peek/mid/full throughout (e.g. :153-157, :497-506, :540, :561-585);
> (3) the `?_state=map-panel-venues` forced state, which is DEFINED as the mid snap — remap
> it (and the Screen ID → Route Map / `use-forced-state`) to a row-count equivalent so the
> state-forcing convention and visual-gate captures don't go stale; and (4)
> `computeRecenterPadding` per the AC above.

## Approved Slider/Date Refinement Addendum (2026-07-24)

This post-epic refinement is approved by
`docs/superpowers/specs/2026-07-24-story-12-9-slider-date-refinement-design.md` and
implemented by
`docs/superpowers/plans/2026-07-24-story-12-9-slider-date-refinement.md`. It narrows the
already-scoped mobile time-planner polish without rewriting the original Epic 12.9 ACs.

Additional acceptance record:

- Mobile-only planner chrome at the 390x844 validation viewport measures `68-72` CSS px
  and never exceeds `72` CSS px; desktop planner layout, dimensions, and controls remain
  unchanged.
- Mobile slider keeps the tokenized 6px `size-slider-track-h`, uses the visible
  `size-slider-thumb` token, preserves at least a 44x44 CSS px semantic hit target, and
  keeps the live `HH:MM` badge in a separate vertical lane above the thumb.
- Mobile next-day shortcut is removed. The mobile date area is one 44px-min Calendar +
  selected-date trigger with no chevron/disclosure icon, visible interaction/focus states,
  `aria-haspopup="dialog"`, live `aria-expanded`, and focus restoration after all dialog
  close paths.
- Data flow remains through `TimeContext` and the existing `DatePickerDialog`/planner
  helpers. Date change calls the existing date-selection path once; closing without a date
  change leaves selected date, query key, and request count unchanged.
- Existing row-sheet Story 12.9 behavior and evidence remain binding: `N=0`, `N=3`,
  `N=max`, mid-drag, keyboard ladder, no map gap, and internal scroll past max.
- New slider/date candidate evidence is non-authoritative until human approval and must
  embed inline images; no canonical PNG is promoted without approval.

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

- [x] **Task 0 - Reconfirm sources, seams, and baseline** (AC: all)
  - [x] Run the required baseline checks from `nextjs-app/`: `npx tsc --noEmit` and
    `npx eslint . --quiet`.
  - [x] Read `AGENTS.md`, `project-context.md`, `nextjs-app/docs/design/DESIGN.md`,
    `_bmad-output/planning-artifacts/ux-design-specification.md`,
    `_bmad-output/planning-artifacts/architecture.md`,
    `_bmad-output/qa/epic-12-test-design-2026-07-12.md`, `REBASELINE-LOG.md`, the Claude
    Design README/`STATE-MAPPING.md`/`BottomSheet.jsx`, and the current source/test files
    named in "Current Implementation Facts".
  - [x] Verify `map-panel-venues` is the only active mobile visual reference owned by this
    story; no desktop `map-panel-venues` reference exists, so desktop coverage is a
    `map-primary`/layout regression check rather than a new desktop sheet baseline.
  - [x] Record current package versions if they changed from creation-time evidence:
    `@use-gesture/react ^10.3.1`, `motion ^12.38.0`, `maplibre-gl ^5.23.0`, `next ^16.2.2`.

- [x] **Task 1 - Replace fixed snap state with a row-count sheet contract** (AC: 1, 2, 3, 4, 6)
  - [x] Replace `MobileBottomSheetState = 'collapsed' | 'peek' | 'mid' | 'full' |
    'dismissed'` for the venue-list sheet with a row-count model such as `visibleRows`
    (`N`) plus `maxRows`; retain a non-list/dismissed concept only if a real caller needs
    it.
  - [x] Drive the sheet by `height`/`max-height` and `bottom-[var(--size-mobile-nav-h)]`;
    remove resting/dragging `translateY` mechanics that expose bare map behind the sheet.
    During drag, the bottom edge remains pinned above the 52 px nav bar including
    `env(safe-area-inset-bottom)` devices.
  - [x] Expose deterministic test hooks, for example `data-visible-rows`, `data-max-rows`,
    `data-row-height`, `data-sheet-height`, and `data-dragging`, so unit/E2E/visual capture
    can assert the row model without reading private React state.
  - [x] Measure the actual rendered venue row variant with `ResizeObserver`/layout
    measurement or render a single compact/non-compact card variant consistently across
    all `N`. Do not compute row height from the old `peek`/`mid`/`full` tokens while
    rendering a different row size.
  - [x] Treat handle strip and persistent chrome separately from rows. `VenueListControls`
    and `MobileTagChips` render once `N >= 1`; at `N=0`, the sheet is handle-only and body
    content is hidden/inert to pointer and assistive tech.
  - [x] Compute `maxRows` from the available viewport height after safe-area, the 52 px
    mobile nav, top chrome, time-slider/search chrome, and measured row/chrome heights.
    Cap `N` at `maxRows`; rows beyond the cap scroll inside the list body.
  - [x] Preserve keyboard support: ArrowUp increments one row, ArrowDown decrements one
    row, both saturate at `0..maxRows`, focus remains visible, and an `aria-live` or
    equivalent status announces the current visible-row count/range.

- [x] **Task 2 - Make drag, fling, scroll, and reduced-motion behavior row-aware** (AC: 1, 2, 3, 4, 6; Design Gate)
  - [x] Keep `@use-gesture/react` `useDrag` axis-filtered to vertical intent and derive
    release decisions from accumulated movement sign plus velocity. Do not regress the
    Epic 11 finding that `direction` can be `0` at release.
  - [x] Do not force `pointer: { touch: true }`; the current project convention relies on
    pointer events unless a browser-specific defect proves otherwise.
  - [x] Let drag track finger height 1:1 during the gesture, then settle to the nearest
    whole row; slow drags walk one row at a time and flings may skip rows only when velocity
    clearly warrants it.
  - [x] Bind body/list drag even when not full: dragging down from a visible venue row at
    `scrollTop === 0` moves the sheet toward `N=0`; when the list body has `scrollTop > 0`,
    the list scrolls instead of stealing the gesture.
  - [x] Use Motion's gentle spring for settle and honor `prefers-reduced-motion` by
    disabling spring/height animation while keeping the final row count identical.
  - [x] If touching `TimeSlider` pointer handlers, close or explicitly preserve the existing
    low-risk deferrals: keyboard commits during an unreleased pointer drag can leave stale
    `dragValue`, and lost pointer capture can leave `isDraggingRef` stuck. Do not mix an
    incomplete slider gesture refactor into the sheet work.

- [x] **Task 3 - Rewire MapView and map-control obstruction state to rows** (AC: 2, 3, 4, 6)
  - [x] Replace `MapView`'s `mobileSheetState` enum state and old `setMobileSheetState('mid' |
    'peek' | 'full')` call sites with row-count state. The default/few-row visual state
    should be `N=3` clamped to `maxRows`, matching the revised UX forced-state contract.
  - [x] Replace `mobileSheetState !== 'peek'` gates with row-count gates: controls and
    chips show for `N >= 1`; card compactness/animation is either independent of `N` or
    intentionally tied to a measured row variant, never to old snap names.
  - [x] Preserve the UX behavior that selecting a venue from the list does not collapse the
    row-quantized sheet back to the old peek snap. If the implementation chooses to adjust
    rows on selection, make that a deterministic row-count rule and cover it in tests.
  - [x] Update `MapControls` to accept current row-sheet obstruction data instead of
    `MobileBottomSheetState`, while preserving Story 11.5's invariant that obstruction refs
    are read at locate/fly time and do not cause a refly on sheet changes.
  - [x] Update `MOBILE_PLANNER_HEIGHT_PX` or equivalent quick-info/top-panel clearance math
    after the mobile slider loses ~16 px. Keep desktop navbar/panel offsets unchanged.

- [x] **Task 4 - Migrate recenter padding away from snap constants** (AC: 4)
  - [x] Replace `computeRecenterPadding({ mobileSheetState })` with an input based on the
    actual row-model obstruction, for example measured `mobileSheetHeightPx` plus mobile
    nav height, or `visibleRows` + measured row/chrome metrics.
  - [x] Remove `SHEET_COVER_H` dependence on `peek`/`mid`/`full` for mobile list recenter.
    Desktop left/right padding behavior remains unchanged.
  - [x] Keep padding finite, non-negative, and bounded. If map/canvas dimensions are
    available at the call site, clamp bottom/top padding against the actual canvas so the
    inherited high-priority recenter-clamp deferral is resolved rather than carried forward.
    If the clamp cannot be safely added in this story, document why and preserve the
    deferred-work item.
  - [x] Update `test/unit/utils/recenter-padding.test.ts` so it proves row-count/height
    padding, handle-only `N=0`, max-row cap behavior, desktop non-regression, and no
    phantom bottom padding on desktop.

- [x] **Task 5 - Slim the mobile TimeSlider panel only** (AC: 5; Design Gate)
  - [x] In `TimeSliderPanel.tsx`, change the mobile panel class from `pt-5` to `pt-3` while
    leaving the desktop `px-6 py-3` branch unchanged.
  - [x] In `TimeSlider.tsx`, change the top-panel row from `min-h-12 pt-4` to
    `min-h-11 pt-3`. Confirm this only affects the mobile top-panel usage and does not
    shrink the desktop/detail slider variants.
  - [x] Confirm the current time badge still clears the thumb/track and remains accessible,
    with no raw pixel nudges or non-token Tailwind colors.
  - [x] Add focused tests that assert the new mobile classes and desktop unchanged branch.

- [x] **Task 6 - Update forced states, visual references, and stale docs/capture recipes** (AC: 1, 2, 4; Design Gate)
  - [x] Update `project-context.md` Screen ID -> Route Map for `map-panel-venues` from the
    old partial-list/`mid` snap wording to the row-count contract, using
    `/?_state=map-panel-venues&_time=14:00` and `N=3` complete rows unless viewport
    constraints reduce `maxRows`.
  - [x] Update `nextjs-app/docs/dev/state-forcing.md`, `use-forced-state` consumers, and
    `MapView` forced-state handling so `?_state=map-panel-venues` asserts the row model
    before capture. Prefer URL-readable variants for candidate capture, e.g.
    `_sheetRows=0|1|3|max` and a controlled mid-drag fixture if this can be implemented
    without shipping user-visible debug controls.
  - [x] Update or explicitly de-authorize the stale Claude capture recipe for
    `map-panel-venues`. The old prototype `BottomSheet.jsx` fixed-snap click sequence must
    not overwrite the implementation-driven row-count reference.
  - [x] Add `screen_id: map-panel-venues` evidence markers in the Dev Agent Record so
    `scripts/story-review.sh` can discover the visual gate.
  - [x] Capture candidate evidence for mobile row counts `N=0`, `N=1`, `N=3`/few, `N=max`,
    a mid-drag frame, and the slim slider. Promote only the canonical mapped reference after
    explicit human approval; keep extra candidates as validation artifacts unless the route
    map is deliberately extended.
  - [x] If any reference PNG or capture recipe changes, update
    `nextjs-app/docs/design/references/REBASELINE-LOG.md` in the same operation with source
    paths, route, viewport, DOM-state assertions, before/after hashes, and approval status.
    A stale-reference mismatch is a rebaseline decision, not permission to make the
    implementation match the old prototype.

- [x] **Task 7 - Rewrite focused automated coverage and browser gates** (AC: all; Design Gate)
  - [x] Rewrite `test/components/MobileBottomSheet.test.tsx` around row counts, measured
    row/chrome terms, `N=0` inert body, `N>=1` controls/chips, keyboard ladder, reduced
    motion, no transform gap, maxRows/internal scroll, and deterministic data attributes.
  - [x] Rewrite `test/e2e/epic-11-sheet-touch-gestures.spec.ts` from snap-name assertions
    to row-count assertions, including handle-origin drag, row-origin drag at `scrollTop=0`,
    internal scroll when above top, fling direction/velocity, keyboard to `0` and back, and
    touch project execution.
  - [x] Update `test/e2e/map-primary.spec.ts` and any `data-state="peek|mid|full"` callers
    to assert row-count state, forced-state `map-panel-venues`, no clipped rows at rest, no
    bare-map gap during drag, desktop unchanged, and slim mobile slider.
  - [x] Add/update `TimeSliderPanel` and `TimeSlider` component tests for the mobile padding
    change and desktop non-regression.
  - [x] Preserve Epic 11/12 request-count behavior. If row/slider changes touch planner or
    selected-minute wiring, run the same-date scrub zero-fetch/date-change exactly-one-fetch
    specs and keep API access through hooks/routes only.
  - [x] Include non-vacuous accessibility coverage for the row-count sheet in both desktop
    and mobile accessibility projects where applicable. Story 12.6/12.13 retro notes showed
    `a11y-mobile` must be explicitly executed; do not rely on a desktop-only axe pass.

- [x] **Task 8 - Run verification and transition through the review gate** (AC: all; Design Gate)
  - [x] Focused Vitest during development, for example:
    `npx vitest run test/components/MobileBottomSheet.test.tsx
    test/unit/utils/recenter-padding.test.ts test/components/TimeSlider.test.tsx
    test/components/TimeSliderPanel.test.tsx test/components/MapView.test.tsx`.
  - [x] Full required local checks from `nextjs-app/`: `npx tsc --noEmit`,
    `npx eslint . --quiet`, and `npx vitest run`. On this Windows host, set
    `VITEST_MAX_WORKERS=4` if the full Vitest suite otherwise times out.
  - [x] Browser checks covering the changed interactions:
    `npx playwright test test/e2e/epic-11-sheet-touch-gestures.spec.ts --project=touch`,
    `npx playwright test test/e2e/map-primary.spec.ts --project=mobile --project=desktop`,
    and the relevant `--project=a11y --project=a11y-mobile` scenarios. If responsive
    interaction changes leak beyond those files, run the full five-project matrix:
    `npx playwright test --project=mobile --project=desktop --project=touch --project=a11y
    --project=a11y-mobile`.
  - [x] Visual validation from the repository root after approved/reviewed references are
    in place:
    `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-panel-venues
    '/?_state=map-panel-venues&_time=14:00' mobile`. Add candidate evidence for
    `N=0/1/few/max/mid-drag` even if only `map-panel-venues` is the canonical mapped
    screen.
  - [x] Run the canonical story gate only when functional, browser, accessibility, visual,
    and rebaseline evidence is complete:
    `.\scripts\run-sh.ps1 scripts/story-review.sh
    12-9-mobile-bottom-sheet-row-quantized-drag-slim-time-slider`.

- [x] **Task 9 - Apply approved mobile slider/date refinement** (Addendum: all)
  - [x] Apply the approved mobile-only planner refinement from
    `docs/superpowers/specs/2026-07-24-story-12-9-slider-date-refinement-design.md` and
    `docs/superpowers/plans/2026-07-24-story-12-9-slider-date-refinement.md` without
    expanding scope into desktop planner layout, date-dialog design, row-snap model,
    onboarding, or hydration cleanup.
  - [x] Keep the mobile top planner panel within the `68-72` CSS px contract at the
    390x844 validation viewport, preserve the 6px token track, token-sized visible thumb,
    44x44 slider hit target, and badge/thumb vertical clearance.
  - [x] Replace the mobile next-day shortcut with the Calendar + selected-date trigger,
    preserving dialog semantics, focus restoration, and request-count invariants.
  - [x] Migrate focused component/E2E/source-contract coverage for the new mobile date
    trigger and calendar date-selection path while keeping desktop next-day unchanged.
  - [x] Capture the approved slider/date candidate evidence with inline Markdown images;
    promote only the human-approved ordinary mobile references and retain max-row/mid-drag
    variants as supporting evidence.

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

Approved 2026-07-24 slider/date refinement additional edits:

- `nextjs-app/test/unit/story-12-9-slider-date-refinement-source-contract.test.ts`
- `nextjs-app/test/e2e/epic-11-scrub-zero-fetch.spec.ts`
- `nextjs-app/test/e2e/story-12-3-persisted-geometry-request-count.atdd.spec.ts`
- `_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/**`
- `nextjs-app/messages/sv/venue.json` and `nextjs-app/messages/en/venue.json` for
  localized planner/date trigger copy touched by the approved refinement

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
- `docs/superpowers/specs/2026-07-24-story-12-9-slider-date-refinement-design.md`
- `docs/superpowers/plans/2026-07-24-story-12-9-slider-date-refinement.md`
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
- `nextjs-app/test/unit/story-12-9-slider-date-refinement-source-contract.test.ts`
- `nextjs-app/test/e2e/epic-11-scrub-zero-fetch.spec.ts`
- `nextjs-app/test/e2e/story-12-3-persisted-geometry-request-count.atdd.spec.ts`
- Context7 `/pmndrs/use-gesture` docs checked 2026-07-20 for `useDrag` state/options

## Story-File Audit

| Criterion | Status | Fix Applied |
|---|---|---|
| ACs preserved | pass | Replaced condensed "verbatim" story sections with the Epic 12.9 source wording. |
| Design gate criteria | pass | Original epic design gate preserved; refinement recorded separately. |
| Task sequencing | pass | Added checked Task 9 for the approved 2026-07-24 slider/date refinement. |
| No invented requirements | pass | Refinement tied to the approved spec and plan only. |
| File impact list | pass | Corrected message paths to `messages/sv/venue.json` and `messages/en/venue.json`; identified `193041.log` as transition artifact and `193948.log` as rerun. |
| Doc references | pass | Added approved refinement spec/plan references; corrected UX canonical PNG paths. |
| Test gate | pass | Kept final recorded gate counts; no tests or story-review rerun performed. |

All seven checks pass, story record ready for review.

## Dev Agent Record

### Implementation Status

- Implementation complete for the row-sheet contract and the 2026-07-24
  slider/date refinement through focused automated checks and fresh candidate
  capture.
- Story status is `review` after the canonical wrapper passed. Rasmus approved
  the ordinary mobile rebaseline on 2026-07-24 with approval text
  `Approved: rebaseline Story 12.9`; the wrapper used explicit manual visual
  acceptance (`VISUAL_VALIDATE_PROVIDER=none`,
  `ALLOW_MANUAL_VISUAL_VALIDATION=1`) rather than claiming an automated visual
  provider result.
- `screen_id: map-panel-venues`
- Approved slider/date candidate evidence:
  `_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/evidence.md`
- Canonical story-review transition artifact:
  `_bmad-output/implementation-artifacts/validation/12-9-mobile-bottom-sheet-row-quantized-drag-slim-time-slider-review-20260724-193041.log`
- Later story-review verification rerun:
  `_bmad-output/implementation-artifacts/validation/12-9-mobile-bottom-sheet-row-quantized-drag-slim-time-slider-review-20260724-193948.log`
- Previous broader row-sheet candidate evidence:
  `_bmad-output/implementation-artifacts/validation/story-12-9-row-sheet-candidates/20260720-161700/evidence.md`
- Invalidated/superseded candidate evidence:
  `_bmad-output/implementation-artifacts/validation/story-12-9-row-sheet-candidates/20260720-150348/evidence.md`
  and
  `_bmad-output/implementation-artifacts/validation/story-12-9-row-sheet-candidates/20260720-160900/evidence.md`

### Completion Notes

- Replaced the mobile venue-list sheet contract with measured `visibleRows` /
  `maxRows` state, bottom-anchored height-driven rendering, handle-only `N=0`,
  inert hidden body content, row-count data attributes, keyboard row ladder, and
  Motion spring settle with reduced-motion direct drag preserved.
- Rewired `MapView`, forced visual state handling, row-sheet source contracts, and
  map recenter/obstruction data around measured sheet height rather than legacy
  `peek/mid/full` snap constants.
- Hid/inerted mobile map controls only when the measured row sheet covers the
  controls stack; max-row and mid-drag candidate assertions now accept this as
  the intended overlap behavior.
- Slimmed the mobile top planner panel to the measured 68 px contract at
  390x844, with a 6 px track, token-sized top-panel thumb, and badge/thumb
  clearance preserved.
- Replaced the mobile next-day pill with a single calendar/date trigger
  (`planner-date-trigger`) that keeps the date label visible, exposes dialog
  state through `aria-haspopup` / `aria-expanded`, and restores focus after
  date selection, Escape, close button, and backdrop close.
- Desktop retained the existing next-day button and desktop panel spacing.
- Migrated request-count browser specs from the removed mobile
  `planner-date-next` seam to calendar date selection so same-date scrub remains
  zero-fetch and date change remains one fetch.
- `OnboardingGate.tsx` was not edited in the 2026-07-24 refinement; inherited
  hydration warnings remain deferred to Story 12.4.
- Updated project state-forcing/Claude reference documentation so the old
  prototype fixed-snap recipe is de-authorized for `map-panel-venues`.
- Captured hardened mobile row-sheet candidates for `N=0`, `N=1`, `N=3`,
  `N=max`, mid-drag, and the original slim-slider/handle-only state; then
  captured the narrower 2026-07-24 slider/date candidate set required by the
  approved refinement plan. After human approval, promoted exactly the two
  ordinary mobile references: `mobile-map-primary-slim-slider-date-pill.png` to
  `mobile/map-primary.png` and `mobile-map-panel-venues-rows-3.png` to
  `mobile/map-panel-venues.png`. `rows-max` and `mid-drag` remain supporting
  evidence only and were not promoted.

### Visual / Rebaseline Notes

- Latest slider/date capture `20260724-slider-date-refinement`:
  - mobile targets: 4 captured, 0 failed
  - captured variants: `map-primary/slim-slider-date-pill`,
    `map-panel-venues/rows-3`, `map-panel-venues/rows-max`, and
    `map-panel-venues/mid-drag`
  - measured planner height: 68 px; track height: 6 px; top-panel thumb:
    14.09375 px; badge/thumb clearance: 5.953125 px
  - mobile date trigger: one calendar icon, visible `Idag` label, no visible
    mobile next-day control, `aria-haspopup="dialog"`, and
    `aria-expanded="false"` at rest
  - product errors observed by capture helper: 0 console errors, 0 page errors,
    0 HTTP >=400 responses, 0 failed requests
- Human-approved reference promotion:
  - approval: `Approved: rebaseline Story 12.9` on 2026-07-24
  - promoted ordinary candidates:
    `mobile-map-primary-slim-slider-date-pill.png` SHA-256
    `3a3beb45f26229c87cf4106e775748a30cf24d3644ee604024e12acd2161392a`
    -> `nextjs-app/docs/design/references/screens/mobile/map-primary.png`
  - `mobile-map-panel-venues-rows-3.png` SHA-256
    `ea182e52412071c0588d78952e168206c0060b689fdcab8a42ecae78829cd1d3`
    -> `nextjs-app/docs/design/references/screens/mobile/map-panel-venues.png`
  - supporting evidence retained, not promoted:
    `mobile-map-panel-venues-rows-max.png` SHA-256
    `cb91ee8fde17c16151623911fe362a55ba5f2ba3ef0d61d6e425b730bbf819f6`
    and `mobile-map-panel-venues-mid-drag.png` SHA-256
    `68fdb158f749a1da6cacc5df36f805d45e6f0e3c8446f6fa21019da94e0700ad`
- Previous row-sheet capture `20260720-161700`:
  - mobile targets: 6 captured, 0 failed
  - desktop canonical regression target: 1 assertion-failed
- The desktop failure is a pageError hydration mismatch from `OnboardingGate` on
  canonical `/?_time=16:30`, without `_state=map-panel-venues`, `_sheetRows`, or
  `_sheetDrag`. It was reproduced in the earlier `20260720-160900` run before
  any onboarding experiment and is inherited Story 12.4 console/hydration cleanup
  scope. Story 12.9 did not absorb that fix.
- Visual validation was accepted through the documented manual path during the
  canonical wrapper run because human approval was already recorded. No max-row
  or mid-drag candidate was promoted over a canonical reference.

### Test-First / Debug Notes

- Added RED/GREEN coverage for production-inert `_sheetRows` / `_sheetDrag`
  params, mid-drag body height, measured mobile planner clearance, real Motion
  spring settle, reduced-motion direct drag, first-paint sheet measurement,
  measured map-control overlap, real-touch row-origin collapse, scrolled-list
  ownership, deterministic sub-row fling, max-row keyboard saturation, and
  non-vacuous mobile axe coverage.
- Raw CDP sub-row touch flick was not stable enough below one row on this host;
  the fling seam is covered through a deterministic native pointer release
  against the real sheet handle while full touch-row walking remains covered by
  the touch project.
- Added RED/GREEN coverage for the 2026-07-24 slider/date refinement: mobile
  panel height and padding, top-panel slider token geometry, badge/thumb
  clearance, calendar trigger semantics, focus restoration after dialog closes,
  and source contracts proving mobile request-count specs no longer drive
  `planner-date-next`.

### Verification Evidence

- `npx vitest run test/components/MobileBottomSheet.test.tsx test/components/MapControls.test.tsx test/unit/story-12-9-row-sheet-source-contract.test.ts test/components/MapView.test.tsx test/components/TimeSliderPanel.test.tsx test/components/TimeSlider.test.tsx test/unit/utils/recenter-padding.test.ts`
  — 7 files passed, 161 tests passed.
- `npx vitest run test/components/OnboardingGate.test.tsx test/components/OnboardingGate.synchronous.atdd.test.tsx test/components/OnboardingGateSessionLatch.test.tsx`
  — 3 files passed, 24 tests passed.
- 2026-07-24 baseline before refinement edits: `npx tsc --noEmit` — passed;
  `npx eslint . --quiet` — passed.
- `npx vitest run test/components/TimeSlider.test.tsx test/components/TimeSliderPanel.test.tsx test/components/DatePickerDialog.test.tsx test/components/DatePickerDialog.today-window.atdd.test.tsx test/unit/story-12-9-slider-date-refinement-source-contract.test.ts`
  — 5 files passed, 23 tests passed.
- `$env:VITEST_MAX_WORKERS='1'; npx vitest run test/unit/services/sun-engine.test.ts test/unit/api/venues-route-real-engine.test.ts`
  — 2 files passed, 42 tests passed; this was the focused rerun of the three
  real-engine tests that timed out under the full parallel suite.
- `npx playwright test test/e2e/map-primary.spec.ts --project=mobile`
  — 17 passed, 5 desktop-only skipped; inherited OnboardingGate hydration warning
  observed in web-server logs.
- `npx playwright test test/e2e/map-primary.spec.ts --project=desktop`
  — 5 passed, 17 mobile-only skipped; inherited OnboardingGate hydration warning
  observed in web-server logs.
- `npx playwright test test/e2e/map-primary.spec.ts --project=mobile --project=desktop`
  — 25 passed, 25 skipped; inherited OnboardingGate hydration warning observed
  in web-server logs.
- `npx playwright test test/e2e/epic-11-scrub-zero-fetch.spec.ts --project=mobile --project=desktop`
  — 4 passed; inherited OnboardingGate hydration warning observed in web-server
  logs.
- `npx playwright test test/e2e/story-12-3-persisted-geometry-request-count.atdd.spec.ts --project=mobile --project=desktop`
  — 4 passed; inherited OnboardingGate hydration warning observed in web-server
  logs.
- `npx playwright test test/e2e/epic-11-slider-touch-drag.spec.ts --project=touch`
  — 1 passed.
- `npx playwright test test/e2e/epic-11-sheet-touch-gestures.spec.ts --project=touch`
  — 7 passed; inherited OnboardingGate hydration warning observed in web-server
  logs.
- `npx playwright test test/e2e/axe-mobile.spec.ts --project=a11y-mobile -g "mobile row-count sheet"`
  — 1 passed.
- `npx playwright test test/e2e/axe-mobile.spec.ts --project=a11y-mobile`
  — 2 passed, 8 skipped.
- `npx playwright test test/e2e/axe.spec.ts --project=a11y`
  — 13 passed, 2 skipped, 1 failed in existing
  `venue photo loaded card, desktop QuickInfo, and detail`: the forced
  `venue-photo-loaded` state supplies a `data:image/webp` URL from
  `components/custom/venue/forced-venue-detail.ts`, while the test expects a
  `/venue-media/test-venue-sunny/.../card.webp` path. A focused rerun of that
  single test reproduced the same failure. This is outside the Story 12.9
  slider/date and row-sheet code path.
- `npx tsc --noEmit` — passed.
- `npx eslint . --quiet` — passed.
- Final explicit gate run: `npx tsc --noEmit` — PASS, exit 0, no diagnostics.
- Final explicit gate run: `npx eslint . --quiet` — PASS, exit 0, no diagnostics.
- Final explicit gate run: `$env:VITEST_MAX_WORKERS='4'; npx vitest run` —
  PASS; 194 files passed, 2 skipped; 1776 tests passed, 15 skipped. Non-failing
  console noise included `Not implemented: navigation to another Document`.
- `node _bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/capture-story-12-9-slider-date-candidates.mjs`
  — 4 captured, 0 failed; regenerated `evidence.md`, `evidence.json`, and four
  candidate PNGs.
- Initial transition gate:
  `_bmad-output/implementation-artifacts/validation/12-9-mobile-bottom-sheet-row-quantized-drag-slim-time-slider-review-20260724-193041.log`
  — PASS, exit 0; lint, typecheck, `npm run test`, manual visual mode with recorded
  approval, and sprint status updated from `in-progress` to `review`. Vitest reported
  194 files passed, 2 skipped; 1776 tests passed, 15 skipped.
- `$env:VISUAL_VALIDATE_PROVIDER='none';
  $env:ALLOW_MANUAL_VISUAL_VALIDATION='1';
  $env:VITEST_MAX_WORKERS='4';
  .\scripts\run-sh.ps1 scripts/story-review.sh
  12-9-mobile-bottom-sheet-row-quantized-drag-slim-time-slider` — later verification
  rerun PASS, exit 0.
  The wrapper reran lint, typecheck, and `npm run test`; Vitest reported the same
  194 files passed, 2 skipped; 1776 tests passed, 15 skipped. Manual visual mode
  was explicitly allowed by the recorded human approval. Validation log:
  `_bmad-output/implementation-artifacts/validation/12-9-mobile-bottom-sheet-row-quantized-drag-slim-time-slider-review-20260724-193948.log`.

### File List

- `project-context.md`
- `nextjs-app/docs/dev/state-forcing.md`
- `nextjs-app/docs/design/references/claude-design/STATE-MAPPING.md`
- `nextjs-app/docs/design/references/REBASELINE-LOG.md`
- `nextjs-app/docs/design/references/screens/mobile/map-primary.png`
- `nextjs-app/docs/design/references/screens/mobile/map-panel-venues.png`
- `nextjs-app/scripts/capture-claude-design-refs.mjs`
- `nextjs-app/components/custom/sheets/MobileBottomSheet.tsx`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/map/MapControls.tsx`
- `nextjs-app/lib/utils/recenter-padding.ts`
- `nextjs-app/components/custom/time/TimeSliderPanel.tsx`
- `nextjs-app/components/composed/time/TimeSlider.tsx`
- `nextjs-app/components/custom/onboarding/OnboardingGate.tsx` — inherited
  working-tree diff is out of Story 12.9 scope and remains unstaged for Story
  12.4; Story 12.9 did not claim or retain an onboarding hydration fix.
- `nextjs-app/messages/sv/venue.json`
- `nextjs-app/messages/en/venue.json`
- `nextjs-app/test/components/MobileBottomSheet.test.tsx`
- `nextjs-app/test/components/MapControls.test.tsx`
- `nextjs-app/test/components/MapView.test.tsx`
- `nextjs-app/test/components/TimeSliderPanel.test.tsx`
- `nextjs-app/test/components/TimeSlider.test.tsx`
- `nextjs-app/test/unit/utils/recenter-padding.test.ts`
- `nextjs-app/test/unit/story-12-9-row-sheet-source-contract.test.ts`
- `nextjs-app/test/unit/story-12-9-slider-date-refinement-source-contract.test.ts`
- `nextjs-app/test/e2e/epic-11-scrub-zero-fetch.spec.ts`
- `nextjs-app/test/e2e/epic-11-sheet-touch-gestures.spec.ts`
- `nextjs-app/test/e2e/epic-11-slider-touch-drag.spec.ts`
- `nextjs-app/test/e2e/map-primary.spec.ts`
- `nextjs-app/test/e2e/story-12-3-persisted-geometry-request-count.atdd.spec.ts`
- `nextjs-app/test/e2e/axe-mobile.spec.ts`
- `_bmad-output/implementation-artifacts/validation/story-12-9-row-sheet-candidates/20260720-151908/capture-story-12-9-candidates.mjs`
- `_bmad-output/implementation-artifacts/validation/story-12-9-row-sheet-candidates/20260720-150348/evidence.md`
- `_bmad-output/implementation-artifacts/validation/story-12-9-row-sheet-candidates/20260720-160900/evidence.md`
- `_bmad-output/implementation-artifacts/validation/story-12-9-row-sheet-candidates/20260720-161700/evidence.md`
- `_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/capture-story-12-9-slider-date-candidates.mjs`
- `_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/evidence.md`
- `_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/evidence.json`
- `_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/mobile-map-primary-slim-slider-date-pill.png`
- `_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/mobile-map-panel-venues-rows-3.png`
- `_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/mobile-map-panel-venues-rows-max.png`
- `_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/mobile-map-panel-venues-mid-drag.png`
- `_bmad-output/implementation-artifacts/validation/12-9-mobile-bottom-sheet-row-quantized-drag-slim-time-slider-review-20260724-193041.log`
  — transition artifact; updated sprint status from `in-progress` to `review`
- `_bmad-output/implementation-artifacts/validation/12-9-mobile-bottom-sheet-row-quantized-drag-slim-time-slider-review-20260724-193948.log`
  — later verification rerun; story was already `review`
- `_bmad-output/implementation-artifacts/12-9-mobile-bottom-sheet-row-quantized-drag-slim-time-slider.md`

### Open Questions / Deferred Work

- No open rebaseline approval remains for Story 12.9. The two ordinary mobile
  references were promoted after Rasmus's 2026-07-24 approval; max-row and
  mid-drag remain supporting evidence artifacts only.
- The inherited OnboardingGate hydration pageError remains deferred to Story 12.4.
  It was observed in web-server logs but did not fail the bounded Story 12.9 gates.
- Desktop `axe.spec.ts --project=a11y` has a deterministic failure in the
  existing Story 12.12 forced venue-photo loaded contract (`data:image/webp`
  returned where the test expects `/venue-media/.../card.webp`). It was not
  changed in this Story 12.9 refinement and was intentionally outside the
  bounded Story 12.9 gate set; it remains Story 12.12-scoped deferred work.
