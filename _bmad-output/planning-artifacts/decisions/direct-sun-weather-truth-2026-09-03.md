# Direct-Sun Weather Truth Decision — 2026-09-03

## Decision

SunnySeat now treats three facts separately. `sunExposurePercent` is the
clear-sky geometric share of a venue seating polygon. `directSunState` is the
forecast verdict for a meaningful direct beam at that polygon: `likely`,
`blocked`, or `unknown`. Bright diffuse daylight is neither direct sunlight nor
an amber recommendation. Public amber presentation, ranking, peaks, and sun
windows require both geometry above 50% and `directSunState: likely`.

`likely` initially requires fresh, complete, coherent Met.no Locationforecast
evidence: total and all three cloud layers, fog at or below 20%, zero
precipitation, and a clear/fair condition symbol. Weighted obstruction is
`clamp(low + medium + 0.25 * high, 0, 100)`. Obstruction of 80% or more,
positive precipitation, or dense fog blocks direct sun. Broken cloud (20–80%),
missing, stale, malformed, legacy-incomplete, unmatched, or contradictory
evidence is `unknown`; it never falls back to clear.

## Evidence and trace

`refresh-weather-snapshots.ts` fetches Locationforecast `complete`, stores only
weather slices in `weather_bucket_snapshots`, and the public venue read joins
that snapshot with persisted geometry. `weather-snapshots.ts` matches an exact
planner minute or nearest valid time within 90 minutes, classifies once, then
`public-sun.ts` uses only `directSunState === 'likely'`. The request path does
not call Met.no.

The deterministic fixture `{ total: 100, low: 0, medium: 100, high: 0, fog:
0, precipitation: 0, symbol: cloudy }` with 95% clear-sky geometry reproduces
the fresh-data defect mathematically: the former snapshot formula produced
`max(0, 0.7 × 100, 0.35 × 0) = 70`, below its 80 gate, so the former
`geometry > 50 && weatherGateState !== gated` predicate emitted amber. The new
classifier produces effective obstruction 100 and `blocked: cloud-obstruction`,
so it emits `CloudObscured`, no amber verdict, peak, or sun window. This path is
independent of snapshot scheduling. Separately, the old public predicate also
accepted `weatherGateState: unknown`, creating false positives for fresh
incomplete as well as stale/missing evidence.

## Provider limits and next experiment

Met.no Locationforecast is a grid forecast, not a venue-polygon observation;
cloud fractions and symbols cannot prove a direct beam at a terrace. Locationforecast
uses UTC timestamps and describes the instant fields, cloud-area fractions and
period summaries in its [data model](https://docs.api.met.no/doc/locationforecast/datamodel.html).
For the Nordic short range it documents a 2.5 km MEPS horizontal grid and notes
that variables/period aggregations can be absent. Its
[FAQ](https://docs.api.met.no/doc/locationforecast/FAQ.html) distinguishes instant
cloud fields from period precipitation/symbol fields, says fog is not a numeric
visibility measurement, and notes solar radiation is not normally included.
No synthesized visibility or direct irradiance is stored.

The highest-value next experiment is a timestamped Gothenburg validation set:
observer-confirmed direct beam/diffuse-only conditions, provider slice, geometry,
and rendered verdict for varied cloud, fog, precipitation, and seasons. Calibrate
thresholds only after that evidence. A new provider, telemetry sink, schema
migration, or scheduler is separately reviewed.

## Launch gate

This direct-sun contract is a correctness blocker until its regression and
human validation gates pass. It is separate from, and does not conceal, the
known scheduler reliability blocker: expired snapshots remain `unknown` under
the existing two-hour TTL.

## Confirmed facts versus hypotheses

**Confirmed:** fresh complete-overcast fixtures previously became public sunny because the snapshot path used divergent cloud math and the public predicate accepted non-gated/unknown data. Fresh complete-overcast now deterministically yields `blocked`; scheduler expiry independently yields `unknown`. The public read path is snapshot-only.

**Hypotheses to validate:** the conservative threshold is a useful launch guard but not a calibrated irradiance model; forecast-grid cloud fractions may disagree with local direct-beam conditions, especially around broken cloud, coastline effects, fog and short-lived showers.

The original Gothenburg observation is consistent with the confirmed defect but
cannot identify the exact provider slice without the approximate date, local
time, venue/location, and whether crisp object shadows were absent. Those details
remain valuable calibration evidence but were not required to reproduce or fix
the repository defect.

## Precise decision trace and ownership

`Met.no Locationforecast complete → met-no-service.ts (UTC provider valid time; coordinate request) → refresh-weather-snapshots.ts → weather_bucket_snapshots slices (total/low/medium/high cloud, fog, precipitation, symbol) → weather-snapshots.ts nearest ≤90-minute snapshot match + direct-sun-classifier.ts → persisted venue/day-series normalization → /api/venues and /api/venues/[slug] → TanStack query + planner scrub derivation → MapView, pins, cards, QuickInfo and detail.`

Only the scheduled refresh calls Met.no. API reads never call it. Geometry is owned by persisted solar coverage; weather classification is owned server-side; UI consumes serialized state/reasons and never reclassifies.

## Ranked causes and remediation choices

1. **Fresh-data cloud normalization/predicate defect — high likelihood, high impact.** Fixed by a single conservative classifier and direct-state predicate.
2. **Snapshot scheduling gaps — known, high impact but distinct.** Expiry is unknown, never clear; this needs its own launch gate.
3. **Grid/forecast versus terrace microclimate — certain limitation, medium/high impact.** No forecast provider can resolve awnings, trees or a direct beam at polygon scale.

| Option | Accuracy | Complexity / latency / cost | Operations |
| --- | --- | --- | --- |
| Conservative Met.no classifier (chosen) | Reduces false sunny calls; more unknowns | Low; snapshot-only, no request latency/cost | Threshold and fixture review |
| Calibrated multi-signal model using labelled observations | Potentially higher local accuracy | Medium/high; offline evaluation, no public live calls | Ground-truth governance and retraining approval |
| New irradiance/provider source | May improve direct-beam proxy | High integration/cost/availability risk | Separate provider, privacy, resilience and launch review |

## Regression and observability plan

Regression covers clear, broken, complete-overcast, precipitation, fog, stale/missing, incomplete and contradictory provider evidence at unit, persisted-route, API, component and Playwright boundary layers. Production telemetry, if separately approved, must contain only: coarse coordinate bucket, provider valid timestamp/age, cloud/fog/precip/symbol categories, classifier state/reasons, geometric percent band, rendered label and anonymous request correlation. It must exclude exact user location, venue feedback text, IPs, secrets and raw provider payloads.

Provider uncertainty remains explicit: forecast grid resolution, update horizon, UTC valid times converted only at display/planner boundaries, coordinate bucketing, 90-minute matching and forecast revision timing all preclude venue-level certainty.

## Deterministic reproduction and verification

The focused regression is
`test/unit/services/weather-snapshots.direct-sun.test.ts`; the classifier boundary
is in `test/unit/services/direct-sun-classifier.test.ts`, and persisted/API/UI
coverage extends the same case. From `nextjs-app` run:

```powershell
npx vitest run test/unit/services/direct-sun-classifier.test.ts test/unit/services/weather-snapshots.direct-sun.test.ts
npx vitest run
npx tsc --noEmit
npx eslint . --quiet
npx playwright test test/e2e/epic-10-weather-matrix.spec.ts --project=mobile --project=desktop
```

The Playwright test intercepts list/detail DTOs and aborts every `api.met.no`
request, so it verifies the presentation contract without provider or wall-clock
flakiness. Production observability and field collection remain unapproved until
their own review.
