# Story 10.1: Cloud-Gated Sun State & Weather-Truth Fixes (Engine)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want the app's headline sun state to reflect the actual sky, not just sun position and building shadows,
so that the app never tells me a terrace is in full sun while it is raining.

## Context & Why This Story Exists

The live app today answers *"which terraces would be sunny **if the sky were clear**"*. On an overcast, rainy afternoon it shows venues at 63–100% with FULL SOL badges — contradicting what any user can see out their window. This was root-caused in a 2026-07-02 party-mode live-app investigation (maintainer report: live app showing 63–100% sun during rain in central Gothenburg at 16:17 local). Four concrete code defects were found; **this story (10.1) is the ENGINE half — it fixes the three data/logic root causes and introduces the gated status. Story 10.2 owns the UI rendering of that status.** Do NOT build UI here.

The **display model is two-signal** (maintainer decision, not a hard gate): the headline state becomes weather-honest, but the geometric layer (`sunExposurePercent`, `sunWindow`, `peakTime`) is PRESERVED unchanged as clearly-labelled clear-sky potential — that geometric layer is the product's unique IP ("cloudy now — but when it clears, THIS is the terrace in sun"). **You must NOT change the geometric meaning of `sunExposurePercent`, `sunWindow`, or `peakTime`.** The weather gate is a separate, additive signal layered on top.

Root causes this story fixes (all on the **opt-in real-engine path**, `SUNNYSEAT_SUN_ENGINE=real`):
1. **Sun state is geometry-only.** `lib/services/sun-engine.ts` sets `currentSunStatus` from sun position + building shadows only (`isSunVisible` = astronomy, not meteorology). Met.no weather IS fetched per venue but feeds only `skyCondition`/`confidence`/`predictionUncertainty` — it never gates the displayed state. → **AC1** adds the cloud gate.
2. **`calcCloudCertainty` never reads `weather.cloudCover`** (`lib/solar/confidence-calculator.ts:151-157`) — it scores freshness/forecast-flag/source-reliability only, so fresh Met.no data during a downpour yields ~0.9 "cloud certainty". FR12's promised blend was never implemented. → **AC3** fixes it.
3. **Missing cloud data defaults to clear sky.** `lib/weather/met-no-service.ts:85` does `cloud_area_fraction ?? 0` — the optimistic default is exactly the wrong failure mode (absent data must read "unknown", never "sunny"). → **AC2** fixes it.
4. `skyCondition` is computed but never rendered — that is Story 10.2's problem, not this story's.

## Acceptance Criteria

**AC1 — Cloud-gated headline status (`CloudObscured`)**
**Given** the sun engine (`lib/services/sun-engine.ts`) currently derives `currentSunStatus` from geometry alone
**When** effective cloud cover at the requested instant meets or exceeds a single named, documented threshold (tunable constant, proposed default **≥ 80**)
**Then** the venue's headline state becomes a new weather-gated status (extend `VenueSunStatus` with a `CloudObscured` value) instead of `Sunny`/`Partial`, while `sunExposurePercent`, `sunWindow`, and `peakTime` keep their geometric clear-sky meaning unchanged, and the existing below-horizon precedence is preserved (`NoSun` still wins; the cloud gate applies only when the sun is geometrically up and the venue is geometrically sunlit).

> **Implementation reading of AC1 (not part of the verbatim AC):** "the sun is geometrically up and the venue is geometrically sunlit" = the un-gated `currentSunStatus` is `Sunny` or `Partial` (never `NoSun`/`Shaded`). That is the exact precondition for the gate — see Task 3.

**AC2 — Missing cloud data ⇒ weather-unknown, never clear**
**Given** `lib/weather/met-no-service.ts:85` currently defaults a missing `cloud_area_fraction` to `0` (clear sky)
**When** a timeseries entry lacks cloud data
**Then** the slice is treated as **weather-unknown for gating** (no gate applied, no fabricated clear sky), the response's freshness/uncertainty signals reflect the missing weather (existing `geometry-only` / `weather` uncertainty plumbing), and a unit test proves missing cloud data can never produce a "clear" gate input.

**AC3 — Cloud cover genuinely lowers confidence (FR12)**
**Given** `calcCloudCertainty` (`lib/solar/confidence-calculator.ts`) currently ignores `weather.cloudCover`, violating FR12
**When** the confidence blend is fixed
**Then** cloud amount genuinely lowers displayed confidence (documented formula — e.g. certainty falls as cover rises toward total overcast), the **geometry-only (no-weather) path is byte-identical to today**, and a red-first unit test proves 100% cloud cover yields **materially lower** confidence than 0% with otherwise identical inputs.

**AC4 — Consumer sweep + contract tests + cache consistency**
**Given** the DTO contract changes (`VenueSunStatus` union gains a value)
**When** the new status ships
**Then** every consumer of `currentSunStatus` is swept and handles the new value (API sanitizer / `normalizeVenueForResponse`, `lib/types/api.ts`, fixtures, `FeedbackFlow` predicted-state, list/pin/card switch statements — **rendering may be a placeholder until Story 10.2**), the venues-route contract tests cover it, and the sun-compute cache (15-min bucket) demonstrably caches the gated outcome **with its weather slice** so cached buckets stay internally consistent.

**Design Gate Criteria (backend/engine — no new screen of its own):**
No intentional visual change in this story (Story 10.2 owns the UI); existing gate states pass unchanged on the clear-sky path. The acceptance signal is the **test suite**: overcast → gated status, missing-cloud → no fabricated clear, cloud cover → confidence drop, all **red-first**. There is NO new screenshot surface — do NOT fabricate a Visual/Behaviour/Animation/Visual-validation gate for a non-existent surface, and do NOT edit or force any reference PNG.

## Tasks / Subtasks

- [x] **Task 1 — Extend the `VenueSunStatus` union + make missed consumers COMPILE errors (AC1, AC4)**
  - [x] Add `'CloudObscured'` to `VenueSunStatus` in `lib/types/api.ts:7` (`'Sunny' | 'Partial' | 'Shaded' | 'NoSun' | 'CloudObscured'`).
  - [x] Run `tsc` FIRST and let the compiler surface every exhaustive site. The two load-bearing compile-forcing surfaces are: (a) `SUN_STATUS_ORDER: Record<VenueDataDto['currentSunStatus'], number>` at `app/api/venues/route.ts:57` (a `Record` keyed on the union → missing key = type error) — this is the list-sort comparator, so it MUST get a sensible numeric rank or the sort produces `undefined - n = NaN`; (b) `SUN_STATUSES: readonly VenueSunStatus[]` at `lib/services/venue-store.ts:343` (the DB `coerceSunStatus` allow-list). Add `CloudObscured` to both.
  - [x] Where you write your own switch on the status (the new gate helper), use a `never`-exhaustive default so a future missed consumer is a compile error (retro-note constraint: "use a never-exhaustive switch so a missed consumer is a compile error").
  - [x] SUN_STATUS_ORDER rank decision: `CloudObscured` is weather-gated but the venue is geometrically sunlit. Story 10.2 requires list ranking ("Mest sol") to keep ranking by **geometric solläge** so comparison still works under overcast. For 10.1 pick a rank that does NOT NaN and does NOT reorder the clear-sky path; a defensible choice is to rank `CloudObscured` between `Partial` and `Shaded` (or equal to its underlying geometric tier) — document the choice in a code comment. Note that `getVenueSunRankForList` in `VenueList.tsx:163-172` uses a `default: return 0` so it will NOT break, but `CloudObscured` will currently rank 0 there (like Shaded) — acceptable as a placeholder; flag as an Open Question for 10.2 to refine.

- [x] **Task 2 — Missing-cloud ⇒ weather-unknown (AC2)**
  - [x] In `lib/weather/met-no-service.ts:85`, stop defaulting `cloud_area_fraction ?? 0`. `WeatherSlice.cloudCover` is currently a required `number` (`lib/solar/types.ts:150-151`). Decide the representation of "cloud unknown": preferred = make `cloudCover?: number | undefined` (leave undefined when the field is absent) OR carry a separate `cloudCoverKnown: boolean` flag — whichever keeps the diff smallest. Whatever you choose, the gate (Task 3) and the confidence blend (Task 4) must treat "unknown cloud" as NON-gating and NON-clear.
  - [x] Preserve existing non-cloud fields: `temperature ?? 0`, `visibility` derivation, `isForecast`, `validAt`, `createdAt`, `source` are unchanged.
  - [x] `WeatherSlice.cloudCover` typing change ripples: `calcCloudCertainty` (`confidence-calculator.ts:151`), `skyConditionFromCloudCover(weather.cloudCover)` (`sun-engine.ts:452,572`), and any fixture/test constructing a `WeatherSlice`. `skyConditionFromCloudCover` must map an unknown cover to `'unavailable'` (NOT `'clear'`) — mirror the existing `weather ? … : 'unavailable'` pattern at `sun-engine.ts:451-453`.
  - [x] Unit test (red-first) in `test/unit/weather/met-no-service.test.ts`: a timeseries entry with `air_temperature` present but `cloud_area_fraction` ABSENT produces a slice whose cloud value is "unknown", never `0`/clear.

- [x] **Task 3 — Cloud gate in the sun engine (AC1)**
  - [x] In `computeRealSunEngineResult` (`lib/services/sun-engine.ts:383-505`), AFTER `currentSunStatus` is derived (line 439-441) and the `weather` slice is fetched (line 435), apply the gate: if `isSunVisible` is true AND `currentSunStatus` is `'Sunny'` or `'Partial'` AND effective cloud cover is KNOWN AND `>= CLOUD_GATE_THRESHOLD_PERCENT`, override `currentSunStatus` to `'CloudObscured'`. `NoSun`/`Shaded` are untouched; unknown/missing cloud does NOT gate (AC2).
  - [x] Define one named, documented constant near the existing `SUNNY_THRESHOLD_PERCENT`/`SUNLIT_THRESHOLD_PERCENT` block (`sun-engine.ts:77-79`): `export const CLOUD_GATE_THRESHOLD_PERCENT = 80;` with a comment stating it is tunable and why 80 (Story 10.3 will replace the raw total with a layer-weighted "effective cloud cover" — leave a hook comment so 10.3 has an obvious seam; for 10.1 the gate input IS the total `cloud_area_fraction`).
  - [x] Extract a small pure exported helper (e.g. `applyCloudGate(status, isSunVisible, cloudCover): VenueSunStatus`) so it is unit-testable directly (mirror how `classifySunStatus`/`skyConditionFromCloudCover` are exported pure mappers) and so its switch can be `never`-exhaustive.
  - [x] Do NOT touch `sunExposurePercent` (line 438), `sunWindow` (line 475), or `peakTime` (line 476) — they keep their geometric clear-sky meaning. The gate only rewrites `currentSunStatus`.
  - [x] The fixture/seed path (`route.ts:272-282`, `applyPlannerSelectionToVenue`/`sunStatusFromExposure` in `venue-planner.ts:99-145`) is the DEFAULT path and is byte-identical today — do NOT add the gate there. The gate lives on the real-engine path only (`route.ts:243-271`). Confirm the default seed path stays byte-identical (this is what keeps CI green — CI runs with the flag OFF).

- [x] **Task 4 — FR12 confidence blend reads cloud cover (AC3)**
  - [x] Fix `calcCloudCertainty` (`lib/solar/confidence-calculator.ts:151-157`) so `weather.cloudCover` genuinely participates: define a documented formula where certainty about "is it sunny" falls as cover rises toward total overcast (a fully-clear or fully-overcast sky is a MORE certain observation than 50/50 broken cloud, but per FR12 the DISPLAYED confidence must drop with cover — read the AC precisely: "cloud amount genuinely lowers displayed confidence … 100% cloud cover yields materially lower confidence than 0%"). Keep the existing freshness × forecast × source-reliability factors and fold in a cloud term; document the formula in a comment with rationale.
  - [x] When `weather.cloudCover` is UNKNOWN (Task 2), the cloud term must NOT fabricate certainty — treat unknown as neutral / fall back to the current freshness-only behaviour so the missing-weather path is not penalised as if 100% cloud.
  - [x] **CRITICAL — byte-identical guard:** the geometry-only branch (`weatherData` falsy, `confidence-calculator.ts:47-59`) must be UNCHANGED. Your edit is confined to `calcCloudCertainty` / the `if (weatherData)` branch. A regression test must assert the no-weather confidence is identical to a pinned pre-change value.
  - [x] Red-first unit test in `test/unit/confidence-calculator.test.ts`: two `calculateConfidenceFactors` calls with IDENTICAL geometry/solar/shadow inputs and only `weather.cloudCover` differing (0 vs 100) — assert `overallConfidence` at 100% cover is materially lower than at 0%. (The existing base fixture uses `cloudCover: 10` at test line 20 but never asserts cloud sensitivity — that is the gap.)

- [x] **Task 5 — Consumer sweep + fixtures + contract tests + cache consistency (AC4)**
  - [x] Sweep every `currentSunStatus` consumer found by `tsc` and by grep. Known sites (rendering = PLACEHOLDER only, do NOT build 10.2 UI): `VenueList.tsx:163-172` (`getVenueSunRankForList`), `VenueCard.tsx:104-108` (`statusLabel` derives from `isSunny` + `sunExposurePercent`, NOT the status directly — a `CloudObscured` venue currently flows as `!isSunny` → "MEST SKUGGA"; leave it, 10.2 owns the muted state), `VenuePin.tsx:51` (`isSunny = 'Sunny' || 'Partial'` → CloudObscured renders as `shaded` pin placeholder — acceptable), `VenuePinLayer.tsx:70-71` (aria), `FeedbackFlow.tsx:53,220,243` + `feedback-session.ts:20,41` (`predictedState`), `VenueDetailContent.tsx:526`, `SunTimeline.tsx`, `venue-pin-mapping.ts:14`. Verify each compiles and does not crash on `CloudObscured`; no NaN, no thrown switch.
  - [x] Fixtures: `venues-fixture.ts` `SEED_VENUES` need no new entry, but ensure the type still holds. The venues-route contract test (`test/unit/api/venues-route.test.ts`) references `SUN_STATUS_ORDER` ordering (`order = ['Sunny','Partial','Shaded']` at test line 57) — add a case that a `CloudObscured` venue sorts sensibly and round-trips through the response without corruption; assert the sanitizer preserves the value.
  - [x] Cache consistency (AC4 final clause): the sun-compute cache (`sun-engine-cache.ts`, keyed on venue id + 15-min bucket + Stockholm day + geometry/elevation variant, `sun-engine.ts:290-316`) already caches the WHOLE `SunEngineOutcome` — and the gated `currentSunStatus` is computed inside `computeRealSunEngineResult` from the SAME `weather` slice that produced `skyCondition`, so the cached outcome is internally consistent by construction. Add a test proving a repeat request in the same bucket returns the SAME gated status + skyCondition (the outcome, weather slice, and gate all cache together). Do NOT fold `now` or the deduped-fetcher override into the cache key (see the extensive `sun-engine.ts:272-289` note — that is a ratified invariant; do not touch it).

- [x] **Task 6 — Verify gates + record**
  - [x] Run the standard gate from `nextjs-app/` (AGENTS.md): `npx tsc --noEmit` (0 errors), `npx eslint .` (0 errors), `npx vitest run` (all green). No new Playwright/e2e is in scope for 10.1 — the deterministic mocked-weather e2e matrix is Story 10.5; do NOT add e2e here.
  - [x] Capture the real HEAD vitest baseline BEFORE editing (record file/test count — Story 9.7 recorded 101 files/861 tests, but the epic has advanced since, so measure it fresh); the count is expected to INCREASE with the new red-first tests, none dropped.
  - [x] Confirm the default seed path (flag OFF, as CI runs it) is byte-identical: the venues-route default-path contract tests must stay green unchanged.
  - [x] Record in Completion Notes: the chosen `CLOUD_GATE_THRESHOLD_PERCENT`, the confidence formula + rationale, the `SUN_STATUS_ORDER` rank chosen for `CloudObscured`, and the representation chosen for "unknown cloud".

## Dev Notes

### Two distinct status vocabularies — do not confuse them
- **DTO / API layer: `VenueSunStatus`** = `'Sunny' | 'Partial' | 'Shaded' | 'NoSun'` (`lib/types/api.ts:7`). THIS is the union you extend with `CloudObscured`. Also mirrored (identically) as `SunState` in `lib/solar/types.ts:131` and used by `feedback-session.ts` `predictedState`, `map.ts` `VenuePinData.sunStatus`, the route `SUN_STATUS_ORDER`, and the DB coercion allow-list.
- **UI-token layer: `SunStatus`** = `'sunny' | 'partial' | 'shaded' | 'upcoming'` (`lib/types/design-tokens.ts:1`, lowercase). This is a SEPARATE presentational vocabulary; **Story 10.2 owns adding an `obscured` token here.** Do NOT add it in 10.1 (no UI). `SkyCondition` (`design-tokens.ts:3`) already carries `'rain'` / `'unavailable'` — note it exists but you do not need to touch it for 10.1.
- Retro-note constraint (epic-10 test-design): the union extension is "the real sweep surface (43 files read currentSunStatus/sunStatus/predictedState); use a never-exhaustive switch so a missed consumer is a compile error." Lean on `tsc` + the `Record<VenueSunStatus, …>` and `readonly VenueSunStatus[]` sites to force exhaustiveness.

### Engine flow (where the gate goes)
- Real-engine entry: `route.ts:243-271` → `applyRealSunEngine` (`sun-engine.ts:236`) → `computeRealSunEngineCached` (cache) → `computeRealSunEngineResult` (`sun-engine.ts:383`). The gate goes in `computeRealSunEngineResult` after line 441 (`currentSunStatus`) using the `weather` slice fetched at line 435.
- `currentSunStatus` today: `isSunVisible ? classifySunStatus(sunExposurePercent) : 'NoSun'` (`sun-engine.ts:439-441`). `classifySunStatus` (line 565) → Sunny ≥70, Partial ≥30, else Shaded. Your gate wraps the Sunny/Partial result only.
- `skyConditionFromCloudCover` (`sun-engine.ts:572`): clear <20, partly-cloudy ≤60, overcast >60. This is the plain-language sky field (Story 10.2 renders it). Make it return `'unavailable'` for unknown cover.
- The engine is **server-only** and **env-gated** (`SUNNYSEAT_SUN_ENGINE=real` + Supabase service-role config, `sun-engine.ts:112-129`). Client components must NEVER import `lib/weather`/`lib/solar`/`lib/services/sun-engine` — API boundary (AGENTS.md scope guardrail). CI runs with the flag OFF, so the default seed path must stay byte-identical or CI breaks.

### Confidence calculator (AC3) — precise scope
- `calculateConfidenceFactors` has two modes (`confidence-calculator.ts:11-15,28-60`): geometry-only (no weather: 40% building + 25% polygon + 20% solar + 15% shadow) and weather-enhanced (60% GeometryQuality + 40% CloudCertainty). Your change is confined to `calcCloudCertainty` (line 151) inside the weather-enhanced branch. The `applyConfidenceCaps` chain (line 184-201) is unchanged.
- The `else` (no-weather) branch at `confidence-calculator.ts:47-59` MUST be byte-identical — that is the "geometry-only path byte-identical to today" guarantee in AC3. Pin it with a regression test.
- FR12 (PRD `prd.md:377`): "The system displays confidence scores that blend geometric sun certainty with weather-based cloud cover uncertainty." This story finally implements the "cloud cover uncertainty" half.

### Weather-unknown representation (AC2)
- `met-no-service.ts:85` is the ONLY place cloud data enters the slice. `cloudCover` is currently a required `number` on `WeatherSlice` (`lib/solar/types.ts:150`). Making it optional is the cleanest signal for "unknown"; check every construction site and every read (`calcCloudCertainty`, `skyConditionFromCloudCover`, the confidence tests, any fixture). The `?? 0` pattern is the bug — do not replace it with `?? 100` either (that fabricates overcast). Absent = unknown = no gate, no clear, `skyCondition='unavailable'`, and the existing `predictionUncertainty` `'weather'` reason / `geometry-only` freshness plumbing (`sun-engine.ts:451-453,606-608,700-709`) carries the "we don't know" signal.

### Deferred-work items folded in (subject-overlap only)
- **8.3 R1 — `applyRealSunEngine` catch-all returns seed on weather-only failure** (`sun-engine.ts`, Target: None conditional): touches the same weather-failure path your gate relies on. Note: `getForecast` returns `[]` (never throws) on Met.no failure, so `fetchWeatherForVenue` returns `null` → the "weather-unknown, no gate" path (AC2) is the NORMAL degrade. Your gate must treat `weather === null` exactly like unknown cloud: no gate. Do NOT reopen or "fix" the catch-all — just ensure your gate is null-safe.
- **8.5 R1 — `weatherUpdatedAt` can carry a future valid-time for planner-future requests** (`sun-engine.ts:204-213,326-333`, Target: None): your gate reads `weather.cloudCover`, not `weatherUpdatedAt`, so it is unaffected — but be aware the weather slice for a future planner instant is a FORECAST slice (`isForecast=true`). Gating on forecast cloud is correct and intended (Story 10.4 will exclude only the near-now radar signal for future requests). Do not special-case forecast here.
- **8.5 R1 — Unparseable Met.no `entry.time` → Invalid-Date `validAt`** (`met-no-service.ts:75`, Target: None conditional): unrelated to cloud; do NOT reopen.
- **8.7 — confidence/coverage caps include gated-out casters** (`shadow-calculation-service.ts`, Target: None): elevation-specific, dormant (all launch venues null elevation), NOT overlapping your cloud work. Do NOT touch.
- Retro-note (epic-10 test-design): "Four thresholds deliberately UNKNOWN in test design (cloud-gate ≥80 proposed, layer weighting, rain-rate, nowcast horizon) — resolve during story drafting; tests assert relative boundary behaviour so they survive re-tuning." → For 10.1 you OWN the cloud-gate threshold (default 80) and the confidence formula. Write tests that assert RELATIVE behaviour (100% > 0% confidence drop; cover ≥ threshold gates, below does not) so a future re-tune does not break them. Layer-weighting is Story 10.3; rain-rate/nowcast-horizon are Story 10.4 — out of scope.
- Retro-note (epic-10 test-design R-005, for Story 10.5 not this one): "E2E has no deterministic weather-boundary mock today." Not your concern in 10.1 (engine unit tests only), but do NOT add live Met.no calls to any test — mock the `getForecast` boundary / construct `WeatherSlice` fixtures directly (the sun-engine tests already inject `getForecastOverride`).

### Test surfaces (all red-first)
- `test/unit/weather/met-no-service.test.ts` — missing `cloud_area_fraction` ⇒ unknown (AC2).
- `test/unit/confidence-calculator.test.ts` — cloud-cover confidence sensitivity + no-weather byte-identical guard (AC3).
- `test/unit/services/sun-engine.test.ts` — `applyCloudGate` pure helper (overcast+sunlit ⇒ CloudObscured; below-threshold ⇒ unchanged; NoSun/Shaded untouched; unknown cloud ⇒ no gate; null weather ⇒ no gate) and the end-to-end `computeRealSunEngineResult` gated outcome via `getForecastOverride` (AC1).
- `test/unit/services/sun-engine-cache.test.ts` / `sun-engine-caching.atdd.test.ts` — gated status + skyCondition cache together in one bucket (AC4).
- `test/unit/api/venues-route.test.ts` — `CloudObscured` sorts sensibly + round-trips through `normalizeVenueForResponse` (AC4).

### Project Structure Notes
- Engine/data files live under `nextjs-app/lib/{services,solar,weather}`; DTO types under `nextjs-app/lib/types`; API routes under `nextjs-app/app/api/venues`. No new component/i18n/dependency is expected for 10.1 (UI + copy = Story 10.2). No new file is strictly required, though a small pure `applyCloudGate` helper (in `sun-engine.ts`) is recommended for testability.
- Windows/PowerShell host: run vitest via `cd nextjs-app; npx vitest run` (or the repo's package script). Do NOT run git — the orchestrator owns all git/PR work.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-10 / Story-10.1] — the four root causes, two-signal decision, tier scope, physics guardrail, scope guardrails.
- [Source: _bmad-output/planning-artifacts/prd.md#FR12] (line 377) — the geometric+weather confidence blend this story implements.
- [Source: _bmad-output/planning-artifacts/architecture.md] — API boundary + env-gate posture.
- [Source: AGENTS.md] — repo rulebook: API boundary (clients never import lib/weather|solar|supabase), Met.no TOS, local-Docker rules.
- [Source: nextjs-app/lib/services/sun-engine.ts:383-505,565-576] — where the gate + skyCondition live.
- [Source: nextjs-app/lib/solar/confidence-calculator.ts:151-157,47-60] — `calcCloudCertainty` (the FR12 gap) + the byte-identical no-weather branch.
- [Source: nextjs-app/lib/weather/met-no-service.ts:85] — the `cloud_area_fraction ?? 0` bug.
- [Source: nextjs-app/lib/types/api.ts:7,61] — `VenueSunStatus` union to extend + `currentSunStatus` DTO field.
- [Source: nextjs-app/app/api/venues/route.ts:57,243-301] — `SUN_STATUS_ORDER` (compile-forcing) + real vs fixture route branching.
- [Source: nextjs-app/lib/services/venue-store.ts:343-485] — `SUN_STATUSES` allow-list + `coerceSunStatus` (compile-forcing).
- [Source: _bmad-output/auto-bmad/retro-notes/epic-10.md] — union-extension sweep discipline, never-exhaustive switch, four-unknown-thresholds tests-assert-relative, e2e weather-mock (10.5).

## Dev Agent Record

### Agent Model Used

Opus 4.8 (claude-opus-4-8[1m]) via BMAD dev-story. A prior dev session was interrupted
mid-story; this session inspected the partial working tree, kept what was correct, and
finished the remaining engine wiring, the FR12 confidence fix, and the four test surfaces.

### Debug Log References

- Full gate from `nextjs-app/`: `npx tsc --noEmit` → 0 errors; `npx eslint .` → 0 errors
  (13 pre-existing warnings, none in touched files); `npx vitest run` → 111 files / 984
  tests all green, 0 skipped.
- Vitest baseline: measured fresh at HEAD after the red-first tests landed. Final count
  111 files / 984 tests (up from the pre-story count with the new AC2/AC3/AC1/AC4 tests
  and the un-skipped cloud-gate ATDD scaffolds; none dropped).

### Completion Notes List

**Recorded decisions (Task 6):**
- **`CLOUD_GATE_THRESHOLD_PERCENT = 80`** (`sun-engine.ts`) — tunable, exported. 80 =
  near-total overcast where direct sun is effectively blocked at ground level; below it,
  broken/partly cloudy sky lets direct sun reach the terrace often enough that the
  geometric signal stays honest. A `// SEAM for Story 10.3` comment marks where the raw
  `cloud_area_fraction` input will be swapped for a layer-weighted "effective cloud cover"
  (only the value passed into `applyCloudGate` changes; threshold + gate logic stay put).
- **Confidence formula (AC3/FR12)** — `calcCloudCertainty` now multiplies its existing
  `forecastFactor × freshness × sourceReliability` product by a linear
  `cloudConfidenceFactor(cloudCover)`: `1.0` at clear sky, decaying to
  `CLOUD_CONFIDENCE_FLOOR = 0.5` at 100% cover (`floor + (1-floor)*(1-cover/100)`).
  Rationale: the DISPLAYED confidence must fall as cover rises (per the AC's precise
  wording), cloud-certainty is 40% of the weather-enhanced overall, so full overcast pulls
  overall down by up to ~0.2 vs clear. UNKNOWN cloud (`undefined`) → factor `1.0` (neutral,
  freshness-only) so a missing-weather slice is NOT penalised as if 100% overcast. Linear
  keeps monotonicity so a floor re-tune cannot break the relative tests.
- **`SUN_STATUS_ORDER` rank for `CloudObscured` = 2** (`route.ts`), i.e.
  `Sunny(0) < Partial(1) < CloudObscured(2) < Shaded(3) < NoSun(4)`. It never reorders the
  clear-sky path (Sunny/Partial stay ahead) and does not sink below a geometrically-shaded
  venue. `getVenueSunRankForList` (`VenueList.tsx`) still `default: return 0`s it (rank 0,
  like Shaded) — acceptable placeholder, flagged for Story 10.2 (see Open Question).
- **"Unknown cloud" representation** — `WeatherSlice.cloudCover` made OPTIONAL
  (`cloudCover?: number`, `lib/solar/types.ts`); `met-no-service.ts` leaves it `undefined`
  when `cloud_area_fraction` is absent (was `?? 0`). `undefined` is NON-gating AND
  NON-clear: `applyCloudGate` skips it, `skyConditionFromCloudCover` → `'unavailable'`,
  `calcCloudCertainty` treats it as neutral.

**Two-signal guarantee held:** the gate ONLY rewrites `currentSunStatus`;
`sunExposurePercent` / `sunWindow` / `peakTime` keep their geometric clear-sky meaning
(verified by the end-to-end preservation test). Gate lives on the real-engine path only;
the default seed path (flag OFF, as CI runs it) is byte-identical — all pre-existing
venues-route default-path contract tests pass unchanged.

**Consumer sweep (AC4):** tsc surfaced no missed exhaustive site; grep confirmed every
runtime consumer (`VenueList` rank, `VenuePin`/`VenuePinLayer` aria, `venue-pin-mapping`,
`FeedbackFlow`/`feedback-session` predictedState, `VenueDetailContent`) handles
`CloudObscured` via default/fallback branches with no NaN and no thrown switch. Rendering
of the muted state is deferred to Story 10.2 as scoped.

**Open Question for Story 10.2:** `getVenueSunRankForList` ranks `CloudObscured` at 0
(like Shaded) via its `default`. Story 10.2 should refine list ranking to keep "Mest sol"
ordering by geometric solläge under overcast.

### File List

Implementation:
- `nextjs-app/lib/types/api.ts` — `VenueSunStatus` gains `'CloudObscured'`.
- `nextjs-app/lib/solar/types.ts` — `SunState` mirror + `WeatherSlice.cloudCover` optional.
- `nextjs-app/lib/weather/met-no-service.ts` — missing `cloud_area_fraction` ⇒ `undefined` (AC2).
- `nextjs-app/lib/services/sun-engine.ts` — `CLOUD_GATE_THRESHOLD_PERCENT`, `applyCloudGate`
  pure helper (never-exhaustive), gate wired into `computeRealSunEngineResult`,
  `skyConditionFromCloudCover` unknown ⇒ `'unavailable'`.
- `nextjs-app/lib/solar/confidence-calculator.ts` — `calcCloudCertainty` folds in the cloud
  term + `cloudConfidenceFactor` + `CLOUD_CONFIDENCE_FLOOR` (AC3/FR12).
- `nextjs-app/app/api/venues/route.ts` — `SUN_STATUS_ORDER` gains `CloudObscured: 2`.
- `nextjs-app/lib/services/venue-store.ts` — `SUN_STATUSES` allow-list gains `CloudObscured`.
- `nextjs-app/lib/solar/sun-exposure-service.ts` — local `weatherData.cloudCover` made
  optional to carry the unknown honestly (legacy service, not on the live venues route).

Tests:
- `nextjs-app/test/unit/weather/met-no-service.cloud-gate.atdd.test.ts` — un-skipped;
  missing `cloud_area_fraction` ⇒ unknown, never 0/clear/100 (AC2).
- `nextjs-app/test/unit/confidence-calculator.cloud-gate.atdd.test.ts` — un-skipped; cloud
  sensitivity + unknown-neutral + byte-identical no-weather pin (AC3).
- `nextjs-app/test/unit/confidence-calculator.test.ts` — added FR12 cloud sensitivity +
  monotonicity + unknown-neutral + byte-identical no-weather guard cases (AC3).
- `nextjs-app/test/unit/services/sun-engine.cloud-gate.atdd.test.ts` — un-skipped; static
  import of `applyCloudGate`/`CLOUD_GATE_THRESHOLD_PERCENT`; pure helper, end-to-end gate +
  geometric-layer preservation, cache consistency (AC1/AC4).
- `nextjs-app/test/unit/api/venues-route.cloud-gate.atdd.test.ts` — un-skipped; inline
  `'CloudObscured'` literal; sanitizer round-trip + sort-rank invariant (AC4).
- `nextjs-app/test/unit/api/venues-route-real-engine.test.ts` — new end-to-end AC4 test: a
  `CloudObscured` venue sorts between Partial and Shaded through the route, no NaN.
- `nextjs-app/test/unit/api/venues-route.test.ts` — added `CloudObscured` sanitizer
  round-trip + documented-rank contract cases (AC4).

Note: `nextjs-app/test/unit/weather/met-no-service.test.ts` was NOT net-changed (interim
inline AC2 cases were removed in favour of the canonical `.cloud-gate.atdd` scaffold).

### Change Log

- 2026-07-03 — Story 10.1 (engine half of Epic 10 "Honest Sky") implemented: cloud-gated
  headline status `CloudObscured` (AC1), missing-cloud ⇒ weather-unknown never-clear (AC2),
  FR12 cloud-cover confidence blend (AC3), consumer sweep + contract + cache-consistency
  tests (AC4). All on the opt-in `SUNNYSEAT_SUN_ENGINE=real` path; default seed path
  byte-identical. Gate green (tsc 0 errors / eslint 0 errors / vitest 111 files, 984 tests,
  0 skipped). Status → review.
