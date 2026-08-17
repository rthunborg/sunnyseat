import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { StoredVenue } from '@/lib/services/venue-store';
import {
  buildPersistedSunOutcome,
  prepareSunGeometryRepositoryForVenueDays,
  SunGeometryCoverageMissingError,
} from '@/lib/services/sun-geometry-repository';
import { prepareWeatherSnapshotRepositoryForVenueDays } from '@/lib/services/weather-snapshots';
import {
  PLANNER_END_MINUTES,
  PLANNER_START_MINUTES,
  PLANNER_STEP_MINUTES,
} from '@/lib/utils/time-planner';

const supabaseMock = vi.hoisted(() => {
  const state = {
    rpcResult: { data: [] as unknown, error: null as unknown },
    weatherResult: { data: [] as unknown, error: null as unknown },
  };
  const query = {
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    then: (
      onFulfilled: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(state.weatherResult).then(onFulfilled, onRejected),
  };
  const select = vi.fn(() => query);
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn(() => Promise.resolve(state.rpcResult));
  const client = { from, rpc };
  return {
    state,
    client,
    rpc,
    from,
    select,
    eq: query.eq,
    in: query.in,
    order: query.order,
  };
});

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: () => supabaseMock.client,
}));

const STOCKHOLM_DATE = '2026-07-18';
const REQUESTED_AT = new Date('2026-07-18T10:00:00.000Z');

function makeVenue(index: number, bucketIndex = index % 3): StoredVenue {
  const id = `batch-${index.toString().padStart(2, '0')}`;
  return {
    id,
    venueId: id,
    venueName: `Batch Venue ${index}`,
    venueSlug: id,
    slug: id,
    neighborhood: 'Centrum',
    location: {
      lat: 57.7 + bucketIndex * 0.001,
      lng: 11.9 + bucketIndex * 0.001,
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

function fullPersistedSeries(): Array<{ minutes: number; sun_exposure_percent: number }> {
  const entries = Array.from(
    {
      length:
        Math.floor((PLANNER_END_MINUTES - PLANNER_START_MINUTES) / PLANNER_STEP_MINUTES) + 1,
    },
    (_, index) => ({
      minutes: PLANNER_START_MINUTES + index * PLANNER_STEP_MINUTES,
      sun_exposure_percent:
        index === 0 ? -10 : index === 60 ? 110 : 40 + (index % 40),
    }),
  );
  return entries.reverse();
}

function coordinateBucket(venue: StoredVenue): string {
  return `${venue.location.lat.toFixed(4)},${venue.location.lng.toFixed(4)}`;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-18T11:00:00.000Z'));
  supabaseMock.state.rpcResult = { data: [], error: null };
  supabaseMock.state.weatherResult = { data: [], error: null };
  supabaseMock.rpc.mockClear();
  supabaseMock.from.mockClear();
  supabaseMock.select.mockClear();
  supabaseMock.eq.mockClear();
  supabaseMock.in.mockClear();
  supabaseMock.order.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Story 12.3 persisted public-read batching', () => {
  test('skips both persisted-data calls when the public venue set is empty', async () => {
    const [geometryRepository, weatherRepository] = await Promise.all([
      prepareSunGeometryRepositoryForVenueDays([], STOCKHOLM_DATE),
      prepareWeatherSnapshotRepositoryForVenueDays([], STOCKHOLM_DATE),
    ]);

    expect(supabaseMock.rpc).not.toHaveBeenCalled();
    expect(supabaseMock.from).not.toHaveBeenCalled();
    await expect(
      geometryRepository.readCurrentGeometryInput?.('absent', STOCKHOLM_DATE, makeVenue(1)),
    ).resolves.toBeNull();
    await expect(
      weatherRepository.readSnapshotForVenueDay(makeVenue(1), undefined, STOCKHOLM_DATE),
    ).resolves.toBeNull();
  });

  test('prepares 42 venue geometry and weather repositories with one RPC and one deduplicated weather query', async () => {
    const venues = Array.from({ length: 42 }, (_, index) => makeVenue(index + 1));
    const uniqueBuckets = [...new Set(venues.map(coordinateBucket))];
    const persistedSeries = fullPersistedSeries();
    supabaseMock.state.rpcResult = {
      data: venues.map((venue) => ({
        venue_id: venue.id,
        input_status: 'ready',
        current_geometry_input_hash: geometryHashForVenue(venue.id),
        coverage_stockholm_date: STOCKHOLM_DATE,
        coverage_geometry_input_hash: geometryHashForVenue(venue.id),
        series: persistedSeries,
      })),
      error: null,
    };
    supabaseMock.state.weatherResult = {
      data: uniqueBuckets.map((bucket) => ({
        coordinate_bucket: bucket,
        bucket_key: 'current',
        stockholm_date: STOCKHOLM_DATE,
        weather_updated_at: '2026-07-18T10:55:00.000Z',
        expires_at: '2026-07-18T13:00:00.000Z',
        slices: [{ minutes: 720, cloudCover: 10, isRaining: false }],
      })),
      error: null,
    };

    const [geometryRepository, weatherRepository] = await Promise.all([
      prepareSunGeometryRepositoryForVenueDays(venues, STOCKHOLM_DATE),
      prepareWeatherSnapshotRepositoryForVenueDays(venues, STOCKHOLM_DATE),
    ]);

    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.rpc).toHaveBeenCalledWith('read_current_venue_sun_geometry_batch', {
      p_venue_ids: venues.map((venue) => venue.id),
      p_stockholm_date: STOCKHOLM_DATE,
    });
    expect(supabaseMock.from).toHaveBeenCalledTimes(1);
    expect(supabaseMock.from).toHaveBeenCalledWith('weather_bucket_snapshots');
    expect(supabaseMock.select).toHaveBeenCalledTimes(1);
    expect(supabaseMock.in).toHaveBeenCalledWith('coordinate_bucket', uniqueBuckets);
    expect(supabaseMock.eq).toHaveBeenCalledWith('stockholm_date', STOCKHOLM_DATE);
    expect(supabaseMock.eq).toHaveBeenCalledWith('bucket_key', 'current');

    for (const venue of venues) {
      const geometryInputHash = geometryHashForVenue(venue.id);
      await expect(
        geometryRepository.readCurrentGeometryInput?.(venue.id, STOCKHOLM_DATE, venue),
      ).resolves.toEqual({ status: 'ready', geometryInputHash });

      const coverage = await geometryRepository.readCurrentCoverageForVenueDay(
        venue.id,
        STOCKHOLM_DATE,
        geometryInputHash,
        venue,
      );
      expect(coverage).toMatchObject({
        venueId: venue.id,
        stockholmDate: STOCKHOLM_DATE,
        geometryInputHash,
        status: 'ready',
      });
      expect(coverage?.series).toHaveLength(61);
      expect(coverage?.series.at(0)).toEqual({
        minutes: PLANNER_START_MINUTES,
        sunExposurePercent: 0,
      });
      expect(coverage?.series.at(-1)).toEqual({
        minutes: PLANNER_END_MINUTES,
        sunExposurePercent: 100,
      });

      await expect(
        weatherRepository.readSnapshotForVenueDay(venue, undefined, STOCKHOLM_DATE),
      ).resolves.toMatchObject({
        status: 'ready',
        bucket: 'current',
        weatherUpdatedAt: '2026-07-18T10:55:00.000Z',
      });
    }

    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.from).toHaveBeenCalledTimes(1);
  });

  test.each([
    {
      label: 'wrong coverage date',
      row: {
        coverage_stockholm_date: '2026-07-17',
        coverage_geometry_input_hash:
          'g1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
    },
    {
      label: 'coverage for a stale hash',
      row: {
        coverage_stockholm_date: STOCKHOLM_DATE,
        coverage_geometry_input_hash:
          'g1:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      },
    },
  ])('fails closed on $label returned by the batch RPC', async ({ row }) => {
    const venue = makeVenue(1);
    const currentHash =
      'g1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    supabaseMock.state.rpcResult = {
      data: [
        {
          venue_id: venue.id,
          input_status: 'ready',
          current_geometry_input_hash: currentHash,
          series: fullPersistedSeries(),
          ...row,
        },
      ],
      error: null,
    };
    const repository = await prepareSunGeometryRepositoryForVenueDays(
      [venue],
      STOCKHOLM_DATE,
    );

    await expect(
      buildPersistedSunOutcome(venue, REQUESTED_AT, REQUESTED_AT, {
        repositories: {
          sunGeometryRepository: repository,
          weatherSnapshotRepository: {
            readSnapshotForVenueDay: async () => null,
          },
        },
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<SunGeometryCoverageMissingError>>({
        code: 'SUN_GEOMETRY_COVERAGE_MISSING',
      }),
    );
  });

  test.each([
    { label: 'a missing input row', row: null },
    {
      label: 'a dirty current input',
      row: {
        input_status: 'dirty',
        current_geometry_input_hash:
          'g1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        coverage_stockholm_date: STOCKHOLM_DATE,
        coverage_geometry_input_hash:
          'g1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        series: fullPersistedSeries(),
      },
    },
    {
      label: 'a ready input without a current hash',
      row: {
        input_status: 'ready',
        current_geometry_input_hash: null,
        coverage_stockholm_date: null,
        coverage_geometry_input_hash: null,
        series: null,
      },
    },
    {
      label: 'a malformed 60-step series',
      row: {
        input_status: 'ready',
        current_geometry_input_hash:
          'g1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        coverage_stockholm_date: STOCKHOLM_DATE,
        coverage_geometry_input_hash:
          'g1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        series: fullPersistedSeries().slice(1),
      },
    },
  ])('fails closed on $label without issuing a scalar fallback read', async ({ row }) => {
    const venue = makeVenue(1);
    supabaseMock.state.rpcResult = {
      data: row ? [{ venue_id: venue.id, ...row }] : [],
      error: null,
    };
    const repository = await prepareSunGeometryRepositoryForVenueDays(
      [venue],
      STOCKHOLM_DATE,
    );

    await expect(
      buildPersistedSunOutcome(venue, REQUESTED_AT, REQUESTED_AT, {
        repositories: {
          sunGeometryRepository: repository,
          weatherSnapshotRepository: {
            readSnapshotForVenueDay: async () => null,
          },
        },
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<SunGeometryCoverageMissingError>>({
        code: 'SUN_GEOMETRY_COVERAGE_MISSING',
      }),
    );
    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  test('rejects a geometry batch adapter error instead of falling back to per-venue reads', async () => {
    supabaseMock.state.rpcResult = {
      data: null,
      error: { message: 'database unavailable' },
    };

    await expect(
      prepareSunGeometryRepositoryForVenueDays([makeVenue(1)], STOCKHOLM_DATE),
    ).rejects.toThrow('Geometry batch read failed: database unavailable');
    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  test('keeps expired weather explicit and treats wrong-date or absent bucket rows as missing', async () => {
    const expiredVenue = makeVenue(1, 0);
    const wrongDateVenue = makeVenue(2, 1);
    const missingVenue = makeVenue(3, 2);
    supabaseMock.state.weatherResult = {
      data: [
        {
          coordinate_bucket: coordinateBucket(expiredVenue),
          bucket_key: 'current',
          stockholm_date: STOCKHOLM_DATE,
          weather_updated_at: '2026-07-18T09:00:00.000Z',
          expires_at: '2026-07-18T10:59:59.999Z',
          slices: [{ minutes: 720, cloudCover: 95 }],
        },
        {
          coordinate_bucket: coordinateBucket(wrongDateVenue),
          bucket_key: 'current',
          stockholm_date: '2026-07-17',
          weather_updated_at: '2026-07-18T10:55:00.000Z',
          expires_at: '2026-07-18T13:00:00.000Z',
          slices: [{ minutes: 720, cloudCover: 5 }],
        },
      ],
      error: null,
    };

    const repository = await prepareWeatherSnapshotRepositoryForVenueDays(
      [expiredVenue, wrongDateVenue, missingVenue],
      STOCKHOLM_DATE,
    );

    await expect(
      repository.readSnapshotForVenueDay(expiredVenue, undefined, STOCKHOLM_DATE),
    ).resolves.toEqual({
      status: 'expired',
      bucket: 'current',
      weatherUpdatedAt: '2026-07-18T09:00:00.000Z',
      slices: [],
    });
    await expect(
      repository.readSnapshotForVenueDay(wrongDateVenue, undefined, STOCKHOLM_DATE),
    ).resolves.toBeNull();
    await expect(
      repository.readSnapshotForVenueDay(missingVenue, undefined, STOCKHOLM_DATE),
    ).resolves.toBeNull();
    expect(supabaseMock.from).toHaveBeenCalledTimes(1);
  });
});
