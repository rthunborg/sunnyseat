import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock supabase before importing route
const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock admin auth to pass through
vi.mock('@/lib/middleware/admin-auth', () => ({
  withAdminAuth: (handler: (...args: unknown[]) => unknown) => {
    return async (request: Request, ...args: unknown[]) => {
      const user = { id: 'test', email: 'admin@test.com', role: 'Admin' };
      return handler(request, user, ...args);
    };
  },
}));

vi.mock('@/lib/middleware/auth', () => ({
  verifyAuthToken: () => ({ id: 'test', email: 'admin@test.com', role: 'Admin' }),
}));

describe('PUT /api/admin/venues/[id]/patios/[patioId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates a patio via PUT with PascalCase columns', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { Id: 'p1', Name: 'Updated', VenueId: 'v1', Geometry: null, HeightSource: null, PolygonQuality: null, Orientation: null, Notes: null, ReviewNeeded: false },
              error: null,
            }),
          }),
        }),
      }),
    });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const { PUT } = await import(
      '@/app/api/admin/venues/[id]/patios/[patioId]/route'
    );

    const request = new NextRequest(new URL('http://localhost/api/admin/venues/v1/patios/p1'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });

    const context = { params: Promise.resolve({ id: 'v1', patioId: 'p1' }) };
    const response = await PUT(request, context);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.name).toBe('Updated');

    // Verify PascalCase column was used in the update
    expect(mockUpdate).toHaveBeenCalledWith({ Name: 'Updated' });
  });

  it('rejects empty update', async () => {
    const { PUT } = await import(
      '@/app/api/admin/venues/[id]/patios/[patioId]/route'
    );

    const request = new NextRequest(new URL('http://localhost/api/admin/venues/v1/patios/p1'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const context = { params: Promise.resolve({ id: 'v1', patioId: 'p1' }) };
    const response = await PUT(request, context);
    expect(response.status).toBe(400);
  });

  it('deletes a patio', async () => {
    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    mockFrom.mockReturnValue({ delete: mockDelete });

    const { DELETE } = await import(
      '@/app/api/admin/venues/[id]/patios/[patioId]/route'
    );

    const request = new NextRequest(new URL('http://localhost/api/admin/venues/v1/patios/p1'), {
      method: 'DELETE',
    });

    const context = { params: Promise.resolve({ id: 'v1', patioId: 'p1' }) };
    const response = await DELETE(request, context);
    expect(response.status).toBe(200);
  });

  it('maps geometry to PascalCase Geometry column', async () => {
    const testGeometry = {
      type: 'Polygon',
      coordinates: [[[11.9, 57.7], [11.91, 57.7], [11.91, 57.71], [11.9, 57.7]]],
    };

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { Id: 'p1', Name: 'Test', VenueId: 'v1', Geometry: testGeometry, HeightSource: null, PolygonQuality: null, Orientation: null, Notes: null, ReviewNeeded: false },
              error: null,
            }),
          }),
        }),
      }),
    });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const { PUT } = await import(
      '@/app/api/admin/venues/[id]/patios/[patioId]/route'
    );

    const request = new NextRequest(new URL('http://localhost/api/admin/venues/v1/patios/p1'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geometry: testGeometry }),
    });

    const context = { params: Promise.resolve({ id: 'v1', patioId: 'p1' }) };
    const response = await PUT(request, context);
    expect(response.status).toBe(200);

    // Verify PascalCase column names used
    expect(mockUpdate).toHaveBeenCalledWith({ Geometry: testGeometry });
  });
});
