# Story 11.1: Client-Side Day-Series — Instant Time Scrubbing & Fast Date Switch

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want changing the planner time to update the map instantly and changing the date to take a couple of seconds at most,
so that exploring "when is it sunny where" feels effortless instead of a 10-second stall.

## Acceptance Criteria

**AC1 — Day-series in the list DTO; a settled time change fetches nothing**

**Given** `/api/venues` currently returns sun state for a single requested instant
**When** the list response is extended with a per-venue day-series — one entry per planner step (`PLANNER_STEP_MINUTES`) across the planner range, each carrying at least `sunExposurePercent` and the weather-gated `currentSunStatus` (reusing the engine's existing timeline walk; the Epic 10 cloud/rain gates apply per-step, never only to "now")
**Then** the client derives marker %, pin state, quick-info figures, list ordering ("Mest sol"), and the obscured presentation for ANY planner time from the cached series — and a settled time change issues **zero** network requests

**AC2 — Series cached server-side; payload measured and bounded**

**Given** the day-series is computed server-side
**When** caching is added
**Then** the per-(venue, date, weather-refresh-bucket) series is cached in `sun-engine-cache.ts` alongside the existing weather/building caches so repeat requests within a bucket are near-free, and the response stays CDN/ETag-friendly (measure and record payload size; ~50 venues × ~64 steps must stay reasonable gzipped)

**AC3 — Date/location change keeps markers mounted under a dim + spinner**

**Given** the user changes the **date** (or the origin location changes materially)
**When** the single new request is in flight
**Then** existing venue markers are NOT unmounted/reloaded — the map dims under a subtle gray hue with a clear centered loading spinner overlay until the new series arrives, then markers update in place (keyed by venue id)

**AC4 — Live perf: date change < 3 s p95, scrub = 0 requests**

**Given** the live production deployment
**When** a date change is measured end-to-end (p95 over repeated trials)
**Then** it completes in **< 3 s** (stretch target < 1.5 s warm-cache), with before/after timings recorded in the story record, and time-scrubbing is measured at 0 requests

### Design Gate Criteria

- **Visual:** Gray-hue + spinner overlay matches the design system (token-based scrim, standard spinner); markers visually persist through a date change
- **Behaviour:** Time scrub updates pins/list/quick-info instantly offline-from-network; date change fires exactly one request
- **Animation:** Marker % transitions during scrub are smooth (no flash/remount); overlay fades in/out per motion spec
- **Visual validation:** Screenshot of the date-change loading state (dimmed map + spinner) passes before QA handoff

_Reading (non-verbatim guidance, not part of the acceptance text):_ AC4's wall-clock p95 is measured on the LIVE deployment and RECORDED in this story's Dev Agent Record — it is NOT a CI gate and it needs the maintainer's live deployment. The CI-enforceable half is the request-count invariant (scrub = 0, date-change = 1), which Story 11.8 owns as the standing regression guard. Do not fabricate a live p95 number; if the live pass can't run in this session, hand the exact protocol (URLs + methodology + before/after slots) to the maintainer as a `needs-human` step (mirrors the Epic-10 live-spot-check handoff precedent).

## Tasks / Subtasks

- [x] **Task 1 — Extend the engine to emit a per-step day-series (AC1)**
  - [x] In `lib/services/sun-engine.ts`, add a day-series producer that reuses the SAME shared building set already fetched once per venue in `computeRealSunEngineResult` (`fetchCachedVenueBuildings` → `buildings`) and the SAME `getForecast`/`getNowcast` inputs — do NOT issue a second building RPC or extra Met.no calls per step.
  - [x] Sample the planner range at `PLANNER_STEP_MINUTES` (15 min) from `PLANNER_START_MINUTES` (06:00) to `PLANNER_END_MINUTES` (21:00) Stockholm — that is 61 steps/day (06:00, 06:15, …, 21:00). Convert each step's Stockholm wall-clock to the UTC instant with `fromZonedTime(...)` exactly as `resolveRequestedAt`/`sameDayScanRange` do (reuse `stockholmDateKey(requestedAt)` for the day).
  - [x] For EACH step, run the full Epic-10 pipeline and emit at least `{ minutes: number (planner minutes), sunExposurePercent, currentSunStatus }`. Reuse the exact ordered stages from `computeRealSunEngineResult`: `calculateVenueShadowFromBuildings(...)` at the step instant → `classifySunStatus`/`NoSun` precedence → `effectiveCloudCover(weather-at-step)` → `applyCloudGate(geometricStatus, isSunVisible, effectiveCover, isRaining)`. **Do NOT re-implement the gate**; call the existing `applyCloudGate`.
  - [x] Weather per step: pick the forecast slice nearest to the STEP instant via the existing `fetchWeatherForVenue`/`weatherValidAt` matching (the forecast is fetched once; slice selection is per step). Rain (`isRaining`) per step follows the EXISTING AC4 horizon rule from `computeRealSunEngineResult`: the nowcast is consulted ONLY for a step within `[now, now + NOWCAST_HORIZON_MS]`; steps in the past or beyond the horizon get `precipitationRate = undefined` ⇒ `isRaining = false` ⇒ forecast cloud governs (byte-identical to Tiers 0/1). Reuse the batch-deduped `getNowcast`; do not add a per-step nowcast fetch that breaks the single-call-per-coord dedupe.
  - [x] **Parity guardrail (hard):** for the step whose instant equals the current single-shot `requestedAt`, the series entry's `sunExposurePercent` and `currentSunStatus` MUST equal the existing single-instant compute byte-for-byte. The series is that same computation sampled per step — NOT a new formula. A divergence is a FAIL, never a rebaseline.

- [x] **Task 2 — Carry the series on the DTO (AC1)**
  - [x] Add an OPTIONAL `sunDaySeries?` field to `VenueDataDto` in `lib/types/api.ts` (e.g. `sunDaySeries?: { minutes: number; sunExposurePercent: number; currentSunStatus: VenueSunStatus }[]`). Keep it optional so the default seed path (flag OFF) and the detail DTO stay byte-identical and every existing consumer compiles unchanged.
  - [x] Populate it ONLY on the real-engine list path (`app/api/venues/route.ts`, the `useRealEngine` branch). The seed/fixture path and `[slug]` detail route must remain byte-identical — do NOT add the series to the detail DTO (the detail view still uses its own `timeline`; Story 11.6 removes the "Soltider idag" render, NOT the engine timeline).
  - [x] Thread the series through `SunEngineOutcome` → `normalizeVenueForResponse` → the response `venues[]`. Confirm `normalizeVenueForResponse` (in `venues-fixture.ts`) passes an unknown optional field through untouched (or explicitly forward it); the series must survive the normalize/distance-map stages in the route's `.map(...)` chain.
  - [x] The weak ETag (`weakEtag({ venues, meta, totalCount })`) already hashes the full venues array, so the series is covered — verify the ETag/304 path still holds with the larger payload.

- [x] **Task 3 — Cache the series per (venue, date, weather-refresh-bucket) (AC2)**
  - [x] The `sunComputeCache` already keys on `(venueId, 15-min requestedAt bucket, Stockholm day, elevation variant)`. The day-series is a WHOLE-DAY artifact — key it on the DAY + a weather-refresh bucket, NOT the per-instant `requestedAt` bucket, so one series serves every step of that day. Add a series cache entry in `sun-engine-cache.ts` (mirror the `TtlCache` + `getOrComputeConditional` + singleton-getter pattern already there); include the weather-refresh bucket in the key so a new weather bucket recomputes the whole series (R-012).
  - [x] Cache ONLY successful/complete series (mirror the existing `cacheable: buildings !== null` rule — a degraded series from a failed building RPC must NOT be pinned for the TTL window).
  - [x] The series and its weather gating are cached TOGETHER (the gated `currentSunStatus` per step lives in the cached series) — mirror the Epic-10 "gated outcome cached with its weather" rule so a cache hit never re-gates against different weather.
  - [x] Add a `clearSunEngineCachesForTests()`-style reset for the new cache (extend the existing helper) so tests start cold.

- [x] **Task 4 — Client derives all time-dependent UI from the series (AC1, AC3)**
  - [x] Add a PURE client helper (e.g. `lib/utils/venue-day-series.ts`) that, given a venue's `sunDaySeries` and a planner minutes value (`selectedMinutes`), returns the `{ sunExposurePercent, currentSunStatus }` for that step (exact-match on the snapped 15-min step; the client already snaps via `snapPlannerMinutes`). No network, no `import()` of server-only modules — this file is client-safe (must NOT import `sun-engine.ts`/`sun-engine-cache.ts`/`met-no-service` — API boundary).
  - [x] In `MapView.tsx`, when a venue carries `sunDaySeries`, derive the per-time `sunExposurePercent`/`currentSunStatus` from `plannerTime.selectedMinutes` (which updates live during scrub) INSTEAD of relying on the server's single-instant fields. Apply this derivation over `rawVenues` → the existing `tagFilteredVenues`/`listVenues`/pin-data seam so pins, both venue lists, quick-info figures, and "Mest sol" ordering all read the derived per-step value. The existing client re-sort already uses `getVenueSunRankForList` (VenueList) mirrored by the server `sunListRank` — feed it the DERIVED per-step status/percent so ordering tracks the scrub.
  - [x] **Zero-fetch invariant (the headline):** a settled time change (scrub) must NOT change the TanStack query key. Today `deferredPlanner` (the deferred `plannerTime.plannerQuery`) flows into `useVenueSearch` and is part of the key, so every settled off-live time still fetches. With the series present, the time dimension is derived CLIENT-SIDE — decouple the scrub from the query key so a same-date time change issues zero `/api/venues` requests. The query key should change ONLY on date change or a material location change (AC3), not on time scrub. (Story 11.2 decouples the slider's per-`onChange` commit; 11.1 makes that commit fetch nothing by owning the client-derivation seam. Coordinate so "commit triggers zero fetches" is true end-to-end.)
  - [x] Preserve `isLiveNow` semantics: when the selected time is the live wall-clock time, the derivation still reads the correct step; the live-clock tick that advances "now" must not thrash the query key.

- [x] **Task 5 — Date-change dim + spinner overlay, markers persist (AC3)**
  - [x] On a date change (or material location change), the query key DOES change → one fetch fires. While it is in flight, dim the map under a token-based subtle-gray scrim + a centered standard spinner overlay; markers stay MOUNTED (keyed by venue id via the existing `VenuePinLayer` id-keyed markers + `keepPreviousData`) and update in place when the new series arrives. Do NOT unmount/remount the pin layer or the list on a date change.
  - [x] Use the design-system scrim token + the existing spinner component (frontend-component skill — design-system-first; no ad-hoc hex/opacity). The overlay fades in/out per motion spec. This overlay is a NEW visual state → it needs a screenshot for the Design Gate; dev is FORBIDDEN from self-blessing reference PNGs (the consolidated rebaseline is a maintainer checkpoint owned by Story 11.7). Note the maintainer follow-up rather than editing/creating a reference PNG.

- [x] **Task 6 — Tests (AC1, AC2, AC3) + red-first**
  - [x] **Unit (client derivation, pure/offline):** `venue-day-series` returns the same `%`/status as the server single-instant compute at each step; derivation is pure (no network in the code path). One derivation per output surface's need (marker %, pin state, quick-info figure, ordering input, obscured presentation). (P0, R-001/R-003.)
  - [x] **Unit (parity, engine):** for a fixed (venue, date, weather-bucket), each series entry equals the old single-instant `computeRealSunEngineResult` at the corresponding instant; the Epic-10 gate applies per-step (a 100%-cloud or rain step gates that step, never only "now"; a below-horizon/shaded step is never gated). A diff is a FAIL. (P0, R-003/R-005.)
  - [x] **API/contract (`test/unit/api/venues-route*.test.ts`):** the real-engine list response carries `sunDaySeries` with one entry per 15-min step across the range, each with `sunExposurePercent` + `currentSunStatus`; the seed/fixture path (flag OFF) and the `[slug]` detail DTO are byte-identical (no `sunDaySeries`); ETag/304 still holds. **Record the gzipped payload size** for ~all seeded venues × 61 steps in the test output / Dev Agent Record and set a guard from the measurement (the ceiling is `UNKNOWN` by design — measure, don't invent). (P0, R-003/R-012.)
  - [x] **Unit (cache, fake-timer):** the series is cached per (venue, date, weather-refresh-bucket); a new weather bucket recomputes; a degraded (null-buildings) series is NOT cached. Reuse the `sun-engine-cache` fake-timer pattern (`clearSunEngineCachesForTests`). (P1, R-012.)
  - [x] **Component/E2E hooks for AC3** are shared with Story 11.8's standing guards (scrub = 0 requests; date change = 1 request; markers persist keyed by id). This story must leave the seam testable; the request-count e2e guard itself is registered/owned by 11.8, but add at minimum a component/integration assertion here that a same-date time scrub does not change the query key / does not call `fetch`.
  - [x] Do NOT add a Playwright real-touch profile here (that is a Story 11.2/11.8 prerequisite). Do NOT add live Met.no to any test — the day-series is served from the seed path (flag OFF) or the mocked `/api/venues` `page.route` DTO (the `epic-10-weather-matrix.spec.ts` precedent) in e2e.

- [x] **Task 7 — Gates**
  - [x] `npx tsc --noEmit` → 0 errors. `npx eslint .` → 0 new errors. `npx vitest run` → all green, count increases (new series/cache/client-derivation tests), none dropped. Record the baseline→final test count in the Dev Agent Record.
  - [x] Do NOT run/alter the live-perf pass in CI. Record the AC4 live-p95 protocol + the recorded payload byte size in the Dev Agent Record; hand the live p95 measurement to the maintainer if it cannot run in-session.

## Dev Notes

### This is the Epic-11 FOUNDATION story — get the DTO shape + cache bucket right first

Story 11.1 is first in Epic 11 by design: it unblocks 11.2's "commit triggers zero fetches" and feeds 11.4's list-DTO change. The Entry Criteria in the Epic-11 test design are explicit: *"The client-side day-series DTO shape + the `sun-engine-cache.ts` bucket key are agreed (11.1) before the slider decouple (11.2) is wired, so 'commit triggers zero fetches' is testable end-to-end."* Bias toward a minimal, stable DTO field.

### The anti-pattern this story exists to kill (R-001, CRITICAL score 9)

Epics 9 and 10 each landed a real caching/debounce win (`sun-engine-cache.ts` Story 9.3; `useDeferredValue` Story 9.4) yet the ~9.6 s user-visible stall SURVIVED, because the root cause — time in the TanStack query key + a fresh per-venue engine walk per requested instant — was only DAMPENED, not REMOVED. The epic thesis, from the retro-notes, is anti-"shipped-but-insufficient": the 11.8 gate is deliberately the **request-count invariant** (settled scrub = 0 requests; date change = 1 request) + a real-touch profile, NOT wall-clock alone. **Do not dampen the fetch — REMOVE it.** A settled same-date time change that issues even one `/api/venues` request is a FAIL, not a slow-but-passing result.

### Where the day walk already exists (reuse, do not reinvent)

The engine ALREADY walks the whole day for the detail route's timeline: `computeRealSunEngineResult` (`sun-engine.ts`) calls `calculateVenueShadowTimelineFromBuildings(geometry, scanStart, scanEnd, SUN_WINDOW_SAMPLE_INTERVAL_MIN*60_000, buildings, {...})` over a 03:00–23:00 scan at a **30-minute** interval to extract `sunWindow`/`peakTime`. The list route discards everything except the single requested instant. The day-series is that same walk exposed to the list — but note two differences to reconcile:
- The planner step is **15 min** (`PLANNER_STEP_MINUTES`), the current timeline scan is **30 min** (`SUN_WINDOW_SAMPLE_INTERVAL_MIN`) over a WIDER 03:00–23:00 band. For the client series you need every 15-min planner step over 06:00–21:00. Either sample a dedicated 15-min pass over the planner range, or re-derive — but crucially reuse the SAME shared `buildings` set and the SAME per-step pipeline so there is no extra RPC and the per-step values match the single-shot compute (the parity guardrail).
- The existing timeline emits `{ sunlitAreaPercent, isSunVisible, ... }` per point but does NOT apply the cloud/rain gate (the gate lives in `computeRealSunEngineResult` at the single instant). The day-series MUST apply `applyCloudGate` per step (Epic-10 gate applies per-step, never only to "now") so `currentSunStatus` is the weather-gated value the client renders directly.

### The Epic-10 two-signal gate is authoritative and stays server-side — the client only READS it

From the test-design "Not in Scope": *"Epic 10's cloud/rain gate is authoritative and stays server-side; the day-series carries the already-gated `currentSunStatus` + `sunExposurePercent` per step. The client only reads the gated series, it does not re-gate."* The client-derivation helper must NEVER re-implement `applyCloudGate`/`effectiveCloudCover`/`skyConditionFromCloudCover`. It reads the server-emitted per-step `currentSunStatus`/`sunExposurePercent`. The regression guard is: client obscured/rain presentation for a step == the server-gated series value for that step.

### `sunExposurePercent` keeps ONE physical meaning

Same hard guardrail as Epic 10 (test-design "Not in Scope"): the `%` keeps ONE physical meaning; the day-series is just that meaning sampled per planner step. Do NOT change the geometric meaning of `sunExposurePercent`/`sunWindow`/peak. The parity test (per-step series == old single-instant compute at each instant) is a byte-parity guard, not a rebaseline.

### Client seam (exact touch points)

- `hooks/queries/useVenueSearch.ts` — the planner (`date`/`time`) currently flows into the query key via `queryKeys.venues.planner(filters)`; a non-live planner time forces a `planner` key and a fetch. The scrub-zero-fetch requirement means the TIME must stop being a key input for same-date scrubbing. Keep `date` (and coords) in the key; the time dimension is derived client-side from the series. Be careful: `refetchInterval` is `false` when a planner key is active and `FIVE_MINUTES` for the live-now key — preserve sensible refresh behaviour for the live path.
- `components/custom/map/MapView.tsx` — `deferredPlanner = useDeferredValue(plannerTime.plannerQuery)` feeds `useVenueSearch` (`:222-229`) and `useFavouriteVenues` (`:252-258`). `rawVenues = venueQuery.data?.venues` (`:339`) → `tagFilteredVenues` (`:350-353`, pure `.filter`) → the venue lists + `VenuePinLayer`. Insert the per-step derivation over this seam so pins/list/quick-info all read the derived value from `plannerTime.selectedMinutes`. `plannerTime.selectedTime` is already passed as `currentTime` to quick-info (`:1041,1065`).
- `components/custom/venue/VenueList.tsx` — `getVenueSunRankForList` client re-sort mirrors the server `sunListRank` (`route.ts:87-95`); both use the [0,2] "higher = better" space with `CloudObscured` scaled by geometric solläge. Feed it the DERIVED per-step `currentSunStatus`/`sunExposurePercent` so "Mest sol" tracks the scrub. Keep the client/server rank mirror in lock-step (do not diverge the formula).
- `components/custom/map/VenuePinLayer.tsx` — markers are keyed by venue id (AC3 relies on this for persistence across a date change). Do NOT re-key on time.

### Cache design (AC2, R-012)

`sun-engine-cache.ts` already has the pattern to copy: `TtlCache<V>` (lazy-expiry, injectable `now` for fake timers), `getOrComputeConditional` (per-call `cacheable` flag — degraded results returned-but-not-stored), singleton getters, and a test reset. Add a day-series cache mirroring it. Key = `(venue.id, Stockholm day, weather-refresh bucket, elevation variant)` — NOT the 15-min `requestedAt` bucket (the series spans the whole day). Include the weather-refresh bucket so a new weather bucket recomputes (a key of only (venue, date) would serve yesterday's weather gating). Cache the series + its gating together. TTL should track the weather-refresh horizon (the existing `SUN_COMPUTE_CACHE_TTL_MS` is 15 min = the sun-freshness bucket; reuse or mirror that reasoning and document it).

### Payload budget is UNKNOWN by design — MEASURE, do not invent (R-003/R-012)

The retro-notes and test-design both flag the day-series gzipped payload ceiling as one of four thresholds deliberately left UNKNOWN, to be set here at drafting time via measurement. ~50 venues × ~61 steps × `{ minutes:int, %:int, status:enum }` is the worst case (today's live store is a handful of venues, so real payloads are far smaller, but the guard is set for the ceiling). Emit compactly (e.g. integers only; consider omitting `minutes` and relying on index ordering + a documented start/step, OR keep `minutes` explicit for robustness — dev's call, record the decision). **Measure the gzipped size, record it in the Dev Agent Record, and set the test guard from the measurement.** If it measures large, trim the field set or series resolution in-story before merge (do not ship an unbounded payload) — but never below the parity requirement.

### Deferred-work items that overlap this story (fold in; do NOT reopen unrelated ones)

- **`applyCloudGate`'s `isRaining = false` default silently drops the rain signal for any future caller (Epic-10 defer, Low, conditional).** The day-series producer is exactly the "new `applyCloudGate` caller" that entry warns about — thread `isRaining` EXPLICITLY per step (derived from the per-step nowcast under the horizon rule); never rely on the default. This is load-bearing: a false-negative "sunny during rain" is the worst outcome for an honesty-first app.
- **`nearestToNowEntry` has no staleness/future cap (Epic-10 defer, Low, conditional).** The per-step weather-slice selection reuses `fetchWeatherForVenue`/`weatherValidAt` nearest-match — the series samples MANY future steps, so lean on the existing forecast slice matching (which carries per-step `validAt`); do not introduce a "raining now" reading for a future step (the AC4 horizon rule already prevents a future step from consulting the near-now nowcast). No need to reopen the nowcast staleness item; just respect the horizon gate per step.
- **Supabase by-slug / `sunListRank` (route ordering)** — the server sort already uses `sunListRank`; keep the client/server rank mirror intact when feeding derived values. No reopen needed.
- Everything else in `deferred-work.md` (offline shell, 404 a11y, share modal, MapLibre roots, etc.) is out of scope — do NOT touch.

### Constraints ratified earlier in Epic 11 (from the epic-11 retro-notes)

- The 11.8 gate is the **request-count invariant** (scrub = 0, date change = 1) + real-touch profile, NOT wall-clock alone — build the seam so that invariant is provable in CI.
- The day-series gzipped payload ceiling is one of the four UNKNOWN thresholds to set at story drafting via measurement (see the payload-budget note above).
- The live date-change p95 is UNKNOWN until 11.8 measures it — record the protocol + before/after slots; a miss is a triage item, not a fabricated pass.

### API boundary + server-only discipline

`sun-engine.ts` / `sun-engine-cache.ts` / `met-no-service.ts` / `nowcast-service.ts` are SERVER-ONLY (loaded lazily; the default flag-OFF path has zero live-Supabase/live-Met.no dependency). The new client-derivation helper must be client-safe and import NONE of them. Keep the default (flag OFF) seed path byte-identical: the `sunDaySeries` field is populated ONLY on the `useRealEngine` branch.

### Testing standards

- Vitest for unit/component/API-contract; Playwright for e2e (the request-count + marker-persistence e2e is registered by Story 11.8, but leave the seam testable here). Red-first for the P0 client-derivation + parity tests.
- CI runs Playwright against `next dev` so `?_time=` forcing fires (project-context "Production planner-forcing gate" — do NOT switch the webServer to a production build). No live Met.no in CI: the day-series is served from the seed path (flag OFF) or a mocked `/api/venues` `page.route` DTO (the `epic-10-weather-matrix.spec.ts` precedent) in e2e.
- CI e2e projects: `mobile`/`desktop` (exclude axe specs) + `a11y`/`a11y-mobile` (axe only). There is NO real-touch profile yet — do not add one here (11.2/11.8 prerequisite).
- Standard gate: `tsc --noEmit`, `eslint`, `vitest run`. No new dependency, no schema change, no new route.

### Project Structure Notes

- New files: a server-side day-series producer (in or beside `sun-engine.ts`), a day-series cache in `sun-engine-cache.ts`, and a PURE client helper (`lib/utils/venue-day-series.ts` or similar). Edits: `lib/types/api.ts` (optional `sunDaySeries` on `VenueDataDto`), `app/api/venues/route.ts` (populate on the real path), `MapView.tsx`/`VenueList.tsx` (client derivation seam), `useVenueSearch.ts`/`query-keys.ts` (decouple time from the key for same-date scrub), plus tests.
- Do NOT touch the `[slug]` detail route DTO (no `sunDaySeries` there); do NOT change the geometric fields; do NOT add the series to the seed/fixture path.
- frontend-component skill is MANDATORY for the date-change dim/spinner overlay (Task 5) — design-system-first, token-based scrim + standard spinner, no ad-hoc hex.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 11 — Story 11.1] — ACs + Design Gate (lines ~2807-2835), root-cause blockquote #2/#3 (list route discards the day walk; time in the query key), maintainer decisions (client-side day-series; date/location = the only fetches; today→today+3; Idag min = current time).
- [Source: _bmad-output/test-artifacts/test-design/test-design-epic-11.md] — R-001 (CRITICAL, the stall recurrence), R-003 (client-derived divergence/payload bloat), R-005 (date-change unmounts markers / client re-gate), R-012 (stale cache bucket); "Not in Scope" (server-per-scrub rejected; no client re-gate; one meaning per %); P0/P1 coverage rows; Entry Criteria (DTO+bucket agreed before 11.2); UNKNOWN payload ceiling.
- [Source: _bmad-output/auto-bmad/retro-notes/epic-11.md] — anti-"shipped-but-insufficient" thesis; request-count invariant is the 11.8 gate; day-series payload ceiling is UNKNOWN, set at drafting.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — `applyCloudGate` `isRaining=false` default (thread explicitly); `nearestToNowEntry` staleness cap (respect the AC4 horizon per step).
- [Source: nextjs-app/lib/services/sun-engine.ts] — `computeRealSunEngineResult` (the per-instant pipeline to sample per step), `applyCloudGate`, `effectiveCloudCover`, `NOWCAST_HORIZON_MS` horizon rule, `fetchCachedVenueBuildings` (shared building set), `resolveRequestedAt`, `SUN_WINDOW_SAMPLE_INTERVAL_MIN`.
- [Source: nextjs-app/lib/services/sun-engine-cache.ts] — `TtlCache`, `getOrComputeConditional`, singleton getters, `clearSunEngineCachesForTests`, `SUN_COMPUTE_CACHE_TTL_MS` (mirror for the series cache).
- [Source: nextjs-app/app/api/venues/route.ts] — the `useRealEngine` list branch, `normalizeVenueForResponse`/distance `.map` chain, `weakEtag`/304, `sunListRank` server mirror.
- [Source: nextjs-app/lib/types/api.ts] — `VenueDataDto`, `VenueSunStatus` (add optional `sunDaySeries`); the `[slug]` DTO must stay identical.
- [Source: nextjs-app/lib/utils/time-planner.ts] — `PLANNER_STEP_MINUTES`=15, `PLANNER_START_MINUTES`=06:00, `PLANNER_END_MINUTES`=21:00, `snapPlannerMinutes`.
- [Source: nextjs-app/lib/contexts/TimeContext.tsx] — `selectedMinutes`/`selectedTime`/`plannerQuery`/`isLiveNow` (the client time source for derivation).
- [Source: nextjs-app/hooks/queries/useVenueSearch.ts + nextjs-app/lib/query-keys.ts] — the query-key seam that time must leave for same-date scrub.
- [Source: nextjs-app/components/custom/map/MapView.tsx] — `deferredPlanner`/`venueQuery`/`rawVenues`→`tagFilteredVenues` derivation seam; id-keyed pin layer.
- [Source: nextjs-app/lib/solar/shadow-calculation-service.ts + lib/solar/types.ts] — `calculateVenueShadowTimelineFromBuildings` (existing day walk) + `ShadowTimelinePoint`/`ShadowTimeline` shapes.
- [Source: CLAUDE.md / AGENTS.md] — repo rulebook, Swedish-copy default, local-Docker rules.
- [Source: project-context.md] — Epic 9/10 ratified conventions, production planner-forcing gate, caching windows, "visual gate is an LLM eyeball" (ignores sizing/spacing — assert code-level facts, not the eyeball, for the overlay).
- [Source: _bmad-output/planning-artifacts/architecture.md] — Caching Strategy (CDN s-maxage 30s / sun-compute 15 min / buildings 24h), TanStack Query Key Conventions, API/DTO boundary (server-only engine, client consumes via `useVenueSearch`).
- [Source: nextjs-app/docs/design/DESIGN.md + _bmad-output/planning-artifacts/ux-design-specification.md] — consulted only for Task 5's date-change dim/spinner overlay (design-system scrim token + standard spinner + motion spec). This is otherwise a data/perf story with a single small new visual state; the reworked surfaces (quick-info/detail/map) are owned by Stories 11.4/11.5/11.6, not here.

## Dev Agent Record

### Agent Model Used

Opus 4.8 (1M context) — auto-bmad dev-story delegate.

### Debug Log References

- Full `vitest run`: **126 files, 1150 passed, 0 skipped** (baseline was 1120 passed / 30 skipped — the 6 red-phase ATDD scaffolds; final un-skips all 30 + adds coverage → +30 active tests, none dropped).
- `npx tsc --noEmit` → 0 errors. `npx eslint` → 0 errors (only 3 pre-existing unused-import/exhaustive-deps warnings in `MapView.tsx`, unrelated to this story).

### Completion Notes List

**What was built**

- **Engine per-step producer (Task 1)** — `computeVenueDaySeries(venue, requestedAt, now, getForecastOverride?, getNowcastOverride?)` in `lib/services/sun-engine.ts`. Fetches the shared building set ONCE (via the existing buildings cache — one RPC) and the forecast ONCE, then samples each 15-min planner step (61 steps, 06:00–21:00 Stockholm via `fromZonedTime`). Per step: shadow at the step instant → nearest forecast slice → per-step nowcast rain under the `NOWCAST_HORIZON_MS` horizon rule → `applyCloudGate`. `isRaining` is threaded EXPLICITLY per step (never the `false` default — the Epic-10 defer this producer is the exact "new caller" for).
- **Parity guardrail** — extracted a shared `gatedStepValue(shadowInfo, effectiveCover, isRaining)` that BOTH the single-instant `computeRealSunEngineResult` and the series producer call, so a series entry is byte-identical to the single-shot compute at the same instant. Proven by the per-step equality loop in `sun-engine.day-series-parity.atdd.test.ts` (mid-morning/midday/afternoon/evening steps all equal `applyRealSunEngine` at that instant).
- **DTO (Task 2)** — optional `VenueDaySeriesEntry[] sunDaySeries` on `VenueDataDto`; a separate `daySeries` field on `SunEngineOutcome`. The LIST route attaches `sunDaySeries` only on the `useRealEngine` branch (after `normalizeVenueForResponse`); the `[slug]` detail route never reads `daySeries`, so its DTO + the seed/fixture path stay byte-identical. A series-compute failure degrades to no series (never a 500).
- **Cache (Task 3)** — new day-series cache in `sun-engine-cache.ts` keyed on `(venueId, Stockholm day, weather-refresh bucket, elevation)` — a WHOLE-DAY artifact, so one series serves every step (a same-day scrub is cache-free). A new weather-refresh bucket (15 min, mirrors `SUN_COMPUTE_CACHE_TTL_MS`) recomputes the whole series with its gating. A degraded (null-buildings) series is returned but NOT pinned. `clearSunEngineCachesForTests` extended.
- **Client derivation (Task 4)** — pure client-safe `lib/utils/venue-day-series.ts` (`deriveVenueSunAtMinutes`) that maps `(sunDaySeries, selectedMinutes)` → `{ sunExposurePercent, currentSunStatus }` by exact snapped-step lookup; imports NO server-only module (enforced by a source-scan test). MapView derives `rawVenues` from the fetched data at `plannerTime.selectedMinutes`, so pins, both venue lists, quick-info figures, the obscured presentation, and the "Mest sol" ordering all read the derived per-step value.
- **Zero-fetch query key (Task 4)** — `useVenueSearch` (and mirrored `useFavouriteVenues`) now key on the selected `date` (+ coords) but NEVER on `time`; the request sends date/time only when off-live (via a new `isLiveNow` flag) and polls only when live. Critically the date is in the key in BOTH the live and off-live cases, so a live-today ↔ off-live-today scrub keeps the SAME key → **zero fetches**; a date change flips the key → one fetch.
- **Date-change overlay (Task 5)** — token-based subtle-gray scrim (`bg-text-primary/20 backdrop-blur-standard`) + centered `LoaderCircle` spinner (`data-testid="date-change-overlay"`), rendered as an AnimatePresence sibling of the pin layer so markers stay MOUNTED (keyed by venue id) and update in place. Shown while `venueQuery.isFetching && isPlaceholderData` (a real key change with previous data), never on first load. Added a `planner-date-next` control (with i18n `planner.nextDay`) to `TimeSliderPanel` so the request-count e2e can deterministically trigger a date change.

**AC2 payload measurement (recorded)** — gzipped `/api/venues` list payload WITH the day-series for the 7 seeded venues × 61 steps = **1769 bytes**. Guard set to **8000 bytes** (≈4.5× headroom; the ~50-venue live worst case extrapolates to ≈12 KB gzipped, and today's live store holds a handful of venues). CDN/ETag-friendly and bounded (`venues-route-day-series.atdd.test.ts`).

**AC4 live p95 — needs-human (handoff, mirrors the Epic-10 live-spot-check precedent).** The wall-clock p95 is measured on the LIVE deployment and is NOT a CI gate. Protocol for the maintainer:
- Deploy this branch to a Vercel Preview/Production with the real-data flags ON (`SUNNYSEAT_SUN_ENGINE=real`, `SUNNYSEAT_VENUE_STORE=supabase`, + service-role secrets).
- **Date-change p95:** open the app (live), open DevTools → Network, filter `api/venues`; click the planner "next day" control (or pick a future date) and record the end-to-end time to the new markers settling. Repeat ~10 trials; record p95 (target < 3 s; stretch < 1.5 s warm-cache). Record before/after in this story record.
- **Scrub = 0 requests (live confirmation):** with a same date, drag the time slider across several steps; confirm the Network panel shows ZERO new `api/venues` requests. (The CI-enforceable half of this is the request-count invariant, registered/extended by Story 11.8.)

**Design Gate — Visual validation deferred to the maintainer checkpoint.** The date-change dim+spinner is a NEW visual state and needs a screenshot for the Design Gate; dev is FORBIDDEN from self-blessing reference PNGs. The consolidated rebaseline is owned by Story 11.7 — flagged as a maintainer follow-up, no reference PNG created/edited here.

### File List

- `nextjs-app/lib/types/api.ts` (M) — `VenueDaySeriesEntry` type + optional `sunDaySeries` on `VenueDataDto`
- `nextjs-app/lib/services/sun-engine.ts` (M) — `computeVenueDaySeries` producer + cached wrapper, shared `gatedStepValue` parity helper, `daySeries` on `SunEngineOutcome`, `stepInstantFor`/`nearestForecastSlice`
- `nextjs-app/lib/services/sun-engine-cache.ts` (M) — day-series cache (`getSunDaySeriesCache`, `sunDaySeriesCacheKey`, `weatherRefreshBucketMs`, TTL constants), extended `clearSunEngineCachesForTests`
- `nextjs-app/app/api/venues/route.ts` (M) — compute + attach `sunDaySeries` on the real-engine list path (degrade-safe); detail route untouched
- `nextjs-app/lib/utils/venue-day-series.ts` (A) — pure client-safe `deriveVenueSunAtMinutes` helper
- `nextjs-app/hooks/queries/useVenueSearch.ts` (M) — decouple `time` from the query key; `isLiveNow` flag (send planner params/poll only when appropriate)
- `nextjs-app/hooks/queries/useFavouriteVenues.ts` (M) — mirror the key decouple + `isLiveNow`
- `nextjs-app/components/custom/map/MapView.tsx` (M) — client per-step derivation seam (`applyDaySeriesDerivation`), date-change dim+spinner overlay, `isLiveNow`/date-keyed planner args
- `nextjs-app/components/custom/time/TimeSliderPanel.tsx` (M) — `NextDayButton` (`planner-date-next` testid) on both variants
- `nextjs-app/messages/{sv,en}/venue.json` — (no change; reused existing `planner.nextDay` / `planner.loading` keys)
- Tests: un-skipped + wired the 6 red-phase ATDD scaffolds (`venue-day-series.derivation.atdd`, `sun-engine.day-series-parity.atdd`, `venues-route-day-series.atdd`, `sun-engine-day-series-cache.atdd`, `venue-day-series-query-key.atdd`, `epic-11-scrub-zero-fetch.spec`); updated `useVenueSearch.test.ts`, `useFavouriteVenues.test.ts`, `MapView.test.tsx` to the decoupled-key + `isLiveNow` contract

### Change Log

- 2026-07-04 — Story 11.1 implemented: client-side day-series for instant time scrubbing. Engine per-step producer (byte-parity with single-shot) + whole-day cache; `sunDaySeries` on the real-engine list DTO (1769 B gzipped seed, guard 8000 B); pure client derivation of all time-dependent UI; query key decoupled from time (scrub = 0 fetches, date change = 1); date-change dim+spinner overlay with markers persisting. All 6 ATDD scaffolds un-skipped + green; tsc/eslint clean; 1150 vitest pass. AC4 live p95 handed to maintainer (needs-human); Design-Gate visual validation deferred to the Story 11.7 rebaseline checkpoint.

**BREAKING CHANGE:** `useVenueSearch` / `useFavouriteVenues` query keys no longer include `time` — a planner selection now keys on `date` only (+ coords), and callers must pass the new optional `isLiveNow` flag to get the live (poll + server-computes-now) path. Any code that looked up these TanStack queries by a key containing `time`, or relied on the live path emitting a planner-less (`list`, no-date) key, must switch to the `date`-only key. No API/route/schema/config change; the `/api/venues` request contract is unchanged (date+time still sent together when off-live).
