import { test, expect } from '@playwright/test';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Test123!';

/**
 * Feedback API E2E Tests
 *
 * Tests the previously untested feedback endpoints:
 *   - GET /api/feedback/[id] — get individual feedback (requires auth)
 *   - GET /api/feedback/metrics — accuracy metrics (requires auth)
 *
 * POST /api/feedback is already tested in api-public.spec.ts.
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
// GET /api/feedback/[id]
// ============================================================================
test.describe('GET /api/feedback/[id]', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/feedback/1');
    expect(res.status()).toBe(401);
  });

  test('returns feedback entry by ID when authenticated', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    // First create a feedback entry to ensure one exists
    const createRes = await request.post('/api/feedback', {
      data: {
        venueId: 1,
        predictedState: 'Sunny',
        wasSunny: true,
        userTimestamp: new Date().toISOString(),
        confidenceAtPrediction: 85,
      },
    });

    if (createRes.status() !== 201) {
      test.skip(true, 'Cannot create feedback — venue may not exist');
      return;
    }

    const created = await createRes.json();
    const feedbackId = created.id;

    // Now fetch it by ID
    const res = await request.get(`/api/feedback/${feedbackId}`, {
      headers: authHeaders(token!),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('id', feedbackId);
    expect(body).toHaveProperty('venueId');
    expect(body).toHaveProperty('predictedState');
    expect(body).toHaveProperty('wasSunny');
    expect(body).toHaveProperty('createdAt');
  });

  test('returns 404 for nonexistent feedback ID', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const res = await request.get('/api/feedback/999999', {
      headers: authHeaders(token!),
    });
    expect(res.status()).toBe(404);
  });

  test('returns 400 for non-numeric ID', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const res = await request.get('/api/feedback/not-a-number', {
      headers: authHeaders(token!),
    });
    expect(res.status()).toBe(400);
  });
});

// ============================================================================
// GET /api/feedback/metrics
// ============================================================================
test.describe('GET /api/feedback/metrics', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/feedback/metrics');
    expect(res.status()).toBe(401);
  });

  test('returns accuracy metrics with default date range', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const res = await request.get('/api/feedback/metrics', {
      headers: authHeaders(token!),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('totalFeedback');
    expect(body).toHaveProperty('accuratePredictions');
    expect(body).toHaveProperty('accuracyPercentage');
    expect(body).toHaveProperty('averageConfidence');
    expect(body).toHaveProperty('startDate');
    expect(body).toHaveProperty('endDate');

    expect(typeof body.totalFeedback).toBe('number');
    expect(typeof body.accuracyPercentage).toBe('number');
    expect(body.accuracyPercentage).toBeGreaterThanOrEqual(0);
    expect(body.accuracyPercentage).toBeLessThanOrEqual(100);
  });

  test('supports custom date range', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const start = '2026-01-01';
    const end = '2026-12-31';
    const res = await request.get(
      `/api/feedback/metrics?startDate=${start}&endDate=${end}`,
      { headers: authHeaders(token!) }
    );
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('startDate');
    expect(body).toHaveProperty('endDate');
    expect(typeof body.totalFeedback).toBe('number');
  });

  test('supports venueId filter', async ({ request }) => {
    const token = await getAdminToken(request);
    test.skip(!token, 'Admin user not seeded');

    const res = await request.get('/api/feedback/metrics?venueId=1', {
      headers: authHeaders(token!),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.totalFeedback).toBe('number');
  });
});
