# Story 15.1 — measurement decision package v4 — Round 2 fixes

Status: **IN PROGRESS. G1a–G1d PENDING; Story 15.2 BLOCKED.** No owner criterion is satisfied by this report. Measurements are model experiments, not field truth or production capacity proof.

The reproducible synthetic and local SQL lanes ran. Current non-deleted/hidden/public inventory, representative resolved caster inputs and the actual production JSONB/database baseline were not available as local captured fixtures. Historical 42-public-venue evidence is not a current-inventory measurement. Those required lanes remain BLOCKED; no production query, write, provider call or runtime change was used.

## Daylight and DST (M01)

Coordinates 57.7089, 11.9746, synthetic control; refraction-corrected engine elevation. Times below are Stockholm local times including the engine's supported-side boundary representative.

| Date | >=5° start | >=5° end | Base + exact edges | Supported minutes | 0–5° minutes |
|---|---|---|---:|---:|---:|
| 2026-03-01 | 07:51:06.000+01:00 | 16:58:45.999+01:00 | 38 | 547.667 | 83.983 |
| 2026-03-29 | 07:31:42.000+02:00 | 19:03:10.999+02:00 | 48 | 691.483 | 80.1 |
| 2026-06-21 | 05:10:08.000+02:00 | 21:17:42.999+02:00 | 67 | 967.583 | 110.433 |
| 2026-09-22 | 07:39:21.000+02:00 | 18:29:14.999+02:00 | 45 | 649.9 | 80.1 |
| 2026-10-25 | 07:56:33.000+01:00 | 15:54:50.999+01:00 | 34 | 478.3 | 89.967 |
| 2026-10-31 | 08:12:16.000+01:00 | 15:38:14.999+01:00 | 32 | 445.983 | 93.783 |
| 2026-12-21 | 10:06:30.000+01:00 | 14:13:49.999+01:00 | 18 | 247.333 | 137.4 |

March–October contains 245 dates and **13,186 base-plus-edge samples per synthetic control venue**; samples are derived for each date. Winter is measured but outside the season. February 28, November 1 and 2027 solar-date controls are retained. Spring/autumn local days measure 23/25 hours. Explicit-offset UTC/local records round-trip, including both autumn 02:30 occurrences. The existing repository helper loses the first autumn occurrence when converting through an offset-free local Date; see M01-dst.json. Preserve UTC + offset identities in later storage.

The <=1 ms numerical brackets are threshold-crossing brackets, not millisecond solar accuracy: hour-angle math omits milliseconds, and the refraction function jumps near true elevation -0.5°. The 0° crossing can therefore have nonzero residual. The 5° model floor is distinct from physical beam absence. No new physics was introduced.

## Transitions and semantics (M02–M04)

70 geometry/date cells (10 synthetic geometries × 7 dates), full minute-grid oracle plus independently bisected detected crossings to <=100 ms. Open, fully covered and elevated analytic sanity checks passed; duplicate casters do not double shade. Full sun AND shade intervals, baseline quarter-hour engine values and separate coordinate/horizon deltas are retained.

| Candidate | Missed complete reference sun runs | Worst matched boundary error, ms | Added samples across matrix |
|---|---:|---:|---:|
| endpoints | 0 | 411 | 742 |
| midpoint | 0 | 411 | 3269 |
| minute | 0 | 439.5 | 37914 |

These geometry cases alone do not establish discovery. Analytic counterexamples deliberately fail:

| Signal | Endpoint missed sun ms | Midpoint missed sun ms | Minute missed sun ms |
|---|---:|---:|---:|
| 12:06-12:09 | 180000 | 0 | 469 |
| off-centre-12:01-12:02 | 60000 | 60000 | 469 |
| sub-minute-12:01:10-12:01:20 | 10000 | 10000 | 10000 |
| interior-shade | 0 | 0 | 469 |
| multiple-runs | 90000 | 90000 | 625.5 |

Interior-shade failure appears as false-sun duration/merged runs in the raw comparisons. Endpoint-only misses the 12:06–12:09 sun interval. A midpoint misses the 12:01–12:02 interval. Minute probing misses the 10-second off-grid interval; the minute reference itself shares this discovery limit. These analytic signals are NOT claimed to be real caster-produced windows. The separate engine-backed slit matrix below supplies physical geometry counterexamples; real field transitions remain required evidence. No arbitrary-duration transition guarantee is approved.

Depth, sample, time and solver exhaustion all record failures and unverified computation. Current experimental limits are 20,000 samples/day, depth 20, 120 seconds per candidate call and 30 solver iterations; these are harness safety values, NOT accepted operational budgets. The 10-point trigger boundary is exercised. Nearest-sample reconstruction uses earlier-sample ties; safety-limited outputs must never count as complete.

Lossless float64 exposure is used equally in JSON/arrays/bytes. Integer rounding changes the >50 predicate at **183 sampled instants** in this matrix (integer-rounding-ledger.json); do not silently treat an integer encoding as equal-precision raw-engine evidence. Existing public precompute separately rounds its 61 values; this run's independent baseline is the pure engine, not a captured production row.

M04-pin-semantics.json records real pin markup and current Swedish templates for 25%, 0% and 100% with likely/blocked/unknown weather. 25%→0% keeps the negative pin grey, but known-negative ARIA says “ingen direkt sol väntas vid vald tid”; unknown detail copy says “Vid klar himmel: 0% utan byggnadsskugga”. Such copy does not qualify model support. Request a living-UX semantic amendment before rollout if the owner rejects that implication; no copy was changed. Detail copy is source evidence, not a rendered detail test. All low-angle changes sampled at quarter-hours are in M04-low-angle-deltas.json; exhaustive sub-minute/physical semantics are not claimed.

## Computation and completeness (M05/M07)

Paired deterministic fixture-order rotation, 5 warmups and 30 observations per fixture; 45 base-plus-edge samples on September 22, serial Node on the recorded machine. Windows CPU accounting is coarse (zero on cheap cells is resolution loss, not free work). RSS is a process observation, not an allocation delta or sampled peak.

| Synthetic fixture | Casters | Wall p50 ms/day | Wall p95 ms/day | CPU p95 ms/day |
|---|---:|---:|---:|---:|
| open | 0 | 0.375 | 0.578 | 0 |
| fully-covered | 1 | 20.902 | 35.632 | 32 |
| courtyard | 4 | 43.784 | 75.811 | 63 |
| narrow-street | 2 | 26.469 | 48.93 | 47 |
| rooftop-terrain | 4 | 0.427 | 0.905 | 0 |
| irregular | 3 | 50.886 | 92.726 | 79 |
| holed | 2 | 42.714 | 72.607 | 79 |
| overlapping | 4 | 50.919 | 82.625 | 78 |
| tiny | 1 | 9.346 | 16.759 | 16 |
| cap-and-height-boundaries | 3 | 16.074 | 25.828 | 31 |

The separate full-date strategy run is measured **n=1 per fixture/strategy**, not a p95. It includes shadow calculations on all actual date-dependent base-plus-edge grids, excludes adaptive samples, SQL and scheduler overhead.

| Work across 10 synthetic fixtures | Samples | Serial wall seconds | CPU seconds |
|---|---:|---:|---:|
| full | 131860 | 81.738 | 81.31 |
| remaining | 21150 | 13.542 | 13.406 |
| rolling | 2430 | 1.333 | 1.315 |
| repair | 500 | 0.227 | 0.235 |

**EXTRAPOLATED**, equal synthetic mixture scaled from the measured full-season CPU totals (not representative real inventory):

| Venue scenario | Samples | CPU seconds |
|---|---:|---:|
| 50 | 659300 | 406.55 |
| 100 | 1318600 | 813.1 |
| 500 | 6593000 | 4065.5 |

The earlier per-sample September-cost extrapolation is retained in M05-M07-projections.json as a separate assumption; use the full-season figures above for this synthetic workload. Neither predicts production cost. Adaptive full-season CPU, realistic sparse/typical/dense populations, shard/concurrency/lease, importer/edit/no-op orchestration and current-inventory end-to-end cost remain unmeasured. A full-season edit/all-invalidation has the same pure computation shape; it is not an implemented or timed invalidation service.

September 10 remaining-date staging contains **52/245 dates (21.224%)** and 2,115 base-plus-edge samples per control venue, omitting **193 historical dates** listed in the raw evidence. Recommend **full March–October coverage including hidden non-deleted venues** as the publication denominator. Remaining dates are staging only. Effective-date applicability would require an explicit amendment covering historical reads/replay/feedback, edits, deletion and rollover.

## Database and decoding (M06)

PostgreSQL 15.13, 8 KiB pages, pglz, shared_buffers=128MB; fsync/full_page_writes/synchronous_commit all ON. Guard-managed Docker Desktop named-volume environment; capacity.txt records available filesystem space. PostGIS image 3.5; scratch SQL does not require extension geometry.

Identical 70 measured fixture/date rows × five retained-generation roles = **350 rows per encoding**. Inputs stored once per fixture, with generation/release metadata. The previous-season, rollback, failed-staging and protected-evidence copies simulate retention storage only: they are not computed previous-season/full-season results. JSONB stores point objects, arrays store integer millisecond offsets + float64 exposures, versioned bytes store uint32 offsets + float64 exposures. The actual existing JSONB and complete production database baseline are BLOCKED.

| Encoding | Clean total relation bytes | After no-op updates bytes |
|---|---:|---:|
| jsonb | 2031616 | 2072576 |
| arrays | 1695744 | 1826816 |
| bytes | 1875968 | 1925120 |

Empty isolated database: **7705391 B**. Whole experiment database: **13587247 B** clean, **13890351 B** after churn, including all three alternatives simultaneously and catalogs. These are database-size measurements, not serialized lengths. Per-relation census includes heap main fork, table+TOAST+forks, TOAST including its index, table indexes and total. Add total_bytes once; the diagnostic columns overlap and must NOT be summed.

The SQL log records clean load and three no-op updates (unchanged payloads), write/WAL bytes, plans/buffers and 30 warm read repetitions after 5 warmups. Read wall times include docker exec/psql startup/text transport and are not server API latency. EXPLAIN gives server-side plan timings. Caches are warm/uncontrolled; no provider-cold or durable recovery proof. Host decoders enforce equal precision, shape/order/range; SQL prototypes do not establish production malformed-byte rejection. Growth retention/headroom, historical input sizes, actual baseline contents and production traffic/cost cannot be certified by this small synthetic DB.

## Recommendations awaiting owner decision

- **G1a PENDING:** retain 5° as a candidate supported-model horizon, distinct from 0° visibility. Require explicit model-qualified semantic acceptance; existing copy may require a living UX amendment. Preserve UTC/offset identities and threshold brackets.
- **G1b NOT READY:** reject endpoint-only and single-midpoint discovery. Minute interior probing plus <=1-second detected-bracket refinement passed this declared geometry reference but demonstrably misses sub-minute runs. Use the failed engine-backed slit evidence, complete representative evidence and resolve the supported detection claim through explicit amendment before schema lock. Do not lower accuracy silently.
- **G1c PENDING:** recommend full-season denominator, including hidden non-deleted venues. Do not publish remaining-date staging as complete.
- **G1d NOT READY:** arrays are the provisional choice for this equal-precision matrix, subject to actual JSONB/input/retention/growth and API evidence. Final initial/repair/all-invalidation CPU/wall, shard/lease, DB capacity/headroom, batch/read and load budgets remain **UNKNOWN**. For reproducibility only, a proposed local synthetic regression envelope is <=200 ms p95 per 45-sample fixture/day, <=250 seconds serial for this 10-fixture coarse full-season job, and <=20 MB for the entire three-alternative matrix DB. These conservative experiment envelopes are NOT production budgets and require owner acceptance if adopted. Keep existing warm <200 ms API, ~5-second provider cold and JS budgets unchanged.

G1 is combined: partial acceptance does not unlock 15.2. Approval fields: Rasmus/signature/date/evidence revision = **PENDING** for all four gates.

## Missing evidence and unblock requirements

| Lane | Status | Required input/work; owner |
|---|---|---|
| Current inventory and real caster strata / CPU | BLOCKED | Authorized consistent capture of all non-deleted venues, hidden/public counts, canonical seating/elevations, resolved eligible casters and import provenance; maintainer |
| Existing production JSONB, total baseline, historical input replay | BLOCKED | Authorized baseline census/data capture; historical unavailable inputs cannot be fabricated; maintainer |
| Radius/eligibility extremes and adaptive full season | NOT RUN | Additional engine-backed fixtures and representative captured inputs, independent oracle validation; developer/Test Architect |
| Production read/cold/load, growth retained footprint, invalidation/shard/lease limits | NOT RUN | Representative isolated dataset and defined workload/concurrency; Architect/Test Architect |
| Model-qualified semantic and G1 acceptance | PENDING | Rasmus review after missing required measurements; no self-approval |

Full harness tests and the measurement runs do not replace any missing lane. Source changes are restricted to benchmark/test tooling, synthetic fixtures and execution evidence/state. No runtime or application migration changes, commit, push, merge or deployment.

## Additional engine-backed slit evidence

M02-physical-slits.json contains 21 synthetic geometry/date cells: three street widths (0.1/0.4/2 m), 2 cm × 20 cm seating and 20 m walls across all seven required dates. These are extreme but engine-backed polygons, not surveyed fixtures. A complete 45-minute interval around solved solar noon was evaluated every second, with +/-500 ms reference boundary resolution and residual sub-second blindness.

| Policy | Completely missed slit sun runs | Missed complete-run duration, seconds |
|---|---:|---:|
| endpoints | 17 | 2541 |
| midpoint | 14 | 1124 |
| minute | 3 | 62 |

Minute probing entirely misses 27 s (March 1), 21 s (October 31), and 14 s (winter control) windows. This is failed detection evidence, not an approved tolerance. M04-exact-edge-values.json separately records existing and candidate open-seating exposure immediately before/at/after every 5-degree edge across the required dates. The approved <=2-minute transition target cannot be called universally satisfied while windows are undiscovered. Owner acceptance must address the unsupported claim through explicit amendment or a better measured method.

R1 scoring requires identical transition topology and mutually one-to-one interval matches; unmatched sun OR shade transitions fail regardless of duration. Matched boundaries allow <=120,000 ms each, and total sun/shade mismatch allows at most transition-count ×120,000 ms. These declared experimental comparison bounds do not waive missed events or establish physical accuracy. Strategy totals are published only after all expected fixture/strategy/date/sample cells and zero attempted calls pass validation.

M01-rollover.json records November and December 2026 requests with explicit seasonYear=2027 and assertions against all 245 independently enumerated 2027 dates, including February/November exclusions. The standalone March 1 solar date is only a solar control.

## Changed input and retained generation experiment (R1-03)

A +2 m seating-elevation edit is recomputed through the existing engine at the original measurement instants. New input versions, day payloads, generations and a release manifest are appended while every original retained generation remains. This measures real logical payload changes in a synthetic storage workload, not revised adaptive-coverage or production write performance. No-op-update WAL is measured separately from changed-input/generation WAL.

| Encoding | Bytes after retaining changed generation |
|---|---:|
| jsonb | 2408448 |
| arrays | 2113536 |
| bytes | 2211840 |

Whole database after retained edits: 15045423 B.

| Write phase | Encoding | Wall ms (n=1) | WAL bytes |
|---|---|---:|---:|
| noop-updates | all | 350.349 | 538328 |
| changed-input-generation | jsonb | 333.612 | 488968 |
| changed-input-generation | arrays | 323.169 | 441288 |
| changed-input-generation | bytes | 337.286 | 457176 |

Per-encoding edit proofs require 350 old rows retained, 70 new rows, 20 input versions and changed day checksums. Exact per-phase SQL is preserved. WAL uses cluster LSN deltas in this isolated container; wall time includes docker/psql transport. No p95, production budget or growth/headroom guarantee follows. Prior sql-02/churn.json remains only a no-op-update observation.

## Round 2 completion and elevated-shadow evidence

Main and edge completion records require success, zero attempted calls, exact expected cells and matching SHA256 hashes before this report or any derived ledger is written. Raw main files without completion remain unpublishable. Edge outputs are written only after the final offline guard; a missing final completion record still blocks reporting.

The original rooftop-terrain fixture is an all-casters-excluded control (effective height -3 m), not elevated-shadow accuracy evidence. Two additional synthetic elevated fixtures retain effective caster heights 10 m and 12 m, respectively. Their full required-date minute-oracle/candidate matrix is in M02-elevated.json; all 14 cells must contain sun and shade. These cases are separate from the original ten-fixture CPU/storage matrix.

| Elevated fixture | Date | Reference transitions | Base samples | Wall p50 ms/day | Wall p95 ms/day | CPU p95 ms/day |
|---|---|---:|---:|---:|---:|---:|
| rooftop-surviving | 2026-03-01 | 1 | 38 | 7.462 | 8.74 | 16 |
| rooftop-surviving | 2026-03-29 | 1 | 48 | 10.465 | 11.621 | 16 |
| rooftop-surviving | 2026-06-21 | 1 | 67 | 29.467 | 37.38 | 32 |
| rooftop-surviving | 2026-09-22 | 1 | 45 | 10.222 | 14.5 | 16 |
| rooftop-surviving | 2026-10-25 | 1 | 34 | 6.875 | 11.323 | 16 |
| rooftop-surviving | 2026-10-31 | 1 | 32 | 6.179 | 6.665 | 16 |
| rooftop-surviving | 2026-12-21 | 1 | 18 | 3.628 | 4.288 | 16 |
| terrain-surviving | 2026-03-01 | 1 | 38 | 7.655 | 8.356 | 16 |
| terrain-surviving | 2026-03-29 | 1 | 48 | 9.959 | 16.329 | 16 |
| terrain-surviving | 2026-06-21 | 1 | 67 | 25.895 | 38.278 | 32 |
| terrain-surviving | 2026-09-22 | 1 | 45 | 10.529 | 16.518 | 16 |
| terrain-surviving | 2026-10-25 | 1 | 34 | 6.83 | 8.364 | 16 |
| terrain-surviving | 2026-10-31 | 1 | 32 | 7.343 | 11.495 | 16 |
| terrain-surviving | 2026-12-21 | 1 | 18 | 3.878 | 4.628 | 16 |

Elevated CPU observations use 5 warmups and 30 repetitions per date, base samples plus exact edges only. This closes the all-excluded fixture blind spot, not representative elevated population, adaptive full-season or production cost evidence. Candidate interval comparisons and raw timing repetitions are retained without assuming candidate success.

SQL measurements are retained from sql-03, not rerun for Round 2. The reporter verifies its original dataset hash against this main run and checks the edited dataset/input manifest against run-03. Supplemental elevated cases are NOT included in those SQL totals. All owner gates and production budgets remain pending.

| Elevated candidate | Failed cells against declared minute oracle | Worst matched boundary error ms | Missed sun ms | False sun ms |
|---|---:|---:|---:|---:|
| endpoints | 0 | 351.5 | 1815 | 879 |
| midpoint | 0 | 351.5 | 1815 | 879 |
| minute | 0 | 439.5 | 1468 | 1988 |
