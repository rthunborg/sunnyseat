import { describe, expect, it } from 'vitest';
import { mapVenueDtoToPinData } from '@/lib/utils/venue-pin-mapping';
import type { VenueDataDto } from '@/lib/types/api';

describe('mapVenueDtoToPinData', () => {
  it('maps the canonical API lat/lng fields into pin coordinates', () => {
    expect(mapVenueDtoToPinData(makeVenue({ lat: 57.7, lng: 11.97 }))).toMatchObject({
      id: 'venue-1',
      slug: 'venue-1',
      name: 'Venue 1',
      lat: 57.7,
      lng: 11.97,
      sunStatus: 'Sunny',
      weatherGateState: 'not_gated',
      sunExposurePercent: 82,
      isPartner: false,
    });
  });

  it('skips malformed coordinates instead of rendering NaN markers', () => {
    expect(mapVenueDtoToPinData(makeVenue({ lat: Number.NaN, lng: 11.97 }))).toBeNull();
    expect(mapVenueDtoToPinData(makeVenue({ lat: 57.7, lng: Number.POSITIVE_INFINITY }))).toBeNull();
  });

  it('preserves new API sun status literals such as NoSun for shaded pin rendering', () => {
    expect(
      mapVenueDtoToPinData(
        makeVenue({ lat: 57.7, lng: 11.97, currentSunStatus: 'NoSun' }),
      ),
    ).toMatchObject({
      sunStatus: 'NoSun',
      weatherGateState: 'not_gated',
      sunExposurePercent: 0,
    });
  });
});

function makeVenue({
  lat,
  lng,
  currentSunStatus = 'Sunny',
}: {
  lat: number;
  lng: number;
  currentSunStatus?: VenueDataDto['currentSunStatus'];
}): VenueDataDto {
  return {
    id: 'venue-1',
    venueId: 'venue-1',
    venueName: 'Venue 1',
    venueSlug: 'venue-1',
    slug: 'venue-1',
    neighborhood: 'Centrum',
    location: { lat, lng },
    currentSunStatus,
    weatherGateState: 'not_gated',
    isPartner: false,
    confidence: 91,
    distanceMeters: 320,
    sunExposurePercent: currentSunStatus === 'NoSun' ? 0 : 82,
    tags: [],
  };
}
