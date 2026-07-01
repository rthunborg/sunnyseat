---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-07-01'
review_scope: 'suite (Epic 9 tests, stories 9.0–9.10)'
inputDocuments:
  - _bmad/tea/config.yaml
  - knowledge/test-quality.md
  - knowledge/test-levels-framework.md
  - knowledge/selector-resilience.md
  - knowledge/timing-debugging.md
overall_score: 92
overall_grade: A
---

# Epic 9 Test-Quality Review (Advisory)

**Scope:** All tests added/changed across Epic 9 "Live-App Hardening & Clean-Up" (stories 9.0–9.10),
under `nextjs-app/test/` — 54 files touched (30 new, 24 modified): unit, component, e2e.
**Mode:** Advisory quality audit. Coverage/gates are out of scope (route to `trace`).
**Stack:** frontend (Vitest + RTL + Playwright). Execution: sequential (subagent runtime unavailable) — 4 dimensions evaluated directly.

## Overall: 92 / 100 (A)

| Dimension | Weight | Score | Grade |
|---|---|---|---|
| Determinism | 30% | 97 | A |
| Isolation | 30% | 94 | A |
| Maintainability | 25% | 82 | B |
| Performance | 15% | 96 | A |

Sample run of 10 representative Epic 9 files: **110 tests, 110 passing, 0 skipped, 4.7 s.**

## Headline

This is a strong, disciplined suite. It follows the project's hard-won lessons: no wall-clock
latency assertions (call-count + cache-key + byte-identical outcomes instead), deterministic
injected clocks, mocks at the deepest adapter boundary (the Vitest dynamic-import bypass lesson),
and e2e time pinned with `?_time=13:00`. Docstrings routinely explain *why* an assertion exists.
The findings below are polish, not correctness gaps.

## Findings

### MEDIUM
- **M1 — MapView.test.tsx is a 3046-line / 97-`it` monolith (+765 lines this epic).**
  It works and is green, but it is now the single hardest file in the suite to navigate, review, or
  extend, and a merge-conflict magnet. Recommend splitting by concern (deep-link resolution, planner
  wiring, offline shell, error monitor, pin/selection) into sibling specs sharing a helpers module.

### LOW
- **L1 — Stale "RED" / "describe.skip" scaffolding metadata.** The ATDD files
  (`sun-engine-caching.atdd`, `venues-route-caching.atdd`, `OnboardingGate.synchronous.atdd`,
  `TagFilterContext.atdd`, `VenueTagsData.atdd`, `DesktopNavBarTagChips.atdd`, `UserLocationLayer.atdd`,
  `VenueListApproximateDistance.atdd`, `LocateAndSwReload.atdd`) were correctly un-skipped by the dev
  and are now **live, green** tests — but their header docstrings still say `STATUS: describe.skip …
  WILL FAIL` and their `describe(...)` names still carry the `(RED)` suffix. Reading them cold implies
  they are still red/skipped when they are green guards. Refresh the header + drop the `(RED)` suffix.
- **L2 — Module-scoped mutable log arrays as shared state.** `deferred-planner-query` and
  `clean-url-date-selection` push into top-level `searchParamsLog` arrays. They are reset in
  `beforeEach`, so isolation holds today, but the pattern is fragile (any parallel/reordering or a new
  `describe` in the same file silently shares the buffer). Prefer a per-test local collected via the
  harness prop, or a fixture, over a file-level `let`.
- **L3 — Freshness prop uses `new Date().toISOString()` (9 sites in VenueQuickInfo, others).** Fed as
  an *input* prop, never asserted, so no non-determinism reaches an expectation — but a fixed
  timestamp constant would be cleaner and removes the pattern from the "unmocked new Date()" grep that
  future reviewers will flag.

## Dimension notes

**Determinism 97 (A).** Zero `waitForTimeout`, zero `Math.random`. `TtlCache` takes an injectable
`now`; `TimeProvider` takes a `clock`; fake timers are paired with `useRealTimers()`; e2e mobile net
pins `?_time=13:00` via a `page.goto` shim. Byte-identical `toMatchInlineSnapshot` outcome guard with
an explicit "a diff is a FAIL, never a rebaseline" contract. Only deduction: L3 cosmetic.

**Isolation 94 (A).** Every file that spies, fakes timers, or overrides `navigator`/`window` globals
restores in `afterEach` (`restoreAllMocks`, `useRealTimers`, saved property descriptors). Process-scoped
caches are reset via `clearSunEngineCachesForTests()` / `clearVenueRateLimitForTests()`. Deduction: L2
module-level shared arrays.

**Maintainability 82 (B).** Excellent WHY-docstrings, real providers over mocks, resilient `data-testid`
/ role selectors, no brittle CSS-class selectors. Held back by M1 (the MapView monolith) and L1 (stale
scaffold metadata that misleads on test status).

**Performance 96 (A).** 110 tests in 4.7 s; all analysed logic is unit/component. `advanceTimersByTimeAsync`
is bounded (1800 ms feedback window, exact TTL boundaries). The heavier e2e mobile-regression net is
correctly gated to the single `mobile` Playwright project via a `test.skip` guard.

## Violation summary
HIGH: 0 · MEDIUM: 1 · LOW: 3 · TOTAL: 4

## Top recommendations
1. Split `MapView.test.tsx` into concern-scoped sibling specs (M1).
2. Refresh ATDD file headers + drop `(RED)` from now-green describe names (L1).
3. Replace file-level `searchParamsLog` arrays with per-test/fixture collection (L2).
