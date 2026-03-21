import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock supabase
const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

function createRequest(method: string, url: string, headers?: Record<string, string>) {
  return new NextRequest(new URL(url, 'http://localhost'), {
    method,
    headers: {
      'x-forwarded-for': '127.0.0.1',
      'user-agent': 'test-agent',
      ...headers,
    },
  });
}

describe('POST /api/venues/[id]/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 404 if venue does not exist', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
      }),
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    const { POST } = await import('@/app/api/venues/[id]/confirm/route');
    const request = createRequest('POST', 'http://localhost/api/venues/nonexistent/confirm');
    const response = await POST(request, { params: Promise.resolve({ id: 'nonexistent' }) });

    expect(response.status).toBe(404);
  });

  it('submits a confirmation successfully', async () => {
    // Mock venue lookup
    const mockVenueSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { Id: 'venue-1', VerificationStatus: 0 },
          error: null,
        }),
      }),
    });

    // Mock upsert
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });

    // Mock count
    const mockCountSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
    });

    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'venues') {
        return { select: mockVenueSelect };
      }
      if (table === 'venue_confirmations') {
        callCount++;
        if (callCount === 1) {
          return { upsert: mockUpsert };
        }
        return { select: mockCountSelect };
      }
      return {};
    });

    const { POST } = await import('@/app/api/venues/[id]/confirm/route');
    const request = createRequest('POST', 'http://localhost/api/venues/venue-1/confirm');
    const response = await POST(request, { params: Promise.resolve({ id: 'venue-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.confirmed).toBe(true);
    expect(data.totalConfirmations).toBe(1);
    expect(data.isVerified).toBe(false);
  });

  it('auto-verifies venue at 3+ confirmations', async () => {
    const mockVenueSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { Id: 'venue-2', VerificationStatus: 0 },
          error: null,
        }),
      }),
    });

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });

    const mockCountSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
    });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    let confirmCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'venues') {
        // First call is select, subsequent calls for update
        if (!mockVenueSelect.mock.calls.length || confirmCallCount > 0) {
          return { select: mockVenueSelect, update: mockUpdate };
        }
        return { select: mockVenueSelect, update: mockUpdate };
      }
      if (table === 'venue_confirmations') {
        confirmCallCount++;
        if (confirmCallCount === 1) {
          return { upsert: mockUpsert };
        }
        return { select: mockCountSelect };
      }
      return {};
    });

    const { POST } = await import('@/app/api/venues/[id]/confirm/route');
    const request = createRequest('POST', 'http://localhost/api/venues/venue-2/confirm');
    const response = await POST(request, { params: Promise.resolve({ id: 'venue-2' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.confirmed).toBe(true);
    expect(data.totalConfirmations).toBe(3);
    expect(data.isVerified).toBe(true);
  });

  it('hashes IP from x-forwarded-for header', async () => {
    const mockVenueSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { Id: 'venue-3', VerificationStatus: 0 },
          error: null,
        }),
      }),
    });

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockCountSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
    });

    let confirmCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'venues') {
        return { select: mockVenueSelect };
      }
      if (table === 'venue_confirmations') {
        confirmCallCount++;
        if (confirmCallCount === 1) return { upsert: mockUpsert };
        return { select: mockCountSelect };
      }
      return {};
    });

    const { POST } = await import('@/app/api/venues/[id]/confirm/route');
    const request = createRequest('POST', 'http://localhost/api/venues/venue-3/confirm', {
      'x-forwarded-for': '192.168.1.1, 10.0.0.1',
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'venue-3' }) });

    expect(response.status).toBe(200);

    // Verify upsert was called with a hashed IP (not raw IP)
    const upsertCallArgs = mockUpsert.mock.calls[0];
    expect(upsertCallArgs[0].IpHash).toBeDefined();
    expect(upsertCallArgs[0].IpHash).not.toBe('192.168.1.1');
    expect(upsertCallArgs[0].IpHash).toHaveLength(64); // SHA-256 hex length
  });
});

describe('GET /api/venues/[id]/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns confirmation count for a venue', async () => {
    const mockCountSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ count: 2, error: null }),
    });

    const mockVenueSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { VerificationStatus: 0 },
          error: null,
        }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'venue_confirmations') {
        return { select: mockCountSelect };
      }
      if (table === 'venues') {
        return { select: mockVenueSelect };
      }
      return {};
    });

    const { GET } = await import('@/app/api/venues/[id]/confirm/route');
    const request = createRequest('GET', 'http://localhost/api/venues/venue-1/confirm');
    const response = await GET(request, { params: Promise.resolve({ id: 'venue-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.totalConfirmations).toBe(2);
    expect(data.isVerified).toBe(false);
  });
});
