---
baseline_commit: f08d04a
drafted_at: 2026-06-05T23:10:00+02:00
---

# Story 3.0.7: Baskarta XYZ Inventory & Data Contract Realignment

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Sequencing:** This is a P0 Epic 3 Prelude follow-up created after Göteborgs Stad clarified that Baskarta is the best open XYZ object source, not only building linework. Stories 3.0-3.0.5 are done. Implement this story before Story 3.0.6 so Swedish uncertainty copy reflects the corrected data-source model, and before Story 3.1 routing work proceeds.
>
> **Scope boundary:** This story realigns source strategy, adds Baskarta layer/Z preflight, and extends the shadow-caster data contract to preserve source 3D geometry and layer/class metadata. Do not activate new non-building runtime casters, implement consumer UI copy, add routing/feedback/reviews, execute production Supabase imports, or request paid data in this story.
>
> **Data safety:** `building_geodata/` is local/gitignored and may contain large source and derived data. Keep raw Baskarta exports and generated inspection reports there unless a small deterministic fixture is needed for tracked tests. Do not commit secrets, connection strings, bulk geodata, or production import output.

## Story

As a **maintainer**,
I want Baskarta treated as a full XYZ object inventory with explicit preflight and source-geometry preservation,
So that SunnySeat does not silently discard height-coded non-building objects or depend on a flattened export.

## Acceptance Criteria

**Given** Göteborgs Stad confirmed that the open Höjdmodell is DTM and that Baskarta contains XYZ object data
**When** durable planning docs and geodata runbooks are updated
**Then** they describe the MVP open-data path as 2D Lantmäteriet footprints + Göteborg Baskarta XYZ object inventory + Göteborg Höjdmodell 2022 DTM-derived ground elevation
**And** they state that `byggnad_l` is the first validated runtime building subset, not the complete Baskarta height strategy.

**Given** Baskarta downloads may include multiple Z-aware point, line, and polygon layers
**When** the preflight command runs against a Baskarta ZIP or extracted SHP directory
**Then** it outputs layer inventory, geometry types, record counts, type distributions, Z ranges, missing-Z counts, and anomaly warnings
**And** it fails loudly when expected Z-aware layers are flattened or missing Z values.

**Given** future structure, vegetation, bridge, wall/fence, and obstruction-risk candidates may come from non-`byggnad_l` layers
**When** the schema/import contract is extended
**Then** source 3D geometry, source layer, source class/subclass, Z semantics notes, and collection/update metadata are preserved separately from the WGS84 runtime polygon geometry
**And** non-building candidates remain inactive, diagnostics-only, or obstruction-risk-only until explicitly validated.

**Design Gate Criteria:**
- **Visual:** No standalone visual reference. Backend/data-contract story.
- **Behaviour:** No consumer UI change and no runtime activation of new non-building caster classes.
- **Visual validation:** Not applicable unless consumer UI files change.

## Tasks / Subtasks

- [x] **Task 1: Baseline and source-context check** (AC: all)
  - [x] 1.1 Run `cd nextjs-app && npx.cmd tsc --noEmit` before editing. Stop and surface any errors outside story scope.
  - [x] 1.2 Run `cd nextjs-app && npx.cmd eslint . --quiet` before editing. Stop and surface any errors outside story scope.
  - [x] 1.3 Read `AGENTS.md`, `project-context.md`, this story, `_bmad-output/planning-artifacts/epics.md`, `_bmad-output/planning-artifacts/prd.md`, `_bmad-output/planning-artifacts/architecture.md`, `_bmad-output/planning-artifacts/ux-design-specification.md`, `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md`, and `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-02-shadow-data-trust-realignment.md`.
  - [x] 1.4 Read previous prelude story files 3.0.1-3.0.5, especially Story 3.0.3's pipeline handoff and Story 3.0.5's confidence caps.
  - [x] 1.5 Read the current geodata tooling: `scripts/geodata/README.md`, `scripts/geodata/shadow_caster_pipeline.py`, `scripts/geodata/testdata/`, and `scripts/geodata/tests/test_shadow_caster_pipeline.py`.
  - [x] 1.6 Confirm sprint sequencing: `3-0-7-baskarta-xyz-inventory-data-contract-realignment` is the next ready-for-dev story, Story 3.0.6 remains backlog behind it, and Story 3.1 remains paused until both complete.

- [x] **Task 2: Finish durable data-source realignment** (AC: #1)
  - [x] 2.1 Verify current planning docs say the open-data path is 2D Lantmäteriet footprints + Göteborg Baskarta XYZ object inventory + Göteborg Höjdmodell 2022 DTM-derived ground elevation.
  - [x] 2.2 Verify docs call `byggnad_l` the first validated runtime building subset, not the complete Baskarta height strategy.
  - [x] 2.3 Repair any remaining current-planning wording that says "Baskarta 3D building linework" as the full source strategy. Historical 2026-06-02 proposal text may remain if clearly superseded by the 2026-06-05 clarification.
  - [x] 2.4 Preserve the existing conservative runtime rule: only validated building casters are runtime-active by default; non-building candidates need validation before activation.
  - [x] 2.5 Add a short source-strategy note to `scripts/geodata/README.md` explaining that broader Baskarta layers are candidate structures/vegetation/obstruction metadata until classified and validated.

- [x] **Task 3: Add Baskarta ZIP/layer preflight command** (AC: #2)
  - [x] 3.1 Add a no-DB command such as `python scripts/geodata/shadow_caster_pipeline.py preflight-baskarta --input <zip-or-directory>` that accepts a Baskarta ZIP or extracted SHP directory.
  - [x] 3.2 Inventory every SHP layer found, including layer name, geometry type, record count, available attribute fields, and stable output ordering.
  - [x] 3.3 Report type distributions from common type fields when present, such as `typ`, `obkod`, `objekttyp`, or equivalent Baskarta attributes. If field names differ, include the discovered field list and do not guess silently.
  - [x] 3.4 Detect Z support from shapefile shape types and actual coordinate/Z arrays. Report Z min/max, missing-Z counts, non-finite Z values, empty geometries, and anomalous Z ranges per layer.
  - [x] 3.5 Fail loudly for expected Z-aware layers that are flattened or contain no usable Z values. The current known expected layers include `byggnad_l`; local inspection also found candidates such as `markdetaljer`, `kommunikation`, `markanvandning_p`, `anlaggningar_l`, and `anlaggningar_p`.
  - [x] 3.6 Emit both machine-readable JSON and human-readable Markdown under the gitignored geodata workspace by default, with stable key ordering and no embedded run timestamp in deterministic fields.

- [x] **Task 4: Extend schema/import contract without runtime activation** (AC: #3)
  - [x] 4.1 Update `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql` or a clearly linked manual SQL addendum so `shadow_casters` can preserve source 3D geometry and source classification metadata.
  - [x] 4.2 Add or document columns for source geometry and classification, including `source_geom_3007 geometry(GeometryZ,3007)` or an equivalent 3D source-geometry field, `source_layer`, `source_subclass`, `z_semantics`, `source_collection_metadata`, and `source_update_metadata`.
  - [x] 4.3 Keep `geometry` as the WGS84 runtime polygon geometry for the current TypeScript shadow engine. Do not replace runtime geometry with raw source point/line/polygon objects.
  - [x] 4.4 Preserve service-role-only access boundaries and existing `get_buildings_near_point` legacy fields.
  - [x] 4.5 Ensure non-building source objects imported later default to inactive, diagnostics-only, or obstruction-risk-only unless explicitly validated by a later story.
  - [x] 4.6 Update `nextjs-app/test/unit/shadow-caster-sql-contract.test.ts` to pin the new contract fields and runtime filtering invariants.

- [x] **Task 5: Add focused preflight and preservation tests** (AC: #2, #3)
  - [x] 5.1 Add small tracked fixtures for PointZ, PolylineZ, PolygonZ, and flattened/no-Z failure cases. Keep fixtures minimal and deterministic.
  - [x] 5.2 Add Python tests proving the preflight detects Z-aware layers, reports Z ranges and missing-Z counts, lists type distributions, and fails flattened expected layers.
  - [x] 5.3 Add tests proving the import/schema contract can preserve source 3D geometry separately from WGS84 runtime geometry.
  - [x] 5.4 Add tests proving non-building candidate layers are not made active runtime casters by the preflight or contract extension.
  - [x] 5.5 Compile/check Python scripts with `python -m py_compile scripts/geodata/shadow_caster_pipeline.py`.

- [x] **Task 6: Preserve downstream boundaries and handoff clarity** (AC: all)
  - [x] 6.1 Do not add Swedish uncertainty labels, help text, or About-page copy. Story 3.0.6 owns user-facing copy after this story lands.
  - [x] 6.2 Do not implement Story 3.1 routing, Story 3.2 feedback, Story 3.3 reviews, or Story 3.4 visit-loop hardening.
  - [x] 6.3 Do not execute production Supabase imports, destructive SQL, or paid data requests.
  - [x] 6.4 Document the downstream handoff: Story 3.0.6 may mention general uncertainty only; future ETL stories may classify non-`byggnad_l` layers; confidence remains fail-closed for unvalidated candidates.

- [x] **Task 7: Final verification and review gate** (AC: all)
  - [x] 7.1 Run `cd nextjs-app && npx.cmd tsc --noEmit`.
  - [x] 7.2 Run `cd nextjs-app && npx.cmd eslint . --quiet`.
  - [x] 7.3 Run `cd nextjs-app && npx.cmd vitest run`.
  - [x] 7.4 Run `python -m py_compile scripts/geodata/shadow_caster_pipeline.py`.
  - [x] 7.5 Run `python -m unittest discover -s scripts/geodata/tests`.
  - [x] 7.6 Run `cd nextjs-app && npm run build` only if runtime TypeScript, API routes, package files, or Next configuration changed. If only scripts/docs/tests/SQL changed, document the skip rationale.
  - [x] 7.7 No Playwright or visual validation is required unless visible consumer UI files change.
  - [x] 7.8 Before changing sprint status to `review`, run `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-7-baskarta-xyz-inventory-data-contract-realignment`.

### Review Findings

#### Round 1 - 2026-06-06

- [x] [Review][Patch] AC3 is not met end-to-end because the derive path still does not emit preserved Baskarta source XYZ geometry. Matched `byggnad_l` lines are reduced to Z stats/type metadata, `sourceGeometryType` comes from the 2D footprint, and `source_geom_3007` is populated only when an external `sourceGeom3007` property already exists. Add source geometry emission from the selected Baskarta Z geometry and a derive-path test proving generated import rows carry non-null Z coordinates. [scripts/geodata/shadow_caster_pipeline.py:830]
- [x] [Review][Patch] Flattened `source_geom_3007` can pass artifact validation and be converted into fake 3D by the SQL handoff via `st_force3d`. Add recursive Z-coordinate validation for source geometry, reject 2D payloads, and remove or constrain the SQL `st_force3d` mapping and the test that pins it. [scripts/geodata/shadow_caster_pipeline.py:1835]
- [x] [Review][Patch] Existing-table SQL upgrades can abort before adding the new Story 3.0.7 columns because comments on `source_geom_3007`, `source_layer`, `source_subclass`, `z_semantics`, and metadata columns run before the `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` block. Move those comments after the upgrade block or duplicate them after column creation. [_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql:94]
- [x] [Review][Patch] Expected-layer checks are case-sensitive, so a real Baskarta layer with variant casing can bypass flattened/missing-Z failure checks. Normalize the layer stem before comparing with `BASKARTA_EXPECTED_Z_LAYERS` while preserving the display name in reports. [scripts/geodata/shadow_caster_pipeline.py:370]
- [x] [Review][Patch] Missing-Z failure behavior is not covered by tests even though AC2 requires failing loudly for expected Z-aware layers with missing Z values. Add a Z-aware expected-layer fixture with partial or unusable Z and assert non-zero exit plus reported missing/non-usable Z counts. [scripts/geodata/tests/test_shadow_caster_pipeline.py:535]
- [x] [Review][Patch] The geodata runbook still says the pipeline remains building-only "until Story 3.0.7 implements" the preflight/data-contract extension even though this story has implemented it. Reword the note to present tense. [scripts/geodata/README.md:136]

#### Round 2 - 2026-06-07

- [x] [Review][Patch] `byggnad_l` preflight could pass without the `typ` field/runtime line classifications that derivation requires. Preflight now fails when `byggnad_l` lacks `typ` or has no recognized runtime values. [scripts/geodata/shadow_caster_pipeline.py:390]
- [x] [Review][Patch] Baskarta preflight could miss uppercase `.SHP` layers and crash before writing reports for unreadable/corrupt layers. SHP discovery is now case-insensitive and unreadable layers are reported in deterministic JSON/Markdown. [scripts/geodata/shadow_caster_pipeline.py:452]
- [x] [Review][Patch] Active `byggnad_l` rows could pass validation with null or wrongly projected `source_geom_3007`. Artifact validation now requires active `byggnad_l` source geometry and checks source XY coordinates against the EPSG:3007 MVP bbox. [scripts/geodata/shadow_caster_pipeline.py:2537]
- [x] [Review][Patch] SQL runtime guards allowed active `building` rows from non-`byggnad_l` layers. Existing-row cleanup, constraints, runtime index predicate, and RPC filtering now require active building rows to be `byggnad_l` with preserved source geometry. [_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql:321]
- [x] [Review][Patch] The new preflight fixture was outside tracked diff visibility and the legacy candidate fixture lacked source geometry. The fixture set now includes deterministic source geometry coverage for clean-checkout tests. [scripts/geodata/testdata/baskarta_preflight_layers.fixture.json]

## Dev Notes

### Geodata Clarification

- Göteborgs Stad confirmed the downloadable open Höjdmodell is a terrain model/DTM, not a DSM or surface model.
- They confirmed Baskarta contains XYZ coordinates and is their best open data product for building heights.
- They also stated that buildings, vegetation, bridges, and related objects can be height-coded in Baskarta as point, line, or polygon objects.
- The current pipeline's `byggnad_l` approach remains useful, but it is a first validated building subset rather than the full Baskarta height/object strategy.
- Paid Göteborg 3D/LAS remains optional fallback/validation data and is not an MVP prerequisite.

### Current Implementation State

- `scripts/geodata/shadow_caster_pipeline.py` currently derives runtime building candidates from `building_geodata/byggnad_kn1480.gpkg`, Baskarta `raw/baskarta/shp-extract/byggnad_l`, and DTM ZIPs for `639_14` and `640_14`.
- Story 3.0.3 intentionally emits `caster_class = building` for this MVP open-data path and validates import artifacts against that conservative assumption.
- Story 3.0.5 confidence semantics already fail closed for unknown or insufficient cluster coverage and known obstruction risks. Preserve that behavior.
- The current SQL handoff in `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql` does not yet preserve raw source 3D geometry separately from runtime geometry.

### Architecture Guardrails

- Client components must not import geodata, solar, Supabase, weather, middleware, or building modules.
- Keep reusable geodata tooling under `scripts/geodata/`; keep large source/export/generated artifacts under `building_geodata/` or another gitignored geodata workspace.
- Do not add an admin upload path or candidate review queue. Maintainer geodata operations remain reviewed direct operations.
- Source precedence remains lower-is-better: manual verified override, paid LOD2/LOD3 or surveyed geometry, paid DSM/LAS, Göteborg open-derived, OSM/heuristic fallback.
- Runtime-active rows still must satisfy active include records, height at least 3 m, valid runtime geometry, and approved caster classes.

### Expected File Impact

Likely files:

- `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics.md`
- `project-context.md`
- `scripts/geodata/README.md`
- `scripts/geodata/shadow_caster_pipeline.py`
- `scripts/geodata/testdata/*`
- `scripts/geodata/tests/test_shadow_caster_pipeline.py`
- `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql`
- `nextjs-app/test/unit/shadow-caster-sql-contract.test.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

Avoid unless explicitly required:

- Consumer UI components
- `nextjs-app/app/api/*` public routes
- Live Supabase migrations/imports
- Visual reference PNGs
- Premium/payment/future monetization paths

### References

- `AGENTS.md`
- `project-context.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-02-shadow-data-trust-realignment.md`
- `_bmad-output/implementation-artifacts/3-0-1-shadow-data-adr-planning-realignment.md`
- `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.md`
- `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql`
- `_bmad-output/implementation-artifacts/3-0-3-open-geodata-import-pipeline.md`
- `_bmad-output/implementation-artifacts/3-0-4-geodata-validation-spot-check-gates.md`
- `_bmad-output/implementation-artifacts/3-0-5-confidence-engine-data-coverage.md`
- `scripts/geodata/README.md`
- `scripts/geodata/shadow_caster_pipeline.py`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex (Codex desktop)

### Debug Log References

- Draft baseline before story creation: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Draft baseline before story creation: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Draft worktree check: `git status --short` returned clean before edits.
- Draft context scan confirmed existing docs and pipeline used narrower "Baskarta 3D building linework" / `byggnad_l` wording.
- Story-file-audit completed after drafting; all seven checks passed.
- Implementation baseline before edits: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Implementation baseline before edits: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Source-context check read the required project, planning, ADR, sprint-change, previous prelude story, SQL contract, geodata README, pipeline, fixture, and test files.
- Sprint sequencing confirmed: `3-0-7-baskarta-xyz-inventory-data-contract-realignment` is the current prerequisite story; `3-0-6-ux-content-uncertainty-copy` remains behind it; Story 3.1 remains paused until both are complete.
- Task 2 documentation scan: `rg` confirmed current planning docs use the 2026-06-05 source model, `byggnad_l` is described as the first validated subset, and the only remaining "Baskarta 3D building linework" wording is explicitly superseded historical context or story text.
- Task 3 red phase: `python -m unittest discover -s scripts/geodata/tests` failed as expected because `command_preflight_baskarta` did not exist.
- Task 3 green/refactor phase: added `preflight-baskarta` for ZIP/extracted SHP inputs, deterministic JSON/Markdown output, layer/type/Z inventory, expected-layer fail-fast checks, and fixture-backed tests.
- Task 3 validation: `python -m unittest discover -s scripts/geodata/tests` passed (22 tests); `python -m py_compile scripts/geodata/shadow_caster_pipeline.py` passed; `python scripts/geodata/shadow_caster_pipeline.py preflight-baskarta --input building_geodata/goteborg-open/raw/baskarta/shp-extract` passed and wrote local gitignored `baskarta_preflight.json/md`; `cd nextjs-app && npx.cmd vitest run` passed (45 files / 385 tests).
- Task 4 red phase: `python -m unittest discover -s scripts/geodata/tests` and `cd nextjs-app && npx.cmd vitest run test/unit/shadow-caster-sql-contract.test.ts` failed as expected on missing source-geometry preservation fields.
- Task 4/5 green phase: added source 3D geometry/classification fields to the mapper, generated handoff, manual SQL contract, SQL contract tests, and Python preservation tests; non-`byggnad_l`/non-building rows remain inactive by construction.
- Task 4/5 validation: `python -m unittest discover -s scripts/geodata/tests` passed (24 tests); `cd nextjs-app && npx.cmd vitest run test/unit/shadow-caster-sql-contract.test.ts` passed (9 tests); `python -m py_compile scripts/geodata/shadow_caster_pipeline.py` passed.
- Final verification: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Final verification: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Final verification: `cd nextjs-app && npx.cmd vitest run` passed (45 files / 386 tests).
- Final verification: `python -m py_compile scripts/geodata/shadow_caster_pipeline.py` passed.
- Final verification: `python -m unittest discover -s scripts/geodata/tests` passed (24 tests).
- Build skipped: no runtime TypeScript, API routes, package files, or Next configuration changed; edits were geodata scripts, SQL/story docs, and tests.
- Playwright/visual validation skipped: no visible consumer UI files changed and the story has no standalone visual reference.
- Review gate: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-7-baskarta-xyz-inventory-data-contract-realignment` passed; validation artifact `_bmad-output/implementation-artifacts/validation/3-0-7-baskarta-xyz-inventory-data-contract-realignment-review-20260605-232319.log`; sprint status moved to `review`.
- Round 1 review continuation baseline: `cd nextjs-app && npx.cmd tsc --noEmit` passed before edits.
- Round 1 review continuation baseline: `cd nextjs-app && npx.cmd eslint . --quiet` passed before edits.
- Round 1 review fixes: derive output now emits selected matched Baskarta source `LineStringZ`/`MultiLineStringZ` geometry into `sourceGeom3007`; import rows preserve it as `source_geom_3007`.
- Round 1 review fixes: artifact validation recursively rejects 2D/non-finite source geometry Z payloads; SQL handoff no longer uses `st_force3d`; SQL comments for new columns now run after `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- Round 1 review fixes: Baskarta expected-layer matching is case-insensitive while preserving display names; missing/unusable Z expected-layer behavior is covered; geodata runbook wording is present tense.
- Round 1 focused validation: `python -m py_compile scripts/geodata/shadow_caster_pipeline.py` passed.
- Round 1 focused validation: `python -m unittest discover -s scripts/geodata/tests` passed (28 tests).
- Round 1 focused validation: `cd nextjs-app && npx.cmd vitest run test/unit/shadow-caster-sql-contract.test.ts` passed (9 tests).
- Round 1 final verification: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Round 1 final verification: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Round 1 final verification: `cd nextjs-app && npx.cmd vitest run` passed (45 files / 386 tests).
- Round 1 final verification: `python -m py_compile scripts/geodata/shadow_caster_pipeline.py` passed.
- Round 1 final verification: `python -m unittest discover -s scripts/geodata/tests` passed (28 tests).
- Round 1 build skip rationale: no runtime TypeScript, API routes, package files, or Next configuration changed; edits were geodata scripts, SQL/story docs, and tests.
- Round 1 Playwright/visual validation skip rationale: no visible consumer UI files changed and the story has no standalone visual reference.
- Round 1 review gate: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-7-baskarta-xyz-inventory-data-contract-realignment` passed; validation artifact `_bmad-output/implementation-artifacts/validation/3-0-7-baskarta-xyz-inventory-data-contract-realignment-review-20260606-214101.log`; sprint status moved to `review`.
- Round 2 BMAD review ran with three subagents after Rasmus explicitly authorized subagent use: Acceptance Auditor clean; Edge Case Hunter found four edge cases; Blind Hunter found four overlapping/adjacent issues.
- Round 2 review fixes: `byggnad_l` preflight now requires `typ` runtime classification; SHP discovery is extension-case-insensitive; unreadable layers emit JSON/Markdown failures instead of crashing.
- Round 2 review fixes: artifact validation now requires active `byggnad_l` rows to preserve `source_geom_3007` and rejects source geometry outside the EPSG:3007 MVP bbox; SQL cleanup, constraints, runtime index predicate, and RPC filtering now enforce active building rows from `byggnad_l` with source geometry.
- Round 2 review fixes: `shadow_caster_candidates.fixture.geojsonl` now includes deterministic source geometry, and the Baskarta preflight fixture is included in the file list.
- Round 2 focused validation: `python -m py_compile scripts/geodata/shadow_caster_pipeline.py` passed.
- Round 2 focused validation: `python -m unittest discover -s scripts/geodata/tests` passed (33 tests).
- Round 2 focused validation: `cd nextjs-app && npx.cmd vitest run test/unit/shadow-caster-sql-contract.test.ts` passed (9 tests).
- Round 2 final verification: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Round 2 final verification: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Round 2 final verification: `cd nextjs-app && npx.cmd vitest run` passed (45 files / 386 tests).
- Round 2 build skip rationale: no runtime TypeScript, API routes, package files, or Next configuration changed after review fixes; edits were geodata scripts, SQL/story docs, fixtures, and tests.
- Round 2 Playwright/visual validation skip rationale: no visible consumer UI files changed and the story has no standalone visual reference.
- Rasmus approved closing the ticket after clean/fixed review; story status moved to `done`.

### Completion Notes List

- Story drafted by Codex on 2026-06-05 after reviewing the Göteborgs Stad Geodata response and the attached read-only project analysis.
- Acceptance criteria are preserved verbatim from `_bmad-output/planning-artifacts/epics.md`.
- Story is sequenced before Story 3.0.6 and Story 3.1 because user-facing uncertainty copy and routing should not proceed on stale data-source assumptions.
- Scope is backend/data-contract and geodata tooling only; no consumer UI, runtime activation of new non-building caster classes, live Supabase import, paid data request, admin surface, or premium/payment work is included.
- Draft updates also corrected durable planning docs and tracker wording to treat Baskarta as an XYZ object inventory while keeping `byggnad_l` as the first validated runtime building subset.
- Task 1 complete: baseline typecheck/lint passed before implementation edits; required project/planning/previous-story/geodata context loaded; `3-0-7` moved to in-progress while preserving pre-existing dirty tracker/draft-story work.
- Task 2 complete: durable data-source wording already matches the corrected Baskarta XYZ inventory model; no planning-doc repair was required. The existing geodata README source-strategy note covers broader Baskarta layers as candidate structure, vegetation, bridge, wall/fence, and obstruction-risk metadata until classified and validated.
- Task 3 complete: added no-DB Baskarta ZIP/directory preflight with SHP inventory, common type-field distributions, Z support/range/missing/non-finite checks, anomaly warnings, expected-layer fail-fast behavior, deterministic JSON/Markdown outputs, README documentation, and small tracked fixture specs for PointZ/PolylineZ/PolygonZ/flattened cases.
- Task 4 complete: `shadow_casters` now preserves `source_geom_3007`, source layer/subclass, Z semantics, and collection/update metadata separately from the WGS84 runtime polygon; service-role RPC behavior and legacy return fields remain unchanged.
- Task 5 complete: focused Python and Vitest coverage pins Z-aware Baskarta preflight behavior, source-geometry preservation, SQL contract fields/indexes/comments, and conservative inactive handling for non-building/non-`byggnad_l` candidates.
- Task 6 complete: no consumer copy, routing, feedback/reviews, visit-loop, production import, destructive SQL, paid data, or visual-reference work was added.
- Task 7 complete: canonical review gate passed and moved sprint status to `review`.
- Round 1 review fixes complete: all six patch findings were resolved with source Z geometry emitted from derived Baskarta matches, recursive Z validation, SQL upgrade ordering/no forced-3D mapping, case-insensitive expected-layer checks, missing-Z regression coverage, and updated runbook wording.
- Round 1 review gate passed after fixes; story status is back to `review`.
- Round 2 subagent review fixes complete: preflight robustness, active source-geometry validation, SQL runtime/source-layer enforcement, and fixture coverage are pinned by focused tests.
- Story approved by Rasmus after Round 2 and moved to `done`.

### File List

- `_bmad-output/implementation-artifacts/3-0-7-baskarta-xyz-inventory-data-contract-realignment.md`
- `_bmad-output/implementation-artifacts/validation/3-0-7-baskarta-xyz-inventory-data-contract-realignment-review-20260605-232319.log`
- `_bmad-output/implementation-artifacts/validation/3-0-7-baskarta-xyz-inventory-data-contract-realignment-review-20260606-214101.log`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/brief/project-brief.md`
- `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/prd.md`
- `project-context.md`
- `scripts/geodata/README.md`
- `scripts/geodata/shadow_caster_pipeline.py`
- `scripts/geodata/testdata/shadow_caster_candidates.fixture.geojsonl`
- `scripts/geodata/testdata/baskarta_preflight_layers.fixture.json`
- `scripts/geodata/tests/test_shadow_caster_pipeline.py`
- `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql`
- `nextjs-app/test/unit/shadow-caster-sql-contract.test.ts`
- Local-only generated geodata artifacts under `building_geodata/goteborg-open/derived/`: `baskarta_preflight.json`, `baskarta_preflight.md`

## Change Log

| Date | Author | Note |
|------|--------|------|
| 2026-06-05 | Codex | Story drafted from Göteborgs Stad Geodata clarification, attached project analysis, current prelude story completions, and existing geodata pipeline state. Status -> ready-for-dev. |
| 2026-06-05 | Amelia | Started implementation, completed baseline/source-context check, and moved status to in-progress. |
| 2026-06-05 | Amelia | Added Baskarta preflight tooling, source-geometry contract preservation, conservative non-building activation guard, and focused tests. |
| 2026-06-06 | Amelia | Addressed Round 1 review findings: derived source XYZ geometry, recursive Z validation, SQL upgrade ordering, case-insensitive expected-layer checks, missing-Z coverage, and runbook wording. |
| 2026-06-07 | Codex | Addressed Round 2 subagent review findings and moved approved story to done. |
