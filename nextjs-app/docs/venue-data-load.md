# Venue data load — structure & how to add a real venue

Canonical reference for adding real venues to `public.venues` (the live store
behind `/api/venues` when `SUNNYSEAT_VENUE_STORE=supabase`). The schema is defined
by `_bmad-output/implementation-artifacts/8-2-venues-store-contract.sql`; this doc
is the human/agent-facing "what to collect and in what shape" guide.

> **Quick ask for an agent:** "add a real venue" → collect the **durable fields**
> below (+ a `seating_area` polygon, optionally `seating_elevation_m`) and generate
> an idempotent `INSERT … ON CONFLICT (id) DO UPDATE`. The **engine-managed**
> columns get safe placeholders — the real sun values are computed live.

## Field groups

### 1. Durable fields — YOU provide these

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | text | ✅ | Unique. `"8"`+ keeps the fixture rows `1`–`7`; or replace them. Reviews/feedback reference this as free-text `venue_id`. |
| `slug` | text | ✅ | Unique (`idx_venues_slug`), URL-safe, no spaces. Used by `/api/venues/[slug]`. |
| `venue_name` | text | ✅ | Display name. |
| `neighborhood` | text | ✅ | e.g. `"Haga"`, `"Inom Vallgraven"`. |
| `lat` / `lng` | double precision | ✅ | Venue point, WGS84 (decimal degrees). |
| `is_partner` | boolean | — | Defaults false. |
| `thumbnail` | jsonb | — | `{ "alt": "...", "initials": "KK", "url": "https://..." }`. |
| `description` | text | — | Short Swedish blurb. |
| `address` | text | — | Street address. |
| `opening_hours` | jsonb | — | `{ "display": "Öppet till 22:00", "closesAt": "22:00" }`. |
| `peak_time` | text | — | `"HH:mm"`, e.g. `"15:30"`. |
| `shadow_warning_minutes` | integer ≥ 0 | — | Minutes-until-shadow hint. |
| **`seating_area`** | jsonb (GeoJSON Polygon) | — but **important** | The outdoor seating footprint the sun engine casts shadows onto. WGS84, `[lng, lat]` order, closed ring. Null → engine uses a ~10 m square around `lat/lng` (less precise). |
| **`seating_elevation_m`** | double precision ≥ 0 | optional | Estimated metres of the **seating surface above local ground/street**. Null/0 = street level. Rooftop bars / raised terraces / balconies use the approx floor height (4th floor ≈ 12 m). **Capture-only today; engine consumption is planned as Epic 8 Stories 8.6 (rooftop/raised — height gate) + 8.7 (hilltop — DTM ground delta).** Record the estimate now regardless so the data is ready when those ship. The engine does **not** consume it yet (see "Elevation" below). |

### 2. Engine-managed columns — placeholders only

When `SUNNYSEAT_SUN_ENGINE=real`, these are **computed live** from `lib/solar` +
Met.no at request time and the stored values are **ignored**. They exist for the
seed/fixture path and to satisfy NOT NULL/CHECK constraints. For a real venue use
safe placeholders:

| Column | Placeholder | Constraint |
|---|---|---|
| `current_sun_status` | `'NoSun'` | NOT NULL; one of `Sunny`/`Partial`/`Shaded`/`NoSun` |
| `confidence` | `0` | NOT NULL; 0–100 |
| `sun_exposure_percent` | `0` | NOT NULL; 0–100 |
| `sky_condition` | `null` | `clear`/`partly-cloudy`/`overcast`/`unavailable` or null |
| `sun_window` | `null` | jsonb `{ "start": "HH:mm", "end": "HH:mm" }` or null |
| `prediction_uncertainty` | `null` | jsonb `{ "level": "...", "reasons": [...] }` or null |

`created_at` / `updated_at` default to `now()`.

## What to send (one venue)

```json
{
  "id": "8",
  "slug": "kafe-kringlan",
  "venue_name": "Kafé Kringlan",
  "neighborhood": "Haga",
  "lat": 57.6995,
  "lng": 11.9560,
  "is_partner": false,
  "thumbnail": { "alt": "Uteservering hos Kafé Kringlan", "initials": "KK", "url": "https://…" },
  "description": "Kort beskrivning på svenska …",
  "address": "Haga Nygata 12, 413 01 Göteborg",
  "opening_hours": { "display": "Öppet till 22:00", "closesAt": "22:00" },
  "peak_time": "15:30",
  "shadow_warning_minutes": null,
  "seating_area": { "type": "Polygon", "coordinates": [[[11.9560,57.6995], …, [11.9560,57.6995]]] },
  "seating_elevation_m": null
}
```

## Painting the `seating_area` polygon

Use **[geojson.io](https://geojson.io)**:
1. Switch the basemap to **satellite** (top-right) and zoom to the venue.
2. Draw a **polygon (□)** tracing the **outdoor seating area only** (terrace/courtyard footprint — not the whole building).
3. Copy the GeoJSON from the right panel — it's already WGS84, `[lng, lat]`, closed-ring. Send the `geometry` object (or the whole feature).

Keep it ~4–20 vertices. Alternatives: [geoman.io](https://geoman.io/geojson-editor), [placemark.io](https://placemark.io).

## Elevation (rooftop bars / hilltop venues) — current limitation

The shadow engine (`lib/solar/shadow-calculation-service.ts → computeShadowInfo`)
is **2D / ground-level**: it projects each nearby building's shadow as a flat
polygon and checks 2D overlap with the seating polygon. It has **no venue-elevation
input**, so a rooftop bar or a venue well above surrounding rooftops is currently
computed as if it sat on the street and can be **wrongly shadowed** by adjacent
buildings.

`seating_elevation_m` is captured now so this data isn't lost. **Consuming it is
planned as Epic 8 Stories 8.6 + 8.7** (an elevation-aware shadow check: a building
only shadows the elevated venue using its height *above* the seating surface, so
buildings shorter than the venue stop mattering — Story 8.6; steep-terrain/hill
cases additionally use the DTM ground elevation at the venue point — Story 8.7).
Until those ship, leave `seating_elevation_m` null for street-level venues and
record an estimate for elevated ones — predictions for those few elevated venues may
read more-shadowed-than-reality in the meantime.

## Notes

- The `venues` table currently holds the 7 fixture rows (`id` `1`–`7`, byte-identical
  to `lib/services/venues-fixture.ts`). Decide per data-load whether to keep them
  (add real venues at `id` `8`+) or replace them (`delete from public.venues where id in ('1'..'7')`).
  `test-venue-sunny` (`id` `1`) is the dev visual-gate slug; production data never uses it.
- The runtime reads via the service-role client (bypasses RLS). `seating_area` /
  `seating_elevation_m` are **server-only** — never serialized into `VenueDataDto`.
