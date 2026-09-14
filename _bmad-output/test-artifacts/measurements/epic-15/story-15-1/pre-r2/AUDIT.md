# Story 15.1 Round 1 fix audit (v3)

- Scope: only benchmark tooling/tests/evidence and story execution record changed for these fixes. Runtime, migrations, package and Compose remain unchanged. Prior audit/report are preserved under pre-r1/.
- R1-01: missed shade/sun transitions, splits and merges fail scoring; only mutually one-to-one boundaries contribute matched errors. Explicit boundary and total duration bounds retained.
- R1-02: incomplete checkpoints cannot be reported as complete. Final strategy artifact requires all expected fixture/strategy/date/sample cells and zero attempted calls, then atomic publication. Reporter repeats validation before totals/extrapolation.
- R1-03: engine-recomputed +2 m seating inputs change 5,342 sample values and 36 days. SQL retains 350 old plus 70 edited rows per encoding and 20 input versions. No-op and changed-generation write/WAL phases are separate. This is synthetic edit storage evidence, not a representative production workload or adaptive coverage proof.
- R1-04: two explicit November/December 2026 requests select seasonYear 2027 and assert all 245 expected keys and exclusions. Standalone next-year solar calculation is separately labelled.
- R1-05: exhausted runs count completed base samples separately from additional probes, retaining incomplete-grid status.
- Verification: pre-edit and final typecheck/lint passed. Targeted 4 files / 13 tests and full suite 240 files / 2,243 tests passed. All four measurement runners and isolated SQL rerun passed. Runner success does not override failed measurement candidates.
- Safety: offline guards reported zero attempts. Guard-managed database Stop accepted (exit 0, ok true, stop_requested, verified false); saved state retained without shutdown polling.
- Completion: NOT READY. Representative inventory/caster data, adaptive operational cost, production database baseline/read-load evidence and owner G1 decisions remain open. Missed interior windows still fail the detection claim. Story remains in-progress; Story 15.2 remains blocked. No new review round or canonical review gate invoked.

The original story-context audit is unchanged. This fix audit does not establish owner acceptance.