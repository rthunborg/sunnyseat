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
