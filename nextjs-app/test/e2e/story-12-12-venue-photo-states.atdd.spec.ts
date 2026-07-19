import { expect, test, type Page } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import {
  arrangeVenuePhotoMedia,
  type VenuePhotoTestState,
} from './helpers/venue-photo-media';

const CASES = [
  {
    state: 'venue-photo-loaded',
    viewport: 'mobile',
    listRoute: '/?_state=venue-photo-loaded&_time=14:00',
    detailRoute: '/?venue=test-venue-sunny&_state=venue-photo-loaded&_time=14:00',
  },
  {
    state: 'venue-photo-loaded',
    viewport: 'desktop',
    listRoute: '/?_state=venue-photo-loaded&_time=16:30',
    detailRoute: '/?venue=test-venue-sunny&_state=venue-photo-loaded&_time=16:30',
  },
  {
    state: 'venue-photo-fallback',
    viewport: 'mobile',
    listRoute: '/?_state=venue-photo-fallback&_time=14:00',
    detailRoute: '/?venue=test-venue-sunny&_state=venue-photo-fallback&_time=14:00',
  },
  {
    state: 'venue-photo-fallback',
    viewport: 'desktop',
    listRoute: '/?_state=venue-photo-fallback&_time=16:30',
    detailRoute: '/?venue=test-venue-sunny&_state=venue-photo-fallback&_time=16:30',
  },
] as const;

async function arrangePhotoState(page: Page, state: VenuePhotoTestState) {
  await page.addInitScript((key: string) => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.localStorage.setItem(key, '1');
  }, ONBOARDED_FLAG_KEY);

  await arrangeVenuePhotoMedia(page, state);
}

test.describe('Story 12.12 - deterministic venue photo forced states', () => {
  test.setTimeout(60_000);

  for (const scenario of CASES) {
    test(
      `[P0] ${scenario.viewport} ${scenario.state} proves cross-surface photo contract`,
      async ({ page }, testInfo) => {
        const isMobileProject = testInfo.project.name.includes('mobile');
        test.skip(
          isMobileProject !== (scenario.viewport === 'mobile'),
          `scenario is for the ${scenario.viewport} viewport`,
        );

        await arrangePhotoState(page, scenario.state);
        await page.goto(scenario.listRoute, { waitUntil: 'domcontentloaded' });

        const targetCard = page.locator('[data-testid="venue-card"]:visible', {
          hasText: /Kaf[eé] Magasinet/i,
        }).first();
        await targetCard.waitFor({ state: 'visible' });

        if (scenario.state === 'venue-photo-loaded') {
          await expect(targetCard.getByTestId('venue-card-photo')).toHaveAttribute(
            'src',
            /\/venue-media\/test-venue-sunny\/[^/]+\/card\.webp$/,
          );
          await expect(targetCard.getByTestId('venue-card-photo')).toHaveAccessibleName(
            /uteservering/i,
          );
          await expect(targetCard.getByTestId('venue-card-photo')).toHaveJSProperty(
            'naturalWidth',
            64,
          );
        } else {
          await expect(targetCard.getByTestId('venue-card-photo')).toHaveCount(0);
          await expect(targetCard.getByTestId('venue-card-photo-fallback')).toBeVisible();
        }

        await targetCard.click();
        const quickInfo = page.locator('[data-testid="venue-quick-info"]:visible').first();
        await quickInfo.waitFor({ state: 'visible' });

        if (scenario.state === 'venue-photo-loaded' && scenario.viewport === 'desktop') {
          await expect(quickInfo.getByTestId('venue-quick-info-photo')).toHaveAttribute(
            'src',
            /\/venue-media\/test-venue-sunny\/[^/]+\/card\.webp$/,
          );
          await expect(quickInfo.getByTestId('venue-quick-info-photo')).toHaveJSProperty(
            'naturalWidth',
            64,
          );
        } else {
          await expect(quickInfo.getByTestId('venue-quick-info-photo')).toHaveCount(0);
          await expect(quickInfo.getByTestId('venue-quick-info-photo-fallback')).toBeVisible();
        }

        await page.goto(scenario.detailRoute, { waitUntil: 'domcontentloaded' });
        const detailSurface = page.locator(
          '[data-testid="desktop-venue-detail-panel"]:visible, [data-testid="mobile-venue-detail-sheet"]:visible',
        );
        await detailSurface.first().waitFor({ state: 'visible' });

        if (scenario.state === 'venue-photo-loaded') {
          await expect(detailSurface.getByTestId('venue-detail-hero-photo')).toHaveAttribute(
            'src',
            /\/venue-media\/test-venue-sunny\/[^/]+\/hero\.webp$/,
          );
          await expect(detailSurface.getByTestId('venue-detail-hero-photo')).toHaveAccessibleName(
            /uteservering/i,
          );
          await expect(detailSurface.getByTestId('venue-detail-hero-photo')).toHaveJSProperty(
            'naturalWidth',
            64,
          );
        } else {
          await expect(detailSurface.getByTestId('venue-detail-hero-photo')).toHaveCount(0);
          await expect(detailSurface.getByTestId('venue-detail-hero-fallback')).toBeVisible();
        }
      },
    );
  }
});
