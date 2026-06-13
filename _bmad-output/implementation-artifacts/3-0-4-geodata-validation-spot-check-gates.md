---
baseline_commit: dfbfa7c
drafted_at: 2026-06-04T19:35:12+02:00
---

# Story 3.0.4: Geodata Validation & Spot-Check Gates

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Sequencing:** This is the fourth Epic 3 Prelude story. Stories 3.0, 3.0.1, 3.0.2, and 3.0.3 are done. Complete Stories 3.0.4-3.0.6 before Story 3.1 routing work proceeds, even though Story 3.1 is already tracked as ready-for-dev.
>
> **Scope boundary:** This story defines and implements deterministic geodata validation and central spot-check gates for launch clusters. Do not implement confidence-engine scoring changes, Swedish uncertainty copy, consumer UI changes, admin upload/review surfaces, Story 3.1 routing, or Story 3.2 feedback.
>
> **Data safety:** `building_geodata/` is local/gitignored and contains large source and derived data. Keep raw geodata, generated spot-check artifacts, and local evidence there unless a small fixture is needed for tracked tests. Do not execute production Supabase imports or destructive SQL automatically.

## Story

As a **QA maintainer**,
I want deterministic geodata validation and central spot-check gates,
So that high building-shadow confidence is earned per launch cluster instead of assumed globally.

## Acceptance Criteria

**Given** MVP launch is central/south-central Gothenburg
**When** validation gates are defined
**Then** they cover Inom Vallgraven, Nordstan, Lilla Bommen, Avenyn, Vasastan, Haga, Linné, and surrounding central areas inside the MVP bbox
**And** high confidence is disabled for a cluster until at least 10 venue or street-facing test points are checked in that cluster.

**Given** shadow behaviour changes by sun angle
**When** spot checks are executed
**Then** each cluster includes morning/low-angle, midday/high-sun, and afternoon/evening directional-shadow conditions
**And** the central validation set includes at least 70 total checks.

**Given** the target is trustworthy building-shadow modelling
**When** results are evaluated
**Then** a cluster needs about 85-90% obvious building-shadow agreement before high building-shadow confidence is allowed
**And** trees, awnings, umbrellas, bridges, and temporary structures are recorded as uncertainty causes rather than silently counted as building-data failures.

**Design Gate Criteria:**
- **Visual:** No standalone visual reference. QA/data validation story.
- **Behaviour:** No direct consumer UI change unless validation status is surfaced through confidence metadata.
- **Visual validation:** Not applicable unless consumer UI files change.

## Tasks / Subtasks

- [x] **Task 1: Baseline and source-context check** (AC: all)
  - [x] 1.1 Run `cd nextjs-app && npx.cmd tsc --noEmit` before editing. Stop and surface any errors outside story scope.
  - [x] 1.2 Run `cd nextjs-app && npx.cmd eslint . --quiet` before editing. Stop and surface any errors outside story scope.
  - [x] 1.3 Read `AGENTS.md`, `project-context.md`, this story, `_bmad-output/planning-artifacts/epics.md`, `_bmad-output/planning-artifacts/prd.md`, `_bmad-output/planning-artifacts/architecture.md`, `_bmad-output/planning-artifacts/ux-design-specification.md`, `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md`, and `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-02-shadow-data-trust-realignment.md`.
  - [x] 1.4 Read the previous prelude story files: `_bmad-output/implementation-artifacts/3-0-1-shadow-data-adr-planning-realignment.md`, `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.md`, `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql`, and `_bmad-output/implementation-artifacts/3-0-3-open-geodata-import-pipeline.md`.
  - [x] 1.5 Read the current geodata pipeline: `scripts/geodata/README.md`, `scripts/geodata/shadow_caster_pipeline.py`, `scripts/geodata/testdata/shadow_caster_candidates.fixture.geojsonl`, and `scripts/geodata/tests/test_shadow_caster_pipeline.py`.
  - [x] 1.6 Confirm sprint sequencing: `3-0-4-geodata-validation-spot-check-gates` is the next Epic 3 Prelude story, Epic 3 remains `in-progress`, and Story 3.1 remains paused until Stories 3.0.4-3.0.6 complete.
  - [x] 1.7 Preserve unrelated dirty work. At draft time, prior Story 3.0.2/3.0.3 files, validation logs, `scripts/geodata/`, and `nextjs-app/lib/solar/shadow-calculation-service.ts` are present in the worktree; do not delete, rewrite, or stage unrelated local artifacts unless this story explicitly requires them.

- [x] **Task 2: Define launch cluster gates and spot-check data contract** (AC: #1, #2, #3)
  - [x] 2.1 Add a tracked QA validation home under `scripts/geodata/` or `scripts/geodata/validation/`; keep it outside client component folders and do not create an admin surface.
  - [x] 2.2 Define the launch cluster IDs, names, center coordinates, and default radius using the existing `CLUSTERS_WGS84` / `CLUSTER_RADIUS_M` concepts from `scripts/geodata/shadow_caster_pipeline.py` as the starting point.
  - [x] 2.3 Include the required clusters verbatim: Inom Vallgraven, Nordstan, Lilla Bommen, Avenyn, Vasastan, Haga, Linné, and surrounding central areas inside `EPSG:3007 x=140000..150000, y=6390000..6410000`.
  - [x] 2.4 Define a spot-check record schema with at least: stable ID, cluster ID, point type (`venue` or `street_facing`), WGS84 coordinate, optional venue slug/name, sun condition bucket, local datetime or representative time, expected building-shadow result, observed/manual result, agreement result, uncertainty causes, notes, reviewer, source artifact, and reviewed-at timestamp.
  - [x] 2.5 Define uncertainty cause values that include trees, awnings, umbrellas, bridges, temporary structures, and an `other` escape hatch with required notes.
  - [x] 2.6 Keep high-confidence gate output explicit: `blocked`, `eligible`, or `insufficient_evidence` per cluster. Do not wire this into runtime confidence scoring in this story; Story 3.0.5 owns consuming it.

- [x] **Task 3: Generate deterministic spot-check templates from current artifacts** (AC: #1, #2)
  - [x] 3.1 Use Story 3.0.3 outputs as inputs where available: filter summary, import manifest, import JSONL, and retained coverage summaries under `building_geodata/goteborg-open/derived/`.
  - [x] 3.2 Provide a command that emits a deterministic spot-check template for the central launch clusters without touching the database.
  - [x] 3.3 Ensure each cluster template contains at least 10 venue or street-facing test points before that cluster can become eligible.
  - [x] 3.4 Ensure the total central validation template contains at least 70 checks.
  - [x] 3.5 Ensure each cluster has morning/low-angle, midday/high-sun, and afternoon/evening directional-shadow buckets represented.
  - [x] 3.6 Prefer deterministic selection from existing generated records and/or a tracked small fixture. If manual points are needed for launch quality, document exactly where the local CSV/JSONL lives and keep bulk/manual evidence gitignored.
  - [x] 3.7 Make output order stable across unchanged inputs: stable cluster ordering, stable point ordering, stable numeric rounding, stable JSON key order, and no run timestamp embedded in deterministic template files.

- [x] **Task 4: Evaluate completed spot checks into cluster gate results** (AC: #1, #2, #3)
  - [x] 4.1 Add a no-DB validation/evaluation command that reads completed spot-check records and emits machine-readable JSON plus a human-readable Markdown report.
  - [x] 4.2 Fail validation when a required cluster has fewer than 10 completed checks.
  - [x] 4.3 Fail validation when the central set has fewer than 70 completed checks.
  - [x] 4.4 Fail validation when any cluster lacks one of the required sun-condition buckets.
  - [x] 4.5 Calculate per-cluster obvious building-shadow agreement and mark high building-shadow confidence eligible only at about 85-90% agreement. Use a concrete threshold in code, document it in the README/report, and explain why it satisfies the epics wording.
  - [x] 4.6 Treat uncertainty causes as separate from building-data disagreement. A check affected by tree, awning, umbrella, bridge, temporary structure, or other documented obstruction must be counted in uncertainty summaries rather than silently lowering building-data agreement.
  - [x] 4.7 Emit enough detail for Story 3.0.5 to consume later: cluster ID, status, checked count, agreement rate, missing conditions, uncertainty counts, and evidence file references.

- [x] **Task 5: Add fixtures, tests, and no-network validation coverage** (AC: all)
  - [x] 5.1 Add small tracked fixture data proving at least one eligible cluster, one insufficient-evidence cluster, and one blocked/low-agreement cluster.
  - [x] 5.2 Add Python unit tests or no-network smoke tests for schema validation, required cluster coverage, per-cluster minimums, sun-condition bucket coverage, central total minimums, agreement thresholding, uncertainty cause separation, and deterministic report generation.
  - [x] 5.3 Add tests proving uncertainty causes do not silently count as building-data failures.
  - [x] 5.4 Add tests proving malformed rows fail clearly: missing cluster ID, unknown uncertainty cause, missing notes for `other`, invalid point type, invalid agreement value, invalid coordinate, or missing required sun-condition bucket.
  - [x] 5.5 Compile/check Python scripts with `python -m py_compile`.
  - [x] 5.6 Keep existing app-level tests green. If runtime TypeScript or SQL-contract tests are touched, run the relevant Vitest files plus the full suite.

- [x] **Task 6: Document QA runbook and downstream handoff** (AC: all)
  - [x] 6.1 Update `scripts/geodata/README.md` or add a focused runbook documenting the spot-check template command, evaluation command, input files, output files, PowerShell examples, and pass/fail semantics.
  - [x] 6.2 State clearly that generated spot-check evidence and local observation files are not production imports and remain gitignored unless deliberately reduced to small fixtures.
  - [x] 6.3 Document how a maintainer records manual observations, including how to mark trees, awnings, umbrellas, bridges, and temporary structures as uncertainty causes.
  - [x] 6.4 Document that review/quarantine shadow-caster rows remain inactive until approved by spot-check evidence and that this story only emits gate artifacts, not live DB changes.
  - [x] 6.5 Document the downstream contract for Story 3.0.5: where to find cluster validation status, what fields are stable, and how high-confidence eligibility should be consumed.

- [x] **Task 7: Preserve boundaries and final verification** (AC: all)
  - [x] 7.1 Do not modify `nextjs-app/lib/solar/shadow-calculation-service.ts` unless needed to keep existing tests passing. Story 3.0.5 owns coverage-aware confidence semantics.
  - [x] 7.2 Do not add user-facing Swedish uncertainty copy, About-page copy, confidence UI changes, or visual references. Story 3.0.6 owns user-facing uncertainty copy.
  - [x] 7.3 Do not add routing, feedback, review, favourites, premium, payment, admin auth, admin upload, or candidate review queue functionality.
  - [x] 7.4 Run `cd nextjs-app && npx.cmd tsc --noEmit`.
  - [x] 7.5 Run `cd nextjs-app && npx.cmd eslint . --quiet`.
  - [x] 7.6 Run `cd nextjs-app && npx.cmd vitest run`.
  - [x] 7.7 Run story-specific Python compile/tests/validation commands documented in this story's completion notes.
  - [x] 7.8 Run `cd nextjs-app && npm run build` only if runtime TypeScript, API routes, package files, or Next configuration changed. If only scripts/docs/tests changed, document the skip rationale.
  - [x] 7.9 Before changing sprint status to `review`, run `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-4-geodata-validation-spot-check-gates`.

### Review Findings

- [x] [Review][Patch] Require enough non-uncertain building-shadow agreement before marking a cluster eligible [scripts/geodata/shadow_caster_pipeline.py:1918]
- [x] [Review][Patch] Do not mark cluster validation eligible while the central 70-check gate is failing [scripts/geodata/shadow_caster_pipeline.py:1927]
- [x] [Review][Patch] Validate `agreement_result` against expected and observed shadow results [scripts/geodata/shadow_caster_pipeline.py:1834]
- [x] [Review][Patch] Require explicit uncertainty causes for uncertain checks and prevent causes on agree/disagree rows from hiding failures [scripts/geodata/shadow_caster_pipeline.py:1847]
- [x] [Review][Patch] Validate stable spot-check identity and evidence fields, including `spot_check_id`, representative time, and `source_artifact` [scripts/geodata/shadow_caster_pipeline.py:1798]
- [x] [Review][Patch] Reject duplicate `spot_check_id` values before counting per-cluster and central evidence [scripts/geodata/shadow_caster_pipeline.py:1875]
- [x] [Review][Patch] Verify spot-check coordinates fall inside the declared cluster and MVP bbox [scripts/geodata/shadow_caster_pipeline.py:1624]
- [x] [Review][Patch] Stop treating shadow-caster building centroids as venue or street-facing spot-check points [scripts/geodata/shadow_caster_pipeline.py:1740]
- [x] [Review][Patch] Avoid hardcoded sun-bucket expectations that are not actual model or reviewed expected results [scripts/geodata/shadow_caster_pipeline.py:1741]
- [x] [Review][Patch] Prevent `--no-require-all-clusters` reports from passing as full launch-cluster gates [scripts/geodata/shadow_caster_pipeline.py:2019]

## Dev Notes

### Current Geodata Pipeline Handoff

- Tracked pipeline home: `scripts/geodata/`.
- Current CLI: `python scripts/geodata/shadow_caster_pipeline.py derive|validate|filter|emit-import|validate-artifacts|run-all`.
- Raw and generated geodata remain under `building_geodata/goteborg-open/` and are gitignored.
- Story 3.0.3 local outputs recorded 56,756 include rows, 1,975 review rows, and 23,839 excluded diagnostics after the review-fix pipeline run.
- `scripts/geodata/shadow_caster_pipeline.py` already defines launch cluster centers and retained coverage summaries. Use those as the starting point, but this story must add actual pass/fail spot-check gates rather than only retained-coverage counts.
- Existing Python tests cover filtering, contract mapping, deterministic summaries, import artifact generation, artifact validation, SQL handoff safety, and DTM boundary indexing. Extend this style with no-network validation tests.

### Shadow Data Trust Rules

- MVP launch scope remains the central EPSG:3007 bbox: `x=140000..150000, y=6390000..6410000`.
- Runtime building shadows use filtered/active `shadow_casters` records only.
- Review/quarantine records remain inactive until approved by validation evidence; excluded records are diagnostics only.
- High building-shadow confidence is cluster-scoped. It is not globally enabled because the import pipeline produced many plausible rows.
- The ADR requires at least 10 checked venue or street-facing points per launch cluster, all three sun-condition buckets per cluster, at least 70 central checks, and about 85-90% obvious building-shadow agreement before high confidence is allowed.
- Trees, awnings, umbrellas, bridges, seasonal furniture, and temporary structures are known unmodelled obstructions. Record them as uncertainty causes; do not count them as silent building-data failures.

### Architecture and Safety Guardrails

- This is QA/data-validation tooling. It should live in scripts/docs/tests, not in client components.
- Client components must not import from `nextjs-app/lib/solar`, `nextjs-app/lib/weather`, `nextjs-app/lib/supabase`, `nextjs-app/lib/middleware`, or `nextjs-app/lib/buildings`.
- Do not add admin upload UI/API, admin auth, or a candidate review queue. Venue and geodata maintenance remain reviewed direct operations.
- Do not execute live Supabase imports or write production data automatically. If local DB smoke checks are added, guard them behind explicit opt-in and document exactly what was run.
- Do not depend on Future Monetization, Swish, premium state, payment routes, or paywall code.

### Suggested Implementation Shape

- Keep one primary Python entry point if possible, either extending `scripts/geodata/shadow_caster_pipeline.py` with validation subcommands or adding a focused module invoked from it.
- Suggested subcommands: `emit-spot-check-template` and `evaluate-spot-checks`.
- Suggested deterministic local outputs under `building_geodata/goteborg-open/derived/`:
  - `shadow_caster_spot_checks.template.jsonl`
  - `shadow_caster_spot_checks.results.jsonl`
  - `shadow_caster_cluster_validation.json`
  - `shadow_caster_cluster_validation.md`
- Suggested tracked fixtures under `scripts/geodata/testdata/`:
  - `spot_checks.fixture.jsonl`
  - optional expected validation summary JSON.
- Keep schema names stable enough for Story 3.0.5 to consume. If names change during implementation, update the runbook and story completion notes.

### References

- `AGENTS.md`
- `project-context.md`
- `_bmad-output/planning-artifacts/epics.md` - Epic 3 Prelude and Story 3.0.4 ACs.
- `_bmad-output/planning-artifacts/prd.md` - Shadow Data Trust Realignment and risk mitigation.
- `_bmad-output/planning-artifacts/architecture.md` - Shadow Caster Data Architecture, Runtime Data Contract, and Shadow Caster Lookup data flow.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - confidence as honest expectation calibration; no direct UI work for this QA/data story.
- `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md` - accepted ADR and validation gates.
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-02-shadow-data-trust-realignment.md`
- `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.md`
- `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql`
- `_bmad-output/implementation-artifacts/3-0-3-open-geodata-import-pipeline.md`
- `scripts/geodata/README.md`
- `scripts/geodata/shadow_caster_pipeline.py`
- `scripts/geodata/tests/test_shadow_caster_pipeline.py`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex (Codex desktop)

### Debug Log References

- Draft baseline before story creation: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Draft baseline before story creation: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Draft BMAD config load returned `user_name=Rasmus`, `communication_language=English`, and `document_output_language=English`.
- Draft sprint-status scan identified `3-0-4-geodata-validation-spot-check-gates` as the next backlog story; Story 3.1 remains paused behind the Epic 3 Prelude.
- Draft worktree check found existing prior-story artifacts and geodata tooling in the local worktree; they were treated as current local context and preserved.
- Draft deferred-work scan found no carry-in item targeting Story 3.0.4.
- Implementation baseline before edits: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Implementation baseline before edits: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Source-context check read the required project, planning, ADR, sprint-change, previous prelude story, SQL contract, geodata README, pipeline, fixture, and test files.
- Sprint sequencing confirmed: `3-0-4-geodata-validation-spot-check-gates` is the next Epic 3 Prelude story, Epic 3 remains `in-progress`, and Story 3.1 remains paused until Stories 3.0.4-3.0.6 complete.
- Red phase: `python -m unittest discover -s scripts/geodata/tests` failed as expected on missing `command_emit_spot_check_template`, `evaluate_spot_check_rows`, `command_evaluate_spot_checks`, and `validate_spot_check_row`.
- Green/refactor phase: added deterministic spot-check template generation, completed-record validation, cluster gate evaluation, Markdown/JSON report writing, and CLI parser commands.
- Story-specific template generation: `python scripts/geodata/shadow_caster_pipeline.py emit-spot-check-template` passed and emitted 80 rows to `building_geodata/goteborg-open/derived/shadow_caster_spot_checks.template.jsonl`.
- Story-specific Python compile check: `python -m py_compile scripts/geodata/shadow_caster_pipeline.py` passed.
- Story-specific Python tests: `python -m unittest discover -s scripts/geodata/tests` passed (16 tests).
- Final verification: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Final verification: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Final verification: `cd nextjs-app && npx.cmd vitest run` passed (42 files / 367 tests).
- Build skip rationale: `cd nextjs-app && npm run build` was not run because this story changed tracked scripts/docs/tests/story metadata only; no runtime TypeScript, API routes, package files, or Next configuration were changed by this story.
- Story review gate: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-4-geodata-validation-spot-check-gates` passed; lint, typecheck, and Vitest passed; visual validation skipped because no mapped screen ID was found; sprint status moved `in-progress -> review`; validation log generated at `_bmad-output/implementation-artifacts/validation/3-0-4-geodata-validation-spot-check-gates-review-20260605-095418.log`.
- Review follow-up: Round 1 BMAD review found 10 patch findings. Batch fix applied stricter completed-row schema validation, cluster/bbox coordinate checks, duplicate evidence detection, agreement consistency checks, uncertainty semantics, central gate status handling, pending-template expectation handling, and partial-scope report failure semantics.
- Review follow-up verification: `python -m unittest discover -s scripts/geodata/tests` passed (19 tests).
- Review follow-up verification: `python -m py_compile scripts/geodata/shadow_caster_pipeline.py` passed.
- Review follow-up verification: `python scripts/geodata/shadow_caster_pipeline.py emit-spot-check-template` passed and regenerated the local gitignored template artifact.
- Review follow-up verification: `cd nextjs-app && npx.cmd tsc --noEmit`, `cd nextjs-app && npx.cmd eslint . --quiet`, and `cd nextjs-app && npx.cmd vitest run` passed (42 files / 367 tests).
- Review follow-up story gate: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-4-geodata-validation-spot-check-gates` passed; lint, typecheck, and Vitest passed; visual validation skipped because no mapped screen ID was found; sprint status was already `review`; validation log generated at `_bmad-output/implementation-artifacts/validation/3-0-4-geodata-validation-spot-check-gates-review-20260605-173406.log`.

### Completion Notes List

- Story drafted by Codex on 2026-06-04.
- Acceptance criteria are preserved verbatim from `_bmad-output/planning-artifacts/epics.md`.
- Draft analysis confirmed this is a QA/data-validation story with no standalone visual reference and no visual validation requirement.
- Draft analysis confirmed implementation should build on `scripts/geodata/` from Story 3.0.3 and emit deterministic validation evidence for Story 3.0.5 to consume later.
- Story-file-audit: all seven checks pass.
- Task 1 complete: baseline typecheck/lint passed before implementation edits; required project/planning/ADR/sprint-change/previous-story/geodata context loaded; Story 3.1 remains paused behind the Epic 3 Prelude; unrelated dirty work was preserved.
- Task 2 complete: extended the tracked `scripts/geodata/` pipeline with explicit launch cluster metadata, including Inom Vallgraven, Nordstan, Lilla Bommen, Avenyn, Vasastan, Haga, Linné, and surrounding central areas. Added a stable spot-check schema and explicit `blocked` / `eligible` / `insufficient_evidence` gate statuses without wiring runtime confidence.
- Task 3 complete: added `emit-spot-check-template`, which reads Story 3.0.3 import artifacts and emits a deterministic 80-row central template with 10 rows per cluster and all three sun-condition buckets represented. Generated local template output remains under gitignored `building_geodata/goteborg-open/derived/`.
- Task 4 complete: added `evaluate-spot-checks`, which validates completed rows, fails missing evidence/buckets/central totals, applies an 85% high-confidence eligibility threshold, separates uncertainty causes from building-data disagreement, and writes JSON/Markdown handoff artifacts for Story 3.0.5.
- Task 5 complete: added tracked spot-check fixture coverage for eligible, insufficient-evidence, and blocked clusters; added no-network unit tests for deterministic template output, schema validation failures, central/per-cluster gates, agreement thresholding, uncertainty separation, and deterministic reports.
- Task 6 complete: updated `scripts/geodata/README.md` with PowerShell commands, input/output paths, schema fields, uncertainty cause recording, pass/fail semantics, the 85% threshold rationale, evidence-gitignore guidance, inactive review/quarantine caveat, and the Story 3.0.5 downstream contract.
- Task 7 complete: no runtime solar/confidence, UI, admin, routing, feedback, review, premium/payment, or live DB functionality was changed. Typecheck, lint, Vitest, Python compile/tests, and local template generation passed; build skipped per story rule because no runtime app/package/config files changed.

### File List

- `_bmad-output/implementation-artifacts/3-0-4-geodata-validation-spot-check-gates.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `scripts/geodata/README.md`
- `scripts/geodata/shadow_caster_pipeline.py`
- `scripts/geodata/testdata/spot_checks.fixture.jsonl`
- `scripts/geodata/tests/test_shadow_caster_pipeline.py`
- Local-only generated geodata artifact: `building_geodata/goteborg-open/derived/shadow_caster_spot_checks.template.jsonl`
- Local-only generated validation artifact: `_bmad-output/implementation-artifacts/validation/3-0-4-geodata-validation-spot-check-gates-review-20260605-095418.log`
- Local-only generated validation artifact: `_bmad-output/implementation-artifacts/validation/3-0-4-geodata-validation-spot-check-gates-review-20260605-173406.log`

## Change Log

| Date | Author | Note |
|------|--------|------|
| 2026-06-04 | Bob | Story drafted from Epic 3 Prelude source ACs, accepted shadow-data ADR, sprint-change proposal, Story 3.0.3 geodata pipeline handoff, and current project context. Status -> ready-for-dev. |
| 2026-06-04 | Bob | Story-file-audit completed with all seven checks passing. |
| 2026-06-05 | Amelia | Started implementation, completed baseline/source-context check, and moved status to in-progress. |
| 2026-06-05 | Amelia | Added deterministic spot-check template generation, cluster gate evaluation, fixture coverage, tests, runbook updates, and local no-DB template output. |
| 2026-06-05 | Amelia | Final verification and story review gate passed. Status -> review. |
| 2026-06-05 | Codex | Applied BMAD review Round 1 fixes for spot-check validation semantics, evidence identity, cluster/bbox checks, and partial-gate handling. |
| 2026-06-05 | Codex | Final review gate passed after Round 1 fixes. Status -> done. |
