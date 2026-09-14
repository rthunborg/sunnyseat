# Detection-method feasibility — Story 15.1

Disposition: recommend whole-interval bounds with conservative unresolved ranges. This selects a research direction, not an accepted production algorithm. No requirement amendment or runtime change is made.

## Why another sampling cadence does not resolve the requirement

Two equal sunny samples cannot distinguish sustained sun from a shade gap between them. The captured run-07 comparisons are useful observations, but they cannot prove continuity. The accepted 300-second rule specifically forbids combining short bursts by overlooking such a gap.

## Concrete candidate

For each half-open time range `[a,b)`, an adapter must return bounds `lower <= exposure(t) <= upper` for **every** instant in the range. The bounds must cover the actual engine behavior, not only ideal polygon geometry or sampled values.

- `lower > 50`: the entire range is sunny.
- `upper <= 50`: the entire range is shaded, including equality.
- Otherwise subdivide. On missing bounds, minimum interval width or call-budget exhaustion, retain an explicit unresolved range.
- Combine adjacent proven sunny ranges only. Neither shade nor unresolved ranges may be crossed. A proven span of at least 300 seconds is a conservative eligible interior; it does not establish its exact maximal raw-window endpoints.
- Preserve unresolved boundary brackets and raw coverage separately. A partial proof does not make a day or generation complete. The current benchmark reports incomplete whenever any range remains unresolved; it does not decide a production boundary-tolerance policy.

`interval-enclosure.ts` implements only this conditional partitioning algorithm. Its oracle contract is a mathematical precondition, not a guarantee enforced by a TypeScript object. Supplying sample minima/maxima as bounds would invalidate the result. There is deliberately no application adapter.

## Reproduced evidence

`enclosure.json` compares exact analytic step-signal bounds with 60/10/5/1-second point sampling. Each signal has two sunny bursts shorter than 300 seconds with an intervening gap.

| Shade gap | Enclosure calls | False qualifying windows from enclosure | Point cadences producing false qualification |
|---|---:|---:|---|
| 10 seconds | 95 | 0 | none for this placement |
| 1 second | 95 | 0 | 60/10/5 seconds |
| 100 milliseconds | 95 | 0 | 60/10/5/1 seconds |
| 1 millisecond | 95 | 0 | 60/10/5/1 seconds |
| 0.125 milliseconds | 95 | 0 | 60/10/5/1 seconds |

All five enclosure cases retain unresolved boundary slivers and report **incomplete**. The 0.125ms case is an analytic adversary, not a physical measurement or a claim about JavaScript Date resolution. Exact whole-domain 299/300/301-second cases exercise the duration threshold. With no oracle, the 1,000-call budget returns no qualifying spans and remains incomplete.

This verifies conservative orchestration conditional on exact supplied bounds. It measures neither real geometric certification cost nor production capacity. Ninety-five cheap analytic calls cannot be extrapolated to polygon operations.

## What the real engine adapter must establish

Inspection of the current source identifies these proof obligations:

1. Bound corrected solar position over the complete time range, including angle wraps, refraction branches and date/time behavior. `calculateHourAngle` omits milliseconds while Julian-day calculations include them; a smooth derivative inferred from samples is not a safe bound for this implementation.
2. Freeze the resolved caster/input identity. Match the terrain-adjusted effective height, 3m exclusion, fixed metres-per-degree projection and 200m shadow cap. Projected shadows use a convex hull of the original and translated outer ring; a different physical model is not an equivalent engine bound.
3. For a sunny lower bound, enclose every possible shadow sweep and bound its total possible overlap with seating. A sum of overlap upper bounds is conservative despite overlaps, but may be too loose to be useful. Spatial rejection can prune far casters before expensive bounds. Temporal refinement should tighten the swept envelopes; endpoint hulls alone do not bound a curved trajectory.
4. Respect clipping and component behavior: shadow projection/union/intersection have exception fallbacks, and MultiPolygon extraction keeps the largest component. The engine derives exposure from that returned shadow area. A lower bound on ideal total shadow area is not necessarily a lower bound on the engine's selected shadow component. Successful dense samples do not prove clipping succeeds throughout an interval.
5. Use outward numerical error bounds or demonstrably conservative geometry operations. Arbitrary epsilon padding, observed maximum slopes, or ordinary floating-point polygon results are not proof. Missing numerical assurance must return unresolved.

These are implementation facts from `lib/solar/solar-math.ts`, `shadow-geometry.ts` and `shadow-calculation-service.ts`, bound by the environment source hashes. They are not a fourth automatic code review or runtime fix request.

## Recommended next experiment and stopping conditions

Build the adapter in benchmark tooling, starting with conservative sunny lower bounds from swept shadow envelopes. Compare interval containment against the retained engine cases and captured geometry, while recognizing that dense comparisons are falsification tests, not the bound's proof. Measure pruning rate, unresolved supported duration, call amplification and wall/CPU across full days before a full-season capacity run.

Retain 100ms minimum partition width and 10,000 enclosure calls only as the prototype's experimental defaults. These are not accepted production precision or operational budgets. The analytic stress run deliberately uses 0.0625ms/1,000 calls to expose boundary behavior. A missing or exhausted bound must never become a successful complete artifact.

The current engine has no validated interval adapter. Therefore detection is **not resolved for production**, and full-season budgets for this method cannot yet be honestly measured. Existing 5-degree, no-gap, 300-second and full actual-year season requirements remain accepted. Arrays remain provisional. Story 15.1 stays in-progress and 15.2 stays blocked.

## Reproduction

From `C:\DEV\sunnyseat\nextjs-app`, set `E15_OUTPUT` to a new absolute directory, then run:

```powershell
npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts scripts/benchmarks/epic-15/enclosure.measurement.ts
npx vitest run test/unit/benchmarks/epic-15/interval-enclosure.test.ts
```

The completed analytic run binds its raw output and source hashes. No database, production access, managed resource or provider call was needed for this experiment.
