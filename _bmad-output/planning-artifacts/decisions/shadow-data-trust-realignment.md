# ADR: Shadow Data Trust Realignment

Date: 2026-06-02
Status: Accepted
Owner: Rasmus

## Decision

SunnySeat will adopt a combined open-data shadow-caster model for MVP:

```text
2D Lantmäteriet building footprints
+ Göteborg Baskarta XYZ object inventory
+ Göteborg Höjdmodell 2022 DTM-derived ground elevation
```

The previous assumption that `building_geodata/byggnad_kn1480.gpkg` alone is sufficient for building-shadow modelling is retired. That GeoPackage remains useful as the 2D footprint and metadata source, but it has no Z geometry, no building-height attribute, no roof geometry, and no DSM.

MVP launch geodata scope is the current central EPSG:3007 bbox:

```text
x = 140000..150000
y = 6390000..6410000
```

Whole-Gothenburg building/shadow coverage is later expansion.

## Rationale

The current local prototype shows that the combined open-data path can derive plausible central shadow casters:

- Initial central/south-central height candidates: 82,570 features.
- First filtered runtime/import candidate set: 56,776 features.
- Review/quarantine set: 1,980 features.
- Excluded set: 23,814 features, mostly below the current 3 m meaningful-height threshold.

Central retained coverage appears plausible across the launch clusters:

- Avenyn: 638 included, p50/p90 height 18.8 / 24.6 m.
- Haga: 801 included, p50/p90 height 16.6 / 23.6 m.
- Vasastan: 740 included, p50/p90 height 16.2 / 23.8 m.
- Inom Vallgraven: 450 included, p50/p90 height 16.5 / 24.1 m.
- Nordstan: 394 included, p50/p90 height 14.6 / 22.5 m.
- Linné: 601 included, p50/p90 height 14.4 / 23.8 m.

The result is good enough to become the first MVP building-caster subset if it is wrapped in a conservative schema, import pipeline, validation gates, and confidence semantics.

## 2026-06-05 Geodata Clarification

Göteborgs Stad confirmed that the open Höjdmodell is a terrain model/DTM, not a DSM or surface model. They also clarified that Baskarta is the strongest open source for object heights because it contains XYZ coordinates, and that buildings, vegetation, bridges, and related objects may be height-coded as point, line, or polygon objects. The current `byggnad_l` pipeline remains a valid first building subset, but the durable source model is now **Baskarta XYZ object inventory**, not only "Baskarta 3D building linework."

Implications:

- Add a Baskarta layer/Z preflight before deriving or importing new source data.
- Preserve source 3D geometry and source layer/class metadata, not only WGS84 runtime polygons.
- Keep broader non-building layers inactive, diagnostics-only, or obstruction-risk-only until their Z semantics and object classes are validated.
- Paid Göteborg 3D/LAS remains optional fallback/validation data, not an MVP prerequisite.

## Runtime Data Contract

The production schema should migrate toward `shadow_casters`, with at least:

```text
id
geometry
height_m
ground_z_rh2000
roof_z_rh2000
height_method
height_source
source_dataset
source_external_id
source_footprint_fid
source_object_type
source_purpose
source_geometry_type
source_geom_3007
source_layer
source_subclass
engine_geometry_method
quality_score
shadow_caster_tier
filter_decision
filter_reasons
source_flags
matched_line_count
z_spread_m
bbox_3007
centroid_3007
caster_class
source_priority
active
import_batch_id
imported_at
updated_at
```

`get_buildings_near_point` may remain as a compatibility RPC while the TypeScript engine still expects building-shaped records. It must return only runtime-active casters:

- `active = true`
- `filter_decision = 'include'`
- `height_m >= 3`
- MVP-approved caster classes

Review/quarantine records are stored inactive or omitted from runtime. Excluded records are diagnostics only.

## Caster Classes

- `building`: derived from footprints + Baskarta roof/facade/shelter Z.
- `structure`: bridges, large shelters, walls, major built objects.
- `vegetation`: trees/hedges; initially disabled or low-confidence unless better data exists.
- `manual_override`: hand-entered corrections for known high-impact cases.

MVP starts with buildings only, plus manually annotated high-impact structures if needed.

## Small Building Rules

For MVP:

- Exclude `Komplementbyggnad` below 3 m height.
- Exclude tiny/tall suspicious records, especially area `< 25 m2` and height `> 15 m`.
- Allow runtime-active `Komplementbyggnad` only when height is at least 3 m, area is materially shadow-relevant, filtering passed, and quality is not uncertain.

## Source Precedence

Source precedence is per logical object/source priority. Higher-priority sources override lower-priority records for runtime selection, but they do not erase provenance-bearing fallback/source-comparison records:

1. Manual verified override
2. Paid LOD2/LOD3 or surveyed roof geometry
3. Paid classified DSM/LAS-derived object height
4. Current open-data derived height: 2D Lantmäteriet footprints + Göteborg Baskarta XYZ object inventory + Göteborg Höjdmodell 2022 DTM-derived ground elevation
5. OSM/heuristic fallback

Every source tier, including manual overrides, paid sources, open-derived records, and OSM/heuristic fallbacks, must preserve source dataset, external ID or manual override ID, object metadata, source priority, import-batch traceability, and rollback path. Open-derived records remain useful as fallback coverage and as source-comparison data even when higher-priority sources arrive.

## Validation Gates

High building-shadow confidence is cluster-scoped.

Minimum before high confidence is allowed for a launch cluster:

- At least 10 venues or street-facing test points per cluster.
- At least 3 sun conditions per cluster:
  - morning or low-angle sun
  - midday/high sun
  - afternoon/evening directional shadows
- At least 70 total central spot checks across launch clusters.
- About 85-90% obvious building-shadow agreement in checked cases.

Trees, awnings, umbrellas, bridges, seasonal furniture, and temporary structures are known uncertainty causes. They should cap or mark confidence uncertain rather than being treated as proof that building data failed.

## Consequences

Epic 3 feature work is paused after Story 3.0. Stories 3.0.1-3.0.7 must complete before Story 3.1 proceeds. Story 3.0.7 is intentionally sequenced before Story 3.0.6 so user-facing uncertainty copy follows the corrected Baskarta XYZ model:

1. Shadow Data ADR & Planning Realignment
2. Shadow Caster Schema & RPC Contract
3. Open Geodata Import Pipeline
4. Geodata Validation & Spot-Check Gates
5. Confidence Engine Data Coverage
6. Baskarta XYZ Inventory & Data Contract Realignment
7. UX Content for Sun Prediction Uncertainty

This correction changes the backend/data foundation and confidence semantics, but does not change the customer-facing MVP promise. It narrows launch data scope to central Gothenburg and makes confidence more honest.

## Open Questions

- Which exact SQL migration path will be used in the current Supabase project, given this checkout has no tracked migration folder?
- Should review/quarantine records live in the same `shadow_casters` table with `active = false`, or in a separate review table?
- Which manually annotated structures, if any, are worth adding before MVP launch?
- How should cluster validation status be stored: per cluster table, import-batch metadata, or a lightweight config table?
- When the TypeScript engine is updated, should the compatibility term `building` be renamed to `shadowCaster` throughout?
