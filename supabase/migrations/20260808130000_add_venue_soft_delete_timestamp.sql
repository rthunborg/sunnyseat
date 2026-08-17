-- Epic 12 production compatibility: public venue reads already filter this column.

alter table public.venues
  add column if not exists deleted_at timestamptz default null;

comment on column public.venues.deleted_at is
  'Nullable venue soft-delete timestamp. Null means active; non-null means deleted and excluded from public venue resolution.';
