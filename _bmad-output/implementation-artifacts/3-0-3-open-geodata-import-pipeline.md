---
baseline_commit: dfbfa7c
drafted_at: 2026-06-04T16:17:57+02:00
---

# Story 3.0.3: Open Geodata Import Pipeline

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Sequencing:** This is the third Epic 3 Prelude story. Stories 3.0, 3.0.1, and 3.0.2 are done. Complete Stories 3.0.3-3.0.6 before Story 3.1 routing work proceeds, even though Story 3.1 is already tracked as ready-for-dev.
>
> **Scope boundary:** This story promotes the local open-geodata prototype into a repeatable import pipeline and creates reviewable import artifacts for the `shadow_casters` contract. Do not implement spot-check gates, confidence-engine coverage semantics, Swedish uncertainty copy, consumer UI changes, admin upload surfaces, or Story 3.1 routing.
>
> **Data safety:** `building_geodata/` is local/gitignored and contains large source and derived data. Keep raw data and generated bulk outputs there. Promote only reusable scripts, fixtures, docs, and small deterministic contract tests into tracked paths. Do not execute production Supabase imports or destructive SQL automatically.

## Story

As a **backend maintainer**,
I want the local open-geodata prototype promoted into a repeatable import pipeline,
So that central MVP shadow-caster records can be regenerated, validated, and imported without ad hoc scripts.

## Acceptance Criteria

**Given** the current prototype scripts live under `building_geodata/goteborg-open/tools/`
**When** the production import pipeline is created
**Then** it derives height candidates from the existing GeoPackage, Baskarta `byggnad_l`, and Höjdmodell 2022 DTM tiles
**And** it emits WGS84 polygon runtime geometry plus source/provenance metadata
**And** it preserves the EPSG:3007 bbox and CRS transformations explicitly.

**Given** runtime should start conservatively
**When** filtering runs
**Then** it splits candidates into include, review, and exclude sets
**And** MVP defaults exclude tiny/tall suspicious records, records below the 3 m meaningful-height threshold, and low-quality small `Komplementbyggnad` records.

**Given** future source refreshes are expected
**When** the pipeline runs
**Then** it produces deterministic summaries and validation artifacts suitable for review before import.

**Design Gate Criteria:**
- **Visual:** No standalone visual reference. Backend/import story.
- **Behaviour:** No direct consumer UI change.
- **Visual validation:** Not applicable.

## Tasks / Subtasks

- [x] **Task 1: Baseline and source-context check** (AC: all)
  - [x] 1.1 Run `cd nextjs-app && npx.cmd tsc --noEmit` before editing. Stop and surface any errors outside story scope.
  - [x] 1.2 Run `cd nextjs-app && npx.cmd eslint . --quiet` before editing. Stop and surface any errors outside story scope.
  - [x] 1.3 Read `AGENTS.md`, `project-context.md`, this story, `_bmad-output/planning-artifacts/epics.md`, `_bmad-output/planning-artifacts/prd.md`, `_bmad-output/planning-artifacts/architecture.md`, `_bmad-output/planning-artifacts/ux-design-specification.md`, `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md`, `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-02-shadow-data-trust-realignment.md`, and `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.md`.
  - [x] 1.4 Read the local prototype README and scripts: `building_geodata/goteborg-open/README.md`, `tools/derive_building_height_candidates.py`, `tools/validate_height_candidates.py`, and `tools/filter_shadow_caster_candidates.py`.
  - [x] 1.5 Confirm sprint sequencing: `3-0-3-open-geodata-import-pipeline` is the next Epic 3 Prelude implementation story, Epic 3 remains `in-progress`, and Story 3.1 remains paused until Stories 3.0.3-3.0.6 complete.
  - [x] 1.6 Preserve unrelated dirty work. At draft time, Story 3.0.2 artifacts and generated validation logs are present in the worktree; do not delete, rewrite, or stage unrelated local artifacts unless explicitly required.

- [x] **Task 2: Promote the local prototype into a tracked repeatable pipeline** (AC: #1, #3)
  - [x] 2.1 Create a tracked geodata pipeline home under `scripts/geodata/` or another clearly documented root-level non-runtime scripts path. Do not place this in client component folders and do not recreate an admin upload/API path.
  - [x] 2.2 Reuse the existing prototype logic rather than rewriting from scratch: GeoPackage footprint parsing, Baskarta `byggnad_l` Z-line matching, DTM sampling, validation summaries, and conservative include/review/exclude filtering.
  - [x] 2.3 Provide a single documented command surface, preferably one Python entry point with subcommands such as `derive`, `validate`, `filter`, `emit-import`, and `run-all`, so a maintainer can regenerate artifacts from raw inputs deterministically.
  - [x] 2.4 Keep all large raw inputs and generated bulk outputs under `building_geodata/goteborg-open/` or another gitignored geodata workspace. Tracked files may include scripts, README/runbook, requirements, small fixtures, and tests only.
  - [x] 2.5 Document local Python dependencies and tested versions. Draft-time local versions are: pyshp 3.0.9, Shapely 2.1.2, pyproj 3.7.2, tifffile 2026.6.1, imagecodecs 2026.5.10.
  - [x] 2.6 Add a pipeline README/runbook with required input files, expected output files, exact commands, Windows PowerShell examples, and a clear statement that raw source data remains gitignored.

- [x] **Task 3: Preserve source inputs, CRS handling, and WGS84 runtime geometry explicitly** (AC: #1)
  - [x] 3.1 Keep the MVP bbox explicit and configurable with the default `EPSG:3007 x=140000..150000, y=6390000..6410000`.
  - [x] 3.2 Preserve the source chain: `building_geodata/byggnad_kn1480.gpkg` footprints + Göteborg Baskarta SHP `byggnad_l` line types `Takkonturer`, `Fasad`, and `Skärmtak` + Höjdmodell 2022 DTM tiles `639_14` and `640_14`.
  - [x] 3.3 Preserve CRS metadata in every summary/manifest: source footprint CRS EPSG:3006, metric processing CRS EPSG:3007, runtime geometry CRS EPSG:4326, and the exact bbox.
  - [x] 3.4 Continue using WGS84 `Polygon` runtime geometry reduced to the largest polygon part from source footprints for compatibility with the current TypeScript shadow engine.
  - [x] 3.5 Keep metric helpers in import output: `bbox_3007` and `centroid_3007`. Do not use WGS84 degree distance where a meter distance is required.
  - [x] 3.6 Use pyproj `Transformer.from_crs(..., always_xy=True)` for lon/x then lat/y axis order. Do not rely on implicit CRS axis order.
  - [x] 3.7 Treat Shapely `STRtree` results as indices for Shapely 2.x. Keep any compatibility shim only if it is covered by a test and documented.
  - [x] 3.8 Keep Baskarta Z values from the shapefile record geometry (`shape.z`), not from Shapely geometries; Shapely spatial indexing is two-dimensional and must not be treated as a Z carrier.

- [x] **Task 4: Map pipeline output to the Story 3.0.2 `shadow_casters` contract** (AC: #1, #2, #3)
  - [x] 4.1 Read `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql` and map generated properties to its columns instead of creating a competing schema.
  - [x] 4.2 Emit import-ready rows with at least: `geometry`, `height_m`, `ground_z_rh2000`, `roof_z_rh2000`, `height_method`, `height_source`, `source_dataset`, `source_external_id`, `source_footprint_fid`, `source_object_type`, `source_purpose`, `source_geometry_type`, `source_object_metadata`, `engine_geometry_method`, `runtime_geometry_crs`, `metric_crs`, `provenance_metadata`, `quality_score`, `shadow_caster_tier`, `filter_decision`, `filter_reasons`, `source_flags`, `matched_line_count`, `z_spread_m`, `bbox_3007`, `centroid_3007`, `caster_class`, `source_priority`, `active`, `import_batch_id`, `imported_at`, and `updated_at`.
  - [x] 4.3 Use the conservative runtime defaults from the ADR and Story 3.0.2 SQL: include rows are `active = true`, `filter_decision = 'include'`, `height_m >= 3`, `caster_class = 'building'`; review rows are inactive; excluded rows are inactive diagnostics or omitted from DB import.
  - [x] 4.4 Do not set `source_object_metadata.logicalObjectId` from a source-local ID. Story 3.0.2 defines `logicalObjectId` as a globally normalized canonical key; use `source_footprint_fid` and `source_external_id` for source-local identity unless a true canonical key exists.
  - [x] 4.5 Define source-priority constants in one place and document that lower numeric priority wins. The current open-derived Göteborg path must sit below manual verified overrides, paid LOD2/LOD3, and paid DSM/LAS, and above OSM/heuristic fallback.
  - [x] 4.6 Preserve source metadata such as `areaM2`, `baskartaZStats`, source filenames/checksums, match buffer, DTM tile IDs, and derivation method in `source_object_metadata` or `provenance_metadata` as appropriate.
  - [x] 4.7 Produce a small tracked fixture and contract test proving one include row, one review row, and one excluded row map to the expected `shadow_casters` shape and active/filter decisions.

- [x] **Task 5: Harden conservative filtering and deterministic summaries** (AC: #2, #3)
  - [x] 5.1 Preserve existing include/review/exclude split outputs and make their paths deterministic.
  - [x] 5.2 Keep existing exclusion/review rules for below-3 m heights, tiny/tall records, extreme height, large Z spread, no-roof-contour material heights, and limited line support.
  - [x] 5.3 Add the Story 3.0.3-specific MVP default for low-quality small `Komplementbyggnad` records. If the exact threshold is not already established, document the chosen rule in the pipeline README and summary output rather than hiding it in code.
  - [x] 5.4 Generate machine-readable and human-readable summaries for candidate derivation, validation, filter decisions, import-ready rows, and source manifest.
  - [x] 5.5 Make summaries stable across runs with unchanged inputs: stable sort order, stable numeric rounding, deterministic timestamps or clearly separated run timestamps, and stable JSON key order.
  - [x] 5.6 Include launch-cluster retained coverage summaries for Inom Vallgraven, Nordstan, Lilla Bommen, Avenyn, Vasastan, Haga, and Linné. Story 3.0.4 owns spot-check pass/fail gates; this story only emits reviewable evidence.
  - [x] 5.7 Include counts that reconcile end-to-end: footprints read, footprints inside bbox, candidate rows, include rows, review rows, excluded rows, and import-ready rows.

- [x] **Task 6: Create a safe import handoff without executing production imports automatically** (AC: #1, #3)
  - [x] 6.1 Produce import artifacts suitable for local review before DB import, for example JSONL/CSV plus a manifest. Do not commit large generated import files.
  - [x] 6.2 Produce a manual import runbook or generated SQL handoff that works with the Story 3.0.2 `shadow_casters` table and states exactly which files are imported by default.
  - [x] 6.3 Do not use server-side `COPY FROM '/local/path'` for local files on Supabase. If a Postgres import command is documented, use a client-side `psql \copy` or another client-side loader pattern so file access is from the maintainer machine.
  - [x] 6.4 If the pipeline offers DB import execution, guard it behind an explicit flag and environment variable, require a dry-run summary first, avoid committing secrets, and default to no live DB writes.
  - [x] 6.5 Register or emit `shadow_caster_import_batches` metadata consistently with the Story 3.0.2 SQL contract. Include source dataset, source description, source metadata, input checksums, row counts, and completion status.
  - [x] 6.6 Add post-import smoke-check commands for Rasmus to run manually: row counts by `filter_decision`/`active`, active rows below 3 m, active review/exclude rows, invalid geometry, missing source dataset, and a sample `get_buildings_near_point(57.7089, 11.9746, 200)` query.

- [x] **Task 7: Add focused tests and validation commands** (AC: all)
  - [x] 7.1 Add Python unit tests or a small no-network smoke test for property-to-contract mapping, filtering decisions, deterministic summary generation, and CRS/bbox metadata.
  - [x] 7.2 Add a command that validates generated artifacts without touching the database. It must fail if counts do not reconcile, include rows violate runtime-active safeguards, or required provenance fields are missing.
  - [x] 7.3 Compile/check Python scripts with `python -m py_compile` or equivalent.
  - [x] 7.4 Keep existing app-level tests green. If runtime TypeScript or SQL-contract tests are touched, run the relevant Vitest files plus the full suite.
  - [x] 7.5 Do not add Playwright or visual tests unless consumer UI files change.

- [x] **Task 8: Preserve downstream prelude boundaries and final verification** (AC: all)
  - [x] 8.1 Do not modify `nextjs-app/lib/solar/shadow-calculation-service.ts` unless needed to keep Story 3.0.2 tests passing. Story 3.0.5 owns empty-coverage confidence semantics.
  - [x] 8.2 Do not implement cluster validation pass/fail storage, spot-check scoring, or high-confidence enablement. Story 3.0.4 owns that.
  - [x] 8.3 Do not add user-facing Swedish uncertainty copy, About-page copy, or confidence UI changes. Story 3.0.6 owns that.
  - [x] 8.4 Preserve Story 3.0 manual-operations decision: no admin page, no admin venue/building upload API, no admin auth, no candidate review queue.
  - [x] 8.5 Run `cd nextjs-app && npx.cmd tsc --noEmit`.
  - [x] 8.6 Run `cd nextjs-app && npx.cmd eslint . --quiet`.
  - [x] 8.7 Run `cd nextjs-app && npx.cmd vitest run`.
  - [x] 8.8 Run story-specific Python tests/validation commands documented in this story's completion notes.
  - [x] 8.9 Run `cd nextjs-app && npm run build` only if runtime TypeScript, API routes, package files, or Next configuration changed. If only scripts/docs/tests changed, document the skip rationale.
  - [x] 8.10 Before changing sprint status to `review`, run `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-3-open-geodata-import-pipeline`.

### Review Findings

- [x] [Review][Patch] Generated Python cache files are unignored [.gitignore:38]
- [x] [Review][Patch] SQL handoff is not idempotent for repeated imports [scripts/geodata/shadow_caster_pipeline.py:1340]
- [x] [Review][Patch] Artifact validation accepts invalid runtime polygons [scripts/geodata/shadow_caster_pipeline.py:1467]
- [x] [Review][Patch] Import provenance omits required raw-source and match metadata [scripts/geodata/shadow_caster_pipeline.py:723]
- [x] [Review][Patch] SQL handoff string literals are not escaped consistently [scripts/geodata/shadow_caster_pipeline.py:1326]
- [x] [Review][Patch] Import batch hash depends on local path strings [scripts/geodata/shadow_caster_pipeline.py:180]
- [x] [Review][Patch] DTM sampler lacks boundary/indexing regression coverage [scripts/geodata/shadow_caster_pipeline.py:108]

## Dev Notes

### Current Prototype Snapshot

- Local prototype path: `building_geodata/goteborg-open/tools/`.
- Raw/derived geodata path: `building_geodata/goteborg-open/`; this tree is intentionally gitignored.
- Existing derivation reads `building_geodata/byggnad_kn1480.gpkg`, Baskarta `raw/baskarta/shp-extract/byggnad_l`, and DTM ZIPs `hojdmodell_2022_639_14.zip` and `hojdmodell_2022_640_14.zip`.
- Existing candidate output: `building_geodata/goteborg-open/derived/buildings_central_639_14_640_14_height_candidates.geojsonl`.
- Existing filter outputs: `buildings_central_shadow_casters.filtered.geojsonl`, `.review.geojsonl`, `.excluded.geojsonl`, `.filter_summary.json`, and `.filter_summary.md`.
- Latest local candidate summary: 177,237 footprints read, 86,828 inside bbox, 82,570 emitted candidates, 2,845 implausible heights rejected, 1,258 no matched Z, 155 missing ground Z.
- Latest local filter summary: 56,776 include rows, 1,980 review rows, 23,814 excluded rows.
- Central retained coverage currently looks plausible, but Story 3.0.4 must still validate it with spot checks before high confidence is allowed.

### Story 3.0.2 Contract Handoff

- `3-0-2-shadow-caster-schema-rpc-contract.sql` is the current manual-run schema/RPC handoff. It creates `shadow_casters`, `shadow_caster_import_batches`, and a `get_buildings_near_point` compatibility RPC.
- The RPC returns current TypeScript `Building` compatibility fields and reads only runtime-active records.
- `source_priority` is lower-is-better. Do not erase lower-priority fallback/source-comparison records.
- Active rows must be include rows, height >= 3 m, valid WGS84 polygons, non-empty source dataset, and MVP-approved caster classes.
- Review rows must be inactive. Excluded rows must be inactive diagnostics or omitted from DB import.
- The Round 3 deferred Story 3.0.2 finding belongs to Story 3.0.5: empty successful caster coverage can still mean unknown/missing coverage, not high-confidence full sun.

### Architecture and Safety Guardrails

- This is backend/import tooling. No client component should import geodata, Supabase, solar, weather, middleware, or building modules.
- Keep generated data and local validation artifacts out of committed files unless they are small fixtures or story/audit docs.
- Do not add admin upload UI/API. Maintainer import remains a reviewed direct operation.
- Do not depend on Future Monetization, Swish, premium state, payment routes, or paywall code.
- If a live DB import is tested locally, document exactly what was run, row counts, and rollback notes in the story completion notes. Do not commit secrets or connection strings.

### Latest Technical Notes

- Local Python versions at draft time: pyshp 3.0.9, Shapely 2.1.2, pyproj 3.7.2, tifffile 2026.6.1, imagecodecs 2026.5.10.
- Shapely 2.1 `STRtree` query operations return indices, and its indexing/query bounding boxes are two-dimensional; do not assume Z values survive through Shapely indexing.
- pyproj should use `Transformer.from_crs(..., always_xy=True)` for explicit x/y order in CRS transformations.
- PostgreSQL server-side `COPY FROM 'file'` reads files from the database server filesystem. For local generated files against Supabase, document client-side `psql \copy` or another client-side loader pattern.
- PostGIS `ST_GeomFromGeoJSON` accepts GeoJSON geometry fragments and defaults missing SRID to 4326 in PostGIS 3.0+. Set/check SRID explicitly when inserting runtime geometries so the contract is clear.

### Project Structure Notes

- Recommended tracked homes:
  - `scripts/geodata/` for Python pipeline code and runbook.
  - `scripts/geodata/testdata/` or `nextjs-app/test/fixtures/` for small fixture inputs/expected outputs.
  - `nextjs-app/test/unit/` only if adding TypeScript contract tests that validate generated SQL/JSON mapping.
- Generated bulk outputs should remain under `building_geodata/goteborg-open/derived/` or a documented gitignored path.
- The repo currently has no authoritative tracked Supabase migration folder. Preserve Story 3.0.2's manual SQL handoff unless Rasmus provides an approved migration/import location.

### References

- `AGENTS.md`
- `project-context.md`
- `_bmad-output/planning-artifacts/epics.md` - Epic 3 Prelude and Story 3.0.3 ACs.
- `_bmad-output/planning-artifacts/prd.md` - Shadow data trust correction and MVP launch bbox.
- `_bmad-output/planning-artifacts/architecture.md` - Shadow Caster Data Architecture, Runtime Data Contract, Integration Points.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - confirms no direct consumer UI change for this backend import story.
- `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md` - accepted ADR.
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-02-shadow-data-trust-realignment.md`
- `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.md`
- `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql`
- `building_geodata/goteborg-open/README.md`
- `building_geodata/goteborg-open/tools/derive_building_height_candidates.py`
- `building_geodata/goteborg-open/tools/validate_height_candidates.py`
- `building_geodata/goteborg-open/tools/filter_shadow_caster_candidates.py`
- Shapely 2.1.2 STRtree docs: https://shapely.readthedocs.io/en/2.1.2/strtree.html
- pyproj Transformer docs: https://pyproj4.github.io/pyproj/stable/api/transformer.html
- PostgreSQL 15 COPY docs: https://www.postgresql.org/docs/15/sql-copy.html
- PostGIS ST_GeomFromGeoJSON docs: https://postgis.net/docs/ST_GeomFromGeoJSON.html

## Dev Agent Record

### Agent Model Used

GPT-5 Codex (Codex desktop)

### Debug Log References

- Draft baseline before story creation: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Draft baseline before story creation: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Draft discovery used local Python dependency check: `python -c "import shapefile, shapely, pyproj, tifffile, imagecodecs; ..."` returned pyshp 3.0.9, Shapely 2.1.2, pyproj 3.7.2, tifffile 2026.6.1, imagecodecs 2026.5.10.
- Draft deferred-work scan found no carry-in item targeting Story 3.0.3.
- Draft worktree check found existing Story 3.0.2 artifacts and generated validation logs in the local worktree; they were treated as current local context.
- Implementation baseline before edits: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Implementation baseline before edits: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Source-context check read the required story, planning, ADR, sprint-change, Story 3.0.2 contract, and local open-geodata prototype files.
- Worktree preservation check: existing Story 3.0.2 tracked/untracked artifacts and generated validation logs were present before implementation and remain unrelated to this story's code changes.
- Story-specific Python compile check: `python -m py_compile scripts/geodata/shadow_caster_pipeline.py` passed.
- Story-specific Python tests: `python -m unittest discover -s scripts/geodata/tests` passed (6 tests).
- Local candidate validation: `python scripts/geodata/shadow_caster_pipeline.py validate` passed against `building_geodata/goteborg-open/derived/buildings_central_639_14_640_14_height_candidates.geojsonl`.
- Local conservative filter run: `python scripts/geodata/shadow_caster_pipeline.py filter` passed; output counts were 56,756 include, 1,975 review, and 23,839 exclude rows; `small-komplementbyggnad-low-quality` count was 303.
- Local import handoff generation: `python scripts/geodata/shadow_caster_pipeline.py emit-import` passed; import batch id `open-goteborg-central-567848912fdc`; generated 58,731 default import-ready rows plus 23,839 excluded diagnostic rows.
- Local no-DB artifact validation: `python scripts/geodata/shadow_caster_pipeline.py validate-artifacts` passed with status `pass`.
- Boundary scans over `scripts/geodata` and active `nextjs-app` files found no admin surface, legacy direct `buildings` fallback, premium/payment, consumer uncertainty copy, confidence-engine, or solar-runtime changes from this story.
- Final verification: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Final verification: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Final verification: `cd nextjs-app && npx.cmd vitest run` passed (42 files / 367 tests).
- Build skip rationale: `cd nextjs-app && npm run build` was not run because this story changed tracked scripts/docs/tests/story metadata and `.gitignore` only; no runtime TypeScript, API routes, package files, or Next configuration were changed by this story.
- Story review gate: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-3-open-geodata-import-pipeline` passed; lint, typecheck, and Vitest passed; visual validation skipped because no mapped screen ID was found; sprint status moved `in-progress -> review`; validation log generated at `_bmad-output/implementation-artifacts/validation/3-0-3-open-geodata-import-pipeline-review-20260604-164452.log`.
- Review-fix baseline before edits: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Review-fix baseline before edits: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Review regression tests were added for the seven patch findings; first run of `python -m unittest discover -s scripts/geodata/tests` failed on cache ignore, path-independent batch hash, source/match provenance, SQL escaping/idempotency, invalid runtime polygon validation, and DTM boundary indexing as expected.
- Review-fix Python compile check: `python -m py_compile scripts/geodata/shadow_caster_pipeline.py` passed.
- Review-fix Python tests: `python -m unittest discover -s scripts/geodata/tests` passed (12 tests).
- Review-fix local candidate validation: `python scripts/geodata/shadow_caster_pipeline.py validate` passed against `building_geodata/goteborg-open/derived/buildings_central_639_14_640_14_height_candidates.geojsonl`.
- Review-fix local import handoff regeneration: `python scripts/geodata/shadow_caster_pipeline.py emit-import` passed; import batch id `open-goteborg-central-929478e740e0`; generated 58,731 default import-ready rows plus 23,839 excluded diagnostic rows.
- Review-fix local no-DB artifact validation: `python scripts/geodata/shadow_caster_pipeline.py validate-artifacts` passed with status `pass`; counts were 56,756 include, 1,975 review, and 23,839 exclude diagnostics.
- Review-fix final verification: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Review-fix final verification: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Review-fix final verification: `cd nextjs-app && npx.cmd vitest run` passed (42 files / 367 tests).
- Review-fix story review gate: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-3-open-geodata-import-pipeline` passed; lint, typecheck, and Vitest passed; visual validation skipped because no mapped screen ID was found; sprint status moved `in-progress -> review`; validation log generated at `_bmad-output/implementation-artifacts/validation/3-0-3-open-geodata-import-pipeline-review-20260604-185724.log`.

### Completion Notes List

- Story drafted by Codex on 2026-06-04.
- Acceptance criteria are preserved verbatim from `_bmad-output/planning-artifacts/epics.md`.
- Draft analysis confirmed this is a backend/import story with no standalone visual reference and no visual validation requirement.
- Draft analysis confirmed the implementation should promote local prototype logic from `building_geodata/goteborg-open/tools/` into tracked repeatable tooling while leaving large raw/generated data gitignored.
- Draft analysis confirmed Story 3.0.2's `shadow_casters` SQL contract is the target import shape and should not be replaced by a competing schema.
- Story-file-audit: all seven checks pass.
- Task 1 complete: baseline typecheck/lint passed before implementation edits; required project/planning/prototype context loaded; sprint sequencing confirmed with Story 3.1 still paused behind Stories 3.0.3-3.0.6; unrelated Story 3.0.2 artifacts preserved.
- Task 2 complete: added tracked `scripts/geodata/` pipeline home with README, pinned dependency notes, fixture, tests, and one Python CLI entry point. The root `.gitignore` now has a narrow exception so this pipeline is tracked while bulk geodata remains ignored.
- Task 3 complete: pipeline preserves the required source chain, explicit default EPSG:3007 bbox, source/metric/runtime CRS metadata, WGS84 Polygon runtime geometry, EPSG:3007 bbox/centroid helpers, pyproj `always_xy=True`, Shapely 2.x STRtree index handling, and shapefile `shape.z` Z-value extraction.
- Task 4 complete: `emit-import` maps filtered features into the Story 3.0.2 `shadow_casters` contract, keeps include rows active and review/exclude rows inactive, avoids source-local `logicalObjectId`, defines lower-is-better source priority constants, and covers include/review/exclude mapping in a tracked fixture test.
- Task 5 complete: preserved deterministic include/review/exclude outputs and added the documented low-quality small `Komplementbyggnad` exclusion rule (`areaM2 < 20` and `qualityScore <= 0.65`). Real local filter output now reconciles 82,570 candidate rows into 56,756 include, 1,975 review, and 23,839 exclude rows.
- Task 6 complete: generated local review artifacts under the gitignored geodata workspace, including import JSONL, excluded diagnostics JSONL, manifest, and a psql client-side `\copy` SQL handoff with post-import smoke checks. No Supabase import or live DB write was executed.
- Task 7 complete: added no-network Python unit tests for filtering, contract mapping, deterministic summary generation, CRS/bbox metadata, import artifact generation, and artifact validation failure cases; compile, tests, and no-DB validation passed.
- Task 8 complete: no downstream prelude boundaries were crossed; final typecheck, lint, Vitest, story-specific Python validation, and story-review gate passed. Build was skipped per story rule because no runtime app/package/config files were changed by this story.
- Review patch findings resolved: Python caches under the tracked geodata script exception are ignored; generated batch IDs are content-hash based instead of local-path based; SQL handoff literals and `\copy` paths are escaped consistently; repeated SQL handoff runs replace rows for the deterministic batch before insert; import rows now include raw source file, checksum, match-buffer, and DTM tile provenance; artifact validation rejects invalid runtime and helper geometries; DTM sampler edge indexing has regression coverage.
- Story status is `done` after Rasmus approval.

### File List

- `.gitignore`
- `_bmad-output/implementation-artifacts/3-0-3-open-geodata-import-pipeline.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `scripts/geodata/__init__.py`
- `scripts/geodata/README.md`
- `scripts/geodata/requirements.txt`
- `scripts/geodata/shadow_caster_pipeline.py`
- `scripts/geodata/testdata/shadow_caster_candidates.fixture.geojsonl`
- `scripts/geodata/tests/test_shadow_caster_pipeline.py`
- Local-only generated geodata artifacts under `building_geodata/goteborg-open/derived/`: validation summary, filter outputs/summaries, `shadow_casters.import.jsonl`, `shadow_casters.excluded_diagnostics.jsonl`, `shadow_casters.import_manifest.json`, `shadow_casters.import_handoff.sql`, and `shadow_casters.import.artifact_validation.json`
- Local-only generated validation artifacts: `_bmad-output/implementation-artifacts/validation/3-0-3-open-geodata-import-pipeline-review-20260604-164452.log`, `_bmad-output/implementation-artifacts/validation/3-0-3-open-geodata-import-pipeline-review-20260604-185724.log`

## Change Log

| Date | Author | Note |
|------|--------|------|
| 2026-06-04 | Codex | Story drafted from Epic 3 Prelude source ACs, accepted shadow-data ADR, Story 3.0.2 schema/RPC contract, local geodata prototype outputs, and current primary docs for Shapely, pyproj, PostgreSQL COPY, and PostGIS GeoJSON import. Status -> ready-for-dev. |
| 2026-06-04 | Codex | Story-file-audit completed with all seven checks passing. |
| 2026-06-04 | Amelia | Started implementation, completed baseline/source-context check, and moved status to in-progress. |
| 2026-06-04 | Amelia | Added tracked geodata pipeline CLI, runbook, dependency pins, fixtures, contract mapping, conservative filtering, import handoff generation, and Python validation coverage. |
| 2026-06-04 | Amelia | Final verification and story review gate passed. Status -> review. |
| 2026-06-04 | Amelia | Addressed seven review patch findings with regression tests and regenerated no-DB import handoff artifacts. |
| 2026-06-04 | Rasmus | Approved story after review-fix gate; status -> done. |
