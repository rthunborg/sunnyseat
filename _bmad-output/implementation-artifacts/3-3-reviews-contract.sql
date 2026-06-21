-- Story 3.3 manual review persistence contract.
-- Do not run automatically. This is an implementation handoff artifact for
-- environments that explicitly opt into SUNNYSEAT_REVIEW_PERSISTENCE=supabase.
--
-- Story 8.4 added the RLS section below (public read + server-only write); the
-- table/index DDL above it is unchanged. Apply the whole file together. The
-- live apply is a maintainer / Story 8.5 cutover step, not an automated one.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  venue_id text not null,
  venue_slug text not null,
  text text not null check (char_length(text) between 1 and 1000),
  rating integer check (rating between 1 and 5),
  photo_name text check (photo_name is null or char_length(photo_name) <= 120),
  photo_type text check (photo_type is null or photo_type like 'image/%'),
  photo_size integer check (photo_size is null or photo_size between 1 and 5242880),
  photo_last_modified bigint check (photo_last_modified is null or photo_last_modified >= 0),
  created_at timestamptz not null default now()
);

create index if not exists reviews_venue_created_at_idx
  on public.reviews (venue_id, created_at desc);

-- MVP reviews are anonymous public consumer content. This contract has no
-- user_id, email, name, coordinates, raw IP, moderation workflow, or payment
-- dependency. The public-read / server-only-write RLS policies are authored in
-- the section below (Story 8.4) and should be applied together with this table.

-- ============================================================================
-- Section: privileges / RLS (Story 8.4) — public read, server-only write
-- ============================================================================
--
-- reviews are anonymous public consumer content: anon + authenticated may
-- SELECT, but only the server service_role may INSERT. The runtime reads and
-- writes via getSupabaseServiceRole() (lib/supabase/server.ts), which BYPASSES
-- RLS; the public-read policy is the access-model contract + a future anon read
-- path, not what the server uses today. Deny-by-default (revoke-all) is
-- preserved before the explicit grants, mirroring 8-2-venues-store-contract.sql
-- §3. Idempotent: drop-if-exists before each create so re-running is safe.
-- Security checklist: USING(true) is acceptable ONLY on the public SELECT
-- policy (genuinely public content); the write policy is scoped via an explicit
-- TO service_role + WITH CHECK, never USING(true); no FOR ALL policy.

alter table public.reviews enable row level security;

revoke all on table public.reviews from anon;
revoke all on table public.reviews from authenticated;
revoke all on table public.reviews from public;

grant select on table public.reviews to anon, authenticated;     -- base privilege for the read policy
grant select, insert on table public.reviews to service_role;

drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read
  on public.reviews for select
  to anon, authenticated
  using (true);                       -- read-only PUBLIC content; USING(true) OK for SELECT

drop policy if exists reviews_service_write on public.reviews;
create policy reviews_service_write
  on public.reviews for insert
  to service_role
  with check (true);                  -- write scoped via TO service_role, NOT USING(true)

-- ============================================================================
-- Section: smoke checks (run after apply)
-- ============================================================================

-- Expect RLS enabled on public.reviews.
select relrowsecurity as reviews_rls_enabled
from pg_class
where oid = 'public.reviews'::regclass;

-- Expect exactly two policies: reviews_public_read (select, {anon,authenticated})
-- and reviews_service_write (insert, {service_role}). Confirm NO anon/authenticated
-- INSERT/UPDATE/DELETE policy and NO policy with cmd in (UPDATE, DELETE, ALL).
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'reviews'
order by policyname;

-- Expect: anon + authenticated hold SELECT only; service_role holds SELECT + INSERT.
-- There must be NO INSERT/UPDATE/DELETE grant to anon or authenticated.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'reviews'
order by grantee, privilege_type;
