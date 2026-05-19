import { test, expect } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

test('home page loads and renders the persistent map shell', async ({ page }) => {
  await page.addInitScript((key: string) => {
    window.localStorage.setItem(key, '1');
  }, ONBOARDED_FLAG_KEY);
  await page.goto('/');
  await expect(page.getByTestId('map-container')).toBeVisible();
});
