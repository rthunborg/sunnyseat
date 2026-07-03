-- Story 10 review [Patch][High] — widen public.feedback.predicted_state CHECK
-- to accept 'CloudObscured' (the full VenueSunStatus union).
--
-- NOT APPLIED AUTOMATICALLY. This is a MAINTAINER APPLY STEP against the live
-- Supabase DB (mirroring the 3-2-feedback-contract.sql apply discipline). The
-- in-repo contract (3-2-feedback-contract.sql) and the route Zod enum are already
-- updated; a live DB created from the earlier contract still carries the narrower
-- 4-value constraint and will 23514-reject a 'CloudObscured' feedback insert until
-- this runs.
--
-- Idempotent: drops the existing predicted_state CHECK by discovering its name
-- (Postgres auto-generates names like feedback_predicted_state_check), then adds a
-- named constraint that includes 'CloudObscured'. Re-running is safe.

do $$
declare
  con_name text;
begin
  -- Find every CHECK on public.feedback that references predicted_state and drop it.
  for con_name in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'feedback'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%predicted_state%'
  loop
    execute format('alter table public.feedback drop constraint %I', con_name);
  end loop;

  -- Add the widened, explicitly-named constraint (skip if already present).
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'feedback'
      and c.conname = 'feedback_predicted_state_check'
  ) then
    alter table public.feedback
      add constraint feedback_predicted_state_check
      check (predicted_state in ('Sunny', 'Partial', 'Shaded', 'NoSun', 'CloudObscured'));
  end if;
end $$;

-- Smoke check (run after apply): expect the constraint def to list CloudObscured.
select pg_get_constraintdef(c.oid) as predicted_state_check
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'feedback'
  and c.conname = 'feedback_predicted_state_check';
