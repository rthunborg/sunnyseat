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
import { describe, expect, test } from 'vitest';
import { NextRequest } from 'next/server';

function appSource(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const DEFAULT_VENUES_QUERY = '?lat=57.7089&lng=11.9746&date=2026-07-18&time=12:00';

function venuesRequest(query = DEFAULT_VENUES_QUERY): NextRequest {
  const normalizedQuery = query.startsWith('?') ? query : `${DEFAULT_VENUES_QUERY}${query}`;
  return new NextRequest(`http://localhost/api/venues${normalizedQuery}`);
}

type RouteTestHook = {
  __setSunGeometryRepositoryForTests?: (repo: unknown) => void;
  __setWeatherSnapshotRepositoryForTests?: (repo: unknown) => void;
  GET: (request: NextRequest) => Promise<Response>;
};

describe('Story 12.3 AC1/AC2 - /api/venues uses persisted geometry, not request-path projection', () => {
  test.skip('source contract removes 61-step shadow projection and live weather fan-out from the list route', () => {
    const source = appSource('app/api/venues/route.ts');

    expect(source).toContain('SUN_GEOMETRY_COVERAGE_MISSING');
    expect(source).toMatch(/persistedSunGeometry|sunGeometryRepository|readPersistedGeometry/i);
    expect(source).toMatch(/weatherSnapshot|gatePersistedGeometry/i);
    expect(source).not.toContain('computeVenueDaySeries');
    expect(source).not.toContain('applyRealSunEngine');
    expect(source).not.toContain("import('@/lib/weather/met-no-service')");
    expect(source).not.toContain("import('@/lib/weather/nowcast-service')");
  });

  test.skip('missing exact current geometry hash returns typed 503 instead of omitting the series or recomputing', async () => {
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

  test.skip('old-hash or wrong-day coverage cannot satisfy a public list read', async () => {
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

  test.skip('weather-bucket rollover re-gates O(steps) from the same persisted geometry values', async () => {
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
        bucket,
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

  test.skip('coverage gaps fail closed for the whole response and are surfaced in freshness headers', async () => {
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
