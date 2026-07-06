# Venue data load — structure & how to add a real venue

Canonical reference for adding real venues to `public.venues` (the live store
behind `/api/venues` when `SUNNYSEAT_VENUE_STORE=supabase`). The schema is defined
by `_bmad-output/implementation-artifacts/8-2-venues-store-contract.sql` +
`11-9-venue-data-model-cleanup.sql`; this doc is the human/agent-facing "what to
collect and in what shape" guide.

> **Quick ask for an agent:** "add a real venue" → collect the **durable fields**
> below (+ a `seating_area` polygon, optionally `seating_elevation_m`) and generate
> an idempotent `INSERT … ON CONFLICT (id) DO UPDATE`. **Do NOT pick an `id`** — the
> column auto-assigns a text id (Story 11.9); simply omit it from the insert. The
> **engine-managed** columns get safe placeholders — the real sun values are computed live.

## Field groups

### 1. Durable fields — YOU provide these

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | text | **auto** | **Do NOT send it** (Story 11.9). The column auto-assigns a sequence-backed text id on insert (next is `"8"`). The `text` PK is kept so reviews/feedback keep referencing it as free-text `venue_id`. Only supply an explicit `id` if you are intentionally overwriting an existing row (e.g. re-seeding `"1"`–`"7"`). |
| `slug` | text | ✅ | Unique (`idx_venues_slug`), URL-safe, no spaces. Used by `/api/venues/[slug]`. |
| `venue_name` | text | ✅ | Display name. |
| `neighborhood` | text | ✅ | e.g. `"Haga"`, `"Inom Vallgraven"`. |
| `lat` / `lng` | double precision | ✅ | Venue point, WGS84 (decimal degrees). |
| `is_partner` | boolean | — | Defaults false. |
| `thumbnail` | jsonb | — | `{ "alt": "...", "initials": "KK", "url": "https://..." }`. |
| `description` | text | — | Short Swedish blurb. |
| `address` | text | — | Street address. |
| `opening_hours` | jsonb | — | **Per-weekday** hours (Story 11.9), keyed by numeric ISO weekday (`"1"`=Mon … `"7"`=Sun): `{ "1": { "open": "11:00", "close": "22:00" }, … }`. A **missing key or `null`** value = **closed that day**. `close < open` = a **past-midnight** close (opens 18:00 closes 02:00 → open until 02:00). Times are `"HH:MM"` (24h). Omit the column entirely for a venue with no known hours — the app renders **nothing** for it (never a fabricated time). The "Öppet till HH:MM" line + the ÖPPET badge are **derived at render time** for the current Stockholm weekday; do NOT store a display string. |
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

Note there is **no `id`** — it auto-assigns. Send it only to overwrite an existing row.

```json
{
  "slug": "kafe-kringlan",
  "venue_name": "Kafé Kringlan",
  "neighborhood": "Haga",
  "lat": 57.6995,
  "lng": 11.9560,
  "is_partner": false,
  "thumbnail": { "alt": "Uteservering hos Kafé Kringlan", "initials": "KK", "url": "https://…" },
  "description": "Kort beskrivning på svenska …",
  "address": "Haga Nygata 12, 413 01 Göteborg",
  "opening_hours": {
    "1": { "open": "11:00", "close": "22:00" },
    "2": { "open": "11:00", "close": "22:00" },
    "3": { "open": "11:00", "close": "22:00" },
    "4": { "open": "11:00", "close": "23:00" },
    "5": { "open": "11:00", "close": "02:00" },
    "6": { "open": "12:00", "close": "02:00" },
    "7": null
  },
  "seating_area": { "type": "Polygon", "coordinates": [[[11.9560,57.6995], "…", [11.9560,57.6995]]] },
  "seating_elevation_m": null,
  "ground_elevation_m": null
}
```

The example above shows Mon–Thu closing 22:00/23:00, Fri/Sat open **past midnight**
(closes 02:00), and **Sunday closed** (`null`). Adjust per venue; omit the whole
`opening_hours` column if hours are unknown.

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
  (add real venues — the auto-assigned `id` continues at `"8"`) or replace them
  (`delete from public.venues where id in ('1'..'7')`). `test-venue-sunny` (`id` `1`)
  is the dev visual-gate slug; production data never uses it. The `id` sequence
  (`venues_id_seq`) is advanced past the seed max, so a plain insert without an `id`
  gets the next free text id.
- The runtime reads via the service-role client (bypasses RLS). `seating_area` /
  `seating_elevation_m` / `ground_elevation_m` are **server-only** — never serialized
  into `VenueDataDto`.
