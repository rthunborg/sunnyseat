import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import {
  clearVenueRateLimitForTests,
  GET,
  validateVenueUniqueness,
} from '@/app/api/venues/route';
import type { GetVenuesResponse, VenueDataDto } from '@/lib/types/api';

function makeRequest(query: string, headers?: HeadersInit): NextRequest {
  return new NextRequest(`http://localhost/api/venues${query}`, { headers });
}

describe('GET /api/venues', () => {
  beforeEach(() => {
    clearVenueRateLimitForTests();
  });

  it('returns 200 with sun-status-sorted venues for a valid lat/lng', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746'));
    expect(res.status).toBe(200);

    const body = (await res.json()) as GetVenuesResponse;
    expect(body.venues.length).toBeGreaterThan(0);
    expect(body.meta.count).toBe(body.venues.length);
    expect(body.meta.radiusKm).toBe(1.5);

    const order = ['Sunny', 'Partial', 'Shaded'];
    const ranks = body.venues.map((v) => order.indexOf(v.currentSunStatus));
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i - 1]).toBeLessThanOrEqual(ranks[i]);
    }
  });

  it('returns 400 when lat is missing', async () => {
    const res = await GET(makeRequest(''));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { detail: string };
    expect(body.detail).toMatch(/lat/i);
  });

  it('returns 400 when lat is out of range', async () => {
    const res = await GET(makeRequest('?lat=999&lng=11.9746'));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { detail: string };
    expect(body.detail).toMatch(/Latitude/);
  });

  it('returns 400 when radiusKm exceeds the cap', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746&radiusKm=10'));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { detail: string };
    expect(body.detail).toMatch(/Radius/);
  });

  it('returns 400 when radiusKm is malformed (non-numeric)', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746&radiusKm=abc'));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { detail: string };
    expect(body.detail).toMatch(/radiusKm/);
  });

  it('uses the default radiusKm when the parameter is omitted', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;
    expect(body.meta.radiusKm).toBe(1.5);
  });

  it('rejects legacy latitude/longitude coordinate aliases', async () => {
    const res = await GET(makeRequest('?latitude=57.7089&longitude=11.9746'));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { detail: string };
    expect(body.detail).toMatch(/lat and lng/i);
  });

  it('rejects malformed X-Forwarded-For instead of trusting it as a key', async () => {
    const res = await GET(
      makeRequest('?lat=57.7089&lng=11.9746', {
        'X-Forwarded-For': '999.999.999.999',
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { detail: string };
    expect(body.detail).toMatch(/x-forwarded-for/i);
  });

  it('rate-limits repeated requests from the same forwarded IP', async () => {
    let last: Response | null = null;
    for (let i = 0; i < 121; i++) {
      last = await GET(
        makeRequest('?lat=57.7089&lng=11.9746', {
          'X-Forwarded-For': '203.0.113.8',
        }),
      );
    }
    expect(last?.status).toBe(429);
  });

  it('rate-limits requests without forwarded headers through a fallback bucket', async () => {
    let last: Response | null = null;
    for (let i = 0; i < 121; i++) {
      last = await GET(makeRequest('?lat=57.7089&lng=11.9746'));
    }
    expect(last?.status).toBe(429);
  });

  it('falls back to X-Real-IP when X-Forwarded-For is blank', async () => {
    let last: Response | null = null;
    for (let i = 0; i < 121; i++) {
      last = await GET(
        makeRequest('?lat=57.7089&lng=11.9746', {
          'X-Forwarded-For': '   ',
          'X-Real-IP': '203.0.113.44',
        }),
      );
    }
    expect(last?.status).toBe(429);
  });

  it('normalizes optional display fields before returning venues', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746'));
    const body = (await res.json()) as GetVenuesResponse;
    const venue = body.venues[0];
    expect(venue.sunWindow).toEqual({ start: '13:00', end: '18:30' });
    expect(venue.thumbnail?.alt.length).toBeLessThanOrEqual(120);
    expect(venue.thumbnail?.initials.length).toBeLessThanOrEqual(3);
    expect(venue.thumbnail?.url).toMatch(/^https:\/\//);
  });

  it('filters venues by canonical q across venue name and neighborhood', async () => {
    const byName = await GET(makeRequest('?lat=57.7089&lng=11.9746&q=magasinsgatan'));
    expect(byName.status).toBe(200);
    const byNameBody = (await byName.json()) as GetVenuesResponse;
    expect(byNameBody.venues.map((venue) => venue.venueName)).toEqual([
      'Solplats Magasinsgatan',
    ]);

    const byArea = await GET(makeRequest('?lat=57.7089&lng=11.9746&q=haga'));
    expect(byArea.status).toBe(200);
    const byAreaBody = (await byArea.json()) as GetVenuesResponse;
    expect(byAreaBody.venues.map((venue) => venue.venueName)).toEqual([
      'Brygghuset Lerum',
    ]);
  });

  it('searches all Gothenburg fixture venues when q is present instead of applying radius first', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746&radiusKm=0.01&q=haga'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;
    expect(body.venues.map((venue) => venue.venueName)).toEqual([
      'Brygghuset Lerum',
    ]);
  });

  it('does not match q against hidden slug fields', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746&q=test-venue-sunny'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;
    expect(body.venues).toEqual([]);
  });

  it('returns an empty venue list when q has no matches and leaves the request otherwise successful', async () => {
    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746&q=zzzzzz'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetVenuesResponse;
    expect(body.venues).toEqual([]);
    expect(body.meta.count).toBe(0);
    expect(body.totalCount).toBe(0);
  });

  it('rejects overlong or malformed q values with 400', async () => {
    const overlong = await GET(makeRequest(`?lat=57.7089&lng=11.9746&q=${'a'.repeat(81)}`));
    expect(overlong.status).toBe(400);
    expect((await overlong.json()) as { detail: string }).toEqual(
      expect.objectContaining({ detail: expect.stringMatching(/q/i) }),
    );

    const malformed = await GET(makeRequest('?lat=57.7089&lng=11.9746&q=magasin%0A'));
    expect(malformed.status).toBe(400);
    expect((await malformed.json()) as { detail: string }).toEqual(
      expect.objectContaining({ detail: expect.stringMatching(/q/i) }),
    );
  });

  it('sets ETag and returns 304 for unchanged revalidation', async () => {
    const first = await GET(makeRequest('?lat=57.7089&lng=11.9746'));
    expect(first.status).toBe(200);
    const etag = first.headers.get('etag');
    expect(etag).toMatch(/^W\//);
    expect(first.headers.get('cache-control')).toContain('must-revalidate');

    const second = await GET(
      makeRequest('?lat=57.7089&lng=11.9746', {
        'If-None-Match': etag ?? '',
      }),
    );
    expect(second.status).toBe(304);
    expect(second.headers.get('etag')).toBe(etag);
  });

  it('detects duplicate venue ids before map data is rendered', () => {
    const venue = makeVenue({ id: 'dupe', lat: 57.7, lng: 11.9 });
    const result = validateVenueUniqueness([
      venue,
      makeVenue({ id: 'dupe', lat: 57.71, lng: 11.91 }),
    ]);
    expect(result).toEqual({ valid: false, reason: 'Duplicate venue id: dupe' });
  });

  it('detects duplicate venue coordinates before map data is rendered', () => {
    const result = validateVenueUniqueness([
      makeVenue({ id: 'a', lat: 57.7, lng: 11.9 }),
      makeVenue({ id: 'b', lat: 57.7000001, lng: 11.9000001 }),
    ]);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/coordinates/i);
  });
});

function makeVenue({
  id,
  lat,
  lng,
}: {
  id: string;
  lat: number;
  lng: number;
}): VenueDataDto {
  return {
    id,
    venueId: id,
    venueName: `Venue ${id}`,
    venueSlug: id,
    slug: id,
    neighborhood: 'Centrum',
    location: { lat, lng },
    currentSunStatus: 'Sunny',
    isPartner: false,
    confidence: 90,
    distanceMeters: 0,
    sunExposurePercent: 90,
  };
}
