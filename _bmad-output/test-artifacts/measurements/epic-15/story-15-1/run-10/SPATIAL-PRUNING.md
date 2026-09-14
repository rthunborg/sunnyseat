# Spatial pruning experiment — Story 15.1

Recommendation: retain this benchmark optimization for geometric reference calculations. It is not a production change or a solution to temporal gap detection.

## Measured result

All 1,890 retained September 22 coarse samples across 42 captured venues matched the original engine percentages exactly. All 1,500 integer-millisecond samples from run-09's three transition windows also matched exactly in both baseline and pruned repetitions. Zero attempted external calls; all required cells completed before publication.

| Venue | Original casters | Retained casters in exact window | Baseline median ms | Pruned median ms | Ratio of medians |
|---|---:|---:|---:|---:|---:|
| 34 | 42 | 1 | 1095.046 | 436.434 | 2.51× |
| 8 | 103 | 4 | 2405.622 | 1023.553 | 2.35× |
| 47 | 155 | 3 | 3167.578 | 796.982 | 3.97× |

Each exact-window execution evaluates 500 instants. One warmup per variant, three measured repetitions, alternating execution order. No p95 estimate. These are paired runs on the same shared Windows host; historical run-09 timings are not used as the denominator. The 42-venue coarse replay took a sum of 3,957.378ms across venue cells, n=1; this is not a full-season or production throughput measure.

## Why the rejection is narrow

The benchmark computes the bounding rectangle of the original and translated outer ring using the same height/terrain rules, shadow-length cap, operation order and projection constants as the engine. The projected hull uses those input points; its bounds cannot extend beyond their bounds. The raw projection fallback also uses those points. Strict rectangle separation therefore identifies casters whose projected geometry cannot overlap seating. Touching bounds, unsupported solar inputs and unusable coordinates stay with the original engine. No epsilon-based near-edge rejection is added.

The installed polygon intersection implementation also rejects disjoint bounding boxes. Its source, the installed hull wrapper/implementation, package lock and engine sources are hash-bound in environment.json. Tests check rejected projected hulls across synthetic fixtures and several solar positions; captured comparisons exercise actual clipping output. This remains a benchmark implementation with the recorded input/dependency scope, not a claim about arbitrary future geometry-library behavior.

Only geometric exposure equivalence is tested. Dropping non-affecting casters can change confidence/risk metadata, which can depend on the full caster set. The benchmark must not be wired into public runtime or described as whole-response equivalent. Captured input identities and original caster manifests remain preserved.

## What this does not solve

Rejection is calculated separately at each evaluated instant. It supplies no bound on a moving shadow between unvisited instants. The exact-reference path still visits every represented millisecond, so it keeps its Date-domain coverage but remains expensive. Do not replace per-instant rejection with endpoint-only rejection for a whole time interval.

A useful temporal optimization must enclose the full swept shadow over an interval, with validated solar and numerical bounds, then skip only proven ranges. The run-08 proof obligations remain open. This measured 2.35–3.97× improvement does not establish a practical seasonal method, full-day completeness, physical accuracy or production budgets. No additional cadence or accuracy amendment is approved.

## Reproduction and checks

From `C:\DEV\sunnyseat\nextjs-app`, set `E15_EVIDENCE_ROOT` to this story's measurement root and `E15_OUTPUT` to a new absolute directory:

```powershell
npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts scripts/benchmarks/epic-15/broadphase.measurement.ts
npx vitest run test/unit/benchmarks/epic-15/shadow-broadphase.test.ts
```

The runner validates run-07/run-09 completion and capture/source identities before comparison. A single exposure mismatch fails the run before publication. Raw measurements are in spatial-pruning.json; completion.json binds both raw output and environment. No database or managed resource was needed. Story 15.1 remains in-progress; 15.2 remains blocked.
