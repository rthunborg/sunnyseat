-- Story 15.2. Additive, service-only contract; no public reader/worker wiring.
-- Apply transactionally. Existing rolling tables/RPCs and feedback are untouched.
begin;
create schema if not exists sun_geometry_internal;
revoke all on schema sun_geometry_internal from public, anon, authenticated;
grant usage on schema sun_geometry_internal to service_role;

create or replace function sun_geometry_internal.sha(value text) returns text
language sql immutable strict set search_path = pg_catalog as $$
  select encode(sha256(convert_to(value, 'UTF8')), 'hex');
$$;
create or replace function sun_geometry_internal.f64_hex(values_ double precision[]) returns text
language sql immutable strict set search_path = pg_catalog as $$
  select coalesce(string_agg(encode(float8send(case when v = 0 then 0::float8 else v end), 'hex'), '' order by n), '')
  from unnest(values_) with ordinality as a(v,n);
$$;
-- ECMAScript shortest-roundtrip decimal, expanded without an exponent. PostgreSQL
-- float8out deliberately avoids midpoint literals (1e23 is one), so it cannot be
-- used as the JS canonical spelling. Work with exact integer decimal rationals,
-- trying shortest significands first, nearest value then even significand on ties.
create or replace function sun_geometry_internal.canonical_float64(value_ numeric) returns text
language plpgsql immutable strict set search_path = pg_catalog as $$
declare f float8; bytes_ bytea; exponent_ integer; shift_ integer; mantissa_ numeric;
  numerator_ numeric; scale_ integer:=0; base_ numeric; power_ numeric:=1; remaining_ integer;
  magnitude_ integer; digits_ integer; q integer; denominator_ numeric; scaled_numerator_ numeric; floor_ numeric;
  coefficient_ numeric; candidate_ text; coefficient_text text; decimal_index integer;
  sign_ text:=''; candidate_float float8; i integer;
begin
  begin f:=value_::float8;
  exception when numeric_value_out_of_range then raise exception 'Number outside finite Float64 domain'; end;
  if f in ('NaN'::float8,'Infinity'::float8,'-Infinity'::float8) then raise exception 'Number outside finite Float64 domain'; end if;
  if f=0 then return '0'; end if;
  if value_=trunc(value_) and abs(value_)<=9007199254740991 then return trim_scale(value_)::text; end if;
  if f<0 then sign_:='-'; end if;
  bytes_:=float8send(abs(f));
  exponent_:=(get_byte(bytes_,0)%128)*16+get_byte(bytes_,1)/16;
  mantissa_:=(get_byte(bytes_,1)%16)::numeric;
  for i in 2..7 loop mantissa_:=mantissa_*256+get_byte(bytes_,i); end loop;
  if exponent_=0 then shift_:=-1074;
  else mantissa_:=mantissa_+4503599627370496; shift_:=exponent_-1075; end if;
  if shift_<0 then base_:=5; scale_:=-shift_; else base_:=2; end if;
  remaining_:=abs(shift_);
  while remaining_>0 loop
    if remaining_%2=1 then power_:=power_*base_; end if;
    remaining_:=remaining_/2;
    if remaining_>0 then base_:=base_*base_; end if;
  end loop;
  numerator_:=mantissa_*power_;
  magnitude_:=length(numerator_::text)-1-scale_;
  for digits_ in 1..17 loop
    q:=magnitude_-digits_+1;
    denominator_:=('1'||repeat('0',greatest(scale_+q,0)))::numeric;
    scaled_numerator_:=numerator_*('1'||repeat('0',greatest(-scale_-q,0)))::numeric;
    floor_:=div(scaled_numerator_,denominator_);
    -- Both neighbours are considered because the Float64 rounding interval can
    -- be asymmetric at powers of two. Distance comparison is exact, not float8.
    for coefficient_ in select c from (values(floor_),(floor_+1)) candidates(c)
      order by abs(c*denominator_-scaled_numerator_),mod(c,2) loop
      if coefficient_<=0 then continue; end if;
      coefficient_text:=trim_scale(coefficient_)::text;
      if length(rtrim(coefficient_text,'0'))>digits_ then continue; end if;
      decimal_index:=length(coefficient_text)+q;
      if q>=0 then candidate_:=coefficient_text||repeat('0',q);
      elsif decimal_index>0 then candidate_:=left(coefficient_text,decimal_index)||'.'||substr(coefficient_text,decimal_index+1);
      else candidate_:='0.'||repeat('0',-decimal_index)||coefficient_text; end if;
      if strpos(candidate_,'.')>0 then candidate_:=rtrim(rtrim(candidate_,'0'),'.'); end if;
      begin candidate_float:=candidate_::float8;
      exception when numeric_value_out_of_range then continue; end;
      if candidate_float=abs(f) then return sign_||candidate_; end if;
    end loop;
  end loop;
  raise exception 'Cannot canonicalize Float64';
end;
$$;
create or replace function sun_geometry_internal.canonical_json(value_ jsonb) returns text
language plpgsql immutable strict set search_path = pg_catalog, sun_geometry_internal as $$
declare kind_ text:=jsonb_typeof(value_); result_ text;
begin
  if kind_='object' then
    select '{'||coalesce(string_agg(to_jsonb(e.key)::text||':'||sun_geometry_internal.canonical_json(e.value),',' order by e.key collate "C"),'')||'}'
      into result_ from jsonb_each(value_) e;
    return result_;
  elsif kind_='array' then
    select '['||coalesce(string_agg(sun_geometry_internal.canonical_json(e.value),',' order by e.n),'')||']'
      into result_ from jsonb_array_elements(value_) with ordinality e(value,n);
    return result_;
  elsif kind_='number' then
    return sun_geometry_internal.canonical_float64((value_#>>'{}')::numeric);
  end if;
  return value_::text;
end;
$$;
create or replace function sun_geometry_internal.least_rotation_start(keys_ text[]) returns integer
language plpgsql immutable strict set search_path = pg_catalog as $$
declare n integer:=cardinality(keys_); i integer:=1; j integer:=2; k integer:=0; left_ text; right_ text;
begin
  if n is null or n<1 then raise exception 'Empty canonical ring'; end if;
  while i<=n and j<=n and k<n loop
    left_:=keys_[((i+k-1)%n)+1]; right_:=keys_[((j+k-1)%n)+1];
    if (left_ collate "C")=(right_ collate "C") then k:=k+1;
    elsif (left_ collate "C")>(right_ collate "C") then
      i:=i+k+1; if i<=j then i:=j+1; end if; k:=0;
    else
      j:=j+k+1; if j<=i then j:=i+1; end if; k:=0;
    end if;
  end loop;
  return least(i,j);
end;
$$;
create or replace function sun_geometry_internal.canonical_ring(ring_ jsonb) returns text
language plpgsql immutable strict set search_path = pg_catalog, sun_geometry_internal as $$
declare n integer:=jsonb_array_length(ring_)-1; forward_ text[]; reverse_ text[];
  forward_start integer; reverse_start integer; forward_text text; reverse_text text;
begin
  select array_agg(sun_geometry_internal.canonical_json(point.value) order by point.ordinality)
    into forward_ from jsonb_array_elements(ring_) with ordinality point(value,ordinality) where point.ordinality<=n;
  select array_agg(sun_geometry_internal.canonical_json(point.value) order by point.ordinality desc)
    into reverse_ from jsonb_array_elements(ring_) with ordinality point(value,ordinality) where point.ordinality<=n;
  forward_start:=sun_geometry_internal.least_rotation_start(forward_);
  reverse_start:=sun_geometry_internal.least_rotation_start(reverse_);
  select '['||string_agg(forward_[((forward_start+i-2)%n)+1],',' order by i)||','||forward_[forward_start]||']'
    into forward_text from generate_series(1,n) i;
  select '['||string_agg(reverse_[((reverse_start+i-2)%n)+1],',' order by i)||','||reverse_[reverse_start]||']'
    into reverse_text from generate_series(1,n) i;
  if (forward_text collate "C")<=(reverse_text collate "C") then return forward_text; end if;
  return reverse_text;
end;
$$;
create or replace function sun_geometry_internal.canonical_polygon(value_ jsonb) returns text
language plpgsql immutable strict set search_path = pg_catalog, sun_geometry_internal as $$
declare shell_ text; holes_ text;
begin
  select sun_geometry_internal.canonical_ring(ring.value) into shell_
    from jsonb_array_elements(value_->'coordinates') with ordinality ring(value,ordinality) where ring.ordinality=1;
  select string_agg(ring_text,',' order by ring_text collate "C") into holes_
    from (select sun_geometry_internal.canonical_ring(ring.value) ring_text
      from jsonb_array_elements(value_->'coordinates') with ordinality ring(value,ordinality) where ring.ordinality>1) rings;
  return '{"coordinates":['||shell_||case when holes_ is null then '' else ','||holes_ end||'],"type":"Polygon"}';
end;
$$;
create or replace function sun_geometry_internal.assert_exact_keys(value_ jsonb, expected_ text[], label_ text) returns void
language plpgsql immutable strict set search_path = pg_catalog as $$
begin
  if jsonb_typeof(value_)<>'object' or not value_ ?& expected_
    or (select count(*) from jsonb_object_keys(value_))<>cardinality(expected_) then
    raise exception '% has missing or unknown fields',label_;
  end if;
end;
$$;
create or replace function sun_geometry_internal.assert_polygon(value_ jsonb) returns integer
language plpgsql immutable strict set search_path = pg_catalog, public, sun_geometry_internal as $$
declare ring_ jsonb; point_ jsonb; count_ integer:=0;
begin
  perform sun_geometry_internal.assert_exact_keys(value_,array['type','coordinates'],'Polygon');
  if value_->>'type'<>'Polygon' or jsonb_typeof(value_->'coordinates')<>'array'
    or jsonb_array_length(value_->'coordinates') not between 1 and 128 then raise exception 'Invalid Polygon'; end if;
  for ring_ in select value from jsonb_array_elements(value_->'coordinates') loop
    if jsonb_typeof(ring_)<>'array' or jsonb_array_length(ring_) not between 4 and 2048
      or ring_->0 is distinct from ring_->(jsonb_array_length(ring_)-1) then raise exception 'Invalid Polygon ring'; end if;
    for point_ in select value from jsonb_array_elements(ring_) loop
      if jsonb_typeof(point_)<>'array' or jsonb_array_length(point_)<>2
        or jsonb_typeof(point_->0)<>'number' or jsonb_typeof(point_->1)<>'number'
        or (point_->>0)::numeric not between -180 and 180 or (point_->>1)::numeric not between -90 and 90 then raise exception 'Invalid Polygon position'; end if;
    end loop;
    count_:=count_+jsonb_array_length(ring_);
  end loop;
  if not public.st_isvalid(public.st_geomfromgeojson(value_::text)) then raise exception 'Invalid Polygon topology'; end if;
  if sun_geometry_internal.canonical_json(value_) is distinct from sun_geometry_internal.canonical_polygon(value_) then
    raise exception 'G2 input is not normalized';
  end if;
  return count_;
exception when others then
  if sqlerrm like 'Invalid Polygon%' or sqlerrm='G2 input is not normalized' then raise; end if;
  raise exception 'Invalid Polygon topology';
end;
$$;
create or replace function sun_geometry_internal.assert_engine_manifest(value_ jsonb) returns void
language plpgsql immutable strict set search_path = pg_catalog, sun_geometry_internal as $$
declare key_ text; item_ jsonb; map_count_ integer; total_map_count_ integer:=0;
begin
  perform sun_geometry_internal.assert_exact_keys(value_,array[
    'canonicalization','coordinateDerivation','selectionAlgorithm','solarAlgorithm','refractionAlgorithm','shadowAlgorithm',
    'horizonVersion','samplingVersion','decoderVersion','searchRadiusM','maxShadowDistanceM','minimumHeightM',
    'supportedElevationDegrees','baseStepMs','probeStepMs','proximityPercent','thresholdPercent','crossingBracketMs',
    'horizonRootMs','minimumWindowMs','maxEvaluations','solarConstants','shadowConstants','numericalDependencies'],'Engine manifest');
  foreach key_ in array array['canonicalization','coordinateDerivation','selectionAlgorithm','solarAlgorithm','refractionAlgorithm','shadowAlgorithm','horizonVersion','samplingVersion','decoderVersion'] loop
    if jsonb_typeof(value_->key_)<>'string' or length(value_->>key_) not between 1 and 256 then raise exception 'Invalid engine manifest string'; end if;
  end loop;
  foreach key_ in array array['searchRadiusM','maxShadowDistanceM','minimumHeightM','supportedElevationDegrees','baseStepMs','probeStepMs','proximityPercent','thresholdPercent','crossingBracketMs','horizonRootMs','minimumWindowMs','maxEvaluations'] loop
    if jsonb_typeof(value_->key_)<>'number' then raise exception 'Invalid engine manifest number'; end if;
  end loop;
  if (value_->>'searchRadiusM')::numeric<=0
    or (value_->>'maxShadowDistanceM')::numeric<=0
    or (value_->>'minimumHeightM')::numeric<0
    or (value_->>'baseStepMs')::numeric<=0
    or (value_->>'probeStepMs')::numeric<=0
    or (value_->>'proximityPercent')::numeric<0
    or (value_->>'thresholdPercent')::numeric not between 0 and 100
    or (value_->>'crossingBracketMs')::numeric<=0
    or (value_->>'horizonRootMs')::numeric<=0
    or (value_->>'minimumWindowMs')::numeric<=0
    or (value_->>'maxEvaluations')::numeric<=0
    or mod((value_->>'maxEvaluations')::numeric,1)<>0 then
    raise exception 'Invalid engine manifest range';
  end if;
  foreach key_ in array array['solarConstants','shadowConstants','numericalDependencies'] loop
    if jsonb_typeof(value_->key_)<>'object' then raise exception 'Invalid engine manifest map'; end if;
    select count(*) into map_count_ from jsonb_object_keys(value_->key_);
    if map_count_ not between 1 and 128 then raise exception 'Invalid engine manifest map size'; end if;
    total_map_count_:=total_map_count_+map_count_;
    -- TypeScript record parsing omits __proto__; reject it before identity binding.
    if exists(select 1 from jsonb_object_keys(value_->key_) map_key where map_key='__proto__' or length(map_key) not between 1 and 256) then
      raise exception 'Invalid engine manifest map key';
    end if;
  end loop;
  if total_map_count_>256 then raise exception 'Invalid aggregate engine manifest map size'; end if;
  for item_ in select value from jsonb_each(value_->'solarConstants') union all select value from jsonb_each(value_->'shadowConstants') loop
    if jsonb_typeof(item_)<>'number' then raise exception 'Invalid engine numeric constant'; end if;
  end loop;
  if not (value_->'numericalDependencies' ?& array['turf','polyclip','node','robust-predicates'])
    or exists(select 1 from jsonb_each(value_->'numericalDependencies') where jsonb_typeof(value)<>'string' or length(value#>>'{}') not between 1 and 256) then
    raise exception 'Required numerical dependency missing or malformed';
  end if;
end;
$$;

-- Previously retained g2 evidence bound the full package lock but predated the
-- direct robust-predicates manifest entry. Replay may validate that immutable
-- identity without making the legacy omission admissible for any new row.
create or replace function sun_geometry_internal.assert_engine_manifest_replay(value_ jsonb) returns void
language plpgsql immutable strict set search_path = pg_catalog, sun_geometry_internal as $$
begin
  if value_->'numericalDependencies' ? 'robust-predicates' then
    perform sun_geometry_internal.assert_engine_manifest(value_);
  elsif value_->'numericalDependencies'->>'lockfile' = 'b7b502955649c3850d539850ee4a47bcf7300d76527c2b6445e062b97ca7eb09' then
    perform sun_geometry_internal.assert_engine_manifest(
      jsonb_set(value_,array['numericalDependencies','robust-predicates'],to_jsonb('2.0.4'::text),true)
    );
  else
    raise exception 'Required numerical dependency missing or malformed';
  end if;
end;
$$;

create table if not exists public.sun_geometry_engine_versions (
  id text primary key check (id ~ '^[0-9a-f]{64}$'),
  canonical_manifest text not null,
  check (id = sun_geometry_internal.sha(canonical_manifest)),
  check (jsonb_typeof(canonical_manifest::jsonb) = 'object'),
  check (canonical_manifest = sun_geometry_internal.canonical_json(canonical_manifest::jsonb)),
  check (((canonical_manifest::jsonb)->>'decoderVersion' = 'f64-v1'
    and (canonical_manifest::jsonb)->>'horizonVersion' = 'solar-centre-refracted-5deg-v1'
    and (canonical_manifest::jsonb)->>'canonicalization' = 'g2-jcs-rings-v1') is true)
);
create table if not exists public.sun_geometry_inputs (
  input_hash text primary key check (input_hash ~ '^g2:[0-9a-f]{64}$'),
  engine_id text not null references public.sun_geometry_engine_versions(id),
  canonical_input text not null,
  check (input_hash = 'g2:' || sun_geometry_internal.sha(canonical_input)),
  check (jsonb_typeof(canonical_input::jsonb) = 'object'),
  check (canonical_input = sun_geometry_internal.canonical_json(canonical_input::jsonb))
);
-- Give canonical-text checks stable identities, then remove equivalent unnamed
-- checks left by clean CREATE or earlier additive revisions below.
alter table public.sun_geometry_engine_versions drop constraint if exists sun_geometry_manifest_canonical;
alter table public.sun_geometry_engine_versions add constraint sun_geometry_manifest_canonical
  check (canonical_manifest = sun_geometry_internal.canonical_json(canonical_manifest::jsonb));
alter table public.sun_geometry_inputs drop constraint if exists sun_geometry_input_canonical;
alter table public.sun_geometry_inputs add constraint sun_geometry_input_canonical
  check (canonical_input = sun_geometry_internal.canonical_json(canonical_input::jsonb));
-- Identity can describe future policies, but this decoder/storage contract only
-- admits the accepted horizon, threshold and sampling family.
do $$ begin
  alter table public.sun_geometry_engine_versions drop constraint if exists sun_geometry_accepted_policy;
  alter table public.sun_geometry_engine_versions drop constraint if exists sun_geometry_accepted_policy_v2;
  alter table public.sun_geometry_engine_versions add constraint sun_geometry_accepted_policy_v2 check ((
    canonical_manifest::jsonb @> '{"supportedElevationDegrees":5,"thresholdPercent":50,"baseStepMs":300000,"probeStepMs":60000,"proximityPercent":5,"minimumWindowMs":300000,"maxEvaluations":20000}'::jsonb
    and jsonb_typeof(canonical_manifest::jsonb->'crossingBracketMs')='number'
    and (canonical_manifest::jsonb->>'crossingBracketMs')::numeric>0
    and (canonical_manifest::jsonb->>'crossingBracketMs')::numeric<=100
    and jsonb_typeof(canonical_manifest::jsonb->'horizonRootMs')='number'
    and (canonical_manifest::jsonb->>'horizonRootMs')::numeric>0
    and (canonical_manifest::jsonb->>'horizonRootMs')::numeric<=10000
  ) is true);
end $$;
create table if not exists public.sun_geometry_seasons (
  season_year integer not null check (season_year between 2000 and 9998),
  start_date date not null, end_date date not null,
  timezone text not null default 'Europe/Stockholm' check (timezone = 'Europe/Stockholm'),
  engine_id text not null references public.sun_geometry_engine_versions(id),
  format_version text not null default 'f64-v1' check (format_version = 'f64-v1'),
  hash_version text not null default 'g2' check (hash_version = 'g2'),
  created_at timestamptz not null default clock_timestamp(),
  supported_elevation_degrees double precision not null default 5,
  base_step_ms integer not null default 300000,
  probe_step_ms integer not null default 60000,
  crossing_bracket_ms double precision not null default 100,
  status text not null default 'building',
  expected_venues integer not null default 0,
  expected_days integer not null default 245,
  verified_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  checksum text,
  release_notes text,
  check (start_date = make_date(season_year,3,1) and end_date = make_date(season_year,10,31)),
  check (supported_elevation_degrees=5 and base_step_ms=300000 and probe_step_ms=60000 and crossing_bracket_ms>0 and crossing_bracket_ms<=100),
  check (status in ('building','verified','current','retired') and expected_venues>=0 and expected_days=245),
  check (checksum is null or checksum ~ '^[0-9a-f]{64}$'),
  check (release_notes is null or (length(release_notes) between 1 and 4096 and release_notes ~ '\S')),
  primary key (season_year,engine_id)
);
-- Independent committed/staged identities. No FK to live venues: historical
-- generations and attribution must survive deletion of a venue.
create table if not exists public.sun_geometry_input_revisions (
  venue_id text primary key check (venue_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'),
  revision bigint not null default 1 check (revision > 0),
  committed_hash text references public.sun_geometry_inputs(input_hash),
  staged_hash text references public.sun_geometry_inputs(input_hash),
  dirty boolean not null default true,
  updated_at timestamptz not null default clock_timestamp(),
  check (dirty or committed_hash is not null)
);
create table if not exists public.sun_geometry_venue_generations (
  id text primary key check (id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'), season_year integer not null,
  engine_id text not null,
  venue_id text not null references public.sun_geometry_input_revisions(venue_id),
  input_hash text not null references public.sun_geometry_inputs(input_hash),
  source_revision bigint not null check (source_revision > 0),
  format_version text not null default 'f64-v1' check (format_version = 'f64-v1'),
  run_id text not null check (run_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  status text not null default 'building' check (status in ('building','ready','retired','failed')),
  expected_days integer not null default 245 check (expected_days = 245),
  completed_days integer not null default 0 check (completed_days between 0 and 245),
  sample_count bigint not null default 0 check (sample_count >= 0),
  checksum text check (checksum ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default clock_timestamp(), verified_at timestamptz,
  check (status <> 'ready' or (completed_days = 245 and checksum is not null and verified_at is not null)),
  check (status not in ('building','failed') or (checksum is null and verified_at is null))
);
create unique index if not exists sun_geometry_ready_generation_key
  on public.sun_geometry_venue_generations(season_year,venue_id,input_hash,format_version) where status = 'ready';
create unique index if not exists sun_geometry_build_generation_key
  on public.sun_geometry_venue_generations(season_year,venue_id,input_hash,format_version) where status = 'building';

-- The release verifier represents revisions as JavaScript safe integers. Apply
-- named constraints on replay as well as fresh creation; overflow must abort the
-- entire input-change transaction, never publish a rounded revision identity.
alter table public.sun_geometry_input_revisions drop constraint if exists sun_geometry_safe_revision;
alter table public.sun_geometry_input_revisions add constraint sun_geometry_safe_revision
  check (revision between 1 and 9007199254740991);
alter table public.sun_geometry_venue_generations drop constraint if exists sun_geometry_safe_source_revision;
alter table public.sun_geometry_venue_generations add constraint sun_geometry_safe_source_revision
  check (source_revision between 1 and 9007199254740991);

create table if not exists public.sun_geometry_days (
  generation_id text not null references public.sun_geometry_venue_generations(id),
  stockholm_date date not null,
  horizon double precision[], offsets double precision[] not null, exposure double precision[] not null,
  starts double precision[] not null, ends double precision[] not null, sunny boolean[] not null,
  start_uncertainty_ms double precision[] not null, end_uncertainty_ms double precision[] not null,
  sample_count integer not null check (sample_count between 0 and 20000),
  checksum text not null check (checksum ~ '^[0-9a-f]{64}$'),
  primary key (generation_id,stockholm_date)
);
create table if not exists public.sun_geometry_releases (
  id text primary key check (id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'), season_year integer not null,
  engine_id text not null,
  status text not null default 'building' check (status in ('building','verified','current','retired')),
  expected_venues integer not null check (expected_venues > 0),
  completed_venues integer not null default 0 check (completed_venues >= 0),
  expected_days integer generated always as (expected_venues * 245) stored not null,
  completed_days integer not null default 0 check (completed_days >= 0),
  sample_count bigint not null default 0 check (sample_count >= 0),
  validation_digest text check (validation_digest ~ '^[0-9a-f]{64}$'),
  checksum text check (checksum ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default clock_timestamp(), verified_at timestamptz,
  check (status = 'building' or (checksum is not null and completed_venues = expected_venues and completed_days = expected_days and verified_at is not null and validation_digest is not null)),
  check (status <> 'building' or (checksum is null and verified_at is null and validation_digest is null))
);
create table if not exists public.sun_geometry_release_members (
  release_id text not null references public.sun_geometry_releases(id),
  venue_id text not null references public.sun_geometry_input_revisions(venue_id),
  generation_id text not null references public.sun_geometry_venue_generations(id),
  primary key (release_id,venue_id)
);
create index if not exists sun_geometry_member_generation_idx on public.sun_geometry_release_members(generation_id);
create table if not exists public.sun_geometry_current_pointers (
  season_year integer primary key,
  release_id text not null references public.sun_geometry_releases(id),
  rollback_release_id text not null references public.sun_geometry_releases(id),
  updated_at timestamptz not null default clock_timestamp(),
  constraint sun_geometry_pointer_distinct_rollback check (rollback_release_id <> release_id)
);
alter table public.sun_geometry_seasons add column if not exists supported_elevation_degrees double precision not null default 5;
alter table public.sun_geometry_seasons add column if not exists base_step_ms integer not null default 300000;
alter table public.sun_geometry_seasons add column if not exists probe_step_ms integer not null default 60000;
alter table public.sun_geometry_seasons add column if not exists crossing_bracket_ms double precision not null default 100;
alter table public.sun_geometry_seasons add column if not exists status text not null default 'building';
alter table public.sun_geometry_seasons add column if not exists expected_venues integer not null default 0;
alter table public.sun_geometry_seasons add column if not exists expected_days integer not null default 245;
alter table public.sun_geometry_seasons add column if not exists verified_at timestamptz;
alter table public.sun_geometry_seasons add column if not exists updated_at timestamptz not null default clock_timestamp();
alter table public.sun_geometry_seasons add column if not exists checksum text;
alter table public.sun_geometry_seasons add column if not exists release_notes text;
alter table public.sun_geometry_seasons drop constraint if exists sun_geometry_season_policy;
alter table public.sun_geometry_seasons add constraint sun_geometry_season_policy check
  (supported_elevation_degrees=5 and base_step_ms=300000 and probe_step_ms=60000 and crossing_bracket_ms>0 and crossing_bracket_ms<=100);
alter table public.sun_geometry_seasons drop constraint if exists sun_geometry_season_lifecycle;
alter table public.sun_geometry_seasons add constraint sun_geometry_season_lifecycle check
  (status in ('building','verified','current','retired') and expected_venues>=0 and expected_days=245);
alter table public.sun_geometry_seasons drop constraint if exists sun_geometry_season_checksum;
alter table public.sun_geometry_seasons add constraint sun_geometry_season_checksum check (checksum is null or checksum ~ '^[0-9a-f]{64}$');
alter table public.sun_geometry_seasons drop constraint if exists sun_geometry_season_release_notes;
alter table public.sun_geometry_seasons add constraint sun_geometry_season_release_notes check
  (release_notes is null or (length(release_notes) between 1 and 4096 and release_notes ~ '\S'));
do $$ declare target_ record; duplicate_ record; begin
  for target_ in
    select c.conrelid,c.conname,pg_get_constraintdef(c.oid,true) definition
    from pg_constraint c where (c.conrelid,c.conname) in (
      ('public.sun_geometry_engine_versions'::regclass,'sun_geometry_manifest_canonical'),
      ('public.sun_geometry_inputs'::regclass,'sun_geometry_input_canonical'),
      ('public.sun_geometry_seasons'::regclass,'sun_geometry_season_policy'),
      ('public.sun_geometry_seasons'::regclass,'sun_geometry_season_lifecycle'),
      ('public.sun_geometry_seasons'::regclass,'sun_geometry_season_checksum')
    )
  loop
    for duplicate_ in select conname from pg_constraint
      where conrelid=target_.conrelid and contype='c' and conname<>target_.conname
        and pg_get_constraintdef(oid,true)=target_.definition
    loop
      execute format('alter table %s drop constraint %I',target_.conrelid::regclass,duplicate_.conname);
    end loop;
  end loop;
end $$;
alter table public.sun_geometry_current_pointers alter column rollback_release_id set not null;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.sun_geometry_current_pointers'::regclass and conname='sun_geometry_pointer_distinct_rollback') then
    alter table public.sun_geometry_current_pointers add constraint sun_geometry_pointer_distinct_rollback check (rollback_release_id <> release_id);
  end if;
end $$;
alter table public.sun_geometry_releases add column if not exists expected_days integer generated always as (expected_venues * 245) stored;
alter table public.sun_geometry_releases alter column expected_days set not null;
alter table public.sun_geometry_releases add column if not exists completed_days integer not null default 0;
alter table public.sun_geometry_releases add column if not exists sample_count bigint not null default 0;
alter table public.sun_geometry_releases add column if not exists validation_digest text;
drop trigger if exists geometry_release_check on public.sun_geometry_releases;
drop trigger if exists geometry_release_verify on public.sun_geometry_releases;
update public.sun_geometry_releases r set
  completed_days=summary.completed_days,
  sample_count=summary.sample_count,
  validation_digest=sun_geometry_internal.sha(r.checksum||'|'||r.expected_venues||'|'||summary.completed_days||'|'||summary.sample_count)
from (
  select m.release_id,coalesce(sum(g.completed_days),0)::integer completed_days,coalesce(sum(g.sample_count),0)::bigint sample_count
  from public.sun_geometry_release_members m join public.sun_geometry_venue_generations g on g.id=m.generation_id group by m.release_id
) summary where r.id=summary.release_id and r.status<>'building' and r.validation_digest is null and r.checksum is not null;
alter table public.sun_geometry_releases drop constraint if exists sun_geometry_release_counts;
alter table public.sun_geometry_releases add constraint sun_geometry_release_counts check
  (expected_venues>0 and completed_venues>=0 and completed_days>=0 and sample_count>=0);
alter table public.sun_geometry_releases drop constraint if exists sun_geometry_release_lifecycle;
alter table public.sun_geometry_releases add constraint sun_geometry_release_lifecycle check
  ((status='building' and checksum is null and verified_at is null and validation_digest is null)
   or (status in ('verified','current','retired') and checksum is not null and completed_venues=expected_venues
     and completed_days=expected_days and verified_at is not null and validation_digest is not null));
alter table public.sun_geometry_venue_generations drop constraint if exists sun_geometry_generation_lifecycle;
alter table public.sun_geometry_venue_generations add constraint sun_geometry_generation_lifecycle check
  ((status in ('building','failed') and checksum is null and verified_at is null)
   or (status in ('ready','retired') and completed_days=245 and checksum is not null and verified_at is not null));
alter table public.sun_geometry_venue_generations drop constraint if exists sun_geometry_generation_run_id;
alter table public.sun_geometry_venue_generations add constraint sun_geometry_generation_run_id check
  (run_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$');
create table if not exists public.sun_geometry_evidence_references (
  evidence_id text primary key check (evidence_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'), generation_id text references public.sun_geometry_venue_generations(id),
  legacy_g1_hash text check (legacy_g1_hash ~ '^g1:[0-9a-f]{64}$'),
  weather_evidence_id text check (weather_evidence_id is null or weather_evidence_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  classifier_version text check (classifier_version is null or (length(classifier_version) between 1 and 256 and classifier_version ~ '\S')),
  created_at timestamptz not null default clock_timestamp(),
  check ((generation_id is not null) <> (legacy_g1_hash is not null))
);
create index if not exists sun_geometry_evidence_generation_idx on public.sun_geometry_evidence_references(generation_id);
alter table public.sun_geometry_evidence_references drop constraint if exists sun_geometry_evidence_text_bounds;
alter table public.sun_geometry_evidence_references add constraint sun_geometry_evidence_text_bounds check
  (evidence_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
   and (weather_evidence_id is null or weather_evidence_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$')
   and (classifier_version is null or (length(classifier_version) between 1 and 256 and classifier_version ~ '\S')));
-- Future worker fencing: one global geometry slot, separately serialized
-- publication. Queue entries do not grant a second geometry worker.
create table if not exists public.sun_geometry_worker_leases (
  slot text primary key check (slot in ('geometry','publication')),
  owner_id text not null check (owner_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'), fencing_token bigint not null check (fencing_token > 0),
  heartbeat_at timestamptz not null, expires_at timestamptz not null,
  check (expires_at > heartbeat_at and expires_at <= heartbeat_at + interval '120 seconds')
);
alter table public.sun_geometry_worker_leases drop constraint if exists sun_geometry_lease_owner;
alter table public.sun_geometry_worker_leases add constraint sun_geometry_lease_owner check
  (owner_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$');

-- A season identity is (actual year, immutable engine version). A numerical
-- upgrade must not require rewriting an existing season or its historical rows.
-- This also preserves early local 15.2 fixtures when replaying this unshipped
-- migration: backfill only the new version reference, transactionally.
do $$ begin
  if not exists(select 1 from pg_attribute where attrelid='public.sun_geometry_venue_generations'::regclass and attname='engine_id' and not attisdropped) then
    alter table public.sun_geometry_venue_generations add column engine_id text;
    drop trigger if exists geometry_generation_check on public.sun_geometry_venue_generations;
    update public.sun_geometry_venue_generations g set engine_id=i.engine_id from public.sun_geometry_inputs i where i.input_hash=g.input_hash;
    alter table public.sun_geometry_venue_generations alter column engine_id set not null;
  end if;
  if not exists(select 1 from pg_attribute where attrelid='public.sun_geometry_releases'::regclass and attname='engine_id' and not attisdropped) then
    alter table public.sun_geometry_releases add column engine_id text;
    drop trigger if exists geometry_release_check on public.sun_geometry_releases;
    drop trigger if exists geometry_release_verify on public.sun_geometry_releases;
    update public.sun_geometry_releases r set engine_id=s.engine_id from public.sun_geometry_seasons s where s.season_year=r.season_year;
    alter table public.sun_geometry_releases alter column engine_id set not null;
  end if;
  alter table public.sun_geometry_venue_generations drop constraint if exists sun_geometry_venue_generations_season_year_fkey;
  alter table public.sun_geometry_releases drop constraint if exists sun_geometry_releases_season_year_fkey;
  alter table public.sun_geometry_current_pointers drop constraint if exists sun_geometry_current_pointers_season_year_fkey;
  if exists(select 1 from pg_constraint where conrelid='public.sun_geometry_seasons'::regclass and contype='p' and cardinality(conkey)=1) then
    alter table public.sun_geometry_seasons drop constraint sun_geometry_seasons_pkey;
    alter table public.sun_geometry_seasons add primary key(season_year,engine_id);
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.sun_geometry_venue_generations'::regclass and conname='sun_geometry_generation_season_fk') then
    alter table public.sun_geometry_venue_generations add constraint sun_geometry_generation_season_fk foreign key(season_year,engine_id) references public.sun_geometry_seasons(season_year,engine_id);
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.sun_geometry_releases'::regclass and conname='sun_geometry_release_season_fk') then
    alter table public.sun_geometry_releases add constraint sun_geometry_release_season_fk foreign key(season_year,engine_id) references public.sun_geometry_seasons(season_year,engine_id);
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.sun_geometry_current_pointers'::regclass and conname='sun_geometry_pointer_year') then
    alter table public.sun_geometry_current_pointers add constraint sun_geometry_pointer_year check(season_year between 2000 and 9998);
  end if;
end $$;

create table if not exists sun_geometry_internal.lifecycle_guards (
  txid bigint not null,
  operation text not null,
  target text not null,
  primary key(txid,operation,target)
);
revoke all on sun_geometry_internal.lifecycle_guards from public,anon,authenticated,service_role;
create or replace function sun_geometry_internal.guard_begin(operation_ text,target_ text) returns void
language sql security definer set search_path=pg_catalog,sun_geometry_internal as $$
  insert into sun_geometry_internal.lifecycle_guards(txid,operation,target)
  values(pg_current_xact_id()::text::bigint,operation_,target_) on conflict do nothing;
$$;
create or replace function sun_geometry_internal.guard_end(operation_ text,target_ text) returns void
language sql security definer set search_path=pg_catalog,sun_geometry_internal as $$
  delete from sun_geometry_internal.lifecycle_guards
  where txid=pg_current_xact_id()::text::bigint and operation=operation_ and target=target_;
$$;
create or replace function sun_geometry_internal.guard_active(operation_ text,target_ text) returns boolean
language sql security definer stable set search_path=pg_catalog,sun_geometry_internal as $$
  select exists(select 1 from sun_geometry_internal.lifecycle_guards
    where txid=pg_current_xact_id()::text::bigint and operation=operation_ and target in (target_,'*'));
$$;

create or replace function sun_geometry_internal.immutable_row() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin raise exception 'Immutable geometry payload; retention requires a separately designed operation'; end;
$$;
create or replace function sun_geometry_internal.check_engine() returns trigger
language plpgsql set search_path = pg_catalog, sun_geometry_internal as $$
begin
  if new.canonical_manifest is distinct from sun_geometry_internal.canonical_json(new.canonical_manifest::jsonb) then
    raise exception 'Engine manifest is not canonical JSON';
  end if;
  perform sun_geometry_internal.assert_engine_manifest(new.canonical_manifest::jsonb);
  return new;
end;
$$;
create or replace function sun_geometry_internal.assert_geometry_input(canonical_input_ text, engine_id_ text, replay_ boolean) returns void
language plpgsql set search_path = pg_catalog, public, sun_geometry_internal as $$
declare value_ jsonb:=canonical_input_::jsonb; caster_ jsonb; key_ text; coordinates_ integer:=0;
  last_caster_id text; source_flags_ text[]; normalized_source_flags_ text[]; polygon_ jsonb; ring_ jsonb;
begin
  -- Length-only admission precedes canonicalization and every ST_IsValid call.
  -- A late aggregate check does not bound work already performed by children.
  perform sun_geometry_internal.assert_exact_keys(value_,array['seating','engineCoordinate','seatingElevationM','groundElevationM','casters','manifest'],'G2 input');
  if jsonb_typeof(value_->'casters') is distinct from 'array' then raise exception 'Invalid caster collection'; end if;
  if jsonb_array_length(value_->'casters')>5000 then raise exception 'Invalid caster collection'; end if;
  for caster_ in select value from jsonb_array_elements(value_->'casters') loop
    if jsonb_typeof(caster_->'sourceFlags') is distinct from 'array' or jsonb_array_length(caster_->'sourceFlags')>128 then
      raise exception 'Invalid caster source flags';
    end if;
  end loop;
  for polygon_ in select value_->'seating' union all
    select item->'geometry' from jsonb_array_elements(value_->'casters') item loop
    if jsonb_typeof(polygon_->'coordinates') is distinct from 'array' then raise exception 'Invalid Polygon'; end if;
    if jsonb_array_length(polygon_->'coordinates') not between 1 and 128 then raise exception 'Invalid Polygon'; end if;
    for ring_ in select value from jsonb_array_elements(polygon_->'coordinates') loop
      if jsonb_typeof(ring_) is distinct from 'array' then raise exception 'Invalid Polygon ring'; end if;
      if jsonb_array_length(ring_) not between 4 and 2048 then raise exception 'Invalid Polygon ring'; end if;
      coordinates_:=coordinates_+jsonb_array_length(ring_);
      if coordinates_>250000 then raise exception 'Geometry exceeds coordinate limit'; end if;
    end loop;
  end loop;
  if canonical_input_ is distinct from sun_geometry_internal.canonical_json(value_) then
    raise exception 'Geometry input is not canonical JSON';
  end if;
  -- New INSERTs first pass the strict check in check_input(). This replay-level
  -- validator additionally permits the exact lockfile-bound historical form.
  perform sun_geometry_internal.assert_engine_manifest_replay(value_->'manifest');
  if value_->'manifest' is distinct from
    (select canonical_manifest::jsonb from public.sun_geometry_engine_versions where id=engine_id_) then
    raise exception 'Input engine manifest mismatch';
  end if;
  coordinates_:=sun_geometry_internal.assert_polygon(value_->'seating');
  perform sun_geometry_internal.assert_exact_keys(value_->'engineCoordinate',array['lng','lat'],'Engine coordinate');
  if jsonb_typeof(value_->'engineCoordinate'->'lng')<>'number' or jsonb_typeof(value_->'engineCoordinate'->'lat')<>'number'
    or (value_->'engineCoordinate'->>'lng')::numeric not between -180 and 180
    or (value_->'engineCoordinate'->>'lat')::numeric not between -90 and 90 then raise exception 'Invalid engine coordinate'; end if;
  if jsonb_typeof(value_->'seatingElevationM')<>'number'
    or (value_->'groundElevationM'<>'null'::jsonb and jsonb_typeof(value_->'groundElevationM')<>'number') then raise exception 'Invalid venue elevation'; end if;
  if jsonb_typeof(value_->'casters')<>'array' or jsonb_array_length(value_->'casters')>5000 then raise exception 'Invalid caster collection'; end if;
  if (select count(*) from jsonb_array_elements(value_->'casters')) <>
    (select count(distinct item->>'id') from jsonb_array_elements(value_->'casters') item) then raise exception 'Duplicate caster identity'; end if;
  for caster_ in select value from jsonb_array_elements(value_->'casters') loop
    if replay_ and not (value_->'manifest'->'numericalDependencies' ? 'robust-predicates')
      and value_->'manifest'->'numericalDependencies'->>'lockfile'='b7b502955649c3850d539850ee4a47bcf7300d76527c2b6445e062b97ca7eb09' then
      perform sun_geometry_internal.assert_exact_keys(caster_,array['id','geometry','effectiveHeightM','groundElevationM','roofElevationM','importGeneration','heightSource','source','qualityScore','sourcePriority','tier','filterDecision','casterClass','sourceFlags'],'Caster');
    else
      perform sun_geometry_internal.assert_exact_keys(caster_,array['id','geometry','effectiveHeightM','groundElevationM','roofElevationM','importGeneration','heightSource','source','qualityScore','sourcePriority','tier','filterDecision','casterClass','active','sourceFlags'],'Caster');
      if jsonb_typeof(caster_->'active')<>'boolean' then raise exception 'Invalid caster active flag'; end if;
    end if;
    coordinates_:=coordinates_+sun_geometry_internal.assert_polygon(caster_->'geometry');
    foreach key_ in array array['id','importGeneration','heightSource','source','tier','filterDecision','casterClass'] loop
      if jsonb_typeof(caster_->key_)<>'string' or length(caster_->>key_) not between 1 and 256 then raise exception 'Invalid caster string'; end if;
    end loop;
    if last_caster_id is not null and (last_caster_id collate "C")>=(caster_->>'id' collate "C") then
      raise exception 'G2 input is not normalized';
    end if;
    last_caster_id:=caster_->>'id';
    if caster_->>'heightSource' not in ('Surveyed','Osm','Heuristic','ManualOverride')
      or caster_->>'tier' not in ('primary','secondary','uncertain','unknown')
      or caster_->>'filterDecision' not in ('include','review','exclude','unknown')
      or caster_->>'casterClass' not in ('building','manual_override','structure','vegetation','unknown') then raise exception 'Invalid caster eligibility metadata'; end if;
    foreach key_ in array array['effectiveHeightM','qualityScore'] loop
      if jsonb_typeof(caster_->key_)<>'number' then raise exception 'Invalid caster number'; end if;
    end loop;
    if (caster_->>'effectiveHeightM')::numeric<0 then raise exception 'Invalid effective caster height'; end if;
    foreach key_ in array array['groundElevationM','roofElevationM','sourcePriority'] loop
      if caster_->key_<>'null'::jsonb and jsonb_typeof(caster_->key_)<>'number' then raise exception 'Invalid nullable caster number'; end if;
    end loop;
    if jsonb_typeof(caster_->'sourceFlags')<>'array' or jsonb_array_length(caster_->'sourceFlags')>128
      or exists(select 1 from jsonb_array_elements(caster_->'sourceFlags') where jsonb_typeof(value)<>'string' or length(value#>>'{}') not between 1 and 256) then raise exception 'Invalid caster source flags'; end if;
    select array_agg(flag order by ordinality) into source_flags_
      from jsonb_array_elements_text(caster_->'sourceFlags') with ordinality flags(flag,ordinality);
    select array_agg(flag order by flag collate "C") into normalized_source_flags_
      from (select distinct flag collate "C" as flag
        from jsonb_array_elements_text(caster_->'sourceFlags') flag) distinct_flags;
    if coalesce(source_flags_,array[]::text[]) is distinct from coalesce(normalized_source_flags_,array[]::text[]) then
      raise exception 'G2 input is not normalized';
    end if;
  end loop;
  if coordinates_>250000 then raise exception 'Geometry exceeds coordinate limit'; end if;
end;
$$;
create or replace function sun_geometry_internal.assert_geometry_input(canonical_input_ text, engine_id_ text) returns void
language plpgsql set search_path = pg_catalog, public, sun_geometry_internal as $$
begin
  perform sun_geometry_internal.assert_geometry_input(canonical_input_,engine_id_,false);
end;
$$;
create or replace function sun_geometry_internal.check_input() returns trigger
language plpgsql set search_path = pg_catalog, public, sun_geometry_internal as $$
begin
  perform sun_geometry_internal.assert_engine_manifest((new.canonical_input::jsonb)->'manifest');
  perform sun_geometry_internal.assert_geometry_input(new.canonical_input,new.engine_id);
  return new;
end;
$$;

drop function if exists sun_geometry_internal.validate_day_payload(public.sun_geometry_days, integer);
create or replace function sun_geometry_internal.validate_day_payload(p_day public.sun_geometry_days, p_year integer, p_crossing_bracket_ms double precision default 100) returns void
language plpgsql stable set search_path = pg_catalog, public, sun_geometry_internal as $$
declare a float8[]; v float8; i integer; j integer; n integer; m integer; duration_ms float8; expected text;
  origin_ms bigint; grid_start bigint; grid_end bigint; grid_tick bigint; probe_start bigint; probe_end bigint;
  base_offsets float8[]; left_offset float8; right_offset float8; left_index integer; right_index integer; probe_offset float8;
  crossing_sample integer; edge float8; uncertainty float8;
begin
  if p_crossing_bracket_ms<=0 or p_crossing_bracket_ms>100 or p_crossing_bracket_ms in ('NaN'::float8,'Infinity'::float8,'-Infinity'::float8) then raise exception 'Invalid crossing-bracket policy'; end if;
  if p_day.stockholm_date not between make_date(p_year,3,1) and make_date(p_year,10,31) then raise exception 'Wrong season date'; end if;
  -- Explicit one-dimensional, one-based finite arrays. Empty arrays are legal
  -- only as an all-empty supported-model negative, never as missing work.
  for a in select p_day.offsets union all select p_day.exposure union all select p_day.starts union all select p_day.ends union all select p_day.start_uncertainty_ms union all select p_day.end_uncertainty_ms loop
    if cardinality(a)>20000 or (cardinality(a)=0 and array_dims(a) is not null)
      or (cardinality(a)>0 and (array_ndims(a)<>1 or array_lower(a,1)<>1)) then raise exception 'Invalid array dimensions'; end if;
    foreach v in array a loop
      if v is null or v in ('NaN'::float8,'Infinity'::float8,'-Infinity'::float8) then raise exception 'Nonfinite array value'; end if;
    end loop;
  end loop;
  n:=cardinality(p_day.offsets); m:=cardinality(p_day.starts);
  if p_day.sample_count<>n or n<>cardinality(p_day.exposure) or m<>cardinality(p_day.ends) or m<>cardinality(p_day.sunny) or m<>cardinality(p_day.start_uncertainty_ms) or m<>cardinality(p_day.end_uncertainty_ms) then raise exception 'Array count mismatch'; end if;
  if (cardinality(p_day.sunny)=0 and array_dims(p_day.sunny) is not null)
    or (cardinality(p_day.sunny)>0 and (array_ndims(p_day.sunny)<>1 or array_lower(p_day.sunny,1)<>1 or array_position(p_day.sunny,null) is not null)) then raise exception 'Invalid sunny flags'; end if;
  if exists(select 1 from unnest(p_day.exposure) x where x<0 or x>100) or exists(select 1 from unnest(p_day.start_uncertainty_ms||p_day.end_uncertainty_ms) x where x<0 or x>100) then raise exception 'Out of range value'; end if;
  if p_day.horizon is null then
    if n<>0 or m<>0 then raise exception 'Nonempty supported negative'; end if;
  else
    if array_ndims(p_day.horizon)<>1 or array_lower(p_day.horizon,1)<>1 or cardinality(p_day.horizon)<>2 then raise exception 'Invalid horizon shape'; end if;
    foreach v in array p_day.horizon loop
      if v is null or v in ('NaN'::float8,'Infinity'::float8,'-Infinity'::float8) then raise exception 'Invalid horizon value'; end if;
    end loop;
    duration_ms:=extract(epoch from (((p_day.stockholm_date+1)::timestamp at time zone 'Europe/Stockholm')-(p_day.stockholm_date::timestamp at time zone 'Europe/Stockholm')))*1000;
    if n<2 or m<1 or p_day.horizon[1]<0 or p_day.horizon[2]<=p_day.horizon[1] or p_day.horizon[2]>duration_ms then raise exception 'Invalid horizon'; end if;
    if p_day.offsets[1]<>p_day.horizon[1] or p_day.offsets[n]<>p_day.horizon[2] or p_day.starts[1]<>p_day.horizon[1] or p_day.ends[m]<>p_day.horizon[2] then raise exception 'Missing endpoints'; end if;
    for i in 1..n loop
      if p_day.offsets[i]<p_day.horizon[1] or p_day.offsets[i]>p_day.horizon[2] or (i>1 and p_day.offsets[i]<=p_day.offsets[i-1]) then raise exception 'Invalid offsets'; end if;
    end loop;
    -- Base/probe grids are aligned to UTC instants. Stockholm midnight is
    -- currently an integer-hour UTC offset, but calculate its epoch explicitly
    -- so the stored local-midnight offsets keep the same contract if that changes.
    origin_ms:=extract(epoch from (p_day.stockholm_date::timestamp at time zone 'Europe/Stockholm'))*1000;
    base_offsets:=array[p_day.horizon[1]];
    grid_start:=ceil((origin_ms+p_day.horizon[1])/300000.0)::bigint;
    grid_end:=floor((origin_ms+p_day.horizon[2])/300000.0)::bigint;
    for grid_tick in select generate_series(grid_start,grid_end) loop
      v:=grid_tick*300000-origin_ms;
      if v>p_day.horizon[1] and v<p_day.horizon[2] then
        if array_position(p_day.offsets,v) is null then raise exception 'Missing UTC base sample'; end if;
        base_offsets:=array_append(base_offsets,v);
      end if;
    end loop;
    base_offsets:=array_append(base_offsets,p_day.horizon[2]);
    for i in 2..cardinality(base_offsets) loop
      left_offset:=base_offsets[i-1]; right_offset:=base_offsets[i];
      left_index:=array_position(p_day.offsets,left_offset); right_index:=array_position(p_day.offsets,right_offset);
      if abs(p_day.exposure[left_index]-50)<=5 or abs(p_day.exposure[right_index]-50)<=5
        or (p_day.exposure[left_index]>50) is distinct from (p_day.exposure[right_index]>50) then
        probe_start:=ceil((origin_ms+left_offset)/60000.0)::bigint;
        probe_end:=floor((origin_ms+right_offset)/60000.0)::bigint;
        for grid_tick in select generate_series(probe_start,probe_end) loop
          probe_offset:=grid_tick*60000-origin_ms;
          if probe_offset>left_offset and probe_offset<right_offset and array_position(p_day.offsets,probe_offset) is null then
            raise exception 'Missing conditional probe';
          end if;
        end loop;
      end if;
    end loop;
    for i in 1..m loop
      if p_day.starts[i]<p_day.horizon[1] or p_day.ends[i]>p_day.horizon[2] or p_day.starts[i]>=p_day.ends[i] or (i>1 and (p_day.starts[i]<>p_day.ends[i-1] or p_day.sunny[i]=p_day.sunny[i-1] or p_day.start_uncertainty_ms[i]<>p_day.end_uncertainty_ms[i-1])) then raise exception 'Invalid interval partition'; end if;
      if p_day.sunny[i] and p_day.ends[i]-p_day.starts[i]-p_day.start_uncertainty_ms[i]-p_day.end_uncertainty_ms[i]<300000 and p_day.ends[i]-p_day.starts[i]+p_day.start_uncertainty_ms[i]+p_day.end_uncertainty_ms[i]>=300000 then raise exception 'Unresolved duration'; end if;
    end loop;
    if (p_day.exposure[1]>50) is distinct from p_day.sunny[1]
      or (p_day.exposure[n]>50) is distinct from p_day.sunny[m] then raise exception 'Raw interval contradicts endpoint'; end if;
    -- Every claimed transition needs retained evidence on both sides. Samples
    -- exactly on a boundary cannot, on their own, establish either crossing.
    crossing_sample:=1;
    for i in 2..m loop
      edge:=p_day.starts[i]; uncertainty:=p_day.start_uncertainty_ms[i];
      while crossing_sample<=n and p_day.offsets[crossing_sample]<edge loop crossing_sample:=crossing_sample+1; end loop;
      left_index:=crossing_sample-1;
      right_index:=crossing_sample;
      if p_day.offsets[crossing_sample]=edge then right_index:=right_index+1; end if;
      if left_index<1 or right_index>n
        or edge-p_day.offsets[left_index]>uncertainty or p_day.offsets[right_index]-edge>uncertainty
        or p_day.offsets[right_index]-p_day.offsets[left_index]>p_crossing_bracket_ms
        or (p_day.exposure[left_index]>50) is distinct from p_day.sunny[i-1]
        or (p_day.exposure[right_index]>50) is distinct from p_day.sunny[i] then
        raise exception 'Missing or inconsistent crossing bracket';
      end if;
    end loop;
    j:=1;
    for i in 1..n loop
      while j<m and p_day.offsets[i]>p_day.ends[j] loop j:=j+1; end loop;
      if p_day.offsets[i]>p_day.starts[j]+p_day.start_uncertainty_ms[j]
        and p_day.offsets[i]<p_day.ends[j]-p_day.end_uncertainty_ms[j]
        and (p_day.exposure[i]>50) is distinct from p_day.sunny[j] then raise exception 'Raw interval contradicts sample'; end if;
    end loop;
  end if;
  expected:=sun_geometry_internal.sha(concat_ws('|','f64-v1',to_char(p_day.stockholm_date,'YYYY-MM-DD'),case when p_day.horizon is null then '-' else sun_geometry_internal.f64_hex(p_day.horizon) end,
    sun_geometry_internal.f64_hex(p_day.offsets),sun_geometry_internal.f64_hex(p_day.exposure),sun_geometry_internal.f64_hex(p_day.starts),sun_geometry_internal.f64_hex(p_day.ends),
    (select coalesce(string_agg(case when t.x then '1' else '0' end,'' order by t.i),'') from unnest(p_day.sunny) with ordinality as t(x,i)),
    sun_geometry_internal.f64_hex(p_day.start_uncertainty_ms),sun_geometry_internal.f64_hex(p_day.end_uncertainty_ms)));
  if expected<>p_day.checksum then raise exception 'Day checksum mismatch'; end if;
  return;
end;
$$;

create or replace function sun_geometry_internal.check_day() returns trigger
language plpgsql set search_path = pg_catalog, public, sun_geometry_internal as $$
declare g public.sun_geometry_venue_generations; bracket_ms double precision;
begin
  select * into strict g from public.sun_geometry_venue_generations where id=new.generation_id for update;
  if g.status <> 'building' then raise exception 'Frozen generation'; end if;
  select (canonical_manifest::jsonb->>'crossingBracketMs')::double precision into strict bracket_ms
    from public.sun_geometry_engine_versions where id=g.engine_id;
  perform sun_geometry_internal.validate_day_payload(new,g.season_year,bracket_ms);
  return new;
end;
$$;

create or replace function sun_geometry_internal.revision_transition() returns trigger
language plpgsql security definer set search_path = pg_catalog, sun_geometry_internal as $$
begin
  if tg_op='INSERT' then
    if new.revision<>1 or new.committed_hash is not null or new.staged_hash is not null or not new.dirty then
      raise exception 'Input revision starts dirty and server-owned';
    end if;
    new.updated_at:=clock_timestamp(); return new;
  end if;
  if new.venue_id<>old.venue_id then raise exception 'Immutable revision venue'; end if;
  if new.committed_hash is distinct from old.committed_hash then
    if not old.dirty or old.staged_hash is null or new.committed_hash is distinct from old.staged_hash
      or new.staged_hash is not null or new.dirty then raise exception 'Committed input must atomically promote the staged hash'; end if;
    new.revision:=old.revision+1;
  elsif new.dirty and not old.dirty then
    new.revision:=old.revision+1;
  elsif new.dirty and old.dirty and new.revision<>old.revision then
    if not sun_geometry_internal.guard_active('revision-dirty',new.venue_id) then raise exception 'Revision is server-owned'; end if;
    new.revision:=old.revision+1;
  elsif old.dirty and not new.dirty then
    if old.staged_hash is null or new.staged_hash is not null or new.committed_hash is distinct from old.staged_hash then
      raise exception 'Dirty input requires committed staged promotion';
    end if;
    if new.revision<>old.revision then raise exception 'Revision is server-owned'; end if;
    new.revision:=old.revision+1;
  elsif new.revision<>old.revision then
    raise exception 'Revision is server-owned';
  end if;
  new.updated_at:=clock_timestamp(); return new;
end;
$$;

create or replace function sun_geometry_internal.venue_dirty() returns trigger
language plpgsql security definer set search_path = pg_catalog, public, sun_geometry_internal as $$
declare before_ jsonb; after_ jsonb; key_ text;
begin
  if tg_op<>'INSERT' then before_:=to_jsonb(old); end if;
  if tg_op<>'DELETE' then after_:=to_jsonb(new); end if;
  if tg_op='UPDATE' and new.id is distinct from old.id then raise exception 'Venue identity is immutable'; end if;
  key_:=coalesce(after_->>'id',before_->>'id');
  -- Display coordinates, hours, visibility and product metadata are excluded.
  if tg_op='UPDATE' and (select jsonb_object_agg(k,before_->k) from unnest(array['seating_area','seating_elevation_m','ground_elevation_m','ground_z_rh2000','lat','lng','deleted_at']) k)
    is not distinct from (select jsonb_object_agg(k,after_->k) from unnest(array['seating_area','seating_elevation_m','ground_elevation_m','ground_z_rh2000','lat','lng','deleted_at']) k) then return new; end if;
  perform sun_geometry_internal.guard_begin('revision-dirty',key_);
  insert into public.sun_geometry_input_revisions(venue_id) values(key_)
    on conflict(venue_id) do update set dirty=true,revision=public.sun_geometry_input_revisions.revision+1;
  perform sun_geometry_internal.guard_end('revision-dirty',key_);
  if tg_op='DELETE' then return old; end if; return new;
end;
$$;
create or replace function sun_geometry_internal.casters_dirty() returns trigger
language plpgsql security definer set search_path = pg_catalog, public, sun_geometry_internal as $$
begin
  perform sun_geometry_internal.guard_begin('revision-dirty','*');
  update public.sun_geometry_input_revisions set dirty=true,revision=revision+1;
  perform sun_geometry_internal.guard_end('revision-dirty','*');
  return null;
end;
$$;
create or replace function sun_geometry_internal.casters_dirty_update() returns trigger
language plpgsql security definer set search_path = pg_catalog, public, sun_geometry_internal as $$
declare before_ jsonb; after_ jsonb;
begin
  select jsonb_agg(jsonb_build_object('id',id,'geometry',geometry,'height_m',height_m,'ground_z_rh2000',ground_z_rh2000,
    'roof_z_rh2000',roof_z_rh2000,'source_priority',source_priority,'shadow_caster_tier',shadow_caster_tier,
    'filter_decision',filter_decision,'caster_class',caster_class,'source_flags',source_flags,'import_batch_id',import_batch_id,'active',active) order by id)
    into before_ from old_casters;
  select jsonb_agg(jsonb_build_object('id',id,'geometry',geometry,'height_m',height_m,'ground_z_rh2000',ground_z_rh2000,
    'roof_z_rh2000',roof_z_rh2000,'source_priority',source_priority,'shadow_caster_tier',shadow_caster_tier,
    'filter_decision',filter_decision,'caster_class',caster_class,'source_flags',source_flags,'import_batch_id',import_batch_id,'active',active) order by id)
    into after_ from new_casters;
  if before_ is not distinct from after_ then return null; end if;
  perform sun_geometry_internal.guard_begin('revision-dirty','*');
  update public.sun_geometry_input_revisions set dirty=true,revision=revision+1;
  perform sun_geometry_internal.guard_end('revision-dirty','*');
  return null;
end;
$$;
create or replace function sun_geometry_internal.lease_transition() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if new.heartbeat_at>clock_timestamp() or new.expires_at<=clock_timestamp() or new.expires_at>clock_timestamp()+interval '120 seconds' then
    raise exception 'Lease exceeds server-time bound';
  end if;
  if tg_op='INSERT' then return new; end if;
  if new.slot<>old.slot then raise exception 'Immutable worker slot'; end if;
  if old.expires_at>clock_timestamp() then
    if new.owner_id<>old.owner_id or new.fencing_token<>old.fencing_token then raise exception 'Active worker lease'; end if;
  elsif new.fencing_token<=old.fencing_token then raise exception 'Expired lease requires new fence'; end if;
  if new.heartbeat_at<old.heartbeat_at then raise exception 'Stale heartbeat'; end if;
  return new;
end;
$$;

create or replace function sun_geometry_internal.generation_digest(gid text) returns text
language sql stable set search_path = pg_catalog, public, sun_geometry_internal as $$
  select sun_geometry_internal.sha(g.input_hash||'|'||g.season_year||'|Europe/Stockholm|f64-v1|'||coalesce(string_agg(to_char(d.stockholm_date,'YYYY-MM-DD')||':'||d.checksum,E'\n' order by d.stockholm_date),''))
  from public.sun_geometry_venue_generations g left join public.sun_geometry_days d on d.generation_id=g.id where g.id=gid group by g.id;
$$;
create or replace function sun_geometry_internal.generation_transition() returns trigger
language plpgsql set search_path = pg_catalog, public, sun_geometry_internal as $$
declare total integer; samples bigint;
begin
  if tg_op='INSERT' then
    if new.status<>'building' or new.completed_days<>0 or new.sample_count<>0 or new.checksum is not null or new.verified_at is not null then raise exception 'Generation starts building'; end if;
    if new.engine_id is null then select engine_id into new.engine_id from public.sun_geometry_inputs where input_hash=new.input_hash; end if;
    if new.engine_id is distinct from (select engine_id from public.sun_geometry_inputs where input_hash=new.input_hash)
      or not exists(select 1 from public.sun_geometry_seasons where season_year=new.season_year and engine_id=new.engine_id) then raise exception 'Engine mismatch'; end if;
    return new;
  end if;
  if old.status='ready' and new.status='retired'
    and (to_jsonb(new)-'status') is not distinct from (to_jsonb(old)-'status') then
    -- A source revision can change without changing the eventual canonical hash
    -- (conservative dirtying, or a later correction back to old inputs). Preserve
    -- the old evidence payload while freeing the unique ready-generation slot.
    perform pg_advisory_xact_lock(1502,1);
    lock table public.sun_geometry_input_revisions in share mode;
    if exists(select 1 from public.sun_geometry_release_members m join public.sun_geometry_releases r on r.id=m.release_id
      where m.generation_id=old.id and r.status in ('verified','current'))
      or exists(select 1 from public.sun_geometry_current_pointers p join public.sun_geometry_release_members m
        on m.release_id in (p.release_id,p.rollback_release_id) where m.generation_id=old.id)
      or exists(select 1 from public.sun_geometry_evidence_references e where e.generation_id=old.id) then
      raise exception 'Cannot retire retained generation';
    end if;
    if exists(select 1 from public.sun_geometry_input_revisions i where i.venue_id=old.venue_id
      and not i.dirty and i.committed_hash=old.input_hash) then
      raise exception 'Cannot retire compatible ready generation';
    end if;
    return new;
  end if;
  if old.status<>'building' or (to_jsonb(new)-array['status','completed_days','sample_count','checksum','verified_at']) is distinct from (to_jsonb(old)-array['status','completed_days','sample_count','checksum','verified_at']) then raise exception 'Immutable generation'; end if;
  if new.status='ready' then
    perform 1 from public.sun_geometry_input_revisions i where i.venue_id=new.venue_id and not i.dirty
      and i.committed_hash=new.input_hash and i.revision=new.source_revision for share;
    if not found then raise exception 'Generation provenance is stale'; end if;
    select count(*),coalesce(sum(sample_count),0) into total,samples from public.sun_geometry_days where generation_id=new.id;
    if total<>245 or new.completed_days<>total or new.sample_count<>samples or new.checksum is distinct from sun_geometry_internal.generation_digest(new.id) then raise exception 'Incomplete generation/checksum'; end if;
    if exists(select make_date(new.season_year,3,1)+i from generate_series(0,244) i except select stockholm_date from public.sun_geometry_days where generation_id=new.id) then raise exception 'Missing exact date'; end if;
    new.verified_at:=clock_timestamp();
  elsif new.status not in ('building','failed') then raise exception 'Illegal generation transition'; end if;
  return new;
end;
$$;
create or replace function sun_geometry_internal.member_insert() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
declare r public.sun_geometry_releases; g public.sun_geometry_venue_generations;
begin
  perform pg_advisory_xact_lock(1502,1);
  select * into strict r from public.sun_geometry_releases where id=new.release_id for update;
  select * into strict g from public.sun_geometry_venue_generations where id=new.generation_id for update;
  if r.status<>'building' or g.status<>'ready' or g.venue_id<>new.venue_id or g.season_year<>r.season_year or g.engine_id<>r.engine_id then raise exception 'Incompatible/frozen release membership'; end if;
  return new;
end;
$$;
create or replace function sun_geometry_internal.release_digest(rid text) returns text
language sql stable set search_path = pg_catalog, public, sun_geometry_internal as $$
  select sun_geometry_internal.sha(r.season_year||'|'||r.engine_id||'|f64-v1|'||coalesce(string_agg(m.venue_id||':'||g.id||':'||g.source_revision||':'||g.checksum,E'\n' order by m.venue_id collate "C"),''))
  from public.sun_geometry_releases r
  left join public.sun_geometry_release_members m on m.release_id=r.id left join public.sun_geometry_venue_generations g on g.id=m.generation_id where r.id=rid group by r.id;
$$;
-- Locks cover inventory phantoms and revision changes through commit. This is a
-- schema invariant, not the later public publication API or staged-input writer.
create or replace function sun_geometry_internal.assert_release(rid text, full_validation boolean) returns void
language plpgsql set search_path = pg_catalog, public, sun_geometry_internal as $$
declare r public.sun_geometry_releases; aggregate_days integer; aggregate_samples bigint;
begin
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Release assertion requires read committed transaction';
  end if;
  perform pg_advisory_xact_lock(1502,1);
  lock table public.venues, public.sun_geometry_input_revisions in share mode;
  select * into strict r from public.sun_geometry_releases where id=rid for update;
  if (select count(*) from public.sun_geometry_release_members where release_id=rid)<>r.expected_venues then raise exception 'Release count mismatch'; end if;
  select coalesce(sum(g.completed_days),0)::integer,coalesce(sum(g.sample_count),0)::bigint
    into aggregate_days,aggregate_samples from public.sun_geometry_release_members m
    join public.sun_geometry_venue_generations g on g.id=m.generation_id where m.release_id=rid;
  if r.completed_days<>aggregate_days or r.completed_days<>r.expected_days or r.sample_count<>aggregate_samples then
    raise exception 'Release aggregate count mismatch';
  end if;
  if exists((select id from public.venues where (to_jsonb(venues)->>'deleted_at') is null except select venue_id from public.sun_geometry_release_members where release_id=rid)
    union all (select venue_id from public.sun_geometry_release_members where release_id=rid except select id from public.venues where (to_jsonb(venues)->>'deleted_at') is null)) then raise exception 'Inventory mismatch'; end if;
  if exists(select 1 from public.sun_geometry_release_members m join public.sun_geometry_venue_generations g on g.id=m.generation_id join public.sun_geometry_input_revisions i on i.venue_id=m.venue_id
    where m.release_id=rid and (i.dirty or i.committed_hash is distinct from g.input_hash or g.status<>'ready' or g.season_year<>r.season_year or g.engine_id<>r.engine_id or g.venue_id<>m.venue_id or g.checksum is distinct from sun_geometry_internal.generation_digest(g.id))) then raise exception 'Stale/incompatible generation'; end if;
  if full_validation then
    perform sun_geometry_internal.validate_day_payload(d,g.season_year,(e.canonical_manifest::jsonb->>'crossingBracketMs')::double precision)
      from public.sun_geometry_release_members m join public.sun_geometry_venue_generations g on g.id=m.generation_id
      join public.sun_geometry_engine_versions e on e.id=g.engine_id join public.sun_geometry_days d on d.generation_id=g.id where m.release_id=rid;
  end if;
  if r.checksum is distinct from sun_geometry_internal.release_digest(rid) then raise exception 'Release checksum mismatch'; end if;
  if r.validation_digest is distinct from sun_geometry_internal.sha(r.checksum||'|'||r.expected_venues||'|'||r.completed_days||'|'||r.sample_count) then
    raise exception 'Release validation evidence mismatch';
  end if;
end;
$$;
create or replace function sun_geometry_internal.assert_release(rid text) returns void
language plpgsql set search_path = pg_catalog, public, sun_geometry_internal as $$
begin
  perform sun_geometry_internal.assert_release(rid,true);
end;
$$;
create or replace function sun_geometry_internal.release_transition() returns trigger
language plpgsql security definer set search_path = pg_catalog, public, sun_geometry_internal as $$
declare member_count integer; day_count integer; samples bigint;
begin
  if tg_op='INSERT' then
    if new.status<>'building' or new.completed_venues<>0 or new.completed_days<>0 or new.sample_count<>0
      or new.checksum is not null or new.validation_digest is not null or new.verified_at is not null then raise exception 'Release starts building'; end if;
    if new.engine_id is null then
      select min(engine_id) into new.engine_id from public.sun_geometry_seasons where season_year=new.season_year having count(*)=1;
      if new.engine_id is null then raise exception 'Explicit release engine required'; end if;
    end if;
    return new;
  end if;
  if old.status in ('verified','current') and new.status in ('verified','current','retired')
    and old.status<>new.status and (to_jsonb(new)-array['status','expected_days']) is not distinct from (to_jsonb(old)-array['status','expected_days']) then
    if not sun_geometry_internal.guard_active('pointer-release',old.season_year::text) then raise exception 'Release lifecycle is pointer-owned'; end if;
    return new;
  end if;
  if old.status<>'building' or (to_jsonb(new)-array['status','expected_days','completed_venues','completed_days','sample_count','checksum','validation_digest','verified_at']) is distinct from (to_jsonb(old)-array['status','expected_days','completed_venues','completed_days','sample_count','checksum','validation_digest','verified_at']) then raise exception 'Immutable release'; end if;
  if new.status='verified' then
    select count(*),coalesce(sum(g.completed_days),0)::integer,coalesce(sum(g.sample_count),0)::bigint
      into member_count,day_count,samples from public.sun_geometry_release_members m
      join public.sun_geometry_venue_generations g on g.id=m.generation_id where m.release_id=new.id;
    new.completed_venues:=member_count; new.completed_days:=day_count; new.sample_count:=samples;
    new.validation_digest:=sun_geometry_internal.sha(new.checksum||'|'||new.expected_venues||'|'||day_count||'|'||samples);
    new.verified_at:=clock_timestamp();
  elsif new.status<>'building' then raise exception 'Illegal release transition'; end if;
  return new;
end;
$$;
create or replace function sun_geometry_internal.release_verify() returns trigger
language plpgsql security definer set search_path = pg_catalog, public, sun_geometry_internal as $$
begin
  if old.status='building' and new.status='verified' then
    perform sun_geometry_internal.assert_release(new.id,true);
    perform sun_geometry_internal.guard_begin('season-verify',new.season_year||':'||new.engine_id);
    update public.sun_geometry_seasons set status='verified',expected_venues=new.expected_venues,
      checksum=new.checksum where season_year=new.season_year and engine_id=new.engine_id and status='building';
    perform sun_geometry_internal.guard_end('season-verify',new.season_year||':'||new.engine_id);
  end if;
  return new;
end;
$$;
create or replace function sun_geometry_internal.season_transition() returns trigger
language plpgsql security definer set search_path = pg_catalog, public, sun_geometry_internal as $$
begin
  if tg_op='INSERT' then
    if new.status<>'building' or new.checksum is not null or new.verified_at is not null then raise exception 'Season starts building'; end if;
    if new.crossing_bracket_ms is distinct from (select (canonical_manifest::jsonb->>'crossingBracketMs')::double precision from public.sun_geometry_engine_versions where id=new.engine_id) then
      raise exception 'Season crossing policy mismatch';
    end if;
    return new;
  end if;
  if old.status='building' and new.status='verified'
    and (to_jsonb(new)-array['status','expected_venues','checksum','verified_at','updated_at']) is not distinct from (to_jsonb(old)-array['status','expected_venues','checksum','verified_at','updated_at']) then
    if not sun_geometry_internal.guard_active('season-verify',new.season_year||':'||new.engine_id) or new.expected_venues<1 or new.checksum is null then raise exception 'Season verification is release-owned'; end if;
    new.verified_at:=clock_timestamp(); new.updated_at:=clock_timestamp(); return new;
  end if;
  if old.status in ('verified','current','retired') and new.status in ('verified','current','retired')
    and (to_jsonb(new)-array['status','expected_venues','checksum','updated_at']) is not distinct from (to_jsonb(old)-array['status','expected_venues','checksum','updated_at']) then
    if not sun_geometry_internal.guard_active('pointer-season',old.season_year::text) then raise exception 'Season lifecycle is pointer-owned'; end if;
    new.updated_at:=clock_timestamp(); return new;
  end if;
  raise exception 'Immutable season';
end;
$$;
create or replace function sun_geometry_internal.pointer_gate() returns trigger
language plpgsql security definer set search_path = pg_catalog, public, sun_geometry_internal as $$
declare target public.sun_geometry_releases;
begin
  if tg_op='UPDATE' and new.season_year<>old.season_year then raise exception 'Immutable pointer season'; end if;
  select * into strict target from public.sun_geometry_releases where id=new.release_id;
  if target.season_year<>new.season_year or target.status not in ('verified','current') then raise exception 'Invalid pointer target'; end if;
  perform sun_geometry_internal.assert_release(new.release_id,false);
  if new.rollback_release_id is not null then
    if not exists(select 1 from public.sun_geometry_releases where id=new.rollback_release_id and season_year=new.season_year and status in ('verified','current')) then raise exception 'Invalid rollback target'; end if;
    perform sun_geometry_internal.assert_release(new.rollback_release_id,false);
  end if;
  perform sun_geometry_internal.guard_begin('pointer-release',new.season_year::text);
  perform sun_geometry_internal.guard_begin('pointer-season',new.season_year::text);
  update public.sun_geometry_releases set status=case when id=new.rollback_release_id then 'verified' else 'retired' end
    where season_year=new.season_year and status='current' and id<>new.release_id;
  update public.sun_geometry_releases set status='current' where id=new.release_id and status='verified';
  update public.sun_geometry_seasons set status='retired'
    where season_year=new.season_year and status='current' and engine_id<>target.engine_id;
  update public.sun_geometry_seasons set status='current',expected_venues=target.expected_venues,checksum=target.checksum
    where season_year=new.season_year and engine_id=target.engine_id and status in ('verified','current','retired');
  perform sun_geometry_internal.guard_end('pointer-season',new.season_year::text);
  perform sun_geometry_internal.guard_end('pointer-release',new.season_year::text);
  new.updated_at:=clock_timestamp(); return new;
end;
$$;

create or replace function sun_geometry_internal.evidence_insert() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
declare generation_status text;
begin
  if new.generation_id is null then return new; end if;
  perform pg_advisory_xact_lock(1502,1);
  select status into strict generation_status from public.sun_geometry_venue_generations
    where id=new.generation_id for update;
  if generation_status<>'ready' then raise exception 'Evidence requires ready generation'; end if;
  return new;
end;
$$;

-- No deletion/TRUNCATE grants in this story. Immutable references plus RESTRICT
-- FKs protect complete current/rollback/evidence trees, including reference races.
do $$ declare t text; begin
  -- Earlier unshipped revisions also froze lifecycle-owned season rows. Remove
  -- every legacy copy before recreating the immutable payload subset so replay
  -- converges to the same trigger contract as a clean install.
  foreach t in array array['sun_geometry_engine_versions','sun_geometry_inputs','sun_geometry_seasons','sun_geometry_input_revisions','sun_geometry_venue_generations','sun_geometry_days','sun_geometry_releases','sun_geometry_release_members','sun_geometry_current_pointers','sun_geometry_evidence_references','sun_geometry_worker_leases'] loop
    execute format('drop trigger if exists geometry_immutable on public.%I',t);
  end loop;
  foreach t in array array['sun_geometry_engine_versions','sun_geometry_inputs','sun_geometry_days','sun_geometry_release_members','sun_geometry_evidence_references'] loop
    execute format('create trigger geometry_immutable before update or delete on public.%I for each row execute function sun_geometry_internal.immutable_row()',t);
  end loop;
  foreach t in array array['sun_geometry_engine_versions','sun_geometry_inputs','sun_geometry_seasons','sun_geometry_input_revisions','sun_geometry_venue_generations','sun_geometry_days','sun_geometry_releases','sun_geometry_release_members','sun_geometry_current_pointers','sun_geometry_evidence_references','sun_geometry_worker_leases'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated, service_role',t);
    execute format('grant select, insert on public.%I to service_role',t);
    execute format('drop policy if exists geometry_service on public.%I',t);
    execute format('create policy geometry_service on public.%I to service_role using (true) with check (true)',t);
  end loop;
end $$;
grant update on public.sun_geometry_seasons, public.sun_geometry_input_revisions, public.sun_geometry_venue_generations, public.sun_geometry_releases, public.sun_geometry_current_pointers, public.sun_geometry_worker_leases to service_role;
drop trigger if exists geometry_engine_check on public.sun_geometry_engine_versions;
create trigger geometry_engine_check before insert on public.sun_geometry_engine_versions for each row execute function sun_geometry_internal.check_engine();
drop trigger if exists geometry_input_check on public.sun_geometry_inputs;
create trigger geometry_input_check before insert on public.sun_geometry_inputs for each row execute function sun_geometry_internal.check_input();
drop trigger if exists geometry_day_check on public.sun_geometry_days;
create trigger geometry_day_check before insert on public.sun_geometry_days for each row execute function sun_geometry_internal.check_day();
drop trigger if exists geometry_generation_check on public.sun_geometry_venue_generations;
create trigger geometry_generation_check before insert or update on public.sun_geometry_venue_generations for each row execute function sun_geometry_internal.generation_transition();
drop trigger if exists geometry_member_check on public.sun_geometry_release_members;
create trigger geometry_member_check before insert on public.sun_geometry_release_members for each row execute function sun_geometry_internal.member_insert();
drop trigger if exists geometry_release_check on public.sun_geometry_releases;
create trigger geometry_release_check before insert or update on public.sun_geometry_releases for each row execute function sun_geometry_internal.release_transition();
drop trigger if exists geometry_release_verify on public.sun_geometry_releases;
create trigger geometry_release_verify after update on public.sun_geometry_releases for each row execute function sun_geometry_internal.release_verify();
drop trigger if exists geometry_pointer_check on public.sun_geometry_current_pointers;
create trigger geometry_pointer_check before insert or update on public.sun_geometry_current_pointers for each row execute function sun_geometry_internal.pointer_gate();
drop trigger if exists geometry_revision_check on public.sun_geometry_input_revisions;
create trigger geometry_revision_check before insert or update on public.sun_geometry_input_revisions for each row execute function sun_geometry_internal.revision_transition();
drop trigger if exists geometry_season_check on public.sun_geometry_seasons;
create trigger geometry_season_check before insert or update on public.sun_geometry_seasons for each row execute function sun_geometry_internal.season_transition();
drop trigger if exists geometry_evidence_check on public.sun_geometry_evidence_references;
create trigger geometry_evidence_check before insert on public.sun_geometry_evidence_references for each row execute function sun_geometry_internal.evidence_insert();
drop trigger if exists geometry_lease_check on public.sun_geometry_worker_leases;
create trigger geometry_lease_check before insert or update on public.sun_geometry_worker_leases for each row execute function sun_geometry_internal.lease_transition();
insert into public.sun_geometry_input_revisions(venue_id) select id from public.venues on conflict do nothing;
drop trigger if exists geometry_venue_dirty on public.venues;
create trigger geometry_venue_dirty after insert or update or delete on public.venues for each row execute function sun_geometry_internal.venue_dirty();
do $$ begin
  if to_regclass('public.shadow_casters') is not null then
    execute 'drop trigger if exists geometry_casters_dirty on public.shadow_casters';
    execute 'drop trigger if exists geometry_casters_dirty_update on public.shadow_casters';
    execute 'create trigger geometry_casters_dirty after insert or delete or truncate on public.shadow_casters for each statement execute function sun_geometry_internal.casters_dirty()';
    execute 'create trigger geometry_casters_dirty_update after update on public.shadow_casters referencing old table as old_casters new table as new_casters for each statement execute function sun_geometry_internal.casters_dirty_update()';
  end if;
end $$;
do $$ declare row_ record; begin
  for row_ in select * from public.sun_geometry_engine_versions loop
    perform sun_geometry_internal.assert_engine_manifest_replay(row_.canonical_manifest::jsonb);
    if row_.canonical_manifest is distinct from sun_geometry_internal.canonical_json(row_.canonical_manifest::jsonb) then raise exception 'Existing engine manifest is not canonical JSON'; end if;
  end loop;
  for row_ in select * from public.sun_geometry_inputs loop
    perform sun_geometry_internal.assert_geometry_input(row_.canonical_input,row_.engine_id,true);
  end loop;
end $$;

-- CREATE TABLE IF NOT EXISTS is not a replay repair mechanism. Reject any
-- interrupted/earlier shape that still differs after the explicit ALTERs above.
create or replace function sun_geometry_internal.assert_table_shape(table_ regclass, columns_ text[], nonnull_ text[]) returns void
language plpgsql stable strict set search_path=pg_catalog as $$
declare actual_ text[]; expected_ text[]; missing_nullable_ text;
begin
  -- Additive replay appends columns, while a fresh CREATE places them in the
  -- canonical declaration order. Column order is not a PostgreSQL contract;
  -- exact names, nullability and validated constraints are.
  select array_agg(attname order by attname collate "C") into actual_ from pg_attribute
    where attrelid=table_ and attnum>0 and not attisdropped;
  select array_agg(expected order by expected collate "C") into expected_ from unnest(columns_) expected;
  if actual_ is distinct from expected_ then raise exception 'Incompatible replay table shape: %',table_::text; end if;
  select expected into missing_nullable_ from unnest(nonnull_) expected
    where not exists(select 1 from pg_attribute where attrelid=table_ and attname=expected and attnotnull) limit 1;
  if missing_nullable_ is not null then raise exception 'Incompatible nullable column %.%',table_::text,missing_nullable_; end if;
  if not exists(select 1 from pg_constraint where conrelid=table_ and contype='p' and convalidated) then
    raise exception 'Missing replay primary key on %',table_::text;
  end if;
  if exists(select 1 from pg_constraint where conrelid=table_ and not convalidated) then
    raise exception 'Unvalidated replay constraint on %',table_::text;
  end if;
end;
$$;
revoke all on all functions in schema sun_geometry_internal from public,anon,authenticated,service_role;
grant execute on function
  sun_geometry_internal.sha(text),
  sun_geometry_internal.f64_hex(double precision[]),
  sun_geometry_internal.canonical_float64(numeric),
  sun_geometry_internal.canonical_json(jsonb),
  sun_geometry_internal.least_rotation_start(text[]),
  sun_geometry_internal.canonical_ring(jsonb),
  sun_geometry_internal.canonical_polygon(jsonb),
  sun_geometry_internal.assert_exact_keys(jsonb,text[],text),
  sun_geometry_internal.assert_polygon(jsonb),
  sun_geometry_internal.assert_engine_manifest(jsonb),
  sun_geometry_internal.assert_engine_manifest_replay(jsonb),
  sun_geometry_internal.assert_geometry_input(text,text),
  sun_geometry_internal.assert_geometry_input(text,text,boolean),
  sun_geometry_internal.validate_day_payload(public.sun_geometry_days,integer,double precision),
  sun_geometry_internal.generation_digest(text),
  sun_geometry_internal.release_digest(text),
  sun_geometry_internal.assert_release(text),
  sun_geometry_internal.assert_release(text,boolean)
to service_role;
create or replace function sun_geometry_internal.catalog_fingerprint() returns text
language sql stable set search_path=pg_catalog,information_schema as $$
  with geometry_tables as (
    select c.oid,c.relname,c.relrowsecurity,c.relforcerowsecurity
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relname like 'sun_geometry_%'
  ), contract_rows as (
    select 'table' kind, relname||'|'||relrowsecurity||'|'||relforcerowsecurity detail from geometry_tables
    union all
    select 'column',t.relname||'|'||a.attname||'|'||format_type(a.atttypid,a.atttypmod)||'|'||a.attnotnull||'|'||a.attidentity::text||'|'||a.attgenerated::text||'|'||coalesce(pg_get_expr(d.adbin,d.adrelid,true),'-')
      from geometry_tables t join pg_attribute a on a.attrelid=t.oid and a.attnum>0 and not a.attisdropped
      left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
    union all
    -- PostgreSQL assigns different names to equivalent unnamed CHECKs when an
    -- additive replay follows an earlier migration. The executable definition,
    -- validation and deferrability are the contract; generated names are not.
    select 'constraint',t.relname||'|'||c.contype::text||'|'||c.convalidated||'|'||c.condeferrable||'|'||c.condeferred||'|'||pg_get_constraintdef(c.oid,true)
      from geometry_tables t join pg_constraint c on c.conrelid=t.oid
    union all
    select 'index',t.relname||'|'||i.relname||'|'||pg_get_indexdef(i.oid)
      from geometry_tables t join pg_index x on x.indrelid=t.oid join pg_class i on i.oid=x.indexrelid
    union all
    select 'trigger',t.relname||'|'||g.tgname||'|'||g.tgenabled::text||'|'||pg_get_triggerdef(g.oid,true)
      from geometry_tables t join pg_trigger g on g.tgrelid=t.oid where not g.tgisinternal
    union all
    select 'policy',p.tablename||'|'||p.policyname||'|'||p.permissive||'|'||p.roles::text||'|'||p.cmd||'|'||coalesce(p.qual,'-')||'|'||coalesce(p.with_check,'-')
      from information_schema.tables q join pg_policies p on p.schemaname=q.table_schema and p.tablename=q.table_name
      where q.table_schema='public' and q.table_name like 'sun_geometry_%'
    union all
    select 'grant',g.table_name||'|'||g.grantee||'|'||g.privilege_type||'|'||g.is_grantable
      from information_schema.role_table_grants g where g.table_schema='public' and g.table_name like 'sun_geometry_%'
        and g.grantee in ('PUBLIC','anon','authenticated','service_role')
    union all
    select 'function',n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')|'||(p.proowner=current_user::regrole)::text||'|'||pg_get_functiondef(p.oid)
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='sun_geometry_internal' and p.proname<>'catalog_fingerprint'
    union all
    select 'function_acl',n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')|'||coalesce(grantee.rolname,'PUBLIC')||'|'||acl.privilege_type||'|'||acl.is_grantable
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
      left join pg_roles grantee on grantee.oid=acl.grantee
      where n.nspname='sun_geometry_internal' and p.proname<>'catalog_fingerprint'
    union all
    select 'schema','sun_geometry_internal|'||(n.nspowner=current_user::regrole)::text
      from pg_namespace n where n.nspname='sun_geometry_internal'
    union all
    select 'schema_acl','sun_geometry_internal|'||coalesce(grantee.rolname,'PUBLIC')||'|'||acl.privilege_type||'|'||acl.is_grantable
      from pg_namespace n cross join lateral aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) acl
      left join pg_roles grantee on grantee.oid=acl.grantee where n.nspname='sun_geometry_internal'
    union all
    select 'extension',e.extname||'|'||e.extversion from pg_extension e where e.extname in ('postgis')
  )
  select sun_geometry_internal.sha(string_agg(kind||'|'||detail,E'\n' order by kind,detail collate "C")) from contract_rows;
$$;
revoke all on function sun_geometry_internal.catalog_fingerprint() from public,anon,authenticated,service_role;
select sun_geometry_internal.assert_table_shape('public.sun_geometry_engine_versions',array['id','canonical_manifest'],array['id','canonical_manifest']);
select sun_geometry_internal.assert_table_shape('public.sun_geometry_inputs',array['input_hash','engine_id','canonical_input'],array['input_hash','engine_id','canonical_input']);
select sun_geometry_internal.assert_table_shape('public.sun_geometry_seasons',array['season_year','start_date','end_date','timezone','engine_id','format_version','hash_version','created_at','supported_elevation_degrees','base_step_ms','probe_step_ms','crossing_bracket_ms','status','expected_venues','expected_days','verified_at','updated_at','checksum','release_notes'],array['season_year','start_date','end_date','timezone','engine_id','format_version','hash_version','created_at','supported_elevation_degrees','base_step_ms','probe_step_ms','crossing_bracket_ms','status','expected_venues','expected_days','updated_at']);
select sun_geometry_internal.assert_table_shape('public.sun_geometry_input_revisions',array['venue_id','revision','committed_hash','staged_hash','dirty','updated_at'],array['venue_id','revision','dirty','updated_at']);
select sun_geometry_internal.assert_table_shape('public.sun_geometry_venue_generations',array['id','season_year','engine_id','venue_id','input_hash','source_revision','format_version','run_id','status','expected_days','completed_days','sample_count','checksum','created_at','verified_at'],array['id','season_year','engine_id','venue_id','input_hash','source_revision','format_version','run_id','status','expected_days','completed_days','sample_count','created_at']);
select sun_geometry_internal.assert_table_shape('public.sun_geometry_days',array['generation_id','stockholm_date','horizon','offsets','exposure','starts','ends','sunny','start_uncertainty_ms','end_uncertainty_ms','sample_count','checksum'],array['generation_id','stockholm_date','offsets','exposure','starts','ends','sunny','start_uncertainty_ms','end_uncertainty_ms','sample_count','checksum']);
select sun_geometry_internal.assert_table_shape('public.sun_geometry_releases',array['id','season_year','engine_id','status','expected_venues','completed_venues','expected_days','completed_days','sample_count','validation_digest','checksum','created_at','verified_at'],array['id','season_year','engine_id','status','expected_venues','completed_venues','expected_days','completed_days','sample_count','created_at']);
select sun_geometry_internal.assert_table_shape('public.sun_geometry_release_members',array['release_id','venue_id','generation_id'],array['release_id','venue_id','generation_id']);
select sun_geometry_internal.assert_table_shape('public.sun_geometry_current_pointers',array['season_year','release_id','rollback_release_id','updated_at'],array['season_year','release_id','rollback_release_id','updated_at']);
select sun_geometry_internal.assert_table_shape('public.sun_geometry_evidence_references',array['evidence_id','generation_id','legacy_g1_hash','weather_evidence_id','classifier_version','created_at'],array['evidence_id','created_at']);
select sun_geometry_internal.assert_table_shape('public.sun_geometry_worker_leases',array['slot','owner_id','fencing_token','heartbeat_at','expires_at'],array['slot','owner_id','fencing_token','heartbeat_at','expires_at']);
do $$ begin
  if not exists(select 1 from pg_extension where extname='postgis' and extversion like '3.5%') then
    raise exception 'Incompatible PostGIS extension contract';
  end if;
  if not exists(select 1 from pg_namespace where nspname='sun_geometry_internal' and nspowner=current_user::regrole) then
    raise exception 'Incompatible internal schema owner';
  end if;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='sun_geometry_internal' and p.proowner<>current_user::regrole) then
    raise exception 'Incompatible internal function owner';
  end if;
  if exists(select 1 from pg_namespace n
    cross join lateral aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) acl
    left join pg_roles r on r.oid=acl.grantee
    where n.nspname='sun_geometry_internal' and acl.privilege_type='USAGE'
      and (acl.grantee=0 or r.rolname in ('anon','authenticated'))) then
    raise exception 'Incompatible internal schema ACL';
  end if;
end $$;
commit;
