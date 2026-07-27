import { describe, expect, it } from 'vitest';
import {
  buildNativeDirectionsUrl,
  getRouteSummary,
} from '@/lib/services/routing';
import { mapVenueDtoToPinData } from '@/lib/utils/venue-pin-mapping';
import type { VenueDataDto } from '@/lib/types/api';

const displayLocation = { lat: 57.7061, lng: 11.9712 };
const engineLocation = { lat: 57.75, lng: 12.05 };

const venue: VenueDataDto = {
  id: '1',
  venueId: '1',
  venueName: 'Kafé Magasinet',
  venueSlug: 'test-venue-sunny',
  slug: 'test-venue-sunny',
  neighborhood: 'Inom Vallgraven',
  location: displayLocation,
  currentSunStatus: 'Sunny',
  weatherGateState: 'not_gated',
  isPartner: true,
  confidence: 92,
  distanceMeters: 0,
  sunExposurePercent: 95,
  tags: ['Innergård'],
};

describe('Story 12.5 display coordinate public consumers', () => {
  it('maps public venue pins from the display location, never a server-only engine coordinate', () => {
    const pin = mapVenueDtoToPinData({
      ...venue,
      engineLocation,
    } as VenueDataDto & { engineLocation: typeof engineLocation });

    expect(pin).toMatchObject({
      lat: displayLocation.lat,
      lng: displayLocation.lng,
    });
    expect(pin).not.toMatchObject({
      lat: engineLocation.lat,
      lng: engineLocation.lng,
    });
  });

  it('builds route summaries from the public display location when no cached distance is present', () => {
    const summary = getRouteSummary({
      venue: {
        venueName: venue.venueName,
        location: venue.location,
        engineLocation,
      } as { venueName: string; location: typeof displayLocation; engineLocation: typeof engineLocation },
      origin: displayLocation,
    });

    expect(summary.distanceMeters).toBe(0);
    expect(summary.walkMinutes).toBe(1);
    expect(summary.bikeMinutes).toBe(1);
    expect(summary.direction).toBeNull();
  });

  it('builds native maps URLs with display coordinates', () => {
    const url = buildNativeDirectionsUrl({
      ...venue,
      engineLocation,
    } as typeof venue & { engineLocation: typeof engineLocation });

    const destination = new URL(url).searchParams.get('destination');
    expect(destination).toBe(`${displayLocation.lat},${displayLocation.lng}`);
    expect(destination).not.toBe(`${engineLocation.lat},${engineLocation.lng}`);
  });
});
