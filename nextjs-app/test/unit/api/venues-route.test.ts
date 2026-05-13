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
        'X-Forwarded-For': 'not-an-ip',
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
