import { test, expect } from '@playwright/test';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Test123!';

/**
 * Admin Buildings API E2E Tests
 *
 * Tests the building management endpoints:
 *   - GET /api/admin/buildings — list buildings
 *   - GET /api/admin/buildings/stats — height statistics
 *   - GET /api/admin/buildings/[id] — get single building
 *   - PUT /api/admin/buildings/[id] — update building
 *   - POST /api/admin/buildings/import — GeoJSON import
 *
 * All endpoints require admin auth (withAdminAuth middleware).
 */
test.describe.configure({ mode: 'serial' });

let adminToken: string | null = null;

async function getAdminToken(request: import('@playwright/test').APIRequestContext) {
  if (adminToken) return adminToken;
  const res = await request.post('/api/auth/login', {
    data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
  });
  if (!res.ok()) return null;
  const body = await res.json();
  adminToken = body.accessToken;
  return adminToken;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ============================================================================
// Auth guard tests (all endpoints should reject unauthenticated requests)
// ============================================================================
test.describe('Buildings API — Auth Guards', () => {
  test('GET /api/admin/buildings without token returns 401', async ({ request }) => {
    const res = await request.get('/api/admin/buildings');
    expect(res.status()).toBe(401);
  });

  test('GET /api/admin/buildings/stats without token returns 401', async ({ request }) => {
    const res = await request.get('/api/admin/buildings/stats');
    expect(res.status()).toBe(401);
  });

  test('GET /api/admin/buildings/1 without token returns 401', async ({ request }) => {
    const res = await request.get('/api/admin/buildings/1');
    expect(res.status()).toBe(401);
  });

  test('POST /api/admin/buildings/import without token returns 401', async ({ request }) => {
    const res = await request.post('/api/admin/buildings/import');
    expect(res.status()).toBe(401);
  });
});

// ============================================================================
// GET /api/admin/buildings
// ============================================================================
test.describe('GET /api/admin/buildings', () => {
  test('returns paginated building list', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const res = await request.get('/api/admin/buildings', {
      headers: authHeaders(token!),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('buildings');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('page');
    expect(body).toHaveProperty('limit');
    expect(Array.isArray(body.buildings)).toBe(true);
    expect(typeof body.total).toBe('number');
    expect(body.page).toBe(1);
    expect(body.limit).toBe(50);
  });

  test('supports custom page and limit params', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const res = await request.get('/api/admin/buildings?page=1&limit=5', {
      headers: authHeaders(token!),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.page).toBe(1);
    expect(body.limit).toBe(5);
    expect(body.buildings.length).toBeLessThanOrEqual(5);
  });

  test('limit is capped at 100', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const res = await request.get('/api/admin/buildings?limit=500', {
      headers: authHeaders(token!),
    });
    const body = await res.json();
    expect(body.limit).toBe(100);
  });
});

// ============================================================================
// GET /api/admin/buildings/stats
// ============================================================================
test.describe('GET /api/admin/buildings/stats', () => {
  test('returns building height statistics', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const res = await request.get('/api/admin/buildings/stats', {
      headers: authHeaders(token!),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('totalBuildings');
    expect(body).toHaveProperty('avgHeight');
    expect(body).toHaveProperty('withHeight');
    expect(body).toHaveProperty('withoutHeight');
    expect(body).toHaveProperty('heightBuckets');

    expect(typeof body.totalBuildings).toBe('number');
    expect(typeof body.avgHeight).toBe('number');
    expect(Array.isArray(body.heightBuckets)).toBe(true);

    // Height buckets should have the standard ranges
    if (body.heightBuckets.length > 0) {
      expect(body.heightBuckets[0]).toHaveProperty('range');
      expect(body.heightBuckets[0]).toHaveProperty('count');
    }
  });
});

// ============================================================================
// GET /api/admin/buildings/[id]
// ============================================================================
test.describe('GET /api/admin/buildings/[id]', () => {
  test('returns a building by ID', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    // First get a list to find a valid ID
    const listRes = await request.get('/api/admin/buildings?limit=1', {
      headers: authHeaders(token!),
    });
    const listBody = await listRes.json();

    if (listBody.buildings.length === 0) {
      test.skip(true, 'No buildings in database');
      return;
    }

    const buildingId = listBody.buildings[0].Id;
    const res = await request.get(`/api/admin/buildings/${buildingId}`, {
      headers: authHeaders(token!),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('Id', buildingId);
  });

  test('nonexistent building returns 404', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const res = await request.get('/api/admin/buildings/999999', {
      headers: authHeaders(token!),
    });
    expect(res.status()).toBe(404);
  });
});

// ============================================================================
// POST /api/admin/buildings/import
// ============================================================================
test.describe('POST /api/admin/buildings/import', () => {
  test('rejects request without file', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const res = await request.post('/api/admin/buildings/import', {
      headers: authHeaders(token!),
      multipart: {
        // Empty multipart — no file
      },
    });
    expect(res.status()).toBe(400);
  });

  test('rejects non-GeoJSON file extension', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const res = await request.post('/api/admin/buildings/import', {
      headers: authHeaders(token!),
      multipart: {
        file: {
          name: 'buildings.csv',
          mimeType: 'text/csv',
          buffer: Buffer.from('not,a,geojson,file'),
        },
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.detail).toContain('.geojson');
  });

  test('rejects invalid JSON content', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const res = await request.post('/api/admin/buildings/import', {
      headers: authHeaders(token!),
      multipart: {
        file: {
          name: 'buildings.geojson',
          mimeType: 'application/json',
          buffer: Buffer.from('not valid json {{{'),
        },
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.detail).toContain('Invalid JSON');
  });

  test('rejects non-FeatureCollection GeoJSON', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const validJsonNotFC = JSON.stringify({ type: 'Point', coordinates: [0, 0] });
    const res = await request.post('/api/admin/buildings/import', {
      headers: authHeaders(token!),
      multipart: {
        file: {
          name: 'buildings.geojson',
          mimeType: 'application/json',
          buffer: Buffer.from(validJsonNotFC),
        },
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.detail).toContain('FeatureCollection');
  });
});
