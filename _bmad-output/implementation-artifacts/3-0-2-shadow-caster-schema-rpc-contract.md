---
baseline_commit: dfbfa7c
drafted_at: 2026-06-03T14:00:46+02:00
---

# Story 3.0.2: Shadow Caster Schema & RPC Contract

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Sequencing:** This is the second Epic 3 Prelude story. Story 3.0.1 is done. Complete Stories 3.0.2-3.0.6 before Story 3.1 routing work proceeds, even though Story 3.1 is already tracked as ready-for-dev.
>
> **Scope boundary:** This story creates the durable schema/RPC contract or manual SQL plan for `shadow_casters` and the compatibility `get_buildings_near_point` adapter. Do not build the repeatable import pipeline, execute bulk geodata imports, implement confidence-engine coverage semantics, write Swedish uncertainty copy, or change consumer UI in this story.
>
> **Database safety:** This checkout still has no authoritative Supabase migration folder. If no approved migration location is discovered during implementation, create a manual-run SQL handoff at `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql` and do not execute destructive SQL automatically.

## Story

As a **backend maintainer**,
I want a provenance-rich shadow-caster schema and runtime RPC contract,
So that the shadow engine consumes only filtered active casters with explicit quality and source metadata.

## Acceptance Criteria

**Given** derived shadow casters need more metadata than the existing `Geometry`/`Height` compatibility shape
**When** the database migration or manual SQL plan is created
**Then** it defines `shadow_casters` fields for geometry, height, RH2000 ground/roof Z, height method/source, source dataset/external ID, source object metadata, quality score, tier, filter decision/reasons, CRS/provenance metadata, caster class, source priority, active flag, import batch, and timestamps.

**Given** `nextjs-app/lib/solar/shadow-calculation-service.ts` currently calls `get_buildings_near_point`
**When** the RPC contract is updated
**Then** `get_buildings_near_point` remains as a compatibility RPC or view-backed adapter until the TypeScript engine is renamed
**And** it returns only runtime-active records: `active = true`, `filter_decision = 'include'`, `height_m >= 3`, and MVP-approved caster classes.

**Given** review and excluded records exist
**When** they are imported or stored
**Then** review/quarantine records are inactive until spot-checked
**And** excluded records are omitted from runtime or retained only as diagnostics.

**Design Gate Criteria:**
- **Visual:** No standalone visual reference. Backend/data-contract story.
- **Behaviour:** Public APIs should preserve existing response shape unless an explicit API contract update is part of the story.
- **Visual validation:** Not applicable unless consumer UI files change.

## Tasks / Subtasks

- [x] **Task 1: Baseline and source-context check** (AC: all)
  - [x] 1.1 Run `cd nextjs-app && npx tsc --noEmit` before editing. Stop and surface any errors outside story scope.
  - [x] 1.2 Run `cd nextjs-app && npx eslint . --quiet` before editing. Stop and surface any errors outside story scope.
  - [x] 1.3 Read `AGENTS.md`, `project-context.md`, this story, `_bmad-output/planning-artifacts/epics.md`, `_bmad-output/planning-artifacts/prd.md`, `_bmad-output/planning-artifacts/architecture.md`, `_bmad-output/planning-artifacts/ux-design-specification.md`, `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md`, and `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-02-shadow-data-trust-realignment.md`.
  - [x] 1.4 Read previous Story 3.0.1 completion notes in `_bmad-output/implementation-artifacts/3-0-1-shadow-data-adr-planning-realignment.md`, especially the downstream boundary notes and review findings.
  - [x] 1.5 Confirm sprint sequencing: `3-0-2-shadow-caster-schema-rpc-contract` is the first `backlog` prelude story, Epic 3 is already `in-progress`, and Story 3.1 remains paused until Stories 3.0.2-3.0.6 are complete.
  - [x] 1.6 Preserve unrelated dirty work. At draft time, the only dirty files were generated validation logs for Story 3.0.1; do not delete or stage them unless explicitly required.

- [x] **Task 2: Choose the schema delivery path without guessing production state** (AC: #1, #3)
  - [x] 2.1 Search for authoritative migration/schema locations before writing SQL:
    - `rg --files | rg "(supabase|migration|migrations|schema).*\\.(sql|ts|md)$"`
    - `rg -n "create table|create or replace function|get_buildings_near_point|shadow_casters|from\\('buildings'\\)" nextjs-app _bmad-output AGENTS.md project-context.md`
  - [x] 2.2 If an approved migration folder is found or provided by Rasmus, place the migration there and also document the manual execution path in the story completion notes.
  - [x] 2.3 If no approved migration folder exists, create `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql` with a top comment `-- MANUAL-RUN ONLY: review before executing in Supabase`.
  - [x] 2.4 The SQL must be idempotent where practical (`create table if not exists`, `create or replace function`, guarded indexes/constraints where possible) and must separate diagnostics, creation, backfill/import placeholders, privilege changes, and rollback notes.
  - [x] 2.5 Do not execute destructive schema changes, import 56k records, or drop the existing `buildings` compatibility table/function automatically. If live Supabase diagnostics are needed, make them read-only unless Rasmus explicitly approves otherwise.

- [x] **Task 3: Define the `shadow_casters` runtime table contract** (AC: #1, #3)
  - [x] 3.1 Define a `shadow_casters` table or migration target with the story-required fields from `architecture.md` and the ADR:
    - identity: `id`
    - runtime geometry: WGS84 polygon geometry for the existing TypeScript engine
    - height: `height_m`
    - RH2000 Z values: `ground_z_rh2000`, `roof_z_rh2000`
    - derivation: `height_method`, `height_source`
    - source identity: `source_dataset`, `source_external_id`, `source_footprint_fid`
    - source object metadata: `source_object_type`, `source_purpose`, `source_geometry_type`, plus structured metadata for fields such as `areaM2` and `baskartaZStats`
    - engine/provenance metadata: `engine_geometry_method`, CRS metadata for WGS84 runtime geometry and EPSG:3007 metric/bbox data, provenance metadata
    - quality/filtering: `quality_score`, `shadow_caster_tier`, `filter_decision`, `filter_reasons`, `source_flags`, `matched_line_count`, `z_spread_m`
    - metric location helpers: `bbox_3007`, `centroid_3007`
    - runtime classification: `caster_class`, `source_priority`, `active`
    - import traceability: `import_batch_id`, `imported_at`, `updated_at`
  - [x] 3.2 Add constraints that prevent accidental runtime activation of unsafe records:
    - `height_m >= 0`
    - `quality_score` is nullable or between `0` and `1`
    - `filter_decision` only allows `include`, `review`, or `exclude`
    - `caster_class` only allows `building`, `structure`, `vegetation`, or `manual_override`
    - active records must have `filter_decision = 'include'`
    - active records must have `height_m >= 3`
  - [x] 3.3 Add spatial/performance indexes that match the chosen radius-query implementation. Do not use degree-based distance math for the `p_radius_meters` RPC parameter.
  - [x] 3.4 Add supporting btree/partial indexes for `active`, `filter_decision`, `caster_class`, `source_priority`, and `import_batch_id` where useful.
  - [x] 3.5 Preserve source-precedence extensibility. Do not add uniqueness constraints that erase lower-priority fallback/source-comparison records.
  - [x] 3.6 If a lightweight `shadow_caster_import_batches` table is added, keep it metadata-only. Story 3.0.3 owns repeatable import execution.

- [x] **Task 4: Implement or specify the `get_buildings_near_point` compatibility adapter** (AC: #2, #3)
  - [x] 4.1 Preserve the existing RPC name and argument names consumed by `nextjs-app/lib/solar/shadow-calculation-service.ts`: `get_buildings_near_point`, `p_latitude`, `p_longitude`, and `p_radius_meters`.
  - [x] 4.2 Return the compatibility row shape expected by the current TypeScript mapper unless the mapper is explicitly updated in the same story:
    - `Id`
    - `Geometry`
    - `Height`
    - `Source`
    - `QualityScore`
    - `ExternalId`
    - `HeightSource`
    - `BuildingType`
  - [x] 4.3 The adapter must read from `shadow_casters` or a `shadow_casters`-backed compatibility view and filter to runtime records only:
    - `active = true`
    - `filter_decision = 'include'`
    - `height_m >= 3`
    - MVP default `caster_class = 'building'`
    - manually approved `structure` records may be included when present
    - `vegetation` remains inactive/out of runtime until later confidence rules approve it
  - [x] 4.4 If multiple records represent the same logical object, the adapter must select the highest-priority runtime candidate while preserving the lower-priority records in storage. Define whether lower or higher numeric `source_priority` wins in the SQL comments.
  - [x] 4.5 Use a meter-correct PostGIS query. For WGS84 runtime geometry this means either a geography-based query/index or a transformed metric geometry/query in EPSG:3007. Do not compare WGS84 degree distance to meters.
  - [x] 4.6 Explicitly handle review/excluded data: review records must be `active = false`; excluded records must either stay out of `shadow_casters` runtime storage or be stored only as diagnostics with `active = false`.
  - [x] 4.7 If `SECURITY DEFINER` is used, set a safe `search_path` and explicitly revoke/grant function execution. If it is not needed, prefer `SECURITY INVOKER`.

- [x] **Task 5: Align the TypeScript engine boundary without renaming the engine yet** (AC: #2, #3)
  - [x] 5.1 Audit `nextjs-app/lib/solar/shadow-calculation-service.ts`, `nextjs-app/lib/solar/types.ts`, and `nextjs-app/lib/solar/shadow-geometry.ts`.
  - [x] 5.2 Keep the current `Building` type and `get_buildings_near_point` call unless an adapter helper is required for testability. Renaming `Building` to `ShadowCaster` belongs to a later engine-contract cleanup.
  - [x] 5.3 Remove or neutralize the legacy fallback that queries `.from('buildings')` directly if it can return unfiltered records. Runtime failure should not silently bypass the `shadow_casters` active/include contract.
  - [x] 5.4 If the RPC returns new `HeightSource` values, update `HeightSource` and `calculateShadowConfidence` together with tests. Do not return unrecognized values that fall into the low-confidence default by accident.
  - [x] 5.5 Keep all data access server-side through `supabaseServiceRole`. Do not import Supabase, solar, or building modules into client components.

- [x] **Task 6: Add regression coverage for the compatibility contract** (AC: #2, #3)
  - [x] 6.1 Add or update Vitest coverage around the shadow calculation service/RPC adapter so mocked Supabase data proves the service calls `get_buildings_near_point` with the expected argument names.
  - [x] 6.2 Test that rows shaped like the compatibility RPC output map into the existing `Building` model and can be used for shadow projection without changing public API response shape.
  - [x] 6.3 Test that an RPC failure no longer falls back to unfiltered legacy `buildings` data, or document the safe fallback if the implementation keeps one.
  - [x] 6.4 If SQL text is generated rather than a migration executed in tests, include SQL-level smoke/diagnostic queries in the manual SQL file for Rasmus to run: table existence, required columns, required constraints/indexes, function signature, function privileges, and a sample `select * from get_buildings_near_point(...) limit 5`.
  - [x] 6.5 Do not add Playwright or visual tests unless consumer UI files change.

- [x] **Task 7: Preserve downstream prelude boundaries and documentation clarity** (AC: all)
  - [x] 7.1 Do not build or modify the repeatable open-geodata import pipeline under `building_geodata/goteborg-open/tools/`; Story 3.0.3 owns that.
  - [x] 7.2 Do not implement cluster validation storage/gates beyond schema placeholders needed for provenance; Story 3.0.4 owns spot-check gates.
  - [x] 7.3 Do not alter confidence scoring semantics beyond preventing unsafe height-source fallbacks; Story 3.0.5 owns data coverage and confidence caps.
  - [x] 7.4 Do not add Swedish uncertainty copy or About-page data-source copy; Story 3.0.6 owns user-facing content.
  - [x] 7.5 Preserve Story 3.0's manual-operations decision: no admin page, no admin venue/building upload API, no admin auth, no candidate review queue.
  - [x] 7.6 Update durable planning docs only if implementation discovers a contract ambiguity that must be resolved for later stories.

- [x] **Task 8: Final verification and review gate** (AC: all)
  - [x] 8.1 Run `cd nextjs-app && npx tsc --noEmit`.
  - [x] 8.2 Run `cd nextjs-app && npx eslint . --quiet`.
  - [x] 8.3 Run `cd nextjs-app && npx vitest run`.
  - [x] 8.4 Run `cd nextjs-app && npm run build` if runtime TypeScript files, API routes, package files, or Next configuration changed. If only SQL/docs/tests changed, document the skip rationale.
  - [x] 8.5 No Playwright or visual validation is required unless public consumer UI files change.
  - [x] 8.6 Run scoped contract scans and record remaining matches:
    - `rg -n "get_buildings_near_point|from\\('buildings'\\)|shadow_casters|filter_decision|caster_class|source_priority|HeightSource" nextjs-app _bmad-output/implementation-artifacts _bmad-output/planning-artifacts`
    - `rg -n "\\badmin\\b|Admin|/api/admin|building upload|candidate review" nextjs-app --glob "!docs/design/references/**" --glob "!package-lock.json"`
  - [x] 8.7 Before changing sprint status to `review`, run `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-2-shadow-caster-schema-rpc-contract`. If PowerShell execution policy blocks the wrapper, rerun with `powershell.exe -ExecutionPolicy Bypass -File .\scripts\run-sh.ps1 scripts/story-review.sh 3-0-2-shadow-caster-schema-rpc-contract`.

### Review Findings

- [x] [Review][Patch] RPC failure is treated as no casters, which can surface as a sunny/high-confidence result [nextjs-app/lib/solar/shadow-calculation-service.ts:180]
- [x] [Review][Patch] Runtime de-duplication can collapse distinct footprints that share a source external ID [_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql:309]
- [x] [Review][Patch] Existing-table upgrade path leaves active-record safeguards nullable or incomplete [_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql:99]
- [x] [Review][Patch] Manual RPC replacement can fail when an existing function has an incompatible return type [_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql:282]
- [x] [Review][Patch] RPC grants to anon/authenticated contradict the server-side service-role boundary [_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql:382]
- [x] [Review][Patch] Active runtime geometry is not guarded against invalid or empty polygons [_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql:47]

#### Round 2 Findings

- [x] [Review][Patch] Rejected RPC calls bypass the unavailable-shadow fallback [nextjs-app/lib/solar/shadow-calculation-service.ts:177]
- [x] [Review][Patch] `SECURITY INVOKER` compatibility RPC lacks an explicit service-role table read grant [_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql:418]
- [x] [Review][Patch] Existing-data cleanup can fail before new active-row constraints are added [_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql:166]
- [x] [Review][Patch] Active vegetation rows can still be stored as runtime-active despite MVP exclusion [_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql:248]
- [x] [Review][Patch] Existing constraints with stale definitions are not upgraded because checks only test constraint names [_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql:211]
- [x] [Review][Patch] Existing-table upgrade path does not add the required `id` identity used by the RPC [_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql:99]
- [x] [Review][Patch] Additional `get_buildings_near_point` overloads can remain and make PostgREST routing ambiguous [_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql:395]

#### Round 3 Findings

- [x] [Review][Patch] Document and test `logicalObjectId` as a globally normalized canonical key [_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql:440]
- [x] [Review][Patch] Unapproved active structures can block the manual SQL upgrade [_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql:224]
- [x] [Review][Patch] Existing `PUBLIC` table grants are not revoked from `shadow_casters` [_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql:530]
- [x] [Review][Patch] Upgrade path can leave RPC `Id` non-unique when another primary key already exists [_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql:146]
- [x] [Review][Patch] Invalid height values are not normalized before height constraints and runtime use [_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql:160]
- [x] [Review][Patch] Active runtime geometry is not bounded to WGS84 coordinate ranges before geography casts [_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql:311]
- [x] [Review][Patch] Whitespace-only `source_dataset` values can remain runtime-active [_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql:322]
- [x] [Review][Defer] Empty active shadow-caster coverage can still report full sun with high confidence [nextjs-app/lib/solar/shadow-calculation-service.ts:29] - deferred, pre-existing; Story 3.0.5 owns data coverage/confidence semantics.

## Dev Notes

### Current Codebase Snapshot

- `nextjs-app/lib/solar/shadow-calculation-service.ts` is the only active runtime consumer of `get_buildings_near_point`.
- The current RPC call passes `{ p_latitude, p_longitude, p_radius_meters }` and maps returned rows through PascalCase compatibility fields: `Id`, `Geometry`, `Height`, `Source`, `QualityScore`, `ExternalId`, `HeightSource`, and `BuildingType`.
- The current fallback path queries `.from('buildings')` when the RPC fails. That fallback is now risky because it can bypass the new `active/filter_decision/height/caster_class` runtime contract.
- `nextjs-app/lib/solar/types.ts` still exposes the engine-facing `Building` interface and `HeightSource = 'Surveyed' | 'Osm' | 'Heuristic' | 'ManualOverride'`.
- `nextjs-app/lib/buildings/` does not exist in this checkout after Story 3.0 removed the old admin-operated import helper. Create new backend-only helpers only if they are needed for this schema/RPC story; do not recreate an admin upload path.
- `nextjs-app/lib/supabase/types.ts` is still a placeholder and the repo has no tracked authoritative Supabase schema/migration folder at draft time.

### Contract Target From Planning Artifacts

- The durable target is a provenance-rich `shadow_casters` contract, not the old `Geometry`/`Height` table shape.
- MVP launch scope remains central/south-central Gothenburg only: EPSG:3007 bbox `x=140000..150000, y=6390000..6410000`.
- Runtime shadows must use filtered active records derived from 2D Lantmäteriet footprints + Göteborg Baskarta 3D linework + Göteborg Höjdmodell 2022 DTM-derived ground elevation.
- `get_buildings_near_point` remains a compatibility RPC/view-backed adapter until the TypeScript engine is renamed.
- Runtime-active rows must satisfy `active = true`, `filter_decision = 'include'`, `height_m >= 3`, and MVP-approved caster classes.
- MVP caster classes: `building` by default; `structure` only when manually approved; `vegetation` initially disabled or low-confidence until later rules exist; `manual_override` for hand-entered high-impact corrections.
- Review/quarantine rows are inactive until spot-checked. Excluded rows are omitted from runtime or retained only as diagnostics.
- Source precedence is per logical object/source priority. Higher-priority records override runtime selection but do not erase fallback/source-comparison provenance.

### Local Geodata Prototype Field Mapping

The local prototype under `building_geodata/goteborg-open/` is gitignored but is important context. It emits properties that should map cleanly into the SQL contract:

| Prototype property | Contract target |
| --- | --- |
| `source` | `source_dataset` |
| `sourceFootprintFid` | `source_footprint_fid` |
| `externalId` | `source_external_id` |
| `objectType` | `source_object_type` |
| `purpose` | `source_purpose` |
| `areaM2`, `baskartaZStats` | `source_object_metadata` / provenance JSON |
| `heightM`, `shadowHeightM` | `height_m` |
| `heightSource` | `height_source` |
| `qualityScore`, `shadowRuntimeQualityScore` | `quality_score` |
| `groundZRh2000` | `ground_z_rh2000` |
| `roofZRh2000` | `roof_z_rh2000` |
| `heightCandidateMethod`, `shadowHeightMethod` | `height_method` |
| `engineGeometryMethod` | `engine_geometry_method` |
| `sourceGeometryType` | `source_geometry_type` |
| `matchedLineCount` | `matched_line_count` |
| `zSpreadM` | `z_spread_m` |
| `centroid3007` | `centroid_3007` |
| `bbox3007` | `bbox_3007` |
| `shadowImportDecision` | `filter_decision` |
| `shadowFilterReasons` | `filter_reasons` |
| `shadowSourceFlags` | `source_flags` |
| `shadowCasterTier` | `shadow_caster_tier` |

Local counts from the current prototype:

- 177,237 footprints read; 86,828 inside the MVP bbox.
- 82,570 emitted height candidates.
- Filter output: 56,776 include, 1,980 review, 23,814 exclude.
- Include records should be the first runtime candidate source; review records stay inactive; excluded records stay diagnostics-only.

### Latest Technical Notes

- Supabase database functions can be called from JavaScript via `.rpc(functionName, args)`, and functions returning table sets can be filtered. The current app already uses this pattern through `supabaseServiceRole.rpc('get_buildings_near_point', ...)`.
- Supabase and PostgreSQL both warn that function privileges matter. By default, functions can be executable broadly; if a function should not be public, explicitly revoke/grant execute privileges. If `SECURITY DEFINER` is used, set a safe `search_path`.
- PostGIS `ST_DWithin` geometry distances use the geometry SRID's units, while geography distances use meters. Because the app passes `p_radius_meters`, the adapter must use geography or a metric projection such as EPSG:3007, not raw WGS84 degree distance.
- PostGIS `ST_DWithin` can use available geometry indexes through bounding-box comparison. PostgreSQL supports GiST indexes for spatial query patterns; for live populated tables, index creation can affect writes, so the manual SQL should document whether `CREATE INDEX CONCURRENTLY` is appropriate outside a transaction.

### Previous Story Intelligence

- Story 3.0.1 verified the course correction and left runtime schema/RPC work explicitly to this story.
- Story 3.0.1 review fixed out-of-scope sprint tracker key rewrites. Do not rename existing story keys or adjust unrelated tracker rows.
- Story 3.0 removed admin surfaces and created manual SQL instead of executing database cleanup because the repo lacks authoritative schema/migrations. Follow the same safety posture here.
- Story 3.0 renamed `AdminOverride` to `ManualOverride`; do not reintroduce admin terminology in height source, provenance, SQL comments, or docs.

### File Impact

Likely files to create or modify:

- `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql` if no approved migration folder exists.
- `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `nextjs-app/lib/solar/shadow-calculation-service.ts` if the fallback or mapper must be adjusted for the compatibility contract.
- `nextjs-app/lib/solar/types.ts` and `nextjs-app/lib/solar/shadow-geometry.ts` only if returned height-source values change.
- `nextjs-app/test/unit/**` for shadow calculation/RPC adapter regression coverage.
- `_bmad-output/planning-artifacts/architecture.md` only if implementation discovers a real ambiguity in the schema/RPC contract.

Avoid unless explicitly required:

- `building_geodata/goteborg-open/tools/**` repeatable import pipeline work.
- Bulk generated geodata files under `building_geodata/goteborg-open/derived/**`.
- Consumer UI files under `nextjs-app/app/**`, `nextjs-app/components/**`, and `nextjs-app/hooks/**`.
- Confidence-engine semantics beyond safe height-source handling.
- Swedish user-facing uncertainty copy.
- Admin UI/API/auth/building upload surfaces.
- Visual reference PNGs or `REBASELINE-LOG.md`.

### References

- `AGENTS.md` - repo rules: working directory, API boundary, future monetization quarantine, story workflow, Windows wrappers, and testing gates.
- `project-context.md` - durable SunnySeat context, active shadow-data correction, and Screen ID route map.
- `_bmad-output/planning-artifacts/epics.md#Story-3.0.2-Shadow-Caster-Schema--RPC-Contract` - source story, ACs, design gate, and adjacent prelude boundaries.
- `_bmad-output/planning-artifacts/architecture.md#Shadow-Caster-Data-Architecture` - runtime table contract, filtering, source precedence, and compatibility RPC requirements.
- `_bmad-output/planning-artifacts/prd.md#Shadow-Data-Trust-Realignment` - product-level launch scope, active-record requirement, and uncertainty principles.
- `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md#Runtime-Data-Contract` - accepted ADR for `shadow_casters`, `get_buildings_near_point`, caster classes, and source precedence.
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-02-shadow-data-trust-realignment.md#Technical-Impact` - approved course-correction sequence and implementation handoff.
- `_bmad-output/implementation-artifacts/3-0-1-shadow-data-adr-planning-realignment.md` - previous story learnings and downstream boundaries.
- `_bmad-output/implementation-artifacts/3-0-remove-admin-surface.md` - manual database-operation posture and service-role/admin terminology boundary.
- `building_geodata/goteborg-open/README.md` - local prototype inputs, derived outputs, and source metadata field context.
- `building_geodata/goteborg-open/derived/buildings_central_639_14_640_14_height_candidates.summary.json` - local candidate derivation counts and input sources.
- `building_geodata/goteborg-open/derived/buildings_central_639_14_640_14_height_candidates.validation.md` - local candidate quality/flag/cluster summary.
- `building_geodata/goteborg-open/derived/buildings_central_shadow_casters.filter_summary.md` - local include/review/exclude counts and runtime recommendation.
- Supabase Docs, "Database Functions" and JavaScript `rpc()` reference - current RPC/function privilege guidance.
- PostgreSQL Docs, `CREATE FUNCTION` - function replacement, `SECURITY DEFINER`, `search_path`, and execute privilege guidance.
- PostgreSQL 15 Docs, `CREATE INDEX` - GiST/index creation considerations for PostgreSQL 15.
- PostGIS Docs, `ST_DWithin` - SRID units, geography meters, and indexed bounding-box behavior.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex (Codex desktop)

### Debug Log References

- Baseline before edits: `cd nextjs-app && npx.cmd tsc --noEmit` (pass); `cd nextjs-app && npx.cmd eslint . --quiet` (pass).
- Migration/schema discovery: story-prescribed `rg --files | rg "(supabase|migration|migrations|schema).*\\.(sql|ts|md)$"` and `rg -n "create table|create or replace function|get_buildings_near_point|shadow_casters|from\\('buildings'\\)" nextjs-app _bmad-output AGENTS.md project-context.md`; no tracked authoritative SQL migration folder found, and `infrastructure/supabase/migrations` is absent.
- Red phase: `cd nextjs-app && npx.cmd vitest run test/unit/shadow-caster-sql-contract.test.ts test/unit/shadow-calculation-service.test.ts` failed because the manual SQL file did not exist and RPC failure still queried `.from('buildings')`.
- Green phase: focused tests passed after adding the manual SQL and removing the unfiltered fallback.
- Regression check after Tasks 1-7: `cd nextjs-app && npx.cmd tsc --noEmit` (pass); `cd nextjs-app && npx.cmd eslint . --quiet` (pass); `cd nextjs-app && npx.cmd vitest run` (42 files / 363 tests pass).
- Final verification before review gate: `cd nextjs-app && npx.cmd tsc --noEmit` (pass); `cd nextjs-app && npx.cmd eslint . --quiet` (pass); `cd nextjs-app && npx.cmd vitest run` (42 files / 363 tests pass); `cd nextjs-app && npm run build` (pass, with existing Next/Turbopack workspace-root warning about multiple lockfiles).
- Scoped contract scan 1: remaining matches are expected planning/story/SQL/test/runtime references. Runtime code keeps `get_buildings_near_point`; no live `nextjs-app` `.from('buildings')` fallback remains. The only `from\\('buildings'\\)` matches are story/debug text documenting the removed fallback.
- Scoped contract scan 2: `rg -n "\\badmin\\b|Admin|/api/admin|building upload|candidate review" nextjs-app --glob "!docs/design/references/**" --glob "!package-lock.json"` returned no matches.
- Review gate: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-2-shadow-caster-schema-rpc-contract` passed; lint, typecheck, and Vitest passed; visual validation skipped because no mapped screen ID was found; sprint status moved `in-progress -> review`; validation log generated at `_bmad-output/implementation-artifacts/validation/3-0-2-shadow-caster-schema-rpc-contract-review-20260603-142900.log`.
- Review follow-up baseline: `cd nextjs-app && npx.cmd tsc --noEmit` (pass); `cd nextjs-app && npx.cmd eslint . --quiet` (pass).
- Review follow-up red phase: `cd nextjs-app && npx.cmd vitest run test/unit/shadow-calculation-service.test.ts test/unit/shadow-caster-sql-contract.test.ts` failed as expected against the six review findings (runtime RPC failure still returned high-confidence/no-shadow data; SQL contract lacked the hardened de-dupe, upgrade, replacement, privilege, and active-geometry assertions).
- Review follow-up green phase: focused Vitest for `shadow-calculation-service.test.ts` and `shadow-caster-sql-contract.test.ts` passed (2 files / 9 tests).
- Review follow-up validation: `cd nextjs-app && npx.cmd tsc --noEmit` (pass); `cd nextjs-app && npx.cmd eslint . --quiet` (pass); `cd nextjs-app && npx.cmd vitest run` (42 files / 365 tests pass); `cd nextjs-app && npm run build` (pass, with existing Next/Turbopack workspace-root warning about multiple lockfiles).
- Review follow-up scoped scans: contract scan returned expected planning/story/SQL/test/runtime references; narrow `rg -n "from\\('buildings'\\)" nextjs-app` returned no matches; admin-surface scan returned no active `nextjs-app` matches.
- Review follow-up gate: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-2-shadow-caster-schema-rpc-contract` passed; lint, typecheck, and Vitest passed; visual validation skipped because no mapped screen ID was found; sprint status moved `in-progress -> review`; validation log generated at `_bmad-output/implementation-artifacts/validation/3-0-2-shadow-caster-schema-rpc-contract-review-20260604-110821.log`.
- Review follow-up Round 2 baseline: `cd nextjs-app && npx.cmd tsc --noEmit` (pass); `cd nextjs-app && npx.cmd eslint . --quiet` (pass).
- Review follow-up Round 2 red phase: `cd nextjs-app && npx.cmd vitest run test/unit/shadow-calculation-service.test.ts test/unit/shadow-caster-sql-contract.test.ts` failed as expected against the seven Round 2 findings (2 files / 5 failing assertions across rejected RPC handling and SQL contract hardening).
- Review follow-up Round 2 green phase: focused Vitest for `shadow-calculation-service.test.ts` and `shadow-caster-sql-contract.test.ts` passed (2 files / 11 tests).
- Review follow-up Round 2 validation: `cd nextjs-app && npx.cmd tsc --noEmit` (pass); `cd nextjs-app && npx.cmd eslint . --quiet` (pass); `cd nextjs-app && npx.cmd vitest run` (42 files / 367 tests pass); `cd nextjs-app && npm run build` (pass, with existing Next/Turbopack workspace-root warning about multiple lockfiles).
- Review follow-up Round 2 scoped scans: contract scan returned expected planning/story/SQL/test/runtime references; `rg -n "\\badmin\\b|Admin|/api/admin|building upload|candidate review" nextjs-app --glob "!docs/design/references/**" --glob "!package-lock.json"` returned no active `nextjs-app` matches.
- Review follow-up Round 2 gate: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-2-shadow-caster-schema-rpc-contract` passed; lint, typecheck, and Vitest passed; visual validation skipped because no mapped screen ID was found; sprint status moved `in-progress -> review`; validation log generated at `_bmad-output/implementation-artifacts/validation/3-0-2-shadow-caster-schema-rpc-contract-review-20260604-130427.log`.
- Review follow-up Round 2 final gate rerun after table-privilege hardening: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-2-shadow-caster-schema-rpc-contract` passed; lint, typecheck, and Vitest passed (42 files / 367 tests); visual validation skipped because no mapped screen ID was found; sprint status was already `review`; validation log generated at `_bmad-output/implementation-artifacts/validation/3-0-2-shadow-caster-schema-rpc-contract-review-20260604-130637.log`.
- Review follow-up Round 3 focused validation: `cd nextjs-app && npx.cmd vitest run test/unit/shadow-caster-sql-contract.test.ts test/unit/shadow-calculation-service.test.ts` passed (2 files / 11 tests) after pinning the global `logicalObjectId` contract, structure approval cleanup, table `PUBLIC` revoke, id uniqueness, invalid-height normalization, WGS84 runtime geometry bounds, and trimmed `source_dataset` checks.
- Review follow-up Round 3 final validation: `cd nextjs-app && npx.cmd tsc --noEmit` (pass); `cd nextjs-app && npx.cmd eslint . --quiet` (pass); `cd nextjs-app && npx.cmd vitest run` (42 files / 367 tests pass).
- Review follow-up Round 3 gate: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-2-shadow-caster-schema-rpc-contract` passed; lint, typecheck, and Vitest passed (42 files / 367 tests); visual validation skipped because no mapped screen ID was found; sprint status was already `review`; validation log generated at `_bmad-output/implementation-artifacts/validation/3-0-2-shadow-caster-schema-rpc-contract-review-20260604-152503.log`.
- Human approval closeout: Rasmus approved Story 3.0.2 after Round 3 fixes; sprint status moved `review -> done` on 2026-06-04. No new code checks were run for this tracking-only status update; the final Round 3 gate remains `_bmad-output/implementation-artifacts/validation/3-0-2-shadow-caster-schema-rpc-contract-review-20260604-152503.log`.

### Completion Notes List

- Story drafted by Codex on 2026-06-03.
- Acceptance criteria are preserved verbatim from `_bmad-output/planning-artifacts/epics.md`.
- Draft baseline before story creation passed: `cd nextjs-app && npx.cmd tsc --noEmit`; `cd nextjs-app && npx.cmd eslint . --quiet`.
- Draft analysis confirmed this is a backend/data-contract story with no standalone visual reference.
- Draft analysis found no existing story file at `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.md`.
- Draft analysis found no tracked authoritative Supabase migration folder; the implementation should create a manual-run SQL handoff unless it discovers an approved migration path.
- Draft analysis found the only active runtime RPC consumer is `nextjs-app/lib/solar/shadow-calculation-service.ts`, which currently maps PascalCase compatibility rows and falls back to direct `buildings` table reads on RPC error.
- Draft analysis used official/current docs for Supabase RPC/database functions, PostgreSQL `CREATE FUNCTION`, PostgreSQL 15 `CREATE INDEX`, and PostGIS `ST_DWithin`.
- Story-file-audit: all seven checks pass (ACs preserved verbatim; backend/data-contract design gate present; tasks dependency-sequenced; scope maps to epics/architecture/ADR/current code; file impact reflects schema/RPC plus focused solar adapter tests; references include AGENTS/project context/epics/PRD/architecture/UX/ADR/local geodata evidence/official DB docs; test gate matches repo commands and story phase).
- Task 1 complete: baseline typecheck/lint passed before edits; required project/planning/ADR/sprint-change/UX/story context loaded; Story 3.1 remains paused until Stories 3.0.2-3.0.6 complete; existing Story 3.0.1 generated validation logs and draft-story dirty state were preserved.
- Task 2 complete: no tracked authoritative Supabase migration folder exists in this checkout (`infrastructure/supabase/migrations` is absent), so implementation followed the story's manual-run SQL path and did not execute SQL, import bulk data, or drop legacy compatibility surfaces.
- Task 3 complete: manual SQL defines `shadow_casters` plus metadata-only `shadow_caster_import_batches`, required provenance/quality/filter/runtime/import fields, active/include/height/class safeguards, review/exclude inactive constraints, meter-correct spatial indexes, and supporting btree/partial indexes without uniqueness constraints that would erase fallback/source-comparison records.
- Task 4 complete: `get_buildings_near_point(p_latitude, p_longitude, p_radius_meters)` is specified as a `SECURITY INVOKER` compatibility RPC returning `Id`, `Geometry`, `Height`, `Source`, `QualityScore`, `ExternalId`, `HeightSource`, and `BuildingType`; it reads `shadow_casters`, filters runtime-active records only, uses `geometry::geography` + `ST_DWithin`, excludes vegetation, allows manually approved structures, and documents lower numeric `source_priority` as the runtime winner.
- Task 5 complete: audited `shadow-calculation-service.ts`, `types.ts`, and `shadow-geometry.ts`; kept the current `Building` type and RPC call; removed the unsafe direct `.from('buildings')` fallback; kept existing `HeightSource` values so confidence scoring did not need semantic changes.
- Task 6 complete: added Vitest coverage for SQL contract text, RPC argument names, compatibility row mapping through `calculateVenueShadow`, and no legacy `buildings` fallback on RPC failure. Focused red/green and full Vitest suites passed.
- Task 7 complete: no import-pipeline files, geodata validation gates, confidence coverage semantics, consumer UI, Swedish uncertainty copy, admin UI/API/auth/upload surfaces, or durable planning docs were changed.
- Task 8.1-8.6 complete: typecheck, lint, Vitest, and production build passed; no Playwright or visual validation was required because no consumer UI files changed; scoped scans found no live runtime legacy `buildings` fallback and no active admin-surface matches in `nextjs-app`.
- Story review gate passed and moved sprint status to `review`.
- Code review Round 1 left six patch findings as action items; story status moved back to `in-progress`.
- Resolved review finding [Patch]: RPC failure now returns a low-confidence shadow-data-unavailable result (50/50 sun/shadow, confidence `0.2`) instead of a high-confidence sunny result, while still avoiding the legacy `buildings` fallback.
- Resolved review finding [Patch]: runtime de-duplication now groups only explicit `logicalObjectId` values or source-footprint IDs; shared `source_external_id` values no longer collapse distinct footprints.
- Resolved review finding [Patch]: existing-table upgrade hardening backfills defaultable columns, sets non-null defaults where safe, and adds null-safe active-row constraints for include/height/source/geometry.
- Resolved review finding [Patch]: the manual SQL now drops the existing typed `get_buildings_near_point(double precision, double precision, double precision)` signature before recreating it so incompatible return types do not block the replacement.
- Resolved review finding [Patch]: RPC execution is revoked from broad roles and granted only to `service_role`, matching the server-side service-role boundary.
- Resolved review finding [Patch]: active runtime records and the RPC query now require non-null, non-empty, valid geometry.
- Review follow-up gate passed and moved sprint status back to `review`.
- Resolved Round 2 review finding [Patch]: rejected Supabase RPC promises are caught and routed to the same low-confidence shadow-data-unavailable result as RPC error responses.
- Resolved Round 2 review finding [Patch]: the `SECURITY INVOKER` compatibility RPC now has an explicit `grant select on table public.shadow_casters to service_role` and smoke-check coverage for table privileges.
- Resolved Round 2 review finding [Patch]: existing-table data normalization now runs before constraint replacement and safely normalizes stale enum/quality values before active-row safeguards are added.
- Resolved Round 2 review finding [Patch]: active vegetation rows are deactivated during upgrade and a new `shadow_casters_active_requires_mvp_caster_class` constraint prevents future runtime-active vegetation in MVP scope.
- Resolved Round 2 review finding [Patch]: story-owned `shadow_casters` constraints are dropped and recreated so stale definitions cannot survive by name alone.
- Resolved Round 2 review finding [Patch]: existing-table upgrades now add/backfill/default the required `id` column via `shadow_casters_id_seq` and add a primary key when one is missing.
- Resolved Round 2 review finding [Patch]: the manual SQL now drops every existing `get_buildings_near_point` overload before recreating the single compatibility RPC signature.
- Review follow-up Round 2 gate passed and moved sprint status back to `review`.
- Final Round 2 gate rerun passed after table-privilege hardening; sprint status remained `review`.
- Resolved Round 3 review finding [Patch]: `logicalObjectId` is now documented and tested as a globally normalized canonical key, while source-local IDs remain in `source_footprint_fid`/`source_external_id`.
- Resolved Round 3 review finding [Patch]: existing active structures without manual approval metadata are deactivated before `shadow_casters_active_structure_requires_approval` is added.
- Resolved Round 3 review finding [Patch]: table privileges are now revoked from `PUBLIC` before granting `service_role` table reads.
- Resolved Round 3 review finding [Patch]: existing-table upgrades now renumber duplicate `id` values and add an `id` uniqueness constraint when another primary key already exists.
- Resolved Round 3 review finding [Patch]: invalid finite-height inputs (`NaN`, infinities, and negative values) are normalized before constraints and excluded from runtime-active use.
- Resolved Round 3 review finding [Patch]: active runtime geometry now requires WGS84 coordinate bounds before geography casts in constraints, indexes, and RPC filtering.
- Resolved Round 3 review finding [Patch]: active runtime rows now require non-empty `btrim(source_dataset)` provenance.
- Deferred Round 3 review finding [Defer]: empty active shadow-caster coverage can still report full sun with high confidence; Story 3.0.5 owns data coverage/confidence semantics.
- Review follow-up Round 3 gate passed; sprint status remained `review` for human approval.
- Rasmus approved Story 3.0.2 after Round 3 fixes; final status is `done`.
- Deferred Round 3 coverage-confidence item remains active and is reflected under Story 3.0.5 in `_bmad-output/planning-artifacts/epics.md`.

### File List

- `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.md`
- `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/epics.md`
- `nextjs-app/lib/solar/shadow-calculation-service.ts`
- `nextjs-app/test/unit/shadow-caster-sql-contract.test.ts`
- `nextjs-app/test/unit/shadow-calculation-service.test.ts`
- Local-only generated validation artifact: `_bmad-output/implementation-artifacts/validation/3-0-2-shadow-caster-schema-rpc-contract-review-20260603-142900.log`
- Local-only generated validation artifact: `_bmad-output/implementation-artifacts/validation/3-0-2-shadow-caster-schema-rpc-contract-review-20260604-110821.log`
- Local-only generated validation artifact: `_bmad-output/implementation-artifacts/validation/3-0-2-shadow-caster-schema-rpc-contract-review-20260604-130427.log`
- Local-only generated validation artifact: `_bmad-output/implementation-artifacts/validation/3-0-2-shadow-caster-schema-rpc-contract-review-20260604-130637.log`
- Local-only generated validation artifact: `_bmad-output/implementation-artifacts/validation/3-0-2-shadow-caster-schema-rpc-contract-review-20260604-152503.log`

## Change Log

| Date | Author | Note |
|------|--------|------|
| 2026-06-03 | Codex | Story drafted from Epic 3 Prelude source ACs, accepted shadow-data ADR, current runtime RPC consumer, local geodata prototype fields, and official Supabase/PostgreSQL/PostGIS docs. Status -> ready-for-dev. |
| 2026-06-03 | Codex | Story-file-audit completed with all seven checks passing. |
| 2026-06-03 | Amelia | Added manual-run shadow_casters SQL contract, preserved get_buildings_near_point compatibility, removed unsafe legacy buildings fallback, and added focused SQL/RPC regression coverage. Status -> in-progress. |
| 2026-06-03 | Amelia | Final verification and story review gate passed. Status -> review. |
| 2026-06-04 | Codex | Code review Round 1 wrote six patch findings and left them as action items. Status -> in-progress. |
| 2026-06-04 | Amelia | Addressed six code review patch findings with runtime low-confidence RPC-failure handling, hardened manual SQL contract, and expanded regression coverage. Status -> review. |
| 2026-06-04 | Amelia | Addressed seven Round 2 code review patch findings with rejected-RPC handling, existing-table SQL upgrade hardening, service-role table grants, active vegetation exclusion, stale-constraint replacement, id backfill/defaulting, and overload cleanup. Status -> review. |
| 2026-06-04 | Amelia | Addressed seven Round 3 code review patch findings with global logical-object contract documentation, structure approval cleanup, table grant hardening, id uniqueness, invalid-height normalization, WGS84 runtime bounds, and source-dataset trim checks. Status remains review. |
| 2026-06-04 | Rasmus | Approved Story 3.0.2 after Round 3 fixes. Status -> done. |
| 2026-06-04 | Amelia | Audited deferred-work queue and reflected the 3.0.5 coverage-confidence handoff in sprint planning. |
