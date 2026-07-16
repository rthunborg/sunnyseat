-- Story 12.1 review iteration 5: close exact remediation ownership,
-- per-venue isolation, database-clock lease reconciliation, bounded missing
-- outcome evidence, and forward convergence without discarding valid hours.

alter table public.hours_review_runs
  add column if not exists remediation_input_fingerprint text,
  add column if not exists remediation_claim_identity text,
  add column if not exists outcome_persistence_failure_count integer
    not null default 0,
  add column if not exists outcome_persistence_failures jsonb
    not null default '[]'::jsonb;

alter table public.hours_review_outcomes
  add column if not exists remediation_input_fingerprint text;

alter table public.hours_review_runs
  drop constraint if exists hours_review_runs_remediation_identity_check,
  drop constraint if exists hours_review_runs_persistence_failures_check;

alter table public.hours_review_runs
  add constraint hours_review_runs_remediation_identity_check
    check (
      (
        remediation_input_fingerprint is null
        and remediation_claim_identity is null
      )
      or (
        trigger_type = 'remediation'
        and remediation_input_fingerprint ~ '^[a-f0-9]{64}$'
        and remediation_claim_identity ~ '^[a-f0-9]{64}$'
      )
    ) not valid,
  add constraint hours_review_runs_persistence_failures_check
    check (
      outcome_persistence_failure_count between 0 and 100000
      and jsonb_typeof(outcome_persistence_failures) = 'array'
      and jsonb_array_length(outcome_persistence_failures) <= 100
    ) not valid;

alter table public.hours_review_runs
  validate constraint hours_review_runs_remediation_identity_check,
  validate constraint hours_review_runs_persistence_failures_check;

-- Notes are not canonical evidence. The guarded write seam accepts only a
-- bounded opaque identifier; older free-form notes are removed independently
-- while schedules and their manually collected provenance remain untouched.
create or replace function public.is_safe_hours_note(
  p_note text
)
returns boolean
language sql
immutable
security invoker
set search_path = public, pg_temp
as $$
  select p_note is null
    or (
      char_length(p_note) between 6 and 205
      and p_note ~ '^note:[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
    );
$$;

update public.venues
set hours_notes = null,
    updated_at = clock_timestamp()
where hours_notes is not null
  and not public.is_safe_hours_note(hours_notes);

-- Hours-audit concurrency should react only to identity and governed hours
-- state, never to unrelated venue copy, geometry, media, or tags.
create or replace function public.hours_venue_population_snapshot()
returns table (
  venue_count integer,
  identity_fingerprint text,
  state_fingerprint text
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    count(*)::integer,
    md5(coalesce(
      string_agg(
        jsonb_build_array(v.id, v.slug)::text,
        E'\x1e' order by v.id
      ),
      ''
    )),
    md5(coalesce(
      string_agg(
        jsonb_build_array(
          v.id,
          v.slug,
          v.opening_hours,
          v.hours_source_type,
          v.hours_source_reference,
          v.hours_review_status,
          v.hours_reviewed_at,
          v.hours_next_review_at,
          v.hours_review_reason,
          v.hours_last_error_class,
          v.hours_notes
        )::text,
        E'\x1e' order by v.id
      ),
      ''
    ))
  from public.venues v;
$$;

-- Existing future review timestamps are converged with an explicit operation
-- and outcome trail. Canonical hours and source evidence are preserved.
create temporary table hours_review_time_convergence_candidates
as
select
  v.id,
  v.slug,
  v.hours_review_status,
  v.hours_review_reason,
  v.hours_last_error_class,
  v.updated_at
from public.venues v
where v.hours_reviewed_at > clock_timestamp();

do $$
declare
  candidate_count integer;
  database_now timestamptz := clock_timestamp();
  snapshot record;
  c record;
begin
  select count(*)::integer
  into candidate_count
  from hours_review_time_convergence_candidates;
  if candidate_count = 0 then
    return;
  end if;

  if exists (
    select 1 from public.hours_review_runs where status = 'running'
  ) then
    raise exception
      'hours-review-time-convergence requires no concurrent active review run';
  end if;

  select * into snapshot from public.hours_venue_population_snapshot();

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
    'hours-review-time-convergence-20260716121208',
    'remediation',
    'running',
    database_now,
    database_now + interval '15 minutes',
    snapshot.venue_count,
    snapshot.identity_fingerprint,
    snapshot.state_fingerprint,
    repeat('1', 64),
    repeat('2', 64)
  );

  insert into public.hours_review_outcomes (
    run_id,
    venue_id,
    venue_slug,
    outcome,
    reason,
    error_class,
    prior_review_status,
    resulting_review_status,
    prior_venue_updated_at,
    remediation_input_fingerprint,
    remediation_request_fingerprint
  )
  select
    'hours-review-time-convergence-20260716121208',
    c.id,
    c.slug,
    case
      when c.hours_review_status in ('verified', 'due') then 'due'
      when c.hours_review_status = 'unknown' then 'unknown'
      when c.hours_review_status = 'manual_review'
        and c.hours_review_reason = 'unsupported_split' then 'split'
      when c.hours_review_status = 'manual_review'
        and c.hours_review_reason = 'provenance_conflict' then 'conflicting'
      else 'failed'
    end,
    case
      when c.hours_review_status in ('verified', 'due') then 'review_due'
      when c.hours_review_status = 'unknown' then 'hours_unknown'
      when c.hours_review_status = 'manual_review'
        and c.hours_review_reason = 'unsupported_split'
        then 'unsupported_split'
      when c.hours_review_status = 'manual_review'
        and c.hours_review_reason = 'provenance_conflict'
        then 'provenance_conflict'
      when c.hours_review_status = 'manual_review'
        and c.hours_review_reason in (
          'unsupported_24_7',
          'unsupported_seasonal',
          'unsupported_holiday_specific'
        ) then c.hours_review_reason
      when c.hours_review_status = 'failed' then 'prior_failure'
      else 'classification_failed'
    end,
    case
      when c.hours_review_status in ('verified', 'due', 'unknown')
        or (
          c.hours_review_status = 'manual_review'
          and c.hours_review_reason in (
            'unsupported_split', 'provenance_conflict'
          )
        ) then null
      else coalesce(c.hours_last_error_class, 'validation_failed')
    end,
    c.hours_review_status,
    case
      when c.hours_review_status = 'verified' then 'due'
      else c.hours_review_status
    end,
    c.updated_at,
    repeat('1', 64),
    lpad(md5(c.id || ':time-convergence'), 64, '0')
  from hours_review_time_convergence_candidates c;

  update public.venues v
  set hours_review_status = case
        when v.hours_review_status = 'verified' then 'due'
        else v.hours_review_status
      end,
      hours_reviewed_at = database_now,
      hours_next_review_at = greatest(
        coalesce(v.hours_next_review_at, database_now),
        database_now
      ),
      updated_at = database_now
  where exists (
    select 1
    from hours_review_time_convergence_candidates c
    where c.id = v.id
  );

  update public.hours_review_outcomes o
  set resulting_venue_updated_at = v.updated_at
  from public.venues v
  where o.run_id = 'hours-review-time-convergence-20260716121208'
    and v.id = o.venue_id;

  select
    count(*)::integer as total_count,
    count(*) filter (where outcome = 'due')::integer as due_count,
    count(*) filter (where outcome = 'unknown')::integer as unknown_count,
    count(*) filter (where outcome = 'conflicting')::integer as conflicting_count,
    count(*) filter (where outcome = 'split')::integer as split_count,
    count(*) filter (where outcome = 'failed')::integer as failed_count
  into c
  from public.hours_review_outcomes
  where run_id = 'hours-review-time-convergence-20260716121208';

  update public.hours_review_runs
  set status = case
        when c.failed_count > 0 then 'completed_with_failures'
        else 'completed'
      end,
      finished_at = database_now,
      lease_expires_at = database_now,
      total_count = c.total_count,
      due_count = c.due_count,
      unknown_count = c.unknown_count,
      conflicting_count = c.conflicting_count,
      split_count = c.split_count,
      failed_count = c.failed_count
  where id = 'hours-review-time-convergence-20260716121208';
end;
$$;

drop table hours_review_time_convergence_candidates;

-- Forward convergence for any still-present reference that the opaque
-- identifier contract rejects. Evidence is recorded before the schedule is
-- removed; a note-policy violation alone never enters this inventory.
create temporary table hours_review_source_convergence_candidates
as
select
  v.id,
  v.slug,
  v.hours_review_status,
  v.updated_at
from public.venues v
where v.hours_source_reference is not null
  and not public.is_safe_hours_source_reference(v.hours_source_reference);

do $$
declare
  candidate_count integer;
  database_now timestamptz := clock_timestamp();
  snapshot record;
begin
  select count(*)::integer
  into candidate_count
  from hours_review_source_convergence_candidates;
  if candidate_count = 0 then
    return;
  end if;

  if exists (
    select 1 from public.hours_review_runs where status = 'running'
  ) then
    raise exception
      'hours-review-source-convergence requires no concurrent active review run';
  end if;

  select * into snapshot from public.hours_venue_population_snapshot();

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
    'hours-review-source-convergence-20260716121208',
    'remediation',
    'running',
    database_now,
    database_now + interval '15 minutes',
    snapshot.venue_count,
    snapshot.identity_fingerprint,
    snapshot.state_fingerprint,
    repeat('3', 64),
    repeat('4', 64)
  );

  insert into public.hours_review_outcomes (
    run_id,
    venue_id,
    venue_slug,
    outcome,
    reason,
    error_class,
    prior_review_status,
    resulting_review_status,
    prior_venue_updated_at,
    remediation_input_fingerprint,
    remediation_request_fingerprint
  )
  select
    'hours-review-source-convergence-20260716121208',
    c.id,
    c.slug,
    'unknown',
    'provenance_removed',
    null,
    c.hours_review_status,
    'unknown',
    c.updated_at,
    repeat('3', 64),
    lpad(md5(c.id || ':source-convergence'), 64, '0')
  from hours_review_source_convergence_candidates c;

  update public.venues v
  set opening_hours = null,
      hours_source_type = null,
      hours_source_reference = null,
      hours_review_status = 'unknown',
      hours_reviewed_at = null,
      hours_next_review_at = null,
      hours_review_reason = null,
      hours_last_error_class = null,
      hours_notes = null,
      updated_at = database_now
  where exists (
    select 1
    from hours_review_source_convergence_candidates c
    where c.id = v.id
  );

  update public.hours_review_outcomes o
  set resulting_venue_updated_at = v.updated_at
  from public.venues v
  where o.run_id = 'hours-review-source-convergence-20260716121208'
    and v.id = o.venue_id;

  update public.hours_review_runs
  set status = 'completed',
      finished_at = database_now,
      lease_expires_at = database_now,
      total_count = candidate_count,
      unknown_count = candidate_count
  where id = 'hours-review-source-convergence-20260716121208';
end;
$$;

drop table hours_review_source_convergence_candidates;

-- The database-clock invariant applies to every insert and update. This also
-- catches generic service-role writes that do not name a provenance column.
drop trigger if exists venues_enforce_hours_review_time on public.venues;
create trigger venues_enforce_hours_review_time
before insert or update on public.venues
for each row execute function public.enforce_venue_hours_review_time();

-- Return database-owned ownership state; callers never compare database
-- timestamps with a client clock.
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
    where r.id = p_run_id
      and r.status = 'running'
      and r.trigger_type = p_expected_trigger_type
      and r.lease_expires_at > clock_timestamp()
      and (
        p_remediation_input_fingerprint is null
        or r.remediation_input_fingerprint =
          p_remediation_input_fingerprint
      )
      and (
        p_remediation_claim_identity is null
        or r.remediation_claim_identity = p_remediation_claim_identity
      )
  );
$$;

-- Exact remediation claims are resumable for the same deterministic input and
-- identity. Expired or terminal same-input runs can be reopened safely because
-- every per-venue outcome is independently fingerprinted.
create or replace function public.claim_hours_review_run(
  p_run_id text,
  p_trigger_type text,
  p_started_at timestamptz,
  p_remediation_input_fingerprint text,
  p_remediation_claim_identity text
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  existing_run public.hours_review_runs%rowtype;
  database_now timestamptz;
  claimed boolean;
begin
  if p_trigger_type <> 'remediation'
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
    if existing_run.trigger_type <> 'remediation'
       or existing_run.remediation_input_fingerprint
          is distinct from p_remediation_input_fingerprint
       or existing_run.remediation_claim_identity
          is distinct from p_remediation_claim_identity then
      return false;
    end if;

    if existing_run.status = 'running'
       and existing_run.lease_expires_at > database_now then
      return true;
    end if;

    if exists (
      select 1
      from public.hours_review_runs
      where status = 'running' and id <> p_run_id
    ) then
      return false;
    end if;

    update public.hours_review_runs
    set status = 'running',
        started_at = least(started_at, database_now),
        finished_at = null,
        lease_expires_at = database_now + interval '15 minutes',
        total_count = 0,
        current_count = 0,
        missing_provenance_count = 0,
        due_count = 0,
        unknown_count = 0,
        conflicting_count = 0,
        split_count = 0,
        failed_count = 0,
        stale_count = 0
    where id = p_run_id;
    return true;
  end if;

  claimed := public.claim_hours_review_run(
    p_run_id,
    p_trigger_type,
    p_started_at
  );
  if not claimed then
    return false;
  end if;

  update public.hours_review_runs
  set remediation_input_fingerprint = p_remediation_input_fingerprint,
      remediation_claim_identity = p_remediation_claim_identity
  where id = p_run_id
    and status = 'running'
    and trigger_type = 'remediation';
  return found;
end;
$$;

create or replace function public.renew_hours_review_run_lease(
  p_run_id text,
  p_remediation_input_fingerprint text,
  p_remediation_claim_identity text
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  database_now timestamptz;
begin
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
  where id = p_run_id and status = 'running';
  return found;
end;
$$;

-- Bounded operational evidence for a population member whose identical
-- outcome write could not be confirmed after two attempts.
create or replace function public.record_hours_review_persistence_failure(
  p_run_id text,
  p_venue_id text,
  p_venue_slug text
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  canonical_slug text;
  failures jsonb;
  database_now timestamptz;
begin
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
  ) then
    update public.hours_review_runs
    set outcome_persistence_failure_count =
          outcome_persistence_failure_count + 1,
        outcome_persistence_failures = case
          when jsonb_array_length(outcome_persistence_failures) < 100
          then outcome_persistence_failures || jsonb_build_array(
            jsonb_build_object(
              'venueId', p_venue_id,
              'venueSlug', p_venue_slug
            )
          )
          else outcome_persistence_failures
        end,
        lease_expires_at = database_now + interval '15 minutes'
    where id = p_run_id and status = 'running';
  end if;
  return true;
end;
$$;

-- The stronger overload delegates canonical state validation to the existing
-- guarded write seam, then enforces exact run/request identity and prevents a
-- manual_review/failed row from preserving a schedule unless the immediately
-- prior state was independently verified or due.
create or replace function public.apply_hours_remediation_outcome(
  p_run_id text,
  p_remediation_input_fingerprint text,
  p_remediation_claim_identity text,
  p_request_fingerprint text,
  p_venue_id text,
  p_venue_slug text,
  p_opening_hours jsonb,
  p_source_type text,
  p_source_reference text,
  p_review_status text,
  p_reviewed_at timestamptz,
  p_next_review_at timestamptz,
  p_notes text,
  p_review_reason text,
  p_last_error_class text,
  p_outcome text,
  p_reason text,
  p_error_class text,
  p_expected_updated_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing_outcome public.hours_review_outcomes%rowtype;
  prior_status text;
  prior_updated_at timestamptz;
  prior_match public.hours_review_outcomes%rowtype;
  applied boolean;
  resulting_updated_at timestamptz;
begin
  if p_remediation_input_fingerprint !~ '^[a-f0-9]{64}$'
     or p_remediation_claim_identity !~ '^[a-f0-9]{64}$'
     or p_request_fingerprint !~ '^[a-f0-9]{64}$'
     or not public.is_safe_hours_note(p_notes)
     or not public.is_hours_review_run_active(
       p_run_id,
       'remediation',
       p_remediation_input_fingerprint,
       p_remediation_claim_identity
     ) then
    return false;
  end if;

  select hours_review_status, updated_at
  into prior_status, prior_updated_at
  from public.venues
  where id = p_venue_id
  for update;
  if not found then
    return false;
  end if;

  select *
  into existing_outcome
  from public.hours_review_outcomes
  where run_id = p_run_id and venue_id = p_venue_id;
  if found then
    return existing_outcome.venue_slug = p_venue_slug
      and existing_outcome.remediation_input_fingerprint =
        p_remediation_input_fingerprint
      and existing_outcome.remediation_request_fingerprint =
        p_request_fingerprint
      and existing_outcome.resulting_venue_updated_at
        is not distinct from prior_updated_at;
  end if;

  if p_expected_updated_at is null
     or prior_updated_at is distinct from p_expected_updated_at then
    select o.*
    into prior_match
    from public.hours_review_outcomes o
    join public.hours_review_runs r on r.id = o.run_id
    where r.trigger_type = 'remediation'
      and r.status <> 'running'
      and o.venue_id = p_venue_id
      and o.venue_slug = p_venue_slug
      and o.remediation_input_fingerprint =
        p_remediation_input_fingerprint
      and o.remediation_request_fingerprint = p_request_fingerprint
      and o.prior_venue_updated_at is not distinct from p_expected_updated_at
      and o.resulting_venue_updated_at is not distinct from prior_updated_at
    order by o.created_at desc, o.id desc
    limit 1;
    if not found then
      return false;
    end if;

    insert into public.hours_review_outcomes (
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
      p_venue_id,
      p_venue_slug,
      prior_match.outcome,
      prior_match.reason,
      prior_match.error_class,
      prior_match.prior_review_status,
      prior_match.resulting_review_status,
      prior_match.prior_venue_updated_at,
      prior_match.resulting_venue_updated_at,
      p_remediation_input_fingerprint,
      p_request_fingerprint
    );
    return true;
  end if;

  applied := public.apply_hours_remediation_outcome(
    p_run_id,
    p_venue_id,
    p_venue_slug,
    p_opening_hours,
    p_source_type,
    p_source_reference,
    p_review_status,
    p_reviewed_at,
    p_next_review_at,
    p_notes,
    p_review_reason,
    p_last_error_class,
    p_outcome,
    p_reason,
    p_error_class,
    p_expected_updated_at
  );
  if not applied then
    return false;
  end if;

  if p_review_status in ('manual_review', 'failed')
     and not (prior_status in ('verified', 'due')) then
    update public.venues
    set opening_hours = p_opening_hours,
        hours_source_type = p_source_type,
        hours_source_reference = p_source_reference,
        hours_review_status = p_review_status,
        hours_reviewed_at = p_reviewed_at,
        hours_next_review_at = p_next_review_at,
        hours_notes = p_notes,
        hours_review_reason = p_review_reason,
        hours_last_error_class = p_last_error_class
    where id = p_venue_id;
  end if;

  select updated_at
  into resulting_updated_at
  from public.venues
  where id = p_venue_id;

  update public.hours_review_outcomes
  set remediation_input_fingerprint = p_remediation_input_fingerprint,
      remediation_request_fingerprint = p_request_fingerprint,
      resulting_venue_updated_at = resulting_updated_at
  where run_id = p_run_id and venue_id = p_venue_id;
  return found;
end;
$$;

-- Complete-population validation remains run-level, while each venue mutation
-- and outcome is atomic inside its own exception block. A stale/incoherent row
-- receives a bounded failed outcome and the loop continues.
create or replace function public.apply_hours_remediation_batch(
  p_run_id text,
  p_remediation_input_fingerprint text,
  p_remediation_claim_identity text,
  p_requests jsonb
)
returns boolean
language plpgsql
security invoker
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
  database_now timestamptz;
begin
  if p_requests is null or jsonb_typeof(p_requests) <> 'array' then
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
  database_now := clock_timestamp();
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
      applied := public.apply_hours_remediation_outcome(
        p_run_id,
        p_remediation_input_fingerprint,
        p_remediation_claim_identity,
        request ->> 'request_fingerprint',
        request ->> 'venue_id',
        request ->> 'venue_slug',
        case
          when request -> 'opening_hours' = 'null'::jsonb then null
          else request -> 'opening_hours'
        end,
        request ->> 'source_type',
        request ->> 'source_reference',
        request ->> 'review_status',
        (request ->> 'reviewed_at')::timestamptz,
        (request ->> 'next_review_at')::timestamptz,
        request ->> 'notes',
        request ->> 'review_reason',
        request ->> 'last_error_class',
        request ->> 'outcome',
        request ->> 'reason',
        request ->> 'error_class',
        (request ->> 'expected_updated_at')::timestamptz
      );
      if applied then
        continue;
      end if;
    exception
      when others then
        applied := false;
    end;

    select slug, hours_review_status, updated_at
    into canonical_slug, prior_status, prior_updated_at
    from public.venues
    where id = request ->> 'venue_id';

    if found then
      insert into public.hours_review_outcomes (
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
        request ->> 'request_fingerprint'
      )
      on conflict (run_id, venue_id) do nothing;
    end if;
    continue;
  end loop;
  return true;
end;
$$;

-- Retire the weaker service-callable remediation overloads. They remain in the
-- schema only so the forward migration need not rewrite already-applied files.
revoke all on function public.apply_hours_remediation_batch(text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.apply_hours_remediation_outcome(
  text, text, text, jsonb, text, text, text, timestamptz, timestamptz,
  text, text, text, text, text, text, timestamptz
) from public, anon, authenticated, service_role;

revoke all on function public.is_hours_review_run_active(
  text, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.claim_hours_review_run(
  text, text, timestamptz, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.renew_hours_review_run_lease(
  text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.record_hours_review_persistence_failure(
  text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.apply_hours_remediation_outcome(
  text, text, text, text, text, text, jsonb, text, text, text,
  timestamptz, timestamptz, text, text, text, text, text, text, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function public.apply_hours_remediation_batch(
  text, text, text, jsonb
) from public, anon, authenticated, service_role;

grant execute on function public.is_hours_review_run_active(
  text, text, text, text
) to service_role;
grant execute on function public.claim_hours_review_run(
  text, text, timestamptz, text, text
) to service_role;
grant execute on function public.renew_hours_review_run_lease(
  text, text, text
) to service_role;
grant execute on function public.record_hours_review_persistence_failure(
  text, text, text
) to service_role;
grant execute on function public.apply_hours_remediation_outcome(
  text, text, text, text, text, text, jsonb, text, text, text,
  timestamptz, timestamptz, text, text, text, text, text, text, timestamptz
) to service_role;
grant execute on function public.apply_hours_remediation_batch(
  text, text, text, jsonb
) to service_role;

comment on function public.apply_hours_remediation_batch(
  text, text, text, jsonb
) is
  'Applies a bound remediation population with per-venue atomicity and exact input/request fingerprints.';
comment on column public.hours_review_runs.outcome_persistence_failures is
  'Bounded operational evidence for population members whose outcome write could not be confirmed.';
