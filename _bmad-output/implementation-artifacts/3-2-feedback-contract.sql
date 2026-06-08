-- Story 3.2 feedback contract artifact.
-- Not applied automatically. Maintainers can adapt this when Supabase
-- persistence replaces the current fixture-backed route.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  -- Current Story 3.2 runtime is fixture/API-contract backed and uses string
  -- identifiers such as "1". Reintroduce a typed FK when the real venue table
  -- contract is wired into the feedback route.
  venue_id text not null,
  venue_slug text not null,
  user_timestamp timestamptz not null,
  predicted_state text not null check (predicted_state in ('Sunny', 'Partial', 'Shaded', 'NoSun')),
  sun_accuracy text check (
    sun_accuracy is null
    or sun_accuracy in ('sunny', 'not_sunny', 'unsure')
  ),
  confidence_at_prediction numeric check (
    confidence_at_prediction is null
    or (confidence_at_prediction >= 0 and confidence_at_prediction <= 100)
  ),
  was_sunny boolean,
  outdoor_seating_confirmed boolean,
  note text check (
    note is null
    or (char_length(note) <= 500 and note !~ E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]')
  ),
  created_at timestamptz not null default now(),
  check (
    sun_accuracy is not null
    or was_sunny is not null
    or outdoor_seating_confirmed is not null
    or nullif(btrim(note), '') is not null
  ),
  check (
    (sun_accuracy is null)
    or (sun_accuracy = 'sunny' and was_sunny is true)
    or (sun_accuracy = 'not_sunny' and was_sunny is false)
    or (sun_accuracy = 'unsure' and was_sunny is null)
  )
);
