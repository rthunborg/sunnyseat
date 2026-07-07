# Story 11.2: Time-Slider Drag Fix & Planner Range Rules

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want to grab the slider thumb and drag it smoothly on both desktop and mobile,
so that picking a time feels like using a native control instead of fighting one.

## Acceptance Criteria

**AC1 — Thumb-grab hit-testing fixed; drag works with mouse AND touch, verified by touch-gesture e2e**

**Given** the decorative thumb `div` and the topPanel value badge in `TimeSlider.tsx` sit above the invisible range input without `pointer-events-none`
**When** the hit-testing is fixed (decoration made `pointer-events-none`, input remains the sole pointer target with an adequate touch height)
**Then** drag initiated ON the thumb works reliably with mouse AND touch, on desktop and mobile viewports — verified by touch-gesture e2e, not just click simulation

**AC2 — Drag state decoupled; one app-level commit per gesture; that commit fetches nothing**

**Given** every `onChange` currently commits to `TimeContext` (and thus toward the query key)
**When** drag state is decoupled — the slider tracks a local visual value during drag and commits on release/keyboard-settle/blur (the existing `onSnap` seam)
**Then** during a drag the thumb, progress fill, and time badge follow the pointer at full frame rate while the app-level time commits at most once per gesture (and with Story 11.1, that commit triggers zero fetches)

**AC3 — Date picker: only today→today+3 selectable; out-of-window forced/URL dates clamp**

**Given** the date picker (`DatePickerDialog`)
**When** dates render
**Then** only today through today+3 days are selectable; later (and past) dates are visibly disabled and unpickable, with the constraint enforced in state too (a forced/URL date outside the window clamps)

**AC4 — On today, slider min = current wall-clock time (snapped); the min advances as the clock ticks**

**Given** the selected date is today
**When** the slider renders
**Then** its effective minimum is the current wall-clock time (snapped to the planner step): earlier positions are unreachable by drag, tap, or keyboard, the elapsed track portion reads visually inert, and the minimum advances as the live clock ticks; for future dates the full planner range is available

### Design Gate Criteria

- **Visual:** Slider matches the reference `TopPanel` slider (thumb, badge, track) with the disabled/elapsed segment visually distinct
- **Behaviour:** Thumb-grab drag works on mobile + desktop; one commit per gesture; date cap + today-minimum enforced
- **Animation:** Thumb follows the pointer 1:1 during drag (no spring-lag on the grabbed thumb); badge tracks smoothly
- **Visual validation:** Screenshot of the slider (idle + today-clamped state) passes before QA handoff

_Reading (non-verbatim guidance, not part of the acceptance text):_ The touch-gesture e2e (AC1) needs a **real-touch Playwright profile** — emulated mouse-drag can pass while a real finger fails (test-design R-004). The existing `mobile` project uses `devices['iPhone 14']` which is already `hasTouch: true`, so drive real touch via `page.touchscreen`/`locator` touch dispatch there, OR add a dedicated real-touch project — dev's call, but the assertion MUST be a touch gesture, not a `click()`/`fill()`. The "one commit per gesture" (AC2) is measured by counting `TimeContext` commits (a spy on the context setter), NOT by wall-clock. The Design-Gate "Visual validation" screenshot for the today-clamped state is a NEW slider visual state → dev is FORBIDDEN from self-blessing reference PNGs; the consolidated maintainer rebaseline is owned by Story 11.7 (note it as a maintainer follow-up, do not create/edit a reference PNG). The live-perf / request-count e2e invariant (scrub = 0 requests) is registered/owned by Story 11.8; this story only has to keep the 11.1 zero-fetch seam intact (see Dev Notes) — a same-date scrub commit must still issue zero `/api/venues` requests.

## Tasks / Subtasks

- [x] **Task 1 — Fix the thumb-grab hit-testing (AC1)**
  - [x] In `components/composed/time/TimeSlider.tsx`, add `pointer-events-none` to the three decorations layered above the `<input type="range">`: the value badge (topPanel only), the track+progress wrapper, and the thumb. They are already `aria-hidden="true"`; making them `pointer-events-none` leaves the `<input>` as the SOLE pointer target so a finger/mouse landing on the thumb hits the input, not the decoration.
  - [x] Ensure the input keeps an adequate touch height — kept at `h-11` (44px WCAG minimum), `absolute inset-0`. Not shrunk.
  - [x] Did NOT change the visual appearance (thumb/badge/track token classes, `left: ${percent}%` positioning). The reference slider look is byte-identical (the spring transition is dropped ONLY during an active drag for the 1:1 pointer-follow, then restored — Design Gate "Animation").

- [x] **Task 2 — Decouple drag state from the app-level commit (AC2)**
  - [x] `TimeSlider` now tracks a LOCAL visual value (`useState<number | null>`) during an active drag: `onChange` updates only the local value (driving thumb/progress/badge at full frame rate); the app-level commit fires ONCE on settle (`onPointerUp`/`onPointerCancel` → `onMinutesChange(dragValue)` then `onSnap()`). Keyboard arrows/Home/End still commit per keypress (discrete); blur still snaps. Keyboard contract preserved (arrow ±`PLANNER_STEP_MINUTES`, Home→effective-min, End→end).
  - [x] `selectedMinutes` (the controlled prop) is the source of truth when NOT dragging (`displayMinutes = isDragging ? dragValue : clamp(selectedMinutes, min)`), so a live-clock tick / external change still moves the thumb. On release the committed prop wins (dragValue → null) — no stuck-thumb.
  - [x] `TimeSliderPanel` keeps `onMinutesChange={time.setSelectedMinutes}` / `onSnap={time.snapSelectedMinutes}` unchanged; the local-vs-committed split lives entirely inside `TimeSlider` (cleanest — panel only gains the `minMinutes` prop).
  - [x] **Zero-fetch guardrail:** the per-gesture commit does NOT reintroduce time into the query key. `epic-11-scrub-zero-fetch.spec.ts` (11.1's guard) + the new `epic-11-slider-touch-drag.spec.ts` both PASS — a same-date settled drag issues ZERO `/api/venues` requests.

- [x] **Task 3 — Planner date window = today→today+3 (AC3)**
  - [x] Added `PLANNER_MAX_FUTURE_DAYS = 3` + `plannerWindowBounds(now)` + shared `addDaysToDateKey` in `time-planner.ts`. `isPlannerDateSelectable` now = in-window (`today <= date <= today+3`) AND in-season (season FLOOR survives so a deep-winter "today" stays unplannable; the 3-day cap dominates for any near-term in-season today).
  - [x] Reconciled all consumers: `time-planner.ts` (helper + `validatePlannerDateTime` gains an `out-of-window` reason, default-on), `TimeContext.tsx` (`selectDate`/`shiftSelectedDate`/tick-effect/`plannerQuery` gate all ride the shared helper), `DatePickerDialog.tsx`. The server route opts OUT via `validatePlannerDateTime({ enforceWindow: false })` in `venue-planner.ts` — it keeps serving far-future forecast bookmarks (up to the season edge) so a stale bookmark never 400s for being beyond today+3 (route tests using `futureInSeasonDate(19)` stay 200; `out-of-season` still 400).
  - [x] `DatePickerDialog` disabled-label now has three buckets: past → `pastDate`; future-beyond-window (in-season) → new `windowDate` label; out-of-season → `unavailableDate`. Added `windowDate` i18n key to `messages/{sv,en}` (sv/en parity green).
  - [x] **Forced/URL date clamp:** `stateFromForcedPlanner` now clamps via `isPlannerDateSelectable` (was `isValidDateKey`) — an out-of-window/past forced date falls back to today, mirroring the tick-effect reset. Covered by the AC3 ATDD + updated `AppContextProviders`/`DesktopNavBar` tests (now use in-window forced dates).

- [x] **Task 4 — Today-minimum slider clamp (AC4)**
  - [x] `TimeContext` exposes a new derived `minMinutes`: on `mode === 'today'` (live, non-forced) = current wall-clock Stockholm time floored to the planner step (`todayMinMinutes`), clamped to `[START, END]`; else `PLANNER_START_MINUTES`. FLOOR (not ceil/round) so the live "now" moment stays reachable and `isLiveNow`/the date-only key never flip on a tick. `TimeSlider` clamps `onChange`/keyboard(Home/Arrow-left)/tap below the min. Future dates keep the full range.
  - [x] Plumbed `minMinutes` into `TimeSlider` as a new controlled prop (default `PLANNER_START_MINUTES`), computed in `TimeContext` from `mode` + live `currentTime`. No `new Date()` in `TimeSlider` (hydration discipline kept).
  - [x] Inert pre-min segment: a new `time-slider-elapsed` div rendered over the amber progress with the `bg-drag-handle` design token (muted neutral, distinct from the active amber fill; no ad-hoc hex). `<input min>` + `aria-valuemin` reflect the effective min.
  - [x] **Min advances on the tick:** the live-clock effect recomputes the min from the latest `currentTime`; a below-min explicit selection is pushed up on the tick. The tick advances `currentTime`/min, NEVER the date — the date-only key does not thrash (AC4 ATDD `plannerQuery.date` stable across a tick).

- [x] **Task 5 — Tests (AC1–AC4) + red-first where practical**
  - [x] **Component:** un-skipped `TimeSlider.dragdecouple.atdd.test.tsx` (AC1 pointer-events-none + sole target; AC2 one-commit-per-gesture + keyboard-still-per-keypress + reconcile; AC4 min clamp + inert token + full-range default). Existing `TimeSlider.test.tsx` still green.
  - [x] **Unit:** un-skipped `time-planner.today-window.atdd.test.ts`; migrated `time-planner.test.ts`'s `out-of-season`/`past-date` assertions to the window semantics + added the `PLANNER_MAX_FUTURE_DAYS`/`out-of-window`/`enforceWindow:false` boundary coverage.
  - [x] **Component:** un-skipped `DatePickerDialog.today-window.atdd.test.tsx`; added a `windowDate`-label case to `DatePickerDialog.test.tsx`; the existing out-of-season/past cases stay green.
  - [x] **Forced-date clamp + today-min tick-advance:** un-skipped `TimeContext.today-window-min.atdd.test.tsx` (forced-date clamp; today-min = floored wall-clock; advances on tick; no key thrash; future = full range). Fixed two scaffold assertions that had assumed round-UP snapping (the min FLOORS so the live moment stays reachable) and threaded a `forcedTime` into the forced-date wrapper (a bare `?_date=` is a no-op — existing contract).
  - [x] **E2E (real touch, AC1):** un-skipped `epic-11-slider-touch-drag.spec.ts` and added a dedicated `touch` Playwright project (`devices['Pixel 5']`, Chromium + `hasTouch`) because the real touch gesture drives raw CDP `Input.dispatchTouchEvent` (Chromium-only; the `mobile`/iPhone-14 project is WebKit where CDP is unavailable). The four existing projects exclude the spec; none broken. PASSES locally — the touch-drag on the thumb changes the committed time and issues ZERO venue requests.
  - [x] No live Met.no added; e2e uses a mocked `/api/venues` `page.route` DTO + `?_time=` forcing against `next dev`.

- [x] **Task 6 — Gates**
  - [x] `npx tsc --noEmit` → 0 errors. `npx eslint .` → 0 errors (14 pre-existing warnings in untouched files). `npx vitest run` → 1203 passed / 0 skipped (baseline 1175 passed + 26 skipped = 1201; +28 net: the 4 ATDD scaffolds un-skipped and green, +1 net-new DatePicker window-label test, +1 net-new time-planner boundary test; NONE dropped). All e2e projects green (mobile/desktop/touch/a11y/a11y-mobile spot-checked incl. scrub-zero-fetch + epic-9/10 regression).
  - [x] Real-touch e2e ran locally and PASSED under `npx playwright test epic-11-slider-touch-drag.spec.ts --project=touch`. Live/real-device confirmation handed to Story 11.8.
  - [x] The today-clamped slider (inert elapsed segment) is a NEW visual state → maintainer visual-validation follow-up owned by Story 11.7's consolidated rebaseline. Did NOT create/edit/self-bless any reference PNG.

## Dev Notes

### This story rides Story 11.1's seam — do NOT re-introduce time into the query key

Story 11.1 (status `review` on this branch) is the Epic-11 FOUNDATION. It landed the client-side day-series (`sunDaySeries` on the real-engine list DTO), a pure client derivation helper (`lib/utils/venue-day-series.ts`), and — load-bearing for THIS story — it **decoupled `time` from the TanStack query keys**: `useVenueSearch`/`useFavouriteVenues` now key on `date` (+ coords) + a new `isLiveNow` flag, NEVER on `time`. A settled same-date time change derives all per-time UI (marker %, pin state, quick-info, "Mest sol" ordering, obscured presentation) client-side from the cached series and issues **zero** `/api/venues` requests. **11.2's job is only to make the slider grabbable and commit once per gesture — it must NOT undo that decoupling.** The commit this story consolidates is exactly the commit 11.1 made fetch-free; keep it that way. (Retro-notes epic-11: "Query keys for useVenueSearch/useFavouriteVenues no longer include time (date-only + coords + isLiveNow) — later stories must not reintroduce time into these keys.")

11.1 also shipped a **BREAKING CHANGE** the dev should be aware of: callers pass an optional `isLiveNow` flag to get the live (poll + server-computes-now) path; the live-clock tick advances "now" WITHOUT thrashing the query key (the date is in the key in both live and off-live cases, so live-today ↔ off-live-today keeps the SAME key). AC4's "min advances as the clock ticks" must respect this: the minute tick advances `currentTime`/the effective min, NOT the `date` — so it must not change the query key.

### The anti-pattern this epic exists to kill (R-001, CRITICAL) — REMOVE the fetch, don't dampen it

Epics 9 and 10 each landed a real caching/debounce win (`sun-engine-cache.ts` 9.3; `useDeferredValue` 9.4) yet the ~9.6 s time-change stall SURVIVED, because the root cause (time in the query key + a fresh per-instant engine walk) was only DAMPENED. The epic thesis, from the retro-notes, is anti-"shipped-but-insufficient": the standing gate (Story 11.8) is the **request-count invariant** — settled scrub = 0 requests, date change = 1 request — plus a real-touch profile, NOT wall-clock alone. This story's decoupled-commit must land on the zero-fetch side of that line. A settled same-date drag that fires even one request is a FAIL, not a slow-but-passing result. (Test-design R-001, score 9, CRITICAL.)

### Slider hit-test + drag-decouple — exact touch points (root cause #1 + #2)

`components/composed/time/TimeSlider.tsx`:
- Decorations layered over the input, currently WITHOUT `pointer-events-none`: value badge (`:52-61`, topPanel), track+progress (`:63-72`), thumb (`:104-118`). All are `aria-hidden`. → add `pointer-events-none` to all three.
- The `<input type="range">` (`:73-103`): `min/max/step` = `PLANNER_START_MINUTES`/`PLANNER_END_MINUTES`/`PLANNER_STEP_MINUTES`, `value={selectedMinutes}`, `onChange` → `adjust()` → `onMinutesChange(snapPlannerMinutes(next))` PER STEP; `onPointerUp`/`onBlur` → `onSnap()`; keyboard handlers move by step / to Home/End. `h-11 opacity-0 cursor-grab` positioned `absolute inset-0`. → this stays the sole pointer target; refactor `adjust` to write a LOCAL value during drag and commit via `onSnap` on settle.
- `adjust` (`:43-45`) is the single place per-step change flows through — the cleanest decouple point.

`components/custom/time/TimeSliderPanel.tsx` wires the slider on both variants: `onMinutesChange={time.setSelectedMinutes}` / `onSnap={time.snapSelectedMinutes}` (`:67-68` desktop, `:85-88` mobile topPanel). It already carries the Story-11.1 `NextDayButton` (`planner-date-next` testid, `:133-145`) that flips the query key for the request-count e2e — do not remove it. The today-minimum (Task 4) is computed here (or in `TimeContext`) from `time.mode`/`time.currentTime` and passed as a new `minMinutes` prop.

### Planner range rules — the change ripples across shared helpers (root cause: maintainer decision)

Maintainer decision (2026-07-04 workshop): "dates selectable only today→today+3; on 'Idag' the slider cannot go earlier than the current time." The current rule is season-based:
- `lib/utils/time-planner.ts`: `isPlannerDateSelectable(date, now) = isDateInCurrentSunSeason(date, now) && date >= stockholmDateKey(now)` (`:103-105`); `sunSeasonBounds` = `{year}-03-01 .. {year}-10-31` (`:88-91`); `validatePlannerDateTime` returns `out-of-season`/`past-date` (`:107-134`).
- Change the upper bound to a fixed today+3 (`PLANNER_MAX_FUTURE_DAYS = 3`). This is a shared-helper change; verify all six consumers (see Task 3) and keep `validatePlannerDateTime` coherent (URL/forced dates outside the window must clamp/reject, never 500). The route does NOT import `validatePlannerDateTime` directly for date-window enforcement today (grep found no route consumer of `out-of-season`/`past-date`) — the clamp is a client/state concern via `TimeContext` + `DatePickerDialog`; the route just receives `date`/`time` params. Keep it that way; do not add server-side window rejection that could 500 a stale bookmark.

### Forced/URL date clamp point (AC3)

`?_date=`/`?_time=` → `AppContextProviders.tsx` `DevSearchParamTimeProviders` (`:80-90`, dev-only; dead-code-eliminated in prod at `:74`) → `<TimeProvider forcedDate forcedTime>`. `TimeProvider` builds `stateFromForcedPlanner` (`TimeContext.tsx:255-273`), which today validates only `isValidDateKey`. Add the today→today+3 clamp there (fall back to today when out of window), mirroring the tick effect's existing `!isPlannerDateSelectable → stateFromNow(currentTime)` reset (`:106-108`).

### Today-minimum (AC4) — derive from `mode` + live clock, keep the component controlled

`TimeContext` already exposes `mode` (`today`/`future`, `:195`), `isLiveNow`, `currentTime`, and a 60s live-clock interval that re-renders on the live path (`:101-117`). Compute the effective min = `snapPlannerMinutes(parsePlannerTime(formatTimeInStockholm(currentTime)))` clamped to `[PLANNER_START_MINUTES, PLANNER_END_MINUTES]` when `mode === 'today'`, else `PLANNER_START_MINUTES`. Pass it into `TimeSlider` as a new controlled `minMinutes` prop; clamp `onChange`/keyboard/tap below it; render the inert pre-min segment with a design token. When the tick advances the min past the current selection, clamp the selection up. Do NOT put `new Date()` in `TimeSlider`'s render — keep it pure/controlled (mirrors the `HYDRATION_SAFE_NOW_ISO` hydration discipline already in `TimeContext`).

### Animation — 1:1 pointer follow, no spring-lag on the grabbed thumb (Design Gate "Animation")

Today the thumb/badge/progress use `transition-[left] duration-default ease-spring` (`TimeSlider.tsx:55,110`), which lags the pointer. During an ACTIVE drag the thumb must track the pointer 1:1 (no spring-lag) — so the local drag value drives `left` WITHOUT the spring transition while dragging (drop the `transition-[left]` during drag, restore it for programmatic/tick moves and reduced-motion). `reducedMotion` already forces `transition-none` (`:55,:110`). Constants: `EASE_SPRING = [0.22, 1, 0.36, 1]`, `DURATION_DEFAULT_S = 0.2` in `lib/constants/animation.ts`. Do NOT introduce a new animation library or `@use-gesture` here (that is Story 11.3's sheet work) — a native range input + a local `useState` drag value is sufficient.

### Deferred-work items that overlap this story (fold in; do NOT reopen unrelated ones)

- **`TimeProvider` initial `new Date()` hydration mismatch** — already resolved in Story 2.5 (the `HYDRATION_SAFE_NOW_ISO` seed + post-hydration reset in `TimeContext`); when adding the today-minimum derivation, keep the same discipline: no `new Date()` in a render initializer, derive the min from `currentTime`/`mode` which are already hydration-safe. (Historical defer, closed — noted so the today-min work doesn't reintroduce the mismatch.)
- Everything else in `deferred-work.md` (offline shell, 404 a11y, share modal, MapLibre roots, venue-card fallbacks, the `toSunStatusToken` mapper, `vercel.json`/`.gitattributes`) is out of scope for 11.2 — do NOT touch. (`toSunStatusToken` + the build-infra debt are Story 11.7's; the slider/date-picker/TimeContext files this story owns are not on those seams.)

### Constraints ratified earlier in Epic 11 (from the epic-11 retro-notes)

- Query keys for `useVenueSearch`/`useFavouriteVenues` are `date`-only (+ coords + `isLiveNow`) and MUST NOT gain `time` back — the per-gesture commit stays fetch-free (see the first Dev Note above). This is the single most important constraint for 11.2.
- The zero-fetch invariant in 11.1 only held after fixing the live↔off-live query-key boundary (a planner-less `list` key on live vs a `planner` key off-live silently fetched on the first off-live scrub); the date-carrying key in BOTH modes via `isLiveNow` is the seam. 11.2's commit must not perturb that live↔off-live boundary — a drag that crosses live-now (e.g. dragging away from the current minute and back) must keep the same date key.
- The 11.8 gate is the request-count invariant (scrub = 0, date change = 1) + real-touch profile, NOT wall-clock alone — build the slider decouple so that invariant stays provable (the commit fires once and fetches nothing).

### API boundary + scope fences

- No API/route/schema/DTO change in this story. `sunDaySeries` and the client derivation are already in place from 11.1; 11.2 is purely the slider component, the date-picker/`TimeContext` range rules, and the today-minimum. No new dependency.
- Server-only modules (`sun-engine.ts`/`sun-engine-cache.ts`/`met-no-service.ts`) are NOT touched. The slider and `time-planner.ts`/`TimeContext.tsx`/`DatePickerDialog.tsx` are all client-safe.
- Do NOT change the geometric meaning of `sunExposurePercent`/`sunWindow`/peak, the Epic-10 gate, or the seed/fixture path.

### Testing standards

- Vitest for unit/component; Playwright for e2e (real-touch for AC1). Red-first for the P0 hit-test + range-rule + today-min tests where practical.
- CI runs Playwright against `next dev` (so `?_time=`/`?_date=` forcing fires — do NOT switch to a production build). No live Met.no in CI: seed path (flag OFF) or mocked `/api/venues` `page.route` DTO.
- Existing e2e projects: `mobile` (`iPhone 14`, `hasTouch`), `desktop` (`Desktop Chrome`), `a11y`, `a11y-mobile`. The `mobile` project already supports real touch; a dedicated real-touch project is optional — if added, register it in `playwright.config.ts` without breaking the existing four. All existing e2e specs (`smoke`, `map-primary`, `responsive-layout`, `axe`, `axe-mobile`, `epic-9-mobile-regression`, `epic-10-weather-matrix`, `epic-11-scrub-zero-fetch`) must stay green.
- Standard gate: `tsc --noEmit`, `eslint`, `vitest run`. No new dependency, no schema change, no new route.

### Project Structure Notes

- Edits: `components/composed/time/TimeSlider.tsx` (hit-test fix + local drag value + `minMinutes` prop + inert elapsed segment), `components/custom/time/TimeSliderPanel.tsx` (compute/pass `minMinutes`), `lib/utils/time-planner.ts` (today→today+3 rule + `PLANNER_MAX_FUTURE_DAYS`), `lib/contexts/TimeContext.tsx` (window + forced-date clamp + today-min derivation), `components/composed/time/DatePickerDialog.tsx` (window disable/label), plus `messages/{sv,en}` only if a new disabled-date label is needed, plus tests.
- New file(s): possibly a real-touch e2e spec (and, if chosen, a real-touch playwright project). No new production module.
- frontend-component skill is MANDATORY for the inert elapsed-track token (Task 4) and any visual touch — design-system-first, token-based, no ad-hoc hex/opacity.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 11 — Story 11.2] — ACs + Design Gate (lines ~2837-2865); root-cause blockquote #1 (decorative thumb eats pointer events, `TimeSlider.tsx`) + #2 (time in the query key per-step, dampened not removed) at ~2796-2797; maintainer decisions (today→today+3; Idag min = current time) at ~2803.
- [Source: _bmad-output/test-artifacts/test-design/test-design-epic-11.md] — R-001 (CRITICAL, the stall recurrence), R-004 (thumb-grab dead on real touch — real-touch profile mitigation), R-007 (planner range rules in state), Story-11.2 P0/P1 rows (touch-drag on thumb / one-commit-per-gesture / today→today+3 + today-min-in-state / slider visual clamp), Entry Criteria (real-touch profile before the gesture e2e), Interworking table (`TimeSlider`/`TimeContext`+`DatePickerDialog` rows), "assert behaviour not magic numbers".
- [Source: _bmad-output/auto-bmad/retro-notes/epic-11.md] — anti-"shipped-but-insufficient" (REMOVE the fetch); request-count invariant is the 11.8 gate; the live↔off-live query-key boundary fix (isLiveNow, date-only key) that 11.2 must not perturb; later stories MUST NOT reintroduce time into the venue query keys.
- [Source: _bmad-output/implementation-artifacts/11-1-client-side-day-series-instant-time-scrubbing.md] — the day-series DTO + client derivation + query-key decouple this story rides; the BREAKING CHANGE (`isLiveNow` flag, no `time` in keys); the date-change overlay + `NextDayButton` (`planner-date-next`) already added; File List of what 11.1 touched.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — `TimeProvider` initial `new Date()` hydration mismatch (closed in Story 2.5 — keep the discipline when adding the today-min derivation); all other entries out of scope.
- [Source: nextjs-app/components/composed/time/TimeSlider.tsx] — decorations `:52-61`/`:63-72`/`:104-118` (add `pointer-events-none`), input `:73-103` (sole pointer target, per-step `onChange`, `onSnap` seam, keyboard handlers), `adjust` `:43-45`, `progressPercent` `:141-143`.
- [Source: nextjs-app/components/custom/time/TimeSliderPanel.tsx] — slider wiring `:67-68,:85-88`, `NextDayButton` `:133-145`, `time.mode`/`time.currentTime` for the today-min.
- [Source: nextjs-app/lib/utils/time-planner.ts] — `isPlannerDateSelectable` `:103-105`, `isDateInCurrentSunSeason`/`sunSeasonBounds` `:88-101`, `validatePlannerDateTime` `:107-134`, `snapPlannerMinutes`/`clampPlannerMinutes` `:63-74`, `PLANNER_START/END/STEP_MINUTES` `:2-4`, `formatTimeInStockholm` `:40-48`, `stockholmDateKey` `:23-34`.
- [Source: nextjs-app/lib/contexts/TimeContext.tsx] — `mode`/`isLiveNow`/`plannerQuery` derivation `:185-231`, `selectDate`/`shiftSelectedDate` `:161-183`, live-clock tick effect `:101-117` (`LIVE_CLOCK_TICK_MS`), `stateFromForcedPlanner` `:255-273` (forced-date clamp point), `stateFromNow` `:244-253`.
- [Source: nextjs-app/components/composed/time/DatePickerDialog.tsx] — date-cell `disabled={!selectable}` + aria disabled-label `:130-164`, `isPlannerDateSelectable`/`isDateInCurrentSunSeason` consumption `:132-133`.
- [Source: nextjs-app/components/custom/layout/AppContextProviders.tsx] — `?_date=`/`?_time=` → `DevSearchParamTimeProviders` → `TimeProvider forcedDate/forcedTime` `:80-90`; prod dead-code elimination `:74`.
- [Source: nextjs-app/lib/constants/animation.ts] — `EASE_SPRING`, `DURATION_DEFAULT_S`, `EASE_ENTER/EXIT` for the 1:1 drag vs spring-restore.
- [Source: nextjs-app/playwright.config.ts] — projects (`mobile`=iPhone14 `hasTouch`, `desktop`, `a11y`, `a11y-mobile`); webServer runs `next dev`; add a real-touch project here only if chosen.
- [Source: nextjs-app/test/components/TimeSlider.test.tsx + DatePickerDialog.test.tsx + test/unit/time-planner.test.ts] — the existing contracts to extend (per-step onChange, snap-on-release, out-of-season assertions to migrate to the today+3 window).
- [Source: CLAUDE.md / AGENTS.md] — repo rulebook, Swedish-copy default, local-Docker rules.
- [Source: project-context.md] — Epic 9/10 ratified conventions, production planner-forcing gate (`?_time=`/`?_date=`), "visual gate is an LLM eyeball" (ignores sizing/spacing — assert code-level facts for the clamp/inert segment, not the eyeball).
- [Source: _bmad-output/planning-artifacts/architecture.md] — TanStack Query Key Conventions (date-only key, no time), API/DTO boundary (client consumes the series, does not re-fetch on scrub).
- [Source: nextjs-app/docs/design/DESIGN.md + _bmad-output/planning-artifacts/ux-design-specification.md] — the reference `TopPanel` slider (thumb/badge/track) + the disabled/elapsed segment treatment + motion spec (1:1 drag) for the today-clamped state.

## Dev Agent Record

### Agent Model Used

Opus 4.8 (claude-opus-4-8[1m]) — bmad-dev-story.

### Debug Log References

- Vitest baseline (pre-implementation): 1175 passed / 26 skipped (1201 total, 4 skipped files = the ATDD scaffolds).
- Vitest final: 1203 passed / 0 skipped (134 files). tsc `--noEmit` 0 errors; eslint 0 errors (14 pre-existing warnings, untouched files).
- E2e spot-checks (all green): `epic-11-slider-touch-drag.spec.ts --project=touch` (real-touch, Chromium/Pixel-5 via CDP); `smoke` + `responsive-layout` (mobile+desktop); `epic-11-scrub-zero-fetch` + `epic-9-mobile-regression` + `epic-10-weather-matrix` (mobile); `axe` + `axe-mobile` (a11y projects).
- Key decision trail: (a) the today-min snapping is FLOOR not ceil/round — ceil pushed the live "now" selection below the min and flipped `isLiveNow`, breaking the 11.1 date-only key seam; floor keeps the live moment reachable. (b) `validatePlannerDateTime` enforces the window by DEFAULT but the server route opts out (`enforceWindow: false`) — the window is a client/state concern, the route serves far-future forecast bookmarks. (c) forced `?_time=` sessions disable the today-min (min = planner start) so `?_time=13:00` renders verbatim regardless of the machine wall clock.

### Completion Notes List

- **AC1 (thumb-grab):** the three `aria-hidden` decorations (value badge, track+progress, thumb) now carry `pointer-events-none`; the `<input type=range>` (`h-11`, `absolute inset-0`) is the sole pointer target. Proven by the real-touch e2e (a finger on the thumb grabs it and changes the committed time).
- **AC2 (drag decouple):** `TimeSlider` tracks a local `dragValue` during a pointer drag (thumb/progress/badge follow per step) and commits the app-level time exactly once on release; keyboard stays per-keypress; blur snaps. The commit stays fetch-free — same-date settled drag = 0 `/api/venues` requests (guardrail intact).
- **AC3 (today→today+3 window):** `PLANNER_MAX_FUTURE_DAYS = 3` + `plannerWindowBounds`; `isPlannerDateSelectable` = in-window AND in-season; all state consumers reconciled; forced/URL out-of-window dates clamp to today; the date picker disables + labels out-of-window future dates with a new `windowDate` copy (sv/en). Server route keeps far-future forecast bookmarks working.
- **AC4 (today-minimum):** `TimeContext.minMinutes` = floored current wall-clock on live-today (else planner start); `TimeSlider` clamps drag/tap/keyboard below it, reflects it in `min`/`aria-valuemin`, and renders an inert `time-slider-elapsed` segment (`bg-drag-handle` token). The min advances on the 60s tick and pushes a below-min explicit selection up, without thrashing the date-only key.
- **Deviations from the story's literal guidance (both defensible, documented above):** today-min uses FLOOR not the story's "snapped up" wording (correctness — preserves the live-now seam); the window rule keeps the season FLOOR (a deep-winter "today" stays unplannable and the existing "no planner query outside season" contract holds) rather than being purely season-independent.
- **Breaking change:** `TimeContextValue` gains a required `minMinutes: number` field, and `DatePickerDialogLabels` gains an optional `windowDate?: string`. `validatePlannerDateTime` adds an `out-of-window` reason + an `enforceWindow` option (default `true`) — any non-route caller now rejects a beyond-today+3 date by default.
- **Maintainer follow-ups:** (1) the today-clamped slider (inert elapsed segment) is a NEW visual state → Story 11.7's consolidated reference-PNG rebaseline (dev did NOT self-bless any PNG). (2) Live/real-device touch + perf confirmation → Story 11.8.

### File List

**Production (edited):**
- `nextjs-app/components/composed/time/TimeSlider.tsx` — hit-test fix (`pointer-events-none`), local drag value + one-commit-on-settle, `minMinutes` prop + below-min clamp + inert elapsed segment, 1:1 drag (drop spring transition while dragging).
- `nextjs-app/components/custom/time/TimeSliderPanel.tsx` — pass `minMinutes={time.minMinutes}` (both variants) + `windowDate` label.
- `nextjs-app/lib/utils/time-planner.ts` — `PLANNER_MAX_FUTURE_DAYS`, `plannerWindowBounds`, `addDaysToDateKey`, window-based `isPlannerDateSelectable`, `validatePlannerDateTime` `out-of-window` reason + `enforceWindow` option.
- `nextjs-app/lib/contexts/TimeContext.tsx` — `minMinutes` derivation (`todayMinMinutes`, floored), forced-date window clamp in `stateFromForcedPlanner`, tick-effect below-min push-up, forced-session min opt-out.
- `nextjs-app/components/composed/time/DatePickerDialog.tsx` — three-bucket disabled label (past / beyond-window / out-of-season) + `windowDate` label field.
- `nextjs-app/lib/services/venue-planner.ts` — route opts out of window enforcement (`enforceWindow: false`).
- `nextjs-app/messages/sv/venue.json`, `nextjs-app/messages/en/venue.json` — new `windowDate` label.
- `nextjs-app/playwright.config.ts` — new `touch` project (Pixel 5, Chromium/hasTouch) scoped to the touch-drag spec; four existing projects exclude it.

**Tests (edited / un-skipped):**
- `nextjs-app/test/components/TimeSlider.dragdecouple.atdd.test.tsx` — un-skipped.
- `nextjs-app/test/unit/time-planner.today-window.atdd.test.ts` — un-skipped.
- `nextjs-app/test/components/DatePickerDialog.today-window.atdd.test.tsx` — un-skipped.
- `nextjs-app/test/unit/TimeContext.today-window-min.atdd.test.tsx` — un-skipped; fixed 2 snapping assertions (floor) + threaded a `forcedTime` into the forced-date wrapper.
- `nextjs-app/test/e2e/epic-11-slider-touch-drag.spec.ts` — un-skipped; runs under `--project=touch`.
- `nextjs-app/test/unit/time-planner.test.ts` — migrated out-of-season/past assertions to the window; added the `PLANNER_MAX_FUTURE_DAYS`/`out-of-window`/`enforceWindow` boundary test.
- `nextjs-app/test/components/DatePickerDialog.test.tsx` — added the `windowDate`-label case + label fixture.
- `nextjs-app/test/unit/TimeContext.test.tsx` — migrated two future-date cases to in-window dates.
- `nextjs-app/test/components/AppContextProviders.test.tsx` — `FORCED_DATE` now an in-window (today+2) date so the AC3 clamp is exercised.
- `nextjs-app/test/components/DesktopNavBar.test.tsx` — two forcing cases use an in-window date.

### Change Log

- 2026-07-04 — Story 11.2 implemented (bmad-dev-story). Slider thumb-grab hit-test fix + per-gesture drag decouple (one fetch-free commit on settle); planner date window narrowed to today→today+3 across all state consumers with an out-of-window forced-date clamp and a server-route opt-out; today-minimum slider clamp (floored live wall-clock, inert elapsed segment, advances on the clock tick). All ATDD scaffolds un-skipped and green; real-touch e2e added under a new Chromium `touch` project. Status → review.
- 2026-07-04 — Review-findings pass (bmad-dev-story). Resolved 3 findings: (1) AC4 min-clamp now enforced in STATE — `setSelectedMinutes`/`snapSelectedMinutes` floor a below-min commit via `clampBelowStateMin`/`stateEffectiveMin` (live-today only; forced-session + future-date opt out to the planner start), with 5 new state-layer tests in `TimeContext.min-edge-cases.automate.test.tsx` (below-min floor, forced/future opt-out, at/above-min no-op). (2) AC1 real-touch e2e is now a live CI gate — added `npx playwright test --project=touch` step to `.github/workflows/build-and-test-nextjs.yml` (Chromium already installed; spec forces `?_time=13:00` for determinism). (3) Removed the dead `useRef` import in `TimeSlider.tsx`. Gates: tsc 0 errors; eslint 0 errors / 13 warnings (was 14 — the useRef warning removed; rest pre-existing untouched files); vitest 1237 passed / 0 skipped (was 1232 → +5 new state tests). The deferred `[Review][Defer][Low]` keyboard-during-drag item left as-is.

### Review Findings

- [x] [Review][Decision][Med] AC4 min-clamp is enforced only inside `TimeSlider`, not in state — a direct `setSelectedMinutes` can seat a below-min value — AC4's text says "unreachable … enforced in state too", but neither `setSelectedMinutes` (`TimeContext.tsx:170-177`) nor `snapSelectedMinutes` (`:179-188`) clamps to `minMinutes`; they only `snapPlannerMinutes`. The min clamp lives purely in `TimeSlider.clampMinutes`/`effectiveMin`. The live-tick push-up (`TimeContext.tsx:130-139`) only pushes up an existing selection when a tick advances the min, not an arbitrary programmatic `setSelectedMinutes(9*60)` on today. The normal UI flow is safe (the slider clamps before committing), so this is a defense-in-depth / literal-spec-wording gap, not a live defect, and it is untested (`TimeContext.min-edge-cases.automate.test.tsx` never asserts state-level rejection of a below-min commit). Recommended: fix: add a `minMinutes`-aware floor inside `setSelectedMinutes`/`snapSelectedMinutes` (clamp to the derived today-min) so the "enforced in state" AC4 guarantee is a state-layer invariant, and add the missing below-min-commit state test — cheap, matches the AC wording, and closes the only untested seam.
- [x] [Review][Decision][Med] AC1 real-touch e2e never runs in CI — the headline-AC gate is dormant — `epic-11-slider-touch-drag.spec.ts` runs ONLY under `--project=touch` (Pixel 5, Chromium CDP `Input.dispatchTouchEvent`), and the four standard projects `testIgnore` it (`playwright.config.ts`). But CI (`.github/workflows/build-and-test-nextjs.yml:110`) invokes only `--project=mobile --project=desktop` (+ `a11y` at `:113`) and installs only `chromium webkit` (`:97`) — it never runs the `touch` project. So the sole automated proof of AC1's real-touch thumb-grab drag ran locally only ("PASSES locally") and is not a CI gate; a future hit-testing regression would ship green. The story defers live/real-device confirmation to Story 11.8, but the *automated* touch-drag assertion is this story's deliverable. Recommended: fix: add a CI e2e step `npx playwright test --project=touch` in `build-and-test-nextjs.yml` (chromium is already installed) so AC1 is a live gate now, rather than waiting on 11.8's real-device pass.
- [x] [Review][Patch][Low] Unused `useRef` import introduced by this diff [nextjs-app/components/composed/time/TimeSlider.tsx:3] — the React import was widened to `import { useMemo, useRef, useState } from 'react';` but `useRef` is never referenced (only `useMemo`/`useState` are used). The auditor's "breaks the eslint 0-errors gate" premise does not hold — `@typescript-eslint/no-unused-vars` is configured as `warn`, not `error` (`eslint.config.mjs:60`), so this is a warning, not a gate-breaking error — but it is still a dead import this change added; remove `useRef` from the import.
- [x] [Review][Defer][Low] Keyboard commit during an un-released pointer drag leaves a stale `dragValue` [nextjs-app/components/composed/time/TimeSlider.tsx:158-175] — the keyboard handlers call `commit(...)` (fires `onMinutesChange`) but do NOT clear `dragValue`; if a `pointerDown` set `dragValue` and the user presses an arrow/Home/End before `pointerUp`, `isDragging` stays true so a subsequent `onChange` keeps writing the local value and the committed keyboard value can be visually overwritten until a `pointerUp`/`pointerCancel` reconciles. Uncommon interleaved input sequence; self-heals on the next pointer settle; no test exercises it — deferred, pre-existing edge behaviour, minor.
