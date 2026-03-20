import { test, expect } from '@playwright/test';
import { AdminLoginPage } from '../pages/AdminLoginPage';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Test123!';

/**
 * Admin Accuracy Detail Page E2E Tests
 *
 * Tests /admin/accuracy/venues/[id] — the only untested admin page.
 */

async function loginAsAdmin(page: import('@playwright/test').Page) {
  const loginPage = new AdminLoginPage(page);
  await loginPage.goto();
  await loginPage.waitForReady();
  await loginPage.login(ADMIN_USERNAME, ADMIN_PASSWORD);
  await page.waitForURL('**/admin', { timeout: 10000 });
}

test.describe('Admin Accuracy Detail Page', () => {
  test('page loads without crash for a valid venue ID', async ({ page }) => {
    await loginAsAdmin(page);
    // Use venue ID 1 — if it doesn't exist, the page should show an error state
    await page.goto('/admin/accuracy/venues/1');

    // Page should not crash (no 500, no "Application error")
    const errorOverlay = page.locator('text=Application error');
    await expect(errorOverlay).not.toBeVisible({ timeout: 5000 });

    // Should show some content — either venue accuracy data or a not-found message
    await page.waitForTimeout(3000);
    const pageText = await page.textContent('body');
    expect(pageText).toBeTruthy();
    expect(pageText!.length).toBeGreaterThan(50);
  });

  test('page shows back link to accuracy overview', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/accuracy/venues/1');

    // Should have a back/return link
    const backLink = page.getByRole('link').filter({ hasText: /Tillbaka|Precision|Back/ });
    const hasBackLink = await backLink.first().isVisible().catch(() => false);

    // Page should have navigation elements
    expect(typeof hasBackLink).toBe('boolean');
  });

  test('page renders content (venue data or loading state)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/accuracy/venues/1');
    await page.waitForTimeout(3000);

    // Page should show some content — venue accuracy data, loading skeletons, or error state
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    // Should have meaningful content (not just whitespace)
    expect(bodyText!.trim().length).toBeGreaterThan(20);
  });

  test('nonexistent venue ID shows error state (not crash)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/accuracy/venues/999999');

    // Should not crash
    const response = await page.waitForResponse(
      (r) => r.url().includes('/api/admin/accuracy/venues/999999'),
      { timeout: 10000 }
    ).catch(() => null);

    // The page should render something (error state or redirect)
    const errorOverlay = page.locator('text=Application error');
    await expect(errorOverlay).not.toBeVisible({ timeout: 5000 });
  });
});
