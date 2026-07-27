---
stepsCompleted:
  - step-01-load-context
  - step-02-discover-tests
  - step-03-map-criteria
  - step-04-analyze-gaps
  - step-05-gate-decision
lastStep: step-05-gate-decision
lastSaved: '2026-07-27T19:16:00+02:00'
workflowType: testarch-trace
scope: story-only
story: 12-5-dev-only-venue-editor-drag-pin-paste-polygon-persisted-hide-show-inline-fields
advisory: true
coverageBasis: acceptance_criteria
oracleResolutionMode: formal_requirements
oracleConfidence: high
oracleSources:
  - _bmad-output/implementation-artifacts/12-5-dev-only-venue-editor-drag-pin-paste-polygon-persisted-hide-show-inline-fields.md
  - _bmad-output/test-artifacts/atdd-checklist-12-5-dev-only-venue-editor-drag-pin-paste-polygon-persisted-hide-show-inline-fields.md
  - _bmad-output/test-artifacts/automation-summary.md
  - project-context.md
externalPointerStatus: not_used
tempCoverageMatrixPath: '_bmad-output/test-artifacts/traceability/tea-trace-coverage-matrix-12-5-2026-07-27T19-16-00+02-00.json'
---

# Traceability Report - Story 12.5: Dev-Only Venue Editor

**Scope:** STORY-LEVEL - Story 12.5 acceptance criteria AC1-AC8 only.
**Mode:** ADVISORY. This trace reports coverage and evidence gaps without blocking, remediating, changing sprint status, or opening a gate.
**Story status at trace time:** `review`.

## Coverage Oracle

The primary oracle is the formal Story 12.5 acceptance criteria. Confidence is high because the story file contains explicit ACs, tasks, implementation notes, review-fix evidence, and completed test execution records. The ATDD checklist and automation summary were used only as supporting evidence; no whole-epic requirement inventory was traced.

No external requirements pointer was needed.

## Test Inventory

### Primary Story 12.5 Suites

| Level | File | Mapped cases |
|---|---|---:|
| API | `nextjs-app/test/unit/api/story-12-5-dev-venue-editor-guard.atdd.test.ts` | 4 |
| API | `nextjs-app/test/unit/api/story-12-5-public-display-and-hidden.automation.test.ts` | 3 |
| Unit | `nextjs-app/test/unit/services/story-12-5-dev-venue-editor-validation.atdd.test.ts` | 5 |
| Unit | `nextjs-app/test/unit/services/story-12-5-dev-venue-editor-store.automation.test.ts` | 5 |
| Unit | `nextjs-app/test/unit/services/story-12-5-display-coordinate-consumers.automation.test.ts` | 3 |
| Unit | `nextjs-app/test/unit/services/story-12-5-inline-fields-public-contract.automation.test.ts` | 2 |
| Unit / static contract | `nextjs-app/test/unit/services/story-12-5-schema-contract.automation.test.ts` | 4 |
| Unit / query hook | `nextjs-app/test/unit/queries/useDevVenueEditor.automation.test.tsx` | 1 |
| Component | `nextjs-app/test/components/DevVenueEditor.test.tsx` | 4 |
| E2E | `nextjs-app/test/e2e/story-12-5-dev-venue-editor.spec.ts` | 2 |

### Supporting Regression Evidence

- `nextjs-app/test/unit/services/venue-store.test.ts` covers display coordinate projection, hidden list filtering, incomplete display pair rejection, and public DTO field stripping.
- `nextjs-app/test/unit/api/venues-route-caching.atdd.test.ts`, `venues-route.test.ts`, and `venues-route-real-engine.test.ts` cover the retained public `s-maxage=30` / `must-revalidate` cache headers.
- `nextjs-app/test/unit/services/sun-geometry-coordinates.automate.test.ts` covers the shared seating-centroid engine coordinate helper inherited from Story 12.3.
- `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts` proves detail prefetch uses the mounted detail query-options builder, so Story 12.5 hidden-detail route behavior applies to prefetch reads.

No `skip`, `fixme`, `todo`, or `only` markers were found in the primary Story 12.5 suites inspected for this trace.

## Traceability Matrix

| AC | Priority | Coverage | Primary mapped tests | Notes |
|---|---|---|---|---|
| AC1 - Dev/localhost-only and fail-closed | P0 | FULL | `story-12-5-dev-venue-editor-guard.atdd.test.ts:52`, `:62`, `:75`; `DevVenueEditor.test.tsx:75`; `story-12-5-dev-venue-editor.spec.ts:33` | Covers production deny before service/body, missing flag, non-loopback/forwarded ambiguity, spoofed host, gate-off UI, and no dev API request. |
| AC2 - Drag save persists display-only coordinates | P0 | FULL | `story-12-5-schema-contract.automation.test.ts:25`; `story-12-5-dev-venue-editor-validation.atdd.test.ts:10`; `story-12-5-public-display-and-hidden.automation.test.ts:151`; `story-12-5-display-coordinate-consumers.automation.test.ts:30`, `:46`, `:62`; `venue-store.test.ts:274`; `DevVenueEditor.test.tsx:81`; `story-12-5-dev-venue-editor.spec.ts:50` | Covers schema bounds/pairing, save payload, radius/distance, pins, route summaries, native maps URLs, and public DTO separation from engine coordinates. |
| AC3 - Pasted polygon is validated server-side | P0 | FULL | `story-12-5-dev-venue-editor-validation.atdd.test.ts:32`; `story-12-5-dev-venue-editor-store.automation.test.ts:113`, `:128`; `story-12-5-schema-contract.automation.test.ts:33`; `DevVenueEditor.test.tsx:178` | Covers accepted GeoJSON/Feature/raw ring, invalid/no-write behavior, Gothenburg/bounds validation, dirty geometry RPC seam, and non-destructive UI validation. |
| AC4 - Hide/show is persisted and public-wide | P0 | FULL | `venue-store.test.ts:226`; `story-12-5-public-display-and-hidden.automation.test.ts:173`, `:201`; `story-12-5-dev-venue-editor-guard.atdd.test.ts:116`; `DevVenueEditor.test.tsx:121`; `story-12-10-venue-detail-prefetch.atdd.test.ts:35` | Covers list filtering, hidden-blind detail/reviews/feedback, editor hide write, include-hidden editor read, and inherited detail-prefetch use of the same public detail path. |
| AC5 - Cache behavior is explicit | P1 | FULL | `venues-route-caching.atdd.test.ts:53`, `:109`; `venues-route.test.ts:415`; `useDevVenueEditor.automation.test.tsx:13`; `story-12-5-schema-contract.automation.test.ts:40`, `:49` | Covers retained public cache headers, editor `no-store`/local invalidation, central query keys, and docs for the 30-second cross-browser bound. |
| AC6 - Editor can read hidden venues | P0 | FULL | `story-12-5-dev-venue-editor-guard.atdd.test.ts:116`; `story-12-5-public-display-and-hidden.automation.test.ts:173`, `:201` | Covers guarded editor list including hidden rows, guarded hide/show write, and public handlers remaining hidden-blind. |
| AC7 - Inline field edits use the same guarded route | P0 | FULL | `story-12-5-dev-venue-editor-validation.atdd.test.ts:10`, `:201`, `:243`; `story-12-5-inline-fields-public-contract.automation.test.ts:7`, `:27`; `story-12-5-dev-venue-editor-store.automation.test.ts:153`, `:183`, `:243`; `DevVenueEditor.test.tsx:121` | Covers tags, description, thumbnail shape, Supabase media URL/object checks, read-only legacy `url`, legacy fallback preservation, and public DTO non-leakage. |
| AC8 - Maintainer docs are updated | P1 | FULL | `story-12-5-schema-contract.automation.test.ts:49`; `nextjs-app/docs/venue-data-load.md:241` | Static test and source inspection cover editor enablement, production deny, display coordinates, dirty geometry workflow, polygon/media contracts, hidden behavior, and cache expectations. |

## Coverage Totals

| Priority | Total ACs | Full | Partial | Uncovered | Full coverage |
|---|---:|---:|---:|---:|---:|
| P0 | 6 | 6 | 0 | 0 | 100% |
| P1 | 2 | 2 | 0 | 0 | 100% |
| P2 | 0 | 0 | 0 | 0 | 100% |
| P3 | 0 | 0 | 0 | 0 | 100% |
| **Total** | **8** | **8** | **0** | **0** | **100%** |

## Gap Analysis

- **Uncovered acceptance criteria:** none.
- **Partial acceptance criteria:** none.
- **Endpoint gaps:** none found. Guarded dev list/detail/patch paths, public list/detail, reviews, feedback, and cache routes have direct or inherited route tests.
- **Auth/authz negative-path gaps:** none found. Production deny, missing flag, remote host/origin, forwarded ambiguity, spoofed host, and public hidden-blind paths are covered.
- **Happy-path-only criteria:** none found. AC1, AC3, AC4, AC5, and AC7 all include denial/validation/error-path evidence.
- **UI journey/state gaps:** none found. Gate-off, editor save, inline validation alert, and Story 12.5 browser regression are covered.

## Advisory Verdict: PASS

Formal gate evaluation was intentionally skipped because this Story 12.5 trace is advisory (`allow_gate=false`). No `gate-decision.json` or blocking signal was emitted.

All eight Story 12.5 acceptance criteria have mapped active automated coverage, and no AC is left uncovered. The strongest evidence is concentrated in the security/data-integrity paths: production-impossible editor guard, loopback/forwarded fail-closed behavior, service-role route isolation, display-only coordinate persistence, hidden public-route matrix, server-side polygon/media validation, and editor query invalidation.

### Execution Evidence Reviewed

- Story-recorded baseline/final `npx tsc --noEmit` and `npx eslint . --quiet` passed.
- Story-recorded focused Story 12.5 Vitest passed: 9 files / 38 tests.
- Story-recorded focused Story 12.5 Playwright passed: 4/4 across desktop and mobile.
- Story-recorded a11y projects passed: 17 passed / 10 skipped after the pin contrast correction.
- Story-recorded manual visual validation was explicitly approved and saved for gate-off `map-primary` and `venue-detail`.
- Story-recorded Tier-A full `npx vitest run` passed on rerun: 206 files passed, 2 skipped; 1868 tests passed, 15 skipped.

## Files Written

- `_bmad-output/test-artifacts/traceability/traceability-report-12-5-dev-only-venue-editor-drag-pin-paste-polygon-persisted-hide-show-inline-fields.md`
- `_bmad-output/test-artifacts/traceability/tea-trace-coverage-matrix-12-5-2026-07-27T19-16-00+02-00.json`
- `_bmad-output/test-artifacts/traceability/e2e-trace-summary-12-5-dev-only-venue-editor-drag-pin-paste-polygon-persisted-hide-show-inline-fields.json`

No implementation, story status, sprint-status, visual reference, or auto-bmad state file was changed by this advisory trace.
