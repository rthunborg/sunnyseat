# Story 11.2: Time-Slider Drag Fix & Planner Range Rules

Status: ready-for-dev

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

- [ ] **Task 1 — Fix the thumb-grab hit-testing (AC1)**
  - [ ] In `components/composed/time/TimeSlider.tsx`, add `pointer-events-none` to the three decorations layered above the `<input type="range">`: the value badge (`:52-61`, topPanel only), the track+progress wrapper (`:63-72`), and the thumb (`:104-118`). They are already `aria-hidden="true"`; making them `pointer-events-none` leaves the `<input>` (`:73-103`) as the SOLE pointer target so a finger/mouse landing on the thumb hits the input, not the decoration. (This is root-cause #1 from the Epic-11 blockquote: "the slider's decorative thumb eats pointer events".)
  - [ ] Ensure the input keeps an adequate touch height. Today it is `h-11` (44px, the WCAG touch-target minimum) — keep at least that; the `topPanel` variant's visible row is `min-h-12 pt-4` so confirm the 44px input still fully overlaps the thumb travel and is not clipped by the `pt-4`. Do NOT shrink the hit area below 44px.
  - [ ] Do NOT change the visual appearance (thumb/badge/track styling, `left: ${percent}%` positioning, `ease-spring` transition) — this is a hit-test-only fix. The reference slider look must be byte-identical (Design Gate "Visual").

- [ ] **Task 2 — Decouple drag state from the app-level commit (AC2)**
  - [ ] `TimeSlider` currently calls `onMinutesChange(snapPlannerMinutes(next))` on EVERY input `onChange` (`:43-45,:81`), which `TimeSliderPanel` wires directly to `time.setSelectedMinutes` (commits to `TimeContext` per step). Refactor so the slider tracks a LOCAL visual value (`useState`) during an active drag: `onChange` updates only the local value (driving the thumb/progress/badge at full frame rate), and the app-level commit fires once on settle via the EXISTING `onSnap` seam (`onPointerUp` `:82`, `onBlur` `:101`, and keyboard settle). Keyboard arrows/Home/End should still commit per keypress (they are discrete, not a drag) OR commit on the existing settle — preserve the current keyboard contract (arrow moves by `PLANNER_STEP_MINUTES`, Home→start, End→end) and keep `onSnap` firing on blur.
  - [ ] Keep `selectedMinutes` (the controlled prop) as the source of truth when NOT dragging, so a live-clock tick or an external time change still updates the thumb. Reconcile the local drag value with the incoming prop on drag end (the committed value wins). Avoid a stale-local-value bug where the thumb sticks after release.
  - [ ] `TimeSliderPanel` keeps passing `onMinutesChange={time.setSelectedMinutes}` / `onSnap={time.snapSelectedMinutes}` OR is adjusted so the per-step `onChange` no longer reaches `TimeContext` — the goal is: during a drag the app-level `selectedMinutes`/`plannerQuery` commits AT MOST ONCE (on release), not per step. Decide where the local-vs-committed split lives (inside `TimeSlider` is cleanest; the panel's props barely change).
  - [ ] **Zero-fetch guardrail (hard, inherited from Story 11.1):** the single per-gesture commit must NOT reintroduce time into the TanStack query key. Story 11.1 decoupled time from the `useVenueSearch`/`useFavouriteVenues` keys (keys are `date` + coords + `isLiveNow`, NEVER `time`) and derives all per-time UI client-side from `sunDaySeries`. This story only changes WHEN the commit fires (once per gesture instead of per step) — it must leave that decoupling intact. A same-date settled drag commit that issues even one `/api/venues` request is a FAIL (R-001). Do NOT add `time`/`selectedMinutes` back into any query key; do NOT re-fetch on scrub commit.

- [ ] **Task 3 — Planner date window = today→today+3 (AC3)**
  - [ ] The date-selectability rule TODAY is "in the current sun season (Mar 1–Oct 31) AND date >= today" via `isPlannerDateSelectable`/`isDateInCurrentSunSeason` in `lib/utils/time-planner.ts:97-105`. AC3 REPLACES the upper bound with a fixed **today→today+3** window (4 days: today, +1, +2, +3). Change the selectability rule so a date is selectable iff `stockholmDateKey(now) <= date <= stockholmDateKey(now + 3 days)`. Add a named constant (e.g. `PLANNER_MAX_FUTURE_DAYS = 3`). Keep past dates unpickable (already the case).
  - [ ] `isPlannerDateSelectable` is consumed in SIX places — change the shared helper once and verify every consumer stays coherent: `time-planner.ts` (definition + `validatePlannerDateTime`'s `out-of-season`/`past-date` reasons), `TimeContext.tsx` (`selectDate` `:161-173`, `shiftSelectedDate` `:175-183`, the live-clock tick effect `:101-117`, and the `plannerQuery` gate `:196,:208`), `DatePickerDialog.tsx` (`:133`), plus the route/detail-route tests that assert `validatePlannerDateTime`. Decide whether the sun-season concept survives at all: AC3's window is today→today+3 regardless of season, so the season bound is now effectively dominated by the 3-day cap for any near-term "today" (season only matters if the user is within 3 days of a season edge). Keep `validatePlannerDateTime` coherent — a date beyond today+3 must be rejected (reuse/rename the `out-of-season`/`past-date` reasons or add an `out-of-window` reason; keep the URL-clamp behaviour, do not 500).
  - [ ] `DatePickerDialog` visibly disables + makes unpickable any date outside the window (it already renders `disabled={!selectable}` with `cursor-not-allowed opacity-40` and an aria disabled-label at `:141-158`); confirm the disabled-label copy still reads sensibly for a "beyond today+3" date (reuse `unavailableDate` or add a window-specific label + i18n key in `messages/{sv,en}` if the current copy is misleading; keep sv/en parity, `messages-parity` green).
  - [ ] **Forced/URL date outside the window clamps (AC3, "enforced in state too"):** a `?_date=` outside today→today+3 must clamp into the window, not render an out-of-range planner. The forcing path is `AppContextProviders.tsx` → `TimeProvider forcedDate` → `stateFromForcedPlanner` (`TimeContext.tsx:255-273`), which today only checks `isValidDateKey` and does NOT clamp to the selectable window. Add the clamp in `stateFromForcedPlanner`/`TimeProvider` so a forced date beyond today+3 (or in the past) falls back to today (or the nearest in-window date) — mirror how the tick effect already resets to now when `!isPlannerDateSelectable` (`:106-108`). This is dev-only (`?_date=` is dead-code-eliminated in production per `AppContextProviders.tsx:74`), but the state-clamp must be correct so the e2e `?_date=` path is testable.

- [ ] **Task 4 — Today-minimum slider clamp (AC4)**
  - [ ] On the selected date `today` (`TimeContext` exposes `mode: 'today' | 'future'` `:195` and `isLiveNow`), the slider's effective minimum is the CURRENT wall-clock Stockholm time snapped up to the planner step (`snapPlannerMinutes`), clamped into `[PLANNER_START_MINUTES, PLANNER_END_MINUTES]`. Earlier positions must be unreachable by drag, tap, AND keyboard: clamp `onChange`, the keyboard Home/Arrow-left handlers, and any tap-to-position so a value below the effective min snaps to the min. For `mode === 'future'` the full 06:00–21:00 range is available (no clamp).
  - [ ] Plumb the effective min into `TimeSlider` (a new prop, e.g. `minMinutes` defaulting to `PLANNER_START_MINUTES`). Compute it in `TimeSliderPanel`/`TimeContext` from `mode` + the live `currentTime` (reuse `formatTimeInStockholm`/`parsePlannerTime` + `snapPlannerMinutes`). Do NOT hardcode the current time in `TimeSlider`; keep the component pure/controlled.
  - [ ] The elapsed (below-min) track portion reads visually **inert**: render the pre-min segment in a muted/disabled token (design-system token, no ad-hoc hex/opacity — frontend-component skill) distinct from the active progress fill. The `<input min={...}>` should reflect the effective min so native constraint + `aria-valuemin` are correct.
  - [ ] **The min advances as the clock ticks:** `TimeContext`'s live-clock interval (`:101-117`, `LIVE_CLOCK_TICK_MS = 60_000`) already re-renders every minute on the live path; ensure the effective-min derivation is recomputed from the latest `currentTime` so the inert segment grows as time passes and the current selection is pushed forward if it falls below the new min. If the currently-selected time drops below the advanced min (e.g. user idles across a step boundary), clamp it up to the new min. Do NOT thrash the query key on a tick (the 11.1 `isLiveNow`/date-only key must not change on a minute tick — the tick advances `currentTime`/min, not the `date`).

- [ ] **Task 5 — Tests (AC1–AC4) + red-first where practical**
  - [ ] **Component (`TimeSlider.test.tsx`):** the three decorations carry `pointer-events-none` and are `aria-hidden`; the `<input>` is the sole pointer target with `h-11`. During a simulated drag, per-step `onChange` updates the LOCAL value (thumb/progress/badge track) but the app-level commit (`onSnap`/`onMinutesChange` to context) fires AT MOST ONCE on release; keyboard arrows still commit per keypress and blur still snaps. Assert the today-clamp: with `minMinutes` set, a value/keyboard/arrow below the min snaps to the min and the input's `min`/`aria-valuemin` reflect it; the elapsed segment renders the inert token. (P0/P1, R-004/R-007.)
  - [ ] **Unit (`time-planner.test.ts`):** the new today→today+3 selectability — today selectable, +1/+2/+3 selectable, +4 NOT selectable, yesterday NOT selectable; `validatePlannerDateTime` rejects a beyond-window date and accepts an in-window one; add the `PLANNER_MAX_FUTURE_DAYS` boundary. Update the existing `out-of-season`/`past-date` assertions (`:55-85`) to the new window semantics (do not silently break them). (P0, R-007.)
  - [ ] **Component (`DatePickerDialog.test.tsx`):** today+3 is selectable/pickable, today+4 is `disabled` + unpickable with the disabled aria-label; a past date stays disabled. Update the existing "out-of-season" case (`:36-54`, currently uses 2026-10-31/11-01) to the today+3 window semantics. (P0, R-007.)
  - [ ] **Unit/Component (forced-date clamp):** a `?_date=`/`forcedDate` beyond today+3 (or in the past) clamps to an in-window date in `TimeProvider` state (extend `clean-url-date-selection.test.tsx` or a `TimeContext`/`AppContextProviders` test). (P1, R-007.)
  - [ ] **Component (today-minimum tick-advance, fake timers):** with `mode === 'today'` and a fixed clock, the effective min = snapped current wall-clock time; advancing the fake clock past a step boundary advances the min and pushes a below-min selection up; `mode === 'future'` has the full range. Reuse the `TimeContext` fake-timer pattern. (P1, R-007.)
  - [ ] **E2E (real touch, AC1):** a touch-drag initiated ON the thumb changes the committed time, on the mobile viewport (`iPhone 14`, `hasTouch`) — a real touch gesture (`page.touchscreen`/touch dispatch), NOT a `click()`/`fill()`. Also assert (or leave the seam for 11.8) that the drag issues ZERO `/api/venues` requests on a same date and commits time exactly once. If a dedicated real-touch project is added, register it in `playwright.config.ts` (mobile + `hasTouch`); do NOT break the existing `mobile`/`desktop`/`a11y`/`a11y-mobile` projects. (P0, R-004; the standing request-count guard is owned by 11.8 — leave the seam testable here.)
  - [ ] Do NOT add live Met.no to any test. E2E uses the seed path (flag OFF) or a mocked `/api/venues` `page.route` DTO (the `epic-10-weather-matrix.spec.ts` precedent). CI runs Playwright against `next dev` so `?_time=`/`?_date=` forcing fires (do not switch the webServer to a production build).

- [ ] **Task 6 — Gates**
  - [ ] `npx tsc --noEmit` → 0 errors. `npx eslint .` → 0 new errors. `npx vitest run` → all green, count increases (new slider/date-window/today-min tests), none dropped. Record baseline→final test count in the Dev Agent Record.
  - [ ] Run the touch-gesture e2e locally if the environment allows; if the real-touch e2e cannot run in-session, record the exact spec + how to run it and hand any live/real-device confirmation to Story 11.8 / the maintainer (do NOT fabricate a pass).
  - [ ] The today-clamped slider is a NEW visual state → note the maintainer visual-validation follow-up (Story 11.7 rebaseline). Do NOT create/edit/self-bless any reference PNG.

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

### Debug Log References

### Completion Notes List

### File List
