import { expect, test, type Page, type Route } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

const WEBP_PIXEL = Buffer.from(
  'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
  'base64',
);

const CASES = [
  {
    state: 'venue-photo-loaded',
    viewport: 'mobile',
    route: '/?venue=test-venue-sunny&_state=venue-photo-loaded&_time=14:00',
  },
  {
    state: 'venue-photo-loaded',
    viewport: 'desktop',
    route: '/?venue=test-venue-sunny&_state=venue-photo-loaded&_time=16:30',
  },
  {
    state: 'venue-photo-fallback',
    viewport: 'mobile',
    route: '/?venue=test-venue-sunny&_state=venue-photo-fallback&_time=14:00',
  },
  {
    state: 'venue-photo-fallback',
    viewport: 'desktop',
    route: '/?venue=test-venue-sunny&_state=venue-photo-fallback&_time=16:30',
  },
] as const;

async function arrangePhotoState(page: Page, state: string) {
  await page.addInitScript((key: string) => {
    window.sessionStorage.clear();
    window.localStorage.setItem(key, '1');
  }, ONBOARDED_FLAG_KEY);

  await page.route('**/storage/v1/object/public/venue-media/**/*.webp', async (route: Route) => {
    if (state === 'venue-photo-fallback') {
      await route.abort('failed');
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'image/webp',
      body: WEBP_PIXEL,
    });
  });
}

test.describe('Story 12.12 - deterministic venue photo forced states (ATDD RED)', () => {
  for (const scenario of CASES) {
    test.skip(
      `[P0] ${scenario.viewport} ${scenario.state} proves cross-surface photo contract`,
      async ({ page }) => {
        await arrangePhotoState(page, scenario.state);
        await page.goto(scenario.route);

        if (scenario.state === 'venue-photo-loaded') {
          await expect(page.getByTestId('venue-card-photo')).toHaveAttribute(
            'src',
            /\/venue-media\/test-venue-sunny\/[^/]+\/card\.webp$/,
          );
          await expect(page.getByTestId('venue-card-photo')).toHaveAccessibleName(
            /uteservering/i,
          );
          await expect(page.getByTestId('venue-detail-hero-photo')).toHaveAttribute(
            'src',
            /\/venue-media\/test-venue-sunny\/[^/]+\/hero\.webp$/,
          );
          await expect(page.getByTestId('venue-detail-hero-photo')).toHaveAccessibleName(
            /uteservering/i,
          );

          if (scenario.viewport === 'desktop') {
            await expect(page.getByTestId('venue-quick-info-photo')).toHaveAttribute(
              'src',
              /\/venue-media\/test-venue-sunny\/[^/]+\/card\.webp$/,
            );
          } else {
            await expect(page.getByTestId('venue-quick-info-photo-fallback')).toBeVisible();
            await expect(page.getByTestId('venue-quick-info-photo')).toHaveCount(0);
          }
        } else {
          await expect(page.getByTestId('venue-card-photo')).toHaveCount(0);
          await expect(page.getByTestId('venue-card-photo-fallback')).toBeVisible();
          await expect(page.getByTestId('venue-detail-hero-photo')).toHaveCount(0);
          await expect(page.getByTestId('venue-detail-hero-fallback')).toBeVisible();

          if (scenario.viewport === 'desktop') {
            await expect(page.getByTestId('venue-quick-info-photo')).toHaveCount(0);
            await expect(page.getByTestId('venue-quick-info-photo-fallback')).toBeVisible();
          } else {
            await expect(page.getByTestId('venue-quick-info-photo-fallback')).toBeVisible();
          }
        }
      },
    );
  }
});
