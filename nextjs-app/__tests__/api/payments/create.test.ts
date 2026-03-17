import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock supabase
const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock swish service
vi.mock('@/lib/services/swish', () => ({
  createPaymentRequest: vi.fn().mockResolvedValue({
    paymentId: 'mock-payment-123',
    paymentRequestToken: 'token-mock-payment-123',
  }),
  getSwishRedirectUrl: vi.fn().mockReturnValue('swish://paymentrequest?token=token-mock'),
  getSwishQrCode: vi.fn().mockReturnValue('data:image/svg+xml;base64,abc'),
}));

function createRequest(url: string, body: unknown) {
  return new NextRequest(new URL(url, 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost:3000' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/payments/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 if sessionId is missing', async () => {
    const { POST } = await import('@/app/api/payments/create/route');
    const request = createRequest('/api/payments/create', {});
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns alreadyPremium if user is already premium', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { is_premium: true, expires_at: new Date(Date.now() + 86400000).toISOString() },
          error: null,
        }),
      }),
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    const { POST } = await import('@/app/api/payments/create/route');
    const request = createRequest('/api/payments/create', { sessionId: 'test-session' });
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.alreadyPremium).toBe(true);
  });

  it('creates payment and returns response on success', async () => {
    // First call: select premium status (not found)
    const mockPremiumSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }),
    });

    // Second call: insert purchase
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'purchase-123', session_id: 'test-session', amount: 39 },
          error: null,
        }),
      }),
    });

    // Third call: update purchase with swish ID
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_premium_status') {
        return { select: mockPremiumSelect };
      }
      if (table === 'purchases') {
        callCount++;
        if (callCount === 1) {
          return { insert: mockInsert };
        }
        return { update: mockUpdate };
      }
      return {};
    });

    const { POST } = await import('@/app/api/payments/create/route');
    const request = createRequest('/api/payments/create', { sessionId: 'test-session' });
    const response = await POST(request);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.paymentId).toBe('mock-payment-123');
    expect(data.purchaseId).toBe('purchase-123');
    expect(data.swishUrl).toBeDefined();
    expect(data.qrCode).toBeDefined();
  });
});
