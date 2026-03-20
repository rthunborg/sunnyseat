import { test, expect } from '@playwright/test';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Test123!';

/**
 * Remaining Admin API E2E Tests (Batch 3)
 *
 * Covers the last 4 untested admin endpoints:
 *   - GET /api/admin — admin root (whoami)
 *   - GET /api/admin/accuracy/venues/[id] — per-venue accuracy
 *   - POST /api/admin/osm/ingest — OSM ingestion trigger
 *   - POST /api/admin/venues/seed — seed dev venues
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
// GET /api/admin
// ============================================================================
test.describe('GET /api/admin', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/admin');
    expect(res.status()).toBe(401);
  });

  test('returns admin user info when authenticated', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const res = await request.get('/api/admin', {
      headers: authHeaders(token!),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('message', 'Admin API working');
    expect(body).toHaveProperty('user');
    expect(body.user).toHaveProperty('username');
    expect(body.user).toHaveProperty('role');
  });
});

// ============================================================================
// GET /api/admin/accuracy/venues/[id]
// ============================================================================
test.describe('GET /api/admin/accuracy/venues/[id]', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/admin/accuracy/venues/1');
    expect(res.status()).toBe(401);
  });

  test('returns venue accuracy data for valid venue', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    // Use venue ID 1 (from seed data)
    const res = await request.get('/api/admin/accuracy/venues/1', {
      headers: authHeaders(token!),
    });

    // Could be 200 (venue exists) or 404 (no venue with ID 1)
    expect([200, 404]).toContain(res.status());

    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('venueId');
      expect(body).toHaveProperty('venueName');
      expect(body).toHaveProperty('accuracyPercentage');
      expect(body).toHaveProperty('totalFeedback');
      expect(body).toHaveProperty('accurateCount');
      expect(body).toHaveProperty('feedback');
      expect(Array.isArray(body.feedback)).toBe(true);
      expect(typeof body.accuracyPercentage).toBe('number');
    }
  });

  test('returns 400 for non-numeric venue ID', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const res = await request.get('/api/admin/accuracy/venues/not-a-number', {
      headers: authHeaders(token!),
    });
    expect(res.status()).toBe(400);
  });

  test('returns 404 for nonexistent venue', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const res = await request.get('/api/admin/accuracy/venues/999999', {
      headers: authHeaders(token!),
    });
    expect(res.status()).toBe(404);
  });
});

// ============================================================================
// POST /api/admin/osm/ingest
// ============================================================================
test.describe('POST /api/admin/osm/ingest', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/admin/osm/ingest');
    expect(res.status()).toBe(401);
  });

  test('rejects unknown city', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const res = await request.post('/api/admin/osm/ingest', {
      headers: { ...authHeaders(token!), 'Content-Type': 'application/json' },
      data: { city: 'nonexistent-city-xyz' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.detail).toContain('Unknown city');
    expect(body.detail).toContain('gothenburg');
  });
});

// ============================================================================
// POST /api/admin/venues/seed
// ============================================================================
test.describe('POST /api/admin/venues/seed', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/admin/venues/seed');
    expect(res.status()).toBe(401);
  });

  test('seed endpoint is accessible with admin auth', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const res = await request.post('/api/admin/venues/seed', {
      headers: authHeaders(token!),
    });
    // Should return 200 (success — may have DB column mismatches in dev)
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('message');
    // Response has: { message, created, skipped, errors }
    expect(typeof body.created).toBe('number');
    expect(typeof body.skipped).toBe('number');
  });
});
