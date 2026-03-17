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

describe('PUT /api/admin/venues/[id] — VerificationStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('allows updating VerificationStatus to 1 (verified)', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'v-1', VerificationStatus: 1 },
            error: null,
          }),
        }),
      }),
    });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const { PUT } = await import('@/app/api/admin/venues/[id]/route');
    const request = createRequest('PUT', 'http://localhost/api/admin/venues/v-1', {
      VerificationStatus: 1,
    });
    const response = await PUT(request, {
      params: Promise.resolve({ id: 'v-1' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.VerificationStatus).toBe(1);
  });

  it('allows updating VerificationStatus to 0 (candidate)', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'v-2', VerificationStatus: 0 },
            error: null,
          }),
        }),
      }),
    });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const { PUT } = await import('@/app/api/admin/venues/[id]/route');
    const request = createRequest('PUT', 'http://localhost/api/admin/venues/v-2', {
      VerificationStatus: 0,
    });
    const response = await PUT(request, {
      params: Promise.resolve({ id: 'v-2' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.VerificationStatus).toBe(0);
  });

  it('rejects empty update body', async () => {
    const { PUT } = await import('@/app/api/admin/venues/[id]/route');
    const request = createRequest('PUT', 'http://localhost/api/admin/venues/v-3', {
      unknown_field: 'test',
    });
    const response = await PUT(request, {
      params: Promise.resolve({ id: 'v-3' }),
    });

    expect(response.status).toBe(400);
  });
});
