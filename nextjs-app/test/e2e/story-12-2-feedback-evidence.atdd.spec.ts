/**
 * ATDD RED-PHASE acceptance scaffolds - Story 12.2 (AC2, AC3, AC7)
 * Browser feedback flow submits exact prediction evidence without changing the
 * two-tap Swedish feedback UX unless uncertainty/copy behavior intentionally changes.
 */
import { expect, test, type Page } from '@playwright/test';

import { FIRST_RUN_GUIDE_SEEN_KEY, ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

async function bypassOnboarding(page: Page): Promise<void> {
  await page.addInitScript(
  ({ onboardedKey, guideSeenKey }) => {
    window.sessionStorage.clear();
    window.localStorage.setItem(onboardedKey, '1');
    window.localStorage.setItem(guideSeenKey, '1');
  },
  { onboardedKey: ONBOARDED_FLAG_KEY, guideSeenKey: FIRST_RUN_GUIDE_SEEN_KEY },
);
}

function promptForProject(page: Page, projectName: string) {
  const panel = projectName === 'desktop'
    ? page.getByTestId('desktop-venue-detail-panel')
    : page.getByTestId('mobile-venue-detail-sheet');
  return panel.getByTestId('feedback-prompt');
}

test.describe('story 12.2 feedback prediction evidence (ATDD red phase)', () => {
  test.skip('[P0] feedback submission includes public verdict, weather flags, exposure, and geometry hash', async ({ page }, testInfo) => {
    await bypassOnboarding(page);

    await page.route('**/api/venues/*/feedback', async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;

      expect(body.predictedState).toBe('Sunny');
      expect(body.sunAccuracy).toBe('sunny');
      expect(body.sunExposurePercent).toBe(95);
      expect(body.publicSunVerdict).toBe('amber');
      expect(body.weatherGated).toBe(false);
      expect(body.weatherUnknown).toBe(false);
      expect(body.geometryInputHash).toMatch(
        /^g1:[0-9a-f]{64}$/,
      );
      expect(body).not.toHaveProperty('confidencePercent');

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'feedback_story_12_2',
          venueId: '1',
          venueSlug: 'test-venue-sunny',
          userTimestamp: body.userTimestamp,
          predictedState: body.predictedState,
          sunAccuracy: body.sunAccuracy,
          sunExposurePercent: body.sunExposurePercent,
          publicSunVerdict: body.publicSunVerdict,
          weatherGated: body.weatherGated,
          weatherUnknown: body.weatherUnknown,
          geometryInputHash: body.geometryInputHash,
          createdAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/?venue=test-venue-sunny&_state=feedback&_time=14:00');
    const prompt = promptForProject(page, testInfo.project.name);
    await expect(prompt).toBeVisible({ timeout: 15_000 });

    const sunYes = prompt.getByRole('button', { name: 'Var det soligt när du kom? Ja' });
    await sunYes.click();
    await expect(sunYes).toHaveAttribute('aria-pressed', 'true');

    const submit = prompt.getByRole('button', { name: 'Skicka' });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(prompt.getByText('Tack för din feedback.')).toBeVisible();
  });

  test.skip('[P1] grey public verdict is submitted for weather-gated detail without adding visible confidence copy', async ({ page }, testInfo) => {
    await bypassOnboarding(page);

    await page.route('**/api/venues/*/feedback', async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;

      expect(body.predictedState).toBe('CloudObscured');
      expect(body.publicSunVerdict).toBe('grey');
      expect(body.weatherGated).toBe(true);
      expect(body.weatherUnknown).toBe(false);
      expect(body.sunExposurePercent).toBeGreaterThan(50);

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'feedback_story_12_2_obscured',
          venueId: '1',
          venueSlug: 'test-venue-sunny',
          userTimestamp: body.userTimestamp,
          predictedState: body.predictedState,
          sunAccuracy: body.sunAccuracy,
          publicSunVerdict: body.publicSunVerdict,
          weatherGated: body.weatherGated,
          weatherUnknown: body.weatherUnknown,
          sunExposurePercent: body.sunExposurePercent,
          geometryInputHash: body.geometryInputHash,
          createdAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/?venue=test-venue-sunny&_state=venue-detail-obscured&_time=14:00');
    const prompt = promptForProject(page, testInfo.project.name);
    await expect(prompt).toBeVisible({ timeout: 15_000 });
    await expect(prompt.getByText(/% säker|säkerhet/i)).toHaveCount(0);

    await prompt.getByRole('button', { name: 'Var det soligt när du kom? Nej' }).click();
    await prompt.getByRole('button', { name: 'Skicka' }).click();
    await expect(prompt.getByText('Tack för din feedback.')).toBeVisible();
  });
});

