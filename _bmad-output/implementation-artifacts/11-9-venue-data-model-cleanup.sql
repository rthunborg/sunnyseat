-- MANUAL-RUN handoff artifact AND the exact SQL applied live. Review before executing.
-- Story 11.9: Venue Data Model Cleanup — IDs, Per-Weekday Hours, Dead-Field Removal.
--
-- Purpose: simplify public.venues so authoring a real venue is easy and the app only
-- carries fields it can stand behind:
--   AC1 — keep the `text` PRIMARY KEY (reviews.venue_id / feedback.venue_id join it as
--         free text), but make it AUTO-ASSIGN via a sequence-backed `text` default so a
--         data author no longer hand-picks an id. Rows "1".."7" are preserved; the next
--         auto id is "8".
--   AC2 — replace the single `{display, closesAt}` opening_hours jsonb with a PER-WEEKDAY
--         structure (numeric ISO weekday keys "1"=Mon.."7"=Sun; a missing key or null value
--         = closed that day; close < open = past-midnight close). The stored pre-localized
--         `display` string is REMOVED — the render layer derives "Öppet till HH:MM" for the
--         current Stockholm weekday.
--   AC3 — drop the `peak_time` column (the real engine computes peakTime live from the
--         sun timeline; no surface loses a real value).
--   AC4 — drop the `shadow_warning_minutes` column + its CHECK (carried store→DTO but
--         rendered nowhere).
--
-- Conventions mirror 8-2-venues-store-contract.sql: create-if-not-exists,
-- add/drop-column-if-exists, deny-by-default RLS UNCHANGED, idempotent seed
-- (on conflict do update), end-of-file smoke checks. Re-running is safe on a fresh
-- and an already-migrated table.
--
-- SCOPE GUARANTEES (AC6):
--   * RLS stays enabled + the single `venues_service_read` (service_role, SELECT) policy
--     is preserved (this file does NOT touch RLS/policies).
--   * The server-only columns `seating_area` / `seating_elevation_m` / `ground_elevation_m`
--     are UNTOUCHED.
--   * The `test-venue-sunny` (id "1") gate venue stays byte-compatible on the values its
--     gate asserts; its opening_hours now derives "Öppet till 22:00" / closesAt "22:00" for
--     every weekday.

-- ============================================================================
-- Section 1: diagnostics (run before applying)
-- ============================================================================

-- Confirm the current id default is null (a manually-assigned text PK) and inspect
-- the current opening_hours shape so the seed rewrite matches reality.
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'venues'
  and column_name in ('id', 'opening_hours', 'peak_time', 'shadow_warning_minutes')
order by column_name;

-- Confirm the join-compatible identifier types on the related tables stay text.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('reviews', 'feedback')
  and column_name = 'venue_id'
order by table_name;

-- ============================================================================
-- Section 2: AC1 — auto-assigning text PK (keep the text PK; do NOT migrate to serial)
-- ============================================================================

-- A sequence-backed text default: the next insert without an explicit id gets
-- nextval('venues_id_seq')::text. The PK type and the free-text review/feedback joins
-- are unchanged; no FK is added.
create sequence if not exists venues_id_seq;

alter table public.venues alter column id set default nextval('venues_id_seq')::text;

-- Advance the sequence past the current max seed id so the next auto id is "8".
-- Guarded: only rows whose id is a plain integer participate (the seed rows "1".."7"),
-- so a future non-numeric author id never breaks setval. If the table is empty the
-- sequence stays at its start.
select setval(
  'venues_id_seq',
  greatest(
    (select coalesce(max(id::int), 0) from public.venues where id ~ '^[0-9]+$'),
    1
  ),
  true
);

-- ============================================================================
-- Section 3: AC3 / AC4 — drop the dead columns
-- ============================================================================

-- AC3: the real engine computes peakTime live from the timeline; the stored echo is dead.
alter table public.venues drop column if exists peak_time;

-- AC4: carried store->DTO but rendered nowhere (its CHECK constraint drops with it).
alter table public.venues drop column if exists shadow_warning_minutes;

-- ============================================================================
-- Section 4: AC2 — per-weekday opening_hours seed rewrite (idempotent)
-- ============================================================================
-- The column name (opening_hours) and type (jsonb) are UNCHANGED (additive-safe; no
-- rename). Only the per-row VALUES are rewritten to the per-weekday shape. Every launch
-- venue opens 11:00 and closes at its previous close-time on all 7 weekdays, so the
-- derived "Öppet till HH:MM" line matches the OLD stored display for the gate venue and
-- the render tests. Re-running with `on conflict (id) do update` is safe.

insert into public.venues (
  id, slug, venue_name, neighborhood, lat, lng, is_partner, thumbnail,
  description, address, opening_hours,
  current_sun_status, sky_condition, confidence, sun_exposure_percent,
  sun_window, prediction_uncertainty, tags
) values
  (
    '1', 'test-venue-sunny', 'Kafé Magasinet', 'Inom Vallgraven', 57.7050, 11.9700, true,
    '{"alt":"Uteservering hos Kafé Magasinet","initials":"KM","url":"https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=560&q=80"}'::jsonb,
    'Stor uteservering med eftermiddagssol, skyddade bord och nära till både spårvagn och kajstråk.',
    'Tredje Långgatan 9, 413 03 Göteborg',
    '{"1":{"open":"11:00","close":"22:00"},"2":{"open":"11:00","close":"22:00"},"3":{"open":"11:00","close":"22:00"},"4":{"open":"11:00","close":"22:00"},"5":{"open":"11:00","close":"22:00"},"6":{"open":"11:00","close":"22:00"},"7":{"open":"11:00","close":"22:00"}}'::jsonb,
    'Sunny', 'clear', 92, 95,
    '{"start":"13:00","end":"18:30"}'::jsonb, null,
    '{Innergård,Hund ok,Wifi,Bakverk}'
  ),
  (
    '2', 'bryggeriet-soltak', 'Bryggerietsoltak', 'Linnéstaden', 57.7035, 11.9520, false,
    '{"alt":"Uteservering hos Bryggerietsoltak","initials":"BS","url":"https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=560&q=80"}'::jsonb,
    'Taknära sittplatser med bred solträff under lunch och eftermiddag.',
    'Linnégatan 21, 413 04 Göteborg',
    '{"1":{"open":"11:00","close":"23:00"},"2":{"open":"11:00","close":"23:00"},"3":{"open":"11:00","close":"23:00"},"4":{"open":"11:00","close":"23:00"},"5":{"open":"11:00","close":"23:00"},"6":{"open":"11:00","close":"23:00"},"7":{"open":"11:00","close":"23:00"}}'::jsonb,
    'Sunny', 'clear', 88, 89,
    '{"start":"12:45","end":"18:15"}'::jsonb, null,
    '{Morgonsol,Take-away,Surdeg}'
  ),
  (
    '3', 'solplats-magasinsgatan', 'Solplats Magasinsgatan', 'Inom Vallgraven', 57.7080, 11.9655, false,
    '{"alt":"Uteservering på Solplats Magasinsgatan","initials":"SM","url":"https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=560&q=80"}'::jsonb,
    'Lugn innerstadsterrass med bäst sol när eftermiddagen vänder mot kväll.',
    'Magasinsgatan 17, 411 18 Göteborg',
    '{"1":{"open":"11:00","close":"21:00"},"2":{"open":"11:00","close":"21:00"},"3":{"open":"11:00","close":"21:00"},"4":{"open":"11:00","close":"21:00"},"5":{"open":"11:00","close":"21:00"},"6":{"open":"11:00","close":"21:00"},"7":{"open":"11:00","close":"21:00"}}'::jsonb,
    'Sunny', 'partly-cloudy', 78, 82,
    '{"start":"14:00","end":"17:45"}'::jsonb, null,
    '{Kanal,Skaldjur}'
  ),
  (
    '4', 'cafe-halvvags', 'Café Halvvägs', 'Vasastaden', 57.7000, 11.9710, false,
    '{"alt":"Uteservering hos Café Halvvägs","initials":"CH","url":"https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=560&q=80"}'::jsonb,
    'Avslappnat kvarterscafé med delvis sol på de yttre borden.',
    'Vasagatan 32, 411 24 Göteborg',
    '{"1":{"open":"11:00","close":"20:00"},"2":{"open":"11:00","close":"20:00"},"3":{"open":"11:00","close":"20:00"},"4":{"open":"11:00","close":"20:00"},"5":{"open":"11:00","close":"20:00"},"6":{"open":"11:00","close":"20:00"},"7":{"open":"11:00","close":"20:00"}}'::jsonb,
    'Partial', 'partly-cloudy', 70, 65,
    '{"start":"15:10","end":"17:20"}'::jsonb,
    '{"level":"medium","reasons":["building_shadow_coverage"]}'::jsonb,
    '{Parasoller,Specialkaffe}'
  ),
  (
    '5', 'brygghuset-lerum', 'Brygghuset Lerum', 'Haga', 57.7115, 11.9605, false,
    '{"alt":"Uteservering hos Brygghuset Lerum","initials":"BL","url":"https://images.unsplash.com/photo-1508424757105-b6d5ad9329d0?auto=format&fit=crop&w=560&q=80"}'::jsonb,
    'Skyddad gårdsmiljö med kortare solfönster och gott om sittplatser.',
    'Haga Nygata 8, 413 01 Göteborg',
    '{"1":{"open":"11:00","close":"22:00"},"2":{"open":"11:00","close":"22:00"},"3":{"open":"11:00","close":"22:00"},"4":{"open":"11:00","close":"22:00"},"5":{"open":"11:00","close":"22:00"},"6":{"open":"11:00","close":"22:00"},"7":{"open":"11:00","close":"22:00"}}'::jsonb,
    'Partial', 'partly-cloudy', 66, 58,
    '{"start":"13:35","end":"16:50"}'::jsonb,
    '{"level":"medium","reasons":["vegetation","awning","seasonal_furniture"]}'::jsonb,
    '{Innergård,Hund ok}'
  ),
  (
    '6', 'skuggans-hus', 'Skuggans Hus', 'Inom Vallgraven', 57.7095, 11.9785, false,
    '{"alt":"Uteservering hos Skuggans Hus","initials":"SH","url":"https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=560&q=80"}'::jsonb,
    'Sval uteservering som bara får korta solglimtar mellan husfasaderna.',
    'Södra Hamngatan 12, 411 14 Göteborg',
    '{"1":{"open":"11:00","close":"19:00"},"2":{"open":"11:00","close":"19:00"},"3":{"open":"11:00","close":"19:00"},"4":{"open":"11:00","close":"19:00"},"5":{"open":"11:00","close":"19:00"},"6":{"open":"11:00","close":"19:00"},"7":{"open":"11:00","close":"19:00"}}'::jsonb,
    'Shaded', 'overcast', 80, 22,
    '{"start":"16:10","end":"16:45"}'::jsonb, null,
    '{Svalt,Lunch}'
  ),
  (
    '7', 'bistro-bakgarden', 'Bistro Bakgården', 'Vasastaden', 57.7060, 11.9820, false,
    '{"alt":"Uteservering hos Bistro Bakgården","initials":"BB","url":"https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=560&q=80"}'::jsonb,
    'Bakgårdsservering med mest skugga, men en kort lunchsol vid klart väder.',
    'Engelbrektsgatan 44, 411 37 Göteborg',
    '{"1":{"open":"11:00","close":"21:00"},"2":{"open":"11:00","close":"21:00"},"3":{"open":"11:00","close":"21:00"},"4":{"open":"11:00","close":"21:00"},"5":{"open":"11:00","close":"21:00"},"6":{"open":"11:00","close":"21:00"},"7":{"open":"11:00","close":"21:00"}}'::jsonb,
    'Shaded', 'overcast', 75, 14,
    '{"start":"11:30","end":"12:20"}'::jsonb, null,
    '{Bakgård,Kväll}'
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
  current_sun_status = excluded.current_sun_status,
  sky_condition = excluded.sky_condition,
  confidence = excluded.confidence,
  sun_exposure_percent = excluded.sun_exposure_percent,
  sun_window = excluded.sun_window,
  prediction_uncertainty = excluded.prediction_uncertainty,
  tags = excluded.tags,
  updated_at = now();

-- ============================================================================
-- Section 5: rollback notes
-- ============================================================================
-- The dropped columns and the auto-id default are reversible without a table drop:
--   alter table public.venues alter column id drop default;
--   drop sequence if exists venues_id_seq;
--   alter table public.venues add column if not exists peak_time text;
--   alter table public.venues add column if not exists shadow_warning_minutes integer
--     check (shadow_warning_minutes is null or shadow_warning_minutes >= 0);
-- The per-weekday opening_hours rewrite can be reverted by re-running the 8-2 seed's
-- `{display, closesAt}` VALUES. None of this touches reviews/feedback.

-- ============================================================================
-- Section 6: smoke checks (run after apply)
-- ============================================================================

-- Expect 7 seeded launch venues (id "1".."7").
select count(*) as venue_count from public.venues;

-- AC1: expect the id default to be the sequence-backed text default, and the next
-- auto id to be "8".
select column_default from information_schema.columns
where table_schema = 'public' and table_name = 'venues' and column_name = 'id';
select nextval('venues_id_seq') as next_auto_id;  -- expect 8 (advances the sequence)
select setval('venues_id_seq', 7, true);          -- reset back so a real insert still gets "8"

-- AC3/AC4: expect the dropped columns to be GONE (zero rows).
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'venues'
  and column_name in ('peak_time', 'shadow_warning_minutes');

-- AC2: expect the gate venue to resolve with byte-identical core values + the new
-- per-weekday opening_hours that derives close "22:00".
select id, slug, venue_name, neighborhood, lat, lng, is_partner,
       current_sun_status, confidence, sun_exposure_percent,
       sun_window, opening_hours->'1'->>'close' as gate_monday_close
from public.venues
where slug = 'test-venue-sunny';

-- AC6: expect the server-only columns to still exist, untouched.
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'venues'
  and column_name in ('seating_area', 'seating_elevation_m', 'ground_elevation_m')
order by column_name;

-- AC6: expect RLS enabled and exactly one policy: venues_service_read.
select relrowsecurity as venues_rls_enabled
from pg_class where oid = 'public.venues'::regclass;
select policyname, cmd, roles from pg_policies
where schemaname = 'public' and tablename = 'venues'
order by policyname;

-- AC6: expect deny-by-default: only service_role holds a grant.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'venues'
order by grantee, privilege_type;
