# Array-only workload measurements — Story 15.1

Measured at 2026-09-12T18:42:41.404Z. Fresh guard-managed scratch database; captured September input geometry, accepted detector. All 8 workloads completed. This report does not approve G1d or close Story 15.1.

| Workload | Venue-days | End-to-end wall seconds | Node batch CPU seconds | Slowest batch seconds | Batch WAL bytes |
|---|---:|---:|---:|---:|---:|
| initial-seven | 294 | 128.02 | 126.33 | 126.10 | 552400 |
| staged-seven | 294 | 144.58 | 126.80 | 8.70 | 702160 |
| rolling-five | 210 | 90.50 | 79.42 | 7.57 | 478392 |
| repair-one | 1 | 1.76 | 0.23 | 0.38 | 1696 |
| venue-edit | 7 | 3.97 | 1.23 | 0.76 | 10928 |
| local-import | 14 | 6.56 | 3.72 | 1.92 | 24936 |
| all-invalidation | 294 | 127.86 | 110.27 | 7.86 | 766176 |
| single-venue-full-season | 245 | 97.71 | 49.86 | 1.11 | 473216 |

End-to-end includes input write/load, horizon and exposure calculation, array serialization, local Docker/psql transport, storage and completion checks. Batch wall excludes input setup, WAL inspection and completion checks. CPU covers Node only, not Postgres/child processes. WAL is measured around each compute/store batch in the isolated workload; background cluster activity can contribute. Workloads are n=1 and run sequentially; initial versus staged differences include cache/order effects, not a controlled speedup claim.

There were 161 directly timed bounded batches (at most five venues by three dates). Maximum 8.70 seconds; 0 exceeded the proposed 60-second ceiling. This measures the candidate batch size locally; it does not implement deadline admission or establish hosted-platform limits. No-op completion lookup took 188.31 ms; it did not recompute geometry or perform writes. This is a known unchanged-input scenario, not a production invalidation detector.

The full season was actually calculated for venue 49: all 245 dates. Other full-season cohort costs remain projections. Local-import perturbation raises 51 caster heights by 2m and invalidates all 2 captured venues sharing those IDs, across seven dates. Payload change is asserted. It does not measure spatial re-resolution for new/removed buildings or real ingestion. All-invalidation recalculates seven dates for the entire captured cohort; it is not an inventory-wide full-season rebuild.

## Memory

Maximum observed heap 184.04 MB; OS process-lifetime high-water RSS 263.20 MB. Heap is sampled every 100 evaluations and at batch edges and may miss peaks. RSS includes the Vitest harness, captured data and accumulated results; neither value is isolated per-batch allocation or Postgres memory. This is evidence for local process sizing, not a deployment memory guarantee.

## Controlled concurrent reads

| Concurrent connections | Measured reads after warmups | Transport p50 ms | Transport p95 ms | Decode p95 ms |
|---|---:|---:|---:|---:|
| 1 | 20 | 193.68 | 196.01 | 0.45 |
| 4 | 80 | 201.90 | 217.13 | 0.45 |
| 8 | 160 | 232.28 | 269.12 | 0.50 |

Two warmup rounds then twenty measured rounds per concurrency level; each connection returns all 42 venue rows for September 22 and is checked against calculated arrays. Transport includes process/connection startup and JSON serialization. The cache was not evicted: these are warm local contention observations, not cold-cache or production API latency. Plans and buffers are retained in workloads.json. The proposed 100ms query-plus-decode target is not evaluated by this transport metric.

Whole scratch database: 11997999 bytes, including all alternative workload generations and shared inputs. This is not a current-plus-rollback retention estimate. No application tables, migrations, production writes or cleanup were used.

## Reproduce and outstanding gates

Run workloads.measurement.ts from nextjs-app with the benchmark Vitest configuration, absolute E15_EVIDENCE_ROOT, a fresh E15_OUTPUT, fresh e15_ E15_DATABASE and an actor-verified guard resource/container. The runner refuses existing outputs/databases and publishes completion only after expected workload sets, readbacks and zero external attempts. node scripts/benchmarks/epic-15/workloads-report.mjs <evidence-root> validates hashes and exact venue/date/read sets before reporting.

Cold-cache/hosted-platform measurement, actual full-cohort season generation, production ingestion/resolution costs, exact legacy-row replacement/coexistence and final numerical-budget approval remain open. Local results cannot close those gates. No fourth automatic review was run.
