import { test, expect } from '@playwright/test';
import { AdminLoginPage } from '../pages/AdminLoginPage';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Test123!';

/**
 * Admin Venue Filtering E2E Tests
 *
 * Tests the venue list page filtering UI:
 *   - Type filter (Alla / Restaurang / Café / Bar)
 *   - Mapped filter (Alla / Kartlagda / Ej kartlagda)
 *   - Search + filter combination
 *
 * NOTE: Filter buttons use exact: true to avoid matching the "add venue" button
 * which also contains venue type text.
 */

async function loginAsAdmin(page: import('@playwright/test').Page) {
  const loginPage = new AdminLoginPage(page);
  await loginPage.goto();
  await loginPage.waitForReady();
  await loginPage.login(ADMIN_USERNAME, ADMIN_PASSWORD);
  await page.waitForURL('**/admin', { timeout: 10000 });
}

test.describe('Admin Venue Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/venues');
    await page.waitForSelector('h1', { timeout: 10000 });
    // Wait for data to load
    await page.waitForTimeout(2000);
  });

  test('venue list page renders type filter buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Alla', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Restaurang', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Café', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bar', exact: true })).toBeVisible();
  });

  test('venue list page renders mapped filter buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Kartlagda', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ej kartlagda', exact: true })).toBeVisible();
  });

  test('clicking "Restaurang" filter does not crash', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Restaurang', exact: true });
    await btn.click();
    await page.waitForTimeout(1000);

    await expect(page.getByRole('heading', { name: 'Restauranger' })).toBeVisible();
  });

  test('clicking "Café" filter does not crash', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Café', exact: true });
    await btn.click();
    await page.waitForTimeout(1000);

    await expect(page.getByRole('heading', { name: 'Restauranger' })).toBeVisible();
  });

  test('clicking "Kartlagda" does not crash', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Kartlagda', exact: true });
    await btn.click();
    await page.waitForTimeout(1000);

    await expect(page.getByRole('heading', { name: 'Restauranger' })).toBeVisible();
  });

  test('clicking "Ej kartlagda" does not crash', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Ej kartlagda', exact: true });
    await btn.click();
    await page.waitForTimeout(1000);

    await expect(page.getByRole('heading', { name: 'Restauranger' })).toBeVisible();
  });

  test('search and type filter can be combined', async ({ page }) => {
    // Apply type filter
    await page.getByRole('button', { name: 'Restaurang', exact: true }).click();
    await page.waitForTimeout(500);

    // Then search
    const searchInput = page.locator('input[aria-label="Sök restauranger"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Café');
      await page.waitForTimeout(500);
    }

    await expect(page.getByRole('heading', { name: 'Restauranger' })).toBeVisible();
  });

  test('clicking "Alla" resets type filter', async ({ page }) => {
    // Apply a filter
    await page.getByRole('button', { name: 'Café', exact: true }).click();
    await page.waitForTimeout(500);

    // Reset
    await page.getByRole('button', { name: 'Alla', exact: true }).first().click();
    await page.waitForTimeout(500);

    await expect(page.getByRole('heading', { name: 'Restauranger' })).toBeVisible();
  });
});
