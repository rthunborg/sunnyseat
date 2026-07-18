import { describe, expect, test } from 'vitest';
import {
  buildPersistedSunOutcome,
  SunGeometryCoverageMissingError,
  type PersistedSunGeometryCoverage,
  type SunGeometryRepository,
} from '@/lib/services/sun-geometry-repository';
import type {
  WeatherSnapshotRecord,
  WeatherSnapshotRepository,
} from '@/lib/services/weather-snapshots';
import type { StoredVenue } from '@/lib/services/venue-store';

const GEOMETRY_HASH = 'g1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function makeVenue(overrides: Partial<StoredVenue> = {}): StoredVenue {
  return {
    id: 'venue-1',
    venueId: 'venue-1',
    venueName: 'Persisted Venue',
    venueSlug: 'persisted-venue',
    slug: 'persisted-venue',
    neighborhood: 'Centrum',
    location: { lat: 57.705, lng: 11.97 },
    currentSunStatus: 'Shaded',
    isPartner: false,
    confidence: 88,
    distanceMeters: 0,
    sunExposurePercent: 0,
    tags: [],
    sunWindow: { start: '11:00', end: '18:00' },
    thumbnail: { alt: 'Persisted Venue', initials: 'PV' },
    ...overrides,
  };
}

function makeGeometryRepository(
  coverage: PersistedSunGeometryCoverage | null,
  calls: Array<Record<string, unknown>>,
): SunGeometryRepository {
  return {
    async computeCurrentGeometryInputHash(venue, stockholmDate) {
      calls.push({ method: 'computeCurrentGeometryInputHash', venueId: venue.id, stockholmDate });
      return GEOMETRY_HASH;
    },
    async readCurrentCoverageForVenueDay(venueId, stockholmDate, geometryInputHash) {
      calls.push({
        method: 'readCurrentCoverageForVenueDay',
        venueId,
        stockholmDate,
        geometryInputHash,
      });
      return coverage;
    },
  };
}

function makeWeatherRepository(
  snapshot: WeatherSnapshotRecord | null,
  calls: Array<Record<string, unknown>>,
): WeatherSnapshotRepository {
  return {
    async readSnapshotForVenueDay(venue, bucket, stockholmDate) {
      calls.push({
        method: 'readSnapshotForVenueDay',
        venueId: venue.id,
        bucket,
        stockholmDate,
      });
      return snapshot;
    },
  };
}

describe('Story 12.3 automated coverage - persisted sun outcome assembly', () => {
  test('uses exact geometry hash coverage, weather bucket, nearest step, and public prediction evidence', async () => {
    const venue = makeVenue();
    const repositoryCalls: Array<Record<string, unknown>> = [];
    const coverage: PersistedSunGeometryCoverage = {
      venueId: venue.id,
      stockholmDate: '2026-07-18',
      geometryInputHash: GEOMETRY_HASH,
      status: 'ready',
      series: [
        { minutes: 720, sunExposurePercent: 91 },
        { minutes: 735, sunExposurePercent: 20 },
      ],
    };
    const snapshot: WeatherSnapshotRecord = {
      status: 'ready',
      bucket: 'current-57.7050,11.9700',
      weatherUpdatedAt: '2026-07-18T09:55:00.000Z',
      slices: [
        { minutes: 720, cloudCover: 95, isRaining: false },
        { minutes: 735, cloudCover: 10, isRaining: false },
      ],
    };

    const outcome = await buildPersistedSunOutcome(
      venue,
      new Date('2026-07-18T10:07:00.000Z'),
      new Date('2026-07-18T10:07:00.000Z'),
      {
        weatherBucket: 'current-57.7050,11.9700',
        repositories: {
          sunGeometryRepository: makeGeometryRepository(coverage, repositoryCalls),
          weatherSnapshotRepository: makeWeatherRepository(snapshot, repositoryCalls),
        },
      },
    );

    expect(repositoryCalls).toEqual([
      {
        method: 'computeCurrentGeometryInputHash',
        venueId: venue.id,
        stockholmDate: '2026-07-18',
      },
      {
        method: 'readCurrentCoverageForVenueDay',
        venueId: venue.id,
        stockholmDate: '2026-07-18',
        geometryInputHash: GEOMETRY_HASH,
      },
      {
        method: 'readSnapshotForVenueDay',
        venueId: venue.id,
        bucket: 'current-57.7050,11.9700',
        stockholmDate: '2026-07-18',
      },
    ]);
    expect(outcome.freshness).toEqual({
      sunDataSource: 'weather',
      weatherUpdatedAt: '2026-07-18T09:55:00.000Z',
    });
    expect(outcome.venue).toMatchObject({
      currentSunStatus: 'CloudObscured',
      sunExposurePercent: 91,
      skyCondition: 'overcast',
      confidence: 88,
      predictionEvidence: { geometryInputHash: GEOMETRY_HASH },
    });
    expect(outcome.daySeries).toEqual(outcome.venue.sunDaySeries);
    expect(outcome.peakTime).toBe('12:00');
  });

  test('falls back to geometry-only confidence when the weather snapshot is expired', async () => {
    const venue = makeVenue({ confidence: 73 });
    const coverage: PersistedSunGeometryCoverage = {
      venueId: venue.id,
      stockholmDate: '2026-07-18',
      geometryInputHash: GEOMETRY_HASH,
      status: 'ready',
      series: [{ minutes: 720, sunExposurePercent: 85 }],
    };

    const outcome = await buildPersistedSunOutcome(
      venue,
      new Date('2026-07-18T10:00:00.000Z'),
      new Date('2026-07-18T10:00:00.000Z'),
      {
        repositories: {
          sunGeometryRepository: makeGeometryRepository(coverage, []),
          weatherSnapshotRepository: makeWeatherRepository(
            {
              status: 'expired',
              weatherUpdatedAt: '2026-07-18T08:00:00.000Z',
              slices: [],
            },
            [],
          ),
        },
      },
    );

    expect(outcome.freshness).toEqual({ sunDataSource: 'geometry-only' });
    expect(outcome.venue).toMatchObject({
      currentSunStatus: 'Sunny',
      skyCondition: 'unavailable',
      confidence: 40,
      sunExposurePercent: 85,
    });
  });

  test.each([
    { coverage: null, reason: 'missing' },
    {
      coverage: {
        venueId: 'venue-1',
        stockholmDate: '2026-07-18',
        geometryInputHash: GEOMETRY_HASH,
        status: 'building',
        series: [{ minutes: 720, sunExposurePercent: 80 }],
      } satisfies PersistedSunGeometryCoverage,
      reason: 'building',
    },
    {
      coverage: {
        venueId: 'venue-1',
        stockholmDate: '2026-07-18',
        geometryInputHash: GEOMETRY_HASH,
        status: 'ready',
        series: [],
      } satisfies PersistedSunGeometryCoverage,
      reason: 'empty-series',
    },
  ])('throws a coverage-missing error for $reason persisted geometry', async ({ coverage, reason }) => {
    const venue = makeVenue();

    await expect(
      buildPersistedSunOutcome(
        venue,
        new Date('2026-07-18T10:00:00.000Z'),
        new Date('2026-07-18T10:00:00.000Z'),
        {
          repositories: {
            sunGeometryRepository: makeGeometryRepository(coverage, []),
            weatherSnapshotRepository: makeWeatherRepository(null, []),
          },
        },
      ),
    ).rejects.toMatchObject({
      code: 'SUN_GEOMETRY_COVERAGE_MISSING',
      detail: {
        venueId: venue.id,
        stockholmDate: '2026-07-18',
        geometryInputHash: GEOMETRY_HASH,
        reason,
      },
    } satisfies Partial<SunGeometryCoverageMissingError>);
  });
});
