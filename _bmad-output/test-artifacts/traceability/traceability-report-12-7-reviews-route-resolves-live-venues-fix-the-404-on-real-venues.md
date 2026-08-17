---
stepsCompleted:
  - step-01-load-context
  - step-02-discover-tests
  - step-03-map-criteria
  - step-04-analyze-gaps
  - step-05-gate-decision
lastStep: step-05-gate-decision
lastSaved: '2026-08-17T17:14:10+02:00'
workflowType: testarch-trace
scope: story-only
story: 12-7-reviews-route-resolves-live-venues-fix-the-404-on-real-venues
advisory: true
coverageBasis: acceptance_criteria
oracleResolutionMode: formal_requirements
oracleConfidence: high
oracleSources:
  - _bmad-output/implementation-artifacts/12-7-reviews-route-resolves-live-venues-fix-the-404-on-real-venues.md
  - _bmad-output/test-artifacts/atdd-checklist-12-7-reviews-route-resolves-live-venues-fix-the-404-on-real-venues.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-12.md
  - _bmad-output/planning-artifacts/architecture.md
  - project-context.md
externalPointerStatus: not_used
tempCoverageMatrixPath: 'C:/tmp/tea-trace-coverage-matrix-2026-07-18T22-08-03+02-00.json'
postFinalizationEvidenceRefresh: true
---

# Traceability Report - Story 12.7: Reviews Route Resolves Live Venues

**Scope:** STORY-LEVEL - Story 12.7 AC1-AC4 and the final review-fix contracts only.
**Mode:** ADVISORY. This trace reports coverage and evidence gaps without blocking, remediating, changing sprint status, or editing implementation/auto-bmad state.
**Story status at trace time:** `review`.

## Current Addendum - 2026-08-17 Protected Closeout Evidence

**Current advisory verdict:** PASS.

This addendum supersedes the July 18 advisory CONCERNS verdict below for release-evidence purposes. The prior concern had two lanes: OPS-1 needed protected/live migration evidence for `public.venues.hidden`, and INV-1 needed direct concurrent visibility/cache evidence. Both are now closed.

Closing evidence:

- The canonical `public.venues.hidden` migration is applied on the protected Supabase project.
- A live visibility smoke verified visible/hidden public behavior and restored the temporary visibility mutation after verification.
- The protected generated visibility section matches the checked-in type contract, including `hidden`.
- The broader generated Supabase type file still contains unrelated generator/schema drift; this addendum claims only the scoped visibility-section parity.
- The 2026-08-08 deterministic concurrent same-slug test remains valid: a deferred hidden read and a concurrent visible read resolve independently without an in-flight promise or cached-miss bleed.
- Exact-head CI run `32039760444` passed against `a20aac8a4a333a00efa82f4d334eeed033037f46`, including full build/test, Playwright, and desktop/mobile accessibility gates.
- The same SHA is promoted in Vercel production deployment `dpl_91a1VcSSJpa8JSGCnrvqXecSSAHi`; the post-ready scan found no `/api/venues` runtime errors and no error/fatal deployment logs.

## Coverage Oracle

The primary oracle is the formal Story 12.7 acceptance criteria, augmented by the completed review findings and the explicit advisory scope requested for this trace. Confidence is high because the story, architecture decisions, ATDD checklist, and Epic 12 test design agree on the central live-venue identity contract.

The traced requirements are:

- Live Supabase id/slug parity and fixture fallback only in fixture mode.
- Reviews GET zero-review `200` behavior and genuine unknown `404` behavior.
- Reviews GET/POST and feedback POST convergence on one server-only public resolver.
- Feedback submission for live venues by id or slug.
- Canonical `hidden boolean not null default false` migration/type/projection contract.
- Fail-closed visibility for true, null, or missing `hidden` values without DTO leakage.
- Control-character identifier rejection before data access/persistence.
- Stable collision handling using explicit candidate cardinality rather than message text.
- Cache/race consistency: no cached miss or shared in-flight state masking later visibility.

No external requirements pointer was needed. This is backend/API scope with no visual coverage oracle.

## Test Inventory

### Primary Story 12.7 Suites

| Level | File | Active cases |
|---|---|---:|
| Unit / resolver ATDD | `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.atdd.test.ts` | 5 |
| Unit / resolver and schema automation | `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.automation.test.ts` | 9 |
| API / reviews route ATDD | `nextjs-app/test/unit/api/story-12-7-reviews-route-live-venues.atdd.test.ts` | 5 |
| API / feedback route ATDD | `nextjs-app/test/unit/api/story-12-7-feedback-route-live-venues.atdd.test.ts` | 4 |
| API / shared route convergence automation | `nextjs-app/test/unit/api/story-12-7-shared-resolver-convergence.automation.test.ts` | 6 |
| **Total** | **5 files** | **29** |

No active `test.skip`, `test.todo`, `test.fixme`, `test.only`, `describe.skip`, or `describe.only` markers were found in the primary suites.

### Supporting Regression Evidence

The trace also reviewed relevant cases in:

- `nextjs-app/test/unit/api/reviews-route.test.ts`: fixture GET, unknown/missing identifiers, fixture POST, live zero-review GET plus id-first POST, mismatch handling, and slug alias behavior.
- `nextjs-app/test/unit/api/venue-feedback-route.test.ts`: fixture submission, id-path resolution, live id/slug submission, unknown 404, mismatch rejection, and persistence 503 mapping.
- `nextjs-app/test/unit/services/venue-reviews-persistence.test.ts`: fixture resolution by id and slug through the shared public resolver.
- `nextjs-app/test/unit/services/sun-geometry-precompute.atdd.test.ts`: hidden/resolver-excluded venues remain included in the all-venue precompute target set.

### Coverage Heuristics

- **Endpoint inventory:** `GET /api/reviews`, `POST /api/reviews`, and `POST /api/venues/[slug]/feedback` all have direct API-route tests.
- **Identity boundaries:** live id, live slug, fixture-only fallback, unknown, hidden, blank, malformed, and collision paths are exercised.
- **Validation/error paths:** unsafe review body identifiers and encoded feedback path identifiers assert `400` before resolver/persistence; hidden and unknown assert indistinguishable `404`; real resolver errors are distinguished from collisions.
- **Auth/authz:** not applicable to Story 12.7; these anonymous public routes have no authentication acceptance criterion.
- **UI/E2E:** not applicable to the backend-only story. The story gate records no mapped screen ID and no public DTO or UI change.
- **Execution evidence:** the completed review-fix run recorded 9 focused files / 97 passing tests, then 182 passing and 2 skipped files with 1,729 passing and 15 skipped tests in the full Vitest suite. The canonical dry-run story gate repeated lint, typecheck, and the full suite successfully.

## Primary Test Identity Catalog

| ID | Level | File:line | Test title |
|---|---|---|---|
| R-ATDD-01 | Unit | `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.atdd.test.ts:124` | Supabase mode resolves the same live venue by id and slug without fixture fallback |
| R-ATDD-02 | Unit | `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.atdd.test.ts:137` | Hidden, malformed visibility, blank, and unknown identifiers are the same public miss |
| R-ATDD-03 | Unit | `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.atdd.test.ts:151` | Fixture fallback is allowed only outside Supabase mode |
| R-ATDD-04 | Unit | `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.atdd.test.ts:162` | Corrupt id/slug collisions fail closed |
| R-ATDD-05 | Unit | `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.atdd.test.ts:173` | Resolver misses are not cached over later visible rows |
| R-AUTO-01 | Unit | `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.automation.test.ts:95` | Live id and slug share the quoted Supabase filter contract |
| R-AUTO-02 | Unit | `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.automation.test.ts:121` | Reserved PostgREST tokens remain literal |
| R-AUTO-03 | Unit | `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.automation.test.ts:131` | Only canonical hidden=false is public; true/null/missing fail closed |
| R-AUTO-04 | Unit | `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.automation.test.ts:153` | Unsafe controls are rejected before Supabase access |
| R-AUTO-05 | Unit | `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.automation.test.ts:160` | Visibility fields do not leak into the public DTO |
| R-AUTO-06 | Unit | `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.automation.test.ts:174` | Misses and in-flight state are not shared across visibility changes |
| R-AUTO-07 | Unit | `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.automation.test.ts:186` | Collision cardinality is explicit and real store errors propagate |
| R-AUTO-08 | Unit / static contract | `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.automation.test.ts:222` | Migration defines hidden as non-null boolean default false |
| R-AUTO-09 | Unit / static contract | `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.automation.test.ts:234` | Generated venue types expose the canonical boolean contract |
| REV-ATDD-01 | API | `nextjs-app/test/unit/api/story-12-7-reviews-route-live-venues.atdd.test.ts:190` | Live fixture-absent slug returns 200 empty reviews |
| REV-ATDD-02 | API | `nextjs-app/test/unit/api/story-12-7-reviews-route-live-venues.atdd.test.ts:204` | Live numeric id resolves before slug on POST |
| REV-ATDD-03 | API | `nextjs-app/test/unit/api/story-12-7-reviews-route-live-venues.atdd.test.ts:232` | Supabase mode never falls back to fixture identity |
| REV-ATDD-04 | API | `nextjs-app/test/unit/api/story-12-7-reviews-route-live-venues.atdd.test.ts:244` | Hidden and unknown share 404 and do not hit persistence |
| REV-ATDD-05 | API / static contract | `nextjs-app/test/unit/api/story-12-7-reviews-route-live-venues.atdd.test.ts:261` | Reviews route imports the shared resolver and no fixture resolver |
| FB-ATDD-01 | API | `nextjs-app/test/unit/api/story-12-7-feedback-route-live-venues.atdd.test.ts:146` | Live fixture-absent slug can submit feedback |
| FB-ATDD-02 | API | `nextjs-app/test/unit/api/story-12-7-feedback-route-live-venues.atdd.test.ts:169` | Live numeric id resolves to the same slug before persistence |
| FB-ATDD-03 | API | `nextjs-app/test/unit/api/story-12-7-feedback-route-live-venues.atdd.test.ts:188` | Hidden and unknown share public 404 before persistence |
| FB-ATDD-04 | API / static contract | `nextjs-app/test/unit/api/story-12-7-feedback-route-live-venues.atdd.test.ts:207` | Feedback route imports the shared resolver and no fixture match |
| CONV-01 | API | `nextjs-app/test/unit/api/story-12-7-shared-resolver-convergence.automation.test.ts:113` | Reviews GET uses the resolver and preserves zero-review no-store response |
| CONV-02 | API | `nextjs-app/test/unit/api/story-12-7-shared-resolver-convergence.automation.test.ts:133` | Reviews POST resolves venueId first and persists canonical live identity |
| CONV-03 | API | `nextjs-app/test/unit/api/story-12-7-shared-resolver-convergence.automation.test.ts:175` | Feedback POST decodes the path and uses the same resolver |
| CONV-04 | API validation | `nextjs-app/test/unit/api/story-12-7-shared-resolver-convergence.automation.test.ts:204` | Malformed review identifiers stop before resolver/persistence |
| CONV-05 | API validation | `nextjs-app/test/unit/api/story-12-7-shared-resolver-convergence.automation.test.ts:219` | Encoded-control feedback paths stop before resolver/persistence |
| CONV-06 | API | `nextjs-app/test/unit/api/story-12-7-shared-resolver-convergence.automation.test.ts:234` | Reviews and feedback share a non-leaking not-found boundary |

## Traceability Matrix

| Requirement | Priority | Coverage | Primary mapped tests | Heuristic / gap note |
|---|---|---|---|---|
| AC1 - Live id OR slug resolution, zero-review 200, unknown 404 | P0 | FULL | R-ATDD-01, R-AUTO-01, REV-ATDD-01, REV-ATDD-02, REV-ATDD-04 | Direct resolver and API checks include alternate identity and not-found behavior. |
| AC2 - Reviews GET/POST share one identity source and live POST resolves | P0 | FULL | REV-ATDD-02, REV-ATDD-05, CONV-01, CONV-02 | Endpoint-level and source-contract evidence; not happy-path-only. |
| AC3 - Live fixture-absent regression plus fixture/live boundary | P0 | FULL | R-ATDD-03, REV-ATDD-01, REV-ATDD-03 | Explicitly proves fixture fallback only outside Supabase mode. Supporting fixture route tests remain green. |
| AC4 - Feedback POST uses the same live id/slug resolver | P0 | FULL | FB-ATDD-01, FB-ATDD-02, FB-ATDD-04, CONV-03 | Direct API checks cover live slug and numeric id; hidden/unknown covered separately. |
| RF-HIGH - Public visibility guard fails closed | P0 | FULL | R-ATDD-02, R-AUTO-03, R-AUTO-05, REV-ATDD-04, FB-ATDD-03, CONV-06 | Canonical allow condition is exactly `hidden === false`; true/null/missing and non-leakage are tested. |
| RF-MED-ID - Unsafe POST/path identifiers do not reach data access | P0 | FULL | R-AUTO-02, R-AUTO-04, CONV-04, CONV-05 | Resolver defense plus both affected POST boundaries assert no resolver/persistence call and stable 400. |
| RF-MED-SCHEMA - Migration, resolver projection, and generated types share canonical hidden contract | P0 | FULL (local/static) | R-AUTO-01, R-AUTO-08, R-AUTO-09 | Static contract is complete; deployment application is traced separately as OPS-1. |
| RF-LOW - Collision behavior uses stable explicit cardinality | P1 | FULL | R-ATDD-04, R-AUTO-07 | Tests distinguish two-row collision miss from a real store error without message matching. |
| INV-1 - Cache/race consistency and reviews no-store behavior | P1 | PARTIAL | R-ATDD-05, R-AUTO-06, CONV-01 | Later-visible rows are not masked and GET is no-store, but no concurrent in-flight visibility transition is exercised. |
| OPS-1 - Migration is applied before deploy and verified against a migrated/live database | P0 | PARTIAL | R-AUTO-08, R-AUTO-09 | Migration/type source exists, but no disposable migrated-Postgres run or protected live post-migration query has occurred. |

### Coverage Totals

| Priority | Total | Full | Partial | Uncovered | Full-only coverage | Covered or partial |
|---|---:|---:|---:|---:|---:|---:|
| P0 | 8 | 7 | 1 | 0 | 87.5% | 100% |
| P1 | 2 | 1 | 1 | 0 | 50% | 100% |
| **Total** | **10** | **8** | **2** | **0** | **80%** | **100%** |

The repeated unit/static/API mappings are justified defense in depth: unit tests constrain filter, visibility, cache, and cardinality mechanics; API tests prove route status, persistence ordering, and public non-leakage.

## Phase 1 Gap Analysis

**Execution mode:** `agent-team` selected from `tea_execution_mode: auto`; independent workers reviewed gap classification and coverage heuristics before deterministic merge.

### Coverage Gaps

- **Uncovered criteria:** 0.
- **Partial criteria:** 2.
  - **OPS-1 (P0):** migration SQL and local generated types are source-tested, but no migration execution, `information_schema` assertion, PostgREST query, or post-migration live verification exists. If treated as the narrower execution-only requirement ("migration applied and database verified"), this subrequirement is uncovered rather than partial.
  - **INV-1 (P1):** tests prove sequential misses are not cached and no-store is preserved; they do not prove concurrent in-flight calls remain independent during a visibility transition.
- **Critical/high uncovered AC gaps:** 0. AC1-AC4 and all four review findings have direct executable coverage.

### Heuristic Blind Spots

- Endpoint gaps: 0. All three Story 12.7 API operations have direct handler tests.
- Auth negative-path gaps: 0; authentication is not part of these anonymous public-route requirements.
- Happy-path-only formal criteria: 0. Identity, hidden/unknown, validation, collision, and no-cache alternatives are present.
- UI/E2E gaps: N/A for backend-only scope. Existing browser tests mock API responses and provide no live resolver evidence.
- Supplemental P1 gap: no direct route test forces the shared resolver to reject and asserts reviews GET/POST and feedback POST map the read failure to `503` before persistence.
- Supplemental schema gap: the production Supabase branch of `collectSunGeometryPrecomputeTargets()` has no direct query-chain test for its `hidden` projection.
- Minor validation gaps: no dedicated reviews GET control-character case, malformed feedback percent-encoding case, or unsafe feedback body `venueId`/`venueSlug` case.

### Recommendations

1. **Before deployment:** apply `supabase/migrations/20260718214954_add_public_venue_visibility.sql` before the application runtime, verify `hidden boolean not null default false`, regenerate Supabase types, and smoke-test live id/slug resolution plus hidden rejection.
2. **Test infrastructure:** add a disposable migrated-Postgres/PostgREST contract test for existing-row backfill, defaulted inserts, resolver projection, and precompute projection.
3. **Concurrency evidence:** add a deferred-promise concurrent resolver test or narrow the documented race claim to sequential no-cache behavior.
4. **Route resilience:** add direct resolver-read failure tests for stable `503` mapping without persistence calls.

Phase 1 machine matrix: `C:/tmp/tea-trace-coverage-matrix-2026-07-18T22-08-03+02-00.json`.

## Historical Advisory Verdict - 2026-07-18: CONCERNS

Formal gate evaluation was intentionally skipped because this Story 12.7 trace is advisory (`allow_gate=false`). No gate-decision artifact or blocking signal was emitted.

Core implementation coverage is strong: AC1-AC4 and all four review fixes are fully mapped to active resolver/API tests. The verdict remains `CONCERNS` because the protected/live schema is known to lack `hidden` until deployment applies the migration, and current evidence proves only migration/type source declarations, not a migrated database or post-migration live resolver/precompute query. Sequential cache consistency is covered, but true concurrent in-flight behavior is not.

### Decision Evidence

- Primary Story 12.7 inventory: 5 files / 29 active cases; 14 resolver/schema and 15 route cases; 0 skip/todo/fixme/only markers.
- Independent heuristic validation reran the primary inventory green and reviewed 4 supporting regression files / 37 active cases.
- Story-recorded focused review-fix execution: 9 files / 97 tests passed.
- Story-recorded full execution: 182 files passed, 2 skipped; 1,729 tests passed, 15 skipped.
- Canonical dry-run story gate passed lint, typecheck, and full Vitest without updating sprint status.
- Read-only pre-migration live probes returned `42703` for `hidden`, `is_hidden`, `visibility`, and `deleted_at`; no live database mutation was performed.

### Interpretation

- **Coverage:** 8/10 full, 2/10 partial, 0 uncovered at the composite requirement level.
- **P0:** 7/8 full, 1 partial; all formal ACs and review-fix security/visibility contracts are covered.
- **P1:** 1/2 full, 1 partial due to concurrency evidence.
- **Deployment condition:** application code must not deploy before the canonical migration. After migration, verify the live schema/query contract and regenerate types.
- **Advisory impact:** this report does not change story/sprint status or block the workflow, but deploying runtime code before the migration would produce resolver/precompute `42703` failures and route-level `503` responses.

Machine summary: `_bmad-output/test-artifacts/traceability/e2e-trace-summary-12-7-reviews-route-resolves-live-venues-fix-the-404-on-real-venues.json`.

No implementation, story, sprint-status, or auto-bmad state file was changed by this trace workflow.
