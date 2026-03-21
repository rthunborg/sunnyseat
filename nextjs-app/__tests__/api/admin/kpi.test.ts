import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock admin auth - pass through
vi.mock('@/lib/middleware/admin-auth', () => ({
  withAdminAuth: (handler: (...args: unknown[]) => unknown) => {
    return (request: NextRequest, ...args: unknown[]) => {
      const fakeUser = { username: 'admin', role: 'Admin' };
      return handler(request, fakeUser, ...args);
    };
  },
}));

// Mock supabase
const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

function createRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost'), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('GET /api/admin/kpi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns KPI metrics with empty data', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'venues') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      if (table === 'feedback') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      if (table === 'purchases') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      if (table === 'user_premium_status') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const { GET } = await import('@/app/api/admin/kpi/route');
    const request = createRequest('http://localhost/api/admin/kpi');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.totalVenues).toBe(0);
    expect(data.verifiedVenues).toBe(0);
    expect(data.verificationRate).toBe(0);
    expect(data.totalFeedback).toBe(0);
    expect(data.accuracyRate).toBe(0);
    expect(data.totalPartners).toBe(0);
    expect(data.partnerClicks).toBe(0);
    expect(data.totalPurchases).toBe(0);
    expect(data.premiumUsers).toBe(0);
    expect(data.conversionRate).toBe(0);
    expect(data.weeklyTrend).toHaveLength(4);
  });

  it('returns correct metrics with venue data', async () => {
    const venues = [
      { Id: 1, VerificationStatus: 1, IsActive: true, CreatedAt: '2025-01-01', is_partner: true },
      { Id: 2, VerificationStatus: 0, IsActive: true, CreatedAt: '2025-01-02', is_partner: false },
      { Id: 3, VerificationStatus: 1, IsActive: true, CreatedAt: '2025-01-03', is_partner: true },
    ];

    const feedback = [
      { PredictedState: 'Sunny', WasSunny: true },
      { PredictedState: 'Sunny', WasSunny: false },
      { PredictedState: 'Cloudy', WasSunny: false },
      { PredictedState: 'Cloudy', WasSunny: true },
    ];

    const purchases = [
      { id: 'p1', status: 'completed', created_at: '2025-01-01' },
      { id: 'p2', status: 'pending', created_at: '2025-01-02' },
    ];

    const premiumUsers = [
      { session_id: 's1', is_premium: true },
      { session_id: 's2', is_premium: false },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'venues') {
        return {
          select: vi.fn().mockResolvedValue({ data: venues, error: null }),
        };
      }
      if (table === 'feedback') {
        return {
          select: vi.fn().mockResolvedValue({ data: feedback, error: null }),
        };
      }
      if (table === 'purchases') {
        return {
          select: vi.fn().mockResolvedValue({ data: purchases, error: null }),
        };
      }
      if (table === 'user_premium_status') {
        return {
          select: vi.fn().mockResolvedValue({ data: premiumUsers, error: null }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const { GET } = await import('@/app/api/admin/kpi/route');
    const request = createRequest('http://localhost/api/admin/kpi');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.totalVenues).toBe(3);
    expect(data.verifiedVenues).toBe(2);
    expect(data.verificationRate).toBe(66.67);
    expect(data.totalFeedback).toBe(4);
    expect(data.accuracyRate).toBe(50);
    expect(data.totalPartners).toBe(2);
    expect(data.totalPurchases).toBe(1);
    expect(data.premiumUsers).toBe(1);
    expect(data.weeklyTrend).toHaveLength(4);
  });

  it('handles database errors gracefully', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    }));

    const { GET } = await import('@/app/api/admin/kpi/route');
    const request = createRequest('http://localhost/api/admin/kpi');
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});
