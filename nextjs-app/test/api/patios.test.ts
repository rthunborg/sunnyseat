import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock patio-service
const mockGetPatiosNearPoint = vi.fn();
vi.mock('@/lib/services/patio-service', () => ({
  getPatiosNearPoint: (...args: unknown[]) => mockGetPatiosNearPoint(...args),
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
      patioId: 1,
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
    expect(body.detail).toContain('latitude');
  });

  it('returns 400 when longitude is missing', async () => {
    const req = createRequest({ latitude: '57.7' });
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.detail).toContain('longitude');
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

  it('returns empty array when no patios found', async () => {
    mockGetPatiosNearPoint.mockResolvedValue([]);
    const req = createRequest({ latitude: '57.7', longitude: '11.97' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.patios).toEqual([]);
    expect(body.totalCount).toBe(0);
  });

  it('returns patio data with sun exposure', async () => {
    mockGetPatiosNearPoint.mockResolvedValue([
      {
        Id: 1,
        VenueId: 10,
        VenueName: 'Café Husaren',
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
    expect(body.patios[0].currentSunStatus).toBe('Sunny');
    expect(body.totalCount).toBe(1);
  });

  it('uses default radius when radiusKm not provided', async () => {
    mockGetPatiosNearPoint.mockResolvedValue([]);
    const req = createRequest({ latitude: '57.7', longitude: '11.97' });
    await GET(req);
    expect(mockGetPatiosNearPoint).toHaveBeenCalledWith(57.7, 11.97, 1.5);
  });

  it('uses custom radiusKm when provided', async () => {
    mockGetPatiosNearPoint.mockResolvedValue([]);
    const req = createRequest({ latitude: '57.7', longitude: '11.97', radiusKm: '2.0' });
    await GET(req);
    expect(mockGetPatiosNearPoint).toHaveBeenCalledWith(57.7, 11.97, 2.0);
  });

  it('gracefully degrades when sun exposure calculation fails', async () => {
    mockGetPatiosNearPoint.mockResolvedValue([
      {
        Id: 1,
        VenueId: 10,
        VenueName: 'Test Venue',
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

  it('sorts patios by distance', async () => {
    mockGetPatiosNearPoint.mockResolvedValue([
      { Id: 1, VenueId: 10, VenueName: 'Far', VenueLocation: 'POINT(11.97 57.7)', DistanceMeters: 500 },
      { Id: 2, VenueId: 20, VenueName: 'Near', VenueLocation: 'POINT(11.97 57.7)', DistanceMeters: 100 },
    ]);

    const req = createRequest({ latitude: '57.7', longitude: '11.97' });
    const res = await GET(req);
    const body = await res.json();
    expect(body.patios[0].distanceMeters).toBe(100);
    expect(body.patios[1].distanceMeters).toBe(500);
  });
});
