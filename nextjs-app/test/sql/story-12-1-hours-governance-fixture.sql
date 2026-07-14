\set ON_ERROR_STOP on

drop table if exists public.hours_review_outcomes cascade;
drop table if exists public.hours_review_runs cascade;
drop table if exists public.venues cascade;

create table public.venues (
  id text primary key,
  slug text not null unique,
  opening_hours jsonb,
  place_id text,
  places_api_url text
);

insert into public.venues (id, slug, opening_hours, place_id, places_api_url)
values (
  'legacy-1',
  'legacy-hours',
  '{"1":{"open":"11:00","close":"22:00"}}'::jsonb,
  'legacy-place-id',
  'https://restricted.example/provider-content'
);
