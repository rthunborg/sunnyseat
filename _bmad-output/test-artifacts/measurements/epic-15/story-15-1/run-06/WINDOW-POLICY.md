# Story 15.1 — accepted five-minute window policy measurements

Product direction is accepted. Measurement acceptance remains OPEN; Story 15.2 remains BLOCKED. No runtime/schema/production changes. This supplement does not rewrite the prior v5 report or historical failed detection evidence.

## Reference reanalysis

105 retained engine-backed cases (70 original, 14 elevated, 21 slit) × three policies. Winter cases remain out-of-season controls. Main/elevated references have a one-minute discovery grid and <=100 ms detected brackets; slit references use a one-second grid. Duration uncertainty is propagated; threshold-overlapping bounds are unresolved. This cannot certify undiscovered shade gaps or field accuracy.

| Policy | PASS against declared filtered reference | FAIL/unresolved |
|---|---:|---:|
| endpoints | 102 | 3 |
| midpoint | 105 | 0 |
| minute | 105 | 0 |

## Analytic counterexamples

Exact 299/300/301-second input intervals test the duration threshold. Qualifying intervals start immediately; raw input values are preserved. Two 290-second sun bursts separated by a 10-second shade gap must both be suppressed. These are analytic signals, not physical terrace observations.

| Signal | Candidate | False sunny ms after filtering | Missed sunny ms | Candidate complete |
|---|---|---:|---:|---|
| duration-299 | endpoints | 0 | 0 | true |
| duration-299 | midpoint | 0 | 0 | false |
| duration-299 | minute | 0 | 0 | false |
| duration-300 | endpoints | 0 | 300000 | true |
| duration-300 | midpoint | 0 | 300000 | false |
| duration-300 | minute | 0 | 300000 | false |
| duration-301 | endpoints | 0 | 301000 | true |
| duration-301 | midpoint | 562 | 0 | true |
| duration-301 | minute | 0 | 301000 | false |
| missed-shade-gap | endpoints | 0 | 0 | true |
| missed-shade-gap | midpoint | 0 | 0 | true |
| missed-shade-gap | minute | 589609 | 0 | true |

A missed shade gap can merge separate short bursts into a falsely qualifying window. Five-minute filtering therefore does not by itself fix the discovery limitation. Unresolved duration means no certified result; complete computation is not a detection guarantee. Reference-grid blind spots remain explicit.

## New computation measurements

Existing shadow engine plus minute/adaptive samples and filtering, three synthetic caster configurations × seven dates. One warmup and five observations per cell; p95 is intentionally not estimated for n<20. Windows CPU accounting is coarse. No field inventory weighting.

| Fixture | Date | Wall p50 ms | Wall p95 ms | CPU p95 ms | Incomplete observations |
|---|---|---:|---:|---:|---:|
| courtyard | 2026-03-01 | 486.236 | not estimated | not estimated | 0 |
| courtyard | 2026-03-29 | 601.667 | not estimated | not estimated | 0 |
| courtyard | 2026-06-21 | 942.252 | not estimated | not estimated | 0 |
| courtyard | 2026-09-22 | 550.472 | not estimated | not estimated | 0 |
| courtyard | 2026-10-25 | 431.715 | not estimated | not estimated | 0 |
| courtyard | 2026-10-31 | 386.448 | not estimated | not estimated | 0 |
| courtyard | 2026-12-21 | 202.656 | not estimated | not estimated | 0 |
| narrow-street | 2026-03-01 | 370.726 | not estimated | not estimated | 0 |
| narrow-street | 2026-03-29 | 350.558 | not estimated | not estimated | 0 |
| narrow-street | 2026-06-21 | 431.731 | not estimated | not estimated | 0 |
| narrow-street | 2026-09-22 | 396.331 | not estimated | not estimated | 0 |
| narrow-street | 2026-10-25 | 324.234 | not estimated | not estimated | 0 |
| narrow-street | 2026-10-31 | 263.058 | not estimated | not estimated | 0 |
| narrow-street | 2026-12-21 | 92.296 | not estimated | not estimated | 0 |
| rooftop-surviving | 2026-03-01 | 109.639 | not estimated | not estimated | 0 |
| rooftop-surviving | 2026-03-29 | 138.042 | not estimated | not estimated | 0 |
| rooftop-surviving | 2026-06-21 | 193.833 | not estimated | not estimated | 0 |
| rooftop-surviving | 2026-09-22 | 145.29 | not estimated | not estimated | 0 |
| rooftop-surviving | 2026-10-25 | 110.316 | not estimated | not estimated | 0 |
| rooftop-surviving | 2026-10-31 | 119.283 | not estimated | not estimated | 0 |
| rooftop-surviving | 2026-12-21 | 52.42 | not estimated | not estimated | 0 |

Full 2026 March–October adaptive calculation for one synthetic rooftop-surviving fixture: 245 dates, 192268 samples, 46.805 seconds wall, 46.172 seconds CPU, n=1 (no p95); 0 incomplete/unresolved dates. Excludes SQL, invalidation orchestration, concurrency and recovery. No inventory/growth extrapolation is made from this single fixture.

Filter-only processing of retained interval lists: per-call wall p50 0.239 microseconds, p95 0.615 microseconds; 3150 batch observations, 1,000 calls per batch, five warmup batches per case. This is filtering overhead only, not shadow computation.

## Budget disposition and remaining work

No suitable current inventory with resolved venue/caster inputs or actual database baseline was found in the inspected local fixture/evidence locations. Building geodata alone is not that capture. Representative initial/repair/invalidation costs, growth/retention/headroom and controlled read/load budgets remain BLOCKED/NOT MEASURED. Prior sql-03 relation/whole-database measurements remain valid for their unchanged synthetic dataset; no new database-size result is claimed. A derived window representation has not been selected or measured in SQL, and serialized bytes cannot substitute for total database size.

Retain the owner-approved rule and provisional arrays, but do not approve the current minute sampler or production budgets. A method must detect qualifying windows without joining them across missed shade gaps; near-300-second uncertainty needs resolved bounds. Additional representative data and implementation-independent discovery evidence are required before combined G1 acceptance. No fourth automatic review or Story 15.2 work was performed.
