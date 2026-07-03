# Story 10.4: Rain-Now Signal (Met.no Nowcast 2.0)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want the app to know it is raining right now,
so that a terrace is never presented as a sun destination during active rain.

## Context & Why This Story Exists

Epic 10 "Honest Sky" makes the headline sun state weather-honest while preserving the geometric sun-position layer as a clearly-labelled second signal. The tiers so far, all on the **opt-in real-engine path** (`SUNNYSEAT_SUN_ENGINE=real`), are DONE (status `review`) on this branch:

- **Story 10.1 (Tier 0, ENGINE):** a geometrically-sunlit venue whose **effective** cloud cover ≥ `CLOUD_GATE_THRESHOLD_PERCENT` (80) is re-labelled `CloudObscured`; missing cloud data stays `undefined` (never `?? 0`); the FR12 confidence blend now reads cloud cover.
- **Story 10.2 (UI):** the muted "Sol bakom moln" fourth visual state renders `CloudObscured`, and the serialized `skyCondition` (`clear`/`partly-cloudy`/`overcast`/`unavailable`) is surfaced as plain-language copy on quick-info + detail.
- **Story 10.3 (Tier 1, DATA):** switched the Met.no fetch to the `complete` endpoint for the three-layer cloud split and computes a layer-weighted `effectiveCloudCover` (low/med = 1.0, high = 0.25, clamped 0..100) that feeds BOTH the gate and the confidence blend; `skyCondition` deliberately stays on the RAW TOTAL (observable-sky honesty).

**This story (10.4) is Tier 2: the rain-now radar signal.** Cloud fraction is a good "is the sky blocked" proxy, but Met.no Nowcast 2.0 gives radar-based ~5-minute **precipitation rate** for the Nordics — a direct "it is raining RIGHT NOW at this coordinate" signal. Under active rain a terrace is unambiguously not a sun destination regardless of the reported cloud fraction, so 10.4:

1. **Adds a nowcast client** to `lib/weather` (mirroring the forecast client's TOS posture + graceful `[]`/null degradation), giving the engine "precipitation rate at this coordinate now" for near-now requests.
2. **Makes rain force the gate:** active precipitation (rate > 0) at the requested near-now instant re-labels a geometrically-sunlit venue `CloudObscured` **regardless of the cloud-fraction value** ("rain wins"), and the surfaced `skyCondition` reflects rain in plain language.
3. **Honours the epic's HARD CONSTRAINT — absence of rain must NEVER imply sun:** a no-rain nowcast result contributes NOTHING positive; sun position, building shadows, and effective cloud cover still fully decide the outcome.
4. **Excludes the nowcast for future planner requests:** when `requestedAt` is beyond the nowcast's short horizon (or a future day), the "now" radar reading is not consulted (forecast cloud governs, exactly as Tiers 0/1) — future planning never mixes in a stale "now" radar reading.

**This is a BACKEND/DATA story — NO new screen.** The Design Gate (epics.md:2763) is explicit: "No new UI surface (rain reuses the Story 10.2 obscured presentation + sky-condition copy). Acceptance signal: the constraint tests above + engine tests proving rain forces the gate and nowcast failure changes nothing." The ONE small UI-adjacent ripple that IS in scope: the `'rain'` sky-condition value must render plain-language copy (AC2 "the surfaced sky condition reflects rain in plain language"). The presentation seam (`skyConditionCopy`) and the `SkyCondition` token already anticipate `'rain'` — you wire that copy through (extend the copy map + the two `messages/{locale}/venue.json` scopes), you do NOT design a new visual state (rain uses the SAME muted "Sol bakom moln" obscured chrome as an overcast gate). The deterministic mocked-weather e2e matrix + live spot-check is Story 10.5's job — do NOT add e2e here.

**Everything is on the opt-in real-engine path.** CI runs with the flag OFF, so **the default seed/fixture path must stay byte-identical** — that is what keeps CI green. Client components must NEVER import `lib/weather`/`lib/solar`/`lib/services/sun-engine` (AGENTS.md API boundary).

## Acceptance Criteria

**AC1 — A TOS-compliant nowcast client with graceful degradation**
**Given** Met.no Nowcast 2.0 provides radar-based ~5-minute precipitation for the Nordics
**When** a nowcast client is added to `lib/weather` (TOS-compliant User-Agent, ≤4-decimal coordinates, per-coordinate dedupe + short-TTL caching consistent with the 5-min product cadence, graceful `[]`/null degradation on failure — mirroring the forecast client's posture)
**Then** the engine can obtain "precipitation rate at this coordinate now" for near-now requests, and a nowcast outage degrades silently to Tier 0/1 behaviour (never a throw, never a 500, no fabricated values).

> _Reading (not part of the verbatim AC):_ the endpoint is `https://api.met.no/weatherapi/nowcast/2.0/complete?lat=…&lon=…` (JSON GeoJSON product). The precipitation field is `instant.details.precipitation_rate` in **mm/h**; it is present ONLY where radar coverage is sufficient (see Dev Notes). Reuse the EXACT `User-Agent` header helper and `.toFixed(4)` coordinate truncation the forecast client uses (do not re-implement or diverge — Met.no returns 403 on a missing/non-identifying UA). On any failure (non-OK response, network error, no-coverage, absent field), return `[]`/`null` exactly like `getForecast` — never throw, never fabricate a rate.

**AC2 — Active precipitation forces the gate + rain sky copy**
**Given** active precipitation (rate above zero) at the requested near-now instant
**When** the headline state is derived
**Then** the venue is cloud-gated regardless of the cloud-fraction value (rain wins), and the surfaced sky condition reflects rain in plain language.

> _Reading:_ "rain wins" = a geometrically-sunlit venue (`isSunVisible` true AND un-gated status `Sunny`/`Partial`) under rate > 0 becomes `CloudObscured` EVEN IF `effectiveCloudCover` is below 80 (or `undefined`). The gate still only rewrites `currentSunStatus` — `sunExposurePercent`/`sunWindow`/`peakTime` keep their geometric clear-sky meaning (two-signal guarantee, inherited unchanged from 10.1/10.3). NoSun/Shaded are still never gated (below-horizon + geometric-shade precedence wins over rain too). "surfaced sky condition reflects rain" = `skyCondition` becomes the NEW `'rain'` value (already in the `SkyCondition` token union) when rate > 0, and `skyConditionCopy` renders plain-language rain copy (sv/en) on the surfaces that already show sky copy.

**AC3 — Absence of rain contributes NOTHING (the epic's hard constraint)**
**Given** the hard constraint that **absence of rain must NEVER imply sun**
**When** the nowcast reports no precipitation
**Then** the no-rain result contributes NOTHING positive to the sun state — sun position, building shadows, and (effective) cloud cover still fully decide the outcome — and a dedicated red-first unit test proves a no-rain + overcast + geometrically-sunlit venue is still cloud-gated, plus a test that no-rain + clear + geometrically-shaded is still Shaded.

> _Reading:_ rain is a ONE-WAY, ADDITIVE gate: `rate > 0` ⇒ force gate; `rate === 0` or `rate === undefined` (unknown / no coverage / nowcast down) ⇒ change NOTHING — the outcome is exactly what Tiers 0/1 would produce from cloud + geometry alone. Do NOT let a `rate === 0` (or absent) reading ever UN-gate a cloud-gated venue, lift a `Shaded` to `Sunny`, or raise confidence. The two pinned constraint tests are the acceptance signal: (a) no-rain + effective-overcast + sunlit ⇒ still `CloudObscured`; (b) no-rain + clear + geometrically-shaded ⇒ still `Shaded`.

**AC4 — Future planner requests do not consult the nowcast**
**Given** the planner allows future date/time selection
**When** `requestedAt` is beyond the nowcast's short horizon (or on a future day)
**Then** the nowcast signal is not consulted (forecast cloud data governs, as in Tiers 0/1), so future planning never mixes in a stale "now" radar reading.

> _Reading:_ the nowcast covers only ~2 hours from real time. For a planner request materially beyond that window (a later time today past the horizon, or any future day), the nowcast must be SKIPPED entirely — no fetch, or the fetched near-now rate ignored — so a "now" radar reading never leaks into a future-time answer. The natural, cheap horizon signal is `requestedAt - now`: define a single named `NOWCAST_HORIZON_MS` (recommended ~90 min, safely inside the ~2 h product horizon) and consult the nowcast ONLY when `requestedAt` is within `[now, now + NOWCAST_HORIZON_MS]` (also skip if `requestedAt < now` — a past instant has no live radar). Beyond that, behave exactly as Tiers 0/1 (forecast cloud + geometry). Note this dovetails with the ratified 8.5-R1 fact that a future planner slice is a FORECAST slice (`isForecast=true`) whose forecast cloud correctly governs — the nowcast simply drops out.

**Design Gate Criteria (backend/data — no new screen of its own):**
No new UI surface — rain reuses the Story 10.2 obscured presentation. The one UI-adjacent change (rain sky-condition copy) plugs into the EXISTING `skyConditionCopy` seam + `messages/{locale}/venue.json` sky blocks (no new component, no new visual state, no reference-PNG change). Acceptance signal is the **unit/engine test matrix**: the AC3 constraint tests (no-rain changes nothing), the AC2 rain-forces-gate + rain-sky-copy tests, the AC1 nowcast-client tests (URL/coverage/degradation), and the AC4 future-horizon skip test — all red-first. There is NO new screenshot surface — do NOT fabricate a Visual/Behaviour/Animation/Visual-validation gate for a non-existent surface, and do NOT edit, create, or force any reference PNG.

## Tasks / Subtasks

- [x] **Task 1 — Add the Nowcast 2.0 client to `lib/weather` (AC1)**
  - [x] Create `lib/weather/nowcast-service.ts` mirroring the STRUCTURE of `lib/weather/met-no-service.ts` (do NOT bolt the nowcast onto `getForecast` — it is a separate product with a separate endpoint, coverage model, and horizon). Reuse the SHARED TOS primitives so they cannot drift: the identifying `User-Agent` and the `.toFixed(4)` coordinate truncation. `met-no-service.ts` currently keeps its `DEFAULT_USER_AGENT`/`userAgent()` module-private — EXPORT `userAgent()` from `met-no-service.ts` (or lift both `userAgent()` + `DEFAULT_USER_AGENT` into a tiny shared `lib/weather/met-no-common.ts` and import into both) so the nowcast uses the IDENTICAL, TOS-compliant UA. Pick whichever keeps the diff smallest and note the choice; do NOT copy-paste a second UA constant (that would let the two drift out of TOS compliance). **DONE: chose to EXPORT `userAgent()` from `met-no-service.ts` — smallest diff (one `export` keyword + one import), single source of truth.**
  - [x] Endpoint: `const url = \`${API_BASE}/nowcast/2.0/complete?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}\`` where `API_BASE = 'https://api.met.no/weatherapi'` (same base as the forecast client). This is the JSON product; the precipitation field lives at `instant.details.precipitation_rate` (mm/h).
  - [x] Export a small async accessor — recommended `getNowcastPrecipitationRate(lat, lon): Promise<number | undefined>` — that fetches, reads the NEAREST-to-now timeseries entry's `precipitation_rate`, and returns it (or `undefined` when unknown). Returning a single scalar (not a `WeatherSlice[]`) keeps the engine wiring trivial and the "unknown vs 0 vs positive" contract explicit.
  - [x] **Coverage + degradation contract (AC1, hard):** wrap the whole fetch/parse in `try/catch` and return `undefined` on ANY of: a non-OK response, a network/JSON error, an empty/absent timeseries, an entry whose `precipitation_rate` field is ABSENT (radar coverage insufficient — Met.no OMITS the field there), or an explicit no-coverage marker (`properties.meta.radar` present and not `"ok"`). **`undefined` = rate unknown = the nowcast contributes NOTHING (AC3).** NEVER return `0` for a missing/failed reading. Single `console.warn` on a real HTTP error (mirroring `getForecast`); no per-venue spam.
  - [x] Add `next: { revalidate: 60 }` (short TTL consistent with the 5-min radar cadence). Not the forecast's `revalidate: 300`.

- [x] **Task 2 — Thread the nowcast into the engine WITHOUT breaking the default path (AC1, AC4)**
  - [x] In `sun-engine.ts`, mirror the `getForecastOverride` injection pattern. Added optional `getNowcastOverride?: GetNowcastRate` param to `applyRealSunEngine` → `computeRealSunEngineCached` → `computeRealSunEngineResult`. Inside `computeRealSunEngineResult`, resolves `const getNowcast = getNowcastOverride ?? (await import('@/lib/weather/nowcast-service')).getNowcastPrecipitationRate;` — lazy-imported so the default seed path has ZERO live-Met.no dependency.
  - [x] Defined `type GetNowcastRate = (lat?, lng?) => Promise<number | undefined>` next to `GetForecast`.
  - [x] **AC4 horizon gate:** defined `export const NOWCAST_HORIZON_MS = 90 * 60 * 1000;`. `isNearNow = requestedAt.getTime() >= now.getTime() && requestedAt.getTime() <= now.getTime() + NOWCAST_HORIZON_MS;`. Fetch the nowcast ONLY when `isNearNow`; else `precipitationRate` stays `undefined`. Future-planner + past requests never fire the nowcast.
  - [x] Fetch the nowcast at the venue's OWN location. On the LIST route wrapped in a batch-scoped per-coordinate deduper (`createDedupedNowcastFetcher`, Task 5).

- [x] **Task 3 — Make rain force the gate as a one-way additive signal (AC2, AC3)**
  - [x] Extended `applyCloudGate` with a fourth `isRaining` param (defaulting to `false` so all pre-10.4 3-arg callers stay byte-identical). Fire condition is `isSunVisible && (cloudGates || isRaining)` — rain is an OR-ed trigger. The `switch(status)` block is UNCHANGED (Sunny/Partial ⇒ CloudObscured; Shaded/NoSun/CloudObscured ⇒ unchanged; `never`-exhaustive default preserved), so rain can NEVER gate Shaded/NoSun/below-horizon. `isRaining = precipitationRate !== undefined && precipitationRate > 0;`.
  - [x] Updated the `applyCloudGate` doc comment to state the ONE-WAY rain trigger. Threshold/effective-cover input/precedence unchanged.
  - [x] At the call site, pass `isRaining`. `sunExposurePercent`/`sunWindow`/`peakTime`/confidence untouched — NO rain confidence term added (not in AC, would double-count).
  - [x] **AC3 pin:** `isRaining === false` (from `undefined` OR `0`) leaves the 10.3 result identical. The AC3 constraint tests assert this end-to-end.

- [x] **Task 4 — Rain sky-condition value + plain-language copy (AC2)**
  - [x] `skyCondition = isRaining ? 'rain' : (weather ? skyConditionFromCloudCover(weather.cloudCover) : 'unavailable');` at the engine call site. `skyConditionFromCloudCover` stays pure/unchanged. `'rain'` already in the `SkyCondition` token union — not extended.
  - [x] Updated the `api.ts` `skyCondition` doc-comment to add `'rain'`. No type change (already `string`); `normalizeVenueForResponse` passes it through unchanged (verified by the round-trip vitest suite staying green).
  - [x] Realised the `'rain'` copy: added `rain: string` to `SkyConditionCopy` + a `case 'rain': return copy.rain;` branch. Flipped the existing `sun-status-presentation.test.ts` `'rain'` assertion from `toBeNull()` to `toBe('Regn')` and added `rain` to `SKY_COPY`.
  - [x] Added the `rain` message key to BOTH sky blocks (`quickInfo.sky` + `detail.sky`) in BOTH locales (sv `"Regn"`, en `"Rain"`), key ordering preserved (parity test green). Threaded into the two `MapView.tsx` sky-copy objects and the `VenueQuickInfo`/`VenueDetailContent` `sky` shapes. This is the ONLY component-file touch — a copy pass-through, no new visual state.
  - [x] No rain badge / no restyle — rain renders inside the SAME muted "Sol bakom moln" (`CloudObscured`) chrome from 10.2.

- [x] **Task 5 — List-route + detail-route wiring (AC1, AC4)**
  - [x] LIST route: added `createDedupedNowcastFetcher(getNowcast)` in `sun-engine.ts` mirroring `createDedupedForecastFetcher`; lazy-imported `getNowcastPrecipitationRate`, wrapped it, and passed `dedupedNowcast` as the new 5th arg to `applyRealSunEngine`. `mapWithConcurrency` cap + `safeSeedOutcome` degrade unchanged.
  - [x] DETAIL route: left the nowcast override UNSET (`applyRealSunEngine(stored, requestedAt, now)`) so the engine lazy-imports the real accessor directly. No dedupe wrapper.
  - [x] Confirmed the DEFAULT seed path (flag OFF) never touches the nowcast — the `else` branch never calls `applyRealSunEngine` nor imports `nowcast-service` (`test/unit/api/` contract tests green unchanged).

- [x] **Task 6 — Red-first test matrix (AC1–AC4) — the acceptance signal**
  - [x] **Nowcast client (AC1)** — un-skipped `test/unit/weather/nowcast-service.cloud-gate.atdd.test.ts` (the pre-existing red-phase scaffold): URL `/nowcast/2.0/complete` + 4-dp coords; `0.4 ⇒ 0.4`; `0 ⇒ 0`; absent field ⇒ `undefined`; non-OK/throw/empty ⇒ `undefined`; non-`ok` coverage marker ⇒ `undefined`; shared identifying UA. 9/9 green.
  - [x] **Rain forces the gate (AC2)** — un-skipped the `[10.4 AC2]` describes in `sun-engine.cloud-gate.atdd.test.ts`: rain (0.5) + low cloud + sunlit ⇒ `CloudObscured` + `skyCondition==='rain'` + geometry preserved; rain over below-horizon ⇒ stays `NoSun`.
  - [x] **Absence of rain changes nothing (AC3)** — un-skipped the `[10.4 AC3]` describe: no-rain (0) + overcast + sunlit ⇒ still `CloudObscured` (sky `overcast`, never `rain`); no-rain (0) + clear + below-horizon ⇒ still `NoSun`; `undefined` rate behaves identically to `0`; no-override lazy path matches the pure-cloud outcome.
  - [x] **Future planner skips the nowcast (AC4)** — un-skipped the `[10.4 AC4]` describe: beyond `NOWCAST_HORIZON_MS` (read from the constant) ⇒ `expect(rainMock).not.toHaveBeenCalled()` + not gated; inside the horizon ⇒ called + gates; past `requestedAt` ⇒ not called.
  - [x] **Rain sky copy (AC2)** — un-skipped `sun-status-presentation.rain.cloud-gate.atdd.test.ts` + updated `sun-status-presentation.test.ts`. Added `rain` to the two component fixtures (`VenueQuickInfo.test.tsx`, `VenueDetailContent.test.tsx`) so they compile/pass. `messages-parity` green.
  - [x] **Default-seed regression (AC1)** — `test/unit/api/` contract tests green unchanged (94 tests / 8 files).

- [x] **Task 7 — Verify gates + record decisions**
  - [x] Fresh HEAD baseline: 115 files / 1060 tests passed + 2 skipped files / 29 skipped tests. After: 117 files / 1089 tests passed, 0 skipped — count INCREASED by the un-skipped scaffolds, none dropped.
  - [x] Standard gate from `nextjs-app/`: `npx tsc --noEmit` 0 errors; `npx eslint .` 0 errors + 13 pre-existing warnings (no NEW warnings); `npx vitest run` all green. No e2e added.
  - [x] DEFAULT seed path byte-identical: `test/unit/api/` green unchanged.
  - [x] Decisions recorded in Completion Notes below.

## Dev Notes

### The gate seam you extend — one OR-term, no reshape
The gate is `applyCloudGate` (`sun-engine.ts:629-655`), already `never`-exhaustive and RATIFIED for the epic. 10.1 built it; 10.3 swapped the cover INPUT to `effectiveCloudCover`. 10.4 adds ONE thing: a `isRaining` OR-term to the fire condition. The `switch(status)` (Sunny/Partial ⇒ CloudObscured; Shaded/NoSun/CloudObscured ⇒ unchanged) is UNTOUCHED, so:
- below-horizon precedence (`NoSun` wins) is preserved — rain never gates a down sun;
- geometrically-shaded venues stay `Shaded` — rain never gates a shaded venue (AC3 constraint b);
- rain is ONE-WAY — it can only turn `Sunny`/`Partial` into `CloudObscured`, never the reverse, never up-rank.

Current gate call site (`sun-engine.ts:475-479`):
```
const effectiveCover = effectiveCloudCover(weather);
const currentSunStatus = applyCloudGate(
  geometricSunStatus,
  isSunVisible,
  effectiveCover,
);
```
After 10.4: compute `isRaining` from the (horizon-gated) nowcast rate and pass it as a 4th arg; the fire condition becomes `isSunVisible && (cloudGates || isRaining)`.

### Ratified epic invariants (retro-notes epic-10 + 10.1/10.3 — MUST hold)
- **`CLOUD_GATE_THRESHOLD_PERCENT = 80`** and the gate precedence/switch are fixed. 10.4 ADDs a rain OR-term to the gate FIRE condition; it does NOT change the threshold, the switch, or the effective-cover input.
- **Missing weather data stays `undefined` — NEVER `?? 0`** (retro-note Phase-5, Story 10.1 AC2 hard constraint). This EXTENDS to the nowcast: an absent/failed/no-coverage `precipitation_rate` stays `undefined`, NOT `0`. Both `undefined` and `0` are non-gating (AC3), but keep them distinct — `undefined` = "we don't know", `0` = "radar says no rain". Do NOT `?? 0` the rate anywhere.
- **`effectiveCloudCover` (`lib/solar/effective-cloud-cover.ts`) feeds gate + confidence; `skyCondition` reads the RAW total** (10.3 ratified split). 10.4 does NOT touch `effectiveCloudCover` or the confidence blend. It ADDs rain precedence on TOP of the `skyCondition` (rain > cloud-derived label) at the engine call site, and rain as an OR-term to the gate — neither disturbs the 10.3 split.
- **`SunStatus`/`SkyCondition` union extensions require the never-exhaustive-switch sweep discipline** (retro-note epic-level). 10.4 does NOT extend `VenueSunStatus` (`CloudObscured` already covers the rain-gated headline) and does NOT extend `SkyCondition` (`'rain'` is already a token member). So there is no NEW union member to sweep — but if you find yourself adding one, run the `tsc`-forced sweep. The one presentation switch (`skyConditionCopy`) already has a `default` branch; adding the `'rain'` case is additive and safe.
- **`confidence-calculator.ts` has a mixed-EOL committed blob** (230 CRLF + 70 bare-LF): a Read/Edit round-trip on this Windows host pure-CRLF-ifies it (~73-line phantom churn) — Story 10.1 lost a review round to it and 10.3 reconstructed from the parent blob. **You almost certainly do NOT touch `confidence-calculator.ts` in 10.4** (no confidence rain-term is in scope). If some ripple forces an edit, reconstruct from the parent blob (`git cat-file blob HEAD:nextjs-app/lib/solar/confidence-calculator.ts`) applying ONLY the logic edit and preserving each untouched line's original EOL — do NOT let the editor re-EOL the file.
- **Relative-boundary tests survive re-tune** (retro-note: `NOWCAST_HORIZON_MS`, like the 80 threshold and the layer weights, is a re-tunable constant). Assert AC4 behaviour by READING `NOWCAST_HORIZON_MS` (inside ⇒ consulted, beyond ⇒ skipped), not by hardcoding "90 minutes". Assert rain INTENT (rate>0 gates, rate 0/undefined inert), not an exact rate number.
- **The gate lives on the real-engine path ONLY.** The default seed/fixture path never calls Met.no, the nowcast, or the effective helper and stays byte-identical — this is what keeps CI (flag OFF) green.

### Two status vocabularies — unchanged here, do NOT confuse (inherited from 10.1/10.2/10.3)
- **DTO `VenueSunStatus`** = `'Sunny' | 'Partial' | 'Shaded' | 'NoSun' | 'CloudObscured'` (`api.ts:13`). Complete; rain re-uses `CloudObscured`. Do NOT extend it.
- **UI-token `SunStatus`** = `'sunny' | 'partial' | 'shaded' | 'upcoming' | 'obscured'` (`design-tokens.ts:4`). Rain re-uses `'obscured'`. Do NOT touch it.
- **`SkyCondition` token** = `'clear' | 'partly-cloudy' | 'overcast' | 'rain' | 'unavailable'` (`design-tokens.ts:6`). `'rain'` is ALREADY here (epic pre-scaffold) — 10.4 REALISES it (engine sets it, copy renders it). Do NOT re-add it.

### Met.no Nowcast 2.0 — verified facts (2026-07-03)
- **Endpoint:** `https://api.met.no/weatherapi/nowcast/2.0/complete?lat={lat}&lon={lon}` — JSON (GeoJSON) product. (`/classic` is the legacy XML variant — do NOT use it.) Same `api.met.no/weatherapi` base as the forecast client; `altitude` is an optional param (not needed — precipitation rate is altitude-independent for our use).
- **Precipitation field:** `properties.timeseries[].data.instant.details.precipitation_rate` in **mm/h**. It is the "instant precipitation rate for given time" and is **included ONLY where radar coverage is of sufficient quality** — where coverage is poor/absent the field is OMITTED from the entry. Treat an absent `precipitation_rate` as `undefined` (unknown), which is non-gating (AC3). [Source: docs.api.met.no/doc/nowcast/datamodel]
- **Coverage:** Norway, Sweden, Finland, Denmark (radar-based). Central Gothenburg (57.7°N, 11.97°E) is well inside coverage. Out-of-coverage locations are marked in the JSON with a `RadarCoverage` (a.k.a. `radar`) indicator whose values are `ok` / `temporarily unavailable` / `no coverage`; when present and not `ok`, treat the reading as unknown (`undefined`). [Source: api.met.no/weatherapi/nowcast/2.0/documentation]
- **Horizon & cadence:** ~2-hour forecast, ~5-minute time steps, product updated every 5 minutes. This is why AC4 excludes it for planner requests beyond a short (~90 min) horizon and why the server cache TTL is short (`revalidate: 60`, not the forecast's 300). [Source: nowcast documentation]
- **TOS is identical to Locationforecast:** the same identifying `User-Agent` requirement (403 otherwise) and the same coordinate parameters. The `.toFixed(4)` truncation (Story 8.5, AGENTS.md) and short-cache/dedupe posture carry over. Nowcast requests count toward the same Met.no rate budget, so the per-coordinate dedupe on the list route (Task 5) is a TOS-hygiene requirement, not just an optimization.

### Nowcast client shape — mirror the forecast client, do NOT bolt on
`getForecast` (`met-no-service.ts:56-134`) is the template: identifying UA, `.toFixed(4)` coords, `try/catch` → `[]` on any failure, no fabricated defaults. The nowcast client is a SEPARATE file/product with:
- a DIFFERENT endpoint path (`/nowcast/2.0/complete`),
- a DIFFERENT field (`precipitation_rate`, not `cloud_area_fraction`),
- a DIFFERENT cache TTL (`revalidate: 60`, near-now),
- a DIFFERENT coverage failure mode (field-omitted-when-no-radar → `undefined`).
Return `number | undefined` (rate-now-or-unknown), not a `WeatherSlice[]` — the engine only needs the scalar, and a scalar makes the "unknown vs 0 vs positive" contract unambiguous. SHARE only the UA + coordinate-truncation primitives (export them from `met-no-service.ts` or a tiny `met-no-common.ts`) so TOS compliance cannot drift between the two clients.

### Nowcast injection + horizon — the AC4 mechanism
`applyRealSunEngine(venue, requestedAt, now, getForecastOverride?)` already threads `now` (the wall-clock fetch instant) separately from `requestedAt` (the instant to compute for — `now` or the planner selection converted from Stockholm-local, see `resolveRequestedAt`). That separation is EXACTLY what AC4 needs: `requestedAt - now` is the horizon test. Add `getNowcastOverride?` as a parallel 5th param threaded through the same chain. Fetch the nowcast ONLY when `requestedAt ∈ [now, now + NOWCAST_HORIZON_MS]`; otherwise leave `precipitationRate = undefined` (nowcast not consulted). This also means:
- a planner request 3 hours from now ⇒ nowcast skipped ⇒ the FORECAST slice (already `isForecast=true` with its own cloud split) governs, exactly as 10.3 (dovetails with the ratified 8.5-R1 future-valid-time fact — forecast cloud governs future planning, the nowcast simply drops out);
- a past `requestedAt` (`< now`) ⇒ skipped (no live radar for the past).

### Cache safety — folding rain into the whole-outcome cache (verify, minimal change)
The sun-compute cache (`sun-engine-cache.ts`, 15-min bucket) caches the WHOLE `SunEngineOutcome` per `(venue id, 15-min requestedAt bucket, Stockholm day, geometry/elevation variant)`. Because the gated status, `skyCondition`, and confidence are ALL computed inside `computeRealSunEngineResult` from the same inputs, and rain is now one of those inputs, the cached bucket stays internally consistent — a repeat request in the same bucket returns the SAME rain-gated status + `'rain'` sky. **Do NOT fold the precipitation rate into the cache KEY** — that key note (`sun-engine.ts:272-308`) is a ratified invariant; weather (cloud AND rain) must NOT enter the key. The rate is captured in the cached OUTCOME, not the key. One subtlety to be aware of (not a required fix): `now` is deliberately NOT in the cache key, and the horizon test uses `now`; within a live 15-min bucket the `requestedAt` bucket + 15-min TTL bound the staleness, so a bucket computed as near-now can serve for up to ~15 min — acceptable and consistent with the documented 9.3 cache-staleness bound. If you consider this worth a note, record it; do NOT change the cache key.

### Deferred-work items folded in (subject-overlap only — NONE reopened)
- **8.5 R1 — `weatherUpdatedAt`/future-valid-time for planner-future requests** (`sun-engine.ts:204-213`, Target: None conditional): DIRECTLY relevant to AC4. A future planner request is a FORECAST slice with its own future valid-time; the nowcast is skipped for it (AC4), so no "now" radar reading leaks into a future answer. Your horizon gate is the mechanism that keeps this honest. Do NOT special-case forecast in the gate — just skip the nowcast beyond the horizon.
- **8.5 R1 — deduped forecast fetcher never evicts in-flight entries** (`sun-engine.ts:140-150`, Target: None conditional): your `createDedupedNowcastFetcher` (Task 5) mirrors `createDedupedForecastFetcher` and inherits the SAME batch-scoped no-eviction property. That is FINE for the same reason: `getNowcastPrecipitationRate` catches all errors and resolves to `undefined` (never throws), so a transient failure coalesces to the correct per-venue "unknown → non-gating" degrade, batch-scoped. Mirror the pattern exactly; do NOT add eviction (keep it consistent with the forecast fetcher, and do NOT reopen that defer).
- **8.5 R1 — unparseable Met.no `entry.time` → Invalid-Date `validAt`** (`met-no-service.ts:75`, Target: None conditional): if your nowcast client picks the nearest-to-now entry by parsing `entry.time`, guard against an Invalid Date the same way (a bad timestamp should not silently select the wrong slice). For the nowcast, "nearest to now" is the natural pick; if `entry.time` is unparseable, fall back to the first entry or treat as unknown — do not NaN. Minor defensiveness; the primary contract is "return the near-now rate or undefined".
- **10.1 R1 — `WeatherDataDto.cloudCover` required vs legacy optional** (`api.ts:284`, Target: None conditional): the legacy `sun-exposure-service` DTO, NOT on the live venues route, NOT touched by 10.4. Do NOT reopen.
- **10.2 code review — `toSunStatusToken` shared mapper is not consumed by any surface** (Target: None conditional): unrelated to rain — every surface already branches inline on `CloudObscured`/`isObscuredSunStatus`, which is exactly what the rain-gated venue produces (it IS `CloudObscured`), so rain renders through the SAME already-swept obscured surfaces with NO new sweep needed. Do NOT wire in or remove that mapper here — out of scope.
- **8.7 — confidence/coverage caps include gated-out casters** (elevation): dormant (all launch venues null elevation), NOT overlapping rain work. Do NOT touch.

### Test surfaces (all red-first — the acceptance signal per the Design Gate)
- New `test/unit/weather/nowcast-service.test.ts` — URL is `/nowcast/2.0/complete` + 4-dp coords; `precipitation_rate` present ⇒ returned; absent (no-coverage) ⇒ `undefined` (never 0); non-OK/throw ⇒ `undefined`; identifying UA header (AC1). Mirror the `met-no-service.cloud-gate.atdd.test.ts` `fetch`-stub + synthetic-response pattern — NO network.
- `test/unit/services/sun-engine.cloud-gate.atdd.test.ts` (extend) — a `[10.4 AC2/AC3/AC4] rain-now signal` describe: rain (rate>0) + low cloud + sunlit ⇒ `CloudObscured` + `skyCondition==='rain'` + geometry preserved (AC2); rain over Shaded ⇒ stays Shaded (AC2/AC3); no-rain (0) + overcast + sunlit ⇒ still `CloudObscured` (AC3a); no-rain (0) + clear + shaded ⇒ still Shaded (AC3b); `undefined` rate behaves like `0` (AC3); beyond-horizon `requestedAt` ⇒ nowcast NOT called + not force-gated (AC4); inside-horizon ⇒ nowcast called + gates (AC4). Inject via the new `getNowcastOverride` param or `vi.mock('@/lib/weather/nowcast-service')` (mirror the existing `met-no-service` mock in that file).
- `test/unit/sun-status-presentation.test.ts` (update) — flip `skyConditionCopy('rain', …)` from null to the rain copy; add `rain` to `SKY_COPY` (AC2).
- `messages-parity` test (`test/unit/messages-parity.test.ts`) — stays green with the new sv/en `rain` keys (add them in the same shape to both locales).
- Component fixtures that build the sky-copy object (`VenueQuickInfo.test.tsx:67`, `VenueDetailContent.test.tsx:61`) — add `rain` so they compile/pass.
- `test/unit/api/venues-route*.test.ts` — default seed path byte-identical (regression); a rain-fed real-engine venue still round-trips.

### Project Structure Notes
- **Files you create:** `nextjs-app/lib/weather/nowcast-service.ts` (the client), `nextjs-app/test/unit/weather/nowcast-service.test.ts` (its matrix). Possibly `nextjs-app/lib/weather/met-no-common.ts` (shared UA — only if you choose the lift-to-common option over exporting from `met-no-service.ts`).
- **Files you edit:** `lib/services/sun-engine.ts` (`GetNowcastRate` type, `NOWCAST_HORIZON_MS`, nowcast injection + horizon gate + `isRaining` derivation, `applyCloudGate` rain OR-term + doc, `skyCondition='rain'` precedence at the call site, `createDedupedNowcastFetcher`); `lib/weather/met-no-service.ts` (export `userAgent()` / factor out shared UA); `lib/utils/sun-status-presentation.ts` (`SkyConditionCopy` + `skyConditionCopy` `'rain'` case); `lib/types/api.ts` (`skyCondition` doc-comment adds `'rain'` — no type change); `app/api/venues/route.ts` + `app/api/venues/[slug]/route.ts` (nowcast wiring); `messages/{sv,en}/venue.json` (`rain` sky key ×2 scopes ×2 locales); `components/custom/map/MapView.tsx` (thread `rain` into the two sky-copy objects); `components/composed/venue/{VenueQuickInfo,VenueDetailContent}.tsx` (`SkyConditionCopy` shape gains `rain`). Tests under `test/unit/{weather,services,sun-status-presentation}` + the two component fixtures.
- **NO new dependency, NO schema/migration, NO new route, NO new component, NO new visual state, NO reference-PNG change.** If you find yourself creating a rain-specific component, colour, icon, badge, or reference image, STOP — that is out of 10.4 scope (rain reuses the 10.2 obscured chrome). If you touch `route.ts`/`venue-store.ts` beyond the nowcast wiring, or edit `effective-cloud-cover.ts`/`confidence-calculator.ts`, STOP — out of scope.
- Windows/PowerShell host: run vitest via `cd nextjs-app; npx vitest run` (or the package script). Do NOT run git — the orchestrator owns all git/PR work.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-10.4] (lines 2739-2763) — the 4 verbatim ACs + backend/data Design Gate; the Tier-2 scope, the HARD CONSTRAINT ("absence of rain must NEVER imply sun"), the physics guardrail (weather is citywide-scale), and Tier-3 out-of-scope, all in the Epic-10 preamble (2645-2659).
- [Source: _bmad-output/implementation-artifacts/10-1-cloud-gated-sun-state-weather-truth-fixes.md] — `applyCloudGate` shape, `CLOUD_GATE_THRESHOLD_PERCENT=80`, `CloudObscured`, unknown-never-clear (never `?? 0`), the EOL-churn review finding.
- [Source: _bmad-output/implementation-artifacts/10-3-layered-cloud-detail-met-no-complete-endpoint.md] — the `complete`-endpoint + `effectiveCloudCover` split, the `skyCondition`-reads-raw-total decision, the confidence-calculator EOL reconstruction, the deduped-fetcher/concurrency pattern.
- [Source: _bmad-output/implementation-artifacts/10-2-sun-behind-clouds-two-signal-ui-state.md] — how `CloudObscured` + `skyCondition` render (the muted "Sol bakom moln" chrome rain REUSES), the `skyConditionCopy` seam, the sky-condition message keys.
- [Source: _bmad-output/auto-bmad/retro-notes/epic-10.md] — ratified: `CLOUD_GATE_THRESHOLD_PERCENT=80`; missing weather stays `undefined` (never `?? 0`); `effectiveCloudCover` feeds gate+confidence while `skyCondition` reads raw total; never-exhaustive-switch discipline for union extensions; `confidence-calculator.ts` mixed-EOL blob caution; relative-boundary tests survive re-tune; no CloudObscured fixture exists on the flag-OFF path (10.5 owns the e2e weather mock).
- [Source: nextjs-app/lib/weather/met-no-service.ts:12-16,56-134] — `DEFAULT_USER_AGENT`/`userAgent()` (share these), `getForecast` structure to mirror, the `next_1_hours.precipitation_amount` field (NOT what we use — nowcast `precipitation_rate` is the instant radar rate).
- [Source: nextjs-app/lib/services/sun-engine.ts:98,255-335,402-543,629-669] — `CLOUD_GATE_THRESHOLD_PERCENT`, the `applyRealSunEngine`→`computeRealSunEngineCached`→`computeRealSunEngineResult` chain + `getForecastOverride` injection to mirror, the gate call site + `skyCondition`, `applyCloudGate` + `skyConditionFromCloudCover`, `createDedupedForecastFetcher`/`mapWithConcurrency`, `resolveRequestedAt`, `fetchWeatherForVenue`.
- [Source: nextjs-app/lib/utils/sun-status-presentation.ts:46-79] — `SkyConditionCopy` + `skyConditionCopy` (the `'rain'` placeholder at :74-75 you realise).
- [Source: nextjs-app/lib/types/design-tokens.ts:6] — `SkyCondition` union already contains `'rain'` (do NOT re-add).
- [Source: nextjs-app/lib/types/api.ts:68] — `skyCondition?: string` DTO doc-comment (add `'rain'`).
- [Source: nextjs-app/messages/sv/venue.json:27-31,169-174] + [nextjs-app/messages/en/venue.json (mirror)] — the `quickInfo.sky`/`detail.sky` blocks to add `rain` to (sv/en parity).
- [Source: nextjs-app/app/api/venues/route.ts:252-273] + [nextjs-app/app/api/venues/[slug]/route.ts:85-95] — the list (deduped) + detail (default) real-engine call sites to wire the nowcast into.
- [Source: https://docs.api.met.no/doc/nowcast/datamodel] + [https://api.met.no/weatherapi/nowcast/2.0/documentation] — `precipitation_rate` mm/h, coverage-only field presence, `RadarCoverage`/`radar` indicator (ok/temporarily unavailable/no coverage), ~2 h horizon / ~5 min cadence, complete-vs-classic (verified 2026-07-03).
- [Source: AGENTS.md] + [Source: CLAUDE.md] — API boundary (clients never import lib/weather|solar|sun-engine), Met.no TOS (identifying User-Agent, ≤4-decimal coordinates), the standard four-command test gate (`tsc`/`eslint`/`vitest`/`playwright`, run from `nextjs-app/`), and the "do NOT run git" rule.
- [Source: _bmad-output/planning-artifacts/prd.md#FR12] — the geometric+weather confidence blend; 10.4 does NOT add a rain confidence term (a forecast rain slice already carries high cloud that 10.3's effective-cover path folds into confidence — a separate rain penalty would double-count and is not in the AC set).
- **DESIGN.md, ux-design-specification.md, project-context.md are intentionally NOT primary references here:** this is a backend/data story with NO new screen (rain reuses the Story 10.2 obscured chrome). There is no new visual surface to design or gate — consistent with the Stories 10.1/10.3 backend-story precedent. The sole UI-adjacent change is a copy pass-through into the EXISTING sky-condition seam (Task 4).

## Dev Agent Record

### Agent Model Used

Opus 4.8 (claude-opus-4-8[1m]) — auto-bmad dev-story delegate.

### Debug Log References

- Full gate from `nextjs-app/`: `npx tsc --noEmit` (0 errors), `npx eslint .` (0 errors, 13 pre-existing warnings — baseline unchanged), `npx vitest run` (117 files / 1089 tests, all green, 0 skipped).
- Fresh HEAD baseline before edits: 115 files / 1060 tests passed + 2 skipped files / 29 skipped tests. The +29 delta is exactly the un-skipped 10.4 red-first scaffolds (nowcast-service AC1, sun-engine `[10.4 AC2/AC3/AC4]` describes, rain sky-copy) plus the flipped `sun-status-presentation.test.ts` `'rain'` assertion.
- Default-seed regression: `test/unit/api/` (8 files / 94 tests) green unchanged — the flag-OFF fixture path never touches Met.no, the nowcast, or the effective helper.

### Completion Notes List

- **Nowcast client + coverage/undefined contract:** new `lib/weather/nowcast-service.ts` → `getNowcastPrecipitationRate(lat, lon): Promise<number | undefined>`. Endpoint `https://api.met.no/weatherapi/nowcast/2.0/complete?lat=&lon=` (4-dp truncated). Field `properties.timeseries[].data.instant.details.precipitation_rate` (mm/h), read from the nearest-to-now entry (guarded against an unparseable `entry.time` → Invalid Date, falling back to the first entry). Returns `undefined` on ANY failure/absence: non-OK response, network/JSON throw, empty timeseries, absent field (radar coverage insufficient — Met.no OMITS it), or a `properties.meta.radar` coverage marker present and not `"ok"`. `0` (radar says genuinely no rain) is kept DISTINCT from `undefined` (unknown) — never `?? 0`. `next: { revalidate: 60 }` (near-now TTL, not the forecast's 300).
- **Shared-UA choice:** EXPORTED `userAgent()` from `met-no-service.ts` and imported it into the nowcast client (smallest diff, single source of truth). Did NOT create a `met-no-common.ts` module and did NOT copy a second UA constant (TOS-drift risk avoided).
- **`NOWCAST_HORIZON_MS = 90 * 60 * 1000` + why:** consult the nowcast ONLY when `requestedAt ∈ [now, now + NOWCAST_HORIZON_MS]`. 90 min sits safely inside the ~2 h product horizon; a future-planner request beyond it (or a past `requestedAt < now`) never fires the nowcast, so forecast cloud governs there exactly as Tiers 0/1 (AC4). The constant is exported + tunable; the AC4 tests read it, never a hard-coded 90.
- **`isRaining = rate > 0` + the ONE-WAY rain gate:** `isRaining = precipitationRate !== undefined && precipitationRate > 0`. `undefined` (unknown / beyond horizon / no coverage) AND `0` (radar says no rain) both yield `false` ⇒ rain contributes nothing (AC3 — no un-gate, no lift, no confidence change). `applyCloudGate` gained a 4th `isRaining` param (defaulting to `false` — see below) OR-ed into the fire condition `isSunVisible && (cloudGates || isRaining)`; the ratified `switch` is UNCHANGED, so rain can only turn `Sunny`/`Partial` into `CloudObscured`, never gate `Shaded`/`NoSun`/below-horizon.
- **`applyCloudGate` param made OPTIONAL (default `false`) — minor deviation from the strict "add a fourth parameter `isRaining: boolean`" wording:** the Story 10.1 pure-helper tests and the coverage test call `applyCloudGate` with 3 args (cloud-only). Making the 4th param `isRaining = false` keeps every pre-10.4 call site byte-identical (a 3-arg call = "no rain") while the engine always passes an explicit `isRaining`. This is strictly additive and preserves the exact ratified semantics; the alternative (a required param) would have forced editing ~17 unrelated 10.1/coverage assertions with zero behavioural gain.
- **`skyCondition='rain'` precedence at the engine call site (not inside `skyConditionFromCloudCover`):** `skyCondition = isRaining ? 'rain' : (weather ? skyConditionFromCloudCover(weather.cloudCover) : 'unavailable')`. `skyConditionFromCloudCover` stays pure and rain-unaware; rain precedence lives at the call site, mirroring the two-signal concern split. `'rain'` was already in the `SkyCondition` token union — not extended. The presentation seam realised the anticipatory `'rain'` placeholder: `SkyConditionCopy` gained `rain: string` + a `case 'rain'` branch, wired through both locales' `quickInfo.sky`/`detail.sky`, the two `MapView` sky-copy objects, and the two component `sky` shapes.
- **No confidence rain-term (deliberate, not in AC):** rain does not add its own confidence penalty — a forecast rain slice already carries high cloud that 10.3's effective-cover path folds into confidence; a separate rain penalty would double-count.
- **Cache safety (no change, verified):** the precipitation rate is captured in the cached OUTCOME, not the cache KEY — the ratified `sun-engine.ts` key invariant (weather must not enter the key) is untouched. Within a live 15-min bucket a near-now compute can serve for up to ~15 min, consistent with the documented 9.3 staleness bound.
- **NO new dependency, schema, migration, route, component, visual state, or reference-PNG.** No e2e added (Story 10.5 owns the mocked-weather matrix + live spot-check).

### File List

**Created:**
- `nextjs-app/lib/weather/nowcast-service.ts` — the Nowcast 2.0 client (`getNowcastPrecipitationRate`).

**Modified (production):**
- `nextjs-app/lib/weather/met-no-service.ts` — exported `userAgent()` (shared TOS primitive).
- `nextjs-app/lib/services/sun-engine.ts` — `GetNowcastRate` type, `NOWCAST_HORIZON_MS`, `createDedupedNowcastFetcher`, `getNowcastOverride` threaded through `applyRealSunEngine`/`computeRealSunEngineCached`/`computeRealSunEngineResult`, the AC4 horizon gate + `isRaining` derivation, `applyCloudGate` rain OR-term + doc, `skyCondition='rain'` precedence at the call site.
- `nextjs-app/lib/utils/sun-status-presentation.ts` — `SkyConditionCopy.rain` + `skyConditionCopy` `'rain'` case.
- `nextjs-app/lib/types/api.ts` — `skyCondition` doc-comment adds `'rain'` (no type change).
- `nextjs-app/app/api/venues/route.ts` — list-route deduped nowcast wiring.
- `nextjs-app/messages/sv/venue.json` + `nextjs-app/messages/en/venue.json` — `rain` sky key ×2 scopes ×2 locales.
- `nextjs-app/components/custom/map/MapView.tsx` — `rain` threaded into the two sky-copy objects.
- `nextjs-app/components/composed/venue/VenueQuickInfo.tsx` + `nextjs-app/components/composed/venue/VenueDetailContent.tsx` — `sky` shape gains `rain` (+ the detail call-site object).

**Modified (tests) — un-skipped red-first scaffolds + fixture updates:**
- `nextjs-app/test/unit/weather/nowcast-service.cloud-gate.atdd.test.ts` — un-skipped (AC1).
- `nextjs-app/test/unit/services/sun-engine.cloud-gate.atdd.test.ts` — un-skipped the four `[10.4 …]` describes (AC2/AC3/AC4).
- `nextjs-app/test/unit/sun-status-presentation.rain.cloud-gate.atdd.test.ts` — un-skipped (AC2 rain copy).
- `nextjs-app/test/unit/sun-status-presentation.test.ts` — `SKY_COPY.rain` + flipped the `'rain'` assertion to the rain copy.
- `nextjs-app/test/components/VenueQuickInfo.test.tsx` + `nextjs-app/test/components/VenueDetailContent.test.tsx` — `rain` added to the `sky` fixtures.

### Change Log

- 2026-07-03 — Story 10.4 implemented (Tier 2 rain-now radar signal): Nowcast 2.0 client, one-way rain gate, `skyCondition='rain'` + copy, AC4 future-horizon skip, list-route dedupe. All gates green (tsc/eslint/vitest), status → review.

### Review Findings

- [x] [Review][Decision][Low] `skyCondition='rain'` surfaced even when rain cannot gate the headline (e.g. rainy below-horizon NoSun venue) — `skyCondition = isRaining ? 'rain' : …` (`sun-engine.ts:577-581`) is computed independently of the gate fire condition, so a NoSun venue under active near-now rain yields `currentSunStatus==='NoSun'` (correct) but `skyCondition==='rain'`. No test pins the sky label on that path either way. This matches AC2's literal wording ("the surfaced sky condition reflects rain in plain language" — it IS raining) and is honest (rain copy on a NoSun venue never implies sun), so it is an untested intent nuance, not a defect. Recommended: dismiss: keep current behaviour — it is correct per AC2's verbatim wording; the only gap is an unpinned edge, and 10.5 owns the e2e weather matrix. [auto-resolved: dismissed per triage recommendation — epic mode]
- [x] [Review][Patch][Low] AC3 "no nowcast override (engine lazy path)" test can fire a REAL live Met.no fetch [nextjs-app/test/unit/services/sun-engine.cloud-gate.atdd.test.ts:578] — the `no nowcast override at all (engine lazy path)` test calls `applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY)` with `requestedAt === now` (near-now ⇒ `isNearNow` true) and no nowcast override; the file mocks only `@/lib/weather/met-no-service` + `@/lib/supabase/server` (not `@/lib/weather/nowcast-service`) and never stubs global `fetch`, so the engine lazy-imports the real accessor and issues a live outbound request to `api.met.no/nowcast/2.0/complete`. The test passes only because the client catches all errors → `undefined` (non-gating), masking the live call. Contradicts the story's ratified "no live Met.no calls in any test" discipline (CI flakiness/latency + real outbound request). Fix: add `vi.mock('@/lib/weather/nowcast-service', …)` (or stub `fetch` in that describe's `beforeEach`) so the lazy path resolves a mocked accessor. **RESOLVED:** added `vi.mock('@/lib/weather/nowcast-service', …)` at the top of the file (hoisted `getNowcastPrecipitationRate` mock defaulting to `undefined` = non-gating, byte-identical to the prior swallowed-error behaviour but with ZERO network I/O). The AC3 describe's `beforeEach` now resets + defaults it (`mockResolvedValue(undefined)`), and the lazy-path test gained an `expect(mocks.getNowcastPrecipitationRate).toHaveBeenCalled()` assertion PROVING the lazy import resolved the mocked accessor rather than escaping to api.met.no. Also added a no-op `userAgent` stub to the existing `met-no-service` mock (the nowcast module imports it — harmless, but keeps the mock shape self-consistent). Gate green: `tsc --noEmit` 0 errors; `eslint` clean; `vitest run` 118 files / 1099 tests, 0 skipped (this file 34/34).
