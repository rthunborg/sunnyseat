import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock venue service
const mockGetVenuesNearPoint = vi.fn();
vi.mock('@/lib/services/venue-service', () => ({
  getVenuesNearPoint: (...args: unknown[]) => mockGetVenuesNearPoint(...args),
}));

// Mock shadow calculation service
const mockCalculateVenueShadow = vi.fn();
vi.mock('@/lib/solar/shadow-calculation-service', () => ({
  calculateVenueShadow: (...args: unknown[]) => mockCalculateVenueShadow(...args),
}));

function createRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost'));
}

describe('GET /api/shadows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when lat is missing', async () => {
    const { GET } = await import('@/app/api/shadows/route');
    const res = await GET(createRequest('http://localhost/api/shadows?lng=11.97'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when lng is missing', async () => {
    const { GET } = await import('@/app/api/shadows/route');
    const res = await GET(createRequest('http://localhost/api/shadows?lat=57.7'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid latitude', async () => {
    const { GET } = await import('@/app/api/shadows/route');
    const res = await GET(createRequest('http://localhost/api/shadows?lat=999&lng=11.97'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for radius exceeding max', async () => {
    const { GET } = await import('@/app/api/shadows/route');
    const res = await GET(createRequest('http://localhost/api/shadows?lat=57.7&lng=11.97&radiusKm=5'));
    expect(res.status).toBe(400);
  });

  it('returns empty collection when zoom < 15', async () => {
    const { GET } = await import('@/app/api/shadows/route');
    const res = await GET(createRequest('http://localhost/api/shadows?lat=57.7&lng=11.97&zoom=12'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.shadows.features).toHaveLength(0);
  });

  it('returns empty collection when no venues found', async () => {
    mockGetVenuesNearPoint.mockResolvedValue([]);
    const { GET } = await import('@/app/api/shadows/route');
    const res = await GET(createRequest('http://localhost/api/shadows?lat=57.7&lng=11.97'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.shadows.features).toHaveLength(0);
    expect(data.meta.venuesProcessed).toBe(0);
  });

  it('returns shadow features for venues with shadows', async () => {
    mockGetVenuesNearPoint.mockResolvedValue([
      { Id: 1, Name: 'Test Venue' },
    ]);
    mockCalculateVenueShadow.mockResolvedValue({
      venueId: 1,
      shadowedAreaPercent: 40,
      sunlitAreaPercent: 60,
      castingShadows: [
        {
          geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
          buildingId: 10,
          buildingHeight: 15,
          confidence: 0.8,
          length: 20,
          direction: 180,
          solarPosition: {},
          timestamp: new Date(),
        },
      ],
      shadowedGeometry: null,
      sunlitGeometry: null,
      timestamp: new Date(),
      confidence: 0.8,
      solarPosition: { isSunVisible: true },
    });

    const { GET } = await import('@/app/api/shadows/route');
    const res = await GET(createRequest('http://localhost/api/shadows?lat=57.7&lng=11.97'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.shadows.features).toHaveLength(1);
    expect(data.shadows.features[0].properties.type).toBe('shadow');
    expect(data.shadows.features[0].properties.buildingId).toBe(10);
    expect(data.meta.venuesProcessed).toBe(1);
    expect(data.meta.shadowFeaturesCount).toBe(1);
  });

  it('handles shadow calculation failures gracefully', async () => {
    mockGetVenuesNearPoint.mockResolvedValue([
      { Id: 1, Name: 'Venue A' },
      { Id: 2, Name: 'Venue B' },
    ]);
    mockCalculateVenueShadow
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce({
        venueId: 2,
        castingShadows: [],
        shadowedAreaPercent: 0,
        sunlitAreaPercent: 100,
        shadowedGeometry: null,
        sunlitGeometry: null,
        timestamp: new Date(),
        confidence: 1,
        solarPosition: { isSunVisible: true },
      });

    const { GET } = await import('@/app/api/shadows/route');
    const res = await GET(createRequest('http://localhost/api/shadows?lat=57.7&lng=11.97'));
    expect(res.status).toBe(200);
    const data = await res.json();
    // Venue 1 failed, venue 2 returned 0 shadows
    expect(data.shadows.features).toHaveLength(0);
    expect(data.meta.venuesProcessed).toBe(2);
  });

  it('accepts timestamp parameter', async () => {
    mockGetVenuesNearPoint.mockResolvedValue([{ Id: 1 }]);
    mockCalculateVenueShadow.mockResolvedValue({
      venueId: 1,
      castingShadows: [],
      shadowedAreaPercent: 0,
      sunlitAreaPercent: 100,
      shadowedGeometry: null,
      sunlitGeometry: null,
      timestamp: new Date('2026-03-22T12:00:00Z'),
      confidence: 1,
      solarPosition: { isSunVisible: true },
    });

    const { GET } = await import('@/app/api/shadows/route');
    const res = await GET(
      createRequest('http://localhost/api/shadows?lat=57.7&lng=11.97&timestamp=2026-03-22T12:00:00Z'),
    );
    expect(res.status).toBe(200);
    expect(mockCalculateVenueShadow).toHaveBeenCalledWith(
      1,
      expect.any(Date),
    );
  });

  it('sets Cache-Control header', async () => {
    mockGetVenuesNearPoint.mockResolvedValue([]);
    const { GET } = await import('@/app/api/shadows/route');
    const res = await GET(createRequest('http://localhost/api/shadows?lat=57.7&lng=11.97'));
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=60');
  });
});
