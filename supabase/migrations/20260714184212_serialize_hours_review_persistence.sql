-- Story 12.1 review iteration 3: serialize outcome persistence with terminal
-- run transitions, use database time for leases/retention, reject stale
-- remediation snapshots, and enforce the canonical weekly-hours JSON shape.
-- The accepted hours_review_outcomes.venue_id ON DELETE CASCADE decision and
-- the explicit public.venues safe-column grants are deliberately unchanged.

-- -------------------------------------------------------------------------
-- Canonical weekly-hours shape and precise pre-validation convergence.
-- -------------------------------------------------------------------------

create or replace function public.is_canonical_weekly_opening_hours(
  p_hours jsonb
)
returns boolean
language plpgsql
immutable
security invoker
set search_path = public, pg_temp
as $$
declare
  weekday text;
  interval_value jsonb;
begin
  if p_hours is null then
    return true;
  end if;

  if jsonb_typeof(p_hours) <> 'object' then
    return false;
  end if;

  for weekday, interval_value in
    select key, value from jsonb_each(p_hours)
  loop
    if weekday !~ '^[1-7]$' then
      return false;
    end if;

    if jsonb_typeof(interval_value) = 'null' then
      continue;
    end if;

    if jsonb_typeof(interval_value) <> 'object'
       or not (interval_value ? 'open')
       or not (interval_value ? 'close')
       or (select count(*) from jsonb_object_keys(interval_value)) <> 2
       or jsonb_typeof(interval_value -> 'open') <> 'string'
       or jsonb_typeof(interval_value -> 'close') <> 'string'
       or (interval_value ->> 'open') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or (interval_value ->> 'close') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or (interval_value ->> 'open') = (interval_value ->> 'close') then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

revoke all on function public.is_canonical_weekly_opening_hours(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.is_canonical_weekly_opening_hours(jsonb)
  to service_role;

-- On an idempotent replay the active-parent trigger already exists. DDL takes
-- an exclusive table lock for the transaction, so temporarily remove it while
-- this migration appends bounded convergence evidence to its terminal run.
drop trigger if exists hours_review_outcomes_active_parent
  on public.hours_review_outcomes;

drop table if exists pg_temp.story_12_1_convergence_inventory;
create temporary table story_12_1_convergence_inventory as
select
  v.id,
  v.slug,
  v.hours_review_status as prior_review_status,
  array_remove(array[
    case
      when not public.is_canonical_weekly_opening_hours(v.opening_hours)
      then 'invalid_opening_hours_shape'
    end,
    case
      when v.hours_source_type is not null
       and v.hours_source_type not in (
         'venue_confirmed', 'venue_website', 'licensed_provider', 'manual'
       )
      then 'invalid_source_type'
    end,
    case
      when v.hours_review_status is not null
       and v.hours_review_status not in (
         'verified', 'due', 'manual_review', 'unknown', 'failed'
       )
      then 'invalid_review_status'
    end,
    case
      when v.hours_source_reference is not null
       and not (
         char_length(v.hours_source_reference) between 1 and 500
         and btrim(v.hours_source_reference) <> ''
         and v.hours_source_reference !~ E'[\r\n]'
         and v.hours_source_reference !~* '(https?://|www\.|provider-payload|regular.?opening.?hours|(^|[?&;:_-])(api[_-]?key|key|token|secret)=)'
       )
      then 'unsafe_source_reference'
    end,
    case
      when v.hours_notes is not null
       and not (
         char_length(v.hours_notes) <= 1000
         and v.hours_notes !~* '(https?://|www\.|provider[[:space:]_-]*payload|regular[[:space:]_-]*opening[[:space:]_-]*hours|(^|[?&;:[:space:]_-])(api[_-]?key|key|token|secret)[[:space:]]*=)'
       )
      then 'unsafe_notes'
    end,
    case
      when v.hours_review_reason is not null
       and v.hours_review_reason not in (
         'provenance_conflict', 'unsupported_split', 'unsupported_24_7',
         'unsupported_seasonal', 'unsupported_holiday_specific',
         'classification_failed'
       )
      then 'invalid_review_reason'
    end,
    case
      when v.hours_last_error_class is not null
       and v.hours_last_error_class not in (
         'read_failed', 'validation_failed', 'database_error', 'unexpected'
       )
      then 'invalid_error_class'
    end,
    case
      when v.hours_reviewed_at is not null
       and v.hours_next_review_at is not null
       and v.hours_next_review_at < v.hours_reviewed_at
      then 'invalid_review_dates'
    end,
    case
      when num_nonnulls(
        v.hours_source_type,
        v.hours_source_reference,
        v.hours_reviewed_at,
        v.hours_next_review_at
      ) not in (0, 4)
      then 'partial_provenance'
    end,
    case
      when not (
        (
          v.opening_hours is null
          or (
            v.hours_source_type is not null
            and v.hours_source_reference is not null
            and btrim(v.hours_source_reference) <> ''
            and v.hours_review_status in (
              'verified', 'due', 'manual_review', 'failed'
            )
            and v.hours_reviewed_at is not null
            and v.hours_next_review_at is not null
          )
        )
        and (
          v.hours_review_status is distinct from 'unknown'
          or v.opening_hours is null
        )
        and (
          v.hours_review_status is distinct from 'manual_review'
          or v.hours_review_reason is not null
        )
        and (
          v.hours_review_status is distinct from 'failed'
          or v.hours_last_error_class is not null
        )
        and (
          v.hours_review_status is distinct from 'verified'
          or (
            v.opening_hours is not null
            and v.hours_review_reason is null
            and v.hours_last_error_class is null
          )
        )
      )
      then 'incoherent_review_state'
    end
  ]::text[], null) as diagnostic_codes
from public.venues v;

delete from story_12_1_convergence_inventory
where cardinality(diagnostic_codes) = 0;

do $$
declare
  inventory jsonb;
begin
  select jsonb_agg(
    jsonb_build_object(
      'venue_id', id,
      'venue_slug', slug,
      'diagnostic_codes', diagnostic_codes
    ) order by id
  )
  into inventory
  from story_12_1_convergence_inventory;

  if inventory is null then
    raise notice 'Story 12.1 convergence inventory: 0 invalid venues';
  else
    raise notice 'Story 12.1 convergence inventory: %', inventory;
  end if;
end;
$$;

insert into public.hours_review_runs (
  id,
  trigger_type,
  status,
  started_at,
  finished_at,
  lease_expires_at,
  total_count,
  failed_count
)
select
  'hours-convergence-migration-20260714184212',
  'remediation',
  'completed_with_failures',
  clock_timestamp(),
  clock_timestamp(),
  clock_timestamp(),
  count(*)::integer,
  count(*)::integer
from story_12_1_convergence_inventory
having count(*) > 0
on conflict (id) do nothing;

insert into public.hours_review_outcomes (
  run_id,
  venue_id,
  venue_slug,
  outcome,
  reason,
  error_class,
  prior_review_status,
  resulting_review_status
)
select
  'hours-convergence-migration-20260714184212',
  id,
  slug,
  'failed',
  'classification_failed',
  'validation_failed',
  case
    when prior_review_status in (
      'verified', 'due', 'manual_review', 'unknown', 'failed'
    ) then prior_review_status
    else null
  end,
  'unknown'
from story_12_1_convergence_inventory
on conflict (run_id, venue_id) do nothing;

with migration_counts as (
  select
    count(*)::integer as total_count,
    count(*) filter (where outcome = 'failed')::integer as failed_count
  from public.hours_review_outcomes
  where run_id = 'hours-convergence-migration-20260714184212'
)
update public.hours_review_runs r
set status = 'completed_with_failures',
    finished_at = clock_timestamp(),
    lease_expires_at = clock_timestamp(),
    total_count = c.total_count,
    current_count = 0,
    missing_provenance_count = 0,
    due_count = 0,
    unknown_count = 0,
    conflicting_count = 0,
    split_count = 0,
    failed_count = c.failed_count,
    stale_count = 0
from migration_counts c
where r.id = 'hours-convergence-migration-20260714184212';

-- Every inventoried state converges through the same fail-closed operation.
-- The bounded outcome above preserves affected venue identity; the deployment
-- NOTICE preserves the precise diagnostic-code inventory without putting
-- source content, schedules, notes, or credentials in audit storage.
update public.venues v
set opening_hours = null,
    hours_source_type = null,
    hours_source_reference = null,
    hours_review_status = 'unknown',
    hours_reviewed_at = null,
    hours_next_review_at = null,
    hours_notes = null,
    hours_review_reason = null,
    hours_last_error_class = null,
    updated_at = clock_timestamp()
from story_12_1_convergence_inventory i
where v.id = i.id;

alter table public.venues
  drop constraint if exists venues_opening_hours_shape_check;

alter table public.venues
  add constraint venues_opening_hours_shape_check
  check (public.is_canonical_weekly_opening_hours(opening_hours)) not valid;

alter table public.venues
  validate constraint venues_hours_source_reference_policy_check,
  validate constraint venues_hours_notes_policy_check,
  validate constraint venues_hours_review_reason_check,
  validate constraint venues_hours_state_coherence_check,
  validate constraint venues_opening_hours_shape_check;

-- The version used by remediation must advance for every hours/governance edit,
-- including direct SQL authoring outside the remediation RPC.
create or replace function public.touch_venue_hours_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists venues_touch_hours_updated_at on public.venues;
create trigger venues_touch_hours_updated_at
before update of
  opening_hours,
  hours_source_type,
  hours_source_reference,
  hours_review_status,
  hours_reviewed_at,
  hours_next_review_at,
  hours_notes,
  hours_review_reason,
  hours_last_error_class
on public.venues
for each row execute function public.touch_venue_hours_updated_at();

revoke all on function public.touch_venue_hours_updated_at()
  from public, anon, authenticated, service_role;

-- Record the before/after venue versions used for exact idempotent retries.
alter table public.hours_review_outcomes
  add column if not exists prior_venue_updated_at timestamptz,
  add column if not exists resulting_venue_updated_at timestamptz,
  add column if not exists remediation_request_fingerprint text;

-- -------------------------------------------------------------------------
-- Active-parent serialization for every outcome write path.
-- -------------------------------------------------------------------------

create or replace function public.enforce_active_hours_review_outcome_parent()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  parent_status text;
  parent_lease_expires_at timestamptz;
  database_now timestamptz := clock_timestamp();
begin
  select status, lease_expires_at
  into parent_status, parent_lease_expires_at
  from public.hours_review_runs
  where id = new.run_id
  for update;

  if not found
     or parent_status <> 'running'
     or parent_lease_expires_at <= database_now then
    raise check_violation
      using message = 'hours review outcome requires an active unexpired parent run';
  end if;

  return new;
end;
$$;

drop trigger if exists hours_review_outcomes_active_parent
  on public.hours_review_outcomes;
create trigger hours_review_outcomes_active_parent
before insert or update on public.hours_review_outcomes
for each row execute function public.enforce_active_hours_review_outcome_parent();

revoke all on function public.enforce_active_hours_review_outcome_parent()
  from public, anon, authenticated, service_role;

create or replace function public.persist_hours_review_outcome(
  p_run_id text,
  p_venue_id text,
  p_venue_slug text,
  p_outcome text,
  p_reason text,
  p_error_class text default null,
  p_prior_review_status text default null,
  p_resulting_review_status text default null
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  parent_status text;
  parent_lease_expires_at timestamptz;
  canonical_slug text;
  database_now timestamptz := clock_timestamp();
begin
  select status, lease_expires_at
  into parent_status, parent_lease_expires_at
  from public.hours_review_runs
  where id = p_run_id
  for update;

  if not found
     or parent_status <> 'running'
     or parent_lease_expires_at <= database_now then
    return false;
  end if;

  select slug
  into canonical_slug
  from public.venues
  where id = p_venue_id;

  if not found or canonical_slug is distinct from p_venue_slug then
    return false;
  end if;

  insert into public.hours_review_outcomes as existing (
    run_id,
    venue_id,
    venue_slug,
    outcome,
    reason,
    error_class,
    prior_review_status,
    resulting_review_status
  ) values (
    p_run_id,
    p_venue_id,
    p_venue_slug,
    p_outcome,
    p_reason,
    p_error_class,
    p_prior_review_status,
    p_resulting_review_status
  )
  on conflict (run_id, venue_id) do update
  set venue_slug = excluded.venue_slug,
      outcome = excluded.outcome,
      reason = excluded.reason,
      error_class = excluded.error_class,
      prior_review_status = coalesce(
        existing.prior_review_status,
        excluded.prior_review_status
      ),
      resulting_review_status = excluded.resulting_review_status;

  return true;
end;
$$;

-- -------------------------------------------------------------------------
-- Database-time leases, serialized terminal transitions, and retention.
-- -------------------------------------------------------------------------

create or replace function public.claim_hours_review_run(
  p_run_id text,
  p_trigger_type text,
  p_started_at timestamptz default now()
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  database_now timestamptz := clock_timestamp();
  stale_run_id text;
  c record;
  inserted_count integer;
begin
  -- p_started_at is retained only for RPC compatibility. Lease ownership and
  -- persisted timestamps come exclusively from the database clock.
  select id
  into stale_run_id
  from public.hours_review_runs
  where status = 'running'
    and lease_expires_at <= database_now
  order by started_at, id
  limit 1
  for update;

  if stale_run_id is not null then
    select
      count(*)::integer as total_count,
      count(*) filter (where outcome = 'current')::integer as current_count,
      count(*) filter (where outcome = 'missing_provenance')::integer as missing_provenance_count,
      count(*) filter (where outcome = 'due')::integer as due_count,
      count(*) filter (where outcome = 'unknown')::integer as unknown_count,
      count(*) filter (where outcome = 'conflicting')::integer as conflicting_count,
      count(*) filter (where outcome = 'split')::integer as split_count,
      count(*) filter (where outcome = 'failed')::integer as failed_count,
      count(*) filter (where outcome = 'stale')::integer as stale_count
    into c
    from public.hours_review_outcomes
    where run_id = stale_run_id;

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
    where id = stale_run_id and status = 'running';
  end if;

  insert into public.hours_review_runs (
    id,
    trigger_type,
    status,
    started_at,
    lease_expires_at
  ) values (
    p_run_id,
    p_trigger_type,
    'running',
    database_now,
    database_now + interval '15 minutes'
  ) on conflict do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
end;
$$;

create or replace function public.renew_hours_review_run_lease(
  p_run_id text
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  database_now timestamptz := clock_timestamp();
begin
  update public.hours_review_runs
  set lease_expires_at = database_now + interval '15 minutes'
  where id = p_run_id
    and trigger_type = 'remediation'
    and status = 'running'
    and lease_expires_at > database_now;

  return found;
end;
$$;

create or replace function public.finish_hours_review_run(
  p_run_id text,
  p_status text,
  p_finished_at timestamptz,
  p_total_count integer,
  p_current_count integer,
  p_missing_provenance_count integer,
  p_due_count integer,
  p_unknown_count integer,
  p_conflicting_count integer,
  p_split_count integer,
  p_failed_count integer,
  p_stale_count integer
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  parent_status text;
  parent_lease_expires_at timestamptz;
  database_now timestamptz := clock_timestamp();
  c record;
begin
  -- Lock the parent before aggregating children. Outcome writers lock the same
  -- row first, so no child can commit between this aggregate and transition.
  select status, lease_expires_at
  into parent_status, parent_lease_expires_at
  from public.hours_review_runs
  where id = p_run_id
  for update;

  if not found
     or parent_status <> 'running'
     or parent_lease_expires_at <= database_now
     or p_status not in ('completed', 'completed_with_failures') then
    return false;
  end if;

  select
    count(*)::integer as total_count,
    count(*) filter (where outcome = 'current')::integer as current_count,
    count(*) filter (where outcome = 'missing_provenance')::integer as missing_provenance_count,
    count(*) filter (where outcome = 'due')::integer as due_count,
    count(*) filter (where outcome = 'unknown')::integer as unknown_count,
    count(*) filter (where outcome = 'conflicting')::integer as conflicting_count,
    count(*) filter (where outcome = 'split')::integer as split_count,
    count(*) filter (where outcome = 'failed')::integer as failed_count,
    count(*) filter (where outcome = 'stale')::integer as stale_count
  into c
  from public.hours_review_outcomes
  where run_id = p_run_id;

  if p_total_count <> c.total_count
     or p_current_count <> c.current_count
     or p_missing_provenance_count <> c.missing_provenance_count
     or p_due_count <> c.due_count
     or p_unknown_count <> c.unknown_count
     or p_conflicting_count <> c.conflicting_count
     or p_split_count <> c.split_count
     or p_failed_count <> c.failed_count
     or p_stale_count <> c.stale_count
     or (c.failed_count = 0 and p_status <> 'completed')
     or (c.failed_count > 0 and p_status <> 'completed_with_failures') then
    return false;
  end if;

  update public.hours_review_runs
  set status = p_status,
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
  where id = p_run_id and status = 'running';

  return found;
end;
$$;

create or replace function public.fail_hours_review_run(
  p_run_id text,
  p_finished_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  parent_status text;
  database_now timestamptz := clock_timestamp();
  c record;
begin
  select status
  into parent_status
  from public.hours_review_runs
  where id = p_run_id
  for update;

  if not found or parent_status <> 'running' then
    return false;
  end if;

  select
    count(*)::integer as total_count,
    count(*) filter (where outcome = 'current')::integer as current_count,
    count(*) filter (where outcome = 'missing_provenance')::integer as missing_provenance_count,
    count(*) filter (where outcome = 'due')::integer as due_count,
    count(*) filter (where outcome = 'unknown')::integer as unknown_count,
    count(*) filter (where outcome = 'conflicting')::integer as conflicting_count,
    count(*) filter (where outcome = 'split')::integer as split_count,
    count(*) filter (where outcome = 'failed')::integer as failed_count,
    count(*) filter (where outcome = 'stale')::integer as stale_count
  into c
  from public.hours_review_outcomes
  where run_id = p_run_id;

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
  where id = p_run_id and status = 'running';

  return found;
end;
$$;

create or replace function public.prune_hours_review_history(
  p_cutoff timestamptz default (now() - interval '180 days')
)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  deleted_count integer;
  database_cutoff timestamptz := clock_timestamp() - interval '180 days';
begin
  -- p_cutoff remains in the signature for RPC compatibility but cannot make
  -- retention shorter or longer than the database-owned 180-day boundary.
  delete from public.hours_review_runs
  where coalesce(finished_at, started_at) < database_cutoff
    and status <> 'running';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- -------------------------------------------------------------------------
-- Slug/state validation and optimistic remediation concurrency.
-- -------------------------------------------------------------------------

drop function if exists public.apply_hours_remediation_outcome(
  text, text, text, jsonb, text, text, text, timestamptz, timestamptz,
  text, text, text, text, text, text
);

create or replace function public.apply_hours_remediation_outcome(
  p_run_id text,
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
security invoker
set search_path = public, pg_temp
as $$
declare
  database_now timestamptz := clock_timestamp();
  parent_status text;
  parent_lease_expires_at timestamptz;
  canonical_slug text;
  prior_status text;
  prior_updated_at timestamptz;
  prior_opening_hours jsonb;
  prior_source_type text;
  prior_source_reference text;
  prior_reviewed_at timestamptz;
  prior_next_review_at timestamptz;
  resulting_updated_at timestamptz;
  preserve_verified_schedule boolean;
  exact_retry boolean;
  request_fingerprint text;
begin
  request_fingerprint := md5(jsonb_build_array(
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
  )::text);

  select status, lease_expires_at
  into parent_status, parent_lease_expires_at
  from public.hours_review_runs
  where id = p_run_id
    and trigger_type = 'remediation'
  for update;

  if not found
     or parent_status <> 'running'
     or parent_lease_expires_at <= database_now then
    return false;
  end if;

  select
    slug,
    hours_review_status,
    updated_at,
    opening_hours,
    hours_source_type,
    hours_source_reference,
    hours_reviewed_at,
    hours_next_review_at
  into
    canonical_slug,
    prior_status,
    prior_updated_at,
    prior_opening_hours,
    prior_source_type,
    prior_source_reference,
    prior_reviewed_at,
    prior_next_review_at
  from public.venues
  where id = p_venue_id
  for update;

  if not found or canonical_slug is distinct from p_venue_slug then
    return false;
  end if;

  if p_expected_updated_at is null
     or prior_updated_at is distinct from p_expected_updated_at then
    select exists (
      select 1
      from public.hours_review_outcomes o
      where o.run_id = p_run_id
        and o.venue_id = p_venue_id
        and o.venue_slug = p_venue_slug
        and o.outcome = p_outcome
        and o.reason = p_reason
        and o.error_class is not distinct from p_error_class
        and o.resulting_review_status is not distinct from p_review_status
        and o.prior_venue_updated_at is not distinct from p_expected_updated_at
        and o.resulting_venue_updated_at is not distinct from prior_updated_at
        and o.remediation_request_fingerprint = request_fingerprint
    ) into exact_retry;

    return exact_retry;
  end if;

  -- Remediation accepts only the state/outcome combinations emitted by the
  -- canonical planner. Table constraints remain a second line of defense.
  if not (
    (
      p_review_status = 'verified'
      and p_opening_hours is not null
      and public.is_canonical_weekly_opening_hours(p_opening_hours)
      and p_source_type in (
        'venue_confirmed', 'venue_website', 'licensed_provider', 'manual'
      )
      and p_source_reference is not null
      and btrim(p_source_reference) <> ''
      and p_reviewed_at is not null
      and p_reviewed_at <= database_now
      and p_next_review_at >= p_reviewed_at
      and p_review_reason is null
      and p_last_error_class is null
      and p_outcome = 'current'
      and p_reason = 'review_current'
      and p_error_class is null
    )
    or (
      p_review_status = 'unknown'
      and p_opening_hours is null
      and (
        num_nonnulls(
          p_source_type,
          p_source_reference,
          p_reviewed_at,
          p_next_review_at
        ) = 0
        or (
          num_nonnulls(
            p_source_type,
            p_source_reference,
            p_reviewed_at,
            p_next_review_at
          ) = 4
          and p_source_type in (
            'venue_confirmed', 'venue_website', 'licensed_provider', 'manual'
          )
          and btrim(p_source_reference) <> ''
          and p_reviewed_at <= database_now
          and p_next_review_at >= p_reviewed_at
        )
      )
      and p_review_reason is null
      and p_last_error_class is null
      and p_outcome = 'unknown'
      and p_reason = 'hours_unknown'
      and p_error_class is null
    )
    or (
      p_review_status = 'manual_review'
      and p_opening_hours is null
      and p_review_reason in (
        'unsupported_split', 'unsupported_24_7',
        'unsupported_seasonal', 'unsupported_holiday_specific'
      )
      and p_last_error_class is null
      and (
        (
          p_review_reason = 'unsupported_split'
          and p_outcome = 'split'
          and p_reason = 'unsupported_split'
          and p_error_class is null
        )
        or (
          p_review_reason in (
            'unsupported_24_7', 'unsupported_seasonal',
            'unsupported_holiday_specific'
          )
          and p_outcome = 'failed'
          and p_reason = p_review_reason
          and p_error_class = 'validation_failed'
        )
      )
    )
    or (
      p_review_status = 'failed'
      and p_opening_hours is null
      and p_review_reason = 'classification_failed'
      and p_last_error_class = 'validation_failed'
      and p_outcome = 'failed'
      and p_reason = 'classification_failed'
      and p_error_class = 'validation_failed'
    )
  ) then
    return false;
  end if;

  preserve_verified_schedule :=
    p_review_status in ('manual_review', 'failed')
    and prior_opening_hours is not null
    and prior_source_type is not null
    and prior_source_reference is not null
    and btrim(prior_source_reference) <> ''
    and prior_reviewed_at is not null
    and prior_next_review_at is not null
    and prior_status in ('verified', 'due', 'manual_review', 'failed');

  if preserve_verified_schedule then
    update public.venues
    set hours_review_status = p_review_status,
        hours_notes = p_notes,
        hours_review_reason = p_review_reason,
        hours_last_error_class = p_last_error_class
    where id = p_venue_id;
  else
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
    remediation_request_fingerprint
  ) values (
    p_run_id,
    p_venue_id,
    p_venue_slug,
    p_outcome,
    p_reason,
    p_error_class,
    prior_status,
    p_review_status,
    prior_updated_at,
    resulting_updated_at,
    request_fingerprint
  )
  on conflict (run_id, venue_id) do update
  set venue_slug = excluded.venue_slug,
      outcome = excluded.outcome,
      reason = excluded.reason,
      error_class = excluded.error_class,
      prior_review_status = existing.prior_review_status,
      resulting_review_status = excluded.resulting_review_status,
      prior_venue_updated_at = existing.prior_venue_updated_at,
      resulting_venue_updated_at = excluded.resulting_venue_updated_at,
      remediation_request_fingerprint = excluded.remediation_request_fingerprint;

  return true;
end;
$$;

-- -------------------------------------------------------------------------
-- Restore least-privilege execution after every function replacement.
-- -------------------------------------------------------------------------

revoke all on function public.persist_hours_review_outcome(
  text, text, text, text, text, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.claim_hours_review_run(text, text, timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function public.renew_hours_review_run_lease(text)
  from public, anon, authenticated, service_role;
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

grant execute on function public.persist_hours_review_outcome(
  text, text, text, text, text, text, text, text
) to service_role;
grant execute on function public.claim_hours_review_run(text, text, timestamptz)
  to service_role;
grant execute on function public.renew_hours_review_run_lease(text)
  to service_role;
grant execute on function public.finish_hours_review_run(
  text, text, timestamptz,
  integer, integer, integer, integer, integer, integer, integer, integer, integer
) to service_role;
grant execute on function public.fail_hours_review_run(text, timestamptz)
  to service_role;
grant execute on function public.prune_hours_review_history(timestamptz)
  to service_role;
grant execute on function public.apply_hours_remediation_outcome(
  text, text, text, jsonb, text, text, text, timestamptz, timestamptz,
  text, text, text, text, text, text, timestamptz
) to service_role;

-- Reassert the existing service-table boundary without broadening venue reads
-- or granting DELETE on outcomes. Public safe-column grants remain untouched.
revoke all on table public.hours_review_runs
  from public, anon, authenticated, service_role;
revoke all on table public.hours_review_outcomes
  from public, anon, authenticated, service_role;
grant select, insert, update, delete
  on table public.hours_review_runs to service_role;
grant select, insert, update
  on table public.hours_review_outcomes to service_role;

comment on function public.persist_hours_review_outcome(
  text, text, text, text, text, text, text, text
) is 'Locks and rechecks the active parent before idempotently persisting one bounded outcome.';
comment on function public.prune_hours_review_history(timestamptz) is
  'Prunes terminal history only at the database-owned rolling 180-day cutoff; the argument is compatibility-only.';
comment on constraint venues_opening_hours_shape_check on public.venues is
  'Canonical ISO weekdays 1..7; null closed days; one distinct HH:MM open/close interval; SQL NULL unknown; {} all closed.';
