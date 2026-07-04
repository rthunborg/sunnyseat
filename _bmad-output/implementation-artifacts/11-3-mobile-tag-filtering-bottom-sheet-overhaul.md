# Story 11.3: Mobile Tag Filtering & Bottom-Sheet Overhaul (+ Desktop Chip Overflow)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **mobile user**,
I want to filter venues by tag right where the list lives and tuck the venue list fully away when I want the map,
so that filtering isn't desktop-only and the sheet never fights me.

## Acceptance Criteria

**AC1 — Mobile tag-chip row in the bottom-sheet header, sharing the desktop data source + filter context**

**Given** mobile currently has no tag-filter UI
**When** a horizontally scrollable tag-chip row is added to the `MobileBottomSheet` header, directly under the "Mest sol / Nära mig" sort toggles
**Then** the chips are the same data-driven set (`collectTags`, `localizeTag`) sharing the same filter context as desktop — toggling a chip filters the list AND the map pins identically on both breakpoints, with the reference "on" pill style and a clear empty state

**AC2 — Fourth handle-only collapsed snap; map interactive behind it**

**Given** the sheet currently snaps to peek (120px) / mid / full
**When** a fourth **collapsed** snap is added
**Then** the sheet can be dragged (or fast-swiped) down to a handle-only state (just the drag pill + safe-area visible), dragged back up through all snaps, and the map remains fully interactive behind it

**AC3 — Retuned gesture feel: 1:1 finger tracking, distance+velocity snap decisions, no dead-zones, chip row is drag-compatible**

**Given** the sheet drag feel is reported as janky
**When** the `@use-gesture` thresholds/rubberband and the snap animation are tuned (and the header chip row is made drag-compatible — horizontal chip scroll must not hijack vertical sheet drags)
**Then** drags track the finger 1:1, snap decisions respect both distance and velocity, and no gesture dead-zones remain — verified by touch e2e and a real-device pass (Story 11.8)

**AC4 — Desktop chip row scrollable with arrows + edge-fades; keyboard-navigable; all tags reachable**

**Given** the desktop nav chip row currently hard-clips overflowing tags mid-chip
**When** the row is made horizontally scrollable with left/right arrow buttons and edge-fade affordances
**Then** all tags are reachable at any viewport width, arrows scroll by a page and disable at the ends, and the row remains keyboard-navigable

### Design Gate Criteria

- **Visual:** Sheet header (toggles + chip row) and desktop scrollable chip strip match the reference chip styling; collapsed sheet shows handle only
- **Behaviour:** Chips filter list + pins on both breakpoints; all four snaps reachable; horizontal chip scroll never triggers vertical sheet movement
- **Animation:** Sheet snap transitions stay on the existing spring spec; chip scroll is momentum-smooth
- **Visual validation:** Screenshots of (a) sheet with active chips, (b) collapsed sheet, (c) desktop chip strip mid-scroll pass before QA handoff

_Reading (non-verbatim guidance, not part of the acceptance text):_

- The four thresholds/values this story must SET (left `UNKNOWN` by the epic test design so the story owner picks them from the real behaviour, not invented): the **collapsed-snap height** (handle-pill + safe-area only) and the **`@use-gesture` distance/velocity thresholds + rubberband** for the four-snap decision (AC2/AC3). Tests pin the *behaviour* (all four snaps reachable by gesture; no axis hijack; map interactive behind collapsed), never a magic px number — the LLM visual gate ignores sizing/spacing, so assert code-level facts (a token/CSS-var for the collapsed height, four `data-state` values, `axis` guard) not the eyeball.
- The gesture e2e (AC2/AC3 four-snap-by-gesture + no-axis-hijack) needs the **real-touch Playwright profile** — emulated mouse-drag can pass while a real finger fails (test-design R-008/R-004). Story 11.2 already added a Chromium `touch` project (`devices['Pixel 5']`, `hasTouch`, CDP `Input.dispatchTouchEvent`) wired into CI (`--project=touch`); the WebKit `mobile`/iPhone-14 project cannot drive CDP raw touch. **Put this story's sheet/chip touch-gesture specs under `--project=touch`** (retro-notes ratified this as the home for CDP real-touch specs) and confirm CI invokes them (the 11.2 review found "add a project, forget the CI wiring" — do not repeat it). The four existing projects `testIgnore` the touch specs so they do not double-run.
- The mobile chip parity (AC1) must reuse the EXISTING `TagFilterContext` + `collectTags`/`localizeTag` + `filterVenuesByTags` — a parallel mobile implementation would filter list/pins differently across breakpoints (test-design R-009). The mobile chip row is a NEW consumer of the SAME context the desktop nav writes to; the venue surfaces already read the same context in `MapView`, so a mobile toggle filters list AND pins with ZERO new plumbing beyond rendering the chip row.
- The Design-Gate "Visual validation" screenshots (sheet-with-chips / collapsed sheet / desktop chip-strip mid-scroll) are NEW visual states → dev is FORBIDDEN from self-blessing reference PNGs; the consolidated maintainer rebaseline is owned by Story 11.7 (note it as a maintainer follow-up; do not create/edit a reference PNG). The real-device four-snap + chip pass is Story 11.8's.

## Tasks / Subtasks

- [ ] **Task 1 — Add the mobile tag-chip row to the bottom-sheet header (AC1)**
  - [ ] Render a horizontally scrollable chip row in the `MobileBottomSheet` header, directly UNDER the sort toggles. The toggles today live in `MapView.tsx` as `<VenueListControls mode="mobile" …>` rendered as the FIRST sheet child (only when `mobileSheetState !== 'peek'`, `MapView.tsx:1045-1053`). Place the chip row immediately after that control block, still inside the sheet body, so it scrolls/collapses with the header — NOT a floating layer.
  - [ ] Source the chips from the SAME data-driven set as desktop: `collectTags(venues)` (`lib/utils/venue-tags.ts`) over the loaded venue set, and `localizeTag(tag, locale)` for the DISPLAY label. Matching is on the CANONICAL (Swedish) stored value; only the label localizes (approach A — never match differently across locales).
  - [ ] Wire toggling through the SHARED `useTagFilter()` context (`lib/contexts/TagFilterContext.tsx`) — `isActive(tag)` / `toggleTag(tag)` — the exact API the desktop nav uses. Do NOT introduce a second filter state. The venue surfaces (`MapView` list + pins) already read `activeTags` and apply `filterVenuesByTags(rawVenues, activeTags)` once (`MapView.tsx:395-398`), so a mobile toggle filters the list AND the map pins with no new plumbing.
  - [ ] Active chip = the reference "on" pill (`border-text-primary bg-text-primary text-white`); inactive = `border-divider bg-white text-text-body` — mirror the desktop chip classes (`DesktopNavBar.tsx:114-119`) so both breakpoints read identically. `aria-pressed={active}`, `type="button"`, keyboard-focusable.
  - [ ] Clear empty state: when a filter yields 0 matches the list shows the existing `venue.list.empty` copy ("Inga platser hittades i det här området.", `messages/{sv,en}/venue.json`), NOT a loading skeleton. See the DEFERRED-WORK fold below — the current `isLoading={venueQuery.isFetching && listVenues.length === 0}` wiring can flash the 3-card skeleton over a 0-match filter during a background refetch; order the `length === 0` empty branch ahead of the skeleton (or exclude the tag-filtered-to-empty case from `isLoading`) so a filtered-to-empty mobile list shows the empty copy.
  - [ ] Determine the chip data source WITHOUT a new fetch. The mobile sheet lives in `MapView`, which already holds `venueQuery.data`; derive `allTags` from the SAME loaded venues (mirror `DesktopNavBar`'s `collectTags(venueQuery.data?.venues ?? [])`). Do NOT issue a second `useVenueSearch` — TanStack de-dupes on the identical key, but the cleanest path is to read the venues `MapView` already loaded. The row renders nothing until at least one tag loads (`allTags.length > 0`), so it never flashes a placeholder set.
  - [ ] Orphaned-tag prune must still hold on mobile: the Story-9.7 `retainTags(availableTags)` guard prunes an active tag that vanishes from the loaded union (`TagFilterContext.tsx:79-95`). `DesktopNavBar` runs it in an effect (`:69-72`). Confirm the same prune runs when the mobile row is present (it fires from the desktop nav today, but the desktop nav is `hidden lg:flex` — it still mounts and its effect runs at mobile viewports; verify, and if the desktop nav is NOT mounted at mobile widths, run the prune from the mobile row too so a stale filter can never strand the mobile surfaces).

- [ ] **Task 2 — Add the fourth handle-only "collapsed" snap (AC2)**
  - [ ] Extend `MobileBottomSheetState` (`MobileBottomSheet.tsx:14`, currently `'peek' | 'mid' | 'full' | 'dismissed'`) with a fourth INTERACTIVE `'collapsed'` snap: handle-only (just the drag pill + safe-area visible, header/list hidden). This is DISTINCT from `'dismissed'` — `'dismissed'` is `pointer-events-none` and is used elsewhere; `'collapsed'` stays draggable/keyboard-reachable and the user can drag it back up through peek/mid/full.
  - [ ] Add the collapsed height as a design token (a new `--size-bottom-sheet-collapsed-h` CSS var in `globals.css` alongside the existing `--size-bottom-sheet-peek-h: 120px` / `-mid-h: 320px` / `-full-h: 560px` at `:177-179`), sized to the drag-pill + safe-area only. SET the exact value from the real handle+safe-area height (test-design left it `UNKNOWN`); do NOT hardcode a bare px in the component (frontend-component skill — token-based). Wire it into the sheet `h-[…]` class-selection (the `isDismissed ? … : isFull ? … : isMid ? … : peek` cascade at `:133-139`) with a `collapsed` branch.
  - [ ] Map remains fully interactive behind the collapsed sheet: the collapsed sheet occupies only the handle strip; the map canvas below it must receive pointer events. Keep the collapsed sheet's own `pointer-events` on the handle (draggable) but do NOT cover the map with a backdrop in the collapsed state (the `isFull` backdrop at `:115-125` must NOT render for collapsed).
  - [ ] Reachability both directions by gesture AND keyboard: a downward drag/fast-swipe from peek reaches collapsed; an upward drag from collapsed climbs back through peek → mid → full. Extend the handle's `onKeyDown` (`:162-169`) ArrowUp/ArrowDown cascade to include the collapsed rung (ArrowDown from peek → collapsed; ArrowUp from collapsed → peek). The click-toggle cascade (`:154-161`) may also cycle through collapsed — keep it coherent with the four states.

- [ ] **Task 3 — Retune the `@use-gesture` thresholds for the four-snap decision + make the chip row drag-compatible (AC3)**
  - [ ] The sheet already uses `@use-gesture/react` `useDrag` (`^10.3.1`, already a dependency — do NOT add a lib) with `handleBind` (`:47-83`) and `bodyBind` (`:85-111`). Extend the snap-decision logic (the `!last` early-returns + the distance/velocity branch cascade `:58-75`) to resolve to the correct one of FOUR snaps based on BOTH distance (`movement`/`offset`) AND velocity (`vy` vs `FAST_SWIPE_VELOCITY`). Existing constants: `DRAG_TO_FULL_PX = -36`, `DRAG_TO_PEEK_PX = 96`, `DRAG_TO_DISMISS_PX = 220`, `FAST_SWIPE_VELOCITY = 0.55` (`:24-28`). Tune/add the collapsed threshold; SET the values from the real feel (test-design left the gesture thresholds `UNKNOWN`).
  - [ ] 1:1 finger tracking during an active drag: `dragY` already follows `my` while `active` (`:55-57`, `:95-97`). Keep the drag translate 1:1 (no spring lag) during the gesture; the spring settle (`EASE_SPRING`, `DURATION_SLOW_S`, `:144-147`) applies only on release/snap. `useReducedMotion` already forces the fast/no-spring path (`:144-147`, `sheetMotionState` `:199-209`) — preserve it.
  - [ ] Chip-row axis guard (the load-bearing AC3 clause): a HORIZONTAL chip scroll must NOT trigger VERTICAL sheet movement. The `useDrag` on the sheet is already `axis: 'y'` (`:78`, `:106`) which filters to vertical intent, but the chip row is an `overflow-x-auto` horizontal scroller INSIDE the header — ensure the chip row's own touch handling claims the horizontal axis (e.g. `touch-action: pan-x` on the chip scroller, or stop-propagation of a horizontal-dominant gesture) so a horizontal fling on the chips scrolls the chips and leaves the sheet `data-state` unchanged. The sort-toggle row is already `overflow-x-auto` (`VenueListControls.tsx:78`) as precedent. Mirror the sheet body's `touch-action` discipline (`:190` uses `pan-y` when scrollable, `none` otherwise).
  - [ ] Preserve the existing body-drag-to-peek path (`bodyBind` `:85-111`: only drags the sheet when scrolled to top and pulling down) and the `suppressNextClickRef` click-suppression after a drag (`:60`, `:100`, `:155-159`) so a drag never fires a spurious toggle-click.

- [ ] **Task 4 — Make the desktop chip row scrollable with arrows + edge-fades, keyboard-navigable (AC4)**
  - [ ] Replace the `overflow-hidden` mid-chip clip on the desktop nav chip row (`DesktopNavBar.tsx:104`, the `<nav className="… overflow-hidden">`) with a horizontally SCROLLABLE strip (`overflow-x-auto`) so all tags are reachable at any viewport width. The chips themselves already `shrink-0` (`:115`) so they keep their width and overflow rather than squashing.
  - [ ] Add left/right arrow BUTTONS that scroll the strip by a PAGE (~the visible width) and DISABLE at the ends (left disabled at scrollLeft 0; right disabled at the max scroll). Track scroll position with a ref + scroll listener (or `IntersectionObserver` on sentinel edges) to toggle the disabled state. Arrows are `aria-label`led, `type="button"`, keyboard-operable.
  - [ ] Edge-fade affordances: a subtle left/right gradient mask indicating more content, shown only when scrollable in that direction (hidden at the respective end). Use a token/design-system gradient, NOT ad-hoc hex (frontend-component skill).
  - [ ] Row stays keyboard-navigable: chips are focusable buttons already (`:109-123`); ensure Tab moves through them and a focused off-screen chip scrolls into view (native `focus` + `scroll-margin`, or `scrollIntoView` on focus). The arrow buttons are additional Tab stops, not a replacement for chip focus.
  - [ ] Do NOT re-add the two dead pager chevrons Story 9.6 removed (`DesktopNavBar.tsx:99-100` comment) — these NEW arrows are real, wired scroll controls with disabled-at-ends state, not the old inert placeholders.

- [ ] **Task 5 — Tests (AC1–AC4) + red-first where practical**
  - [ ] **Component (mobile chips, AC1):** a `MobileBottomSheet`/chip-row component test (RTL/jsdom): renders the data-driven chip set from `collectTags`; toggling a chip calls `toggleTag` on the shared `TagFilterContext`; active chip carries the "on" pill classes + `aria-pressed`; a 0-match filter shows the `venue.list.empty` copy (NOT the loading skeleton). Assert the row sits under the sort toggles in the header.
  - [ ] **Component (four-snap state, AC2):** extend `MobileBottomSheet.test.tsx` — the keyboard cascade reaches the new `'collapsed'` state (ArrowDown from peek → collapsed; ArrowUp from collapsed → peek); the collapsed sheet renders handle-only (list/header hidden) and does NOT render the full backdrop; the `data-state="collapsed"` attribute is present.
  - [ ] **Component (desktop chip scroll, AC4):** a `DesktopNavBar` test — the chip strip is `overflow-x-auto` (not `overflow-hidden`); left/right arrows render, are `disabled` at the respective ends, and scroll on click; chips remain focusable buttons; all tags render (none clipped away by the DOM). Migrate/extend the existing `DesktopNavBar.test.tsx` + the `DesktopNavBarTagChips.atdd.test.tsx` chip assertions.
  - [ ] **E2E (real touch, AC2/AC3):** a `--project=touch` spec (Chromium/Pixel-5, CDP raw touch) — drive `page.touchscreen`/CDP touch to reach all FOUR snaps by gesture (peek → collapsed → back up through mid/full); assert the map is interactive behind the collapsed sheet (a pin/map interaction succeeds); assert a HORIZONTAL chip-row fling leaves the sheet `data-state` unchanged (axis-hijack guard). Force a deterministic time (`?_time=13:00`) as the 11.2 touch spec does.
  - [ ] **E2E (chip filter parity, AC1):** assert toggling a mobile chip filters the list AND the map pins identically to desktop — reuse the mocked `/api/venues` `page.route` DTO pattern (`epic-10-weather-matrix.spec.ts` precedent) at both `--project=mobile` (chip present in the sheet) and `--project=desktop` (chip in the nav). This may fold into the existing epic-11 e2e; do NOT add a live Met.no path.
  - [ ] Register any new touch spec under the `touch` project in `playwright.config.ts` (add its filename to the four existing projects' `testIgnore` list so it does not double-run) AND confirm the CI workflow invokes `--project=touch` for it (the 11.2 review lesson — a new touch spec that CI never runs is dormant-green). All existing e2e specs (`smoke`, `map-primary`, `responsive-layout`, `axe`, `axe-mobile`, `epic-9-mobile-regression`, `epic-10-weather-matrix`, `epic-11-scrub-zero-fetch`, `epic-11-slider-touch-drag`) must stay green.

- [ ] **Task 6 — Gates**
  - [ ] `npx tsc --noEmit` → 0 errors. `npx eslint .` → 0 errors (pre-existing warnings in untouched files are acceptable; do NOT introduce new ones). `npx vitest run` → all pass, 0 unexpected skips (record the before/after count; NONE dropped).
  - [ ] Run the touch e2e locally under `--project=touch` and the mobile/desktop chip-filter specs; spot-check the axe projects (`a11y`, `a11y-mobile`) stay green — the new chip row + collapsed sheet must not regress the AA gate (the mobile sheet variants are inside `axe-mobile.spec.ts`'s scope).
  - [ ] The three new visual states (sheet-with-active-chips, collapsed sheet, desktop chip-strip mid-scroll) are NEW → maintainer visual-validation follow-up owned by Story 11.7's consolidated rebaseline. Do NOT create/edit/self-bless any reference PNG. Live/real-device four-snap + chip pass handed to Story 11.8.

## Dev Notes

### Scope fences — what this story is and is NOT

- **IS:** the mobile tag-chip row (AC1), the fourth handle-only collapsed sheet snap + gesture retune + chip axis-guard (AC2/AC3), and the desktop chip-row scroll/arrows/edge-fade (AC4). All of it is INTERACTION + rendering over the ALREADY-SHARED `TagFilterContext` + `collectTags`/`localizeTag`/`filterVenuesByTags` from Story 9.7.
- **IS NOT:** any API/route/schema/DTO change; any new data source or fetch (chips read already-loaded venues); any change to the geometric meaning of `sunExposurePercent`/`sunWindow`, the Epic-10 weather gate, or the seed/fixture path; the day-series/query-key seam (11.1/11.2 own it — a chip toggle is a pure client `.filter()`, it does NOT touch the query key); the quick-info content rework (11.4); the map de-dull/tint or the location dot (11.5); the detail first-paint / "Soltider idag" removal (11.6); the `toSunStatusToken`/`vercel.json`/`.gitattributes` hygiene (11.7); the recenter/`flyTo` viewport-offset work (a separate P1 row — this story only adds the collapsed snap, it does NOT change the recenter math). Do NOT touch those seams.
- **No new dependency.** `@use-gesture/react` (`^10.3.1`) and `motion` (`^12.38.0`) are already installed; the four-snap retune is a threshold change on the existing `useDrag`, not a new gesture lib.

### The mobile chip row rides the SAME shared filter context — do NOT fork it (test-design R-009)

Story 9.7 already built the entire filter spine as SHARED context precisely so a chip toggle from one surface is read by the venue surfaces:
- `lib/contexts/TagFilterContext.tsx` — `activeTags: ReadonlySet<string>` of CANONICAL (Swedish) values, `toggleTag`/`isActive`/`clearTags`/`retainTags`. The provider lives high in `AppContextProviders` so the desktop nav (writer) and the `MapView` venue surfaces (reader) share one state. The mobile chip row is simply a THIRD surface reading+writing the SAME context.
- `lib/utils/venue-tags.ts` — `collectTags(venues)` (first-seen-order union), `filterVenuesByTags(venues, activeTags)` (0 active = pass-through-all; ≥1 = OR/union intersect), `localizeTag(tag, 'sv'|'en')` (display-only localize). PURE, zero-network.
- `MapView.tsx:395-398` already applies `filterVenuesByTags(rawVenues, activeTags)` once, feeding BOTH the lists (desktop + mobile) AND the map pins. So the mobile chip toggle needs ZERO new filter plumbing — it just writes the shared context and the existing `useMemo` re-filters list + pins.

A parallel mobile filter implementation would diverge list/pin behaviour across breakpoints (R-009, score 4) — the single most important AC1 constraint. Reuse the context; render a new chip row; done.

### The gesture retune uses the EXISTING `@use-gesture` `useDrag` — thresholds change, not the mechanism

`MobileBottomSheet.tsx` already drives the sheet with two `useDrag` binds:
- `handleBind` (`:47-83`) on the drag handle — `axis: 'y'`, `bounds`, `rubberband: 0.15`, `pointer: { capture: true }`; the `last` branch resolves the target snap from `movement`/`offset`/`velocity`/`direction` via the `DRAG_TO_FULL_PX` / `DRAG_TO_PEEK_PX` / `DRAG_TO_DISMISS_PX` / `FAST_SWIPE_VELOCITY` constants (`:24-28`).
- `bodyBind` (`:85-111`) on the scroll body — only drags the sheet when scrolled to top and pulling down.

Adding the fourth `'collapsed'` snap = extend the `last`-branch decision cascade to resolve to one of FOUR states and add the collapsed threshold; `dragY` already tracks the finger 1:1 while `active`. Keep the `suppressNextClickRef` guard (a drag must not fire a toggle-click), the `axis: 'y'` filter (so a horizontal chip fling is not read as a vertical sheet drag), and the reduced-motion path (`sheetMotionState` `:199-209`).

The chip-row axis guard is the subtle part: the chip row is a horizontal `overflow-x-auto` scroller INSIDE the header. `axis: 'y'` on the sheet drag already ignores horizontal-dominant gestures, but belt-and-suspenders: set `touch-action: pan-x` on the chip scroller (mirror the sheet body's `touch-action` discipline at `:190`) so the browser routes a horizontal fling to the chip scroller and a vertical drag to the sheet. Test the axis guard with a real horizontal touch fling asserting the sheet `data-state` is unchanged.

### Collapsed snap is a token-sized, INTERACTIVE state — distinct from `dismissed`

The existing `'dismissed'` state is `pointer-events-none` (`:133-134`) and is used for the hidden/inert sheet elsewhere. The NEW `'collapsed'` state must stay DRAGGABLE and keyboard-reachable (the user drags it back up). Size it with a NEW `--size-bottom-sheet-collapsed-h` token in `globals.css` (alongside `--size-bottom-sheet-peek-h: 120px` etc. at `:177-179`) = drag-pill (`--size-drag-pill-h: 6px`) + padding + `env(safe-area-inset-bottom)` — SET the concrete value from the rendered handle strip; do NOT invent a magic px in the TSX. The full-state backdrop (`:115-125`) must NOT render for collapsed (map stays visible + interactive behind it).

The map behind the collapsed sheet must be fully interactive: the collapsed sheet occupies only the handle strip, so the map canvas below receives pointer events. The e2e proves it (a map/pin interaction succeeds while collapsed).

### Desktop chip overflow — replace the clip with a real scroll strip (AC4)

`DesktopNavBar.tsx:101-126` renders the data-driven chip `<nav>` with `overflow-hidden` (`:104`) — which hard-clips mid-chip when the tags don't fit. Replace with `overflow-x-auto` + real left/right arrow buttons (scroll by a page, disable at the ends) + edge-fade masks (token gradient). The chips already `shrink-0` so they keep width and overflow. Keep the shared `TagFilterContext` wiring (`isActive`/`toggleTag`), the "on" pill classes, and the `retainTags` orphan-prune effect (`:69-72`) untouched. Do NOT re-add the Story-9.6-removed dead pager chevrons — these are real wired controls.

### Empty-state: filtered-to-empty shows the empty copy, not the skeleton (DEFERRED-WORK fold)

Both `<VenueList>` mobile+desktop call sites pass `isLoading={venueQuery.isFetching && listVenues.length === 0}` (`MapView.tsx:1079,1124`), and `VenueList` returns the loading skeleton BEFORE the `sortedVenues.length === 0` empty branch. When a tag filter yields 0 matches while `useVenueSearch` is `isFetching` in the background (e.g. a planner-change refetch), the surface flashes the 3-card skeleton instead of the `venue.list.empty` ("Inga platser hittades…") copy. AC1 requires "a clear empty state" for the mobile filter — so ORDER the `length === 0` empty branch ahead of the `isLoading` skeleton (or exclude the tag-filtered-to-empty case from `isLoading`) so a filtered-to-empty list shows the empty copy on BOTH breakpoints. (Deferred from the 9.7 code review — subject-overlap with this story's mobile empty-state AC; fold it in, do not re-defer.)

### Deferred-work items that overlap this story (fold in the empty-state one; note the others; do NOT reopen unrelated ones)

- **[FOLD IN] Empty-state renders the loading skeleton instead of the "nothing matches" copy during a concurrent background refetch** (9.7 code review) — directly overlaps AC1's "clear empty state"; addressed in Task 1 + the empty-state note above.
- **[NOTE only] `localizeTag`'s 16-entry Swedish→English map must track the live DB `tags` vocabulary with no runtime signal on drift** (epic-9 review) — the mobile chips inherit the SAME `localizeTag` map the desktop uses; an unmapped live tag falls back to the raw Swedish string (never a truncated label). This story does NOT expand or audit the map (that is a future tag-audit task) — it just reuses `localizeTag` as-is so both breakpoints stay consistent. Do not fork or hardcode chip labels.
- Everything else in `deferred-work.md` (offline shell, 404 a11y, share modal, MapLibre roots, venue-card fallbacks, `toSunStatusToken`, `vercel.json`/`.gitattributes`, quick-info/detail seams, recenter magic numbers) is OUT of scope for 11.3 — do NOT touch. (`toSunStatusToken` + build-infra are Story 11.7's; the quick-info/detail seams are 11.4/11.6's; the sheet/chip files this story owns are not on those seams.)

### Constraints ratified earlier in Epic 11 (from the epic-11 retro-notes) — reflect directly

- **The `touch` Playwright project (`--project=touch`, Chromium/Pixel-5) is the HOME for CDP real-touch gesture specs.** Story 11.2 added it (`playwright.config.ts:54-58`) and wired it into CI (`.github/workflows/build-and-test-nextjs.yml` `--project=touch` step, added in the 11.2 review pass). The WebKit `mobile`/iPhone-14 project CANNOT drive CDP `Input.dispatchTouchEvent`. Put this story's four-snap + chip-axis touch specs there; the four existing projects `testIgnore` the touch specs so they do not double-run. **Check the CI wiring** — the 11.2 Tier-A review caught "add a Playwright project, forget the CI wiring" leaving the touch spec dormant-green; verify CI actually invokes any new touch spec.
- **Venue query keys are date-only + coords + `isLiveNow` — NEVER reintroduce `time`.** A chip toggle is a pure client `.filter()` over already-loaded venues (`filterVenuesByTags`) — it does NOT touch `useVenueSearch`/`useFavouriteVenues` or the query key. Keep it that way; nothing in this story fetches. (Retro-notes: "later stories must not reintroduce time into these keys.")
- **This story SETS the two thresholds the epic test design left `UNKNOWN` by design:** the sheet collapsed-snap height and the `@use-gesture` distance/velocity thresholds. SET them from the real behaviour (rendered handle strip; real-finger feel) — do NOT invent a number and do NOT leave them unset. Tests pin the BEHAVIOUR (four snaps reachable, no axis hijack, map interactive behind collapsed), not the magic px.
- **Anti-"shipped-but-insufficient" (epic thesis):** the sheet-drag jank and the mobile-filter absence are real live defects — REMOVE them, don't paper over. The four-snap + chip-axis guard must be provable by a REAL-touch gesture (not click-sim), because emulated mouse-drag can pass while a finger fails (R-008/R-004).

### API boundary + testing standards

- No API/route/schema/DTO change. No new dependency. The chip data comes from already-loaded venues; the filter is a pure client `.filter()`.
- Vitest for unit/component; Playwright for e2e. Real-touch specs run under `--project=touch` (Chromium/Pixel-5, CDP raw touch); the four existing projects (`mobile`=iPhone-14/WebKit `hasTouch`, `desktop`=Desktop Chrome, `a11y`, `a11y-mobile`) exclude them via `testIgnore`.
- CI runs Playwright against `next dev` (so `?_time=`/`?_date=` forcing fires — do NOT switch to a production build). No live Met.no in CI: seed path (flag OFF) or mocked `/api/venues` `page.route` DTO (`epic-10-weather-matrix.spec.ts` precedent).
- The axe AA gate has been ACTIVE since Epic 9 — the new chip row (both breakpoints) + the collapsed sheet must keep `axe`/`axe-mobile` green (chips are focusable `aria-pressed` buttons; the collapsed handle stays keyboard-reachable). Do NOT introduce a contrast/focus regression.
- `frontend-component` skill is MANDATORY for the collapsed-height token, the edge-fade gradient, and any visual touch — design-system-first, token-based, no ad-hoc hex/opacity/px.
- Standard gate: `tsc --noEmit`, `eslint`, `vitest run`, then the e2e projects (incl. `touch`).

### Project Structure Notes

- **Edits:** `components/custom/sheets/MobileBottomSheet.tsx` (fourth `'collapsed'` snap + `@use-gesture` four-snap retune + chip-axis `touch-action`), `components/custom/map/MapView.tsx` (render the mobile chip row under the sort toggles in the sheet header + derive `allTags` from the loaded venues + wire the empty-state ordering fix; possibly pass `mobileSheetState` handling for the new snap), `components/custom/layout/DesktopNavBar.tsx` (chip strip `overflow-x-auto` + arrows + edge-fades + keyboard scroll-into-view), `app/globals.css` (new `--size-bottom-sheet-collapsed-h` token + edge-fade gradient token), plus `components/composed/venue/VenueList.tsx` if the empty-vs-skeleton branch ordering is fixed there, plus `messages/{sv,en}` only if a new label is needed (likely none — reuse `venue.list.empty`), plus tests.
- **New file(s):** possibly a `MobileTagChips` composed component (extract the chip row so mobile + the desktop nav can share the render, OR keep them as two small renders over the same `TagFilterContext` — dev's call; the SHARED thing is the context + `venue-tags` utils, not necessarily the JSX). Possibly a new `--project=touch` e2e spec for the four-snap + chip-axis gestures. No new production module beyond an optional chip-row component; no new route/schema/dependency.
- Follow the `components/` layering: `custom/` = smart/feature (consumes contexts, orchestrates); `composed/` = presentational over props/context-for-display; `ui/` = primitives (architecture.md `:957-958`).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 11 — Story 11.3] — ACs + Design Gate (lines ~2867-2896); maintainer decision "Mobile tag selection = scrollable chip row in the bottom-sheet header under the sort toggles" + "sheet fourth collapsed snap" (~2803); root-cause blockquote #5 (chips render only in `DesktopNavBar`, hard-clip mid-chip; mobile has no tag-filter UI) at ~2800.
- [Source: _bmad-output/test-artifacts/test-design/test-design-epic-11.md] — R-008 (sheet gesture regressions: fourth snap unreachable / horizontal chip scroll hijacks the vertical drag; `@use-gesture` retune, chip-row drag-compatible), R-009 (mobile chips diverge from desktop — same shared context + data source), the Story-11.3 P0/P1 rows (mobile chips filter list+pins both breakpoints + four sheet snaps; desktop scrollable chip strip + arrows/edge-fade + keyboard-nav), the "assert behaviour not magic numbers" discipline, the `UNKNOWN` thresholds (sheet collapsed-snap height + gesture thresholds) THIS story sets, Entry Criteria (real-touch profile + `TagFilterContext` reusable from the sheet header before the mobile row), the Interworking table (`MobileBottomSheet`/`DesktopNavBar` rows).
- [Source: _bmad-output/auto-bmad/retro-notes/epic-11.md] — the `touch` Playwright project (`--project=touch`) is the home for CDP real-touch gesture specs (11.2 added it, iPhone-14/WebKit cannot drive CDP); "add a project, forget the CI wiring" pattern to avoid (11.2 Tier-A review); venue query keys are date-only + `isLiveNow` — never reintroduce time; the epic left the sheet collapsed-snap height + `@use-gesture` thresholds `UNKNOWN` → THIS story sets them.
- [Source: _bmad-output/implementation-artifacts/11-2-time-slider-drag-fix-planner-range-rules.md] — the `touch` project + CI wiring pattern (Task 5 e2e + the review-pass CI step); the real-touch spec convention (drive CDP touch, not `click()`); the "NEW visual state → dev forbidden from self-blessing reference PNGs, Story 11.7 owns the rebaseline" convention.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — [FOLD IN] the 9.7 empty-state-shows-skeleton-instead-of-empty-copy item (overlaps AC1's clear empty state); [NOTE] the `localizeTag` live-tag-drift item (chips reuse the map as-is); all other entries out of scope.
- [Source: nextjs-app/components/custom/sheets/MobileBottomSheet.tsx] — `MobileBottomSheetState` (`:14`, add `'collapsed'`), `handleBind`/`bodyBind` `useDrag` (`:47-111`), snap-decision constants `:24-28`, `dragY` 1:1 tracking `:55-57`/`:95-97`, height-cascade class selection `:133-139`, backdrop `:115-125`, handle `onKeyDown` cascade `:162-169` + click cascade `:154-161`, `suppressNextClickRef` `:60`/`:100`/`:155-159`, `touch-action` discipline `:190`, `sheetMotionState` `:199-209`.
- [Source: nextjs-app/components/custom/layout/DesktopNavBar.tsx] — chip row `<nav>` `overflow-hidden` clip `:101-126` (replace with scroll + arrows), chip button classes `:114-119` ("on" pill = `border-text-primary bg-text-primary text-white`), `collectTags`/`localizeTag`/`useTagFilter` wiring `:33`/`:57-60`/`:107-122`, `retainTags` orphan-prune effect `:69-72`, dead-chevron warning `:99-100`.
- [Source: nextjs-app/lib/contexts/TagFilterContext.tsx] — shared `activeTags`/`toggleTag`/`isActive`/`clearTags`/`retainTags` (`:27-58`), provider-less no-op default (`:52-58`), `retainTags` prune `:79-95`.
- [Source: nextjs-app/lib/utils/venue-tags.ts] — `collectTags` `:21-33`, `filterVenuesByTags` `:45-54`, `localizeTag` + `TAG_DISPLAY_EN` map `:63-91`.
- [Source: nextjs-app/components/custom/map/MapView.tsx] — `useTagFilter()` `:149`, `filterVenuesByTags(rawVenues, activeTags)` `:395-398`, `MobileBottomSheet` + mobile `VenueListControls` render `:1040-1087`, `mobileSheetState` state `:170-171`, `isLoading={venueQuery.isFetching && listVenues.length === 0}` (empty-vs-skeleton) `:1079,1124`.
- [Source: nextjs-app/components/composed/venue/VenueListControls.tsx] — the mobile sort-toggle row (`Mest sol / Nära mig`) `:77-103` (the chip row goes UNDER this), the `overflow-x-auto` horizontal-scroll precedent `:78`.
- [Source: nextjs-app/app/globals.css] — sheet height tokens `--size-bottom-sheet-peek-h`/`-mid-h`/`-full-h` `:177-179` (add `-collapsed-h`), drag-pill tokens `:139-141`, `z-bottom-sheet-*` `:127-135`.
- [Source: nextjs-app/docs/design/DESIGN.md] — bottom-sheet peek/full drag-handle spec (`:341-360`), sheet z-index (`:294-297`), sheet radius/shadow tokens (`:195-196`,`:220`), drag-handle colour tokens (`:57-58`), "screen-specific timings take precedence; use prefers-reduced-motion" (`:255`).
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — bottom-sheet snap-point behaviour + spring settle (`:461`,`:504`,`:900`), "map remains visible and interactive behind peek state" (`:504`), "mobile bottom sheets → desktop side panels" (`:609`), reduced-motion sheet path (`:882`).
- [Source: _bmad-output/planning-artifacts/architecture.md] — TanStack Query key conventions (date-only, no time) `:585`; components layering (`custom`/`composed`/`ui`) `:957-958`; query hooks + `query-keys.ts` factory `:695`,`:833`.
- [Source: nextjs-app/playwright.config.ts] — projects (`mobile`=iPhone-14 `hasTouch`/WebKit, `desktop`, `touch`=Pixel-5/Chromium via `testMatch`, `a11y`, `a11y-mobile`); `testIgnore` of the touch specs on the four projects `:46,:51`; webServer runs `next dev` `:70-74`.
- [Source: nextjs-app/test/components/MobileBottomSheet.test.tsx] — existing keyboard peek/mid/full contract (`:40-60`) to extend for the collapsed rung; the `motion/react` mock pattern.
- [Source: nextjs-app/test/components/DesktopNavBar.test.tsx + DesktopNavBarTagChips.atdd.test.tsx] — the existing chip-row contract (data-driven, `aria-pressed`, "on" pill, shared context) to extend for the scroll strip + arrows.
- [Source: CLAUDE.md / AGENTS.md] — repo rulebook, Swedish-copy default, local-Docker rules.
- [Source: project-context.md] — Epic 9/10 ratified conventions, the production planner-forcing gate (`?_time=`/`?_date=`), "visual gate is an LLM eyeball" (ignores sizing/spacing — assert code-level facts for the four snaps / axis guard / arrow-disabled state, not the eyeball).
- [Source: package.json] — `@use-gesture/react` `^10.3.1` + `motion` `^12.38.0` already installed (no new dependency for the gesture retune).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
