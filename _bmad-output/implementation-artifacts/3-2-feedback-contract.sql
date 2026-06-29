-- Story 3.2 feedback contract artifact.
-- Not applied automatically. Maintainers can adapt this when Supabase
-- persistence replaces the current fixture-backed route.
--
-- Story 8.4 added the server-only-write RLS section below; the table DDL above
-- it is unchanged. Apply the whole file together. The live apply is a
-- maintainer / Story 8.5 cutover step, not an automated one.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  -- Current Story 3.2 runtime is fixture/API-contract backed and uses string
  -- identifiers such as "1". Reintroduce a typed FK when the real venue table
  -- contract is wired into the feedback route.
  venue_id text not null,
  venue_slug text not null,
  user_timestamp timestamptz not null,
  predicted_state text not null check (predicted_state in ('Sunny', 'Partial', 'Shaded', 'NoSun')),
  sun_accuracy text check (
    sun_accuracy is null
    or sun_accuracy in ('sunny', 'not_sunny', 'unsure')
  ),
  confidence_at_prediction numeric check (
    confidence_at_prediction is null
    or (confidence_at_prediction >= 0 and confidence_at_prediction <= 100)
  ),
  was_sunny boolean,
  outdoor_seating_confirmed boolean,
  note text check (
    note is null
    or (char_length(note) <= 500 and note !~ E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]')
  ),
  created_at timestamptz not null default now(),
  check (
    sun_accuracy is not null
    or was_sunny is not null
    or outdoor_seating_confirmed is not null
    or nullif(btrim(note), '') is not null
  ),
  check (
    (sun_accuracy is null)
    or (sun_accuracy = 'sunny' and was_sunny is true)
    or (sun_accuracy = 'not_sunny' and was_sunny is false)
    or (sun_accuracy = 'unsure' and was_sunny is null)
  )
);

-- ============================================================================
-- Section: privileges / RLS (Story 8.4) — server-only write sink
-- ============================================================================
--
-- feedback is a WRITE-ONLY sink in the sense that it is NEVER publicly readable:
-- there is NO anon/authenticated/public policy or grant of any kind (deliberately
-- asymmetric with reviews, which are public content). Only the server service_role
-- may touch the table, and it writes via getSupabaseServiceRole()
-- (lib/supabase/server.ts), which BYPASSES RLS. The adapter persists with
-- `insert(...).select('id, created_at')` (INSERT ... RETURNING), so service_role
-- needs SELECT in addition to INSERT — Postgres requires SELECT on every column
-- named in a RETURNING clause. We therefore grant service_role SELECT + INSERT
-- explicitly (matching 3-3-reviews-contract.sql) rather than relying on Supabase's
-- permissive default privileges; "write-only" is the PUBLIC-facing contract, not a
-- restriction on the server's own read-back of the row it just inserted.
-- Deny-by-default (revoke-all from anon/authenticated/public) is preserved before
-- the explicit grants, mirroring 8-2-venues-store-contract.sql §3.
-- Idempotent: drop-if-exists before create so re-running is safe.
-- Security checklist: the write policy is scoped via an explicit TO service_role
-- + WITH CHECK, never USING(true); no FOR ALL policy; no public/anon read policy.

alter table public.feedback enable row level security;

revoke all on table public.feedback from anon;
revoke all on table public.feedback from authenticated;
revoke all on table public.feedback from public;

grant select, insert on table public.feedback to service_role;  -- SELECT needed for INSERT ... RETURNING (no public read)

drop policy if exists feedback_service_write on public.feedback;
create policy feedback_service_write
  on public.feedback for insert
  to service_role
  with check (true);                  -- write scoped via TO service_role, NOT USING(true)

-- ============================================================================
-- Section: smoke checks (run after apply)
-- ============================================================================

-- Expect RLS enabled on public.feedback.
select relrowsecurity as feedback_rls_enabled
from pg_class
where oid = 'public.feedback'::regclass;

-- Expect exactly one policy: feedback_service_write (insert, {service_role}).
-- Confirm NO anon/authenticated/public policy of any kind (write-only sink) and
-- NO policy with cmd in (SELECT, UPDATE, DELETE, ALL).
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'feedback'
order by policyname;

-- Expect: only service_role holds grants (SELECT + INSERT; SELECT is required for
-- the adapter's INSERT ... RETURNING). NO anon/authenticated grant of any privilege
-- (feedback is never publicly readable or writable).
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'feedback'
order by grantee, privilege_type;
