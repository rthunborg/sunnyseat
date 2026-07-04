---
stepsCompleted:
  ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-07-04'
---

# Traceability Report — Story 11.2: Time-Slider Drag Fix & Planner Range Rules

**Scope:** STORY-LEVEL — traces ONLY Story 11.2's four acceptance criteria (AC1–AC4). Not epic-wide.
**Mode:** ADVISORY (surface coverage gaps for review visibility). No gate is opened/blocked; no remediation performed.
**Story status at trace time:** `review` (dev + one review-findings pass complete).
**Priority source:** `_bmad-output/test-artifacts/test-design/test-design-epic-11.md` (all four ACs map to P0/P1 rows via R-002/R-004/R-007).

---

## Advisory Verdict: **PASS**

Every acceptance criterion has direct, running test coverage at the correct level(s), red-first where the story called for it, and the ATDD scaffolds are all un-skipped (`grep` for `.skip`/`.only` across the five 11.2 spec files returns nothing). P0 coverage = 100%, P1 (slider-visual clamp facts) covered at component level, overall FULL. No uncovered ACs.

Two advisory notes below (neither blocks; both already surfaced/handled inside the story), plus one genuine known **coverage gap carried as documented risk** — the real-touch e2e was added to CI in the review pass but the pointer-events regression only proves out in Chromium/Pixel-5, and the interleaved-keyboard-during-drag edge (AC1/AC2 seam) is an explicitly deferred, untested path. Neither reduces AC coverage below FULL.

---

## Test Inventory (Story 11.2)

| # | Spec file | Level | Un-skipped? |
| - | --------- | ----- | ----------- |
| 1 | `nextjs-app/test/components/TimeSlider.dragdecouple.atdd.test.tsx` | Component (ATDD) | yes |
| 2 | `nextjs-app/test/unit/time-planner.today-window.atdd.test.ts` | Unit (ATDD) | yes |
| 3 | `nextjs-app/test/components/DatePickerDialog.today-window.atdd.test.tsx` | Component (ATDD) | yes |
| 4 | `nextjs-app/test/unit/TimeContext.today-window-min.atdd.test.tsx` | Unit/State (ATDD) | yes |
| 5 | `nextjs-app/test/e2e/epic-11-slider-touch-drag.spec.ts` | E2E (real-touch, `--project=touch`) | yes |
| 6 | `nextjs-app/test/unit/time-planner.window-boundaries.automate.test.ts` | Unit (coverage-expansion) | yes |
| 7 | `nextjs-app/test/components/TimeSlider.edge-cases.automate.test.tsx` | Component (coverage-expansion) | yes |
| 8 | `nextjs-app/test/unit/TimeContext.min-edge-cases.automate.test.tsx` | Unit/State (coverage-expansion) | yes |
| — | `nextjs-app/test/e2e/epic-11-scrub-zero-fetch.spec.ts` | E2E (11.1-owned seam guard, kept green) | n/a |

Supporting/regression contracts kept green (not primary coverage): `TimeSlider.test.tsx`, `DatePickerDialog.test.tsx`, `time-planner.test.ts`, `TimeContext.test.tsx`, `AppContextProviders.test.tsx`, `DesktopNavBar.test.tsx`.

---

## Traceability Matrix (AC → covering tests)

### AC1 — Thumb-grab hit-testing fixed; drag works with mouse AND touch, verified by touch-gesture e2e
**Priority: P0** (test-design row: "Touch-drag initiated ON the thumb changes time with real touch", R-004) + P1 (slider-visual).
**Coverage: FULL.**

- Component (spec 1, `[11.2 AC1]`): all three decorations (`time-slider-value-badge`, `-track`, `-thumb`) assert `pointer-events-none` + `aria-hidden`; input asserts sole pointer target (`h-11 absolute inset-0`, NOT `pointer-events-none`) with ≥44px touch height; reference look unchanged.
- E2E real-touch (spec 5, `[11.2 AC1]`): a raw-CDP `Input.dispatchTouchEvent` finger sweep ON the thumb changes the committed time badge — a genuine touch gesture, NOT `click()`/`fill()`. Self-skips on non-`hasTouch` projects.

### AC2 — Drag state decoupled; one app-level commit per gesture; that commit fetches nothing
**Priority: P0** (test-design row: "A full slider drag gesture commits app-level time exactly once", R-002).
**Coverage: FULL.**

- Component (spec 1, `[11.2 AC2]`): a multi-step drag (`pointerDown` → N `change` → `pointerUp`) commits `onMinutesChange` ≤1× (kills the 4×-per-step bug), local badge tracks per step, `onSnap` fires exactly once on settle; reconcile-on-release (no stuck thumb); keyboard still commits per keypress; blur snaps.
- Component edge-paths (spec 7): `pointerUp`/`pointerCancel` without a `pointerDown` → `onSnap` only, no phantom commit; `pointerCancel` ends a real drag with exactly one commit (parity with `pointerUp`).
- Zero-fetch seam (spec 5 + 11.1's `epic-11-scrub-zero-fetch.spec.ts`): a same-date settled drag issues ZERO `/api/venues` requests + zero `api.met.no`. (The STANDING request-count invariant is 11.8-owned; 11.2 proves the seam is intact.)

### AC3 — Date picker: only today→today+3 selectable; out-of-window forced/URL dates clamp
**Priority: P0** (test-design row: "Planner range rules hold in STATE … only today→today+3 selectable (forced/URL date outside window clamps)", R-007).
**Coverage: FULL.**

- Unit helper (spec 2, `[11.2 AC3]`): `isPlannerDateSelectable` selects today…today+3, rejects today+4 and any past date; `PLANNER_MAX_FUTURE_DAYS === 3`; `validatePlannerDateTime` rejects beyond-window coherently (no throw/500), still rejects past, accepts in-window.
- Component render (spec 3, `[11.2 AC3]`): today+3 renders enabled + pickable (fires `onSelectDate`); today+4 renders `disabled` + unpickable with a disabled aria-label; past date stays disabled.
- State forced-date clamp (spec 4, `[11.2 AC3]`): a forced date beyond today+3 OR in the past clamps to today; an in-window forced date (today+2) is preserved with `mode === 'future'`.
- Boundary/precedence expansion (spec 6): `addDaysToDateKey` month/year/leap rollover; `plannerWindowBounds` identity; season-floor dominance at the season edge; `validatePlannerDateTime` reason precedence + `enforceWindow` interaction (the route opt-out path).

### AC4 — On today, slider min = current wall-clock time (snapped); the min advances as the clock ticks
**Priority: P0** (test-design row R-007, "on Idag the slider min = snapped current wall-clock time; min advances as the clock ticks") + P1 (slider-visual inert segment).
**Coverage: FULL.**

- Component (spec 1, `[11.2 AC4]`): `minMinutes` reflected in native `min` + `aria-valuemin`; below-min value / ArrowLeft / Home clamps UP to the min; inert `time-slider-elapsed` segment renders a distinct non-amber token; future date (default min) keeps full range with no elapsed segment.
- State derivation + tick-advance (spec 4, `[11.2 AC4]`): today min = floored current wall-clock; advances past a step boundary on a clock tick and keeps the live selection reachable; **does NOT thrash the date-only query key on a minute tick** (the load-bearing 11.1 seam); future date → planner START (full range).
- State-layer clamp + opt-outs (spec 8): a direct `setSelectedMinutes`/`snapSelectedMinutes` below the today-min is floored IN STATE (closes review finding — "enforced in state too"); at/above-min kept verbatim; forced-`?_time=` session + future date opt out to planner start; pre-06:00 wall clock clamps to planner start; a tick where the selection scrolled out of window resets to now.

---

## Coverage Statistics (story-scoped)

| Metric | Value |
| ------ | ----- |
| Total ACs | 4 |
| Fully covered | 4 (100%) |
| Partially covered | 0 |
| Uncovered | 0 |
| P0 coverage | 100% (AC1–AC4 all carry P0 rows) |
| P1 coverage (slider-visual clamp facts) | covered at component level |
| Overall coverage | 100% FULL |

### Coverage heuristics
- **Endpoint coverage:** N/A — no API/route/DTO change in this story (`sunDaySeries` + client derivation are 11.1-owned; verified in Dev Notes "API boundary + scope fences"). Zero-fetch is asserted as a *negative* endpoint signal (0 `/api/venues` on a same-date drag), which is the intended coverage.
- **Auth/authz:** N/A — no auth surface.
- **Error/edge paths:** strong — out-of-window/past/forced-date clamps, pre-06:00 clamp, no-pointerDown pointer-up, pointerCancel parity, oversized `minMinutes` clamp, tick-out-of-window reset, reason precedence all covered.

---

## Advisory Notes & Documented Risk (do NOT block)

1. **[Advisory — resolved in review] AC4 "enforced in state too":** The dev's first pass clamped the min only inside `TimeSlider`; the review pass added the state-layer floor in `setSelectedMinutes`/`snapSelectedMinutes` and 5 tests (spec 8). AC4's literal "enforced in state too" wording is now backed by state-level assertions. No residual gap.

2. **[Advisory — resolved in review] AC1 real-touch e2e now a live CI gate:** The touch-drag spec initially "PASSED locally" only. The review pass added `npx playwright test --project=touch` to `.github/workflows/build-and-test-nextjs.yml`, so AC1's real-touch proof runs in CI (Chromium/Pixel-5 via CDP). Note the mechanism is Chromium-only — the WebKit/iPhone-14 `mobile` project cannot drive CDP touch — so the automated real-touch proof exists on ONE engine; cross-engine real-device confirmation is the story's explicit hand-off to **Story 11.8** (not a 11.2 gap).

3. **[Documented risk — deferred, untested] Keyboard commit during an un-released pointer drag (AC1/AC2 seam):** `[Review][Defer][Low]` in the story file — a keyboard press between `pointerDown` and `pointerUp` leaves a stale `dragValue`; no test exercises the interleaved sequence. Self-heals on the next pointer settle; uncommon input path; explicitly accepted as deferred. Does not reduce AC1/AC2 below FULL (the primary gesture paths are covered).

4. **[Advisory — visual gate]** The today-clamped slider (inert elapsed segment) is a NEW visual state. Per the "visual gate is an LLM eyeball" reference, the code-level facts (distinct non-amber token, `aria-valuemin`, `min`) ARE asserted; the reference-PNG rebaseline is intentionally deferred to **Story 11.7** (dev did not self-bless a PNG). This is a design-gate handoff, not an AC coverage gap.

---

## Recommendations (advisory only)

- **None blocking.** All P0 ACs at 100%, overall FULL.
- Carry the two hand-offs into their owner stories: real-device / cross-engine touch + live perf → **Story 11.8**; today-clamped slider reference-PNG rebaseline → **Story 11.7**.
- Optionally, when 11.8 lands the standing request-count profile, promote the 11.2 zero-fetch seam assertion into that standing gate (already anticipated by the spec's own comments).

---

## Gate Decision (story-scoped, advisory)

🚨 **GATE DECISION: PASS** (advisory — not opened/enforced by this pass)

📊 Coverage Analysis:
- P0 Coverage: 100% (Required: 100%) → **MET**
- P1 Coverage: covered (slider-visual clamp facts at component level) → **MET**
- Overall Coverage: 100% (Minimum: 80%) → **MET**

✅ Rationale: All four ACs have direct, running, correctly-levelled coverage (red-first ATDD un-skipped + green, plus coverage-expansion edge tests). The two AC-adjacent gaps found at first dev pass (state-layer min clamp; dormant CI touch gate) were both closed in the review pass. Remaining items are explicit, documented hand-offs (11.7 rebaseline, 11.8 cross-engine/perf) and one accepted low deferred edge — none uncovers an AC.

⚠️ Uncovered ACs: **none.**
