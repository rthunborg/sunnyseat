import { test, expect } from '@playwright/test';

const routes = [
  { path: '/', name: 'Home' },
  { path: '/about', name: 'About' },
  { path: '/v/test-venue', name: 'Venue Detail' },
  { path: '/admin/login', name: 'Admin Login' },
  { path: '/offline', name: 'Offline' },
];

test.describe('Smoke Tests', () => {
  for (const route of routes) {
    test(`${route.name} (${route.path}) loads without 500`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response).not.toBeNull();
      expect(response!.status()).toBeLessThan(500);
    });
  }

  test('/api/health returns valid JSON', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});
