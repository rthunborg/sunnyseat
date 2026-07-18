-- Story 12.1: reconcile the two live-only Google identity columns before the
-- provider-neutral forward migration. This migration is intentionally
-- idempotent so environments that never received the live drift converge on
-- the same intermediate shape as production.

do $$
begin
  if to_regclass('public.venues') is null then
    raise exception 'public.venues must exist before reconciling place identity';
  end if;
end
$$;

alter table public.venues
  add column if not exists place_id text,
  add column if not exists places_api_url text;

comment on column public.venues.place_id is
  'Server-only Google Place ID identity/reference metadata. No Google content is persisted.';

comment on column public.venues.places_api_url is
  'Temporary reconciliation column; removed by the next provider-neutral migration.';

