---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-07-03'
workflowType: 'testarch-test-review'
inputDocuments:
  - '_bmad-output/test-artifacts/test-design/test-design-epic-10.md'
  - '_bmad/tea/config.yaml'
  - 'knowledge/test-quality.md'
  - 'knowledge/test-levels-framework.md'
  - 'knowledge/data-factories.md'
  - 'knowledge/selective-testing.md'
  - 'knowledge/timing-debugging.md'
---

# Test Quality Review: Epic 10 — "Honest Sky" (weather-gated two-signal sun display)

**Quality Score**: 94/100 (A — Excellent)
**Review Date**: 2026-07-03
**Review Scope**: suite (the tests added across Epic 10, stories 10.1–10.5)
**Reviewer**: TEA Agent (Test Architect)

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions
(the epic-10 traceability matrix already exists at `_bmad-output/test-artifacts/traceability/traceability-report-epic-10.md`).

## Executive Summary

**Overall Assessment**: Excellent

**Recommendation**: Approve (with two minor follow-up cleanups)

### Key Strengths

✅ **Airtight determinism + no-live-network discipline.** Every stateful unit suite installs `vi.useFakeTimers()` + `vi.setSystemTime(SUMMER_MIDDAY)`; `fetch`/`rpc`/`getForecast`/`getNowcast` are mocked at the *deepest adapter* boundary; the e2e forces `?_time=13:00` and `page.route`-fulfills the DTO with a belt-and-braces `forbidLiveMetno` abort. A NET-NEW shared-setup fetch guard (`test/setup/setup.ts`) hard-fails any `api.met.no` request — directly closing the masked-live-call class the 10.4 retro flagged.
✅ **Defence-in-depth on the CRITICAL R-001 guard, without redundancy elsewhere.** The "100% cloud never renders FULL SOL / rain forces obscured" promise is pinned at unit (gate logic), component (all 5 surfaces), and e2e (5-scenario mocked-weather matrix) — while the test-design's dedup discipline is honoured everywhere else (engine truth = unit, DTO contract = API, render/a11y = component, single presentation matrix = e2e).
✅ **Re-tune-proof relative assertions.** Boundaries read named constants (`CLOUD_GATE_THRESHOLD_PERCENT`, `CLOUD_WEIGHT_LOW/MEDIUM/HIGH`, `NOWCAST_HORIZON_MS`) and assert *intent* ("100% cirrus does NOT gate; 100% low-stratus DOES", "cirrus > low-deck confidence") rather than magic numbers — a future weighting/threshold re-tune survives.

### Key Weaknesses

❌ One describe block title over-claims its assertion (`venues-route.cloud-gate.atdd.test.ts` "no NaN from SUN_STATUS_ORDER" only asserts the sanitizer preserves the value; the real NaN-sort guard lives in `VenueList.rank.test.ts`).
❌ Red-phase loose cast-through accessors (`applyRealSunEngineWithNowcast`, `applyCloudGateWithRain`, `nowcastHorizonMs`) survive in two files *after* their seams shipped — they now weaken `tsc` coverage on live signatures.
❌ One bare `createdAt: new Date()` in the confidence-calculator fixture is the only wall-clock read in an otherwise fully-fixed unit suite (rendered inert by relative assertions, but a fixed literal would be cleaner).

### Summary

This is a high-quality, honesty-focused test suite that matches its epic-level test design almost exactly. The suite comprises **~220 tests** across **34 test files** (13 net-new unit/ATDD suites at 124 tests, 6 component suites at 96 tests, one 5-scenario × 2-breakpoint e2e matrix, plus the shared fetch-guard and axe additions) — **all passing** (measured: 124 unit in ~5.4s, 96 component in ~3.7s). The historically load-bearing failure mode (weather fetched-but-not-consumed → "FULL SOL" during rain) is guarded at three levels with a standing regression net, and the "geometry is sacred" two-signal invariant gets its own byte-identical cross-tier guard. The only findings are minor maintainability nits — a mislabeled describe title and residual red-phase scaffolding to clean up now that the seams are green — none of which blocks merge.

---

## Quality Criteria Assessment

| Criterion                            | Status   | Violations | Notes |
| ------------------------------------ | -------- | ---------- | ----- |
| BDD Format (Given-When-Then)         | ✅ PASS  | 0          | Descriptive AC-tagged names (`[10.1 AC1] …`, `[10.5 AC4] …`); given/when/then implicit and clear |
| Test IDs                             | ✅ PASS  | 0          | Every test/describe carries the story + AC id it traces to |
| Priority Markers (P0/P1/P2/P3)       | ⚠️ WARN  | 0          | No inline P-tags, but the test-design maps each AC to a priority; acceptable for this project's convention |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS  | 0          | Zero `waitForTimeout`; e2e uses `waitFor({state:'visible'})` + web-first `expect` |
| Determinism (no conditionals)        | ✅ PASS  | 1 (LOW)    | Fake timers + fixed ISO timestamps throughout; one bare `new Date()` fixture default |
| Isolation (cleanup, no shared state) | ✅ PASS  | 1 (LOW)    | Per-test mockReset + clearSunEngineCaches + restoreAllMocks + unstubAll*; cache re-cleared inside the scenario runner |
| Fixture Patterns                     | ✅ PASS  | 0          | Consistent `makeStoredVenue`/`weatherSlice`/`nowcastResponse`/`metNoResponse` builders with overrides |
| Data Factories                       | ✅ PASS  | 0          | Override-based factories used across all suites; no copy-paste literals |
| Network-First Pattern                | ✅ PASS  | 0          | e2e intercepts detail route BEFORE list route (specific-first) then navigates; DTO fulfilled at boundary |
| Explicit Assertions                  | ✅ PASS  | 0          | "Materially lower" asserted as `>0.05`, not bare `<`; not-fabricated `0`/`100` explicitly excluded |
| Test Length (≤300 lines)             | ⚠️ WARN  | 1          | `sun-engine.cloud-gate.atdd.test.ts` is 687 lines (3 stories in one file), but well-sectioned |
| Test Duration (≤1.5 min)             | ✅ PASS  | 0          | Unit ~5.4s/124, component ~3.7s/96; e2e DTO-mocked (no network) |
| Flakiness Patterns                   | ✅ PASS  | 0          | No sky/wall-clock flakiness: `?_time` + route mock + forbidLiveMetno make the matrix fully deterministic |

**Total Violations**: 0 Critical, 0 High, 1 Medium, 4 Low

---

## Quality Score Breakdown

Weighted per the TEA rubric (determinism 30% / isolation 30% / maintainability 25% / performance 15%):

```
Determinism:      96/100 (A)   × 0.30 = 28.8
Isolation:        98/100 (A)   × 0.30 = 29.4
Maintainability:  88/100 (B)   × 0.25 = 22.0
Performance:      94/100 (A)   × 0.15 = 14.1
                                        ------
Final Score:                            94/100
Grade:                                  A (Excellent)
```

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

---

## Recommendations (Should Fix)

### 1. Retitle (or strengthen) the "no NaN from SUN_STATUS_ORDER" describe block

**Severity**: P2 (Medium)
**Location**: `nextjs-app/test/unit/api/venues-route.cloud-gate.atdd.test.ts:60`
**Criterion**: Assertion matches stated intent

**Issue Description**:
The block is titled *"CloudObscured sorts sensibly (no NaN from SUN_STATUS_ORDER)"* and its comment describes ranking `CloudObscured` between `Partial` and `Shaded`, but the body only asserts `normalizeVenueForResponse` preserves each status value — it never exercises the sort comparator or `SUN_STATUS_ORDER`. The NaN-sort guarantee it names is genuinely enforced (finite rank, `Number.isNaN(rank) === false`, `[0,2]` clamp) in `VenueList.rank.test.ts`, so this is a **naming/altitude mismatch, not a coverage gap**.

**Recommended Fix**:
Either import and exercise the real rank helper here, or narrow the title to what it proves (e.g. *"CloudObscured survives the sanitizer to the sort input"*). The file's own comment already anticipates this: *"A helper import of the route's SUN_STATUS_ORDER can replace this once the dev exports it."*

**Why This Matters**:
A green test whose title promises more than it verifies can create false confidence in a future review. Substantively covered elsewhere, so P2 not P1.

### 2. Remove the now-shipped red-phase loose cast-through accessors

**Severity**: P2 (Medium)
**Location**: `nextjs-app/test/unit/services/sun-engine.two-signal-invariants.atdd.test.ts:89`; `nextjs-app/test/unit/services/sun-engine.cloud-gate.atdd.test.ts:385-408`
**Criterion**: Maintainability / type-safety

**Issue Description**:
`applyRealSunEngineWithNowcast`, `applyCloudGateWithRain`, and `nowcastHorizonMs()` were correctly introduced as `as unknown as (...)` casts so `.skip`-ped scaffolds compiled under `tsc --noEmit` while the 10.4 seams were still red (a well-reasoned, documented epic-10 pattern). Now that the 5th `getNowcastOverride` param, the 4th `isRaining` param, and `NOWCAST_HORIZON_MS` have all shipped, these casts erase type-checking on live call sites — an arity or type regression on `applyRealSunEngine` would no longer be caught by `tsc` in these files.

**Recommended Improvement**:
Call `applyRealSunEngine` / `applyCloudGate` with their real, now-exported typed signatures and read `NOWCAST_HORIZON_MS` via the static import. The files themselves flag these as red-phase scaffolding to remove post-landing.

**Priority**:
P2 — no behavioural risk today; it is a lost compile-time safety net that is cheap to restore.

### 3. Pin the confidence-calculator fixture's `createdAt` to a fixed literal

**Severity**: P3 (Low)
**Location**: `nextjs-app/test/unit/confidence-calculator.cloud-gate.atdd.test.ts:83`
**Criterion**: Determinism

**Issue Description**:
This file installs no fake timers and the `weather()` builder defaults `createdAt: new Date()`. The two compared calls read the wall clock microseconds apart, so the freshness factor is not *provably* identical across them (the comment asserts it is). Freshness buckets in minutes make this inert in practice.

**Recommended Improvement**:
Use a fixed literal (`new Date('2026-06-21T10:30:00.000Z')`) like every sibling cloud-gate suite, so the only differing input across the two calls is genuinely `cloudCover`.

**Priority**:
P3 — cosmetic determinism hardening; the relative assertions render it harmless.

---

## Best Practices Found

### 1. NET-NEW shared fetch guard closes a whole regression class

**Location**: `nextjs-app/test/setup/setup.ts` (+ `no-live-metno-fetch-guard.atdd.test.ts`, `.coverage.test.ts`)
**Pattern**: Defence-in-depth against masked live calls

**Why This Is Good**:
A 10.4 unit test silently issued a real `api.met.no/nowcast` fetch that *passed* because the client swallows errors → `undefined`. Rather than only fixing that one test, the epic escalated it to an epic-wide invariant: a `beforeEach` fetch stub that hard-rejects any `api.met.no` host. The guard uses **exact-host matching** (`host === 'api.met.no'`, not `.includes`), handles `string | URL | Request` inputs, is case-insensitive, and the coverage suite proves it does NOT false-positive on `api.met.no.evil.example`, `notapi.met.no`, `www.met.no`, or benign external tile hosts. This is exactly the surgical-yet-comprehensive posture a shared guard should have.

### 2. Byte-identical two-signal invariant guard

**Location**: `nextjs-app/test/unit/services/sun-engine.two-signal-invariants.atdd.test.ts`
**Pattern**: Cross-tier regression net for a load-bearing invariant

**Why This Is Good**:
Runs all five weather variations against identical geometry and asserts `sunExposurePercent` and `JSON.stringify(sunWindow)` are byte-identical across them — with a "prove the variations are real, not a vacuous no-op" meta-assertion (`statuses` must contain both `CloudObscured` and a non-obscured value). It even documents WHY the FR12 confidence delta is only observable at the calculator layer (the conservative 0.6 coverage cap flattens the displayed number for unvalidated fixture venues) and re-asserts it there on eligible coverage. That is unusually rigorous root-cause reasoning baked into a test.

### 3. Deterministic mocked-weather e2e matrix (the R-005 fix)

**Location**: `nextjs-app/test/e2e/epic-10-weather-matrix.spec.ts`
**Pattern**: DTO-boundary route fulfillment + belt-and-braces network abort

**Why This Is Good**:
Mocks at the `/api/venues` DTO boundary (right altitude for a *presentation* matrix — the engine gate is already exhaustively unit-tested), forces `?_time=13:00` for a deterministic sun, branches detail-panel selectors by breakpoint, and additionally asserts `metnoHits === []` so a stray live call fails loudly. Fully wall-clock- and sky-independent, exactly as the test design's R-005 mitigation required.

---

## Test File Analysis

### Suite Metadata

- **Framework**: Vitest (unit + component via jsdom), Playwright (e2e)
- **Language**: TypeScript
- **Net-new files**: 13 unit/ATDD, 1 e2e matrix, 1 rank helper unit, 2 fetch-guard suites; 6 component suites + axe specs + setup.ts modified
- **Tests**: ~220 total (124 unit — measured green; 96 component — measured green; 5×2 e2e; axe additions)

### Test Structure

- **Fixtures / factories**: `makeStoredVenue`, `weatherSlice`, `nowcastResponse`, `metNoResponse`, `shadowInfo`, `eligibleShadowInfo`, `baseVenue`/`buildVenuesResponse`/`buildVenueDetailResponse` — all override-based, consistent across files
- **Isolation hooks**: per-test `mockReset` on hoisted mocks + `clearSunEngineCachesForTests()` + `vi.restoreAllMocks()` + `vi.unstubAllGlobals()/unstubAllEnvs()`; two-signal runner re-clears the 15-min cache per scenario
- **Network interception**: unit = deepest-adapter `vi.mock`; e2e = `page.route` DTO fulfillment + `forbidLiveMetno` abort; suite-wide = shared setup fetch guard

### Priority Distribution (from test-design mapping)

- P0 (Critical): engine gate, missing-data-unknown, confidence blend, no-surface-FULL-SOL, union sweep, rain-wins, no-rain-inert, e2e matrix, cache consistency, byte-identical geometry, a11y — all present and green
- P1 (High): `complete` endpoint + layer weighting, nowcast client posture/degradation/horizon, two-signal UI, sky-condition copy, distinct fourth state — all present and green
- P2/P3: sky-condition mapping edges, effective-cover fallback, clamp/additive algebra, nowcast nearest-to-now + default-coord, weight-ordering meta-guard — all present and green

---

## Context and Integration

### Related Artifacts

- **Test Design**: [test-design-epic-10.md](../test-design/test-design-epic-10.md) — the suite tracks the P0/P1/P2/P3 coverage plan and every named regression guard (R-001…R-006) closely
- **Traceability**: [traceability-report-epic-10.md](../traceability/traceability-report-epic-10.md) — use `trace` for coverage gate decisions (out of scope here)
- **Stories**: `_bmad-output/implementation-artifacts/10-1…10-5-*.md`
- **Prior review (house style)**: [epic-9-test-review-2026-07-01.md](./epic-9-test-review-2026-07-01.md)

---

## Next Steps

### Immediate Actions (Before Merge)

None blocking. The suite is green and production-ready.

### Follow-up Actions (Future PRs)

1. **Retitle/strengthen the venues-route "no NaN from SUN_STATUS_ORDER" block** — P2, dev, ~10 min. Substantively covered by `VenueList.rank.test.ts`; fix the label or import the real rank helper.
2. **Remove the shipped red-phase loose casts** in the two `sun-engine.*.atdd.test.ts` files — P2, dev, ~20 min. Restores `tsc` coverage on the live `applyRealSunEngine`/`applyCloudGate` signatures.
3. **Pin `createdAt` to a fixed literal** in `confidence-calculator.cloud-gate.atdd.test.ts` — P3, dev, ~2 min.

### Re-Review Needed?

✅ No re-review needed — approve as-is; the three follow-ups are backlog-grade cleanups.

---

## Decision

**Recommendation**: Approve

**Rationale**:
Test quality is excellent at 94/100 (A). Zero critical or high-severity violations; the epic's defining failure mode (sun lies during rain) is guarded with three-level defence-in-depth plus a standing regression net, and the "geometry is sacred" invariant has its own byte-identical cross-tier guard. Determinism and isolation are essentially airtight — fake timers, deepest-adapter mocks, per-test cleanup, and a NET-NEW shared fetch guard that hard-fails any live Met.no call. The three findings are minor maintainability nits (a mislabeled describe title, residual red-phase scaffolding to clean up now that the seams shipped, one cosmetic wall-clock read) — all backlog-grade, none blocking merge.

> Test quality is excellent with 94/100 score. Minor issues noted can be addressed in follow-up PRs. Tests are production-ready and follow best practices.

---

## Appendix

### Violation Summary by Location

| Location | Severity | Criterion | Issue | Fix |
| -------- | -------- | --------- | ----- | --- |
| `venues-route.cloud-gate.atdd.test.ts:60` | P2 | Assertion↔intent | "no NaN from SUN_STATUS_ORDER" title only asserts sanitizer preservation | Retitle or import the real rank helper |
| `sun-engine.two-signal-invariants.atdd.test.ts:89` | P2 | Type-safety | Loose cast survives after seam shipped | Use real typed signature |
| `sun-engine.cloud-gate.atdd.test.ts:385-408` | P2 | Type-safety | Loose casts + `nowcastHorizonMs()` survive after seams shipped | Use real typed signature/import |
| `sun-engine.cloud-gate.atdd.test.ts:1` | P3 | Test length | 687-line 3-story file | Optional: split 10.4 rain section |
| `confidence-calculator.cloud-gate.atdd.test.ts:83` | P3 | Determinism | Bare `new Date()` fixture default, no fake timers | Pin to fixed literal |
| `epic-10-weather-matrix.spec.ts:70` | P3 (info) | Isolation | Inline per-test `page.goto` reassignment (scoped to disposable fixture) | Optional: extract to shared fixture |

### Quality Trends

| Review Date  | Score     | Grade | Critical | Trend      |
| ------------ | --------- | ----- | -------- | ---------- |
| 2026-07-01 (epic 9) | (prior)  | —     | —        | —          |
| 2026-07-03 (epic 10) | 94/100 | A     | 0        | ➡️ Stable-high |

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review (BMad v6)
**Review ID**: test-review-epic-10-20260703
**Execution Mode**: sequential (single-agent four-dimension evaluation)
**Version**: 1.0
