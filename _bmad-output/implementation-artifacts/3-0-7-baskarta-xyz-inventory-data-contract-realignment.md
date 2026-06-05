---
baseline_commit: f08d04a
drafted_at: 2026-06-05T23:10:00+02:00
---

# Story 3.0.7: Baskarta XYZ Inventory & Data Contract Realignment

Status: ready-for-dev

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

- [ ] **Task 1: Baseline and source-context check** (AC: all)
  - [ ] 1.1 Run `cd nextjs-app && npx.cmd tsc --noEmit` before editing. Stop and surface any errors outside story scope.
  - [ ] 1.2 Run `cd nextjs-app && npx.cmd eslint . --quiet` before editing. Stop and surface any errors outside story scope.
  - [ ] 1.3 Read `AGENTS.md`, `project-context.md`, this story, `_bmad-output/planning-artifacts/epics.md`, `_bmad-output/planning-artifacts/prd.md`, `_bmad-output/planning-artifacts/architecture.md`, `_bmad-output/planning-artifacts/ux-design-specification.md`, `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md`, and `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-02-shadow-data-trust-realignment.md`.
  - [ ] 1.4 Read previous prelude story files 3.0.1-3.0.5, especially Story 3.0.3's pipeline handoff and Story 3.0.5's confidence caps.
  - [ ] 1.5 Read the current geodata tooling: `scripts/geodata/README.md`, `scripts/geodata/shadow_caster_pipeline.py`, `scripts/geodata/testdata/`, and `scripts/geodata/tests/test_shadow_caster_pipeline.py`.
  - [ ] 1.6 Confirm sprint sequencing: `3-0-7-baskarta-xyz-inventory-data-contract-realignment` is the next ready-for-dev story, Story 3.0.6 remains backlog behind it, and Story 3.1 remains paused until both complete.

- [ ] **Task 2: Finish durable data-source realignment** (AC: #1)
  - [ ] 2.1 Verify current planning docs say the open-data path is 2D Lantmäteriet footprints + Göteborg Baskarta XYZ object inventory + Göteborg Höjdmodell 2022 DTM-derived ground elevation.
  - [ ] 2.2 Verify docs call `byggnad_l` the first validated runtime building subset, not the complete Baskarta height strategy.
  - [ ] 2.3 Repair any remaining current-planning wording that says "Baskarta 3D building linework" as the full source strategy. Historical 2026-06-02 proposal text may remain if clearly superseded by the 2026-06-05 clarification.
  - [ ] 2.4 Preserve the existing conservative runtime rule: only validated building casters are runtime-active by default; non-building candidates need validation before activation.
  - [ ] 2.5 Add a short source-strategy note to `scripts/geodata/README.md` explaining that broader Baskarta layers are candidate structures/vegetation/obstruction metadata until classified and validated.

- [ ] **Task 3: Add Baskarta ZIP/layer preflight command** (AC: #2)
  - [ ] 3.1 Add a no-DB command such as `python scripts/geodata/shadow_caster_pipeline.py preflight-baskarta --input <zip-or-directory>` that accepts a Baskarta ZIP or extracted SHP directory.
  - [ ] 3.2 Inventory every SHP layer found, including layer name, geometry type, record count, available attribute fields, and stable output ordering.
  - [ ] 3.3 Report type distributions from common type fields when present, such as `typ`, `obkod`, `objekttyp`, or equivalent Baskarta attributes. If field names differ, include the discovered field list and do not guess silently.
  - [ ] 3.4 Detect Z support from shapefile shape types and actual coordinate/Z arrays. Report Z min/max, missing-Z counts, non-finite Z values, empty geometries, and anomalous Z ranges per layer.
  - [ ] 3.5 Fail loudly for expected Z-aware layers that are flattened or contain no usable Z values. The current known expected layers include `byggnad_l`; local inspection also found candidates such as `markdetaljer`, `kommunikation`, `markanvandning_p`, `anlaggningar_l`, and `anlaggningar_p`.
  - [ ] 3.6 Emit both machine-readable JSON and human-readable Markdown under the gitignored geodata workspace by default, with stable key ordering and no embedded run timestamp in deterministic fields.

- [ ] **Task 4: Extend schema/import contract without runtime activation** (AC: #3)
  - [ ] 4.1 Update `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql` or a clearly linked manual SQL addendum so `shadow_casters` can preserve source 3D geometry and source classification metadata.
  - [ ] 4.2 Add or document columns for source geometry and classification, including `source_geom_3007 geometry(GeometryZ,3007)` or an equivalent 3D source-geometry field, `source_layer`, `source_subclass`, `z_semantics`, `source_collection_metadata`, and `source_update_metadata`.
  - [ ] 4.3 Keep `geometry` as the WGS84 runtime polygon geometry for the current TypeScript shadow engine. Do not replace runtime geometry with raw source point/line/polygon objects.
  - [ ] 4.4 Preserve service-role-only access boundaries and existing `get_buildings_near_point` legacy fields.
  - [ ] 4.5 Ensure non-building source objects imported later default to inactive, diagnostics-only, or obstruction-risk-only unless explicitly validated by a later story.
  - [ ] 4.6 Update `nextjs-app/test/unit/shadow-caster-sql-contract.test.ts` to pin the new contract fields and runtime filtering invariants.

- [ ] **Task 5: Add focused preflight and preservation tests** (AC: #2, #3)
  - [ ] 5.1 Add small tracked fixtures for PointZ, PolylineZ, PolygonZ, and flattened/no-Z failure cases. Keep fixtures minimal and deterministic.
  - [ ] 5.2 Add Python tests proving the preflight detects Z-aware layers, reports Z ranges and missing-Z counts, lists type distributions, and fails flattened expected layers.
  - [ ] 5.3 Add tests proving the import/schema contract can preserve source 3D geometry separately from WGS84 runtime geometry.
  - [ ] 5.4 Add tests proving non-building candidate layers are not made active runtime casters by the preflight or contract extension.
  - [ ] 5.5 Compile/check Python scripts with `python -m py_compile scripts/geodata/shadow_caster_pipeline.py`.

- [ ] **Task 6: Preserve downstream boundaries and handoff clarity** (AC: all)
  - [ ] 6.1 Do not add Swedish uncertainty labels, help text, or About-page copy. Story 3.0.6 owns user-facing copy after this story lands.
  - [ ] 6.2 Do not implement Story 3.1 routing, Story 3.2 feedback, Story 3.3 reviews, or Story 3.4 visit-loop hardening.
  - [ ] 6.3 Do not execute production Supabase imports, destructive SQL, or paid data requests.
  - [ ] 6.4 Document the downstream handoff: Story 3.0.6 may mention general uncertainty only; future ETL stories may classify non-`byggnad_l` layers; confidence remains fail-closed for unvalidated candidates.

- [ ] **Task 7: Final verification and review gate** (AC: all)
  - [ ] 7.1 Run `cd nextjs-app && npx.cmd tsc --noEmit`.
  - [ ] 7.2 Run `cd nextjs-app && npx.cmd eslint . --quiet`.
  - [ ] 7.3 Run `cd nextjs-app && npx.cmd vitest run`.
  - [ ] 7.4 Run `python -m py_compile scripts/geodata/shadow_caster_pipeline.py`.
  - [ ] 7.5 Run `python -m unittest discover -s scripts/geodata/tests`.
  - [ ] 7.6 Run `cd nextjs-app && npm run build` only if runtime TypeScript, API routes, package files, or Next configuration changed. If only scripts/docs/tests/SQL changed, document the skip rationale.
  - [ ] 7.7 No Playwright or visual validation is required unless visible consumer UI files change.
  - [ ] 7.8 Before changing sprint status to `review`, run `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-7-baskarta-xyz-inventory-data-contract-realignment`.

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

### Completion Notes List

- Story drafted by Codex on 2026-06-05 after reviewing the Göteborgs Stad Geodata response and the attached read-only project analysis.
- Acceptance criteria are preserved verbatim from `_bmad-output/planning-artifacts/epics.md`.
- Story is sequenced before Story 3.0.6 and Story 3.1 because user-facing uncertainty copy and routing should not proceed on stale data-source assumptions.
- Scope is backend/data-contract and geodata tooling only; no consumer UI, runtime activation of new non-building caster classes, live Supabase import, paid data request, admin surface, or premium/payment work is included.
- Draft updates also corrected durable planning docs and tracker wording to treat Baskarta as an XYZ object inventory while keeping `byggnad_l` as the first validated runtime building subset.

### File List

- `_bmad-output/implementation-artifacts/3-0-7-baskarta-xyz-inventory-data-contract-realignment.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/brief/project-brief.md`
- `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/prd.md`
- `project-context.md`
- `scripts/geodata/README.md`
- `scripts/geodata/shadow_caster_pipeline.py`

## Change Log

| Date | Author | Note |
|------|--------|------|
| 2026-06-05 | Codex | Story drafted from Göteborgs Stad Geodata clarification, attached project analysis, current prelude story completions, and existing geodata pipeline state. Status -> ready-for-dev. |
