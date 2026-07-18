-- Story 12.1 follow-up for projects where the forward migration was already
-- applied before the 2026 Data API default-grant change was accounted for.
-- RLS and grants are separate controls: keep the service objects RLS-protected,
-- revoke every inherited/default privilege, then grant only runner operations.

alter table public.hours_review_runs enable row level security;
alter table public.hours_review_runs force row level security;
alter table public.hours_review_outcomes enable row level security;
alter table public.hours_review_outcomes force row level security;

revoke all on table public.hours_review_runs
  from public, anon, authenticated, service_role;
revoke all on table public.hours_review_outcomes
  from public, anon, authenticated, service_role;
revoke all on sequence public.hours_review_outcomes_id_seq
  from public, anon, authenticated, service_role;

grant select, insert, update, delete
  on table public.hours_review_runs to service_role;
grant select, insert, update
  on table public.hours_review_outcomes to service_role;
grant usage
  on sequence public.hours_review_outcomes_id_seq to service_role;

revoke all on function public.claim_hours_review_run(text, text, timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function public.finish_hours_review_run(
  text, text, timestamptz,
  integer, integer, integer, integer, integer, integer, integer, integer, integer
) from public, anon, authenticated, service_role;
revoke all on function public.prune_hours_review_history(timestamptz)
  from public, anon, authenticated, service_role;

grant execute on function public.claim_hours_review_run(text, text, timestamptz)
  to service_role;
grant execute on function public.finish_hours_review_run(
  text, text, timestamptz,
  integer, integer, integer, integer, integer, integer, integer, integer, integer
) to service_role;
grant execute on function public.prune_hours_review_history(timestamptz)
  to service_role;

