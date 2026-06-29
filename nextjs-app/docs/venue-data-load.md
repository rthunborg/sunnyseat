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
| **`seating_elevation_m`** | double precision ≥ 0 | optional | Estimated metres of the **seating surface above local ground/street**. Null/0 = street level. Rooftop bars / raised terraces / balconies use the approx floor height (4th floor ≈ 12 m). **Consumed by the engine as of Story 8.6** (Tier-1 rooftop/raised height gate — see "Elevation" below). Set it for rooftop / raised venues so they are predicted from their seating height; leave it null for street-level venues (byte-identical to the pre-8.6 ground-level path). |
| **`ground_elevation_m`** | double precision | optional | The venue's **RH2000 absolute ground elevation** (Z, metres) at its point — the height of the *ground the venue stands on*, NOT a height above ground. **May be negative.** For a **hilltop** venue this lets the engine compare each caster's roof against the venue's own ground, so a building standing downhill stops shadowing a venue uphill from it. **Consumed by the engine as of Story 8.7** (Tier-2 terrain gate — see "Elevation" below). Null → engine falls back to the Story 8.6 relative gate (byte-identical). Derive it the same way casters get `ground_z_rh2000`: sample the Göteborg **Höjdmodell 2022 DTM** at the venue's `lat`/`lng`. Leave it null unless the venue sits on a meaningful rise. |

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
  "seating_elevation_m": null,
  "ground_elevation_m": null
}
```

## Painting the `seating_area` polygon

Use **[geojson.io](https://geojson.io)**:
1. Switch the basemap to **satellite** (top-right) and zoom to the venue.
2. Draw a **polygon (□)** tracing the **outdoor seating area only** (terrace/courtyard footprint — not the whole building).
3. Copy the GeoJSON from the right panel — it's already WGS84, `[lng, lat]`, closed-ring. Send the `geometry` object (or the whole feature).

Keep it ~4–20 vertices. Alternatives: [geoman.io](https://geoman.io/geojson-editor), [placemark.io](https://placemark.io).

## Elevation (rooftop bars / hilltop venues)

The shadow engine (`lib/solar/shadow-calculation-service.ts → computeShadowInfo`)
applies a **Tier 1 height gate** (consumed as of **Story 8.6**): a nearby building
only shadows the venue using its height *above* the seating surface
(`effectiveHeight = building.height − seating_elevation_m`), so a building at or
below the seating surface stops mattering and a rooftop bar above its neighbours is
no longer wrongly shadowed.

`seating_elevation_m` is metres of the seating surface above the venue's **own local
ground** (the flat-city rooftop model — it assumes venue ground ≈ caster ground,
true for central Gothenburg rooftop bars).

The **terrain / hilltop** case — where the venue's own *ground* is higher (or lower)
than the casters' ground — is handled by **`ground_elevation_m`**, the venue's RH2000
absolute ground Z, **consumed as of Story 8.7 (Tier-2 terrain gate)**. The engine
forms an absolute comparison:

```
venueSurfaceZ   = ground_elevation_m + seating_elevation_m
casterRoofZ     = casterGroundZ (RH2000) + height_m     # conservative runtime height, NOT the raw roof_z
effectiveHeight = casterRoofZ − venueSurfaceZ
                = (height_m − seating_elevation_m) + (casterGroundZ − venueGroundZ)
```

i.e. the Story 8.6 relative height **plus the ground delta**. A caster standing
downhill (`casterGroundZ < ground_elevation_m`) stops shadowing the venue once its
roof drops below the venue's seating surface. The casters' `ground_z_rh2000` /
`roof_z_rh2000` already exist on `shadow_casters` and are now exposed by the
`get_buildings_near_point` RPC. On flat terrain (`casterGroundZ == ground_elevation_m`)
the ground delta is 0 and the result is **byte-identical to Story 8.6**. Leave
`ground_elevation_m` **null** unless the venue sits on a meaningful rise — null falls
back to the relative gate. (Note: the casting height stays the **conservative**
`height_m`, not the raw `roof_z_rh2000`, so the Story 8.1.1 height cap is preserved.)

The gate is **all-or-nothing**: a building slightly taller than the terrace still
casts a full-coverage shadow — sub-shadow / partial occlusion is not modelled (a
documented MVP approximation, consistent with the engine's coarse-for-MVP posture).
Leave `seating_elevation_m` **null** for street-level venues — that path is
byte-identical to the pre-8.6 ground-level behaviour — and set it for rooftop /
raised venues so they are predicted from their seating height.

## Notes

- The `venues` table currently holds the 7 fixture rows (`id` `1`–`7`, byte-identical
  to `lib/services/venues-fixture.ts`). Decide per data-load whether to keep them
  (add real venues at `id` `8`+) or replace them (`delete from public.venues where id in ('1'..'7')`).
  `test-venue-sunny` (`id` `1`) is the dev visual-gate slug; production data never uses it.
- The runtime reads via the service-role client (bypasses RLS). `seating_area` /
  `seating_elevation_m` / `ground_elevation_m` are **server-only** — never serialized
  into `VenueDataDto`.
