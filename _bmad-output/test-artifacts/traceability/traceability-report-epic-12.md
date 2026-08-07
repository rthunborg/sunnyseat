---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-08-07'
workflowType: 'testarch-trace'
gateType: 'epic'
decisionMode: 'deterministic'
gateIteration: 2
gateIterationCapReached: true
remediationCommit: 'ee1e646'
remediationEvidenceStatus: 'new_ac_to_test_evidence_consumed_but_no_verified_change_to_protected_live_blocking_lanes'
inputDocuments:
  - 'project-context.md'
  - '_bmad-output/auto-bmad/state/epic/epic-12.yaml'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/auto-bmad/retro-notes/epic-12.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-12.md'
  - '_bmad-output/implementation-artifacts/12-1..12-14-*.md'
  - '_bmad-output/test-artifacts/traceability/traceability-report-12-*.md'
generatedArtifacts:
  - '_bmad-output/test-artifacts/traceability/tea-trace-coverage-matrix-epic-12-2026-08-07T18-14-43+02-00.json'
  - '_bmad-output/test-artifacts/traceability/e2e-trace-summary-epic-12.json'
  - '_bmad-output/test-artifacts/traceability/gate-decision-epic-12.json'
---

# Traceability Matrix & Gate Decision - Epic 12

**Epic:** Real-Venue Launch Readiness - Performance, Trust, Hours, Console Hygiene

**Date:** 2026-08-07

**Evaluator:** TEA Agent

**Gate Type:** epic

**Decision Mode:** deterministic

**Gate Iteration:** 2

**Remediation Commit Input:** `ee1e646`

**Gate Iteration Cap:** reached

**Story status at trace time:** 14 stories traced. Story 12.1 is `done`; 12.4, 12.5, 12.8, 12.10, and 12.11 are `done`; 12.2, 12.3, 12.6, 12.7, 12.9, 12.12, 12.13, and 12.14 are at `review`.

Note: This workflow does not generate tests. This gate-iteration pass did not rerun implementation test suites; it consumed the current story-recorded verification evidence, deferred-work notes, retro notes, per-story trace artifacts, Epic 12 test design, and epic state. The gate fails on missing protected/live evidence independent of a local rerun.

## Gate Iteration 2 Evidence Refresh

The supplied remediation commit `ee1e646` is recorded as an input label for this re-gate. Per delegate constraints, git inspection was not used. The current BMAD evidence set still carries the same six PARTIAL rows from the previous trace, including four P0 protected/live launch evidence lanes.

Current Story 12.3/12.7/12.11/12.12 AC-to-test evidence was consumed. It strengthens local deterministic coverage and is reflected in the FULL local implementation rows, but no row was upgraded from PARTIAL to FULL because the current artifacts do not provide verified remediation evidence for the protected production p95 run, protected environment audit, live visibility migration verification, protected Storage policy verification, concurrent visibility race, or broad-suite future-date wait stability.

The Story 12.11 remediation evidence is explicitly scoped: the corrected serialized mobile repeat for the future-date exact-response check passed 3/3, while the prior parallel repeat was 2/3. This trace therefore does not claim broad-concurrency pass evidence.

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

Epic 12 has broad implementation-level coverage across all 14 stories, but the public-launch gate is not satisfied because several required evidence lanes remain partial. The table below uses material epic gate rows: one row can represent a grouped story contract or a required operational evidence lane. It intentionally does not claim every atomic UAT item as a separate row.

| Priority | Material Rows | FULL | PARTIAL | UNCOVERED | FULL % | Status |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| P0 | 9 | 5 | 4 | 0 | 55.56% | FAIL |
| P1 | 11 | 9 | 2 | 0 | 81.82% | CONCERNS |
| P2 | 1 | 1 | 0 | 0 | 100% | PASS |
| Total | 21 | 15 | 6 | 0 | 71.43% | FAIL |

Deterministic gate rule: P0 coverage must be 100%. Epic 12 is therefore **FAIL**.

### Story Coverage Matrix

| Story | Status | Trace / Evidence Status | Gate Note |
| --- | --- | --- | --- |
| 12.1 | done | FULL | Provider-neutral hours governance, scheduled audit, provenance, and no-Google-hours policy are traced as PASS. |
| 12.2 | review | FULL | Feedback evidence, public verdict parity, invalid contradiction rejection, aggregation, and coverage-cap removal are traced as 8/8 FULL. |
| 12.3 | review | PARTIAL | Deterministic persisted-geometry coverage is strong, but protected production p95 and protected environment evidence are missing. |
| 12.4 | done | FULL | Console/pageerror hygiene for hydration and MapLibre null-reference warnings is recorded as gate-checked. |
| 12.5 | done | FULL | Dev editor production deny, validation, hidden-toggle behavior, and public route impact are traced as 8/8 FULL. |
| 12.6 | review | FULL | Public sunny/pin semantics, grey cloud no-number behavior, accessibility, and visual evidence are traced as 13/13 FULL. |
| 12.7 | review | PARTIAL | Deterministic resolver tests cover most behavior, but visibility migration execution/live schema evidence and concurrent visibility race evidence remain partial. |
| 12.8 | done | FULL | About legend, accuracy-truth copy, policy/data-source copy, accessibility, and visual evidence are recorded as complete. |
| 12.9 | review | FULL | Row-quantized sheet, slim slider, touch/keyboard, accessibility, and visual evidence are recorded as complete. |
| 12.10 | done | FULL | Bounded detail prefetch, exact key, no scrub/date restart, hidden guard, and loading replacement are traced as 10/10 FULL. |
| 12.11 | done | PARTIAL | Coach-guide contract is covered and visually accepted; the map-primary future-date exact-response wait has serialized 3/3 evidence, but parallel evidence was 2/3 and no broad-concurrency pass is claimed. |
| 12.12 | review | PARTIAL | Media DTO/render/fallback coverage is strong; protected Supabase Storage policy verification is missing. |
| 12.13 | review | FULL | Public confidence removal and internal confidence retention are recorded as complete. |
| 12.14 | review | FULL | Selected-time open/closed filtering, exact closed search, retained closed favourite, unknown-hours policy, and request-count checks are recorded as passed. |

### Material Gaps

#### Critical / P0

1. **12.3 protected production cold-p95 evidence is missing.** Classification: protected-live-performance-evidence.
   - Requirements affected: 12.3 AC2, 12.3 AC6, Epic 12 R-001.
   - Required evidence: protected-production `/api/venues` central-viewport cold request over the 42+ venue dataset with p95 <= approximately 5s, route/date/hash/run metadata, cold/warm/edge classification, logs proving persisted geometry reads, and zero request-path provider or shadow recompute.
   - Current state: story trace marks this lane partial; epic deferred work repeats the same requirement.

2. **12.7 visibility migration execution/live schema proof is missing.** Classification: live-database-migration-evidence.
   - Requirements affected: 12.7 OPS-1, Epic 12 R-003, Epic 12 R-010.
   - Required evidence: apply `20260718214954_add_public_venue_visibility.sql`, verify `venues.hidden boolean not null default false`, prove no 42703 on resolver/precompute projections, smoke live visible/hidden id/slug behavior, regenerate Supabase types, and verify no contract diff.
   - Current state: source SQL and local types are asserted, but no migrated database or post-migration live query is verified.

3. **12.12 protected Supabase Storage policy verification is missing.** Classification: protected-live-storage-policy-evidence.
   - Requirements affected: 12.12 AC1, 12.12 AC2, Epic 12 R-015, Epic 12 R-010.
   - Required evidence: apply `20260719000000_venue_media_storage.sql`, verify protected `venue-media` public reads, service-role upload, anon/auth write denial, bucket constraints, and public rendition reads before hosted media is used.
   - Current state: local SQL/text tests cover policy intent, but protected Supabase preview verification was not run.

#### High / P0

4. **12.3 protected GitHub Production environment and live Supabase advisor evidence are missing.** Classification: protected-live-environment-security-evidence.
   - Requirements affected: 12.3 AC2, Epic 12 R-002.
   - Required evidence: protected Production secrets/variables for geometry precompute and weather refresh, protected environment behavior, and live service-only Supabase evidence.
   - Current state: not collected due protected access requirements.

#### Medium / P1

5. **12.7 concurrent visibility/cache race evidence is partial.** Classification: concurrent-live-behavior-evidence.
   - Requirement affected: 12.7 INV-1.
   - Current state: sequential absent/public/hidden/public transitions are covered; concurrent in-flight visibility changes are not directly exercised.

6. **12.11 map-primary future-date exact-response wait is unstable under full-suite concurrency.** Classification: broad-suite-e2e-stability-evidence.
   - Requirement affected: Story 12.11 deferred work / Epic 12 request-count reliability lane.
   - Current state: the corrected serialized mobile repeat passed 3/3, but the prior parallel repeat was 2/3 and no broad-concurrency pass is claimed.

### Uncovered Requirements / ACs

No story acceptance criterion is classified as totally uncovered in the local implementation record. The failing items are **partial required evidence lanes**. For the Epic 12 gate, a partial P0 launch evidence lane is treated as not FULL and therefore blocks PASS.

The specific ACs left partial are:

- 12.3 AC2 / AC6: protected-production p95 and no request-path recompute evidence.
- 12.3 AC2: protected GitHub Production environment / live protected Supabase evidence.
- 12.7 OPS-1: visibility migration applied and verified against a migrated database/live route matrix.
- 12.12 AC1 / AC2: protected Supabase Storage public-read and write-denial policy behavior.
- 12.7 INV-1: concurrent visibility/cache behavior.
- Story 12.11 deferred test-stability item: future-date exact-response wait has serialized 3/3 evidence but remains partial for broad-concurrency stability.

## PHASE 2: QUALITY GATE DECISION

**Gate Type:** epic

**Decision Mode:** deterministic

### Decision Criteria

| Criterion | Threshold | Actual | Status |
| --- | --- | --- | --- |
| Collection status | COLLECTED | COLLECTED | PASS |
| P0 coverage | 100% | 5/9 material rows FULL = 55.56% | FAIL |
| Overall coverage | >=80% | 15/21 material rows FULL = 71.43% | FAIL |
| P1 coverage | >=90% for PASS | 9/11 material rows FULL = 81.82% | CONCERNS |
| Security/policy evidence | no open P0 security/policy lane | 12.3 and 12.12 protected evidence partial | FAIL |
| Critical NFR evidence | no open critical NFR lane | 12.3 protected p95 partial | FAIL |

### GATE DECISION: FAIL

Deterministic rule outcome: P0 coverage is below 100%, so the gate is **FAIL**.

Rationale: Epic 12 implementation coverage is broad and most deterministic story suites are recorded green, including the newly consumed AC-to-test evidence for Stories 12.3, 12.7, 12.11, and 12.12. The gate still fails because iteration 2 has no verified remediation evidence for the protected/live lanes. Local tests and source assertions cannot substitute for protected production p95/security evidence, live migration execution proof, or protected Supabase Storage policy verification.

### Required Regate Inputs

1. Collect Story 12.3 protected production p95 evidence for the 42+ venue dataset, including logs proving persisted geometry reads and zero request-path provider/shadow recompute.
2. Verify Story 12.3 protected GitHub Production environment variables/secrets and live protected Supabase/service-only posture.
3. Apply and verify Story 12.7 visibility migration, regenerate Supabase types, verify no contract diff, and smoke live visible/hidden id/slug route behavior.
4. Apply and verify Story 12.12 Storage migration/policy with service-role upload, public reads, and anon/auth write denial.
5. Add or collect Story 12.7 concurrent visibility/cache evidence, or narrow the claim.
6. Collect broad-concurrency stable evidence for the Story 12.11 future-date exact-response wait, or keep the claim scoped to serialized execution.

## Related Artifacts

- Coverage matrix: `_bmad-output/test-artifacts/traceability/tea-trace-coverage-matrix-epic-12-2026-08-07T18-14-43+02-00.json`
- E2E trace summary: `_bmad-output/test-artifacts/traceability/e2e-trace-summary-epic-12.json`
- Gate decision JSON: `_bmad-output/test-artifacts/traceability/gate-decision-epic-12.json`
- Epic state: `_bmad-output/auto-bmad/state/epic/epic-12.yaml`
- Test design: `_bmad-output/test-artifacts/test-design/test-design-epic-12.md`

## Sign-Off

**Phase 1 - Traceability Assessment:** COLLECTED. All Epic 12 stories are mapped; six material rows remain partial, including four P0 protected/live launch evidence lanes.

**Phase 2 - Gate Decision:** FAIL. P0 coverage is not 100% after gate iteration 2.

**Overall Status:** FAIL - Epic 12 is not ready for public-launch gate approval until the protected production, migration, and storage-policy evidence lanes are completed and re-gated.

<!-- Powered by BMAD-CORE -->
