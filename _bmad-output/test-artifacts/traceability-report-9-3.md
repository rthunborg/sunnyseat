---
stepsCompleted:
  - step-01-load-context
  - step-02-discover-tests
  - step-03-map-criteria
  - step-04-analyze-gaps
  - step-05-gate-decision
lastStep: step-05-gate-decision
lastSaved: 2026-06-30
mode: ADVISORY  # story-scoped, non-blocking — surfaces coverage gaps at review time, does NOT open a gate
story: 9.3 — Venue Sun-Compute Performance — Server Caching
---

# Traceability Report (ADVISORY) — Story 9.3

**Scope:** ONLY Story 9.3's 3 acceptance criteria + the backend/perf Design Gate. Not the whole epic.
**Nature:** Advisory pass per `tea.story_trace_advisory` — surfaces coverage early; does NOT block, remediate, or persist a quality gate.

## Advisory Verdict: PASS

**Rationale:** All 3 ACs are FULLY covered by deterministic automated tests (call-count, cache-key, byte-identical-snapshot, and header-presence assertions). P0 coverage = 100%; P1 coverage = 100%; overall = 100%. The one acknowledged non-automated item — live cold/warm wall-clock latency — is an intentional, documented manual maintainer measurement per the project's wall-clock-flakiness lesson; it is NOT a coverage gap. No uncovered ACs.

---

## Context Loaded

- **Story file:** `_bmad-output/implementation-artifacts/9-3-venue-sun-compute-performance-server-caching.md` (status `review`; 3 ACs + backend/perf Design Gate).
- **Test design:** `_bmad-output/test-artifacts/test-design/test-design-epic-9.md` — R-002 (score 9, the only score-9 risk in the epic); RPC-count verification (~14→7); byte-identical-FAIL contingency; "no wall-clock latency asserts" constraint.
- **Knowledge base:** test-priorities-matrix, risk-governance, probability-impact, test-quality, selective-testing, test-levels.

---

## Tests Discovered & Cataloged (by level)

All UNIT level (this is a backend/perf story with no UI surface and no e2e gate). Mock boundary throughout is the deepest adapter (`@/lib/supabase/server` rpc + `@/lib/weather/met-no-service`), per the MEMORY "Vitest dynamic-import mock bypass" lesson — never the dynamically-imported `@/lib/solar`.

| File | Level | Tests | Focus |
|---|---|---|---|
| `test/unit/services/sun-engine-caching.atdd.test.ts` | Unit (engine integration) | 11 | AC1 dedupe + byte-identical snapshot + null behaviour; AC2 buildings cache, sun-compute bucket cache, TTL expiry, degraded-not-pinned, distinct-venue non-collapse, detail-route parity |
| `test/unit/services/sun-engine-cache.test.ts` | Unit | 27 | TtlCache expiry/eviction at boundary instant; `buildingsCacheKey` collision/separation/radius; `timeBucketMs`/`sunComputeCacheKey` bucketing+disambiguation; `getOrFetchNonNull`/`getOrComputeConditional`/`getOrCompute` success-only caching, in-flight reuse, rejection eviction |
| `test/unit/api/venues-route-caching.atdd.test.ts` | Unit (route/API) | 8 | AC3 edge-cacheable `s-maxage=30`, no-vary-on-XFF (identical ETag), 429 still enforced from relocated limiter, ETag/304, freshness headers; AC2 detail-route parity + default-seed byte-identical |
| `test/unit/utils/rate-limit.test.ts` | Unit | 10 | Extracted limiter: Edge-safe pure-JS IPv4/IPv6 validation, header-injection rejection, `clientKeyFromHeaders` precedence, token-bucket quota/reset/independent-keys |
| `test/unit/proxy-matcher.test.ts` | Unit | (matcher) | AC3 routing: proxy matcher includes `/api/venues` + `/api/venues/:slug*`; locale pattern still excludes `/api/*` |

**Verified green:** the five suites run 62 tests, all passing (`vitest run`, 2026-06-30). Story-wide gate independently reported 86 files / 728 tests green + tsc 0 + eslint 0 + `next build` ok.

### Coverage heuristics inventory
- **Endpoint coverage:** both impacted endpoints — `/api/venues` (list) and `/api/venues/[slug]` (detail) — are directly exercised (`venues-route-caching.atdd.test.ts` drives both `listGET` and `detailGET`). No uncovered endpoint.
- **Auth/authz coverage:** N/A — no auth surface in this story. The rate-limiter (DoS, not authz) negative path (429) IS covered.
- **Error-path coverage:** strong — null-RPC (buildings fetch failed) drives both single-shot and timeline to data-unavailable; degraded compute NOT pinned; rejected in-flight promise evicted; malformed/injection IP rejected. Not happy-path-only.

---

## Traceability Matrix (AC → tests)

### AC1 — Single shared building fetch (2→1 RPC/venue), byte-identical output, false comments corrected — **Priority P0** — Coverage: **FULL**

| Requirement facet | Covering test(s) | Status |
|---|---|---|
| RPC volume halved (2→1 per venue) | `sun-engine-caching.atdd.test.ts` › "fetches get_buildings_near_point ONCE per venue, not twice" (asserts call count == 1) | FULL |
| Byte-identical sun output (diff = FAIL, not rebaseline) | `sun-engine-caching.atdd.test.ts` › "produces a SunEngineOutcome deep-equal to the pre-dedupe baseline" (`toMatchInlineSnapshot` against verbatim pre-refactor baseline) | FULL |
| Both `null` behaviours preserved from one fetch | `sun-engine-caching.atdd.test.ts` › "a null buildings fetch drives BOTH shadow + timeline to data-unavailable" (1 fetch even on failure; weather freshness still honest) | FULL |
| Stale "one buildings fetch reused internally" comments corrected | Source-comment correction — not directly unit-assertable; the call-count==1 test is the behavioural proof the dedupe is real (the comment fix rides on the verified behaviour). | FULL (behaviourally) |

### AC2 — Two server caches (buildings: rounded centroid+radius, long revalidate; sun-compute: per venue/15-min-bucket/day), applied to BOTH list and detail — **Priority P0** — Coverage: **FULL**

| Requirement facet | Covering test(s) | Status |
|---|---|---|
| Buildings cache: repeat request → 0 extra RPC | `sun-engine-caching.atdd.test.ts` › "does NOT re-invoke the RPC for a 2nd request with the same centroid+radius" | FULL |
| Buildings cache keyed on rounded centroid + radius (co-located collapse) | atdd › "collapses co-located venues to a single building RPC"; `sun-engine-cache.test.ts` › buildingsCacheKey collapse / distinct-separation / radius-fold / lat-lng ordering / NaN sentinel (5 tests) | FULL |
| Buildings cache never pins a null as success | atdd › "never caches a null buildings result as a success"; cache › `getOrFetchNonNull` "NEVER caches a null" | FULL |
| Buildings cache long-revalidate (24h) TTL expiry | atdd › "re-fetches buildings after the 24h TTL elapses"; cache › TtlCache boundary + "honours configured TTL constants (24h / 15min)" | FULL |
| Sun-compute cache: same 15-min bucket → cache hit (0 RPC) | atdd › "serves a 2nd request in the SAME 15-min bucket from cache" | FULL |
| Sun-compute cache: new bucket → recompute | atdd › "recomputes when the request crosses into a NEW 15-min bucket"; cache › timeBucketMs separation | FULL |
| Sun-compute cache transparent (cached == uncached) | atdd › "returns a cached outcome byte-equal to the uncached compute" (`toEqual`) | FULL |
| Sun-compute key disambiguation (venue id / day / variant) | cache › sunComputeCacheKey collide-same-bucket + disambiguate-by-id/day/variant + day-folds-in (3 tests) | FULL |
| Degraded compute NOT pinned across window | atdd › "recomputes a same-bucket request after a degraded (building-RPC-failed) compute"; cache › `getOrComputeConditional` "does NOT cache a cacheable:false compute" | FULL |
| Distinct venues do NOT collapse (no false key collision) | atdd › "issues a separate building RPC for venues at distinct (4-dp) centroids" | FULL |
| Cache shared by BOTH list and detail (engine seam) | atdd › "serves a detail-path compute from the same-bucket cache the list primed (0 extra RPCs)"; route atdd › detail-route `s-maxage` + freshness headers | FULL |
| Honest `weatherUpdatedAt` preserved when cached | atdd › "preserves honest weatherUpdatedAt for a cached future-planner bucket" | FULL |

### AC3 — Resolve CDN-cache-vs-rate-limit conflict (Option A: relocate limiter), document approach, staleness window — **Priority P1** — Coverage: **FULL**

| Requirement facet | Covering test(s) | Status |
|---|---|---|
| Response now genuinely edge-cacheable (`public, s-maxage=30`) | `venues-route-caching.atdd.test.ts` › "returns a public s-maxage=30 Cache-Control the edge can honour"; detail › "sets a public s-maxage Cache-Control on the detail route" | FULL |
| GET handler no longer varies on `x-forwarded-for` (dynamic-forcing read removed) | route atdd › "does not vary the response on x-forwarded-for" (identical ETag for different IPs) | FULL |
| Rate-limiting (429) STILL enforced from relocated home | route atdd › "still enforces the 429 rate-limit from the relocated limiter (middleware)"; `rate-limit.test.ts` › token-bucket quota/reset/independent-keys | FULL |
| Limiter relocated into the Edge proxy for `/api/venues*` | `proxy-matcher.test.ts` (matcher includes venue read routes, locale excludes `/api/*`) | FULL |
| Edge-safe limiter (no `node:net`; pure-JS IP validation) | `rate-limit.test.ts` › IPv4/IPv6 accept, malformed reject, header-injection/overlong reject, `clientKeyFromHeaders` precedence | FULL |
| ETag/304 + freshness headers survive relocation | route atdd › ETag/304 path; X-Sun-Data-Source + X-Weather-Updated-At on list AND detail | FULL |
| Documented approach + staleness window | Story Completion Notes + `route.ts` comment + `architecture.md` Caching Strategy section (documentation requirement — satisfied by artifact, not a test) | FULL (doc artifact) |

### Design Gate (backend/perf) — perf is the acceptance signal — Coverage: **FULL (deterministic) + documented manual gap**

| Facet | Coverage | Status |
|---|---|---|
| RPC-count perf evidence (14→7 list; warm 2nd list 0 extra) | Captured deterministically in Completion Notes + proven by the call-count tests above | FULL |
| Live cold/warm wall-clock latency | Intentional MANUAL maintainer/preview measurement — NOT a CI assert, per the wall-clock-flakiness lesson | DOCUMENTED ACCEPTED GAP (not a coverage failure) |
| Visual gate | Auto-skipped (no mapped screen ID; backend-only) | N/A by design |

---

## Gap Analysis

- **Uncovered (NONE) requirements:** 0.
- **Partial coverage:** 0.
- **Unit-only flag:** All coverage is unit-level — appropriate and sufficient for a backend caching/dedupe story with no UI and no e2e gate (the engine seam and both routes are directly exercised; cache primitives have dedicated unit tests).
- **Heuristic blind spots:** none (both endpoints covered; error paths covered; no auth surface).
- **Accepted, documented non-automated item:** live wall-clock latency timing — explicitly deferred to a manual maintainer/preview run because asserting ms-latency against live Supabase is non-reproducible and is the exact flakiness the epic test design forbids. Treated as a documented accepted gap, not an AC coverage failure. The in-CI acceptance signal (RPC count 14→7 + cache-hit behaviour) stands in for it.

## Coverage Statistics

- Total requirements (ACs): 3 — Fully covered: 3 (100%)
- P0: 2/2 (100%) — AC1, AC2
- P1: 1/1 (100%) — AC3
- P2/P3: none
- Overall: 100%

## Recommendations (advisory)

1. **LOW** — None blocking. Coverage is complete and green.
2. **LOW** — At epic-end / review, capture the deferred live cold-vs-warm wall-clock latency once in a maintainer/preview run to close the perf-evidence loop qualitatively (still NOT a CI assert).
3. **NOTE (interworking, not a 9.3 gap)** — Story 9.4 (time-change debounce / fewer requests) compounds with 9.3 (cheaper requests). Per the epic test design, validate 9.4 with 9.3 in place; out of scope here.

---

## Gate Decision (ADVISORY — NOT persisted as a blocking gate)

**Decision: PASS**

- P0 Coverage: 100% (Required 100%) → MET
- P1 Coverage: 100% (PASS target 90%) → MET
- Overall Coverage: 100% (Minimum 80%) → MET
- Critical gaps: 0
- Uncovered ACs: none

This is an advisory result only. It does not block the story, does not remediate, and does not open or persist a quality gate file. Its purpose is to make coverage visible at review time.
