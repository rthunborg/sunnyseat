import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  GET,
  __setVenueDiagnosticsRouteDependenciesForTests,
} from '@/app/api/owner/venue-diagnostics/route';
import type { PersistedSunRouteRepositories } from '@/lib/services/sun-geometry-repository';
import type { StoredVenue } from '@/lib/services/venue-store';
import {
  authorizeVenueDiagnosticsOwner,
  VENUE_DIAGNOSTICS_TOKEN_ENV,
} from '@/lib/services/venue-diagnostics-auth';

const now = new Date('2026-09-09T10:05:00.000Z');

function venue(id: string): StoredVenue {
  return {
    id,
    venueId: id,
    slug: `slug-${id}`,
    venueSlug: `slug-${id}`,
    venueName: `Venue ${id}`,
    neighborhood: 'Centrum',
    location: { lat: 57.7, lng: 11.97 },
    engineLocation: { lat: 57.7, lng: 11.97 },
    currentSunStatus: 'NoSun',
    weatherGateState: 'unknown',
    isPartner: false,
    confidence: 80,
    distanceMeters: 0,
    sunExposurePercent: 0,
    tags: [],
  };
}

function repositories(): PersistedSunRouteRepositories {
  return {
    sunGeometryRepository: {
      readCurrentGeometryInput: vi.fn(async (venueId) => ({
        status: 'ready' as const,
        geometryInputHash: `g1:${venueId.padEnd(64, '0').slice(0, 64)}`,
      })),
      readCurrentCoverageForVenueDay: vi.fn(async (venueId, stockholmDate, geometryInputHash) => ({
        venueId,
        stockholmDate,
        geometryInputHash,
        status: 'ready' as const,
        series: Array.from({ length: 61 }, (_, index) => ({
          minutes: 360 + index * 15,
          sunExposurePercent: 95,
        })),
      })),
    },
    weatherSnapshotRepository: {
      readSnapshotForVenueDay: vi.fn(async () => ({
        status: 'ready' as const,
        weatherUpdatedAt: '2026-09-09T09:55:00.000Z',
        expiresAt: '2026-09-09T11:55:00.000Z',
        slices: [{
          validAt: '2026-09-09T10:00:00.000Z',
          cloudCover: 10,
          cloudCoverLow: 5,
          cloudCoverMedium: 2,
          cloudCoverHigh: 4,
          fogAreaFraction: 0,
          precipitationAmount: 0,
          symbolCode: 'clearsky_day',
          isRaining: false,
        }],
      })),
    },
  };
}

afterEach(() => {
  __setVenueDiagnosticsRouteDependenciesForTests();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('GET /api/owner/venue-diagnostics', () => {
  it('fails closed before reads when the owner token is not safely configured', async () => {
    vi.stubEnv(VENUE_DIAGNOSTICS_TOKEN_ENV, '');
    const venueLoader = vi.fn(async () => [venue('1')]);
    __setVenueDiagnosticsRouteDependenciesForTests({
      authorizer: authorizeVenueDiagnosticsOwner,
      venueLoader,
    });
    const response = await GET(new NextRequest('http://localhost/api/owner/venue-diagnostics'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: 'OWNER_AUTH_NOT_CONFIGURED', status: 503 });
    expect(venueLoader).not.toHaveBeenCalled();
  });

  it('rejects a well-formed but incorrect owner token before reads', async () => {
    vi.stubEnv(
      VENUE_DIAGNOSTICS_TOKEN_ENV,
      'correct_owner_diagnostics_token_abcdefghijklmnopqrstuvwxyz0123456789',
    );
    const venueLoader = vi.fn(async () => [venue('1')]);
    __setVenueDiagnosticsRouteDependenciesForTests({
      authorizer: authorizeVenueDiagnosticsOwner,
      venueLoader,
    });
    const response = await GET(new NextRequest(
      'http://localhost/api/owner/venue-diagnostics',
      { headers: { authorization: 'Bearer wrong_owner_token_abcdefghijklmnopqrstuvwxyz0123456789' } },
    ));
    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toContain('Bearer');
    expect(venueLoader).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requests before reading venues', async () => {
    const venueLoader = vi.fn(async () => [venue('1')]);
    __setVenueDiagnosticsRouteDependenciesForTests({
      authorizer: async () => ({ status: 'unauthorized' }),
      venueLoader,
    });
    const response = await GET(new NextRequest('http://localhost/api/owner/venue-diagnostics'));
    expect(response.status).toBe(401);
    expect(venueLoader).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('rejects an authenticated non-owner before reading venues', async () => {
    const venueLoader = vi.fn(async () => [venue('1')]);
    __setVenueDiagnosticsRouteDependenciesForTests({
      authorizer: async () => ({ status: 'forbidden', subjectId: 'user-1' }),
      venueLoader,
    });
    const response = await GET(new NextRequest('http://localhost/api/owner/venue-diagnostics'));
    expect(response.status).toBe(403);
    expect(venueLoader).not.toHaveBeenCalled();
  });

  it('returns all venues from one bounded repository preparation', async () => {
    const providerFetch = vi.fn();
    vi.stubGlobal('fetch', providerFetch);
    const venueLoader = vi.fn(async () => [venue('1'), venue('2')]);
    const repositoryPreparer = vi.fn(async (_venues: readonly StoredVenue[]) => repositories());
    __setVenueDiagnosticsRouteDependenciesForTests({
      authorizer: async () => ({ status: 'authorized', ownerId: 'owner' }),
      venueLoader,
      repositoryPreparer,
      clock: () => now,
    });
    const response = await GET(new NextRequest('http://localhost/api/owner/venue-diagnostics'));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.pagination).toMatchObject({ totalMatched: 2, returned: 2, complete: true });
    expect(body.venues.map((entry: { venue: { id: string } }) => entry.venue.id)).toEqual(['1', '2']);
    expect(repositoryPreparer).toHaveBeenCalledTimes(1);
    expect(providerFetch).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('vary')).toContain('Authorization');
  });

  it('paginates with a validated bounded limit and makes incomplete coverage explicit', async () => {
    const repositoryPreparer = vi.fn(async (_venues: readonly StoredVenue[]) => repositories());
    __setVenueDiagnosticsRouteDependenciesForTests({
      authorizer: async () => ({ status: 'authorized', ownerId: 'owner' }),
      venueLoader: async () => [venue('1'), venue('2'), venue('3')],
      repositoryPreparer,
      clock: () => now,
    });
    const response = await GET(new NextRequest(
      'http://localhost/api/owner/venue-diagnostics?offset=1&limit=1',
    ));
    const body = await response.json();
    expect(body.pagination).toMatchObject({
      offset: 1,
      limit: 1,
      totalMatched: 3,
      returned: 1,
      complete: false,
    });
    expect(body.venues[0].venue.id).toBe('2');
    expect(repositoryPreparer.mock.calls[0]?.[0]).toHaveLength(1);
  });

  it('filters by id or slug and resolves selected Stockholm time', async () => {
    __setVenueDiagnosticsRouteDependenciesForTests({
      authorizer: async () => ({ status: 'authorized', ownerId: 'owner' }),
      venueLoader: async () => [venue('1'), venue('2')],
      repositoryPreparer: async () => repositories(),
      clock: () => now,
    });
    const response = await GET(new NextRequest(
      'http://localhost/api/owner/venue-diagnostics?venue=slug-2&date=2026-09-09&time=12%3A00',
    ));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.request).toMatchObject({
      mode: 'selected',
      requestedAtUtc: '2026-09-09T10:00:00.000Z',
      stockholmLocalTime: '12:00',
    });
    expect(body.venues).toHaveLength(1);
    expect(body.venues[0].venue.id).toBe('2');
  });

  it.each([
    ['duplicate date', '?date=2026-09-09&date=2026-09-10&time=12%3A00'],
    ['unbounded limit', '?limit=101'],
    ['unknown input', '?debug=true'],
  ])('rejects %s without database reads', async (_name, query) => {
    const venueLoader = vi.fn(async () => [venue('1')]);
    __setVenueDiagnosticsRouteDependenciesForTests({
      authorizer: async () => ({ status: 'authorized', ownerId: 'owner' }),
      venueLoader,
      clock: () => now,
    });
    const response = await GET(new NextRequest(`http://localhost/api/owner/venue-diagnostics${query}`));
    expect(response.status).toBe(400);
    expect(venueLoader).not.toHaveBeenCalled();
  });

  it('keeps the production request path snapshot-only and read-only', () => {
    const source = [
      'app/api/owner/venue-diagnostics/route.ts',
      'lib/services/venue-diagnostics.ts',
    ].map((path) => readFileSync(join(process.cwd(), path), 'utf8')).join('\n');

    for (const forbiddenDependency of [
      'met-no-service',
      'nowcast-service',
      'computeVenueDaySeries',
      'buildGeometryInputPayloadForVenue',
      'refreshWeatherSnapshotsForVenue',
    ]) {
      expect(source).not.toContain(forbiddenDependency);
    }

    expect(source).not.toMatch(/\.(?:insert|update|delete|upsert)\s*\(/);
  });
});
