import { test, expect } from '@playwright/test';

test.describe('About Page', () => {
  test('loads with title and attributions', async ({ page }) => {
    await page.goto('/about');

    // Page title
    await expect(page.getByRole('heading', { name: 'Om SunnySeat' })).toBeVisible({
      timeout: 5000,
    });

    // Attribution sources
    await expect(page.getByText('Met.no')).toBeVisible();
    await expect(page.getByText('Lantmäteriet')).toBeVisible();
    await expect(page.getByText('OpenStreetMap')).toBeVisible();
  });

  test('has back navigation link', async ({ page }) => {
    await page.goto('/about');

    const backLink = page.getByText('Tillbaka');
    await expect(backLink).toBeVisible({ timeout: 5000 });

    // Should link back to home
    await backLink.click();
    await page.waitForURL('/', { timeout: 5000 });
  });

  test('shows disclaimer section', async ({ page }) => {
    await page.goto('/about');

    await expect(page.getByText('Ansvarsfriskrivning')).toBeVisible({ timeout: 5000 });
  });
});
