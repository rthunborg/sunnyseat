-- Story 3.3 manual review persistence contract.
-- Do not run automatically. This is an implementation handoff artifact for
-- environments that explicitly opt into SUNNYSEAT_REVIEW_PERSISTENCE=supabase.

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
-- dependency. Public read/RLS policies should be reviewed before enabling
-- Supabase-backed writes in a real environment.
