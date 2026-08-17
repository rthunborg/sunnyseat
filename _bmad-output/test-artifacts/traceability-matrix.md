---
stepsCompleted:
  - step-01-load-context
  - step-02-discover-tests
  - step-03-map-criteria
  - step-04-analyze-gaps
  - step-05-gate-decision
lastStep: step-05-gate-decision
lastSaved: '2026-07-26'
refreshedAt: '2026-07-26T21:01:02+02:00'
advisoryVerdict: PASS
workflowType: testarch-trace
scope: story-only
story: 12-10-venue-detail-preload-instant-mer-info
advisory: true
allowGate: false
coverageBasis: acceptance_criteria
oracleResolutionMode: formal_requirements
oracleConfidence: high
oracleSources:
  - _bmad-output/implementation-artifacts/12-10-venue-detail-preload-instant-mer-info.md
  - _bmad-output/test-artifacts/atdd-checklist-12-10-venue-detail-preload-instant-mer-info.md
  - _bmad-output/qa/epic-12-test-design-2026-07-12.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - project-context.md
externalPointerStatus: not_used
traceReportPath: _bmad-output/test-artifacts/traceability/traceability-report-12-10-venue-detail-preload-instant-mer-info.md
traceSummaryPath: _bmad-output/test-artifacts/traceability/e2e-trace-summary-12-10-venue-detail-preload-instant-mer-info.json
tempCoverageMatrixPath: 'C:/Users/Rasmus/sunnyseat/_bmad-output/test-artifacts/traceability/tea-trace-coverage-matrix-12-10-2026-07-26T21-01-02+02-00.json'
---

# Traceability Matrix - Story 12.10

This is the BMAD trace workflow progress file for the Story 12.10 advisory pass.

## Coverage Oracle

The formal Story 12.10 acceptance criteria are the primary oracle. They are augmented by the mandatory superseded-text controls, Epic 12 architecture decision `E12-AD-09`, the UX `VenueDetailPreload` section, and Epic 12 QA risks R-016, R-005, R-003, and R-018. Confidence is high because these sources agree on the same implementation contract: initial-settle-only prefetch, already-returned candidates only, max six candidates, concurrency two, exact mounted detail keys, cancellation/backoff, no scrub/date restart, Story 12.7 public resolver convergence, and a stable cache-miss shell.

No external requirements pointer was needed. This is advisory and story-only; no enforced release gate or `gate-decision.json` is emitted from this trace.

## Test Inventory

### Primary Story 12.10 Evidence

| Level | File | Active cases |
|---|---|---:|
| Unit / scheduler and query contract | `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts` | 10 |
| API / detail route resolver | `nextjs-app/test/unit/api/story-12-10-detail-public-resolver.atdd.test.ts` | 3 |
| Component / cache-miss shell | `nextjs-app/test/components/story-12-10-venue-detail-cache-miss-shell.atdd.test.tsx` | 2 |
| E2E / request-count and timing | `nextjs-app/test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts` | 4 scenario identities, 8 browser executions |
| **Total** | **4 files** | **19 direct test identities plus 8 browser executions** |

No active `test.skip`, `test.todo`, `test.fixme`, `test.only`, `describe.skip`, or `describe.only` markers were found in the direct Story 12.10 suites. No hard waits were found in the direct traced files.

### Supporting Regression Evidence

- `nextjs-app/test/components/MapView.test.tsx:1242`, `:1265`, and `:1286` cover the post-review fixes for map-pin cancellation, QuickInfo-dismiss cancellation, and visible-distance-order handoff into prefetch.
- Story 12.7 resolver suites cover the full hidden/unknown/unsafe/collision public-identity matrix that Story 12.10 consumes through `/api/venues/[slug]`.
- Epic 11 / Story 12.3 request-count E2E suites remain supporting standing evidence for same-date scrub and date-change request-count behavior.
- Security review recorded PASS with 0 findings; primary adversarial review found 2 High and 1 Medium, all fixed and post-fix verified PASS.

## Coverage Heuristics

- **Endpoint coverage:** `/api/venues/[slug]` has direct API-route tests for shared resolver adoption, id/slug behavior, malformed input, and generic public 404/400 bodies.
- **Auth/authz:** not applicable to Story 12.10. The public detail route is anonymous, and the story adds no authenticated role path or editor/admin operation.
- **Error/edge coverage:** 429/backoff/cooldown, malformed slug, unknown route miss, direct deep-link no speculative prefetch, fresh-cache skip, exact-key cancellation, and no console-error prefetch path are covered.
- **UI journey coverage:** desktop and mobile E2E cover bounded prefetch, no scrub/date restart, direct deep link, warmed Mer info open, and cold cache-miss shell.
- **UI state coverage:** component and E2E tests cover `aria-busy`, one visible polite status, Swedish loading copy, stable skeletons, route chrome, warmed loaded content, and unwarmed busy shell.
- **Live/provider coverage:** local deterministic fixtures forbid live Met.no. Protected preview/live timing is release-lane evidence and is not a local coverage defect.

## Requirement-to-Test Matrix

| ID | Oracle item | Priority | Coverage | Test levels | Stable evidence IDs | Heuristic result |
|---|---|---:|---|---|---|---|
| AC1 | Initial-settle-only candidate prefetch uses already-settled visible list/favourite rows, max six unique candidates, concurrency two, visible order, and no extra discovery request | P0 | FULL | Unit, E2E, component support | T-U03, T-U10, T-E01, S-C03 | Budget, order, favourites-first/fallback, concurrency, and no extra list request covered |
| AC2 | Prefetch and mounted `useVenueDetail` share the exact `queryKeys.venues.detailAt(slug, { date, time, lat, lng })` contract with date/time normalization and 4-decimal buckets | P0 | FULL | Unit, E2E | T-U01, T-U02, T-E01 | Endpoint URL and query key are tested; no slug-only/ad-hoc key evidence found |
| AC3 | Epic 11 request-count invariants are preserved: same-date scrub starts zero venue/detail requests and planner-date change does not restart detail prefetch | P0 | FULL | Unit, E2E, supporting E2E | T-U07, T-E02, S-E01 | Direct Story 12.10 request counting includes detail requests; standing Epic 11 evidence remains supporting |
| AC4 | Prefetch yields/cancels on interaction, consumes exact AbortSignal-backed detail queries, preserves the opened in-flight key, and backs off silently on failures | P0 | FULL | Unit, component support | T-U03, T-U04, T-U06, T-U08, S-C01, S-C02 | Cancellation, opened-key preservation, exact query cancellation, 429 cooldown, and silent error path covered |
| AC5 | `/api/venues/[slug]` converges on Story 12.7 public resolver and hidden/unknown/unsafe/ambiguous identifiers do not leak existence | P0 | FULL | API, supporting unit/API | T-A01, T-A02, T-A03, S-R01 | Story 12.10 proves detail-route adoption and response shape; Story 12.7 resolver matrix supplies hidden/unsafe/collision depth |
| AC6 | Prefetched Mer info opens from cache with no new detail request; cache-miss opens the existing identity shell with `aria-busy`, one Swedish loading announcement, stable skeletons, usable chrome, and inline retry path preserved | P0 | FULL | Component, E2E, unit | T-C01, T-C02, T-E04, T-U05, T-U08 | Warmed open request delta is zero; unwarmed open request delta is one and busy shell appears immediately |
| AC7 | Measurement and release evidence records local prefetched/non-prefetched Mer info timing while deterministic CI stays provider-isolated | P1 | FULL | E2E evidence, story record | T-E04, G-01 | Local timing evidence recorded for desktop and mobile; protected preview/live timing correctly deferred to release lane |
| K1 | Superseded Epic text is enforced: no post-scrub/date restart option, no 10 km expansion, no server cache-warming scope creep, mandatory supersession documented | P1 | FULL | Story/static/unit/E2E | T-U03, T-U07, T-E02, G-02 | Story has mandatory section; tests/source assertions reject 10 km/radius expansion and prove no restart |
| K2 | Forced dev routes and direct venue deep links avoid accidental speculative prefetch unless explicitly opted in | P1 | FULL | Unit/static, E2E | T-U09, T-E03 | `_prefetch=venue-detail` opt-in is asserted; direct deep links only fetch the requested slug |
| K3 | Review-fix regressions remain closed: map-pin and QuickInfo interactions cancel pending work, displayed list order feeds prefetch, and 400/404 route bodies retain status | P1 | FULL | Component, API, gates | S-C01, S-C02, S-C03, T-A03, G-01 | All primary review findings were fixed and post-fix verified; focused/full gates are recorded green |

## Stable Evidence Catalog

| Evidence ID | Test identity (`title`; `file:line`) | Level | Status flags |
|---|---|---|---|
| T-U01 | `[P0] prefetch and mounted detail share one client-safe query-options builder`; `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts:41` | Unit/static | active, direct |
| T-U02 | `[P0] shared detail params normalize date, time, and 4-decimal coordinate buckets identically to the mounted key`; `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts:57` | Unit | active, direct |
| T-U03 | `[P0] initial-settle scheduler limits candidates to six and concurrent prefetches to two`; `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts:84` | Unit/static | active, direct |
| T-U04 | `[P0] a 429 prefetch stops after the current concurrency pair, enters cooldown, and stays console-silent`; `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts:98` | Unit | active, direct |
| T-U05 | `[P1] scheduler skips fresh exact detail keys without changing the remaining candidate order`; `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts:128` | Unit | active, direct |
| T-U06 | `[P0] prefetch error cooldown lasts for the venue read rate-limit window`; `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts:172` | Unit | active, direct |
| T-U07 | `[P0] scheduler captures the first settled planner/location key and never restarts on scrub or planner-date changes`; `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts:181` | Unit/static | active, direct |
| T-U08 | `[P0] opening Mer info preserves the opened in-flight detail key while cancelling other queued candidates`; `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts:191` | Unit/static | active, direct |
| T-U09 | `[P0] forced dev routes require an explicit venue-detail prefetch opt-in`; `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts:202` | Unit/static | active, direct |
| T-U10 | `[P0] favourites mode selects loaded favourite rows first, then nearest already-loaded list fallback`; `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts:210` | Unit | active, direct |
| T-A01 | `[P0] live detail route consumes resolvePublicVenueIdentifier instead of the stale slug-only store lookup`; `nextjs-app/test/unit/api/story-12-10-detail-public-resolver.atdd.test.ts:16` | API/static | active, direct |
| T-A02 | `[P0] public id and slug identifiers resolve through the same detail route behavior`; `nextjs-app/test/unit/api/story-12-10-detail-public-resolver.atdd.test.ts:25` | API | active, direct |
| T-A03 | `[P0] unknown, blank, malformed, hidden, and ambiguous live identifiers keep indistinguishable public errors`; `nextjs-app/test/unit/api/story-12-10-detail-public-resolver.atdd.test.ts:41` | API | active, direct plus source assertion |
| T-C01 | `[P1] Swedish venue-detail loading announcement is exactly "Laddar platsinformation"`; `nextjs-app/test/components/story-12-10-venue-detail-cache-miss-shell.atdd.test.tsx:60` | Component/static | active, direct |
| T-C02 | `[P1] cache-miss shell keeps identity, aria-busy, one visible polite status, stable skeletons, and retry-capable chrome`; `nextjs-app/test/components/story-12-10-venue-detail-cache-miss-shell.atdd.test.tsx:72` | Component | active, direct |
| T-E01 | `[P0] initial settled surface prefetches at most six detail keys with concurrency two and exact planner params`; `nextjs-app/test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts:312` | E2E | active, direct, desktop+mobile |
| T-E02 | `[P0] same-date scrub and planner-date change do not restart detail prefetch after the first pass settles`; `nextjs-app/test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts:345` | E2E | active, direct, desktop+mobile |
| T-E03 | `[P0] direct venue deep links do not launch speculative detail prefetch`; `nextjs-app/test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts:372` | E2E | active, direct, desktop+mobile |
| T-E04 | `[P0] Mer info for a warmed candidate opens from cache and an unwarmed candidate uses the existing busy shell`; `nextjs-app/test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts:390` | E2E | active, direct, desktop+mobile, writes timing evidence |
| S-C01 | Map pin selection cancels delayed detail prefetch; `nextjs-app/test/components/MapView.test.tsx:1242` | Component | active, supporting review-fix |
| S-C02 | QuickInfo dismiss cancels delayed detail prefetch; `nextjs-app/test/components/MapView.test.tsx:1265` | Component | active, supporting review-fix |
| S-C03 | Displayed distance order is passed into initial detail prefetch; `nextjs-app/test/components/MapView.test.tsx:1286` | Component | active, supporting review-fix |
| S-R01 | Story 12.7 public resolver hidden/unsafe/collision matrix; `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.atdd.test.ts:137`, `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.automation.test.ts:131`, `:153`, `:186` | Unit/API | active, supporting |
| S-E01 | Standing Epic 11/Story 12.3 request-count evidence; `nextjs-app/test/e2e/epic-11-scrub-zero-fetch.spec.ts:199`, `nextjs-app/test/e2e/story-12-3-persisted-geometry-request-count.atdd.spec.ts:154` | E2E | active, supporting |
| G-01 | Story file final gate/debug-log record for typecheck, lint, full Vitest, Story 12.10 Playwright, full serialized Playwright, primary review fixes, and security review | Static/full-suite gate | recorded pass |
| G-02 | Mandatory `Superseded Epic Text` section in the Story 12.10 story file | Static/story | present, direct |

## Phase 1 Gap Analysis

**Execution mode:** sequential in this delegate. The surrounding instructions forbade new sub-agent launches unless explicitly requested; no parallel worker was needed to complete the advisory trace.

### Statistics

| Metric | Result |
|---|---:|
| Total traced items | 10 |
| Fully covered | 10 (100%) |
| Partially covered | 0 |
| Uncovered | 0 |
| P0 full coverage | 6/6 (100%) |
| P1 full coverage | 4/4 (100%) |
| P2 full coverage | 0/0 (100% by convention) |
| P3 full coverage | 0/0 (100% by convention) |

### Gap Classification

- **Critical P0 gaps:** none.
- **Uncovered P1/P2/P3 gaps:** none.
- **Partial items:** none.
- **Unit-only items:** none requiring escalation. Query/scheduler internals are correctly unit-level; every user-visible Mer info/cache-miss/request-count path has component or E2E evidence.

### Heuristic Gap Counts

| Heuristic | Count / status |
|---|---|
| Endpoints without tests | 0 |
| Missing auth negative paths | not applicable |
| Happy-path-only criteria | 0 |
| UI journeys without E2E | 0 |
| UI states missing coverage | 0 |

### Recommendations

1. **LOW / release evidence:** collect protected preview/live Mer info timing in the release lane if credentials are available; do not treat missing protected credentials as a Story 12.10 CI defect.
2. **LOW / regression:** retain the Story 12.10 request-count E2E, the MapView review-fix regressions, and the Story 12.7 resolver matrix in standing suites.
3. **LOW / operations:** keep the `_prefetch=venue-detail` forced-route opt-in so visual/reference and unrelated request-count suites do not consume the shared local venue-read limiter.

The complete Phase 1 JSON is saved at `C:/Users/Rasmus/sunnyseat/_bmad-output/test-artifacts/traceability/tea-trace-coverage-matrix-12-10-2026-07-26T21-01-02+02-00.json`.

## Advisory Decision

**PASS** (advisory; no separate enforced trace gate was opened). Ten items were traced: 10 `FULL`, 0 `PARTIAL`, and 0 `NONE`. P0 coverage is 6/6 and P1 coverage is 4/4. The story remains `in-progress`; Task 7 remains under orchestrator control and this trace did not run the story-review wrapper or edit sprint status.
