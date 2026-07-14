# Venue data load — structure & how to add a real venue

Canonical reference for adding real venues to `public.venues` (the live store
behind `/api/venues` when `SUNNYSEAT_VENUE_STORE=supabase`). Deployable schema
authority is the versioned chain under the repository-root
`supabase/migrations/`; this document is the human/agent-facing “what to
collect and in what shape” guide.

> **Quick ask for an agent:** "add a real venue" → collect the **durable fields**
> below (+ a `seating_area` polygon, optionally `seating_elevation_m`) and generate
> an idempotent `INSERT … ON CONFLICT (id) DO UPDATE`. The database constraint
> validates the same weekday/time shape as the canonical Zod write contract.
> **Do NOT pick an `id`** — the
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
| `opening_hours` | jsonb | — | **Per-weekday** hours (Story 11.9), keyed by numeric ISO weekday (`"1"`=Mon … `"7"`=Sun): `{ "1": { "open": "11:00", "close": "22:00" }, … }`. A **missing key or `null`** value = **closed that day**. Whole-field SQL `null` = **unknown hours** and produces no public open/closed claim. `close < open` = a **past-midnight** close. Times are `"HH:MM"` (24h). The render layer derives localized display text; never store it. |
| `hours_source_type` | text | with reviewed hours | One of `venue_confirmed`, `venue_website`, `licensed_provider`, or approved `manual` evidence. It describes eligible provenance, not display attribution. |
| `hours_source_reference` | text | with reviewed hours | Inspectable, opaque evidence reference, such as `venue-site:slug:2026-07-14` or a licence-controlled internal reference. Keep the URL outside this field; never persist a provider payload, URL, query string, token, or credential. |
| `hours_review_status` | text | with reviewed hours | `verified`, `due`, `manual_review`, `unknown`, or `failed`. |
| `hours_reviewed_at` / `hours_next_review_at` | timestamptz | with reviewed hours | Review timestamps; next review cannot precede the completed review. |
| `hours_notes` | text | optional | Bounded maintainer prose only. Do not paste source/provider content. Machine state belongs in the service-only structured review-reason and error-class fields. |
| **`seating_area`** | jsonb (GeoJSON Polygon) | — but **important** | The outdoor seating footprint the sun engine casts shadows onto. WGS84, `[lng, lat]` order, closed ring. Null → engine uses a ~10 m square around `lat/lng` (less precise). |
| **`seating_elevation_m`** | double precision ≥ 0 | optional | Estimated metres of the **seating surface above local ground/street**. Null/0 = street level. Rooftop bars / raised terraces / balconies use the approx floor height (4th floor ≈ 12 m). **Consumed by the engine as of Story 8.6** (Tier-1 rooftop/raised height gate — see "Elevation" below). Set it for rooftop / raised venues so they are predicted from their seating height; leave it null for street-level venues (byte-identical to the pre-8.6 ground-level path). |
| **`ground_elevation_m`** | double precision | optional | The venue's **RH2000 absolute ground elevation** (Z, metres) at its point — the height of the *ground the venue stands on*, NOT a height above ground. **May be negative.** For a **hilltop** venue this lets the engine compare each caster's roof against the venue's own ground, so a building standing downhill stops shadowing a venue uphill from it. **Consumed by the engine as of Story 8.7** (Tier-2 terrain gate — see "Elevation" below). Null → engine falls back to the Story 8.6 relative gate (byte-identical). Derive it the same way casters get `ground_z_rh2000`: sample the Göteborg **Höjdmodell 2022 DTM** at the venue's `lat`/`lng` (or, pragmatically, take `ground_z_rh2000` of the `shadow_casters` rows nearest the seating polygon). Leave it null unless the venue sits on a meaningful rise. |
| `tags` | text[] | — | Canonical **Swedish** tag values for the chip filter (Story 9.7), e.g. `'{Takterrass,Skaldjur}'`. Defaults `'{}'` = no tags: the venue always shows normally and is only hidden while a chip it lacks is active. Chips are **derived from the union of tags across venues** — a tag no venue carries never renders a chip. Keep values inside the known vocabulary in `lib/utils/venue-tags.ts` (`TAG_DISPLAY_EN`); when introducing a new tag, add its English display mapping there in the same change. |
| `place_id` | text | optional | **Place-ID-only** server-side identity/reference metadata. It is never a source of canonical hours and is not projected into public DTOs. Two venue rows may share an ID when they represent distinct seating areas; never merge those rows. Do not store a companion provider URL or returned content. |

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
  "ground_elevation_m": null,
  "tags": ["Innergård"],
  "place_id": "[optional-place-id]",
  "hours_source_type": "venue_website",
  "hours_source_reference": "venue-site:kafe-kringlan:2026-07-14",
  "hours_review_status": "verified",
  "hours_reviewed_at": "2026-07-14T08:00:00Z",
  "hours_next_review_at": "2026-10-12T08:00:00Z",
  "hours_notes": null
}
```

The example above shows Mon–Thu closing 22:00/23:00, Fri/Sat open **past midnight**
(closes 02:00), and **Sunday closed** (`null`). Adjust per venue. On an INSERT,
omitting `opening_hours` creates unknown hours. On an UPDATE/UPSERT of an existing
venue, omission preserves the old value, so clearing stale or unverified hours
must explicitly write `opening_hours = null`. Never use `{}` for unknown: `{}`
is a known schedule with all seven missing weekdays explicitly closed.

## Opening-hours review workflow

Canonical hours are provider-neutral. Retain a schedule only when its source is
independently eligible and the provenance fields are written in the same
reviewed operation. An unverified schedule becomes whole-field SQL `null`; do
not translate unknown into seven closed weekdays.

The launch contract permits one interval per ISO weekday. Closed days and
past-midnight intervals are supported. Split service (for example 11–14 and
17–23), 24/7, seasonal, or holiday-specific evidence must route the entire
venue to `manual_review`; never flatten the gap or partially write weekdays.
Failed evidence preserves any prior independently verified schedule.

The protected weekly workflow `.github/workflows/hours-review-audit.yml` runs
`scripts/audit-opening-hours.ts` directly against Supabase. It never fetches
an hours provider and never changes `opening_hours`; it records bounded
staleness/review outcomes only. Inspect a run in GitHub Actions or query
`hours_review_runs` and `hours_review_outcomes` with the service role. See
`docs/github-actions-scheduled-jobs.md` for manual dispatch and troubleshooting.

Provider policy was rechecked on 2026-07-13 against the official
[EEA terms](https://cloud.google.com/terms/maps-platform/eea),
[EEA service terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms),
and [Place ID policy](https://developers.google.com/maps/documentation/places/web-service/place-id).
Only the ID caching exception is used. A later terms change requires a new
dated architecture/product decision; it does not authorize an opportunistic
hours-provider path in maintenance code.

### Reproducible one-time remediation

Prepare an uncommitted JSON array matching the `RemediationRow` contract in
`lib/services/opening-hours-governance.ts`; use opaque evidence references and
do not include fetched provider payloads. Every row must include the venue's
exact `updatedAt` snapshot, and the array must cover the complete current live
venue-ID set; the runner compares both before claiming a successful remediation
so a partial or stale offline file cannot overwrite newer work. Set
`SUN_HOURS_REMEDIATION_INPUT` to that file and `SUN_HOURS_REMEDIATION_REPORT` to
a local output path, then bundle and run `scripts/remediate-opening-hours.ts`
with the same pinned local esbuild dependency used by the audit workflow
(`npx --no-install esbuild ...`). The script claims a bounded run, applies each
venue update and audit outcome through one atomic database function, and writes
a bounded report containing only the run ID, counts, venue identity, outcome,
and reason. If the process fails, it finalizes the run as failed; stale claims
are recovered after their lease.

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

- The `venues` table holds the **real Göteborg venue set** as of 2026-07-07: 42 rows,
  ids `"8"`–`"49"`, loaded from the maintainer's `goteborg-venues` JSON. The 7
  fixture/test rows (`"1"`–`"7"`) were **cleared** in the same operation; a plain
  insert without an `id` now gets `"50"` onward. `test-venue-sunny` lives on **only in
  the fixture store** (`lib/services/venues-fixture.ts`) — dev/CI and the visual gate
  run the fixture path (`SUNNYSEAT_VENUE_STORE` unset), so live data loads never
  affect them. Rooftop/hilltop examples in the live set: `cielo`
  (`seating_elevation_m` 23.5 — surveyed height of its own building) and `skanshof`
  (`ground_elevation_m` 18.3 — DTM ground Z of the structures beside its uphill
  seating polygon).
- The runtime reads via the service-role client (bypasses RLS). `seating_area` /
  `seating_elevation_m` / `ground_elevation_m` are **server-only** — never serialized
  into `VenueDataDto`.
