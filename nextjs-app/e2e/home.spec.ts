import { test, expect } from '@playwright/test';

test.describe('Home Screen (Journey 1)', () => {
  test('loads with map and card tray', async ({ page }) => {
    await page.goto('/');

    // Map container should be present (role="application" on MapContainer)
    await expect(page.locator('[role="application"]')).toBeVisible({ timeout: 15000 });

    // Card tray should be present (aria-label="Venue card tray")
    await expect(page.locator('[aria-label="Venue card tray"]')).toBeAttached({ timeout: 10000 });
  });

  test('shows location permission prompt on first visit', async ({ page, context }) => {
    // Clear storage to simulate first visit
    await context.clearCookies();
    await page.goto('/');

    // LocationPermissionPrompt should show "Tillåt plats" button
    await expect(page.getByText('Tillåt plats')).toBeVisible({ timeout: 10000 });

    // Fallback link "Eller välj på kartan" should be visible
    await expect(page.getByText('Eller välj på kartan')).toBeVisible();
  });

  test('"Eller välj på kartan" fallback dismisses prompt', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');

    const fallback = page.getByText('Eller välj på kartan');
    await expect(fallback).toBeVisible({ timeout: 10000 });

    await fallback.click();

    // After clicking fallback, the prompt should disappear
    await expect(page.getByText('Tillåt plats')).toBeHidden({ timeout: 5000 });

    // Map should still be visible
    await expect(page.locator('[role="application"]')).toBeVisible();
  });
});
