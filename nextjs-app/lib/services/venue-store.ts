/**
 * STORY 8.2 — venue store abstraction (server-only).
 *
 * The single source the venue API routes read from. Defaults to an in-memory
 * seed built from `VENUE_FIXTURE` (+ the launch detail block) so CI and tests
 * have ZERO live-Supabase dependency and the route output stays byte-identical
 * to the fixture era. Set `SUNNYSEAT_VENUE_STORE=supabase` to read the real
 * `public.venues` table via the service-role client — mirroring the
 * `venue-reviews-persistence.ts` / `venue-feedback-persistence.ts` adapters.
 *
 * The sun-engine fields (`currentSunStatus`, `skyCondition`, `confidence`,
 * `sunExposurePercent`, `sunWindow`, `predictionUncertainty`) are TEMPORARY
 * seed carriers superseded by the real engine in Story 8.3.
 *
 * Server-only — client components must never import this module (API boundary).
 */
import { VENUE_FIXTURE } from '@/lib/services/venues-fixture';
import type {
  PredictionUncertaintyDto,
  VenueDataDto,
  VenueSunStatus,
  WeeklyOpeningHours,
} from '@/lib/types/api';
import type { SkyCondition } from '@/lib/types/design-tokens';

/**
 * Detail attributes served only by `/api/venues/[slug]`. Kept separate from the
 * list DTO: the route pipeline spreads `...venue`, so folding these into the
 * list source would leak them into the `/api/venues` response shape.
 */
export type StoredVenueDetail = {
  description?: string;
  address?: string;
  // STORY 11.9 (AC2): per-weekday opening hours. The pre-localized `display`
  // string is gone — the render layer derives it. STORY 11.9 (AC3/AC4): `peakTime`
  // (real engine computes it live from the timeline) and `shadowWarningMinutes`
  // (rendered nowhere) are REMOVED.
  openingHours?: WeeklyOpeningHours;
};

/**
 * STORY 11.9 (AC2): a per-weekday opening-hours object where every ISO weekday
 * (Mon..Sun) opens at `open` and closes at `close`. Used to seed the launch venues
 * so the derived "Öppet till HH:MM" line matches the OLD stored display on every
 * weekday (byte-stable gate parity — `test-venue-sunny` still derives "22:00").
 */
function everyDay(open: string, close: string): WeeklyOpeningHours {
  return {
    '1': { open, close },
    '2': { open, close },
    '3': { open, close },
    '4': { open, close },
    '5': { open, close },
    '6': { open, close },
    '7': { open, close },
  };
}

/**
 * Server-only venue attributes that are NEVER serialized into the client DTO.
 *
 * `seatingArea` is the venue's real outdoor seating-area polygon (Story 8.3
 * DECISION B, polygon-first direction). When present the sun engine computes
 * shadows against the true polygon; when absent it falls back to a synthesized
 * point footprint. Consumed ONLY by `lib/services/sun-engine.ts` — `toVenueData`
 * must not surface it (no DTO/frontend change; the gate venue stays
 * byte-identical because launch venues leave it null → footprint fallback).
 */
export type StoredVenueServerOnly = {
  seatingArea?: GeoJSON.Polygon;
  /**
   * Metres the venue's outdoor seating surface sits above its own local ground
   * (rooftop bar / raised terrace / balcony). Story 8.6 height gate: a nearby
   * caster only shadows the venue by its height ABOVE this surface. Consumed ONLY
   * by `lib/services/sun-engine.ts` → the shadow engine; like `seatingArea` it is
   * a server-only field and `toVenueData` must NEVER surface it into the DTO.
   * Absent / null / negative / NaN is treated as ground level (0), keeping the
   * default path byte-identical (every launch venue leaves it null).
   */
  seatingElevationM?: number;
  /**
   * RH2000 absolute ground elevation (metres) at the venue point (Story 8.7 terrain
   * gate). Unlike `seatingElevationM` this is an ABSOLUTE elevation and MAY BE
   * NEGATIVE (live caster ground Z ranges roughly −6 .. 100 m). Consumed ONLY by
   * `lib/services/sun-engine.ts` → the shadow engine to measure casters against the
   * venue's own ground; like `seatingArea` it is server-only and `toVenueData` must
   * NEVER surface it. Absent / null / non-finite → the engine uses the Story 8.6
   * relative gate, so the default path stays byte-identical (every launch venue
   * leaves it null).
   */
  groundElevationM?: number;
};

export type StoredVenue = VenueDataDto & StoredVenueDetail & StoredVenueServerOnly;

/**
 * Launch venue detail, keyed by slug. Folded into the in-memory seed and used
 * as the byte-identical baseline for the `8-2-venues-store-contract.sql` seed.
 */
const VENUE_DETAIL_SEED: Record<string, StoredVenueDetail> = {
  'test-venue-sunny': {
    description:
      'Stor uteservering med eftermiddagssol, skyddade bord och nära till både spårvagn och kajstråk.',
    address: 'Tredje Långgatan 9, 413 03 Göteborg',
    openingHours: everyDay('11:00', '22:00'),
  },
  'bryggeriet-soltak': {
    description:
      'Taknära sittplatser med bred solträff under lunch och eftermiddag.',
    address: 'Linnégatan 21, 413 04 Göteborg',
    openingHours: everyDay('11:00', '23:00'),
  },
  'solplats-magasinsgatan': {
    description:
      'Lugn innerstadsterrass med bäst sol när eftermiddagen vänder mot kväll.',
    address: 'Magasinsgatan 17, 411 18 Göteborg',
    openingHours: everyDay('11:00', '21:00'),
  },
  'cafe-halvvags': {
    description: 'Avslappnat kvarterscafé med delvis sol på de yttre borden.',
    address: 'Vasagatan 32, 411 24 Göteborg',
    openingHours: everyDay('11:00', '20:00'),
  },
  'brygghuset-lerum': {
    description:
      'Skyddad gårdsmiljö med kortare solfönster och gott om sittplatser.',
    address: 'Haga Nygata 8, 413 01 Göteborg',
    // Story 12.1: deterministic whole-field-unknown fixture. The detail/list
    // routes must omit openingHours rather than fabricate a closed schedule.
  },
  'skuggans-hus': {
    description:
      'Sval uteservering som bara får korta solglimtar mellan husfasaderna.',
    address: 'Södra Hamngatan 12, 411 14 Göteborg',
    openingHours: everyDay('11:00', '19:00'),
  },
  'bistro-bakgarden': {
    description:
      'Bakgårdsservering med mest skugga, men en kort lunchsol vid klart väder.',
    address: 'Engelbrektsgatan 44, 411 37 Göteborg',
    openingHours: everyDay('11:00', '21:00'),
  },
};

export const VENUE_SELECT_COLUMNS = [
  'id',
  'slug',
  'venue_name',
  'neighborhood',
  'lat',
  'lng',
  'is_partner',
  'thumbnail',
  'description',
  'address',
  // STORY 11.9 (AC2): the column stays, but its jsonb shape is now per-weekday.
  // STORY 11.9 (AC3/AC4): `peak_time` + `shadow_warning_minutes` are DROPPED — the
  // real engine computes `peakTime` live from the timeline, and
  // `shadow_warning_minutes` was carried store→DTO but rendered nowhere.
  'opening_hours',
  'current_sun_status',
  'sky_condition',
  'confidence',
  'sun_exposure_percent',
  'sun_window',
  'prediction_uncertainty',
  // Story 9.7: user-facing tags for the desktop chip filter. Unlike the
  // server-only columns below, this IS mapped into the client VenueDataDto.
  'tags',
  // Server-only (Story 8.3): the real seating-area polygon for the sun engine.
  // Never mapped into toVenueData / VenueDataDto.
  'seating_area',
  // Server-only (Story 8.6): metres the seating surface sits above local ground
  // (rooftop / raised-terrace height gate). Never mapped into the DTO.
  'seating_elevation_m',
  // Server-only (Story 8.7): RH2000 absolute ground elevation (Z) at the venue
  // point for the terrain gate (may be negative). Never mapped into the DTO.
  'ground_elevation_m',
].join(', ');

type VenueRow = {
  id?: string | null;
  slug?: string | null;
  venue_name?: string | null;
  neighborhood?: string | null;
  lat?: number | null;
  lng?: number | null;
  is_partner?: boolean | null;
  thumbnail?: VenueDataDto['thumbnail'] | null;
  description?: string | null;
  address?: string | null;
  // STORY 11.9 (AC2): the raw jsonb opening_hours (per-weekday shape, or a
  // legacy/garbage value from a bad row → coerced to undefined). `peak_time` +
  // `shadow_warning_minutes` are DROPPED from the row shape (AC3/AC4).
  opening_hours?: unknown;
  current_sun_status?: string | null;
  sky_condition?: string | null;
  confidence?: number | null;
  sun_exposure_percent?: number | null;
  sun_window?: VenueDataDto['sunWindow'] | null;
  prediction_uncertainty?: PredictionUncertaintyDto | null;
  // Story 9.7 user-facing tags; mapped into the DTO (client-safe, unlike the
  // server-only columns below). May be null/garbage from a bad row → coerced [].
  tags?: string[] | null;
  // Server-only seating-area polygon (Story 8.3); never serialized into the DTO.
  seating_area?: GeoJSON.Polygon | null;
  // Server-only seating-surface elevation in metres (Story 8.6); never in the DTO.
  seating_elevation_m?: number | null;
  // Server-only RH2000 absolute ground Z at the venue point (Story 8.7); may be
  // negative; never in the DTO.
  ground_elevation_m?: number | null;
};

/**
 * Venues for the list route (`/api/venues`). Returns BASE venue fields only —
 * the detail block is intentionally omitted so the existing list DTO shape is
 * unchanged. Detail is served by {@link getVenueBySlug}.
 */
export async function getVenues(): Promise<StoredVenue[]> {
  if (!usesSupabaseVenueStore()) {
    return VENUE_FIXTURE.map((venue) => ({ ...venue }));
  }
  if (!hasSupabaseServiceRoleConfig()) {
    throw new Error(
      'Venue store is configured for Supabase but credentials are incomplete',
    );
  }
  const rows = await readSupabaseVenues();
  return rows.map(toVenueData);
}

/**
 * A single venue (base + detail block) for the detail route
 * (`/api/venues/[slug]`). Returns `null` when no venue matches the slug.
 */
export async function getVenueBySlug(slug: string): Promise<StoredVenue | null> {
  const normalized = slug.trim();
  if (!normalized) return null;
  if (!usesSupabaseVenueStore()) {
    return (
      buildInMemorySeed().find(
        (venue) => venue.slug === normalized || venue.venueSlug === normalized,
      ) ?? null
    );
  }
  if (!hasSupabaseServiceRoleConfig()) {
    throw new Error(
      'Venue store is configured for Supabase but credentials are incomplete',
    );
  }
  return readSupabaseVenueBySlug(normalized);
}

/** Strip the detail block, yielding the base list DTO shape. */
export function toVenueData(venue: StoredVenue): VenueDataDto {
  const base: VenueDataDto = {
    id: venue.id,
    venueId: venue.venueId,
    venueName: venue.venueName,
    venueSlug: venue.venueSlug,
    slug: venue.slug,
    neighborhood: venue.neighborhood,
    location: venue.location,
    currentSunStatus: venue.currentSunStatus,
    isPartner: venue.isPartner,
    confidence: venue.confidence,
    distanceMeters: venue.distanceMeters,
    sunExposurePercent: venue.sunExposurePercent,
    // Required DTO field (Story 9.7): `[]` is the honest "no tags" value, so it
    // is set unconditionally — NOT with the optional `if (x !== undefined)`
    // pattern the server-only fields use.
    tags: venue.tags ?? [],
  };
  if (venue.skyCondition !== undefined) base.skyCondition = venue.skyCondition;
  if (venue.predictionUncertainty !== undefined) {
    base.predictionUncertainty = venue.predictionUncertainty;
  }
  if (venue.sunWindow !== undefined) base.sunWindow = venue.sunWindow;
  // STORY 11.4 (AC1) / 11.9 (AC2): surface the venue's real opening hours on the
  // LIST DTO so the quick-info caller can DERIVE "Öppet till HH:MM" for the current
  // weekday. Copied with the same optional-guard pattern as the other
  // detail-adjacent fields — present only where the store carries
  // `venues.opening_hours` (via `detailFromRow`/`VENUE_DETAIL_SEED`/the fixture),
  // ABSENT otherwise so the card renders nothing (never fabricated). Unlike the
  // stripped `description` detail chrome, this one field is intentionally carried
  // through to the list surface (now the per-weekday structure, not a display string).
  if (venue.openingHours !== undefined) base.openingHours = venue.openingHours;
  if (venue.thumbnail !== undefined) base.thumbnail = venue.thumbnail;
  if (venue.reviewSummary !== undefined) base.reviewSummary = venue.reviewSummary;
  return base;
}

/**
 * Coerce a DB `tags` column to a clean `string[]` (Story 9.7). A non-array,
 * null, or garbage value → `[]` (graceful-empty — AC1/AC4: a tag-less venue is
 * only ever hidden when a chip is active). Keeps only non-empty trimmed strings
 * and de-dupes, mirroring the defensive `coerce*` helpers above. The field is
 * required on the DTO, so this NEVER returns undefined.
 */
function coerceTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    tags.push(trimmed);
  }
  return tags;
}

/** Extract just the detail block from a stored venue. */
export function storedVenueDetail(venue: StoredVenue): StoredVenueDetail {
  const detail: StoredVenueDetail = {};
  if (venue.description !== undefined) detail.description = venue.description;
  if (venue.address !== undefined) detail.address = venue.address;
  if (venue.openingHours !== undefined) detail.openingHours = venue.openingHours;
  return detail;
}

function buildInMemorySeed(): StoredVenue[] {
  return VENUE_FIXTURE.map((venue) => ({
    ...venue,
    ...(VENUE_DETAIL_SEED[venue.slug] ?? {}),
  }));
}

function usesSupabaseVenueStore(): boolean {
  return process.env.SUNNYSEAT_VENUE_STORE === 'supabase';
}

function hasSupabaseServiceRoleConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

async function readSupabaseVenues(): Promise<StoredVenue[]> {
  const { getSupabaseServiceRole } = await import('@/lib/supabase/server');
  const { data, error } = await getSupabaseServiceRole()
    .from('venues')
    .select(VENUE_SELECT_COLUMNS);
  if (error) {
    throw new Error(`Venue store failed: ${error.message}`);
  }
  return ((data ?? []) as VenueRow[]).map(fromVenueRow);
}

async function readSupabaseVenueBySlug(slug: string): Promise<StoredVenue | null> {
  const { getSupabaseServiceRole } = await import('@/lib/supabase/server');
  const { data, error } = await getSupabaseServiceRole()
    .from('venues')
    .select(VENUE_SELECT_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    throw new Error(`Venue store failed: ${error.message}`);
  }
  return data ? fromVenueRow(data as VenueRow) : null;
}

// STORY 10.1 (AC4, Task 1): the DB `coerceSunStatus` allow-list, typed
// `readonly VenueSunStatus[]` so it is a compile-forcing site — a union value
// missing from this literal is not a type error by itself, but keeping the array
// aligned with the union means a stored `current_sun_status` of `'CloudObscured'`
// round-trips instead of collapsing to the `'NoSun'` safe default. (The engine
// computes `CloudObscured` at request time; it is not persisted today, but the
// allow-list stays complete so a future persisted value is not silently dropped.)
const SUN_STATUSES: readonly VenueSunStatus[] = [
  'Sunny',
  'Partial',
  'Shaded',
  'NoSun',
  'CloudObscured',
];
// STORY 10 review [Patch][Low]: this allow-list MUST stay in lock-step with the
// canonical `SkyCondition` union — 10.4 introduced `'rain'` but this parallel
// list never gained it, so a persisted+re-read `'rain'` skyCondition would be
// silently stripped to `undefined` by `coerceSkyCondition` (→ no sky line).
// Deriving the array from a `Record<SkyCondition, true>` makes it
// exhaustiveness-forcing: a future member added to the union without listing it
// here is a compile error (a plain `readonly string[]` literal never caught the
// `'rain'` drift because membership alone was never type-checked).
const SKY_CONDITION_MEMBERS = {
  'clear': true,
  'partly-cloudy': true,
  'overcast': true,
  'rain': true,
  'unavailable': true,
} as const satisfies Record<SkyCondition, true>;
const SKY_CONDITIONS: readonly SkyCondition[] = Object.keys(
  SKY_CONDITION_MEMBERS,
) as SkyCondition[];

/**
 * Defensive snake_case row -> StoredVenue mapping. Tolerates null jsonb
 * sub-fields; further DTO sanitization (malformed sunWindow/thumbnail/reasons)
 * is handled downstream by `normalizeVenueForResponse` in the route pipeline.
 *
 * Identity (`id`/`slug`) and coordinates are REQUIRED: a row missing them is a
 * data error and throws rather than emitting a plausible-but-wrong `(0,0)` /
 * empty-id venue (which would also collide in `validateVenueUniqueness`).
 * [Story 8.2 review R1-P2]
 */
function fromVenueRow(row: VenueRow): StoredVenue {
  const id = row.id?.trim();
  const slug = row.slug?.trim();
  if (!id || !slug) {
    throw new Error(
      `Venue store failed: row missing id/slug (id=${formatBadValue(row.id)}, slug=${formatBadValue(row.slug)})`,
    );
  }
  const lat = row.lat;
  const lng = row.lng;
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
    throw new Error(
      `Venue store failed: venue ${id} has invalid coordinates (lat=${formatBadValue(row.lat)}, lng=${formatBadValue(row.lng)})`,
    );
  }
  const skyCondition = coerceSkyCondition(row.sky_condition);
  const seatingArea = coerceSeatingArea(row.seating_area);
  const seatingElevationM = coerceSeatingElevation(row.seating_elevation_m);
  const groundElevationM = coerceGroundElevation(row.ground_elevation_m);
  const stored: StoredVenue = {
    id,
    venueId: id,
    venueName: row.venue_name ?? '',
    venueSlug: slug,
    slug,
    neighborhood: row.neighborhood ?? '',
    location: { lat, lng },
    currentSunStatus: coerceSunStatus(row.current_sun_status),
    isPartner: Boolean(row.is_partner),
    confidence: numberOr(row.confidence, 0),
    distanceMeters: 0,
    sunExposurePercent: numberOr(row.sun_exposure_percent, 0),
    tags: coerceTags(row.tags),
    ...(skyCondition ? { skyCondition } : {}),
    ...(row.prediction_uncertainty
      ? { predictionUncertainty: row.prediction_uncertainty }
      : {}),
    ...(row.sun_window ? { sunWindow: row.sun_window } : {}),
    ...(row.thumbnail ? { thumbnail: row.thumbnail } : {}),
    ...(seatingArea ? { seatingArea } : {}),
    ...(seatingElevationM !== undefined ? { seatingElevationM } : {}),
    ...(groundElevationM !== undefined ? { groundElevationM } : {}),
    ...detailFromRow(row),
  };
  return stored;
}

/**
 * Keep `seating_area` only when it is a GeoJSON `Polygon` with a well-formed
 * outer ring (server-only). A null, malformed, or degenerate value is dropped so
 * the sun engine falls back to the synthesized point footprint rather than
 * throwing or computing a `[0,0]` centroid. [Story 8.3; review R1 hardening]
 */
function coerceSeatingArea(value: GeoJSON.Polygon | null | undefined): GeoJSON.Polygon | undefined {
  if (
    value &&
    typeof value === 'object' &&
    value.type === 'Polygon' &&
    Array.isArray(value.coordinates) &&
    isValidLinearRing(value.coordinates[0])
  ) {
    return value;
  }
  return undefined;
}

/**
 * Keep `seating_elevation_m` only as a finite number `>= 0` metres (server-only,
 * Story 8.6). A null / negative / NaN value is dropped → the field is absent and
 * the sun engine treats the venue as ground level (elevation 0), so the default
 * path stays byte-identical. A stored `0` is preserved (also ground level) so the
 * mapping faithfully reflects the column.
 */
function coerceSeatingElevation(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

/**
 * Keep `ground_elevation_m` only as a finite number (server-only, Story 8.7). Unlike
 * `seating_elevation_m` this is an ABSOLUTE RH2000 ground Z and MAY BE NEGATIVE (so
 * there is no `>= 0` guard). A null / non-finite value is dropped → the field is
 * absent and the sun engine uses the Story 8.6 relative gate, keeping the default
 * path byte-identical. A stored `0` is preserved (sea-level datum is a valid ground Z).
 */
function coerceGroundElevation(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * A GeoJSON Polygon outer ring must be an array of at least 4 positions, each a
 * `[number, number]` (lng, lat) pair. Anything less (empty ring, `[[]]`, short
 * ring, non-numeric tuples) would break centroid/shadow math downstream.
 */
function isValidLinearRing(ring: unknown): boolean {
  return (
    Array.isArray(ring) &&
    ring.length >= 4 &&
    ring.every(
      (pos) =>
        Array.isArray(pos) &&
        pos.length >= 2 &&
        Number.isFinite(pos[0]) &&
        Number.isFinite(pos[1]),
    )
  );
}

/**
 * Coerce a DB `current_sun_status` to a valid {@link VenueSunStatus}. An
 * out-of-enum value (or null) collapses to `'NoSun'` — the safe default — so it
 * never leaks into the DTO and never NaNs the route's list-sort comparator
 * (`SUN_STATUS_ORDER[invalid]` would be `undefined`). [Story 8.2 review R1-P1]
 */
function coerceSunStatus(value: string | null | undefined): VenueSunStatus {
  return SUN_STATUSES.includes(value as VenueSunStatus)
    ? (value as VenueSunStatus)
    : 'NoSun';
}

/**
 * Keep `sky_condition` only when it is one of the known values; an out-of-enum
 * value is dropped (mirroring how `normalizeVenueForResponse` drops malformed
 * optional fields) rather than leaking into the DTO. [Story 8.2 review R1-P1]
 */
function coerceSkyCondition(value: string | null | undefined): SkyCondition | undefined {
  return value && SKY_CONDITIONS.includes(value as SkyCondition)
    ? (value as SkyCondition)
    : undefined;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatBadValue(value: unknown): string {
  return value == null ? String(value) : JSON.stringify(value);
}

function detailFromRow(row: VenueRow): StoredVenueDetail {
  const detail: StoredVenueDetail = {};
  if (row.description != null) detail.description = row.description;
  if (row.address != null) detail.address = row.address;
  const openingHours = coerceOpeningHours(row.opening_hours);
  if (openingHours !== undefined) detail.openingHours = openingHours;
  return detail;
}

/**
 * STORY 11.9 (AC2): coerce a DB `opening_hours` jsonb value to a clean per-weekday
 * {@link WeeklyOpeningHours}, or `undefined` when it is null/malformed (a bad row →
 * the venue renders NOTHING, never a throw — mirroring the other defensive
 * `coerce*` helpers). A well-formed weekday entry is `{ open, close }` with HH:MM
 * strings; a `null` weekday entry (closed that day) is PRESERVED so the formatter
 * derives "closed today" honestly. The result is kept only when it has at least one
 * usable weekday key — an object with zero recognizable weekday entries → undefined.
 */
export function coerceOpeningHours(value: unknown): WeeklyOpeningHours | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const result: WeeklyOpeningHours = {};
  let hasEntry = false;
  for (const weekday of ['1', '2', '3', '4', '5', '6', '7'] as const) {
    if (!(weekday in source)) continue;
    const entry = source[weekday];
    if (entry === null) {
      result[weekday] = null; // explicitly closed that day
      hasEntry = true;
      continue;
    }
    const interval = coerceOpeningInterval(entry);
    if (interval) {
      result[weekday] = interval;
      hasEntry = true;
    }
  }
  return hasEntry ? result : undefined;
}

function coerceOpeningInterval(value: unknown): { open: string; close: string } | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const { open, close } = value as { open?: unknown; close?: unknown };
  if (typeof open !== 'string' || typeof close !== 'string') return undefined;
  if (!OPENING_TIME_PATTERN.test(open) || !OPENING_TIME_PATTERN.test(close)) {
    return undefined;
  }
  return { open, close };
}

const OPENING_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function numberOr(value: number | null | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
