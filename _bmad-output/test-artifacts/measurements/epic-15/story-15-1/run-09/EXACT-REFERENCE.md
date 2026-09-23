# Exact finite-Date reference — Story 15.1

## Result

A benchmark adapter now computes whole-interval bounds for the existing deterministic engine by enumerating every representable millisecond. It is suitable as a bounded reference oracle, not as the seasonal generator. No physical-continuity or field-accuracy certification is implied.

| Venue | Casters | Enumerated instants | Median wall seconds | Exact >50% transition epoch ms | Extrapolated supported-day wall hours |
|---|---:|---:|---:|---:|---:|
| 34 | 42 | 500 | 1.871 | 1790056047000 | 40.54 |
| 8 | 103 | 500 | 4.041 | 1790060166000 | 87.55 |
| 47 | 155 | 500 | 3.715 | 1790078141000 | 80.47 |

Measured: three 500ms windows around transitions selected from run-07, each with one warmup and three fresh enumerations. All 500 integer instants per window were evaluated; no interpolation or skipped interior probes. Source/captured input identity and successful completion are retained. No p95 is estimated from n=3. Timings are on the existing shared Windows host, not production infrastructure.

Extrapolated: each venue's September 22 supported-day instant count multiplied by its local median cost per instant. This assumes that one transition window represents all other solar positions; it excludes IO, concurrency, growing cache memory and scheduling. These 40–88 hour values are neither measured daily runtimes nor approved budgets. They are enough to reject brute-force enumeration as the preferred production strategy pending a much cheaper proof method.

## Bound and scope

ECMAScript Date clips valid timestamps to integer milliseconds; for positive timestamps, every Date input produced by a range [a,b) is among floor(a) through ceil(b)-1. See the [ECMAScript TimeClip specification](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-timeclip). Enumerating this finite set and retaining its extrema therefore bounds the frozen engine callback over that Date domain. This is exhaustive enumeration, not an assumed smoothness bound.

Inputs, coordinate mode, source versions and clock are frozen. Geometry percentages are evaluated with the current repository engine, including its existing clipping/component behavior. The scope is engine output, not ideal geometry or sunlight below the accepted horizon. The selected transitions are within the supported-day reference. Weather is outside this geometric oracle.

The adapter rejects invalid intervals/values and returns null when its sample budget cannot cover the whole range. Cached subranges can still resolve. No partial extrema are published as a successful enclosure. Tests cover a missed one-millisecond gap, fractional boundaries, cache reuse and exhaustion.

All three observed predicate changes occur at integer-second boundaries in these windows. This observation does not prove the engine is constant between seconds: its Julian-day path includes milliseconds. It must not be used to reduce exhaustive enumeration to one point per second.

## Decision recommendation

Retain this adapter as the exact short-window reference for falsifying proposed faster methods. Reject exhaustive full-day/full-season generation as the default. Keep the accepted 5-degree convention, 300-second minimum, no-gap rule and actual-year completeness unchanged.

A practical generator still needs conservative whole-interval bounds that can skip proven ranges. The run-08 swept-envelope proof obligations remain applicable. Dense samples may find a counterexample to such bounds; passing dense samples alone cannot prove the bounds valid. Do not derive production budgets from the cheap analytic oracle or relabel unresolved ranges as completed coverage.

This establishes an exact engine-domain reference path; it does not resolve the efficient production method or approve numerical budgets. Story 15.1 remains in-progress and 15.2 remains blocked. No runtime, schema, production or database change was made.

## Reproduction

From C:\DEV\sunnyseat\nextjs-app, set E15_CAPTURE to capture-01, E15_MAIN_INPUT to run-07 and E15_OUTPUT to a new absolute directory. Run:

~~~powershell
npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts scripts/benchmarks/epic-15/exhaustive.measurement.ts
node scripts/benchmarks/epic-15/exhaustive-report.mjs <absolute-new-run>
~~~

