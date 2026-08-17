-- Story 12.7: canonical public venue visibility contract.
-- Existing venues remain public; future hide/show writes are owned by Story 12.5.

alter table public.venues
  add column if not exists hidden boolean not null default false;

-- Reconcile an earlier nullable/manual column if it existed before this migration.
update public.venues
set hidden = false
where hidden is null;

alter table public.venues
  alter column hidden set default false,
  alter column hidden set not null;

comment on column public.venues.hidden is
  'Canonical public visibility flag. false = public; true = excluded from public venue resolution.';
