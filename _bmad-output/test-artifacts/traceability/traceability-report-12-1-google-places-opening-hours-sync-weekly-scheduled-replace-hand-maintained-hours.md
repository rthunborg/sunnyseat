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
---

# Traceability Report - Story 12.1: Google Places Opening-Hours Sync (Provider Pivot)

**Scope:** STORY-LEVEL - traces only Story 12.1 AC1-AC8, not the whole epic.
**Mode:** ADVISORY. Surfaces coverage gaps for review-time visibility. Does not block, remediate, update sprint status, or open a quality gate.
**Story status at trace time:** `review`.
**Coverage oracle:** formal acceptance criteria in `_bmad-output/implementation-artifacts/12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours.md`.

## Advisory Verdict: PASS

All eight Story 12.1 acceptance criteria have direct coverage from active deterministic tests and recorded protected/live evidence. No AC is left uncovered.

The latest story record also reports iteration-10 local gates green: typecheck, quiet lint, full Vitest (168 files / 1645 tests), disposable PostGIS replay plus executable SQL assertions, and protected live-schema postflight for the final migration. The latest canonical story-review wrapper log available in `validation/` is older (2026-07-14, 163 files / 1586 tests) and was superseded by later Dev Agent Record entries.

## Coverage Summary

| Metric | Value |
|---|---:|
| Total ACs | 8 |
| Fully covered | 8 |
| Partially covered | 0 |
| Uncovered | 0 |
| Overall AC coverage | 100% |
| P0 coverage | 100% |
| P1 coverage | 100% |

## Test Inventory

Primary story-specific active Vitest suites:

| Level | File | Tests |
|---|---|---:|
| Static / unit | `nextjs-app/test/unit/story-12-1-hours-policy-and-operations.atdd.test.ts` | 20 |
| Static / SQL contract | `nextjs-app/test/unit/story-12-1-hours-governance-migrations.atdd.test.ts` | 14 |
| Unit / service | `nextjs-app/test/unit/services/opening-hours-governance.atdd.test.ts` | 6 |
| Unit / service | `nextjs-app/test/unit/services/opening-hours-governance.coverage.test.ts` | 5 |
| Unit / service | `nextjs-app/test/unit/services/opening-hours-audit.atdd.test.ts` | 4 |
| Unit / service | `nextjs-app/test/unit/services/opening-hours-audit.coverage.test.ts` | 7 |
| API contract | `nextjs-app/test/unit/api/venue-detail-hours-unknown.atdd.test.ts` | 3 |
| Review regression | `nextjs-app/test/unit/story-12-1-review-fixes*.test.ts` | 67 |
| SQL executable | `nextjs-app/test/sql/story-12-1-hours-governance.assertions.sql` | n/a |

Focused source scan found no `.skip`, `.only`, `test.todo`, or `test.fixme` markers in the primary Story 12.1 suites or review-fix regression files.

## Traceability Matrix

### AC1 - Google-hours path is prohibited and regression-guarded

**Priority:** P1, with security/policy implications.
**Coverage:** FULL.

Covering tests and evidence:

- `story-12-1-hours-policy-and-operations.atdd.test.ts` - source scans prohibit `regularOpeningHours`, Google hours/content/credential paths, provider URLs/content, public cron/provider routes, and client/provider credential leakage while allowing server-side Place IDs.
- Same suite validates the shared no-live-provider fetch guard for Google/provider hosts, redirects, trailing-dot/legacy hosts, request body semantics, and authorization stripping.
- Same suite pins the story supersession boundary and controlling `E12-AD-01`, `E12-AD-12`, and `E12-AD-13` evidence.
- Review-fix suites harden redirect replay, clean-checkout scans, and runner allow-lists.
- Dev Agent Record reports no Google hours path, provider URL/content, provider credential, public trigger, or request-path provider call was added.

### AC2 - Place-ID-only, provider-neutral schema evolution

**Priority:** P0, data/security/schema integrity.
**Coverage:** FULL.

Covering tests and evidence:

- `story-12-1-hours-governance-migrations.atdd.test.ts` covers reconciliation order, nullable indexed non-unique `place_id`, removal of `places_api_url`, checked provider-neutral provenance/review fields, service-only run/outcome tables, RLS/revokes, least privilege, non-overlap, 180-day cleanup, public safe-column grants, terminal state coherence, leases, transactional remediation, and canonical weekly-hours SQL enforcement.
- `story-12-1-hours-governance.assertions.sql` exercises real SQL role denial, protected-column denial, service-role boundaries, transactional remediation behavior, retention, constraints, RLS, public projection, and live-drift convergence.
- Review-fix suites cover partial-table convergence, exact FK/index/catalog definitions, database-time ownership, service-role DML denial, generated Supabase function overloads, and empty affected-schema diff evidence.
- Dev Agent Record reports protected live applies through iteration 10, regenerated types, REST denial smoke, service-role-only batch execution, and 42/42 verified schedules after migration.

### AC3 - Existing live hours remediated before weekly automation

**Priority:** P0/P1, data integrity and compliance.
**Coverage:** FULL.

Covering tests and evidence:

- `opening-hours-governance.atdd.test.ts` and `.coverage.test.ts` cover remediation classification, whole-field unknown handling, atomic writes, idempotence, invalid source metadata preservation, duplicate Place ID distinction, and preservation of prior verified schedules.
- Review-fix suites cover exact remediation ownership, population binding, optimistic venue versions, canonical request fingerprints, stale replay rejection, same-run invalid retry reconciliation, missing venue/infrastructure aborts, manual-review conflict acceptance, and bounded fallback evidence.
- SQL assertions exercise protected batch remediation, per-venue outcomes, idempotent replay, schedule/provenance coherence, and no partial committed evidence on invalid batches.
- Dev Agent Record reports the protected one-time remediation retained 42/42 schedules as `venue_website`, persisted 42 current outcomes, and proved zero failed, unknown, Google-derived, or unprovenanced public schedules before weekly automation.

### AC4 - Canonical hours and adapters are lossless and provider-neutral

**Priority:** P1, shared domain contract.
**Coverage:** FULL.

Covering tests and evidence:

- `opening-hours-governance.atdd.test.ts` covers the adapter result union: `accepted`, `manual_review`, and `failed`; one interval, explicit closed days, past-midnight, whole-field unknown, malformed evidence, atomic/idempotent writes, invalid source metadata preservation, and duplicate Place IDs.
- `opening-hours-governance.coverage.test.ts` covers eligible provenance normalization, exact HH:MM boundaries, past-midnight ordering, canonical idempotence, accepted whole-field unknown writes, and remediation review states.
- Review-fix suites cover nested unsupported structures, unsupported array/24-hour schedules, seasonal/holiday/split routing, provenance-removal reasons, future evidence rejection, opaque references, valid state combinations, conflict states, prior-schedule preservation, and database/TypeScript contract parity.
- SQL assertions enforce canonical schedule shape and coherent source/review combinations at the database boundary.

### AC5 - Weekly direct GitHub Action produces inspectable outcomes

**Priority:** P1/P0 operational integrity.
**Coverage:** FULL.

Covering tests and evidence:

- `opening-hours-audit.atdd.test.ts` covers weekly audit classification, fail-closed emergency stop, non-overlap, per-venue failure isolation, no canonical-hours writes, repeated-run idempotence, and 180-day retention cutoff.
- `opening-hours-audit.coverage.test.ts` covers current/due/stale boundaries, indeterminate outcome isolation, run-level read failure handling, already-running bounded output, empty-population fail-closed behavior, and failure redaction.
- `story-12-1-hours-policy-and-operations.atdd.test.ts` validates the dedicated weekly/manual direct-script workflow, protected environment/main scoping, bounded summary output, emergency stop docs, and removal of obsolete OSM scheduling.
- Review-fix suites cover database-owned leases, terminal ordering, heartbeat renewal, summary publication failure, already-running summaries, post-finalization pruning warnings, keyset pagination, inspectable run links, pinned actions, no `npx` network fallback, and main-only production execution.
- Dev Agent Record reports protected workflow run `29494401050` succeeded and produced `hours-review-29494401050-1` with 42 current and zero missing/due/unknown/conflicting/split/failed/stale outcomes.

### AC6 - Public rendering stays provider-neutral and visually unchanged

**Priority:** P0 for public data leakage and honest rendering.
**Coverage:** FULL.

Covering tests and evidence:

- `venue-detail-hours-unknown.atdd.test.ts` covers real hours-less detail omission of `openingHours`, known-hours canonical shape preservation, and public JSON redaction of Place IDs, provenance, notes, and audit outcome fields.
- Existing opening-hours and venue-store suites continue covering canonical weekday shape, derived formatter behavior, closed/past-midnight semantics, and no fabricated display strings.
- SQL assertions cover public safe-column reads and protected Place ID/provenance denial.
- Dev Agent Record reports local visual comparisons against mobile `map-with-selected-venue`, mobile `venue-detail`, and desktop `venue-detail` with no app chrome/layout regression and no reference PNG or `REBASELINE-LOG.md` changes. Later iterations were database/audit-only and did not change frontend surfaces.

### AC7 - Authoring and operations docs describe the real workflow

**Priority:** P1 operational correctness.
**Coverage:** FULL.

Covering tests and evidence:

- `story-12-1-hours-policy-and-operations.atdd.test.ts` validates that authoring docs remove provider URL examples, explain provider-neutral evidence, unknown-vs-closed semantics, unsupported schedule handling, direct audit operation, emergency stop, safe placeholders, and the scheduled-job environment contract.
- Review-fix suites cover stable venue upsert documentation, valid state combinations, guarded RPC usage, `E12-AD-12` inclusion, removal of obsolete OSM scheduling, and main-only production execution.
- Docs under test include `nextjs-app/docs/venue-data-load.md`, `nextjs-app/docs/github-actions-scheduled-jobs.md`, `nextjs-app/docs/environment-variables.md`, and `nextjs-app/docs/story-12-1-provider-pivot-contract.md`.

### AC8 - Deterministic evidence proves policy, integrity, security, and no visual regression

**Priority:** P0/P1 cross-cutting story gate.
**Coverage:** FULL.

Covering tests and evidence:

- AC1-AC7 suites collectively cover policy, adapter outcomes, migration integrity, role denial, old-row replay, no live provider calls, no Google-hours/content paths, audit isolation, non-overlap, retention, canonical public DTO behavior, docs, and visual no-change evidence.
- `story-12-1-hours-governance.assertions.sql` plus disposable PostGIS replay provide executable SQL/security evidence beyond static scans.
- Dev Agent Record reports full typecheck/lint/Vitest gates through iteration 10, protected live schema/RLS/REST denial evidence, one-time remediation evidence, protected Action evidence, and visual comparison evidence.
- Known environmental deviations are documented: some protected/live evidence replaced separate preview evidence, and later Docker availability varied, but the final record includes fresh disposable Compose replay for iteration 10 plus protected live verification.

## Coverage Heuristics

- **Endpoint/DTO coverage:** covered for public detail DTO leakage and whole-field unknown. No public cron/provider route is allowed; static tests assert absence.
- **Auth/authz coverage:** covered by SQL role-denial assertions, protected-column denial, REST denial smoke, service-role-only RPC boundaries, and workflow protected-environment checks.
- **Error/edge coverage:** strong coverage for malformed schedules, invalid provenance, source conflicts, split/24-7/seasonal/holiday unsupported schedules, stale replay, response loss, missing venues, infrastructure exceptions, failed persistence, overlap, disabled audit, empty population, clock validation, and retention failures.
- **UI/visual coverage:** no new UI surface; public rendering/no-leak DTO tests plus recorded no-change visual comparisons cover the story's visual requirement.

## Uncovered ACs

**None.**

## Advisory Notes

1. The latest `validation/` story-review log predates iteration 10. The story file records later full Vitest, SQL replay, and live-schema evidence, so this trace treats the Dev Agent Record as the freshest evidence source.
2. Visual validation was not rerun after the later database-only iterations. This is acceptable for AC6 because the later changes were migration/audit/remediation hardening, and the earlier no-change comparisons are recorded.
3. The accepted PostGIS/`spatial_ref_sys` advisory is explicitly outside Story 12.1 and does not affect AC coverage.

## Recommendations

- None blocking. Keep the final Story 12.1 live/protected evidence links visible during human review because several ACs depend on protected database and GitHub Action evidence that ordinary CI cannot reproduce.

## Gate Decision (advisory only)

**GATE DECISION: PASS** (advisory - not opened or enforced by this pass)

Coverage analysis:

- P0 coverage: 100% - MET
- P1 coverage: 100% - MET
- Overall coverage: 100% - MET

Rationale: all eight Story 12.1 ACs have direct active test coverage and recorded protected/live evidence. No uncovered ACs remain.
