import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseGeoJson, validateGeoJson, type GeoJsonCollection } from '@/lib/buildings/import-geojson';

// Mock supabase before importing routes
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
      const user = { userId: 1, username: 'admin', email: 'admin@test.com', role: 'Admin', claims: [] };
      return handler(request, user, ...args);
    };
  },
}));

vi.mock('@/lib/middleware/auth', () => ({
  verifyAuthToken: () => ({ userId: 1, username: 'admin', email: 'admin@test.com', role: 'Admin', claims: [] }),
}));

describe('GET /api/admin/buildings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns paginated buildings', async () => {
    const buildings = [
      { Id: 1, Height: 10, HeightM: 10, Source: 'import', QualityScore: 0.7 },
      { Id: 2, Height: 15, HeightM: 15, Source: 'import', QualityScore: 0.8 },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'buildings') {
        return {
          select: vi.fn().mockImplementation((sel: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return Promise.resolve({ count: 2, error: null });
            }
            return {
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({ data: buildings, error: null }),
              }),
            };
          }),
        };
      }
      return {};
    });

    const { GET } = await import('@/app/api/admin/buildings/route');
    const request = new Request('http://localhost/api/admin/buildings?page=1&limit=20');
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.buildings).toHaveLength(2);
    expect(data.total).toBe(2);
    expect(data.page).toBe(1);
  });
});

describe('GET /api/admin/buildings/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns building statistics', async () => {
    const buildings = [
      { Id: 1, Height: '10.00', HeightM: 10, AdminHeightOverride: null },
      { Id: 2, Height: '20.00', HeightM: 20, AdminHeightOverride: null },
      { Id: 3, Height: '0.00', HeightM: null, AdminHeightOverride: null },
    ];

    mockFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: buildings, error: null }),
    });

    const { GET } = await import('@/app/api/admin/buildings/stats/route');
    const request = new Request('http://localhost/api/admin/buildings/stats');
    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.totalBuildings).toBe(3);
    expect(data.withHeight).toBe(2);
    expect(data.withoutHeight).toBe(1);
    expect(data.avgHeight).toBe(15);
    expect(data.heightBuckets).toBeDefined();
    expect(Array.isArray(data.heightBuckets)).toBe(true);
  });
});

describe('GeoJSON import parsing', () => {
  it('parses valid polygon features', () => {
    const geojson: GeoJsonCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[11.97, 57.70], [11.98, 57.70], [11.98, 57.71], [11.97, 57.71], [11.97, 57.70]]],
          },
          properties: { height: 12, building: 'residential' },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[11.97, 57.70], [11.98, 57.70], [11.98, 57.71], [11.97, 57.71], [11.97, 57.70]]],
          },
          properties: { height: 8 },
        },
      ],
    };

    const result = parseGeoJson(geojson, 'admin');
    expect(result.rows).toHaveLength(2);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0].Height).toBe(12);
    expect(result.rows[0].BuildingType).toBe('residential');
    expect(result.rows[0].HeightSource).toBe(1);
    expect(result.rows[0].UpdatedBy).toBe('admin');
    expect(result.rows[1].Height).toBe(8);
  });

  it('skips non-Polygon features', () => {
    const geojson: GeoJsonCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [[11.97, 57.70]] as unknown as number[][][] },
          properties: {},
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[11.97, 57.70], [11.98, 57.70], [11.98, 57.71], [11.97, 57.71], [11.97, 57.70]]],
          },
          properties: { height: 5 },
        },
      ],
    };

    const result = parseGeoJson(geojson, 'admin');
    expect(result.rows).toHaveLength(1);
    expect(result.skipped).toBe(1);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Not a Polygon');
  });

  it('handles features without height', () => {
    const geojson: GeoJsonCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[11.97, 57.70], [11.98, 57.70], [11.98, 57.71], [11.97, 57.71], [11.97, 57.70]]],
          },
          properties: {},
        },
      ],
    };

    const result = parseGeoJson(geojson, 'admin');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].Height).toBe(0);
    expect(result.rows[0].HeightM).toBeNull();
    expect(result.rows[0].HeightSource).toBe(0);
    expect(result.rows[0].QualityScore).toBe(0.3);
  });

  it('generates WKT geometry', () => {
    const geojson: GeoJsonCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[1.0, 2.0], [3.0, 4.0], [5.0, 6.0], [1.0, 2.0]]],
          },
          properties: {},
        },
      ],
    };

    const result = parseGeoJson(geojson, 'admin');
    expect(result.rows[0].Geometry).toBe('SRID=4326;POLYGON((1 2, 3 4, 5 6, 1 2))');
  });

  it('validates FeatureCollection type', () => {
    expect(validateGeoJson({ type: 'FeatureCollection', features: [] })).toBe(true);
    expect(validateGeoJson({ type: 'Feature', geometry: {} })).toBe(false);
    expect(validateGeoJson(null)).toBe(false);
    expect(validateGeoJson(undefined)).toBe(false);
    expect(validateGeoJson({ type: 'FeatureCollection' })).toBe(false);
  });

  it('extracts external IDs', () => {
    const geojson: GeoJsonCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[11.97, 57.70], [11.98, 57.70], [11.98, 57.71], [11.97, 57.71], [11.97, 57.70]]],
          },
          properties: { osm_id: '12345' },
        },
      ],
    };

    const result = parseGeoJson(geojson, 'admin');
    expect(result.rows[0].ExternalId).toBe('12345');
  });
});

describe('PUT /api/admin/buildings/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('updates building height override', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { Id: 1, Height: 10, AdminHeightOverride: 25 },
            error: null,
          }),
        }),
      }),
    });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const { PUT } = await import('@/app/api/admin/buildings/[id]/route');
    const request = new Request('http://localhost/api/admin/buildings/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ height: 25 }),
    });

    const context = { params: Promise.resolve({ id: '1' }) };
    const response = await PUT(request, context);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.AdminHeightOverride).toBe(25);
  });

  it('rejects negative height', async () => {
    const { PUT } = await import('@/app/api/admin/buildings/[id]/route');
    const request = new Request('http://localhost/api/admin/buildings/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ height: -5 }),
    });

    const context = { params: Promise.resolve({ id: '1' }) };
    const response = await PUT(request, context);
    expect(response.status).toBe(400);
  });

  it('rejects empty update', async () => {
    const { PUT } = await import('@/app/api/admin/buildings/[id]/route');
    const request = new Request('http://localhost/api/admin/buildings/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const context = { params: Promise.resolve({ id: '1' }) };
    const response = await PUT(request, context);
    expect(response.status).toBe(400);
  });
});

describe('DELETE /api/admin/buildings/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('deletes a building', async () => {
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const { DELETE } = await import('@/app/api/admin/buildings/[id]/route');
    const request = new Request('http://localhost/api/admin/buildings/1', { method: 'DELETE' });
    const context = { params: Promise.resolve({ id: '1' }) };
    const response = await DELETE(request, context);
    expect(response.status).toBe(200);
  });
});

describe('GET /api/admin/buildings/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns a single building', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { Id: 1, Height: 10, Source: 'import' },
            error: null,
          }),
        }),
      }),
    });

    const { GET } = await import('@/app/api/admin/buildings/[id]/route');
    const request = new Request('http://localhost/api/admin/buildings/1');
    const context = { params: Promise.resolve({ id: '1' }) };
    const response = await GET(request, context);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.Id).toBe(1);
  });

  it('returns 404 for non-existent building', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'not found' },
          }),
        }),
      }),
    });

    const { GET } = await import('@/app/api/admin/buildings/[id]/route');
    const request = new Request('http://localhost/api/admin/buildings/999');
    const context = { params: Promise.resolve({ id: '999' }) };
    const response = await GET(request, context);
    expect(response.status).toBe(404);
  });
});
