\set ON_ERROR_STOP on

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'venues'
      and column_name = 'places_api_url'
  ) then
    raise exception 'places_api_url must be removed';
  end if;

  if not exists (
    select 1 from public.venues
    where id = 'legacy-1'
      and place_id = 'legacy-place-id'
      and opening_hours is null
      and hours_source_type is null
      and hours_review_status = 'unknown'
  ) then
    raise exception 'old unprovenanced row did not converge fail-closed';
  end if;

  if has_table_privilege('anon', 'public.hours_review_runs', 'select')
     or has_table_privilege('authenticated', 'public.hours_review_runs', 'select')
     or has_table_privilege('anon', 'public.hours_review_outcomes', 'select')
     or has_table_privilege('authenticated', 'public.hours_review_outcomes', 'select') then
    raise exception 'public roles must hold no service-table privileges';
  end if;

  if has_table_privilege('anon', 'public.venues', 'select')
     or has_table_privilege('authenticated', 'public.venues', 'select')
     or not has_column_privilege('anon', 'public.venues', 'id', 'select')
     or not has_column_privilege('authenticated', 'public.venues', 'opening_hours', 'select')
     or has_column_privilege('anon', 'public.venues', 'place_id', 'select')
     or has_column_privilege('authenticated', 'public.venues', 'hours_source_reference', 'select')
     or not has_table_privilege('service_role', 'public.venues', 'select') then
    raise exception 'venue column-level read boundary is incorrect';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('hours_review_runs', 'hours_review_outcomes')
      and ('anon' = any(roles) or 'authenticated' = any(roles) or 'public' = any(roles))
  ) then
    raise exception 'public role policy unexpectedly exists';
  end if;

  if not has_table_privilege(
       'service_role',
       'public.hours_review_runs',
       'select'
     )
     or not has_table_privilege(
       'service_role',
       'public.hours_review_outcomes',
       'select'
     )
     or has_table_privilege(
       'service_role',
       'public.hours_review_runs',
       'insert,update,delete'
     )
     or has_table_privilege(
       'service_role',
       'public.hours_review_outcomes',
       'insert,update,delete'
     )
     or not has_function_privilege(
       'service_role',
       'public.persist_hours_review_outcome(text,text,text,text,text,text,text,text)',
       'execute'
     )
     or has_function_privilege(
       'service_role',
       'public.apply_hours_remediation_outcome(text,text,text,text,text,text,jsonb,text,text,text,timestamptz,timestamptz,text,text,text,text,text,text,timestamptz)',
       'execute'
     ) then
    raise exception 'service role grants are not least-privilege';
  end if;
end
$$;

do $$
declare
  definition text;
begin
  if not public.is_safe_hours_source_reference(
    'venue-site:legacy-hours:2026-07-16'
  )
     or public.is_safe_hours_source_reference(
       'https://venue.example/opening-hours'
     )
     or public.is_safe_hours_source_reference(
       'venue-site:%2fprivate'
     ) then
    raise exception 'opaque source-reference allowlist is incorrect';
  end if;

  if not public.is_safe_hours_note('note:venue-owner-check')
     or public.is_safe_hours_note('Manually checked by the venue owner.')
     or public.is_safe_hours_note('See venue.example/opening-hours')
     or public.is_safe_hours_note('Authorization: Bearer secret-value') then
    raise exception 'bounded note policy is incorrect';
  end if;

  select pg_get_constraintdef(oid)
  into definition
  from pg_constraint
  where conrelid = 'public.hours_review_outcomes'::regclass
    and conname = 'hours_review_outcomes_run_venue_key';
  if definition <> 'UNIQUE (run_id, venue_id)' then
    raise exception 'run/venue uniqueness definition drifted: %', definition;
  end if;

  select pg_get_constraintdef(oid)
  into definition
  from pg_constraint
  where conrelid = 'public.hours_review_outcomes'::regclass
    and conname = 'hours_review_outcomes_run_id_fkey';
  if definition !~* '^FOREIGN KEY \(run_id\) REFERENCES hours_review_runs\(id\) ON DELETE CASCADE$' then
    raise exception 'run FK definition drifted: %', definition;
  end if;

  select pg_get_constraintdef(oid)
  into definition
  from pg_constraint
  where conrelid = 'public.hours_review_outcomes'::regclass
    and conname = 'hours_review_outcomes_venue_id_fkey';
  if definition !~* '^FOREIGN KEY \(venue_id\) REFERENCES venues\(id\) ON DELETE CASCADE$' then
    raise exception 'venue FK definition drifted: %', definition;
  end if;

  select pg_get_indexdef('public.hours_review_runs_one_active_run_idx'::regclass)
  into definition;
  if definition !~* '^CREATE UNIQUE INDEX hours_review_runs_one_active_run_idx ON public\.hours_review_runs USING btree \(status\) WHERE \(status = ''running''::text\)$' then
    raise exception 'one-active-run index definition drifted: %', definition;
  end if;
end
$$;

set role service_role;

\set ON_ERROR_STOP off
update public.hours_review_runs
set lease_expires_at = clock_timestamp()
where false;
\set service_review_dml_sqlstate :SQLSTATE
\set ON_ERROR_STOP on
select :'service_review_dml_sqlstate' = '42501' as service_review_dml_denied \gset
\if :service_review_dml_denied
\else
  \echo 'service review-table DML denial failed with SQLSTATE' :service_review_dml_sqlstate
  \quit 1
\endif

do $$
begin
  if not public.claim_hours_review_run(
    'run-lifecycle-loss', 'manual', clock_timestamp()
  )
     or not public.claim_hours_review_run(
       'run-lifecycle-loss', 'manual', clock_timestamp()
     ) then
    raise exception 'same-ID claim retry must reconcile as success';
  end if;
  if not public.persist_hours_review_outcome(
    'run-lifecycle-loss',
    'legacy-1',
    'legacy-hours',
    'current',
    'review_current'
  ) then
    raise exception 'lifecycle retry run could not persist its outcome';
  end if;
  if not public.finish_hours_review_run(
    'run-lifecycle-loss', 'completed', clock_timestamp(),
    1, 1, 0, 0, 0, 0, 0, 0, 0
  )
     or not public.finish_hours_review_run(
       'run-lifecycle-loss', 'completed', clock_timestamp(),
       1, 1, 0, 0, 0, 0, 0, 0, 0
     ) then
    raise exception 'terminal finish retry must reconcile as success';
  end if;
  if public.fail_hours_review_run(
    'run-lifecycle-loss', clock_timestamp()
  ) then
    raise exception 'completed run was incorrectly reclassified as failed';
  end if;

  if not public.claim_hours_review_run(
    'run-failure-loss', 'manual', clock_timestamp()
  )
     or not public.fail_hours_review_run(
       'run-failure-loss', clock_timestamp()
     )
     or not public.fail_hours_review_run(
       'run-failure-loss', clock_timestamp()
     ) then
    raise exception 'failed lifecycle retry must reconcile as success';
  end if;
end
$$;

reset role;

insert into public.venues (id, slug, opening_hours)
values ('population-drift', 'population-drift', null);

set role service_role;

do $$
begin
  if not public.claim_hours_review_run(
    'run-population-drift', 'scheduled', clock_timestamp()
  ) then
    raise exception 'population drift run could not claim';
  end if;
end
$$;

reset role;

insert into public.venues (id, slug, opening_hours)
values ('population-drift-late', 'population-drift-late', null);

set role service_role;

do $$
begin
  if public.finish_hours_review_run(
    'run-population-drift', 'completed', clock_timestamp(),
    0, 0, 0, 0, 0, 0, 0, 0, 0
  ) then
    raise exception 'run finished after its venue population changed';
  end if;
  if not public.fail_hours_review_run(
    'run-population-drift', clock_timestamp()
  ) then
    raise exception 'population drift run did not release its claim';
  end if;
end
$$;

reset role;

delete from public.venues
where id in ('population-drift', 'population-drift-late');

update public.venues
set opening_hours = '{"1":{"open":"11:00","close":"22:00"}}'::jsonb,
    hours_source_type = 'venue_website',
    hours_source_reference = 'venue-site:legacy-hours:2026-07-16',
    hours_review_status = 'verified',
    hours_reviewed_at = clock_timestamp() - interval '1 day',
    hours_next_review_at = clock_timestamp() + interval '89 days',
    hours_notes = 'note:venue-owner-check',
    hours_review_reason = null,
    hours_last_error_class = null
where id = 'legacy-1';

do $$
declare
  schedule_before jsonb;
  reference_before text;
begin
  select opening_hours, hours_source_reference
  into schedule_before, reference_before
  from public.venues
  where id = 'legacy-1';

  begin
    update public.venues
    set hours_notes = 'See venue.example/opening-hours'
    where id = 'legacy-1';
    raise exception 'unsafe note unexpectedly accepted';
  exception
    when check_violation then null;
  end;

  if not exists (
    select 1
    from public.venues
    where id = 'legacy-1'
      and opening_hours = schedule_before
      and hours_source_reference = reference_before
      and hours_notes = 'note:venue-owner-check'
  ) then
    raise exception 'unsafe note handling erased valid schedule provenance';
  end if;

  begin
    update public.venues
    set hours_reviewed_at = clock_timestamp() + interval '1 day',
        hours_next_review_at = clock_timestamp() + interval '91 days'
    where id = 'legacy-1';
    raise exception 'future review timestamp unexpectedly accepted';
  exception
    when check_violation then null;
  end;

  begin
    update public.venues
    set hours_source_reference = null
    where id = 'legacy-1';
    raise exception 'partial null provenance unexpectedly accepted';
  exception
    when check_violation then null;
  end;
end
$$;

set role service_role;

do $$
declare
  expected_updated_at timestamptz;
  reviewed_at timestamptz := clock_timestamp() - interval '1 minute';
  next_review_at timestamptz := clock_timestamp() + interval '90 days';
  input_fingerprint text := repeat('1', 64);
  claim_identity text := repeat('2', 64);
  request jsonb;
begin
  select updated_at
  into expected_updated_at
  from public.venues
  where id = 'legacy-1';

  request := jsonb_build_object(
    'venue_id', 'legacy-1',
    'venue_slug', 'legacy-hours',
    'opening_hours', '{"1":{"open":"10:00","close":"21:00"}}'::jsonb,
    'source_type', 'venue_website',
    'source_reference', 'venue-site:legacy-hours:2026-07-16',
    'review_status', 'verified',
    'reviewed_at', reviewed_at,
    'next_review_at', next_review_at,
    'notes', null,
    'review_reason', null,
    'last_error_class', null,
    'outcome', 'current',
    'reason', 'review_current',
    'error_class', null,
    'expected_updated_at', expected_updated_at
  );
  request := request || jsonb_build_object(
    'request_fingerprint',
    public.hours_remediation_request_fingerprint(request)
  );

  if not public.claim_hours_review_run(
    'run-batch-first', 'remediation', clock_timestamp(),
    input_fingerprint, claim_identity
  )
     or not public.apply_hours_remediation_batch(
       'run-batch-first', input_fingerprint, claim_identity,
       jsonb_build_array(request)
     )
     or not public.apply_hours_remediation_batch(
       'run-batch-first', input_fingerprint, claim_identity,
       jsonb_build_array(request)
     ) then
    raise exception 'same-run transactional batch retry failed';
  end if;
  if not public.finish_hours_review_run(
    'run-batch-first', 'completed', clock_timestamp(),
    1, 1, 0, 0, 0, 0, 0, 0, 0
  ) then
    raise exception 'first transactional batch did not finish';
  end if;

  if not public.claim_hours_review_run(
    'run-batch-resume', 'remediation', clock_timestamp(),
    input_fingerprint, claim_identity
  )
     or not public.apply_hours_remediation_batch(
       'run-batch-resume', input_fingerprint, claim_identity,
       jsonb_build_array(request)
     )
     or not public.finish_hours_review_run(
       'run-batch-resume', 'completed', clock_timestamp(),
       1, 1, 0, 0, 0, 0, 0, 0, 0
  ) then
    raise exception 'cross-process accepted-input resume failed';
  end if;

  update public.venues
  set opening_hours = '{"1":{"open":"12:00","close":"23:00"}}'::jsonb,
      hours_source_type = 'venue_website',
      hours_source_reference = 'venue-site:legacy-hours:changed',
      hours_review_status = 'verified',
      hours_reviewed_at = clock_timestamp() - interval '1 minute',
      hours_next_review_at = clock_timestamp() + interval '90 days',
      hours_notes = null,
      hours_review_reason = null,
      hours_last_error_class = null
  where id = 'legacy-1';

  if not public.claim_hours_review_run(
    'run-stale-historical-replay', 'remediation', clock_timestamp(),
    input_fingerprint, claim_identity
  )
     or not public.apply_hours_remediation_batch(
       'run-stale-historical-replay', input_fingerprint, claim_identity,
       jsonb_build_array(request)
     ) then
    raise exception 'stale historical remediation replay was not isolated';
  end if;
  if not exists (
    select 1
    from public.hours_review_outcomes
    where run_id = 'run-stale-historical-replay'
      and venue_id = 'legacy-1'
      and outcome = 'failed'
      and reason = 'classification_failed'
      and remediation_request_fingerprint =
        public.hours_remediation_request_fingerprint(request)
  )
     or not exists (
       select 1
       from public.venues
       where id = 'legacy-1'
         and opening_hours = '{"1":{"open":"12:00","close":"23:00"}}'::jsonb
         and hours_source_reference = 'venue-site:legacy-hours:changed'
         and hours_review_status = 'verified'
     ) then
    raise exception 'stale historical replay certified or rewrote changed governed state';
  end if;
  if not public.finish_hours_review_run(
    'run-stale-historical-replay', 'completed_with_failures',
    clock_timestamp(), 1, 0, 0, 0, 0, 0, 0, 1, 0
  ) then
    raise exception 'stale historical replay run did not finish coherently';
  end if;

  select updated_at
  into expected_updated_at
  from public.venues
  where id = 'legacy-1';

  request := jsonb_build_object(
    'venue_id', 'legacy-1',
    'venue_slug', 'legacy-hours',
    'opening_hours', null,
    'source_type', 'venue_website',
    'source_reference', 'venue-site:legacy-hours:conflict',
    'review_status', 'manual_review',
    'reviewed_at', reviewed_at,
    'next_review_at', next_review_at,
    'notes', null,
    'review_reason', 'provenance_conflict',
    'last_error_class', null,
    'outcome', 'conflicting',
    'reason', 'provenance_conflict',
    'error_class', null,
    'expected_updated_at', expected_updated_at
  );
  request := request || jsonb_build_object(
    'request_fingerprint',
    public.hours_remediation_request_fingerprint(request)
  );

  if not public.claim_hours_review_run(
    'run-provenance-conflict', 'remediation', clock_timestamp(),
    input_fingerprint, claim_identity
  )
     or not public.apply_hours_remediation_batch(
       'run-provenance-conflict', input_fingerprint, claim_identity,
       jsonb_build_array(request)
     ) then
    raise exception 'manual_review/provenance_conflict remediation was rejected';
  end if;
  if not exists (
    select 1
    from public.venues
    where id = 'legacy-1'
      and opening_hours = '{"1":{"open":"12:00","close":"23:00"}}'::jsonb
      and hours_source_reference = 'venue-site:legacy-hours:changed'
      and hours_review_status = 'manual_review'
      and hours_review_reason = 'provenance_conflict'
      and hours_last_error_class is null
  )
     or not exists (
       select 1
       from public.hours_review_outcomes
       where run_id = 'run-provenance-conflict'
         and venue_id = 'legacy-1'
         and outcome = 'conflicting'
         and reason = 'provenance_conflict'
         and error_class is null
     ) then
    raise exception 'provenance-conflict remediation did not preserve and classify state';
  end if;
  if not public.finish_hours_review_run(
    'run-provenance-conflict', 'completed', clock_timestamp(),
    1, 0, 0, 0, 0, 1, 0, 0, 0
  ) then
    raise exception 'provenance-conflict remediation did not finish coherently';
  end if;
end
$$;

reset role;

insert into public.venues (id, slug, opening_hours)
values ('atomic-second', 'atomic-second', null);

set role service_role;

do $$
declare
  first_updated_at timestamptz;
  second_updated_at timestamptz;
  first_schedule jsonb;
  input_fingerprint text := repeat('4', 64);
  claim_identity text := repeat('5', 64);
  first_request jsonb;
  second_request jsonb;
  requests jsonb;
begin
  select updated_at, opening_hours
  into first_updated_at, first_schedule
  from public.venues
  where id = 'legacy-1';
  select updated_at
  into second_updated_at
  from public.venues
  where id = 'atomic-second';

  first_request := jsonb_build_object(
      'venue_id', 'legacy-1',
      'venue_slug', 'legacy-hours',
      'opening_hours', '{"1":{"open":"09:00","close":"20:00"}}'::jsonb,
      'source_type', 'venue_website',
      'source_reference', 'venue-site:legacy-hours:atomic',
      'review_status', 'verified',
      'reviewed_at', clock_timestamp() - interval '1 minute',
      'next_review_at', clock_timestamp() + interval '90 days',
      'notes', null,
      'review_reason', null,
      'last_error_class', null,
      'outcome', 'current',
      'reason', 'review_current',
      'error_class', null,
      'expected_updated_at', first_updated_at
    );
  first_request := first_request || jsonb_build_object(
    'request_fingerprint',
    public.hours_remediation_request_fingerprint(first_request)
  );
  second_request := jsonb_build_object(
      'venue_id', 'atomic-second',
      'venue_slug', 'atomic-second',
      'opening_hours', null,
      'source_type', null,
      'source_reference', null,
      'review_status', 'unknown',
      'reviewed_at', null,
      'next_review_at', null,
      'notes', null,
      'review_reason', null,
      'last_error_class', null,
      'outcome', 'unknown',
      'reason', 'hours_unknown',
      'error_class', null,
      'expected_updated_at', second_updated_at - interval '1 second'
    );
  second_request := second_request || jsonb_build_object(
    'request_fingerprint',
    public.hours_remediation_request_fingerprint(second_request)
  );
  requests := jsonb_build_array(first_request, second_request);

  if not public.claim_hours_review_run(
    'run-batch-isolation', 'remediation', clock_timestamp(),
    input_fingerprint, claim_identity
  ) then
    raise exception 'per-venue isolation run could not claim';
  end if;

  if not public.apply_hours_remediation_batch(
    'run-batch-isolation', input_fingerprint, claim_identity, requests
  ) then
    raise exception 'per-venue isolation batch was rejected';
  end if;

  if not exists (
    select 1
    from public.venues
    where id = 'legacy-1'
      and updated_at <> first_updated_at
      and opening_hours = '{"1":{"open":"09:00","close":"20:00"}}'::jsonb
  )
     or not exists (
       select 1
       from public.hours_review_outcomes
       where run_id = 'run-batch-isolation'
         and venue_id = 'atomic-second'
         and outcome = 'failed'
         and reason = 'classification_failed'
     ) then
    raise exception 'stale venue was not isolated from the valid venue write';
  end if;

  if not public.finish_hours_review_run(
    'run-batch-isolation', 'completed_with_failures', clock_timestamp(),
    2, 1, 0, 0, 0, 0, 0, 1, 0
  ) then
    raise exception 'per-venue isolation run did not finish coherently';
  end if;
end
$$;

reset role;

delete from public.venues
where id = 'atomic-second';

-- The public projection is selectable, while service metadata remains denied.
set role anon;
select id, slug, opening_hours from public.venues limit 1;
reset role;

set role authenticated;
select id, slug, opening_hours from public.venues limit 1;
reset role;

\set ON_ERROR_STOP off
set role anon;
select place_id from public.venues limit 1;
\set anon_place_id_sqlstate :SQLSTATE
reset role;
\set ON_ERROR_STOP on
select :'anon_place_id_sqlstate' = '42501' as anon_place_id_denied \gset
\if :anon_place_id_denied
\else
  \echo 'anon place_id denial failed with SQLSTATE' :anon_place_id_sqlstate
  \quit 1
\endif

\set ON_ERROR_STOP off
set role authenticated;
select hours_source_reference from public.venues limit 1;
\set authenticated_provenance_sqlstate :SQLSTATE
reset role;
\set ON_ERROR_STOP on
select :'authenticated_provenance_sqlstate' = '42501' as authenticated_provenance_denied \gset
\if :authenticated_provenance_denied
\else
  \echo 'authenticated provenance denial failed with SQLSTATE' :authenticated_provenance_sqlstate
  \quit 1
\endif

-- Exercise actual SET ROLE denial, not only catalog grants.
\set ON_ERROR_STOP off
set role anon;
select * from public.hours_review_runs limit 1;
\set anon_denial_sqlstate :SQLSTATE
reset role;
\set ON_ERROR_STOP on
select :'anon_denial_sqlstate' = '42501' as anon_denied \gset
\if :anon_denied
\else
  \echo 'anon SELECT denial failed with SQLSTATE' :anon_denial_sqlstate
  \quit 1
\endif

\set ON_ERROR_STOP off
set role authenticated;
select * from public.hours_review_outcomes limit 1;
\set authenticated_denial_sqlstate :SQLSTATE
reset role;
\set ON_ERROR_STOP on
select :'authenticated_denial_sqlstate' = '42501' as authenticated_denied \gset
\if :authenticated_denied
\else
  \echo 'authenticated SELECT denial failed with SQLSTATE' :authenticated_denial_sqlstate
  \quit 1
\endif

set role service_role;

do $$
begin
  if not public.claim_hours_review_run('run-1', 'manual', '1900-01-01T00:00:00Z') then
    raise exception 'first run claim must succeed';
  end if;
  if not exists (
    select 1 from public.hours_review_runs
    where id = 'run-1'
      and started_at > clock_timestamp() - interval '1 minute'
      and lease_expires_at > clock_timestamp() + interval '14 minutes'
  ) then
    raise exception 'claim timestamps must come from database time';
  end if;
  if public.claim_hours_review_run('run-overlap', 'scheduled', '2026-07-13T10:01:00Z') then
    raise exception 'overlapping run claim must fail';
  end if;
end
$$;

do $$
begin
  if not public.persist_hours_review_outcome(
    'run-1',
    'legacy-1',
    'legacy-hours',
    'missing_provenance',
    'missing_provenance'
  ) then
    raise exception 'active parent must accept a serialized outcome';
  end if;
end
$$;

do $$
begin
  if not public.finish_hours_review_run(
    'run-1', 'completed', '2026-07-13T10:05:00Z',
    1, 0, 1, 0, 0, 0, 0, 0, 0
  ) then
    raise exception 'consistent run-1 summary must finish';
  end if;
  if public.persist_hours_review_outcome(
    'run-1', 'legacy-1', 'legacy-hours', 'current', 'review_current'
  ) then
    raise exception 'terminal parent unexpectedly accepted a late outcome';
  end if;
end
$$;

do $$
begin
  if not public.claim_hours_review_run('run-2', 'scheduled', '2026-07-13T10:06:00Z') then
    raise exception 'claim after finish must succeed';
  end if;
end
$$;

do $$
begin
  if public.finish_hours_review_run(
    'run-2', 'completed', '2026-07-13T10:07:00Z',
    2, 1, 0, 0, 0, 0, 0, 0, 0
  ) then
    raise exception 'inconsistent run-2 summary unexpectedly finished';
  end if;
  if public.finish_hours_review_run(
    'run-2', 'completed', '2026-07-13T10:07:00Z',
    1, 1, 0, 0, 0, 0, 0, 0, 0
  ) then
    raise exception 'caller-summed but childless run-2 unexpectedly finished';
  end if;
end
$$;

do $$
begin
  if not public.persist_hours_review_outcome(
    'run-2', 'legacy-1', 'legacy-hours', 'current', 'review_current'
  ) then
    raise exception 'run-2 serialized outcome must persist';
  end if;
end
$$;

do $$
begin
  if not public.finish_hours_review_run(
    'run-2', 'completed', '2026-07-13T10:08:00Z',
    1, 1, 0, 0, 0, 0, 0, 0, 0
  ) then
    raise exception 'child-derived run-2 summary must finish';
  end if;
end
$$;

do $$
begin
  if not public.claim_hours_review_run('run-stale', 'scheduled', '2026-07-13T11:00:00Z') then
    raise exception 'stale-run test claim must succeed';
  end if;
end
$$;

reset role;

update public.hours_review_runs
set lease_expires_at = clock_timestamp() - interval '1 second'
where id = 'run-stale';

set role service_role;

do $$
begin
  if not public.claim_hours_review_run('run-after-stale', 'scheduled', '2999-01-01T00:00:00Z') then
    raise exception 'expired lease must be recovered for the next claimant';
  end if;
  if not public.fail_hours_review_run('run-after-stale', '2026-07-13T11:17:00Z') then
    raise exception 'failure finalizer must release the recovered claim';
  end if;
  if not exists (
    select 1 from public.hours_review_runs
    where id = 'run-stale' and status = 'failed'
  ) then
    raise exception 'expired run was not finalized as failed';
  end if;
end
$$;

reset role;

insert into public.hours_review_runs (
  id,
  trigger_type,
  status,
  started_at,
  finished_at,
  lease_expires_at
) values (
  'run-expired',
  'manual',
  'completed',
  clock_timestamp() - interval '181 days',
  clock_timestamp() - interval '181 days',
  clock_timestamp() - interval '181 days'
), (
  'run-young',
  'manual',
  'completed',
  clock_timestamp() - interval '1 day',
  clock_timestamp() - interval '1 day',
  clock_timestamp() - interval '1 day'
);

set role service_role;

do $$
declare
  pruned integer;
begin
  select public.prune_hours_review_history('2999-01-01T00:00:00Z'::timestamptz)
  into pruned;
  if pruned <> 1 then
    raise exception 'expected one expired run to be pruned, got %', pruned;
  end if;
  if not exists (
    select 1 from public.hours_review_runs where id = 'run-young'
  ) then
    raise exception 'worker cutoff pruned history younger than 180 days';
  end if;
end
$$;

update public.venues
set opening_hours = '{"1":{"open":"11:00","close":"22:00"}}'::jsonb,
    hours_source_type = 'venue_website',
    hours_source_reference = 'owner-attested:fixture-original',
    hours_review_status = 'verified',
    hours_reviewed_at = now() - interval '1 day',
    hours_next_review_at = now() + interval '89 days',
    hours_review_reason = null,
    hours_last_error_class = null
where id = 'legacy-1';

do $$
declare
  remediation_run text := 'run-remediation-' || txid_current()::text;
  expired_run text := 'run-expired-remediation-' || txid_current()::text;
  input_fingerprint text := repeat('a', 64);
  claim_identity text := repeat('b', 64);
  expected_updated_at timestamptz;
  request jsonb;
  changed_request jsonb;
begin
  select updated_at into expected_updated_at
  from public.venues where id = 'legacy-1';

  if public.claim_hours_review_run(
    'unbound-remediation', 'remediation', now()
  ) then
    raise exception 'legacy claim created an unbound remediation run';
  end if;
  if public.claim_hours_review_run(
    remediation_run, 'remediation', now(), null, claim_identity
  )
     or public.claim_hours_review_run(
       remediation_run, 'remediation', now(), input_fingerprint, null
     ) then
    raise exception 'nullable remediation ownership was accepted';
  end if;

  if not public.claim_hours_review_run(
    remediation_run, 'remediation', now(),
    input_fingerprint, claim_identity
  ) then
    raise exception 'remediation test claim must succeed';
  end if;
  if not public.renew_hours_review_run_lease(
    remediation_run, input_fingerprint, claim_identity
  ) then
    raise exception 'active remediation lease must renew';
  end if;
  if public.is_hours_review_run_active(
    remediation_run, 'remediation', null, null
  ) then
    raise exception 'nullable active-state arguments behaved as wildcards';
  end if;

  request := jsonb_build_object(
    'venue_id', 'legacy-1',
    'venue_slug', 'legacy-hours',
    'opening_hours', null,
    'source_type', 'venue_website',
    'source_reference', 'owner-attested:replacement-must-not-win',
    'review_status', 'manual_review',
    'reviewed_at', clock_timestamp() - interval '1 minute',
    'next_review_at', clock_timestamp() + interval '90 days',
    'notes', null,
    'review_reason', 'unsupported_24_7',
    'last_error_class', null,
    'outcome', 'failed',
    'reason', 'unsupported_24_7',
    'error_class', 'validation_failed',
    'expected_updated_at', expected_updated_at
  );
  request := request || jsonb_build_object(
    'request_fingerprint',
    public.hours_remediation_request_fingerprint(request)
  );

  if not public.apply_hours_remediation_batch(
    remediation_run,
    input_fingerprint,
    claim_identity,
    jsonb_build_array(request)
  )
     or not public.apply_hours_remediation_batch(
       remediation_run,
       input_fingerprint,
       claim_identity,
       jsonb_build_array(request)
     ) then
    raise exception 'exact remediation request and retry must succeed';
  end if;

  if not exists (
    select 1 from public.venues
    where id = 'legacy-1'
      and opening_hours = '{"1":{"open":"11:00","close":"22:00"}}'::jsonb
      and hours_source_reference = 'owner-attested:fixture-original'
      and hours_review_status = 'manual_review'
      and hours_review_reason = 'unsupported_24_7'
  ) then
    raise exception 'prior verified schedule/provenance was not preserved';
  end if;
  if not exists (
    select 1 from public.hours_review_outcomes
    where run_id = remediation_run
      and venue_id = 'legacy-1'
      and prior_review_status = 'verified'
      and resulting_review_status = 'manual_review'
  ) then
    raise exception 'remediation retry destroyed the true prior review status';
  end if;

  changed_request := jsonb_set(
    request,
    '{source_reference}',
    to_jsonb('owner-attested:changed-stale-request'::text)
  );
  if not public.apply_hours_remediation_batch(
    remediation_run,
    input_fingerprint,
    claim_identity,
    jsonb_build_array(changed_request)
  )
     or not public.apply_hours_remediation_batch(
       remediation_run,
       input_fingerprint,
       claim_identity,
       jsonb_build_array(changed_request)
  ) then
    raise exception 'fingerprint mismatch retry was not isolated as a failed venue';
  end if;
  if not exists (
    select 1
    from public.hours_review_outcomes
    where run_id = remediation_run
      and venue_id = 'legacy-1'
      and outcome = 'failed'
      and reason = 'classification_failed'
      and remediation_request_fingerprint =
        public.hours_remediation_request_fingerprint(changed_request)
      and remediation_request_fingerprint <>
        request ->> 'request_fingerprint'
  ) then
    raise exception 'database did not replace stale caller-fingerprint evidence';
  end if;

  if not public.finish_hours_review_run(
    remediation_run, 'completed_with_failures', now(),
    1, 0, 0, 0, 0, 0, 0, 1, 0
  ) then
    raise exception 'remediation run with derived failed outcome must finish';
  end if;
  if public.claim_hours_review_run(
    remediation_run,
    'remediation',
    now(),
    input_fingerprint,
    claim_identity
  ) then
    raise exception 'terminal remediation run was reopened';
  end if;

  if not public.claim_hours_review_run(
    expired_run, 'remediation', now(),
    repeat('f', 64), repeat('0', 64)
  ) then
    raise exception 'expired-remediation test claim must succeed';
  end if;
end
$$;

reset role;

update public.hours_review_runs
set lease_expires_at = clock_timestamp() - interval '1 second'
where id like 'run-expired-remediation-%'
  and status = 'running';

set role service_role;

do $$
declare
  expired_run text;
begin
  select id
  into expired_run
  from public.hours_review_runs
  where id like 'run-expired-remediation-%'
  order by started_at desc
  limit 1;
  if public.renew_hours_review_run_lease(
    expired_run, repeat('f', 64), repeat('0', 64)
  ) then
    raise exception 'expired remediation lease unexpectedly renewed';
  end if;
  if public.claim_hours_review_run(
    expired_run, 'remediation', now(),
    repeat('f', 64), repeat('0', 64)
  ) then
    raise exception 'expired same-ID remediation run was reopened';
  end if;
  if not public.fail_hours_review_run(expired_run, now()) then
    raise exception 'expired remediation test run must finalize failed';
  end if;
end
$$;

do $$
begin
  if not public.claim_hours_review_run(
    'run-persistence-marker', 'manual', clock_timestamp()
  )
     or not public.record_hours_review_persistence_failure(
       'run-persistence-marker', 'legacy-1', 'legacy-hours'
     )
     or not public.record_hours_review_persistence_failure(
       'run-persistence-marker', 'legacy-1', 'legacy-hours'
     ) then
    raise exception 'bounded persistence marker seam failed';
  end if;
  if not exists (
    select 1
    from public.hours_review_runs
    where id = 'run-persistence-marker'
      and outcome_persistence_failure_count = 1
      and outcome_persistence_failures =
        '[{"venueId":"legacy-1","venueSlug":"legacy-hours"}]'::jsonb
  ) then
    raise exception 'persistence marker shape/count is incoherent';
  end if;
  if not public.fail_hours_review_run(
    'run-persistence-marker', clock_timestamp()
  ) then
    raise exception 'persistence marker run did not finalize';
  end if;
end
$$;

reset role;

do $$
begin
  begin
    update public.hours_review_runs
    set outcome_persistence_failure_count = 1,
        outcome_persistence_failures =
          '[{"venueId":"legacy-1","extra":"forbidden"}]'::jsonb
    where id = 'run-persistence-marker';
    raise exception 'invalid persistence marker shape unexpectedly accepted';
  exception
    when check_violation then null;
  end;
end
$$;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid in (
      'public.venues'::regclass,
      'public.hours_review_runs'::regclass,
      'public.hours_review_outcomes'::regclass
    )
      and conname in (
        'venues_hours_state_coherence_check',
        'venues_opening_hours_shape_check',
        'hours_review_runs_counter_sum_check',
        'hours_review_outcomes_coherence_check'
      )
      and not convalidated
  ) then
    raise exception 'coherence constraints must be validated';
  end if;

  begin
    update public.venues
    set opening_hours = '{"8":{"open":"09:00","close":"17:00"}}'::jsonb
    where id = 'legacy-1';
    raise exception 'out-of-range weekday unexpectedly accepted';
  exception
    when check_violation then null;
  end;

  begin
    update public.venues
    set opening_hours = '{"1":{"open":"09:00","close":"09:00"}}'::jsonb
    where id = 'legacy-1';
    raise exception 'zero-length interval unexpectedly accepted';
  exception
    when check_violation then null;
  end;

  begin
    update public.venues
    set opening_hours = '{}'::jsonb
    where id = 'legacy-1';
  exception
    when check_violation then
      raise exception 'all-closed canonical schedule was rejected';
  end;

  begin
    update public.venues set hours_source_type = 'google' where id = 'legacy-1';
    raise exception 'invalid source type unexpectedly accepted';
  exception
    when check_violation then null;
  end;

  begin
    update public.venues set place_id = '   ' where id = 'legacy-1';
    raise exception 'blank place_id unexpectedly accepted';
  exception
    when check_violation then null;
  end;

  begin
    update public.venues
    set hours_source_reference = 'https://forbidden.example/hours'
    where id = 'legacy-1';
    raise exception 'URL provenance reference unexpectedly accepted';
  exception
    when check_violation then null;
  end;

  begin
    update public.venues
    set opening_hours = '{"1":{"open":"09:00","close":"17:00"}}'::jsonb,
        hours_review_status = null,
        hours_source_type = 'venue_website',
        hours_source_reference = 'owner-attested:fixture',
        hours_reviewed_at = now(),
        hours_next_review_at = now() + interval '90 days'
    where id = 'legacy-1';
    raise exception 'null-status coherence bypass unexpectedly accepted';
  exception
    when check_violation then null;
  end;

  begin
    update public.venues
    set hours_source_reference = '   '
    where id = 'legacy-1';
    raise exception 'whitespace-only source reference unexpectedly accepted';
  exception
    when check_violation then null;
  end;

  if not public.claim_hours_review_run(
    'run-invalid-outcome', 'manual', clock_timestamp()
  ) then
    raise exception 'invalid-outcome constraint test could not claim a run';
  end if;
  begin
    perform public.persist_hours_review_outcome(
      'run-invalid-outcome',
      'legacy-1',
      'legacy-hours',
      'current',
      'classification_failed'
    );
    raise exception 'contradictory audit outcome unexpectedly accepted';
  exception
    when check_violation then null;
  end;
  if not public.fail_hours_review_run(
    'run-invalid-outcome', clock_timestamp()
  ) then
    raise exception 'invalid-outcome constraint test did not release its run';
  end if;
end
$$;
