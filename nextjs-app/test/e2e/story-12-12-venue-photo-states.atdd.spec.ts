import { expect, test, type Page } from '@playwright/test';
import { FIRST_RUN_GUIDE_SEEN_KEY, ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
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

const STORAGE_CARD_URL =
  /\/storage\/v1\/object\/public\/venue-media\/test-venue-sunny\/v2026-07\/card\.webp$/;
const STORAGE_HERO_URL =
  /\/storage\/v1\/object\/public\/venue-media\/test-venue-sunny\/v2026-07\/hero\.webp$/;

async function arrangePhotoState(page: Page, state: VenuePhotoTestState) {
  await page.addInitScript(
    ({ onboardedKey, guideSeenKey }) => {
      window.sessionStorage.clear();
      window.localStorage.clear();
      window.localStorage.setItem(onboardedKey, '1');
      window.localStorage.setItem(guideSeenKey, '1');
    },
    { onboardedKey: ONBOARDED_FLAG_KEY, guideSeenKey: FIRST_RUN_GUIDE_SEEN_KEY },
  );

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
            STORAGE_CARD_URL,
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
            STORAGE_CARD_URL,
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
            STORAGE_HERO_URL,
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
