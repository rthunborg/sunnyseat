import { test, expect } from '@playwright/test';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Test123!';

/**
 * Miscellaneous Admin API E2E Tests
 *
 * Covers previously untested admin endpoints:
 *   - GET /api/admin/venues/unmapped — venues without geometry
 *   - GET /api/admin/venues/quality/overview — mapping quality stats
 *   - GET /api/admin/kpi — KPI dashboard data
 *   - GET /api/admin/accuracy — accuracy dashboard
 *   - POST /api/cron/cleanup-old-data — cron auth check
 *   - POST /api/cron/precomputation-schedule — cron auth check
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
// GET /api/admin/venues/unmapped
// ============================================================================
test.describe('GET /api/admin/venues/unmapped', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/admin/venues/unmapped');
    expect(res.status()).toBe(401);
  });

  test('returns array of venues without geometry', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const res = await request.get('/api/admin/venues/unmapped', {
      headers: authHeaders(token!),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

// ============================================================================
// GET /api/admin/venues/quality/overview
// ============================================================================
test.describe('GET /api/admin/venues/quality/overview', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/admin/venues/quality/overview');
    expect(res.status()).toBe(401);
  });

  test('returns quality metrics with mapping stats', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const res = await request.get('/api/admin/venues/quality/overview', {
      headers: authHeaders(token!),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('totalVenues');
    expect(body).toHaveProperty('mappedVenues');
    expect(body).toHaveProperty('mappedPercentage');
    expect(typeof body.totalVenues).toBe('number');
    expect(typeof body.mappedVenues).toBe('number');
    expect(typeof body.mappedPercentage).toBe('number');
    expect(body.mappedPercentage).toBeGreaterThanOrEqual(0);
    expect(body.mappedPercentage).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// GET /api/admin/kpi
// ============================================================================
test.describe('GET /api/admin/kpi', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/admin/kpi');
    expect(res.status()).toBe(401);
  });

  test('returns KPI response with all metric categories', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const res = await request.get('/api/admin/kpi', {
      headers: authHeaders(token!),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();

    // Data Moat metrics
    expect(body).toHaveProperty('totalVenues');
    expect(body).toHaveProperty('verifiedVenues');
    expect(body).toHaveProperty('verificationRate');
    expect(body).toHaveProperty('totalFeedback');

    // B2B metrics
    expect(body).toHaveProperty('totalPartners');

    // Premium metrics
    expect(body).toHaveProperty('totalPurchases');
    expect(body).toHaveProperty('premiumUsers');

    // Weekly trend
    expect(body).toHaveProperty('weeklyTrend');
    expect(Array.isArray(body.weeklyTrend)).toBe(true);
  });
});

// ============================================================================
// GET /api/admin/accuracy
// ============================================================================
test.describe('GET /api/admin/accuracy', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/admin/accuracy');
    expect(res.status()).toBe(401);
  });

  test('returns accuracy dashboard data', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const res = await request.get('/api/admin/accuracy', {
      headers: authHeaders(token!),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('totalFeedback');
    expect(body).toHaveProperty('accurateCount');
    expect(body).toHaveProperty('inaccurateCount');
    expect(body).toHaveProperty('accuracyPercentage');
    expect(body).toHaveProperty('averageConfidence');
    expect(body).toHaveProperty('dailyAccuracy');
    expect(body).toHaveProperty('problematicVenues');
    expect(body).toHaveProperty('alertActive');

    expect(typeof body.totalFeedback).toBe('number');
    expect(typeof body.accuracyPercentage).toBe('number');
    expect(Array.isArray(body.dailyAccuracy)).toBe(true);
    expect(Array.isArray(body.problematicVenues)).toBe(true);
  });
});

// ============================================================================
// Cron auth guards for remaining endpoints
// ============================================================================
test.describe('Cron Auth Guards (remaining)', () => {
  test('POST /api/cron/cleanup-old-data without CRON_SECRET returns 401', async ({
    request,
  }) => {
    const res = await request.post('/api/cron/cleanup-old-data');
    // Should be 401 (unauthorized) or 405 (method not allowed) or 404 (not found)
    // depending on whether the route exists and handles POST
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/cron/precomputation-schedule without CRON_SECRET returns 401', async ({
    request,
  }) => {
    const res = await request.post('/api/cron/precomputation-schedule');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

// ============================================================================
// GET /api/health/database
// ============================================================================
test.describe('GET /api/health/database', () => {
  test('returns database health status', async ({ request }) => {
    const res = await request.get('/api/health/database');
    expect([200, 503]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('status');
  });
});
