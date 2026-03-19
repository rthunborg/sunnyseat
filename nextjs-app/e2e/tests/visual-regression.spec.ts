/**
 * Story 10.9 — AC 6: Visual Regression Baselines
 *
 * Captures screenshot baselines for key page states.
 * First run creates baselines; subsequent runs detect regressions.
 *
 * NOTE: Requires Chromium installed (`npx playwright install chromium`).
 */
import { test, expect } from '@playwright/test';

test.describe('AC 6: Visual Regression Baselines', () => {
  test('Home page (mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page).toHaveScreenshot('home-mobile.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('Home page (desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page).toHaveScreenshot('home-desktop.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('About page', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'networkidle' });
    await expect(page).toHaveScreenshot('about.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('Admin login page', async ({ page }) => {
    await page.goto('/admin/login', { waitUntil: 'networkidle' });
    await expect(page).toHaveScreenshot('admin-login.png', {
      maxDiffPixelRatio: 0.01,
    });
  });
});
