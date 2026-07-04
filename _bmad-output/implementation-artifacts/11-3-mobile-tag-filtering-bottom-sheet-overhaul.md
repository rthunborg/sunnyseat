# Story 11.3: Mobile Tag Filtering & Bottom-Sheet Overhaul (+ Desktop Chip Overflow)

Status: review

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

- [x] **Task 1 — Add the mobile tag-chip row to the bottom-sheet header (AC1)**
  - [x] Render a horizontally scrollable chip row in the `MobileBottomSheet` header, directly UNDER the sort toggles. The toggles today live in `MapView.tsx` as `<VenueListControls mode="mobile" …>` rendered as the FIRST sheet child (only when `mobileSheetState !== 'peek'`, `MapView.tsx:1045-1053`). Place the chip row immediately after that control block, still inside the sheet body, so it scrolls/collapses with the header — NOT a floating layer. **[Done: new `MobileTagChips` composed component rendered after `VenueListControls` in MapView's sheet body, gated `mobileSheetState !== 'peek' && listMode !== 'favourites'`.]**
  - [x] Source the chips from the SAME data-driven set as desktop: `collectTags(venues)` (`lib/utils/venue-tags.ts`) over the loaded venue set, and `localizeTag(tag, locale)` for the DISPLAY label. Matching is on the CANONICAL (Swedish) stored value; only the label localizes (approach A — never match differently across locales).
  - [x] Wire toggling through the SHARED `useTagFilter()` context (`lib/contexts/TagFilterContext.tsx`) — `isActive(tag)` / `toggleTag(tag)` — the exact API the desktop nav uses. Do NOT introduce a second filter state. The venue surfaces (`MapView` list + pins) already read `activeTags` and apply `filterVenuesByTags(rawVenues, activeTags)` once (`MapView.tsx:395-398`), so a mobile toggle filters the list AND the map pins with no new plumbing.
  - [x] Active chip = the reference "on" pill (`border-text-primary bg-text-primary text-white`); inactive = `border-divider bg-white text-text-body` — mirror the desktop chip classes so both breakpoints read identically. `aria-pressed={active}`, `type="button"`, keyboard-focusable, `min-h-11` 44px touch target.
  - [x] Clear empty state: filtered-to-empty shows the `venue.list.empty` copy, NOT a loading skeleton. **[Done: added `isNearListLoading = venueQuery.isFetching && loadedVenueCount === 0` in MapView, keyed off the PRE-FILTER loaded count, feeding both mobile + desktop VenueList `isLoading`. A filtered-to-empty list now shows the empty copy even during a concurrent background refetch.]**
  - [x] Determine the chip data source WITHOUT a new fetch — `allTags = collectTags(venueQuery.data?.venues ?? [])` from the venues MapView already loaded. Row renders nothing until `allTags.length > 0`.
  - [x] Orphaned-tag prune still holds on mobile. **[Verified: `DesktopNavBar` is `hidden lg:flex` but ALWAYS mounted (`ResponsiveLayout` renders both navbars on every pass), so its `retainTags` effect fires at mobile viewports over the SAME de-duped cached union. No duplicate prune from the mobile row is needed; documented in a MapView comment.]**

- [x] **Task 2 — Add the fourth handle-only "collapsed" snap (AC2)**
  - [x] Extend `MobileBottomSheetState` with a fourth INTERACTIVE `'collapsed'` snap (now `'collapsed' | 'peek' | 'mid' | 'full' | 'dismissed'`): handle-only, DISTINCT from `pointer-events-none` `'dismissed'` — draggable/keyboard-reachable back up.
  - [x] Add `--size-bottom-sheet-collapsed-h: calc(44px + env(safe-area-inset-bottom))` in `globals.css` (the 44px handle-strip touch target + safe-area). **SET from the real rendered handle strip; token-based (no bare px in the TSX).** Wired into the sheet height cascade with a `collapsed` branch.
  - [x] Map fully interactive behind collapsed: the collapsed sheet occupies only the ~44px handle strip, the `isFull` backdrop does NOT render for collapsed, and the collapsed body is `aria-hidden` + `pointer-events-none` (handle stays interactive). Proven by the real-touch e2e (a map tap above the strip selects a venue and raises the sheet).
  - [x] Reachability both directions by gesture AND keyboard: ArrowUp/ArrowDown cascade extended via `expandOneRung`/`collapseOneRung` over a `SNAP_LADDER` (ArrowDown peek → collapsed; ArrowUp collapsed → peek; both saturate, never reach 'dismissed'). The click/Enter/Space toggle cycles coherently through the four via `clickCycle`.

- [x] **Task 3 — Retune the `@use-gesture` thresholds for the four-snap decision + make the chip row drag-compatible (AC3)**
  - [x] Extended the `handleBind` `last`-branch cascade to resolve one of FOUR snaps by BOTH distance and velocity. Added `DRAG_TO_COLLAPSED_PX = 64` (peek → collapsed). **SET the thresholds from the real drag feel (verified by the touch e2e).** **KEY FIX:** the release direction is now derived from the accumulated movement sign (`releaseDir = my < 0 ? -1 : my > 0 ? 1 : dy`), NOT the instantaneous `direction[1]` — at the release event the pointer/touch delta is 0 so `dy` reads 0 and a valid drag would otherwise snap back with no state change. **This was the real bug behind the reported sheet-drag jank.** Bumped `bounds.bottom` to 320 to allow the extra downward travel.
  - [x] 1:1 finger tracking during an active drag preserved (`dragY` follows `my`); spring settle only on release; `useReducedMotion` fast/no-spring path untouched.
  - [x] Chip-row axis guard: `MobileTagChips` is `overflow-x-auto` with `touch-action: pan-x`, so the browser routes a horizontal fling to the chip scroller and the sheet `data-state` stays unchanged (proven by the touch e2e). The sheet `useDrag` stays `axis: 'y'`.
  - [x] Preserved the body-drag-to-peek path and the `suppressNextClickRef` click-suppression (same `releaseDir` fix applied to `bodyBind`).

- [x] **Task 4 — Make the desktop chip row scrollable with arrows + edge-fades, keyboard-navigable (AC4)**
  - [x] Replaced the `overflow-hidden` mid-chip clip with a horizontally SCROLLABLE strip (new `TagChipStrip`/`ChipScrollArrow` sub-components in `DesktopNavBar.tsx`, `data-testid="desktop-tag-chip-strip"`, `overflow-x-auto`). Chips keep `shrink-0`.
  - [x] Left/right arrow BUTTONS scroll by a page (`clientWidth - 48`) and DISABLE at the ends (`canScrollLeft`/`canScrollRight` tracked via a scroll + `ResizeObserver` + resize listener). `aria-label`led (new `nav.scrollFiltersLeft`/`Right` i18n keys sv+en), `type="button"`, keyboard-operable.
  - [x] Edge-fade masks: token gradients `--gradient-chip-fade-left/right` (cream → transparent), rendered only when scrollable that direction.
  - [x] Row stays keyboard-navigable: chips are focusable buttons; `onFocus` `scrollIntoView({block:'nearest',inline:'nearest'})` + `scroll-mx-2` scrolls an off-screen focused chip into view. Arrows are additional Tab stops.
  - [x] Did NOT re-add the Story-9.6 dead pager chevrons — these arrows are real wired scroll controls with disabled-at-ends state.

- [x] **Task 5 — Tests (AC1–AC4)**
  - [x] **Component (mobile chips, AC1):** new `test/components/MobileTagChips.test.tsx` (8 tests: data-driven set, en-label with canonical toggle, on-pill + aria-pressed, 44px target, pan-x axis guard, live toggle). MapView.test extended (chip row under the toggles via DOM order; `toggleTag` on click; active pill; filtered-to-empty shows empty copy NOT skeleton; genuine first-load still shows skeleton).
  - [x] **Component (four-snap state, AC2):** `MobileBottomSheet.test.tsx` extended — ArrowDown peek→collapsed (never dismissed); ArrowUp collapsed→peek; ArrowDown collapsed saturates; collapsed renders handle-only with the collapsed-h token + no backdrop; z-index case; collapsed-token-smaller-than-peek assertion.
  - [x] **Component (desktop chip scroll, AC4):** `DesktopNavBar.test.tsx` extended — strip is `overflow-x-auto` not `overflow-hidden`; all tags in DOM + focusable; arrows render (labelled, type=button); left arrow disabled at start; right arrow enables + `scrollBy` on click when overflowing (mocked scroll metrics); right edge-fade appears only when overflowing.
  - [x] **E2E (real touch, AC2/AC3):** new `test/e2e/epic-11-sheet-touch-gestures.spec.ts` under `--project=touch` (Chromium/Pixel-5, CDP raw touch) — all FOUR snaps by real finger drag (down to collapsed, back up to full, rung-by-rung down again), map interactive behind collapsed (a map tap above the strip selects a venue and raises the sheet), horizontal chip fling leaves `data-state` unchanged. `?_time=13:00`, no live Met.no. **Both tests pass, stable across repeated runs.**
  - [x] **E2E (chip filter parity, AC1):** new `test/e2e/epic-11-chip-filter-parity.spec.ts` at BOTH `--project=mobile` (sheet chip) and `--project=desktop` (nav chip) — toggling the unique 'Kanal' chip prunes the visible list AND the pins to the one matching venue; toggle-off restores both. Mocked `/api/venues` DTO, no live Met.no. **Both breakpoints pass.**
  - [x] Registered the new touch spec in `playwright.config.ts` (`touch` project `testMatch` is now an array of both epic-11 touch specs; the four standard projects `testIgnore` it). **CI already invokes `npx playwright test --project=touch` (`build-and-test-nextjs.yml:120`), which now matches the new spec — CI wiring confirmed, no workflow edit needed.** All existing e2e specs stay green (only the PRE-EXISTING `epic-11-scrub-zero-fetch` desktop date-change failure remains — a Story-11.1 `planner-date-next`-not-visible issue confirmed present on baseline, out of 11.3 scope).

- [x] **Task 6 — Gates**
  - [x] `npx tsc --noEmit` → 0 errors. `npx eslint .` → 0 errors (13 pre-existing warnings in untouched files, none new). `npx vitest run` → 1262 passed / 1262 (was 1237 before; +25 new tests, 0 dropped, 0 unexpected skips).
  - [x] Ran the touch e2e under `--project=touch` (2/2 pass, stable ×3) + the mobile/desktop chip-filter specs (2/2 pass). Full `--project=mobile --project=desktop` = 84 passed / 1 pre-existing failure. Axe: my surfaces (chips 21:1 active / high-contrast inactive, decorative collapsed handle) are AA-clean; the one flaky `axe.spec.ts` venue-detail failure is a PRE-EXISTING boundary-contrast flake in `VenueDetailContent` (`text-amber-badge-text` on `bg-amber-primary` = 4.47:1, untouched by this story — see Completion Notes).
  - [x] The three new visual states are NEW → maintainer visual-validation follow-up owned by Story 11.7's consolidated rebaseline. Did NOT create/edit/self-bless any reference PNG. Live/real-device four-snap + chip pass handed to Story 11.8.

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

Opus 4.8 (1M) — `claude-opus-4-8[1m]`

### Debug Log References

- Real-touch e2e debugging: the CDP `Input.dispatchTouchEvent` drag initially registered as a live translate (sheet moved with the finger) but never COMMITTED a snap. Root cause: the release decision read `@use-gesture`'s instantaneous `direction[1]`, which is 0 at the final (touch/pointer-up) event, so the `dy > 0`/`dy < 0` guards all failed and the sheet snapped back. Fixed by deriving the release direction from the accumulated movement sign. This is a genuine gesture-feel fix, not a test accommodation — it is exactly the "sheet drag feel is janky" defect AC3 targets (a real finger that lifts cleanly at the end of a drag lands the same 0-direction release).
- Stale-Turbopack-CSS trap (project-context §"Visual gate on this host"): the new `--size-bottom-sheet-collapsed-h` token resolved to `""` against a `next dev` server started before the `globals.css` edit, so the collapsed sheet fell back to `height: auto` (~286px, not 44px). Killing + restarting the dev server (fresh `.next`) recompiled the CSS and the token resolved to `calc(44px + 0px)`. Anyone re-running the touch e2e must restart `next dev` after a `globals.css` change.

### Completion Notes List

- **AC1 (mobile chips):** new `MobileTagChips` composed component rides the SHARED `TagFilterContext` — a NEW consumer of the same context the desktop nav writes, so a mobile toggle filters the list AND the pins with ZERO new filter plumbing (the existing `filterVenuesByTags(rawVenues, activeTags)` memo in MapView feeds both). Reused `collectTags`/`localizeTag` as-is (no forked filter, no hardcoded labels — the `localizeTag` live-tag-drift item stays a NOTE, not touched). Empty-state fold-in (9.7 CR): `isNearListLoading` keys the skeleton off the PRE-FILTER loaded count, so a filtered-to-empty list shows `venue.list.empty` on both breakpoints even during a background refetch.
- **AC2/AC3 (fourth snap + gesture retune):** SET the two epic-`UNKNOWN` thresholds from real behaviour — `--size-bottom-sheet-collapsed-h = calc(44px + env(safe-area-inset-bottom))` (the rendered handle strip) and `DRAG_TO_COLLAPSED_PX = 64` (peek → collapsed, verified by the touch e2e). Tests pin the BEHAVIOUR (four snaps reachable by gesture + keyboard; no axis hijack; map interactive behind collapsed), never the magic px. The `releaseDir` fix (see Debug Log) also hardens the existing peek/mid/full drag commits.
- **AC4 (desktop scroll strip):** replaced the `overflow-hidden` clip with a real `overflow-x-auto` strip + wired left/right arrow buttons (page scroll, disabled-at-ends via scroll/resize tracking) + token edge-fade gradients + focus-scroll-into-view. Did NOT re-add the Story-9.6 dead pager chevrons.
- **Query-key invariant held:** a chip toggle is a pure client `.filter()` over already-loaded venues — it never touches `useVenueSearch`/`useFavouriteVenues` or the date-only + `isLiveNow` query key. No new fetch, no API/route/schema/DTO/dependency change.
- **Regression found + fixed during dev:** an interim attempt to add `pointer: { touch: true }` to the sheet `useDrag` made `@use-gesture` prefer touch events and broke the existing `map-primary.spec.ts` synthetic-PointerEvent drag test. Reverted — the `releaseDir` fix alone makes both the synthetic-pointer test AND the CDP real-touch spec pass (Chromium synthesizes PointerEvents from CDP touch, which the default pointer mode consumes).
- **Pre-existing failures (NOT this story — confirmed on baseline via `git stash`):**
  1. `epic-11-scrub-zero-fetch.spec.ts` desktop "date change fires EXACTLY ONE request" — `planner-date-next` not visible on desktop. Fails on baseline too; a Story-11.1 (`review`) issue.
  2. `axe.spec.ts` "a11y: venue detail" — flaky `color-contrast` (2/3 runs) on `VenueDetailContent`'s `text-amber-badge-text` on `bg-amber-primary` = 4.47:1 (boundary miss of 4.5). Untouched by this story; axe's antialiased colour sampling flips at the boundary. Pre-existing amber-badge AA debt (same class as the Story-5.1 venue-card amber-label debt).
- **Maintainer follow-ups (NOT self-blessed here):** the three NEW visual states (sheet-with-active-chips, collapsed sheet, desktop chip-strip mid-scroll) need a reference-PNG rebaseline — owned by Story 11.7. The real-device four-snap + chip pass is Story 11.8's.

### File List

**Production code**
- `nextjs-app/components/custom/sheets/MobileBottomSheet.tsx` — fourth `'collapsed'` snap; four-snap `@use-gesture` decision cascade with the `releaseDir` accumulated-movement fix; `SNAP_LADDER`/`expandOneRung`/`collapseOneRung`/`clickCycle` keyboard+click cascade; collapsed-h height branch; collapsed body `aria-hidden` + `pointer-events-none`.
- `nextjs-app/components/composed/venue/MobileTagChips.tsx` — NEW. The mobile tag-chip row (data-driven, shared context, reference "on" pill, 44px target, `touch-action: pan-x` axis guard).
- `nextjs-app/components/custom/map/MapView.tsx` — render `MobileTagChips` under the mobile sort toggles; derive `allTags` from the loaded venues; `isNearListLoading` empty-vs-skeleton fix wired into both VenueList call sites; `tCommon` for the chip-row label; destructure `isActive`/`toggleTag`.
- `nextjs-app/components/custom/layout/DesktopNavBar.tsx` — NEW `TagChipStrip` + `ChipScrollArrow` (scrollable strip, arrows disabled-at-ends, edge-fades, focus scroll-into-view) replacing the `overflow-hidden` chip `<nav>`; `useRef`/`useState`/`useCallback`/`useEffect` + `ChevronLeft`/`ChevronRight` imports.
- `nextjs-app/app/globals.css` — NEW `--size-bottom-sheet-collapsed-h` token; NEW `--gradient-chip-fade-left/right` tokens + companion `@utility` rules.
- `nextjs-app/messages/sv/common.json`, `nextjs-app/messages/en/common.json` — NEW `nav.scrollFiltersLeft` / `nav.scrollFiltersRight` arrow labels.
- `nextjs-app/playwright.config.ts` — `touch` project `testMatch` now an array of both epic-11 touch specs; the four standard projects `testIgnore` the new sheet-touch spec.

**Tests**
- `nextjs-app/test/components/MobileTagChips.test.tsx` — NEW (8 tests).
- `nextjs-app/test/components/MobileBottomSheet.test.tsx` — extended (collapsed snap keyboard/render/token tests).
- `nextjs-app/test/components/MapView.test.tsx` — extended (mobile chip row + empty-state fold-in; `toggleTagMock` wired into the TagFilterContext mock).
- `nextjs-app/test/components/DesktopNavBar.test.tsx` — extended (scrollable strip + arrows + edge-fade tests; new nav message keys).
- `nextjs-app/test/e2e/epic-11-sheet-touch-gestures.spec.ts` — NEW (`--project=touch`, real-touch four-snap + axis guard).
- `nextjs-app/test/e2e/epic-11-chip-filter-parity.spec.ts` — NEW (`--project=mobile` + `--project=desktop`, chip filter list+pins parity).

## Change Log

- 2026-07-04 — Story 11.3 implemented: mobile tag-chip row in the bottom-sheet header (AC1), fourth handle-only `collapsed` sheet snap + four-snap `@use-gesture` retune with the release-direction fix + chip-row axis guard (AC2/AC3), desktop scrollable chip strip with arrows + edge-fades + keyboard scroll-into-view (AC4), and the 9.7 empty-state-skeleton fold-in. tsc/eslint/vitest (1262 pass) green; touch + chip-filter e2e green. Status → review.
