-- Normalize batch-constant shadow-caster provenance before compacting the table.
-- The legacy hash RPC remains byte-compatible for the currently deployed app;
-- new code uses the lean v2 RPC and no longer hashes provenance documents.

set local statement_timeout = 0;
set local lock_timeout = '30s';

alter table public.shadow_caster_import_batches
  add column if not exists z_semantics text,
  add column if not exists source_collection_metadata jsonb not null default '{}'::jsonb,
  add column if not exists source_update_metadata jsonb not null default '{}'::jsonb,
  add column if not exists source_object_shared_metadata jsonb not null default '{}'::jsonb,
  add column if not exists provenance_metadata jsonb not null default '{}'::jsonb;

comment on column public.shadow_caster_import_batches.z_semantics is
  'Batch-level description of source Z coordinates and height derivation semantics.';
comment on column public.shadow_caster_import_batches.source_collection_metadata is
  'Batch-level source files, checksums, layers, and collection inputs.';
comment on column public.shadow_caster_import_batches.source_update_metadata is
  'Batch-level source refresh policy and update model.';
comment on column public.shadow_caster_import_batches.source_object_shared_metadata is
  'Legacy object metadata keys shared by every caster in the batch; retained once for audit and g1 hash compatibility.';
comment on column public.shadow_caster_import_batches.provenance_metadata is
  'Batch-level CRS, derivation, source, and refresh provenance.';

do $$
begin
  if exists (
    select 1
    from public.shadow_casters sc
    left join public.shadow_caster_import_batches batch on batch.id = sc.import_batch_id
    where sc.import_batch_id is null or batch.id is null
  ) then
    raise exception 'Every shadow caster must reference an existing import batch before provenance normalization';
  end if;
end $$;

create temporary table shadow_caster_provenance_checksums
on commit drop
as
select
  sc.id,
  sc.import_batch_id,
  sc.z_semantics,
  md5(sc.source_collection_metadata::text) as source_collection_hash,
  md5(sc.source_update_metadata::text) as source_update_hash,
  md5(sc.source_object_metadata::text) as source_object_hash,
  md5(sc.provenance_metadata::text) as provenance_hash
from public.shadow_casters sc;

create unique index on shadow_caster_provenance_checksums (id);
create index on shadow_caster_provenance_checksums (import_batch_id);

with batch_samples as materialized (
  select distinct on (sc.import_batch_id)
    sc.import_batch_id,
    sc.z_semantics,
    sc.source_collection_metadata,
    sc.source_update_metadata,
    sc.source_object_metadata,
    sc.provenance_metadata
  from public.shadow_casters sc
  order by sc.import_batch_id, sc.id
), normalized_samples as (
  select
    sample.import_batch_id,
    sample.z_semantics,
    sample.source_collection_metadata,
    sample.source_update_metadata,
    coalesce((
      select jsonb_object_agg(entry.key, entry.value)
      from jsonb_each(sample.source_object_metadata) entry
      where entry.key = any (array[
        'candidateSource',
        'dtmTileIds',
        'matchBufferM',
        'rawSourceFiles',
        'sourceDataset',
        'sourceFileChecksums'
      ]::text[])
    ), '{}'::jsonb) as source_object_shared_metadata,
    sample.provenance_metadata
  from batch_samples sample
)
update public.shadow_caster_import_batches batch
set
  z_semantics = sample.z_semantics,
  source_collection_metadata = sample.source_collection_metadata,
  source_update_metadata = sample.source_update_metadata,
  source_object_shared_metadata = sample.source_object_shared_metadata,
  provenance_metadata = sample.provenance_metadata
from normalized_samples sample
where batch.id = sample.import_batch_id;

do $$
begin
  if exists (
    select 1
    from shadow_caster_provenance_checksums expected
    join public.shadow_caster_import_batches batch on batch.id = expected.import_batch_id
    where expected.z_semantics is distinct from batch.z_semantics
       or expected.source_collection_hash <> md5(batch.source_collection_metadata::text)
       or expected.source_update_hash <> md5(batch.source_update_metadata::text)
       or expected.provenance_hash <> md5(batch.provenance_metadata::text)
  ) then
    raise exception 'Batch provenance differs between shadow casters; normalization aborted without data loss';
  end if;
end $$;

update public.shadow_casters sc
set source_object_metadata = sc.source_object_metadata - array[
  'candidateSource',
  'dtmTileIds',
  'matchBufferM',
  'rawSourceFiles',
  'sourceDataset',
  'sourceFileChecksums'
]::text[];

do $$
begin
  if exists (
    select 1
    from shadow_caster_provenance_checksums expected
    join public.shadow_casters sc on sc.id = expected.id
    join public.shadow_caster_import_batches batch on batch.id = sc.import_batch_id
    where expected.source_object_hash <>
      md5((sc.source_object_metadata || batch.source_object_shared_metadata)::text)
  ) then
    raise exception 'Row-specific shadow-caster provenance could not be reconstructed; normalization aborted without data loss';
  end if;
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
  "GroundZRh2000" double precision,
  "RoofZRh2000" double precision
)
language sql
stable
security invoker
set search_path = pg_catalog, public, extensions
as $$
  with input_point as (
    select st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography as geog
  ),
  candidates as (
    select
      sc.*,
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
    '{}'::jsonb as "ProvenanceMetadata",
    c.ground_z_rh2000 as "GroundZRh2000",
    c.roof_z_rh2000 as "RoofZRh2000"
  from candidates c
  where c.runtime_rank = 1
  order by c.source_priority asc, c.quality_score desc nulls last, c.id asc;
$$;

create or replace function public.get_shadow_caster_hash_records(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_meters double precision default 1500
)
returns table (
  id integer,
  footprint_ewkb_hex text,
  height_m numeric,
  ground_z_rh2000 numeric,
  roof_z_rh2000 numeric,
  source_priority integer,
  shadow_caster_tier text,
  filter_decision text,
  caster_class text,
  source_flags text[],
  source_object_metadata jsonb,
  provenance_metadata jsonb,
  import_generation text
)
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  with runtime_caster_ids as (
    select distinct (runtime."Id")::bigint as id
    from public.get_buildings_near_point(
      p_latitude,
      p_longitude,
      greatest(coalesce(p_radius_meters, 0), 0)
    ) as runtime
    where runtime."Id" is not null
  )
  select
    sc.id::integer as id,
    upper(encode(st_asewkb(st_normalize(st_force2d(sc.geometry)), 'XDR'), 'hex')) as footprint_ewkb_hex,
    sc.height_m,
    sc.ground_z_rh2000,
    sc.roof_z_rh2000,
    sc.source_priority,
    sc.shadow_caster_tier,
    sc.filter_decision,
    sc.caster_class,
    coalesce(sc.source_flags, array[]::text[]) as source_flags,
    sc.source_object_metadata || coalesce(batch.source_object_shared_metadata, '{}'::jsonb),
    coalesce(batch.provenance_metadata, '{}'::jsonb),
    coalesce(sc.import_batch_id, sc.updated_at::text, sc.imported_at::text) as import_generation
  from runtime_caster_ids runtime
  join public.shadow_casters sc on sc.id = runtime.id
  left join public.shadow_caster_import_batches batch on batch.id = sc.import_batch_id
  order by sc.id, footprint_ewkb_hex;
$$;

create or replace function public.get_shadow_caster_hash_records_v2(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_meters double precision default 1500
)
returns table (
  id integer,
  footprint_ewkb_hex text,
  height_m numeric,
  ground_z_rh2000 numeric,
  roof_z_rh2000 numeric,
  source_priority integer,
  shadow_caster_tier text,
  filter_decision text,
  caster_class text,
  source_flags text[],
  import_generation text
)
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  with runtime_caster_ids as (
    select distinct (runtime."Id")::bigint as id
    from public.get_buildings_near_point(
      p_latitude,
      p_longitude,
      greatest(coalesce(p_radius_meters, 0), 0)
    ) as runtime
    where runtime."Id" is not null
  )
  select
    sc.id::integer as id,
    upper(encode(st_asewkb(st_normalize(st_force2d(sc.geometry)), 'XDR'), 'hex')) as footprint_ewkb_hex,
    sc.height_m,
    sc.ground_z_rh2000,
    sc.roof_z_rh2000,
    sc.source_priority,
    sc.shadow_caster_tier,
    sc.filter_decision,
    sc.caster_class,
    coalesce(sc.source_flags, array[]::text[]) as source_flags,
    coalesce(sc.import_batch_id, sc.updated_at::text, sc.imported_at::text) as import_generation
  from runtime_caster_ids runtime
  join public.shadow_casters sc on sc.id = runtime.id
  order by sc.id, footprint_ewkb_hex;
$$;

revoke all on function public.get_buildings_near_point(double precision, double precision, double precision)
  from public, anon, authenticated, service_role;
grant execute on function public.get_buildings_near_point(double precision, double precision, double precision)
  to service_role;

revoke all on function public.get_shadow_caster_hash_records(double precision, double precision, double precision)
  from public, anon, authenticated, service_role;
grant execute on function public.get_shadow_caster_hash_records(double precision, double precision, double precision)
  to service_role;

revoke all on function public.get_shadow_caster_hash_records_v2(double precision, double precision, double precision)
  from public, anon, authenticated, service_role;
grant execute on function public.get_shadow_caster_hash_records_v2(double precision, double precision, double precision)
  to service_role;

comment on function public.get_shadow_caster_hash_records(double precision, double precision, double precision) is
  'Compatibility g1 hash input that reconstructs legacy batch metadata without storing it on every caster row.';
comment on function public.get_shadow_caster_hash_records_v2(double precision, double precision, double precision) is
  'Lean g1 hash input containing only runtime-affecting caster fields; service-role only.';

alter table public.shadow_casters
  drop column source_collection_metadata,
  drop column source_update_metadata,
  drop column provenance_metadata,
  drop column z_semantics;

comment on column public.shadow_casters.source_object_metadata is
  'Row-specific source metadata only. Batch-constant keys live in shadow_caster_import_batches.';
