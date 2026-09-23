# Legacy storage and shared inputs — September 14, 2026

## Finding

Shared inputs are the dominant opportunity in the captured legacy layout. This supports the existing full-array/shared-input recommendation; it does not approve an application migration, retention policy or production budget.

Read-only production census at 2026-09-14T11:31:43.023002+00:00: 1554 legacy rows, 2026-08-17 through 2026-09-18; total legacy relation 169.312 MB; application database 314.330 MB. Stored input_payload column values total 136.562 MB and series values 0.687 MB. Inputs account for 99.50% of those two stored column totals. This percentage is not a fraction of total database size. Relation totals additionally include row/page/TOAST/index overhead and existing bloat; do not add diagnostic columns to the relation total.

## Local physical-layout experiment

Three actual rows (venues34/8/47, September18) were captured through read-only SQL. A fresh guard-owned PG15 scratch database reproduced every original row column and both index column orders. Business CHECK functions, the public-venue foreign key and RLS were deliberately not cloned; this compares physical storage, not application-schema correctness. The split variant stores input_payload once by geometry_input_hash and reconstructs every original value exactly; bidirectional EXCEPT ALL checks passed.

| Dataset | Legacy relation bytes | Shared day + input relation bytes |
|---|---:|---:|
| Three actual captured rows | 196608 | 229376 |
| 111 rows: synthetic 37-date repetition | 4513792 | 360448 |

The tiny three-row case costs more when split because of extra table/index pages. With repeated inputs, the synthetic repetition uses 92.01% less total relation space. The repetition reuses original series/input/timestamps across changed date keys; it is not 37 days of measured sunlight, a production-population sample, or a full-season result. PostgreSQL15 local and PostgreSQL17 production compression/page behavior may differ.

| Write phase | Wall ms including local command transport, n=1 | WAL bytes |
|---|---:|---:|
| three-actual-legacy-rows | 196.44 | 119032 |
| three-shared-rows | 188.54 | 120064 |
| replicate-legacy-36-more-dates | 194.84 | 4282912 |
| replicate-shared-36-more-dates | 187.98 | 105960 |
| coexisting-measured-array-week | 351.65 | 559592 |

The repeated legacy writes and shared writes carry the same reconstructed values. WAL can include background cluster activity; these timings are not production throughput measurements.

## Coexistence and limits

Adding the previously measured 294 array venue-days consumed 647168 bytes of array relation space. Whole scratch database grew from 12636975 to 13284143 bytes. Both legacy and split alternatives remain present in that total. The array dates/population differ from the three captured legacy rows: this measures additive coexistence occupancy, not equal-payload compression or an exact production migration.

This narrows the formerly missing legacy baseline: the current table layout, three real complete payloads, exact reconstruction, repeated-input costs and a bounded coexistence case are now measured. Full production-volume migration coexistence, retained real input-version diversity, cold reads and hosted-platform performance remain unmeasured. Supabase branch inspection on September14 returned only the default main production project; no separate hosted benchmark branch was available. No production write experiment was attempted.

Full-cohort season calculations remain extrapolated; full-season publication coverage is still required. Existing owner acceptance covers horizon, detector risk and completeness semantics. G1d and combined Story15.1 acceptance remain pending; no requirement is waived here.

## Reproduce

From nextjs-app: node scripts/benchmarks/epic-15/legacy-storage.mjs <guard-owned-container> <fresh-e15_database> <absolute-evidence-root> <fresh-absolute-output>. E15_GUARD_RESOURCE is required; the caller must verify ownership through the guard first. Retained layout uses legacy-01 inputs and sql-06 output. Regenerate this document with node scripts/benchmarks/epic-15/legacy-storage-report.mjs <evidence-root>. The report requires completion and hash-bound captures/workload inputs. Raw SQL, settings, relation totals and write observations are retained. No application runtime, migration, weather contract or production state was changed.
