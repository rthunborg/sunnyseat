-- Story 12.1 review iteration 6: make remediation ownership non-null and
-- exact, derive request identity at the database boundary, refuse terminal
-- run reopening, constrain bounded failure markers, and route all review-state
-- mutation through service-only SECURITY DEFINER RPCs.

create or replace function public.is_valid_hours_review_persistence_failures(
  p_failures jsonb
)
returns boolean
language plpgsql
immutable
security invoker
set search_path = public, pg_temp
as $$
declare
  marker jsonb;
  marker_key_count integer;
  marker_count integer;
  distinct_venue_count integer;
begin
  if p_failures is null
     or jsonb_typeof(p_failures) <> 'array'
     or jsonb_array_length(p_failures) > 100 then
    return false;
  end if;

  for marker in select value from jsonb_array_elements(p_failures)
  loop
    if jsonb_typeof(marker) <> 'object' then
      return false;
    end if;
    select count(*)::integer
    into marker_key_count
    from jsonb_object_keys(marker);
    if marker_key_count <> 2
       or not (marker ? 'venueId')
       or not (marker ? 'venueSlug')
       or jsonb_typeof(marker -> 'venueId') <> 'string'
       or jsonb_typeof(marker -> 'venueSlug') <> 'string'
       or char_length(marker ->> 'venueId') not between 1 and 200
       or char_length(marker ->> 'venueSlug') not between 1 and 200
       or marker ->> 'venueId' <> btrim(marker ->> 'venueId')
       or marker ->> 'venueSlug' <> btrim(marker ->> 'venueSlug') then
      return false;
    end if;
  end loop;

  select
    count(*)::integer,
    count(distinct item ->> 'venueId')::integer
  into marker_count, distinct_venue_count
  from jsonb_array_elements(p_failures) item;
  return marker_count = distinct_venue_count;
end;
$$;

-- Converge identity rows created through the older nullable seam. Historical
-- operational evidence remains available; only its missing ownership token is
-- replaced with a deterministic migration-owned identifier.
update public.hours_review_runs
set remediation_input_fingerprint = lpad(
      md5(id || ':legacy-remediation-input'),
      64,
      '0'
    ),
    remediation_claim_identity = lpad(
      md5(id || ':legacy-remediation-claim'),
      64,
      '0'
    )
where trigger_type = 'remediation'
  and (
    remediation_input_fingerprint is null
    or remediation_claim_identity is null
  );

update public.hours_review_runs
set remediation_input_fingerprint = null,
    remediation_claim_identity = null
where trigger_type <> 'remediation'
  and (
    remediation_input_fingerprint is not null
    or remediation_claim_identity is not null
  );

update public.hours_review_runs
set outcome_persistence_failure_count =
      jsonb_array_length(outcome_persistence_failures)
where public.is_valid_hours_review_persistence_failures(
  outcome_persistence_failures
);

update public.hours_review_runs
set outcome_persistence_failure_count = 0,
    outcome_persistence_failures = '[]'::jsonb
where not public.is_valid_hours_review_persistence_failures(
  outcome_persistence_failures
);

alter table public.hours_review_runs
  drop constraint if exists hours_review_runs_remediation_identity_check,
  drop constraint if exists hours_review_runs_persistence_failures_check;

alter table public.hours_review_runs
  add constraint hours_review_runs_remediation_identity_check
    check (
      (
        trigger_type = 'remediation'
        and remediation_input_fingerprint is not null
        and remediation_claim_identity is not null
        and remediation_input_fingerprint ~ '^[a-f0-9]{64}$'
        and remediation_claim_identity ~ '^[a-f0-9]{64}$'
      )
      or (
        trigger_type <> 'remediation'
        and remediation_input_fingerprint is null
        and remediation_claim_identity is null
      )
    ) not valid,
  add constraint hours_review_runs_persistence_failures_check
    check (
      outcome_persistence_failure_count
        = jsonb_array_length(outcome_persistence_failures)
      and outcome_persistence_failure_count between 0 and 100
      and public.is_valid_hours_review_persistence_failures(
        outcome_persistence_failures
      )
    ) not valid;

alter table public.hours_review_runs
  validate constraint hours_review_runs_remediation_identity_check,
  validate constraint hours_review_runs_persistence_failures_check;

create or replace function public.hours_remediation_fingerprint_part(
  p_value text
)
returns text
language sql
immutable
security invoker
set search_path = public, pg_temp
as $$
  select case
    when p_value is null then '-1:'
    else octet_length(p_value)::text || ':' || p_value
  end;
$$;

-- The canonical request encoding is a fixed-order, length-prefixed UTF-8
-- sequence. opening_hours is normalized to the one-interval JSON contract;
-- timestamps deliberately remain the exact submitted offset-ISO strings.
create or replace function public.hours_remediation_request_fingerprint(
  p_request jsonb
)
returns text
language sql
immutable
security definer
set search_path = public, pg_temp
as $$
  select encode(
    sha256(
      convert_to(
        array_to_string(
          array[
            public.hours_remediation_fingerprint_part(
              p_request ->> 'venue_id'
            ),
            public.hours_remediation_fingerprint_part(
              p_request ->> 'venue_slug'
            ),
            public.hours_remediation_fingerprint_part(
              case
                when p_request -> 'opening_hours' is null
                  or p_request -> 'opening_hours' = 'null'::jsonb
                then null
                else regexp_replace(
                  (p_request -> 'opening_hours')::text,
                  '[[:space:]]',
                  '',
                  'g'
                )
              end
            ),
            public.hours_remediation_fingerprint_part(
              p_request ->> 'source_type'
            ),
            public.hours_remediation_fingerprint_part(
              p_request ->> 'source_reference'
            ),
            public.hours_remediation_fingerprint_part(
              p_request ->> 'review_status'
            ),
            public.hours_remediation_fingerprint_part(
              p_request ->> 'reviewed_at'
            ),
            public.hours_remediation_fingerprint_part(
              p_request ->> 'next_review_at'
            ),
            public.hours_remediation_fingerprint_part(
              p_request ->> 'notes'
            ),
            public.hours_remediation_fingerprint_part(
              p_request ->> 'review_reason'
            ),
            public.hours_remediation_fingerprint_part(
              p_request ->> 'last_error_class'
            ),
            public.hours_remediation_fingerprint_part(
              p_request ->> 'outcome'
            ),
            public.hours_remediation_fingerprint_part(
              p_request ->> 'reason'
            ),
            public.hours_remediation_fingerprint_part(
              p_request ->> 'error_class'
            ),
            public.hours_remediation_fingerprint_part(
              p_request ->> 'expected_updated_at'
            )
          ],
          E'\x1f'
        ),
        'UTF8'
      )
    ),
    'hex'
  );
$$;

create or replace function public.is_hours_review_run_active(
  p_run_id text,
  p_expected_trigger_type text,
  p_remediation_input_fingerprint text,
  p_remediation_claim_identity text
)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.hours_review_runs r
    where p_run_id is not null
      and p_expected_trigger_type in ('manual', 'scheduled', 'remediation')
      and r.id = p_run_id
      and r.status = 'running'
      and r.trigger_type = p_expected_trigger_type
      and r.lease_expires_at > clock_timestamp()
      and (
        (
          p_expected_trigger_type = 'remediation'
          and p_remediation_input_fingerprint is not null
          and p_remediation_claim_identity is not null
          and p_remediation_input_fingerprint ~ '^[a-f0-9]{64}$'
          and p_remediation_claim_identity ~ '^[a-f0-9]{64}$'
          and r.remediation_input_fingerprint =
            p_remediation_input_fingerprint
          and r.remediation_claim_identity =
            p_remediation_claim_identity
        )
        or (
          p_expected_trigger_type in ('manual', 'scheduled')
          and p_remediation_input_fingerprint is null
          and p_remediation_claim_identity is null
          and r.remediation_input_fingerprint is null
          and r.remediation_claim_identity is null
        )
      )
  );
$$;

-- The compatibility overload is the weekly-audit seam only. It cannot create
-- an unbound remediation run.
create or replace function public.claim_hours_review_run(
  p_run_id text,
  p_trigger_type text,
  p_started_at timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  database_now timestamptz;
  existing_status text;
  existing_trigger text;
  existing_lease timestamptz;
  active_run_id text;
  active_lease timestamptz;
  c record;
  snapshot record;
  inserted_count integer;
begin
  if p_run_id is null
     or p_trigger_type not in ('manual', 'scheduled') then
    return false;
  end if;

  select status, trigger_type, lease_expires_at
  into existing_status, existing_trigger, existing_lease
  from public.hours_review_runs
  where id = p_run_id
  for update;
  database_now := clock_timestamp();

  if found then
    return existing_status = 'running'
      and existing_trigger = p_trigger_type
      and existing_lease > database_now;
  end if;

  select id, lease_expires_at
  into active_run_id, active_lease
  from public.hours_review_runs
  where status = 'running'
  order by started_at, id
  limit 1
  for update;
  database_now := clock_timestamp();

  if active_run_id is not null and active_lease > database_now then
    return false;
  end if;

  if active_run_id is not null then
    select
      count(*)::integer as total_count,
      count(*) filter (where outcome = 'current')::integer as current_count,
      count(*) filter (
        where outcome = 'missing_provenance'
      )::integer as missing_provenance_count,
      count(*) filter (where outcome = 'due')::integer as due_count,
      count(*) filter (where outcome = 'unknown')::integer as unknown_count,
      count(*) filter (
        where outcome = 'conflicting'
      )::integer as conflicting_count,
      count(*) filter (where outcome = 'split')::integer as split_count,
      count(*) filter (where outcome = 'failed')::integer as failed_count,
      count(*) filter (where outcome = 'stale')::integer as stale_count
    into c
    from public.hours_review_outcomes
    where run_id = active_run_id;

    update public.hours_review_runs
    set status = 'failed',
        finished_at = database_now,
        lease_expires_at = database_now,
        total_count = c.total_count,
        current_count = c.current_count,
        missing_provenance_count = c.missing_provenance_count,
        due_count = c.due_count,
        unknown_count = c.unknown_count,
        conflicting_count = c.conflicting_count,
        split_count = c.split_count,
        failed_count = c.failed_count,
        stale_count = c.stale_count
    where id = active_run_id and status = 'running';
  end if;

  select * into snapshot
  from public.hours_venue_population_snapshot();
  database_now := clock_timestamp();

  insert into public.hours_review_runs (
    id,
    trigger_type,
    status,
    started_at,
    lease_expires_at,
    venue_population_count,
    venue_population_identity_fingerprint,
    venue_population_state_fingerprint,
    remediation_input_fingerprint,
    remediation_claim_identity
  ) values (
    p_run_id,
    p_trigger_type,
    'running',
    database_now,
    database_now + interval '15 minutes',
    snapshot.venue_count,
    snapshot.identity_fingerprint,
    snapshot.state_fingerprint,
    null,
    null
  )
  on conflict do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
end;
$$;

-- Exact remediation ownership is inserted atomically. A matching active run
-- reconciles response loss, while expired or terminal same-ID rows are never
-- reopened with a stale outcome set.
create or replace function public.claim_hours_review_run(
  p_run_id text,
  p_trigger_type text,
  p_started_at timestamptz,
  p_remediation_input_fingerprint text,
  p_remediation_claim_identity text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing_run public.hours_review_runs%rowtype;
  database_now timestamptz;
  active_run_id text;
  active_lease timestamptz;
  c record;
  snapshot record;
  inserted_count integer;
begin
  if p_run_id is null
     or p_trigger_type <> 'remediation'
     or p_remediation_input_fingerprint is null
     or p_remediation_claim_identity is null
     or p_remediation_input_fingerprint !~ '^[a-f0-9]{64}$'
     or p_remediation_claim_identity !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  select *
  into existing_run
  from public.hours_review_runs
  where id = p_run_id
  for update;
  database_now := clock_timestamp();
  if found then
    return existing_run.status = 'running'
      and existing_run.lease_expires_at > database_now
      and existing_run.trigger_type = 'remediation'
      and existing_run.remediation_input_fingerprint =
        p_remediation_input_fingerprint
      and existing_run.remediation_claim_identity =
        p_remediation_claim_identity;
  end if;

  select id, lease_expires_at
  into active_run_id, active_lease
  from public.hours_review_runs
  where status = 'running'
  order by started_at, id
  limit 1
  for update;
  database_now := clock_timestamp();

  if active_run_id is not null and active_lease > database_now then
    return false;
  end if;

  if active_run_id is not null then
    select
      count(*)::integer as total_count,
      count(*) filter (where outcome = 'current')::integer as current_count,
      count(*) filter (
        where outcome = 'missing_provenance'
      )::integer as missing_provenance_count,
      count(*) filter (where outcome = 'due')::integer as due_count,
      count(*) filter (where outcome = 'unknown')::integer as unknown_count,
      count(*) filter (
        where outcome = 'conflicting'
      )::integer as conflicting_count,
      count(*) filter (where outcome = 'split')::integer as split_count,
      count(*) filter (where outcome = 'failed')::integer as failed_count,
      count(*) filter (where outcome = 'stale')::integer as stale_count
    into c
    from public.hours_review_outcomes
    where run_id = active_run_id;

    update public.hours_review_runs
    set status = 'failed',
        finished_at = database_now,
        lease_expires_at = database_now,
        total_count = c.total_count,
        current_count = c.current_count,
        missing_provenance_count = c.missing_provenance_count,
        due_count = c.due_count,
        unknown_count = c.unknown_count,
        conflicting_count = c.conflicting_count,
        split_count = c.split_count,
        failed_count = c.failed_count,
        stale_count = c.stale_count
    where id = active_run_id and status = 'running';
  end if;

  select * into snapshot
  from public.hours_venue_population_snapshot();
  database_now := clock_timestamp();

  insert into public.hours_review_runs (
    id,
    trigger_type,
    status,
    started_at,
    lease_expires_at,
    venue_population_count,
    venue_population_identity_fingerprint,
    venue_population_state_fingerprint,
    remediation_input_fingerprint,
    remediation_claim_identity,
    outcome_persistence_failure_count,
    outcome_persistence_failures
  ) values (
    p_run_id,
    'remediation',
    'running',
    database_now,
    database_now + interval '15 minutes',
    snapshot.venue_count,
    snapshot.identity_fingerprint,
    snapshot.state_fingerprint,
    p_remediation_input_fingerprint,
    p_remediation_claim_identity,
    0,
    '[]'::jsonb
  )
  on conflict do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
end;
$$;

create or replace function public.renew_hours_review_run_lease(
  p_run_id text,
  p_remediation_input_fingerprint text,
  p_remediation_claim_identity text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  database_now timestamptz;
begin
  if p_run_id is null
     or p_remediation_input_fingerprint is null
     or p_remediation_claim_identity is null
     or p_remediation_input_fingerprint !~ '^[a-f0-9]{64}$'
     or p_remediation_claim_identity !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  perform 1
  from public.hours_review_runs r
  where r.id = p_run_id
    and r.status = 'running'
    and r.trigger_type = 'remediation'
    and r.remediation_input_fingerprint =
      p_remediation_input_fingerprint
    and r.remediation_claim_identity = p_remediation_claim_identity
    and r.lease_expires_at > clock_timestamp()
  for update;
  database_now := clock_timestamp();
  if not found then
    return false;
  end if;

  update public.hours_review_runs
  set lease_expires_at = database_now + interval '15 minutes'
  where id = p_run_id
    and status = 'running'
    and remediation_input_fingerprint =
      p_remediation_input_fingerprint
    and remediation_claim_identity = p_remediation_claim_identity;
  return found;
end;
$$;

create or replace function public.record_hours_review_persistence_failure(
  p_run_id text,
  p_venue_id text,
  p_venue_slug text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  canonical_slug text;
  failures jsonb;
  database_now timestamptz;
begin
  if p_run_id is null
     or p_venue_id is null
     or p_venue_slug is null then
    return false;
  end if;

  select slug
  into canonical_slug
  from public.venues
  where id = p_venue_id;
  if not found or canonical_slug is distinct from p_venue_slug then
    return false;
  end if;

  select outcome_persistence_failures
  into failures
  from public.hours_review_runs
  where id = p_run_id
    and status = 'running'
    and lease_expires_at > clock_timestamp()
  for update;
  database_now := clock_timestamp();
  if not found then
    return false;
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(failures) item
    where item ->> 'venueId' = p_venue_id
  )
     and jsonb_array_length(failures) < 100 then
    update public.hours_review_runs
    set outcome_persistence_failures =
          outcome_persistence_failures || jsonb_build_array(
            jsonb_build_object(
              'venueId', p_venue_id,
              'venueSlug', p_venue_slug
            )
          ),
        outcome_persistence_failure_count =
          outcome_persistence_failure_count + 1,
        lease_expires_at = database_now + interval '15 minutes'
    where id = p_run_id and status = 'running';
  end if;
  return true;
end;
$$;

-- Internal exact-request seam. The caller fingerprint is compared with the
-- database digest before the existing guarded atomic write is reached.
create or replace function public.apply_hours_remediation_request(
  p_run_id text,
  p_remediation_input_fingerprint text,
  p_remediation_claim_identity text,
  p_request jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_key_count integer;
  computed_fingerprint text;
  existing_outcome public.hours_review_outcomes%rowtype;
  current_updated_at timestamptz;
begin
  if p_run_id is null
     or p_remediation_input_fingerprint is null
     or p_remediation_claim_identity is null
     or p_remediation_input_fingerprint !~ '^[a-f0-9]{64}$'
     or p_remediation_claim_identity !~ '^[a-f0-9]{64}$'
     or p_request is null
     or jsonb_typeof(p_request) <> 'object' then
    return false;
  end if;

  select count(*)::integer
  into request_key_count
  from jsonb_object_keys(p_request);
  if request_key_count <> 16
     or exists (
       select 1
       from jsonb_object_keys(p_request) as request_keys(request_key)
       where request_key <> all (
         array[
           'venue_id',
           'venue_slug',
           'opening_hours',
           'source_type',
           'source_reference',
           'review_status',
           'reviewed_at',
           'next_review_at',
           'notes',
           'review_reason',
           'last_error_class',
           'outcome',
           'reason',
           'error_class',
           'expected_updated_at',
           'request_fingerprint'
         ]
       )
     ) then
    return false;
  end if;

  computed_fingerprint :=
    public.hours_remediation_request_fingerprint(p_request);
  if p_request ->> 'request_fingerprint' is null
     or p_request ->> 'request_fingerprint' !~ '^[a-f0-9]{64}$'
     or p_request ->> 'request_fingerprint'
       <> computed_fingerprint
     or p_request ->> 'expected_updated_at' is null
     or p_request ->> 'expected_updated_at'
       !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?(Z|[+-][0-9]{2}:[0-9]{2})$'
     or (
       p_request ->> 'reviewed_at' is not null
       and p_request ->> 'reviewed_at'
         !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?(Z|[+-][0-9]{2}:[0-9]{2})$'
     )
     or (
       p_request ->> 'next_review_at' is not null
       and p_request ->> 'next_review_at'
         !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?(Z|[+-][0-9]{2}:[0-9]{2})$'
     )
     or not public.is_hours_review_run_active(
       p_run_id,
       'remediation',
       p_remediation_input_fingerprint,
       p_remediation_claim_identity
     ) then
    return false;
  end if;

  select updated_at
  into current_updated_at
  from public.venues
  where id = p_request ->> 'venue_id'
    and slug = p_request ->> 'venue_slug'
  for update;
  if not found then
    return false;
  end if;

  select *
  into existing_outcome
  from public.hours_review_outcomes
  where run_id = p_run_id
    and venue_id = p_request ->> 'venue_id';
  if found then
    return existing_outcome.venue_slug = p_request ->> 'venue_slug'
      and existing_outcome.outcome = p_request ->> 'outcome'
      and existing_outcome.reason = p_request ->> 'reason'
      and existing_outcome.error_class is not distinct from
        p_request ->> 'error_class'
      and existing_outcome.resulting_review_status is not distinct from
        p_request ->> 'review_status'
      and existing_outcome.remediation_input_fingerprint =
        p_remediation_input_fingerprint
      and existing_outcome.remediation_request_fingerprint =
        computed_fingerprint
      and existing_outcome.resulting_venue_updated_at
        is not distinct from current_updated_at;
  end if;

  return public.apply_hours_remediation_outcome(
    p_run_id,
    p_remediation_input_fingerprint,
    p_remediation_claim_identity,
    computed_fingerprint,
    p_request ->> 'venue_id',
    p_request ->> 'venue_slug',
    case
      when p_request -> 'opening_hours' = 'null'::jsonb then null
      else p_request -> 'opening_hours'
    end,
    p_request ->> 'source_type',
    p_request ->> 'source_reference',
    p_request ->> 'review_status',
    (p_request ->> 'reviewed_at')::timestamptz,
    (p_request ->> 'next_review_at')::timestamptz,
    p_request ->> 'notes',
    p_request ->> 'review_reason',
    p_request ->> 'last_error_class',
    p_request ->> 'outcome',
    p_request ->> 'reason',
    p_request ->> 'error_class',
    (p_request ->> 'expected_updated_at')::timestamptz
  );
exception
  when invalid_datetime_format or datetime_field_overflow then
    return false;
end;
$$;

create or replace function public.apply_hours_remediation_batch(
  p_run_id text,
  p_remediation_input_fingerprint text,
  p_remediation_claim_identity text,
  p_requests jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parent_population_count integer;
  parent_identity text;
  request_count integer;
  distinct_request_count integer;
  snapshot record;
  request jsonb;
  applied boolean;
  canonical_slug text;
  prior_status text;
  prior_updated_at timestamptz;
  canonical_request_fingerprint text;
begin
  if p_run_id is null
     or p_remediation_input_fingerprint is null
     or p_remediation_claim_identity is null
     or p_remediation_input_fingerprint !~ '^[a-f0-9]{64}$'
     or p_remediation_claim_identity !~ '^[a-f0-9]{64}$'
     or p_requests is null
     or jsonb_typeof(p_requests) <> 'array' then
    return false;
  end if;

  select venue_population_count, venue_population_identity_fingerprint
  into parent_population_count, parent_identity
  from public.hours_review_runs
  where id = p_run_id
    and status = 'running'
    and trigger_type = 'remediation'
    and remediation_input_fingerprint =
      p_remediation_input_fingerprint
    and remediation_claim_identity = p_remediation_claim_identity
    and lease_expires_at > clock_timestamp()
  for update;
  if not found then
    return false;
  end if;

  select count(*)::integer, count(distinct item ->> 'venue_id')::integer
  into request_count, distinct_request_count
  from jsonb_array_elements(p_requests) item;

  select * into snapshot from public.hours_venue_population_snapshot();
  if request_count <> parent_population_count
     or distinct_request_count <> parent_population_count
     or snapshot.venue_count <> parent_population_count
     or snapshot.identity_fingerprint is distinct from parent_identity
     or exists (
       select 1
       from public.venues v
       where not exists (
         select 1
         from jsonb_array_elements(p_requests) item
         where item ->> 'venue_id' = v.id
       )
     ) then
    return false;
  end if;

  for request in select value from jsonb_array_elements(p_requests)
  loop
    update public.hours_review_runs
    set lease_expires_at = clock_timestamp() + interval '15 minutes'
    where id = p_run_id
      and status = 'running'
      and remediation_input_fingerprint =
        p_remediation_input_fingerprint
      and remediation_claim_identity = p_remediation_claim_identity;
    if not found then
      return false;
    end if;

    begin
      applied := public.apply_hours_remediation_request(
        p_run_id,
        p_remediation_input_fingerprint,
        p_remediation_claim_identity,
        request
      );
      if applied then
        continue;
      end if;
    exception
      when others then
        applied := false;
    end;

    canonical_request_fingerprint :=
      public.hours_remediation_request_fingerprint(request);
    select slug, hours_review_status, updated_at
    into canonical_slug, prior_status, prior_updated_at
    from public.venues
    where id = request ->> 'venue_id';

    if found then
      insert into public.hours_review_outcomes as existing (
        run_id,
        venue_id,
        venue_slug,
        outcome,
        reason,
        error_class,
        prior_review_status,
        resulting_review_status,
        prior_venue_updated_at,
        resulting_venue_updated_at,
        remediation_input_fingerprint,
        remediation_request_fingerprint
      ) values (
        p_run_id,
        request ->> 'venue_id',
        canonical_slug,
        'failed',
        'classification_failed',
        'validation_failed',
        prior_status,
        prior_status,
        prior_updated_at,
        prior_updated_at,
        p_remediation_input_fingerprint,
        canonical_request_fingerprint
      )
      on conflict (run_id, venue_id) do update
      set venue_slug = excluded.venue_slug,
          outcome = excluded.outcome,
          reason = excluded.reason,
          error_class = excluded.error_class,
          prior_review_status = existing.prior_review_status,
          resulting_review_status = excluded.resulting_review_status,
          prior_venue_updated_at = existing.prior_venue_updated_at,
          resulting_venue_updated_at =
            excluded.resulting_venue_updated_at,
          remediation_input_fingerprint =
            excluded.remediation_input_fingerprint,
          remediation_request_fingerprint =
            excluded.remediation_request_fingerprint;
    end if;
  end loop;
  return true;
end;
$$;

-- Mutation RPCs execute with their owner after this migration; the service role
-- retains only bounded reads plus explicit RPC execution.
alter function public.persist_hours_review_outcome(
  text, text, text, text, text, text, text, text
) security definer;
alter function public.renew_hours_review_run_lease(text) security definer;
alter function public.finish_hours_review_run(
  text, text, timestamptz,
  integer, integer, integer, integer, integer, integer, integer, integer, integer
) security definer;
alter function public.fail_hours_review_run(
  text, timestamptz
) security definer;
alter function public.prune_hours_review_history(
  timestamptz
) security definer;
alter function public.apply_hours_remediation_outcome(
  text, text, text, jsonb, text, text, text, timestamptz, timestamptz,
  text, text, text, text, text, text, timestamptz
) security definer;
alter function public.apply_hours_remediation_outcome(
  text, text, text, text, text, text, jsonb, text, text, text,
  timestamptz, timestamptz, text, text, text, text, text, text, timestamptz
) security definer;

revoke insert, update, delete
  on table public.hours_review_runs
  from public, anon, authenticated, service_role;
revoke insert, update, delete
  on table public.hours_review_outcomes
  from public, anon, authenticated, service_role;
revoke usage, select, update
  on sequence public.hours_review_outcomes_id_seq
  from public, anon, authenticated, service_role;
grant select on table public.hours_review_runs to service_role;
grant select on table public.hours_review_outcomes to service_role;

revoke all on function public.is_valid_hours_review_persistence_failures(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.hours_remediation_fingerprint_part(text)
  from public, anon, authenticated, service_role;
revoke all on function public.hours_remediation_request_fingerprint(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.apply_hours_remediation_request(
  text, text, text, jsonb
) from public, anon, authenticated, service_role;

revoke all on function public.claim_hours_review_run(
  text, text, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function public.claim_hours_review_run(
  text, text, timestamptz, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.renew_hours_review_run_lease(text)
  from public, anon, authenticated, service_role;
revoke all on function public.renew_hours_review_run_lease(
  text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.persist_hours_review_outcome(
  text, text, text, text, text, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.record_hours_review_persistence_failure(
  text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.finish_hours_review_run(
  text, text, timestamptz,
  integer, integer, integer, integer, integer, integer, integer, integer, integer
) from public, anon, authenticated, service_role;
revoke all on function public.fail_hours_review_run(text, timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function public.prune_hours_review_history(timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function public.apply_hours_remediation_outcome(
  text, text, text, jsonb, text, text, text, timestamptz, timestamptz,
  text, text, text, text, text, text, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function public.apply_hours_remediation_outcome(
  text, text, text, text, text, text, jsonb, text, text, text,
  timestamptz, timestamptz, text, text, text, text, text, text, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function public.apply_hours_remediation_batch(
  text, text, text, jsonb
) from public, anon, authenticated, service_role;

grant execute on function public.claim_hours_review_run(
  text, text, timestamptz
) to service_role;
grant execute on function public.hours_remediation_request_fingerprint(jsonb)
  to service_role;
grant execute on function public.claim_hours_review_run(
  text, text, timestamptz, text, text
) to service_role;
grant execute on function public.renew_hours_review_run_lease(text)
  to service_role;
grant execute on function public.renew_hours_review_run_lease(
  text, text, text
) to service_role;
grant execute on function public.persist_hours_review_outcome(
  text, text, text, text, text, text, text, text
) to service_role;
grant execute on function public.record_hours_review_persistence_failure(
  text, text, text
) to service_role;
grant execute on function public.finish_hours_review_run(
  text, text, timestamptz,
  integer, integer, integer, integer, integer, integer, integer, integer, integer
) to service_role;
grant execute on function public.fail_hours_review_run(text, timestamptz)
  to service_role;
grant execute on function public.prune_hours_review_history(timestamptz)
  to service_role;
grant execute on function public.apply_hours_remediation_batch(
  text, text, text, jsonb
) to service_role;

comment on function public.hours_remediation_request_fingerprint(jsonb) is
  'Canonical fixed-order SHA-256 digest for one exact remediation request.';
comment on function public.claim_hours_review_run(
  text, text, timestamptz, text, text
) is
  'Claims one exactly bound remediation run; active matching claims reconcile, terminal and expired same-ID rows never reopen.';
comment on column public.hours_review_runs.outcome_persistence_failures is
  'At most 100 unique bounded {venueId, venueSlug} operational markers; count equals array length.';
