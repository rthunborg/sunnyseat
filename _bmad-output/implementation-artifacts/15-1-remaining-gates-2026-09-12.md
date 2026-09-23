# Owner decision accepted — September 14, 2026

[CD15.1-v1 and A1 accepted](../planning-artifacts/decisions/epic-15-closure-acceptance-2026-09-14.md). The measurement decision lock is satisfied under the explicit timing amendment. Cold/load/actual retained-diversity proof remains mandatory at the named candidate gates; capacity admission remains held. Earlier pending disposition below is preserved history. Story15.2 is not started.

# Current closure disposition — September 14, v1

See [CD15.1-v1](../test-artifacts/measurements/epic-15/story-15-1/CLOSURE-DECISION-2026-09-14-v1.md) for the consolidated criterion/task map and single pending owner decision. The dated notes below are preserved as history. Full-cohort cost is explicitly extrapolated; hosted release proof is not automatically a measurement-story prerequisite. Cold/read-load and representative retained-diversity measurements are genuine M06 residuals requiring the explicit A1 timing amendment or new evidence. Corrected current/previous-season rollback retention exceeds the proposed 400MB ceiling under the additive legacy model. No acceptance/status change.

# Story 15.1 remaining gates — September 12, 2026

Status: working handoff after the owner's detector-risk acceptance. Story 15.1 remains in-progress; 15.2 remains blocked. This record does not amend acceptance criteria or approve operational budgets.

## Follow-up measurement update

September 14: `../test-artifacts/measurements/epic-15/story-15-1/LEGACY-STORAGE-2026-09-14.md` narrows the legacy gap with a current read-only production census, three complete actual rows, exact-value shared-input reconstruction and a bounded coexistence experiment. Stored legacy inputs total 136.56MB versus 0.687MB of series values. Synthetic 37-date repetition reduced the sampled relation footprint from 4.514MB to 0.360MB when sharing inputs. This is not a production-population migration estimate. Only the default production Supabase branch was available; hosted write/load experiments were not attempted. Production-volume coexistence, real retained-version diversity and cold/hosted performance remain open.

The subsequent authorized array investigation is complete in `../test-artifacts/measurements/epic-15/story-15-1/WORKLOADS-2026-09-12.md` and `ACCEPTED-MATRIX-2026-09-12.md`. These update the earlier remaining-work table below: all 84 synthetic detector cells now match the declared reference; 161 bounded array batches were directly timed (slowest 8.70s), the rolling/repair/edit/shared-caster/rebuild comparisons ran on specified bounded dates, venue49's full 245-date season was measured (97.71s), and local concurrent read/memory observations are retained. Full suite: 251 files /2,291 tests passed.

Still open: actual full-cohort seasonal generation, hosted/cold-cache behavior, true new/removed-caster spatial resolution, exact legacy-row replacement/coexistence, and numerical-budget/combined G1 acceptance. The new local measurements do not waive these limits. The recommendation to use arrays for this investigation was authorized; final application encoding and numerical operating limits have not been self-approved. The table and verification section below describe the earlier reconciliation and are retained as dated context.

## Accepted decisions

The September 10 owner policy and September 12 detector-risk decision control. The 5° supported horizon, reconstructed sunny windows of at least 300 seconds, independent weather gate, and full actual-year March–October coverage remain accepted. The tested five-minute base / 5-percentage-point trigger / one-minute interior probe method is accepted with its documented missed-gap risk. Preserve every detected shade gap. Missing computation or missing venue/date coverage is still an error, never shade.

The older acceptance package's pending G1b wording is historical. Its measurement results remain valid; the later decision changes the owner disposition, not those results.

## Completed evidence versus remaining work

| Area | Retained evidence | Remaining limitation or action |
|---|---|---|
| Inputs and dates | capture-01 dated real input/census; original synthetic/date/rollover lanes; run-12 and run-14 seasonal-date surveys | Dated captured geometry is not historical physical ground truth. Reconcile the accepted detector against the complete required synthetic geometry/date matrix before closing M02. |
| Accuracy and semantics | run-14: 336 venue-days; run-16: seven difficult full days with finer references; original semantic evidence; explicit September 12 risk amendment | Finite sampled references do not guarantee discovery of all shade gaps. Keep known misses and unresolved duration cases visible. |
| Computation | run-15 repeated cost across selected caster strata, CPU/wall/raw calls and heap snapshots; run-14 seasonal sample counts and growth projections | Heap snapshots are not peak-memory measurement. A full season was not timed. Complete the accepted-candidate rolling/staged/repair/import/all-invalidation workload comparison and directly time the proposed shard; do not substitute older-method timings. |
| Generation workflow | run-17: 294 venue-days, changed seating inputs, five retained copies, failed transaction rollback and idempotent retry | Local bounded workflow includes four encodings and command transport. It is not a hosted scheduler benchmark. |
| Storage | run-17 equivalent full arrays/bytes/JSONB plus lossy-point compact alternative, relation and whole-database totals, shared inputs, retained copies and changed-input WAL | Controlled JSONB is not an exact reconstruction of legacy production rows. Seasonal retention sizes are extrapolated; migration coexistence and longer-term bloat remain unmeasured. |
| Reads | run-17 serial warm reads, decoding, plans and buffers | Cold/concurrent contention and production-like query/decode latency remain unmeasured. Do not treat local command transport as API latency. |
| Capacity | capacity-02 dated Free-plan and database census | The dated database aggregate is not physical disk/WAL free space or a guarantee of future capacity. Recheck before a later generation is admitted. |
| Acceptance | G1a/G1c product decisions and G1b method/risk accepted | G1d and combined Story 15.1 acceptance remain open. Approving the recommendations below does not waive the missing measurements above. |

## Concrete recommendations for G1d owner consideration

1. Retain full adaptive arrays, raw interval boundaries and shared versioned inputs. The measured 294-row array relation occupied 655,360 bytes; its full-season linear projection is 22.94 MB for the captured 42-venue inventory, excluding separately counted shared metadata. This is an experimental representation recommendation, not a final application schema.
2. Keep the current generation plus one rollback generation. Permit a staging generation only when a fresh total-capacity projection fits. Protect referenced evidence/history explicitly in the eventual retention design; this recommendation authorizes no deletion.
3. Use provisional pilot limits of one worker, at most five venues by three dates per shard, a 60-second shard ceiling and no new venue-day after 45 seconds. Incomplete work must retry idempotently and must not publish. These limits require direct workload/platform validation; the existing 9.57-second sum is not a timed shard.
4. On the observed Free-plan capacity, warn at 375 MB aggregate database size and hold a new generation if projected aggregate usage exceeds 400 MB. Target at most 30 MB of day relations per current-inventory season, with shared input/version growth counted separately and the aggregate ceiling taking precedence. These are conservative proposed guardrails, not proven capacity guarantees.
5. Treat a 100 ms database-query-plus-decode target for a 42-venue day batch as provisional, excluding API/network time. Confirm it with a production-like benchmark before claiming compliance.

Using the September 12 capacity snapshot and linear array estimates, current plus rollback projects to approximately 371.09 MB aggregate; adding staging projects to 394.02 MB. That small staging margin is why admission must check current usage and expected growth. Neither number is a measured future database total.

## Verification of this reconciliation

Typecheck and lint passed from nextjs-app. All 297 retained manifest entries matched their byte counts and SHA256 hashes. Regenerating the September 12 acceptance package validated its dependencies and reproduced the retained file byte-for-byte in memory. No timed/database benchmarks or full test suite were rerun for this documentation-only reconciliation. The latest retained full-suite result remains 250 files / 2,287 tests; it is not a new run.

Historical reports, raw evidence and the manifest were not edited. No new automatic review, resource launch, application change, migration, production write or story/sprint transition occurred.

Sources: `../planning-artifacts/decisions/epic-15-detector-risk-acceptance-2026-09-12.md`, `../planning-artifacts/decisions/epic-15-owner-policy-2026-09-10.md`, and `../test-artifacts/measurements/epic-15/story-15-1/ACCEPTANCE-PACKAGE-2026-09-12.md` with its hash-bound run-14 through run-17 and capacity-02 dependencies.
