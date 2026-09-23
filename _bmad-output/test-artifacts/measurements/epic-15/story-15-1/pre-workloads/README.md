# Decision package — September 12

See [ACCEPTANCE-PACKAGE-2026-09-12.md](ACCEPTANCE-PACKAGE-2026-09-12.md). Run-16 found no additional intervals from shorter interior cadences on seven difficult days. Run-17 measured a complete bounded local 294-day workflow (138.84s), four representations, retry/rollback, actual venue edit, retained growth and warm readback. Full arrays were smaller than compact storage. Capacity-02 confirms Free plan and 324.54MB aggregate cluster data; documented 500MB quota gives 175.46MB conservative planning space. Proposed settings, arrays, retention and pilot limits remain for owner consideration. Important correction: untriggered gaps can be longer than one minute; the retained four-minute counterexample means strict no-gap is still unproven. No runtime/policy/status changes. Typecheck/lint and 250 files /2,287 tests passed. Prior 279-entry manifest/README preserved in pre-acceptance.

# Near-threshold candidate — September 11

See [run-14/THRESHOLD-CANDIDATE.md](run-14/THRESHOLD-CANDIDATE.md). Five-minute base plus 60-second interior checks within 5 percentage points of the unchanged 50% threshold matched all 336 captured venue-days against declared references, including Posthotellet. Explicit untriggered-gap counterexample remains; no universal continuity claim. Run-15 provides twenty repeated observations per method/case, with candidate wall p95 0.16–0.77s for the selected cases. Current-inventory season extrapolation: 75.30 wall minutes, ~2.19M calls, 26.26MB numeric payload if every probe is persisted. Production budgets, representation and headroom remain open. Typecheck/lint and 249 files /2,283 tests passed. No runtime/policy/status change; prior 267-entry manifest/README retained in pre-threshold.

# Practical five-minute survey — September 11

See [run-12/FIVE-MINUTE-SURVEY.md](run-12/FIVE-MINUTE-SURVEY.md). All 42 captured venues across six dates: 252 venue-days. One 60-second interior shade gap is reproduced by the unpruned engine; it is a shallow crossing below the 50% seating threshold. Five-minute base sampling looks affordable, but endpoint-only refinement misses that gap. Full-season base count: 1,619,044 samples; computation estimate 77.8 wall minutes, not a measured seasonal run. Isolated sql-05 storage supports roughly 19–23MB single-season day relations by linear scaling; hosting headroom and detector acceptance remain open. Typecheck/lint and 248 files /2,276 tests passed. No policy/runtime/status change; previous one-second proposal remains unaccepted. Prior 251-entry manifest/README preserved in pre-survey.

# Whole-interval decision checkpoint — September 11

See [run-11/CHECKPOINT.md](run-11/CHECKPOINT.md). The bounded all-direction enclosure resolves only 1/42 supported venue-days and leaves 97.62% of supported time unresolved. Full-day 1s/5s diagnostics on three captured venues took 52.92–181.80s /10.50–40.64s respectively, n=1 per cell. Neither sampled grid proves sub-grid continuity. The report proposes an explicit one-second temporal-fidelity amendment for owner consideration; no living requirement or acceptance state changed. Typecheck/lint and 247 files /2,273 tests passed; prior 243-entry manifest/README preserved in pre-feasibility.

# Spatial pruning — September 11

See [run-10/SPATIAL-PRUNING.md](run-10/SPATIAL-PRUNING.md). A benchmark-only bounding-box rejection preserved all 1,890 captured coarse and 1,500 exact-window exposure values. Paired exact-reference runs improved by 2.35–3.97×, while retaining every evaluated millisecond. This is geometric reference optimization only; confidence metadata and temporal skipping are not equivalent or approved. Typecheck/lint and 246 files /2,270 tests passed. Earlier 236-entry manifest/README preserved in pre-broadphase.

# Exact engine reference — September 11

See [run-09/EXACT-REFERENCE.md](run-09/EXACT-REFERENCE.md). The benchmark now has a capped exhaustive millisecond adapter for the existing engine's finite Date domain. Three captured transition windows each cover all 500 represented instants. Median cost is 1.871–4.041 seconds per 500ms window; illustrative same-cost supported-day extrapolations are 40.54–87.55 hours per venue, not measured daily budgets. Recommend short-window reference use only; efficient seasonal detection remains unresolved. Prior 228-entry manifest/README preserved in pre-exhaustive. Typecheck, lint and 245 files /2,268 tests passed.

# Detection-method feasibility — September 11

See [run-08/DETECTION-METHOD.md](run-08/DETECTION-METHOD.md). A benchmark-only interval partitioner avoids false qualification with exact analytic bounds while retaining unresolved coverage. It does not provide a real solar/shadow bound adapter; production detection and budgets remain unresolved. Prior reports and the 221-entry manifest are preserved in pre-enclosure. Final checks: typecheck/lint and 244 files /2,265 tests passed.

# Captured cohort supplement — September 11

See [run-07/CAPTURED-RESULTS.md](run-07/CAPTURED-RESULTS.md), [capture provenance](capture-01/README.md) and [reproduction instructions](capture-01/REPLAY.md). September 10 read-only production capture supplies 42 venues, 1,566 resolved casters and an actual database census. September 11 offline replay adds bounded cadence comparisons and isolated sql-04 retained/edit/read evidence. Production budgets and no-gap detection remain unapproved. Earlier reports below retain their historical scope; pre-captured preserves the preceding README and 180-file manifest.

# Previous accepted-policy measurement supplement

See [run-06/WINDOW-POLICY.md](run-06/WINDOW-POLICY.md) and its README for the five-minute rule experiment. Product choices were accepted in the owner-policy decision; measurement/production budgets remain open. The root RESULTS.md v5 below is historical and has not been relabelled. run-06 adds interval-filter verification, reanalysis of 105 retained engine references, new synthetic daily adaptive costs and a 245-date adaptive run for one elevated fixture. The missed-shade-gap counterexample still prevents method acceptance. No new SQL/production evidence is claimed.

# Latest revision: Round 3 fixes (v5)

Current evidence selection: run-04 main/edge, run-05 strategy/semantics, retained sql-03. pre-r3 preserves the preceding report/audit/152-file manifest. No fourth automatic review was initiated.

R3-01: semantic capture writes nine asserted percentage/weather cells, source hashes and a successful zero-attempt completion record. Reporter checks success, exact cells, artifact/source hashes and consumes the captured ARIA/detail examples before reporting. Pin markup is rendered evidence; detail text remains explicitly source-derived. Semantic acceptance is still pending.

R3-02: strategy capture validates the selected main completion before computation, compares loaded fixture contents and current engine/measurement/package hashes to that run, and compares actual season sample instants. Published identity records fixture content hash, engine/source hashes, season hash, coordinates and the selected main artifact hashes. Reporter repeats identity validation before any cost aggregation. Same fixture IDs with different caster heights cannot substitute for measured inputs.

Run the following sequentially from C:\DEV\sunnyseat\nextjs-app. E15_OUTPUT must be a new supplemental directory; E15_MAIN_INPUT must point at an existing validated main run. The current main/edge and SQL observations were not rerun for these binding-only fixes.

```powershell
$env:E15_OUTPUT='C:\DEV\sunnyseat\_bmad-output\test-artifacts\measurements\epic-15\story-15-1\NEW-SUPPLEMENT'
$env:E15_MAIN_INPUT='C:\DEV\sunnyseat\_bmad-output\test-artifacts\measurements\epic-15\story-15-1\run-04'
npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts scripts/benchmarks/epic-15/strategy.measurement.ts
npx vitest run test/unit/benchmarks/epic-15
node scripts/benchmarks/epic-15/summarize.mjs C:\DEV\sunnyseat\_bmad-output\test-artifacts\measurements\epic-15\story-15-1 run-04 sql-03 NEW-SUPPLEMENT
```

For this revision NEW-SUPPLEMENT is run-05. Clear E15_OUTPUT before normal full-suite runs; the semantic capture intentionally refuses overwriting evidence. For a wholly new main run, execute main and edges first as described below, then point E15_MAIN_INPUT at that run and select it in the reporter. SQL reuse still requires matching original and edited datasets.

No database resource or production operation was used. Runtime and weather contracts remain unchanged. Story 15.1 is in-progress, owner criteria remain open, and 15.2 stays blocked.

Final R3 checks: typecheck/lint passed; 4 files / 19 targeted tests and 240 files / 2,249 full-suite tests passed. Report and three derived ledger/hash files reproduce byte-identically. Logs: vitest-r3-strategy.log and vitest-r3-full.log.

## Historical Round 2 record
# Latest revision: Round 2 fixes (v4)

Use RESULTS.md with run-04 and the retained sql-03 lane. pre-r2 preserves the exact previous report, ledgers, audit and 108-file manifest; earlier raw directories remain available.

R2-01 adds hash-bound, successful zero-attempt main and edge completion records. The reporter validates required artifacts and exact fixture/date, slit/date and edge/date cells before writing any derived output. Main raw checkpoints without completion cannot support a report. Edge guard and row-count assertions precede final artifact writes, and the completion marker is atomically published last. Tests reproduce absent/tainted main and edge completion with zero derived writes, plus missing/duplicate/substituted artifacts and cells.

R2-02 preserves the original all-excluded rooftop control. Two additional fixtures have effective heights 10 m and 12 m; all 14 required-date cells contain a sun/shade transition. M02-elevated.json retains the full minute oracle, three candidate comparisons, and 30 CPU/wall observations after five warmups per cell. These supplemental cases are separate from the original ten-fixture seasonal/storage matrix and do not establish representative elevated costs or physical accuracy.

Run commands sequentially from C:\DEV\sunnyseat\nextjs-app, with a NEW absolute E15_OUTPUT directory. Do not pass all runner filenames in one Vitest invocation: execution order is not dependency order.

```powershell
$env:E15_OUTPUT='C:\DEV\sunnyseat\_bmad-output\test-artifacts\measurements\epic-15\story-15-1\NEW-RUN'
npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts scripts/benchmarks/epic-15/run.measurement.ts
npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts scripts/benchmarks/epic-15/edges.measurement.ts
npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts scripts/benchmarks/epic-15/strategy.measurement.ts
npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts scripts/benchmarks/epic-15/edits.measurement.ts
npx vitest run test/unit/benchmarks/epic-15
node scripts/benchmarks/epic-15/summarize.mjs C:\DEV\sunnyseat\_bmad-output\test-artifacts\measurements\epic-15\story-15-1 NEW-RUN sql-03
```

For this revision, NEW-RUN is run-04. SQL was not rerun: the reporter requires its measured dataset hash to match the selected main dataset, and checks unchanged edit payload/input evidence against run-03. New elevated cases are excluded from retained SQL totals. Reusing these SQL measurements does not certify new storage workloads.

Attempt history: vitest-r2-measurements.log records an initial combined invocation where strategy ran before the output directory existed (ENOENT; no successful strategy artifact); main, edges and edits passed. The edge lane was then rerun after moving its count assertions before final writes; prior observations remain in run-04/edge-before-validation-order. The first successful strategy observation briefly overlapped edge oracle work and is preserved in run-04/strategy-overlap-observation. The final standalone strategy log and final edge log identify the selected runs. Never count earlier attempts as extra independent repetitions of the final n=1 strategy result.

No database resources were launched for Round 2. No production calls, runtime/schema changes or status transition. All owner gates remain pending; 15.2 remains blocked.

Final R2 verification: typecheck/lint passed; 4 files / 16 targeted tests and 240 files / 2,246 full-suite tests passed. Report, difference ledger, rounding ledger and tooling hashes reproduce byte-identically. See vitest-r2-full.log and the final runner logs.

## Historical Round 1 reproduction record
# Story 15.1 evidence package — 2026-09-10

## Latest revision: Round 1 fixes (v3)

The current RESULTS.md uses **run-03 / sql-03**. Previous raw runs and SQL remain unchanged; the former generated report, README, audit, ledgers and manifest are preserved in `pre-r1/`. The sections below this revision note record the earlier v2 execution history.

Five technical fixes were implemented without accepting any G1 decision:

1. Shared scorer requires matching sun/shade transition topology and mutually one-to-one interval matches. Missing shade fails even when boundary/duration numbers are below 120 seconds. Declared duration tolerance is transition-count ×120,000 ms and cannot waive a missing transition. Tests reproduce missed shade, splits/merges, excessive mismatch and guard failures.
2. Strategy checkpoints use `.incomplete`, `complete:false`. Only a validated 40-cell result with correct fixture/strategy/date/sample counts, valid measurements and zero attempted calls is atomically published. Reporting rejects incomplete, missing, duplicated, wrong-count or tainted evidence before writing results; projections use the validated fixture denominator.
3. +2 m seating-elevation inputs were recomputed with the existing engine at the measured timestamps, changing 5,342 samples across 36 days. SQL appends new input versions/generations/results/releases while retaining every old generation. Separate no-op and logical-edit write/WAL measurements and per-encoding retention proofs are in sql-03. This remains a synthetic storage experiment, not adaptive-coverage or production capacity proof.
4. November and December 2026 requests explicitly select seasonYear=2027; assertions compare all 245 keys to independently enumerated dates and reject February/November exclusions. See `run-03/M01-rollover.json`. The original March 1 control alone was not rollover evidence.
5. Sample counters now separate planned base, completed base, base-grid completeness and additional probes. Exhausted samples/time produce zero additional probes rather than negative counts, retaining unverified status.

Executed application commands (from nextjs-app):

```powershell
npx tsc --noEmit --incremental false
npx eslint . --quiet
$env:E15_OUTPUT = 'C:\DEV\sunnyseat\_bmad-output\test-artifacts\measurements\epic-15\story-15-1\run-03'
npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts run.measurement.ts
npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts strategy.measurement.ts
npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts edges.measurement.ts
npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts edits.measurement.ts
npx vitest run test/unit/benchmarks/epic-15
node scripts/benchmarks/epic-15/storage.mjs 0c4c5855842d e15_story15_1_run03 C:\DEV\sunnyseat\_bmad-output\test-artifacts\measurements\epic-15\story-15-1\run-03 C:\DEV\sunnyseat\_bmad-output\test-artifacts\measurements\epic-15\story-15-1\sql-03
node scripts/benchmarks/epic-15/summarize.mjs C:\DEV\sunnyseat\_bmad-output\test-artifacts\measurements\epic-15\story-15-1 run-03 sql-03
```

Baselines and final typecheck/lint passed. Thirteen targeted tests passed (4 files), including five new regressions that first failed before implementation. Main, strategy, slit and edit runners passed in 61.16 s / 75.76 s / 23.62 s / 29.78 s respectively. Final full-suite evidence is `vitest-r1-full.log`; its result is recorded in the story completion notes. E15_OUTPUT was unset for the full suite. Reruns require fresh raw-output/database names.

Guard ComposeUp returned exit 0/ok true, resource `bed8370a-61c4-491e-a4b2-9292dfc0ef7c`. The previously saved container was reused through guard validation, and a fresh isolated database was created. Stop returned exit 0/ok true/stop_requested/verified=false. Saved data remain; no shutdown polling, production activity or unguarded launch. Current benchmark environment/source provenance is in run-03/environment.json plus tooling-final-hashes.json. The shared scorer and new edit runner are included in the final tooling hashes.

The five patches correct measurement integrity. They do not resolve failed interior-window detection, representative-data gaps, semantics approval or production budgets. Story 15.1 remains in-progress; 15.2 remains blocked.

Read [RESULTS.md](RESULTS.md) for measurements, failed candidates, recommendations and the pending combined G1 decision. Story remains **in-progress**. No owner acceptance, review transition, Story 15.2, runtime change, migration, commit or deployment occurred.

## Inputs and provenance

- Branch `main`; HEAD `ed13d76a6e214f5e9f66ef5b73f8202f4406033d`.
- Existing configuration/planning/documentation changes, party-mode files and the documentation-contract test were preserved. `.codex/config.toml` SHA256 stayed `5762a365c786eb7c198f1854381fbdb1f5b1cce721c0b5b27395527823011157`; the protected test stayed `f44384f8f4a409fddb4d14a2c0fb8fe6e1e4ebc1339e425c2822d5801bb18446`.
- `run-02/environment.json` records the actual measured Node/OS/CPU/RAM, dependency/runtime/timezone versions, source hashes, dirty state and measurement boundaries. `tooling-final-hashes.json` records final tooling. Post-run additions are the independent strategy/slit lanes, input-validation hardening, reporting and a narrow Git ignore exception. The reference validation hardening rejects nonfinite values and does not change these finite measured values.
- `run-02/fixtures.json` contains every synthetic fixture and its checksum. Coordinates away from the central control are synthetic boundary controls, not actual venue captures.
- Repository searches found no captured current inventory/resolved-caster dataset in the designated fixture/artifact paths. Recorded production sources say historical full input payloads are unavailable. We did not read secrets, query production, reconstruct absent data as empty arrays or claim 42 as the current non-deleted count. Required real-data measurements are blocked pending an authorized consistent capture.
- The story was found at `_bmad-output/implementation-artifacts/15-1-measure-daylight-transition-accuracy-cpu-and-storage.md`, not the test-artifacts path in the request.

## Commands and results

All application commands ran from `C:\DEV\sunnyseat\nextjs-app`. The command runner initially ignored its declared working directory; explicit `Set-Location` was used thereafter. No files were changed by the unsuccessful initial reads.

Baseline, before edits:

```powershell
npx tsc --noEmit
npx eslint . --quiet
```

Both exited 0. The customization resolver `python3` was unavailable; the installed skill's documented fallback found the base project-context fact, empty activation hooks and no team/user overrides. No skill dependency was installed or changed.

The first new test run failed because the harness did not yet exist (RED). The next run exposed the repository setup's dependence on `window` under Node; removing the per-file Node directive fixed the test environment. The harness tests subsequently passed: 3 files, 8 tests. Measurement files use a separate Node config without browser setup.

The primary run was executed with `E15_OUTPUT` set to a new absolute directory and `npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts`. At that revision the config selected only `run.measurement.ts`. Run 01 completed in 112.61 seconds but is **superseded**: its minute candidate and reference shared implementation, and JSON parsing timings omitted validation. Run 02 completed in 95.37 seconds with an independent oracle and equal host validation. All failures/counterexamples remain raw evidence; a Vitest pass means the evidence runner completed, not that a policy passed G1.

With the final config, reproduce the lanes explicitly in order using a **new** output directory (the runners refuse primary evidence overwrite):

```powershell
$env:E15_OUTPUT = 'C:\DEV\sunnyseat\_bmad-output\test-artifacts\measurements\epic-15\story-15-1\new-run'
npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts run.measurement.ts
npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts strategy.measurement.ts
npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts edges.measurement.ts
npx vitest run test/unit/benchmarks/epic-15
```

The strategy command was executed against run-02: PASS, 135.44 seconds, 40 synthetic fixture/strategy observations (n=1 each). The edges command was executed against run-02: PASS, 38.75 seconds, 21 engine-backed slit/date cells plus exact-edge values. The targeted tests captured real pin markup into run-02 and passed. Timing experiments ran serially, outside the full-suite run. The host was not reserved or certified idle.

Full regression: `npx vitest run` passed **239 files / 2,238 tests**, 61.00 seconds; see `vitest-full.log`. The log retains existing navigation-not-implemented diagnostic output. Typecheck and lint passed again after the benchmark/report/slit additions. Final reference invalid-value hardening passed the eight targeted tests; no runtime imports the harness. The `.mjs` scripts also passed `node --check`. E2E/visual validation is not required for this unchanged-runtime measurement story.

## Isolated database lane

The resource guard launched the existing `compose.yaml` through native Windows PowerShell 5.1 using the hook's structured context. Initial shell/pipeline and missing-field errors were corrected; a later response timed out with `BROKER_UNAVAILABLE`. A single troubleshooting List confirmed `registered-start-verified`, active and owned. No bypass or unguarded database launch occurred.

- Resource: `1c959a2a-91f7-4ab4-a734-22874a5b0585`.
- Guard-assigned Compose project: `rg-277b7133668d8fc20c558d15fb9dcacd1574164b`.
- Container during execution: `0c4c5855842d`; isolated database: `e15_story15_1_run02`.
- Existing project Compose and application migrations remained unchanged. Ordinary `docker exec` commands ran only in that verified container. The benchmark created a new database and refused reuse. No production writes or experiments occurred.
- `sql-02/settings.json` records durability and database baseline; `capacity.txt` records the named-volume filesystem. Docker Desktop/WSL and other projects' containers were not changed or stopped.

Executed from the application directory:

```powershell
node scripts/benchmarks/epic-15/storage.mjs 0c4c5855842d e15_story15_1_run02 C:\DEV\sunnyseat\_bmad-output\test-artifacts\measurements\epic-15\story-15-1\run-02 C:\DEV\sunnyseat\_bmad-output\test-artifacts\measurements\epic-15\story-15-1\sql-02
```

For a rerun, obtain/reuse a verified guard-owned database using the **current actor's trusted context**, then pass its actual container ID, a fresh `e15_...` database name and fresh output directory. Do not reuse the resource identity above as launch authorization. The runner checks the managed container/repository labels and keeps SQL inside the new scratch DB. Actor ownership must also be confirmed through the guard. The fixture JSON is validated before SQL generation.

`load.sql`, `census.sql`, `churn.sql`, plans, read samples, WAL/load summary and complete relation censuses preserve exact executed SQL and observations. No cleanup/deletion command is part of reproduction. The guard Stop request returned exit 0, `ok=true`, `state=stop_requested`, `verified=false`. That is an accepted stop request, not verified shutdown; no shutdown polling was used. Containers/volumes/data are retained for user-managed reuse.

## Evidence map

| Family | Files |
|---|---|
| M01 | `run-02/M01-solar.json`, `M01-dst.json`, `M01-season.json` |
| M02/M03 | `run-02/M02-M03-geometry.json`, `M02-physical-slits.json`, `M03-adversaries.json`, `M03-limits.json`, `M03-trigger-boundaries.json`, `difference-ledger.json` |
| M04 | `run-02/M04-low-angle-deltas.json`, `M04-exact-edge-values.json`, `M04-pin-semantics.json` |
| M05 | `run-02/M05-cpu-raw.json`, `M05-cpu-summary.json`, `M05-strategies.json` |
| M06 | `run-02/M06-identical-dataset.json`, `M06-payload-decode.json`, all `sql-02/` files, `integer-rounding-ledger.json` |
| M07/G1 | `run-02/M05-M07-projections.json`, `RESULTS.md`, this README |

Generate the report from this package with the executed command:

```powershell
node scripts/benchmarks/epic-15/summarize.mjs C:\DEV\sunnyseat\_bmad-output\test-artifacts\measurements\epic-15\story-15-1
```

The current summarizer intentionally reads this package's run-02/sql-02 paths. It regenerates the result/derived ledgers, not the raw measurements. To report another experiment, first adapt those input paths; do not overwrite this run's raw evidence. All four owner signature/date fields remain pending. No canonical review gate was invoked.

R1 final full regression: **240 files / 2,243 tests passed**, exit 0; see vitest-r1-full.log. Typecheck and lint passed. Story remains in-progress and all G1 decisions remain pending.
