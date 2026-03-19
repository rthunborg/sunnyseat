import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock venue-service
const mockGetVenuesNearPoint = vi.fn();
vi.mock('@/lib/services/venue-service', () => ({
  getVenuesNearPoint: (...args: unknown[]) => mockGetVenuesNearPoint(...args),
}));

// Mock sun-exposure-service
const mockCalculateSunExposure = vi.fn();
vi.mock('@/lib/solar/sun-exposure-service', () => ({
  calculateSunExposure: (...args: unknown[]) => mockCalculateSunExposure(...args),
}));

import { GET } from '@/app/api/patios/route';

function createRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/patios');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe('GET /api/patios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCalculateSunExposure.mockResolvedValue({
      venueId: 1,
      state: 'Sunny',
      confidence: 0.85,
      sunExposurePercent: 80,
    });
  });

  it('returns 400 when latitude is missing', async () => {
    const req = createRequest({ longitude: '11.97' });
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.detail).toContain('lat');
  });

  it('returns 400 when longitude is missing', async () => {
    const req = createRequest({ latitude: '57.7' });
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.detail).toContain('lng');
  });

  it('returns 400 for invalid latitude', async () => {
    const req = createRequest({ latitude: '999', longitude: '11.97' });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid longitude', async () => {
    const req = createRequest({ latitude: '57.7', longitude: '999' });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for radius exceeding max', async () => {
    const req = createRequest({ latitude: '57.7', longitude: '11.97', radiusKm: '10' });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns empty array when no venues found', async () => {
    mockGetVenuesNearPoint.mockResolvedValue([]);
    const req = createRequest({ latitude: '57.7', longitude: '11.97' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.patios).toEqual([]);
    expect(body.totalCount).toBe(0);
  });

  it('returns venue data with sun exposure', async () => {
    mockGetVenuesNearPoint.mockResolvedValue([
      {
        Id: 1,
        Name: 'Café Husaren',
        Slug: 'cafe-husaren',
        Neighborhood: 'Haga',
        VenueLocation: 'POINT(11.97 57.7)',
        DistanceMeters: 250,
      },
    ]);

    const req = createRequest({ latitude: '57.7', longitude: '11.97' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.patios).toHaveLength(1);
    expect(body.patios[0].venueName).toBe('Café Husaren');
    expect(body.patios[0].slug).toBe('cafe-husaren');
    expect(body.patios[0].neighborhood).toBe('Haga');
    expect(body.patios[0].currentSunStatus).toBe('Sunny');
    expect(body.totalCount).toBe(1);
  });

  it('uses default radius when radiusKm not provided', async () => {
    mockGetVenuesNearPoint.mockResolvedValue([]);
    const req = createRequest({ latitude: '57.7', longitude: '11.97' });
    await GET(req);
    expect(mockGetVenuesNearPoint).toHaveBeenCalledWith(57.7, 11.97, 1.5);
  });

  it('uses custom radiusKm when provided', async () => {
    mockGetVenuesNearPoint.mockResolvedValue([]);
    const req = createRequest({ latitude: '57.7', longitude: '11.97', radiusKm: '2.0' });
    await GET(req);
    expect(mockGetVenuesNearPoint).toHaveBeenCalledWith(57.7, 11.97, 2.0);
  });

  it('gracefully degrades when sun exposure calculation fails', async () => {
    mockGetVenuesNearPoint.mockResolvedValue([
      {
        Id: 1,
        Name: 'Test Venue',
        VenueLocation: 'POINT(11.97 57.7)',
        DistanceMeters: 100,
      },
    ]);
    mockCalculateSunExposure.mockRejectedValue(new Error('Solar calc failed'));

    const req = createRequest({ latitude: '57.7', longitude: '11.97' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.patios[0].currentSunStatus).toBe('Shaded');
  });

  it('sorts by sun status primary, distance secondary', async () => {
    mockGetVenuesNearPoint.mockResolvedValue([
      { Id: 1, Name: 'Far', VenueLocation: 'POINT(11.97 57.7)', DistanceMeters: 500 },
      { Id: 2, Name: 'Near', VenueLocation: 'POINT(11.97 57.7)', DistanceMeters: 100 },
    ]);

    const req = createRequest({ latitude: '57.7', longitude: '11.97' });
    const res = await GET(req);
    const body = await res.json();
    // Same sun status (Sunny), so distance is tiebreaker
    expect(body.patios[0].distanceMeters).toBe(100);
    expect(body.patios[1].distanceMeters).toBe(500);
  });

  it('returns meta object with count and radiusKm', async () => {
    mockGetVenuesNearPoint.mockResolvedValue([
      { Id: 1, Name: 'Test', VenueLocation: 'POINT(11.97 57.7)', DistanceMeters: 100 },
    ]);

    const req = createRequest({ latitude: '57.7', longitude: '11.97', radiusKm: '2.0' });
    const res = await GET(req);
    const body = await res.json();
    expect(body.meta).toBeDefined();
    expect(body.meta.count).toBe(1);
    expect(body.meta.radiusKm).toBe(2.0);
  });

  it('accepts lat/lng as param aliases', async () => {
    mockGetVenuesNearPoint.mockResolvedValue([]);
    const req = createRequest({ lat: '57.7', lng: '11.97' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockGetVenuesNearPoint).toHaveBeenCalledWith(57.7, 11.97, 1.5);
  });
});
