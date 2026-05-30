-- MANUAL-RUN ONLY: review before executing in Supabase
-- Story 3.0: Remove Admin Surface & Adopt Manual Venue Operations
--
-- Repo audit basis:
-- - The checkout does not include authoritative Supabase migrations/schema.
-- - nextjs-app/lib/supabase/types.ts is still a placeholder.
-- - Destructive table/column/policy drops are therefore intentionally not guessed here.
--
-- Run the diagnostics first. If they return objects, review each one before
-- writing follow-up drop/rename SQL.

-- ---------------------------------------------------------------------------
-- Diagnostics: retired admin/candidate-review objects
-- ---------------------------------------------------------------------------

select table_schema, table_name
from information_schema.tables
where table_schema not in ('pg_catalog', 'information_schema')
  and (
    table_name in ('admin_users', 'venue_candidates', 'admin_audit_logs')
    or table_name ilike '%admin%'
    or table_name ilike '%candidate%'
  )
order by table_schema, table_name;

select table_schema, table_name, column_name, data_type, udt_name
from information_schema.columns
where table_schema not in ('pg_catalog', 'information_schema')
  and (
    column_name ilike '%admin%'
    or column_name ilike '%candidate%'
    or column_name in ('VerificationStatus', 'verification_status', 'ReviewNeeded', 'review_needed', 'UpdatedBy')
  )
order by table_schema, table_name, ordinal_position;

select n.nspname as schema_name, p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname not in ('pg_catalog', 'information_schema')
  and (
    p.proname ilike '%admin%'
    or p.proname ilike '%candidate%'
    or p.proname ilike '%approve%'
    or p.proname ilike '%reject%'
  )
order by schema_name, function_name;

select schemaname, tablename, policyname
from pg_policies
where policyname ilike '%admin%'
   or policyname ilike '%candidate%'
order by schemaname, tablename, policyname;

-- ---------------------------------------------------------------------------
-- Safe conversion: neutralize text height source values, if present
-- ---------------------------------------------------------------------------

do $$
declare
  column_kind text;
begin
  select data_type
  into column_kind
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'buildings'
    and column_name = 'HeightSource';

  if column_kind in ('character varying', 'character', 'text') then
    update public.buildings
    set "HeightSource" = 'ManualOverride'
    where "HeightSource" = 'AdminOverride';
  end if;
end $$;

-- If diagnostics show HeightSource is a PostgreSQL enum that still contains
-- AdminOverride, inspect the enum type name before adding an ALTER TYPE
-- rename. This file does not guess the enum name.
select n.nspname as schema_name, t.typname as enum_name, e.enumlabel
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where e.enumlabel in ('AdminOverride', 'ManualOverride')
order by schema_name, enum_name, e.enumsortorder;

-- ---------------------------------------------------------------------------
-- No destructive cleanup included
-- ---------------------------------------------------------------------------
-- Any drop table/drop column/drop policy migration should be authored after the
-- diagnostics above are reviewed against the live Supabase schema.
