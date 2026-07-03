# Story 10.3: Layered Cloud Detail (Met.no `complete` Endpoint + Effective Cover)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want thin high haze treated differently from a blocking low cloud deck,
so that the app doesn't cry "no sun" under cirrus you can feel the sun through.

## Context & Why This Story Exists

Epic 10 "Honest Sky" makes the headline sun state weather-honest. Story 10.1 (ENGINE) shipped the Tier-0 cloud gate: a geometrically-sunlit venue whose **total** `cloud_area_fraction ≥ 80%` is re-labelled `CloudObscured`, and the FR12 confidence blend now reads cloud cover. Story 10.2 (UI) shipped the muted "Sol bakom moln" fourth visual state that renders that status. **Both are DONE on this branch** (status `review`).

**This story (10.3) is Tier 1: layered cloud detail.** Tier 0 gates on the single total cloud fraction — but a sky that is 100% *thin high cirrus* is NOT the same as 100% *low stratus deck*: you can feel the sun through cirrus, and a terrace under high haze still gets meaningful direct light. Treating both as "80% = obscured" is a false negative that Tier 1 fixes by:

1. **Switching the Met.no fetch from the `compact` endpoint to the `complete` endpoint** (same API, same TOS, same coordinate truncation and caching) so we receive the three-layer cloud split (`cloud_area_fraction_low` / `_medium` / `_high`), and
2. **Computing a layer-weighted "effective cloud cover"** where low/medium cloud dominate and high cloud contributes only weakly, then feeding THAT effective value — instead of the raw total — into BOTH the Story 10.1 cloud gate AND the FR12 confidence blend.

Story 10.1 deliberately left a **`// SEAM for Story 10.3`** hook at `sun-engine.ts:91-94` marking exactly where this swap happens: *"the ONLY change is what value is passed into `applyCloudGate` — the threshold + gate logic stay put."* You implement that swap.

**This is a BACKEND/DATA story — NO new screen, NO UI, NO i18n.** The Design Gate (epics.md:2737) is explicit: "No visual change beyond gate-input accuracy; existing overcast/clear visual states from Story 10.2 pass unchanged. Acceptance signal is the formula's unit-test matrix." Do NOT touch any component, message file, or reference PNG.

**Everything is on the opt-in real-engine path** (`SUNNYSEAT_SUN_ENGINE=real`). CI runs with the flag OFF, so **the default seed path must stay byte-identical** — that is what keeps CI green. Client components must NEVER import `lib/weather`/`lib/solar`/`lib/services/sun-engine` (AGENTS.md API boundary).

## Acceptance Criteria

**AC1 — Switch to the Met.no `complete` endpoint and carry the three-layer split on `WeatherSlice`**
**Given** `lib/weather/met-no-service.ts` currently calls the `compact` Locationforecast endpoint
**When** it switches to the `complete` endpoint (same API, same TOS posture, same coordinate truncation and caching)
**Then** `WeatherSlice` additionally carries `cloud_area_fraction_low`/`_medium`/`_high` (and the total retained), and the fetch/dedupe/revalidate behaviour is otherwise unchanged.

> _Reading (not part of the verbatim AC):_ the URL path segment changes from `locationforecast/2.0/compact` to `locationforecast/2.0/complete`. Everything else on the request — `?lat=…&lon=…` at `.toFixed(4)`, the identifying `User-Agent`, `next: { revalidate: 300 }`, the 48-entry slice cap, `validAt`/`createdAt`/`isForecast`/`temperature`/`visibility` mapping — stays identical. On `WeatherSlice`, the three layer fields are OPTIONAL (`?: number`), same as the total `cloudCover?: number` from Story 10.1: a `complete` entry that lacks a layer field, and any non-Met.no producer or fixture, stays valid without them.

**AC2 — Layer-weighted "effective cloud cover" feeds the gate + the confidence blend**
**Given** the three-layer split is available
**When** effective cloud cover is computed for the Story 10.1 gate and the FR12 confidence blend
**Then** a documented, named-constant weighting makes low/medium cloud dominate and high cloud contribute only weakly (thin cirrus ≠ blocking stratus; exact formula is the story's design decision, recorded with rationale), and unit tests pin the formula's boundary behaviour (e.g. 100% high-only must NOT trip the gate; 100% low must).

> _Reading:_ the "gate" is `applyCloudGate` (`sun-engine.ts:620`); the "confidence blend" is `calcCloudCertainty` → `cloudConfidenceFactor` (`confidence-calculator.ts:151,178`). BOTH currently read the raw total `weather.cloudCover`. After this story both read the **effective** value. The threshold (`CLOUD_GATE_THRESHOLD_PERCENT = 80`) and the gate/confidence LOGIC are unchanged — only the INPUT number changes. "100% high-only must NOT trip the gate" ⇒ 100% high-only produces effective cover **< 80**; "100% low must" ⇒ 100% low produces effective cover **≥ 80**.

**AC3 — Missing layer fields fall back to the total (Tier 0 behaviour); missing total is still unknown-never-clear**
**Given** the split fields may be absent for some timeseries entries
**When** any layer field is missing
**Then** the computation falls back to the total `cloud_area_fraction` (Tier 0 behaviour) — and per Story 10.1's rule, a missing total still means weather-unknown, never clear.

> _Reading:_ this is the graceful-degradation contract. If the layer split is unusable (any of low/med/high absent), the effective value = the raw total `cloudCover` (exactly Story 10.1 behaviour). If the total ITSELF is `undefined` (Story 10.1 AC2), the effective value is `undefined` too ⇒ non-gating AND non-clear (never `0`, never `100`). The `complete` endpoint should populate all three layers, but you MUST NOT assume it — a partial entry degrades to Tier 0, it never fabricates.

**Design Gate Criteria (backend/data — no new screen of its own):**
No visual change beyond gate-input accuracy; existing overcast/clear visual states from Story 10.2 pass unchanged. Acceptance signal is the **formula's unit-test matrix** (the AC2 boundary cases + the AC3 fallback cases), all red-first. There is NO new screenshot surface — do NOT fabricate a Visual/Behaviour/Animation/Visual-validation gate for a non-existent surface, and do NOT edit, create, or force any reference PNG.

## Tasks / Subtasks

- [ ] **Task 1 — Switch the Met.no fetch to the `complete` endpoint + carry the layer split (AC1)**
  - [ ] In `lib/weather/met-no-service.ts:53`, change the URL path from `locationforecast/2.0/compact` to `locationforecast/2.0/complete`. Keep the query string, `.toFixed(4)` truncation, `User-Agent` header, and `next: { revalidate: 300 }` EXACTLY as-is (Met.no TOS + caching invariants carry over — AGENTS.md, Story 8.5). Leave the `isAvailable()` probe at `:115` on `compact` (it is a cheap liveness ping, not a data read — switching it would just make the probe heavier for no benefit; note this in a comment so it is a conscious choice, not an oversight).
  - [ ] Extend the `MetNoResponse` instant-details interface (`:24-28`) with the three optional layer fields: `cloud_area_fraction_low?: number`, `cloud_area_fraction_medium?: number`, `cloud_area_fraction_high?: number` (the `complete` product provides all three in %; per the Met.no data model they exist ONLY in `complete`, which is why the endpoint switch is a prerequisite).
  - [ ] Map them onto the pushed `WeatherSlice` (`:84-103`) alongside the existing `cloudCover: instant.cloud_area_fraction` — e.g. `cloudCoverLow: instant.cloud_area_fraction_low`, `cloudCoverMedium: instant.cloud_area_fraction_medium`, `cloudCoverHigh: instant.cloud_area_fraction_high`. Like the total (Story 10.1 AC2), leave each `undefined` when the field is absent — do NOT `?? 0`. Do NOT change any other mapped field.
  - [ ] Add the three optional fields to the `WeatherSlice` interface in `lib/solar/types.ts:153-178`, mirroring the total `cloudCover?: number` doc-comment style (0..100, OPTIONAL so a partial `complete` entry / non-Met.no producer / fixture without them stays valid; `undefined` = that layer unknown → fall back to the total per AC3).

- [ ] **Task 2 — Compute layer-weighted "effective cloud cover" as a pure, exported, unit-testable helper (AC2, AC3)**
  - [ ] Add a small PURE exported helper — `effectiveCloudCover(slice)` (or `(low, medium, high, total)`) — that returns `number | undefined`. Put it where the gate seam consumes it: recommended in `lib/services/sun-engine.ts` next to `applyCloudGate`/`skyConditionFromCloudCover` (both exported pure mappers), so the SEAM swap is local and the helper unit-tests directly. (If the confidence calculator also needs it, export from a shared spot both can import without creating a cycle — `sun-engine.ts` already imports from `lib/solar`, not vice-versa, so prefer defining the weighting there OR in `lib/solar/` and importing into the engine; pick whichever avoids a circular import and note the choice.)
  - [ ] **Weighting (AC2 — this is the story's design decision, document it with rationale in a comment + Completion Notes):** low and medium cloud block direct sun; high cloud (cirrus, >5000 m) is thin and lets meaningful direct light through, so it must contribute only weakly. Define named constants, e.g. `CLOUD_WEIGHT_LOW`, `CLOUD_WEIGHT_MEDIUM`, `CLOUD_WEIGHT_HIGH`. A defensible formula: `effective = LOW*low + MEDIUM*medium + HIGH*high` with `LOW=1.0`, `MEDIUM=1.0` (or ~0.9), `HIGH≈0.25` and the result clamped to 0..100. It MUST satisfy the two pinned boundaries: **100% high-only ⇒ effective `< 80`** (does NOT trip the gate — 100*0.25 = 25 well below 80) and **100% low-only ⇒ effective `≥ 80`** (trips the gate — 100*1.0 = 100). Beware double-counting: `_low`+`_medium`+`_high` can each be up to 100 (they are cover fractions per altitude band, NOT a partition summing to the total), so a naive weighted SUM can exceed 100 for a genuinely fully-clouded multi-layer sky — that is fine after clamping (a real 100/100/100 sky IS overcast), but pick the weighting so a THIN-high-only sky lands low and a low deck lands high. Prefer a formula whose boundary behaviour is easy to reason about and re-tune. Document the exact formula and why in a comment.
  - [ ] **Fallback (AC3):** if ANY of the three layer fields is `undefined` (or all are), `effectiveCloudCover` returns the raw total `slice.cloudCover` (which itself may be `undefined` ⇒ still `undefined`, honouring Story 10.1 AC2 unknown-never-clear). Only when ALL THREE layers are present does the weighting apply. Never fabricate a `0` or `100` when data is missing.
  - [ ] Use a relative-boundary discipline in tests (retro-note: thresholds may re-tune) — assert "100%-high does NOT gate / 100%-low DOES gate" against `CLOUD_GATE_THRESHOLD_PERCENT` read from the constant, and assert the effective value's ORDERING (low-heavy > high-heavy for the same coverage), NOT brittle exact numbers, so a future weight re-tune survives.

- [ ] **Task 3 — Swap the SEAM: effective cover feeds the gate (AC2)**
  - [ ] At the SEAM in `computeRealSunEngineResult` (`sun-engine.ts:461-470`), replace the `weather?.cloudCover` argument passed to `applyCloudGate` with `effectiveCloudCover(weather)` (guard the `weather === null` case exactly as today — null weather ⇒ pass `undefined` ⇒ no gate, AC2/AC3). Do NOT change `applyCloudGate` itself, `CLOUD_GATE_THRESHOLD_PERCENT`, or the gate precedence — the SEAM comment (`:91-94`) promises the threshold + gate logic stay put; honour that.
  - [ ] Update the `// SEAM for Story 10.3` comment block (`:91-94`) to reflect that the swap is now DONE (point it at the `effectiveCloudCover` helper) rather than leaving a stale "future" note.
  - [ ] Do NOT touch `sunExposurePercent`, `sunWindow`, `peakTime` — they keep their geometric clear-sky meaning (the two-signal guarantee inherited from 10.1). The gate still only rewrites `currentSunStatus`.

- [ ] **Task 4 — FR12 confidence blend reads effective cover too (AC2)**
  - [ ] `calcCloudCertainty` (`confidence-calculator.ts:151-168`) currently calls `cloudConfidenceFactor(weather.cloudCover)`. Feed it the **effective** cover instead so confidence and the gate agree on the same cloud number (a thin-cirrus sky should NOT drop confidence as if it were a blocking deck). Two clean options — pick one and document it: (a) compute effective cover once in the engine and pass it in, or (b) have `calcCloudCertainty` compute it from the slice's layer fields via the same shared helper. **CRITICAL:** the UNKNOWN path (`effectiveCloudCover → undefined`) must still yield factor `1.0` (neutral / freshness-only) — do NOT let the layer swap reintroduce a `?? 0` or penalise missing weather as 100% overcast. And the geometry-only (no-weather) branch (`confidence-calculator.ts:47-59`) MUST stay byte-identical (the Story 10.1 AC3 guarantee) — your edit is confined to the cloud term inside the `if (weatherData)` branch.
  - [ ] Keep `cloudConfidenceFactor`'s existing shape (clear→1.0, overcast→`CLOUD_CONFIDENCE_FLOOR=0.5`, unknown→1.0). You are changing WHAT cover value flows in, not the factor curve.
  - [ ] Watch the EOL-churn trap (see Dev Notes): Story 10.1 lost a review round to phantom CRLF/LF churn in exactly this file. Confine your diff to the cloud-term line(s); preserve every untouched line's original EOL.

- [ ] **Task 5 — Decide `skyCondition` input + verify all downstream reads stay consistent (AC2)**
  - [ ] `skyConditionFromCloudCover(weather.cloudCover)` (`sun-engine.ts:480-482`) drives the plain-language sky copy Story 10.2 renders. DECISION REQUIRED (record in Completion Notes): should the displayed sky condition read the RAW TOTAL or the EFFECTIVE cover? **Recommended: keep `skyCondition` on the RAW TOTAL** — `skyCondition` describes the *observable sky* (clear / partly cloudy / overcast), and a sky that is genuinely 100% cirrus IS visually overcast even though sun still reaches the terrace; muting the reported sky to "clear" would be dishonest about what the user sees. The EFFECTIVE cover is a *sun-blocking* estimate that belongs to the gate/confidence, not to the sky-appearance label. If you agree, leave `skyCondition` reading `weather.cloudCover` (raw total) UNCHANGED and document the split rationale; if you choose otherwise, justify it and confirm Story 10.2's rendered copy still reads sensibly. Either way, `skyConditionFromCloudCover(undefined) → 'unavailable'` (Story 10.1 AC2) stays.
  - [ ] Grep every reader of `cloudCover` / the new layer fields to confirm no other consumer silently changed meaning: `applyCloudGate` (now effective), `calcCloudCertainty` (now effective), `skyConditionFromCloudCover` (decision above), `predictionUncertainty` (`buildPredictionUncertainty` — confirm it does NOT read cloudCover in a way that the effective swap breaks), and any fixture/test constructing a `WeatherSlice`. No consumer should crash or NaN on `undefined` layers.

- [ ] **Task 6 — Red-first unit-test matrix (AC2, AC3) — the acceptance signal**
  - [ ] `effectiveCloudCover` pure-helper matrix (new test, mirror the `.cloud-gate.atdd`/`.coverage` scaffold structure): 100%-high-only ⇒ effective `< CLOUD_GATE_THRESHOLD_PERCENT`; 100%-low-only ⇒ effective `≥ CLOUD_GATE_THRESHOLD_PERCENT`; 100%-medium-only ⇒ gates (medium is blocking); mixed layers order correctly (low-heavy effective > high-heavy effective for equal raw coverage); ALL-layers-present uses the weighting; ANY-layer-missing ⇒ falls back to the raw total (AC3); total `undefined` + layers `undefined` ⇒ `undefined` (unknown-never-clear, AC3).
  - [ ] End-to-end through `computeRealSunEngineResult` (extend `test/unit/services/sun-engine.cloud-gate.atdd.test.ts` or add a sibling): a slice with `cloudCoverHigh: 100` and low/medium `0` over a geometrically-sunlit venue does NOT gate (`currentSunStatus` stays `Sunny`) — the cirrus-doesn't-cry-no-sun case this story exists for; a slice with `cloudCoverLow: 100` DOES gate (`CloudObscured`). Mock the `getForecast` boundary / inject slices exactly like the existing scaffold (`weatherSlice({ … })` helper) — NO live Met.no.
  - [ ] Met.no `complete` mapping test (extend `test/unit/weather/met-no-service.cloud-gate.atdd.test.ts` or `met-no-service.test.ts`): a synthetic `complete` response with `cloud_area_fraction_low/_medium/_high` present maps them onto the slice; the URL requested is the `complete` path (assert the fetched URL contains `/complete`, mirroring the existing 4-decimal-truncation URL assertion at `met-no-service.test.ts:75`); an entry MISSING a layer field leaves that slice field `undefined` (never `0`). Keep the existing missing-total ⇒ unknown assertions green.
  - [ ] Confidence test (extend `test/unit/confidence-calculator.test.ts` / `.cloud-gate.atdd`): 100%-high-only cloud yields HIGHER confidence than 100%-low-only cloud (effective cover is lower for cirrus), while both are still `< clear`. Assert RELATIVE ordering. Keep the byte-identical no-weather regression (`overallConfidence === 0.6`) green.

- [ ] **Task 7 — Verify gates + record decisions**
  - [ ] Capture the fresh HEAD vitest baseline BEFORE editing (Story 10.2 finished 113 files / 1013 tests, 0 skipped — measure it fresh, it may have advanced). The count is expected to INCREASE with the new red-first tests; none dropped.
  - [ ] Run the standard gate from `nextjs-app/` (AGENTS.md): `npx tsc --noEmit` (0 errors), `npx eslint .` (0 errors, no NEW warnings — 13 pre-existing warnings are the current baseline), `npx vitest run` (all green). NO new Playwright/e2e is in scope for 10.3 — the deterministic mocked-weather e2e matrix is Story 10.5. Do NOT add e2e here.
  - [ ] Confirm the DEFAULT seed path (flag OFF, as CI runs it) is byte-identical: the venues-route default-path contract tests must stay green unchanged (the fixture/seed path never touches Met.no or the effective-cover helper).
  - [ ] Record in Completion Notes: the exact weighting formula + constant values + rationale (why high ≈ 0.25 or whatever you chose); the `skyCondition` raw-vs-effective decision (Task 5); the `effectiveCloudCover` fallback contract; where the helper lives + why (no circular import); and that the `isAvailable` probe stays on `compact` deliberately.

## Dev Notes

### The Story 10.1 SEAM — this is the one line you are here to swap
`sun-engine.ts:91-94` (verbatim):
```
// SEAM for Story 10.3: for 10.1 the gate input is the raw total `cloud_area_fraction`.
// Story 10.3 replaces that with a layer-weighted "effective cloud cover" (high vs
// low cloud weighted differently); when it lands, the ONLY change is what value is
// passed into `applyCloudGate` — the threshold + gate logic stay put.
```
And the call site (`sun-engine.ts:466-470`):
```
const currentSunStatus = applyCloudGate(
  geometricSunStatus,
  isSunVisible,
  weather?.cloudCover,   // ← Story 10.3: replace with effectiveCloudCover(weather)
);
```
`CLOUD_GATE_THRESHOLD_PERCENT = 80` (`:95`) and `applyCloudGate` (`:620-646`, already `never`-exhaustive) are RATIFIED for the epic — do NOT change the threshold value, the gate precedence, or the switch. You change ONLY the third argument.

### Ratified epic invariants (retro-notes epic-10, Story 10.1 — MUST hold)
- **`CLOUD_GATE_THRESHOLD_PERCENT = 80`** and the gate logic are fixed. 10.3 changes the *input* to the gate, never the threshold or the branch. (retro-note Phase-5: "Story 10.3 replaces the raw total with a layer-weighted effective cover — only the value passed into `applyCloudGate` changes.")
- **The confidence formula shape is ratified:** `calcCloudCertainty = forecastFactor × freshness × sourceReliability × cloudConfidenceFactor(cover)`, with `cloudConfidenceFactor` linear from `1.0` (clear) to `CLOUD_CONFIDENCE_FLOOR = 0.5` (100%), and **unknown cover → `1.0` neutral**. 10.3 changes which `cover` value flows in (effective, not total); it does NOT re-shape the factor.
- **Missing cloud data must stay `undefined` — NEVER reintroduce `?? 0`** (retro-note Phase-5, Story 10.1 AC2, hard constraint). This now extends to the three NEW layer fields: an absent `cloud_area_fraction_low/_medium/_high` stays `undefined`; the fallback (AC3) is to the raw total, itself possibly `undefined`. `undefined` at every level = non-gating AND non-clear. Do NOT `?? 0` or `?? 100` any layer field.
- **`never`-exhaustive switch discipline:** any NEW switch you write on `VenueSunStatus` uses a `never`-exhaustive default so a future status is a compile error (epic convention). You are unlikely to add a status switch here (the gate already has one), but if you do, follow it.
- **Tests assert RELATIVE boundary behaviour, not absolute magic numbers** (retro-note: four thresholds — including layer weighting — are deliberately re-tunable; write tests that survive a re-tune). Assert "100%-high does NOT gate / 100%-low DOES", and ordering (cirrus effective < stratus effective), read against the named constant — not `expect(effective).toBe(37.5)`.
- **The gate lives on the real-engine path only.** The default seed/fixture path (`route.ts` fixture branch, `venue-planner.ts`) never calls Met.no or the effective helper and stays byte-identical — this is what keeps CI (flag OFF) green.

### Two status vocabularies — unchanged here, do NOT confuse (inherited from 10.1/10.2)
- **DTO `VenueSunStatus`** = `'Sunny' | 'Partial' | 'Shaded' | 'NoSun' | 'CloudObscured'` (`api.ts:13`). Already complete; you do NOT extend it.
- **UI-token `SunStatus`** = `'sunny' | 'partial' | 'shaded' | 'upcoming' | 'obscured'` (`design-tokens.ts:1`). 10.2 added `'obscured'`; you do NOT touch it. **10.3 has NO UI, so you touch neither vocabulary's rendering.**

### Met.no `complete` endpoint — verified facts
- The three-layer split (`cloud_area_fraction_low` = cloud below 2000 m; `_medium` = 2000–5000 m; `_high` = above 5000 m, i.e. cirrus) exists ONLY in the `complete` product, per the Met.no data model — the total `cloud_area_fraction` is in BOTH. All four are in percent (0..100). (Source: docs.api.met.no/doc/locationforecast/datamodel — confirmed 2026-07-03.)
- TOS is identical for `compact` and `complete`: same identifying `User-Agent` requirement (403 otherwise), same coordinate parameters. The `.toFixed(4)` truncation (Story 8.5, AGENTS.md) and `next: { revalidate: 300 }` caching carry over unchanged. The forecast dedupe (`createDedupedForecastFetcher`, `mapWithConcurrency`) is upstream in `sun-engine.ts` and unaffected by the endpoint path change — it dedupes by rounded coordinates, not by endpoint.
- **`complete` payloads are LARGER** than `compact` (many more instant variables). We only read a handful of `instant.details` fields, so parse cost is negligible, but note it as the one behavioural difference. The 48-entry slice cap (`:72`) already bounds it.
- The layer fields are NOT a partition of the total — each is an independent cover fraction for its altitude band, so `low + medium + high` can exceed 100 (and need not equal the total). Design the weighting accordingly (clamp the weighted result to 0..100).

### Effective-cover weighting — the physics you are encoding (AC2)
- Low/medium cloud (stratus, cumulus, altostratus below 5000 m) blocks direct beam sunlight — a full low deck = no sun at ground level. Weight ≈ 1.0.
- High cloud (cirrus/cirrostratus above 5000 m) is thin ice crystals; a fully cirrus sky still transmits a large fraction of direct sun — you "feel the sun through it." Weight must be small (≈ 0.2–0.3) so 100% cirrus lands the effective cover well BELOW the 80 gate.
- Physics guardrail (epics.md:2657): weather is a **citywide-scale** signal, geometry is the per-patio signal. Do NOT try to model per-venue cloud precision or per-cloud shadows — the effective cover is a single scalar per slice, applied uniformly. This story just makes that one scalar smarter about cloud TYPE.
- The exact weights are the story's design decision and are **re-tunable** (like the 80 threshold) — so bake the rationale into a comment and write tests that assert the boundary INTENT (cirrus doesn't gate, low deck does), not the exact number.

### Confidence blend — precise scope (Task 4, AC2)
- `calculateConfidenceFactors` has two modes (`confidence-calculator.ts:11-15,28-60`): geometry-only (no weather) and weather-enhanced (60% GeometryQuality + 40% CloudCertainty). Your change is confined to the cloud term inside `calcCloudCertainty` (`:151-168`) — swap the `cloudCover` it reads for the effective value. The `else` no-weather branch (`:47-59`) and `applyConfidenceCaps` (`:184+`) are byte-identical/untouched.
- FR12 (prd.md:377): confidence "blends geometric sun certainty with weather-based cloud cover uncertainty." 10.1 implemented the blend; 10.3 makes the "cloud cover" half layer-aware so cirrus doesn't over-penalise confidence.
- **EOL trap (retro-note Phase-7 + Story 10.1 Review Finding #1):** this exact file (`confidence-calculator.ts`) cost Story 10.1 a review round to phantom CRLF/LF churn — the parent blob stores mixed EOLs and an editor rewrite of touched blocks flipped 70 LF lines to CRLF, rendering as fake "reindent" noise. Keep your diff to the literal cloud-term line(s); do NOT let your editor reformat/re-EOL untouched lines. If the tool rewrites EOLs, reconstruct from the parent blob applying only the logic edit.

### `skyCondition` decision (Task 5) — why raw total, not effective
`skyCondition` (`clear`/`partly-cloudy`/`overcast`/`unavailable`) is the plain-language description of the **observable sky** that Story 10.2 renders on quick-info + detail. A 100%-cirrus sky is visually overcast/hazy even though direct sun still reaches the terrace — so `skyCondition` should keep reading the RAW TOTAL (what the sky looks like), while the GATE + CONFIDENCE read the EFFECTIVE cover (how much sun is actually blocked). This is the honest split: "the sky is overcast (total) AND yet this terrace is still in usable sun (effective < gate)" — which is precisely the two-signal truth the epic exists to tell. Keep `skyConditionFromCloudCover(weather.cloudCover)` reading the total unless you have a strong reason otherwise; record the decision.

### The whole-outcome cache is safe by construction (no action needed)
The sun-compute cache (`sun-engine-cache.ts`, 15-min bucket) caches the WHOLE `SunEngineOutcome`. Because the gated status, `skyCondition`, and confidence are all computed inside `computeRealSunEngineResult` from the SAME `weather` slice (now including its layer fields), the cached bucket stays internally consistent — exactly as Story 10.1 established. Do NOT fold effective cover or layer fields into the cache KEY (`sun-engine.ts:272-289` — that key note is a ratified invariant; adding weather to it is forbidden). No cache change is needed for 10.3.

### Deferred-work items folded in (subject-overlap only — NONE reopened)
- **8.3 R1 — `applyRealSunEngine` catch-all returns seed on weather-only failure** (`sun-engine.ts`, Target: None conditional): same weather path your effective helper reads. `getForecast` returns `[]` (never throws) on Met.no failure → `fetchWeatherForVenue` returns `null` → you pass `undefined` to the gate ⇒ no gate (AC3). Your `effectiveCloudCover` must be null/undefined-safe end-to-end. Do NOT "fix" or reopen the catch-all — just be null-safe.
- **8.5 R1 — `weatherUpdatedAt`/future-valid-time for planner-future requests** (`sun-engine.ts:204-213`, Target: None): your effective helper reads `cloudCover`/layer fields, NOT `weatherUpdatedAt`, so it is unaffected. A future planner slice is a FORECAST slice (`isForecast=true`) with its own layer split — gating on forecast layer cloud is correct and intended (Story 10.4 excludes only the near-now RADAR signal for future requests; cloud forecast still governs). Do NOT special-case forecast here.
- **8.5 R1 — deduped forecast fetcher never evicts in-flight entries / unparseable `entry.time`** (`sun-engine.ts:140-150`, `met-no-service.ts:75-76`, Target: None conditional): unrelated to the endpoint/layer change — the dedupe is by coordinate and the `validAt` parse is unchanged. Do NOT reopen.
- **10.1 R1 — `WeatherDataDto.cloudCover` required vs legacy optional** (`api.ts:284`, Target: None conditional): the legacy `sun-exposure-service` DTO, NOT on the live venues route, NOT touched by 10.3. If you extend `WeatherSlice` you do NOT need to touch `WeatherDataDto` (no route wires `calculateSunExposure`). Do NOT reopen; but if you add layer fields to `WeatherSlice`, sanity-check that `sun-exposure-service.ts` (a `WeatherSlice` consumer) still compiles — it reads `cloudCover`, not the new layers, so it should be inert.
- **8.7 — confidence/coverage caps include gated-out casters** (elevation): dormant (all launch venues null elevation), NOT overlapping cloud work. Do NOT touch.

### Test surfaces (all red-first — the acceptance signal per the Design Gate)
- `test/unit/weather/met-no-service.cloud-gate.atdd.test.ts` (or `met-no-service.test.ts`) — `complete` URL + layer-field mapping + missing-layer ⇒ `undefined` (AC1, AC3). The existing scaffold's `metNoResponse` helper (`:37-53`) is the pattern to extend with layer fields.
- New `effectiveCloudCover` pure-helper matrix — 100%-high-not-gating / 100%-low-gating / mixed ordering / all-layers-weighted / any-missing-falls-back-to-total / total-undefined ⇒ undefined (AC2, AC3).
- `test/unit/services/sun-engine.cloud-gate.atdd.test.ts` (+ `.coverage.test.ts`) — end-to-end: cirrus-only slice does NOT gate a sunlit venue; low-deck slice gates it; geometric layer preserved (AC2). Extend the existing `weatherSlice({ … })` injector with layer fields.
- `test/unit/confidence-calculator.test.ts` (+ `.cloud-gate.atdd`) — 100%-high confidence > 100%-low confidence, both < clear; no-weather byte-identical (`overallConfidence === 0.6`) still green (AC2).
- `test/unit/api/venues-route*.test.ts` — default seed path byte-identical; a `complete`-fed real-engine venue still round-trips (regression).

### Project Structure Notes
- Files you edit: `lib/weather/met-no-service.ts` (endpoint + layer mapping + `MetNoResponse` interface), `lib/solar/types.ts` (`WeatherSlice` layer fields), `lib/services/sun-engine.ts` (`effectiveCloudCover` helper + SEAM swap + comment update), `lib/solar/confidence-calculator.ts` (cloud-term input swap). Tests under `test/unit/{weather,services}` and `test/unit/confidence-calculator.test.ts`.
- NO new component, NO i18n/message change, NO route/store/schema change, NO new dependency, NO new screen. If you find yourself editing a component, a `messages/*.json`, a reference PNG, or `route.ts`/`venue-store.ts` for anything beyond a type ripple, STOP — that is out of 10.3 scope.
- Windows/PowerShell host: run vitest via `cd nextjs-app; npx vitest run` (or the package script). Do NOT run git — the orchestrator owns all git/PR work.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-10.3] (lines 2717-2737) — the 3 verbatim ACs + backend/data Design Gate; the tier scope, physics guardrail, and hard constraints in the Epic-10 preamble (2645-2659).
- [Source: _bmad-output/implementation-artifacts/10-1-cloud-gated-sun-state-weather-truth-fixes.md] — the SEAM, `CLOUD_GATE_THRESHOLD_PERCENT=80`, the `applyCloudGate`/`cloudConfidenceFactor` shapes, unknown-never-clear rule, and the EOL-churn review finding.
- [Source: _bmad-output/implementation-artifacts/10-2-sun-behind-clouds-two-signal-ui-state.md] — how `CloudObscured` + `skyCondition` render (the surfaces you must NOT change), the `skyCondition`-is-plumbed fact.
- [Source: _bmad-output/planning-artifacts/prd.md#FR12] (line 377) — the geometric+weather confidence blend the effective cover refines.
- [Source: AGENTS.md] + [Source: CLAUDE.md] — API boundary (clients never import lib/weather|solar|supabase), Met.no TOS (identifying User-Agent, ≤4-decimal coordinates), test gate.
- [Source: nextjs-app/lib/weather/met-no-service.ts:24-28,53,84-103,115] — `MetNoResponse` interface, the `compact` URL to switch, the slice mapping, the `isAvailable` probe.
- [Source: nextjs-app/lib/solar/types.ts:153-178] — `WeatherSlice` (add the three optional layer fields, mirror `cloudCover?` doc style).
- [Source: nextjs-app/lib/services/sun-engine.ts:91-95,461-482,620-660] — the SEAM comment + threshold, the gate call site + `skyCondition`, `applyCloudGate`/`skyConditionFromCloudCover` pure mappers (where `effectiveCloudCover` belongs).
- [Source: nextjs-app/lib/solar/confidence-calculator.ts:151-188,47-59] — `calcCloudCertainty`/`cloudConfidenceFactor` (swap the input) + the byte-identical no-weather branch.
- [Source: https://docs.api.met.no/doc/locationforecast/datamodel] — `cloud_area_fraction_low/_medium/_high` definitions + %, complete-only availability (verified 2026-07-03).
- [Source: _bmad-output/auto-bmad/retro-notes/epic-10.md] — never-exhaustive-switch discipline, relative-boundary tests survive re-tune, layer-weighting is 10.3, unknown-cloud-stays-undefined (never `?? 0`), EOL/CRLF-churn caution.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

### Change Log

### Review Findings
