-- MANUAL-RUN ONLY: review before executing in Supabase.
-- Story 8.2: Real Venue Store & API.
--
-- Purpose: define the public.venues contract that backs /api/venues and
-- /api/venues/[slug] when SUNNYSEAT_VENUE_STORE=supabase. This is an
-- implementation handoff artifact, NOT an auto-applied migration. The Next.js
-- app defaults to an in-memory seed (lib/services/venue-store.ts) so CI has
-- zero live-Supabase dependency; this file is the production cutover path that
-- Story 8.5 finalizes.
--
-- Conventions mirror 3-3-reviews-contract.sql / 3-2-feedback-contract.sql /
-- 3-0-2-shadow-caster-schema-rpc-contract.sql: snake_case columns, jsonb for
-- nested DTO shapes, create-if-not-exists, deny-by-default RLS with a single
-- service_role select grant, idempotent seed, and end-of-file smoke checks.
--
-- IMPORTANT SCOPE NOTE (8.2 <-> 8.3 seam): the sun-engine columns
-- (current_sun_status, sky_condition, confidence, sun_exposure_percent,
-- sun_window, prediction_uncertainty) are TEMPORARY seed carriers so the DTO
-- output stays complete and the gate venue is byte-identical to the fixture.
-- Story 8.3 replaces them with the real lib/solar + lib/weather engine. Do NOT
-- treat these as authoritative sun data.
--
-- id is text (not a uuid/FK) to stay join/lookup-compatible with the existing
-- reviews.venue_id text / feedback.venue_id text identifiers ("1".."7").
-- Adding a typed FK from reviews/feedback -> venues is intentionally out of
-- scope here (it would couple Story 8.4); it belongs to 8.4/8.5 if ever wanted.

-- ============================================================================
-- Section 1: diagnostics
-- ============================================================================

-- Existing venues table, if any (expected: none before this story).
select to_regclass('public.venues') as venues_table;

-- Confirm the join-compatible identifier types on the related tables.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('reviews', 'feedback')
  and column_name in ('venue_id', 'venue_slug')
order by table_name, column_name;

-- ============================================================================
-- Section 2: schema creation
-- ============================================================================

create table if not exists public.venues (
  id text primary key,
  slug text not null,
  venue_name text not null,
  neighborhood text not null,
  lat double precision not null,
  lng double precision not null,
  is_partner boolean not null default false,
  thumbnail jsonb,
  -- Detail block (served by /api/venues/[slug] only).
  description text,
  address text,
  opening_hours jsonb,
  peak_time text,
  shadow_warning_minutes integer check (
    shadow_warning_minutes is null or shadow_warning_minutes >= 0
  ),
  -- Sun-engine columns below are TEMPORARY seed carriers superseded by Story 8.3.
  current_sun_status text not null check (
    current_sun_status in ('Sunny', 'Partial', 'Shaded', 'NoSun')
  ),
  sky_condition text check (
    sky_condition is null
    or sky_condition in ('clear', 'partly-cloudy', 'overcast', 'unavailable')
  ),
  confidence integer not null check (confidence between 0 and 100),
  sun_exposure_percent integer not null check (sun_exposure_percent between 0 and 100),
  sun_window jsonb,
  prediction_uncertainty jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.venues is
  'Real venue store backing /api/venues (Story 8.2). The sun-engine columns '
  '(current_sun_status, sky_condition, confidence, sun_exposure_percent, '
  'sun_window, prediction_uncertainty) are TEMPORARY seed carriers replaced by '
  'the real engine in Story 8.3.';

-- slug uniqueness via the conventionally-named index (idx_table_column) so we
-- do not also create a redundant auto-named unique constraint index.
create unique index if not exists idx_venues_slug on public.venues (slug);

-- Story 8.3 (DECISION B, polygon-first): additive, nullable, SERVER-ONLY GeoJSON
-- Polygon for the venue's real outdoor seating area. Consumed only by the
-- sun-engine adapter (lib/services/sun-engine.ts) and NEVER serialized into the
-- client VenueDataDto. Idempotent so re-running this contract on an existing
-- table is safe. Launch/seed venues leave it null → the engine falls back to a
-- synthesized point footprint, keeping the gate venue byte-identical. Populating
-- real polygons for live venues is ongoing manual venue-data work (out of 8.3).
alter table public.venues add column if not exists seating_area jsonb;

comment on column public.venues.seating_area is
  'Server-only GeoJSON Polygon of the venue outdoor seating area (Story 8.3). '
  'Used by the sun engine for shadow casting; never returned in the API DTO. '
  'Null → engine uses a synthesized point footprint around lat/lng.';

-- Additive, nullable, SERVER-ONLY estimated height of the outdoor SEATING SURFACE
-- above the immediately-surrounding ground/street level, in metres. Null/0 =
-- street level. Rooftop bars / raised terraces / balcony seating use the
-- approximate floor height (e.g. a 4th-floor terrace ≈ 12 m). CAPTURE-ONLY for
-- now: it lets venue data be collected with elevation so a future
-- elevation-aware (2.5D) shadow follow-up can stop nearby buildings from wrongly
-- shadowing an elevated venue. NOT yet consumed by the engine. Never serialized
-- into the client DTO. See nextjs-app/docs/venue-data-load.md.
alter table public.venues add column if not exists seating_elevation_m double precision
  check (seating_elevation_m is null or seating_elevation_m >= 0);

comment on column public.venues.seating_elevation_m is
  'Server-only estimated metres of the outdoor seating surface above local '
  'ground (rooftop/raised terraces). Null = street level. Capture-only until the '
  'elevation-aware shadow follow-up consumes it; never returned in the API DTO.';

-- ============================================================================
-- Section 3: privileges / RLS (deny-by-default, server-only read)
-- ============================================================================

-- Reads happen server-side via getSupabaseServiceRole() which bypasses RLS,
-- exactly like the reviews/feedback/shadow_casters adapters. No anon/public read
-- policy: venues are served through /api/venues, not a direct anon client.
alter table public.venues enable row level security;

revoke all on table public.venues from anon;
revoke all on table public.venues from authenticated;
revoke all on table public.venues from public;

grant select on table public.venues to service_role;

-- Story 8.5: the access-model policy the security advisor needs. service_role
-- already BYPASSES RLS (so the runtime works regardless), but an RLS-enabled
-- table with ZERO policies trips the advisor's `rls_enabled_no_policy` INFO.
-- This explicit service-role SELECT policy documents the server-only access
-- model AND clears that INFO. No anon/authenticated policy (no public venue
-- read path exists). Idempotent: drop-if-exists before create.
-- Security checklist: scoped via explicit TO service_role; SELECT-only; no
-- write policy (venue changes are manual DB work, not via the app).
drop policy if exists venues_service_read on public.venues;
create policy venues_service_read
  on public.venues for select
  to service_role
  using (true);

-- ============================================================================
-- Section 4: seed (idempotent) — byte-identical to lib/services/venues-fixture.ts
-- VENUE_FIXTURE + the [slug] route DETAIL_FIXTURE. Re-running is safe.
-- ============================================================================

insert into public.venues (
  id, slug, venue_name, neighborhood, lat, lng, is_partner, thumbnail,
  description, address, opening_hours, peak_time, shadow_warning_minutes,
  current_sun_status, sky_condition, confidence, sun_exposure_percent,
  sun_window, prediction_uncertainty
) values
  (
    '1', 'test-venue-sunny', 'Kafé Magasinet', 'Inom Vallgraven', 57.7050, 11.9700, true,
    '{"alt":"Uteservering hos Kafé Magasinet","initials":"KM","url":"https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=560&q=80"}'::jsonb,
    'Stor uteservering med eftermiddagssol, skyddade bord och nära till både spårvagn och kajstråk.',
    'Tredje Långgatan 9, 413 03 Göteborg',
    '{"display":"Öppet till 22:00","closesAt":"22:00"}'::jsonb,
    '15:30', 45,
    'Sunny', 'clear', 92, 95,
    '{"start":"13:00","end":"18:30"}'::jsonb, null
  ),
  (
    '2', 'bryggeriet-soltak', 'Bryggerietsoltak', 'Linnéstaden', 57.7035, 11.9520, false,
    '{"alt":"Uteservering hos Bryggerietsoltak","initials":"BS","url":"https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=560&q=80"}'::jsonb,
    'Taknära sittplatser med bred solträff under lunch och eftermiddag.',
    'Linnégatan 21, 413 04 Göteborg',
    '{"display":"Öppet till 23:00","closesAt":"23:00"}'::jsonb,
    '15:00', null,
    'Sunny', 'clear', 88, 89,
    '{"start":"12:45","end":"18:15"}'::jsonb, null
  ),
  (
    '3', 'solplats-magasinsgatan', 'Solplats Magasinsgatan', 'Inom Vallgraven', 57.7080, 11.9655, false,
    '{"alt":"Uteservering på Solplats Magasinsgatan","initials":"SM","url":"https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=560&q=80"}'::jsonb,
    'Lugn innerstadsterrass med bäst sol när eftermiddagen vänder mot kväll.',
    'Magasinsgatan 17, 411 18 Göteborg',
    '{"display":"Öppet till 21:00","closesAt":"21:00"}'::jsonb,
    '15:30', null,
    'Sunny', 'partly-cloudy', 78, 82,
    '{"start":"14:00","end":"17:45"}'::jsonb, null
  ),
  (
    '4', 'cafe-halvvags', 'Café Halvvägs', 'Vasastaden', 57.7000, 11.9710, false,
    '{"alt":"Uteservering hos Café Halvvägs","initials":"CH","url":"https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=560&q=80"}'::jsonb,
    'Avslappnat kvarterscafé med delvis sol på de yttre borden.',
    'Vasagatan 32, 411 24 Göteborg',
    '{"display":"Öppet till 20:00","closesAt":"20:00"}'::jsonb,
    '16:00', null,
    'Partial', 'partly-cloudy', 70, 65,
    '{"start":"15:10","end":"17:20"}'::jsonb,
    '{"level":"medium","reasons":["building_shadow_coverage"]}'::jsonb
  ),
  (
    '5', 'brygghuset-lerum', 'Brygghuset Lerum', 'Haga', 57.7115, 11.9605, false,
    '{"alt":"Uteservering hos Brygghuset Lerum","initials":"BL","url":"https://images.unsplash.com/photo-1508424757105-b6d5ad9329d0?auto=format&fit=crop&w=560&q=80"}'::jsonb,
    'Skyddad gårdsmiljö med kortare solfönster och gott om sittplatser.',
    'Haga Nygata 8, 413 01 Göteborg',
    '{"display":"Öppet till 22:00","closesAt":"22:00"}'::jsonb,
    '14:30', null,
    'Partial', 'partly-cloudy', 66, 58,
    '{"start":"13:35","end":"16:50"}'::jsonb,
    '{"level":"medium","reasons":["vegetation","awning","seasonal_furniture"]}'::jsonb
  ),
  (
    '6', 'skuggans-hus', 'Skuggans Hus', 'Inom Vallgraven', 57.7095, 11.9785, false,
    '{"alt":"Uteservering hos Skuggans Hus","initials":"SH","url":"https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=560&q=80"}'::jsonb,
    'Sval uteservering som bara får korta solglimtar mellan husfasaderna.',
    'Södra Hamngatan 12, 411 14 Göteborg',
    '{"display":"Öppet till 19:00","closesAt":"19:00"}'::jsonb,
    '16:30', null,
    'Shaded', 'overcast', 80, 22,
    '{"start":"16:10","end":"16:45"}'::jsonb, null
  ),
  (
    '7', 'bistro-bakgarden', 'Bistro Bakgården', 'Vasastaden', 57.7060, 11.9820, false,
    '{"alt":"Uteservering hos Bistro Bakgården","initials":"BB","url":"https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=560&q=80"}'::jsonb,
    'Bakgårdsservering med mest skugga, men en kort lunchsol vid klart väder.',
    'Engelbrektsgatan 44, 411 37 Göteborg',
    '{"display":"Öppet till 21:00","closesAt":"21:00"}'::jsonb,
    '12:00', 0,
    'Shaded', 'overcast', 75, 14,
    '{"start":"11:30","end":"12:20"}'::jsonb, null
  )
on conflict (id) do update set
  slug = excluded.slug,
  venue_name = excluded.venue_name,
  neighborhood = excluded.neighborhood,
  lat = excluded.lat,
  lng = excluded.lng,
  is_partner = excluded.is_partner,
  thumbnail = excluded.thumbnail,
  description = excluded.description,
  address = excluded.address,
  opening_hours = excluded.opening_hours,
  peak_time = excluded.peak_time,
  shadow_warning_minutes = excluded.shadow_warning_minutes,
  current_sun_status = excluded.current_sun_status,
  sky_condition = excluded.sky_condition,
  confidence = excluded.confidence,
  sun_exposure_percent = excluded.sun_exposure_percent,
  sun_window = excluded.sun_window,
  prediction_uncertainty = excluded.prediction_uncertainty,
  updated_at = now();

-- ============================================================================
-- Section 5: rollback notes
-- ============================================================================
-- To fully remove this contract (does not touch reviews/feedback):
--   drop table if exists public.venues;
-- The unique index idx_venues_slug is dropped with the table.

-- ============================================================================
-- Section 6: smoke checks (run after apply)
-- ============================================================================

-- Expect 7 seeded launch venues.
select count(*) as venue_count from public.venues;

-- Expect the gate venue to resolve with byte-identical core values.
select id, slug, venue_name, neighborhood, lat, lng, is_partner,
       current_sun_status, confidence, sun_exposure_percent,
       sun_window, shadow_warning_minutes
from public.venues
where slug = 'test-venue-sunny';

-- Expect deny-by-default: only service_role holds a grant.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'venues'
order by grantee, privilege_type;

-- Expect RLS enabled and exactly one policy: venues_service_read (select,
-- {service_role}). Confirm NO anon/authenticated/public policy of any kind.
select relrowsecurity as venues_rls_enabled
from pg_class where oid = 'public.venues'::regclass;

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'venues'
order by policyname;
