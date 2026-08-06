-- Story 12.2: feedback prediction evidence and accuracy-loop scoring fields.
-- Idempotent, nullable additions preserve legacy rows while allowing current
-- rows to be scoped to the active venue geometry generation.

alter table public.feedback
  add column if not exists sun_exposure_percent integer,
  add column if not exists public_sun_verdict text,
  add column if not exists weather_gated boolean,
  add column if not exists weather_unknown boolean,
  add column if not exists geometry_input_hash text;

alter table public.feedback
  drop constraint if exists feedback_sun_exposure_percent_check,
  drop constraint if exists feedback_public_sun_verdict_check,
  drop constraint if exists feedback_weather_gate_flags_check,
  drop constraint if exists feedback_geometry_input_hash_check;

alter table public.feedback
  add constraint feedback_sun_exposure_percent_check
    check (
      sun_exposure_percent is null
      or (sun_exposure_percent between 0 and 100)
    ),
  add constraint feedback_public_sun_verdict_check
    check (
      public_sun_verdict is null
      or public_sun_verdict in ('amber', 'grey')
    ),
  add constraint feedback_weather_gate_flags_check
    check (
      not (
        coalesce(weather_gated, false)
        and coalesce(weather_unknown, false)
      )
    ),
  add constraint feedback_geometry_input_hash_check
    check (
      geometry_input_hash is null
      or geometry_input_hash ~ '^g[0-9]+:[0-9a-f]{64}$'
    );

alter table public.feedback enable row level security;

revoke all on table public.feedback from anon;
revoke all on table public.feedback from authenticated;
revoke all on table public.feedback from public;

grant select, insert on table public.feedback to service_role;

drop policy if exists feedback_service_write on public.feedback;
create policy feedback_service_write
  on public.feedback for insert
  to service_role
  with check (true);

comment on column public.feedback.sun_exposure_percent is
  'Story 12.2 prediction evidence: clear-sky seating share in sun, 0..100.';
comment on column public.feedback.public_sun_verdict is
  'Story 12.2 prediction evidence: public sunny verdict, amber or grey.';
comment on column public.feedback.weather_gated is
  'Story 12.2 prediction evidence: true when weather blocked public sun.';
comment on column public.feedback.weather_unknown is
  'Story 12.2 prediction evidence: true when weather was unknown, never inferred as known-clear.';
comment on column public.feedback.geometry_input_hash is
  'Story 12.2 prediction evidence: venue geometry generation hash in gN:sha256 format.';
