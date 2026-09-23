# Near-threshold five-minute candidate — Story 15.1

## Result and scope

Five-minute base samples with one-minute interior probes near the 50% boundary are implemented in benchmark tooling only. Probe when either endpoint is within the configured percentage-point margin of 50%, or endpoint sunny/shaded labels differ. Refine detected crossings to a <=100ms bracket. Raw sunshine still requires >50%; this does not add hysteresis, a five-minute display delay or a weather change.

The 5pp candidate has 0 raw /0 filtered failures across the original 252 venue-days, and 0 raw /0 filtered failures across 84 additional venue-days (all 42 venues on April 15 and August 15). Failure means topology mismatch or matched boundary error >2 minutes. Duration uncertainty remains unresolved in 0 original and 0 additional cases. Posthotellet's previously missed October 25 shade gap: raw topology matches=true; filtered topology matches=true.

All additional-date references use independent one-minute samples with detected-crossing bisection. Original references are hash-bound run-12 evidence; original focused one-second unpruned checks remain run-13 evidence. These are model calculations using September's captured geometry, not historical field observations. They do not prove absence of sub-minute gaps. The tested algorithm deliberately reports certifiedContinuous=false. A retained adversarial test shows a shade gap can still be missed when both five-minute endpoints are far from the trigger threshold.

## Margin comparison — measurements

All timings below are sums of individual fresh engine evaluations, n=1 per venue/date/margin. No exposure cache is shared across methods. Benchmark-only spatial pruning is used; runtime confidence metadata equivalence is not claimed. Margins were compared on the original six-date matrix; 5pp was selected in advance for the two additional dates, not selected using those results.

| Margin pp | Days | Raw failures | Filtered failures | Unresolved duration | Base calls | Interior calls | Boundary calls | Wall seconds |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 252 | 1 | 0 | 0 | 32173 | 2511 | 5168 | 91.02 |
| 5 | 252 | 0 | 0 | 0 | 32173 | 6334 | 5188 | 96.85 |
| 10 | 252 | 0 | 0 | 0 | 32173 | 9061 | 5188 | 102.14 |

Additional dates at 5pp: 13566 base +2659 interior +1890 boundary calls; 30.79 wall seconds /30.50 CPU seconds. Reference-generation cost is excluded from candidate timing.

## Paired computation check

Run-15 adds twenty measured repetitions after two warmups, alternating method order, on September 22 except Posthotellet (49) on October 25. Baseline is five-minute sampling plus detected-transition refinement; candidate adds 5pp-triggered one-minute probes. Percentiles use nearest rank (p95 is observation 19 of 20). These examples cover previously selected caster strata and the gap regression, not a citywide or production latency distribution. Raw heap snapshots are process heap, not isolated allocations. Earlier n=3 observations remain in run-14.

| Venue ID | Casters | Method | Wall p50 ms | Wall p95 ms | CPU p95 ms | Calls |
|---|---:|---|---:|---:|---:|---:|
| 34 | 42 | base | 124.45 | 127.72 | 126.00 | 156 |
| 34 | 42 | threshold | 154.08 | 159.74 | 203.00 | 188 |
| 8 | 103 | base | 427.98 | 444.54 | 454.00 | 156 |
| 8 | 103 | threshold | 439.54 | 453.89 | 453.00 | 168 |
| 47 | 155 | base | 676.25 | 700.95 | 719.00 | 168 |
| 47 | 155 | threshold | 735.90 | 765.73 | 751.00 | 186 |
| 49 | 51 | base | 157.01 | 162.77 | 157.00 | 121 |
| 49 | 51 | threshold | 275.31 | 283.92 | 297.00 | 165 |

## Seasonal computation and storage implications — extrapolations

Scale each venue's measured candidate cost per base sample across all eight surveyed dates to its actual 245-date season count. For 42 venues: 1,619,044 base samples; estimated 2,187,923 total calls including adaptive probes; **75.30 wall minutes /75.11 CPU minutes**. This is a linear same-machine extrapolation, not a measured season. It excludes horizon derivation, scheduling, input loading, DB writes, retries and read load. Current captured caster mix may not represent other dates or growth venues.

| Inventory scenario | Estimated wall minutes | Estimated CPU minutes | Logical numeric MB if every probe is persisted |
|---|---:|---:|---:|
| 42 captured | 75.30 | 75.11 | 26.26 |
| 50 | 89.64 | 89.41 | 31.26 |
| 100 | 179.29 | 178.82 | 62.51 |
| 500 | 896.44 | 894.11 | 312.56 |

The stored representation remains undecided. Keeping every adaptive exposure point would use approximately 26.26 MB of offset/float64 numeric payload per current-inventory season; this excludes headers, inputs, metadata, TOAST/indexes and retention. Keeping only base samples plus refined window boundaries could reduce this, but boundary precision and window representation require schema work after G1. Neither is a measured database total.

The previous 77.8-minute base/refinement estimate and this eight-date candidate estimate use different date mixes and one observation per venue-day, so their difference does not demonstrate that extra checks are faster. Use the paired observations above to assess added work.

The prior sql-05 actual-value storage measurements remain valid for base-grid arrays only. Its 19–23MB single-season /86–106MB five-retained day-table estimates must not be relabelled as measured sizes for this adaptive candidate. No new database workload or production access occurred in this experiment. Hosting allowance, usable headroom, representative p95/end-to-end generation and read/load budgets remain open.

## Gate disposition and next decision

The candidate meets the filtered comparisons in this bounded survey and is worth retaining for further validation. It is not a proven no-gap detector. Preserve the accepted rule: suppress sunny bursts shorter than 300s, retain intervening shade gaps, and leave duration-boundary uncertainty unresolved. Successful computation means all planned cells completed with zero attempted external calls and matching inputs; it does not mean unseen intervals have been ruled out. Missing/exhausted work must never be published as complete coverage.

No requirement amendment, production implementation, numerical budget approval or Story 15.1 acceptance is inferred from the owner's approval to investigate this candidate. G1 remains open; Story 15.2 remains blocked. Full-season actual-year completeness, the 5° convention and independent weather gate remain unchanged. Any decision to tolerate undetected shade gaps needs explicit owner approval of a concrete amendment; this report does not apply one. No fourth automatic review was performed.

## Reproduction

From nextjs-app, set E15_EVIDENCE_ROOT to the retained story evidence root and E15_OUTPUT to a new absolute directory. Run npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts scripts/benchmarks/epic-15/threshold.measurement.ts. The runner validates capture and original-survey input/source hashes before starting; completion is published only after all 872 planned cells and attempted-call assertions succeed. Run threshold-cost.measurement.ts with a separate fresh output for the 176 repeated-cost records, including warmups. For the retained run-14/run-15 layout, node scripts/benchmarks/epic-15/threshold-report.mjs <evidence-root> regenerates summary.json; threshold-decision.mjs regenerates this report. Preserve source versions named in environment.json.
