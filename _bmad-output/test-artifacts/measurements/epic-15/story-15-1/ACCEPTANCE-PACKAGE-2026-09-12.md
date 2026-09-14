# Story 15.1 decision package — September 12, 2026

Status: **measurement package for owner consideration; G1 OPEN; story in-progress; 15.2 blocked.** Existing product decisions remain accepted: 5° model horizon, >50% geometry, suppress sunny runs shorter than 300s, no bridging shade gaps, independent weather, actual-year full-season coverage. This package does not silently amend any of them.

## Recommendations

1. Retain **five-minute base /5 percentage-point trigger /60-second interior probes /100ms detected-crossing brackets** as the best tested economical candidate. Fifteen- and thirty-second probes found no additional intervals in the difficult-case study. This is an empirical candidate, not a strict no-gap detector.
2. Prefer **full adaptive arrays with raw interval boundaries and shared versioned inputs**. They preserved all sampled raw percentages and boundaries and were smaller than compact/bytes in this workload. Avoid discarding probes merely to reduce logical payload: compact storage saved no measured relation space and cannot reconstruct omitted exposure values.
3. Propose **current plus one rollback generation**, with additional staging only when projected total size fits a capacity check. Five retained generations were tested as a stress scenario, not recommended as the default. No historical/failed/evidence-protected data is deleted by this work; a later approved retention policy must explicitly govern those records.
4. Draft pilot operating limits for owner consideration: one generation worker; at most five venues x three dates per shard; 60s shard wall limit with no new venue-day started after 45s; retry incomplete work idempotently and never publish incomplete coverage. Warn at 375MB aggregate database size; refuse to start a generation projected to exceed 400MB on the current Free plan. These are proposed guardrails, not measured production SLAs or implemented runtime limits. Target <=30MB per full current-inventory season for array day relations, with shared input/version growth budgeted separately. An aggregate limit takes precedence over any individual allocation.

## Accuracy: completed comparisons and remaining decision

Earlier run-14's 5pp candidate matched all 336 venue-days against one-minute references, including the observed Posthotellet 60-second shade gap. Run-16 recomputed seven difficult full days against uniform five-second references with detected-crossing refinement. This includes four short-interior cases and three caster-stratum examples. The finer references are also sampled, not continuous proofs.

| Interior cadence seconds | Raw failures | Filtered failures/unresolved | Total candidate calls | Summed wall seconds, n=1/case |
|---|---:|---:|---:|---:|
| 60 | 0 | 0 | 1139 | 3.22 |
| 30 | 0 | 0 | 1302 | 3.46 |
| 15 | 0 | 0 | 1645 | 4.96 |

The residual risk is **not limited to sub-minute gaps**. When five-minute endpoints are far from 50%, no interior probe is triggered; a regression demonstrates a four-minute shaded interval missed at all three tested interior cadences. This is a synthetic counterexample, not an observed captured-venue failure. Earlier conversational summaries that described only sub-minute uncertainty were too narrow. Shortening a probe that never runs cannot fix it.

There are two honest paths to G1b: explicitly accept the empirical detector's residual risk through a requirements amendment, or keep the strict no-gap requirement and continue work on detection that meets it. **Recommended disposition now: retain this candidate and leave G1b open; do not claim the current strict requirement is satisfied.** The owner must choose this accuracy tradeoff; approving investigations did not approve undetected shade gaps. A uniform minute grid could reduce the untriggered-cell risk but would still not prove continuous no-gap coverage.

## Bounded generation workflow: actual measurements

Run-17 used a fresh guard-managed PG15 database. It loaded the captured inputs from that database, parsed/validated them, computed supported horizons and adaptive exposure for all 42 venues on September 21–27, constructed representations and stored **294 actual venue-days in four alternative encodings**. Input fetch/parse took 237.86ms; the combined initial pipeline took **138.84 seconds**, n=1. It includes local docker/psql transport, assertions and all four encodings, but excludes initial schema/input seeding and a production scheduler. It is not a hosted-production benchmark or a season-long run.

Rollback left no failed generation; retry retained exactly the same day-row counts; one actual +2m seating-height edit for venue49 recomputed seven days and changed 7/7 payloads. Each encoding ended with 1,477 rows: 294 x five retained copies plus seven edited days. Retained copies use the same measured dates/values, not fabricated historical-year geometry.

| Phase | Wall ms (n=1, includes local transport) | Cluster WAL delta bytes |
|---|---:|---:|
| store/2026-09-21 | 274.80 | 342432 |
| store/2026-09-22 | 277.55 | 338152 |
| store/2026-09-23 | 228.84 | 336312 |
| store/2026-09-24 | 270.92 | 334784 |
| store/2026-09-25 | 277.57 | 337056 |
| store/2026-09-26 | 276.10 | 338752 |
| store/2026-09-27 | 230.57 | 335120 |
| interrupted-staging-rollback | 208.49 | 86984 |
| idempotent-retry | 260.35 | 0 |
| four-retained-copies | 4027.78 | 9279776 |
| venue-edit-recompute-and-store | 1856.67 | 67736 |

WAL figures are cluster-wide LSN differences, not per-table attribution; background or other-database writes can contribute. No claim of production WAL equivalence is made.

The four-alternative load is not directly scalable to one production encoding. Run-14's broader eight-date calculation-only estimate remains approximately 75.3 minutes for the current full season. Pure linear date scaling of this seven-day local pipeline would be 81.0 minutes; it assumes September costs for the entire season and includes four stored alternatives, so it is only a sensitivity example. No production completion-time promise is supported.

Grouping the measured venue-day calculation/representation costs into proposed five-venue x three-date shards gives a maximum summed cost of 9.57s in this cohort. This sum excludes per-shard transaction/queue overhead and is not a timed production shard; it motivates testing the proposed 60s pilot ceiling on the deployment platform before launch.

## Representation and total database size

Every representation stores the same raw interval boundaries. JSONB/arrays/bytes also retain every adaptive exposure point. Compact stores only base-grid exposure points plus the same boundaries; it preserves window reconstruction in this experiment, not omitted intermediate exposure percentages. Float64 values and half-millisecond boundaries round-trip without new rounding; malformed/truncated binary representations are rejected. These are experimental formats, not schema migrations.

| Encoding | Current 294-day relation B | Five copies B | After edit B | One season MB, linear estimate | Five copies MB, linear estimate |
|---|---:|---:|---:|---:|---:|
| jsonb | 671744 | 3014656 | 3031040 | 23.51 | 105.51 |
| arrays | 655360 | 2899968 | 2908160 | 22.94 | 101.50 |
| bytes | 737280 | 3358720 | 3375104 | 25.80 | 117.56 |
| compact | 671744 | 3235840 | 3252224 | 23.51 | 113.25 |

Relation totals above include heap/TOAST/index overhead; component columns in raw evidence are diagnostic, not additive to these totals. Shared input/generation relations after edits total 671744 B. Whole scratch database: 11449135 B after current load, 21377839 B after retention, 21590831 B after edits; its empty baseline was 7705391 B. Whole database measurements include all four alternatives and cannot be treated as the size of one chosen design.

Fewer logical points did not save physical space in this dataset. This is an observed layout/compression outcome, not a universal ranking of encodings. The controlled JSONB alternative is a new equivalent payload layout, **not** a reconstruction of every current production series-row column. The actual legacy relation is measured separately in the capacity census; migration coexistence and exact legacy-row replacement costs remain outside this experiment.

## Read measurements

Twenty serial warm observations after two warmups, each returning all 42 current venue rows for September22; all returned representations were decoded and compared with their expected values. Transport includes docker/psql startup and text serialization, so it does not measure production API latency. Nearest-rank p95 is sample 19/20. Plans/buffers retained; server execution time is one EXPLAIN observation, not p95. This is a controlled serial workload; concurrency, cold cache and production contention were not tested.

| Encoding | Transport p50 ms | Transport p95 ms | Client decode p95 ms | Returned bytes | Server execution ms, n=1 |
|---|---:|---:|---:|---:|---:|
| jsonb | 190.48 | 219.02 | 0.61 | 185408 | 0.96 |
| arrays | 199.26 | 215.64 | 0.69 | 166445 | 0.92 |
| bytes | 190.60 | 214.53 | 1.06 | 185273 | 0.57 |
| compact | 190.35 | 210.59 | 0.46 | 114682 | 0.69 |

Draft pilot read target: <=100ms for the database query and decoding of a 42-venue day batch, excluding API/network overhead, subject to a production-like benchmark. Local server-plan and decode observations support investigating that target; local command transport is a different measurement. Existing application NFRs are not changed or marked satisfied.

## Verified plan and capacity

Read-only management metadata confirms **Free plan**. At 2026-09-12T10:37:48.082949+00:00, current application database size was 309423251 B; summing all three cluster databases gave **324538545 B**. The documentation states a 500MB Free database quota. Using a conservative decimal 500,000,000-byte planning limit leaves **175.46 MB** before further generation/growth. [Supabase database-size documentation](https://supabase.com/docs/guides/platform/database-size) (checked September12).

The current legacy series relation is 164257792 B and remains included. Adding one estimated array season plus shared metadata suggests 348.15 MB aggregate; two suggest 371.09 MB; three suggest 394.02 MB. These are additive linear projections, not measured future database sizes. Five retained array copies scale to about 426.71 MB aggregate, leaving less margin for bloat, ongoing legacy growth and future input versions.

The 375/400MB proposed warning/hold levels reserve room below the quota; they do not authorize automatic cleanup or upgrades. Physical disk/WAL free space, organization billing-period average and other projects' usage remain unmeasured. Production inspection consisted only of organization/project metadata and read-only SQL census queries. The local resource Stop request was accepted; saved scratch data is retained.

## Owner acceptance and remaining limits

- G1a horizon/product semantics: previously accepted; unchanged.
- G1b detector: tested settings recommended as a candidate; strict no-gap criterion not satisfied. Requires the explicit accuracy decision described above.
- G1c completeness: previously accepted full actual-year March–October for every nondeleted venue, hidden included. Seven measured days are not a completed season. Failure, missing dates or incomplete inputs must never be labelled shade or published as a complete generation.
- G1d representation/retention/operational budgets: full arrays, current+rollback and draft pilot limits presented for approval. Production-like end-to-end/concurrent load, final generation/version schema and longer-season growth remain unmeasured; do not mark these as proven production budgets.

Story 15.1 is not done and Story 15.2 is not started. No application runtime, weather contract, schema/migration, production data or story/sprint status changed. No fourth automatic review was run. This package records completed practical investigation and identifies the decisions/validation still needed, rather than substituting estimates for required measurements.

## Reproduce

From nextjs-app, run cadence.measurement.ts with the benchmark Vitest config and fresh E15_OUTPUT /absolute E15_EVIDENCE_ROOT. For pipeline.measurement.ts additionally supply an actor-verified E15_CONTAINER, a fresh e15_ E15_DATABASE and E15_GUARD_RESOURCE; use only the required guard lifecycle. The retained output layout is run-16/run-17. Each lane publishes completion only after expected cells, readback and zero external-attempt assertions succeed. node scripts/benchmarks/epic-15/acceptance-report.mjs <evidence-root> regenerates this package and validates its measurement dependencies. Captured capacity is a dated snapshot, not a promise that live usage is unchanged.
