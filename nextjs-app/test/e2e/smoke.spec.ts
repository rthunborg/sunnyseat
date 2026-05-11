import { test, expect } from '@playwright/test';

test('home page loads and renders the persistent map shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('map-container')).toBeVisible();
});
