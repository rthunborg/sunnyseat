/**
 * ATDD RED-PHASE acceptance scaffolds - Story 12.3
 * "Day-Series Compute at Real-Venue Scale - persisted geometry route contract"
 *
 * These tests are intentionally skipped until the implementation task lands.
 * They pin the fail-closed public route behavior: /api/venues reads exact
 * persisted geometry coverage and weather snapshots, never recomputes the 61-step
 * shadow series on the request path, and returns a typed 503 when current-hash
 * coverage is missing.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { StoredVenue } from '@/lib/services/venue-store';
import type { GetVenuesResponse, GetVenueDetailResponse } from '@/lib/types/api';
import { isVenuePubliclySunny, extractPublicSunPeak, extractPublicSunWindow } from '@/lib/utils/public-sun';
import { deriveVenueSunAtMinutes } from '@/lib/utils/venue-day-series';
import * as venueRoute from '@/app/api/venues/route';
import * as venueDetailRoute from '@/app/api/venues/[slug]/route';

function appSource(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const DEFAULT_VENUES_QUERY = '?lat=57.7089&lng=11.9746&date=2026-07-18&time=12:00';

function venuesRequest(query = DEFAULT_VENUES_QUERY): NextRequest {
  const normalizedQuery = query.startsWith('?') ? query : `${DEFAULT_VENUES_QUERY}${query}`;
  return new NextRequest(`http://localhost/api/venues${normalizedQuery}`);
}

type RouteTestHook = {
  __setVenueStoreForTests?: (loader: (() => Promise<StoredVenue[]>) | undefined) => void;
  __setSunGeometryRepositoryForTests?: (repo: unknown) => void;
  __setWeatherSnapshotRepositoryForTests?: (repo: unknown) => void;
  __setPersistedSunRepositoryPreparerForTests?: (preparer: unknown) => void;
  GET: (request: NextRequest) => Promise<Response>;
};

const route = venueRoute as RouteTestHook;

test.each(['weatherUnknown', 'isRaining'] as const)('persisted list and detail reject string %s with neutral cache/provenance', async (flag) => {
  vi.stubEnv('SUNNYSEAT_SUN_ENGINE', 'real');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role');
  const providerFetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected outbound request'));
  route.__setSunGeometryRepositoryForTests?.({
    computeCurrentGeometryInputHash: async () => geometryHashForVenue('1'),
    readCurrentCoverageForVenueDay: async () => ({
      venueId: '1', stockholmDate: '2026-07-18', geometryInputHash: geometryHashForVenue('1'),
      status: 'ready', series: [{ minutes: 720, sunExposurePercent: 95 }],
    }),
  });
  let flagValue: unknown = false;
  route.__setWeatherSnapshotRepositoryForTests?.({
    readSnapshotForVenueDay: async () => ({
      status: 'ready', weatherUpdatedAt: '2026-07-18T09:55:00.000Z',
      slices: [{ ...clearSnapshotSlice(720), [flag]: flagValue }, clearSnapshotSlice(780)],
    }),
  });
  try {
    const clearResponse = await route.GET(venuesRequest());
    expect(clearResponse.status).toBe(200);
    const clearBody = await clearResponse.json() as GetVenuesResponse;
    expect(clearBody.venues.every(isVenuePubliclySunny)).toBe(true);
    const clearEtag = clearResponse.headers.get('etag');
    for (flagValue of ['true', 'false']) {
      const response = await route.GET(venuesRequest());
      expect(response.status).toBe(200);
      expect(response.headers.get('etag')).not.toBe(clearEtag);
      const body = await response.json() as GetVenuesResponse;
      expect(body.meta.sunDataSource).toBe('geometry-only');
      expect(body.meta.weatherUpdatedAt).toBeUndefined();
      for (const venue of body.venues) {
        expect(venue).toMatchObject({ directSunState: 'unknown', weatherGateState: 'unknown', confidence: 40 });
        expect(isVenuePubliclySunny(venue)).toBe(false);
        expect(venue.sunWindow).toBeUndefined();
        expect(extractPublicSunPeak(venue.sunDaySeries ?? [])).toBeNull();
        expect(extractPublicSunWindow(venue.sunDaySeries ?? [], { stepMinutes: 15 })).toBeNull();
        expect(deriveVenueSunAtMinutes(venue.sunDaySeries, 720)?.directSunState).toBe('unknown');
      }
      const cachedRequest = venuesRequest();
      cachedRequest.headers.set('if-none-match', response.headers.get('etag')!);
      expect((await route.GET(cachedRequest)).status).toBe(304);

      const detailResponse = await venueDetailRoute.GET(new NextRequest(
        'http://localhost/api/venues/test-venue-sunny?date=2026-07-18&time=12:00',
      ), { params: Promise.resolve({ slug: 'test-venue-sunny' }) });
      expect(detailResponse.status).toBe(200);
      const detail = await detailResponse.json() as GetVenueDetailResponse;
      expect(detail.meta?.sunDataSource).toBe('geometry-only');
      expect(detail.venue).toMatchObject({ directSunState: 'unknown', weatherGateState: 'unknown', confidence: 40 });
      expect(isVenuePubliclySunny(detail.venue)).toBe(false);
      expect(detail.venue.timeline.windows).toEqual([]);
      expect(detail.venue.timeline.peakTime).toBeUndefined();
    }
    expect(providerFetch).not.toHaveBeenCalled();
  } finally {
    providerFetch.mockRestore();
  }
});

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-18T10:00:00.000Z'));
});

afterEach(() => {
  route.__setVenueStoreForTests?.(undefined);
  route.__setSunGeometryRepositoryForTests?.(undefined);
  route.__setWeatherSnapshotRepositoryForTests?.(undefined);
  route.__setPersistedSunRepositoryPreparerForTests?.(undefined);
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

function routeScaleVenue(index: number): StoredVenue {
  const id = `scale-${index.toString().padStart(2, '0')}`;
  const row = Math.floor(index / 7);
  const column = index % 7;
  return {
    id,
    venueId: id,
    venueName: `Scale Venue ${index}`,
    venueSlug: id,
    slug: id,
    neighborhood: 'Centrum',
    location: {
      lat: 57.7089 + row * 0.0001,
      lng: 11.9746 + column * 0.0001,
    },
    currentSunStatus: 'Sunny',
    weatherGateState: 'not_gated',
    isPartner: false,
    confidence: 90,
    distanceMeters: 0,
    sunExposurePercent: 80,
    tags: [],
  };
}

function geometryHashForVenue(venueId: string): string {
  const numericSuffix = Number(venueId.replace(/\D/gu, ''));
  return `g1:${numericSuffix.toString(16).padStart(64, '0')}`;
}

function clearSnapshotSlice(minutes: number) {
  const stockholmHour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return {
    minutes,
    validAt: new Date(Date.UTC(2026, 6, 18, stockholmHour - 2, minute)).toISOString(),
    cloudCover: 10,
    cloudCoverLow: 10,
    cloudCoverMedium: 0,
    cloudCoverHigh: 0,
    fogAreaFraction: 0,
    precipitationAmount: 0,
    symbolCode: 'clearsky_day',
    isRaining: false,
  };
}

describe('Story 12.3 AC1/AC2 - /api/venues uses persisted geometry, not request-path projection', () => {
  test('source contract removes 61-step shadow projection and live weather fan-out from the list route', () => {
    const source = appSource('app/api/venues/route.ts');

    expect(source).toContain('SUN_GEOMETRY_COVERAGE_MISSING');
    expect(source).toMatch(/persistedSunGeometry|sunGeometryRepository|readPersistedGeometry/i);
    expect(source).toMatch(/weatherSnapshot|gatePersistedGeometry/i);
    expect(source).not.toContain('computeVenueDaySeries');
    expect(source).not.toContain('applyRealSunEngine');
    expect(source).not.toContain("import('@/lib/weather/met-no-service')");
    expect(source).not.toContain("import('@/lib/weather/nowcast-service')");
    expect(source).toContain('preparePersistedSunRouteRepositoriesForVenueDays');
    expect(source).toMatch(
      /buildPersistedSunOutcome\(venue, requestedAt, now, \{ repositories \}\)/u,
    );
  });

  test('public persisted reads use the published current hash instead of recomputing live geometry input', () => {
    const source = appSource('lib/services/sun-geometry-repository.ts');
    const defaultRepository = source.slice(source.indexOf('const defaultSunGeometryRepository'));

    expect(defaultRepository).toContain('readCurrentGeometryInput');
    expect(defaultRepository).toContain("select('status, current_geometry_input_hash')");
    expect(defaultRepository).not.toContain('buildGeometryInputPayloadForVenue(venue, stockholmDate)');
    expect(defaultRepository).not.toContain('computeGeometryInputHash(input)');
  });

  test('production list wiring uses one prepared repository set instead of the scalar test repository', async () => {
    const venues = Array.from({ length: 42 }, (_, index) => routeScaleVenue(index + 1));
    const scalarCurrentRead = vi.fn(async () => {
      throw new Error('scalar geometry repository must not run');
    });
    const scalarCoverageRead = vi.fn(async () => {
      throw new Error('scalar geometry repository must not run');
    });
    const preparedCurrentRead = vi.fn(async (venueId: string) => ({
      status: 'ready' as const,
      geometryInputHash: geometryHashForVenue(venueId),
    }));
    const preparedCoverageRead = vi.fn(async (venueId: string) => ({
      venueId,
      stockholmDate: '2026-07-18',
      geometryInputHash: geometryHashForVenue(venueId),
      status: 'ready' as const,
      series: [
        { minutes: 720, sunExposurePercent: 82 },
        { minutes: 735, sunExposurePercent: 78 },
      ],
    }));
    const preparedWeatherRead = vi.fn(async () => ({
      status: 'ready' as const,
      bucket: 'current',
      weatherUpdatedAt: '2026-07-18T10:00:00.000Z',
      slices: [
        clearSnapshotSlice(720),
        clearSnapshotSlice(735),
      ],
    }));
    const prepareRepositories = vi.fn(async () => ({
      sunGeometryRepository: {
        readCurrentGeometryInput: preparedCurrentRead,
        readCurrentCoverageForVenueDay: preparedCoverageRead,
      },
      weatherSnapshotRepository: {
        readSnapshotForVenueDay: preparedWeatherRead,
      },
    }));

    route.__setVenueStoreForTests?.(async () => venues);
    // The injected scalar repository turns on the persisted branch in tests;
    // the prepared request-scoped repositories must override it completely.
    route.__setSunGeometryRepositoryForTests?.({
      readCurrentGeometryInput: scalarCurrentRead,
      readCurrentCoverageForVenueDay: scalarCoverageRead,
    });
    route.__setPersistedSunRepositoryPreparerForTests?.(prepareRepositories);

    const response = await route.GET(venuesRequest('&radiusKm=3'));
    expect(response.status).toBe(200);
    expect(prepareRepositories).toHaveBeenCalledTimes(1);
    expect(prepareRepositories).toHaveBeenCalledWith(venues, '2026-07-18');
    expect(scalarCurrentRead).not.toHaveBeenCalled();
    expect(scalarCoverageRead).not.toHaveBeenCalled();
    expect(preparedCurrentRead).toHaveBeenCalledTimes(42);
    expect(preparedCoverageRead).toHaveBeenCalledTimes(42);
    expect(preparedWeatherRead).toHaveBeenCalledTimes(42);
    const body = (await response.json()) as { venues: unknown[] };
    expect(body.venues).toHaveLength(42);
  });

  test('detail coverage-missing response does not leak venue/date/hash diagnostics', () => {
    const source = appSource('app/api/venues/[slug]/route.ts');

    expect(source).toContain('SUN_GEOMETRY_COVERAGE_MISSING');
    expect(source).toContain('Missing current geometry coverage for the requested venue/date/hash.');
    expect(source).not.toContain('detail: error.detail');
  });

  test('geometry input construction reads canonical shadow-caster hash records', () => {
    const source = appSource('lib/services/sun-geometry-repository.ts');

    expect(source).toContain("rpc('get_shadow_caster_hash_records_v2'");
    expect(source).not.toContain("rpc('get_buildings_near_point'");
    expect(source).toContain('footprint_ewkb_hex');
  });

  test('missing exact current geometry hash returns typed 503 instead of omitting the series or recomputing', async () => {
    expect(route.__setSunGeometryRepositoryForTests).toBeTypeOf('function');

    route.__setSunGeometryRepositoryForTests?.({
      readCurrentCoverageForVenueDay: async () => null,
      computeCurrentGeometryInputHash: async () =>
        'g1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
    route.__setWeatherSnapshotRepositoryForTests?.({
      readSnapshotForVenueDay: async () => ({ status: 'ready', slices: [] }),
    });

    const response = await route.GET(venuesRequest());
    expect(response.status).toBe(503);
    const body = (await response.json()) as { code?: string; detail?: string };
    expect(body.code).toBe('SUN_GEOMETRY_COVERAGE_MISSING');
    expect(body.detail).toMatch(/current geometry coverage/i);
  });

  test('old-hash or wrong-day coverage cannot satisfy a public list read', async () => {

    route.__setSunGeometryRepositoryForTests?.({
      computeCurrentGeometryInputHash: async () =>
        'g1:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      readCurrentCoverageForVenueDay: async () => ({
        stockholmDate: '2026-07-17',
        geometryInputHash: 'g1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        status: 'ready',
        series: [{ minutes: 720, sunExposurePercent: 80 }],
      }),
    });

    const response = await route.GET(venuesRequest());
    expect(response.status).toBe(503);
    const body = (await response.json()) as { code?: string };
    expect(body.code).toBe('SUN_GEOMETRY_COVERAGE_MISSING');
  });

  test('public weatherBucket query params cannot override the server-owned current snapshot', async () => {
    const persistedSeries = [
      { minutes: 720, sunExposurePercent: 92 },
      { minutes: 735, sunExposurePercent: 92 },
    ];

    route.__setSunGeometryRepositoryForTests?.({
      computeCurrentGeometryInputHash: async () =>
        'g1:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      readCurrentCoverageForVenueDay: async () => ({
        stockholmDate: '2026-07-18',
        geometryInputHash: 'g1:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        status: 'ready',
        series: persistedSeries,
      }),
    });

    const bucketReads: Array<string | undefined> = [];
    route.__setWeatherSnapshotRepositoryForTests?.({
      readSnapshotForVenueDay: async (_venue: unknown, bucket: string | undefined) => {
        bucketReads.push(bucket);
        return {
        status: 'ready',
        bucket: 'current',
        weatherUpdatedAt: '2026-07-18T10:00:00.000Z',
        slices: [{
          minutes: 720, validAt: '2026-07-18T10:00:00.000Z',
          cloudCover: 95, cloudCoverLow: 95, cloudCoverMedium: 0,
          cloudCoverHigh: 0, fogAreaFraction: 0, precipitationAmount: 0, symbolCode: 'cloudy',
          isRaining: false,
        }],
        };
      },
    });

    const sunny = await route.GET(venuesRequest('&weatherBucket=clear'));
    const overcast = await route.GET(venuesRequest('&weatherBucket=overcast'));
    const sunnyBody = (await sunny.json()) as { venues: Array<{ directSunState?: string; sunDaySeries: unknown[] }> };
    const overcastBody = (await overcast.json()) as { venues: Array<{ directSunState?: string; sunDaySeries: unknown[] }> };

    expect(sunnyBody.venues[0]?.sunDaySeries).toHaveLength(persistedSeries.length);
    expect(overcastBody.venues[0]?.sunDaySeries).toHaveLength(persistedSeries.length);
    expect(bucketReads.length).toBeGreaterThan(1);
    expect(bucketReads.every((bucket) => bucket === undefined)).toBe(true);
    expect(overcastBody.venues[0]?.sunDaySeries).toEqual(sunnyBody.venues[0]?.sunDaySeries);
    expect(overcastBody.venues[0]?.sunDaySeries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ minutes: 720, sunExposurePercent: 92, currentSunStatus: 'CloudObscured' }),
      ]),
    );
    expect(overcastBody.venues[0]?.directSunState).toBe('blocked');
  });

  test('malformed persisted weather entries cannot 500 the public list route', async () => {
    const venue = routeScaleVenue(1);
    let allMalformed = false;
    route.__setVenueStoreForTests?.(async () => [venue]);
    route.__setSunGeometryRepositoryForTests?.({
      computeCurrentGeometryInputHash: async () => geometryHashForVenue(venue.id),
      readCurrentCoverageForVenueDay: async () => ({
        venueId: venue.id,
        stockholmDate: '2026-07-18',
        geometryInputHash: geometryHashForVenue(venue.id),
        status: 'ready',
        series: [{ minutes: 720, sunExposurePercent: 95 }],
      }),
    });
    route.__setWeatherSnapshotRepositoryForTests?.({
      readSnapshotForVenueDay: async () => ({
        status: 'ready',
        weatherUpdatedAt: '2026-07-18T09:55:00.000Z',
        slices: allMalformed
          ? [null, 'broken', false]
          : [null, 'broken', {
              minutes: 720,
              validAt: '2026-07-18T10:00:00.000Z',
              cloudCover: 100,
              cloudCoverLow: 0,
              cloudCoverMedium: 100,
              cloudCoverHigh: 0,
              fogAreaFraction: 0,
              precipitationAmount: 0,
              symbolCode: 'cloudy',
            }],
      }),
    });

    const mixedResponse = await route.GET(venuesRequest());
    expect(mixedResponse.status).toBe(200);
    const mixedBody = (await mixedResponse.json()) as {
      venues: Array<{ directSunState?: string; weatherGateState: string }>;
    };
    expect(mixedBody.venues[0]).toMatchObject({
      directSunState: 'blocked',
      weatherGateState: 'gated',
    });

    allMalformed = true;
    const malformedResponse = await route.GET(venuesRequest('&radiusKm=3'));
    expect(malformedResponse.status).toBe(200);
    const malformedBody = (await malformedResponse.json()) as {
      venues: Array<{ directSunState?: string; weatherGateState: string; confidence: number }>;
      meta: { sunDataSource: string };
    };
    expect(malformedBody.venues[0]).toMatchObject({
      directSunState: 'unknown',
      weatherGateState: 'unknown',
      confidence: 40,
    });
    expect(malformedBody.meta.sunDataSource).toBe('geometry-only');
  });

  test('malformed persisted weather entries cannot 500 the public detail route', async () => {
    let allMalformed = false;
    vi.stubEnv('SUNNYSEAT_SUN_ENGINE', 'real');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role');
    route.__setSunGeometryRepositoryForTests?.({
      computeCurrentGeometryInputHash: async () => geometryHashForVenue('1'),
      readCurrentCoverageForVenueDay: async () => ({
        venueId: '1',
        stockholmDate: '2026-07-18',
        geometryInputHash: geometryHashForVenue('1'),
        status: 'ready',
        series: [{ minutes: 720, sunExposurePercent: 95 }],
      }),
    });
    route.__setWeatherSnapshotRepositoryForTests?.({
      readSnapshotForVenueDay: async () => ({
        status: 'ready',
        weatherUpdatedAt: '2026-07-18T09:55:00.000Z',
        slices: allMalformed
          ? [null, 'broken', false]
          : [null, 'broken', {
              minutes: 720,
              validAt: '2026-07-18T10:00:00.000Z',
              cloudCover: 100,
              cloudCoverLow: 0,
              cloudCoverMedium: 100,
              cloudCoverHigh: 0,
              fogAreaFraction: 0,
              precipitationAmount: 0,
              symbolCode: 'cloudy',
            }],
      }),
    });

    const request = () => new NextRequest(
      'http://localhost/api/venues/test-venue-sunny?date=2026-07-18&time=12:00',
    );
    const context = { params: Promise.resolve({ slug: 'test-venue-sunny' }) };
    const mixedResponse = await venueDetailRoute.GET(request(), context);
    expect(mixedResponse.status).toBe(200);
    const mixedBody = (await mixedResponse.json()) as {
      venue: { directSunState?: string; weatherGateState: string };
    };
    expect(mixedBody.venue).toMatchObject({
      directSunState: 'blocked',
      weatherGateState: 'gated',
    });

    allMalformed = true;
    const malformedResponse = await venueDetailRoute.GET(request(), context);
    expect(malformedResponse.status).toBe(200);
    const malformedBody = (await malformedResponse.json()) as {
      venue: { directSunState?: string; weatherGateState: string; confidence: number };
      meta: { sunDataSource: string };
    };
    expect(malformedBody.venue).toMatchObject({
      directSunState: 'unknown',
      weatherGateState: 'unknown',
      confidence: 40,
    });
    expect(malformedBody.meta.sunDataSource).toBe('geometry-only');
  });

  test('42+ venue list requests read persisted current hashes and coverage without request-path recompute', async () => {
    const venues = Array.from({ length: 42 }, (_, index) => routeScaleVenue(index + 1));
    const expectedIds = venues.map((venue) => venue.id).sort();
    const currentHashReads: string[] = [];
    const coverageReads: string[] = [];
    const weatherReads: string[] = [];

    route.__setVenueStoreForTests?.(async () => venues);
    route.__setSunGeometryRepositoryForTests?.({
      readCurrentGeometryInput: async (venueId: string, stockholmDate: string, venue: StoredVenue) => {
        currentHashReads.push(`${venueId}:${stockholmDate}:${venue.id}`);
        return {
          status: 'ready',
          geometryInputHash: geometryHashForVenue(venueId),
        };
      },
      readCurrentCoverageForVenueDay: async (
        venueId: string,
        stockholmDate: string,
        geometryInputHash: string,
      ) => {
        expect(geometryInputHash).toBe(geometryHashForVenue(venueId));
        coverageReads.push(`${venueId}:${stockholmDate}:${geometryInputHash}`);
        return {
          stockholmDate,
          geometryInputHash,
          status: 'ready',
          series: [
            { minutes: 720, sunExposurePercent: 82 },
            { minutes: 735, sunExposurePercent: 78 },
          ],
        };
      },
    });
    route.__setWeatherSnapshotRepositoryForTests?.({
      readSnapshotForVenueDay: async (venue: StoredVenue, bucket: string | undefined, stockholmDate: string) => {
        weatherReads.push(`${venue.id}:${bucket ?? 'current'}:${stockholmDate}`);
        return {
          status: 'ready',
          bucket: bucket ?? 'current',
          weatherUpdatedAt: '2026-07-18T10:00:00.000Z',
          slices: [
            clearSnapshotSlice(720),
            clearSnapshotSlice(735),
          ],
        };
      },
    });

    const response = await route.GET(venuesRequest('&radiusKm=3'));
    const body = (await response.json()) as {
      venues: Array<{ id: string; sunDaySeries?: unknown[] }>;
      meta: { count: number; sunDataSource?: string; weatherUpdatedAt?: string };
      totalCount: number;
    };

    expect(response.status).toBe(200);
    expect(body.meta.count).toBe(42);
    expect(body.totalCount).toBe(42);
    expect(body.venues).toHaveLength(42);
    expect(body.venues.map((venue) => venue.id).sort()).toEqual(expectedIds);
    expect(body.venues.every((venue) => venue.sunDaySeries?.length === 2)).toBe(true);
    expect(currentHashReads.map((entry) => entry.split(':')[0]).sort()).toEqual(expectedIds);
    expect(coverageReads.map((entry) => entry.split(':')[0]).sort()).toEqual(expectedIds);
    expect(weatherReads.map((entry) => entry.split(':')[0]).sort()).toEqual(expectedIds);
    expect(body.meta).toMatchObject({
      sunDataSource: 'weather',
      weatherUpdatedAt: '2026-07-18T10:00:00.000Z',
    });
  });

  test('coverage gaps fail closed for the whole response and are surfaced in freshness headers', async () => {

    route.__setSunGeometryRepositoryForTests?.({
      computeCurrentGeometryInputHash: async () =>
        'g1:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
      readCurrentCoverageForVenueDay: async (_venueId: string) =>
        _venueId === 'covered'
          ? {
              stockholmDate: '2026-07-18',
              geometryInputHash: 'g1:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
              status: 'ready',
              series: [{ minutes: 720, sunExposurePercent: 80 }],
            }
          : null,
    });

    const response = await route.GET(venuesRequest());
    expect(response.status).toBe(503);
    expect(response.headers.get('X-Sun-Geometry-Coverage')).toBe('missing');
  });
});
