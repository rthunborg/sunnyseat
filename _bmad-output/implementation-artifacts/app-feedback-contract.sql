-- App-feedback contract artifact (general star-rating + comment feedback from
-- the settings modal). Mirrors 3-2-feedback-contract.sql: a server-only,
-- write-only sink that is NEVER publicly readable. Only the server service_role
-- (via getSupabaseServiceRole(), which bypasses RLS) may insert; it also needs
-- SELECT for the adapter's INSERT ... RETURNING (id, created_at).
--
-- Idempotent: safe to re-run. Applied to the live project via the Supabase
-- migration `create_app_feedback_table`.

create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  rating smallint not null check (rating between 1 and 5),
  comment text check (
    comment is null
    or (char_length(comment) <= 500 and comment !~ E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]')
  ),
  locale text check (locale is null or locale in ('sv', 'en')),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Section: privileges / RLS — server-only write sink (mirrors feedback)
-- ============================================================================

alter table public.app_feedback enable row level security;

revoke all on table public.app_feedback from anon;
revoke all on table public.app_feedback from authenticated;
revoke all on table public.app_feedback from public;

grant select, insert on table public.app_feedback to service_role;  -- SELECT for INSERT ... RETURNING (no public read)

drop policy if exists app_feedback_service_write on public.app_feedback;
create policy app_feedback_service_write
  on public.app_feedback for insert
  to service_role
  with check (true);                  -- write scoped via TO service_role, NOT USING(true)
