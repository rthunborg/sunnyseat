-- Story 12.3 protected closeout: collapse the public list geometry read from
-- per-venue REST fan-out into one MVCC-consistent, service-only lookup.

create or replace function public.read_current_venue_sun_geometry_batch(
  p_venue_ids text[],
  p_stockholm_date date
)
returns table (
  venue_id text,
  input_status text,
  current_geometry_input_hash text,
  coverage_stockholm_date date,
  coverage_geometry_input_hash text,
  series jsonb
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with requested as (
    select
      requested_value.venue_id,
      min(requested_value.position) as position
    from unnest(coalesce(p_venue_ids, array[]::text[]))
      with ordinality as requested_value(venue_id, position)
    where requested_value.venue_id is not null
    group by requested_value.venue_id
  )
  select
    requested.venue_id,
    inputs.status as input_status,
    inputs.current_geometry_input_hash,
    coverage.stockholm_date as coverage_stockholm_date,
    coverage.geometry_input_hash as coverage_geometry_input_hash,
    coverage.series
  from requested
  left join public.venue_geometry_inputs as inputs
    on inputs.venue_id = requested.venue_id
  left join public.venue_sun_geometry_series as coverage
    on coverage.venue_id = inputs.venue_id
   and coverage.stockholm_date = p_stockholm_date
   and coverage.geometry_input_hash = inputs.current_geometry_input_hash
  order by requested.position;
$$;

revoke all on function public.read_current_venue_sun_geometry_batch(text[], date)
  from public, anon, authenticated;
grant execute on function public.read_current_venue_sun_geometry_batch(text[], date)
  to service_role;

comment on function public.read_current_venue_sun_geometry_batch(text[], date) is
  'Service-only atomic read of each requested venue current geometry input and exact date/hash series.';
