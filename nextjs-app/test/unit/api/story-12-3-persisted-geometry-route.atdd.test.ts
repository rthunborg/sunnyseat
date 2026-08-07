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
  GET: (request: NextRequest) => Promise<Response>;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-18T10:00:00.000Z'));
});

afterEach(async () => {
  const route = (await import('@/app/api/venues/route')) as RouteTestHook;
  route.__setVenueStoreForTests?.(undefined);
  route.__setSunGeometryRepositoryForTests?.(undefined);
  route.__setWeatherSnapshotRepositoryForTests?.(undefined);
  vi.useRealTimers();
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
  });

  test('public persisted reads use the published current hash instead of recomputing live geometry input', () => {
    const source = appSource('lib/services/sun-geometry-repository.ts');
    const defaultRepository = source.slice(source.indexOf('const defaultSunGeometryRepository'));

    expect(defaultRepository).toContain('readCurrentGeometryInput');
    expect(defaultRepository).toContain("select('status, current_geometry_input_hash')");
    expect(defaultRepository).not.toContain('buildGeometryInputPayloadForVenue(venue, stockholmDate)');
    expect(defaultRepository).not.toContain('computeGeometryInputHash(input)');
  });

  test('detail coverage-missing response does not leak venue/date/hash diagnostics', () => {
    const source = appSource('app/api/venues/[slug]/route.ts');

    expect(source).toContain('SUN_GEOMETRY_COVERAGE_MISSING');
    expect(source).toContain('Missing current geometry coverage for the requested venue/date/hash.');
    expect(source).not.toContain('detail: error.detail');
  });

  test('geometry input construction reads canonical shadow-caster hash records', () => {
    const source = appSource('lib/services/sun-geometry-repository.ts');

    expect(source).toContain("rpc('get_shadow_caster_hash_records'");
    expect(source).not.toContain("rpc('get_buildings_near_point'");
    expect(source).toContain('footprint_ewkb_hex');
  });

  test('missing exact current geometry hash returns typed 503 instead of omitting the series or recomputing', async () => {
    const routePath = '@/app/api/venues/route';
    const route = (await import(routePath)) as RouteTestHook;
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
    const routePath = '@/app/api/venues/route';
    const route = (await import(routePath)) as RouteTestHook;

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

  test('weather-bucket rollover re-gates O(steps) from the same persisted geometry values', async () => {
    const routePath = '@/app/api/venues/route';
    const route = (await import(routePath)) as RouteTestHook;
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

    route.__setWeatherSnapshotRepositoryForTests?.({
      readSnapshotForVenueDay: async (_venue: unknown, bucket: string) => ({
        status: 'ready',
        bucket,
        weatherUpdatedAt: '2026-07-18T10:00:00.000Z',
        slices: [{ minutes: 720, cloudCover: bucket === 'overcast' ? 95 : 10, isRaining: false }],
      }),
    });

    const sunny = await route.GET(venuesRequest('&weatherBucket=clear'));
    const overcast = await route.GET(venuesRequest('&weatherBucket=overcast'));
    const sunnyBody = (await sunny.json()) as { venues: Array<{ sunDaySeries: unknown[] }> };
    const overcastBody = (await overcast.json()) as { venues: Array<{ sunDaySeries: unknown[] }> };

    expect(sunnyBody.venues[0]?.sunDaySeries).toHaveLength(persistedSeries.length);
    expect(overcastBody.venues[0]?.sunDaySeries).toHaveLength(persistedSeries.length);
    expect(overcastBody.venues[0]?.sunDaySeries).not.toEqual(sunnyBody.venues[0]?.sunDaySeries);
    expect(overcastBody.venues[0]?.sunDaySeries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ minutes: 720, sunExposurePercent: 92, currentSunStatus: 'CloudObscured' }),
      ]),
    );
  });

  test('42+ venue list requests read persisted current hashes and coverage without request-path recompute', async () => {
    const routePath = '@/app/api/venues/route';
    const route = (await import(routePath)) as RouteTestHook;
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
            { minutes: 720, cloudCover: 10, isRaining: false },
            { minutes: 735, cloudCover: 10, isRaining: false },
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
    const routePath = '@/app/api/venues/route';
    const route = (await import(routePath)) as RouteTestHook;

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
