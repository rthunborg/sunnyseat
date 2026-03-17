import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

function createRequest(url: string, body: unknown) {
  return new NextRequest(new URL(url, 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/payments/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid payload', async () => {
    const { POST } = await import('@/app/api/payments/callback/route');
    const request = createRequest('/api/payments/callback', {});
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 404 if purchase not found', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }),
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    const { POST } = await import('@/app/api/payments/callback/route');
    const request = createRequest('/api/payments/callback', { id: 'swish-unknown', status: 'PAID' });
    const response = await POST(request);
    expect(response.status).toBe(404);
  });

  it('activates premium on PAID status', async () => {
    const mockPurchaseSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'purchase-1', session_id: 'sess-1', status: 'pending' },
          error: null,
        }),
      }),
    });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'purchases') {
        return {
          select: mockPurchaseSelect,
          update: mockUpdate,
        };
      }
      if (table === 'user_premium_status') {
        return { upsert: mockUpsert };
      }
      return {};
    });

    const { POST } = await import('@/app/api/payments/callback/route');
    const request = createRequest('/api/payments/callback', {
      id: 'swish-payment-1',
      status: 'PAID',
      payeePaymentReference: 'purchase-1',
      amount: 39,
      currency: 'SEK',
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.ok).toBe(true);
  });

  it('marks purchase as failed on DECLINED', async () => {
    const mockPurchaseSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'purchase-2', session_id: 'sess-2', status: 'pending' },
          error: null,
        }),
      }),
    });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'purchases') {
        return { select: mockPurchaseSelect, update: mockUpdate };
      }
      return {};
    });

    const { POST } = await import('@/app/api/payments/callback/route');
    const request = createRequest('/api/payments/callback', { id: 'swish-payment-2', status: 'DECLINED' });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it('skips re-processing already paid purchase', async () => {
    const mockPurchaseSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'purchase-3', session_id: 'sess-3', status: 'paid' },
          error: null,
        }),
      }),
    });

    mockFrom.mockReturnValue({ select: mockPurchaseSelect });

    const { POST } = await import('@/app/api/payments/callback/route');
    const request = createRequest('/api/payments/callback', { id: 'swish-payment-3', status: 'PAID' });
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
  });
});
