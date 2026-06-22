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
  VenueDetailDto,
  VenueSunStatus,
} from '@/lib/types/api';

/**
 * Detail attributes served only by `/api/venues/[slug]`. Kept separate from the
 * list DTO: the route pipeline spreads `...venue`, so folding these into the
 * list source would leak them into the `/api/venues` response shape.
 */
export type StoredVenueDetail = {
  description?: string;
  address?: string;
  openingHours?: VenueDetailDto['openingHours'];
  peakTime?: string;
  shadowWarningMinutes?: number;
};

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
    openingHours: { display: 'Öppet till 22:00', closesAt: '22:00' },
    peakTime: '15:30',
    shadowWarningMinutes: 45,
  },
  'bryggeriet-soltak': {
    description:
      'Taknära sittplatser med bred solträff under lunch och eftermiddag.',
    address: 'Linnégatan 21, 413 04 Göteborg',
    openingHours: { display: 'Öppet till 23:00', closesAt: '23:00' },
    peakTime: '15:00',
  },
  'solplats-magasinsgatan': {
    description:
      'Lugn innerstadsterrass med bäst sol när eftermiddagen vänder mot kväll.',
    address: 'Magasinsgatan 17, 411 18 Göteborg',
    openingHours: { display: 'Öppet till 21:00', closesAt: '21:00' },
    peakTime: '15:30',
  },
  'cafe-halvvags': {
    description: 'Avslappnat kvarterscafé med delvis sol på de yttre borden.',
    address: 'Vasagatan 32, 411 24 Göteborg',
    openingHours: { display: 'Öppet till 20:00', closesAt: '20:00' },
    peakTime: '16:00',
  },
  'brygghuset-lerum': {
    description:
      'Skyddad gårdsmiljö med kortare solfönster och gott om sittplatser.',
    address: 'Haga Nygata 8, 413 01 Göteborg',
    openingHours: { display: 'Öppet till 22:00', closesAt: '22:00' },
    peakTime: '14:30',
  },
  'skuggans-hus': {
    description:
      'Sval uteservering som bara får korta solglimtar mellan husfasaderna.',
    address: 'Södra Hamngatan 12, 411 14 Göteborg',
    openingHours: { display: 'Öppet till 19:00', closesAt: '19:00' },
    peakTime: '16:30',
  },
  'bistro-bakgarden': {
    description:
      'Bakgårdsservering med mest skugga, men en kort lunchsol vid klart väder.',
    address: 'Engelbrektsgatan 44, 411 37 Göteborg',
    openingHours: { display: 'Öppet till 21:00', closesAt: '21:00' },
    peakTime: '12:00',
    shadowWarningMinutes: 0,
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
  'opening_hours',
  'peak_time',
  'shadow_warning_minutes',
  'current_sun_status',
  'sky_condition',
  'confidence',
  'sun_exposure_percent',
  'sun_window',
  'prediction_uncertainty',
  // Server-only (Story 8.3): the real seating-area polygon for the sun engine.
  // Never mapped into toVenueData / VenueDataDto.
  'seating_area',
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
  opening_hours?: VenueDetailDto['openingHours'] | null;
  peak_time?: string | null;
  shadow_warning_minutes?: number | null;
  current_sun_status?: string | null;
  sky_condition?: string | null;
  confidence?: number | null;
  sun_exposure_percent?: number | null;
  sun_window?: VenueDataDto['sunWindow'] | null;
  prediction_uncertainty?: PredictionUncertaintyDto | null;
  // Server-only seating-area polygon (Story 8.3); never serialized into the DTO.
  seating_area?: GeoJSON.Polygon | null;
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
  };
  if (venue.skyCondition !== undefined) base.skyCondition = venue.skyCondition;
  if (venue.predictionUncertainty !== undefined) {
    base.predictionUncertainty = venue.predictionUncertainty;
  }
  if (venue.sunWindow !== undefined) base.sunWindow = venue.sunWindow;
  if (venue.thumbnail !== undefined) base.thumbnail = venue.thumbnail;
  if (venue.reviewSummary !== undefined) base.reviewSummary = venue.reviewSummary;
  return base;
}

/** Extract just the detail block from a stored venue. */
export function storedVenueDetail(venue: StoredVenue): StoredVenueDetail {
  const detail: StoredVenueDetail = {};
  if (venue.description !== undefined) detail.description = venue.description;
  if (venue.address !== undefined) detail.address = venue.address;
  if (venue.openingHours !== undefined) detail.openingHours = venue.openingHours;
  if (venue.peakTime !== undefined) detail.peakTime = venue.peakTime;
  if (venue.shadowWarningMinutes !== undefined) {
    detail.shadowWarningMinutes = venue.shadowWarningMinutes;
  }
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

const SUN_STATUSES: readonly VenueSunStatus[] = [
  'Sunny',
  'Partial',
  'Shaded',
  'NoSun',
];
const SKY_CONDITIONS: readonly string[] = [
  'clear',
  'partly-cloudy',
  'overcast',
  'unavailable',
];

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
    ...(skyCondition ? { skyCondition } : {}),
    ...(row.prediction_uncertainty
      ? { predictionUncertainty: row.prediction_uncertainty }
      : {}),
    ...(row.sun_window ? { sunWindow: row.sun_window } : {}),
    ...(row.thumbnail ? { thumbnail: row.thumbnail } : {}),
    ...(seatingArea ? { seatingArea } : {}),
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
function coerceSkyCondition(value: string | null | undefined): string | undefined {
  return value && SKY_CONDITIONS.includes(value) ? value : undefined;
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
  if (row.opening_hours) detail.openingHours = row.opening_hours;
  if (row.peak_time != null) detail.peakTime = row.peak_time;
  if (row.shadow_warning_minutes != null) {
    detail.shadowWarningMinutes = row.shadow_warning_minutes;
  }
  return detail;
}

function numberOr(value: number | null | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
