---
stepsCompleted:
  - step-01-load-context
  - step-02-discover-tests
  - step-03-map-criteria
  - step-04-analyze-gaps
  - step-05-gate-decision
lastStep: step-05-gate-decision
lastSaved: '2026-07-18'
scope: story-only
story: 12-3-day-series-compute-at-real-venue-scale-kill-the-cold-start-freeze
advisory: true
coverageBasis: acceptance_criteria
oracleResolutionMode: formal_requirements
oracleConfidence: high
externalPointerStatus: not_used
---

# Traceability Report - Story 12.3: Day-Series Compute at Real-Venue Scale

**Scope:** STORY-LEVEL - traces only Story 12.3 AC1-AC7 plus the no-visual Design Gate.
**Mode:** ADVISORY. Surfaces coverage and evidence gaps for review-time visibility. Does not block, remediate, update sprint status, or open a quality gate.
**Story status at trace time:** `review`.
**Coverage oracle:** formal acceptance criteria in `_bmad-output/implementation-artifacts/12-3-day-series-compute-at-real-venue-scale-kill-the-cold-start-freeze.md`.

## What Was Run

This trace pass:

- Loaded the `bmad-testarch-trace` skill and customization/config from `_bmad/tea/config.yaml`.
- Read `project-context.md`, the Story 12.3 file, the Story 12.3 ATDD checklist, the trace template/checklist, and required trace knowledge fragments.
- Discovered tests with `rg --files` and `rg -n` over Story 12.3 route, service, SQL-contract, weather, precompute, and request-count suites.
- Reviewed existing validation evidence recorded in the Story 12.3 Dev Agent Record.

No implementation tests were executed during this advisory trace pass. No implementation files, sprint status, or auto-bmad state files were modified.

## Advisory Verdict: CONCERNS

No Story 12.3 acceptance criterion is completely uncovered. The automated matrix covers the core functional, security, scheduler, weather, midnight-roll, and no-warmer contracts.

The verdict is `CONCERNS` because AC2 and AC6 still depend on protected production evidence that the story itself records as deferred: a dated 42+ venue cold-p95 dataset with proof of persisted geometry reads and zero request-path provider/shadow recompute. This is an evidence gap, not a local implementation-test gap.

## Coverage Summary

| Metric | Value |
|---|---:|
| Total traced items | 8 |
| Fully covered | 6 |
| Partially covered | 2 |
| Uncovered | 0 |
| Full-only AC coverage | 75% |
| Covered or partially covered | 100% |
| P0 full coverage | 1/2 |
| P1 full coverage | 4/5 |
| P2 full coverage | 1/1 |

## Test Inventory

Primary active Story 12.3 source-level suites:

| Level | File | Active cases |
|---|---|---:|
| API contract | `nextjs-app/test/unit/api/story-12-3-persisted-geometry-route.atdd.test.ts` | 8 |
| Unit / hash | `nextjs-app/test/unit/services/sun-geometry-hash.atdd.test.ts` | 7 |
| Unit / precompute | `nextjs-app/test/unit/services/sun-geometry-precompute.atdd.test.ts` | 5 |
| Unit / precompute automate | `nextjs-app/test/unit/services/sun-geometry-precompute.automate.test.ts` | 3 |
| Unit / weather | `nextjs-app/test/unit/services/weather-snapshots.atdd.test.ts` | 5 |
| Unit / weather automate | `nextjs-app/test/unit/services/weather-snapshots.automate.test.ts` | 4 |
| Static / SQL / ops | `nextjs-app/test/unit/story-12-3-geometry-migrations-and-leases.atdd.test.ts` | 10 |
| Unit / persisted outcome | `nextjs-app/test/unit/services/sun-geometry-persisted-outcome.automate.test.ts` | 4 |
| Unit / coordinates | `nextjs-app/test/unit/services/sun-geometry-coordinates.automate.test.ts` | 3 |
| E2E request-count | `nextjs-app/test/e2e/story-12-3-persisted-geometry-request-count.atdd.spec.ts` | 2 source tests, recorded as 4 runtime tests across projects |

Focused scan found no active `test.skip`, `test.only`, `test.todo`, or `test.fixme` markers in the primary Story 12.3 suites.

## Traceability Matrix

### AC1 - Deterministic persisted geometry split from read-time weather gating

**Priority:** P0, core correctness and stale-data prevention.
**Coverage:** FULL.

Covering tests and evidence:

- `sun-geometry-hash.atdd.test.ts:58` pins `g1:<sha256>` format; lines 68, 83, 91, 103, 111, and 126 cover polygon/caster canonicalization, non-finite rejection, planner-step version, caster EWKB/import generation, and z-values.
- `sun-geometry-precompute.atdd.test.ts:36` requires deterministic ungated geometry-only entries for every planner step.
- `story-12-3-persisted-geometry-route.atdd.test.ts:41`, `:53`, `:71`, `:79`, `:100`, and `:121` verify the route uses exact published hash coverage, canonical caster hash records, fail-closed stale/missing coverage, and O(steps) weather re-gating from the same persisted geometry values.
- `sun-geometry-persisted-outcome.automate.test.ts:76`, `:146`, `:184`, and `:220` cover exact hash coverage, weather bucket behavior, geometry-only freshness fallback, and dirty-input fail-closed behavior.

### AC2 - Supabase-persisted geometry makes cold `/api/venues` reads fast and service-only

**Priority:** P0, public endpoint performance plus data/security boundary.
**Coverage:** PARTIAL.

Covering tests and evidence:

- `story-12-3-persisted-geometry-route.atdd.test.ts:41` proves the list route source contract removes 61-step request-path shadow projection and live weather fan-out.
- `story-12-3-persisted-geometry-route.atdd.test.ts:63`, `:79`, `:100`, and `:162` cover diagnostic redaction, typed `503 SUN_GEOMETRY_COVERAGE_MISSING`, stale/wrong-day rejection, and fail-closed headers.
- `story-12-3-geometry-migrations-and-leases.atdd.test.ts:165`, `:188`, `:198`, and `:208` cover persisted geometry tables, RLS, service-only grants, hash state, atomic promotion, and partial-window rejection.
- Story Dev Agent Record reports local typecheck/lint, focused/full Vitest, focused Playwright request-count gate, full Playwright, esbuild, disposable PostGIS migration replay, and partial-publish smoke checks passed.

Material gap:

- The story records protected production evidence as deferred because local `GITHUB_TOKEN`/protected environment access was unavailable. The missing lane is the AC's 42+ venue cold-p95 dataset proving `<= ~5 s p95`, cold definition, venue count, date/hash generation, response mode, persisted reads, and zero provider/shadow recompute in the protected environment.

### AC3 - Direct GitHub Action precomputes all venues across the planner window

**Priority:** P1, operational integrity and scheduler correctness.
**Coverage:** FULL.

Covering tests and evidence:

- `sun-geometry-precompute.atdd.test.ts:51`, `:60`, and `:73` cover the planner window, all persisted venues including hidden/resolver-excluded venues, and all venue/date/hash cells before publish.
- `sun-geometry-precompute.automate.test.ts:44` and `:102` cover batch publication across every date and no partial publish on invalid targets.
- `story-12-3-geometry-migrations-and-leases.atdd.test.ts:177`, `:218`, `:230`, `:268`, and `:294` cover leases, direct Supabase GitHub Actions, safe toggles/docs, executable lease behavior, and atomic publish behavior.
- `weather-snapshots.atdd.test.ts:63` covers rain true/false/unknown handling and near-now nowcast boundaries.

### AC4 - Forecast retention covers planner horizon or explicitly degrades to unknown

**Priority:** P1, forecast correctness and stale-weather prevention.
**Coverage:** FULL.

Covering tests and evidence:

- `weather-snapshots.atdd.test.ts:25` covers planner-horizon snapshot coverage or explicit unknown.
- `weather-snapshots.atdd.test.ts:34` covers the day+3 boundary so stale nearest retained slices are not reused.
- `weather-snapshots.atdd.test.ts:46`, `:63`, and `:85` cover geometry-percent preservation, explicit rain states, nowcast-only rain behavior, and removal of hard-coded first-48-slice retention.
- `weather-snapshots.automate.test.ts:8`, `:29`, `:53`, and `:79` cover below-horizon parity, layer-weighted cloud gating, rain false/true distinction, nearest fresh slice selection, and stale unknown fallback.

### AC5 - Stockholm midnight roll keeps continuous coverage

**Priority:** P1, time-boundary operational correctness.
**Coverage:** FULL.

Covering tests and evidence:

- `sun-geometry-precompute.atdd.test.ts:51` requires the precompute window from today through `today + PLANNER_MAX_FUTURE_DAYS + 1`.
- `story-12-3-geometry-migrations-and-leases.atdd.test.ts:218` covers direct scheduled GitHub Action operation rather than a request-path warmer.
- `story-12-3-geometry-migrations-and-leases.atdd.test.ts:294` covers preserving old ready coverage until a valid generation commits, which protects continuity during roll-forward.

### AC6 - CPU profile and cheap wins recorded

**Priority:** P1, performance governance.
**Coverage:** PARTIAL.

Covering tests and evidence:

- `sun-geometry-precompute.atdd.test.ts:89` requires cold-route before/after, bucket-roll, and precompute timing evidence.
- `sun-geometry-precompute.automate.test.ts:138` verifies measured profiling timings rather than placeholder zeros.
- Story Dev Agent Record reports esbuild checks for scheduled scripts, local focused/full Vitest, focused request-count Playwright, full Playwright, and local review-fix verification.

Material gap:

- The production-scale p95 and real 42+ venue cold evidence lane is deferred, so this AC cannot be marked fully covered for release evidence even though local profiling contracts and timing fields are covered.

### AC7 - External quarter-hour warmer and keep-alive are retired

**Priority:** P2, operations cleanup and cost control.
**Coverage:** FULL.

Covering tests and evidence:

- `story-12-3-geometry-migrations-and-leases.atdd.test.ts:218` asserts workflows run direct Supabase jobs and not Vercel HTTP warmers.
- `story-12-3-geometry-migrations-and-leases.atdd.test.ts:256` rejects quarter-hour warmer, keep-alive, and warm `/api/venues` contracts from workflows/docs.
- Story File List includes the scheduled workflow and docs updates under test.

### Design Gate - No visual change; scrub and date-change behavior only

**Priority:** P1 for no-regression behavior.
**Coverage:** FULL.

Covering tests and evidence:

- `story-12-3-persisted-geometry-request-count.atdd.spec.ts:109` covers same-date scrub with zero `/api/venues` requests.
- `story-12-3-persisted-geometry-request-count.atdd.spec.ts:131` covers date change with exactly one list request and no weather/provider burst.
- Story Dev Agent Record reports the focused Story 12.3 Playwright request-count gate passed under `CI=1` as 4 runtime tests.
- Visual validation is not applicable because the story has no visible UI/copy change.

## Coverage Heuristics

- **Endpoint coverage:** covered for public list/detail persisted-read behavior, typed failures, redaction, fail-closed whole-response behavior, and request-count regression. No uncovered public endpoint was identified for story scope.
- **Auth/authz coverage:** covered at static SQL contract level for service-only tables/RPCs and role grants. Live protected Supabase advisor/protected-environment verification remains part of the deferred evidence lane.
- **Error/edge coverage:** covered for missing current hash, old hash, wrong day, coverage gaps, dirty current input, expired/empty weather snapshots, invalid targets, partial publish, expired leases, and stale forecast slices.
- **UI journey/state coverage:** not applicable. The only user-observable invariant is request count during scrub/date change and it is covered by Playwright.

## Uncovered ACs

None.

## Material Gaps

1. **AC2/AC6 production p95 evidence:** missing dated 42+ venue cold-read dataset proving `<= ~5 s p95`, persisted geometry reads, and zero request-path provider/shadow recompute in the protected production environment.
2. **AC2 protected environment verification:** protected GitHub `Production` secrets/variables and live protected Supabase advisor evidence were not collected locally; story records missing access as the reason.
3. **Post-review full Playwright:** full Playwright is recorded before review-fix work; after review-fix, focused Story 12.3 Playwright passed. Given the no-visual scope and local route/service focus, this is residual rather than blocking.

## Recommendations

- Collect the protected production evidence lane before final release approval: 42+ venue cold p95, route/date/hash/run metadata, edge/warm/cold classification, logs proving persisted geometry reads, and zero provider/shadow recompute on request path.
- Keep the Story 12.3 focused request-count gate and route/source contract tests in the standing regression set because they guard the original cold-start regression.

## Advisory Gate Decision

**GATE DECISION: CONCERNS** (advisory - not opened or enforced by this pass)

Coverage analysis:

- P0 coverage: 1/2 fully covered; AC2 is partial because protected p95 evidence is deferred.
- P1 coverage: 4/5 fully covered; AC6 is partial for the same production-scale evidence lane.
- Overall full-only coverage: 75%; covered-or-partial coverage: 100%.

Rationale: all Story 12.3 ACs have direct automated coverage, but release-level confidence is incomplete until the protected production performance/evidence lane is collected.
