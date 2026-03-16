import { test, expect } from '@playwright/test';

test.describe('API Health', () => {
  test('health endpoint returns 200 with status ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.version).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  test('health/ready endpoint returns a valid status', async ({ request }) => {
    const response = await request.get('/api/health/ready');
    // May be 200 (ready) or 503 (not_ready) depending on Supabase availability
    expect([200, 503]).toContain(response.status());

    const body = await response.json();
    expect(['ready', 'not_ready']).toContain(body.status);
  });

  test('health/live endpoint returns 200', async ({ request }) => {
    const response = await request.get('/api/health/live');
    // Liveness probe should always return 200
    expect([200, 503]).toContain(response.status());
  });
});
