import { describe, expect, test } from 'vitest';
import {
  gateGeometrySeriesWithWeatherSnapshots,
  selectSnapshotSliceForStep,
} from '@/lib/services/weather-snapshots';

describe('Story 12.3 automated coverage - weather snapshot read-time gates', () => {
  test('uses layer-weighted effective cloud cover for gating while preserving geometry percentage', () => {
    const gated = gateGeometrySeriesWithWeatherSnapshots({
      geometrySeries: [{ minutes: 720, sunExposurePercent: 82 }],
      weatherSlices: [
        {
          minutes: 720,
          cloudCover: 10,
          cloudCoverLow: 95,
          cloudCoverMedium: 0,
          cloudCoverHigh: 0,
          isRaining: false,
        },
      ],
    });

    expect(gated).toEqual([
      expect.objectContaining({
        minutes: 720,
        sunExposurePercent: 82,
        currentSunStatus: 'CloudObscured',
      }),
    ]);
  });

  test('distinguishes explicit no-rain from rain at the same clear-sky geometry step', () => {
    const [dryStep, rainyStep] = gateGeometrySeriesWithWeatherSnapshots({
      geometrySeries: [
        { minutes: 720, sunExposurePercent: 90 },
        { minutes: 735, sunExposurePercent: 90 },
      ],
      weatherSlices: [
        { minutes: 720, cloudCover: 5, isRaining: false },
        { minutes: 735, cloudCover: 5, isRaining: true },
      ],
    });

    expect(dryStep).toEqual(
      expect.objectContaining({
        currentSunStatus: 'Sunny',
        skyCondition: 'clear',
      }),
    );
    expect(rainyStep).toEqual(
      expect.objectContaining({
        currentSunStatus: 'CloudObscured',
        skyCondition: 'rain',
      }),
    );
  });

  test('selects the nearest fresh slice and marks older slices unknown past the freshness window', () => {
    expect(
      selectSnapshotSliceForStep({
        requestedAt: new Date('2026-07-18T10:00:00.000Z'),
        maxStalenessMinutes: 90,
        slices: [
          { validAt: '2026-07-18T08:45:00.000Z', cloudCover: 80 },
          { validAt: '2026-07-18T10:20:00.000Z', cloudCover: 20 },
        ],
      }),
    ).toEqual(expect.objectContaining({ cloudCover: 20 }));

    expect(
      selectSnapshotSliceForStep({
        requestedAt: new Date('2026-07-18T10:00:00.000Z'),
        maxStalenessMinutes: 30,
        slices: [{ validAt: '2026-07-18T09:00:00.000Z', cloudCover: 80 }],
      }),
    ).toEqual({ weatherUnknown: true });
  });
});
