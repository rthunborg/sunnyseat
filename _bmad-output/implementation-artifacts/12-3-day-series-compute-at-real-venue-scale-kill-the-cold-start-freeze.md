# Story 12.3: Day-Series Compute at Real-Venue Scale - Kill the Cold-Start Freeze

Status: ready-for-dev

## Story

As a **user opening SunnySeat (and the maintainer field-verifying it)**,
I want `/api/venues` to answer in seconds even on a cold instance or a fresh weather bucket,
so that the app is usable at real-venue scale before and after public launch.

## Acceptance Criteria (Verbatim From Epic)

**Given** the day series marries deterministic per-day shadow GEOMETRY (valid all
day) with 15-min weather GATING in one cached artifact keyed on the weather bucket
**When** the two are split — a geometry series keyed `(venue, Stockholm day,
elevation inputs, AND a hash/version of the geometry inputs)` computed once per day, and
a cheap per-bucket gating pass (weather fetches are already deduped/batched) applied on
read. The key MUST hash the FULL shadow-projection input — not only the `seating_area`
polygon + the named `shadow_casters` `height`/`filter_decision`, but the actual
`get_buildings_near_point` **caster SET**: building geometries/ids AND the RH2000
ground/roof z-values. A correction to a building footprint, an import batch, or a caster
z-value (with no change to `seating_area` or the named fields) MUST still invalidate the
persisted day-series — via a caster-set version/hash OR an explicit invalidation path fired
on any building/caster import — because Stories 12.2/12.5 (and geodata re-imports) edit
exactly these to fix bad predictions; otherwise a corrected venue keeps serving pre-fix
geometry
**Then** a weather-bucket roll re-gates in O(steps) without re-running shadow math,
outputs stay value-identical to today's path, and the R-012 rule is preserved
(gating always uses the CURRENT bucket's weather — never a stale-gated series)

**Given** process-scoped caches die with every deployment and idle lambda recycle
**When** the geometry series is **persisted across instances** in a Supabase table (via
the existing service-role path) — created with the repo's standard posture: **RLS ENABLED +
a service-role-only policy, NO anon/authenticated grants** (advisors clean, verified by a
test), so the precomputed geometry can't be read or POISONED via public Supabase REST and
then served to every cold list read — so a cold `/api/venues` READS pre-computed geometry
instead of running 42×61 shadow projections
**Then** a fully cold instance serves the central viewport in ≤ ~5 s p95 (persisted
geometry + live gating), measured against prod; DECISION D's compute-on-request stance
is explicitly revised to precompute-and-persist at real-venue scale

**Given** the maintainer wants caches that are **never empty after the first load**, and
that future dates need not be minute-fresh (MAINTAINER DECISION 2026-07-08)
**When** a **scheduled job** (a GitHub Action → Supabase, NOT a short Vercel cron —
the batch exceeds a serverless timeout) precomputes+persists the **ungated GEOMETRY
series** (per the split above — NOT a weather-gated series) for ALL venues across the
**entire selectable planner window — `today + PLANNER_MAX_FUTURE_DAYS`**
(`time-planner.ts`, currently 3), NOT an arbitrary N: the precompute horizon MUST equal
the dates the planner lets a user pick (a shared constant, tested), or an uncovered future
date falls back to the exact cold shadow-compute freeze this story exists to kill;
refreshed at TIERED cadences (future days a few
times/day — deterministic geometry, so this is really just keeping the store populated;
today refreshed alongside the geometry that rarely changes)
**Then** picking any date reads the persisted GEOMETRY (≈instant, never a cold
shadow-compute) and the **gating is still applied at read** with that request's weather
(consistent with the split AC — no gated series is ever persisted, so no stale-gating
contradiction). For a FUTURE day the read-time gate may use a forecast up to a few hours
old (fine — multi-day forecasts barely move); for **today**, R-012 near-now freshness is
preserved and the **rain radar** (nowcast, next ~90 min) stays live/on-request. The job
records per-run coverage (venues × days written) so a gap is visible

**Given** extending the GEOMETRY horizon to `PLANNER_MAX_FUTURE_DAYS` is NOT enough on its
own — the weather side truncates: `getForecast` keeps only `timeseries.slice(0, 48)`
(`met-no-service.ts:93`, ~2 days) and `nearestForecastSlice` picks the closest RETAINED
slice, so a day+3 selection would gate with the ~48h-out slice, not that day's forecast
(silently breaking the "few hours old" claim)
**When** the read-time gate serves any selectable planner date
**Then** the retained/fetched Met.no window is extended to cover the SAME
`today + PLANNER_MAX_FUTURE_DAYS` horizon as the geometry (raise the `slice(0, 48)` cap or
fetch enough slices), OR gating for an instant outside the retained forecast horizon
**explicitly degrades to unknown** (non-gating) rather than trusting a far-off slice —
covered by a test at the day+3 boundary

**Given** the planner window ROLLS at Stockholm midnight — if the last scheduled run was
before midnight, at 00:00 the selectable window gains a new `+PLANNER_MAX_FUTURE_DAYS` day
the job hasn't persisted yet, re-opening the cold-fallback hole this story closes
**When** the schedule is defined
**Then** coverage is CONTINUOUS across the midnight roll — either an **immediate
post-midnight run** (Stockholm) or a **one-day lookahead buffer** (precompute
`today + PLANNER_MAX_FUTURE_DAYS + 1`) — so the newly-selectable date is always already
persisted, never cold

**Given** the per-step shadow math is CPU-bound
**When** it is profiled at real-venue scale
**Then** cheap wins are taken or explicitly rejected with numbers (memoize per-step sun
positions across venues; early-exit fully-shaded / below-horizon steps) — this also
bounds the scheduled precompute's cost — and before/after cold + bucket-roll + precompute
timings are recorded

> **Cost note (maintainer question 2026-07-08):** the precompute is cheap on the axes
> you'd worry about and expensive only on one. Weather API: Met.no `locationforecast`
> returns a MULTI-DAY forecast in ONE call per location, and co-located venues dedupe by
> 4-decimal coords, so "all future days for all venues" is ~one call per distinct
> location per refresh — a few times/day is far under Met.no's ~20 req/s TOS (near-zero
> cost). Storage: N days × ~100 venues × 61 tiny JSON steps = kilobytes (negligible).
> The real cost is **offline CPU time**: N days × venues × 61 shadow projections per
> refresh — which is exactly why it runs on a GitHub Action (no serverless timeout) on a
> schedule, off the user request path, so users never pay it. Net: many fewer moving
> parts than it sounds, and no per-user API cost.

**Given** the external quarter-hour warmer is an uncommitted verification stopgap
**When** this story ships
**Then** the warmer is retired and no external keep-alive is required for normal
latency

## Design Gate Criteria (Verbatim From Epic)

- **Visual:** None — latency/values only; no UI change
- **Behaviour:** Time scrub stays zero-fetch (Epic 11 request-count gates scrub=0 /
  date-change=1 remain green)
- **Animation:** None
- **Visual validation:** Not applicable (no pixel change); the Epic-11 CI gates
  stand in as the regression net

## Implementation Reading (Non-Verbatim)

1. **Geometry and weather are split.** The full-day planner series is persisted as deterministic, ungated geometry keyed by `(venue_id, stockholm_date, geometry_input_hash)`. Weather gating is applied only at read time from the current weather snapshot/bucket.
2. **One canonical geometry hash exists and is shared.** Story 12.3 owns `geometry_input_hash` in exact `g1:<lowercase SHA-256>` form plus server-only canonicalization.
3. **Persisted geometry is service-only and cold reads do not compute shadows.** Missing exact current-hash coverage is a typed `503 SUN_GEOMETRY_COVERAGE_MISSING`, not a fallback to request-path compute or silent `sunDaySeries` omission.
4. **Scheduled coverage spans the selectable planner window plus midnight buffer.** Import `PLANNER_MAX_FUTURE_DAYS`; precompute today through `today + PLANNER_MAX_FUTURE_DAYS + 1`.
5. **Weather snapshots replace request-path provider fan-out.** Public list/detail reads snapshots and issue zero Met.no provider bursts.
6. **Future planner dates never use far-off weather slices.** Cover the planner horizon or degrade to weather `unknown`.
7. **Real-scale CPU cost is profiled and bounded off the request path.** Take or reject cheap wins with numbers.
8. **No external warmer or visual change remains.** Keep scrub=0/date-change=1 and retire the warmer.

## Tasks / Subtasks

- [ ] **Task 0 - Baseline, red-first contracts, and stop conditions** (AC: all)
  - [ ] Run the required baseline from `nextjs-app/` before editing: `npx tsc --noEmit` and `npx eslint . --quiet`. Stop and report unrelated baseline failures.
  - [ ] Add red-first Story 12.3 contract tests for the new fail-closed behavior: missing current-hash geometry returns `503 SUN_GEOMETRY_COVERAGE_MISSING`; public reads do not call Met.no or the 61-step shadow compute; old/wrong-date/wrong-hash artifacts cannot satisfy reads; and the existing same-date scrub/date-change request-count invariant stays green.
  - [ ] Add hash golden-vector scaffolds before implementing the canonical serializer. Include ring order/orientation invariance, row-order invariance, `-0` normalization, non-finite rejection, planner-step version participation, caster EWKB participation, and import-generation changes.
  - [ ] Add SQL/state-transition scaffolds for service-only RLS/grants, run claim/heartbeat/finish/fail, expired lease recovery, dirty/current/pending hash states, and atomic promotion. Text-presence assertions alone are not enough.
  - [ ] Preflight operational lanes before claiming completion: protected Supabase apply path, protected GitHub `Production` secrets/variables, and a way to collect 42+ venue cold p95 without mutating production from CI.

- [ ] **Task 1 - Create the persisted geometry, weather, and run schema** (AC: 2, 3, 4, 5)
  - [ ] Add versioned, idempotent repository-root migrations under `supabase/migrations/` for `venue_geometry_inputs`, `venue_sun_geometry_series`, `geometry_precompute_runs`, and `weather_bucket_snapshots`.
  - [ ] Enforce the planned contracts from Architecture: `venue_geometry_inputs.status` in `ready | building | dirty`; current/pending hashes matching `^g[0-9]+:[0-9a-f]{64}$`; `venue_sun_geometry_series` PK `(venue_id, stockholm_date, geometry_input_hash)`; exact ordered `series` JSON shape; run counters/timestamps/failure detail bounds; weather bucket/valid-time/expires fields.
  - [ ] Enable and force RLS, revoke all inherited privileges from `public`, `anon`, `authenticated`, and `service_role`, then grant only required service-role table/function operations. Add exact read-path indexes.
  - [ ] Add database functions/RPCs for `claim_geometry_precompute_run`, heartbeat/renew, completion, failure, dirty marking, and atomic publish. Use database time for leases and transitions.
  - [ ] Regenerate `nextjs-app/lib/supabase/types.ts`; update server repository row types and Zod/contract schemas together through the controlled Epic 12 migration seam.

- [ ] **Task 2 - Implement canonical hash and shared engine-coordinate helpers** (AC: 1, 2, 4)
  - [ ] Add a server-only hash module, for example under `nextjs-app/lib/services/sun-geometry-hash.ts`, using UTF-8 RFC 8785 JSON Canonicalization Scheme bytes and SHA-256.
  - [ ] Canonicalize seating polygons as EPSG:4326/2D with right-hand rings, no duplicate closing point during ordering, lexicographically rotated rings, sorted holes, restored closure, `-0` normalized to `0`, and non-finite values rejected. Numeric inputs use stored schema precision with no extra rounding; absent optionals serialize as explicit `null`.
  - [ ] Resolve caster canonical geometry through PostGIS `ST_AsEWKB(ST_Normalize(ST_Force2D(geometry)), 'XDR')`, uppercase hex, SRID 4326. Sort caster records by `(id, canonical EWKB, full canonical record)`.
  - [ ] Hash the actual runtime caster set used for projection, not an obstruction-risk prefilter approximation. Include caster IDs, canonical EWKB, `height_m`, `ground_z_rh2000`, `roof_z_rh2000`, active/filter/class/priority selection fields, and import generation/batch signal.
  - [ ] Extract one server-only `seatingCentroidWgs84` helper from the current brownfield arithmetic-mean behavior and route shadow lookup, forecast, nowcast, and hash generation through it. The existing private duplicate in `sun-engine.ts` must not remain as an independent source of truth. Fixture mode may retain its footprint fallback; live rows without a valid seating polygon fail input validation and cannot receive an artifact.
  - [ ] Surface the current `geometry_input_hash` only through the approved prediction-evidence seam needed by Story 12.2, for example an opaque additive DTO evidence field that is not displayed. Do not expose engine coordinates, caster rows, provider provenance, or service-table internals.

- [ ] **Task 3 - Persist ungated geometry and precompute the full window** (AC: 1, 3, 4, 6, 7)
  - [ ] Extract a geometry-only day-series producer from `computeVenueDaySeries` / `computeVenueDaySeriesResult` so it emits only `{ minutes, sunExposurePercent }` for every shared planner step from `PLANNER_START_MINUTES` through `PLANNER_END_MINUTES` inclusive. It must contain no weather, sky, confidence, public verdict, localized label, or top-level DTO fields.
  - [ ] Preserve parity with the current clear-sky geometry path at every planner step. Process caches may remain warm accelerators but are never the availability boundary.
  - [ ] Precompute all non-deleted live venues, hidden and visible, for today through `today + PLANNER_MAX_FUTURE_DAYS + 1`. Invalid hidden rows are preflight failures, not silently excluded.
  - [ ] Implement two-phase publish: validate/stage proposed inputs, compute the full planner-window artifacts for that staged snapshot, then atomically publish the input change, exact artifacts, and ready `venue_geometry_inputs.geometry_input_hash` in one DB transaction. Public reads keep seeing the complete old generation until the new generation commits.
  - [ ] Direct/out-of-band input changes that bypass staging must mark affected current hashes dirty in the same transaction and intentionally yield the typed fail-closed 503 until recomputed.
  - [ ] Record expected, written, reused, missing, stale-hash, failed, started/finished, duration, and bounded per-venue/date failure details for every run.

- [ ] **Task 4 - Implement weather snapshot refresh and read-time gating** (AC: 1, 5, 6)
  - [ ] Add a service-only weather snapshot repository and refresh runner. Deduplicate engine coordinates by the shared four-decimal bucket, enforce provider concurrency 4, two-second call timeout, and at most two transient retries with jitter.
  - [ ] Extend Locationforecast retention to the planner horizon or encode explicit out-of-horizon `unknown`. Do not keep the current `timeseries.slice(0, 48)` behavior if it lets day+3 use a stale nearest retained slice.
  - [ ] Preserve near-now rain semantics: nowcast is current/near-now only, unknown is distinct from `0`, active rain is an additive gate, and future planner steps outside the nowcast horizon do not read "raining now".
  - [ ] Apply weather gating from snapshots on list/detail reads. Existing `applyCloudGate` has an `isRaining = false` default; every new call site must pass the rain boolean explicitly so omitted rain cannot compile into "never raining".
  - [ ] Missing/expired weather yields `skyCondition: 'unavailable'` / explicit unknown freshness semantics and must never be treated as known-clear. Weather snapshot coverage is measured separately from geometry coverage and cannot make a geometry run complete.

- [ ] **Task 5 - Replace public list/detail request behavior** (AC: 1, 3, 5, 8)
  - [ ] Replace the real-engine list route's per-venue call to `computeVenueDaySeries` with exact persisted geometry reads plus read-time snapshot gating. The current try/catch path that omits `sunDaySeries` on failure is superseded for missing coverage; coverage holes return typed 503.
  - [ ] Update detail route behavior only as needed to use the same persisted current-hash geometry and weather snapshot gating for the selected instant/timeline fields. Do not attach `sunDaySeries` to detail unless a deliberate additive contract change is tested.
  - [ ] Preserve current DTO field meanings: `sunExposurePercent` remains geometric clear-sky seating share; weather gating may rewrite headline status/sky condition but must not mutate the persisted geometry percentage.
  - [ ] Keep `queryKeys.venues.*` and hooks aligned with the existing date-only client contract. Same-date time scrub remains client-side and zero network requests; date changes remain one request.
  - [ ] Add/adjust API error response typing so `SUN_GEOMETRY_COVERAGE_MISSING` is machine-readable in the body and telemetry includes venue/date/hash without leaking service rows to clients.

- [ ] **Task 6 - Add direct scheduled workflows, docs, envs, and allow-lists** (AC: 4, 5, 7, 8)
  - [ ] Add repository runners under `nextjs-app/scripts/` for geometry precompute and weather refresh, or one clearly separated runner with independent geometry/weather modes. Bundle with `esbuild` in GitHub Actions like the Story 12.1 hours audit runner.
  - [ ] Update `nextjs-app/.gitignore` allow-list for every new `nextjs-app/scripts/*` runner. If any root `scripts/*` helper is added, update root `.gitignore` allow-list too.
  - [ ] Add dedicated workflow(s) with `workflow_dispatch`, schedule, `main` branch restriction, protected `Production` environment, pinned core actions, npm cache, bounded timeout, GitHub workflow concurrency, and bounded summaries that include counts/run IDs but no secrets/provider payloads.
  - [ ] Configure/document independent fail-closed switches: `SUN_GEOMETRY_PRECOMPUTE_ENABLED=false`, `SUN_WEATHER_REFRESH_ENABLED=false`, and retain `SUN_HOURS_AUDIT_ENABLED=false` independently. Required secrets belong in GitHub protected environment variables/secrets, never committed.
  - [ ] Update `nextjs-app/docs/github-actions-scheduled-jobs.md`, `nextjs-app/docs/environment-variables.md`, `nextjs-app/docs/vercel-deployment.md`, `.env.example` / `nextjs-app/.env.example` as applicable, and the venue data/load docs where geometry invalidation or seating/caster edits are described.
  - [ ] Remove or explicitly retire the external quarter-hour warmer and any documentary `/api/cron/*` dependency that would keep normal latency alive outside this story's durable pipeline.

- [ ] **Task 7 - Prove security, parity, performance, and operational readiness** (AC: all)
  - [ ] Unit tests: hash golden vectors; JCS/canonical polygon/caster ordering; shared centroid; geometry-only series shape and parity; weather unknown/out-of-horizon/rain behavior; explicit `isRaining`; process-cache non-authority.
  - [ ] SQL/integration tests: migration replay; role denial with `SET ROLE anon|authenticated`; service-role intended operations; old/wrong hash denial; dirty state; atomic promotion race; interrupted publish; lease claim/heartbeat/expiry/final states; idempotent rerun; per-venue failure isolation with whole-run incomplete status.
  - [ ] API tests: exact persisted read; no shadow fallback; missing coverage typed 503; stale/expired weather unknown; zero live provider calls; no service data leakage; additive prediction-evidence hash field; current bucket re-gate parity; midnight rollover.
  - [ ] E2E tests: preserve Epic 11 scrub=0/date-change=1 gates; update request-count assertions to fail on request-path Met.no/nowcast and fail if date change causes more than the one list/favourites request.
  - [ ] Live/protected evidence: collect a dated 42+ venue cold p95 dataset with cold definition, route, venue count, Stockholm date, hash generation, edge/warm/cold classification, response mode, and logs/metrics proving persisted geometry reads plus zero request-path provider/shadow recompute. Do not substitute CI mocks for this lane.
  - [ ] Run from `nextjs-app/`: `npx tsc --noEmit`, `npx eslint . --quiet`, `npx vitest run`, and `npx playwright test` because this story touches route behavior, DTOs, and standing request-count gates. Run visual validation only if visible UI/copy changes despite the no-visual scope.
  - [ ] If Supabase CLI profile validation blocks a live/preview apply, use the documented protected-pooler plus explicit migration-history transaction fallback and record exact evidence in the Dev Agent Record.

## Dev Notes

### ATDD Artifacts

- Checklist: `_bmad-output/test-artifacts/atdd-checklist-12-3-day-series-compute-at-real-venue-scale-kill-the-cold-start-freeze.md`
- API/route tests: `nextjs-app/test/unit/api/story-12-3-persisted-geometry-route.atdd.test.ts`
- Hash/precompute/weather unit tests: `nextjs-app/test/unit/services/sun-geometry-hash.atdd.test.ts`, `nextjs-app/test/unit/services/sun-geometry-precompute.atdd.test.ts`, `nextjs-app/test/unit/services/weather-snapshots.atdd.test.ts`
- SQL/ops tests: `nextjs-app/test/unit/story-12-3-geometry-migrations-and-leases.atdd.test.ts`
- E2E request-count tests: `nextjs-app/test/e2e/story-12-3-persisted-geometry-request-count.atdd.spec.ts`
- Existing regression nets to update during green: `nextjs-app/test/unit/api/venues-route-day-series.atdd.test.ts`, `nextjs-app/test/unit/api/venues-route-day-series-degrade.test.ts`, `nextjs-app/test/unit/services/sun-engine.day-series-parity.atdd.test.ts`, `nextjs-app/test/unit/services/sun-engine-day-series-cache.atdd.test.ts`, and `nextjs-app/test/e2e/epic-11-scrub-zero-fetch.spec.ts`

### Current Implementation Facts

- `nextjs-app/app/api/venues/route.ts` currently computes `applyRealSunEngine` and then `computeVenueDaySeries` per stored venue in the real-engine branch. If `computeVenueDaySeries` throws, the route logs and returns the single-instant DTO without `sunDaySeries`; this behavior is incompatible with Story 12.3's fail-closed persisted-coverage contract.
- `nextjs-app/lib/services/sun-engine-cache.ts` is process-scoped. `sunDaySeriesCacheKey` currently includes the Stockholm date, a weather-refresh bucket, and an elevation/centroid variant. This intentionally recomputes the whole series every weather bucket and is the cold-start problem this story replaces with durable persisted geometry plus read-time gating.
- `nextjs-app/lib/services/sun-engine.ts#computeVenueDaySeriesResult` currently fetches buildings once, forecast once, optionally nowcast per near-now step, computes shadow math for every 15-minute planner step, and persists nothing. The new persisted series must be geometry-only and must not store `currentSunStatus`, `skyCondition`, confidence, weather, or labels.
- `nextjs-app/lib/services/sun-engine.ts#polygonCentroid` duplicates the brownfield centroid used for cache keys. Architecture `E12-AD-06` assigns Story 12.3 the shared `seatingCentroidWgs84` helper used by shadow lookup, forecast, nowcast, and hash generation.
- `nextjs-app/lib/weather/met-no-service.ts#getForecast` currently retains `timeseries.slice(0, 48)`, around two days. That is insufficient for `PLANNER_MAX_FUTURE_DAYS = 3` and must be changed or guarded as explicit out-of-horizon weather unknown.
- `nextjs-app/lib/weather/nowcast-service.ts` keeps unknown rain distinct from zero. Preserve that distinction when moving reads to snapshots.
- `nextjs-app/lib/types/api.ts#VenueDaySeriesEntry` currently documents a gated client-facing series. The persisted database artifact has a different contract: ungated `{ minutes, sunExposurePercent }`. If the public DTO remains gated, the conversion happens at read time and must be type-tested.
- `nextjs-app/docs/github-actions-scheduled-jobs.md` already documents the Story 12.1 direct GitHub Action pattern; Story 12.3 should extend it for geometry/weather jobs rather than copying the obsolete `.github/workflows/scheduled-cron-jobs.yml` HTTP cron pattern.
- `nextjs-app/.gitignore` ignores `scripts/*` except explicit allow-list entries. New scheduled runners must be unignored in the same change.

### Data And Contract Notes

- Planned tables are defined in `_bmad-output/planning-artifacts/architecture.md` under Persisted Data Contracts. Physical indexes or enum/check syntax may be refined, but table semantics, access posture, and ownership cannot change.
- Public handlers expose only DTO fields. The only allowed hash exposure is the opaque prediction-evidence hash needed for Story 12.2 feedback submission. Do not expose service-only geometry artifacts, caster payloads, weather snapshots, run rows, engine coordinates, or provenance.
- Existing route/detail behavior may still compute sun-window/peak timeline from the live engine. If this story changes detail internals, preserve current public meaning and make a deliberate tested decision about whether detail also reads persisted full-day artifacts or only selected-instant persisted geometry.
- Old-hash series may be retained briefly for diagnosis but can never satisfy current list/detail reads. Prune only after replacement coverage exists.
- Process-local caches can still accelerate warm computations inside the scheduler, but they cannot be the availability boundary for public requests.

### Retro And Deferred Carry-Ins

- Story 12.2 is currently blocked because Story 12.3 has not delivered the canonical `geometry_input_hash`. This story must leave that shared contract usable by the typed feedback evidence path, not only hidden inside a private batch job.
- Persistence work must explicitly define run ownership, input binding, and per-venue isolation. For this story: one run owns a specific window/hash contract; per-venue/date failures are recorded; successful old generations stay public until a complete replacement publishes; and a run with missing coverage fails rather than certifying a partial population.
- Database hardening must include executable state-transition tests for leases, dirty/building/ready transitions, atomic promotion, replay, and RLS. Source-text checks are insufficient.
- Repeatable CI must not call live Met.no, Google Places, or production Supabase. Use deterministic fixtures/fakes for provider and scheduler tests; live cold-p95/provider/protected-environment evidence is a separate Dev Agent Record lane.
- If adding a script under `nextjs-app/scripts/` or root `scripts/`, update the corresponding `.gitignore` allow-list immediately.
- If Supabase CLI profile validation blocks database push, the protected pooler plus explicit migration-history transaction fallback is accepted, but the exact apply and verification evidence must be recorded.
- Derive final test counts from actual framework output, not hand-maintained ATDD priority counts.
- Overlapping deferred work to address while touching this code:
  - `applyCloudGate` defaults `isRaining=false`; new call sites must pass rain explicitly.
  - The buildings-cache key has a duplicate centroid implementation; replace it with the Story 12.3 shared centroid helper.
  - Met.no invalid or out-of-horizon `validAt` must not silently select a stale nearest slice as fresh weather.
  - The current day-series tests do not fully cover sky-condition-only, rain, and weather-unavailable branch parity; widen parity as part of the route/read-time gating tests.
  - Confidence/coverage caps can currently include casters later excluded by elevation/terrain gates. Do not solve unrelated confidence policy here, but the hash must represent the actual runtime caster set used for projection so corrected geometry invalidates correctly.

### Testing Requirements

- Required local gates from `nextjs-app/`: `npx tsc --noEmit`, `npx eslint . --quiet`, `npx vitest run`, and `npx playwright test`.
- Database-sensitive tests should use project-scoped Compose test PostGIS or an isolated preview Supabase lane; never mutate production from automated tests.
- Automated tests must not make live Met.no/Google/provider calls. The shared `nextjs-app/test/setup/setup.ts` already guards `api.met.no`, `places.googleapis.com`, and `maps.googleapis.com`; keep new scheduler tests under deterministic injection.
- No visual validation is expected because the story has no UI/pixel scope. If visible error copy, loading behavior, confidence/uncertainty copy, or feedback evidence surfaces change, read `nextjs-app/docs/design/DESIGN.md`, keep Swedish copy/default a11y rules, run affected component/E2E/a11y tests, and use the provider-neutral visual validation wrapper for affected screen IDs.

### Out Of Scope

- Do not implement Story 12.2 aggregation, cap-bypass retirement, or feedback agreement mapping here beyond providing the shared hash/evidence seam.
- Do not implement Story 12.5 editor UI or seating/caster maintenance UI; only create the server-side publication/dirty seams it will later call.
- Do not implement Story 12.6 public sunny predicate/pin simplification or the shared `weatherGateState` policy here unless that story has already landed and this code is consuming it.
- Do not implement Story 12.7 live public venue resolver, Story 12.13 confidence-removal UI, or Story 12.14 selected-instant hours filtering.
- Do not add a public admin endpoint, public cron endpoint, browser Supabase writes, or committed credentials.

### Project Structure Notes

- Repository root is `C:\Users\Rasmus\sunnyseat`; the Next.js app root is `nextjs-app/`. Run npm/npx commands from `nextjs-app/`.
- Versioned production migrations belong in repository-root `supabase/migrations/`. Local `_bmad-output/*.sql` artifacts are evidence only.
- Client components must not import `nextjs-app/lib/solar`, `nextjs-app/lib/weather`, `nextjs-app/lib/supabase`, middleware, or building modules. Data access flows through API routes and query/mutation hooks.
- For local Docker/PostGIS, use project-local Compose files and the repository's Docker/WSL rules in `AGENTS.md`. Do not create fixed container names, fixed host ports, global networks, or Docker Desktop/daemon changes.

### Expected File Impact

**New (expected):**

- `supabase/migrations/<timestamp>_persist_sun_geometry_inputs_and_series.sql`
- `supabase/migrations/<timestamp>_geometry_precompute_runs_and_weather_snapshots.sql`
- `.github/workflows/sun-geometry-precompute.yml` and/or `.github/workflows/weather-snapshot-refresh.yml`
- `nextjs-app/lib/services/sun-geometry-hash.ts`
- `nextjs-app/lib/services/sun-geometry-repository.ts`
- `nextjs-app/lib/services/sun-geometry-precompute.ts`
- `nextjs-app/lib/services/weather-snapshot-repository.ts`
- `nextjs-app/scripts/precompute-sun-geometry.ts`
- `nextjs-app/scripts/refresh-weather-snapshots.ts`
- Focused Story 12.3 unit/API/SQL/ops tests under `nextjs-app/test/`

**Update (expected):**

- `nextjs-app/app/api/venues/route.ts`
- `nextjs-app/app/api/venues/[slug]/route.ts`
- `nextjs-app/lib/services/sun-engine.ts`
- `nextjs-app/lib/services/sun-engine-cache.ts`
- `nextjs-app/lib/weather/met-no-service.ts`
- `nextjs-app/lib/weather/nowcast-service.ts` only if snapshot integration needs a shared normalizer/timeout seam
- `nextjs-app/lib/services/venue-store.ts`
- `nextjs-app/lib/types/api.ts`
- `nextjs-app/lib/supabase/types.ts`
- `nextjs-app/lib/utils/time-planner.ts` only to export any missing server-safe window helper; do not change planner semantics
- `nextjs-app/test/setup/setup.ts` only if new provider hosts or redirect guards are required
- Existing day-series, route, request-count, and weather tests named in ATDD Artifacts
- `nextjs-app/.gitignore`, and root `.gitignore` only if a root script helper is added
- `nextjs-app/.env.example`, root `.env.example` if root Compose/docs need new knobs, `nextjs-app/docs/github-actions-scheduled-jobs.md`, `nextjs-app/docs/environment-variables.md`, `nextjs-app/docs/vercel-deployment.md`, and `nextjs-app/docs/venue-data-load.md`

**Must remain untouched unless a failing compatibility test proves otherwise:**

- Visual components, translations, design tokens, and reference PNGs
- Public sunny predicate/pin presentation owned by Story 12.6
- Live venue resolver/hidden public route matrix owned by Story 12.7
- Selected-instant opening-hours filtering owned by Story 12.14
- Feedback aggregation/cap-bypass retirement owned by Story 12.2

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Epic 12 / Story 12.3]
- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-12.md` - cold real-scale freeze correction and NFR35 rewrite]
- [Source: `_bmad-output/planning-artifacts/prd.md` - NFR1, NFR20, NFR28, NFR34, NFR35, NFR39]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - E12-AD-02, E12-AD-03, E12-AD-04, E12-AD-06, E12-AD-12, E12-AD-13, Persisted Data Contracts]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - no-visual-change/default behaviour constraints; run normal design gates only if UI/copy changes]
- [Source: `_bmad-output/test-artifacts/test-design/test-design-epic-12.md` - Story 12.3 risks R-001/R-002/R-005/R-008/R-009/R-010 and evidence lanes]
- [Source: `_bmad-output/auto-bmad/retro-notes/epic-12.md` - Story 12.1 and 12.2 carry-ins]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md` - overlapping weather/hash/centroid/deferred test concerns]
- [Source: `_bmad-output/implementation-artifacts/12-2-feedback-driven-accuracy-loop-retire-the-coverage-cap-bypass.md` - downstream Story 12.2 prerequisite gate]
- [Source: `project-context.md` - Epic 12 invariants, especially one geometry-input hash and current process-cache state]
- [Source: `AGENTS.md` - API boundary, BMAD story workflow, Docker/WSL, testing, secrets, and script-wrapper rules]
- [Source: `nextjs-app/app/api/venues/route.ts` - current real-engine list and day-series degrade path]
- [Source: `nextjs-app/app/api/venues/[slug]/route.ts` - current detail route real-engine path]
- [Source: `nextjs-app/lib/services/sun-engine.ts` and `nextjs-app/lib/services/sun-engine-cache.ts` - current process-cache and per-step compute]
- [Source: `nextjs-app/lib/weather/met-no-service.ts` and `nextjs-app/lib/weather/nowcast-service.ts` - current Met.no forecast/nowcast behavior]
- [Source: `nextjs-app/lib/services/venue-store.ts`, `nextjs-app/lib/types/api.ts`, and `nextjs-app/lib/utils/time-planner.ts` - current DTO/store/planner contracts]
- [Source: `nextjs-app/docs/github-actions-scheduled-jobs.md` and `.github/workflows/hours-review-audit.yml` - direct protected scheduled-job precedent]

## Dev Agent Record

### Agent Model Used

TBD

### Debug Log References

TBD

### Completion Notes List

TBD

### File List

TBD
