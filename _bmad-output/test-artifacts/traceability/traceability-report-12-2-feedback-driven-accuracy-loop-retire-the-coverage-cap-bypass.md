---
stepsCompleted:
  - step-01-load-context
  - step-02-discover-tests
  - step-03-map-criteria
  - step-04-analyze-gaps
  - step-05-gate-decision
lastStep: step-05-gate-decision
lastSaved: '2026-08-06T20:53:56+02:00'
workflowType: testarch-trace
scope: story-only
story: 12-2-feedback-driven-accuracy-loop-retire-the-coverage-cap-bypass
advisory: true
allowGate: false
coverageBasis: acceptance_criteria
oracleResolutionMode: formal_requirements
oracleConfidence: high
oracleSources:
  - _bmad-output/implementation-artifacts/12-2-feedback-driven-accuracy-loop-retire-the-coverage-cap-bypass.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-12.md
  - _bmad-output/planning-artifacts/architecture.md
  - project-context.md
externalPointerStatus: not_used
tempCoverageMatrixPath: 'C:/Users/Rasmus/sunnyseat/_bmad-output/test-artifacts/traceability/tea-trace-coverage-matrix-12-2-2026-08-06T20-53-56+02-00.json'
---

# Traceability Report - Story 12.2: Feedback Accuracy Loop

**Scope:** STORY-LEVEL only. This trace maps Story 12.2 acceptance criteria AC1-AC8 to the current automated evidence. It intentionally does not trace the whole epic.

**Mode:** ADVISORY. This report surfaces coverage status without blocking, remediating, opening a gate, changing sprint status, or editing product code.

**Story status at trace time:** `review`.

## Coverage Oracle

The primary oracle is the formal Story 12.2 acceptance criteria:

1. Live feedback identity prerequisite.
2. Explicit agreement mapping.
3. Prediction evidence is persisted.
4. Maintainer-ranked wrong-venue list.
5. Corrected geometry resets current accuracy.
6. Coverage-cap bypass is retired.
7. Uncertainty impact is deliberate.
8. Remaining internal confidence uses are documented.

Supporting context reviewed: Epic 12 QA design, architecture decisions E12-AD-03/E12-AD-05/E12-AD-08/E12-AD-12, and project context. No external pointer was needed. This is not a synthetic-source trace.

## Test Inventory

### Direct Story 12.2 Suites

| Level | File | Active cases |
|---|---|---:|
| API / route ATDD | `nextjs-app/test/unit/api/story-12-2-feedback-accuracy-loop.atdd.test.ts` | 6 |
| Ops/source contract ATDD | `nextjs-app/test/unit/story-12-2-accuracy-ops-and-cap-cleanup.atdd.test.ts` | 9 |
| Service / accuracy report | `nextjs-app/test/unit/services/feedback-accuracy-report.test.ts` | 4 |
| Script / maintainer CLI | `nextjs-app/test/unit/scripts/feedback-accuracy-report.test.ts` | 2 |
| Service / persistence adapter | `nextjs-app/test/unit/services/venue-feedback-persistence.test.ts` | 3 |
| API / feedback route regression | `nextjs-app/test/unit/api/venue-feedback-route.test.ts` | 11 |
| Component / feedback flow | `nextjs-app/test/components/FeedbackFlow.test.tsx` | 12 |
| Unit / feedback session | `nextjs-app/test/unit/services/feedback-session.test.ts` | 6 |
| Unit / submit mutation | `nextjs-app/test/unit/mutations/useSubmitFeedback.test.tsx` | 2 |
| E2E / browser evidence submission | `nextjs-app/test/e2e/story-12-2-feedback-evidence.atdd.spec.ts` | 1 active scenario identity, 2 browser executions |
| **Total** | **10 files** | **56 active test identities/executions basis: 55 Vitest cases + 1 active E2E scenario** |

The E2E file also contains one skipped P1 weather-gated browser scaffold. It is not counted as active coverage. The story record already documents why it is skipped: `_state=venue-detail-obscured` does not force-render the feedback prompt. The same weather-gated evidence behavior is covered by active API/unit tests, so no AC is left uncovered by that skipped scaffold.

## Primary Test Identity Catalog

| ID | Level | File:line | Test title |
|---|---|---|---|
| T-A01 | API/static | `nextjs-app/test/unit/api/story-12-2-feedback-accuracy-loop.atdd.test.ts:64` | `[P0] route source consumes the shared 12.7 resolver and removes live VENUE_FIXTURE matching` |
| T-A02 | API | `nextjs-app/test/unit/api/story-12-2-feedback-accuracy-loop.atdd.test.ts:73` | `[P0] hidden and unknown live venues return the same public 404 before persistence` |
| T-A03 | API | `nextjs-app/test/unit/api/story-12-2-feedback-accuracy-loop.atdd.test.ts:100` | `[P0] accepts and persists complete prediction-time evidence for an amber public verdict` |
| T-A04 | API | `nextjs-app/test/unit/api/story-12-2-feedback-accuracy-loop.atdd.test.ts:130` | `[P0] treats exactly 50 percent as grey and maps not_sunny agreement explicitly` |
| T-A05 | API | `nextjs-app/test/unit/api/story-12-2-feedback-accuracy-loop.atdd.test.ts:151` | `[P0] accepts CloudObscured only as diagnostic predictedState while weather-gated verdict is grey` |
| T-A06 | API | `nextjs-app/test/unit/api/story-12-2-feedback-accuracy-loop.atdd.test.ts:172` | `[P0] rejects contradictory public verdict, weather flags, and geometry hashes before persistence` |
| T-O01 | Unit/static | `nextjs-app/test/unit/story-12-2-accuracy-ops-and-cap-cleanup.atdd.test.ts:87` | `[P0] migration adds nullable evidence columns with bounded checks and legacy-row compatibility` |
| T-O02 | Unit/static | `nextjs-app/test/unit/story-12-2-accuracy-ops-and-cap-cleanup.atdd.test.ts:107` | `[P0] API and Supabase types expose the evidence fields on request, response, insert, and row shapes` |
| T-O03 | Unit/static | `nextjs-app/test/unit/story-12-2-accuracy-ops-and-cap-cleanup.atdd.test.ts:119` | `[P0] persistence writes the evidence fields through the service-role insert path only` |
| T-O04 | Unit/static | `nextjs-app/test/unit/story-12-2-accuracy-ops-and-cap-cleanup.atdd.test.ts:131` | `[P0] maintainer report ranks current-hash disagreements deterministically and isolates invalid venue evidence` |
| T-O05 | Unit/static | `nextjs-app/test/unit/story-12-2-accuracy-ops-and-cap-cleanup.atdd.test.ts:145` | `[P0] aggregation excludes unsure, stale-hash, missing-evidence, and legacy rows from current agreement` |
| T-O06 | Unit/static | `nextjs-app/test/unit/story-12-2-accuracy-ops-and-cap-cleanup.atdd.test.ts:154` | `[P0] agreement mapping vectors use the shared public sunny predicate rather than raw VenueSunStatus` |
| T-O07 | Unit/static | `nextjs-app/test/unit/story-12-2-accuracy-ops-and-cap-cleanup.atdd.test.ts:167` | `[P0] SUNNYSEAT_COVERAGE_CAP escape hatch is removed from code, docs, config, and workflows` |
| T-O08 | Unit/static | `nextjs-app/test/unit/story-12-2-accuracy-ops-and-cap-cleanup.atdd.test.ts:173` | `[P0] the internal coverage cap remains fail-closed for missing or unknown coverage` |
| T-O09 | Unit/static | `nextjs-app/test/unit/story-12-2-accuracy-ops-and-cap-cleanup.atdd.test.ts:179` | `[P1] retained confidence is documented as diagnostic or maintainer-only, not public percentage copy` |
| T-R01 | Unit | `nextjs-app/test/unit/services/feedback-accuracy-report.test.ts:49` | `maps agreement through the shared public sunny predicate vectors` |
| T-R02 | Unit | `nextjs-app/test/unit/services/feedback-accuracy-report.test.ts:80` | `excludes unsure, stale-hash, missing-evidence, and invalid evidence from current agreement` |
| T-R03 | Unit | `nextjs-app/test/unit/services/feedback-accuracy-report.test.ts:112` | `enforces minimum sample count for venue and area rankings` |
| T-R04 | Unit | `nextjs-app/test/unit/services/feedback-accuracy-report.test.ts:147` | `sorts by disagreement rate, count, latest disagreeing feedback, and stable identity` |
| T-S01 | Unit/script | `nextjs-app/test/unit/scripts/feedback-accuracy-report.test.ts:75` | `queries maintainer evidence and writes deterministic JSON report output` |
| T-S02 | Unit/script | `nextjs-app/test/unit/scripts/feedback-accuracy-report.test.ts:165` | `returns non-zero and reports query failures without writing partial output` |
| T-P01 | Unit | `nextjs-app/test/unit/services/venue-feedback-persistence.test.ts:62` | `writes via the write-only snake_case insert/select chain and merges the returned id/createdAt` |
| T-RT01 | API | `nextjs-app/test/unit/api/venue-feedback-route.test.ts:124` | `accepts a CloudObscured predictedState (weather-gated real-engine path)` |
| T-RT02 | API | `nextjs-app/test/unit/api/venue-feedback-route.test.ts:153` | `resolves live Supabase venue slugs and ids absent from fixtures before persistence` |
| T-RT03 | API | `nextjs-app/test/unit/api/venue-feedback-route.test.ts:185` | `rejects unknown venues with stable 404` |
| T-RT04 | API | `nextjs-app/test/unit/api/venue-feedback-route.test.ts:212` | `rejects malformed booleans, impossible confidence, unknown state, and unsafe control characters` |
| T-RT05 | API | `nextjs-app/test/unit/api/venue-feedback-route.test.ts:230` | `accepts the explicit unsure sun answer and safe multiline notes` |
| T-RT06 | API | `nextjs-app/test/unit/api/venue-feedback-route.test.ts:267` | `rejects mismatched body venue ids` |
| T-C01 | Component | `nextjs-app/test/components/FeedbackFlow.test.tsx:152` | `submits the current prediction payload and shows confirmation without closing detail` |
| T-C02 | Component | `nextjs-app/test/components/FeedbackFlow.test.tsx:192` | `submits the prediction snapshot from the qualifying detail view` |
| T-C03 | Component | `nextjs-app/test/components/FeedbackFlow.test.tsx:249` | `keeps the form visible on submit failure for retry` |
| T-U01 | Unit | `nextjs-app/test/unit/services/feedback-session.test.ts:51` | `records detail views and submitted venues in sessionStorage` |
| T-M01 | Unit | `nextjs-app/test/unit/mutations/useSubmitFeedback.test.tsx:18` | `posts feedback, disables automatic retry, and marks session only on success` |
| T-E01 | E2E | `nextjs-app/test/e2e/story-12-2-feedback-evidence.atdd.spec.ts:29` | `[P0] feedback submission includes public verdict, weather flags, exposure, and geometry hash` |

## Traceability Matrix

| Requirement | Priority | Coverage | Primary mapped tests | Heuristic / gap note |
|---|---|---|---|---|
| AC1 - Live feedback identity prerequisite | P0 | FULL | T-A01, T-A02, T-RT02, T-RT03, T-RT06 | API route consumes the shared public resolver, resolves live id/slug, rejects unknown/hidden with stable public errors, and rejects mismatched body identifiers. |
| AC2 - Explicit agreement mapping | P0 | FULL | T-A04, T-A05, T-O06, T-R01, T-R02, T-RT05 | Covers amber/grey mapping, exact 50 as grey, weather-gated grey, weather-unknown explicit evidence, `unsure` excluded, and no raw `VenueSunStatus` comparison. |
| AC3 - Prediction evidence is persisted | P0 | FULL | T-A03, T-A06, T-O01, T-O02, T-O03, T-P01, T-C01, T-C02, T-E01 | Covers migration/type/schema contract, route validation, persistence mapping, UI/session snapshot, mutation submission, and browser POST payload evidence. |
| AC4 - Maintainer-ranked wrong-venue list | P0 | FULL | T-O04, T-R03, T-R04, T-S01, T-S02 | Covers deterministic venue and area ranking, minimum sample threshold, latest disagreeing feedback tie-breaker, representative wrong windows, invalid-evidence isolation, CLI output, and CLI query failure behavior. |
| AC5 - Corrected geometry resets current accuracy | P0 | FULL | T-O01, T-O04, T-O05, T-R02 | Covers current-hash scoping, stale-hash exclusion, missing-evidence legacy count, malformed complete evidence invalid count, and legacy-row compatibility. |
| AC6 - Coverage-cap bypass is retired | P0 | FULL | T-O07, T-O08 | Covers removal from code/docs/config/workflows and proves the internal fail-closed coverage cap remains. |
| AC7 - Uncertainty impact is deliberate | P1 | FULL | T-O08, T-RT04, T-E01 | Covers retained fail-closed cap behavior and no submitted/public `confidencePercent`; no user-facing uncertainty/copy change was made, so visual validation is not required. |
| AC8 - Remaining internal confidence uses are documented | P1 | FULL | T-O09, T-E01 | Covers diagnostic/maintainer-only confidence documentation and guards against visible or screen-reader confidence percentage copy in Story 12.2 surfaces. |

## Coverage Totals

| Priority | Total | Full | Partial | Uncovered | Full coverage |
|---|---:|---:|---:|---:|---:|
| P0 | 6 | 6 | 0 | 0 | 100% |
| P1 | 2 | 2 | 0 | 0 | 100% |
| P2 | 0 | 0 | 0 | 0 | 100% by convention |
| P3 | 0 | 0 | 0 | 0 | 100% by convention |
| **Total** | **8** | **8** | **0** | **0** | **100%** |

## Gap Analysis

**Execution mode:** sequential advisory trace.

- Uncovered criteria: 0.
- Partial criteria: 0.
- Critical/high uncovered gaps: 0.
- Unit-only concerns: 0. Backend/reporting requirements are appropriately unit/API-heavy; the public feedback submission path also has component and E2E coverage.

### Coverage Heuristics

- Endpoint gaps: 0. Feedback POST route has direct route tests and browser POST evidence.
- Auth/authz gaps: not applicable. Story 12.2 changes anonymous public feedback and service-role persistence, not authenticated user roles.
- Error-path gaps: 0. Hidden/unknown venues, mismatched identifiers, contradictory evidence, malformed body fields, persistence failure, CLI query failure, stale hash, missing evidence, and invalid complete evidence are covered.
- UI journey gaps: 0. The feedback submission payload path is covered by component and active E2E evidence.
- UI state gaps: 0. Submit success/failure, duplicate/session behavior, and forced prompt behavior are covered by component/unit tests.

## Advisory Verdict: PASS

Formal blocking gate evaluation was intentionally skipped because this Story 12.2 trace is advisory (`allowGate=false`). The advisory verdict is **PASS** because all 8 Story 12.2 acceptance criteria are covered by active automated tests, with 6/6 P0 and 2/2 P1 at FULL coverage.

### Uncovered ACs

None.

### Notes

- One skipped P1 E2E scaffold remains in `nextjs-app/test/e2e/story-12-2-feedback-evidence.atdd.spec.ts`, but the weather-gated evidence behavior is actively covered by API/unit tests and is documented as skipped due the forced-state prompt limitation. This is not counted as an uncovered AC.
- Recent validation evidence in the story file records focused Story 12.2 regression passing at 9 files / 55 tests, full Vitest passing at 211 files / 1916 tests, typecheck passing, and lint passing.
