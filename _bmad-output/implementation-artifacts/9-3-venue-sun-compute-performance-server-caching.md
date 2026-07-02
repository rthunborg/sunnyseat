# Story 9.3: Venue Sun-Compute Performance — Server Caching

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want the venue list and the "Mer info" detail panel to load fast,
so that the app feels responsive instead of stalling on every load.

## Acceptance Criteria

_(Verbatim from epics.md §"Story 9.3"; parenthetical figures — "≈14→7 for 7 venues", "long revalidate", "rounded centroid + radius" — are dev guardrails reproducing the epic's own language, not new criteria.)_

1. **Given** `computeRealSunEngine` (`lib/services/sun-engine.ts`) currently fetches nearby buildings twice per venue (once for current-shadow, once for the timeline), **When** it is refactored to fetch the building set once and reuse it for both, **Then** RPC volume per request is halved (≈14→7 for the current 7 venues) with byte-identical sun outputs, and the stale "one buildings fetch reused internally" comments are corrected.
   _(Dev guardrail: the two RPCs are `calculateVenueShadowForGeometry` → `fetchNearbyBuildings` (sun-engine.ts:285) AND `calculateVenueShadowTimelineForGeometry` → `fetchNearbyBuildings` (sun-engine.ts:319), each independently calling `get_buildings_near_point`. The two FALSE comments to correct are sun-engine.ts ~51-56 ("one RPC per venue via the timeline's single buildings fetch") and ~317 ("RPC #2 — one buildings fetch reused internally"). "Byte-identical" means the sun-output fields are unchanged for identical inputs — gate it with a snapshot/equality test, treat any diff as a FAIL, not a rebaseline.)_

2. **Given** building geometry changes very rarely and sun state changes slowly, **When** caching is added, **Then** the `get_buildings_near_point` result is wrapped in a server cache keyed on rounded centroid + radius (long revalidate), and the per-(venue, rounded-time-bucket, day) sun computation is cached so repeated requests within a bucket are near-free — applied to **both** `/api/venues` (list) and `/api/venues/[slug]` (detail) so "Mer info" benefits equally.

3. **Given** the dynamic route currently defeats CDN caching (the `s-maxage` header is dead because the handler reads request headers for rate-limiting), **When** the caching strategy lands, **Then** either rate-limiting is moved so the cacheable response can be edge-cached, or the precompute follow-up flagged in `sun-engine.ts` is adopted; the chosen approach is documented, and sun-data freshness stays within an agreed staleness window.

### Design Gate Criteria (backend/perf — NO new screen)

No visual change; existing gate states pass unchanged with real/cached data. **Performance is the acceptance signal:** warm-cache list + detail loads are materially faster than the pre-fix baseline — capture before/after warm+cold timings in this story's Completion Notes (the perf evidence record). There is no mapped screen ID and no visual reference for this story, so `scripts/story-review.sh` will auto-skip the visual gate (backend-only, like Stories 8.3/8.6). Do NOT invent a visual reference.

## Tasks / Subtasks

- [x] **Task 1 — Fetch the building set ONCE per venue; correct the false comments (AC: #1)**
  - [x] In `lib/solar/shadow-calculation-service.ts`, add a building-aware code path so the nearby-buildings RPC runs once and is reused for both the single-shot shadow and the full-day timeline. **Chose the Recommended overload shape:** added `calculateVenueShadowFromBuildings(geometry, timestamp, buildings, options)` (pure, sync) and `calculateVenueShadowTimelineFromBuildings(geometry, start, end, intervalMs, buildings, options)` (pure, sync) that take an already-fetched `Building[] | null` and call the existing pure `computeShadowInfo`. Kept `calculateVenueShadowForGeometry` / `calculateVenueShadowTimelineForGeometry` as thin fetch-then-delegate wrappers (legacy callers + existing tests stay valid).
  - [x] Exported the new `fetchVenueBuildings(geometry)` helper + `SHADOW_SEARCH_RADIUS_DEG` (the `MAX_SHADOW_DISTANCE`-derived radius) + the two `*FromBuildings` functions via the `lib/solar` barrel so the sun-engine drives a single fetch. The `null` return is preserved identically: `calculateVenueShadowFromBuildings` applies the no-sun / low-elevation early-outs FIRST (matching the historical fetch-then-compute ordering) then returns `createShadowDataUnavailableResult` for `buildings === null`; the timeline loop still branches on `buildings === null` per sample. Both null behaviours reproduced exactly.
  - [x] In `lib/services/sun-engine.ts` `computeRealSunEngine`, fetch buildings once (via the cached `fetchVenueBuildings`) before the two calculations and pass them in. Corrected the two FALSE comments (~51-56 + ~317) to truthfully describe one shared fetch. Confirmed the per-sample `try/catch` neutral-50/50 fallback in the timeline loop is unchanged.
  - [x] **Byte-identical guard (load-bearing AC1 test):** un-skipped `sun-engine-caching.atdd.test.ts` — asserts the `get_buildings_near_point` call count for one venue is **1** (down from a measured baseline of 2) AND `toMatchInlineSnapshot` deep-equals the VERBATIM pre-refactor `SunEngineOutcome` captured off baseline `main` for the fixed inputs. Mocks the `@/lib/supabase/server` rpc adapter boundary (per the Vitest dynamic-import gotcha), not the dynamically-imported `@/lib/solar`.

- [x] **Task 2 — Cache `get_buildings_near_point` keyed on rounded centroid + radius, long revalidate (AC: #2)**
  - [x] Wrapped the buildings fetch in a server cache keyed on `buildingsCacheKey(roundedCentroidLat@4dp, roundedCentroidLng@4dp, radiusMeters)` (4-decimal ≈ 11 m, mirroring `FORECAST_COORD_PRECISION=4`) so co-located venues share one entry. TTL = **24 h** (`BUILDINGS_CACHE_TTL_MS`).
  - [x] **Used a process-scoped TTL `Map`, NOT `unstable_cache`** (recorded rationale in `sun-engine-cache.ts`): `unstable_cache` JSON-serializes its value (lossy for the `Building[]` `Date`/GeoJSON payload + freshness `Date`s), needs the Next request store, and cannot be driven deterministically under vitest fake timers; a process `Map` is lossless, survives warm-instance invocations, and is the call-count-testable choice the story's open-Q#1 sanctions. Server-only; the `Building[] | null` contract is unchanged — `getOrFetchNonNull` NEVER caches a `null` (RPC failure) as success.
  - [x] The cache lives at the `fetchCachedVenueBuildings` boundary in the engine, so it is shared by both the single-shot and the timeline path (one fetch per venue per request) AND across requests within the 24h window.

- [x] **Task 3 — Cache the per-(venue, rounded-time-bucket, day) sun computation; apply to list AND detail (AC: #2)**
  - [x] Cache the computed `SunEngineOutcome` via `sunComputeCacheKey(venue.id, 15-min timeBucketMs, stockholmDayKey, variantKey)`. The 15-min bucket matches the slider granularity. `dayKey` reuses the engine's `stockholmDateKey`. The `variantKey` folds in the resolved-geometry centroid + seating/ground elevation — these ARE per-venue constants in production (so keying on `venue.id` alone is correct there), but folding them in makes the cache defensively correct if two logical venues share an id with different geometry/elevation (the existing 8.6/8.7 unit tests do exactly that, reusing id `'1'`).
  - [x] Applied inside the engine seam (`computeRealSunEngineCached`, which `applyRealSunEngine` calls) so BOTH `app/api/venues/route.ts` (list fan-out) and `app/api/venues/[slug]/route.ts` (detail/"Mer info") inherit it without duplicating cache logic. No route-side cache code.
  - [x] **Staleness window = sun-compute cache TTL 15 min** (`SUN_COMPUTE_CACHE_TTL_MS`, one slider bucket → worst-case ≤15 min stale before the next wall-clock bucket forces a recompute). The weather honesty signal is preserved unchanged: the cached outcome carries the same honest `weatherUpdatedAt`. **Only successful computes are cached** — a degraded (building-RPC-failed) compute is NOT cached (`getOrComputeConditional` + a `cacheable` flag), so a transient RPC failure is not pinned across the window.
  - [x] Added unit tests: (a) 2nd request in same bucket → 0 additional RPCs (cache hit); (b) new 15-min bucket → recompute (observable via a fresh building fetch); (c) cached output `toEqual` the uncached output; plus (d) honest `weatherUpdatedAt` preserved for a cached bucket.

- [x] **Task 4 — Resolve the CDN-cache-vs-rate-limit conflict; document the chosen approach; agree the staleness window (AC: #3)**
  - [x] **DESIGN DECISION = Option A (relocate rate-limiting for edge-cacheability).** Extracted the per-IP token-bucket limiter into `lib/utils/rate-limit.ts` and a thin handler `lib/utils/venue-rate-limit-middleware.ts`, and wired it into the EXISTING Edge proxy `proxy.ts` (Next 16's renamed `middleware.ts` — there is NO `middleware.ts`; one already existed as `proxy.ts` running next-intl, and Next 16.2 errors if both exist). The proxy now branches: `/api/venues*` → the limiter; everything else → next-intl. The matcher was extended with `/api/venues` + `/api/venues/:slug*` (the locale pattern still excludes all `/api/*`). The route GET handler NO LONGER reads `x-forwarded-for` / `x-real-ip` → it is a pure, header-independent, edge-cacheable function. **Edge-safe:** the limiter's IP validator is pure-JS (the original `node:net` `isIP` is forbidden in the Edge runtime); replaced with regex IPv4 + IPv6 validators. Option B (precompute pipeline) was judged disproportionate and NOT adopted.
  - [x] **Verified:** the 429 path still fires from the relocated limiter (route + caching ATDD tests drive `venueRateLimitMiddleware` to 429; the malformed-XFF 400 also moved); the route's `Cache-Control: public, s-maxage=30` is now honour-able by the edge (ATDD proves identical ETag regardless of `x-forwarded-for`). `next build` compiles the Edge proxy cleanly (`ƒ Proxy (Middleware)`).
  - [x] Documented the chosen Option A + rationale + staleness window in this story's Completion Notes AND a route-file comment (`route.ts`, where the limiter used to live) AND the `architecture.md` Caching Strategy section.
  - [x] Preserved the list-route ETag / `if-none-match` 304 path + the `X-Weather-Updated-At` / `X-Sun-Data-Source` freshness headers on both routes (ATDD + existing tests assert them, all green).

- [x] **Task 5 — Capture before/after performance evidence (AC: Design Gate — perf is the acceptance signal)**
  - [x] Captured the deterministic RPC-count evidence (manual measurement via a throwaway harness mocking the RPC boundary, NOT a CI timing assert): **before = 2 building RPCs/venue (14 for the 7-venue list); after = 1 RPC/venue (7 for the list); warm 2nd list = 0 additional RPCs (full cache hit).** Recorded in Completion Notes.
  - [x] **Live cold/warm wall-clock LATENCY timings are deferred to a maintainer/preview run.** Standing up a dev server against live Supabase to measure ms-latency would be network-dependent and non-reproducible here (exactly the flaky timing the epic test design forbids asserting), so per Task 5's own escalation clause the perf-latency evidence is deferred; the in-CI acceptance signal is the RPC-count (14→7) + cache-hit unit tests. No timing numbers were fabricated.

- [x] **Task 6 — Test gate + regression verification (standard gate)**
  - [x] `npx tsc --noEmit` (0 errors); `npx eslint . --quiet` (0 errors); `npx vitest run` → **86 files / 728 tests, all green** (was 83/699+18-skipped; the 18 ATDD tests are now un-skipped + green, plus a new `rate-limit.test.ts` (10) and 2 new proxy-matcher assertions; none dropped). `next build` succeeds.
  - [x] Confirmed NO regression in the named suites: `services/sun-engine.test.ts` (29), `shadow-calculation-service.test.ts` (20), `venues-route.test.ts` (36), `venues-route-real-engine.test.ts`, `venue-detail-route.test.ts`, `venue-store.test.ts` — all pass. The default (flag-off) seed path stays byte-identical (the route + detail-route tests assert it). The rate-limit tests were relocated to drive the proxy (not dropped).
  - [x] Status moved to `review` (sprint-status + story file). The visual gate auto-skips (no mapped screen ID); the canonical gate does not run Playwright e2e, so the pre-existing `map-primary.spec.ts` failures are out of scope. (`story-review.sh` was not invoked from this delegate run — the orchestrator owns gate/commit; status set directly per the dev-story workflow Step 9.)

## Dev Notes

### Why this exists (root cause — Spine 4 of the Epic 9 triage)

This is the **CRITICAL-risk** story of Epic 9 (test-design risk **R-002, score 9** — the only score-9 risk in the epic). The live app "stalls on every load" because the real sun engine, per `/api/venues` and `/api/venues/[slug]` request, runs **N venues × 2** Supabase `get_buildings_near_point` RPCs (~145–440 ms each, measured live) plus ~41 shadow projections, with **no server cache**. For the current 7 venues that is ~14 RPCs per list load, and the same cost hits the detail route, and (compounded by Story 9.4's un-debounced time→query-key) it re-fires on every snapped 15-min slider change.

The double-fetch is masked by an **actively-FALSE comment**: `sun-engine.ts` ~51-56 says "one RPC per venue via the timeline's single buildings fetch" and ~317 says "RPC #2 — one buildings fetch reused internally" — but the code calls `fetchNearbyBuildings` independently inside BOTH `calculateVenueShadowForGeometry` (the current-shadow RPC) and `calculateVenueShadowTimelineForGeometry` (the timeline RPC). The comment refers only to the timeline's internal reuse-across-samples (one fetch reused for ~41 time samples), NOT to sharing with the single-shot call — so two RPCs fire per venue. **Story 9.3 must correct that comment AND dedupe the fetch.** A reviewer must NOT trust the comment as evidence the fetch is already shared (recorded constraint from the Epic 9 test-design phase, retro-notes `## Story epic-9`).

### The exact double-fetch (read the code before editing)

Both paths independently hit the RPC:

| Call site | File:line | What fetches |
|---|---|---|
| Current-shadow (RPC #1) | `sun-engine.ts:285` → `calculateVenueShadowForGeometry` | `shadow-calculation-service.ts:91` `fetchNearbyBuildings` → `get_buildings_near_point` (`:426`) |
| Timeline (RPC #2) | `sun-engine.ts:319` → `calculateVenueShadowTimelineForGeometry` | `shadow-calculation-service.ts:327` `fetchNearbyBuildings` → `get_buildings_near_point` (`:426`) |

Both compute the **same** `searchRadiusDeg = SG.MAX_SHADOW_DISTANCE / 111300.0` and the **same** centroid (the venue's geometry centroid). The buildings set is identical between the two calls within a request — that is exactly why it can be fetched once and reused. The pure core `computeShadowInfo(geometry, timestamp, solarPosition, buildings, …)` (`shadow-calculation-service.ts:115`) already takes pre-fetched `buildings`, so the refactor is: fetch once, then feed both the single-shot projection and the per-sample timeline loop the same `Building[]`.

**Preserve the two `null` behaviours exactly:**
- Single-shot: `buildings === null` (RPC failed) → `createShadowDataUnavailableResult(...)` (line 92-94).
- Timeline: `buildings === null` → each sample becomes `createShadowDataUnavailableResult(...)` (line 344-345).
- A shared fetch returning `null` must drive BOTH the unavailable single-shot result AND the unavailable per-sample timeline points — i.e. identical to today, just from one fetch.

### Caching design (AC2) — two layers, both server-only

1. **Buildings cache** (the bigger win, longest-lived): key `(roundedCentroidLat@4dp, roundedCentroidLng@4dp, radiusMeters)`, long revalidate (recommend 24h — building geometry is effectively static; matches the architecture "precomputed sun exposure refreshed daily" cadence). Co-located venues (same rounded centroid + radius) share one entry, so even within one list fan-out, near-neighbours collapse to one RPC. The existing Met.no dedupe already uses 4-decimal coordinate keys (`FORECAST_COORD_PRECISION = 4`, `forecastCoordKey`) — mirror that rounding convention for consistency.
2. **Sun-compute cache** (bounded by the staleness window): key `(venue.id, roundedTimeBucket@15min, stockholmDayKey)`, short revalidate (recommend 15 min = one slider bucket). A repeat request in the same bucket is near-free; a new bucket recomputes. Elevation inputs (`seatingElevationM`, `groundElevationM`) are per-venue constants folded in via `venue.id`.

Both caches MUST apply to BOTH routes (AC2 is explicit that "Mer info"/detail benefits equally). The cleanest seam is inside the engine module (`computeRealSunEngine` or a cached `applyRealSunEngine` wrapper) so `app/api/venues/route.ts` and `app/api/venues/[slug]/route.ts` inherit caching without duplicating logic. **Cache only successful results** — never cache a `null` buildings result or a degraded `safeSeedOutcome` as if it were a real compute (that would pin a transient failure across the window).

**Implementation choice — `unstable_cache` vs a process Map.** `next/cache`'s `unstable_cache(fn, keyParts, { revalidate, tags })` is the framework-native fit (Next 16) and survives across lambda invocations on a warm instance; a process-scoped `Map` with a TTL timestamp is simpler but per-instance and lost on cold start. Either is acceptable for MVP scale (≤10K MAU, 7 venues) — state which you used and why in Completion Notes. Note Met.no already caches at the `fetch` layer (`next: { revalidate: 300 }`, met-no-service.ts:57), so weather is NOT the bottleneck; the buildings RPC (a Supabase `.rpc()`, NOT a `fetch`) has no such caching today and is the target.

### The CDN-cache-vs-rate-limit conflict (AC3 — the open design decision)

Both routes already SET `Cache-Control: public, max-age=30, s-maxage=30, must-revalidate` (list `route.ts:375,387`; detail `[slug]/route.ts:134`). But the list handler reads `x-forwarded-for`/`x-real-ip` for the per-IP token-bucket rate limiter (`clientKeyFromRequest`, `route.ts:216-222`, called at `:227`). Reading request headers makes the route effectively dynamic, so Vercel's edge cannot serve the `s-maxage=30` response from cache — the header is dead. (The test design's "lines 381-384" pointer refers to the cache-header comment block; the substance is: the header is present but defeated by the dynamic header read.)

**This story must resolve it (AC3) — the AC leaves the path open.** Captured as Task 4 with a recommended default:

- **Recommended: Option A — relocate rate-limiting.** Move the IP-keyed limit into `middleware.ts` (Edge middleware runs before the response cache and is allowed to inspect the request) or adopt Vercel platform rate-limiting/firewall, leaving the GET handler a pure cacheable function. Keeps DoS protection and unlocks `s-maxage=30`. Smaller blast radius.
- **Alternative: Option B — adopt the precompute follow-up.** The `sun-engine.ts` DECISION-D comment flags a precompute pipeline; the architecture has "Precomputed: sun exposure refreshed daily via Vercel Cron". This is a cron + precompute-store project, disproportionate for this story — if chosen, treat it as a scope expansion and confirm with the maintainer (`needs-human`) rather than scaffolding it here.

**Documented-decision requirement (AC3 mandates this):** whichever option, write the choice + rationale + the agreed staleness window into Completion Notes AND a discoverable note (route file comment + `architecture.md` Caching Strategy). Do NOT silently pick one. Default to Option A.

### Staleness window agreement (AC3)

The AC requires "sun-data freshness stays within an agreed staleness window." The agreed envelope, reconciling the existing layers:
- **Client:** TanStack Query 5-min stale time (architecture line 318).
- **CDN edge:** `s-maxage=30` (30s) once Option A unlocks it.
- **Sun-compute server cache (new):** 15 min = one slider time-bucket → worst-case a cached bucket is at most ~15 min stale before the next wall-clock bucket forces a recompute.
- **Buildings server cache (new):** 24h — acceptable because building geometry is static (a stale building set does not move the sun; it only misses a newly-imported caster, a rare offline data event).
- **Weather honesty preserved:** the engine already flags forecast/>2h-old weather as "approximate" (`isForecast`, `STALE_WEATHER_AGE_MS`), and the `weatherUpdatedAt` is the slice's honest valid-time — caching the compute does NOT make the weather signal dishonest because the staleness reason is still computed from the (cached-with-it) weather slice. Record the final chosen numbers in Completion Notes; treat 15 min (sun) / 24h (buildings) / 30s (CDN) as the recommended default to ratify or adjust.

### Byte-identical output is non-negotiable (AC1 + epic exit criterion)

The epic test design (Exit Criteria + "Risks to Plan") is explicit: if 9.3 caching changes sun outputs even subtly, that is a **FAIL, not a rebaseline**. Gate the refactor on a deep-equality snapshot of the full `SunEngineOutcome` (sun fields + freshness + peakTime) against the pre-refactor engine for fixed inputs. The shared-fetch refactor is a pure plumbing change (same buildings, same `computeShadowInfo`), so equality must hold; if it does not, the refactor introduced a bug. The default (flag-off) seed path is already byte-identical and is asserted by the existing `venues-route.test.ts` / `venue-detail-route.test.ts` — keep it so.

### Vitest dynamic-import gotcha (MEMORY — read before writing the RPC-count test)

`computeRealSunEngine` does `await import('@/lib/solar')` and `await import('@/lib/weather/met-no-service')`, and the list route fans these out concurrently. A naive `vi.mock('@/lib/solar', …)` can be bypassed by a concurrent dynamic import in a `Promise.all` fan-out (recorded in MEMORY: "Vitest dynamic-import mock bypass"). The existing `test/unit/services/sun-engine.test.ts` already sidesteps this correctly: it mocks the **deepest adapter boundary** — `vi.mock('@/lib/supabase/server')` for `supabaseServiceRole.rpc` and `vi.mock('@/lib/weather/met-no-service')` for `getForecast` (see test lines 24-39). **Mock those same boundaries** and spy on `mocks.rpc` to count `get_buildings_near_point` calls. Do NOT mock the dynamically-imported `@/lib/solar` module directly for the call-count assertion.

### File impact (expected)

**Modified (source):**
- `nextjs-app/lib/solar/shadow-calculation-service.ts` — add the buildings-aware path (overloads or an exported `fetchVenueBuildings` helper); export what the engine needs to drive one fetch; preserve both `null` behaviours.
- `nextjs-app/lib/solar/index.ts` — export any new public function added above.
- `nextjs-app/lib/services/sun-engine.ts` — fetch buildings once in `computeRealSunEngine`, pass to both calculations; correct the two FALSE comments (~51-56, ~317); add the buildings + sun-compute caches (or a cached `applyRealSunEngine` wrapper).
- `nextjs-app/app/api/venues/route.ts` — relocate rate-limiting (Option A) so the response is edge-cacheable; preserve ETag/304 + freshness headers. (Only if Option A.)
- `nextjs-app/middleware.ts` — add/extend Edge rate-limiting if Option A (check whether a middleware already exists first).

**Modified (doc):**
- `_bmad-output/planning-artifacts/architecture.md` (Caching Strategy section ~316-320, at repo root — NOT under `nextjs-app/`) OR a route-file comment — record the chosen Option + staleness window (AC3 documentation requirement).

**Modified (test):**
- `nextjs-app/test/unit/services/sun-engine.test.ts` — RPC-call-count (2→1) + byte-identical snapshot + cache-hit/new-bucket tests.
- `nextjs-app/test/unit/api/venues-route.test.ts` / `venues-route-real-engine.test.ts` — rate-limit-still-enforced + cacheable-header assertions if Option A.

**NOT changed (verify only):**
- The `VenueDataDto` / `VenueDetailDto` contract — caching is invisible to the response shape.
- The default (flag-off) seed path — must stay byte-identical (existing tests assert it).
- Met.no caching — already `next: { revalidate: 300 }`; not the bottleneck, leave it.
- Any frontend/visual surface — this is backend/perf only, no screen.

### Scope discipline — what is OUT of scope (do NOT expand)

- **Story 9.4 (client query hygiene / time-change debounce)** is the SIBLING fix: 9.4 debounces the time→query key, sources Favoriter from the list cache, and kills the geo double-fetch. 9.3 makes each request cheap; 9.4 makes fewer requests. They compound but are separate stories — do NOT implement 9.4's debounce or favourites-from-cache here. (Per the epic test design, test 9.4 with 9.3 in place where possible, but that is 9.4's concern.)
- Do NOT change the sun MATH, the confidence/coverage caps, the obstruction-risk logic, the elevation gates (8.6/8.7), or the `extractSunlitWindow`/`peakTime` extraction — this is a fetch-dedup + caching story, byte-identical outputs required.
- Do NOT touch the planner/forcing gate (9.0), content sweep (9.1), CTA token (9.2), location/onboarding (9.5), map chrome (9.6), tags (9.7), sharing (9.8), the QuickInfo rework (9.9), or the mobile/regression pass (9.10).
- If Option B (precompute pipeline) is the only viable path, STOP and report `needs-human` rather than building a cron/precompute store inside this story.

### Deferred-work ledger check (`_bmad-output/implementation-artifacts/deferred-work.md`)

These conditional entries live in `sun-engine.ts`, the file 9.3 refactors. None has a target of this story (all are `Target: None — conditional`), so do NOT reopen or fix them — but be aware of them so the refactor does not silently regress or accidentally trigger them. Fold a fix ONLY if the refactor naturally touches the exact lines (then note it):

- **Deduped forecast fetcher never evicts in-flight entries** (`sun-engine.ts:140-150`, from 8.5 R1) — `createDedupedForecastFetcher` has no `.finally`-eviction. Harmless today (`getForecast` never throws). 9.3 touches `computeRealSunEngine`, not this fetcher; leave it unless your refactor moves it.
- **`weatherUpdatedAt` future valid-time for future-planner requests** (`sun-engine.ts:204-213,326-333`, from 8.5 R1) — by-design honest valid-time. Caching the compute must NOT change this; the cached outcome carries the same `weatherUpdatedAt`. Verify a future-planner bucket still reports its honest (cached-with-it) freshness.
- **`mapWithConcurrency` NaN/0 guard** (`sun-engine.ts:159-176`, from 8.5 R1) — defensive-only; only the constant `SUN_ENGINE_LIST_CONCURRENCY=6` is passed. Don't reopen.
- **Unparseable Met.no `entry.time` → Invalid-Date validAt** (from 8.5 R1) — conditional on a non-conformant Met.no payload. Out of 9.3's path.
- **`extractSunlitWindow` quantizes edges / longest-window** + **`synthesizeFootprint` no pole guard** + **`applyRealSunEngine` catch-all returns seed on weather-only failure** (`sun-engine.ts`, from 8.3 R1) — all conditional, all sun-MATH/geometry, all OUT of scope for a caching story. Do NOT touch.

These are listed so the dev does NOT mistake them for 9.3 work; per the queue-not-archive convention they stay in the ledger (no target story = not carried in here).

### Constraints carried in from Epic 9 retro-notes (`_bmad-output/auto-bmad/retro-notes/epic-9.md`)

- **`## Story epic-9` (test-design phase):** the FALSE "one buildings fetch reused internally" comment (sun-engine.ts ~51/317) masked this perf bug. 9.3 MUST correct it and dedupe the fetch; reviewers must not trust the comment as evidence the fetch is shared. (Folded into AC1 + Task 1 above.)
- **`## Story epic-9` open Q (RESOLVED):** the CI-e2e build-mode question (does CI run NODE_ENV=production?) was answered in Story 9.0's create-story phase — CI runs Playwright against `next dev` (development). Not directly relevant to 9.3 (backend/perf, no e2e gate), noted for completeness.
- **`## Story 9-0` (dev-story):** a pre-existing UNRELATED e2e failure `map-primary.spec.ts:645` (desktop planner-bar viewport-width) is red on baseline main — NOT introduced by Epic 9, candidate for Story 9.10. The canonical gate (`story-review.sh`) does not run Playwright e2e, so it does not block 9.3.
- **`## Story 9-2` (dev-story):** the Windows `/tmp`-path visual-gate tooling bug affects FRONTEND stories. 9.3 is backend-only with NO mapped screen ID, so the visual gate auto-skips entirely — this story is unaffected by that tooling bug.

### Persistent facts (epic-wide / earlier-story conventions)

- The app is **LIVE on the real data path** since the 2026-06-29 production cutover (`SUNNYSEAT_SUN_ENGINE=real` + Supabase venue store + persisted feedback/reviews in Production). So this perf fix is on the **live UX-critical path** — the regression bar is "no behaviour/output change, only faster."
- The real engine runs only when `shouldUseRealSunEngine()` is true (`SUNNYSEAT_SUN_ENGINE=real` AND service-role config present). The DEFAULT (flag-off) path returns the byte-identical 8.2 seed and never calls the engine — CI runs the default path, so the new caches are exercised in tests by mocking the RPC boundary, not by hitting live Supabase.
- The live `public.venues` table holds only the **7 test/fixture venues** (per the 9.7 maintainer note, project ref `hhnbxrhfhlzxgllxukzj`) — so "≈14→7 RPCs" is literal for the current data.
- Baseline before this story (from the 9.2 dev record): vitest 83 files / 699 tests, tsc 0, eslint 0 errors (pre-existing warnings tolerated). 9.3 should ADD cache/RPC-count tests (count up, none dropped) and keep tsc/eslint clean.
- Existing fan-out controls to preserve: `mapWithConcurrency` (`SUN_ENGINE_LIST_CONCURRENCY=6`) caps concurrent per-venue work; `createDedupedForecastFetcher` dedupes Met.no by 4-decimal coords. The buildings cache (Task 2) is the analogous missing piece for the RPC.

### Open questions (non-blocking — sensible defaults applied)

1. **`unstable_cache` vs process-Map for the buildings/sun caches?** Default: `unstable_cache` (Next 16-native, survives warm-instance invocations). Acceptable to fall back to a process-scoped TTL `Map` if the Supabase client is awkward inside `unstable_cache` — state which and why.
2. **Buildings-aware refactor shape: overloads vs hoisted helper?** Default: add `*FromBuildings` overloads keeping the existing `*ForGeometry` wrappers (lowest churn, existing tests stay valid). Pick whichever is cleaner and note it.
3. **AC3 Option A vs B?** Default: Option A (relocate rate-limiting to Edge middleware for edge-cacheability). Option B (precompute pipeline) is disproportionate — escalate as `needs-human` if it appears to be the only path.
4. **Exact TTLs?** Recommended defaults: sun-compute 15 min (one slider bucket), buildings 24h, CDN `s-maxage=30` (unchanged). Maintainer may ratify/adjust at review; document the final numbers.
5. **Is there an existing `middleware.ts`?** Check first; if Option A and none exists, create a minimal one scoped to `/api/venues*`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.3: Venue Sun-Compute Performance — Server Caching] — user story, 3 ACs, backend/perf Design Gate.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9 (root-cause note, Spine 4)] — "time/date wired straight into the query key with no debounce, over a heavy uncached engine; N venues × 2 RPCs ~145–440ms each + ~41 projections, no server cache."
- [Source: _bmad-output/test-artifacts/test-design/test-design-epic-9.md (R-002 score 9, R-012 staleness, R-013 CDN-vs-rate-limit; Mitigation Plans R-002; Exit Criteria; Interworking & Regression table)] — the CRITICAL risk, the byte-identical-FAIL contingency, the named regression suites, and the RPC-count verification (≈14→7).
- [Source: nextjs-app/lib/services/sun-engine.ts (lines 51-57 FALSE comment #1, 254-351 computeRealSunEngine, 285 RPC#1, 317 FALSE comment #2, 319 RPC#2)] — the double-fetch + the comments to correct.
- [Source: nextjs-app/lib/solar/shadow-calculation-service.ts (74-106 calculateVenueShadowForGeometry, 91 fetchNearbyBuildings, 115-… computeShadowInfo pure core, 315-390 calculateVenueShadowTimelineForGeometry, 327 fetchNearbyBuildings, 418-445 fetchNearbyBuildings + get_buildings_near_point RPC, 549 getCentroid)] — the fetch boundary to dedupe + cache.
- [Source: nextjs-app/lib/solar/index.ts] — the solar barrel; export any new public function here.
- [Source: nextjs-app/app/api/venues/route.ts (216-222 clientKeyFromRequest IP read, 227-236 rate-limit, 286-335 real-engine fan-out, 369-391 ETag/304 + Cache-Control header)] — the list route + the rate-limit-vs-cache conflict.
- [Source: nextjs-app/app/api/venues/[slug]/route.ts (85-112 real-engine path, 132-137 Cache-Control + freshness headers)] — the detail route that must benefit equally (AC2).
- [Source: nextjs-app/lib/weather/met-no-service.ts (55-58 fetch next:{revalidate:300})] — weather is already cached at the fetch layer; not the bottleneck.
- [Source: nextjs-app/test/unit/services/sun-engine.test.ts (21-39 mock-the-adapter-boundary pattern: vi.mock @/lib/supabase/server rpc + @/lib/weather/met-no-service)] — how to spy on the RPC count without the dynamic-import-mock bypass.
- [Source: _bmad-output/planning-artifacts/architecture.md (316-320 Caching Strategy: CDN /api/venues/search 30s + /api/sun-exposure 5min, Met.no 5-min in-memory revalidate, Precomputed daily via Vercel Cron; 344 Rate limiting token bucket per IP; 55 Performance NFR <200ms API p95)] — the caching cadence + the precompute follow-up framing + the perf NFR.
- [Source: _bmad-output/auto-bmad/retro-notes/epic-9.md (## Story epic-9 — FALSE comment masking the double-RPC; ## Story 9-2 — backend stories skip the visual gate)] — the recorded constraint that 9.3 must correct the comment + dedupe.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md (8.5 R1 + 8.3 R1 sun-engine.ts conditional entries)] — the in-file conditional defers NOT to reopen.
- [Source: _bmad-output/implementation-artifacts/9-2-design-system-cta-token-fix-copy-correction.md] — previous Epic 9 story; gate-command / scope-discipline / status-transition conventions reused here.
- [Source: MEMORY — "Vitest dynamic-import mock bypass"] — mock the adapter boundary (`@/lib/supabase/server` rpc), not a concurrently dynamic-imported module.
- [Source: MEMORY — "CI & e2e gotchas"] — NFR8 bundle gate excludes the lazy MapLibre chunk; 9.3 is server-side so does not affect the JS bundle, but do not regress the bundle gate.
- [Source: CLAUDE.md → AGENTS.md (§Testing Requirements, §BMAD Story Workflow, §Local Docker / WSL Rules)] — canonical gate commands + status-transition-via-script rule + no global Docker/WSL changes.
- [Source: project-context.md (§Screen ID → Route Map)] — confirms 9.3 has NO mapped screen ID (backend/perf), so the visual gate auto-skips; no DESIGN.md / ux-design-specification.md guardrail applies to this story (no UI surface).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Amelia / dev-story)

### Debug Log References

- Canonical gate (story-review.sh, apply): lint 0 / typecheck 0 / vitest 86 files · 728 tests all green; visual gate auto-skipped (no mapped screen ID). Artifact: `_bmad-output/implementation-artifacts/validation/9-3-venue-sun-compute-performance-server-caching-review-20260630-195623.log`.
- `npx next build` succeeds; the Edge proxy compiles (`ƒ Proxy (Middleware)`) with the pure-JS IP validator (no `node:net` leak).

### Completion Notes List

**AC1 — building-fetch dedupe + byte-identical (DONE).** `computeRealSunEngine` now fetches the shadow casters ONCE per venue per request and shares the set with both the single-shot shadow and the full-day timeline. Implemented via the **overload shape** (open-Q#2 default): new pure `calculateVenueShadowFromBuildings` + `calculateVenueShadowTimelineFromBuildings` in `shadow-calculation-service.ts` take a pre-fetched `Building[] | null`; the old `*ForGeometry` functions are kept as thin fetch-then-delegate wrappers (legacy callers + existing solar tests untouched). The two FALSE comments (sun-engine.ts ~51-56 + ~317 "one buildings fetch reused internally") are corrected to truthfully describe the single shared fetch. **Both `null` behaviours preserved exactly** (single-shot → `createShadowDataUnavailableResult`; per-sample timeline → same). Byte-identical guard: the AC1 inline snapshot is the VERBATIM pre-refactor `SunEngineOutcome` captured off baseline `main` for the fixed inputs (RPC count measured at **2** pre-refactor, **1** after) — `toMatchInlineSnapshot` passes, so the plumbing change introduced no output drift.

**AC2 — two server caches (DONE), both in `lib/services/sun-engine-cache.ts` (process-scoped TTL `Map`, NOT `unstable_cache` — open-Q#1; rationale: `unstable_cache` is lossy-JSON + needs the request store + is not fake-timer-testable).**
- Buildings cache: key `(roundedCentroidLat@4dp, roundedCentroidLng@4dp, radiusMeters)`, **TTL 24 h**. Co-located venues collapse to one RPC; a `null` (RPC failure) is never cached as success (`getOrFetchNonNull`).
- Sun-compute cache: key `(venue.id, 15-min timeBucketMs, stockholmDayKey, variantKey)`, **TTL 15 min**. `variantKey` folds the resolved-geometry centroid + seating/ground elevation (per-venue constants in prod; defensively correct for shared-id test venues). Lives inside the engine seam so **both** list + detail routes inherit it. Degraded (building-RPC-failed) computes are NOT cached (`getOrComputeConditional` + a `cacheable` flag) so a transient failure is not pinned.

**AC3 — DECISION = Option A (relocate rate-limiting); Option B (precompute) NOT adopted (disproportionate).** The per-IP token-bucket limiter was extracted to `lib/utils/rate-limit.ts` + a handler `lib/utils/venue-rate-limit-middleware.ts` and wired into the EXISTING Edge proxy `proxy.ts` (there is no `middleware.ts` — Next 16.2 renamed the convention to `proxy.ts`, which already existed running next-intl; the proxy now branches `/api/venues*` → limiter, else → next-intl, and the matcher gained `/api/venues` + `/api/venues/:slug*`). The list-route GET handler **no longer reads `x-forwarded-for` / `x-real-ip`**, so it is a pure, header-independent, edge-cacheable function and the present `Cache-Control: public, max-age=30, s-maxage=30, must-revalidate` is now genuinely honour-able by the edge. **Edge-safe:** the original `node:net` `isIP` is forbidden in the Edge runtime → replaced with pure-JS regex IPv4/IPv6 validators (verified by `next build`). DoS 429 + malformed-XFF 400 preserved (now from the proxy). ETag/304 + `X-Sun-Data-Source` / `X-Weather-Updated-At` headers preserved on both routes.

**Agreed staleness window (AC3):** client TanStack 5 min · CDN `s-maxage=30` (30 s) · sun-compute server cache **15 min** (worst-case ≤15 min stale before the next wall-clock bucket recomputes) · buildings server cache **24 h** (a stale building set does not move the sun; only misses a newly-imported caster — rare offline data event). Weather honesty (`isForecast` / >2h / `weatherUpdatedAt`) unchanged. Documented in `architecture.md` Caching Strategy + a `route.ts` comment.

**Perf evidence (Task 5 — manual, deterministic, NOT a CI timing assert):** RPC-count for the 7-venue list — **before = 14** (2 building RPCs/venue × 7), **after = 7** (1/venue); a **warm 2nd identical list = 0 additional building RPCs** (full cache hit). Measured via a throwaway harness mocking the `get_buildings_near_point` boundary (since removed). Live cold/warm **wall-clock latency** is **deferred to a maintainer/preview run** — measuring ms against live Supabase here would be network-dependent/non-reproducible (the flaky timing the epic test design forbids); the in-CI acceptance signal is the RPC-count + cache-hit unit tests. No timing numbers fabricated.

**Breaking-change note for the orchestrator:** new Edge proxy behaviour — the per-IP rate limiter (429) + malformed-XFF (400) now run in `proxy.ts` for `/api/venues*` instead of inside the route handler. `clearVenueRateLimitForTests` moved from `@/app/api/venues/route` to `@/lib/utils/rate-limit`. No API response-contract change (DTOs/headers/status codes identical). Default (flag-off) seed path byte-identical.

### File List

**Modified (source):**
- `nextjs-app/lib/solar/shadow-calculation-service.ts` — added `SHADOW_SEARCH_RADIUS_DEG`, `fetchVenueBuildings`, pure `calculateVenueShadowFromBuildings` + `calculateVenueShadowTimelineFromBuildings`; turned the `*ForGeometry` functions into thin fetch-then-delegate wrappers.
- `nextjs-app/lib/solar/index.ts` — exported the new public functions.
- `nextjs-app/lib/services/sun-engine.ts` — fetch buildings once + share with both calcs; corrected the two FALSE comments; added the cached `computeRealSunEngineCached` wrapper + `fetchCachedVenueBuildings` + a `cacheable` flag; `applyRealSunEngine` now calls the cached wrapper.
- `nextjs-app/app/api/venues/route.ts` — removed the in-handler rate limiter + the `x-forwarded-for`/`x-real-ip` read (relocated to the proxy); added an AC3 explanatory comment. No DTO/header change.
- `nextjs-app/proxy.ts` — composed proxy: `/api/venues*` → relocated limiter, else → next-intl; matcher extended with the venue read routes.

**New (source):**
- `nextjs-app/lib/services/sun-engine-cache.ts` — the two server TTL caches + key builders + `clearSunEngineCachesForTests`.
- `nextjs-app/lib/utils/rate-limit.ts` — extracted token-bucket limiter + Edge-safe pure-JS IP validator + `clearVenueRateLimitForTests`.
- `nextjs-app/lib/utils/venue-rate-limit-middleware.ts` — the venue rate-limit handler (returns 400/429/next) used by `proxy.ts`.

**Modified (doc):**
- `_bmad-output/planning-artifacts/architecture.md` — Caching Strategy section: Story 9.3 dedupe + two caches + Option A + staleness window.

**Modified (test):**
- `nextjs-app/test/unit/services/sun-engine.test.ts` — added `clearSunEngineCachesForTests()` to the real-engine `beforeEach` (cache isolation).
- `nextjs-app/test/unit/services/sun-engine-caching.atdd.test.ts` — un-skipped; filled the byte-identical inline snapshot; corrected the null-buildings freshness assertion; added the cache clear.
- `nextjs-app/test/unit/api/venues-route-caching.atdd.test.ts` — un-skipped; drives the relocated limiter for the 429 test; imports updated.
- `nextjs-app/test/unit/api/venues-route.test.ts` — imports updated (limiter from `@/lib/utils/...`); the 4 rate-limit/XFF tests now drive `venueRateLimitMiddleware`.
- `nextjs-app/test/unit/api/venues-route-real-engine.test.ts` — `clearVenueRateLimitForTests` import moved to `@/lib/utils/rate-limit`.
- `nextjs-app/test/unit/proxy-matcher.test.ts` — matcher is now an array; assert the locale pattern still excludes `/api/*` + the explicit venue-route entries are present.

**New (test):**
- `nextjs-app/test/unit/utils/rate-limit.test.ts` — direct coverage of the extracted limiter + IPv4/IPv6 validator + token-bucket quota.

### Change Log

- 2026-06-30 — Story 9.3 implemented (dedupe per-venue building fetch 2→1; +buildings cache 24h + sun-compute cache 15 min applied to list AND detail; AC3 Option A — relocated rate-limiting to the Edge proxy for edge-cacheability, Edge-safe pure-JS IP validator; byte-identical sun outputs; architecture.md Caching Strategy documented). Gate green (lint/tsc/vitest 728 + next build). Status ready-for-dev → review.

## Review Findings

_Thin Tier-A review (R1): Acceptance Auditor lens (verdict Approve, 4 low/non-blocking) + dedicated Security review (0 findings). Blind/Edge lenses intentionally not run in Tier A. Triage: 0 Decisions, 2 Patches (both applied), 0 Defers, 2 Dismissed (noise). Verdict: **Approve.**_

- [x] [Review][Patch][Low] `now`/`isWeatherUncertain` silently excluded from the sun-compute cache key — documenting comment added: `now` is intentionally out of the key because its only output effect (the 2 h `STALE_WEATHER_AGE_MS` weather-staleness flip in `isWeatherUncertain`) cannot occur within the 15-min `requestedAt` bucket / 15-min TTL, so it is staleness-bounded. [nextjs-app/lib/services/sun-engine.ts:269-282 (computeRealSunEngineCached doc block)]
- [x] [Review][Patch][Low] Dead `lastRateLimitSweepAt` constant left in the GET route after the rate-limiter extraction — removed; the readers (`checkRateLimit`, `clearVenueRateLimitForTests`) all moved to `lib/utils/rate-limit.ts`, so the constant was referenced nowhere. tsc clean after removal. [nextjs-app/app/api/venues/route.ts:56 (deleted)]

_Dismissed (noise, not persisted as actionable):_
- _Buildings cache shared across different venue ids (auditor #3) — correct by design and already documented (casters depend solely on centroid+radius; the auditor itself confirms "no key-collision correctness risk"); the existing key-builder + `fetchCachedVenueBuildings` doc comments already explain the centroid+radius keying and co-located collapse. No defect → Dismiss._
- _Degenerate `[0,0]` centroid collapses to one shared key (auditor #4) — explicitly theoretical / non-production: every live venue has a real seating polygon or a synthesized footprint fallback, so an empty/degenerate outer ring is unreachable. Hypothetical, no realistic trigger → Dismiss (Low selectivity)._
