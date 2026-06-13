---
baseline_commit: 8d00d04da72ec02258d1dde28d796188da071d78
drafted_at: 2026-06-02T18:34:52+02:00
---

# Story 3.0.1: Shadow Data ADR & Planning Realignment

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Sequencing:** This is the first Epic 3 Prelude story. Complete Stories 3.0.1-3.0.6 before Story 3.1 routing work proceeds, even if Story 3.1 is already tracked as ready-for-dev.
>
> **Scope boundary:** This is a planning/documentation realignment story. Do not create the `shadow_casters` schema, RPC, import pipeline, confidence-engine changes, or user-facing uncertainty copy in this story. Those belong to Stories 3.0.2-3.0.6.
>
> **Existing context:** Commit `8d00d04` already added the accepted ADR and updated core planning artifacts. Implementation should verify the correction end-to-end, repair any remaining stale assumptions, and leave clear evidence that future stories will not revive the retired GeoPackage-only model.

## Story

As a **maintainer**,
I want the shadow-data course correction captured in durable planning artifacts,
So that every future story uses the real MVP data assumptions instead of the retired GeoPackage-only assumption.

## Acceptance Criteria

**Given** `building_geodata/byggnad_kn1480.gpkg` has no Z geometry, building-height attribute, roof geometry, or DSM data
**When** the ADR and planning docs are updated
**Then** they state that the GeoPackage is a 2D footprint and metadata source only
**And** they adopt the MVP open-data path: 2D footprints + Göteborg Baskarta 3D linework + Göteborg Höjdmodell 2022 DTM-derived ground elevation
**And** they define the MVP launch bbox as EPSG:3007 `x=140000..150000, y=6390000..6410000`

**Given** future paid DSM/LOD2/LOD3 data may become available
**When** source precedence is documented
**Then** manual verified overrides outrank paid LOD2/LOD3, paid classified DSM/LAS, current open-derived heights, and OSM/heuristic fallback
**And** provenance and rollback requirements are preserved for every source.

**Design Gate Criteria:**
- **Visual:** No standalone visual reference. Planning-only story.
- **Behaviour:** No runtime behaviour change.
- **Visual validation:** Not applicable.

## Tasks / Subtasks

- [x] **Task 1: Baseline and source-context check** (AC: all)
  - [x] 1.1 Run `cd nextjs-app && npx tsc --noEmit` before editing. Stop and surface any errors outside story scope.
  - [x] 1.2 Run `cd nextjs-app && npx eslint . --quiet` before editing. Stop and surface any errors outside story scope.
  - [x] 1.3 Read `AGENTS.md`, `project-context.md`, this story, `_bmad-output/planning-artifacts/epics.md`, `_bmad-output/planning-artifacts/prd.md`, `_bmad-output/planning-artifacts/architecture.md`, `_bmad-output/planning-artifacts/ux-design-specification.md`, `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md`, and `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-02-shadow-data-trust-realignment.md`.
  - [x] 1.4 Read previous Story 3.0 completion notes in `_bmad-output/implementation-artifacts/3-0-remove-admin-surface.md` so the manual-operations and service-role boundaries remain intact.
  - [x] 1.5 Confirm sprint sequencing: `3-0-1-shadow-data-adr-planning-realignment` is the first remaining backlog item and Story 3.1 must stay paused until all six prelude stories are done.

- [x] **Task 2: Verify the local data evidence behind the correction** (AC: #1)
  - [x] 2.1 Read `building_geodata/goteborg-open/README.md`, especially the "Existing `byggnad_kn1480.gpkg`" and "Derived data" sections.
  - [x] 2.2 Read `building_geodata/goteborg-open/derived/buildings_central_639_14_640_14_height_candidates.summary.json`.
  - [x] 2.3 Read `building_geodata/goteborg-open/derived/buildings_central_639_14_640_14_height_candidates.validation.md`.
  - [x] 2.4 Read `building_geodata/goteborg-open/derived/buildings_central_shadow_casters.filter_summary.md`.
  - [x] 2.5 Record the evidence in Completion Notes: GeoPackage has one 2D footprint layer, no height/roof/DSM data; central bbox is EPSG:3007 `140000..150000, 6390000..6410000`; derived candidates come from footprints + Baskarta `byggnad_l` + Höjdmodell 2022 DTM; filtered runtime/import candidate count is 56,776 with 1,980 review and 23,814 excluded.

- [x] **Task 3: Audit and repair durable planning artifacts for the GeoPackage-only retirement** (AC: #1)
  - [x] 3.1 Run a scoped stale-assumption scan:
    - `rg -n "GeoPackage-only|GeoPackage alone|byggnad_kn1480.*(sufficient|alone|height)|sufficient.*byggnad_kn1480|LOD1|estimated height|estimated heights" AGENTS.md project-context.md _bmad-output/planning-artifacts _bmad-output/qa building_geodata/goteborg-open/README.md`
  - [x] 3.2 Classify every match as corrected current guidance, accepted historical context, local prototype note, or needs update.
  - [x] 3.3 If any durable current-planning artifact still implies `building_geodata/byggnad_kn1480.gpkg` alone can power shadows, update it to say the GeoPackage is a 2D footprint and metadata source only.
  - [x] 3.4 Confirm durable planning artifacts adopt the MVP open-data path exactly: 2D Lantmäteriet footprints + Göteborg Baskarta 3D linework + Göteborg Höjdmodell 2022 DTM-derived ground elevation.
  - [x] 3.5 Confirm the MVP launch bbox is documented as EPSG:3007 `x=140000..150000, y=6390000..6410000` in the ADR and the active planning context.
  - [x] 3.6 If `building_geodata/goteborg-open/README.md` still says the next production/import target is only `nextjs-app/lib/solar/types.ts` fields (`geometry`, `height`, `source`, `qualityScore`, `externalId`, `heightSource`), update or qualify that local note so it points forward to the provenance-rich `shadow_casters` contract from Stories 3.0.2-3.0.3. Do not count this gitignored README as the durable artifact for the AC.

- [x] **Task 4: Audit and repair source precedence and provenance/rollback wording** (AC: #2)
  - [x] 4.1 Confirm `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md` documents source precedence in this order: manual verified override, paid LOD2/LOD3 or surveyed roof geometry, paid classified DSM/LAS-derived object height, current open-data derived height, OSM/heuristic fallback.
  - [x] 4.2 Confirm `_bmad-output/planning-artifacts/architecture.md` preserves the same precedence and states future paid DSM/LOD2/LOD3 data overrides per object/source priority, not by wholesale replacement.
  - [x] 4.3 Confirm provenance and rollback requirements are explicit: source dataset/external ID/object metadata/priority must remain traceable, and open-derived records remain fallback/source-comparison data even when higher-priority paid sources arrive.
  - [x] 4.4 If any planning doc compresses this into a vague "paid data replaces open data" statement, rewrite it to the object-level priority model.

- [x] **Task 5: Preserve downstream story boundaries and tracker clarity** (AC: all)
  - [x] 5.1 Confirm `epics.md` still contains the six-story Epic 3 Prelude in this order: 3.0.1 ADR/planning, 3.0.2 schema/RPC, 3.0.3 import pipeline, 3.0.4 validation gates, 3.0.5 confidence semantics, 3.0.6 uncertainty copy.
  - [x] 5.2 Confirm `sprint-status.yaml` keeps Story 3.1 paused by note/context and does not move Story 3.1 forward as part of this story.
  - [x] 5.3 Do not edit runtime app code, database migrations, API contracts, or visual/UI copy unless a stale planning reference is embedded in a docs file. If runtime code must change unexpectedly, stop and explain why it belongs in a later prelude story.
  - [x] 5.4 Preserve Story 3.0's manual operations decision: no admin UI/API, no admin-operated building upload, and venue/geodata maintenance remains reviewed direct database/import work.

- [x] **Task 6: Final verification and review gate** (AC: all)
  - [x] 6.1 Run `cd nextjs-app && npx tsc --noEmit`.
  - [x] 6.2 Run `cd nextjs-app && npx eslint . --quiet`.
  - [x] 6.3 Run `cd nextjs-app && npx vitest run` unless no tracked app code changed and Rasmus explicitly accepts a docs-only skip; otherwise do not skip it.
  - [x] 6.4 Re-run the stale-assumption scan from Task 3.1 and document remaining matches by classification in Completion Notes.
- [x] 6.5 No Playwright, app build, or visual validation is required for a planning-only story unless runtime/UI files change.
- [x] 6.6 Before changing sprint status to `review`, run `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-1-shadow-data-adr-planning-realignment`. If PowerShell execution policy blocks the wrapper, rerun with `powershell.exe -ExecutionPolicy Bypass -File .\scripts\run-sh.ps1 scripts/story-review.sh 3-0-1-shadow-data-adr-planning-realignment`.

### Review Findings

**Round 1 of 3**

- [x] [Review][Patch] Sprint tracker rewrites story IDs outside this story [`_bmad-output/implementation-artifacts/sprint-status.yaml`:90] — `3-0-remove-admin-surface` was renamed even though the existing Story 3.0 artifact remains `_bmad-output/implementation-artifacts/3-0-remove-admin-surface.md`, and the downstream `3-0-6` key was also changed outside this story's implementation scope. Restored tracker keys to their existing/previous IDs.
- [x] [Review][Patch] Claimed validation artifact is not in the tracked change set [`_bmad-output/implementation-artifacts/3-0-1-shadow-data-adr-planning-realignment.md`:173] — the Dev Agent Record and File List claim `_bmad-output/implementation-artifacts/validation/3-0-1-shadow-data-adr-planning-realignment-review-20260602-185148.log`, but the file is currently untracked and absent from the tracked diff. Clarified it as a generated local validation artifact rather than a tracked file-list item.
- [x] [Review][Patch] File List claims a gitignored geodata README repair as if it is reviewable [`_bmad-output/implementation-artifacts/3-0-1-shadow-data-adr-planning-realignment.md`:185] — `building_geodata/goteborg-open/README.md` is local/ignored, so future reviewers and fresh clones cannot verify or receive the claimed repair. Marked it explicitly as local-only and kept durable guidance in tracked planning docs.
- [x] [Review][Patch] Rollback/provenance wording is scoped to paid-source adoption though the AC requires every source [`_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md`:120] — the current ADR/architecture sentence starts from paid-source adoption, while Story 3.0.1 requires provenance and rollback requirements for every source. Rewrote the requirement so manual overrides, paid sources, open-derived records, and OSM/heuristic fallbacks all preserve provenance/rollback fields.
- [x] [Review][Patch] Source precedence list still uses shorthand source path [`_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md`:117] — the ADR/architecture precedence lists still say `footprint + Baskarta Z + DTM` while the story requires the exact MVP open-data path. Expanded those list items to `2D Lantmäteriet footprints + Göteborg Baskarta 3D linework + Göteborg Höjdmodell 2022 DTM-derived ground elevation`.

## Dev Notes

### Current Artifact State

- The accepted course-correction commit is `8d00d04 feat(3): shadow data trust realignment`.
- That commit created `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md` and `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-02-shadow-data-trust-realignment.md`.
- It also updated `_bmad-output/planning-artifacts/prd.md`, `_bmad-output/planning-artifacts/architecture.md`, `_bmad-output/planning-artifacts/epics.md`, `_bmad-output/planning-artifacts/brief/project-brief.md`, `_bmad-output/qa/test-design-architecture.md`, `_bmad-output/qa/test-design-progress.md`, `project-context.md`, and `sprint-status.yaml`.
- At draft time, `sprint-status.yaml` already had uncommitted tracker refresh edits from the realignment work. Preserve those edits and only add this story's status transition/notes.

### Shadow Data Evidence Snapshot

- `building_geodata/byggnad_kn1480.gpkg` is local geodata input under a gitignored folder. The local README records one `byggnad` layer with 177,237 `MULTIPOLYGON` footprints in EPSG:3006, useful object metadata, no Z/M geometry, no building-height attribute, no roof geometry, and no DSM.
- The local derived candidate summary records 86,828 footprints inside the central bbox and 82,570 emitted height candidates.
- The derived height method is `max(Takkonturer/Fasad/Skärmtak Z) - DTM ground Z at representative point`.
- The filter summary records 56,776 included candidate shadow casters, 1,980 review records, and 23,814 excluded records. Review records must stay out of runtime until spot-checked; excluded records are diagnostics only.
- `ogrinfo` was not available in the drafting shell. Do not make the story depend on GDAL being installed; use the existing local README/summaries and planning ADR as evidence unless the implementation environment has GDAL available.

### Architecture Guardrails

- The durable target is a provenance-rich `shadow_casters` model, not the old `Geometry`/`Height` compatibility shape.
- `get_buildings_near_point` remains a compatibility RPC/view-backed adapter until the TypeScript engine is renamed. It must eventually return only active runtime casters: `active = true`, `filter_decision = 'include'`, `height_m >= 3`, and MVP-approved caster classes.
- Source precedence is per object/source priority. Future paid DSM/LOD2/LOD3 data must not erase provenance, rollback, or fallback records.
- High building-shadow confidence is cluster-scoped, not citywide. The validation gate details belong to Story 3.0.4; this story only ensures the requirement is preserved in planning docs.
- Confidence-engine behavior belongs to Story 3.0.5. Swedish user-facing uncertainty copy belongs to Story 3.0.6.
- Runtime schema/RPC work belongs to Story 3.0.2. Import pipeline work belongs to Story 3.0.3.

### File Impact

Likely files to inspect and possibly modify:

- `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-02-shadow-data-trust-realignment.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/brief/project-brief.md`
- `_bmad-output/qa/test-design-architecture.md`
- `_bmad-output/qa/test-design-progress.md`
- `project-context.md`
- `AGENTS.md` only if the canonical repo rulebook contains stale shadow-data guidance
- `building_geodata/goteborg-open/README.md` only as local evidence/prototype guidance; it is gitignored and cannot be the durable AC artifact

Avoid unless the scan proves a current stale statement must be corrected:

- `nextjs-app/app/**`
- `nextjs-app/components/**`
- `nextjs-app/hooks/**`
- `nextjs-app/lib/solar/**`
- `nextjs-app/lib/supabase/**`
- `nextjs-app/app/api/**`
- Database migrations or manual SQL files
- Visual reference PNGs or `REBASELINE-LOG.md`

### References

- `AGENTS.md` - repo rules: working directory, API boundary, Windows wrappers, story workflow, testing gates, and no admin runtime.
- `project-context.md` - durable project context, current shadow data correction, and Epic 3 pause state.
- `_bmad-output/planning-artifacts/epics.md` - Story 3.0.1 source ACs and Epic 3 Prelude sequencing.
- `_bmad-output/planning-artifacts/prd.md` - product-level shadow-data correction, risk mitigation, and confidence-trust requirements.
- `_bmad-output/planning-artifacts/architecture.md` - shadow-caster data architecture, source precedence, runtime filtering, and `get_buildings_near_point` compatibility.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - confirms confidence is a user-visible trust signal and that uncertainty copy belongs on existing confidence/about surfaces in later stories, not this planning-only story.
- `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md` - accepted ADR and primary source for this story.
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-02-shadow-data-trust-realignment.md` - approved course-correction rationale and backlog reorganization.
- `_bmad-output/implementation-artifacts/3-0-remove-admin-surface.md` - previous story learnings: admin is retired; service-role infrastructure is not admin functionality.
- `building_geodata/goteborg-open/README.md` - local evidence for existing geodata inputs and prototype-derived candidate/filter outputs.
- `building_geodata/goteborg-open/derived/buildings_central_639_14_640_14_height_candidates.summary.json` - local candidate derivation summary.
- `building_geodata/goteborg-open/derived/buildings_central_639_14_640_14_height_candidates.validation.md` - local candidate validation summary.
- `building_geodata/goteborg-open/derived/buildings_central_shadow_casters.filter_summary.md` - local include/review/exclude filter summary.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Draft baseline before story creation: `cd nextjs-app && npx.cmd tsc --noEmit` (pass); `cd nextjs-app && npx.cmd eslint . --quiet` (pass).
- Implementation baseline before edits: `cd nextjs-app && npx tsc --noEmit` (pass); `cd nextjs-app && npx eslint . --quiet` (pass).
- Task 1 context load: read AGENTS/project context/story plus relevant planning, ADR, sprint-change, UX, and Story 3.0 manual-operations/service-role sections; confirmed Story 3.1 remains paused until Stories 3.0.1-3.0.6 complete.
- Task 2 evidence load: read `building_geodata/goteborg-open/README.md`, height-candidate summary JSON, validation summary, and filter summary.
- Task 3 stale scan run with the story-prescribed `rg` command before and after documentation repairs; final matches classified as corrected current guidance, active story/AC text, or approved sprint-change historical context.
- Task 4 precedence/provenance scan confirmed ADR and architecture order; patched ADR and architecture to make rollback traceability explicit.
- Task 5 boundary check: confirmed Epic 3 Prelude order in `epics.md`, Story 3.1 pause notes in `sprint-status.yaml`, and no changed `nextjs-app` runtime/API/schema files.
- Final verification: `cd nextjs-app && npx tsc --noEmit` (pass); `cd nextjs-app && npx eslint . --quiet` (pass); `cd nextjs-app && npx vitest run` (40 files / 356 tests pass).
- Final stale-assumption scan rerun with the story-prescribed `rg` command; no needs-update matches remained.
- Review gate: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-1-shadow-data-adr-planning-realignment` passed; wrote local generated validation log `_bmad-output/implementation-artifacts/validation/3-0-1-shadow-data-adr-planning-realignment-review-20260602-185148.log`; skipped visual validation because no mapped screen ID was found.
- Code review Round 1 batch fixes: restored out-of-scope sprint tracker story IDs, clarified local-only validation/geodata artifacts, expanded source precedence shorthand, and made provenance/rollback wording apply to every source tier.
- Final post-review gate rerun: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-1-shadow-data-adr-planning-realignment` passed on 2026-06-02; lint, typecheck, and Vitest passed; local generated validation log `_bmad-output/implementation-artifacts/validation/3-0-1-shadow-data-adr-planning-realignment-review-20260602-220805.log`; visual validation skipped because no mapped screen ID was found.

### Completion Notes List

- Story drafted by Codex on 2026-06-02.
- Acceptance criteria are preserved verbatim from `_bmad-output/planning-artifacts/epics.md`.
- Draft confirmed this is a planning-only story with no standalone visual reference and no runtime behavior change.
- Draft analysis found the main active planning artifacts already contain the accepted correction from commit `8d00d04`; implementation should verify consistency and patch remaining stale notes rather than expand scope into schema/import/confidence work.
- Draft analysis found one local gitignored prototype note in `building_geodata/goteborg-open/README.md` that still points the next production/import target at the old TypeScript compatibility shape. The implementation should update or qualify that local note if it remains present, while keeping durable AC evidence in tracked planning artifacts.
- Story-file-audit: all seven checks pass (ACs preserved; planning-only design gate present; tasks dependency-sequenced; scope excludes downstream schema/import/confidence/UX work; file impact reflects planning/local-evidence surfaces; references include AGENTS/project context/epics/PRD/architecture/UX spec/ADR/local evidence; test gate matches docs/planning risk).
- Task 1 complete: baseline typecheck/lint passed before edits, required context loaded, sprint sequencing confirmed with `3-0-1-shadow-data-adr-planning-realignment` first in the prelude and Story 3.1 still paused.
- Task 2 complete: local evidence confirms `building_geodata/byggnad_kn1480.gpkg` has one 2D footprint layer with no Z/M geometry, no building-height attribute, no roof geometry, and no DSM data; the central bbox is EPSG:3007 `x=140000..150000, y=6390000..6410000`; derived candidates come from footprints + Baskarta `byggnad_l` + Höjdmodell 2022 DTM; first runtime/import filter output is 56,776 included candidates with 1,980 review and 23,814 excluded.
- Task 3 complete: no durable current-planning artifact now implies `building_geodata/byggnad_kn1480.gpkg` alone can power shadows; top-level PRD/architecture/epics/project-brief guidance uses the combined path `2D Lantmäteriet footprints + Göteborg Baskarta 3D linework + Göteborg Höjdmodell 2022 DTM-derived ground elevation`; ADR and active planning context document the central EPSG:3007 bbox `x=140000..150000, y=6390000..6410000`; the local gitignored geodata README was also updated in this working copy to point forward to the provenance-rich `shadow_casters` contract, but durable guidance remains in tracked planning docs.
- Task 4 complete: ADR and architecture preserve the required source precedence order: manual verified override, paid LOD2/LOD3 or surveyed roof geometry, paid classified DSM/LAS-derived object height, current open-data derived height, and OSM/heuristic fallback. Both now explicitly preserve source dataset, external ID or manual override ID, object metadata, source priority, import-batch traceability, rollback path, and open-derived fallback/source-comparison records for every source tier.
- Task 5 complete: downstream boundaries remain intact. `epics.md` keeps Stories 3.0.1-3.0.6 in the required order before Story 3.1, `sprint-status.yaml` keeps Story 3.1 paused by notes/context, no runtime app code/database migration/API contract/UI copy files were edited, and Story 3.0's no-admin/manual-operations decision remains preserved.
- Task 6 verification complete through 6.5: typecheck, lint, and Vitest passed; no Playwright, app build, or visual validation required because this is a planning-only story and no runtime/UI files changed. Final stale-assumption scan classification: corrected current guidance (`project-context.md`, PRD, architecture, epics, project brief, ADR), active story/AC text (Story 3.0.1 acceptance criteria and pause note), and approved sprint-change historical context/success criteria; no local prototype note or durable planning artifact remained in needs-update state.
- Story review gate passed and moved sprint status to `review`. The gate reran lint, typecheck, and Vitest successfully and skipped visual validation because the story has no mapped screen ID.
- Rasmus approved completing the story after Round 1 fixes and the final story gate passed. Story status and sprint tracking moved `review -> done`.

### File List

- `_bmad-output/implementation-artifacts/3-0-1-shadow-data-adr-planning-realignment.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/brief/project-brief.md`
- `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/prd.md`
- Local-only generated/ignored evidence, not part of the tracked file list: `_bmad-output/implementation-artifacts/validation/3-0-1-shadow-data-adr-planning-realignment-review-20260602-185148.log`, `_bmad-output/implementation-artifacts/validation/3-0-1-shadow-data-adr-planning-realignment-review-20260602-220805.log`, `building_geodata/goteborg-open/README.md`

## Change Log

| Date | Author | Note |
|------|--------|------|
| 2026-06-02 | Codex | Story drafted from accepted shadow-data trust realignment ADR, Epic 3 Prelude sequencing, local geodata evidence, and current planning artifacts. Status -> ready-for-dev. |
| 2026-06-02 | Amelia | Verified and repaired shadow-data planning guidance, documented local geodata evidence, made provenance/rollback explicit, aligned downstream story boundaries, and passed the review gate. Status -> review. |
| 2026-06-02 | Codex | Applied code review Round 1 fixes for tracker story IDs, source precedence wording, every-source rollback/provenance, and local-only artifact clarity. |
| 2026-06-02 | Codex | Reran the story gate after review fixes, received Rasmus approval, and moved story status to done. |
