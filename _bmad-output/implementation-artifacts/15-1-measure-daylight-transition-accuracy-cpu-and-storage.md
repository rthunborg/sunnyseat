---
baseline_commit: ed13d76a6e214f5e9f66ef5b73f8202f4406033d
---
# Story 15.1: Measure daylight, transition accuracy, CPU and storage

Status: done

Story key: `15-1-measure-daylight-transition-accuracy-cpu-and-storage`
Owner: Solution Architect and Test Architect, with Rasmus / PM decision lock.
Depends on: approved Epic 15 planning direction. Measurement execution is underway; combined G1 acceptance remains open.

## Story

As the SunnySeat maintainer,
I want reproducible daylight, transition-accuracy, CPU and total database-storage measurements for seasonal clear-sky geometry,
so that I can accept an evidenced horizon, refinement, encoding, budget and completeness policy before Story 15.2 locks the schema.

## Acceptance Criteria

The following six criteria are preserved verbatim from epics.md, Story 15.1. The protocol below decomposes them without replacing them.

1. Use the repository solar/shadow engine to report actual supported-horizon boundaries and sample counts for March 1, March 29 2026 DST, June 21, a September transition date, October 25 DST and October 31, plus a winter out-of-season control. Prove UTC/Stockholm round trips and no assumption of fixed sunrise, fixed sample count or 24-hour local days.
2. Evaluate open, courtyard, narrow-street, rooftop/elevated, irregular/holed and overlapping-caster geometries against 1-minute or exact-engine references throughout relevant daylight. Include every >50% transition, same-side endpoint intervals with short interior sun runs, and exact first/last daylight edges.
3. Report transition error, missed sun windows, additional adaptive samples, safety-limit behavior and changes from the existing 25% low-angle placeholder. Explicitly distinguish physical direct beam from the proposed >=5° supported-model convention; never count diffuse daylight as direct sun.
4. Measure p50/p95 cost by caster distribution; extrapolate real date-dependent season counts for the observed current venue inventory and 50/100/500 growth scenarios. Compare rolling, full-season and staged generation, initial and incremental time.
5. Benchmark compact arrays versus versioned bytes and existing JSONB, including total heap/TOAST/index size, shared inputs, metadata, versions, retention and headroom. Report assumptions separately from observed data; approve compute/storage/read budgets from measurements.
6. Owner accepts the measured horizon/refinement policy before schema lock. Resolve interior-window detection and new-venue remaining-date versus full-season completeness semantics per E15-AD-02. Unresolved or failed bounds require an explicit amendment, not an accuracy reduction.

## Scope and hard gate

This is a **measurement-only story**. Later execution may create reproducible benchmark tooling, fixtures, isolated experimental SQL/encoding prototypes and evidence. It must not change application runtime behavior, solar/shadow algorithms/constants, DTOs, weather classification, application schema/migrations, production data/configuration, release pointers, schedules or dependencies. Candidate policy changes stay in the benchmark harness. g2, seasonal schema, generator, invalidation, publication/rollback and API implementation belong to 15.2–15.6.

The September 9 proposal is approved decision history, including illustrative estimates. PRD NFR20/NFR35/NFR40, architecture E15-AD-01/02, Epic 15 and Epic 13/14 amendments, readiness F1–F6 and the Epic 15 test design control this brief. The proposed >=5° horizon, >=10-point trigger, <=2-minute transition bound, <=10-second roots and 5 venues ×14 dates shard are experiment candidates, not achieved guarantees.

**Story 15.2 must not start until the complete versioned G1 record has actual required measurement evidence and explicit Rasmus acceptance of G1a–G1d.** Partial acceptance, a ready-for-dev brief, passing harness tests, estimates or elapsed time do not unlock schema work. Failed/unresolved bounds require an explicit measured amendment to living specifications, never silently reduced accuracy. Complete independent measurement work before presenting concrete evidence and decision options for owner acceptance. Do not self-approve or check AC6 complete merely for submitting results.

No frontend design gate is required by the epic: no new screen, layout, animation, reference image or rebaseline. M04 still requires model-qualified Swedish visible/ARIA semantic evidence and owner acceptance; implementing UI changes or inventing copy is outside scope.

## Tasks / Subtasks

Checked subtasks record completed work only. Unchecked subtasks and owner-dependent acceptance gates remain open.

**Current owner disposition (September 12):** after the measured package and explicit four-minute missed-gap explanation, Rasmus accepted the tested candidate's documented risk. The controlling amendment is `../planning-artifacts/decisions/epic-15-detector-risk-acceptance-2026-09-12.md`: five-minute base, 5-percentage-point endpoint-proximity/classification-change trigger, one-minute interior probes, <=100ms detected-crossing brackets. Preserve detected shade gaps, but do not require or claim universal interior-gap discovery. <=2-minute detected/matched-transition and <=10-second horizon-root targets remain. This closes the owner decision on G1b method/residual risk, not all G1 verification, final encoding/retention/budgets or story acceptance. The run-11 one-second amendment proposal remains unselected. Historical review findings and measurement reports retain their original outcomes.

- [x] 1. Establish reproducible inputs and isolated lanes (AC1–6; G0; F5).
  - [x] Run typecheck/lint from nextjs-app before edits; inspect branch/HEAD/dirty state and preserve existing work.
  - [x] Inventory synthetic and authorized real inputs; record source dates/hashes, actual non-deleted/hidden/public counts and caster strata; mark unavailable lanes.
  - [x] Create an offline harness using existing pure seams, injected casters, mocked server infrastructure and attempted-network-call guards; freeze clocks, coordinate mode and numeric versions.
  - [x] Prepare an isolated benchmark DB only when needed/available; record durability/capacity/settings. No application migration.
- [x] 2. Measure solar/date/geometry oracle matrix (AC1–3; M01/M02).
  - [x] Derive venue/date 0°/5° roots, exact edges, UTC/local round trips, season exclusions and rollover; preserve date-dependent counts.
  - [x] Run full representative geometry × required-date matrix across relevant daylight with complete sun/shade interval references and edge-only cases.
  - [x] Capture independent baseline quarter-hour values, coordinate differences and analytic fixture sanity checks.
- [x] 3. Compare refinement and low-angle semantics (AC2/3/6; M03/M04; F2/F3).
  - [x] Compare endpoint-only, midpoint and interior-probe/equivalent candidates; exercise off-centre runs, equality/trigger boundaries, ties, all safety limits and non-convergence.
  - [x] Produce interval/difference ledgers, worst errors, missed/false-window durations, sample amplification and unresolved cases.
  - [x] Show old 25% versus candidate zero and exact edge outcomes with clear/blocked/unknown weather and existing Swedish/ARIA meaning; separate model support from physical beam absence.
  - [x] Survey all 42 captured venues on six season dates against an independent one-minute reference; reproduce the four short interior intervals with the unpruned engine at one second (run-12/run-13). Record the missed 60-second Posthotellet shade gap and distinguish the intentionally suppressed 29-second sunny burst.
  - [x] Implement benchmark-only five-minute base sampling with detected-transition refinement and additional interior checks near 50%; measure candidate proximity thresholds and probe cadences rather than assume a threshold guarantees continuity. Evaluate rapid exposure-change triggers if the evidence warrants them. Keep the raw >50% predicate and approved window policy unchanged.
  - [x] Compare the candidate with the same 252 captured venue-days and focused references, using matching fixture/engine hashes. Require preservation of the Posthotellet October 25 gap between qualifying windows; retain short-burst, 299/300/301-second, equality, horizon-edge, same-side endpoint and safety-limit regressions. Report raw and filtered topology separately, not just matched-boundary error.
  - [x] Check additional dates/fixtures outside the threshold-selection cases before recommending a detector. Report remaining sub-grid blind spots and unresolved cases explicitly; a successful finite survey is not proof that all unseen shade gaps are absent. Do not relabel historical endpoint-only failures as passes.
- [x] 4. Measure real-distribution CPU and generation strategy costs (AC4; M05).
  - [x] Measure the new candidate's completed base samples, additional interior probes and boundary-refinement calls separately, with paired repetitions and explicit exhaustion handling. Include the added checks in seasonal/50/100/500 projections; retain run-12's 77.8-minute estimate as historical endpoint-refinement-only evidence, not the new candidate's measured cost.
  - [x] Run paired repetitions by observed caster complexity, recording CPU/wall/memory/raw samples.
  - [x] Compare rolling/full/staged, initial/repair/edit/import/all-invalidation/no-op and candidate shards without implementing a production scheduler.
  - [x] Derive actual season counts and current-inventory results; separately label 50/100/500 growth projections and their assumptions.
- [x] 5. Measure database encoding/storage/read tradeoffs (AC5; M06).
  - [x] Reassess stored representation and total size if adaptive samples are persisted; distinguish computation probes from stored samples/intervals. Keep run-12/sql-05 storage extrapolations separate from measured database totals and verified hosting headroom. Capacity plausibility does not close the production budget gate.
  - [x] Compare identical measured datasets in isolated JSONB/arrays/versioned bytes with equal precision/validation.
  - [x] Measure complete relation census, shared inputs, metadata, retention and headroom after clean load and churn.
  - [x] Measure decode/batch reads, plans/buffers, representative write/WAL cost and malformed rejection; publish limitations and blocked lanes.
- [x] 6. Resolve completeness and owner decision lock (AC6 using AC1–5; M07; G1).
  - [x] Benchmark full-season new venue versus remaining-date staging; show exact missing historical dates and denominator effects.
  - [x] Assemble versioned evidence, failures/limitations and proposed numerical policy, encoding and compute/storage/read budgets.
  - [x] Obtain explicit Rasmus acceptance of all G1a–G1d or record pending/rejected decisions and measured amendment requests. Synchronize living specs only for explicitly accepted amendments; preserve history.
- [x] 7. Verify deliverables and hand off (AC1–6).
  - [x] Run harness validation, all required M lanes, normal typecheck/lint/Vitest; record exact commands/results and confirm no runtime/application migration diff.
  - [x] Complete execution record, actual File List, evidence links and audit. Invoke the canonical review gate only after every AC/task, including G1, is satisfied; human approval moves review to done.

### Review Findings

#### Round 1 — 2026-09-10 — review only

No prior review rounds were recorded. This is the first automatic round under `.agents/skills/review-round-guard/SKILL.md`. No fixes or status transitions were applied. Findings below are action items, not owner acceptance.

Decisions requiring Rasmus approval:

- [ ] [Review][Decision] G1a/G1b: accept a model-qualified horizon/semantic policy and resolve the failed interior-window detection claim through a better measured method or an explicit specification amendment. The engine-backed minute policy misses 27/21/14-second windows; a supported-model negative below 5 degrees does not establish physical beam absence. Existing Swedish negative semantics require explicit consideration. Partial acceptance does not unlock Story 15.2.
- [ ] [Review][Decision] G1c/G1d: decide full-season versus explicitly amended effective-date completeness, then approve encoding and numerical budgets only after required representative compute/storage/read evidence exists. Current synthetic results cannot establish production budgets. All G1 signatures remain pending.

Technical findings:

- [x] [Review][Patch][P2] R1-01 — Interval scoring can pass a completely missed shade run. `nextjs-app/scripts/benchmarks/epic-15/summarize.mjs:18` ignores splits/merges and duration mismatch; `measurement.ts:151` also admits merged runs to supposedly matched boundary errors. Reproduced reference sun [0,30000), shade [30000,60000), sun [60000,90000), candidate all-sun: falseMs=30000, merges=1, maxErrorMs=60000, yet PASS_AGAINST_DECLARED_REFERENCE_ONLY. Require transition-topology agreement and mutually one-to-one boundary matching; make duration tolerances explicit without silently waiving missing transitions. The current 70-cell matrix has no splits/merges, so this is a scorer blind spot rather than a demonstrated change to its recorded numbers. AC2/3.
- [x] [Review][Patch][P2] R1-02 — Interrupted strategy runs can become complete-looking cost evidence. `nextjs-app/scripts/benchmarks/epic-15/strategy.measurement.ts:32` writes the final artifact after each fixture, before final success; a later error leaves an ordinary MEASURED artifact. `summarize.mjs:45` aggregates any record subset as ten fixtures and line 52 scales it using a fixed denominator of ten. Publish a success artifact only after validation, and reject missing/duplicate fixture-strategy cells and failed attempt guards before reporting totals or projections. The retained run has all 40 records; this concerns rerun failure handling. AC4/reproducibility.
- [x] [Review][Patch][P2] R1-03 — Storage churn omits logical edits and their WAL/write cost. `nextjs-app/scripts/benchmarks/epic-15/storage.mjs:80` changes only checksum=checksum and payload=payload/exposure=exposure. It does not create changed input versions or changed retained generation payloads. WAL measurement at lines 64–67 precedes churn entirely. Label the current result as no-op-update overhead, add representative changed-payload/input/generation retention workloads, and separately measure their write/WAL cost before using the experiment to support encoding/headroom decisions. Current relation totals remain observations of the narrower workload. AC5.
- [x] [Review][Patch][P2] R1-04 — Rollover evidence is overstated. `nextjs-app/scripts/benchmarks/epic-15/run.measurement.ts:54` evaluates a standalone 2027-03-01 solar date, while `RESULTS.md:21` calls it a retained rollover control. Add the specified November/December 2026 request with explicit season_year=2027, expected full date keys/exclusions, and record its assertions; until then label this only a next-year solar-date control. AC1/M01.
- [x] [Review][Patch][P2] R1-05 — Exhausted runs report negative adaptive sample counts. `nextjs-app/scripts/benchmarks/epic-15/measurement.ts:87` subtracts the entire planned base grid from completed values. Published M03-limits.json contains additionalSamples=-1/-2 for sample/time exhaustion. Track completed base and additional probes separately, retaining incomplete-grid status instead of an impossible negative count. The existing verified=false failure handling is correct. AC3.

Already disclosed acceptance gaps: actual non-deleted/hidden/public inventory and representative caster strata; adaptive full-season/end-to-end/shard/concurrency cost; actual existing JSONB/database baseline; retained growth/headroom and controlled read/load measurements. The report does not falsely claim these passed. Equal synthetic mixtures, coarse-grid seasonal totals, n=1 strategy observations, extreme slit fixtures, and minute/second reference discovery limits cannot replace these lanes. AC1–6/G1 remain incomplete.

Verification during review: typecheck (`npx tsc --noEmit --incremental false`), lint (`npx eslint . --quiet`), and targeted benchmark tests (3 files/8 tests) passed from nextjs-app. E15_OUTPUT was unset for the tests so existing evidence was not overwritten. All 55 evidence-manifest hashes matched. A read-only scorer reproduction confirmed R1-01. The full-suite 239-file/2,238-test pass is execution evidence, not a new review rerun. Database and timed measurement jobs were not restarted. Diff inspection against ed13d76a6e214f5e9f66ef5b73f8202f4406033d found no runtime, weather-contract, package, Compose, or application-schema changes in the reviewed scope. This review made no production calls or changes. Only this review record was added; sprint status and raw evidence were left unchanged.

#### Round 2 — 2026-09-10 — follow-up, review only

One prior round was recorded; this is Round 2 under `.agents/skills/review-round-guard/SKILL.md`. The next automatic round is the final round before human triage. R1-01 through R1-05 have implementation/test support; no original finding is reopened as unchanged. No fixes, acceptance, or status transitions were applied in this pass.

Decisions requiring Rasmus approval:

- [ ] [Review][Decision] G1a/G1b remain pending: accept explicitly model-qualified 5-degree horizon/presentation semantics and resolve the demonstrated interior-window detection failure through a better measured method or an explicit specification amendment. A negative supported-model result is not physical beam absence; minute probing still misses 27/21/14-second engine-backed windows. Do not waive discovery merely because matched boundary errors are small.
- [ ] [Review][Decision] G1c/G1d remain pending: accept full-season completeness or an explicit effective-date amendment, then approve encoding and numerical compute/storage/read budgets after the required representative evidence exists. Equal synthetic mixtures, coarse-grid n=1 strategy timing and a small retained SQL matrix cannot establish those budgets. Partial acceptance does not unlock 15.2.

Technical findings:

- [x] [Review][Patch][P2] R2-01 — Validate successful main and edge evidence before generating the report. `nextjs-app/scripts/benchmarks/epic-15/summarize.mjs:9`–19 checks strategy completion and the SQL summary, but never reads the main `completion.json`; it also lacks successful edge-lane completion/attempt evidence. `run.measurement.ts:165` asserts zero attempted calls only after writing the report-consumed raw files; `edges.measurement.ts:44`–54 writes both outputs before its final guard assertion. A late failure therefore leaves enough files for a successful-looking report. An in-memory reproduction made completion.json unavailable and the summarizer still generated RESULTS.md. Require successful, zero-attempt completion and expected artifact/cell coverage for each claimed lane before writing derived outputs; publish final edge evidence only after validation. Current run-03 records zero attempts and matches its manifest, so this is a rerun integrity defect, not a claim that the retained run failed. AC1–3/5 and reproducibility.
- [x] [Review][Patch][P2] R2-02 — Add an elevated fixture that actually receives caster shadows. `nextjs-app/test/fixtures/epic-15/geometries.ts:20` uses 15 m walls at ground Z=0 with seating elevation=10 m and venue ground Z=8 m. Every effective caster height is 15−10+(0−8)=−3 m and is skipped by `nextjs-app/lib/solar/shadow-calculation-service.ts:238`–239. All seven rooftop-terrain oracle cells are consequently 100% sun with one interval; `test/unit/benchmarks/epic-15/fixtures.test.ts:11` only checks the all-sun control. Preserve that exclusion control, but add rooftop/terrain cases with surviving effective heights >=3 m and real sun/shade transitions, then run the required-date oracle/candidate matrix. The current fixture does not establish elevated-shadow transition accuracy or representative elevated CPU cost. AC2/4.

Acceptance evidence assessment: the report candidly leaves actual non-deleted/hidden/public inventory, observed caster strata, adaptive full-season/shard/end-to-end cost, actual existing JSONB/database baseline, retained growth/headroom and controlled reads/load incomplete. Total relation accounting includes heap/TOAST/index overhead without double-counting diagnostic columns; the R1 edit experiment retains 350 old and 70 new rows with 36 changed day checksums and 20 inputs per encoding. These narrower observations do not close AC4/5 or G1. The offset-free autumn helper limitation is pre-existing and disclosed; no runtime repair is part of this review.

Verification: typecheck (`npx tsc --noEmit --incremental false`), lint (`npx eslint . --quiet`), targeted benchmark tests (4 files / 13 tests), and full Vitest (240 files / 2,243 tests) all passed from nextjs-app. E15_OUTPUT was unset for tests. All 108 evidence-manifest hashes, run-03 source hashes and final tooling hashes matched. In-memory report regeneration reproduced RESULTS.md and all three derived outputs exactly without writing them. Database/timed benchmark jobs were not restarted. Diff inspection against baseline ed13d76a6e214f5e9f66ef5b73f8202f4406033d found no runtime, weather-contract, package, Compose or application-schema changes in scope. This pass made no production calls or changes; only this review record was added. Story/sprint status and evidence remain unchanged.

#### Round 3 — 2026-09-10 — final automatic round, review only

Two prior rounds were recorded; this is the final automatic round under `.agents/skills/review-round-guard/SKILL.md`. Further automated review requires human triage or an explicit cap override. R2-01/R2-02 have implementation and test support; their original defects are not reopened. No fixes, owner acceptance or story/sprint status transitions were applied.

Decisions requiring Rasmus approval:

- [ ] [Review][Decision] G1a/G1b remain pending: accept model-qualified horizon/presentation semantics and resolve the demonstrated interior-window detection failure through a better measured method or an explicit specification amendment. Minute probing still misses 27/21/14-second engine-backed windows; matched boundary error does not prove discovery. Unsupported results below 5 degrees do not establish physical beam absence.
- [ ] [Review][Decision] G1c/G1d remain pending: accept full-season completeness or an explicit effective-date amendment, then approve encoding and numerical compute/storage/read budgets after the required representative evidence exists. Partial acceptance does not unlock Story 15.2.

Technical findings:

- [x] [Review][Patch][P2] R3-01 — Gate the semantic evidence cited by the report. `nextjs-app/scripts/benchmarks/epic-15/evidence.mjs:19` excludes M04-pin-semantics.json, while `summarize.mjs:66` reports its presentation conclusions without reading it; `test/unit/benchmarks/epic-15/semantics.test.tsx:29` writes it only when E15_OUTPUT is set. In-memory report execution with that artifact unavailable still produced all four derived outputs and never attempted to read it. Require successful, hash-bound semantic evidence with the expected nine percentage/weather cells and consume its results before making those claims. The retained artifact exists and matches the manifest; this is a rerun integrity defect, not a demonstrated error in current Swedish evidence. AC3/M04 and reproducibility.
- [x] [Review][Patch][P2] R3-02 — Bind strategy measurements to actual fixture and engine inputs. `nextjs-app/scripts/benchmarks/epic-15/strategy.measurement.ts:36` publishes timing rows without fixture/source hashes; `evidence.mjs:33` validates IDs and counts, and `summarize.mjs:25` checks against main-run IDs rather than input contents. A separate strategy invocation after a caster/elevation edit retaining fixture IDs can therefore be combined with older main geometry evidence and used for growth projections. Read-only reproduction changed every caster height by +100 m in the expected fixture set and the retained strategy evidence still validated. Record measured fixture content and engine/source identities and verify them against the selected main lane before aggregation. Current recorded source hashes match; no actual mismatch in run-04 is alleged. AC4 and reproducibility.

Acceptance evidence remains incomplete as disclosed: current non-deleted/hidden/public inventory and observed caster strata; adaptive/full-season/shard/concurrency/invalidation/end-to-end costs; actual existing JSONB/database baseline; growth retention/headroom and controlled cold/read/load measurements. Equal synthetic mixture projections, n=1 seasonal timings and local SQL relation totals cannot replace these lanes. SQL totals account for heap/TOAST/index overhead without double-counting diagnostic columns; workload limitations remain explicit. Supplemental elevated fixtures have surviving casters and transitions across all 14 cells, but do not establish population representativeness.

Verification: typecheck (`npx tsc --noEmit --incremental false`), lint (`npx eslint . --quiet`) and targeted benchmark tests (4 files / 16 tests) passed from nextjs-app. E15_OUTPUT was unset for tests. All 152 evidence-manifest hashes and run-04 source hashes matched; RESULTS.md and all three derived files reproduced byte-for-byte in memory with writes intercepted. The two reproductions above were also in-memory/read-only. Full Vitest's 240-file / 2,246-test pass is prior execution evidence, not a new review rerun. No database or timed measurement jobs were restarted. Reviewed changes against baseline ed13d76a6e214f5e9f66ef5b73f8202f4406033d contain no application runtime, weather-contract, dependency, Compose or application-schema changes. This review made no production calls or changes. Only this review record was added; raw evidence and story/sprint status remain unchanged.

#### Round 4 — 2026-09-14 — explicit owner override, review only

Rasmus explicitly authorized this fourth round in the current task: "I authorize a fourth round". This overrides the three-round cap for this round only. No actionable findings remain after primary review and independent blind, edge-case and acceptance review triage. No fixes or story/sprint status transitions were applied; human story acceptance remains separate.

Reviewed the measurement-only additions against baseline `ed13d76a6e214f5e9f66ef5b73f8202f4406033d`, with emphasis on the selected detector, window filtering, representation, input identity, bounded workloads, report validation and accepted closure handoff. Independent blind review was scoped to the threshold sampler. The September 10/12 decisions and September 14 CD15.1-v1/A1 acceptance control: known sub-grid discovery limits are accepted risk, and cold/combined-read, writer-load and actual-year retained-diversity measurements remain unpassed mandatory later gates. Their I13/O02 and story-AC mappings exist in the test design. Historical pending statements and explicitly superseded candidates were not reopened as defects. Candidate findings concerning sampling blind spots, older defaults and historical report source validation were dismissed after checking those boundaries; no current source mismatch was found.

Fresh verification from `nextjs-app/`: `npx tsc --noEmit --incremental false` passed; `npx eslint . --quiet` passed; `npx vitest run` passed **251 files / 2,291 tests**. `E15_OUTPUT` was unset to protect retained evidence. `node scripts/benchmarks/epic-15/closure-evidence.mjs ../_bmad-output/test-artifacts/measurements/epic-15/story-15-1` passed all **343** manifest byte-length/SHA256 checks and reproduced the four acceptance/workload/matrix/legacy-storage reports byte-for-byte. All 77 declared source hashes across run-14, run-15, run-17, run-18, run-19 and sql-06 match the current source files. The accepted package hash matches the owner record.

No timed geometry/database measurements, production calls, managed resources, E2E or visual runs were initiated. E2E/visual gates are not applicable to this measurement-only scope. Runtime/schema/dependency files remain unchanged in the reviewed diff. This review adds only this record; raw evidence, acceptance history and sprint status remain unchanged. Story 15.1 remains `review`; 15.2 remains `backlog`. Capacity admission is still held, and passing this review does not certify deployed budget compliance or waive the carried gates.

## Dev Notes

### Existing seams and implementation traps

Paths below are repository-relative. Application commands run from `C:\DEV\sunnyseat\nextjs-app\`.

| Existing source — read/reuse only | Current state and measurement implication |
| --- | --- |
| `nextjs-app/lib/solar/solar-calculation-service.ts` | calculateSolarPosition(Date, latitude, longitude) returns corrected elevation; visibility >0°. getSunTimes uses -0.833°, neither required boundary. Solve benchmark 0°/5° roots on UTC instants with the solar function. |
| `nextjs-app/lib/solar/shadow-calculation-service.ts` | calculateVenueShadowFromBuildings and its timeline sibling accept injected casters without I/O, but module imports server infrastructure: mock before import. Avoid fetching wrappers. Current pure shadow entrypoints use Gothenburg-default solar coordinates; label that baseline separately from venue-coordinate candidates. |
| `nextjs-app/lib/solar/shadow-geometry.ts` | Existing 200 m shadow cap, 3 m meaningful-height threshold, 5° reliable floor and polygon primitives. Disclose limits; no long-shadow model, terrain skyline or observer-height dip. |
| `nextjs-app/lib/solar/timezone-utils.ts`, `nextjs-app/lib/utils/time-planner.ts` | Stockholm conversions/date/planner rules; retain public 61 points, 06:00–21:00 and today→today+3. |
| `nextjs-app/lib/services/sun-geometry-precompute.ts` | Rolling today→today+4 and fixed ungated planner series baseline. Reuse calculation semantics, never production publishing runner/maintenance script. |
| `nextjs-app/lib/services/sun-geometry-hash.ts`, `sun-geometry-coordinates.ts`, `sun-geometry-repository.ts` in that directory | g1, canonical coordinates and exact-date persisted read baseline. No g2/repository edits. input_payload column existence does not prove historical contents were retained. |
| `nextjs-app/test/unit/shadow-calculation-service.test.ts`, `nextjs-app/test/unit/services/sun-geometry-precompute.atdd.test.ts`, `nextjs-app/test/setup/setup.ts` | Existing mock/injection and Met.no-blocking patterns. Count attempted calls: provider code can swallow fetch failures. |
| `nextjs-app/package.json`, `nextjs-app/package-lock.json`, `nextjs-app/vitest.config.ts` | Use installed tooling and record locked versions, including Turf and timezone/runtime dependencies; no upgrades/install required. |

Venue-coordinate candidate adaptation belongs only in experimental injection/mocking code using existing geometry primitives. Freeze fixture, engine and instant. Separate three causes of differences: city-versus-venue coordinates; horizon convention versus old 25% placeholder; sampling/encoding versus matched engine oracle. Independent synthetic analytic checks sanity-check shapes. Exact-engine comparisons establish model parity, not field accuracy. No existing runtime UPDATE file is authorized.

The precompute helper's no-input defaultClearSkyShape is synthetic: always supply the explicit injected engine calculation for measurement; never label that default as real baseline geometry. Historical ATDD comments/skips are not current passes. The accuracy spec records an earlier chip-filter retry, 51 existing E2E skips and a full-concurrency unit timeout; these are historical limitations, not waivers or fresh outcomes.

Measurement traceability: AC1→M01; AC2→M02/M03; AC3→M01–M04; AC4→M05; AC5→M06; AC6→M03/M04/M07 and G1. Test-design risk mappings: M01→R-02/R-06; M02→R-01; M03→R-01/R-08; M04→R-02; M05/M06→R-08/R-14; M07→R-01/R-02/R-03. Readiness F1 is the combined lock, F2 semantics, F3 detection, F4 completeness, F5 reproducibility/data availability and F6 independent tracking.

### Full daylight/DST/transition matrix — M01–M04

Run the **full representative geometry × required-date matrix**, plus real inventory strata; do not cherry-pick triggered intervals or cheap cases.

| Dimension | Required cases and evidence |
| --- | --- |
| Dates | 2026-03-01; 2026-03-29 spring DST; 2026-06-21 solstice; **2026-09-22** chosen September transition; 2026-10-25 autumn DST; 2026-10-31; 2026-12-21 winter model-only control. Add 2026-02-28/2026-11-01 exclusions and explicit next-year rollover fixture, e.g. season_year=2027 requested in November/December 2026. No winter picker expansion. |
| DST | Derive/assert spring local day 2026-03-28T23:00Z→2026-03-29T22:00Z (23h); autumn 2026-10-24T22:00Z→2026-10-25T23:00Z (25h). Both UTC-transition sides; nonexistent spring 02:30; repeated autumn 02:30 distinguished by UTC/offset. No duplicate date keys or fixed-24-hour iteration. |
| Solar edges | Corrected-centre 0° and 5° rising/setting per actual date/location. Before/exact/after, root brackets/residuals, supported/low-angle duration. <=10-second uncertainty is a proposed target. Exact UTC boundary records, no inward quarter-hour rounding; first/last edge-only intervals with no regular sample. >0° visibility and >=5° support are separate. |
| Coordinates/elevations | Gothenburg baseline and actual representative engine coordinates. Identical coordinates with varied seating/ground elevations: caster math may change, event time must not. Name unsupported terrain skyline/observer dip. |
| Seating | Open/no caster, fully shaded control, courtyard, narrow street/slit, rooftop/elevated terrain delta, concave/irregular, polygon hole, tiny valid seating and distinct azimuth orientations. |
| Casters | Observed sparse/typical/dense sets; overlaps/duplicates without double shade; tall distant caster near cap; effective height near zero/3 m minimum; radius just inside/exact/outside; eligible versus quarantined/inactive. Null/unavailable is not a valid empty caster set. |
| Interior transitions | Every >50% crossing; low same-side endpoints hiding sun; high same-side endpoints hiding shade; several crossings and exact 50% equality. Include 0% at 12:00/12:15 with >50% at 12:06–12:09, plus an off-centre run that evades a midpoint. |
| Refinement failures | Endpoint-only versus midpoint versus interior-probe/equivalent; <10/=10/>10 percentage-point deltas; crossing/field-sensitive triggers; nearest-sample ties; recursion/sample/time limits and solver non-convergence. Safety-limited undecidable intervals never become verified. |
| Independence | Vary opening hours/picker bounds without changing daylight generation. Derive base/adaptive/exact-edge counts per venue/date. 245 season dates do not imply fixed daylight sample counts. |
| Low-angle semantics | Every old 25%→candidate zero difference, exact first/last interval and clear/blocked/unknown weather examples of existing visible/ARIA outcomes. A supported-model negative at 0–5° does not prove physical absence of beam; diffuse brightness never counts as direct sun. |

M01 records time keys, UTC/local round trips, both roots, durations and sample counts. M02 evaluates complete relevant daylight at one-minute spacing plus exact edges, with off-grid sub-minute/exact-engine bracketing for seeded narrow runs. Compare complete ordered sun AND shade intervals, not only candidate-discovered brackets. M03 compares detection/refinement strategies and failure semantics. M04 records low-angle value/presentation deltas for human model-qualified semantic review.

For each reference/candidate run record start/end, matching relation, signed/absolute transition error distribution and maximum, missed-run count/total/max duration, false-run count/duration, splits/merges, ordinary quarter-hour differences, additional samples/amplification and safety-limit failures. Each delta carries venue/date/instant/hash/coordinate-mode/engine/policy/reason. Preserve actual existing quarter-hour outputs independently of candidate expectations. Averages must not hide worst-case failures.

Reference limits are explicit: a one-minute grid can miss sub-minute events; bisection refines detected brackets but cannot discover unbracketed runs. Finite probes cannot guarantee arbitrary-duration detection. Record reference resolution/residual uncertainty. Temporal resolution is not physical accuracy.

### Real caster-distribution CPU protocol — M05

Inventory actual non-deleted venues including hidden separately from the named 42-public-venue regression cohort. Capture authorized current seating/caster/elevation/eligibility/import inputs with provenance/hash. Report count, vertices, holes, overlap, elevation/height and spatial strata; copies of one cheap venue are not representative growth.

Use paired repetitions, fixed seed/order rotation. Proposed starting protocol: >=5 untimed warmups then 30 measured repetitions per bounded cost cell. Publish raw n/p50/p95/max, failures/exclusions; increase n for unstable tails. Full-season runs may be fewer: disclose actual n and do not manufacture a meaningful p95 from inadequate observations.

Measure per sample/day/shard/end-to-end CPU, wall time, peak memory, warmup/retry overhead by observed caster complexity. Compare rolling five-date, full-season and staged builds; initial build, one-day repair, one-venue edit, local caster import, conservative all-venue invalidation and unchanged-season no-op. Evaluate candidate 5×14 shard and measured bounded concurrency; distinguish CPU totals, serial elapsed and concurrent elapsed. This is experiment orchestration, not an implemented resumable service.

Report measured current-inventory runs separately from 50/100/500 growth extrapolations. Sum actual date-dependent sample counts weighted by observed strata/adaptive amplification. Never scale one summer day or 61 points across all dates. Declare assumptions, uncertainty and missing strata; estimates cannot replace required representative measurements.

### Total database storage, encoding and reads — M06

Compare identified current JSONB baseline, compact aligned arrays and versioned bytes on identical measured datasets/rows/precision/metadata/validation. Prototypes stay benchmark-only. Include malformed/truncated/version-mismatched encodings and shape/range/offset rejection. No weaker validation or accuracy for smaller payloads; no persisted intermediate/unioned shadow polygons.

Publish a consistent-time database census and exact SQL used (including pg_total_relation_size, pg_indexes_size and payload diagnostics):

- Heap, TOAST including its index, table indexes; explain accounting so indexes included in total relation size are not double-counted.
- Shared canonical inputs once per generation; season/generation/release/checksum/decoder/version metadata.
- Current and previous season, >=2 verified releases and their generations, staged/failed builds, evidence-protected generations and operational headroom.
- Existing baseline database bytes separately from incremental E15 bytes; full retained footprint, not serialized JSON/byte-array length alone.
- Clean load and realistic edit/retry/retention churn; row/sample/input-size distributions, query plans/buffers, index utility, cold/warm decode/bounded batch/read latency, and representative write/WAL cost.

Record DB/PostGIS version, durability/cache state, capacity/page/compression/index settings and environment. compose.test.yaml uses 512 MB tmpfs and disables fsync/full-page-writes/synchronous-commit: it cannot certify durable production writes/recovery or 500-venue retained-season capacity. Use a representative isolated durable lane where available, otherwise mark those measurements BLOCKED. SQL experiments are confined to the separately prepared isolated benchmark database, never application migrations or production mutation.

### Unavailable representative data

September 10 handoff states historical full geometry input payloads are unavailable. A migration/column named input_payload does not prove retained contents. Identify the actual baseline and newly captured reproducible authorized inputs; do not claim unsupported historical replay.

If real inputs, a required caster stratum, baseline contents or a representative isolated DB are unavailable, record source/capability, affected AC/M lane/decision, safe attempts, responsible owner and unblock requirement. Continue independent pure solar/synthetic geometry work. Do not fabricate casters, turn missing data into [], invent storage sizes, silently narrow the matrix or pass extrapolations as observations. Synthetic lanes cannot certify real-inventory cost. Missing required lanes prevent full AC completion and G1 even if other experiments pass.

Use PASS, FAIL, BLOCKED, NOT RUN and EXTRAPOLATED distinctly. A failed candidate is valid experimental evidence, not an achieved bound. Keep correctness failures as lane failures; exclude invalid samples from latency statistics with counts/reasons visible. No implicit production diagnostics, maintenance/refresh or provider fallback.

### Evidence package and reproducibility

Future proposed output directory: `_bmad-output/test-artifacts/measurements/epic-15/story-15-1/` (not evidence already created).

| Deliverable | Required content |
| --- | --- |
| Environment/command README | Exact verified commands after tooling exists; HEAD and relevant dirty-source hashes; CPU/RAM/OS/Node, numeric dependency/timezone/runtime versions; DB settings/capacity/cache; seed/order/repetitions/warmups, measurement boundaries and resource disposition. |
| Fixture manifest | Synthetic/observed provenance, source/capture date, authorized origin, checksums, venue inventory/caster strata, coordinate mode, engine/input IDs, exclusions/unavailable sources; no secrets or unrelated personal data. |
| Raw solar/interval/CPU/SQL evidence | Individually identified M01–M07 variants; all failures/n; UTC/local keys, roots/counts, full intervals, complete relation accounting and read timings. |
| Difference/evidence ledger | Scenario/AC/risk IDs, baseline/candidate revisions, fixture hash, season/venue/date/UTC, generation/input/engine/horizon/encoding/decoder identifiers (honest candidate/not-defined labels), expected/actual, raw path/checksum, command/environment, result, limits, reviewer and failure reproduction/owner. |
| Results and decision record | Observed versus extrapolated columns; reference limits/blocked lanes; proposed numerical budgets with units/workload/environment; G1a–G1d signatures/date/evidence references and explicit amendments. |

Do not invent runnable benchmark commands before creating/verifying tooling. No measurement package exists yet. HEAD alone is insufficient provenance in this dirty checkout.

### Combined owner lock — M07 / G1

| Gate | Concrete evidence Rasmus must accept before 15.2 |
| --- | --- |
| G1a — horizon/presentation | Measured 0°/5° roots, low-angle duration, 25% deltas, exact edge inclusion and Swedish/ARIA examples; accept supported-model meaning, not physical darkness. If existing UX cannot express it honestly, request explicit living-UX amendment before later reads. |
| G1b — detection/refinement | Validated interior-probe/equivalent, precision/supported transition claim, missed/false windows, worst errors, sample cost and safe recursion/sample/time-limit/non-convergence semantics. No endpoint-only or single-midpoint guarantee. |
| G1c — completeness | Full March–October for every published non-deleted venue including hidden OR explicit accepted effective-date applicability. Alternative defines exact denominator, pre-effective-date reads, historical replay/feedback attribution, edits/deletions/rollover and synchronized living PRD/architecture/story wording. Until accepted, remaining dates are staging only. |
| G1d — encoding/budgets | Measured JSONB/arrays/bytes; initial/repair/all-invalidation CPU/wall ceilings, shard/lease/safety settings, total retained DB bytes/headroom, decode/batch/read ceilings and permitted load deltas. Units/workload/environment/cache/concurrency and approving owner explicit; final values UNKNOWN pending acceptance. |

M07 benchmarks full-season new venue versus remaining-date staging and demonstrates missing historical dates against the 100% full-season denominator. Full-season remains the safe publication interpretation until an effective-date amendment is accepted. Approval references the complete versioned package; unresolved evidence or unsafe claims keep 15.2 blocked. Measurement completion and G1 approval are distinct; neither is granted by story creation.

### Preserved contracts and dependencies

- Geometric percentage is clear-sky potential, not probability. Public affirmative requires geometry >50% plus coherent directSunState=likely. Missing/stale/malformed/incomplete/unmatched/legacy/contradictory weather never becomes clear; diffuse light never means direct beam. Preserve exact two-hour TTL, signed ±90-minute provider time and zero live Met.no/request geometry/caster/hash computation. Geometry coverage typed 503 is distinct from unknown weather and deterministic unsupported-model coverage.
- Preserve today→today+3, 06:00–21:00, 61 ordered public steps, zero-fetch same-date scrub, API/component boundaries, Swedish-first/WCAG/reduced-motion and existing approximately five-second cold, warm <200 ms and 600/280/320 KB gzipped JS budgets. Local timing is not provider-classified cold proof.
- Preserve server bookmark-validation window opt-out; do not add server today+3 rejection. NFR18 (<=10,000 MAU within $100/month) and NFR19 (5× baseline traffic) remain constraints; storage bytes alone do not prove operating cost, and arbitrary load counts do not replace a declared concurrency baseline.
- 13.1 remains independent with its 42 unique public venues ×61 cohort, cold n>=20, restore and scheduler evidence. Inventory changes need explicit cohort treatment; later replacement reads need fresh bounded telemetry proof rather than inherited old-path certification.
- 14.3 field low-angle/transition evidence needs generation/input hash; corrections invalidate seasonal evidence. 14.5 versions geometry/weather/classifier independently and protects retained references. 14.6 final launch follows 15.5/deployed compatible candidate; preparation may proceed earlier. Missing Epic 14 sprint entries or done classifier spec do not imply field completion; PM tracking reconciliation is separate (F6).
- Latest recorded September 9 production: 42 blocked, no weather-unavailable reasons and list/detail agreement after canonical-coordinate correction. API consistency is not terrace ground truth. Scheduled failures 01:16/05:01/09:33 UTC and manual refresh success do not establish weather reliability. September 10 diagnostics notes describe prerequisites/limitations, not newly deployed capability. No live state is rechecked here.
- Later rollout requires separate authorization, compatible coverage/parity/rollback and >=7 days AND one real invalidation before geometry schedule retirement. Preserve current/previous season, >=2 verified releases and evidence-referenced generations; rollback must match committed inputs/engine/decoder without input/weather rollback. No such implementation here. Epic 12 stays closed; weather reliability and field accuracy remain independent launch gates.

### File impact

Context creation: NEW this story and audit; minimal UPDATE sprint-status.yaml preparation entries after audit, preserving existing comments/changes/statuses. No application file edits.

Later measurement execution (proposed new paths, not existing outputs):

- NEW benchmark helpers under `nextjs-app/scripts/benchmarks/epic-15/`, including experimental SQL isolated from migrations/runtime imports.
- NEW harness tests under `nextjs-app/test/unit/benchmarks/epic-15/` and permitted fixtures under `nextjs-app/test/fixtures/epic-15/`; bulky/sensitive authorized inputs remain local ignored evidence with provenance and no credentials.
- NEW measurement package in the directory above; UPDATE this execution record/File List and normal workflow state. Explicit owner-accepted amendments may narrowly update living specs, never historical proposal/readiness/evidence.
- Existing runtime/migrations/packages/Compose are READ ONLY. No unrelated repair, fixture overwrite or runtime refactor; surface constraints requiring wider scope.

Preserve especially `.codex/config.toml`, `_bmad-output/party-mode/`, and `nextjs-app/test/unit/services/direct-sun-documentation-contract.test.ts`. No reset/revert/clean/commit/push/merge/deploy authorized.

### Test gate and lifecycle

At future story start run `npx tsc --noEmit` and `npx eslint . --quiet` from nextjs-app; unrelated failures stop edits, never suppress them. At review rerun both plus `npx vitest run`, meaningful harness validation and every required M01–M07 evidence lane. Unit green cannot replace CPU/SQL/semantic measurements or G1. Targeted component fixtures may support M04; no new full E2E/visual screen gate for this unchanged-UI measurement story.

Only after all ACs/tasks including G1, from repo root use `./scripts/run-sh.ps1 scripts/story-review.sh 15-1-measure-daylight-transition-accuracy-cpu-and-storage`. Never manually set review; human approval sets done. Context creation does not invoke that command, benchmarks, Vitest measurement runs or SQL experiments.

Future managed resources use that future actor's latest trusted structured resourceGuardContext via `C:\Users\Rasmus\.agent-runtime\resource-guard.ps1` in Windows PowerShell 5.1; check native exit/ok, request only when needed and Stop resource ID afterward. Do not copy session identity into this brief. Preserve saved state; no Docker down/reset/prune/profile deletion/user-owned cleanup. stop_requested is not verified shutdown and requires no completion polling. Ordinary bounded commands need no managed launch.

### References

- `AGENTS.md`; `project-context.md` — repository rules, runtime conventions, seasonal direction and independent gates.
- `_bmad-output/planning-artifacts/prd.md` — NFR20/NFR35/NFR40, direct-sun correction.
- `_bmad-output/planning-artifacts/architecture.md` — E15-AD-01 Lifecycles 1–6; E15-AD-02; release gates.
- `_bmad-output/planning-artifacts/epics.md` — 15.1 AC1–6, 15.2 predecessor, Epic 13/14 amendments.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — authoritative workflow state.
- `_bmad-output/planning-artifacts/implementation-readiness-report-2026-09-10-epic-15.md` — F1–F6 and feasibility.
- `_bmad-output/test-artifacts/test-design/test-design-epic-15.md` — G0–G3, M01–M07, matrices, budgets and traceability.
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-09-09.md` — approved history, especially Section 10; estimates are not observations.
- `_bmad-output/planning-artifacts/decisions/direct-sun-weather-truth-2026-09-03.md` — potential/direct-beam distinction.
- `_bmad-output/implementation-artifacts/spec-direct-sun-weather-accuracy.md` — frozen contract, September 7 conformance/September 9 findings.
- `docs/launch/launch-readiness-handoff-2026-08-24.md` — September 9/10 findings, historical input limits, seasonal addendum.
- `_bmad-output/planning-artifacts/ux-design-specification.md` — seasonal Error & Degradation note and three-outcome semantics. No frontend implementation/design-token changes in this story.
- `nextjs-app/docs/github-actions-scheduled-jobs.md`; `nextjs-app/docs/venue-data-load.md` — current/future operations split.
- `.agents/skills/bmad-create-story/SKILL.md`; `.agents/skills/bmad-story-brief/SKILL.md`; `.agents/skills/story-file-audit/SKILL.md`; `.agents/skills/test-gate/SKILL.md`.

## Dev Agent Record

### Agent Model Used

Context author: Codex (GPT-6), with read-only source-analysis delegate under installed create-story instructions. Execution agent: not started.

### Debug Log References

2026-09-10 context preparation: branch main; HEAD ed13d76a6e214f5e9f66ef5b73f8202f4406033d; dirty planning/config/docs and untracked artifacts preserved. Baseline `npx tsc --noEmit` then `npx eslint . --quiet` from nextjs-app passed, exit 0. No benchmarks, runtime/database/browser/provider resources started.

python3 customization resolver unavailable. Applied documented base/team/user fallback: installed customize.toml supplies project-context persistent fact, empty prepend/append/on_complete; no matching team/user override found. Local create-story skill is installed (BMAD 6.9.0), satisfying reinstall proviso. No external latest-version research needed for repository-bound measurement context; locked dependencies remain baseline.

### Completion Notes List

- September14 verification: baseline/final typecheck and lint passed, including a final focused lint of the new SQL/report scripts. Initial full suite had one unchanged Story12.3 precompute test exceed its 5000ms timeout (2,290 passed); its five-test file passed on an unchanged isolated rerun, then the full suite passed 251 files /2,291 tests with unchanged settings. Both original failure and successful rechecks are retained. Four reports reproduce byte-for-byte; the updated evidence manifest and protected-file hashes were verified. This does not authorize another automatic review or close G1.

- September 14 legacy baseline follow-up: authorized read-only census captured 1,554 current legacy rows, 169,312,256B total relation and 314,330,259B application database. Stored input_payload values total 136,561,982B versus 686,929B series values; these are diagnostic column totals, not additive to total relation size. Captured three complete real September18 rows for venues34/8/47. Supabase branch inspection returned only default production main; no separate hosted benchmark branch was available. No production write experiment attempted.
- `legacy-01` / `sql-06`: fresh guard-managed PG15 physical-layout comparison preserved all original row values and both index column orders, with bidirectional reconstruction checks. Business validation/RLS/public-venue FK were not cloned and no application-schema correctness is claimed. Actual three-row legacy total 196,608B versus shared day/input total 229,376B; synthetic 37-date repetition (111 rows, unchanged series/input values) 4,513,792B versus 360,448B. Repetition is not measured historical/future sun. Repeated-load WAL 4,282,912B legacy /105,960B shared, n=1 with local command overhead. Shared inputs dominate the observed saving; arrays alone do not explain the old table size.
- Bounded coexistence added run-18's 294 measured array rows, relation 647,168B, whole scratch DB 13,284,143B including both legacy alternatives. This is additive occupancy for different samples, not a full-production migration or equivalent-payload compression comparison. Full retained-version diversity, cold/hosted reads and production-volume coexistence remain unmeasured. Guard Stop accepted for `28e020f0-e0ec-44ae-a2f3-e351023aa1e9` (`stop_requested`, verified=false), saved data retained. No runtime, migration, weather, production-write or story/sprint transition; no owner approval inferred.

- September 12 array-only follow-up (run-18/run-19): eight local workloads completed, including 294-day initial/staged builds, five-date rolling, repair, changed seating, shared-caster height perturbation, seven-date cohort invalidation and an actual 245-date season for venue49. Staged and initial arrays matched. All 161 bounded batches stayed below 8.70 seconds; initial build 128.02s, staged 144.58s, single-venue season 97.71s. These are local n=1 workload observations, not controlled speedups or full-cohort season timings. CPU excludes database/child processes. Sampled heap peak 184.04MB and OS process-lifetime RSS high-water 263.20MB include harness/retained results; no isolated allocation or deployment-memory claim.
- Run-18 adds verified array readbacks with 1/4/8 concurrent local connections, twenty measured rounds after two warmups: transport p95 196.01/217.13/269.12ms, decoding p95 <=0.50ms. Transport includes Docker/psql startup, not the proposed query/decode SLA. Cache eviction, hosted performance, new/removed-caster spatial resolution, exact legacy-row coexistence and full-cohort seasonal generation remain unmeasured. No production-budget gate is closed by these results.
- Run-19 completes all 12 synthetic fixtures ×7 required dates for the accepted detector against an independent unpruned one-minute reference with crossing refinement: zero raw/filtered topology or >2-minute matched-transition failures and zero unresolved duration cases. Earlier exact-edge evidence remains applicable. This checks the required matrix, not continuous gap discovery. Run-15 supplies paired caster-stratum CPU/wall/raw samples and heap snapshots; run-14 supplies exact date counts with explicitly extrapolated cohort/growth costs.
- Validation: baseline and final typecheck/lint passed; four new fail-closed reporter tests passed; full suite 251 files /2,291 tests passed. Both new measurement lanes passed with zero external attempts. Prior 297 evidence hashes verified before archiving the old index; new reproducible reports, raw evidence and provenance added. Guard Stop accepted for resource `50db2f93-c47f-4203-a888-0a0667775ec4` (`stop_requested`, not verified shutdown); data retained. No fourth review, runtime/application migration, production write or story/sprint transition. Final encoding/budget acceptance is not inferred from authorization to benchmark the recommended arrays.

- September 12 post-acceptance reconciliation: `15-1-remaining-gates-2026-09-12.md` separates accepted detector risk, completed measurements, missing measurement lanes and proposed G1d decisions. All 297 evidence hashes/byte counts verified and the acceptance package reproduced byte-for-byte in memory; typecheck/lint passed. No benchmarks or full suite rerun, no additional acceptance inferred, and no status transition. Open compound subtasks remain unchecked because pilot-budget approval alone cannot satisfy their unmeasured portions.

- 2026-09-12 explicit G1b owner decision: Rasmus answered “accept this tested candidate’s documented risk” after being told that an untriggered four-minute shade interval can be missed. Recorded the scoped method/risk acceptance and synchronized PRD, E15-AD-02 architecture, epics, UX, project-context and Epic15 test design. The accepted detector is five-minute base /5pp trigger /60-second interior /100ms discovered-crossing bracket. The >=300s rule applies to reconstructed intervals; preserve every detected shade gap. Universal discovery is no longer an acceptance claim. Missing/exhausted computation, missing coverage/inputs, duration uncertainty and weather rules remain unchanged.
- G1b method/residual-risk decision ACCEPTED; this is not acceptance of G1d encoding, retention, operational budgets, AC6 as a whole or Story15.1 completion. Story/sprint status stays unchanged and 15.2 remains blocked. Existing measured results, known-miss regressions and dated decision package remain historical evidence, not rewritten as successful discovery. Documentation-only amendment; baseline typecheck/lint and 18 targeted policy/threshold/documentation-contract tests passed. Verified six synchronized living documents and all 297 historical evidence hashes unchanged; protected config/service-test hashes unchanged.

- 2026-09-12 decision-package follow-through: run-16 compared 60/30/15-second interior cadences on seven difficult full days against five-second engine references. All 21 raw/filtered comparisons matched, with 1,139/1,302/1,645 candidate calls respectively. Retain 60 seconds as the economical tested cadence; no claim of continuous detection. Added a regression proving an untriggered four-minute shade interval can be missed at all three cadences. Prior wording limiting residual risk to sub-minute gaps was too narrow; the strict no-gap requirement remains unproven and G1b remains open.
- Run-17 measured a complete bounded local workflow: database input fetch/parse, solar support, adaptive calculation, representation/serialization and four encodings stored for 42 venues x seven real dates (294 days), 138.84s total initial wall time, n=1. This includes local transport/assertions and all four alternatives, excludes schema/input seeding and production scheduling. Rollback left no failed generation; retry preserved counts with 0 measured cluster WAL delta. Four additional retained copies plus an actual +2m venue49 edit ended with 1,477 rows per encoding; all seven edited days changed. Twenty measured serial warm readbacks per encoding round-tripped expected values; plans/buffers and decode/transport times retained. No concurrent/cold or hosted-production performance claim.
- Full arrays measured 655,360B for current day relations, 2,899,968B after five retained copies and 2,908,160B after edits. Compact measured more, so recommend retaining full adaptive arrays with raw boundaries/shared inputs rather than discarding raw probes. Actual whole scratch database after edits: 21,590,831B including all four alternatives; do not treat it as one production design. Linear array projections are 22.94MB one season /101.50MB five copies plus input/generation metadata, not measured seasonal totals.
- Authorized read-only capacity check (capacity-02): management metadata confirms Free plan; September12 SQL measured 309,423,251B current DB and 324,538,545B summed across three cluster databases. Official documented 500MB Free quota modelled conservatively as 500,000,000B leaves 175.46MB planning space. Physical disk/WAL free space and organization billing-period average remain unmeasured. Propose current+one rollback, capacity-gated staging, warning at 375MB /hold new generation above projected 400MB. One worker, five venues x three dates, 60s pilot shard ceiling and <=100ms DB-query/decode pilot read target are proposed operating guardrails, not approved or measured production SLAs. Existing NFRs remain unchanged.
- See ACCEPTANCE-PACKAGE-2026-09-12.md for the consolidated recommendations, measurement/extrapolation boundaries and remaining owner decision: accept explicitly stated empirical detection risk via amendment, or retain strict no-gap and continue detector work. No amendment or owner acceptance inferred. Final typecheck/lint and full suite 250 files /2,287 tests passed. Guard resource c37e9215-bd50-4503-93de-49745b44c868 Stop accepted; saved data retained. No runtime/application schema/production writes/status changes, no fourth automatic review and no Story15.2 work.

- 2026-09-11 near-threshold execution: run-14 measured five-minute base +60-second interior probes +100ms detected-crossing brackets, with 1/5/10 percentage-point margin comparisons on all 252 original venue-days. The 5pp and 10pp candidates matched all raw/filtered reference topology and <=2-minute boundaries; 1pp missed the 29-second raw sunny burst, though its filtered result matched. The preselected 5pp candidate also matched all 84 additional venue-days (April 15/August 15) with no duration-unresolved cases. Posthotellet's 60-second gap remains separate between qualifying sunny windows. These are bounded one-minute-reference results, not continuous detection proof. The helper retains an explicit deep interior-gap counterexample outside its endpoint trigger.
- Run-15 adds twenty observations per method/case after two warmups across IDs34/8/47 and the ID49 gap case. Candidate venue-day wall p95: 159.74/453.89/765.73/283.92ms, nearest-rank within repeated-case samples, not a production-population p95. Hash-bound raw timings, call counts, intervals and process-heap snapshots are retained. Eight-date per-venue scaling estimates 75.30 wall minutes /75.11 CPU minutes and ~2,187,923 total calls for the 42-venue full season; 50/100/500 projections are explicit extrapolations. Persisting all probes would imply 26.26MB numeric payload before database overhead; no adaptive-layout database total is claimed.
- Recommend retaining the 5pp/60-second probe candidate for the next gate evaluation, without changing the >50% predicate, minimum-window rule, no-bridging requirement or weather contract. Implementation/margin comparison is complete; the broader probe-cadence selection subtask remains open (this run fixes interior cadence at 60 seconds). Remaining work includes detector acceptance/remaining blind spots, final representation, representative end-to-end generation/read/load and verified hosting headroom/budgets. Prior run-12/sql-05 estimates remain historical base-only evidence; no SQL rerun or production access in this experiment.
- Validation: initial and final typecheck/lint passed; full Vitest 249 files /2,283 tests passed, including seven new threshold regression tests. Run-14 published completion only after all 872 cells; run-15 after all 176 records, both zero attempted external calls. See run-14/THRESHOLD-CANDIDATE.md. No runtime/schema/policy/owner-gate/status changes and no fourth automatic review.

- 2026-09-11 owner follow-up: Rasmus said “Sounds like a good plan. Please make the adjustments needed with regards to the story. Proceed.” Recorded approval of the five-minute-base/near-threshold investigation plan and added concrete measurement, regression, cost and storage follow-through. This is not acceptance of an untested detector or a relaxation of the no-gap rule. Corrected stale execution/task wording. Documentation-only update; typecheck/lint baselines passed. No owner gate, acceptance criterion, runtime, historical evidence or sprint status changed.

- 2026-09-11 practical five-minute survey: run-12 covers all 42 captured venues on six season dates (252 venue-days), plus actual solar-support counts for all 245 season dates. One interior shade gap below five minutes was found (Posthotellet, October 25, 60s); unpruned one-second run-13 reproduces its dip to 49.73446% sunlit seating. Five-minute endpoint-change refinement misses that gap and violates no-bridging, while the other missed topology is an intentionally suppressed 29s sunny burst. Plain boundary timing exceeds two minutes in 85 cells; refined matched boundaries do not. One-minute references do not prove absence of shorter gaps.
- Season counts are 1,619,044 base samples /19.43MB numeric payload for 42 venues. Six-date refined computation measured 92.77s summed wall/93.899 CPU seconds, n=1 per cell; per-venue seasonal scaling estimates 77.8 wall/78.8 CPU minutes, not measured seasonal/end-to-end budgets. sql-05 measured actual 252 day rows and five retained copies in a fresh guard-owned database, with total relation/database sizes and initial-load WAL. Linear storage sensitivity estimates 18.73–23.09MB one-season day relations and 86.30–106.36MB five-retained day relations; hosting headroom remains unknown. Guard Stop accepted, saved data retained.
- Recommendation: five-minute base with refined crossings and a separately validated near-threshold interior check; do not accept the failed endpoint-only detector. No one-second amendment, runtime, policy, owner checkbox or status changes. See run-12/FIVE-MINUTE-SURVEY.md. Baseline and final typecheck/lint passed; full suite 248 files /2,276 tests passed. No fourth review.

- 2026-09-11 bounded whole-interval feasibility checkpoint: run-11 tests an all-direction 200m swept rectangle enclosure, conditional on supported solar elevation. Only venue 45 of 42 resolves; aggregate supported-duration unresolved fraction is 97.62%. The three prior exact-window fixtures remain unresolved, so the experiment supplies no positive exact-window certificate. The bound is independent of interval width; repeated subdivision would not tighten it. This rejects this candidate's usefulness, not every possible rigorous interval method.
- Completed six full supported-day diagnostics (three captured venues ×1s/5s grids, pruned engine, n=1). One-second wall times 52.92/157.85/181.80s; five-second times 10.50/39.68/40.64s. Detected topology agrees between the two grids in these three days, but sub-grid gaps remain unproven. No full-season extrapolation or production budget acceptance. See run-11/CHECKPOINT.md for the concrete choice between additional bounded proof engineering and a proposed one-second temporal-fidelity amendment. Recommended amendment is pending explicit owner approval; all accepted no-gap and raw-transition requirements remain unchanged.
- Verification: baseline/final typecheck/lint, three new bound tests, completed six-cell measurement and full regression 247 files/2,273 tests passed. Report reproduced byte-for-byte; prior 243 evidence hashes preserved. No runtime/schema/production/resource/status changes or fourth review. This reaches the agreed decision checkpoint, not story completion; 15.2 remains blocked.

- 2026-09-11 spatial broadphase: benchmark-only projected bounding-box rejection preserves all 1,890 captured coarse values and all 1,500 retained exact-reference instants. Paired baseline/pruned execution (three repetitions, one warmup per variant, alternating order) improves median exact-reference cost by 2.51×/2.35×/3.97× for venues 34/8/47. Retained casters are 1/4/3 instead of 42/103/155 in those windows. No whole-response/confidence equivalence is claimed.
- This optimization still evaluates every millisecond and does not resolve efficient whole-interval detection or seasonal budgets. See run-10/SPATIAL-PRUNING.md for proof scope, source/dependency identity and retained limitations. Baseline/final typecheck/lint, two new tests, measured runner and full suite 246 files/2,270 tests passed. Prior 236 hashes and new completion verified. No runtime/schema/production/resource/status change or fourth review; 15.2 remains blocked.

- 2026-09-11 real-engine bound reference: benchmark-only exhaustive-enclosure adapter evaluates every Date-representable millisecond in a range, caches frozen-engine values, rejects invalid values and returns null on exhaustion. Three new tests pass. run-09 enumerates 500ms around each of three captured transitions, with one warmup/three measured repetitions and zero attempted external calls. Exactness is limited to the frozen engine's Date domain, not physical truth or whole-day completeness.
- Observed median 500ms-reference costs: 1.871s (42 casters), 4.041s (103), 3.715s (155). Same-cost supported-day extrapolations are 40.54/87.55/80.47 wall hours per venue; explicitly unmeasured and not production budgets. Recommend retaining exhaustive enumeration as a bounded short-window reference, not the seasonal generator. Practical whole-interval pruning still needs validation; no accuracy amendment or acceptance is inferred.
- Verification: baseline/final typecheck, quiet lint, three targeted tests, captured runner and full regression 245 files/2,268 tests passed. Report reproduced byte-for-byte; prior 228 evidence hashes preserved. No runtime/schema/production/database/resource/status changes or fourth review. 15.1 remains in-progress and 15.2 blocked.

- 2026-09-11 detection-method feasibility: added a benchmark-only conditional interval partitioner, four tests and run-08 analytic evidence. Five 0.125ms–10s gap cases retain zero false qualifying spans using exact step-signal bounds, but all retain unresolved boundary slivers and report incomplete. Missing bounds/budget exhaustion never create sunny coverage. No real geometric interval adapter or production guarantee is claimed; source-specific proof obligations and the proposed swept-envelope experiment are documented in run-08/DETECTION-METHOD.md. This is implementation feasibility work, not a fourth review.
- Detection follow-through checks: baseline/final typecheck and lint passed; targeted four tests, analytic runner and full regression 244 files/2,265 tests passed. Verified prior 221 evidence hashes and new lane completion. No runtime/schema/production/resource/status change. Method/budget acceptance remains open; 15.2 remains blocked.

- 2026-09-11 captured-cohort follow-through: owner-authorized read-only September 10 census and repeatable-read inputs now retained in capture-01 (42 venues, 1,566 distinct casters, 4,278 memberships). Actual production database 306,498,707 B; current geometry-series relation 161,595,392 B. These separate snapshots supersede prior current-inventory/baseline unavailability only; they are not historical geometry or a production write experiment.
- run-07 completed all 42 September 22 coarse day rows, actual +2m simulated edit recomputations, and 12 cadence comparisons across three real transition-bearing fixtures. All matched sampled-reference topology, but uniform 250ms reference and 1/5/10/60s candidates cannot certify unseen shade gaps. Clipped filtering is diagnostic only. Five observations per cell, no p95; shared-host timing interference is disclosed. No full-season adaptive/production budget acceptance.
- sql-04 completed in a new guard-managed scratch database using captured day payloads, five simulated retained roles and a sixth changed generation. Total relation bytes after edits: JSONB 3,219,456; arrays 3,276,800; bytea 3,252,224. Whole scratch DB 18,117,423 B includes all encodings. This small cohort does not establish an arrays storage advantage. Phase WAL and warm reads retained; no production capacity/headroom claim. Guard Stop accepted (exit 0, ok true, stop_requested, verified false), saved data preserved.
- See [captured measurement supplement](../test-artifacts/measurements/epic-15/story-15-1/run-07/CAPTURED-RESULTS.md). No runtime/schema/status changes or fourth automatic review. Story remains in-progress and 15.2 blocked; owner-dependent acceptance remains open.
- Captured follow-through verification: baseline/final typecheck and lint passed; two new helper files/five tests and full regression 243 files/2,261 tests passed. Report regenerated byte-for-byte; prior 180 evidence hashes verified and archived. Detailed limitations and resource lifecycle are in run-07/AUDIT.md.

- Accepted-policy follow-through: implemented only benchmark filtering and verification, with [run-06 measurement supplement](../test-artifacts/measurements/epic-15/story-15-1/run-06/WINDOW-POLICY.md). Seven new tests validate 299/300/301-second behavior, no gap bridging, uncertainty, weather overrides, equality/edges and safety limits. All 105 retained references match the filtered minute candidate, but a ten-second missed shade gap between two 290-second bursts creates 589,609 ms of false qualifying sun. The current sampler is NOT accepted. Historical raw failures remain unchanged.
- Added 21 synthetic daily adaptive/filter cost cells (n=5, no p95) and one elevated full-season adaptive run (245 dates, 192,268 samples, 46.805 s wall /46.172 s CPU, n=1). These do not establish representative production budgets or derived-window database footprint. No suitable current captured venue/caster inventory or actual database baseline found locally; missing-input question sent to owner. No production or database experiments, runtime/schema changes, later-story work or fourth review. Combined G1 remains open.
- Verification: baseline/final typecheck and lint passed; targeted 5 files /26 tests and full suite 241 files /2,256 tests passed. Hash-bound measurement outputs and report-only fix provenance retained. Story remains in-progress; owner product-policy approval does not imply measurement acceptance.

- 2026-09-10 owner acceptance of product direction: Rasmus explicitly accepted all four recommendations in the conversation. See [owner policy amendment](../planning-artifacts/decisions/epic-15-owner-policy-2026-09-10.md). G1a product convention is accepted (below 5 degrees is not sunny); G1b requirement is accepted (suppress raw continuous geometric sun intervals shorter than 300 seconds, retain qualifying intervals from start to end without bridging shade gaps, weather still mandatory); G1c accepts full actual-year March–October coverage including hidden non-deleted venues; G1d selects arrays provisionally without production budget or precision/schema acceptance. Historical review Decision checkboxes and v5 measurement reports describe their earlier disposition; this dated note supersedes pending product-choice wording only.
- The controlling PRD, architecture E15-AD-01/02, epics, UX, project context and Epic 15 test design now carry the accepted amendment. Preserve raw geometry and all prior failed-window evidence. Five minutes is an eligibility threshold, not sampling cadence or a replacement for existing raw transition/root targets. The amended policy still needs benchmark verification of qualifying-window discovery, shade gaps, duration-threshold uncertainty, edges and costs. No runtime, schema, production or later-story implementation performed. Combined G1 remains open, owner-dependent measurement criteria remain unchecked, Story 15.1 remains in-progress and 15.2 stays blocked. This acceptance is not story completion or a fourth automatic-review override.

- 2026-09-10 Round 3 fixes (v5): R3-01 now requires successful hash-bound nine-cell semantic evidence and consumes it in the report; R3-02 binds strategy timings to measured fixture contents, engine/measurement/package source hashes, season grid, coordinates and selected main artifacts. Runner checks loaded inputs before timing; reporter rejects mismatches before aggregation. New run-05 captures strategy/semantics against retained run-04 main/edge and sql-03. No daylight/SQL/production rerun or fourth automatic review. Owner criteria remain open and 15.2 remains blocked.
- R3 verification: baseline/final typecheck and lint passed; targeted 4 files / 19 tests and full regression 240 files / 2,249 tests passed. Four derived outputs reproduce exactly. Protected files/branch/HEAD preserved; prior report/manifest retained in pre-r3. Patch checkboxes indicate implemented/tested only; story remains in-progress.

- R2 final verification: baseline/final typecheck and lint passed; 4 files / 16 targeted tests and full regression 240 files / 2,246 tests passed. Final report/derived hashes reproduce exactly. Patch checkboxes denote implementation/test completion only; no third review round or owner approval. Preserved all prior evidence and documented superseded attempts. Story remains in-progress.

- 2026-09-10 Round 2 fixes (v4): implemented hash-bound main/edge completion gates with expected-cell validation before derived writes (R2-01), and two supplemental surviving elevated-caster fixtures across all seven dates with oracle/candidate and repeated CPU measurements (R2-02). Original rooftop exclusion control is preserved. All 14 supplemental cells contain actual sun/shade transitions. These are synthetic model observations; representative elevated population and operational budgets remain unavailable. See RESULTS.md v4 and README attempt history. SQL is retained from sql-03 only after matching original/edit datasets; supplemental elevated cases are excluded. No owner acceptance or Story 15.2 work.

- 2026-09-10 Round 1 fixes (v3): addressed R1-01 through R1-05 with fail-closed interval topology/mutual matching, validated atomic strategy publication, actual +2 m input/payload edits with retained generations and phase WAL, explicit November/December requests for the full 2027 season, and nonnegative completed-base/adaptive counters. Review findings above retain their historical description; checked Patch items mean implemented and tested, not independently re-reviewed or owner accepted.
- Fresh run-03/main, strategies, edges and edits completed; sql-03 retains 350 original plus 70 edited rows per encoding, with 36 changed day checksums and 20 input versions. Whole database after edits: 15,045,423 B. Changed-generation WAL: JSONB 488,968 B, arrays 441,288 B, bytes 457,176 B. All are synthetic local observations; production budgets and representative lanes remain unavailable. RESULTS.md v3 supersedes prior numerical summaries; previous report/manifest retained in pre-r1/.
- Fix verification: baseline and final typecheck/lint passed; targeted 4 files / 13 tests passed; full Vitest 240 files / 2,243 tests passed (vitest-r1-full.log). Guard Stop accepted, exit 0 / ok true / stop_requested / verified false; saved data retained. No new review round, runtime/migration changes or production activity. Story remains in-progress; all owner Decision items and G1 signatures remain pending, and 15.2 remains blocked.

- 2026-09-10 execution: Story 15.1 is **in-progress**, with all ACs and G1 remaining open where required data/acceptance is absent. Read the versioned [measurement result](../test-artifacts/measurements/epic-15/story-15-1/RESULTS.md) and [reproduction/verification record](../test-artifacts/measurements/epic-15/story-15-1/README.md). Checked subtasks denote executed experiments, not successful candidates or owner acceptance.
- Baseline typecheck/lint passed before edits. Final full regression: 239 files / 2,238 tests passed. Eight benchmark unit/fixture/semantic tests passed. Node measurement runs completed (main v2 95.37 s, strategies 135.44 s, engine-backed slits 38.75 s); exact commands, raw data and source hashes retained. Typecheck/lint also passed after additions. E2E/visual not required for this unchanged-runtime story.
- Measured synthetic coverage: 70 geometry/date cases plus 21 thin-street/date cases, independent one-minute oracle and one-second slit references, 245 season dates and 13,186 coarse samples per central control venue. Minute probing missed 27/21/14-second engine-backed windows. UTC+offset identities round-trip; the existing offset-free autumn Date helper loses the first repeated 02:30 occurrence. Neither fact was repaired in runtime.
- Synthetic full-season calculation across 10 fixtures: 110.252 seconds wall, 109.954 seconds CPU, n=1 per fixture; no p95 claimed for these large runs. Real inventory/caster CPU remains BLOCKED. Remaining-date staging is 52/245 dates, missing 193 historical dates. Recommend full-season completeness pending owner acceptance.
- Isolated durable PostgreSQL experiment: 350 retained matrix rows per encoding; clean complete relation totals arrays 1,695,744 B, bytes 1,875,968 B, JSONB 2,031,616 B. Whole scratch DB 13,587,247 B clean and 13,914,927 B after churn, versus 7,705,391 B empty. This is a synthetic retention matrix, not an actual production/full-season baseline. Arrays provisionally preferred; production budgets UNKNOWN. Host precision/validation matched; production SQL malformed-decoder validation is not certified.
- Required representative inputs/current inventory, actual existing JSONB/storage baseline, field interpretation, remaining radius/eligibility extremes, adaptive full-season/shard/load evidence and G1 signatures remain outstanding as detailed in RESULTS.md. No current real counts or measured production budgets were fabricated. Historical full inputs remain unavailable. Synthetic experiment budget suggestions are explicitly separate from production budgets.
- Resource guard verified owned DB `1c959a2a-91f7-4ab4-a734-22874a5b0585` after a startup response timeout. Stop returned exit 0 / ok true / stop_requested / verified false; accepted without shutdown polling. Data/volumes preserved. No production activity, runtime/application migrations, package/Compose changes, commit, push, merge, deployment or review gate. Story 15.2 was not started.
- `.codex/config.toml` and the protected documentation test hashes match initial values; party-mode untouched. Added only a narrow `.gitignore` exception so benchmark source files are visible to Git. Existing planning changes were preserved; only this story's sprint entry changed ready-for-dev → in-progress.

- Context created with verbatim epic ACs and readiness/test-design traceability.
- At context preparation, measurement execution/evidence was NOT RUN and G1 was pending. Execution results above supersede that historical preparation state; G1 remains pending.
- Seven-check context audit passed, including independent read-only source audit; ready-for-dev permits later measurement execution, not Story 15.2.

### File List

- `nextjs-app/scripts/benchmarks/epic-15/legacy-storage.mjs`, `legacy-storage-report.mjs` — actual legacy-row physical layout, shared reconstruction and bounded coexistence experiment/report.
- `_bmad-output/test-artifacts/measurements/epic-15/story-15-1/` — legacy-01 read-only capture/census/branch evidence, sql-06 measurements, LEGACY-STORAGE-2026-09-14.md, validation log/provenance and updated archived index/manifest.

- `nextjs-app/scripts/benchmarks/epic-15/workloads.measurement.ts`, `workloads-report.mjs` — array-only scratch workloads, measured batches/memory/concurrent reads, exact-set report validation.
- `nextjs-app/scripts/benchmarks/epic-15/accepted-matrix.measurement.ts`, `accepted-matrix-report.mjs` — accepted detector's full synthetic geometry/date matrix and validated report.
- `nextjs-app/test/unit/benchmarks/epic-15/workloads-report.test.ts` — incomplete/tainted evidence, duplicate/missing dates, missing concurrent observations and invalid CPU regressions.
- `_bmad-output/test-artifacts/measurements/epic-15/story-15-1/` — run-18/run-19, WORKLOADS-2026-09-12.md, ACCEPTED-MATRIX-2026-09-12.md, full-suite log, workloads-verification.json, pre-workloads archived index and updated manifest.

- `_bmad-output/implementation-artifacts/15-1-remaining-gates-2026-09-12.md` — current gate reconciliation and concrete, unapproved storage/retention/pilot recommendations; historical evidence preserved.

- `_bmad-output/planning-artifacts/decisions/epic-15-detector-risk-acceptance-2026-09-12.md` — explicit scoped G1b owner acceptance; September10 policy links its supersession.
- `_bmad-output/planning-artifacts/prd.md`, `architecture.md`, `epics.md`, `ux-design-specification.md`, `project-context.md`, `_bmad-output/test-artifacts/test-design/test-design-epic-15.md` — synchronized accepted empirical-detector claim, preserved detected gaps and unchanged remaining gates.

- `nextjs-app/scripts/benchmarks/epic-15/cadence.measurement.ts`, `pipeline.measurement.ts`, `representation.ts`, `acceptance-report.mjs` — shorter-cadence study, isolated local workflow, precision-preserving experimental formats and consolidated decision report.
- `nextjs-app/test/unit/benchmarks/epic-15/representation.test.ts`, `threshold-sampling.test.ts` — round-trip/malformed/compact representation checks and explicit untriggered four-minute gap regression.
- `_bmad-output/test-artifacts/measurements/epic-15/story-15-1/run-16/`, `run-17/`, `capacity-02/`, `pre-acceptance/`, `ACCEPTANCE-PACKAGE-2026-09-12.md`, `vitest-acceptance-full.log`, root README/manifest — reproducible bounded workflow and dated capacity evidence.

- `nextjs-app/scripts/benchmarks/epic-15/threshold-sampling.ts`, `threshold.measurement.ts`, `threshold-cost.measurement.ts`, `threshold-report.mjs`, `threshold-decision.mjs` — benchmark-only adaptive candidate, bound survey/repeated cost and reports.
- `nextjs-app/test/unit/benchmarks/epic-15/threshold-sampling.test.ts` — gap/burst, duration uncertainty, equality, exact edges and exhaustion regressions.
- `_bmad-output/test-artifacts/measurements/epic-15/story-15-1/run-14/`, `run-15/`, `pre-threshold/`, `vitest-threshold-full.log`, root README/manifest — threshold study and preserved prior evidence.

- `nextjs-app/scripts/benchmarks/epic-15/survey.measurement.ts`, `survey-focus.measurement.ts`, `survey-report.mjs`, `survey-decision.mjs`, `survey-storage.mjs` — practical captured cohort survey, focused unpruned check, fail-closed reporting and isolated actual-value storage experiment.
- `nextjs-app/test/unit/benchmarks/epic-15/survey-report.test.ts` — incomplete matrix/season rejection and topology accounting.
- `_bmad-output/test-artifacts/measurements/epic-15/story-15-1/run-12/`, `run-13/`, `sql-05/`, `pre-survey/`, `vitest-survey-full.log`, root README/manifest — retained measurement evidence, report and provenance.

Whole-interval feasibility additions:
- `nextjs-app/scripts/benchmarks/epic-15/whole-sweep.ts`; `feasibility.measurement.ts`; `feasibility-report.mjs`.
- `nextjs-app/test/unit/benchmarks/epic-15/whole-sweep.test.ts`.
- `_bmad-output/test-artifacts/measurements/epic-15/story-15-1/run-11/`, `pre-feasibility/`, `vitest-feasibility-full.log` and updated root README/manifest.

Spatial pruning additions:
- `nextjs-app/scripts/benchmarks/epic-15/shadow-broadphase.ts`; `broadphase.measurement.ts`.
- `nextjs-app/test/unit/benchmarks/epic-15/shadow-broadphase.test.ts`.
- `_bmad-output/test-artifacts/measurements/epic-15/story-15-1/run-10/`, `pre-broadphase/`, `vitest-broadphase-full.log` and updated root README/manifest.

Exact finite-Date reference additions:
- `nextjs-app/scripts/benchmarks/epic-15/exhaustive-enclosure.ts`; `exhaustive.measurement.ts`; `exhaustive-report.mjs`.
- `nextjs-app/test/unit/benchmarks/epic-15/exhaustive-enclosure.test.ts`.
- `_bmad-output/test-artifacts/measurements/epic-15/story-15-1/run-09/`, `pre-exhaustive/`, `vitest-exhaustive-full.log` and updated root README/manifest.

Detection-method feasibility additions:
- `nextjs-app/scripts/benchmarks/epic-15/interval-enclosure.ts`; `enclosure.measurement.ts`.
- `nextjs-app/test/unit/benchmarks/epic-15/interval-enclosure.test.ts`.
- `_bmad-output/test-artifacts/measurements/epic-15/story-15-1/run-08/`, `pre-enclosure/`, `vitest-enclosure-full.log` and updated root README/manifest.

Captured-cohort additions:
- `nextjs-app/scripts/benchmarks/epic-15/capture-inputs.ts`; `dense-sampling.ts`; `captured.measurement.ts`; `captured-storage.mjs`; `captured-report.mjs`.
- `nextjs-app/test/unit/benchmarks/epic-15/capture-inputs.test.ts`; `dense-sampling.test.ts`.
- `_bmad-output/test-artifacts/measurements/epic-15/story-15-1/capture-01/`, `run-07/`, `sql-04/`, `pre-captured/`, final validation log and updated root README/manifest.

Accepted-policy benchmark additions:
- `nextjs-app/scripts/benchmarks/epic-15/window-policy.ts`; `windows.measurement.ts`; `window-report.mjs`.
- `nextjs-app/test/unit/benchmarks/epic-15/window-policy.test.ts`.
- `_bmad-output/test-artifacts/measurements/epic-15/story-15-1/run-06/` — raw/derived supplement, provenance, README and audit; root README/manifest and new logs updated with historical snapshots preserved.


Owner-approved policy documentation updates:
- `_bmad-output/planning-artifacts/decisions/epic-15-owner-policy-2026-09-10.md` — new approval record.
- `_bmad-output/planning-artifacts/prd.md`; `architecture.md`; `epics.md`; `ux-design-specification.md` — accepted amendment, preserving existing work.
- `project-context.md`; `_bmad-output/test-artifacts/test-design/test-design-epic-15.md` — durable direction and outstanding verification.


Context outputs only:
- `_bmad-output/implementation-artifacts/15-1-measure-daylight-transition-accuracy-cpu-and-storage.md`
- `_bmad-output/implementation-artifacts/15-1-measure-daylight-transition-accuracy-cpu-and-storage.audit.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — preparation status after audit.

Measurement execution files:
- `nextjs-app/scripts/benchmarks/epic-15/evidence.mjs`
- `nextjs-app/scripts/benchmarks/epic-15/edits.measurement.ts`
- `nextjs-app/test/unit/benchmarks/epic-15/review-fixes.test.ts`
- `nextjs-app/.gitignore` — narrowly expose the benchmark directory.
- `nextjs-app/scripts/benchmarks/epic-15/measurement.ts`
- `nextjs-app/scripts/benchmarks/epic-15/vitest.config.ts`
- `nextjs-app/scripts/benchmarks/epic-15/run.measurement.ts`
- `nextjs-app/scripts/benchmarks/epic-15/strategy.measurement.ts`
- `nextjs-app/scripts/benchmarks/epic-15/edges.measurement.ts`
- `nextjs-app/scripts/benchmarks/epic-15/storage.mjs`
- `nextjs-app/scripts/benchmarks/epic-15/summarize.mjs`
- `nextjs-app/test/fixtures/epic-15/geometries.ts`
- `nextjs-app/test/unit/benchmarks/epic-15/measurement.test.ts`
- `nextjs-app/test/unit/benchmarks/epic-15/fixtures.test.ts`
- `nextjs-app/test/unit/benchmarks/epic-15/semantics.test.tsx`
- `_bmad-output/test-artifacts/measurements/epic-15/story-15-1/` — README, RESULTS, raw run-01/run-02 and sql-02 (prior), run-03/sql-03 (Round 1), run-04 main/edge plus run-05 strategy/semantics and retained sql-03 (current), pre-r3 historical report/manifest, pre-r2 historical report/manifest, pre-r1 historical report/manifest, ledgers, test log, tooling hashes and complete per-file SHA256 inventory in `file-manifest.json`.
- `_bmad-output/implementation-artifacts/15-1-measure-daylight-transition-accuracy-cpu-and-storage.md` — this execution record.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — this story in-progress only.

## Change Log

- 2026-09-14: Identified the current legacy input-payload storage cost; measured exact-value shared-input reconstruction and bounded coexistence locally, retaining explicit population/platform limitations and open owner gates.

- 2026-09-12: Measured array-only workload/batch/memory/concurrent-read follow-up and full accepted-detector synthetic matrix; updated evidenced subtasks while preserving unmeasured operational and owner gates.

- 2026-09-12: Reconciled remaining measurement and owner gates after detector-risk acceptance; verified retained evidence and documented proposed storage/retention/pilot limits without approving them or changing story status.

- 2026-09-12: Recorded explicit owner acceptance of the tested detector's residual risk and synchronized living requirements; no runtime, evidence-result, budget approval or story-status change.

- 2026-09-12: Completed shorter-cadence and bounded generation/storage/retry/edit/read experiments, verified dated Free-plan capacity, and assembled explicit owner decision package without closing accuracy/production-budget gates.

- 2026-09-11: Implemented and measured the near-threshold candidate on 336 captured venue-days, added repeated-case p95 evidence and conditional seasonal projections, and preserved explicit detection/budget limitations. No runtime, requirement or status change.

- 2026-09-11: Updated the story's active investigation tasks following owner approval of the five-minute-base/near-threshold plan; preserved all acceptance criteria, no-gap semantics and G1 gates.

- 2026-09-11: Investigated five-minute cadence against captured seasonal geometry, reproduced a meaningful threshold shade gap, measured isolated storage and recorded explicit seasonal extrapolations. No runtime, owner acceptance or story/sprint status change.

- 2026-09-11: Completed bounded whole-interval feasibility/full-day cost experiment and presented an explicit pending temporal-fidelity decision. No policy, runtime or story-status change.

- 2026-09-11: Measured benchmark-only spatial pruning against captured coarse and exhaustive references; recorded 2.35–3.97× paired speed improvements without changing temporal coverage. No runtime/status change.

- 2026-09-11: Added capped exact finite-Date engine reference, measured captured transition windows and documented why exhaustive seasonal generation is not recommended. No runtime/status change.

- 2026-09-11: Investigated whole-interval detection, prototyped conditional conservative partitioning and recorded analytic evidence plus missing engine-adapter proof obligations. No acceptance/status/runtime changes.

- 2026-09-11: Replayed authorized captured inputs in benchmark tooling; measured bounded finer sampling and local retained storage/WAL/reads. Preserved no-gap and production-budget limitations; no runtime or status changes.

- 2026-09-10: Measured accepted five-minute window policy in isolated offline benchmark tooling; documented remaining shade-gap discovery failure and partial synthetic adaptive costs. No runtime/status change.

- 2026-09-10: Recorded Rasmus's explicit product-policy acceptance and synchronized living specifications. Measurement/production budgets and amended-policy verification remain open; no status change.

- 2026-09-10: Fixed both Round 3 evidence-binding findings; regenerated v5 with validated semantic capture and input-bound strategy rerun. No additional automatic review or owner acceptance.

- 2026-09-10: Fixed both Round 2 technical findings, added 14 elevated transition/cost cells and fail-closed main/edge report gates; regenerated v4 evidence. Owner gates remain open.

- 2026-09-10: Fixed five Round 1 technical findings and regenerated v3 synthetic measurement evidence; owner criteria remain open and no status transition applied.

- 2026-09-10: Executed bounded measurement tooling, synthetic geometry/CPU/SQL experiments, recorded failed discovery candidates and incomplete real-data lanes, and prepared pending G1 decision package. Story remains in-progress; no owner acceptance or later story work.
- 2026-09-10: Created measurement-only context. No execution/runtime/migration/production work.
