import { describe, expect, it, vi } from 'vitest';
import { buildVenueDiagnostics } from '@/lib/services/venue-diagnostics';
import { buildPersistedSunOutcome } from '@/lib/services/sun-geometry-repository';
import type { PersistedSunRouteRepositories } from '@/lib/services/sun-geometry-repository';
import type { StoredVenue } from '@/lib/services/venue-store';
import type { WeatherSnapshotSlice } from '@/lib/services/weather-snapshots';

const requestedAt = new Date('2026-09-09T10:00:00.000Z');
const generatedAt = new Date('2026-09-09T10:05:00.000Z');

function venue(id = 'venue-1'): StoredVenue {
  return {
    id,
    venueId: id,
    slug: `slug-${id}`,
    venueSlug: `slug-${id}`,
    venueName: `Venue ${id}`,
    neighborhood: 'Centrum',
    location: { lat: 57.7, lng: 11.97 },
    engineLocation: { lat: 57.701, lng: 11.971 },
    seatingArea: {
      type: 'Polygon',
      coordinates: [[
        [11.9709, 57.7009], [11.9711, 57.7009],
        [11.9711, 57.7011], [11.9709, 57.7009],
      ]],
    },
    currentSunStatus: 'NoSun',
    weatherGateState: 'unknown',
    directSunState: 'unknown',
    isPartner: false,
    confidence: 80,
    distanceMeters: 0,
    sunExposurePercent: 0,
    tags: [],
  };
}

const clearSlice: WeatherSnapshotSlice = {
  validAt: requestedAt.toISOString(),
  cloudCover: 10,
  cloudCoverLow: 5,
  cloudCoverMedium: 2,
  cloudCoverHigh: 4,
  fogAreaFraction: 0,
  precipitationAmount: 0,
  symbolCode: 'clearsky_day',
  isRaining: false,
};

function repositories(
  exposureByVenue: Record<string, number>,
  weatherByVenue: Record<string, WeatherSnapshotSlice[] | null>,
): PersistedSunRouteRepositories {
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
          sunExposurePercent: exposureByVenue[venueId] ?? 95,
        })),
      })),
    },
    weatherSnapshotRepository: {
      readSnapshotForVenueDay: vi.fn(async (storedVenue) => {
        const slices = weatherByVenue[storedVenue.id];
        if (slices === null || slices === undefined) return null;
        return {
          status: 'ready' as const,
          bucket: '57.7010,11.9710',
          weatherUpdatedAt: '2026-09-09T09:55:00.000Z',
          expiresAt: '2026-09-09T11:55:00.000Z',
          slices,
        };
      }),
    },
  };
}

describe('venue diagnostics service', () => {
  it('reports all venues and agrees with the public persisted outcome', async () => {
    const venues = [venue('venue-1'), venue('venue-2')];
    const repos = repositories(
      { 'venue-1': 95, 'venue-2': 20 },
      { 'venue-1': [clearSlice], 'venue-2': [clearSlice] },
    );
    const response = await buildVenueDiagnostics({
      venues,
      requestedAt,
      generatedAt,
      mode: 'selected',
      offset: 0,
      limit: 100,
      totalMatched: 2,
      repositories: repos,
    });

    expect(response.contractVersion).toBe('venue-diagnostics.v1');
    expect(response.pagination).toMatchObject({ returned: 2, totalMatched: 2, complete: true });
    expect(response.failures).toEqual([]);
    expect(response.venues.map((entry) => entry.venue.id)).toEqual(['venue-1', 'venue-2']);
    expect(response.venues[0]?.geometry.canonicalInputs).toMatchObject({
      engineCoordinate: { lat: 57.70096666666666, lng: 11.971033333333333 },
      displayPinCoordinate: { lat: 57.7, lng: 11.97 },
      fullPersistedInputPayload: { availability: 'unavailable' },
    });

    for (const storedVenue of venues) {
      const publicOutcome = await buildPersistedSunOutcome(
        storedVenue,
        requestedAt,
        generatedAt,
        { repositories: repos },
      );
      const diagnostic = response.venues.find((entry) => entry.venue.id === storedVenue.id);
      expect(diagnostic?.finalResult).toMatchObject({
        directSunState: publicOutcome.venue.directSunState,
        reasons: publicOutcome.venue.directSunReasons,
        sunExposurePercent: publicOutcome.venue.sunExposurePercent,
        publicStatus: publicOutcome.venue.currentSunStatus,
        weatherGateState: publicOutcome.venue.weatherGateState,
        skyCondition: publicOutcome.venue.skyCondition,
      });
    }
  });

  it.each([
    ['cloud', { ...clearSlice, cloudCover: 100, cloudCoverMedium: 100, symbolCode: 'cloudy' }, 'blocked', 'cloud-obstruction'],
    ['precipitation', { ...clearSlice, precipitationAmount: 0.2 }, 'blocked', 'precipitation'],
    ['fog', { ...clearSlice, fogAreaFraction: 80 }, 'blocked', 'fog'],
    ['incomplete', { ...clearSlice, cloudCoverLow: undefined }, 'unknown', 'weather-incomplete'],
    ['contradictory', { ...clearSlice, cloudCover: 40, cloudCoverLow: 10, cloudCoverMedium: 10 }, 'unknown', 'contradictory-weather'],
  ])('explains %s weather using the canonical decision trace', async (_name, slice, state, reason) => {
    const storedVenue = venue();
    const response = await buildVenueDiagnostics({
      venues: [storedVenue],
      requestedAt,
      generatedAt,
      mode: 'selected',
      offset: 0,
      limit: 100,
      totalMatched: 1,
      repositories: repositories({ 'venue-1': 95 }, { 'venue-1': [slice] }),
    });
    expect(response.venues[0]?.finalResult).toMatchObject({
      directSunState: state,
      reasons: [reason],
    });
    expect(response.venues[0]?.decision.decisiveRuleIds).toHaveLength(1);
  });

  it('reports missing and unmatched weather without turning it clear', async () => {
    const storedVenue = venue();
    const unmatched = { ...clearSlice, validAt: '2026-09-09T11:31:00.000Z' };
    const response = await buildVenueDiagnostics({
      venues: [storedVenue],
      requestedAt,
      generatedAt,
      mode: 'selected',
      offset: 0,
      limit:100,
      totalMatched: 1,
      repositories: repositories({ 'venue-1': 95 }, { 'venue-1': [unmatched] }),
    });
    expect(response.venues[0]?.finalResult.directSunState).toBe('unknown');
    expect(response.venues[0]?.weather.matching).toMatchObject({
      matched: false,
      rejected: true,
      matchingLimitMinutes: 90,
      signedDifferenceMinutes: { availability: 'available', value: 91, unit: 'min' },
    });
    expect(response.venues[0]?.dataQuality.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'matching', code: 'outside-matching-limit' }),
    ]));
  });

  it('reports expired and malformed saved evidence as rejected and unavailable', async () => {
    const storedVenue = venue();
    const repos = repositories({ 'venue-1': 95 }, { 'venue-1': [clearSlice] });
    repos.weatherSnapshotRepository.readSnapshotForVenueDay = vi.fn(async () => ({
      status: 'expired' as const,
      weatherUpdatedAt: '2026-09-09T07:00:00.000Z',
      expiresAt: '2026-09-09T09:00:00.000Z',
      slices: [clearSlice],
      normalizationIssues: [{
        index: 1,
        code: 'malformed-boolean-flag' as const,
        fields: ['weatherUnknown'],
      }],
    }));
    const response = await buildVenueDiagnostics({
      venues: [storedVenue],
      requestedAt,
      generatedAt,
      mode: 'selected',
      offset: 0,
      limit: 100,
      totalMatched: 1,
      repositories: repos,
    });
    expect(response.venues[0]?.finalResult).toMatchObject({
      directSunState: 'unknown',
      reasons: ['weather-unavailable'],
      publicVerdict: 'grey',
    });
    expect(response.venues[0]?.weather).toMatchObject({
      snapshot: { status: 'expired', ttlMinutes: 120 },
      matching: { rejected: true },
      selectedSlice: {
        totalCloudCoverPercent: { availability: 'available', value: 10, unit: '%' },
        weightedCloudObstructionPercent: { availability: 'unavailable' },
      },
    });
    expect(response.venues[0]?.dataQuality.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'snapshot-expired' }),
      expect.objectContaining({ code: 'malformed-boolean-flag' }),
      expect.objectContaining({ source: 'matching', code: 'snapshot-expired' }),
    ]));
  });

  it('keeps per-venue geometry failures explicit instead of omitting them', async () => {
    const venues = [venue('venue-1'), venue('venue-2')];
    const repos = repositories(
      { 'venue-1': 95, 'venue-2': 95 },
      { 'venue-1': [clearSlice], 'venue-2': [clearSlice] },
    );
    const baseRead = repos.sunGeometryRepository.readCurrentCoverageForVenueDay;
    repos.sunGeometryRepository.readCurrentCoverageForVenueDay = vi.fn(
      async (venueId, date, hash, storedVenue) =>
        venueId === 'venue-2' ? null : baseRead(venueId, date, hash, storedVenue),
    );
    const response = await buildVenueDiagnostics({
      venues,
      requestedAt,
      generatedAt,
      mode: 'selected',
      offset: 0,
      limit: 100,
      totalMatched: 2,
      repositories: repos,
    });
    expect(response.venues).toHaveLength(1);
    expect(response.failures).toEqual([
      {
        venue: { id: 'venue-2', slug: 'slug-venue-2', name: 'Venue venue-2' },
        error: { code: 'SUN_GEOMETRY_COVERAGE_MISSING', detail: 'missing' },
      },
    ]);
    expect(response.pagination.returned).toBe(2);
  });
});
