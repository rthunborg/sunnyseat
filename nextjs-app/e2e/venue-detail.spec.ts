import { test, expect } from '@playwright/test';

test.describe('Venue Detail (Journey 2 & 6)', () => {
  test('renders venue detail page from direct URL', async ({ page }) => {
    await page.goto('/v/test-venue');

    // Should render venue name as h1
    const heading = page.locator('h1');
    await expect(heading).toBeVisible({ timeout: 10000 });
    await expect(heading).toContainText('Test Venue');

    // Should show neighborhood
    await expect(page.getByText('Linné')).toBeVisible();

    // Should have back navigation button with "Tillbaka" text
    await expect(page.getByText('Tillbaka')).toBeVisible();

    // Should have "Gå dit" directions link
    await expect(page.getByText('Gå dit')).toBeVisible();

    // Should have "Dela" share button
    await expect(page.getByText('Dela')).toBeVisible();
  });

  test('SunWindowsTable is visible on venue detail', async ({ page }) => {
    await page.goto('/v/test-venue');

    // SunWindowsTable renders with role="table"
    await expect(page.locator('[role="table"]')).toBeVisible({ timeout: 10000 });
  });

  test('back button navigates away from venue detail', async ({ page }) => {
    // Navigate to home first, then to venue, then back
    await page.goto('/');
    await page.goto('/v/test-venue');

    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

    // Click the back button
    await page.getByText('Tillbaka').click();

    // Should navigate back (URL should change)
    await page.waitForURL((url) => !url.pathname.includes('/v/'), { timeout: 5000 });
  });

  test('direct visit renders venue with meta content', async ({ page }) => {
    const response = await page.goto('/v/sommar-terrassen');

    // Page should load successfully
    expect(response?.status()).toBe(200);

    // Should render the venue name (formatted from slug)
    await expect(page.locator('h1')).toContainText('Sommar Terrassen', { timeout: 10000 });
  });
});
