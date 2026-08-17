-- Story 12.3: persisted ungated sun geometry, weather snapshots, and run leases.

create or replace function public.is_valid_geometry_input_hash(value text)
returns boolean
language sql
immutable
as $$
  select value ~ '^g[0-9]+:[0-9a-f]{64}$';
$$;

create or replace function public.is_valid_sun_geometry_series(value jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  item jsonb;
  expected_count integer := ((1260 - 360) / 15) + 1;
  seen_minutes integer[] := '{}';
  minute_value integer;
  percent_value numeric;
begin
  if jsonb_typeof(value) <> 'array' or jsonb_array_length(value) <> expected_count then
    return false;
  end if;

  for item in select jsonb_array_elements(value)
  loop
    if jsonb_typeof(item) <> 'object'
       or item ? 'currentSunStatus'
       or item ? 'skyCondition'
       or item ? 'confidence'
       or not item ? 'minutes'
       or not item ? 'sunExposurePercent' then
      return false;
    end if;

    minute_value := (item ->> 'minutes')::integer;
    percent_value := (item ->> 'sunExposurePercent')::numeric;

    if minute_value < 360
       or minute_value > 1260
       or ((minute_value - 360) % 15) <> 0
       or percent_value < 0
       or percent_value > 100 then
      return false;
    end if;
    seen_minutes := array_append(seen_minutes, minute_value);
  end loop;

  return (
    select count(distinct minute)
    from unnest(seen_minutes) as minute
  ) = expected_count;
exception
  when others then
    return false;
end;
$$;

create table if not exists public.venue_geometry_inputs (
  venue_id text primary key references public.venues(id) on delete cascade,
  status text not null default 'dirty',
  current_geometry_input_hash text,
  pending_geometry_input_hash text,
  current_input jsonb,
  pending_input jsonb,
  dirty_reason text,
  building_run_id text,
  ready_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  constraint venue_geometry_inputs_status_check
    check (status in ('ready', 'building', 'dirty')),
  constraint venue_geometry_inputs_current_hash_check
    check (
      current_geometry_input_hash is null
      or public.is_valid_geometry_input_hash(current_geometry_input_hash)
    ),
  constraint venue_geometry_inputs_pending_hash_check
    check (
      pending_geometry_input_hash is null
      or public.is_valid_geometry_input_hash(pending_geometry_input_hash)
    ),
  constraint venue_geometry_inputs_ready_hash_check
    check (
      (status = 'ready' and current_geometry_input_hash is not null)
      or status <> 'ready'
    ),
  constraint venue_geometry_inputs_building_hash_check
    check (
      (status = 'building' and pending_geometry_input_hash is not null)
      or status <> 'building'
    )
);

create table if not exists public.venue_sun_geometry_series (
  venue_id text not null references public.venues(id) on delete cascade,
  stockholm_date date not null,
  geometry_input_hash text not null,
  series jsonb not null,
  input_payload jsonb,
  run_id text,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (venue_id, stockholm_date, geometry_input_hash),
  constraint venue_sun_geometry_hash_check
    check (public.is_valid_geometry_input_hash(geometry_input_hash)),
  constraint venue_sun_geometry_series_shape_check
    check (public.is_valid_sun_geometry_series(series))
);

create table if not exists public.geometry_precompute_runs (
  id text primary key,
  trigger_type text not null,
  status text not null default 'running',
  window_start date not null,
  window_end date not null,
  geometry_input_hash text,
  expected_venue_days integer not null default 0,
  written_venue_days integer not null default 0,
  reused_venue_days integer not null default 0,
  missing_venue_days integer not null default 0,
  stale_hash_venue_days integer not null default 0,
  failed_venue_days integer not null default 0,
  started_at timestamptz not null default clock_timestamp(),
  heartbeat_at timestamptz not null default clock_timestamp(),
  lease_expires_at timestamptz not null default clock_timestamp() + interval '15 minutes',
  finished_at timestamptz,
  duration_ms integer,
  failure_details jsonb not null default '[]'::jsonb,
  constraint geometry_precompute_runs_trigger_type_check
    check (trigger_type in ('scheduled', 'manual', 'ci', 'local')),
  constraint geometry_precompute_runs_status_check
    check (status in ('running', 'completed', 'failed', 'expired')),
  constraint geometry_precompute_runs_window_check
    check (window_end >= window_start),
  constraint geometry_precompute_runs_hash_check
    check (
      geometry_input_hash is null
      or public.is_valid_geometry_input_hash(geometry_input_hash)
    ),
  constraint geometry_precompute_runs_counter_check
    check (
      expected_venue_days >= 0
      and written_venue_days >= 0
      and reused_venue_days >= 0
      and missing_venue_days >= 0
      and stale_hash_venue_days >= 0
      and failed_venue_days >= 0
    ),
  constraint geometry_precompute_runs_finished_at_check
    check (
      (status = 'running' and finished_at is null)
      or (status <> 'running' and finished_at is not null)
    )
);

create unique index if not exists geometry_precompute_runs_one_running_idx
  on public.geometry_precompute_runs ((status))
  where status = 'running';

create index if not exists venue_geometry_inputs_current_hash_idx
  on public.venue_geometry_inputs (current_geometry_input_hash)
  where status = 'ready';

create index if not exists venue_sun_geometry_series_lookup_idx
  on public.venue_sun_geometry_series (stockholm_date, geometry_input_hash, venue_id);

create table if not exists public.weather_bucket_snapshots (
  coordinate_bucket text not null,
  stockholm_date date not null,
  bucket_key text not null,
  slices jsonb not null,
  weather_updated_at timestamptz,
  expires_at timestamptz not null,
  refreshed_at timestamptz not null default clock_timestamp(),
  run_id text,
  primary key (coordinate_bucket, stockholm_date, bucket_key),
  constraint weather_bucket_snapshots_bucket_check
    check (coordinate_bucket ~ '^-?[0-9]+[.][0-9]{4},-?[0-9]+[.][0-9]{4}$'),
  constraint weather_bucket_snapshots_slices_check
    check (jsonb_typeof(slices) = 'array'),
  constraint weather_bucket_snapshots_expiry_check
    check (expires_at > refreshed_at)
);

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
  select
    sc.id,
    upper(encode(st_asewkb(st_normalize(st_force2d(st_transform(sc.geometry, 4326))), 'XDR'), 'hex')) as footprint_ewkb_hex,
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
  from public.shadow_casters sc
  where sc.active = true
    and st_dwithin(
      st_transform(sc.geometry, 4326)::geography,
      st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography,
      greatest(0, p_radius_meters)
    )
  order by sc.id, footprint_ewkb_hex;
$$;

alter table public.venue_geometry_inputs enable row level security;
alter table public.venue_geometry_inputs force row level security;
alter table public.venue_sun_geometry_series enable row level security;
alter table public.venue_sun_geometry_series force row level security;
alter table public.geometry_precompute_runs enable row level security;
alter table public.geometry_precompute_runs force row level security;
alter table public.weather_bucket_snapshots enable row level security;
alter table public.weather_bucket_snapshots force row level security;

revoke all on table public.venue_geometry_inputs
  from public, anon, authenticated, service_role;
revoke all on table public.venue_sun_geometry_series
  from public, anon, authenticated, service_role;
revoke all on table public.geometry_precompute_runs
  from public, anon, authenticated, service_role;
revoke all on table public.weather_bucket_snapshots
  from public, anon, authenticated, service_role;

grant select, insert, update, delete on table public.venue_geometry_inputs to service_role;
grant select, insert, update, delete on table public.venue_sun_geometry_series to service_role;
grant select, insert, update, delete on table public.geometry_precompute_runs to service_role;
grant select, insert, update, delete on table public.weather_bucket_snapshots to service_role;

create or replace function public.claim_geometry_precompute_run(
  p_run_id text,
  p_trigger_type text,
  p_window_start date,
  p_window_end date,
  p_geometry_input_hash text,
  p_expected_venue_days integer,
  p_lease_seconds integer default 900
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  database_now timestamptz := clock_timestamp();
  inserted_id text;
begin
  update public.geometry_precompute_runs
     set status = 'expired',
         finished_at = database_now,
         duration_ms = greatest(0, floor(extract(epoch from database_now - started_at) * 1000)::integer)
   where status = 'running'
     and lease_expires_at <= database_now;

  perform pg_advisory_xact_lock(hashtext('sunnyseat:geometry-precompute-run'));

  if exists (
    select 1
      from public.geometry_precompute_runs
     where status = 'running'
       and lease_expires_at > database_now
     for update
  ) then
    return false;
  end if;

  insert into public.geometry_precompute_runs (
    id,
    trigger_type,
    status,
    window_start,
    window_end,
    geometry_input_hash,
    expected_venue_days,
    started_at,
    heartbeat_at,
    lease_expires_at
  )
  values (
    p_run_id,
    p_trigger_type,
    'running',
    p_window_start,
    p_window_end,
    p_geometry_input_hash,
    greatest(0, p_expected_venue_days),
    database_now,
    database_now,
    database_now + make_interval(secs => greatest(60, p_lease_seconds))
  )
  on conflict (id) do update
    set heartbeat_at = excluded.heartbeat_at,
        lease_expires_at = excluded.lease_expires_at
    where public.geometry_precompute_runs.id = p_run_id
      and public.geometry_precompute_runs.status = 'running'
      and public.geometry_precompute_runs.lease_expires_at > database_now
  returning id into inserted_id;

  return inserted_id = p_run_id;
end;
$$;

create or replace function public.heartbeat_geometry_precompute_run(
  p_run_id text,
  p_lease_seconds integer default 900
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  database_now timestamptz := clock_timestamp();
begin
  update public.geometry_precompute_runs
     set heartbeat_at = database_now,
         lease_expires_at = database_now + make_interval(secs => greatest(60, p_lease_seconds))
   where id = p_run_id
     and status = 'running'
     and lease_expires_at > database_now;
  return found;
end;
$$;

create or replace function public.mark_venue_geometry_dirty(
  p_venue_id text,
  p_reason text default 'out-of-band-input-change'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.venue_geometry_inputs as inputs (
    venue_id,
    status,
    dirty_reason,
    updated_at
  )
  values (
    p_venue_id,
    'dirty',
    left(coalesce(p_reason, 'out-of-band-input-change'), 200),
    clock_timestamp()
  )
  on conflict (venue_id) do update
    set status = 'dirty',
        dirty_reason = excluded.dirty_reason,
        pending_geometry_input_hash = null,
        pending_input = null,
        updated_at = excluded.updated_at;
  return true;
end;
$$;

create or replace function public.publish_venue_geometry_generation(
  p_run_id text,
  p_venue_id text,
  p_geometry_input_hash text,
  p_input_payload jsonb,
  p_series_by_date jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  database_now timestamptz := clock_timestamp();
  parent public.geometry_precompute_runs%rowtype;
  expected_date date;
  expected_date_count integer;
  date_key text;
  series_value jsonb;
begin
  if not public.is_valid_geometry_input_hash(p_geometry_input_hash) then
    raise exception 'Invalid geometry input hash';
  end if;

  select *
    into parent
    from public.geometry_precompute_runs
   where id = p_run_id
     and status = 'running'
     and lease_expires_at > database_now
   for update;

  if not found then
    return false;
  end if;

  if jsonb_typeof(p_series_by_date) <> 'object' then
    raise exception 'Geometry publish requires an object keyed by Stockholm date';
  end if;

  expected_date_count := parent.window_end - parent.window_start + 1;
  if (select count(*) from jsonb_object_keys(p_series_by_date)) <> expected_date_count then
    raise exception 'Geometry publish date count does not match run window';
  end if;

  for expected_date in
    select day::date
      from generate_series(parent.window_start, parent.window_end, interval '1 day') as day
  loop
    if not p_series_by_date ? expected_date::text then
      raise exception 'Missing geometry series for %', expected_date;
    end if;
  end loop;

  -- Atomic promotion: the input row enters building state, all date artifacts are
  -- upserted, then current hash flips to ready inside this single transaction.
  insert into public.venue_geometry_inputs as inputs (
    venue_id,
    status,
    pending_geometry_input_hash,
    pending_input,
    building_run_id,
    updated_at
  )
  values (
    p_venue_id,
    'building',
    p_geometry_input_hash,
    p_input_payload,
    p_run_id,
    database_now
  )
  on conflict (venue_id) do update
    set status = 'building',
        pending_geometry_input_hash = excluded.pending_geometry_input_hash,
        pending_input = excluded.pending_input,
        building_run_id = excluded.building_run_id,
        updated_at = excluded.updated_at;

  for date_key, series_value in
    select key, value
      from jsonb_each(p_series_by_date)
  loop
    if date_key::date < parent.window_start or date_key::date > parent.window_end then
      raise exception 'Geometry series date % is outside run window', date_key;
    end if;
    if not public.is_valid_sun_geometry_series(series_value) then
      raise exception 'Invalid geometry series for %', date_key;
    end if;
    insert into public.venue_sun_geometry_series as series (
      venue_id,
      stockholm_date,
      geometry_input_hash,
      series,
      input_payload,
      run_id,
      created_at,
      updated_at
    )
    values (
      p_venue_id,
      date_key::date,
      p_geometry_input_hash,
      series_value,
      p_input_payload,
      p_run_id,
      database_now,
      database_now
    )
    on conflict (venue_id, stockholm_date, geometry_input_hash) do update
      set series = excluded.series,
          input_payload = excluded.input_payload,
          run_id = excluded.run_id,
          updated_at = excluded.updated_at;
  end loop;

  update public.venue_geometry_inputs
     set status = 'ready',
         current_geometry_input_hash = p_geometry_input_hash,
         current_input = p_input_payload,
         pending_geometry_input_hash = null,
         pending_input = null,
         dirty_reason = null,
         ready_at = database_now,
         updated_at = database_now
   where venue_id = p_venue_id
     and status = 'building'
     and pending_geometry_input_hash = p_geometry_input_hash;

  return found;
end;
$$;

create or replace function public.finish_geometry_precompute_run(
  p_run_id text,
  p_written_venue_days integer,
  p_reused_venue_days integer,
  p_missing_venue_days integer,
  p_stale_hash_venue_days integer,
  p_failed_venue_days integer,
  p_failure_details jsonb default '[]'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  database_now timestamptz := clock_timestamp();
  parent public.geometry_precompute_runs%rowtype;
  terminal_status text;
begin
  select *
    into parent
    from public.geometry_precompute_runs
   where id = p_run_id
     and status = 'running'
   for update;

  if not found then
    return false;
  end if;

  terminal_status :=
    case
      when p_failed_venue_days = 0
       and p_missing_venue_days = 0
       and p_stale_hash_venue_days = 0
       and p_written_venue_days + p_reused_venue_days = parent.expected_venue_days
      then 'completed'
      else 'failed'
    end;

  update public.geometry_precompute_runs
     set status = terminal_status,
         written_venue_days = greatest(0, p_written_venue_days),
         reused_venue_days = greatest(0, p_reused_venue_days),
         missing_venue_days = greatest(0, p_missing_venue_days),
         stale_hash_venue_days = greatest(0, p_stale_hash_venue_days),
         failed_venue_days = greatest(0, p_failed_venue_days),
         failure_details = coalesce(p_failure_details, '[]'::jsonb),
         finished_at = database_now,
         heartbeat_at = database_now,
         duration_ms = greatest(0, floor(extract(epoch from database_now - started_at) * 1000)::integer)
   where id = p_run_id;

  return true;
end;
$$;

create or replace function public.fail_geometry_precompute_run(
  p_run_id text,
  p_failure_details jsonb default '[]'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  database_now timestamptz := clock_timestamp();
begin
  update public.geometry_precompute_runs
     set status = 'failed',
         failure_details = coalesce(p_failure_details, '[]'::jsonb),
         finished_at = database_now,
         heartbeat_at = database_now,
         duration_ms = greatest(0, floor(extract(epoch from database_now - started_at) * 1000)::integer)
   where id = p_run_id
     and status = 'running';
  return found;
end;
$$;

alter function public.is_valid_geometry_input_hash(text) security definer;
alter function public.is_valid_sun_geometry_series(jsonb) security definer;
alter function public.get_shadow_caster_hash_records(double precision, double precision, double precision) security definer;
alter function public.claim_geometry_precompute_run(text, text, date, date, text, integer, integer) security definer;
alter function public.heartbeat_geometry_precompute_run(text, integer) security definer;
alter function public.mark_venue_geometry_dirty(text, text) security definer;
alter function public.publish_venue_geometry_generation(text, text, text, jsonb, jsonb) security definer;
alter function public.finish_geometry_precompute_run(text, integer, integer, integer, integer, integer, jsonb) security definer;
alter function public.fail_geometry_precompute_run(text, jsonb) security definer;

revoke all on function public.is_valid_geometry_input_hash(text)
  from public, anon, authenticated, service_role;
revoke all on function public.is_valid_sun_geometry_series(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.get_shadow_caster_hash_records(double precision, double precision, double precision)
  from public, anon, authenticated, service_role;
revoke all on function public.claim_geometry_precompute_run(text, text, date, date, text, integer, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.heartbeat_geometry_precompute_run(text, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.mark_venue_geometry_dirty(text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.publish_venue_geometry_generation(text, text, text, jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.finish_geometry_precompute_run(text, integer, integer, integer, integer, integer, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.fail_geometry_precompute_run(text, jsonb)
  from public, anon, authenticated, service_role;

grant execute on function public.is_valid_geometry_input_hash(text) to service_role;
grant execute on function public.is_valid_sun_geometry_series(jsonb) to service_role;
grant execute on function public.get_shadow_caster_hash_records(double precision, double precision, double precision) to service_role;
grant execute on function public.claim_geometry_precompute_run(text, text, date, date, text, integer, integer) to service_role;
grant execute on function public.heartbeat_geometry_precompute_run(text, integer) to service_role;
grant execute on function public.mark_venue_geometry_dirty(text, text) to service_role;
grant execute on function public.publish_venue_geometry_generation(text, text, text, jsonb, jsonb) to service_role;
grant execute on function public.finish_geometry_precompute_run(text, integer, integer, integer, integer, integer, jsonb) to service_role;
grant execute on function public.fail_geometry_precompute_run(text, jsonb) to service_role;

comment on table public.venue_sun_geometry_series is
  'Story 12.3 service-only persisted ungated planner-step geometry, keyed by venue/date/geometry_input_hash.';
comment on table public.weather_bucket_snapshots is
  'Story 12.3 service-only weather snapshots for cheap read-time gating; public requests never fan out to Met.no.';
comment on function public.get_shadow_caster_hash_records(double precision, double precision, double precision) is
  'Returns the canonical runtime shadow-caster hash input: 2D normalized SRID 4326 XDR EWKB plus z/import/filter fields.';
comment on function public.publish_venue_geometry_generation(text, text, text, jsonb, jsonb) is
  'Atomically stages artifacts and promotes the ready current geometry hash only after every supplied date series is valid.';
