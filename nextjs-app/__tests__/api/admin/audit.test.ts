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

function createRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(new URL(url, 'http://localhost'), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('POST /api/admin/audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('creates an audit entry successfully', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            Id: 'audit-1',
            AdminUser: 'admin',
            Action: 'verify_venue',
            VenueId: 'v-1',
            Details: {},
            CreatedAt: '2026-01-01T00:00:00Z',
          },
          error: null,
        }),
      }),
    });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const { POST } = await import('@/app/api/admin/audit/route');
    const request = createRequest('POST', 'http://localhost/api/admin/audit', {
      admin_user: 'admin',
      action: 'verify_venue',
      venue_id: 'v-1',
      details: {},
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.AdminUser).toBe('admin');
    expect(data.Action).toBe('verify_venue');
  });

  it('returns 400 if admin_user or action is missing', async () => {
    const { POST } = await import('@/app/api/admin/audit/route');
    const request = createRequest('POST', 'http://localhost/api/admin/audit', {
      admin_user: 'admin',
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    const { POST } = await import('@/app/api/admin/audit/route');
    const request = new NextRequest(
      new URL('http://localhost/api/admin/audit'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      }
    );
    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});

describe('GET /api/admin/audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns audit entries', async () => {
    const entries = [
      { Id: 'a-1', AdminUser: 'admin', Action: 'verify_venue', VenueId: 'v-1' },
      { Id: 'a-2', AdminUser: 'admin', Action: 'edit_coordinates', VenueId: 'v-2' },
    ];
    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: entries, error: null }),
      }),
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    const { GET } = await import('@/app/api/admin/audit/route');
    const request = createRequest('GET', 'http://localhost/api/admin/audit');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveLength(2);
  });

  it('filters by venue_id', async () => {
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      }),
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    const { GET } = await import('@/app/api/admin/audit/route');
    const request = createRequest('GET', 'http://localhost/api/admin/audit?venue_id=v-1');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockEq).toHaveBeenCalledWith('VenueId', 'v-1');
  });
});
