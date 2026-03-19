import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock supabase
const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock sun-exposure-service
const mockCalculateSunExposure = vi.fn();
vi.mock('@/lib/solar/sun-exposure-service', () => ({
  calculateSunExposure: (...args: unknown[]) => mockCalculateSunExposure(...args),
}));

import { GET } from '@/app/api/sun-exposure/patio/[id]/route';

function createRequest(id: string, params: Record<string, string> = {}): {
  request: NextRequest;
  context: { params: Promise<{ id: string }> };
} {
  const url = new URL(`http://localhost:3000/api/sun-exposure/patio/${id}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return {
    request: new NextRequest(url),
    context: { params: Promise.resolve({ id }) },
  };
}

describe('GET /api/sun-exposure/patio/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for non-numeric venue ID', async () => {
    const { request, context } = createRequest('abc');
    const res = await GET(request, context);
    expect(res.status).toBe(400);
  });

  it('returns 404 when venue not found in database', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });
    const { request, context } = createRequest('999');
    const res = await GET(request, context);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('not found');
  });

  it('returns sun exposure data for valid venue', async () => {
    mockSingle.mockResolvedValue({ data: { Id: 1 }, error: null });
    mockCalculateSunExposure.mockResolvedValue({
      venueId: 1,
      timestamp: new Date('2026-03-15T12:00:00Z'),
      state: 'Sunny',
      sunExposurePercent: 85,
      confidence: 0.9,
      solarElevation: 35.2,
      solarAzimuth: 180.5,
      weatherData: {
        cloudCover: 10,
        temperature: 14,
        visibility: 10000,
        source: 'met.no',
        isForecast: false,
      },
    });

    const { request, context } = createRequest('1');
    const res = await GET(request, context);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.venueId).toBe(1);
    expect(body.state).toBe('Sunny');
    expect(body.sunExposurePercent).toBe(85);
    expect(body.confidence).toBe(0.9);
    expect(body.weatherData.cloudCover).toBe(10);
  });

  it('returns 200 without weather data when unavailable', async () => {
    mockSingle.mockResolvedValue({ data: { Id: 2 }, error: null });
    mockCalculateSunExposure.mockResolvedValue({
      venueId: 2,
      timestamp: new Date('2026-03-15T12:00:00Z'),
      state: 'Shaded',
      sunExposurePercent: 0,
      confidence: 0.5,
      solarElevation: 10,
      solarAzimuth: 90,
      weatherData: undefined,
    });

    const { request, context } = createRequest('2');
    const res = await GET(request, context);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.weatherData).toBeUndefined();
  });

  it('returns 500 when sun exposure calculation throws', async () => {
    mockSingle.mockResolvedValue({ data: { Id: 1 }, error: null });
    mockCalculateSunExposure.mockRejectedValue(new Error('Calculation failed'));

    const { request, context } = createRequest('1');
    const res = await GET(request, context);
    expect(res.status).toBe(500);
  });

  it('verifies correct supabase query for venue lookup', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });
    const { request, context } = createRequest('42');
    await GET(request, context);
    expect(mockFrom).toHaveBeenCalledWith('venues');
    expect(mockSelect).toHaveBeenCalledWith('Id');
    expect(mockEq).toHaveBeenCalledWith('Id', 42);
  });
});
