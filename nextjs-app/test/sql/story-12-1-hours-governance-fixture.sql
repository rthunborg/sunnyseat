\set ON_ERROR_STOP on

-- This fixture intentionally drops public tables. Refuse to run unless the
-- connection names an explicitly disposable test database.
select current_database() ~ '(^|_)test$' as is_disposable_database \gset
\if :is_disposable_database
\else
  \echo 'Refusing destructive Story 12.1 fixture outside a *_test database'
  \quit 1
\endif

drop table if exists public.hours_review_outcomes cascade;
drop table if exists public.hours_review_runs cascade;
drop table if exists public.venues cascade;

create table public.venues (
  id text primary key,
  slug text not null unique,
  venue_name text not null default 'Legacy venue',
  neighborhood text not null default 'Test',
  lat double precision not null default 57.7,
  lng double precision not null default 11.97,
  is_partner boolean not null default false,
  thumbnail jsonb,
  description text,
  address text,
  opening_hours jsonb,
  current_sun_status text not null default 'NoSun',
  sky_condition text,
  confidence integer not null default 0,
  sun_exposure_percent integer not null default 0,
  sun_window jsonb,
  prediction_uncertainty jsonb,
  tags text[] not null default '{}',
  place_id text,
  places_api_url text
);

insert into public.venues (id, slug, opening_hours, place_id, places_api_url)
values (
  'legacy-1',
  'legacy-hours',
  '{"1":{"open":"11:00","close":"22:00"}}'::jsonb,
  'legacy-place-id',
  'legacy-provider-reference-redacted'
);
