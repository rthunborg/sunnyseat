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
  refreshWeatherSnapshotsForVenue: (input: unknown) => Promise<{
    venueId?: string;
    slices?: Array<Record<string, unknown>>;
  }>;
  selectSnapshotSliceForStep: (input: unknown) => Record<string, unknown> | null;
  gateGeometrySeriesWithWeatherSnapshots: (input: unknown) => Array<Record<string, unknown>>;
};

const weatherSnapshotsModulePath = '@/lib/services/weather-snapshots';

async function loadWeatherSnapshotsModule(): Promise<WeatherSnapshotsModule> {
  return (await import(weatherSnapshotsModulePath)) as WeatherSnapshotsModule;
}

describe('Story 12.3 AC1/AC4 - weather snapshots cover the planner horizon without stale nearest-slice reuse', () => {
  test('snapshot refresh covers the selectable planner horizon or marks out-of-horizon as unknown', async () => {
    const { buildWeatherSnapshotWindow } = await loadWeatherSnapshotsModule();
    const window = buildWeatherSnapshotWindow(new Date('2026-07-18T09:00:00+02:00'));

    expect(window.length).toBeGreaterThanOrEqual(PLANNER_MAX_FUTURE_DAYS + 1);
    expect(window[0]).toBe('2026-07-18');
    expect(window[PLANNER_MAX_FUTURE_DAYS]).toBe('2026-07-21');
  });

  test('day+3 boundary never gates against the stale nearest retained slice', async () => {
    const { selectSnapshotSliceForStep } = await loadWeatherSnapshotsModule();
    const result = selectSnapshotSliceForStep({
      requestedAt: new Date('2026-07-21T12:00:00+02:00'),
      slices: [{ validAt: '2026-07-20T09:00:00.000Z', cloudCover: 0 }],
      maxStalenessMinutes: 90,
    });

    expect(result).toEqual(expect.objectContaining({ weatherUnknown: true }));
    expect(result).not.toEqual(expect.objectContaining({ cloudCover: 0 }));
  });

  test('read-time gating preserves geometry percentages and treats unknown weather as non-clear', async () => {
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
        weatherGateState: 'unknown',
        skyCondition: 'unavailable',
      }),
    ]);
  });

  test('snapshot refresh preserves timestamped near-now rain on only the closest forecast slice', async () => {
    const { refreshWeatherSnapshotsForVenue } = await loadWeatherSnapshotsModule();
    const result = await refreshWeatherSnapshotsForVenue({
      venueId: 'venue-1',
      now: new Date('2026-07-18T09:00:00+02:00'),
      forecastSlices: [
        { validAt: '2026-07-18T07:15:00.000Z', cloudCover: 10 },
        { validAt: '2026-07-18T11:00:00.000Z', cloudCover: 10 },
      ],
      nowcastObservation: {
        validAt: '2026-07-18T07:14:00.000Z',
        precipitationRate: 0.4,
      },
    });

    expect(result.slices?.[0]).toMatchObject({
      validAt: '2026-07-18T07:15:00.000Z',
      nowcastValidAt: '2026-07-18T07:14:00.000Z',
      nowcastPrecipitationRate: 0.4,
      isRaining: true,
    });
    expect(result.slices?.[1]).not.toHaveProperty('isRaining');
  });

  test('Met.no forecast retention is no longer hard-coded to the first retained slices', () => {
    const source = readFileSync(join(process.cwd(), 'lib/weather/met-no-service.ts'), 'utf8');

    expect(source).not.toContain('timeseries.slice(0, 48)');
    expect(source).toMatch(/PLANNER_MAX_FUTURE_DAYS|WEATHER_SNAPSHOT_HORIZON|forecastHorizon/i);
  });

  test('scheduled persistence matches timestamped nowcast evidence instead of requiring a future forecast start', () => {
    const source = readFileSync(join(process.cwd(), 'scripts/refresh-weather-snapshots.ts'), 'utf8');

    expect(source).toContain('getNowcastPrecipitationObservation');
    expect(source).toContain('matchNowcastObservationToForecast');
    expect(source).not.toMatch(/validAtMs\s*>=\s*now\.getTime\(\)/u);
  });
});
