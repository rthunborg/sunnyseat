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
set search_path = public
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
    sc.source_object_metadata,
    sc.provenance_metadata,
    coalesce(sc.import_batch_id, sc.updated_at::text, sc.imported_at::text) as import_generation
  from runtime_caster_ids runtime
  join public.shadow_casters sc on sc.id = runtime.id
  order by sc.id, footprint_ewkb_hex;
$$;

alter function public.get_shadow_caster_hash_records(double precision, double precision, double precision) security definer;

revoke all on function public.get_shadow_caster_hash_records(double precision, double precision, double precision)
  from public, anon, authenticated, service_role;

grant execute on function public.get_shadow_caster_hash_records(double precision, double precision, double precision) to service_role;

comment on function public.get_shadow_caster_hash_records(double precision, double precision, double precision) is
  'Returns the canonical runtime shadow-caster hash input from the same eligible/deduplicated caster set as get_buildings_near_point: 2D normalized SRID 4326 XDR EWKB plus z/import/filter fields.';
