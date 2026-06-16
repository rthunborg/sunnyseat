---
baseline_commit: 3e8eb66
drafted_at: 2026-06-14T17:58:25+02:00
---

# Story 8.1: Shadow-Caster Geodata Import

Status: done

> **Course correction (2026-06-15, approved by Rasmus):** AC1 (import) and AC3 (RPC + 3.0.5
> confidence contract) are done & verified. AC2 (the Story 3.0.4 spot-check gate) is **carried to
> new Story 8.1.1** — the spot-check validation revealed the conservative 3.0.3/3.0.4 filter
> deactivates ~1,569 real height-uncertain buildings, causing systematic false-sunny in central
> clusters; AC2 cannot pass until that filter is revised. 8.1's done-ness is therefore re-scoped to
> AC1+AC3. See `8-1-course-correction-2026-06-15.md` and `8-1-1-activate-height-uncertain-shadow-casters.md`.

> **Batch-id reconciliation (2026-06-16, code review Round 1):** The batch id is the derived
> `combinedInputChecksum`, so it changes on **every** regeneration. The Tasks (1.5, 3.1, 3.3, 5.3) and
> Dev Notes below still cite the pre-regeneration id `open-goteborg-central-929478e740e0`; the batch
> actually imported and verified live is **`open-goteborg-central-e91dd7302b7c`** (the 3.0.7
> regeneration changed the input checksums). **Any re-run — including Story 8.1.1's re-import — MUST read
> the current batch id from `shadow_casters.import_manifest.json` at run time; do not trust the
> `…929478e740e0` literals in the task text.** In particular, Task 3.1's idempotent
> `delete … where import_batch_id = …` and Task 5.3's single-row verification must use the manifest's
> id — otherwise the delete matches zero rows and a re-import duplicates the batch.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Sequencing:** First story of Epic 8 "Wire Real Data". Creating it flips `epic-8` `backlog -> in-progress` (it is the `8-1-*` story). Epic 8 runs **next**, ahead of the deferred Epics 4/5/6 and before Epic 7. This is the data-foundation story the rest of Epic 8 builds on: 8.2 (real venue store/API), 8.3 (real sun/shadow/weather computation), 8.4 (feedback/review persistence), 8.5 (production config + security hardening). Story 8.3 in particular cannot compute real shadows until `shadow_casters` is populated by this story.
>
> **Scope boundary — this is a backend DATA-IMPORT and verification story, not a code-feature story.** You are loading already-derived, already-validated Gothenburg shadow-caster geodata into the live Supabase `shadow_casters` table using the **existing** Story 3.0.3 import handoff and the **existing** Story 3.0.4 validation gate, then verifying the Story 3.0.2 RPC contract and the Story 3.0.5 confidence contract still hold. Do **not** redefine the schema or RPC (the 3.0.2 contract is frozen and already deployed live), do **not** change runtime confidence/shadow math in `nextjs-app/lib` (3.0.3/3.0.4/3.0.5 already shipped — this story is data-only), do **not** author RLS policies (that is Story 8.5), do **not** touch venues/feedback/reviews data or any frontend, and do **not** reintroduce an admin upload surface. Venue/geodata changes are reviewed direct DB/import operations (per `project-context.md` and the 2026-05-30 architecture correction), not an admin UI/API.
>
> **Data safety:** `building_geodata/` is local/gitignored and holds large source + derived data (the ~192 MB import JSONL lives there). Keep raw and bulk-derived data there. Promote only small deterministic run records (smoke-check output, gate report, checksums) into tracked paths. Do **not** commit Supabase connection strings, the DB password, or `SUPABASE_SERVICE_ROLE_KEY`. Re-running the import is idempotent (deterministic batch id), but you are writing to the **live production project** — review the SQL before executing and prefer a local-PostGIS dry-run first.
>
> **Spot-check validation IS in scope and required (maintainer decision, 2026-06-14):** Story 8.1 is **not done until the Story 3.0.4 gate passes** — every required launch cluster reaches `eligible`: ≥10 completed checks per launch cluster, ≥70 central total, all three sun buckets per cluster, and ≥85% building-shadow agreement after uncertainty rows are separated. That requires **real observations** recorded in `shadow_caster_spot_checks.results.jsonl`; the validator rejects placeholder coordinates, so observations must be genuine and evidence-traceable. The dev agent generates the template, may pre-compute `expected_building_shadow` from the shadow engine, and may assemble candidate `observed_manual_result` evidence from aerial/Street-View imagery + sun-position cross-reference — but **Rasmus must supply or verify the real-world observations and approve the evidence** before they count. This is a human-in-the-loop, likely multi-session deliverable; plan Task 4 accordingly. (The Story 3.0.5 fail-closed contract still protects users during the work, but reaching a passing gate — not `insufficient_evidence` — is the bar for 'done' here.)

## Story

As a **maintainer**,
I want the derived Gothenburg shadow-caster geodata loaded into `shadow_casters`,
So that the sun/shadow engine has real building obstructions to compute against.

## Acceptance Criteria

1. **Import populates `shadow_casters` and records the batch.**
   **Given** the Story 3.0.3 import handoff (`building_geodata/goteborg-open/derived/shadow_casters.import.jsonl` + `shadow_casters.import_handoff.sql`)
   **When** the import is executed against the live Supabase project
   **Then** `shadow_casters` is populated with the `include`/`review`/`exclude` records per the Story 3.0.2 contract (active/include rows ≥ 3 m height, source geometry preserved), and an `shadow_caster_import_batches` row records the batch metadata and checksums

2. **Validation/spot-check gate passes and its report is stored.**
   **Given** the Story 3.0.4 validation/spot-check gates
   **When** the import completes
   **Then** the launch-cluster and central-area coverage thresholds pass and any unmodelled-obstruction uncertainty is recorded, with the gate report stored as an import artifact

3. **RPC returns only runtime-active casters and confidence stays honest.**
   **Given** the `get_buildings_near_point` RPC
   **When** it is called for a central Gothenburg point after import
   **Then** it returns only active/include casters with meter-correct radius filtering (no empty-coverage-as-high-confidence regression — Story 3.0.5 contract holds)

**Design Gate Criteria:**
- **Visual:** No standalone visual reference. Backend/data-import story; no mapped Screen ID.
- **Behaviour:** No direct consumer UI change. Existing screens are unchanged — real venue/sun wiring is Stories 8.2/8.3.
- **Animation:** Not applicable.
- **Visual validation:** Not applicable (no mapped screen ID; `story-review.sh` skips visual validation, matching Stories 3.0.2/3.0.4/3.0.5).

## Tasks / Subtasks

- [x] **Task 1: Baseline, source-context, and artifact verification** (AC: #1)
  - [x] 1.1 Confirm you are on branch `epic/8-wire-real-data`. Run `cd nextjs-app && npx.cmd tsc --noEmit` and `cd nextjs-app && npx.cmd eslint . --quiet` before any change; stop and surface any error outside story scope.
  - [x] 1.2 Read: `AGENTS.md` (esp. Local Docker / WSL Rules), `docs/local-docker.md`, `project-context.md`, this story, `_bmad-output/planning-artifacts/epics.md` §"Epic 8" / "Story 8.1", `_bmad-output/planning-artifacts/architecture.md` §data-layer + §"Data Flow — Shadow Caster Lookup", `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md`, and the prelude stories `_bmad-output/implementation-artifacts/3-0-2-…md`, `3-0-3-…md`, `3-0-4-…md`, `3-0-5-…md`, `3-0-7-…md`. Read `scripts/geodata/README.md` (the canonical runbook for everything below).
  - [x] 1.3 Confirm the live target via the Supabase MCP (project `hhnbxrhfhlzxgllxukzj`), read-only: `shadow_casters` and `shadow_caster_import_batches` exist with RLS enabled, PostGIS is installed (3.3.7), and `select count(*) from public.shadow_casters` returns **0** (import target is empty). Confirm `get_buildings_near_point` is deployed (see Dev Notes for the live signature).
  - [x] 1.4 Verify the derived handoff artifacts exist locally under `building_geodata/goteborg-open/derived/` (gitignored, maintainer machine): `shadow_casters.import.jsonl` (~192 MB, **58,731** rows = 56,756 `include` + 1,975 `review`), `shadow_casters.import_handoff.sql`, `shadow_casters.import_manifest.json`, `shadow_casters.import.artifact_validation.json` (status `pass`), `shadow_casters.excluded_diagnostics.jsonl` (23,839 rows, optional), and `shadow_caster_spot_checks.template.jsonl`. If they are missing, do **not** hand-author them — see Task 1.6.
  - [x] 1.5 Re-run the no-DB artifact validator: `python scripts/geodata/shadow_caster_pipeline.py validate-artifacts`. Confirm it reports `pass` and that the manifest checksums match (`combinedInputChecksum = 929478e740e0…`, batch id `open-goteborg-central-929478e740e0`). Run the pipeline unit gate: `python -m py_compile scripts/geodata/shadow_caster_pipeline.py` then `python -m unittest discover -s scripts/geodata/tests`.
  - [x] 1.6 If the derived artifacts are absent/stale **and** the raw inputs are present (`building_geodata/byggnad_kn1480.gpkg`, `building_geodata/goteborg-open/raw/baskarta/shp-extract/byggnad_l`, the two `hojdmodell-2022` DTM zips), regenerate deterministically: `python -m pip install -r scripts/geodata/requirements.txt` then `python scripts/geodata/shadow_caster_pipeline.py run-all`. If raw inputs are **not** present, halt and request the derived artifacts (or raw inputs) from the maintainer — do not improvise data.

- [x] **Task 2: Local-PostGIS dry-run of the import (de-risking)** (AC: #1, #3)
  - [x] 2.1 Per `AGENTS.md` Local Docker / WSL Rules and `docs/local-docker.md`, bring up the project-local PostGIS via the repo's `docker-compose` (added in commit `583af1a`). Do **not** make global Docker Desktop / Windows / WSL / daemon-level changes.
  - [x] 2.2 Apply the frozen Story 3.0.2 schema into the local DB from `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql` (this creates `shadow_casters`, `shadow_caster_import_batches`, the constraints/indexes, and `get_buildings_near_point`).
  - [x] 2.3 Run the import handoff against local PostGIS with a local `psql` client: `psql "<local-conn>" -f building_geodata/goteborg-open/derived/shadow_casters.import_handoff.sql`. The script uses client-side `\copy`; run it from the repo root so the relative JSONL path resolves. Confirm all six embedded smoke checks return clean (0 active rows < 3 m, 0 active non-`include`, 0 invalid geometry, 0 missing `source_dataset`) and the sample `get_buildings_near_point(57.7089, 11.9746, 200)` returns active byggnad_l casters.
  - [ ] 2.4 If local PostGIS is genuinely unavailable in the environment, document why and skip — the live smoke checks (Task 5) still gate. Do not block the story solely on local Docker.

- [x] **Task 3: Execute the production import (agent-run, with maintainer-provided credentials)** (AC: #1)
  - [x] 3.1 Review `building_geodata/goteborg-open/derived/shadow_casters.import_handoff.sql` end-to-end before running (it `begin;`…`commit;` wraps: batch-metadata upsert, deterministic `delete … where import_batch_id = 'open-goteborg-central-929478e740e0'`, staged `\copy`, then the bulk `insert … select` mapping 31 payload fields; geometry via `st_setsrid(st_geomfromgeojson(...), 4326)`, 3007 bbox/centroid as-is).
  - [x] 3.2 Run it against the **live** Supabase project with a local `psql` client. Read the connection string from a **non-committed** source Rasmus provides — a gitignored `.env.local` or an environment variable (e.g. `$env:SUPABASE_DB_URL`); never hard-code, echo, log, or commit it. From the repo root: `psql $env:SUPABASE_DB_URL -f building_geodata/goteborg-open/derived/shadow_casters.import_handoff.sql` (the script already sets `\set ON_ERROR_STOP on`). Do **not** use Supabase MCP `apply_migration`/`execute_sql` for the bulk load (no client-side `\copy`) and do **not** use server-side `COPY FROM '/path'` (Supabase cannot read the local filesystem). Re-running is safe (idempotent batch). If `psql` is unavailable, install/locate it or coordinate with Rasmus before proceeding — this step must complete for AC1.
  - [x] 3.3 Do **not** load `shadow_casters.excluded_diagnostics.jsonl` by default — excluded rows are inactive diagnostics and the handoff leaves that block commented out. Only load it if the maintainer explicitly wants exclude-diagnostics in the table for analysis; if so, note the decision in the run record.
  - [x] 3.4 Capture the six smoke-check query outputs from the run as an import run record (see Task 6.2).

- [ ] **Task 4: Spot-check validation gate + stored report** (AC: #2)
  - [x] 4.1 (Re)generate the observation template: `python scripts/geodata/shadow_caster_pipeline.py emit-spot-check-template` (writes `shadow_caster_spot_checks.template.jsonl`: 10 rows per cluster across Inom Vallgraven, Nordstan, Lilla Bommen, Avenyn, Vasastan, Haga, Linné + central surroundings, all three sun buckets `morning_low_angle` / `midday_high_sun` / `afternoon_evening_directional`).
  - [ ] 4.2 **(Required — human-in-the-loop)** Copy the template to `shadow_caster_spot_checks.results.jsonl` and fill in **real** observations: real venue/street coordinates inside the MVP bbox + declared cluster radius, the recorded building-shadow expectation vs the observed result, and `source_artifact` pointing at traceable evidence. The agent may pre-fill `expected_building_shadow` from the shadow engine and assemble candidate `observed_manual_result` evidence from aerial/Street-View imagery + sun-position cross-reference, but **Rasmus must supply or verify the real observations and approve the evidence** — do **not** fabricate or placeholder (the validator rejects placeholder coordinates, out-of-bbox/out-of-radius points, duplicate ids, and uncertainty causes without `agreement_result:"uncertain"`). Use `agreement_result:"uncertain"` with an allowed `uncertainty_causes` value (tree/awning/umbrella/bridge/temporary_structure/seasonal_furniture/other+note) rather than counting unmodelled obstructions as building-data failures. Reach ≥10 completed checks per launch cluster, ≥70 central total, all three sun buckets.
  - [ ] 4.3 Run the evaluator: `python scripts/geodata/shadow_caster_pipeline.py evaluate-spot-checks`. It writes `shadow_caster_cluster_validation.json` + `.md` (per-cluster `status` ∈ `eligible`/`insufficient_evidence`/`blocked`, `checkedCount`, `agreementRate`, `missingConditions`, `uncertaintyCounts`, `evidenceFiles`). Confirm unmodelled-obstruction uncertainty is summarized **separately** from the building-data agreement denominator.
  - [ ] 4.4 Confirm the gate **passes**: every required launch cluster is `eligible` and the central set has ≥70 completed checks (run the evaluator with default `--require-all-clusters`; do **not** use `--no-require-all-clusters`, which always writes a failing partial-scope report). Store the gate report (`shadow_caster_cluster_validation.json` + `.md`) as a tracked import artifact (Task 6.2). A `blocked` (agreement <85%) or `insufficient_evidence` result means AC2 is **not** met — return to 4.2 and add/correct observations.

- [x] **Task 5: Post-import verification of the RPC + confidence contract (read-only)** (AC: #1, #2, #3)
  - [x] 5.1 Via Supabase MCP `execute_sql` (read-only SELECTs against `hhnbxrhfhlzxgllxukzj`): confirm `select filter_decision, active, count(*) … group by …` shows ~56,756 `include`/`active=true` and ~1,975 `review`/`active=false`; and that `active_below_3m`, `active_review_or_exclude`, `invalid_geometry`, and `missing_source_dataset` all return **0**.
  - [x] 5.2 Call `select * from public.get_buildings_near_point(57.7089, 11.9746, 200);` — confirm it returns only active/`include` `byggnad_l` casters (no `review`/`exclude`), and that a smaller radius (e.g. 25 m) returns a strict subset, proving meter-correct `st_dwithin(geometry::geography, …)` filtering rather than degree-based distance.
  - [x] 5.3 Confirm `shadow_caster_import_batches` has exactly one row for `open-goteborg-central-929478e740e0` with the source description, checksums in `source_metadata`, and `completed_at` set.
  - [x] 5.4 Confirm no empty-coverage-as-high-confidence regression: run the Story 3.0.5 coverage/confidence unit tests (`cd nextjs-app && npx.cmd vitest run` — or the focused coverage/confidence specs) and confirm they still pass. This story is data-only; runtime confidence semantics must be unchanged. (The data load does not alter `nextjs-app/lib`; this is a regression guard, not new behaviour.)

- [ ] **Task 6: Record the import run and finalize** (AC: #1, #2)
  - [x] 6.1 Do **not** commit the bulk JSONL/SQL (gitignored). 
  - [x] 6.2 Persist a small, tracked import run record under `_bmad-output/implementation-artifacts/` (e.g. `8-1-shadow-caster-import-run-<date>.md`) capturing: batch id + checksums, row counts by `filter_decision`/`active`, the six smoke-check outputs, the spot-check gate status summary (and the scope decision for 4.2), the import date, and the project ref. Copy the `shadow_caster_cluster_validation.md` content (or a trimmed summary) into / alongside it so the gate report survives outside gitignored `building_geodata/`.
  - [ ] 6.3 Record the outcome in `_bmad-output/implementation-artifacts/sprint-status.yaml` notes (the SM/dev convention) and flip `8-1-shadow-caster-geodata-import` per the normal `in-progress -> review` gate when implementation is complete.

- [ ] **Task 7: Final verification gate** (AC: all)
  - [x] 7.1 `cd nextjs-app && npx.cmd tsc --noEmit` (0 errors); `cd nextjs-app && npx.cmd eslint . --quiet` (0 errors); `cd nextjs-app && npx.cmd vitest run` (baseline **64 files / 527 tests** still green — this story adds no nextjs-app code, so the count should not drop).
  - [x] 7.2 `python -m py_compile scripts/geodata/shadow_caster_pipeline.py` and `python -m unittest discover -s scripts/geodata/tests` (green; baseline 33 tests from Story 3.0.7).
  - [ ] 7.3 Run the story-review gate: `.\scripts\run-sh.ps1 scripts/story-review.sh 8-1-shadow-caster-geodata-import` (visual validation is skipped — no mapped screen ID).
  - [x] 7.4 Run the established API-boundary scan and MVP monetization quarantine scan (per the Epic 8 scope guardrails / Epic 3 practice). This story should produce **zero** API-boundary or monetization hits because it touches no `nextjs-app` runtime code.

## Dev Notes

### Architecture alignment
- **What this story does in the data flow:** `architecture.md` §"Data Flow — Shadow Caster Lookup (Backend)" steps 1–3 — the import pipeline derives candidate heights, validation/filtering splits into include/review/exclude, and *"Import stores include records as runtime-active `shadow_casters`; review records are inactive; excluded records remain diagnostics."* This story executes exactly that storage step against the live DB. Step 4 onward (`calculateVenueShadow` → `get_buildings_near_point` → shadow projection → confidence) is the runtime consumer that Story 8.3 wires; it already exists in code and is verified here only as a non-regression check.
- **Server-only, no admin, direct DB ops:** All Supabase access is server-side service-role infrastructure. `SunnySeat has no admin page, admin venue/building upload API, or candidate review queue` (architecture 2026-05-30 correction; `project-context.md`). Geodata changes are reviewed direct DB/import operations — this story is one such operation.
- **API boundary (must not be touched/violated):** *"The front-end NEVER imports from `lib/solar/`, `lib/weather/`, `lib/supabase/`, or `lib/buildings/` directly… accessed exclusively via API route handlers"* (`architecture.md`). This story writes no runtime code, so the boundary is unaffected; Task 7.4 confirms zero hits.

### Live Supabase state (verified read-only, 2026-06-14, project `hhnbxrhfhlzxgllxukzj`)
- `shadow_casters`: **exists, 0 rows, RLS enabled (no policies yet — Story 8.5 owns policies)**. ~39 columns per the 3.0.2/3.0.7 contract. FK `import_batch_id → shadow_caster_import_batches.id`.
- `shadow_caster_import_batches`: exists, 0 rows, RLS enabled. Columns: `id text pk`, `source_dataset text not null`, `source_description text`, `source_metadata jsonb`, `created_at timestamptz`, `completed_at timestamptz`, `notes text`.
- PostGIS **3.3.7** installed (in `public` — flagged by advisor; accepted PostGIS exception, Story 8.5). `spatial_ref_sys` RLS-disabled is an accepted PostGIS platform finding (Story 8.5).
- No migration history is tracked in Supabase — the schema was applied manually from the 3.0.2 SQL handoff; this import follows the same manual-SQL pattern.

### The import handoff mechanics (`shadow_casters.import_handoff.sql`)
`MANUAL-RUN ONLY`. Single transaction:
1. `create temp table shadow_caster_import_stage(payload_text text) on commit drop;`
2. `\copy shadow_caster_import_stage(payload_text) from '…/shadow_casters.import.jsonl' with (format text);` — **client-side**; run `psql` from repo root so the relative path resolves.
3. Upsert one `shadow_caster_import_batches` row (`id = open-goteborg-central-929478e740e0`, `source_metadata` carries `combinedInputChecksum` + per-class `inputChecksums` + `sourcePriority: 40`).
4. `delete from public.shadow_casters where import_batch_id = 'open-goteborg-central-929478e740e0';` (idempotent re-run).
5. `insert into public.shadow_casters (…31 cols…) select … from (select payload_text::jsonb as payload from stage)` — geometry via `st_setsrid(st_geomfromgeojson(payload->>'geometry'),4326)::geometry(Polygon,4326)`, `bbox_3007`/`centroid_3007` set with SRID 3007, arrays via `jsonb_array_elements_text`, timestamps coalesced to `now()`.
6. `commit;` then six smoke-check SELECTs (counts by decision/active; active<3 m; active non-include; invalid geom; missing source_dataset; sample RPC call).
- **Default load = include + review only** (the 58,731-row `import.jsonl`). Excluded diagnostics (23,839) are a separate, commented-out, optional load.

### Schema / RPC contract (frozen — do not modify; Story 3.0.2 + 3.0.7)
- Active-row DB constraints already enforce AC1's invariants: active ⇒ `filter_decision='include'` ⇒ `height_m >= 3` ⇒ valid WGS84 polygon ⇒ `source_dataset` present ⇒ MVP caster class; active `building` ⇒ `source_layer='byggnad_l'` ⇒ `source_geom_3007` not null; `review`/`exclude` rows forced `active=false`. So a constraint violation on load means the artifacts are wrong, not the schema.
- `get_buildings_near_point(p_latitude double precision, p_longitude double precision, p_radius_meters double precision default 200.0)` returns active/include/≥3 m/`byggnad_l`(or manual_override/approved structure) casters within `st_dwithin(geometry::geography, point, radius_meters)`, deduplicated by `logicalObjectId` (→ `source_dataset:source_footprint_fid` → `id`) ranked by `source_priority asc, quality_score desc, …`. `security invoker`, `stable`, `set search_path = public`. Open-derived rows carry `source_priority = 40`.

### Source-data model (ADR: `decisions/shadow-data-trust-realignment.md`)
- Combined open-data path: **2D Lantmäteriet footprints + Göteborg Baskarta XYZ `byggnad_l` (Z-aware Takkonturer/Fasad/Skärmtak) + Göteborg Höjdmodell 2022 DTM ground elevation**. `byggnad_kn1480.gpkg` alone is footprint-only and insufficient.
- CRS: source footprint EPSG:3006 → metric processing EPSG:3007 → runtime geometry EPSG:4326. MVP bbox `EPSG:3007 x=140000..150000, y=6390000..6410000`. ≥3 m meaningful-height rule. Source 3D geometry preserved in `source_geom_3007`.
- Counts (manifest): 82,570 mapped → 56,756 include + 1,975 review + 23,814/23,839 excluded.

### Spot-check gate semantics (Story 3.0.4 / `scripts/geodata/README.md`)
- Cluster `eligible` only when: central set ≥70 completed checks **and** cluster ≥10 completed checks **and** all three sun buckets present **and** ≥9 clear building-agreement checks (after separating uncertainty rows) **and** agreement ≥85%. Otherwise `insufficient_evidence`; `blocked` if evidence is sufficient but agreement <85%.
- `shadow_caster_spot_checks.results.jsonl` is **manual maintainer observation data, not generated** — only the template is produced by tooling. The validator rejects placeholder coordinates, duplicate ids, out-of-bbox/out-of-radius points, and uncertainty causes without `agreement_result:"uncertain"`.
- `--no-require-all-clusters` is fixtures/diagnostics only and always writes a failing partial-scope report — never treat it as the launch gate.

### Confidence contract to preserve (Story 3.0.5)
- An empty/`unknown`/non-`eligible` coverage result must **not** read as "confidently sunny": `calculateVenueShadow()` must not return `confidence: 1.0` for `affectingShadows.length === 0` unless the cluster is validated; missing/partial/outside-bbox/unknown coverage **fails closed** below High (`overallConfidence < 0.7`). This is why an `insufficient_evidence` gate result is a safe state after import — the system simply won't claim high confidence for those clusters yet. Task 5.4 is the regression guard.

### Reuse — do NOT reinvent
- Use the **existing** pipeline `scripts/geodata/shadow_caster_pipeline.py` and the **existing** generated `shadow_casters.import_handoff.sql`. Do not hand-write `INSERT`s, a new loader, or a new migration.
- Use the **existing** schema SQL `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql` for the local dry-run. The live schema is already deployed — do not re-apply it to production.
- Use Supabase MCP **only for read-only verification** SELECTs, never for the bulk load.

### What NOT to do
- Don't run the bulk import via Supabase MCP (`apply_migration`/`execute_sql`) or server-side `COPY FROM` — use local `psql` client-side `\copy`.
- Don't commit connection strings, DB password, or `SUPABASE_SERVICE_ROLE_KEY`.
- Don't make global Docker Desktop / Windows / WSL / daemon changes (`AGENTS.md`); use the project-local compose only.
- Don't load excluded diagnostics by default; don't fabricate spot-check observations.
- Don't modify the schema, the RPC, `nextjs-app/lib` confidence/shadow math, RLS policies (Story 8.5), venues/feedback/reviews data, or any frontend.

### File impact
- **Files created (tracked):** `_bmad-output/implementation-artifacts/8-1-shadow-caster-import-run-<date>.md` — import run record (batch id, checksums, row counts by decision/active, the six smoke-check outputs, and the **passing** spot-check gate summary). Carry a trimmed copy of `shadow_caster_cluster_validation.md` into / beside it so the gate report survives outside gitignored `building_geodata/`.
- **Files created (local/gitignored, tooling-generated — NOT committed):** under `building_geodata/goteborg-open/derived/` — `shadow_caster_spot_checks.results.jsonl` (required maintainer observations), `shadow_caster_cluster_validation.json` + `.md`; regenerated import artifacts only if Task 1.6 runs.
- **Database writes (not files):** ~58,731 rows into `public.shadow_casters` (56,756 active `include` + 1,975 inactive `review`) + 1 row into `public.shadow_caster_import_batches`, on the live project `hhnbxrhfhlzxgllxukzj`.
- **Files modified (tracked):** `_bmad-output/implementation-artifacts/sprint-status.yaml` (status flip + note).
- **Explicitly NOT created/modified:** no new SQL migration (the 3.0.2 schema/RPC is already deployed live — do not re-apply to production); no `nextjs-app/**` changes (no `lib/solar`/`lib/buildings`/`lib/supabase` edits, no API routes, no components); no RLS policy SQL (Story 8.5 owns that); no schema/RPC redefinition; no `scripts/geodata/**` source changes (the pipeline is reused as-is unless a real bug is found).

### Test gate baseline (starting state)
- `nextjs-app`: `tsc` 0, `eslint` 0, Vitest **64 files / 527 tests** (Story 3.4 R2), focused Playwright 16/16, axe 8/8. This story adds no `nextjs-app` code → these must remain green and unchanged.
- Python pipeline: `py_compile` + `unittest discover -s scripts/geodata/tests` green (33 tests, Story 3.0.7).

### Resolved scope decisions (maintainer, Rasmus, 2026-06-14)
1. **Spot-check validation is in scope and required.** Story 8.1 is done only when the Story 3.0.4 gate **passes** (all required launch clusters `eligible`, ≥70 central checks, ≥85% agreement). This is human-in-the-loop and likely multi-session: the agent prepares the template + engine predictions + candidate evidence; Rasmus supplies/verifies the real observations and signs off the evidence. There is no "store-at-insufficient_evidence and defer" escape — that interpretation was explicitly rejected.
2. **The dev agent runs the live import** using a connection string Rasmus provides via a non-committed env var / gitignored `.env.local` (never committed, echoed, or logged). The local-PostGIS dry-run (Task 2) remains the de-risking step before the production run, and post-import verification (Task 5) stays read-only.

### References
- [Source: CLAUDE.md] (root shim → `AGENTS.md` is the canonical agent rulebook)
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 8: "Wire Real Data" / Story 8.1: Shadow-Caster Geodata Import]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow — Shadow Caster Lookup (Backend)]
- [Source: _bmad-output/planning-artifacts/architecture.md#API boundary (front-end never imports lib/solar|weather|supabase|buildings)]
- [Source: _bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md#Combined open-data shadow-caster path / coverage gate]
- [Source: _bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.md] and [Source: _bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql]
- [Source: _bmad-output/implementation-artifacts/3-0-3-open-geodata-import-pipeline.md]
- [Source: _bmad-output/implementation-artifacts/3-0-4-geodata-validation-spot-check-gates.md]
- [Source: _bmad-output/implementation-artifacts/3-0-5-confidence-engine-data-coverage.md]
- [Source: _bmad-output/implementation-artifacts/3-0-7-baskarta-xyz-inventory-data-contract-realignment.md]
- [Source: scripts/geodata/README.md] (canonical runbook: commands, filtering rules, spot-check gate, import handoff)
- [Source: building_geodata/goteborg-open/derived/shadow_casters.import_handoff.sql] (generated handoff; gitignored/local)
- [Source: building_geodata/goteborg-open/derived/shadow_casters.import_manifest.json] (batch id, checksums, row counts)
- [Source: project-context.md#Gothenburg Constants / Building/shadow data]
- [Source: AGENTS.md#Local Docker / WSL Rules] and [Source: docs/local-docker.md]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Amelia, bmad-dev-story), 2026-06-15.

### Debug Log References

- Stale-artifact discovery: `validate-artifacts` rejected the on-disk import.jsonl (pre-3.0.7,
  missing source_layer/source_subclass/z_semantics/source_geom_3007/source_collection_metadata/
  source_update_metadata); live schema enforces these → import would abort at COMMIT. Regenerated
  via `run-all` (Task 1.6).
- Dry-run #1 failure: `COPY ... format text` mangled backslash paths → `invalid input syntax for
  type json: Escape sequence "\g"`. Fixed by switching `\copy` to CSV with control-char
  quote/delimiter.
- Production #1 failure: `canceling statement due to statement timeout` (pooler default 2 min) on
  the 183 MB `\copy`. Fixed by `set local statement_timeout = 0;` in the import transaction.
- Connectivity: direct `db.*.supabase.co` is IPv6-only (unusable from Docker here); used the IPv4
  session pooler `aws-1-eu-west-1.pooler.supabase.com:5432`.
- Full run record: `_bmad-output/implementation-artifacts/8-1-shadow-caster-import-run-2026-06-15.md`.

### Completion Notes List

**Done — AC1 (import) and AC3 (RPC/confidence) satisfied & verified:**
- Regenerated the stale derived artifacts deterministically (Task 1.6). New batch id
  `open-goteborg-central-e91dd7302b7c` (the story's original `…929478e740e0` was superseded by the
  3.0.7-contract regeneration). `validate-artifacts` → pass.
- Three real pipeline bugs found & fixed with regression tests (validator bbox tolerance 500 m;
  CSV `\copy`; `set local statement_timeout = 0`). Pipeline `py_compile` + `unittest` 36 tests pass.
- Local-PostGIS dry-run (Task 2): schema applied, import loaded, all six smoke checks clean.
  (2.4 not applicable — local PostGIS was available after a documented stale-volume reset.)
- Live production import (Task 3) via session pooler: `INSERT 0 58731`, COMMIT; six smoke checks
  clean. Excluded diagnostics not loaded (default).
- Task 5 verification (read-only MCP): 56,756 active/include + 1,975 inactive/review; all invariants
  0; RPC 200 m→37 / 25 m→2 (meter-correct subset) with 0 active/include/building violations; single
  batch row with checksums + completed_at; nextjs-app vitest 64 files/527 tests pass (confidence
  regression guard).
- ✅ AC1 invariants are DB-enforced and verified. ✅ AC3 RPC + Story 3.0.5 fail-closed contract hold.

**AC2 (Story 3.0.4 spot-check gate): prep COMPLETE; maintainer observation step pending (Task 4.2):**
- Full campaign pre-built (desk-only, no field work) in `building_geodata/goteborg-open/derived/`:
  80 real ground points (10/cluster × 8, in-bbox + in-radius, dropped points inside buildings,
  balanced shadowed/sunny where geometry allows, all 3 sun buckets), NOAA sun positions, and
  engine-consistent `expected_building_shadow` pre-computed locally from the imported data. Wrote
  `shadow_caster_spot_checks.results.jsonl` (scaffold, structurally valid), `…worksheet.md`
  (per-point ShadeMap / Satellite / Street View links), and `…observations.csv` (maintainer input).
  Ingest helper `building_geodata/_spotcheck_ingest.py` tested (agree/disagree/uncertain logic).
- Cross-checked all 80 against a locally-computed ShadeMap-equivalent (OSM buildings via Overpass +
  same shadow projection; OSM has 69% missing heights so it is a weak validator, confirming our
  surveyed data is more authoritative). 50 points where our data and OSM concur are pre-filled as
  validated `observed`; the 30 divergences are written to `shadow_caster_spot_checks.divergences.md`
  (reason + distance from Viktoriagatan 24 + ShadeMap/Satellite/Street-View links).
- Remaining (Rasmus): resolve the 30 divergences (desk via ShadeMap/aerial or a quick in-person look —
  all 0.2–1.9 km away) into the CSV, optionally sample the 50, then
  `python building_geodata/_spotcheck_ingest.py "Rasmus"`; gate passes when every cluster is
  `eligible` (≥85% agreement). Current state: 50 filled, 30 pending → `insufficient_evidence`. Exact
  steps in the run record.
- Story stays `in-progress`. The `in-progress → review` flip (Task 6.3 / `story-review.sh` Task 7.3)
  is intentionally deferred until the spot-check gate passes. Until then the Story 3.0.5 fail-closed
  contract keeps user-facing confidence honest for unvalidated clusters.

**Task 7 gate status:** 7.1 tsc 0 / eslint 0 / vitest 64·527 ✅; 7.2 py_compile + unittest 36 ✅;
7.4 zero nextjs-app changes → API-boundary + monetization scans trivially clean ✅; 7.3
`story-review.sh` deferred (story not done until AC2).

### File List

Tracked (committed scope for this story):
- `scripts/geodata/shadow_caster_pipeline.py` — three bug fixes (validator bbox tolerance; CSV
  `\copy`; `set local statement_timeout = 0`).
- `scripts/geodata/tests/test_shadow_caster_pipeline.py` — regression tests for the above.
- `_bmad-output/implementation-artifacts/8-1-shadow-caster-import-run-2026-06-15.md` — import run record (new).
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status note + `8-1` → `in-progress`.
- `_bmad-output/implementation-artifacts/8-1-shadow-caster-geodata-import.md` — this story file.

Local/gitignored (not committed): regenerated `building_geodata/goteborg-open/derived/*`
(import.jsonl, handoff.sql, manifest, geojsonl, spot-check template); `.env.local` (connection strings).

Database writes (live `hhnbxrhfhlzxgllxukzj`): 58,731 rows into `public.shadow_casters`
(56,756 active include + 1,975 inactive review) + 1 row into `public.shadow_caster_import_batches`.

### Change Log

- 2026-06-15 — Regenerated stale 3.0.7 derived artifacts; fixed three pipeline bugs (validator bbox
  tolerance, CSV `\copy`, statement_timeout); executed live shadow-caster import (batch
  `open-goteborg-central-e91dd7302b7c`, 58,731 rows); verified RPC + invariants read-only. AC1 + AC3
  met; AC2 spot-check gate pending maintainer observations.

### Review Findings

**Round 1 of 3** — bmad-code-review, 2026-06-16. Scope: re-scoped AC1 + AC3 story; reviewed commit
`c449fdc` code diff (`scripts/geodata/shadow_caster_pipeline.py` + `tests/test_shadow_caster_pipeline.py`).
Layers: Blind Hunter + Edge Case Hunter + Acceptance Auditor (all three completed). 1 decision-needed,
1 patch, 1 deferred, 11 dismissed as verified-handled noise. The three pipeline bug-fixes themselves
(bbox tolerance, CSV control-char `\copy`, `statement_timeout=0`) were all confirmed correct: `json.dumps`
always escapes U+0001/U+0002 so the CSV control bytes are safe, `validate_geojson_xy_bounds` has a single
caller so the `tolerance=0.0` default leaks nowhere, and `set local` is correctly scoped inside `begin;`.

- [x] [Review][Decision] **RESOLVED (Option 2 hybrid, 2026-06-16):** added the "Batch-id reconciliation"
  callout near the top of this story — records the live batch id `…e91dd7302b7c` and mandates reading the
  id from `shadow_casters.import_manifest.json` at run time rather than trusting the stale `…929478e740e0`
  task literals. Original finding: Spec/code batch-id drift — Tasks 1.5, 3.1, 3.3, 5.3 and Dev Notes (lines 118–119)
  hard-code the superseded batch id `open-goteborg-central-929478e740e0`, but the regenerated/imported
  batch is `open-goteborg-central-e91dd7302b7c` (the 3.0.7-contract regeneration changed the input
  checksums). Task 5.3's "exactly one row for …929478e740e0" verification is literally stale, and
  re-running Task 3.1's idempotent `delete … where import_batch_id = '…929478e740e0'` would NOT clear
  the live batch — risking duplicate rows on a future re-import. Disclosed in the Dev Agent Record /
  Change Log but never reconciled into the task body. Decision: how to reconcile — (a) update the four
  references to `…e91dd7302b7c`, (b) annotate that the batch id is checksum-derived and must be read
  from `shadow_casters.import_manifest.json` at run time, or (c) leave as a historical record. (auditor)

- [x] [Review][Patch] **FIXED (2026-06-16):** added two regression tests —
  `test_artifact_validation_allows_source_geometry_within_tolerance_on_lower_and_upper_edges` (min_x/min_y/max_y
  vertices within tolerance pass) and `test_artifact_validation_rejects_source_geometry_below_min_y_beyond_tolerance`
  (min-side guard still bites). Python suite: 36 → 38 tests, all green. Original finding: bbox-tolerance tests
  covered only the +x edge [scripts/geodata/tests/test_shadow_caster_pipeline.py:404]; the symmetric four-edge
  expansion was unverified. (blind+edge)

- [x] [Review][Defer] Non-dict `source_geom_3007` raises AttributeError in `validate_rows` [scripts/geodata/shadow_caster_pipeline.py:2564]
  — deferred, pre-existing. When `source_geom_3007` is non-null but not a dict,
  `source_geom_3007.get("coordinates")` raises `AttributeError` and aborts the whole `validate_rows`
  pass instead of emitting a row-level error (the preceding `validate_geojson_geometry` returns a clean
  error, but the bbox call still runs unconditionally). The diff only added the `tolerance=` kwarg to
  this pre-existing line; not reachable via normal pipeline output (the validator validates its own
  dict/None output) — only via corrupted/hand-edited artifacts. Cheap guard if folded in later:
  `coords = source_geom_3007.get("coordinates") if isinstance(source_geom_3007, dict) else None`. (edge)
