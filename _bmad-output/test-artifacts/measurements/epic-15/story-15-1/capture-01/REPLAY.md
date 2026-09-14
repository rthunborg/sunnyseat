# Reproduce the offline experiment

Run application commands from `C:\DEV\sunnyseat\nextjs-app`. Use new output directories and a new `e15_` database name; never overwrite retained evidence.

```powershell
$env:E15_CAPTURE='C:\DEV\sunnyseat\_bmad-output\test-artifacts\measurements\epic-15\story-15-1\capture-01'
$env:E15_OUTPUT='C:\DEV\sunnyseat\_bmad-output\test-artifacts\measurements\epic-15\story-15-1\NEW-CAPTURE-REPLAY'
npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts scripts/benchmarks/epic-15/captured.measurement.ts
```

Start or reuse the repository `compose.yaml` only through the resource guard with the current actor's trusted context. Verify ownership before invoking the SQL experiment. With the returned owned container ID:

```powershell
node scripts/benchmarks/epic-15/captured-storage.mjs <owned-container-id> e15_new_capture_replay <absolute-replay-directory> <absolute-new-sql-directory>
```

The wrapper validates the completed input lane and publishes source/input hashes. Only a successfully completed SQL run receives `captured-sql-completion.json`: use `publishLane` from `evidence.mjs`, `complete:true`, `offlineAttempts:0`, cell `local-sql`, and the sorted list of every SQL output file. The zero attempts refers to prohibited external calls; local Docker/psql calls are the explicit experiment. Validate the original/edit dataset identity and summary success before publication. This wrapper record binds the final outputs, not just the initial load. Request guard Stop after SQL work; preserve saved data.

```powershell
node scripts/benchmarks/epic-15/captured-report.mjs <absolute-capture-directory> <absolute-replay-directory> <absolute-sql-directory>
```

Reporter emits Markdown to stdout after checking completed lanes, source hashes and capture/dataset identities. Preserve the emitted text, hash the reporter source and compare a second regeneration in memory. The report is a bounded measurement supplement, never a production capacity approval.

The measured cohort is one date for 42 captured venues; finer scans cover three deliberately selected transition-bearing windows. It is not a full-season replay. The 250ms reference and all candidates are point-sampled models with unresolved sub-grid gaps. No confidence, live-weather, physical-survey or scheduler claim is made.
