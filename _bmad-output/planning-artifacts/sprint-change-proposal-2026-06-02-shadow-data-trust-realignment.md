# Sprint Change Proposal: Shadow Data Trust Realignment

Date: 2026-06-02
Project: SunnySeat
Status: Approved by Rasmus for planning/tracker update
Scope classification: Moderate backlog reorganization

## 1. Issue Summary

The original backend/database plan assumed `building_geodata/byggnad_kn1480.gpkg` was sufficient building data for 2.5D shadow modelling.

That assumption is wrong or incomplete. Local inspection found:

- One `byggnad` layer.
- 177,237 `MULTIPOLYGON` footprints.
- CRS EPSG:3006.
- Useful footprint/object metadata.
- No Z geometry.
- No building-height attribute.
- No roof geometry.
- `lagesosakerhethojd` is height uncertainty/quality metadata, not building height.

Therefore the GeoPackage cannot calculate building shadows alone.

The newly accepted MVP path combines:

1. Existing Lantmäteriet footprints from `byggnad_kn1480.gpkg`.
2. Göteborg Baskarta SHP 3D linework, especially `byggnad_l` types `Takkonturer`, `Fasad`, and `Skärmtak`.
3. Göteborg Höjdmodell 2022 DTM ground elevation.

Derived height method:

```text
max roof/facade/shelter Z - DTM ground Z at representative point
```

MVP geodata scope is the central EPSG:3007 bbox:

```text
x = 140000..150000
y = 6390000..6410000
```

## 2. Impact Analysis

### Epic Impact

Epic 2 is complete and should not be reopened.

Epic 3 is active, but only Story 3.0 is done. Story 3.1 is ready-for-dev but should not proceed until this correction is handled.

Add a prelude block inside Epic 3:

- `3-0-1-shadow-data-adr-planning-realignment`
- `3-0-2-shadow-caster-schema-rpc-contract`
- `3-0-3-open-geodata-import-pipeline`
- `3-0-4-geodata-validation-spot-check-gates`
- `3-0-5-confidence-engine-data-coverage`
- `3-0-6-ux-content-uncertainty-copy`

### Story Impact

Story 3.1 routing can technically proceed, but it should wait because confidence, venue trust, and later feedback/review flows depend on corrected shadow data semantics.

Story 3.2 sun accuracy feedback is directly affected. It should distinguish user feedback about prediction correctness from data-source uncertainty, vegetation/awning uncertainty, and building-data confidence.

Story 3.4 visit-loop hardening should include the corrected confidence/routing/feedback contract.

### Artifact Conflicts

The following artifacts previously implied or tolerated the old building-data assumption:

- `project-context.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- QA strategy artifacts that mention LOD1/estimated heights without the new derived-data path
- Any story file or future story draft that assumes `byggnad_kn1480.gpkg` alone is sufficient

### Technical Impact

Required changes before Epic 3 feature work resumes:

- Add or migrate toward `shadow_casters`.
- Preserve `get_buildings_near_point` as a compatibility RPC until the TypeScript engine is renamed.
- Runtime uses only filtered active records.
- Review/quarantine records stay inactive until spot-checked.
- Confidence calculation accounts for data coverage and cluster validation status.
- Import pipeline becomes tracked, repeatable, and validation-backed.

## 3. Recommended Approach

Use direct backlog adjustment within Epic 3, not a new Epic 2.5.

Rationale:

- Epic 2 is complete.
- Story 2.5 already exists.
- The correction is not a frontend feature gap.
- Epic 3 has a clean pause point after Story 3.0 and before feature work starts.
- The new stories are prerequisites to confidence-heavy routing, feedback, and review workflows.

Recommended sequence:

1. ADR/planning realignment.
2. Schema/RPC contract.
3. Import pipeline.
4. Validation and spot-check gates.
5. Confidence engine data coverage.
6. UX/content uncertainty copy.
7. Resume Story 3.1.

Risk level: moderate. The product promise stays intact, but the data architecture and confidence semantics need correction before more user-facing trust loops are built.

## 4. Detailed Change Proposals

### PRD

Update the executive summary, scope, innovation/risk sections, and technical risks to state:

- GeoPackage-only building data is retired.
- MVP launch is central/south-central bbox only.
- Combined open data is the MVP building-shadow path.
- Trees, awnings, umbrellas, bridges, and temporary structures are known uncertainty.
- High building-shadow confidence is cluster-scoped and validation-gated.

### Architecture

Add:

- Shadow caster data architecture.
- Runtime table contract.
- Caster classes.
- Source precedence.
- Runtime filtering rules.
- Spot-check/high-confidence gate.
- Compatibility role for `get_buildings_near_point`.

### Epics

Insert an "Epic 3 Prelude: Shadow Data Trust Realignment" block and six new stories before Story 3.1.

### Sprint Status

Add the six stories as backlog under `epic-3`, leave `3-1-routing-navigation-to-venue` as ready-for-dev, and add a note that 3.1 is paused until the prelude completes.

### Documentation

Add an ADR and update durable project context so future Codex/BMAD sessions inherit the correction.

## 5. Implementation Handoff

Handoff recipients:

- Bob / Scrum Master: draft Story 3.0.1 first in a fresh session.
- Winston / Architect: review schema/RPC and source-precedence decisions in Story 3.0.2.
- Amelia / Dev: implement story work in order, preserving test gates.
- Quinn / QA: define validation and spot-check gates in Story 3.0.4.
- Sally / UX: handle user-facing uncertainty copy in Story 3.0.6.

Success criteria for the correction block:

- Planning docs no longer claim or imply `byggnad_kn1480.gpkg` alone is enough for shadows.
- Runtime building/shadow lookup is backed by filtered active shadow-caster records.
- High confidence is impossible for a cluster until spot-check gates pass.
- Confidence scores account for data coverage and unmodelled obstructions.
- User-facing copy communicates uncertainty clearly in Swedish without exposing geodata internals.

## 6. Routing Decision

Approved route: moderate course correction through Epic 3 backlog reorganization.

Do not draft the first story in this session. Rasmus will ask Bob, the SM, to draft Story 3.0.1 in a future session.
