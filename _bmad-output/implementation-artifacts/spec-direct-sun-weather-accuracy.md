---
title: 'Direct-Sun Truth and Weather-Decision Correction'
type: 'bugfix'
created: '2026-09-03'
status: 'done'
baseline_commit: '16dea3bd4529b60e793e33b52e67e698af924fd2'
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/nextjs-app/docs/design/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Fresh complete-overcast data can produce a sunny result because snapshot gating uses divergent cloud math, `unknown` is publicly affirmative, and UI presents clear-sky geometry as actual sunlight.

**Approach:** Separate clear-sky geometry from a `likely / blocked / unknown` direct-sun state shared by snapshot-only APIs and Swedish-first UI.

## Boundaries & Constraints

**Always:** Actual sunlight means direct beam can reach the polygon geometrically and fresh, coherent forecast evidence supports it; diffuse daylight is not direct sun. Geometry ≤50% is `blocked`; positive geometry with indeterminate weather is `unknown`. Initially, `likely` requires valid total/layer cloud and fog ≤20%, zero precipitation, and a clear/fair symbol. Obstruction ≥80%, precipitation, or a blocking symbol is `blocked`; 20–80% and incomplete/unmatched/malformed/contradictory evidence are `unknown`. Use `clamp(low + medium + 0.25 × high, 0, 100)` plus raw total. Preserve the two-hour TTL, 90-minute match, accessibility, reduced motion, performance budgets, and provider-free reads.

**Ask First:** Changing 20/80; adding a provider, scheduler, migration, telemetry, or rebaseline; removing clear-sky potential.

**Never:** Treat stale/missing/legacy-incomplete weather as clear; extend TTL; derive visibility from fog; change production state/secrets; reopen Epic 12 or merge into Story 13.1.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Behavior |
|----------|---------------|-------------------|
| Clear | Geometry >50%; complete clear/fair evidence ≤20% | `likely`; direct-sun copy/amber |
| Broken clouds | Geometry >50%; obstruction 20–80% | `unknown`; clear-sky potential only |
| Overcast fixture | Geometry 95%; total 100, low 0, medium 100, high 0 | `blocked`; no sunny/rank/window/peak path |
| Precipitation | Positive amount or precipitation symbol | `blocked` with reason |
| Fog | Fog ≥80% or fog symbol; partial fog | `blocked`; partial is `unknown` |
| Stale/missing | Expired, absent, or unmatched snapshot | `unknown` for positive geometry |
| Incomplete | Required field absent or invalid | `unknown` until refreshed |
| Contradictory | Clear symbol conflicts with overcast metrics | `unknown` absent an independent blocker |

</frozen-after-approval>

## Code Map

- `nextjs-app/lib/weather/**`, `lib/solar/effective-cloud-cover.ts`, `lib/services/weather-snapshots.ts`, `scripts/refresh-weather-snapshots.ts` -- parse, persist, normalize, classify.
- `nextjs-app/lib/{types/api,utils/public-sun}.ts`, `app/api/venues/**` -- serialize verdicts, ordering, windows, and peaks.
- `nextjs-app/components/{custom,composed}/**`, `lib/utils/venue-*.ts`, `messages/{sv,en}/**` -- current/scrubbed UI and accessibility.
- Planning artifacts, `project-context.md`, and launch handoff -- durable decisions and gates.

## Tasks & Acceptance

**Execution:**
- [x] Add classifier/reason codes. Parse/store total/layer cloud, fog, next-hour precipitation, and symbol; never synthesize visibility.
- [x] Remove divergent math and every `gate !== gated` sunny assumption; retain separately named geometry.
- [x] Extend current/day-series DTOs, scrubbing, feedback evidence, ordering, windows, peaks, and APIs. Legacy rows fail safe; public reads stay provider-free.
- [x] Update pins, cards, quick info, detail, bilingual copy, forced states, and ARIA so unknown is neutral, never sunny.
- [x] Cover the matrix, match/DST boundaries, cache transitions, serialization, and no-provider invariant at unit, integration, API, component, and Playwright levels.
- [x] Write a dated brief with trace, reproduction, facts/hypotheses, ranked causes, official Met.no limits, options, telemetry design, and calibration experiment. Amend PRD, architecture, UX, Epic 14, project context, and launch handoff; preserve prior history.

**Acceptance Criteria:**
- The medium-layer overcast fixture is `blocked` through persisted APIs; no surface gives it amber, sunny copy, ranking, peak, or sun window.
- Unknown weather uses uncertain wording and labels geometry only as clear-sky potential on current/scrubbed views.
- Public venue-route tests observe zero calls to live provider adapters.
- Durable documents define one contract and separate this blocker from scheduler reliability.

## Spec Change Log

- 2026-09-03: Implemented the approved conservative direct-sun contract and
  documented the staged route toward field-calibrated geometry, shadows,
  weather, and venue polygons. No production state, schedules, TTL, provider,
  schema, deployment configuration, or telemetry sink changed.
- 2026-09-03: Three independent review passes found and resolved timestamp-key
  bypass, distant/invalid forecast matching, unknown-nowcast dry promotion,
  malformed runtime evidence, contradictory sky labels, neutral-card colour,
  active PRD/UX predicate drift, and missing edge regressions. Temporal
  freshness remains an adapter responsibility; the classifier receives only
  admitted evidence.

## Design Notes

`geometryPotentialPercent` is clear-sky potential; `directSunState` is the present forecast; evidence reasons explain uncertainty. Grid forecasts cannot prove polygon conditions, so copy expresses likelihood. Next, compare timestamped Gothenburg evidence, geometry/shadows, predictions, and observed direct beam before calibration.

## Verification

**Commands:**
- `cd nextjs-app && npx tsc --noEmit`
- `cd nextjs-app && npx eslint . --quiet`
- `cd nextjs-app && npx vitest run`
- `cd nextjs-app && npx playwright test`
- `git diff --check`

**Latest local results (2026-09-03):**

- TypeScript: pass.
- ESLint: pass.
- Vitest: 228 files, 2,128 tests passed.
- Focused classifier/snapshot/engine/persisted regression: 63 tests passed.
- Playwright compilation/discovery: the eight-scenario weather matrix produced
  16 mobile/desktop cases; the migrated surrounding E2E contracts produced 52
  discoverable cases. Browser execution was intentionally not started because
  the trusted resource-guard lifecycle context was unavailable in this actor.
- `git diff --check`: pass; only existing checkout line-ending warnings.

## Implementation Notes

- One server-owned classifier now emits `likely | blocked | unknown` with
  public-safe reason categories and compatibility projections.
- Met.no `complete` ingestion retains provider units and UTC valid times and now
  carries total/layer cloud, fog, next-hour precipitation, and symbol evidence.
- Persisted geometry remains the sole clear-sky source; public venue routes join
  it to unexpired snapshots and never call Met.no.
- Public predicates, ranking, peaks, windows, feedback evidence, cached planner
  scrubbing, pins, cards, QuickInfo, detail, ARIA, and coach copy consume the
  explicit verdict. Missing legacy state normalizes to `unknown`.
- Durable product/architecture/UX/launch documents now bind Epic 14 field
  validation and calibration before release; scheduler reliability remains a
  separate launch blocker.

## Suggested Review Order

**Decision boundary**

- Start with the single conservative geometry-plus-weather policy.
  [`direct-sun-classifier.ts:53`](../../nextjs-app/lib/services/direct-sun-classifier.ts#L53)

- Verify provider-time admission and fail-closed snapshot matching.
  [`weather-snapshots.ts:92`](../../nextjs-app/lib/services/weather-snapshots.ts#L92)

- Follow persisted geometry and weather into one response outcome.
  [`sun-geometry-repository.ts:116`](../../nextjs-app/lib/services/sun-geometry-repository.ts#L116)

- Confirm every public sunny consumer shares the explicit likely predicate.
  [`public-sun.ts:36`](../../nextjs-app/lib/utils/public-sun.ts#L36)

**Provider evidence**

- Check Met.no fields, units, valid times, and malformed-entry rejection.
  [`met-no-service.ts:99`](../../nextjs-app/lib/weather/met-no-service.ts#L99)

**Swedish-first presentation**

- Inspect state-specific map-pin accessible names.
  [`VenuePinLayer.tsx:70`](../../nextjs-app/components/custom/map/VenuePinLayer.tsx#L70)

- Inspect neutral unknown styling and qualified clear-sky potential.
  [`VenueCard.tsx:125`](../../nextjs-app/components/composed/venue/VenueCard.tsx#L125)

**Durable product decisions**

- Read the accepted architecture delta and complete pipeline trace.
  [`architecture.md:1467`](../planning-artifacts/architecture.md#L1467)

- Review the corrected product contract and measurable release gate.
  [`prd.md:579`](../planning-artifacts/prd.md#L579)

- Review semantic copy, visual states, and uncertainty treatment.
  [`ux-design-specification.md:1451`](../planning-artifacts/ux-design-specification.md#L1451)

- Continue with calibration and field-validation stories.
  [`epics.md:4565`](../planning-artifacts/epics.md#L4565)

- See evidence, options, root-cause ranking, and next experiment.
  [`direct-sun-weather-truth-2026-09-03.md:1`](../planning-artifacts/decisions/direct-sun-weather-truth-2026-09-03.md#L1)

**Regression evidence**

- Reproduce fresh complete overcast and clear control paths deterministically.
  [`weather-snapshots.direct-sun.test.ts:6`](../../nextjs-app/test/unit/services/weather-snapshots.direct-sun.test.ts#L6)

- Review all eight weather states across mobile and desktop surfaces.
  [`epic-10-weather-matrix.spec.ts:437`](../../nextjs-app/test/e2e/epic-10-weather-matrix.spec.ts#L437)
