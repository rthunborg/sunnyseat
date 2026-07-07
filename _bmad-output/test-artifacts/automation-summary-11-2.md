---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-identify-targets'
  - 'step-03-generate-tests'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-07-04'
inputDocuments:
  - '_bmad-output/implementation-artifacts/11-2-time-slider-drag-fix-planner-range-rules.md'
  - '_bmad-output/test-artifacts/atdd-checklist-11-2.md'
  - 'nextjs-app/lib/utils/time-planner.ts'
  - 'nextjs-app/components/composed/time/TimeSlider.tsx'
  - 'nextjs-app/lib/contexts/TimeContext.tsx'
  - 'nextjs-app/lib/services/venue-planner.ts'
  - 'nextjs-app/components/composed/time/DatePickerDialog.tsx'
  - 'nextjs-app/test/unit/time-planner.test.ts'
  - 'nextjs-app/test/unit/venue-planner.test.ts'
  - 'nextjs-app/test/components/TimeSlider.dragdecouple.atdd.test.tsx'
  - 'nextjs-app/test/unit/TimeContext.today-window-min.atdd.test.tsx'
---

# Test Automation Expansion — Story 11.2 (Time-Slider Drag Fix & Planner Range Rules)

**Role:** Master Test Architect (`*automate`). **Mode:** BMad-Integrated (story + ATDD checklist present).

## Step 1 — Preflight & Context

- **Detected stack:** `fullstack` — Next.js app under `nextjs-app/` with API routes; both `playwright.config.ts`
  and `vitest.config.ts` present. Framework verified (no HALT).
- **Execution mode:** BMad-Integrated. Story 11.2 landed with all ATDD red-phase scaffolds now green
  (vitest 1203 passed / 0 skipped; tsc + eslint clean; real-touch e2e passing under the new Chromium `touch`
  project). This `*automate` pass EXPANDS coverage into the gaps the ATDD scaffolds left open — it does NOT
  re-prove the acceptance criteria and does NOT weaken/delete any existing test.
- **TEA flags:** `test_stack_type: auto`→fullstack; `tea_use_playwright_utils: true`; `tea_execution_mode: auto`
  → sequential inline authoring (no subagent runtime); `risk_threshold: p2`.
- **Knowledge fragments (core):** test-levels-framework, test-priorities-matrix, test-quality,
  selective-testing (dedup discipline), data-factories (deterministic injected `now`/`clock`). Playwright-utils
  full profile available but this pass adds **no new e2e** (the ATDD real-touch spec + 11.8's standing gate
  already own the browser seam) — all new coverage is Vitest unit/component (pure logic + boundary + error paths).

## Step 2 — Identify Targets (coverage gaps only; dedup vs ATDD + existing siblings)

The ATDD scaffolds (`atdd-checklist-11-2.md`) prove the four ACs at the levels the epic test-design assigned:
hit-test + drag-decouple + today-clamp at COMPONENT; window MATH at UNIT; window RENDER at DIALOG; forced-clamp +
today-min-in-state at CONTEXT; the real-touch gesture at E2E. Existing sibling suites cover the pre-11.2 contract.
The following are **genuine gaps** — new exports with no direct test, boundary/precedence conditions, and error
paths that neither the ATDD nor the pre-existing tests exercise. Each is placed at the LOWEST sufficient level to
avoid duplicating an existing assertion.

| # | Target (surface) | Gap (why ATDD/siblings miss it) | Level | Priority | New file |
| - | ---------------- | ------------------------------- | ----- | -------- | -------- |
| G1 | `time-planner.addDaysToDateKey` | Brand-new exported helper; NO direct test. Month/year rollover, month-end, leap day, negative shift, DST-agnostic (UTC-anchored) | Unit | P1 | `time-planner.window-boundaries.automate.test.ts` |
| G2 | `time-planner.plannerWindowBounds` | New export; only tested transitively. Direct start=today / end=today+3 identity + month-boundary rollover of the window | Unit | P1 | `time-planner.window-boundaries.automate.test.ts` |
| G3 | `time-planner.isPlannerDateSelectable` season-floor edge | ATDD tests an in-season `now`; the code comment's KEY edge — a season-edge "today" where the 3-day window would allow a date but the season floor REJECTS it (today=2026-10-30 → today+3=2026-11-02 out of season; out-of-season "today" wholly unplannable) — is untested | Unit | P0 | `time-planner.window-boundaries.automate.test.ts` |
| G4 | `time-planner.validatePlannerDateTime` reason precedence + `enforceWindow` interaction | ATDD asserts each reason in isolation; the ORDERING when several conditions hold at once (past+out-of-window → `past-date`; invalid-time short-circuits before window; `enforceWindow:false` still rejects past/season; boundary times at exactly PLANNER_START/END; whitespace-trim; null/undefined date) is untested | Unit | P0 | `time-planner.window-boundaries.automate.test.ts` |
| G5 | `venue-planner.parseVenuePlannerParams` server window opt-out | The SERVER route seam (`enforceWindow:false`) that keeps far-future forecast bookmarks alive: a beyond-today+3 but in-season future date must parse OK (not `out-of-window`); out-of-season / past / duplicate-param / invalid still rejected. No test exercises the opt-out or the detail messages | Unit | P0 | `venue-planner.window-optout.automate.test.ts` |
| G6 | `TimeSlider` non-drag / pointer-cancel / oversized-min edge paths | ATDD covers the happy drag + below-min clamp. Untested: `pointerUp`/`pointerCancel` WITHOUT a preceding `pointerDown` fires `onSnap` only (no phantom commit); `pointerCancel` ends a drag with exactly one commit; an oversized/out-of-range `minMinutes` is clamped into the planner range (input `min`, thumb never off-track); a below-min controlled `selectedMinutes` displays clamped when NOT dragging | Component | P1 | `TimeSlider.edge-cases.automate.test.tsx` |
| G7 | `TimeContext` forced-session min opt-out + pre-start / off-window-tick edges | ATDD covers live-today min + tick advance. Untested: a forced `?_time=` session on today exposes `minMinutes = PLANNER_START` (forced sessions disable the "can't pick earlier than now" affordance); an early-morning `now` (before 06:00) floors/clamps the min to PLANNER_START; a tick where the selected date scrolled out of the window resets to now | Unit (state) | P1 | `TimeContext.min-edge-cases.automate.test.tsx` |

**Scope justification:** SELECTIVE expansion. The ATDD + 11.8 e2e own the AC-level and browser proofs; this pass
adds only pure-logic boundary/precedence/error-path coverage (all deterministic under an injected `now`/`clock`,
no wall-clock, no live Met.no, no new dependency, no new e2e). Dedup enforced: window MATH stays at unit, the
server opt-out stays at the service layer, slider edge behaviour stays at component, context-min edges stay at
state — none duplicates an existing green assertion.

## Step 3 — Generated Files (all GREEN — post-implementation coverage expansion, not red-phase)

1. `nextjs-app/test/unit/time-planner.window-boundaries.automate.test.ts` — G1+G2+G3+G4:
   `addDaysToDateKey` rollovers/leap/negative; `plannerWindowBounds` identity + month rollover; season-floor
   dominance at a season edge + wholly out-of-season "today"; `validatePlannerDateTime` reason precedence,
   `enforceWindow` interaction, boundary times, trim/null. (18 assertions across 6 tests)
2. `nextjs-app/test/unit/venue-planner.window-optout.automate.test.ts` — G5: the route's `enforceWindow:false`
   opt-out (beyond-today+3 in-season OK), plus out-of-season/past/duplicate-param/invalid rejection detail
   strings. (6 tests)
3. `nextjs-app/test/components/TimeSlider.edge-cases.automate.test.tsx` — G6: pointer-up/cancel without a
   preceding pointer-down (snap only, no phantom commit); pointer-cancel ends a drag with one commit;
   oversized `minMinutes` clamped into range; below-min controlled value displays clamped when idle. (5 tests)
4. `nextjs-app/test/unit/TimeContext.min-edge-cases.automate.test.tsx` — G7: forced-session min opt-out
   on today; pre-06:00 now clamps min to planner start; off-window-scroll tick resets to now. (3 tests)

## Step 5 — Validate & Complete

- All new files are **post-implementation GREEN** coverage (not red-phase). They assert behaviour/values, never
  magic numbers, and use an injected `now`/`clock` (no wall-clock flakiness) per the project lesson.
- **No existing test weakened or deleted.** New files are additive; each targets a surface/edge with zero overlap
  with an existing green assertion (verified by grep of the sibling suites).
- Gate result: see the Dev Agent Record / final run — `npx vitest run` on the four new files + the touched
  suites; `tsc --noEmit` + `eslint` clean.

## Key Risks / Assumptions

- **Season-edge dates use a `now` INSIDE the season** so the season-floor edge (G3) is reachable — e.g.
  `now = 2026-10-30` is in-season (ends 10-31) but today+3 crosses into out-of-season November. Deterministic.
- **No live Met.no, no browser** — all four files are Vitest (unit + Testing-Library component). The real-touch
  e2e + the request-count standing gate remain owned by the ATDD spec / Story 11.8; this pass does not touch them.
- **The forced-session min opt-out (G7)** asserts the documented behaviour: `?_time=` disables the today-min so a
  forced time renders verbatim regardless of the machine wall clock (the code's stated contract).

**Next recommended workflow:** `*trace` at the Epic-11 boundary (traceability matrix + gate) once 11.2 merges.
