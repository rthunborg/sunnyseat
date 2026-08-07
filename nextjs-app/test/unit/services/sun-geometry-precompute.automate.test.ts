import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  buildSunGeometryPrecomputeWindow,
  collectSunGeometryPrecomputeTargets,
  runSunGeometryPrecompute,
  type SunGeometryPrecomputeTarget,
} from '@/lib/services/sun-geometry-precompute';
import { PLANNER_END_MINUTES, PLANNER_START_MINUTES } from '@/lib/utils/time-planner';
import type { GeometryInputPayload } from '@/lib/services/sun-geometry-repository';

const supabaseMock = vi.hoisted(() => {
  const state = {
    result: { data: [] as unknown, error: null as unknown },
  };
  const query = {
    is: vi.fn(() => query),
    order: vi.fn(() => Promise.resolve(state.result)),
  };
  const select = vi.fn(() => query);
  const from = vi.fn(() => ({ select }));
  const client = { from };
  return { state, client, from, select, is: query.is, order: query.order };
});

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: () => supabaseMock.client,
}));

function makeGeometryInputPayload(venueId: string): GeometryInputPayload {
  return {
    version: 'g1',
    planner: {
      timezone: 'Europe/Stockholm',
      plannerStartMinutes: PLANNER_START_MINUTES,
      plannerEndMinutes: PLANNER_END_MINUTES,
      plannerStepMinutes: 15,
      plannerMaxFutureDays: 3,
      algorithm: 'sunnyseat-shadow-v1',
    },
    venue: {
      id: venueId,
      seatingArea: {
        type: 'Polygon',
        coordinates: [
          [
            [11.97, 57.705],
            [11.971, 57.705],
            [11.971, 57.706],
            [11.97, 57.706],
            [11.97, 57.705],
          ],
        ],
      },
      seatingCentroid: { lat: 57.7055, lng: 11.9705 },
      seatingElevationM: null,
      groundElevationM: null,
    },
    casters: [],
  };
}

function makePrecomputeVenueRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'venue-1',
    slug: 'venue-1',
    venue_name: 'Venue One',
    neighborhood: 'Centrum',
    lat: 57.705,
    lng: 11.97,
    display_lat: null,
    display_lng: null,
    is_partner: false,
    thumbnail: null,
    description: null,
    address: null,
    opening_hours: null,
    current_sun_status: 'Shaded',
    sky_condition: null,
    confidence: 80,
    sun_exposure_percent: 0,
    sun_window: null,
    prediction_uncertainty: null,
    tags: [],
    seating_area: {
      type: 'Polygon',
      coordinates: [[
        [11.97, 57.705],
        [11.971, 57.705],
        [11.971, 57.706],
        [11.97, 57.706],
        [11.97, 57.705],
      ]],
    },
    seating_elevation_m: null,
    ground_elevation_m: null,
    hidden: false,
    deleted_at: null,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  supabaseMock.state.result = { data: [], error: null };
  supabaseMock.from.mockClear();
  supabaseMock.select.mockClear();
  supabaseMock.is.mockClear();
  supabaseMock.order.mockClear();
});

describe('Story 12.3 automated coverage - precompute run publication semantics', () => {
  test('publishes one complete generation containing every date when batch publishing is available', async () => {
    const now = new Date('2026-07-18T00:30:00+02:00');
    const window = buildSunGeometryPrecomputeWindow(now);
    const target: SunGeometryPrecomputeTarget = {
      id: 'venue-1',
      slug: 'venue-1',
      isHidden: false,
    };
    const writeGeometrySeries = vi.fn();
    const publishGeometryGeneration = vi.fn();

    const result = await runSunGeometryPrecompute({
      now,
      targets: [target],
      repository: {
        async buildGeometryInput(inputTarget) {
          return {
            hash: 'g1:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            inputPayload: makeGeometryInputPayload(inputTarget.id),
          };
        },
        writeGeometrySeries,
        publishGeometryGeneration,
      },
    });

    expect(result).toMatchObject({
      status: 'completed',
      totalVenueDays: window.length,
      completedVenueDays: window.length,
      failedVenueDays: 0,
    });
    expect(writeGeometrySeries).not.toHaveBeenCalled();
    expect(publishGeometryGeneration).toHaveBeenCalledTimes(1);
    expect(publishGeometryGeneration).toHaveBeenCalledWith(
      target,
      'g1:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      makeGeometryInputPayload(target.id),
      expect.objectContaining(
        Object.fromEntries(
          window.map((stockholmDate) => [
            stockholmDate,
            expect.arrayContaining([
              expect.objectContaining({
                minutes: PLANNER_START_MINUTES,
                sunExposurePercent: expect.any(Number),
              }),
              expect.objectContaining({
                minutes: PLANNER_END_MINUTES,
                sunExposurePercent: expect.any(Number),
              }),
            ]),
          ]),
        ),
      ),
    );
  });

  test('records every invalid target date as failed and does not publish partial geometry', async () => {
    const now = new Date('2026-07-18T00:30:00+02:00');
    const window = buildSunGeometryPrecomputeWindow(now);
    const publishGeometryGeneration = vi.fn();
    const writeGeometrySeries = vi.fn();

    const result = await runSunGeometryPrecompute({
      now,
      targets: [
        {
          id: 'venue-invalid',
          slug: 'venue-invalid',
          invalidReason: 'invalid-seating-polygon',
        },
      ],
      repository: {
        publishGeometryGeneration,
        writeGeometrySeries,
      },
    });

    expect(result).toMatchObject({
      status: 'failed',
      totalVenueDays: window.length,
      completedVenueDays: 0,
      failedVenueDays: window.length,
      failures: window.map((stockholmDate) => ({
        venueId: 'venue-invalid',
        stockholmDate,
        reason: 'invalid-seating-polygon',
      })),
    });
    expect(publishGeometryGeneration).not.toHaveBeenCalled();
    expect(writeGeometrySeries).not.toHaveBeenCalled();
  });

  test('records measured profiling timings instead of placeholder zeros', async () => {
    const result = await runSunGeometryPrecompute({
      now: new Date('2026-07-18T00:30:00+02:00'),
      profile: true,
      targets: [{ id: 'venue-1', slug: 'venue-1' }],
    });
    const timings = result.timingsMs as Record<string, number>;

    expect(timings).toEqual(
      expect.objectContaining({
        coldRouteBefore: expect.any(Number),
        coldRouteAfter: expect.any(Number),
        bucketRollAfter: expect.any(Number),
        precomputeRun: expect.any(Number),
      }),
    );
    expect(timings.coldRouteAfter).toBeGreaterThanOrEqual(timings.coldRouteBefore);
    expect(timings.bucketRollAfter).toBeGreaterThanOrEqual(timings.coldRouteAfter);
    expect(
      timings.coldRouteBefore + timings.coldRouteAfter + timings.bucketRollAfter,
    ).toBeGreaterThan(0);
  });

  test('[12.16] filters soft-deleted venues from precompute targeting while retaining hidden venues', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    supabaseMock.state.result = {
      data: [
        makePrecomputeVenueRow({ id: 'visible', slug: 'visible', hidden: false }),
        makePrecomputeVenueRow({ id: 'hidden', slug: 'hidden', hidden: true }),
      ],
      error: null,
    };

    const targets = await collectSunGeometryPrecomputeTargets();

    expect(supabaseMock.from).toHaveBeenCalledWith('venues');
    expect(supabaseMock.select).toHaveBeenCalledWith(
      expect.stringContaining('deleted_at'),
    );
    expect(supabaseMock.is).toHaveBeenCalledWith('deleted_at', null);
    expect(supabaseMock.order).toHaveBeenCalledWith('id');
    expect(targets.map((target) => ({ id: target.id, isHidden: target.isHidden }))).toEqual([
      { id: 'visible', isHidden: false },
      { id: 'hidden', isHidden: true },
    ]);
  });
});
