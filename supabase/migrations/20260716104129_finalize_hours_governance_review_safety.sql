-- Story 12.1 review iteration 4: make run/outcome persistence recoverable
-- after response loss, bind audits to stable venue populations, apply the
-- one-time remediation atomically, and converge provider-neutral evidence
-- without letting an unsafe free-form note erase otherwise valid hours.

-- -------------------------------------------------------------------------
-- Provider-neutral persisted evidence: opaque identifiers, bounded notes,
-- null-safe provenance coherence, and database-time review-date validation.
-- -------------------------------------------------------------------------

create or replace function public.is_safe_hours_source_reference(
  p_reference text
)
returns boolean
language sql
immutable
security invoker
set search_path = public, pg_temp
as $$
  select p_reference is not null
    and char_length(p_reference) between 3 and 500
    and p_reference ~
      '^[a-z][a-z0-9_-]{1,31}:[A-Za-z0-9][A-Za-z0-9._-]{0,199}(:[A-Za-z0-9][A-Za-z0-9._-]{0,199}){0,3}$';
$$;

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
      char_length(p_note) <= 1000
      and p_note !~* E'((^|[^A-Za-z0-9])([a-z][a-z0-9+.-]*:)?//|www\\.|[a-z0-9.-]+\\.[a-z]{2,}/|%(2f|3a)|provider[[:space:]_-]*payload|regular[[:space:]_-]*opening[[:space:]_-]*hours|authorization[[:space:]]*:?[[:space:]]*bearer|bearer[[:space:]]+[A-Za-z0-9._~-]+|(api[[:space:]_-]*key|token|secret|credential)[[:space:]]*[:=]|eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+)'
    );
$$;

-- Notes are optional maintainer context, not canonical evidence. Quarantine a
-- bad note independently and preserve any valid schedule/provenance bundle.
update public.venues
set hours_notes = null,
    updated_at = clock_timestamp()
where hours_notes is not null
  and not public.is_safe_hours_note(hours_notes);

-- A source reference is canonical evidence. Fail closed only those rows whose
-- reference cannot be represented by the explicit opaque-identifier contract.
update public.venues
set opening_hours = null,
    hours_source_type = null,
    hours_source_reference = null,
    hours_review_status = 'unknown',
    hours_reviewed_at = null,
    hours_next_review_at = null,
    hours_review_reason = null,
    hours_last_error_class = null,
    updated_at = clock_timestamp()
where hours_source_reference is not null
  and not public.is_safe_hours_source_reference(hours_source_reference);

alter table public.venues
  drop constraint if exists venues_hours_source_reference_policy_check,
  drop constraint if exists venues_hours_notes_policy_check,
  drop constraint if exists venues_hours_state_coherence_check;

alter table public.venues
  add constraint venues_hours_source_reference_policy_check
    check (
      hours_source_reference is null
      or public.is_safe_hours_source_reference(hours_source_reference)
    ) not valid,
  add constraint venues_hours_notes_policy_check
    check (public.is_safe_hours_note(hours_notes)) not valid,
  add constraint venues_hours_state_coherence_check
    check (
      num_nonnulls(
        hours_source_type,
        hours_source_reference,
        hours_reviewed_at,
        hours_next_review_at
      ) in (0, 4)
      and (
        num_nonnulls(
          hours_source_type,
          hours_source_reference,
          hours_reviewed_at,
          hours_next_review_at
        ) = 0
        or (
          hours_source_type in (
            'venue_confirmed', 'venue_website', 'licensed_provider', 'manual'
          )
          and public.is_safe_hours_source_reference(hours_source_reference)
          and hours_next_review_at >= hours_reviewed_at
        ) is true
      )
      and (
        opening_hours is null
        or (
          num_nonnulls(
            hours_source_type,
            hours_source_reference,
            hours_reviewed_at,
            hours_next_review_at
          ) = 4
          and hours_review_status in (
            'verified', 'due', 'manual_review', 'failed'
          )
        ) is true
      )
      and (
        hours_review_status is distinct from 'verified'
        or (
          opening_hours is not null
          and hours_review_reason is null
          and hours_last_error_class is null
          and num_nonnulls(
            hours_source_type,
            hours_source_reference,
            hours_reviewed_at,
            hours_next_review_at
          ) = 4
        ) is true
      )
      and (
        hours_review_status is distinct from 'unknown'
        or (
          opening_hours is null
          and hours_review_reason is null
          and hours_last_error_class is null
        ) is true
      )
      and (
        hours_review_status is distinct from 'manual_review'
        or (
          hours_review_reason in (
            'provenance_conflict', 'unsupported_split', 'unsupported_24_7',
            'unsupported_seasonal', 'unsupported_holiday_specific'
          )
          and hours_last_error_class is null
        ) is true
      )
      and (
        hours_review_status is distinct from 'failed'
        or (
          hours_review_reason = 'classification_failed'
          and hours_last_error_class is not null
        ) is true
      )
    ) not valid;

create or replace function public.enforce_venue_hours_review_time()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  database_now timestamptz := clock_timestamp();
begin
  if new.hours_reviewed_at is not null
     and new.hours_reviewed_at > database_now then
    raise check_violation
      using message = 'hours_reviewed_at must not be future-dated';
  end if;
  return new;
end;
$$;

drop trigger if exists venues_enforce_hours_review_time on public.venues;
create trigger venues_enforce_hours_review_time
before insert or update of
  hours_source_type,
  hours_source_reference,
  hours_review_status,
  hours_reviewed_at,
  hours_next_review_at
on public.venues
for each row execute function public.enforce_venue_hours_review_time();

alter table public.venues
  validate constraint venues_hours_source_reference_policy_check,
  validate constraint venues_hours_notes_policy_check,
  validate constraint venues_hours_state_coherence_check;

-- -------------------------------------------------------------------------
-- Durable outcome reason and exact catalog-definition convergence.
-- -------------------------------------------------------------------------

alter table public.hours_review_outcomes
  drop constraint if exists hours_review_outcomes_values_check,
  drop constraint if exists hours_review_outcomes_coherence_check;

alter table public.hours_review_outcomes
  add constraint hours_review_outcomes_values_check
    check (
      char_length(venue_slug) between 1 and 200
      and outcome in (
        'current', 'missing_provenance', 'due', 'unknown',
        'conflicting', 'split', 'failed', 'stale'
      )
      and reason in (
        'review_current', 'missing_provenance', 'review_due', 'hours_unknown',
        'provenance_removed', 'provenance_conflict', 'unsupported_split',
        'unsupported_24_7', 'unsupported_seasonal',
        'unsupported_holiday_specific', 'prior_failure', 'review_stale',
        'classification_failed'
      )
      and (
        error_class is null
        or error_class in (
          'read_failed', 'validation_failed', 'database_error', 'unexpected'
        )
      )
    ) not valid,
  add constraint hours_review_outcomes_coherence_check
    check (
      (outcome = 'current' and reason = 'review_current' and error_class is null)
      or (outcome = 'missing_provenance' and reason = 'missing_provenance' and error_class is null)
      or (outcome = 'due' and reason = 'review_due' and error_class is null)
      or (
        outcome = 'unknown'
        and reason in ('hours_unknown', 'provenance_removed')
        and error_class is null
      )
      or (outcome = 'conflicting' and reason = 'provenance_conflict' and error_class is null)
      or (outcome = 'split' and reason = 'unsupported_split' and error_class is null)
      or (outcome = 'stale' and reason = 'review_stale' and error_class is null)
      or (
        outcome = 'failed'
        and reason in (
          'prior_failure', 'classification_failed', 'unsupported_24_7',
          'unsupported_seasonal', 'unsupported_holiday_specific'
        )
        and error_class is not null
      )
    ) not valid;

alter table public.hours_review_outcomes
  validate constraint hours_review_outcomes_values_check,
  validate constraint hours_review_outcomes_coherence_check;

do $$
declare
  definition text;
begin
  select pg_get_constraintdef(oid)
  into definition
  from pg_constraint
  where conrelid = 'public.hours_review_outcomes'::regclass
    and conname = 'hours_review_outcomes_run_venue_key';
  if definition is not null
     and definition !~* '^UNIQUE \\(run_id, venue_id\\)$' then
    alter table public.hours_review_outcomes
      drop constraint hours_review_outcomes_run_venue_key;
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.hours_review_outcomes'::regclass
      and conname = 'hours_review_outcomes_run_venue_key'
  ) then
    alter table public.hours_review_outcomes
      add constraint hours_review_outcomes_run_venue_key
      unique (run_id, venue_id);
  end if;

  select pg_get_constraintdef(oid)
  into definition
  from pg_constraint
  where conrelid = 'public.hours_review_outcomes'::regclass
    and conname = 'hours_review_outcomes_run_id_fkey';
  if definition is not null
     and definition !~* '^FOREIGN KEY \\(run_id\\) REFERENCES (public\\.)?hours_review_runs\\(id\\) ON DELETE CASCADE$' then
    alter table public.hours_review_outcomes
      drop constraint hours_review_outcomes_run_id_fkey;
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.hours_review_outcomes'::regclass
      and conname = 'hours_review_outcomes_run_id_fkey'
  ) then
    alter table public.hours_review_outcomes
      add constraint hours_review_outcomes_run_id_fkey
      foreign key (run_id)
      references public.hours_review_runs(id) on delete cascade;
  end if;

  select pg_get_constraintdef(oid)
  into definition
  from pg_constraint
  where conrelid = 'public.hours_review_outcomes'::regclass
    and conname = 'hours_review_outcomes_venue_id_fkey';
  if definition is not null
     and definition !~* '^FOREIGN KEY \\(venue_id\\) REFERENCES (public\\.)?venues\\(id\\) ON DELETE CASCADE$' then
    alter table public.hours_review_outcomes
      drop constraint hours_review_outcomes_venue_id_fkey;
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.hours_review_outcomes'::regclass
      and conname = 'hours_review_outcomes_venue_id_fkey'
  ) then
    alter table public.hours_review_outcomes
      add constraint hours_review_outcomes_venue_id_fkey
      foreign key (venue_id)
      references public.venues(id) on delete cascade;
  end if;
end;
$$;

do $$
declare
  definition text;
begin
  select pg_get_indexdef(c.oid)
  into definition
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'hours_review_runs_one_active_run_idx';

  if definition is not null
     and definition !~* 'CREATE UNIQUE INDEX .* ON public\\.hours_review_runs .*\\(status\\).*WHERE \\(status = ''running''::text\\)$' then
    drop index public.hours_review_runs_one_active_run_idx;
  end if;
  if to_regclass('public.hours_review_runs_one_active_run_idx') is null then
    create unique index hours_review_runs_one_active_run_idx
      on public.hours_review_runs ((status))
      where status = 'running';
  end if;
end;
$$;

-- -------------------------------------------------------------------------
-- Database-owned population snapshots.
-- -------------------------------------------------------------------------

alter table public.hours_review_runs
  add column if not exists venue_population_count integer,
  add column if not exists venue_population_identity_fingerprint text,
  add column if not exists venue_population_state_fingerprint text;

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
          v.updated_at
        )::text,
        E'\x1e' order by v.id
      ),
      ''
    ))
  from public.venues v;
$$;

update public.hours_review_runs r
set venue_population_count = snapshot.venue_count,
    venue_population_identity_fingerprint = snapshot.identity_fingerprint,
    venue_population_state_fingerprint = snapshot.state_fingerprint
from public.hours_venue_population_snapshot() snapshot
where r.status = 'running'
  and (
    r.venue_population_count is null
    or r.venue_population_identity_fingerprint is null
    or r.venue_population_state_fingerprint is null
  );

-- -------------------------------------------------------------------------
-- Active-parent checks and outcome persistence refresh database time only
-- after acquiring the parent lock.
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
  database_now timestamptz;
begin
  select status, lease_expires_at
  into parent_status, parent_lease_expires_at
  from public.hours_review_runs
  where id = new.run_id
  for update;

  database_now := clock_timestamp();
  if not found
     or parent_status <> 'running'
     or parent_lease_expires_at <= database_now then
    raise check_violation
      using message = 'hours review outcome requires an active unexpired parent run';
  end if;
  return new;
end;
$$;

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
  database_now timestamptz;
begin
  select status, lease_expires_at
  into parent_status, parent_lease_expires_at
  from public.hours_review_runs
  where id = p_run_id
  for update;

  database_now := clock_timestamp();
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
-- Idempotent lifecycle transitions with stable population binding.
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
      count(*) filter (where outcome = 'missing_provenance')::integer as missing_provenance_count,
      count(*) filter (where outcome = 'due')::integer as due_count,
      count(*) filter (where outcome = 'unknown')::integer as unknown_count,
      count(*) filter (where outcome = 'conflicting')::integer as conflicting_count,
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
    venue_population_state_fingerprint
  ) values (
    p_run_id,
    p_trigger_type,
    'running',
    database_now,
    database_now + interval '15 minutes',
    snapshot.venue_count,
    snapshot.identity_fingerprint,
    snapshot.state_fingerprint
  )
  on conflict do nothing;

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
  parent_status text;
  parent_lease timestamptz;
  database_now timestamptz;
begin
  select status, lease_expires_at
  into parent_status, parent_lease
  from public.hours_review_runs
  where id = p_run_id
  for update;

  database_now := clock_timestamp();
  if not found
     or parent_status <> 'running'
     or parent_lease <= database_now then
    return false;
  end if;

  update public.hours_review_runs
  set lease_expires_at = database_now + interval '15 minutes'
  where id = p_run_id and status = 'running';
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
  parent_trigger text;
  parent_lease timestamptz;
  parent_population_count integer;
  parent_identity text;
  parent_state text;
  database_now timestamptz;
  c record;
  snapshot record;
  stored_total_count integer;
  stored_current_count integer;
  stored_missing_provenance_count integer;
  stored_due_count integer;
  stored_unknown_count integer;
  stored_conflicting_count integer;
  stored_split_count integer;
  stored_failed_count integer;
  stored_stale_count integer;
begin
  select
    status,
    trigger_type,
    lease_expires_at,
    venue_population_count,
    venue_population_identity_fingerprint,
    venue_population_state_fingerprint,
    total_count,
    current_count,
    missing_provenance_count,
    due_count,
    unknown_count,
    conflicting_count,
    split_count,
    failed_count,
    stale_count
  into
    parent_status,
    parent_trigger,
    parent_lease,
    parent_population_count,
    parent_identity,
    parent_state,
    stored_total_count,
    stored_current_count,
    stored_missing_provenance_count,
    stored_due_count,
    stored_unknown_count,
    stored_conflicting_count,
    stored_split_count,
    stored_failed_count,
    stored_stale_count
  from public.hours_review_runs
  where id = p_run_id
  for update;

  database_now := clock_timestamp();
  if not found or p_status not in ('completed', 'completed_with_failures') then
    return false;
  end if;

  if parent_status in ('completed', 'completed_with_failures') then
    return parent_status = p_status
      and stored_total_count = p_total_count
      and stored_current_count = p_current_count
      and stored_missing_provenance_count = p_missing_provenance_count
      and stored_due_count = p_due_count
      and stored_unknown_count = p_unknown_count
      and stored_conflicting_count = p_conflicting_count
      and stored_split_count = p_split_count
      and stored_failed_count = p_failed_count
      and stored_stale_count = p_stale_count;
  end if;

  if parent_status <> 'running' or parent_lease <= database_now then
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

  select * into snapshot
  from public.hours_venue_population_snapshot();

  if p_total_count <> c.total_count
     or p_current_count <> c.current_count
     or p_missing_provenance_count <> c.missing_provenance_count
     or p_due_count <> c.due_count
     or p_unknown_count <> c.unknown_count
     or p_conflicting_count <> c.conflicting_count
     or p_split_count <> c.split_count
     or p_failed_count <> c.failed_count
     or p_stale_count <> c.stale_count
     or c.total_count <> parent_population_count
     or snapshot.venue_count <> parent_population_count
     or snapshot.identity_fingerprint is distinct from parent_identity
     or (
       parent_trigger <> 'remediation'
       and snapshot.state_fingerprint is distinct from parent_state
     )
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
  database_now timestamptz;
  c record;
begin
  select status
  into parent_status
  from public.hours_review_runs
  where id = p_run_id
  for update;
  database_now := clock_timestamp();

  if not found then
    return false;
  end if;
  if parent_status = 'failed' then
    return true;
  end if;
  if parent_status <> 'running' then
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

-- -------------------------------------------------------------------------
-- Resumable idempotent remediation and all-or-nothing batch application.
-- -------------------------------------------------------------------------

drop function if exists public.apply_hours_remediation_outcome(
  text, text, text, jsonb, text, text, text, timestamptz, timestamptz,
  text, text, text, text, text, text, timestamptz
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
  database_now timestamptz;
  parent_status text;
  parent_lease timestamptz;
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
  request_fingerprint text;
  prior_match record;
  provenance_count integer;
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
  into parent_status, parent_lease
  from public.hours_review_runs
  where id = p_run_id and trigger_type = 'remediation'
  for update;
  database_now := clock_timestamp();
  if not found
     or parent_status <> 'running'
     or parent_lease <= database_now then
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
  database_now := clock_timestamp();

  if not found or canonical_slug is distinct from p_venue_slug then
    return false;
  end if;

  if p_expected_updated_at is null
     or prior_updated_at is distinct from p_expected_updated_at then
    select
      o.prior_review_status,
      o.resulting_review_status,
      o.prior_venue_updated_at,
      o.resulting_venue_updated_at
    into prior_match
    from public.hours_review_outcomes o
    join public.hours_review_runs r on r.id = o.run_id
    where r.trigger_type = 'remediation'
      and (o.run_id = p_run_id or r.status <> 'running')
      and o.venue_id = p_venue_id
      and o.venue_slug = p_venue_slug
      and o.outcome = p_outcome
      and o.reason = p_reason
      and o.error_class is not distinct from p_error_class
      and o.resulting_review_status is not distinct from p_review_status
      and o.prior_venue_updated_at is not distinct from p_expected_updated_at
      and o.resulting_venue_updated_at is not distinct from prior_updated_at
      and o.remediation_request_fingerprint = request_fingerprint
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
      remediation_request_fingerprint
    ) values (
      p_run_id,
      p_venue_id,
      p_venue_slug,
      p_outcome,
      p_reason,
      p_error_class,
      prior_match.prior_review_status,
      prior_match.resulting_review_status,
      prior_match.prior_venue_updated_at,
      prior_match.resulting_venue_updated_at,
      request_fingerprint
    )
    on conflict (run_id, venue_id) do nothing;
    return true;
  end if;

  provenance_count := num_nonnulls(
    p_source_type,
    p_source_reference,
    p_reviewed_at,
    p_next_review_at
  );

  if not (
    (
      p_review_status = 'verified'
      and p_opening_hours is not null
      and public.is_canonical_weekly_opening_hours(p_opening_hours)
      and provenance_count = 4
      and p_source_type in (
        'venue_confirmed', 'venue_website', 'licensed_provider', 'manual'
      )
      and public.is_safe_hours_source_reference(p_source_reference)
      and p_reviewed_at <= database_now
      and p_next_review_at >= p_reviewed_at
      and p_review_reason is null
      and p_last_error_class is null
      and p_outcome = 'current'
      and p_reason = 'review_current'
      and p_error_class is null
    ) is true
    or (
      p_review_status = 'unknown'
      and p_opening_hours is null
      and provenance_count in (0, 4)
      and (
        provenance_count = 0
        or (
          p_source_type in (
            'venue_confirmed', 'venue_website', 'licensed_provider', 'manual'
          )
          and public.is_safe_hours_source_reference(p_source_reference)
          and p_reviewed_at <= database_now
          and p_next_review_at >= p_reviewed_at
        ) is true
      )
      and p_review_reason is null
      and p_last_error_class is null
      and p_outcome = 'unknown'
      and p_reason in ('hours_unknown', 'provenance_removed')
      and p_error_class is null
    ) is true
    or (
      p_review_status = 'manual_review'
      and p_opening_hours is null
      and provenance_count in (0, 4)
      and (
        provenance_count = 0
        or (
          p_source_type in (
            'venue_confirmed', 'venue_website', 'licensed_provider', 'manual'
          )
          and public.is_safe_hours_source_reference(p_source_reference)
          and p_reviewed_at <= database_now
          and p_next_review_at >= p_reviewed_at
        ) is true
      )
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
      ) is true
    ) is true
    or (
      p_review_status = 'failed'
      and p_opening_hours is null
      and provenance_count in (0, 4)
      and (
        provenance_count = 0
        or (
          p_source_type in (
            'venue_confirmed', 'venue_website', 'licensed_provider', 'manual'
          )
          and public.is_safe_hours_source_reference(p_source_reference)
          and p_reviewed_at <= database_now
          and p_next_review_at >= p_reviewed_at
        ) is true
      )
      and p_review_reason = 'classification_failed'
      and p_last_error_class = 'validation_failed'
      and p_outcome = 'failed'
      and p_reason = 'classification_failed'
      and p_error_class = 'validation_failed'
    ) is true
  ) then
    return false;
  end if;

  if not public.is_safe_hours_note(p_notes) then
    return false;
  end if;

  preserve_verified_schedule :=
    p_review_status in ('manual_review', 'failed')
    and prior_opening_hours is not null
    and prior_source_type is not null
    and prior_source_reference is not null
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

create or replace function public.apply_hours_remediation_batch(
  p_run_id text,
  p_requests jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  parent_status text;
  parent_lease timestamptz;
  parent_population_count integer;
  parent_identity text;
  database_now timestamptz;
  request_count integer;
  distinct_request_count integer;
  snapshot record;
  request jsonb;
  applied boolean;
begin
  if jsonb_typeof(p_requests) <> 'array' then
    return false;
  end if;

  select
    status,
    lease_expires_at,
    venue_population_count,
    venue_population_identity_fingerprint
  into
    parent_status,
    parent_lease,
    parent_population_count,
    parent_identity
  from public.hours_review_runs
  where id = p_run_id and trigger_type = 'remediation'
  for update;
  database_now := clock_timestamp();

  if not found
     or parent_status <> 'running'
     or parent_lease <= database_now then
    return false;
  end if;

  select count(*)::integer, count(distinct item ->> 'venue_id')::integer
  into request_count, distinct_request_count
  from jsonb_array_elements(p_requests) item;

  select * into snapshot
  from public.hours_venue_population_snapshot();

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
           and item ->> 'venue_slug' = v.slug
       )
     ) then
    return false;
  end if;

  for request in select value from jsonb_array_elements(p_requests)
  loop
    applied := public.apply_hours_remediation_outcome(
      p_run_id,
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
    if not applied then
      raise serialization_failure
        using message =
          'remediation batch rejected stale or incoherent venue request';
    end if;
  end loop;
  return true;
end;
$$;

-- -------------------------------------------------------------------------
-- Least-privilege execution grants after every replacement.
-- -------------------------------------------------------------------------

revoke all on function public.is_safe_hours_source_reference(text)
  from public, anon, authenticated, service_role;
revoke all on function public.is_safe_hours_note(text)
  from public, anon, authenticated, service_role;
revoke all on function public.enforce_venue_hours_review_time()
  from public, anon, authenticated, service_role;
revoke all on function public.hours_venue_population_snapshot()
  from public, anon, authenticated, service_role;
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
revoke all on function public.apply_hours_remediation_outcome(
  text, text, text, jsonb, text, text, text, timestamptz, timestamptz,
  text, text, text, text, text, text, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function public.apply_hours_remediation_batch(text, jsonb)
  from public, anon, authenticated, service_role;

grant execute on function public.is_safe_hours_source_reference(text)
  to service_role;
grant execute on function public.is_safe_hours_note(text)
  to service_role;
grant execute on function public.hours_venue_population_snapshot()
  to service_role;
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
grant execute on function public.apply_hours_remediation_outcome(
  text, text, text, jsonb, text, text, text, timestamptz, timestamptz,
  text, text, text, text, text, text, timestamptz
) to service_role;
grant execute on function public.apply_hours_remediation_batch(text, jsonb)
  to service_role;

comment on function public.apply_hours_remediation_batch(text, jsonb) is
  'Applies the complete reviewed venue population atomically; any stale or incoherent row rolls back the whole batch.';
comment on column public.hours_review_runs.venue_population_state_fingerprint is
  'Database-owned audit-state snapshot; weekly completion fails if the venue population changes during the run.';
