-- MANUAL-RUN ONLY: review before executing in Supabase
-- Story 3.0.2: Shadow Caster Schema & RPC Contract
-- Purpose: create a provenance-rich shadow_casters contract and preserve
-- get_buildings_near_point as a compatibility RPC for the current TypeScript
-- shadow engine. This file does not import bulk geodata and does not drop the
-- legacy buildings compatibility surface.

-- ============================================================================
-- Section 1: diagnostics
-- ============================================================================

-- Existing shadow_casters table, if any.
select to_regclass('public.shadow_casters') as shadow_casters_table;

-- Existing compatibility RPC signatures, if any.
select
  p.oid::regprocedure as function_signature,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'get_buildings_near_point';

-- Existing legacy buildings surface, kept for compatibility diagnostics only.
select to_regclass('public.buildings') as legacy_buildings_relation;

-- ============================================================================
-- Section 2: schema creation
-- ============================================================================

create extension if not exists postgis;

create table if not exists public.shadow_caster_import_batches (
  id text primary key,
  source_dataset text not null,
  source_description text,
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text
);

comment on table public.shadow_caster_import_batches is
  'Metadata-only import batch registry. Story 3.0.3 owns repeatable import execution.';

create table if not exists public.shadow_casters (
  id bigserial primary key,
  geometry geometry(Polygon, 4326) not null,
  height_m double precision not null,
  ground_z_rh2000 double precision,
  roof_z_rh2000 double precision,
  height_method text,
  height_source text not null default 'Heuristic',
  source_dataset text not null,
  source_external_id text,
  source_footprint_fid text,
  source_object_type text,
  source_purpose text,
  source_geometry_type text,
  source_geom_3007 geometry(GeometryZ, 3007),
  source_layer text,
  source_subclass text,
  z_semantics text,
  source_collection_metadata jsonb not null default '{}'::jsonb,
  source_update_metadata jsonb not null default '{}'::jsonb,
  source_object_metadata jsonb not null default '{}'::jsonb,
  engine_geometry_method text not null default 'wgs84_footprint_polygon',
  runtime_geometry_crs text not null default 'EPSG:4326',
  metric_crs text not null default 'EPSG:3007',
  provenance_metadata jsonb not null default '{}'::jsonb,
  quality_score numeric(5, 4),
  shadow_caster_tier text,
  filter_decision text not null default 'review',
  filter_reasons text[] not null default '{}'::text[],
  source_flags text[] not null default '{}'::text[],
  matched_line_count integer,
  z_spread_m double precision,
  bbox_3007 geometry(Polygon, 3007),
  centroid_3007 geometry(Point, 3007),
  caster_class text not null default 'building',
  source_priority integer not null default 100,
  active boolean not null default false,
  import_batch_id text references public.shadow_caster_import_batches(id)
    on update cascade
    on delete set null,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.shadow_casters is
  'Runtime and diagnostic shadow-caster storage. Runtime reads must use only active/include records above the meaningful-height threshold.';

alter table public.shadow_casters add column if not exists id bigint;
alter table public.shadow_casters add column if not exists geometry geometry(Polygon, 4326);
alter table public.shadow_casters add column if not exists height_m double precision;
alter table public.shadow_casters add column if not exists ground_z_rh2000 double precision;
alter table public.shadow_casters add column if not exists roof_z_rh2000 double precision;
alter table public.shadow_casters add column if not exists height_method text;
alter table public.shadow_casters add column if not exists height_source text default 'Heuristic';
alter table public.shadow_casters add column if not exists source_dataset text;
alter table public.shadow_casters add column if not exists source_external_id text;
alter table public.shadow_casters add column if not exists source_footprint_fid text;
alter table public.shadow_casters add column if not exists source_object_type text;
alter table public.shadow_casters add column if not exists source_purpose text;
alter table public.shadow_casters add column if not exists source_geometry_type text;
alter table public.shadow_casters add column if not exists source_geom_3007 geometry(GeometryZ, 3007);
alter table public.shadow_casters add column if not exists source_layer text;
alter table public.shadow_casters add column if not exists source_subclass text;
alter table public.shadow_casters add column if not exists z_semantics text;
alter table public.shadow_casters add column if not exists source_collection_metadata jsonb default '{}'::jsonb;
alter table public.shadow_casters add column if not exists source_update_metadata jsonb default '{}'::jsonb;
alter table public.shadow_casters add column if not exists source_object_metadata jsonb default '{}'::jsonb;
alter table public.shadow_casters add column if not exists engine_geometry_method text default 'wgs84_footprint_polygon';
alter table public.shadow_casters add column if not exists runtime_geometry_crs text default 'EPSG:4326';
alter table public.shadow_casters add column if not exists metric_crs text default 'EPSG:3007';
alter table public.shadow_casters add column if not exists provenance_metadata jsonb default '{}'::jsonb;
alter table public.shadow_casters add column if not exists quality_score numeric(5, 4);
alter table public.shadow_casters add column if not exists shadow_caster_tier text;
alter table public.shadow_casters add column if not exists filter_decision text default 'review';
alter table public.shadow_casters add column if not exists filter_reasons text[] default '{}'::text[];
alter table public.shadow_casters add column if not exists source_flags text[] default '{}'::text[];
alter table public.shadow_casters add column if not exists matched_line_count integer;
alter table public.shadow_casters add column if not exists z_spread_m double precision;
alter table public.shadow_casters add column if not exists bbox_3007 geometry(Polygon, 3007);
alter table public.shadow_casters add column if not exists centroid_3007 geometry(Point, 3007);
alter table public.shadow_casters add column if not exists caster_class text default 'building';
alter table public.shadow_casters add column if not exists source_priority integer default 100;
alter table public.shadow_casters add column if not exists active boolean default false;
alter table public.shadow_casters add column if not exists import_batch_id text;
alter table public.shadow_casters add column if not exists imported_at timestamptz default now();
alter table public.shadow_casters add column if not exists updated_at timestamptz default now();

comment on column public.shadow_casters.geometry is
  'Geometry remains the WGS84 runtime polygon used by get_buildings_near_point; source 3D geometry is preserved separately in source_geom_3007.';
comment on column public.shadow_casters.source_geom_3007 is
  'Source 3D geometry in EPSG:3007, preserving Baskarta XYZ RH2000 Z coordinates separately from the WGS84 runtime polygon.';
comment on column public.shadow_casters.source_layer is
  'Original source layer for the selected source geometry, such as byggnad_l.';
comment on column public.shadow_casters.source_subclass is
  'Original source subclass or type value for the selected source geometry, such as Takkonturer.';
comment on column public.shadow_casters.z_semantics is
  'Human-readable explanation of the source Z model and height derivation semantics.';
comment on column public.shadow_casters.source_collection_metadata is
  'Structured metadata about raw source files, checksums, collection layers, and source inputs used to derive the row.';
comment on column public.shadow_casters.source_update_metadata is
  'Structured metadata describing source refresh policy and update model for the row.';
comment on column public.shadow_casters.source_priority is
  'Lower numeric source_priority wins for runtime selection: manual override before paid surveyed, paid DSM/LAS, open-derived, then OSM/heuristic fallback. Lower-priority records remain stored for provenance and source comparison.';
comment on column public.shadow_casters.source_object_metadata is
  'Structured source fields such as areaM2, baskartaZStats, logicalObjectId, and runtime approval flags. logicalObjectId must be a globally normalized canonical object key, not a source-local ID.';
comment on column public.shadow_casters.provenance_metadata is
  'CRS, derivation, rollback, and source-refresh metadata not represented by first-class columns.';
comment on column public.shadow_casters.bbox_3007 is
  'Metric EPSG:3007 bbox helper for the central MVP launch extent.';
comment on column public.shadow_casters.centroid_3007 is
  'Metric EPSG:3007 centroid helper for import validation and diagnostics.';

create sequence if not exists public.shadow_casters_id_seq as bigint;
alter sequence public.shadow_casters_id_seq owned by public.shadow_casters.id;
alter table public.shadow_casters
  alter column id set default nextval('public.shadow_casters_id_seq'::regclass);
update public.shadow_casters set id = nextval('public.shadow_casters_id_seq'::regclass)
where id is null;

with duplicate_ids as (
  select
    ctid,
    row_number() over (partition by id order by ctid) as duplicate_rank
  from public.shadow_casters
)
update public.shadow_casters sc
set id = nextval('public.shadow_casters_id_seq'::regclass)
from duplicate_ids d
where sc.ctid = d.ctid
  and d.duplicate_rank > 1;

select setval(
  'public.shadow_casters_id_seq'::regclass,
  greatest(coalesce((select max(id) from public.shadow_casters), 1), 1),
  true
);
alter table public.shadow_casters alter column id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.shadow_casters'::regclass
      and contype = 'p'
  ) then
    alter table public.shadow_casters
      add constraint shadow_casters_pkey primary key (id);
  end if;
end $$;

do $$
declare
  id_attnum smallint;
begin
  select attnum
  into id_attnum
  from pg_attribute
  where attrelid = 'public.shadow_casters'::regclass
    and attname = 'id'
    and not attisdropped;

  if id_attnum is not null
    and not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.shadow_casters'::regclass
        and contype in ('p', 'u')
        and conkey = array[id_attnum]::smallint[]
    )
  then
    alter table public.shadow_casters
      add constraint shadow_casters_id_unique unique (id);
  end if;
end $$;

-- Existing-table data normalization. Keep this before constraint replacement
-- so stale data cannot block the upgraded active-row safeguards.
update public.shadow_casters
set
  filter_decision = case
    when filter_decision in ('include', 'review', 'exclude') then filter_decision
    else 'review'
  end,
  caster_class = case
    when caster_class in ('building', 'structure', 'vegetation', 'manual_override') then caster_class
    else 'building'
  end,
  height_source = case
    when height_source in ('Surveyed', 'Osm', 'Heuristic', 'ManualOverride') then height_source
    else 'Heuristic'
  end,
  height_m = case
    when height_m is null then height_m
    when height_m < 0
      or height_m::text in ('NaN', 'Infinity', '-Infinity')
      then 0
    else height_m
  end,
  quality_score = case
    when quality_score is null or (quality_score >= 0 and quality_score <= 1) then quality_score
    else null
  end,
  active = false,
  updated_at = now()
where filter_decision is null
  or filter_decision not in ('include', 'review', 'exclude')
  or caster_class is null
  or caster_class not in ('building', 'structure', 'vegetation', 'manual_override')
  or (active = true and caster_class = 'vegetation')
  or height_source is null
  or height_source not in ('Surveyed', 'Osm', 'Heuristic', 'ManualOverride')
  or height_m < 0
  or height_m::text in ('NaN', 'Infinity', '-Infinity')
  or quality_score < 0
  or quality_score > 1;

-- Existing-table upgrade hardening. These updates make newly added defaultable
-- columns non-null without guessing geometry/height/source values for inactive
-- diagnostic rows.
update public.shadow_casters
set
  height_source = coalesce(height_source, 'Heuristic'),
  source_collection_metadata = coalesce(source_collection_metadata, '{}'::jsonb),
  source_update_metadata = coalesce(source_update_metadata, '{}'::jsonb),
  source_object_metadata = coalesce(source_object_metadata, '{}'::jsonb),
  engine_geometry_method = coalesce(engine_geometry_method, 'wgs84_footprint_polygon'),
  runtime_geometry_crs = coalesce(runtime_geometry_crs, 'EPSG:4326'),
  metric_crs = coalesce(metric_crs, 'EPSG:3007'),
  provenance_metadata = coalesce(provenance_metadata, '{}'::jsonb),
  filter_decision = coalesce(filter_decision, 'review'),
  filter_reasons = coalesce(filter_reasons, '{}'::text[]),
  source_flags = coalesce(source_flags, '{}'::text[]),
  caster_class = coalesce(caster_class, 'building'),
  source_priority = coalesce(source_priority, 100),
  active = coalesce(active, false),
  imported_at = coalesce(imported_at, now()),
  updated_at = coalesce(updated_at, now())
where height_source is null
  or source_collection_metadata is null
  or source_update_metadata is null
  or source_object_metadata is null
  or engine_geometry_method is null
  or runtime_geometry_crs is null
  or metric_crs is null
  or provenance_metadata is null
  or filter_decision is null
  or filter_reasons is null
  or source_flags is null
  or caster_class is null
  or source_priority is null
  or active is null
  or imported_at is null
  or updated_at is null;

update public.shadow_casters
set active = false,
    filter_decision = coalesce(filter_decision, 'review'),
    updated_at = now()
where active = true
  and (
    geometry is null
    or st_isempty(geometry)
    or not st_isvalid(geometry)
    or case
      when geometry is null then false
      when st_isempty(geometry) then false
      when not st_isvalid(geometry) then false
      else not st_covers(st_makeenvelope(-180, -90, 180, 90, 4326), geometry)
    end
    or height_m is null
    or height_m < 3
    or height_m::text in ('NaN', 'Infinity', '-Infinity')
    or nullif(btrim(source_dataset), '') is null
    or filter_decision is distinct from 'include'
    or caster_class not in ('building', 'structure', 'manual_override')
    or (
      caster_class = 'building'
      and (
        source_layer is distinct from 'byggnad_l'
        or source_geom_3007 is null
      )
    )
    or (
      caster_class = 'structure'
      and not (
        source_flags @> array['manually_approved_runtime_structure']::text[]
        or source_object_metadata @> '{"runtimeApproved": true}'::jsonb
      )
    )
  );

alter table public.shadow_casters alter column height_source set default 'Heuristic';
alter table public.shadow_casters alter column height_source set not null;
alter table public.shadow_casters alter column source_collection_metadata set default '{}'::jsonb;
alter table public.shadow_casters alter column source_collection_metadata set not null;
alter table public.shadow_casters alter column source_update_metadata set default '{}'::jsonb;
alter table public.shadow_casters alter column source_update_metadata set not null;
alter table public.shadow_casters alter column source_object_metadata set default '{}'::jsonb;
alter table public.shadow_casters alter column source_object_metadata set not null;
alter table public.shadow_casters alter column engine_geometry_method set default 'wgs84_footprint_polygon';
alter table public.shadow_casters alter column engine_geometry_method set not null;
alter table public.shadow_casters alter column runtime_geometry_crs set default 'EPSG:4326';
alter table public.shadow_casters alter column runtime_geometry_crs set not null;
alter table public.shadow_casters alter column metric_crs set default 'EPSG:3007';
alter table public.shadow_casters alter column metric_crs set not null;
alter table public.shadow_casters alter column provenance_metadata set default '{}'::jsonb;
alter table public.shadow_casters alter column provenance_metadata set not null;
alter table public.shadow_casters alter column filter_decision set default 'review';
alter table public.shadow_casters alter column filter_decision set not null;
alter table public.shadow_casters alter column filter_reasons set default '{}'::text[];
alter table public.shadow_casters alter column filter_reasons set not null;
alter table public.shadow_casters alter column source_flags set default '{}'::text[];
alter table public.shadow_casters alter column source_flags set not null;
alter table public.shadow_casters alter column caster_class set default 'building';
alter table public.shadow_casters alter column caster_class set not null;
alter table public.shadow_casters alter column source_priority set default 100;
alter table public.shadow_casters alter column source_priority set not null;
alter table public.shadow_casters alter column active set default false;
alter table public.shadow_casters alter column active set not null;
alter table public.shadow_casters alter column imported_at set default now();
alter table public.shadow_casters alter column imported_at set not null;
alter table public.shadow_casters alter column updated_at set default now();
alter table public.shadow_casters alter column updated_at set not null;

alter table public.shadow_casters drop constraint if exists shadow_casters_height_nonnegative;
alter table public.shadow_casters drop constraint if exists shadow_casters_quality_score_range;
alter table public.shadow_casters drop constraint if exists shadow_casters_filter_decision_values;
alter table public.shadow_casters drop constraint if exists shadow_casters_caster_class_values;
alter table public.shadow_casters drop constraint if exists shadow_casters_height_source_values;
alter table public.shadow_casters drop constraint if exists shadow_casters_active_requires_include;
alter table public.shadow_casters drop constraint if exists shadow_casters_active_requires_meaningful_height;
alter table public.shadow_casters drop constraint if exists shadow_casters_active_requires_valid_geometry;
alter table public.shadow_casters drop constraint if exists shadow_casters_active_requires_source_dataset;
alter table public.shadow_casters drop constraint if exists shadow_casters_active_requires_mvp_caster_class;
alter table public.shadow_casters drop constraint if exists shadow_casters_active_building_requires_byggnad_l_source;
alter table public.shadow_casters drop constraint if exists shadow_casters_active_byggnad_l_requires_source_geom;
alter table public.shadow_casters drop constraint if exists shadow_casters_review_records_inactive;
alter table public.shadow_casters drop constraint if exists shadow_casters_excluded_records_inactive;
alter table public.shadow_casters drop constraint if exists shadow_casters_active_structure_requires_approval;

alter table public.shadow_casters
  add constraint shadow_casters_height_nonnegative
  check (
    height_m is null
    or (
      height_m >= 0
      and height_m::text not in ('NaN', 'Infinity', '-Infinity')
    )
  );

alter table public.shadow_casters
  add constraint shadow_casters_quality_score_range
  check (quality_score is null or (quality_score >= 0 and quality_score <= 1));

alter table public.shadow_casters
  add constraint shadow_casters_filter_decision_values
  check (filter_decision in ('include', 'review', 'exclude'));

alter table public.shadow_casters
  add constraint shadow_casters_caster_class_values
  check (caster_class in ('building', 'structure', 'vegetation', 'manual_override'));

alter table public.shadow_casters
  add constraint shadow_casters_height_source_values
  check (height_source in ('Surveyed', 'Osm', 'Heuristic', 'ManualOverride'));

alter table public.shadow_casters
  add constraint shadow_casters_active_requires_include
  check (active is not true or filter_decision is not distinct from 'include');

alter table public.shadow_casters
  add constraint shadow_casters_active_requires_meaningful_height
  check (active is not true or (height_m is not null and height_m >= 3));

alter table public.shadow_casters
  add constraint shadow_casters_active_requires_valid_geometry
  check (
    case
      when active is not true then true
      when geometry is null then false
      when st_isempty(geometry) then false
      when not st_isvalid(geometry) then false
      else st_covers(st_makeenvelope(-180, -90, 180, 90, 4326), geometry)
    end
  );

alter table public.shadow_casters
  add constraint shadow_casters_active_requires_source_dataset
  check (active is not true or nullif(btrim(source_dataset), '') is not null);

alter table public.shadow_casters
  add constraint shadow_casters_active_requires_mvp_caster_class
  check (active is not true or caster_class in ('building', 'structure', 'manual_override'));

alter table public.shadow_casters
  add constraint shadow_casters_active_building_requires_byggnad_l_source
  check (active is not true or caster_class <> 'building' or source_layer = 'byggnad_l');

alter table public.shadow_casters
  add constraint shadow_casters_active_byggnad_l_requires_source_geom
  check (active is not true or source_layer is distinct from 'byggnad_l' or source_geom_3007 is not null);

alter table public.shadow_casters
  add constraint shadow_casters_review_records_inactive
  check (filter_decision is distinct from 'review' or active = false);

alter table public.shadow_casters
  add constraint shadow_casters_excluded_records_inactive
  check (filter_decision is distinct from 'exclude' or active = false);

alter table public.shadow_casters
  add constraint shadow_casters_active_structure_requires_approval
  check (
    active is not true
    or caster_class <> 'structure'
    or source_flags @> array['manually_approved_runtime_structure']::text[]
    or source_object_metadata @> '{"runtimeApproved": true}'::jsonb
  );

create index if not exists idx_shadow_casters_geometry_geography_runtime
  on public.shadow_casters
  using gist ((geometry::geography))
  where active = true
    and filter_decision = 'include'
    and height_m >= 3
    and geometry is not null
    and not st_isempty(geometry)
    and st_isvalid(geometry)
    and st_covers(st_makeenvelope(-180, -90, 180, 90, 4326), geometry)
    and (
      (caster_class = 'building' and source_layer = 'byggnad_l' and source_geom_3007 is not null)
      or caster_class in ('structure', 'manual_override')
    );

create index if not exists idx_shadow_casters_geometry
  on public.shadow_casters
  using gist (geometry);

create index if not exists idx_shadow_casters_bbox_3007
  on public.shadow_casters
  using gist (bbox_3007);

create index if not exists idx_shadow_casters_centroid_3007
  on public.shadow_casters
  using gist (centroid_3007);

create index if not exists idx_shadow_casters_source_geom_3007
  on public.shadow_casters
  using gist (source_geom_3007);

create index if not exists idx_shadow_casters_runtime_priority
  on public.shadow_casters (active, filter_decision, caster_class, source_priority, import_batch_id)
  where active = true;

create index if not exists idx_shadow_casters_active
  on public.shadow_casters (active);

create index if not exists idx_shadow_casters_filter_decision
  on public.shadow_casters (filter_decision);

create index if not exists idx_shadow_casters_caster_class
  on public.shadow_casters (caster_class);

create index if not exists idx_shadow_casters_source_priority
  on public.shadow_casters (source_priority);

create index if not exists idx_shadow_casters_import_batch_id
  on public.shadow_casters (import_batch_id);

-- For a large already-populated table, consider replacing the index statements
-- above with CREATE INDEX CONCURRENTLY statements run one at a time outside a
-- transaction. Do not use CONCURRENTLY inside this whole-file manual script.

-- CREATE OR REPLACE cannot change an existing function's return table shape,
-- and PostgREST can route ambiguously if old overloads remain.
-- Drop every existing get_buildings_near_point overload before recreating the
-- single compatibility signature. This does not drop the legacy buildings
-- table or any source records.
do $$
declare
  function_signature regprocedure;
begin
  for function_signature in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_buildings_near_point'
  loop
    execute format('drop function if exists %s', function_signature);
  end loop;
end $$;

create or replace function public.get_buildings_near_point(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_meters double precision default 200.0
)
returns table (
  "Id" bigint,
  "Geometry" text,
  "Height" double precision,
  "Source" text,
  "QualityScore" double precision,
  "ExternalId" text,
  "HeightSource" text,
  "BuildingType" text,
  "SourcePriority" integer,
  "ShadowCasterTier" text,
  "FilterDecision" text,
  "CasterClass" text,
  "SourceFlags" text[],
  "SourceObjectMetadata" jsonb,
  "ProvenanceMetadata" jsonb,
  -- Story 8.7: RH2000 absolute Z (metres) for the terrain-aware shadow gate.
  -- Appended after the original 15 columns; the TS Building mapper reads them
  -- optionally and falls back to the relative (Story 8.6) gate when absent.
  "GroundZRh2000" double precision,
  "RoofZRh2000" double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  with input_point as (
    select st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography as geog
  ),
  candidates as (
    select
      sc.*,
      -- logicalObjectId is global/canonical by contract. Source-local
      -- identifiers belong in source_footprint_fid or source_external_id.
      row_number() over (
        partition by coalesce(
          nullif(sc.source_object_metadata->>'logicalObjectId', ''),
          case
            when nullif(sc.source_footprint_fid, '') is not null
              then concat_ws(':', sc.source_dataset, sc.source_footprint_fid)
          end,
          sc.id::text
        )
        order by
          sc.source_priority asc,
          sc.quality_score desc nulls last,
          sc.updated_at desc,
          sc.id desc
      ) as runtime_rank
    from public.shadow_casters sc
    cross join input_point ip
    where sc.active = true
      and sc.filter_decision = 'include'
      and sc.height_m >= 3
      and sc.height_m::text not in ('NaN', 'Infinity', '-Infinity')
      and sc.geometry is not null
      and not st_isempty(sc.geometry)
      and st_isvalid(sc.geometry)
      and st_covers(st_makeenvelope(-180, -90, 180, 90, 4326), sc.geometry)
      and nullif(btrim(sc.source_dataset), '') is not null
      and (
        (
          sc.caster_class = 'building'
          and sc.source_layer = 'byggnad_l'
          and sc.source_geom_3007 is not null
        )
        or sc.caster_class = 'manual_override'
        or (
          sc.caster_class = 'structure'
          and (
            sc.source_flags @> array['manually_approved_runtime_structure']::text[]
            or sc.source_object_metadata @> '{"runtimeApproved": true}'::jsonb
          )
        )
      )
      and st_dwithin(
        sc.geometry::geography,
        ip.geog,
        greatest(coalesce(p_radius_meters, 0), 0)
      )
  )
  select
    c.id as "Id",
    st_asgeojson(c.geometry)::text as "Geometry",
    c.height_m as "Height",
    c.source_dataset as "Source",
    c.quality_score::double precision as "QualityScore",
    c.source_external_id as "ExternalId",
    c.height_source as "HeightSource",
    c.caster_class as "BuildingType",
    c.source_priority as "SourcePriority",
    c.shadow_caster_tier as "ShadowCasterTier",
    c.filter_decision as "FilterDecision",
    c.caster_class as "CasterClass",
    c.source_flags as "SourceFlags",
    c.source_object_metadata as "SourceObjectMetadata",
    c.provenance_metadata as "ProvenanceMetadata",
    c.ground_z_rh2000 as "GroundZRh2000",
    c.roof_z_rh2000 as "RoofZRh2000"
  from candidates c
  where c.runtime_rank = 1
  order by c.source_priority asc, c.quality_score desc nulls last, c.id asc;
$$;

comment on function public.get_buildings_near_point(double precision, double precision, double precision) is
  'Compatibility RPC for the current TypeScript Building mapper. Returns only active/include runtime shadow_casters with meter-correct geography radius filtering. Story 8.7 appended GroundZRh2000/RoofZRh2000 (RH2000 absolute Z) for the terrain-aware shadow gate.';

-- ============================================================================
-- Section 3: import/backfill placeholders
-- ============================================================================

-- Story 3.0.3 owns the repeatable open-geodata import pipeline and bulk load.
-- Import guidance for that story:
-- - include records: active = true, filter_decision = 'include', height_m >= 3
-- - review/quarantine records: active = false, filter_decision = 'review'
-- - excluded diagnostics: active = false, filter_decision = 'exclude'
-- - vegetation remains inactive until later confidence rules explicitly approve it
-- - manually approved structures need source_flags to contain
--   'manually_approved_runtime_structure' or source_object_metadata.runtimeApproved = true
-- - source geometry contract: geometry remains the WGS84 runtime polygon, while
--   source_geom_3007 stores the selected EPSG:3007 Z-aware source geometry.
--
-- JSONL payload mapping excerpt for the generated import handoff:
--   case
--     when nullif(payload->>'source_geom_3007', '') is not null
--       then st_setsrid(st_geomfromgeojson(payload->>'source_geom_3007'), 3007)::geometry(GeometryZ, 3007)
--     else null
--   end as source_geom_3007
--   payload->>'source_layer' as source_layer
--   payload->>'source_subclass' as source_subclass
--   payload->>'z_semantics' as z_semantics
--   payload->'source_collection_metadata' as source_collection_metadata
--   payload->'source_update_metadata' as source_update_metadata

-- ============================================================================
-- Section 4: privileges
-- ============================================================================

revoke all on function public.get_buildings_near_point(
  double precision,
  double precision,
  double precision
) from public;

revoke all on function public.get_buildings_near_point(
  double precision,
  double precision,
  double precision
) from anon;

revoke all on function public.get_buildings_near_point(
  double precision,
  double precision,
  double precision
) from authenticated;

revoke all on table public.shadow_casters from anon;
revoke all on table public.shadow_casters from authenticated;
revoke all on table public.shadow_casters from public;

grant execute on function public.get_buildings_near_point(
  double precision,
  double precision,
  double precision
) to service_role;

grant select on table public.shadow_casters to service_role;

-- The compatibility RPC is SECURITY INVOKER, so service_role needs explicit
-- read access to the backing table. Do not grant shadow_casters reads to anon
-- or authenticated; runtime access stays behind existing server-side
-- service-role code.

-- Story 8.5: import-batch registry privileges (parallel to shadow_casters —
-- server-only). The batch table carries no policy/grant in the original 3.0.2
-- contract; geodata + provenance are server-only.
revoke all on table public.shadow_caster_import_batches from anon;
revoke all on table public.shadow_caster_import_batches from authenticated;
revoke all on table public.shadow_caster_import_batches from public;

grant select on table public.shadow_caster_import_batches to service_role;

-- ============================================================================
-- Section 4b: RLS access-model policies (Story 8.5) — server-only geodata
-- ============================================================================
--
-- shadow_casters + shadow_caster_import_batches are server-only geodata: the
-- runtime reads them via getSupabaseServiceRole() (which BYPASSES RLS) and the
-- SECURITY INVOKER get_buildings_near_point RPC executed as service_role. With
-- RLS enabled and ZERO policies, the security advisor flags both tables
-- `rls_enabled_no_policy` (INFO). These explicit service-role SELECT policies
-- document the server-only access model AND clear those INFOs. There is NO
-- anon/authenticated/public policy — geodata is never directly client-readable.
-- service_role bypasses RLS, so the runtime is unaffected either way.
-- Security checklist: each policy is scoped via explicit TO service_role,
-- SELECT-only; deny-by-default (revoke-all) preserved above; no FOR ALL policy;
-- no anon/authenticated read. Idempotent: drop-if-exists + enable-if-not-already.

alter table public.shadow_casters enable row level security;
alter table public.shadow_caster_import_batches enable row level security;

drop policy if exists shadow_casters_service_read on public.shadow_casters;
create policy shadow_casters_service_read
  on public.shadow_casters for select
  to service_role
  using (true);

drop policy if exists shadow_caster_import_batches_service_read
  on public.shadow_caster_import_batches;
create policy shadow_caster_import_batches_service_read
  on public.shadow_caster_import_batches for select
  to service_role
  using (true);

-- ============================================================================
-- Section 5: rollback notes
-- ============================================================================

-- Review before running any rollback. These statements are intentionally
-- commented because they may delete diagnostic provenance:
--
-- drop function if exists public.get_buildings_near_point(
--   double precision,
--   double precision,
--   double precision
-- );
-- drop table if exists public.shadow_casters;
-- drop table if exists public.shadow_caster_import_batches;

-- ============================================================================
-- Section 6: post-run smoke checks
-- ============================================================================

-- Table existence.
select to_regclass('public.shadow_casters') as shadow_casters_table;

-- Required columns.
select column_name, data_type, udt_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'shadow_casters'
  and column_name in (
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
    'updated_at'
  )
order by column_name;

-- Required constraints.
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.shadow_casters'::regclass
  and conname in (
    'shadow_casters_height_nonnegative',
    'shadow_casters_quality_score_range',
    'shadow_casters_filter_decision_values',
    'shadow_casters_caster_class_values',
    'shadow_casters_height_source_values',
    'shadow_casters_active_requires_include',
    'shadow_casters_active_requires_meaningful_height',
    'shadow_casters_active_requires_valid_geometry',
    'shadow_casters_active_requires_source_dataset',
    'shadow_casters_active_requires_mvp_caster_class',
    'shadow_casters_review_records_inactive',
    'shadow_casters_excluded_records_inactive',
    'shadow_casters_active_structure_requires_approval'
  )
order by conname;

-- Required indexes.
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'shadow_casters'
  and indexname like 'idx_shadow_casters%'
order by indexname;

-- Function signature.
select
  p.oid::regprocedure as function_signature,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'get_buildings_near_point';

-- Function privileges.
select grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'get_buildings_near_point'
order by grantee, privilege_type;

-- Backing table privileges required by SECURITY INVOKER.
select grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and table_name = 'shadow_casters'
  and privilege_type = 'SELECT'
order by grantee, privilege_type;

-- Story 8.5: RLS enabled + exactly one service-role SELECT policy on each
-- geodata table, NO anon/authenticated/public policy.
select c.relname as table, c.relrowsecurity as rls_enabled,
  coalesce((select count(*) from pg_policies p
            where p.schemaname = 'public' and p.tablename = c.relname), 0) as policy_count
from pg_class c
where c.oid in ('public.shadow_casters'::regclass,
                'public.shadow_caster_import_batches'::regclass)
order by c.relname;

select tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('shadow_casters', 'shadow_caster_import_batches')
order by tablename, policyname;

-- Sample runtime query. Expect zero rows until Story 3.0.3 imports data.
select *
from public.get_buildings_near_point(57.7089, 11.9746, 200)
limit 5;
