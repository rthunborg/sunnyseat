---
baseline_commit: dfbfa7c
drafted_at: 2026-06-05T18:32:19+02:00
---

# Story 3.0.5: Confidence Engine Data Coverage

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Sequencing:** This is the fifth Epic 3 Prelude story. Stories 3.0, 3.0.1, 3.0.2, 3.0.3, and 3.0.4 are done. Complete Stories 3.0.5 and 3.0.6 before Story 3.1 routing work proceeds, even though Story 3.1 is already tracked as ready-for-dev.
>
> **Scope boundary:** This story updates runtime confidence semantics for building-data coverage, caster metadata, cluster validation status, weather, sun elevation, and known obstruction risks. Do not add Swedish uncertainty copy, confidence-help UI, About-page copy, routing, feedback, reviews, admin surfaces, premium/payment flows, live Supabase imports, or destructive SQL execution.
>
> **Data safety:** `building_geodata/` is local/gitignored. Story 3.0.4 validation artifacts are inputs/handoffs, not production imports. If runtime config needs a checked-in conservative seed, keep it small, reviewable, and documented; do not commit raw geodata or manual observation evidence.

## Story

As a **user**,
I want confidence scores to reflect building-data coverage and known modelling gaps,
So that SunnySeat does not overstate certainty when shadows are missing, low-quality, or affected by unmodelled obstructions.

## Acceptance Criteria

**Given** no nearby casting shadows can mean either a sunny venue or incomplete caster coverage
**When** confidence is calculated
**Then** empty casting-shadow results are not automatically treated as perfect building-data quality unless the surrounding data coverage is validated for the relevant cluster.

**Given** runtime casters have source and quality metadata
**When** shadow confidence is calculated
**Then** source priority, quality score, caster tier, filter decision, cluster validation status, sun elevation, and weather state contribute to confidence.

**Given** vegetation, awnings, umbrellas, bridges, and temporary structures are not fully modelled in MVP
**When** a venue is near known or manually tagged obstruction risks
**Then** confidence is capped or marked uncertain according to the configured obstruction class.

**Design Gate Criteria:**
- **Visual:** No standalone visual reference unless confidence UI copy changes in the same story.
- **Behaviour:** Existing confidence displays remain available but become more conservative when data quality is lower.
- **Visual validation:** Run only if visible confidence UI changes.

> **Deferred items incorporated from `_bmad-output/implementation-artifacts/deferred-work.md`:**
> - Preserve the Story 3.0.2 Round 3 deferred finding: an empty successful `get_buildings_near_point` response can still mean "no active caster coverage yet", not "fully sunny with high confidence". Story 3.0.5 must distinguish empty validated coverage from unknown/missing caster coverage and cap or mark confidence accordingly.

## Tasks / Subtasks

- [x] **Task 1: Baseline and source-context check** (AC: all)
  - [x] 1.1 Run `cd nextjs-app && npx.cmd tsc --noEmit` before editing. Stop and surface any errors outside story scope.
  - [x] 1.2 Run `cd nextjs-app && npx.cmd eslint . --quiet` before editing. Stop and surface any errors outside story scope.
  - [x] 1.3 Read `AGENTS.md`, `project-context.md`, this story, `_bmad-output/planning-artifacts/epics.md`, `_bmad-output/planning-artifacts/prd.md`, `_bmad-output/planning-artifacts/architecture.md`, `_bmad-output/planning-artifacts/ux-design-specification.md`, `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md`, and `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-02-shadow-data-trust-realignment.md`.
  - [x] 1.4 Read the previous prelude story files: `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.md`, `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql`, `_bmad-output/implementation-artifacts/3-0-3-open-geodata-import-pipeline.md`, and `_bmad-output/implementation-artifacts/3-0-4-geodata-validation-spot-check-gates.md`.
  - [x] 1.5 Read the current geodata handoff: `scripts/geodata/README.md`, `scripts/geodata/shadow_caster_pipeline.py`, `scripts/geodata/testdata/spot_checks.fixture.jsonl`, and `scripts/geodata/tests/test_shadow_caster_pipeline.py`.
  - [x] 1.6 Confirm sprint sequencing: `3-0-5-confidence-engine-data-coverage` is the next Epic 3 Prelude story, Epic 3 remains `in-progress`, Story 3.1 remains paused until Stories 3.0.5-3.0.6 complete, and the deferred-work carry-in above has been removed from the queue.
  - [x] 1.7 Preserve unrelated dirty work. At draft time, prior Story 3.0.2-3.0.4 files, validation logs, `scripts/geodata/`, `nextjs-app/lib/solar/shadow-calculation-service.ts`, and related tests are present in the worktree; do not delete, rewrite, or stage unrelated local artifacts unless this story explicitly requires them.

- [x] **Task 2: Define the coverage-status contract used by confidence scoring** (AC: #1, #2)
  - [x] 2.1 Add or extend a server-only/pure TypeScript helper under `nextjs-app/lib/solar/` for shadow-data coverage and cluster validation. Keep it out of client component folders.
  - [x] 2.2 Model cluster gate statuses from Story 3.0.4: `eligible`, `blocked`, `insufficient_evidence`, plus a runtime fallback such as `unknown` for missing/unreadable coverage input or coordinates outside the launch clusters.
  - [x] 2.3 Consume the stable Story 3.0.4 validation fields documented in `scripts/geodata/README.md`: `cluster_id`, `status`, `checkedCount`, `agreementRate`, `missingConditions`, `uncertaintyCounts`, and `evidenceFiles`.
  - [x] 2.4 Provide a conservative default coverage map for all launch clusters. Missing validation artifacts, partial-scope artifacts, central gate failure, outside-bbox venues, or unknown clusters must not allow high building-shadow confidence.
  - [x] 2.5 Map a venue polygon centroid to the relevant central launch cluster using the same cluster IDs/names/radius semantics from `scripts/geodata/shadow_caster_pipeline.py`. Do not import Python or read gitignored raw geodata at runtime.
  - [x] 2.6 Document the exact runtime source of cluster validation in code or a small README note: checked-in conservative seed, validated JSON adapter, or explicit fallback. If the implementation chooses an env/file adapter, missing files must fail closed to non-high confidence.

- [x] **Task 3: Preserve and extend the shadow-caster metadata contract** (AC: #2, #3)
  - [x] 3.1 Update `nextjs-app/lib/solar/types.ts` so `Building` and/or a new `RuntimeShadowCaster` type can carry `qualityScore`, `sourcePriority`, `shadowCasterTier`, `filterDecision`, `casterClass`, `sourceFlags`, and optional obstruction-risk metadata without breaking existing callers.
  - [x] 3.2 Update `nextjs-app/lib/solar/shadow-calculation-service.ts` row mapping to read both existing legacy RPC fields (`Id`, `Geometry`, `Height`, `Source`, `QualityScore`, `ExternalId`, `HeightSource`, `BuildingType`) and new optional metadata fields.
  - [x] 3.3 Update `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql` only if needed so `get_buildings_near_point` exposes the metadata required by this story while preserving the legacy fields and service-role-only boundary.
  - [x] 3.4 Update `nextjs-app/test/unit/shadow-caster-sql-contract.test.ts` to pin any SQL/RPC metadata additions, including that runtime rows still filter to active include records and do not expose vegetation unless explicitly approved by later confidence rules.
  - [x] 3.5 Treat `shadow_caster_tier` values from the geodata pipeline as `primary`, `secondary`, or `uncertain`; unknown values must degrade confidence instead of being trusted.
  - [x] 3.6 Keep review/quarantine and excluded rows inactive. This story must not relax Story 3.0.2 runtime filtering to make more casters active.

- [x] **Task 4: Implement coverage-aware shadow confidence semantics** (AC: #1, #2)
  - [x] 4.1 Fix the current false-high path: `calculateVenueShadow()` must not return `confidence: 1.0` merely because `affectingShadows.length === 0` when cluster coverage is missing, blocked, insufficient, partial, or unknown.
  - [x] 4.2 Fix `calcBuildingDataQuality()` in `nextjs-app/lib/solar/confidence-calculator.ts` so zero casting shadows does not automatically mean perfect building data unless the coverage helper says the relevant cluster is validated.
  - [x] 4.3 Keep the existing RPC-failure path conservative: failed/rejected `get_buildings_near_point` calls still return the unavailable result with confidence at or below the existing low-confidence behavior.
  - [x] 4.4 Use source priority, quality score, caster tier, filter decision, cluster validation status, sun elevation, and weather state in the final confidence factors. Lower-quality or unknown values must reduce or cap confidence; eligible validated coverage can permit high confidence only when other factors also support it.
  - [x] 4.5 Ensure non-eligible cluster coverage caps the confidence category below `High` (`overallConfidence < 0.7`) even when weather is fresh and no shadow polygons intersect the venue.
  - [x] 4.6 Preserve low-sun behavior: sun elevation below the reliable threshold remains low confidence and must not be rescued by cluster validation.
  - [x] 4.7 Preserve the no-sun/night behavior separately from building-data quality. When the sun is not visible, the result may be certain that there is no direct sun, but it must not be used as proof of building-shadow coverage.

- [x] **Task 5: Add known obstruction risk caps without adding user-facing copy** (AC: #3)
  - [x] 5.1 Define a small typed set of obstruction risk classes covering vegetation/tree, awning, umbrella, bridge, temporary structure, seasonal furniture, and `other`.
  - [x] 5.2 Support manually tagged obstruction risk metadata from existing runtime metadata fields such as `source_flags`, `source_object_metadata`, `provenance_metadata`, or venue-side metadata if already available. If no source exists in the current code path, implement the pure cap helper and default runtime risk to none.
  - [x] 5.3 Apply obstruction caps or uncertain markers consistently in confidence factor output. Do not silently count tree/awning/umbrella/bridge/temporary-structure uncertainty as a building-data failure.
  - [x] 5.4 Do not add Swedish uncertainty labels, help text, About-page copy, or new UI surfaces. Story 3.0.6 owns user-facing uncertainty copy.

- [x] **Task 6: Audit public API and fixture boundaries** (AC: all)
  - [x] 6.1 Confirm whether any active public route currently calls `calculateSunExposure()` or `calculateVenueShadow()`. At draft time, `nextjs-app/app/api/venues/route.ts` and `[slug]/route.ts` are fixture-backed and no `/api/sun-exposure/*` route exists.
  - [x] 6.2 If this story changes a live API response shape, update `nextjs-app/lib/types/api.ts`, route tests, TanStack query consumers, and Swedish UI copy through `next-intl` keys only. Otherwise, keep API DTOs stable and document that the engine semantics are ready for the later live-data cutover.
  - [x] 6.3 Existing confidence displays must remain renderable. Do not hide confidence globally, remove `confidence` fields, or replace the fixture-driven UI with a live DB/API migration in this story.
  - [x] 6.4 Client components still must not import from `nextjs-app/lib/solar`, `nextjs-app/lib/weather`, `nextjs-app/lib/supabase`, `nextjs-app/lib/middleware`, or `nextjs-app/lib/buildings`.

- [x] **Task 7: Add focused regression tests for conservative confidence** (AC: all)
  - [x] 7.1 Extend `nextjs-app/test/unit/shadow-calculation-service.test.ts` or add focused unit tests proving an empty successful RPC result is not high confidence when coverage is unknown, insufficient, blocked, partial-scope, outside bbox, or missing.
  - [x] 7.2 Add tests proving an empty successful RPC result can avoid the cap only when the relevant cluster validation status is eligible and the rest of the confidence factors allow it.
  - [x] 7.3 Add tests for source metadata weighting: primary/high-quality casters score above secondary/uncertain/low-quality casters, and unknown tier/filter metadata degrades confidence.
  - [x] 7.4 Add tests for low sun elevation, weather unavailable/stale/forecast behavior, and RPC failure/rejection so existing conservative caps are preserved.
  - [x] 7.5 Add tests for obstruction risk caps and uncertainty separation. Known vegetation/awning/umbrella/bridge/temporary-structure risks must cap or mark uncertainty without being treated as ordinary building-data disagreement.
  - [x] 7.6 Add tests for any SQL/RPC metadata additions and any coverage JSON/config parser. Parser tests must prove missing or malformed validation artifacts fail closed.
  - [x] 7.7 Keep existing geodata pipeline tests green if shared field names or handoff docs are changed.

- [x] **Task 8: Final verification and review gate** (AC: all)
  - [x] 8.1 Run `cd nextjs-app && npx.cmd tsc --noEmit`.
  - [x] 8.2 Run `cd nextjs-app && npx.cmd eslint . --quiet`.
  - [x] 8.3 Run `cd nextjs-app && npx.cmd vitest run`.
  - [x] 8.4 Run `python -m py_compile scripts/geodata/shadow_caster_pipeline.py` and `python -m unittest discover -s scripts/geodata/tests` if geodata field names, docs, fixtures, or pipeline code are touched.
  - [x] 8.5 Run `cd nextjs-app && npm run build` if runtime TypeScript, API routes, package files, or Next configuration changed. If only story/docs/tests changed, document the skip rationale.
  - [x] 8.6 Run E2E and visual validation only if visible UI/API confidence behavior changes a mapped screen. If no visible screen changes are made, document that visual validation is not applicable for this backend/runtime confidence story.
  - [x] 8.7 Before changing sprint status to `review`, run `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-5-confidence-engine-data-coverage`.

### Review Findings

- [x] [Review][Patch] Harden cluster validation artifact parsing before allowing eligible coverage [nextjs-app/lib/solar/shadow-data-coverage.ts:73]
- [x] [Review][Patch] Match the pipeline cluster name for `linne` (`Linné`) [nextjs-app/lib/solar/shadow-data-coverage.ts:38]
- [x] [Review][Patch] Add required weather unavailable/stale/forecast regression coverage [nextjs-app/test/unit/confidence-calculator.test.ts:42]
- [x] [Review][Patch] Fail closed for malformed venue polygons in coverage centroid calculation [nextjs-app/lib/solar/shadow-data-coverage.ts:204]

## Dev Notes

### Current Runtime Confidence Problem

- `nextjs-app/lib/solar/shadow-calculation-service.ts` currently sets `combinedConfidence` to `1.0` when no affecting shadows intersect the venue.
- `nextjs-app/lib/solar/confidence-calculator.ts` currently makes `calcBuildingDataQuality([])` return `1.0`.
- Those two defaults are the exact deferred Story 3.0.2 issue carried into this story: an empty successful `get_buildings_near_point` response can mean "sunny with validated surrounding coverage" or "no active caster coverage yet." This story must distinguish those cases.
- RPC failure/rejection already returns a conservative unavailable result at confidence `0.2`; preserve that behavior.

### Story 3.0.4 Handoff

- Story 3.0.4 added deterministic spot-check gates in `scripts/geodata/shadow_caster_pipeline.py`.
- The handoff artifact for this story is `building_geodata/goteborg-open/derived/shadow_caster_cluster_validation.json`, with a Markdown companion report. Those generated files are local/gitignored.
- Stable downstream fields documented by Story 3.0.4: `cluster_id`, `status`, `checkedCount`, `agreementRate`, `missingConditions`, `uncertaintyCounts`, and `evidenceFiles`.
- Gate statuses are `eligible`, `blocked`, and `insufficient_evidence`; runtime must also handle missing/unknown/partial input conservatively.
- `--no-require-all-clusters` reports are partial diagnostics and must not enable high confidence for launch.
- Trees, awnings, umbrellas, bridges, temporary structures, seasonal furniture, and other documented obstructions are uncertainty causes, not silent building-data failures.

### Shadow Caster Metadata

- The geodata pipeline emits `quality_score`, `shadow_caster_tier`, `filter_decision`, `source_priority`, `caster_class`, `source_flags`, and provenance/source metadata for import rows.
- `shadow_caster_tier` values are currently `primary`, `secondary`, and `uncertain`.
- The Story 3.0.2 compatibility RPC currently returns the legacy fields required by the existing TypeScript engine. If extra metadata is added to the RPC, keep the legacy fields and tests intact.
- Active runtime casters still must satisfy the Story 3.0.2 filter: active include rows, height at least 3 m, valid geometry, and MVP-approved caster classes. Do not make vegetation broadly active in this story.

### Architecture and Safety Guardrails

- Work belongs in server/runtime modules such as `nextjs-app/lib/solar/*`, focused tests under `nextjs-app/test/unit/*`, and, if needed, the existing SQL handoff file. Do not put solar engine code in React client components.
- Public client data access still flows through `nextjs-app/app/api/*` routes and hooks in `hooks/queries/`; query keys stay in `nextjs-app/lib/query-keys.ts`.
- Do not add admin upload/review UI, admin auth, candidate queues, or live data-maintenance routes. Venue and geodata operations remain reviewed direct operations.
- Do not execute Supabase SQL automatically. If SQL changes are needed, update the manual-run handoff and tests only.
- Future Monetization remains dormant. Do not introduce Season Pass, Swish, payment state, lock badges, premium routing, or paywall copy.

### Latest Local Tooling Context

- Use the versions already in `nextjs-app/package.json`; do not add or upgrade dependencies for this story. Relevant local versions at draft time include Next.js `^16.2.2`, React `^19.2.5`, TypeScript `^6.0.2`, Vitest `^4.1.4`, Zod `^4.3.6`, Supabase JS `^2.103.3`, Turf `^7.3.4`, MapLibre `^5.23.0`, and TanStack Query `^5.99.0`.
- Geodata tooling versions are pinned in `scripts/geodata/requirements.txt`: `pyshp==3.0.9`, `Shapely==2.1.2`, `pyproj==3.7.2`, `tifffile==2026.6.1`, and `imagecodecs==2026.5.10`.
- No latest external API research is required for implementation unless the developer chooses to introduce a new dependency or change an external service contract; that should be treated as scope expansion and avoided.

### Expected File Impact

- Likely TypeScript runtime files:
  - `nextjs-app/lib/solar/types.ts`
  - `nextjs-app/lib/solar/shadow-calculation-service.ts`
  - `nextjs-app/lib/solar/confidence-calculator.ts`
  - new helper/config under `nextjs-app/lib/solar/` if needed for coverage status.
- Likely tests:
  - `nextjs-app/test/unit/shadow-calculation-service.test.ts`
  - new/updated confidence or coverage helper tests under `nextjs-app/test/unit/`
  - `nextjs-app/test/unit/shadow-caster-sql-contract.test.ts` if SQL/RPC metadata changes.
- Possible planning/handoff docs:
  - `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql`
  - `scripts/geodata/README.md` only if the Story 3.0.4 validation output contract or field names change.
- Avoid UI files unless a visible confidence behavior change is unavoidable.

### References

- `AGENTS.md`
- `project-context.md`
- `_bmad-output/planning-artifacts/epics.md` - Epic 3 Prelude and Story 3.0.5 ACs.
- `_bmad-output/planning-artifacts/prd.md` - Shadow Data Trust Realignment and confidence risk mitigation.
- `_bmad-output/planning-artifacts/architecture.md` - Shadow Caster Data Architecture, confidence gates, and Shadow Caster Lookup data flow.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - confidence as visible expectation calibration; Story 3.0.6 owns new copy.
- `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-02-shadow-data-trust-realignment.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.md`
- `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql`
- `_bmad-output/implementation-artifacts/3-0-3-open-geodata-import-pipeline.md`
- `_bmad-output/implementation-artifacts/3-0-4-geodata-validation-spot-check-gates.md`
- `scripts/geodata/README.md`
- `scripts/geodata/shadow_caster_pipeline.py`
- `nextjs-app/lib/solar/shadow-calculation-service.ts`
- `nextjs-app/lib/solar/confidence-calculator.ts`
- `nextjs-app/lib/solar/sun-exposure-service.ts`
- `nextjs-app/lib/solar/types.ts`
- `nextjs-app/lib/types/api.ts`
- `nextjs-app/docs/design/DESIGN.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex (Codex desktop)

### Debug Log References

- Draft BMAD config load returned `user_name=Rasmus`, `communication_language=English`, and `document_output_language=English`.
- Draft sprint-status scan identified `3-0-5-confidence-engine-data-coverage` as the next backlog story; Story 3.1 remains paused behind the Epic 3 Prelude.
- Draft worktree check found existing prior-story artifacts, validation logs, geodata tooling, solar runtime edits, and related tests in the local worktree; they were treated as current local context and preserved.
- Draft deferred-work scan found one active carry-in targeting Story 3.0.5: empty active shadow-caster coverage can still report full sun with high confidence.
- Draft baseline before story creation: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Draft baseline before story creation: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Dev baseline before editing: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Dev baseline before editing: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Red test run: `cd nextjs-app && npx.cmd vitest run test/unit/shadow-data-coverage.test.ts test/unit/confidence-calculator.test.ts test/unit/shadow-geometry-confidence.test.ts test/unit/shadow-calculation-service.test.ts test/unit/shadow-caster-sql-contract.test.ts` failed as expected before implementation, pinning missing coverage helper, false-high empty coverage, missing metadata propagation, missing SQL fields, low-sun cap, and obstruction cap behavior.
- Focused green test run: same Vitest subset passed after implementation (5 files / 23 tests).
- Static validation after implementation: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Static validation after implementation: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- API boundary audit: `rg "calculateSunExposure|calculateVenueShadow" nextjs-app/app nextjs-app/hooks nextjs-app/components nextjs-app/lib` found only solar runtime exports/internal calls; venue API routes remain fixture-backed and no `/api/sun-exposure/*` route exists.
- Client boundary audit: `rg "@/lib/solar|@/lib/weather|@/lib/supabase|@/lib/middleware|@/lib/buildings" nextjs-app/components nextjs-app/app nextjs-app/hooks` found no forbidden client imports.
- Full unit/component validation: `cd nextjs-app && npx.cmd vitest run` passed (45 files / 379 tests).
- Geodata script compile validation: `python -m py_compile scripts/geodata/shadow_caster_pipeline.py` passed.
- Geodata unit validation: `python -m unittest discover -s scripts/geodata/tests` passed (19 tests).
- Production build validation: `cd nextjs-app && npm run build` passed. Next.js emitted the pre-existing multiple-lockfile workspace-root warning; build completed successfully.
- E2E/visual validation: not applicable before review gate because this backend/runtime confidence story made no visible UI/API response-shape change and references no mapped screen ID.
- Story review gate: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-5-confidence-engine-data-coverage` passed; lint, typecheck, and Vitest passed (45 files / 379 tests); visual validation skipped because no mapped screen ID; sprint status moved `in-progress` -> `review`. Validation artifact: `_bmad-output/implementation-artifacts/validation/3-0-5-confidence-engine-data-coverage-review-20260605-191547.log`.
- Final story review gate rerun after adding blocked/insufficient/outside-bbox empty-RPC assertions passed; lint, typecheck, and Vitest passed (45 files / 382 tests); visual validation skipped because no mapped screen ID; sprint status was already `review`. Validation artifact: `_bmad-output/implementation-artifacts/validation/3-0-5-confidence-engine-data-coverage-review-20260605-191750.log`.
- Round 1 BMAD code review found four patch findings: validation-artifact parser hardening, `linne` cluster-name contract drift, missing weather unavailable/stale/forecast regression tests, and malformed-polygon fail-closed handling.
- Focused review-fix validation: `cd nextjs-app && npx.cmd vitest run test/unit/shadow-data-coverage.test.ts test/unit/confidence-calculator.test.ts test/unit/shadow-calculation-service.test.ts` passed (3 files / 19 tests).
- Review-fix static validation: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Review-fix static validation: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Review-fix full unit/component validation: `cd nextjs-app && npx.cmd vitest run` passed (45 files / 385 tests).
- Final story-review gate rerun after Round 1 fixes passed (`.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-5-confidence-engine-data-coverage`): lint, typecheck, and Vitest passed (45 files / 385 tests); visual validation skipped because no mapped screen ID; sprint status was already `review`. Validation artifact: `_bmad-output/implementation-artifacts/validation/3-0-5-confidence-engine-data-coverage-review-20260605-221240.log`.

### Completion Notes List

- Story drafted by Bob/Codex on 2026-06-05.
- Acceptance criteria are preserved verbatim from `_bmad-output/planning-artifacts/epics.md`.
- Deferred Story 3.0.2 Round 3 empty-coverage finding was carried into this story and removed from `deferred-work.md`.
- Draft analysis confirmed this is a backend/runtime confidence story with no standalone visual reference; visual validation is required only if visible confidence UI changes.
- Draft analysis confirmed implementation should consume Story 3.0.4 cluster validation semantics and preserve Story 3.0.2 RPC/service-role boundaries.
- Story-file-audit: all seven checks pass.
- Added a pure launch-cluster coverage helper with a checked-in conservative seed. Missing, malformed, partial-scope, failing, outside-bbox, and unknown coverage inputs fail closed below high confidence.
- Extended runtime shadow-caster metadata through TypeScript types, RPC row mapping, shadow projections, confidence weighting, and the manual SQL handoff while preserving active/include runtime filtering and service-role-only access.
- Fixed the empty successful RPC/empty affecting-shadow path so `calculateVenueShadow()` and `calculateConfidenceFactors()` do not infer high building-data quality unless coverage is eligible.
- Added typed obstruction risk extraction and caps for tree/awning/umbrella/bridge/temporary-structure/seasonal-furniture/other without adding user-facing copy or UI surfaces.
- Confirmed public API DTOs remain stable; current venue routes still use fixtures and the updated engine semantics are ready for later live-data cutover.
- Round 1 code-review fixes tightened validation-artifact parsing to fail closed unless the full launch-cluster gate and eligible evidence thresholds are present, aligned the `linne` cluster name with the pipeline, added explicit weather-state regression coverage, and made malformed venue polygons return unknown coverage instead of throwing.
- Rasmus approved moving the story from review to done after Round 1 fixes and the final story-review gate passed.

### File List

- `_bmad-output/implementation-artifacts/3-0-5-confidence-engine-data-coverage.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/validation/3-0-5-confidence-engine-data-coverage-review-20260605-191547.log`
- `_bmad-output/implementation-artifacts/validation/3-0-5-confidence-engine-data-coverage-review-20260605-191750.log`
- `_bmad-output/implementation-artifacts/validation/3-0-5-confidence-engine-data-coverage-review-20260605-221240.log`
- `nextjs-app/lib/solar/confidence-calculator.ts`
- `nextjs-app/lib/solar/index.ts`
- `nextjs-app/lib/solar/obstruction-risk.ts`
- `nextjs-app/lib/solar/shadow-calculation-service.ts`
- `nextjs-app/lib/solar/shadow-data-coverage.ts`
- `nextjs-app/lib/solar/shadow-geometry.ts`
- `nextjs-app/lib/solar/types.ts`
- `nextjs-app/test/unit/confidence-calculator.test.ts`
- `nextjs-app/test/unit/shadow-calculation-service.test.ts`
- `nextjs-app/test/unit/shadow-caster-sql-contract.test.ts`
- `nextjs-app/test/unit/shadow-data-coverage.test.ts`
- `nextjs-app/test/unit/shadow-geometry-confidence.test.ts`

## Change Log

| Date | Author | Note |
|------|--------|------|
| 2026-06-05 | Bob | Story drafted from Epic 3 Prelude source ACs, deferred-work carry-in, Story 3.0.4 validation handoff, accepted shadow-data ADR, architecture, PRD, UX spec, and current solar runtime code. Status -> ready-for-dev. |
| 2026-06-05 | Bob | Story-file-audit completed with all seven checks passing. |
| 2026-06-05 | Amelia | Implemented coverage-aware confidence semantics, runtime caster metadata weighting, obstruction risk caps, SQL metadata handoff fields, and focused regression coverage. Status -> in-progress. |
| 2026-06-05 | Amelia | Final verification and story-review gate passed. Status -> review. |
| 2026-06-05 | Amelia | Added explicit blocked, insufficient-evidence, and outside-bbox empty-RPC assertions; final story-review gate rerun passed. |
| 2026-06-05 | Amelia | Applied Round 1 BMAD code-review fixes; final story-review gate rerun passed with lint, typecheck, and Vitest green. |
| 2026-06-05 | Amelia | Rasmus approved completion. Status -> done. |
