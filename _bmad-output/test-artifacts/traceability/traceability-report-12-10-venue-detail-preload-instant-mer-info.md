---
stepsCompleted:
  - step-01-load-context
  - step-02-discover-tests
  - step-03-map-criteria
  - step-04-analyze-gaps
  - step-05-gate-decision
lastStep: step-05-gate-decision
lastSaved: '2026-07-26'
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
tempCoverageMatrixPath: 'C:/Users/Rasmus/sunnyseat/_bmad-output/test-artifacts/traceability/tea-trace-coverage-matrix-12-10-2026-07-26T21-01-02+02-00.json'
---

# Traceability Report - Story 12.10: Venue Detail Preload

**Scope:** STORY-LEVEL - Story 12.10 acceptance criteria plus explicit superseded-text and architecture contracts.
**Mode:** ADVISORY. This trace reports coverage without blocking, remediating, changing sprint status, or editing implementation/Auto-BMAD state.
**Story status at trace time:** `in-progress`.

## Coverage Oracle

The primary oracle is the formal Story 12.10 acceptance criteria. The trace also includes the mandatory supersession controls, `E12-AD-09`, the UX `VenueDetailPreload` section, and the Epic 12 QA design item for Story 12.10:

- exact query-key and scheduler unit coverage;
- network-count E2E including detail prefetch traffic;
- favourites candidate inclusion from already-loaded rows;
- public resolver hidden guard;
- cancellation and backoff;
- superseded-text brief audit.

No external pointer was needed. This is not a synthetic-source trace.

## Test Inventory

### Primary Story 12.10 Suites

| Level | File | Active cases |
|---|---|---:|
| Unit / scheduler and query contract | `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts` | 10 |
| API / detail route resolver | `nextjs-app/test/unit/api/story-12-10-detail-public-resolver.atdd.test.ts` | 3 |
| Component / cache-miss shell | `nextjs-app/test/components/story-12-10-venue-detail-cache-miss-shell.atdd.test.tsx` | 2 |
| E2E / request-count and timing | `nextjs-app/test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts` | 4 scenario identities, 8 browser executions |
| **Total** | **4 files** | **19 direct test identities plus 8 browser executions** |

No direct Story 12.10 suite contains `skip`, `fixme`, `todo`, `only`, or hard-wait markers. The traced E2E file uses route mocks and `expect.poll`/visible-state waits; it does not call live Met.no.

### Supporting Regression Evidence

- `nextjs-app/test/components/MapView.test.tsx:1242` covers map-pin selection cancelling delayed prefetch.
- `nextjs-app/test/components/MapView.test.tsx:1265` covers QuickInfo dismiss cancelling delayed prefetch.
- `nextjs-app/test/components/MapView.test.tsx:1286` covers displayed distance order being passed into initial prefetch after a pre-settle sort change.
- Story 12.7 resolver tests cover hidden, malformed, blank, unknown, unsafe-control, and collision behavior for the shared public resolver consumed by the detail route.
- Epic 11 and Story 12.3 request-count E2E suites remain supporting regression evidence for the standing same-date/date-change contract.

## Coverage Heuristics

- **Endpoint inventory:** `/api/venues/[slug]` has direct Story 12.10 route tests. No new endpoint was added.
- **Auth/authz:** not applicable. The story changes anonymous public detail resolution and client prefetch scheduling, not authenticated roles or dev editor access.
- **Error and edge paths:** malformed slug, unknown miss, 429/backoff/cooldown, fresh-cache skip, direct deep-link no speculative prefetch, exact-key cancellation, and silent background prefetch failure are covered.
- **UI journey:** mobile and desktop E2E cover initial prefetch, no restart after scrub/date change, direct deep link, warmed Mer info, and cold Mer info.
- **UI state:** component and E2E cover identity shell, `aria-busy`, one polite Swedish loading status, stable skeletons, route chrome, and warmed/cold replacement behavior.
- **Provider isolation:** deterministic CI uses local route fixtures. Protected preview/live timing evidence is deferred to the release lane because no credentials were available; this is not counted as a local coverage gap.

## Primary Test Identity Catalog

| ID | Level | File:line | Test title |
|---|---|---|---|
| T-U01 | Unit/static | `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts:41` | Prefetch and mounted detail share one client-safe query-options builder |
| T-U02 | Unit | `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts:57` | Shared detail params normalize date, time, and 4-decimal coordinate buckets identically to the mounted key |
| T-U03 | Unit/static | `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts:84` | Initial-settle scheduler limits candidates to six and concurrent prefetches to two |
| T-U04 | Unit | `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts:98` | 429 prefetch stops after current concurrency pair, enters cooldown, and stays console-silent |
| T-U05 | Unit | `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts:128` | Scheduler skips fresh exact detail keys without changing remaining candidate order |
| T-U06 | Unit | `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts:172` | Prefetch error cooldown lasts for the venue read rate-limit window |
| T-U07 | Unit/static | `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts:181` | Scheduler captures first settled planner/location key and never restarts on scrub/date changes |
| T-U08 | Unit/static | `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts:191` | Opening Mer info preserves opened in-flight detail key while cancelling other queued candidates |
| T-U09 | Unit/static | `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts:202` | Forced dev routes require explicit venue-detail prefetch opt-in |
| T-U10 | Unit | `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts:210` | Favourites mode selects loaded favourite rows first, then nearest already-loaded list fallback |
| T-A01 | API/static | `nextjs-app/test/unit/api/story-12-10-detail-public-resolver.atdd.test.ts:16` | Live detail route consumes `resolvePublicVenueIdentifier` instead of stale slug-only lookup |
| T-A02 | API | `nextjs-app/test/unit/api/story-12-10-detail-public-resolver.atdd.test.ts:25` | Public id and slug identifiers resolve through the same detail route behavior |
| T-A03 | API | `nextjs-app/test/unit/api/story-12-10-detail-public-resolver.atdd.test.ts:41` | Unknown, blank, malformed, hidden, and ambiguous live identifiers keep indistinguishable public errors |
| T-C01 | Component/static | `nextjs-app/test/components/story-12-10-venue-detail-cache-miss-shell.atdd.test.tsx:60` | Swedish venue-detail loading announcement is exactly `Laddar platsinformation` |
| T-C02 | Component | `nextjs-app/test/components/story-12-10-venue-detail-cache-miss-shell.atdd.test.tsx:72` | Cache-miss shell keeps identity, aria-busy, one visible polite status, stable skeletons, and retry-capable chrome |
| T-E01 | E2E | `nextjs-app/test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts:312` | Initial settled surface prefetches at most six detail keys with concurrency two and exact planner params |
| T-E02 | E2E | `nextjs-app/test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts:345` | Same-date scrub and planner-date change do not restart detail prefetch after first pass settles |
| T-E03 | E2E | `nextjs-app/test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts:372` | Direct venue deep links do not launch speculative detail prefetch |
| T-E04 | E2E | `nextjs-app/test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts:390` | Mer info for a warmed candidate opens from cache and an unwarmed candidate uses the existing busy shell |

## Traceability Matrix

| Requirement | Priority | Coverage | Primary mapped tests | Heuristic / gap note |
|---|---|---|---|---|
| AC1 - Initial-settle-only candidate prefetch | P0 | FULL | T-U03, T-U10, T-E01, S-C03 | Covers max six, concurrency two, visible order, loaded favourite rows, nearest fallback, dedupe, and no extra discovery request. |
| AC2 - Exact mounted detail key | P0 | FULL | T-U01, T-U02, T-E01 | Shared helper, exact `detailAt`, date/time normalization, 4-decimal buckets, encoded URL, and no slug-only key are covered. |
| AC3 - Scrub/date request-count invariants | P0 | FULL | T-U07, T-E02, S-E01 | Story 12.10 E2E counts detail requests, and standing Epic 11/12.3 request-count suites remain supporting evidence. |
| AC4 - Yield, cancellation, and error backoff | P0 | FULL | T-U04, T-U06, T-U08, S-C01, S-C02 | Direct interactions cancel queued/in-flight candidate work; opened exact key is preserved; 429 stops after a pair and enters cooldown without console noise. |
| AC5 - Public resolver convergence and hidden guard | P0 | FULL | T-A01, T-A02, T-A03, S-R01 | Detail route adopts the resolver and preserves response shape; Story 12.7 supplies the full shared hidden/unsafe/collision matrix. |
| AC6 - Instant open and cache-miss shell | P0 | FULL | T-C01, T-C02, T-E04, T-U05 | Warmed open creates zero new detail requests; cold open creates one request and shows stable busy shell with localized live region. |
| AC7 - Measurement and release evidence | P1 | FULL | T-E04, G-01 | Local fixture timing exists for desktop and mobile; protected preview/live evidence is correctly deferred to release lane due absent credentials. |
| K1 - Superseded Epic text and no scope creep | P1 | FULL | T-U03, T-U07, T-E02, G-02 | Story has supersession section; tests reject 10 km/radius expansion and prove no scrub/date restart. |
| K2 - Forced route/direct deep-link limiter | P1 | FULL | T-U09, T-E03 | Forced routes require `_prefetch=venue-detail`; direct detail links do not launch candidate prefetch. |
| K3 - Review-fix regressions | P1 | FULL | S-C01, S-C02, S-C03, T-A03, G-01 | All review findings were fixed and post-fix verified: cancellation boundaries, displayed order, and 400/404 status bodies. |

### Coverage Totals

| Priority | Total | Full | Partial | Uncovered | Full-only coverage |
|---|---:|---:|---:|---:|---:|
| P0 | 6 | 6 | 0 | 0 | 100% |
| P1 | 4 | 4 | 0 | 0 | 100% |
| P2 | 0 | 0 | 0 | 0 | 100% by convention |
| P3 | 0 | 0 | 0 | 0 | 100% by convention |
| **Total** | **10** | **10** | **0** | **0** | **100%** |

Repeated unit/component/E2E mappings are intentional defense in depth. Query-key algebra and scheduler mechanics are best proved at unit level; visible cache-hit/cache-miss behavior and request-count invariants require browser evidence.

## Phase 1 Gap Analysis

**Execution mode:** sequential. No additional sub-agent launch was required or permitted by the active orchestration constraints.

### Coverage Gaps

- **Uncovered criteria:** 0.
- **Partial criteria:** 0.
- **Critical/high uncovered gaps:** 0.
- **Unit-only concerns:** 0. Pure scheduler/query-key mechanics are unit-heavy by design, while every user-facing path has component or E2E evidence.

### Heuristic Blind Spots

- Endpoint gaps: 0. `/api/venues/[slug]` has direct route tests.
- Auth negative-path gaps: not applicable.
- Happy-path-only criteria: 0. Error, malformed, 429/backoff, cold cache miss, direct deep link, and hidden/unknown paths are covered.
- UI journey gaps: 0. The core Mer info journey is covered on mobile and desktop.
- UI state gaps: 0. The busy shell, live announcement, and replacement state are covered.

### Recommendations

1. Preserve the Story 12.10 request-count E2E and MapView review-fix regressions in standing suites.
2. Preserve the Story 12.7 resolver matrix as supporting evidence for every consumer of public venue identity.
3. Collect protected preview/live timing in the release lane if credentials are available.

Phase 1 machine matrix: `C:/Users/Rasmus/sunnyseat/_bmad-output/test-artifacts/traceability/tea-trace-coverage-matrix-12-10-2026-07-26T21-01-02+02-00.json`.

## Advisory Verdict: PASS

Formal gate evaluation was intentionally skipped because this Story 12.10 trace is advisory (`allow_gate=false`). No enforced gate decision was emitted.

Ten traced items are `FULL`, with 6/6 P0 and 4/4 P1 full coverage. The local deterministic evidence includes typecheck/lint, full Vitest, focused Story 12.10 Playwright, final serialized full Playwright, fixed primary review findings, and security review PASS with 0 findings. Protected preview/live timing remains a release-lane item, not a Story 12.10 coverage defect.
