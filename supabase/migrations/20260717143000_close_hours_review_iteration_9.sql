-- Story 12.1 review iteration 9: require historical remediation
-- reconciliation to prove the current governed state still matches the
-- previously committed outcome, and accept the documented conflict review
-- state through the guarded remediation seam.

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
  database_now timestamptz;
  canonical_slug text;
  prior_status text;
  prior_updated_at timestamptz;
  prior_opening_hours jsonb;
  prior_source_type text;
  prior_source_reference text;
  prior_reviewed_at timestamptz;
  prior_next_review_at timestamptz;
  resulting_updated_at timestamptz;
  provenance_count integer;
  prior_match public.hours_review_outcomes%rowtype;
  has_preserved_verification_history boolean;
  preserve_existing_schedule boolean;
begin
  if p_run_id is null
     or p_remediation_input_fingerprint is null
     or p_remediation_claim_identity is null
     or p_request_fingerprint is null
     or p_remediation_input_fingerprint !~ '^[a-f0-9]{64}$'
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

  select *
  into prior_match
  from public.hours_review_outcomes
  where run_id = p_run_id and venue_id = p_venue_id;
  if found then
    return prior_match.venue_slug = p_venue_slug
      and prior_match.outcome = p_outcome
      and prior_match.reason = p_reason
      and prior_match.error_class is not distinct from p_error_class
      and prior_match.resulting_review_status is not distinct from
        p_review_status
      and prior_match.resulting_review_status is not distinct from
        prior_status
      and prior_match.resulting_venue_updated_at is not distinct from
        prior_updated_at
      and prior_match.remediation_input_fingerprint =
        p_remediation_input_fingerprint
      and prior_match.remediation_request_fingerprint =
        p_request_fingerprint;
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
      and o.outcome = p_outcome
      and o.reason = p_reason
      and o.error_class is not distinct from p_error_class
      and o.resulting_review_status is not distinct from p_review_status
      and o.prior_venue_updated_at is not distinct from p_expected_updated_at
      and o.remediation_input_fingerprint = p_remediation_input_fingerprint
      and o.remediation_request_fingerprint = p_request_fingerprint
    order by o.created_at desc, o.id desc
    limit 1;

    if not found
       or prior_match.resulting_review_status is distinct from prior_status
       or prior_match.resulting_venue_updated_at is distinct from
         prior_updated_at then
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
        'provenance_conflict', 'unsupported_split', 'unsupported_24_7',
        'unsupported_seasonal', 'unsupported_holiday_specific'
      )
      and p_last_error_class is null
      and (
        (
          p_review_reason = 'provenance_conflict'
          and p_outcome = 'conflicting'
          and p_reason = 'provenance_conflict'
          and p_error_class is null
        )
        or (
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

  has_preserved_verification_history := exists (
    select 1
    from public.hours_review_outcomes o
    join public.hours_review_runs r on r.id = o.run_id
    where r.trigger_type = 'remediation'
      and o.venue_id = p_venue_id
      and o.venue_slug = p_venue_slug
      and o.prior_review_status in ('verified', 'due')
      and o.resulting_review_status in ('manual_review', 'failed')
      and o.resulting_venue_updated_at is not distinct from prior_updated_at
  );

  preserve_existing_schedule :=
    p_review_status in ('manual_review', 'failed')
    and prior_opening_hours is not null
    and prior_source_type is not null
    and prior_source_reference is not null
    and prior_reviewed_at is not null
    and prior_next_review_at is not null
    and (
      prior_status in ('verified', 'due')
      or has_preserved_verification_history
    );

  if preserve_existing_schedule then
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
    remediation_input_fingerprint,
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
    p_remediation_input_fingerprint,
    p_request_fingerprint
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
      remediation_input_fingerprint =
        excluded.remediation_input_fingerprint,
      remediation_request_fingerprint =
        excluded.remediation_request_fingerprint;
  return true;
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
  persisted_count integer;
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

    applied := public.apply_hours_remediation_request(
      p_run_id,
      p_remediation_input_fingerprint,
      p_remediation_claim_identity,
      request
    );
    if applied then
      continue;
    end if;

    canonical_request_fingerprint :=
      public.hours_remediation_request_fingerprint(request);
    select slug, hours_review_status, updated_at
    into canonical_slug, prior_status, prior_updated_at
    from public.venues
    where id = request ->> 'venue_id'
    for update;

    if not found then
      raise exception 'remediation venue disappeared during batch'
        using errcode = 'P0001';
    end if;

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
        resulting_review_status = excluded.resulting_review_status,
        resulting_venue_updated_at = excluded.resulting_venue_updated_at,
        remediation_input_fingerprint =
          excluded.remediation_input_fingerprint,
        remediation_request_fingerprint =
          excluded.remediation_request_fingerprint
    where existing.remediation_request_fingerprint is distinct from
      excluded.remediation_request_fingerprint;

    get diagnostics persisted_count = row_count;
    if persisted_count <> 1 then
      raise exception 'remediation fallback outcome conflict'
        using errcode = 'P0001';
    end if;
  end loop;
  return true;
end;
$$;

comment on function public.apply_hours_remediation_outcome(
  text, text, text, text, text, text, jsonb, text, text, text, timestamptz,
  timestamptz, text, text, text, text, text, text, timestamptz
) is
  'Applies one exact remediation outcome; historical reconciliation requires the current venue state timestamp/status to still match the prior committed outcome, and conflict manual-review requests preserve prior verified schedules.';
comment on function public.apply_hours_remediation_batch(
  text, text, text, jsonb
) is
  'Applies a complete remediation population atomically; invalid per-venue retries are recorded as bounded failed outcomes, including same-run replacement of stale request evidence.';
