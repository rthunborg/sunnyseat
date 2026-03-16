import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
const mockRpc = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

// Mock sun exposure service
const mockCalculateSunExposure = vi.fn();
vi.mock('@/lib/solar/sun-exposure-service', () => ({
  calculateSunExposure: (...args: unknown[]) => mockCalculateSunExposure(...args),
}));

describe('GET /api/partners/sunny-now', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  function setupFromMock(data: unknown, error: unknown = null) {
    mockEq.mockReturnValue({
      data,
      error,
    });
    const eqFirst = vi.fn().mockReturnValue({ eq: mockEq });
    mockSelect.mockReturnValue({ eq: eqFirst });
    mockFrom.mockReturnValue({ select: mockSelect });
  }

  it('returns empty venues when no partners exist', async () => {
    setupFromMock([]);

    const { GET } = await import('@/app/api/partners/sunny-now/route');
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.venues).toEqual([]);
    expect(json.timestamp).toBeDefined();
    expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=300');
  });

  it('returns sunny partner venues with >50% exposure', async () => {
    const partners = [
      { Id: 1, Name: 'Café Husaren', Slug: 'cafe-husaren', patios: [{ Id: 10 }] },
      { Id: 2, Name: 'Bar Centro', Slug: 'bar-centro', patios: [{ Id: 20 }] },
    ];
    setupFromMock(partners);

    mockCalculateSunExposure
      .mockResolvedValueOnce({ state: 'Sunny', sunExposurePercent: 85, confidence: 0.9 })
      .mockResolvedValueOnce({ state: 'Shaded', sunExposurePercent: 20, confidence: 0.8 });

    const { GET } = await import('@/app/api/partners/sunny-now/route');
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.venues).toHaveLength(1);
    expect(json.venues[0]).toEqual({
      id: 1,
      name: 'Café Husaren',
      slug: 'cafe-husaren',
      sunStatus: 'Sunny',
      sunPercentage: 85,
    });
  });

  it('includes partial venues with >50% exposure', async () => {
    const partners = [
      { Id: 3, Name: 'Pustervik', Slug: 'pustervik', patios: [{ Id: 30 }] },
    ];
    setupFromMock(partners);

    mockCalculateSunExposure.mockResolvedValueOnce({
      state: 'Partial',
      sunExposurePercent: 55,
      confidence: 0.75,
    });

    const { GET } = await import('@/app/api/partners/sunny-now/route');
    const response = await GET();
    const json = await response.json();

    expect(json.venues).toHaveLength(1);
    expect(json.venues[0].sunStatus).toBe('Partial');
    expect(json.venues[0].sunPercentage).toBe(55);
  });

  it('excludes venues with <50% exposure', async () => {
    const partners = [
      { Id: 4, Name: 'Shady Bar', Slug: 'shady-bar', patios: [{ Id: 40 }] },
    ];
    setupFromMock(partners);

    mockCalculateSunExposure.mockResolvedValueOnce({
      state: 'Partial',
      sunExposurePercent: 40,
      confidence: 0.7,
    });

    const { GET } = await import('@/app/api/partners/sunny-now/route');
    const response = await GET();
    const json = await response.json();

    expect(json.venues).toHaveLength(0);
  });

  it('skips patios where calculation fails', async () => {
    const partners = [
      { Id: 5, Name: 'Error Café', Slug: 'error-cafe', patios: [{ Id: 50 }, { Id: 51 }] },
    ];
    setupFromMock(partners);

    mockCalculateSunExposure
      .mockRejectedValueOnce(new Error('calc failed'))
      .mockResolvedValueOnce({ state: 'Sunny', sunExposurePercent: 70, confidence: 0.85 });

    const { GET } = await import('@/app/api/partners/sunny-now/route');
    const response = await GET();
    const json = await response.json();

    expect(json.venues).toHaveLength(1);
    expect(json.venues[0].sunPercentage).toBe(70);
  });

  it('returns 500 on database error', async () => {
    mockEq.mockReturnValue({
      data: null,
      error: { message: 'DB connection failed' },
    });
    const eqFirst = vi.fn().mockReturnValue({ eq: mockEq });
    mockSelect.mockReturnValue({ eq: eqFirst });
    mockFrom.mockReturnValue({ select: mockSelect });

    const { GET } = await import('@/app/api/partners/sunny-now/route');
    const response = await GET();

    expect(response.status).toBe(500);
  });

  it('sets Cache-Control header to 5 minutes', async () => {
    setupFromMock([]);

    const { GET } = await import('@/app/api/partners/sunny-now/route');
    const response = await GET();

    expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=300');
  });
});
