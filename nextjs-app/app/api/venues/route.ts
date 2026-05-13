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
import {
  validateLatitude,
  validateLongitude,
  validateRadius,
} from '@/lib/utils/validation';
import { badRequest } from '@/lib/utils/api-errors';
import { VENUE_FIXTURE } from '@/lib/services/venues-fixture';
import type { GetVenuesResponse, VenueDataDto } from '@/lib/types/api';

const DEFAULT_RADIUS_KM = 1.5;
const MAX_RADIUS_KM = 3.0;
const MAX_RESULTS = 50;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 120;
const COORDINATE_COLLISION_PRECISION = 6;

const SUN_STATUS_ORDER: Record<VenueDataDto['currentSunStatus'], number> = {
  Sunny: 0,
  Partial: 1,
  Shaded: 2,
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

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();

function clientKeyFromForwardedFor(value: string | null): string {
  if (!value) return 'unknown';
  const [first] = value.split(',');
  const candidate = first.trim();
  if (!candidate || /[\r\n]/.test(candidate) || candidate.length > 64) return 'invalid';
  if (/^[\d.]+$/.test(candidate) || /^[0-9a-fA-F:.]+$/.test(candidate)) return candidate;
  return 'invalid';
}

function checkRateLimit(key: string, now = Date.now()): boolean {
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

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const clientKey = clientKeyFromForwardedFor(request.headers.get('x-forwarded-for'));
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

  const uniqueness = validateVenueUniqueness(VENUE_FIXTURE);
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

  const matchedVenues = VENUE_FIXTURE
    .map((v) => ({
      ...v,
      distanceMeters: greatCircleMeters(lat.value, lng.value, v.location.lat, v.location.lng),
    }))
    .filter((v) => v.distanceMeters <= radiusKm * 1000);

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
    meta: { count: venues.length, radiusKm },
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
    },
  });
}

function greatCircleMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusMeters = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  // Clamp the haversine intermediate `a` to [0, 1] before sqrt — without
  // this guard, FP rounding at antipodal points could push `a` slightly
  // negative, producing NaN that silently fails the radius filter.
  const a = Math.min(
    1,
    Math.max(
      0,
      Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2,
    ),
  );
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(a));
}
