import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { VenueDataDto, WeeklyOpeningHours } from '@/lib/types/api';

function makeRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/venues${query}`);
}

describe('[12.14 AC7] GET /api/venues selected-time availability candidate headroom', () => {
  beforeEach(() => {
    vi.doUnmock('@/lib/services/venue-store');
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('@/lib/services/venue-store');
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('keeps normal list/search candidate headroom above the favourite-ID cap so closed-heavy sets do not starve open tail venues', async () => {
    const closedAtSelectedTime = everyDay('19:00', '22:00');
    const openAtSelectedTime = everyDay('11:00', '22:00');
    const venues = [
      ...Array.from({ length: 51 }, (_, index) =>
        makeVenue({
          id: `closed-candidate-${index}`,
          sunExposurePercent: 95,
          openingHours: closedAtSelectedTime,
        }),
      ),
      ...Array.from({ length: 1 }, (_, index) =>
        makeVenue({
          id: `open-tail-${index}`,
          sunExposurePercent: 10,
          openingHours: openAtSelectedTime,
        }),
      ),
    ];

    vi.doMock('@/lib/services/venue-store', () => ({
      getVenues: vi.fn(async () => venues),
    }));

    const { GET } = await import('@/app/api/venues/route');
    const listResponse = await GET(makeRequest('?lat=57.7&lng=11.97&q=candidate'));
    expect(listResponse.status).toBe(200);
    const listBody = await listResponse.json();

    expect(listBody.totalCount).toBe(52);
    expect(listBody.venues).toHaveLength(52);
    expect(listBody.venues.map((venue: VenueDataDto) => venue.id)).toContain('open-tail-0');

    const tooManyIds = Array.from({ length: 51 }, (_, index) => `id-${index}`).join(',');
    const favouritesResponse = await GET(
      makeRequest(`?lat=57.7&lng=11.97&ids=${tooManyIds}`),
    );
    expect(favouritesResponse.status).toBe(400);
    expect(await favouritesResponse.json()).toEqual(
      expect.objectContaining({ detail: expect.stringMatching(/ids.*50/i) }),
    );
  }, 15_000);
});

function makeVenue({
  id,
  sunExposurePercent,
  openingHours,
}: {
  id: string;
  sunExposurePercent: number;
  openingHours: WeeklyOpeningHours;
}): VenueDataDto {
  return {
    id,
    venueId: id,
    venueName: `Candidate ${id}`,
    venueSlug: id,
    slug: id,
    neighborhood: 'Centrum',
    location: { lat: 57.7, lng: 11.97 },
    currentSunStatus: sunExposurePercent >= 50 ? 'Sunny' : 'Shaded',
    weatherGateState: 'not_gated',
    isPartner: false,
    confidence: 90,
    distanceMeters: 0,
    sunExposurePercent,
    tags: [],
    openingHours,
  };
}

function everyDay(open: string, close: string): WeeklyOpeningHours {
  return {
    '1': { open, close },
    '2': { open, close },
    '3': { open, close },
    '4': { open, close },
    '5': { open, close },
    '6': { open, close },
    '7': { open, close },
  };
}
