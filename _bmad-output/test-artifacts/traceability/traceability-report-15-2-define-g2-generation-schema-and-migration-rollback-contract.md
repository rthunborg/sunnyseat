---
stepsCompleted:
  - step-01-load-context
  - step-02-discover-tests
  - step-03-map-criteria
  - step-04-analyze-gaps
  - step-05-gate-decision
lastStep: step-05-gate-decision
lastSaved: '2026-09-23'
workflowType: testarch-trace
scope: story-only
story: 15-2-define-g2-generation-schema-and-migration-rollback-contract
advisory: true
allowGate: false
coverageBasis: acceptance_criteria
oracleResolutionMode: formal_requirements
oracleConfidence: high
oracleSources:
  - _bmad-output/implementation-artifacts/15-2-define-g2-generation-schema-and-migration-rollback-contract.md
  - project-context.md
externalPointerStatus: not_used
tempCoverageMatrixPath: 'C:/Users/Rasmus/AppData/Local/Temp/tea-trace-coverage-matrix-15-2-2026-09-23T14-44-47+02-00.json'
---

# Traceability Report - Story 15.2: Define g2, generation schema and migration/rollback contract

**Scope:** STORY-LEVEL. This report traces only the six acceptance criteria in Story 15.2.

**Mode:** ADVISORY. It reports coverage without opening or enforcing a gate, remediating gaps, changing implementation, or changing story/sprint status.

## Coverage Oracle

The formal Story 15.2 acceptance criteria are the primary and exclusive coverage oracle. They are authoritative, explicit, and sufficiently detailed to support a high-confidence trace. Project context supplies standing test and architecture conventions but does not expand the traced requirement set beyond AC1-AC6. No external pointer or synthetic requirement inference was needed.

The six criteria cover: immutable seasonal storage and compact day results; deterministic g2 identity; invalidation and g1 attribution; migration/security/decoder/storage verification; staged revisions/publication/rollback/retention; and review of migration/rollback evidence before any separately authorized production mutation.

## Test Inventory

### Story-owned unit suites

| ID | Level | File:line | Active identity / describe block |
|---|---|---|---|
| T-U01 | Unit | `nextjs-app/test/unit/services/sun-geometry-hash-g2.test.ts:6` | `I01 g2 identity` - golden vectors, canonicalization, exclusions, exact manifest/input binding, malformed input and topology bounds |
| T-U02 | Unit | `nextjs-app/test/unit/services/sun-geometry-g2-admission.test.ts:17` | `g2 geometry admission` - bounded structural preflight and accepted canonical identity |
| T-U03 | Unit | `nextjs-app/test/unit/services/sun-geometry-g2-topology-cost.test.ts:46` | `Round 6 topology-work regression` - exact contacts, normalization stability and bounded work |
| T-U04 | Unit | `nextjs-app/test/unit/services/sun-geometry-season-codec.test.ts:17` | `I02 full Float64 day representation` - immutable transport, coverage, samples, brackets, DST, checksums and decoder failures |
| T-U05 | Unit | `nextjs-app/test/unit/services/sun-geometry-release-contract.test.ts:13` | `I02/I14 exact immutable release contract` - inventory, generations, revisions, counts, checksums, decoder and exact season lookup |
| T-U06 | Unit | `nextjs-app/test/unit/services/storage-04-provenance.test.ts:8` | `storage-04 retained provenance` - immutable retained-corpus pins and tamper/missing-artifact rejection |
| T-U07 | Unit | `nextjs-app/test/unit/services/sun-geometry-storage-duration.test.ts:5` | Threshold-duration refinement and bounded failure behavior |
| T-U08 | Unit | `nextjs-app/test/unit/services/sun-geometry-g2-solar-position.test.ts:5` | g2 subsecond identity correction without mutating g1 |

### Story-owned integration and evidence suites

| ID | Level | File:line | Active identity / describe block |
|---|---|---|---|
| T-I01 | Integration / PostgreSQL | `nextjs-app/test/integration/epic-15/schema.test.ts:24` | `I02/I03/I08/I14/I15 isolated migration, real role and rollback contract` - migration replay, catalog fingerprint, strict admission, RLS/FORCE RLS/grants, lifecycle, revisions, concurrency, publication, rollback and retained evidence |
| T-I02 | Integration / differential | `nextjs-app/test/integration/epic-15/topology-parity.test.ts:9` | TypeScript/PostGIS topology parity over the bounded endpoint-sweep corpus |
| T-I03 | Integration / diagnostic | `nextjs-app/test/integration/epic-15/duration-probe.test.ts:26` | Accepted duration parity and expected rejection of unresolved duration evidence |
| T-I04 | Integration / storage | `nextjs-app/test/integration/epic-15/storage.measurement.ts:27` | Actual-year distinct-input candidate storage measurement with retained versions and no provider access |
| T-I05 | Integration / retained data | `nextjs-app/test/integration/epic-15/storage.revalidation.ts:11` | Pinned retained measurement revalidation with final decoder, migration, checksums, releases and relation census |

The directly relevant inventory contains 13 test files. Parameterized tests expand the unit identities across malformed shapes, ordering variants, DST dates, sampling boundaries, manifest maps and revision/inventory cases. The schema suite is one Vitest identity containing hundreds of separately logged real-PostgreSQL assertions. No direct Story 15.2 test is declared with `skip`, `fixme`, `todo`, or `only`.

## Coverage Heuristics Inventory

- **API endpoints:** not applicable. Story 15.2 defines storage, identity and database contracts and adds no public API endpoint.
- **Authentication/authorization:** T-I01 exercises service-role access, denied anonymous/authenticated/public writes, grant denial, FORCE RLS independently of grants, owner behavior, function execute ACLs and invoker semantics.
- **Error paths:** T-U01 through T-U07 and T-I01 cover malformed/corrupt payloads, unsupported decoders, stale/dirty revisions, incomplete coverage, checksum drift, invalid lifecycle transitions, rejected publication, lock contention and rollback preservation.
- **UI journeys and UI states:** not applicable; the story explicitly has no screen or frontend design gate.
- **Provider isolation:** T-I04 forbids network/provider access, and the retained-data lane verifies pinned local evidence.
- **Procedural control:** AC6's evidence-review and separate-production-authorization requirement is documented in the story and handoff, but no automated test or executable policy gate was discovered that enforces review/authorization before a production mutation.

## Traceability Matrix

All six criteria are P0 because they protect immutable prediction evidence, data integrity, authorization boundaries, safe publication and rollback. Repeated unit and PostgreSQL mappings are intentional: deterministic byte/identity behavior is cheapest to prove in unit tests, while persistence, roles, lifecycle and concurrency require real database integration evidence.

| Requirement | Priority | Coverage | Covering tests | Coverage rationale / uncovered portion |
|---|---|---|---|---|
| **AC1** - Immutable seasons, venue generations, compact day results, release manifests/current pointer; canonical input once; no intermediate shadow polygons | P0 | **FULL** | T-U04, T-U05, T-I01, T-I04, T-I05 | Codec tests bind immutable day payloads and full-season checksums; release tests bind generation/manifest/current-season semantics; PostgreSQL tests enforce lifecycle and immutability; storage lanes exercise the actual persisted representation. No story-owned table or fixture stores intermediate shadow polygons. |
| **AC2** - g2 golden vectors bind all normalized geometric, caster, engine, algorithm, dependency, canonicalization, sampling and decoder inputs; ordering-only changes are stable | P0 | **FULL** | T-U01, T-U02, T-U03, T-U08, T-I01, T-I02 | Literal SHA-256 vectors and independent leaf mutations cover every manifest/caster/venue field; normalization cases cover ring/object/caster/set order and negative zero; bounded admission/topology and TypeScript/PostGIS parity cover accepted geometry; SQL admission reproduces the same identity policy. |
| **AC3** - Display pins, hours, metadata, weather and planner length do not invalidate; geometry/data corrections do; g1 feedback attribution survives | P0 | **FULL** | T-U01, T-U08, T-I01 | T-U01 explicitly excludes all five display/weather/planner fields and binds geometric/caster fields. T-I01 exercises server-owned dirty/revision transitions for real input edits, verifies pointer publication does not roll back input revisions or weather, and stores/retains `legacy_g1_hash` evidence. T-U08 proves the g2 correction does not mutate g1 behavior. |
| **AC4** - Migration replay, constraints, complete checksum coverage, RLS/FORCE RLS/grants, indexes and decoder compatibility pass in isolation; actual relation/index storage meets Story 15.1 budgets | P0 | **FULL** | T-U04, T-U06, T-I01, T-I02, T-I03, T-I04, T-I05 | T-I01 covers clean/idempotent/interrupted replay, exact catalog fingerprint, constraints, indexes, roles and denied paths. Codec/parity/diagnostic suites cover complete payload and decoder behavior. Measurement and pinned retained-data revalidation provide actual relation/index census and retained-version budget evidence. |
| **AC5** - Staged revisions, publication rechecks, dirty detection, compatible pointer rollback without implicit input/weather rollback, and evidence retention | P0 | **FULL** | T-U05, T-I01, T-I05 | Unit release verification rejects stale/dirty/incomplete/incompatible evidence. Real PostgreSQL tests cover staged promotion, same-hash reconciliation, revision-writer barriers, transaction isolation, inventory/revision rechecks, compatible forward/rollback pointer changes, unchanged input/weather state, and retirement/delete protection for referenced evidence. Retained-data verification recomputes release chains. |
| **AC6** - Review migration and rollback evidence before any separately authorized production mutation | P0 | **PARTIAL** | T-I01, T-I05 (technical evidence only) | The migration/rollback evidence is extensively tested and recorded, and story history states that no production mutation occurred. **Uncovered:** no automated executable check proves that evidence review completed and separate authorization exists before a production mutation is attempted. This is a process-control gap rather than a schema-behavior gap. |

### Coverage Totals

| Priority | Total | Full | Partial | None | Full-only coverage | Any coverage |
|---|---:|---:|---:|---:|---:|---:|
| P0 | 6 | 5 | 1 | 0 | 83.3% | 100% |
| P1-P3 | 0 | 0 | 0 | 0 | 100% by convention | 100% by convention |
| **Total** | **6** | **5** | **1** | **0** | **83.3%** | **100%** |

### Coverage Logic Validation

- Every P0 criterion has test or evidence coverage; AC6 is not promoted to FULL because technical evidence cannot itself enforce human review and authorization order.
- AC2/AC4 duplication across unit and integration levels is necessary for cross-runtime canonicalization, topology and decoder parity.
- AC4/AC5 include denied, corrupt, stale, incomplete, concurrent and rollback paths; they are not happy-path-only.
- Authorization coverage includes direct grant denial and FORCE RLS denial for non-service principals.
- API and UI heuristics are inapplicable to this backend/schema story.

## Phase 1 Gap Analysis

**Execution mode:** sequential. Configuration requested `auto`; no further delegation was needed for this bounded story-only trace.

### Coverage gaps

- **Uncovered criteria:** 0.
- **Partially covered criteria:** 1 (`AC6`).
- **P0 criteria with no coverage:** 0.
- **Unit-only criteria:** 0.
- **Disabled or pending direct story tests:** 0.

AC6 has strong technical evidence for migration/rollback correctness, and the story records review history plus the absence of a production mutation. Its remaining clause is procedural: the discovered tests do not enforce that a production actor must present completed evidence review and a distinct authorization before executing a production mutation.

### Heuristic blind spots

- Endpoint gaps: 0; no endpoint is in scope.
- Auth negative-path gaps: 0; service and denied-role paths are covered in real PostgreSQL.
- Happy-path-only criteria: 0; corrupt, stale, incomplete, concurrent, denied and rollback paths are represented.
- UI journey/state gaps: 0; UI is outside the explicit story scope.

### Recommendations

1. Treat AC6 as an explicitly manual approval control with durable review evidence, or encode the production-operation precondition in the future operational tooling when Story 15.6 introduces that mutation path.
2. Preserve T-I01 and T-I05 as the technical evidence that the manual AC6 review consumes.
3. A separate `/bmad:tea:test-review` may assess test construction quality; it is outside this advisory trace.

Phase 1 machine matrix: `C:/Users/Rasmus/AppData/Local/Temp/tea-trace-coverage-matrix-15-2-2026-09-23T14-44-47+02-00.json`.

## Advisory Verdict: CONCERNS

Formal gate evaluation was intentionally skipped because this story trace is advisory (`allowGate: false`). No blocking gate, remediation task or status transition was opened.

The advisory verdict is **CONCERNS**: five of six P0 acceptance criteria are fully covered, while AC6 is partial. Overall full-only coverage is 83.3%, with no wholly uncovered criterion and no disabled direct story test.

### Specifically uncovered

- **No acceptance criterion is wholly uncovered.**
- **AC6 is partially uncovered:** T-I01 and T-I05 establish the migration/rollback evidence that must be reviewed, but no executable test or operational policy discovered in this story enforces that review completion and a separate authorization precede a production mutation.

The gap is advisory and procedural. It does not reduce the demonstrated schema, identity, migration, security, storage, publication or rollback test coverage in AC1-AC5. The appropriate control can remain documented manual approval evidence until the production mutation tooling is introduced in Story 15.6, where an executable precondition can be attached to the actual operation.

Machine-readable summary: `_bmad-output/test-artifacts/traceability/e2e-trace-summary-15-2-define-g2-generation-schema-and-migration-rollback-contract.json`.
