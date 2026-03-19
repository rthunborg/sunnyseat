import { test, expect } from '@playwright/test';
import { AboutPage } from '../pages/AboutPage';

test.describe('AC2: About Page', () => {
  test('renders with "Om SunnySeat" heading', async ({ page }) => {
    const about = new AboutPage(page);
    await about.goto();
    await about.waitForReady();

    await expect(about.title).toBeVisible();
  });

  test('lists attribution sources: Met.no, Lantmäteriet, OpenStreetMap', async ({
    page,
  }) => {
    const about = new AboutPage(page);
    await about.goto();
    await about.waitForReady();

    await expect(about.metNoAttribution).toBeVisible();
    await expect(about.lantmaterietAttribution).toBeVisible();
    await expect(about.osmAttribution).toBeVisible();
  });

  test('shows disclaimer section "Ansvarsfriskrivning"', async ({ page }) => {
    const about = new AboutPage(page);
    await about.goto();
    await about.waitForReady();

    await expect(about.disclaimer).toBeVisible();
  });

  test('"Tillbaka" link navigates to home', async ({ page }) => {
    const about = new AboutPage(page);
    await about.goto();
    await about.waitForReady();

    await expect(about.backLink).toBeVisible();
    await about.backLink.click();
    await page.waitForURL('/', { timeout: 5000 });
  });

  test('all content is in Swedish', async ({ page }) => {
    const about = new AboutPage(page);
    await about.goto();
    await about.waitForReady();

    // Verify html lang attribute
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('sv');

    // Check for Swedish content markers
    await expect(page.getByText('Datakällor')).toBeVisible();
    await expect(page.getByText('Ansvarsfriskrivning')).toBeVisible();
    await expect(page.getByText('Tillbaka')).toBeVisible();
  });
});
