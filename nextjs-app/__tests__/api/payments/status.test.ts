import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe('GET /api/payments/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 if sessionId is missing', async () => {
    const { GET } = await import('@/app/api/payments/status/route');

    const request = new Request('http://localhost/api/payments/status', {
      method: 'GET',
    });

    const response = await GET(request as any);
    expect(response.status).toBe(400);
  });

  it('returns isPremium false if no record exists', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }),
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    const { GET } = await import('@/app/api/payments/status/route');

    const request = new Request(
      'http://localhost/api/payments/status?sessionId=unknown-session',
      { method: 'GET' }
    );

    const response = await GET(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.isPremium).toBe(false);
    expect(data.sessionId).toBe('unknown-session');
  });

  it('returns isPremium true for active premium', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            session_id: 'premium-session',
            is_premium: true,
            purchase_id: 'p-1',
            activated_at: new Date().toISOString(),
            expires_at: futureDate,
          },
          error: null,
        }),
      }),
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    const { GET } = await import('@/app/api/payments/status/route');

    const request = new Request(
      'http://localhost/api/payments/status?sessionId=premium-session',
      { method: 'GET' }
    );

    const response = await GET(request as any);
    const data = await response.json();
    expect(data.isPremium).toBe(true);
    expect(data.purchaseId).toBe('p-1');
  });

  it('returns isPremium false for expired premium', async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            session_id: 'expired-session',
            is_premium: true,
            purchase_id: 'p-2',
            activated_at: new Date().toISOString(),
            expires_at: pastDate,
          },
          error: null,
        }),
      }),
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    const { GET } = await import('@/app/api/payments/status/route');

    const request = new Request(
      'http://localhost/api/payments/status?sessionId=expired-session',
      { method: 'GET' }
    );

    const response = await GET(request as any);
    const data = await response.json();
    expect(data.isPremium).toBe(false);
  });
});
