import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import { FIRST_RUN_GUIDE_SEEN_KEY, ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

const STORY_BASE_URL = process.env.STORY_12_6_E2E_BASE_URL ?? '';

async function arrangeLowPartialPin(page: Page): Promise<void> {
  await page.addInitScript(
  ({ onboardedKey, guideSeenKey }) => {
    window.localStorage.setItem(onboardedKey, '1');
    window.localStorage.setItem(guideSeenKey, '1');
  },
  { onboardedKey: ONBOARDED_FLAG_KEY, guideSeenKey: FIRST_RUN_GUIDE_SEEN_KEY },
);
  await page.route('**://api.met.no/**', (route: Route) => route.abort());
  await page.route(/\/api\/venues(?:\?.*)?$/, async (route: Route) => {
    await route.fulfill({
      json: {
        venues: [
          {
            id: 'low-partial',
            venueId: 'low-partial',
            venueName: 'Lag partial',
            venueSlug: 'low-partial',
            slug: 'low-partial',
            neighborhood: 'Centrum',
            location: { lat: 57.7089, lng: 11.9746 },
            currentSunStatus: 'Partial',
            weatherGateState: 'not_gated',
            isPartner: false,
            confidence: 99,
            distanceMeters: 100,
            sunExposurePercent: 40,
            skyCondition: 'clear',
            tags: [],
            sunDaySeries: [
              {
                minutes: 840,
                sunExposurePercent: 40,
                currentSunStatus: 'Partial',
                weatherGateState: 'not_gated',
                skyCondition: 'clear',
              },
            ],
          },
        ],
        meta: { count: 1, radiusKm: 3, sunDataSource: 'geometry-only' },
        timestamp: '2026-07-18T12:00:00.000Z',
        totalCount: 1,
      },
    });
  });
  await page.goto(`${STORY_BASE_URL}/?_time=14:00`);
}

test('[P1] pin-bearing a11y-mobile coverage is executable and non-vacuous', async ({ page }, testInfo) => {
  expect(testInfo.project.name).toBe('a11y-mobile');
  await arrangeLowPartialPin(page);
  const pin = page.getByRole('button', { name: /Lag partial.*inte soligt vid vald tid/i });

  await expect(pin).toBeVisible({ timeout: 15_000 });
  await expect(pin).not.toContainText(/\d+%/);
  await expect(pin.locator('[data-pin-icon="cloud"]')).toHaveCount(1);
  const box = await pin.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);

  const result = await new AxeBuilder({ page })
    .include('[data-testid="venue-pin"]')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(result.violations.filter((violation) =>
    violation.impact === 'serious' || violation.impact === 'critical',
  )).toEqual([]);
});
