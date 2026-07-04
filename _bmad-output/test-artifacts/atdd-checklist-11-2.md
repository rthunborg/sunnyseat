---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04-generate-tests'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-07-04'
inputDocuments:
  - '_bmad-output/implementation-artifacts/11-2-time-slider-drag-fix-planner-range-rules.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-11.md (R-004 / R-007 / R-002 / R-001 rows + Story-11.2 P0/P1 table)'
  - '_bmad-output/test-artifacts/atdd-checklist-11-1.md (house-style precedent)'
  - 'nextjs-app/test/e2e/epic-11-scrub-zero-fetch.spec.ts (page.route DTO + forceMiddayTime + forbidLiveMetno precedent)'
  - 'nextjs-app/test/components/TimeSlider.test.tsx + DatePickerDialog.test.tsx (component-test house style to extend)'
  - 'nextjs-app/test/unit/time-planner.test.ts + TimeContext.test.tsx (helper + fake-timer patterns to extend)'
  - 'nextjs-app/components/composed/time/TimeSlider.tsx / components/custom/time/TimeSliderPanel.tsx / lib/utils/time-planner.ts / lib/contexts/TimeContext.tsx / playwright.config.ts'
---

# ATDD Checklist: Story 11.2 — Time-Slider Drag Fix & Planner Range Rules

## TDD Red Phase (Current)

All acceptance scaffolds below are authored in the **red phase**: every `describe`/`it`/`test`
block is `.skip`-ed and asserts the EXPECTED post-implementation behaviour. They compile & collect
against the current tree (`tsc --noEmit` clean; `vitest run` collects them as skipped) and stay
green-because-skipped in CI until the dev un-skips them task-by-task as each goes green. No latency
timers (project lesson: wall-clock is flaky); the acceptance signal is **commit call-count /
request-count / clamp behaviour / pointer-events / boundary selectability / query-key identity** —
all deterministic. New props/exports the scaffolds reference ahead of their existence
(`minMinutes`, `PLANNER_MAX_FUTURE_DAYS`, the context effective-min field, the `time-slider-elapsed`
testid, the `date-change-overlay`/`planner-date-next` already-present testids) are accessed via typed
spreads / dynamic imports / property probes so the `.skip`-ed files type-check NOW and go red at
runtime only when un-skipped.

### Step 1 — Preflight & Context

- **Detected stack:** `fullstack` (Next.js app + API routes under `nextjs-app/`; `playwright.config.ts`
  + `vitest.config.ts` both present).
- **Prerequisites:** Story approved with clear ACs (AC1–AC4 + Design Gate). Playwright + Vitest configured.
  ✅ Satisfied.
- **Framework & patterns loaded:** Vitest for unit/component; Playwright for e2e (real touch for AC1).
  Reused house-style precedents: `TimeSlider.test.tsx` / `DatePickerDialog.test.tsx` (Testing Library +
  `fireEvent`, testid-driven, token-class asserts), `TimeContext.test.tsx` (`renderHook` + fake-timer clock),
  `time-planner.test.ts` (pure boundary asserts with an injected `now`), `epic-11-scrub-zero-fetch.spec.ts`
  (`page.route` DTO fulfillment, `forceMiddayTime` `?_time=13:00`, `forbidLiveMetno`, request COUNTER, no
  live Met.no).
- **TEA config flags:** `test_stack_type: auto` → fullstack; `tea_use_playwright_utils: true`;
  `tea_execution_mode: auto` → resolved **sequential** (scaffolds authored inline; no subagent runtime).
- **Real-touch profile:** the existing `mobile` project (`devices['iPhone 14']`, `hasTouch: true`) already
  supports real touch → NO new Playwright project needed; the e2e drives real touch via CDP
  `Input.dispatchTouchEvent` and self-skips under `desktop` (no touchscreen). (Entry-criteria R-004 satisfied
  without perturbing the existing four projects.)

### Step 2 — Generation Mode

- **Mode:** AI generation (ACs are clear; scenarios are pointer-events / commit-count / boundary-rule /
  request-count + one real-touch interaction seam). No live-browser recording — the e2e reuses the
  established `page.route` mocked-DTO pattern and the CDP touch primitive, not recorded selectors.

### Step 3 — Test Strategy (AC → level → priority)

| AC | Scenario | Level | Priority | Risk | Scaffold file |
| -- | -------- | ----- | -------- | ---- | ------------- |
| AC1 | The three decorations (badge/track/thumb) carry `pointer-events-none` + stay `aria-hidden`; the `<input>` is the sole pointer target with `h-11` (>=44px); reference look unchanged | Component | P0 | R-004 | `test/components/TimeSlider.dragdecouple.atdd.test.tsx` |
| AC1 | A REAL touch-drag initiated ON the thumb changes the committed planner time on the mobile viewport (CDP touch, not click/fill/mouse), and issues ZERO `/api/venues` requests same-date | E2E (real-touch) | P0 | R-004, R-001 | `test/e2e/epic-11-slider-touch-drag.spec.ts` |
| AC2 | During a drag, per-step `onChange` drives the LOCAL visual value but the app-level commit fires AT MOST ONCE on settle (`onSnap`); local value reconciles with the controlled prop on release (no stuck thumb); keyboard arrows/Home/End still commit per keypress, blur still snaps | Component | P0 | R-002 | `test/components/TimeSlider.dragdecouple.atdd.test.tsx` |
| AC3 | today→today+3 selectability (today/+1/+2/+3 selectable, +4 not, yesterday not); `PLANNER_MAX_FUTURE_DAYS = 3`; `validatePlannerDateTime` rejects beyond-window & accepts in-window without 500 | Unit | P0 | R-007 | `test/unit/time-planner.today-window.atdd.test.ts` |
| AC3 | Dialog renders today+3 pickable (fires `onSelectDate`), today+4 disabled + unpickable with the disabled aria-label, past date disabled | Component | P0 | R-007 | `test/components/DatePickerDialog.today-window.atdd.test.tsx` |
| AC3 | A forced/URL date beyond today+3 (or in the past) clamps into the window in `TimeProvider` state (in-window forced date preserved) | Unit (state) | P1 | R-007 | `test/unit/TimeContext.today-window-min.atdd.test.tsx` |
| AC4 | `minMinutes` prop: below-min value/arrow-left/Home snaps UP to the min; native `min` + `aria-valuemin` reflect it; inert `time-slider-elapsed` segment (non-amber token); future (default min) keeps full range | Component | P1 | R-007 | `test/components/TimeSlider.dragdecouple.atdd.test.tsx` |
| AC4 | Context exposes the snapped current wall-clock as the effective min on `today`; the min ADVANCES on a clock tick + pushes a below-min selection up; the tick does NOT thrash the date-only query key; future date → planner start | Unit (fake-timer state) | P1 | R-007 | `test/unit/TimeContext.today-window-min.atdd.test.tsx` |

- **Red-phase requirement confirmed:** every block designed to FAIL before implementation — decorations lack
  `pointer-events-none`, `onChange` still commits per step, `minMinutes`/`PLANNER_MAX_FUTURE_DAYS`/the
  context effective-min/`time-slider-elapsed` do not exist yet, `isPlannerDateSelectable(today+4)` is
  currently TRUE, and `stateFromForcedPlanner` does not clamp. All `.skip`-ed.
- **Dedup discipline (from the epic test design):** hit-test + drag-decouple + today-clamp at COMPONENT only;
  window MATH at UNIT only; window RENDER at DIALOG only; forced-clamp + today-min-in-state at CONTEXT only;
  the real-touch gesture at E2E only. The one deliberate defence-in-depth is R-001 zero-fetch, asserted at the
  e2e as the seam the epic wants provable (the standing request-count guard itself is Story 11.8's).

## Acceptance Criteria Coverage

- **AC1 (thumb-grab hit-testing fixed; drag works w/ mouse AND touch, verified by touch-gesture e2e):**
  ✅ covered — component (pointer-events + sole-target + touch-height) + real-touch e2e (CDP touch drag
  changes committed time).
- **AC2 (drag state decoupled; one app-level commit per gesture; that commit fetches nothing):**
  ✅ covered — component (per-step local value, single commit on settle, reconcile-on-release, keyboard
  contract preserved) + e2e (same-date drag = 0 venue requests, seam owned/extended by 11.8).
- **AC3 (date picker today→today+3; out-of-window forced/URL dates clamp):** ✅ covered — unit window math +
  dialog render + `TimeContext` forced-date clamp.
- **AC4 (today slider min = snapped current wall-clock; min advances as the clock ticks):** ✅ covered —
  component clamp/inert-segment + `TimeContext` fake-timer tick-advance + no-key-thrash.

## Generated Files (all RED / skipped)

1. `nextjs-app/test/components/TimeSlider.dragdecouple.atdd.test.tsx` — P0 AC1 hit-test + AC2 drag-decouple +
   P1 AC4 today-clamp (11 tests)
2. `nextjs-app/test/unit/time-planner.today-window.atdd.test.ts` — P0 AC3 today→today+3 selectability +
   `PLANNER_MAX_FUTURE_DAYS` + `validatePlannerDateTime` coherence (6 tests)
3. `nextjs-app/test/components/DatePickerDialog.today-window.atdd.test.tsx` — P0 AC3 dialog render
   (today+3 pickable / today+4 disabled / past disabled) (3 tests)
4. `nextjs-app/test/unit/TimeContext.today-window-min.atdd.test.tsx` — P1 AC3 forced-date clamp + P1 AC4
   today-min tick-advance + no-key-thrash (6 tests)
5. `nextjs-app/test/e2e/epic-11-slider-touch-drag.spec.ts` — P0 AC1 real-touch thumb-drag changes committed
   time + AC2 zero-fetch seam (mobile/`hasTouch`; CDP `Input.dispatchTouchEvent`; `test.describe.skip`)

> **Note on the e2e / Story 11.8 boundary:** the *standing* request-count + real-touch guards are OWNED by
> Story 11.8. This spec proves the 11.2 seam NOW (real touch changes committed time + a same-date drag adds
> zero requests) so 11.8 can promote/extend it. `test.describe.skip` until Tasks 1+2 land.

> **Note on the forced-date-clamp home:** the story suggested "extend `clean-url-date-selection.test.tsx` OR a
> `TimeContext`/`AppContextProviders` test". The clamp is a `TimeProvider`-state concern, so it lives in the
> new `TimeContext.today-window-min.atdd.test.tsx` alongside the today-min state tests (one cohesive
> state-level scaffold) rather than a 6th file.

## Next Steps (TDD Green Phase)

After implementing Story 11.2 (per its Tasks 1–6):

1. Un-skip each scaffold block as the corresponding task goes green (Task 1 → AC1 hit-test component + start
   the touch e2e; Task 2 → AC2 decouple component + finish the touch e2e zero-fetch; Task 3 → AC3 unit +
   dialog + forced-clamp; Task 4 → AC4 component clamp + context tick-advance), NOT all at once.
2. Replace the red-phase shims with the real API as each lands: `{...withMin(MIN)}` → typed `minMinutes={MIN}`;
   the dynamic `PLANNER_MAX_FUTURE_DAYS` import → a static import; the `minutesMin(...)` context probe → the
   real exposed field name.
3. Run `npx vitest run` (unit/component) + `npx playwright test --project=mobile test/e2e/epic-11-slider-touch-drag.spec.ts`
   (real touch) → verify PASS (green phase). Record baseline→final vitest count in the Dev Agent Record (count
   must increase, none dropped).
4. If the AC2 "one commit per gesture" block fails because the app committed per step, that is a FEATURE bug in
   the decouple — FIX the implementation, do NOT relax the `toBeLessThanOrEqual(1)` assertion.
5. The today-clamped slider is a NEW visual state → note the maintainer visual-validation follow-up (Story 11.7
   rebaseline). Do NOT create/edit/self-bless any reference PNG.

## Implementation Guidance (from the scaffolds)

- **New prop the dev must add:** `TimeSlider` gains a controlled `minMinutes?: number` (default
  `PLANNER_START_MINUTES`); clamp `onChange`/keyboard/tap below it; reflect it in the native `<input min>` +
  `aria-valuemin`; render an inert pre-min segment under a NEW `time-slider-elapsed` testid using a
  design-system token (NOT `amber-primary`).
- **New export:** `PLANNER_MAX_FUTURE_DAYS = 3` in `time-planner.ts`; rewrite `isPlannerDateSelectable` to
  `stockholmDateKey(now) <= date <= stockholmDateKey(now + 3d)`; keep `validatePlannerDateTime` coherent
  (reject beyond-window without 500 — reuse/rename `out-of-season`/`past-date` or add `out-of-window`).
- **Drag decouple:** `TimeSlider` tracks a LOCAL `useState` visual value during an active drag; per-step
  `onChange` writes only the local value; the app-level commit fires once via the existing `onSnap` seam on
  pointerup/blur; reconcile the local value with the controlled prop on release (no stuck thumb); drop the
  `transition-[left]` spring during the active drag (1:1 pointer follow), restore it for programmatic/tick moves.
- **Forced-date clamp:** add a today→today+3 clamp in `stateFromForcedPlanner`/`TimeProvider` (mirror the tick
  effect's `!isPlannerDateSelectable → stateFromNow`).
- **Today-min derivation:** expose the effective min from `TimeContext` (or compute in `TimeSliderPanel`) as
  `snapPlannerMinutes(parsePlannerTime(formatTimeInStockholm(currentTime)))` clamped to the planner range on
  `mode==='today'`, else `PLANNER_START_MINUTES`; recompute on the 60s tick; push a below-min selection up;
  do NOT add `time` to / change the DATE in the query key on a tick. Keep the component pure (no `new Date()`
  in render — the `HYDRATION_SAFE_NOW_ISO` discipline).

## Validation (Step 5)

- [x] Prerequisites satisfied (approved ACs, frameworks configured).
- [x] Test files created correctly (5 files; each header explains scope, red-phase status, mock/gesture boundary,
      and which task un-skips it).
- [x] Checklist maps every AC to a level + priority + scaffold (table above).
- [x] All tests designed to FAIL before implementation (all `.skip`-ed; assert EXPECTED behaviour; no placeholder
      `expect(true)`; new API accessed via type-safe shims so the `.skip`-ed files compile now and go red on un-skip).
- [x] `tsc --noEmit` clean for all 5 scaffolds; `vitest run` collects the 4 vitest files as 26 skipped; existing
      sibling suites (`TimeSlider`/`DatePickerDialog`/`time-planner`/`TimeContext`) still 26/26 green; the e2e spec
      lists under `mobile`+`desktop` (desktop self-skips on `!hasTouch`).
- [x] No CLI browser sessions opened (AI generation only — `playwright test --list`, no orphaned browsers).
- [x] Temp artifacts stored under `{test_artifacts}` (this checklist) + `nextjs-app/test/**` (the scaffolds).

## Key Risks / Assumptions

- **Real touch, not click-sim (R-004):** the e2e uses CDP `Input.dispatchTouchEvent` (a genuine finger sweep),
  NOT `click()`/`fill()`/mouse drag — the whole point of AC1's "verified by touch-gesture e2e". Chromium-only
  (`newCDPSession`), which the `iPhone 14` mobile profile satisfies; the spec self-skips where `!hasTouch`.
- **"One commit per gesture" is a COUNT, not wall-clock (R-002):** asserted as `onMinutesChange`/`onSnap` call
  counts + `plannerQuery` identity across a tick, never latency.
- **Zero-fetch seam is inherited, not re-proven here (R-001):** the e2e asserts a same-date drag adds zero venue
  requests to keep the 11.1 decoupling intact; the STANDING request-count invariant is Story 11.8's gate.
- **New-API field names are the dev's call:** the scaffolds probe plausible names (`effectiveMinMinutes` /
  `minMinutes` / …) and the disabled-label copy tolerantly (regex on the date, not the exact prefix) — the
  acceptance signal is the VALUE/behaviour, not a name the dev has not chosen yet.
- **The today-clamped slider visual is a NEW state** → the maintainer-blessed reference-PNG is owned by Story
  11.7; dev is FORBIDDEN from self-blessing refs (assert code-level facts — the inert-segment testid + token —
  not the LLM eyeball, which ignores sizing/spacing).
- **No live Met.no in any test** — the e2e serves the day-series from the mocked `/api/venues` `page.route` DTO
  and aborts any outbound `api.met.no` (belt-and-braces).

**Next recommended workflow:** implement Story 11.2 (`dev-story`), un-skipping each scaffold as its task goes
green (Task 1→2→3→4) and swapping the red-phase shims for the real API; then `*automate` for broader coverage
and `*trace` at the Epic-11 boundary.
