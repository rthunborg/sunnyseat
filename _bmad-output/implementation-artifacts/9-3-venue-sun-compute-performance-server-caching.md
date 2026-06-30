# Story 9.3: Venue Sun-Compute Performance — Server Caching

Status: ready-for-dev

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

- [ ] **Task 1 — Fetch the building set ONCE per venue; correct the false comments (AC: #1)**
  - [ ] In `lib/solar/shadow-calculation-service.ts`, add a building-aware code path so the nearby-buildings RPC runs once and is reused for both the single-shot shadow and the full-day timeline. Two acceptable shapes — pick the lower-churn one and state the choice in Completion Notes:
    - **(Recommended) Add geometry+buildings overloads** that accept an already-fetched `Building[]`: e.g. `calculateVenueShadowFromBuildings(geometry, timestamp, buildings, options)` and `calculateVenueShadowTimelineFromBuildings(geometry, start, end, intervalMs, buildings, options)` that skip `fetchNearbyBuildings` and call the existing pure `computeShadowInfo`. Keep the existing `*ForGeometry` functions as thin wrappers that fetch-then-delegate (so legacy callers and the existing tests stay valid).
    - **(Alternative) Hoist the fetch into a small helper** `fetchVenueBuildings(geometry)` exported from the service, call it once in `computeRealSunEngine`, and pass the result into both calculations.
  - [ ] Export `fetchNearbyBuildings` (or the new `fetchVenueBuildings` wrapper) and the `MAX_SHADOW_DISTANCE`-derived `searchRadiusDeg` so the sun-engine can drive a single fetch. The `null` return (RPC error → `createShadowDataUnavailableResult`) MUST be preserved identically for both the single-shot and the timeline path — today `calculateVenueShadowForGeometry` returns the unavailable result when `buildings === null` (line 92) and the timeline loop branches on `buildings === null` per sample (line 344). The shared-fetch refactor must reproduce BOTH null behaviours exactly.
  - [ ] In `lib/services/sun-engine.ts` `computeRealSunEngine`, fetch buildings once before the two calculations and pass them in. Correct the two stale comments (~51-56 and ~317) to truthfully describe one shared fetch. Confirm the per-sample `try/catch` neutral-50/50 fallback in the timeline loop is unchanged.
  - [ ] **Byte-identical guard (this is the load-bearing AC1 test):** add a unit test that spies on the `get_buildings_near_point` boundary (the existing `vi.mock('@/lib/supabase/server')` `mocks.rpc` in `test/unit/services/sun-engine.test.ts`), asserts the call count for one venue is **1** (down from 2), and asserts the full `SunEngineOutcome` (venue sun fields + freshness + peakTime) is deep-equal to the pre-refactor output for the same fixed inputs (fixed `now`, summer-midday clock, mocked buildings + weather). Mock at the adapter boundary, NOT via `vi.mock` of a concurrently dynamic-imported module (see Dev Notes "Vitest dynamic-import gotcha").

- [ ] **Task 2 — Cache `get_buildings_near_point` keyed on rounded centroid + radius, long revalidate (AC: #2)**
  - [ ] Wrap the buildings fetch in a server cache keyed on `(roundedCentroidLat, roundedCentroidLng, radiusMeters)`. Round the centroid to ~4 decimal places (≈11 m — matches the existing `useVenueSearch` 4-decimal coordinate bucket and the Met.no `FORECAST_COORD_PRECISION=4` convention) so co-located venues share one cache entry. Building geometry rarely changes → use a long revalidate (recommend 24h, matching the architecture "precomputed sun data refreshed daily" cadence — state the chosen TTL in Completion Notes).
  - [ ] Prefer `unstable_cache` from `next/cache` (Next 16, the project's framework) with an explicit `revalidate` + a stable cache key derived from the rounded centroid + radius; OR a process-scoped `Map` with a timestamped TTL if `unstable_cache` proves awkward with the Supabase client (state which you used and why). Either way the cache MUST be server-only (this module is already server-only) and MUST NOT change the `Building[] | null` contract — a `null` (RPC failure) must NOT be cached as a success (cache only successful non-null results, or key the failure short-lived).
  - [ ] The cache lives at the buildings-fetch boundary so it is shared by BOTH the single-shot and the timeline path automatically (they now call one fetch per venue per request) AND across requests within the revalidate window.

- [ ] **Task 3 — Cache the per-(venue, rounded-time-bucket, day) sun computation; apply to list AND detail (AC: #2)**
  - [ ] Cache the computed `SunEngineOutcome` keyed on `(venue.id, roundedTimeBucket, dayKey)` where the time bucket is the snapped request instant rounded to the slider's granularity (the planner snaps to 15-min — round to the same 15-min bucket so a repeat request in the same bucket is a cache hit; a new bucket recomputes). `dayKey` is the Stockholm `YYYY-MM-DD` (reuse the engine's `stockholmDateKey`). Include the seating/ground elevation inputs implicitly via `venue.id` (elevation is a per-venue constant).
  - [ ] Apply identically in BOTH `app/api/venues/route.ts` (list fan-out, inside `applyRealSunEngine`/`computeRealSunEngine`) and `app/api/venues/[slug]/route.ts` (detail) — the cleanest place is inside the engine (`computeRealSunEngine` or a thin cached wrapper `applyRealSunEngine` calls) so both routes inherit it without duplicating cache logic. The detail "Mer info" path MUST benefit equally (AC2 is explicit).
  - [ ] **Staleness window (agreed — see Dev Notes "Staleness window agreement"):** the per-bucket sun cache TTL is bounded so a cached bucket cannot show stale sun past the agreed window. Use the SAME 15-min granularity as the time bucket plus the existing client 5-min TanStack stale time / 30s CDN window as the design envelope — recommend a sun-compute cache `revalidate` of **15 min** (one slider bucket) so the worst-case staleness equals one bucket and a new wall-clock bucket always recomputes. The weather staleness signal (`isForecast` / >2h "approximate") is already honest and is preserved unchanged. Document the chosen TTL + the resulting worst-case staleness in Completion Notes.
  - [ ] Add unit tests: (a) a 2nd request within the same bucket does NOT re-invoke the buildings RPC (cache hit); (b) a request in a new 15-min bucket DOES recompute (RPC invoked again); (c) the cached output equals the uncached output for the same inputs.

- [ ] **Task 4 — Resolve the CDN-cache-vs-rate-limit conflict; document the chosen approach; agree the staleness window (AC: #3)**
  - [ ] **DESIGN DECISION (the AC leaves this open — pick one, document it, do NOT silently choose):**
    - **Option A (RECOMMENDED — relocate rate-limiting for edge-cacheability):** move the per-IP rate-limiting out of the route handler's request-header read so the GET response can be edge-cached at `s-maxage=30`. The in-memory token bucket reading `x-forwarded-for`/`x-real-ip` (`route.ts:216-222`) is what forces the route dynamic and kills the already-present `Cache-Control: public, max-age=30, s-maxage=30` header. Move the IP read/limit into `middleware.ts` (Edge, runs before the cache) OR adopt Vercel's platform rate-limiting / firewall, leaving the route a pure cacheable function. This is the smaller change, keeps DoS protection, and directly unlocks the dead `s-maxage`.
    - **Option B (precompute follow-up):** adopt the precompute pipeline flagged in `sun-engine.ts` (the DECISION D comment ~52-57: "a precompute pipeline is the flagged follow-up if measured list latency exceeds posture") + the architecture's "Precomputed: sun exposure refreshed daily via Vercel Cron" — compute sun outputs out-of-band and serve precomputed rows. This is a much larger change (a cron job + a precompute store) and is likely out of proportion for this story; prefer Option A unless the maintainer directs otherwise.
  - [ ] **Recommended default = Option A.** If Option A is chosen, verify rate-limiting is still enforced (a test asserting the 429 path still fires from the relocated limiter) AND that the route's `Cache-Control` can now actually be honoured by the edge (the dynamic-forcing header read is gone from the handler). If Option B is chosen instead, STOP and treat the cron/precompute scaffolding as a scope expansion to confirm with the maintainer (`needs-human`) rather than building it inside this story.
  - [ ] Whichever option: write the chosen approach + rationale + the agreed staleness window into BOTH this story's Completion Notes AND a short note in the route file / `architecture.md` Caching Strategy section so the decision is discoverable (the AC requires "the chosen approach is documented").
  - [ ] Preserve the existing ETag / `if-none-match` 304 path on the list route and the `X-Weather-Updated-At` / `X-Sun-Data-Source` freshness headers on both routes — they are part of the freshness contract.

- [ ] **Task 5 — Capture before/after performance evidence (AC: Design Gate — perf is the acceptance signal)**
  - [ ] On the real engine path (`SUNNYSEAT_SUN_ENGINE=real` + Supabase service-role config), capture cold (cache-empty) and warm (cache-primed) timings for BOTH `/api/venues` (list, 7 venues) and `/api/venues/[slug]` (detail) BEFORE and AFTER the change. Record the RPC-call-count reduction (≈14→7) and the warm-cache latency improvement in Completion Notes. This is a MANUAL measurement, not a CI timing assert (CI timing gates flake — per the epic test design Execution Strategy).
  - [ ] If the real engine path is NOT reachable in this environment (no service-role config), record that the perf evidence is deferred to a maintainer/preview run and rely on the unit-level RPC-call-count + cache-hit tests as the in-CI acceptance signal. Do NOT fabricate timing numbers.

- [ ] **Task 6 — Test gate + regression verification (standard gate)**
  - [ ] `cd nextjs-app && npx tsc --noEmit` (0 errors); `npx eslint . --quiet` (0 errors; pre-existing warnings in untouched code tolerated); `npx vitest run` (all green, count increased by the new cache/RPC-count tests, none dropped).
  - [ ] Confirm NO regression in the engine + route suites named in the epic test design Interworking table: `services/sun-engine.test.ts`, `shadow-calculation-service.test.ts` + `solar/*`, `venues-route.test.ts`, `venues-route-real-engine.test.ts`, `venue-store.test.ts`, `venue-detail-route.test.ts`. The DEFAULT (flag-off) seed path MUST stay byte-identical (these existing tests assert it).
  - [ ] Move to `review` via `scripts/story-review.sh 9-3` (Windows: `.\scripts\run-sh.ps1 scripts/story-review.sh 9-3`) — NOT by editing sprint-status directly. The visual gate auto-skips (no mapped screen ID). e2e is NOT required by the canonical gate; the two pre-existing `map-primary.spec.ts` failures (planner/time-slider chrome, Story 9.0/9.9 territory) are out of scope.

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
