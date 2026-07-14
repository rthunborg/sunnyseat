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
      and opening_hours = '{"1":{"open":"11:00","close":"22:00"}}'::jsonb
      and hours_source_type is null
      and hours_review_status is null
  ) then
    raise exception 'old-row compatibility failed';
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
       'select,insert,update,delete'
     )
     or not has_table_privilege(
       'service_role',
       'public.hours_review_outcomes',
       'select,insert,update'
     )
     or has_table_privilege(
       'service_role',
       'public.hours_review_outcomes',
       'delete'
     ) then
    raise exception 'service role grants are not least-privilege';
  end if;
end
$$;

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
  if not public.claim_hours_review_run('run-1', 'manual', '2026-07-13T10:00:00Z') then
    raise exception 'first run claim must succeed';
  end if;
  if public.claim_hours_review_run('run-overlap', 'scheduled', '2026-07-13T10:01:00Z') then
    raise exception 'overlapping run claim must fail';
  end if;
end
$$;

insert into public.hours_review_outcomes (
  run_id,
  venue_id,
  venue_slug,
  outcome,
  reason
) values (
  'run-1',
  'legacy-1',
  'legacy-hours',
  'missing_provenance',
  'missing_provenance'
) on conflict (run_id, venue_id) do update
set outcome = excluded.outcome,
    reason = excluded.reason;

do $$
begin
  if not public.finish_hours_review_run(
    'run-1', 'completed', '2026-07-13T10:05:00Z',
    1, 0, 1, 0, 0, 0, 0, 0, 0
  ) then
    raise exception 'consistent run-1 summary must finish';
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
  if not public.finish_hours_review_run(
    'run-2', 'completed', '2026-07-13T10:07:00Z',
    1, 1, 0, 0, 0, 0, 0, 0, 0
  ) then
    raise exception 'consistent run-2 summary must finish';
  end if;
end
$$;

do $$
begin
  if not public.claim_hours_review_run('run-stale', 'scheduled', '2026-07-13T11:00:00Z') then
    raise exception 'stale-run test claim must succeed';
  end if;
  if not public.claim_hours_review_run('run-after-stale', 'scheduled', '2026-07-13T11:16:00Z') then
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
  '2025-12-01T10:00:00Z',
  '2025-12-01T10:01:00Z',
  '2025-12-01T10:01:00Z'
);

do $$
declare
  pruned integer;
begin
  select public.prune_hours_review_history('2026-07-13T10:00:00Z'::timestamptz - interval '180 days')
  into pruned;
  if pruned <> 1 then
    raise exception 'expected one expired run to be pruned, got %', pruned;
  end if;
end
$$;

reset role;

do $$
begin
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
        hours_review_status = 'unknown'
    where id = 'legacy-1';
    raise exception 'public schedule without verified provenance unexpectedly accepted';
  exception
    when check_violation then null;
  end;

  begin
    insert into public.hours_review_outcomes (
      run_id, venue_id, venue_slug, outcome, reason
    ) values (
      'run-2', 'legacy-1', 'legacy-hours', 'current', 'classification_failed'
    );
    raise exception 'contradictory audit outcome unexpectedly accepted';
  exception
    when check_violation then null;
  end;
end
$$;
