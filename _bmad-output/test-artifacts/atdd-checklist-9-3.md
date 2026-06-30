---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04-generate-tests'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-06-30'
workflowType: 'testarch-atdd'
inputDocuments:
  - '_bmad-output/implementation-artifacts/9-3-venue-sun-compute-performance-server-caching.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-9.md'
  - 'nextjs-app/test/unit/services/sun-engine.test.ts'
  - 'nextjs-app/test/unit/api/venues-route.test.ts'
  - 'nextjs-app/test/unit/api/venue-detail-route.test.ts'
  - 'nextjs-app/app/api/venues/route.ts'
  - 'nextjs-app/lib/services/sun-engine.ts'
  - 'nextjs-app/lib/solar/shadow-calculation-service.ts'
---

# ATDD Checklist - Epic 9, Story 9.3: Venue Sun-Compute Performance — Server Caching

**Date:** 2026-06-30
**Author:** Rasmus
**Primary Test Level:** Unit / API (backend/perf — no E2E, no visual gate)

---

## Story Summary

The live app "stalls on every load" because the real sun engine runs **N venues × 2** `get_buildings_near_point` RPCs per `/api/venues` and `/api/venues/[slug]` request with **no server cache** (R-002, the only score-9 risk in Epic 9). Story 9.3 dedupes the building fetch (2→1 per venue, ≈14→7 for 7 venues) with **byte-identical** sun outputs, adds two server caches (buildings by rounded centroid+radius; sun-compute by venue+15-min-bucket+day), and resolves the CDN-cache-vs-rate-limit conflict so the route is genuinely edge-cacheable.

**As a** user
**I want** the venue list and the "Mer info" detail panel to load fast
**So that** the app feels responsive instead of stalling on every load

---

## Acceptance Criteria

1. **AC1 — Dedupe + byte-identical.** `computeRealSunEngine` fetches the nearby-building set **once** and reuses it for both the current-shadow and the timeline calc; RPC volume per request is halved (≈14→7) with **byte-identical** sun outputs; the two stale "one buildings fetch reused internally" comments (sun-engine.ts ~51-56 and ~317) are corrected.
2. **AC2 — Two server caches, both routes.** `get_buildings_near_point` is cached on **rounded centroid + radius** (long revalidate); per-(venue, rounded-time-bucket, day) sun compute is cached so repeat requests within a bucket are near-free; applied to **both** `/api/venues` (list) and `/api/venues/[slug]` (detail).
3. **AC3 — Edge-cacheable + documented staleness.** The dynamic-forcing rate-limit header read is relocated (Option A: limiter → middleware/edge) so the `s-maxage=30` response can be edge-cached **OR** the precompute follow-up is adopted; the chosen approach is documented; sun-data freshness stays within an agreed staleness window.

---

## Test Strategy (AC → Level → Priority → Red-phase signal)

| # | Acceptance signal | Level | Priority | Red-phase assertion (NOT latency) | Risk |
|---|---|---|---|---|---|
| 1 | Building fetch runs ONCE per venue (2→1) | Unit | **P0** | `mocks.rpc` `get_buildings_near_point` call count === 1 | R-002 |
| 2 | Byte-identical `SunEngineOutcome` vs pre-dedupe baseline | Unit | **P0** | `toMatchInlineSnapshot` deep-equal; **a diff is a FAIL, not a rebaseline** | R-002 |
| 3 | `null` fetch drives BOTH shadow + timeline unavailable (one fetch) | Unit | P1 | freshness `geometry-only`; still 1 fetch | R-002 |
| 4 | 2nd request, same centroid+radius → no extra RPC (buildings cache hit) | Unit | **P0** | building-RPC count unchanged on 2nd call | R-002 |
| 5 | Co-located venues (@4dp key) collapse to one RPC | Unit | P1 | 2 venues → 1 building RPC | R-002 |
| 6 | A `null` (RPC fail) is never cached as a success | Unit | P1 | recompute attempted on next request | R-012 |
| 7 | 2nd request, same 15-min bucket → cache hit (no recompute) | Unit | **P0** | total RPC count unchanged within bucket | R-002, R-012 |
| 8 | New 15-min bucket → recompute | Unit | **P0** | RPC count increases across bucket boundary | R-012 |
| 9 | Cached outcome === uncached outcome | Unit | P1 | `toEqual` transparency | R-002 |
| 10 | Future-planner bucket keeps honest `weatherUpdatedAt` | Unit | P2 | freshness valid-time unchanged by caching | R-012 |
| 11 | List route returns honour-able `public, s-maxage=30` | API | **P0** | `Cache-Control` matches `s-maxage=30` + `public` | R-013 |
| 12 | Handler no longer varies on `x-forwarded-for` (limiter moved) | API | **P0** | identical ETag for differing forwarded-IP | R-013 |
| 13 | 429 rate-limit STILL enforced from relocated limiter | API | **P0** | eventual 429 (DoS protection retained) | R-013 |
| 14 | ETag / 304 if-none-match path preserved | API | P1 | 304 on matching ETag | R-013 |
| 15 | List freshness headers preserved | API | P1 | `x-sun-data-source` + `x-weather-updated-at` present | — |
| 16 | Detail route advertises edge-cacheable response | API | P1 | detail `Cache-Control` `s-maxage=30` | R-002 (AC2 parity) |
| 17 | Detail freshness headers preserved | API | P1 | detail freshness headers present | — |
| 18 | Default (flag-off) seed detail DTO byte-identical | API | P2 | sentinel — seed shape unmoved | regression |

**Deliberately OUT of scope (per story scope discipline):** raw latency/timing asserts (wall-clock-flaky — manual evidence in Completion Notes only); Story 9.4 debounce / favourites-from-cache; sun MATH / confidence caps / elevation gates; Option B precompute scaffolding (escalate `needs-human` if it becomes the only path).

---

## Failing Tests Created (RED Phase)

> All tests are `describe.skip` / `it.skip` so they do NOT break the green CI run. The dev un-skips each block as the matching task goes green (red→green per test). They were collected and confirmed SKIPPED (18 skipped / 0 failing) and the files type-check clean (`tsc --noEmit` 0 errors).

### Unit Tests — engine dedupe + caches (10 tests)

**File:** `nextjs-app/test/unit/services/sun-engine-caching.atdd.test.ts`

Mocks the deepest adapter boundary only (`@/lib/supabase/server` `rpc` + `@/lib/weather/met-no-service` `getForecast`) per MEMORY "Vitest dynamic-import mock bypass" — NEVER `vi.mock('@/lib/solar')` (the concurrent dynamic import bypasses it). Drives the engine via the existing public `applyRealSunEngine` entry.

- **AC1** `fetches get_buildings_near_point ONCE per venue, not twice` — RED: today fires 2 RPCs.
- **AC1** `produces a SunEngineOutcome deep-equal to the pre-dedupe baseline` — RED: inline-snapshot placeholder; dev pastes the baseline-`main` outcome, then dedupes and confirms equality. **A diff = FAIL.**
- **AC1** `a null buildings fetch drives BOTH shadow + timeline to data-unavailable` — RED: from one shared fetch, both paths must reproduce today's `null` behaviour.
- **AC2** `does NOT re-invoke the RPC for a 2nd request with the same centroid+radius` — RED: no buildings cache today.
- **AC2** `collapses co-located venues to a single building RPC (shared cache key)` — RED: @4dp shared key not implemented.
- **AC2** `never caches a null buildings result as a success` — RED: cache-only-success rule not yet present.
- **AC2** `serves a 2nd request in the SAME 15-min bucket from cache (no RPC)` — RED: no sun-compute cache today.
- **AC2** `recomputes when the request crosses into a NEW 15-min bucket` — RED: bucket-keyed recompute not implemented.
- **AC2** `returns a cached outcome byte-equal to the uncached compute` — RED: cache transparency.
- **AC2/R-012** `preserves honest weatherUpdatedAt for a cached future-planner bucket` — RED: freshness must survive caching.

### API Tests — route parity + edge-cacheability + rate-limit relocation (8 tests)

**File:** `nextjs-app/test/unit/api/venues-route-caching.atdd.test.ts`

Drives the list + detail `GET` handlers directly (same pattern as `venues-route.test.ts` / `venue-detail-route.test.ts`).

- **AC3** `returns a public s-maxage=30 Cache-Control the edge can honour` — RED until the dynamic header read is gone.
- **AC3** `does not vary the response on x-forwarded-for (limiter moved to the edge)` — RED: handler still reads the IP today (`route.ts:216-222`).
- **AC3** `still enforces the 429 rate-limit from the relocated limiter` — RED placeholder: dev wires to the relocated limiter (middleware or extracted fn); DoS protection must NOT be lost.
- **AC3** `preserves the ETag + 304 if-none-match path` — guards the freshness contract through the relocation.
- **AC3** `preserves X-Sun-Data-Source + X-Weather-Updated-At on the list route`.
- **AC2** `sets a public s-maxage Cache-Control on the detail route` — detail must benefit equally.
- **AC2** `preserves X-Sun-Data-Source + X-Weather-Updated-At on the detail route`.
- **Regression** `keeps the default seed detail DTO byte-identical (no behaviour drift)`.

---

## Mock Requirements

### `get_buildings_near_point` Supabase RPC (engine boundary)

- **Boundary:** `@/lib/supabase/server` → `supabaseServiceRole.rpc` / `getSupabaseServiceRole().rpc` (hoisted `mocks.rpc`).
- **Success:** `{ data: BuildingRow[], error: null }` (empty `[]` = no shadow casters → fully sunlit).
- **Failure:** `{ data: null, error: { message } }` → must yield `geometry-only` freshness, and must NOT be cached as a success.
- **Notes:** Count calls where `mock.calls[i][0] === 'get_buildings_near_point'` — this is the RPC-volume acceptance signal. **Do NOT mock `@/lib/solar` directly** (dynamic-import bypass).

### Met.no weather (engine boundary)

- **Boundary:** `@/lib/weather/met-no-service` → `getForecast` (hoisted `mocks.getForecast`).
- **Success:** `[weatherSlice({ cloudCover: 10, isForecast: false, createdAt })]`.
- **Notes:** Already cached at the `fetch` layer (`next:{revalidate:300}`) — NOT the bottleneck; left untouched. `weatherUpdatedAt` must stay honest through the sun-compute cache.

### Relocated rate-limiter (AC3, Option A)

- After relocation the limiter lives in `middleware.ts` (Edge) or an extracted function. The 429-still-enforced test must drive the limiter's NEW public surface — adjust the import to wherever the dev relocates it; do not delete the assertion.

---

## Implementation Checklist (maps tests → tasks; un-skip as each goes green)

### Test: ONCE-per-venue building fetch + byte-identical snapshot (AC1, P0)
- [ ] Add a buildings-aware path in `shadow-calculation-service.ts` (`*FromBuildings` overloads, default) so the RPC runs once and feeds both shadow + timeline.
- [ ] In `computeRealSunEngine`, fetch buildings once; pass into both calcs; correct the two FALSE comments (~51-56, ~317).
- [ ] Capture the pre-refactor `SunEngineOutcome` on baseline `main`; paste into `toMatchInlineSnapshot`; confirm it still matches after dedupe.
- [ ] Un-skip the AC1 block. Run: `npx vitest run test/unit/services/sun-engine-caching.atdd.test.ts`.

### Test: buildings cache hit / co-located key / null-not-cached (AC2, P0/P1)
- [ ] Wrap the buildings fetch in a server cache keyed on `(roundedCentroidLat@4dp, roundedCentroidLng@4dp, radiusMeters)`, long revalidate (recommend 24h); `unstable_cache` preferred, process-Map fallback (state which + why).
- [ ] Cache only non-null successes (never pin a `null`/transient failure).
- [ ] Un-skip the buildings-cache tests.

### Test: per-bucket sun-compute cache hit / new-bucket recompute / transparency / honest freshness (AC2, P0/P1/P2)
- [ ] Cache `SunEngineOutcome` keyed on `(venue.id, roundedTimeBucket@15min, stockholmDayKey)`; revalidate 15 min (one slider bucket).
- [ ] Apply inside the engine so BOTH routes inherit it; verify `weatherUpdatedAt` carries through.
- [ ] Un-skip the sun-compute-cache tests.

### Test: edge-cacheable list + 429-still-enforced + ETag/304 + headers (AC3, P0/P1)
- [ ] Option A: move the per-IP limiter out of the GET handler header read into `middleware.ts` (create if absent, scope `/api/venues*`) or platform firewall.
- [ ] Confirm the handler no longer reads `x-forwarded-for`/`x-real-ip` (identical ETag across IPs); the 429 path still fires from the relocated limiter.
- [ ] Preserve ETag/304 + `X-Weather-Updated-At` / `X-Sun-Data-Source`.
- [ ] Document the chosen Option + TTLs + staleness window in Completion Notes AND `architecture.md` Caching Strategy (or a route-file comment).
- [ ] Un-skip the AC3 + detail-parity blocks.
- [ ] If Option B (precompute) is the only viable path → **STOP, report `needs-human`** (scope expansion).

### Manual perf evidence (Task 5 — NOT a CI assert)
- [ ] On the real engine path, capture cold/warm timings for list + detail BEFORE/AFTER + the ≈14→7 RPC reduction in Completion Notes. If the real path is unreachable here, record perf evidence as deferred to a maintainer/preview run and rely on the unit RPC-count + cache-hit tests as the in-CI acceptance signal. **Do not fabricate timings.**

---

## Running Tests

```bash
# RED-phase scaffolds (currently all skipped — un-skip per task as it goes green)
cd nextjs-app && npx vitest run test/unit/services/sun-engine-caching.atdd.test.ts test/unit/api/venues-route-caching.atdd.test.ts

# Full gate (Task 6)
cd nextjs-app && npx tsc --noEmit && npx eslint . --quiet && npx vitest run
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅
- 18 failing-by-design tests authored across 2 files, all `*.skip` so CI stays green.
- Collected SKIPPED (18 skipped / 0 failing); `tsc --noEmit` 0 errors.
- Mocks the adapter boundary (dynamic-import-safe); no live Supabase / Met.no.
- Byte-identical guard is an inline snapshot — **a diff is a FAIL, not a rebaseline**.

### GREEN Phase (DEV — next)
Pick one block, un-skip it, implement the matching task until it passes, repeat. Keep the default flag-off seed path byte-identical (existing `venues-route.test.ts` / `venue-detail-route.test.ts` assert it).

### REFACTOR Phase
After all un-skipped, ensure tsc/eslint/vitest stay green, then move to `review` via `scripts/story-review.sh 9-3` (visual gate auto-skips — no mapped screen ID).

---

## Notes

- **No E2E, no visual gate, no data factories/fixtures/data-testids** — backend/perf story, no UI surface (like Stories 8.3/8.6). The acceptance signal is call-count + cache-key behaviour + byte-identical output, plus MANUAL latency evidence in Completion Notes.
- **Recording mode not used** — backend stack → AI generation from source + acceptance criteria (per step-02 rule: backend always uses AI generation).
- **`computeRealSunEngine` is not exported** — scaffolds drive the engine through the public `applyRealSunEngine` wrapper, mirroring `sun-engine.test.ts`. If 9.3 adds a cached wrapper, keep `applyRealSunEngine` as the test entry; adjust the import rather than widening the export surface just to satisfy a test.
- **Defaults applied** (per story Open Questions): `unstable_cache`; `*FromBuildings` overloads; AC3 Option A; TTLs 15 min (sun) / 24h (buildings) / 30s (CDN). The dev may ratify/adjust at review and must record the final numbers.
- The relocated-limiter 429 test is a placeholder against the limiter's new home — the dev binds it to wherever Option A moves the limiter; the assertion (429 still fires) must not be dropped.

---

**Generated by BMad TEA Agent** - 2026-06-30
