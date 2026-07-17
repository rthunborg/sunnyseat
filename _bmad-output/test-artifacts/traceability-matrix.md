---
stepsCompleted:
  - step-01-load-context
  - step-02-discover-tests
  - step-03-map-criteria
  - step-04-analyze-gaps
  - step-05-gate-decision
lastStep: step-05-gate-decision
lastSaved: '2026-07-17'
scope: story-only
story: 12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours
advisory: true
coverageBasis: acceptance_criteria
oracleResolutionMode: formal_requirements
oracleConfidence: high
externalPointerStatus: not_used
traceReportPath: _bmad-output/test-artifacts/traceability/traceability-report-12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours.md
---

# Traceability Matrix - Story 12.1

This is the BMAD trace workflow output file for the Story 12.1 advisory pass.

Full report: `_bmad-output/test-artifacts/traceability/traceability-report-12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours.md`

## Advisory Verdict

PASS - all eight Story 12.1 acceptance criteria are fully covered. No AC is left uncovered.

## Matrix

| AC | Priority | Coverage | Primary covering evidence |
|---|---|---|---|
| AC1 Google-hours path prohibited | P1 | FULL | `story-12-1-hours-policy-and-operations.atdd.test.ts`; shared fetch guard; review-fix redirect/source scans |
| AC2 provider-neutral schema | P0 | FULL | `story-12-1-hours-governance-migrations.atdd.test.ts`; executable SQL assertions; protected live migration/type/RLS evidence |
| AC3 live hours remediation | P0/P1 | FULL | governance ATDD/coverage suites; remediation review-fix suites; SQL assertions; 42/42 protected remediation evidence |
| AC4 lossless provider-neutral adapters | P1 | FULL | `opening-hours-governance.*.test.ts`; review-fix unsupported/conflict/stale replay coverage; SQL shape constraints |
| AC5 weekly direct audit | P1/P0 | FULL | `opening-hours-audit.*.test.ts`; workflow/docs static tests; protected Action run `29494401050` |
| AC6 public rendering unchanged and redacted | P0 | FULL | `venue-detail-hours-unknown.atdd.test.ts`; public safe-column SQL; recorded visual no-change comparisons |
| AC7 real authoring/ops docs | P1 | FULL | policy/operations docs tests; review-fix documentation contract tests |
| AC8 deterministic evidence | P0/P1 | FULL | Combined AC1-AC7 suites, SQL replay/assertions, no-live-provider guard, full gates, live/protected evidence |

## Uncovered ACs

None.
