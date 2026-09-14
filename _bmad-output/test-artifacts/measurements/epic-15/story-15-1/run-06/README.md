# Five-minute policy measurement supplement

This benchmark is limited to Story 15.1 and the accepted owner-policy amendment. It does not change runtime, schema or the weather contract. The root RESULTS.md v5 remains historical; WINDOW-POLICY.md in this directory is the new supplement.

From C:\DEV\sunnyseat\nextjs-app, run sequentially with a NEW output directory:

```powershell
$env:E15_OUTPUT='C:\DEV\sunnyseat\_bmad-output\test-artifacts\measurements\epic-15\story-15-1\NEW-WINDOW-RUN'
$env:E15_MAIN_INPUT='C:\DEV\sunnyseat\_bmad-output\test-artifacts\measurements\epic-15\story-15-1\run-04'
npx vitest run --config scripts/benchmarks/epic-15/vitest.config.ts scripts/benchmarks/epic-15/windows.measurement.ts
node scripts/benchmarks/epic-15/window-report.mjs C:\DEV\sunnyseat\_bmad-output\test-artifacts\measurements\epic-15\story-15-1 NEW-WINDOW-RUN
```

Current directory is run-06. The runner refuses reuse; reporting requires successful completion, zero attempted calls, required artifacts, exact comparison cells and matching source/input/owner-policy hashes. Report regeneration is allowed and deterministic; raw files are not overwritten.

Measurements distinguish 105 retained engine-reference reanalyses, exact analytic signals, new minute/adaptive daily CPU observations (3 fixtures ×7 dates, n=5) and one synthetic full-season adaptive calculation (245 dates, n=1). Filter-only timing uses 1,000 operations per batch. Reference discovery blind spots, duration uncertainty and failed candidates remain visible; completion never certifies detection.

No current consistent venue/caster inventory or actual database-size baseline was found in the inspected local fixture/evidence paths. Existing building geodata is not a resolved venue inventory. No production query or new database experiment was performed. sql-03 remains the prior synthetic storage measurement; no new derived-window database encoding, production budgets or traffic/headroom limits are claimed.

Unset E15_OUTPUT before normal unit/full-suite tests to avoid attempting semantic evidence capture into this directory. Do not run other benchmark workloads concurrently with the timed runner. All prior raw evidence and owner-decision history are preserved. Combined G1 and Story 15.2 remain blocked pending measured method/operational acceptance.