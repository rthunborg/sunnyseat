# Story 15.1 closure decision — 2026-09-14, v1

**Disposition: ready for one owner decision; not accepted.** Story 15.1 remains in-progress; 15.2 remains blocked. This package consolidates measurement evidence, proposes G1d, and requests the specific measurement-scope amendment below. It does not certify a deployed system or authorize runtime changes, migration, cleanup, release, or another review round.

## Decision requested

Approve **CD15.1-v1 as a whole**: the measured conclusions and limits below; full Float64 adaptive arrays and raw boundaries with shared versioned inputs; the retention floor and numerical pilot budgets; and amendment A1 transferring the explicitly unmeasured cold/retained-diversity/load proof to the implemented-candidate gates. This would close the measurement decision lock after the acceptance is recorded and living specifications are synchronized. It would **not** declare cold reads or retained capacity passing, waive publication completeness, approve deployment, or start 15.2. The canonical review gate and human story acceptance still follow separately.

No approval of G1a–G1c is requested again. If A1 is not accepted, AC5/M06 and combined G1 stay open pending the concrete unblock below. Owner response/date: **PENDING**.

## Controlling interpretation

PRD NFR20/NFR35/NFR40, architecture E15-AD-01/02, Epic 15 and its Epic 13/14 dependency amendments, the September 10 readiness report F1–F6, and test design M01–M07/G1 control. The story embeds the detailed protocol; the originally suggested `_bmad-output/test-artifacts/implementation-artifacts/` directory is absent. Historical proposals, reports and review dispositions remain evidence history.

The September 10 owner-policy decision and September 12 detector-risk decision already accept:

- Solar-centre elevation below 5° is product “not sunny,” under supported-model semantics, not proof of physical darkness. Raw geometry requires >50% sunlit seating.
- Suppress reconstructed sunny windows shorter than 300 seconds; qualifying windows start at their calculated start. No five-minute wait, state history or hysteresis. Preserve every detected shade gap and raw exposure.
- Five-minute UTC-aligned base plus supported-day endpoints; one-minute interior probes when either endpoint is within 5 percentage points of 50% or classifications differ; detected crossings refined to ≤100ms brackets. ≤2-minute detected/matched-transition and ≤10-second horizon-root targets remain.
- Untriggered sub-five-minute events can be missed, including the retained synthetic four-minute shade counterexample. Finite reference agreement is neither universal discovery nor physical-accuracy proof. Missing/exhausted computation, missing dates/inputs and unresolved 300-second uncertainty remain failures.
- Every nondeleted venue, hidden included, requires the actual selected year's March 1–October 31 dates, including past dates. Remaining dates are staging only.
- Fresh coherent `directSunState=likely` remains independently necessary. Blocked/unknown removes the recommendation. Two-hour TTL, signed ±90-minute matching and snapshot-only public reads remain unchanged.

The direct-sun/weather decision and accuracy specification's September 7/9 findings preserve these boundaries. Their API agreement and manual refresh observations do not prove physical accuracy or scheduled delivery. Epic 13 provider-cold/recovery and Epic 14 field evidence remain independent.

## Evidence to acceptance criteria

Paths below are relative to this evidence root and covered by its manifest. Reports validate their hash-bound raw dependencies. “Measured” means the stated finite experiment completed, not that every historical candidate succeeded.

| AC / lane | Exact retained evidence | Current disposition |
|---|---|---|
| AC1 / M01 | `run-03/M01-solar.json`, `M01-dst.json`, `M01-season.json`, `M01-rollover.json`; `run-12/survey.json` season date counts | Complete measurement. Roots, exact edges, all required dates, 23/25-hour DST controls and explicit November/December → 2027 requests. Legacy offset-free repeated-hour loss is retained as a finding, not patched or claimed safe. |
| AC2 / M02–03 | `run-19/matrix.json` + completion; `run-14/threshold.json`; `run-16/cadence.json` | Complete under accepted empirical detector scope: 84 synthetic cells, 336 captured venue-days, seven difficult full days against finer references. Earlier slit failures and missed-gap diagnostics remain. |
| AC3 / M01–04 | `run-03/M03-limits.json`, `M03-adversaries.json`, `M03-trigger-boundaries.json`, `M04-low-angle-deltas.json`, `M04-exact-edge-values.json`; `run-05/M04-pin-semantics.json`; run-14/16/19 comparisons; threshold/window-policy tests | Complete measurement and accepted semantic decision. Raw/filtered topology, failed candidates, >50% equality, 299/300/301s and uncertainty are distinct. No physical claim. |
| AC4 / M05 | `capture-01/inputs.json`, `census.json`; `run-15/cost.json`; `run-14/summary.json`; `run-18/workloads.json` | Representative bounded measurements complete. Full-cohort season is explicitly extrapolated, as AC4 requests. One real 245-date venue season is measured. Import is changed captured caster heights, not new/removed-caster spatial resolution. See A1 scope clarification. |
| AC5 / M06 | `run-17/pipeline.json`; `run-18/workloads.json`; `legacy-01/{census-tool.json,rows.json,census.sql}`; `sql-06/`; `capacity-02/`; derived capacity model | Measured layouts, warm reads, churn and bounded retention/coexistence complete. Controlled cold reads, actual-year retained-diversity footprint and simultaneous read/write load remain NOT RUN. Numerical budgets require owner acceptance. A1 is required to close the missing measurement portions. |
| AC6 / M07 + G1 | September 10/12 decision records; `run-03/M05-M07-projections.json`; run-18 exact 245-date result; this versioned package | G1a/G1b/G1c decisions accepted. G1d and consolidated measurement acceptance PENDING. No effective-date exemption or alternate-year values. |

Capture-01 is dated September 10: 42 total/nondeleted/public, zero hidden, zero missing seating, 1,566 distinct resolved casters. Hidden venues remain in the completeness rule despite none in this capture. This population must not silently replace a changed live inventory or the named Epic 13 regression cohort.

## Reconciliation of every previously unchecked task

Task numbers/subtasks follow the story's existing order; compound items stay unchecked where any required part is open. Historical review text is not rewritten.

| Previously unchecked item | Classification and disposition |
|---|---|
| Task 1 and inventory subtask | Completed: capture-01 provenance/census, run-19 synthetic matrix, environment/completion files. Check both. |
| Task 2 and solar/date subtask | Completed: run-03 M01 family including actual rollover control, run-12 date-dependent counts, run-19 full matrix. Check both. |
| Task 3 parent | Completed measurement; all children were checked. Accepted risk supersedes universal-discovery wording. Check parent. |
| Task 4 workload subtask and parent | Bounded workload comparison complete in run-18, full-season extrapolation explicit; check both. Real ingestion/resolution and full-cohort deployed throughput are implementation validation, not an unspoken AC4 requirement for a timed 42-venue season. Candidate 5×14 was adjustable; measured 5×3 replaces the earlier candidate, subject to G1d. |
| Task 5 census/retention/headroom subtask and parent | Genuine M06 residual: local copies/churn and dated totals exist, but actual previous-season/version diversity and operational headroom are not proven. Keep unchecked pending A1/acceptance or new evidence. Warm read subtask already explicitly says to publish blocked lanes; its checked status does not pass cold reads. |
| Task 6 owner subtask and parent | Owner decision. Pending G1d/A1; do not check merely because this package records the request. |
| Task 7 validation subtask | Type/lint and retained suite evidence exist; new verification is recorded separately. “All required M lanes” is not satisfied before A1 or missing evidence, so keep unchecked. |
| Task 7 execution/file/audit subtask and parent | Execution/file/evidence audit completed in this package and closure directory. Compound review-gate condition remains unsatisfied; keep unchecked. No canonical gate invocation now. |
| Rounds 1, 2, 3 G1a/G1b decision rows | Resolved by September 10/12 authoritative decisions; historical unchecked marks retained to preserve original disposition. They are not three new approval requests. |
| Rounds 1, 2, 3 G1c/G1d decision rows | G1c resolved; G1d pending once, consolidated here. Historical marks retained. All technical Patch items remain as recorded. No fourth review. |

## Representation and retention proposal

Select the **full arrays** variant of `representation.ts`: retain every computed adaptive exposure point, lossless Float64 exposure values and timestamp offsets, and raw interval boundaries including half-millisecond midpoint values. No integer-percent/minute rounding or removal of probes. The 300-second public eligibility is derived separately. Preserve checksum, input identity, horizon/detector/decoder versions and exact date. Reject malformed/nonfinite/unsupported/truncated forms; schema/security validation is later work. No shadow polygons are persisted.

At 294 identical measured venue-days, full array relation total was 655,360 B; bytes 737,280 B; JSONB 671,744 B. The compact-point alternative was also 671,744 B and discarded intermediate exposure values. Arrays are the best observed tradeoff, not universally smallest. Legacy rows are separately identified; the controlled JSONB alternative is not the production layout.

**Retention floor:** current generation plus one verified compatible rollback generation for each retained season; retain the current and immediately previous actual-year seasons, and all generations referenced by retained evidence/feedback. Release manifests may share unchanged generations; account distinct physical generations once. In a conservative full-rebuild model this is **four season-equivalent copies**, not two. A staging copy adds a fifth. Failed/staged rows count while present. Protected references can exceed this floor and cannot be discarded to meet a quota. No time-based deletion or deletion authorization is implied. Rollback must match committed inputs and compatible engine/decoder versions.

The earlier two-copy recommendation omitted the previous-season allocation. This package corrects that omission; it does not reduce the existing retention requirement.

## Numerical budgets proposed for G1d

All MB below are decimal 1,000,000 B. Budgets are proposed acceptance limits for a future pilot, **not measured compliance or production SLAs**. Exceeding a safety/capacity limit stops admission/publication and requires investigation; no accuracy reduction. CPU is Node user+system CPU, not PostgreSQL/child-process CPU. Wall ceilings count active sequential work including fetch/parse, calculation, encoding, storage and checks; exclude queue waiting, retry backoff and human pauses, report those separately. Retried active work counts against the same job ceiling.

| Category | Proposed limit / population and boundary | Evidence and limits |
|---|---|---|
| Initial and conservative all-invalidation season | 42 venues ×245 dates: ≤120 active wall minutes and ≤100 Node CPU minutes, one worker | Run-14 actual-date weighted calculation extrapolation 75.30 wall /75.11 CPU minutes. Run-18 array 294-day initial 128.02s; all-invalidation 127.86s. End-to-end full cohort NOT timed. |
| Single venue full-season new/edit regeneration | ≤180 active wall seconds /≤150 Node CPU seconds for 245 dates, current captured complexity envelope | Venue49 full season 97.71s wall /49.86s batch CPU, n=1; not a worst-venue season certificate. Other strata must pass candidate verification. |
| One-day repair | ≤15 active wall seconds /≤10 Node CPU seconds per venue/date | Run-18 repair 1.76s end-to-end /0.23s batch CPU, n=1. |
| Import | Same per-venue full-season limits for each affected venue; if affected set unproven use full-cohort ceiling | Run-18 changed 51 captured caster heights shared by two venues, 14 days: 6.56s wall /3.72s CPU. Spatial resolution not measured. |
| Shards / workers | One worker; ≤5 venues ×3 dates; ≤60s active shard wall /≤60s Node CPU; start no new venue-day after 45s | 161 timed local bounded batches, max 8.70s; no deadline enforcement or hosted guarantee measured. |
| Lease / retry | 120s lease, heartbeat at most 15s apart; stop on lost lease; ≤3 attempts per shard with ≤60s backoff each, then explicit failed/resumable state | Proposed operational safety design, not benchmark output. 60s hard shard ceiling leaves recovery margin. Idempotent retry/rollback measured in run-17; distributed fencing/expiry remains I04–I09. |
| Detector safety | ≤20,000 engine evaluations per venue-day; 60s shard deadline also bounds work; any exhaustion/nonfinite result or unresolved 300s uncertainty fails completion | Accepted sampler default is 20,000; failure regressions retained. No downgrade to coarse geometry or automatic shade. |
| Worker memory | ≤512 MB process RSS per active worker, including retained inputs; stop admission if exceeded | Run-18 OS process high-water RSS 263.20 MB, sampled heap 184.04 MB. Includes harness/results, excludes database. No per-shard peak guarantee. |
| Day relations | ≤30 MB per 42-venue actual-year season per distinct generation set, heap+TOAST+indexes together | Linear measured-layout estimate 22.9376 MB. Date-density and PG version may change it. |
| Shared inputs / metadata | ≤5 MB total incremental shared-input/version/release metadata across the retained 42-venue pilot; count additional protected/version growth explicitly | Run-17 measured 0.671744 MB, largely repeated inputs. 5 MB is a proposed allocation, not predicted real version diversity. Overrun requires a revised capacity plan. |
| Aggregate capacity | Warning ≥375 MB; deny generation admission if projected aggregate databases >400 MB, including legacy, all retained/staged/failed/protected data and growth | Based on dated capacity-02 Free-plan model with conservative 500 MB quota. Fresh consistent census and plan/disk/WAL headroom required before admission; no current free-space claim. |
| Batch database read + decode | p95 ≤100ms for 42 venues on one date, under warm and separately controlled cold conditions; no per-venue query fan-out | Run-17 array server EXPLAIN 0.92ms (n=1), decode p95 0.69ms (n=20). Sum is not a measured p95 of combined latency. Network/API/process startup excluded. Cold and combined p95 remain NOT RUN. |
| Decode alone | p95 ≤5ms per validated 42-venue batch; same values/validation | Run-18 warm decode p95 ≤0.50ms at 1/4/8 connections. |
| No-op | Zero shadow evaluations and zero geometry writes; ≤100ms p95 DB lookup, excluding connection startup | Run-18 observed zero recompute/write and 188.31ms command transport n=1; DB-only p95 not measured. |
| Permitted load delta | At 1 and 5 concurrent 42-venue day reads, p95 query+decode ≤100ms and ≤20% higher with one generation worker than matched no-worker baseline; 0 new errors/timeouts | Run-18 has warm read-only concurrency 1/4/8, not five clients with a writer. This target is unmeasured; requires A1/I13. It does not certify NFR19 traffic scaling. |

Repetition evidence: run-15 has two warmups and 20 measured repetitions per method/case, alternating order, not the suggested 5/30 protocol. Accepted-detector day wall p50/p95: 42 casters 154.08/159.74ms; 103 casters 439.54/453.89ms; 155 casters 735.90/765.73ms; venue49 51 casters 275.31/283.92ms. Raw data are retained; no p95 is assigned to n=1 workloads. Host lineage: Windows 10.0.26200, i9-14900KF, 32 logical CPUs, ~68.49GB RAM, Node22.23.2; source/dependency hashes and local durable PG15 settings are retained. Production census was PG17.6 ARM. The host was not reserved; local timing is not a platform guarantee.

Growth is **extrapolation using the captured mix**, not a larger measured inventory. 50/100/500 season calculation wall estimates are 89.64/179.29/896.44 minutes; CPU 89.41/178.82/894.11 minutes. Proposed corresponding active wall ceilings scale to 142.86/285.71/1428.57 minutes and Node CPU ceilings to 119.05/238.10/1190.48 minutes. These are sizing/reassessment thresholds only; growth is not admitted on the Free-plan assumption. Re-measure changed caster strata and apply aggregate capacity first. Preserve existing application cold/warm, JS, $100/month and 5× traffic requirements; these budgets do not replace them.

## Retained-capacity finding

`closure-2026-09-14-v1/derived-budgets.json` supplies reproducible arithmetic. September 14 measured **application DB 314,330,259 B**; it did not refresh the September 12 aggregate cluster census. Do not splice older auxiliary database sizes into a “current” total. The following are application-only **lower bounds** on aggregate occupancy, with the legacy table still present:

| Full season-equivalent copies | Linear layout + observed shared inputs, MB | At 30MB/copy +5MB shared allocation, MB |
|---|---:|---:|
| 2: current + rollback only | 360.88 | 379.33 |
| 3: add one previous season | 383.81 | 409.33 |
| 4: current/rollback in both retained seasons | 406.75 | 439.33 |
| 5: add staging | 429.69 | 469.33 |

**The corrected four-copy retention model does not fit the proposed 400MB ceiling even before auxiliary databases or extra protected versions.** Do not approve unconditional staging or Free-plan feasibility. Later admission requires demonstrably lower actual distinct-generation occupancy, separately authorized legacy retirement/migration, or a separately approved capacity change. The three-row shared-input experiment suggests an opportunity but cannot establish production savings. This is an explicit capacity hold, not a reason to remove previous-season/evidence retention.

## A1 — explicit measurement-scope amendment requested

Accept the completed bounded/local measurement program as sufficient to select the representation and pilot targets, with these **unpassed** measurements required before candidate acceptance/publication:

1. **M06 cold and combined latency:** carry controlled cold query+decode, repeatable combined p95, no-op DB p95 and writer-load delta to **15.5 I13**, before **15.6 O02**. Use isolated production-like PG/driver/schema; document database/shared-buffer and OS/provider cache states separately, at least 20 valid observations per stated cohort, retained plans/buffers and equal validation. A new connection, `DISCARD ALL`, or local process startup is not a cold-cache certificate. Provider-classified true cold and public API budgets also remain Epic13/I13 responsibilities.
2. **M06 retained diversity/headroom:** carry actual current/previous-year values, distinct retained input versions, evidence references, staging/failed occupancy and realistic churn to **15.2 storage validation and 15.5 I13**, with fresh aggregate capacity/disk/WAL checks at **O01/O02**. Run-17 five same-value copies and sql-06 bounded coexistence remain measurements of those narrower datasets, not actual-year retention proof. The four-copy capacity hold above must be resolved before admission; no retention reduction is requested.
3. **M05 interpretation:** accept the measured 20-repeat caster cells, one actual venue season, 161 bounded shards and weighted full-cohort estimates for this measurement story. Full-cohort end-to-end throughput and genuine new/removed-caster spatial resolution must be verified by the generator/proof stories (15.3/15.5), with the full exact-year population proven at O01/O02. This clarifies bounded measurement scope; AC4 already explicitly asks for seasonal/growth extrapolation. No full-season completeness waiver.

Items 1–2 are genuine measurement requirements in the original M06 protocol, **not already satisfied or silently relabelled implementation work**. Approval explicitly changes their timing. Item 3 prevents scope drift while retaining its limitations. None waives a failed detector bound, public parity, weather rule or a release gate.

**Why no new infrastructure experiment here:** the retained September14 branch inspection found only default production. A local guard-managed PG15 lane can be reacquired for bounded warm work, but repeating it cannot establish isolated hosted cold behavior or real previous-year/version diversity. Fully cold host-cache manipulation is not an ordinary isolated database operation, and this task forbids production writes. No resource was acquired because the remaining representative inputs/cache lane are not present in the retained evidence. The bounded work performed here instead verifies every retained hash/report and corrects the capacity/budget arithmetic.

**Unblock if A1 is declined:** provide an isolated production-like database with controllable documented cache conditions and authorized actual-year/version datasets for the retention experiment; execute only the missing M06 cold/load/retention matrix and re-present its results. Architect/Test Architect owns those measurements; Rasmus owns the scope decision and any infrastructure/capacity authorization. No provider branch purchase or production mutation is implied.

## Execution and audit

Branch `main`, HEAD `ed13d76a6e214f5e9f66ef5b73f8202f4406033d` verified before edits. Baseline typecheck/lint passed from `nextjs-app/`. All 325 original manifest entries matched byte lengths/SHA256; all four requested reports regenerated byte-for-byte in memory. Existing raw results and original dispositions remain intact. The legacy full-suite timeout at 5000ms, isolated five-test pass and 251-file/2,291-test full recheck remain retained, unchanged evidence.

This session adds offline closure arithmetic and documentation only. Exact commands and fresh verification results are in `closure-2026-09-14-v1/EXECUTION.md`; workspace preservation and manifest coverage are recorded in that directory. Prior README, audit and manifest are archived before index updates. No runtime/weather/schema/dependency/production change, commit, cleanup, managed launch, fourth review, story transition or 15.2 work occurred.
