import { describe, expect, test } from 'vitest';
import { normalizeVenueForResponse } from '@/lib/services/venues-fixture';
import { gateGeometrySeriesWithWeatherSnapshots } from '@/lib/services/weather-snapshots';
import type { VenueDataDto } from '@/lib/types/api';
import { extractPublicSunPeak } from '@/lib/utils/public-sun';

function venueWithRawGate(weatherGateState: unknown, includeField = true): VenueDataDto {
  const venue: Record<string, unknown> = {
    id: 'unknown-gate',
    venueId: 'unknown-gate',
    venueName: 'Unknown gate',
    venueSlug: 'unknown-gate',
    slug: 'unknown-gate',
    neighborhood: 'Centrum',
    location: { lat: 57.7089, lng: 11.9746 },
    currentSunStatus: 'Sunny',
    skyCondition: 'clear',
    isPartner: false,
    confidence: 80,
    distanceMeters: 100,
    sunExposurePercent: 80,
    tags: [],
  };
  if (includeField) venue.weatherGateState = weatherGateState;
  return venue as unknown as VenueDataDto;
}

describe('Story 12.6 automation - public-sun contract defects', () => {
  test('[P0] equal public peaks choose the earliest minute regardless of input order', () => {
    const later = {
      minutes: 645,
      sunExposurePercent: 80,
      weatherGateState: 'not_gated' as const,
    };
    const earlier = {
      minutes: 630,
      sunExposurePercent: 80,
      weatherGateState: 'unknown' as const,
    };

    expect(extractPublicSunPeak([later, earlier])).toEqual(earlier);
  });

  test('[P0] matched malformed weather slices fail closed to unknown', () => {
    const malformedSlices = [
      { minutes: 600 },
      { minutes: 600, cloudCover: Number.NaN, isRaining: false },
    ];

    const observed = malformedSlices.map((weatherSlice) => {
      const [step] = gateGeometrySeriesWithWeatherSnapshots({
        geometrySeries: [{ minutes: 600, sunExposurePercent: 95 }],
        weatherSlices: [weatherSlice],
      });
      return {
        sunExposurePercent: step.sunExposurePercent,
        weatherGateState: step.weatherGateState,
        skyCondition: step.skyCondition,
      };
    });

    expect(observed).toEqual([
      { sunExposurePercent: 95, weatherGateState: 'unknown', skyCondition: 'unavailable' },
      { sunExposurePercent: 95, weatherGateState: 'unknown', skyCondition: 'unavailable' },
    ]);
  });

  test('[P0] missing or malformed DTO gate values normalize to unknown instead of inferred clear', () => {
    const observed = [
      normalizeVenueForResponse(venueWithRawGate(undefined, false)).weatherGateState,
      normalizeVenueForResponse(venueWithRawGate('known-clear')).weatherGateState,
    ];

    expect(observed).toEqual(['unknown', 'unknown']);
  });
});
