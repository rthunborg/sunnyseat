import { describe, expect, test } from 'vitest';
import { gateGeometrySeriesWithWeatherSnapshots } from '@/lib/services/weather-snapshots';

describe('Story 12.6 - explicit weather gate state', () => {
  test('[P0] emits not_gated, gated, and unknown without mutating geometric exposure', () => {
    const result = gateGeometrySeriesWithWeatherSnapshots({
      geometrySeries: [
        { minutes: 600, sunExposurePercent: 95 },
        { minutes: 615, sunExposurePercent: 95 },
        { minutes: 630, sunExposurePercent: 95 },
      ],
      weatherSlices: [
        {
          minutes: 600,
          cloudCover: 0,
          cloudCoverLow: 0,
          cloudCoverMedium: 0,
          cloudCoverHigh: 0,
          fogAreaFraction: 0,
          precipitationAmount: 0,
          symbolCode: 'clearsky_day',
          isRaining: false,
        },
        {
          minutes: 615,
          cloudCover: 95,
          cloudCoverLow: 95,
          cloudCoverMedium: 95,
          cloudCoverHigh: 95,
          fogAreaFraction: 0,
          precipitationAmount: 0,
          symbolCode: 'cloudy',
          isRaining: false,
        },
        { minutes: 630, weatherUnknown: true },
      ],
    });

    expect(result).toEqual([
      expect.objectContaining({
        minutes: 600,
        sunExposurePercent: 95,
        currentSunStatus: 'Sunny',
        weatherGateState: 'not_gated',
      }),
      expect.objectContaining({
        minutes: 615,
        sunExposurePercent: 95,
        currentSunStatus: 'CloudObscured',
        weatherGateState: 'gated',
      }),
      expect.objectContaining({
        minutes: 630,
        sunExposurePercent: 95,
        currentSunStatus: 'Sunny',
        skyCondition: 'unavailable',
        weatherGateState: 'unknown',
      }),
    ]);
  });
});
