import { describe, expect, it } from 'vitest';
import {
  isVenueSunnyForList,
  sortVenuesForList,
} from '@/components/custom/venue/VenueList';
import type { VenueDataDto } from '@/lib/types/api';

function makeVenue(overrides: Partial<VenueDataDto>): VenueDataDto {
  return {
    id: 'v',
    venueId: 'v',
    venueName: 'Venue',
    venueSlug: 'venue',
    slug: 'venue',
    neighborhood: 'Centrum',
    location: { lat: 57.7, lng: 11.97 },
    currentSunStatus: 'Sunny',
    weatherGateState: 'not_gated',
    isPartner: false,
    confidence: 80,
    distanceMeters: 100,
    sunExposurePercent: 80,
    tags: [],
    ...overrides,
  };
}

describe('VenueList public-sun sorting (Story 12.6)', () => {
  it('orders public-sunny venues first, then exposure, distance, and stable id', () => {
    const venues = [
      makeVenue({ id: 'grey-100', sunExposurePercent: 100, weatherGateState: 'gated', distanceMeters: 1 }),
      makeVenue({ id: 'sun-b', sunExposurePercent: 80, weatherGateState: 'unknown', distanceMeters: 100 }),
      makeVenue({ id: 'sun-a', sunExposurePercent: 80, weatherGateState: 'not_gated', distanceMeters: 100 }),
      makeVenue({ id: 'sun-51', sunExposurePercent: 51, weatherGateState: 'not_gated', distanceMeters: 0 }),
      makeVenue({ id: 'grey-50', sunExposurePercent: 50, weatherGateState: 'not_gated', distanceMeters: 0 }),
    ];

    expect(sortVenuesForList([...venues].reverse(), 'sun').map((venue) => venue.id)).toEqual([
      'sun-a',
      'sun-b',
      'sun-51',
      'grey-100',
      'grey-50',
    ]);
  });

  it('keeps distance sorting distance-first', () => {
    const nearGrey = makeVenue({
      id: 'near-grey',
      sunExposurePercent: 0,
      weatherGateState: 'not_gated',
      distanceMeters: 10,
    });
    const farSunny = makeVenue({
      id: 'far-sunny',
      sunExposurePercent: 100,
      weatherGateState: 'not_gated',
      distanceMeters: 1000,
    });

    expect(sortVenuesForList([farSunny, nearGrey], 'distance').map((venue) => venue.id)).toEqual([
      'near-grey',
      'far-sunny',
    ]);
  });
});

describe('isVenueSunnyForList public predicate', () => {
  it('requires exposure above 50 and a non-gated weather state', () => {
    expect(isVenueSunnyForList(makeVenue({ sunExposurePercent: 50 }))).toBe(false);
    expect(isVenueSunnyForList(makeVenue({ sunExposurePercent: 51 }))).toBe(true);
    expect(
      isVenueSunnyForList(
        makeVenue({
          currentSunStatus: 'CloudObscured',
          weatherGateState: 'gated',
          sunExposurePercent: 100,
        }),
      ),
    ).toBe(false);
    expect(isVenueSunnyForList(makeVenue({ weatherGateState: 'unknown', sunExposurePercent: 80 }))).toBe(true);
  });
});
