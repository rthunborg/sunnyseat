import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

describe('shadow caster SQL contract handoff', () => {
  const sqlPath = path.resolve(
    process.cwd(),
    '..',
    '_bmad-output',
    'implementation-artifacts',
    '3-0-2-shadow-caster-schema-rpc-contract.sql'
  );

  let sql = '';
  let normalized = '';

  beforeAll(() => {
    sql = readFileSync(sqlPath, 'utf8');
    normalized = sql.replace(/\s+/g, ' ').toLowerCase();
  });

  it('is a manual-run Supabase handoff with separated operational sections', () => {
    expect(sql.startsWith('-- MANUAL-RUN ONLY: review before executing in Supabase')).toBe(true);
    expect(normalized).toContain('section 1: diagnostics');
    expect(normalized).toContain('section 2: schema creation');
    expect(normalized).toContain('section 3: import/backfill placeholders');
    expect(normalized).toContain('section 4: privileges');
    expect(normalized).toContain('section 5: rollback notes');
  });

  it('defines the provenance-rich shadow_casters table fields', () => {
    expect(normalized).toMatch(/create table if not exists public\.shadow_casters/);

    const requiredColumns = [
      'id',
      'geometry',
      'height_m',
      'ground_z_rh2000',
      'roof_z_rh2000',
      'height_method',
      'height_source',
      'source_dataset',
      'source_external_id',
      'source_footprint_fid',
      'source_object_type',
      'source_purpose',
      'source_geometry_type',
      'source_geom_3007',
      'source_layer',
      'source_subclass',
      'z_semantics',
      'source_collection_metadata',
      'source_update_metadata',
      'source_object_metadata',
      'engine_geometry_method',
      'runtime_geometry_crs',
      'metric_crs',
      'provenance_metadata',
      'quality_score',
      'shadow_caster_tier',
      'filter_decision',
      'filter_reasons',
      'source_flags',
      'matched_line_count',
      'z_spread_m',
      'bbox_3007',
      'centroid_3007',
      'caster_class',
      'source_priority',
      'active',
      'import_batch_id',
      'imported_at',
      'updated_at',
    ];

    for (const column of requiredColumns) {
      expect(normalized).toMatch(new RegExp(`\\b${column}\\b`));
    }
  });

  it('guards unsafe runtime activation with constraints and indexes', () => {
    expect(normalized).toContain('height_m >= 0');
    expect(normalized).toContain("height_m::text not in ('nan', 'infinity', '-infinity')");
    expect(normalized).toContain('quality_score is null or');
    expect(normalized).toContain("filter_decision in ('include', 'review', 'exclude')");
    expect(normalized).toContain(
      "caster_class in ('building', 'structure', 'vegetation', 'manual_override')"
    );
    expect(normalized).toContain("filter_decision is not distinct from 'include'");
    expect(normalized).toContain('height_m is not null and height_m >= 3');
    expect(normalized).toContain('geometry is not null');
    expect(normalized).toContain('not st_isempty(geometry)');
    expect(normalized).toContain('st_isvalid(geometry)');
    expect(normalized).toContain('st_covers(st_makeenvelope(-180, -90, 180, 90, 4326), geometry)');
    expect(normalized).toContain('shadow_casters_active_requires_mvp_caster_class');
    expect(normalized).toContain("caster_class in ('building', 'structure', 'manual_override')");
    expect(normalized).toContain('shadow_casters_active_building_requires_byggnad_l_source');
    expect(normalized).toContain("caster_class <> 'building' or source_layer = 'byggnad_l'");
    expect(normalized).toContain('shadow_casters_active_byggnad_l_requires_source_geom');
    expect(normalized).toContain("source_layer is distinct from 'byggnad_l' or source_geom_3007 is not null");
    expect(normalized).toContain("nullif(btrim(source_dataset), '') is not null");
    expect(normalized).toContain('alter column filter_decision set not null');
    expect(normalized).toContain('alter column active set not null');
    expect(normalized).toContain('using gist ((geometry::geography))');
    expect(normalized).toContain('source_geom_3007 geometry(geometryz, 3007)');
    expect(normalized).toContain('idx_shadow_casters_source_geom_3007');
    expect(normalized).toContain('idx_shadow_casters_runtime_priority');
  });

  it('upgrades existing tables before replacing runtime constraints', () => {
    expect(normalized).toContain('add column if not exists id bigint');
    expect(normalized).toContain('shadow_casters_id_seq');
    expect(normalized).toContain('alter column id set default');
    expect(normalized).toContain('update public.shadow_casters set id = nextval');
    expect(normalized).toContain('row_number() over (partition by id order by ctid)');
    expect(normalized).toContain('add constraint shadow_casters_id_unique unique (id)');

    expect(normalized).toContain("filter_decision not in ('include', 'review', 'exclude')");
    expect(normalized).toContain("caster_class not in ('building', 'structure', 'vegetation', 'manual_override')");
    expect(normalized).toContain("height_source not in ('surveyed', 'osm', 'heuristic', 'manualoverride')");
    expect(normalized).toContain("height_m::text in ('nan', 'infinity', '-infinity')");
    expect(normalized).toContain("caster_class = 'vegetation'");
    expect(normalized).toContain("caster_class = 'structure'");
    expect(normalized).toContain("source_layer is distinct from 'byggnad_l'");
    expect(normalized).toContain('source_geom_3007 is null');
    expect(normalized).toContain("source_flags @> array['manually_approved_runtime_structure']::text[]");

    const cleanupIndex = normalized.indexOf('existing-table data normalization');
    const dropConstraintIndex = normalized.indexOf(
      'alter table public.shadow_casters drop constraint if exists shadow_casters_active_requires_include'
    );
    const addConstraintIndex = normalized.indexOf(
      'add constraint shadow_casters_active_requires_include'
    );

    expect(cleanupIndex).toBeGreaterThanOrEqual(0);
    expect(dropConstraintIndex).toBeGreaterThan(cleanupIndex);
    expect(addConstraintIndex).toBeGreaterThan(dropConstraintIndex);
  });

  it('keeps get_buildings_near_point as a meter-correct compatibility adapter', () => {
    const dropFunctionIndex = normalized.indexOf(
      'drop every existing get_buildings_near_point overload'
    );
    const createFunctionIndex = normalized.indexOf(
      'create or replace function public.get_buildings_near_point'
    );

    expect(dropFunctionIndex).toBeGreaterThanOrEqual(0);
    expect(createFunctionIndex).toBeGreaterThan(dropFunctionIndex);
    expect(normalized).toContain("p.proname = 'get_buildings_near_point'");
    expect(normalized).toContain("execute format('drop function if exists %s',");
    expect(normalized).toMatch(/create or replace function public\.get_buildings_near_point\s*\(/);
    expect(normalized).toContain('p_latitude double precision');
    expect(normalized).toContain('p_longitude double precision');
    expect(normalized).toContain('p_radius_meters double precision');

    for (const field of [
      '"Id"',
      '"Geometry"',
      '"Height"',
      '"Source"',
      '"QualityScore"',
      '"ExternalId"',
      '"HeightSource"',
      '"BuildingType"',
      '"SourcePriority"',
      '"ShadowCasterTier"',
      '"FilterDecision"',
      '"CasterClass"',
      '"SourceFlags"',
      '"SourceObjectMetadata"',
      '"ProvenanceMetadata"',
    ]) {
      expect(sql).toContain(field);
    }

    expect(normalized).toContain('st_dwithin');
    expect(normalized).toContain('geometry::geography');
    expect(normalized).toContain('sc.active = true');
    expect(normalized).toContain("sc.filter_decision = 'include'");
    expect(normalized).toContain('sc.height_m >= 3');
    expect(normalized).toContain('not st_isempty(sc.geometry)');
    expect(normalized).toContain('st_isvalid(sc.geometry)');
    expect(normalized).toContain('st_covers(st_makeenvelope(-180, -90, 180, 90, 4326), sc.geometry)');
    expect(normalized).toContain("nullif(btrim(sc.source_dataset), '') is not null");
    expect(normalized).toContain("sc.caster_class = 'building'");
    expect(normalized).toContain("sc.source_layer = 'byggnad_l'");
    expect(normalized).toContain('sc.source_geom_3007 is not null');
    expect(normalized).toContain("sc.caster_class = 'manual_override'");
    expect(normalized).toContain("sc.caster_class = 'structure'");
    expect(normalized).not.toMatch(/runtime_classes[^;]*vegetation/);
    expect(normalized).not.toMatch(/sc\.caster_class\s+in\s*\([^)]*vegetation/);
    expect(normalized).toContain('row_number() over');
    expect(normalized).toContain('source_priority asc');
  });

  it('deduplicates only explicit logical objects without collapsing shared external IDs', () => {
    const partitionMatch = normalized.match(/partition by coalesce\((.*?) order by/);
    const partitionBy = partitionMatch?.[1] ?? '';

    expect(normalized).toContain(
      'logicalobjectid must be a globally normalized canonical object key, not a source-local id'
    );
    expect(normalized).toContain('logicalobjectid is global/canonical by contract');
    expect(partitionBy).toContain("source_object_metadata->>'logicalobjectid'");
    expect(partitionBy).toContain('source_footprint_fid');
    expect(partitionBy).not.toContain('source_external_id');
    expect(partitionBy).not.toContain(
      "concat_ws(':', sc.source_dataset, nullif(sc.source_object_metadata->>'logicalobjectid'"
    );
  });

  it('keeps the runtime RPC behind the service-role boundary', () => {
    expect(normalized).toContain(
      'grant execute on function public.get_buildings_near_point( double precision, double precision, double precision ) to service_role'
    );
    expect(normalized).toContain('grant select on table public.shadow_casters to service_role');
    expect(normalized).toContain('revoke all on table public.shadow_casters from public');
    expect(normalized).not.toContain('to anon, authenticated');
    expect(normalized).not.toContain('to authenticated');
  });

  it('includes manual smoke checks for review before execution', () => {
    expect(normalized).toContain("to_regclass('public.shadow_casters')");
    expect(normalized).toContain('information_schema.columns');
    expect(normalized).toContain('pg_constraint');
    expect(normalized).toContain('pg_indexes');
    expect(normalized).toContain('pg_get_function_arguments');
    expect(normalized).toContain('routine_privileges');
    expect(normalized).toContain('select * from public.get_buildings_near_point');
  });

  it('preserves source 3D geometry and classification separately from runtime geometry', () => {
    expect(normalized).toContain(
      'source_geom_3007 geometry(geometryz, 3007)'
    );
    expect(normalized).toContain('comment on column public.shadow_casters.source_geom_3007');
    expect(normalized).toContain('source 3d geometry');
    expect(normalized).toContain('comment on column public.shadow_casters.source_layer');
    expect(normalized).toContain('comment on column public.shadow_casters.z_semantics');
    expect(normalized).toContain('source_collection_metadata');
    expect(normalized).toContain('source_update_metadata');
    expect(normalized).toContain("payload->>'source_layer'");
    expect(normalized).toContain("payload->>'source_subclass'");
    expect(normalized).toContain("payload->>'z_semantics'");
    expect(normalized).toContain("payload->'source_collection_metadata'");
    expect(normalized).toContain("payload->'source_update_metadata'");
    expect(normalized).toContain("payload->>'source_geom_3007'");
    expect(normalized).toContain(
      "st_setsrid(st_geomfromgeojson(payload->>'source_geom_3007'), 3007)::geometry(geometryz, 3007)"
    );
    expect(normalized).not.toContain('st_force3d');
    expect(normalized.indexOf('comment on column public.shadow_casters.source_geom_3007')).toBeGreaterThan(
      normalized.indexOf('alter table public.shadow_casters add column if not exists source_geom_3007')
    );
    expect(normalized).toContain('geometry remains the wgs84 runtime polygon');
  });
});
