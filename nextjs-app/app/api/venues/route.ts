/**
 * STORY 1.4 — fixture-backed venue search.
 *
 * Returns hardcoded venues from `lib/services/venues-fixture.ts`. A
 * subsequent story (most likely Story 2.1, or a dedicated backend
 * follow-up) replaces this with a real Supabase + `lib/solar` query.
 *
 * Server-only — components must consume venues via the `useVenueSearch`
 * hook calling this route, never by importing the fixture directly.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import {
  validateLatitude,
  validateLongitude,
  validateRadius,
} from '@/lib/utils/validation';
import { badRequest } from '@/lib/utils/api-errors';
import { greatCircleMeters } from '@/lib/utils/geo';
import { normalizeVenueForResponse } from '@/lib/services/venues-fixture';
import { getVenues } from '@/lib/services/venue-store';
import {
  applyPlannerSelectionToVenue,
  parseVenuePlannerParams,
} from '@/lib/services/venue-planner';
import {
  applyFixtureWeatherAvailability,
  resolveFixtureSunFreshness,
} from '@/lib/services/weather-freshness-fixture';
import type { GetVenuesResponse, VenueDataDto } from '@/lib/types/api';
import { sunFreshnessHeaders } from '@/lib/utils/sun-freshness';

const DEFAULT_RADIUS_KM = 1.5;
const MAX_RADIUS_KM = 3.0;
const MAX_RESULTS = 50;
const MAX_QUERY_LENGTH = 80;
const MAX_ID_LENGTH = 80;
const MAX_IDS = MAX_RESULTS;
const MAX_IDS_QUERY_LENGTH = MAX_IDS * (MAX_ID_LENGTH + 1) - 1;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 120;
const COORDINATE_COLLISION_PRECISION = 6;
const MISSING_CLIENT_RATE_LIMIT_KEY = 'missing-client-ip';
const RATE_LIMIT_SWEEP_INTERVAL_MS = RATE_LIMIT_WINDOW_MS;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/u;
const DIACRITIC_PATTERN = /[\u0300-\u036f]/gu;
let lastRateLimitSweepAt = 0;

const SUN_STATUS_ORDER: Record<VenueDataDto['currentSunStatus'], number> = {
  Sunny: 0,
  Partial: 1,
  Shaded: 2,
  NoSun: 3,
};

/**
 * Strict numeric parse — `Number(...)` rejects "1.5abc" with NaN, where
 * `parseFloat(...)` would have happily returned 1.5. The previous
 * lenient parser allowed numeric prefixes followed by garbage to coerce
 * silently into the request.
 */
function parseStrictNumber(
  value: string | null,
  paramName: string,
): { success: true; value: number } | { success: false; error: string } {
  if (value === null || value === '') {
    return { success: false, error: `Missing ${paramName} parameter` };
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return { success: false, error: `Invalid ${paramName}: must be a finite number` };
  }
  return { success: true, value: parsed };
}

function parseSearchQuery(
  params: URLSearchParams,
): { success: true; value: string | undefined } | { success: false; error: string } {
  const values = params.getAll('q');
  if (values.length > 1) {
    return { success: false, error: 'Use a single canonical q parameter' };
  }
  const raw = values[0];
  if (raw === undefined) return { success: true, value: undefined };
  if (Array.from(raw).length > MAX_QUERY_LENGTH) {
    return { success: false, error: `q must be at most ${MAX_QUERY_LENGTH} characters` };
  }
  if (CONTROL_CHARACTER_PATTERN.test(raw)) {
    return { success: false, error: 'q contains invalid control characters' };
  }
  const trimmed = raw.trim();
  return { success: true, value: trimmed || undefined };
}

function parseIdsFilter(
  params: URLSearchParams,
): { success: true; value: string[] | undefined } | { success: false; error: string } {
  const values = params.getAll('ids');
  if (values.length === 0) return { success: true, value: undefined };
  if (values.length > 1) return { success: false, error: 'Use a single canonical ids parameter' };
  const raw = values[0];
  if (Array.from(raw).length > MAX_IDS_QUERY_LENGTH) {
    return { success: false, error: `ids must be at most ${MAX_IDS_QUERY_LENGTH} characters` };
  }
  if (CONTROL_CHARACTER_PATTERN.test(raw)) {
    return { success: false, error: 'ids contains invalid control characters' };
  }
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(',')) {
    if (ids.length >= MAX_IDS) break;
    if (part.includes(',')) {
      return { success: false, error: 'ids entries cannot contain commas' };
    }
    const id = part.trim();
    if (!id || seen.has(id)) continue;
    if (Array.from(id).length > MAX_ID_LENGTH) {
      return { success: false, error: `ids entries must be at most ${MAX_ID_LENGTH} characters` };
    }
    if (CONTROL_CHARACTER_PATTERN.test(id)) {
      return { success: false, error: 'ids contains invalid control characters' };
    }
    seen.add(id);
    ids.push(id);
  }
  return { success: true, value: ids.length > 0 ? ids : undefined };
}

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();

function clientKeyFromForwardedFor(value: string | null): string {
  if (value === null) return MISSING_CLIENT_RATE_LIMIT_KEY;
  const [first] = value.split(',');
  const candidate = first.trim();
  if (!candidate || /[\r\n]/.test(candidate) || candidate.length > 64) return 'invalid';
  if (isIP(candidate) !== 0) return candidate.toLowerCase();
  return 'invalid';
}

function checkRateLimit(key: string, now = Date.now()): boolean {
  if (now - lastRateLimitSweepAt >= RATE_LIMIT_SWEEP_INTERVAL_MS) {
    for (const [bucketKey, bucket] of rateLimitBuckets) {
      if (bucket.resetAt <= now) rateLimitBuckets.delete(bucketKey);
    }
    lastRateLimitSweepAt = now;
  }
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  bucket.count += 1;
  return true;
}

export function clearVenueRateLimitForTests() {
  rateLimitBuckets.clear();
  lastRateLimitSweepAt = 0;
}

export function validateVenueUniqueness(
  venues: VenueDataDto[],
): { valid: true } | { valid: false; reason: string } {
  const ids = new Set<string>();
  const coords = new Set<string>();
  for (const venue of venues) {
    if (ids.has(venue.id)) {
      return { valid: false, reason: `Duplicate venue id: ${venue.id}` };
    }
    ids.add(venue.id);

    const lat = venue.location?.lat;
    const lng = venue.location?.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const key = `${lat.toFixed(COORDINATE_COLLISION_PRECISION)},${lng.toFixed(
      COORDINATE_COLLISION_PRECISION,
    )}`;
    if (coords.has(key)) {
      return { valid: false, reason: `Duplicate venue coordinates: ${key}` };
    }
    coords.add(key);
  }
  return { valid: true };
}

function weakEtag(input: unknown): string {
  const digest = createHash('sha256').update(JSON.stringify(input)).digest('base64url');
  return `W/"${digest}"`;
}

function clientKeyFromRequest(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor?.trim()) return clientKeyFromForwardedFor(forwardedFor);
  const realIp = request.headers.get('x-real-ip');
  if (realIp?.trim()) return clientKeyFromForwardedFor(realIp);
  return MISSING_CLIENT_RATE_LIMIT_KEY;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const clientKey = clientKeyFromRequest(request);
  if (clientKey === 'invalid') {
    return badRequest('Invalid X-Forwarded-For header');
  }
  if (!checkRateLimit(clientKey)) {
    return NextResponse.json(
      { detail: 'Too many venue requests', status: 429 },
      { status: 429 },
    );
  }

  if (params.has('latitude') || params.has('longitude')) {
    return badRequest('Use canonical coordinate parameters: lat and lng');
  }

  const lat = parseStrictNumber(params.get('lat'), 'lat');
  if (!lat.success) return badRequest(lat.error);
  if (!validateLatitude(lat.value)) {
    return badRequest('Latitude must be between -90 and 90 degrees');
  }

  const lng = parseStrictNumber(params.get('lng'), 'lng');
  if (!lng.success) return badRequest(lng.error);
  if (!validateLongitude(lng.value)) {
    return badRequest('Longitude must be between -180 and 180 degrees');
  }

  const storeVenues = await getVenues();
  const uniqueness = validateVenueUniqueness(storeVenues);
  if (!uniqueness.valid) {
    return NextResponse.json(
      { detail: uniqueness.reason, status: 500 },
      { status: 500 },
    );
  }

  // Distinguish missing radiusKm (use default) from malformed (reject 400).
  const radiusKmParam = params.get('radiusKm');
  let radiusKm: number;
  if (radiusKmParam === null || radiusKmParam === '') {
    radiusKm = DEFAULT_RADIUS_KM;
  } else {
    const parsed = Number(radiusKmParam);
    if (!Number.isFinite(parsed)) {
      return badRequest('Invalid radiusKm: must be a finite number');
    }
    radiusKm = parsed;
  }
  if (!validateRadius(radiusKm, MAX_RADIUS_KM)) {
    return badRequest(`Radius must be greater than 0 and at most ${MAX_RADIUS_KM} km`);
  }

  const q = parseSearchQuery(params);
  if (!q.success) return badRequest(q.error);
  const ids = parseIdsFilter(params);
  if (!ids.success) return badRequest(ids.error);
  const planner = parseVenuePlannerParams(params);
  if (!planner.ok) return badRequest(planner.detail);
  const freshness = resolveFixtureSunFreshness(params);

  const matchedVenues = storeVenues
    .map((v) => normalizeVenueForResponse(v))
    .map((v) => applyFixtureWeatherAvailability(v, freshness))
    .map((v) => applyPlannerSelectionToVenue(v, planner.selection))
    .map((v) => ({
      ...v,
      distanceMeters: greatCircleMeters(lat.value, lng.value, v.location.lat, v.location.lng),
    }))
    .filter((v) => {
      if (ids.value) return ids.value.includes(v.id);
      if (q.value) return true;
      return v.distanceMeters <= radiusKm * 1000;
    })
    .filter((v) => (ids.value ? true : matchesVenueQuery(v, q.value)));

  const totalCount = matchedVenues.length;

  const venues = matchedVenues
    .sort((a, b) => {
      const status =
        SUN_STATUS_ORDER[a.currentSunStatus] - SUN_STATUS_ORDER[b.currentSunStatus];
      if (status !== 0) return status;
      return a.distanceMeters - b.distanceMeters;
    })
    .slice(0, MAX_RESULTS);

  // `count` reflects what was returned; `totalCount` reflects the
  // pre-slice match count so the client can surface "showing top 50 of N"
  // when the result set is clipped.
  const response: GetVenuesResponse = {
    venues,
    meta: {
      count: venues.length,
      radiusKm,
      ...freshness,
    },
    timestamp: new Date().toISOString(),
    totalCount,
  };
  const etag = weakEtag({ venues, meta: response.meta, totalCount });
  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': 'public, max-age=30, s-maxage=30, must-revalidate',
        ...sunFreshnessHeaders(freshness),
      },
    });
  }

  // Round 2 D2=A — `public` matches today's behaviour (unauthenticated
  // endpoint, response varies only on URL query params). When auth or
  // session-keyed responses arrive in a later epic, the cache header
  // gets re-reviewed in that story.
  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, max-age=30, s-maxage=30, must-revalidate',
      ETag: etag,
      ...sunFreshnessHeaders(freshness),
    },
  });
}

function matchesVenueQuery(venue: VenueDataDto, q: string | undefined): boolean {
  if (!q) return true;
  const terms = normalizeSearchText(q).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const searchable = normalizeSearchText([
    venue.venueName,
    venue.neighborhood,
  ].join(' '));
  return terms.every((term) => searchable.includes(term));
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITIC_PATTERN, '')
    .toLocaleLowerCase('sv-SE');
}
