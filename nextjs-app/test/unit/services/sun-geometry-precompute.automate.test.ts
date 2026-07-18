import { describe, expect, test, vi } from 'vitest';
import {
  buildSunGeometryPrecomputeWindow,
  runSunGeometryPrecompute,
  type SunGeometryPrecomputeTarget,
} from '@/lib/services/sun-geometry-precompute';
import { PLANNER_END_MINUTES, PLANNER_START_MINUTES } from '@/lib/utils/time-planner';
import type { GeometryInputPayload } from '@/lib/services/sun-geometry-repository';

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
});
