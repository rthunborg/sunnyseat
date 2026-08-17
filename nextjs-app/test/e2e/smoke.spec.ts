import { test, expect } from '@playwright/test';
import { FIRST_RUN_GUIDE_SEEN_KEY, ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

test('home page loads and renders the persistent map shell', async ({ page }) => {
  await page.addInitScript(
  ({ onboardedKey, guideSeenKey }) => {
    window.localStorage.setItem(onboardedKey, '1');
    window.localStorage.setItem(guideSeenKey, '1');
  },
  { onboardedKey: ONBOARDED_FLAG_KEY, guideSeenKey: FIRST_RUN_GUIDE_SEEN_KEY },
);
  await page.goto('/');
  await expect(page.getByTestId('map-container')).toBeVisible({ timeout: 15000 });
});
