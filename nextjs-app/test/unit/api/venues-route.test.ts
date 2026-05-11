import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/venues/route';
import type { GetVenuesResponse } from '@/lib/types/api';

function makeRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/venues${query}`);
}

describe('GET /api/venues', () => {
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
});
