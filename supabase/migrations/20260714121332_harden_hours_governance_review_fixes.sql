-- Story 12.1 review hardening. This migration is intentionally idempotent so
-- the already-authorized pre-launch project and a fresh replay converge.

-- -------------------------------------------------------------------------
-- Venue identity/provenance convergence and column-level Data API boundary.
-- -------------------------------------------------------------------------

alter table public.venues
  alter column place_id drop not null,
  add column if not exists hours_review_reason text,
  add column if not exists hours_last_error_class text;

update public.venues
set place_id = null
where place_id is not null and btrim(place_id) = '';

-- Remove live-drift uniqueness that would prevent two SunnySeat seating areas
-- from sharing one Place ID. Only single-column place_id uniqueness is removed.
do $$
declare
  place_id_attnum smallint;
  item record;
begin
  select attnum into place_id_attnum
  from pg_attribute
  where attrelid = 'public.venues'::regclass
    and attname = 'place_id'
    and not attisdropped;

  for item in
    select conname
    from pg_constraint
    where conrelid = 'public.venues'::regclass
      and contype = 'u'
      and conkey = array[place_id_attnum]::smallint[]
  loop
    execute format('alter table public.venues drop constraint %I', item.conname);
  end loop;

  for item in
    select n.nspname as schema_name, c.relname as index_name
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
    join pg_namespace n on n.oid = c.relnamespace
    where i.indrelid = 'public.venues'::regclass
      and i.indisunique
      and i.indnatts = 1
      and i.indkey[0] = place_id_attnum
      and not exists (
        select 1 from pg_constraint pc where pc.conindid = i.indexrelid
      )
  loop
    execute format('drop index if exists %I.%I', item.schema_name, item.index_name);
  end loop;
end
$$;

alter table public.venues
  drop constraint if exists venues_place_id_nonblank_check,
  drop constraint if exists venues_hours_source_reference_policy_check,
  drop constraint if exists venues_hours_notes_length_check,
  drop constraint if exists venues_hours_review_reason_check,
  drop constraint if exists venues_hours_last_error_class_check,
  drop constraint if exists venues_hours_state_coherence_check;

alter table public.venues
  add constraint venues_place_id_nonblank_check
    check (place_id is null or btrim(place_id) <> ''),
  add constraint venues_hours_source_reference_policy_check
    check (
      hours_source_reference is null
      or (
        char_length(hours_source_reference) between 1 and 500
        and hours_source_reference !~ E'[\\r\\n]'
        and hours_source_reference !~* '(https?://|www\\.|provider-payload|regular.?opening.?hours|(^|[?&;:_-])(api[_-]?key|key|token|secret)=)'
      )
    ),
  add constraint venues_hours_notes_length_check
    check (hours_notes is null or char_length(hours_notes) <= 1000),
  add constraint venues_hours_review_reason_check
    check (
      hours_review_reason is null
      or hours_review_reason in (
        'provenance_conflict',
        'unsupported_split',
        'classification_failed'
      )
    ),
  add constraint venues_hours_last_error_class_check
    check (
      hours_last_error_class is null
      or hours_last_error_class in (
        'read_failed',
        'validation_failed',
        'database_error',
        'unexpected'
      )
    ),
  add constraint venues_hours_state_coherence_check
    check (
      (
        opening_hours is null
        or (
          hours_source_type is not null
          and hours_source_reference is not null
          and hours_review_status in ('verified', 'due', 'manual_review', 'failed')
          and hours_reviewed_at is not null
          and hours_next_review_at is not null
        )
      )
      and (hours_review_status <> 'unknown' or opening_hours is null)
      and (
        hours_review_status <> 'manual_review'
        or hours_review_reason is not null
      )
      and (
        hours_review_status <> 'failed'
        or hours_last_error_class is not null
      )
      and (
        hours_review_status <> 'verified'
        or (
          opening_hours is not null
          and hours_review_reason is null
          and hours_last_error_class is null
        )
      )
    ) not valid;

-- Remove table-level and inherited column SELECT before granting the explicit
-- safe public projection. RLS remains a separate row-access layer.
revoke select on table public.venues from public, anon, authenticated;

do $$
declare
  all_columns text;
begin
  select string_agg(format('%I', attname), ', ' order by attnum)
  into all_columns
  from pg_attribute
  where attrelid = 'public.venues'::regclass
    and attnum > 0
    and not attisdropped;

  execute format(
    'revoke select (%s) on table public.venues from public, anon, authenticated',
    all_columns
  );
end
$$;

grant select (
  id,
  slug,
  venue_name,
  neighborhood,
  lat,
  lng,
  is_partner,
  thumbnail,
  description,
  address,
  opening_hours,
  current_sun_status,
  sky_condition,
  confidence,
  sun_exposure_percent,
  sun_window,
  prediction_uncertainty,
  tags
) on table public.venues to anon, authenticated;

grant select on table public.venues to service_role;

-- -------------------------------------------------------------------------
-- Repair service-table shape, then enforce coherent summaries/outcomes.
-- -------------------------------------------------------------------------

alter table public.hours_review_runs
  add column if not exists id text,
  add column if not exists trigger_type text,
  add column if not exists status text default 'running',
  add column if not exists started_at timestamptz default now(),
  add column if not exists finished_at timestamptz,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists total_count integer default 0,
  add column if not exists current_count integer default 0,
  add column if not exists missing_provenance_count integer default 0,
  add column if not exists due_count integer default 0,
  add column if not exists unknown_count integer default 0,
  add column if not exists conflicting_count integer default 0,
  add column if not exists split_count integer default 0,
  add column if not exists failed_count integer default 0,
  add column if not exists stale_count integer default 0;

alter table public.hours_review_outcomes
  add column if not exists id bigint generated by default as identity,
  add column if not exists run_id text,
  add column if not exists venue_id text,
  add column if not exists venue_slug text,
  add column if not exists outcome text,
  add column if not exists reason text,
  add column if not exists error_class text,
  add column if not exists prior_review_status text,
  add column if not exists resulting_review_status text,
  add column if not exists created_at timestamptz default now();

update public.hours_review_runs
set status = coalesce(status, 'running'),
    started_at = coalesce(started_at, now()),
    total_count = coalesce(total_count, 0),
    current_count = coalesce(current_count, 0),
    missing_provenance_count = coalesce(missing_provenance_count, 0),
    due_count = coalesce(due_count, 0),
    unknown_count = coalesce(unknown_count, 0),
    conflicting_count = coalesce(conflicting_count, 0),
    split_count = coalesce(split_count, 0),
    failed_count = coalesce(failed_count, 0),
    stale_count = coalesce(stale_count, 0);

-- A pre-existing partial table can be repaired when its rows contain the
-- required identifiers. If not, fail transactionally before indexes/functions
-- are replaced rather than leaving a half-migrated schema.
do $$
begin
  if exists (
    select 1 from public.hours_review_runs
    where id is null or trigger_type is null or status is null or started_at is null
  ) then
    raise exception 'hours_review_runs partial rows lack required identifiers';
  end if;
  if exists (
    select 1 from public.hours_review_outcomes
    where id is null or run_id is null or venue_id is null or venue_slug is null
       or outcome is null or reason is null or created_at is null
  ) then
    raise exception 'hours_review_outcomes partial rows lack required identifiers';
  end if;
end
$$;

alter table public.hours_review_runs
  alter column id set not null,
  alter column trigger_type set not null,
  alter column status set default 'running',
  alter column status set not null,
  alter column started_at set default now(),
  alter column started_at set not null,
  alter column total_count set default 0,
  alter column total_count set not null,
  alter column current_count set default 0,
  alter column current_count set not null,
  alter column missing_provenance_count set default 0,
  alter column missing_provenance_count set not null,
  alter column due_count set default 0,
  alter column due_count set not null,
  alter column unknown_count set default 0,
  alter column unknown_count set not null,
  alter column conflicting_count set default 0,
  alter column conflicting_count set not null,
  alter column split_count set default 0,
  alter column split_count set not null,
  alter column failed_count set default 0,
  alter column failed_count set not null,
  alter column stale_count set default 0,
  alter column stale_count set not null;

alter table public.hours_review_outcomes
  alter column id set not null,
  alter column run_id set not null,
  alter column venue_id set not null,
  alter column venue_slug set not null,
  alter column outcome set not null,
  alter column reason set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.hours_review_runs'::regclass and contype = 'p'
  ) then
    alter table public.hours_review_runs
      add constraint hours_review_runs_pkey primary key (id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.hours_review_outcomes'::regclass and contype = 'p'
  ) then
    alter table public.hours_review_outcomes
      add constraint hours_review_outcomes_pkey primary key (id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.hours_review_outcomes'::regclass
      and conname = 'hours_review_outcomes_run_venue_key'
  ) then
    alter table public.hours_review_outcomes
      add constraint hours_review_outcomes_run_venue_key unique (run_id, venue_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.hours_review_outcomes'::regclass
      and conname = 'hours_review_outcomes_run_id_fkey'
  ) then
    alter table public.hours_review_outcomes
      add constraint hours_review_outcomes_run_id_fkey
      foreign key (run_id) references public.hours_review_runs(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.hours_review_outcomes'::regclass
      and conname = 'hours_review_outcomes_venue_id_fkey'
  ) then
    alter table public.hours_review_outcomes
      add constraint hours_review_outcomes_venue_id_fkey
      foreign key (venue_id) references public.venues(id) on delete cascade;
  end if;
end
$$;

alter table public.hours_review_runs
  drop constraint if exists hours_review_runs_values_check,
  drop constraint if exists hours_review_runs_nonnegative_counts_check;

alter table public.hours_review_runs
  add constraint hours_review_runs_values_check
    check (
      trigger_type in ('scheduled', 'manual', 'remediation')
      and status in ('running', 'completed', 'completed_with_failures', 'failed')
      and (
        (status = 'running' and finished_at is null)
        or (status <> 'running' and finished_at is not null)
      )
    ),
  add constraint hours_review_runs_nonnegative_counts_check
    check (
      total_count >= 0
      and current_count >= 0
      and missing_provenance_count >= 0
      and due_count >= 0
      and unknown_count >= 0
      and conflicting_count >= 0
      and split_count >= 0
      and failed_count >= 0
      and stale_count >= 0
    );

alter table public.hours_review_outcomes
  drop constraint if exists hours_review_outcomes_values_check;

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
        'provenance_conflict', 'unsupported_split', 'prior_failure',
        'review_stale', 'classification_failed'
      )
      and (
        error_class is null
        or error_class in (
          'read_failed', 'validation_failed', 'database_error', 'unexpected'
        )
      )
    );

update public.hours_review_runs
set lease_expires_at = coalesce(
  lease_expires_at,
  case
    when status = 'running' then started_at + interval '15 minutes'
    else coalesce(finished_at, started_at)
  end
);

alter table public.hours_review_runs
  alter column lease_expires_at set not null;

alter table public.hours_review_runs
  drop constraint if exists hours_review_runs_counter_sum_check;

alter table public.hours_review_runs
  add constraint hours_review_runs_counter_sum_check
    check (
      status = 'running'
      or total_count = (
        current_count
        + missing_provenance_count
        + due_count
        + unknown_count
        + conflicting_count
        + split_count
        + failed_count
        + stale_count
      )
    ) not valid;

alter table public.hours_review_outcomes
  drop constraint if exists hours_review_outcomes_review_status_check,
  drop constraint if exists hours_review_outcomes_coherence_check;

alter table public.hours_review_outcomes
  add constraint hours_review_outcomes_review_status_check
    check (
      (prior_review_status is null or prior_review_status in (
        'verified', 'due', 'manual_review', 'unknown', 'failed'
      ))
      and (resulting_review_status is null or resulting_review_status in (
        'verified', 'due', 'manual_review', 'unknown', 'failed'
      ))
    ),
  add constraint hours_review_outcomes_coherence_check
    check (
      (outcome = 'current' and reason = 'review_current' and error_class is null)
      or (outcome = 'missing_provenance' and reason = 'missing_provenance' and error_class is null)
      or (outcome = 'due' and reason = 'review_due' and error_class is null)
      or (outcome = 'unknown' and reason = 'hours_unknown' and error_class is null)
      or (outcome = 'conflicting' and reason = 'provenance_conflict' and error_class is null)
      or (outcome = 'split' and reason = 'unsupported_split' and error_class is null)
      or (outcome = 'stale' and reason = 'review_stale' and error_class is null)
      or (
        outcome = 'failed'
        and reason in ('prior_failure', 'classification_failed')
        and error_class is not null
      )
    ) not valid;

create index if not exists hours_review_runs_lease_expires_at_idx
  on public.hours_review_runs (lease_expires_at)
  where status = 'running';

-- -------------------------------------------------------------------------
-- Recover stale claims, enforce summary totals, and finalize failures.
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
  inserted_count integer;
begin
  with outcome_counts as (
    select
      r.id,
      count(o.id)::integer as total_count,
      count(*) filter (where o.outcome = 'current')::integer as current_count,
      count(*) filter (where o.outcome = 'missing_provenance')::integer as missing_provenance_count,
      count(*) filter (where o.outcome = 'due')::integer as due_count,
      count(*) filter (where o.outcome = 'unknown')::integer as unknown_count,
      count(*) filter (where o.outcome = 'conflicting')::integer as conflicting_count,
      count(*) filter (where o.outcome = 'split')::integer as split_count,
      count(*) filter (where o.outcome = 'failed')::integer as failed_count,
      count(*) filter (where o.outcome = 'stale')::integer as stale_count
    from public.hours_review_runs r
    left join public.hours_review_outcomes o on o.run_id = r.id
    where r.status = 'running' and r.lease_expires_at <= p_started_at
    group by r.id
  )
  update public.hours_review_runs r
  set status = 'failed',
      finished_at = p_started_at,
      lease_expires_at = p_started_at,
      total_count = c.total_count,
      current_count = c.current_count,
      missing_provenance_count = c.missing_provenance_count,
      due_count = c.due_count,
      unknown_count = c.unknown_count,
      conflicting_count = c.conflicting_count,
      split_count = c.split_count,
      failed_count = c.failed_count,
      stale_count = c.stale_count
  from outcome_counts c
  where r.id = c.id;

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
    p_started_at,
    p_started_at + interval '15 minutes'
  ) on conflict do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
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
begin
  if p_status not in ('completed', 'completed_with_failures')
     or p_total_count <> (
       p_current_count
       + p_missing_provenance_count
       + p_due_count
       + p_unknown_count
       + p_conflicting_count
       + p_split_count
       + p_failed_count
       + p_stale_count
     ) then
    return false;
  end if;

  update public.hours_review_runs
  set status = p_status,
      finished_at = p_finished_at,
      lease_expires_at = p_finished_at,
      total_count = p_total_count,
      current_count = p_current_count,
      missing_provenance_count = p_missing_provenance_count,
      due_count = p_due_count,
      unknown_count = p_unknown_count,
      conflicting_count = p_conflicting_count,
      split_count = p_split_count,
      failed_count = p_failed_count,
      stale_count = p_stale_count
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
begin
  with outcome_counts as (
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
    from public.hours_review_outcomes
    where run_id = p_run_id
  )
  update public.hours_review_runs r
  set status = 'failed',
      finished_at = p_finished_at,
      lease_expires_at = p_finished_at,
      total_count = c.total_count,
      current_count = c.current_count,
      missing_provenance_count = c.missing_provenance_count,
      due_count = c.due_count,
      unknown_count = c.unknown_count,
      conflicting_count = c.conflicting_count,
      split_count = c.split_count,
      failed_count = c.failed_count,
      stale_count = c.stale_count
  from outcome_counts c
  where r.id = p_run_id and r.status = 'running';

  return found;
end;
$$;

-- One transaction applies the canonical remediation state and its per-venue
-- outcome. The runner passes only bounded classifications and opaque references.
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
  p_error_class text
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  prior_status text;
begin
  select hours_review_status
  into prior_status
  from public.venues
  where id = p_venue_id
  for update;

  if not found then
    return false;
  end if;

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

  insert into public.hours_review_outcomes (
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
    prior_status,
    p_review_status
  )
  on conflict (run_id, venue_id) do update
  set venue_slug = excluded.venue_slug,
      outcome = excluded.outcome,
      reason = excluded.reason,
      error_class = excluded.error_class,
      prior_review_status = excluded.prior_review_status,
      resulting_review_status = excluded.resulting_review_status;

  return true;
end;
$$;

-- Restore the deliberately narrow service-object boundary after replacing
-- functions (new functions otherwise grant EXECUTE to PUBLIC by default).
revoke all on function public.claim_hours_review_run(text, text, timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function public.finish_hours_review_run(
  text, text, timestamptz,
  integer, integer, integer, integer, integer, integer, integer, integer, integer
) from public, anon, authenticated, service_role;
revoke all on function public.fail_hours_review_run(text, timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function public.apply_hours_remediation_outcome(
  text, text, text, jsonb, text, text, text, timestamptz, timestamptz,
  text, text, text, text, text, text
) from public, anon, authenticated, service_role;

grant execute on function public.claim_hours_review_run(text, text, timestamptz)
  to service_role;
grant execute on function public.finish_hours_review_run(
  text, text, timestamptz,
  integer, integer, integer, integer, integer, integer, integer, integer, integer
) to service_role;
grant execute on function public.fail_hours_review_run(text, timestamptz)
  to service_role;
grant execute on function public.apply_hours_remediation_outcome(
  text, text, text, jsonb, text, text, text, timestamptz, timestamptz,
  text, text, text, text, text, text
) to service_role;

revoke all on table public.hours_review_runs
  from public, anon, authenticated, service_role;
revoke all on table public.hours_review_outcomes
  from public, anon, authenticated, service_role;

grant select, insert, update, delete
  on table public.hours_review_runs to service_role;
grant select, insert, update
  on table public.hours_review_outcomes to service_role;

comment on column public.hours_review_runs.lease_expires_at is
  'Bounded run claim; a later claimant finalizes expired running rows before retrying.';
comment on column public.venues.hours_review_reason is
  'Structured service-only review classification; maintainer notes remain prose.';
comment on column public.venues.hours_last_error_class is
  'Structured service-only bounded error class; never exposed in public DTOs.';
