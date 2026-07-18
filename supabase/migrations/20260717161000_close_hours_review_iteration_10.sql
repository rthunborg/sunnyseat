-- Story 12.1 review iteration 10: make exact retries of same-run invalid
-- remediation requests idempotent while continuing to reject mismatched
-- fallback evidence.

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
  existing_fallback public.hours_review_outcomes%rowtype;
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
    if persisted_count = 1 then
      continue;
    end if;

    select *
    into existing_fallback
    from public.hours_review_outcomes
    where run_id = p_run_id
      and venue_id = request ->> 'venue_id'
    for update;

    if found
       and existing_fallback.venue_slug = canonical_slug
       and existing_fallback.outcome = 'failed'
       and existing_fallback.reason = 'classification_failed'
       and existing_fallback.error_class = 'validation_failed'
       and existing_fallback.resulting_review_status is not distinct from
         prior_status
       and existing_fallback.resulting_venue_updated_at is not distinct from
         prior_updated_at
       and existing_fallback.remediation_input_fingerprint =
         p_remediation_input_fingerprint
       and existing_fallback.remediation_request_fingerprint =
         canonical_request_fingerprint then
      continue;
    end if;

    raise exception 'remediation fallback outcome conflict'
      using errcode = 'P0001';
  end loop;
  return true;
end;
$$;

revoke all on function public.apply_hours_remediation_batch(
  text, text, text, jsonb
) from public, anon, authenticated, service_role;
grant execute on function public.apply_hours_remediation_batch(
  text, text, text, jsonb
) to service_role;

comment on function public.apply_hours_remediation_batch(
  text, text, text, jsonb
) is
  'Applies a complete remediation population atomically; invalid per-venue retries reconcile when the existing fallback evidence has the same canonical request/input identity and unchanged governed state.';
