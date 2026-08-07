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
import {
  aggregateSunFreshness,
  mapWithConcurrency,
  resolveRequestedAt,
  shouldUseRealSunEngine,
  SUN_ENGINE_LIST_CONCURRENCY,
} from '@/lib/services/sun-engine';
import {
  buildPersistedSunOutcome,
  routeUsesInjectedSunGeometryRepositoryForTests,
  SunGeometryCoverageMissingError,
  __setSunGeometryRepositoryForTests as setSunGeometryRepositoryForTests,
  type SunGeometryRepository,
} from '@/lib/services/sun-geometry-repository';
import {
  __setWeatherSnapshotRepositoryForTests as setWeatherSnapshotRepositoryForTests,
  type WeatherSnapshotRepository,
} from '@/lib/services/weather-snapshots';
import type {
  GetVenuesResponse,
  SunFreshnessMeta,
  VenueDataDto,
} from '@/lib/types/api';
import { sunFreshnessHeaders } from '@/lib/utils/sun-freshness';
import {
  compareVenuesByPublicSun,
  extractBestPublicSunStep,
  extractPublicSunPeak,
} from '@/lib/utils/public-sun';

const DEFAULT_RADIUS_KM = 1.5;
const MAX_RADIUS_KM = 3.0;
const LIST_SEARCH_CANDIDATE_LIMIT = 100;
const FAVOURITE_ID_LIMIT = 50;
const MAX_QUERY_LENGTH = 80;
const MAX_ID_LENGTH = 80;
const MAX_IDS_QUERY_LENGTH = FAVOURITE_ID_LIMIT * (MAX_ID_LENGTH + 1) - 1;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/u;
const DIACRITIC_PATTERN = /[\u0300-\u036f]/gu;

export function __setSunGeometryRepositoryForTests(repo: SunGeometryRepository | undefined): void {
  setSunGeometryRepositoryForTests(repo);
}

export function __setWeatherSnapshotRepositoryForTests(repo: WeatherSnapshotRepository | undefined): void {
  setWeatherSnapshotRepositoryForTests(repo);
}

function compareVenuesByPublicSunPeak(left: VenueDataDto, right: VenueDataDto): number {
  const peakOrder = compareVenuesByPublicSun(
    publicSunPeakCandidate(left),
    publicSunPeakCandidate(right),
  );
  if (peakOrder !== 0) return peakOrder;
  return compareVenuesByPublicSun(left, right);
}

function publicSunPeakCandidate(venue: VenueDataDto) {
  const series = Array.isArray(venue.sunDaySeries) ? venue.sunDaySeries : [];
  const peak = extractPublicSunPeak(series) ?? extractBestPublicSunStep(series);
  return {
    id: venue.id,
    venueId: venue.venueId,
    slug: venue.slug,
    venueSlug: venue.venueSlug,
    venueName: venue.venueName,
    distanceMeters: venue.distanceMeters,
    sunExposurePercent: peak?.sunExposurePercent ?? venue.sunExposurePercent,
    weatherGateState: peak?.weatherGateState ?? venue.weatherGateState,
  };
}

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
    if (ids.length > FAVOURITE_ID_LIMIT) {
      return { success: false, error: `ids must contain at most ${FAVOURITE_ID_LIMIT} entries` };
    }
  }
  return { success: true, value: ids.length > 0 ? ids : undefined };
}

/**
 * Reject a venue set that violates the DB's unique keys before it reaches the
 * map: `id` (the `public.venues` PRIMARY KEY) and `slug` (the unique index
 * `idx_venues_slug`). Coordinates are deliberately NOT checked — they are not a
 * DB unique key, so two legitimately-distinct venues may sit at near-identical
 * coordinates (same building/block) without being a data error, and the old
 * rounded-coordinate check would 500 the list route for them. [Story 8.5 6.1]
 */
export function validateVenueUniqueness(
  venues: VenueDataDto[],
): { valid: true } | { valid: false; reason: string } {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const venue of venues) {
    if (ids.has(venue.id)) {
      return { valid: false, reason: `Duplicate venue id: ${venue.id}` };
    }
    ids.add(venue.id);

    const slug = venue.slug;
    if (slug) {
      if (slugs.has(slug)) {
        return { valid: false, reason: `Duplicate venue slug: ${slug}` };
      }
      slugs.add(slug);
    }
  }
  return { valid: true };
}

function weakEtag(input: unknown): string {
  const digest = createHash('sha256').update(JSON.stringify(input)).digest('base64url');
  return `W/"${digest}"`;
}

// STORY 9.3 (AC3, Option A): the per-IP rate limiter that used to live here (an
// `x-forwarded-for` / `x-real-ip` read + token bucket) has MOVED to `middleware.ts`
// (Edge), which runs BEFORE the response cache. The GET handler below no longer
// reads any request header, so it is a pure, header-independent function and its
// `Cache-Control: public, s-maxage=30` response is now genuinely edge-cacheable
// (previously the header read forced the route dynamic and the s-maxage was dead).
// DoS protection (429) + malformed-XFF rejection (400) are preserved in middleware.
// Staleness window: CDN s-maxage 30s / sun-compute cache 15 min / buildings cache
// 24h (see `lib/services/sun-engine-cache.ts` + architecture.md Caching Strategy).

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

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

  // STORY 12.3 — real venue sunlight is served from persisted deterministic
  // geometry plus read-time weather snapshots. Missing exact current coverage is
  // fail-closed so a cold public request never performs the full-day projection.
  const useRealEngine =
    shouldUseRealSunEngine() ||
    (process.env.NODE_ENV === 'test' && routeUsesInjectedSunGeometryRepositoryForTests());
  const now = new Date();
  let freshness: SunFreshnessMeta;
  let processedVenues: VenueDataDto[];

  if (useRealEngine) {
    const requestedAt = resolveRequestedAt(planner.selection, now);
    let outcomes: Awaited<ReturnType<typeof buildPersistedSunOutcome>>[];
    try {
      outcomes = await mapWithConcurrency(
        storeVenues,
        SUN_ENGINE_LIST_CONCURRENCY,
        (venue) =>
          buildPersistedSunOutcome(venue, requestedAt, now, {
            weatherBucket: params.get('weatherBucket') ?? undefined,
          }),
      );
    } catch (error) {
      if (error instanceof SunGeometryCoverageMissingError) {
        return NextResponse.json(
          {
            error: 'Sun geometry coverage missing',
            code: 'SUN_GEOMETRY_COVERAGE_MISSING',
            detail: 'Missing current geometry coverage for the requested venue/date/hash.',
            statusCode: 503,
          },
          {
            status: 503,
            headers: {
              'Cache-Control': 'no-store',
              'X-Sun-Geometry-Coverage': 'missing',
            },
          },
        );
      }
      throw error;
    }
    freshness = aggregateSunFreshness(outcomes.map((o) => o.freshness));
    processedVenues = outcomes
      .map((o) => {
        // The list route alone attaches the day series. Normalize after the
        // attachment so malformed persisted gate values fail closed before the
        // public DTO is serialized; the detail route still ignores daySeries.
        return normalizeVenueForResponse(
          o.daySeries ? { ...o.venue, sunDaySeries: o.daySeries } : o.venue,
        );
      })
      .map((v) => ({
        ...v,
        distanceMeters: greatCircleMeters(lat.value, lng.value, v.location.lat, v.location.lng),
      }));
  } else {
    freshness = resolveFixtureSunFreshness(params);
    processedVenues = storeVenues
      .map((v) => normalizeVenueForResponse(v))
      .map((v) => applyFixtureWeatherAvailability(v, freshness))
      .map((v) => applyPlannerSelectionToVenue(v, planner.selection))
      .map((v) => ({
        ...v,
        distanceMeters: greatCircleMeters(lat.value, lng.value, v.location.lat, v.location.lng),
      }));
  }

  const matchedVenues = processedVenues
    .filter((v) => {
      if (ids.value) return ids.value.includes(v.id);
      if (q.value) return true;
      return v.distanceMeters <= radiusKm * 1000;
    })
    .filter((v) => (ids.value ? true : matchesVenueQuery(v, q.value)));

  const totalCount = matchedVenues.length;

  // TWO-STAGE selection: truncate by public day-peak so a venue that can become
  // the public sunniest venue later in the day is kept in the client cache; order
  // the kept set by the selected instant so the server and client lists agree.
  const instantOrder = compareVenuesByPublicSun;
  const candidateLimit = ids.value ? FAVOURITE_ID_LIMIT : LIST_SEARCH_CANDIDATE_LIMIT;
  const keptByPeak =
    matchedVenues.length > candidateLimit
      ? [...matchedVenues]
          .sort(compareVenuesByPublicSunPeak)
          .slice(0, candidateLimit)
      : matchedVenues;
  const venues = [...keptByPeak].sort(instantOrder);

  // `count` reflects what was returned; `totalCount` reflects the
  // pre-slice match count so the client can surface a clipped-result message
  // when the result set exceeds the route's candidate cap.
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
