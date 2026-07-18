/**
 * ATDD RED-PHASE acceptance scaffolds - Story 12.3
 * Weather snapshot horizon and read-time gating contract.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { PLANNER_MAX_FUTURE_DAYS } from '@/lib/utils/time-planner';

type WeatherSnapshotsModule = {
  buildWeatherSnapshotWindow: (now: Date) => string[];
  refreshWeatherSnapshotsForVenue: (input: unknown) => Promise<Record<string, unknown>>;
  selectSnapshotSliceForStep: (input: unknown) => Record<string, unknown> | null;
  gateGeometrySeriesWithWeatherSnapshots: (input: unknown) => Array<Record<string, unknown>>;
};

const weatherSnapshotsModulePath = '@/lib/services/weather-snapshots';

async function loadWeatherSnapshotsModule(): Promise<WeatherSnapshotsModule> {
  return (await import(weatherSnapshotsModulePath)) as WeatherSnapshotsModule;
}

describe('Story 12.3 AC1/AC4 - weather snapshots cover the planner horizon without stale nearest-slice reuse', () => {
  test.skip('snapshot refresh covers the selectable planner horizon or marks out-of-horizon as unknown', async () => {
    const { buildWeatherSnapshotWindow } = await loadWeatherSnapshotsModule();
    const window = buildWeatherSnapshotWindow(new Date('2026-07-18T09:00:00+02:00'));

    expect(window.length).toBeGreaterThanOrEqual(PLANNER_MAX_FUTURE_DAYS + 1);
    expect(window[0]).toBe('2026-07-18');
    expect(window[PLANNER_MAX_FUTURE_DAYS]).toBe('2026-07-21');
  });

  test.skip('day+3 boundary never gates against the stale nearest 48-hour slice', async () => {
    const { selectSnapshotSliceForStep } = await loadWeatherSnapshotsModule();
    const result = selectSnapshotSliceForStep({
      requestedAt: new Date('2026-07-21T12:00:00+02:00'),
      slices: [{ validAt: '2026-07-20T09:00:00.000Z', cloudCover: 0 }],
      maxStalenessMinutes: 90,
    });

    expect(result).toEqual(expect.objectContaining({ weatherUnknown: true }));
    expect(result).not.toEqual(expect.objectContaining({ cloudCover: 0 }));
  });

  test.skip('read-time gating preserves geometry percentages and treats unknown weather as non-clear', async () => {
    const { gateGeometrySeriesWithWeatherSnapshots } = await loadWeatherSnapshotsModule();
    const gated = gateGeometrySeriesWithWeatherSnapshots({
      geometrySeries: [{ minutes: 720, sunExposurePercent: 90 }],
      weatherSlices: [{ minutes: 720, weatherUnknown: true }],
    });

    expect(gated).toEqual([
      expect.objectContaining({
        minutes: 720,
        sunExposurePercent: 90,
        currentSunStatus: 'Sunny',
        skyCondition: 'unavailable',
      }),
    ]);
  });

  test.skip('snapshot refresh preserves explicit rain true/false/unknown and only uses nowcast near now', async () => {
    const { refreshWeatherSnapshotsForVenue } = await loadWeatherSnapshotsModule();
    const result = await refreshWeatherSnapshotsForVenue({
      venueId: 'venue-1',
      now: new Date('2026-07-18T09:00:00+02:00'),
      forecastSlices: [
        { validAt: '2026-07-18T09:15:00.000Z', cloudCover: 10 },
        { validAt: '2026-07-18T13:00:00.000Z', cloudCover: 10 },
      ],
      nowcastRateByValidAt: {
        '2026-07-18T09:15:00.000Z': 0.4,
      },
    });

    expect(result).toMatchObject({
      slices: expect.arrayContaining([
        expect.objectContaining({ validAt: '2026-07-18T09:15:00.000Z', isRaining: true }),
        expect.objectContaining({ validAt: '2026-07-18T13:00:00.000Z', isRaining: undefined }),
      ]),
    });
  });

  test.skip('Met.no forecast retention is no longer hard-coded to the first 48 slices', () => {
    const source = readFileSync(join(process.cwd(), 'lib/weather/met-no-service.ts'), 'utf8');

    expect(source).not.toContain('timeseries.slice(0, 48)');
    expect(source).toMatch(/PLANNER_MAX_FUTURE_DAYS|WEATHER_SNAPSHOT_HORIZON|forecastHorizon/i);
  });
});
