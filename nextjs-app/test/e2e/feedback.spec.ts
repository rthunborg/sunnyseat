import { expect, test, type Page } from '@playwright/test';
import { FIRST_RUN_GUIDE_SEEN_KEY, ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

async function bypassOnboarding(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(
  ({ onboardedKey, guideSeenKey }) => {
    window.sessionStorage.clear();
    window.localStorage.setItem(onboardedKey, '1');
    window.localStorage.setItem(guideSeenKey, '1');
  },
  { onboardedKey: ONBOARDED_FLAG_KEY, guideSeenKey: FIRST_RUN_GUIDE_SEEN_KEY },
);
}

function rateLimitIpForTest(title: string): string {
  let hash = 0;
  for (const char of title) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) >>> 0;
  }

  return `10.${(hash >>> 16) & 255}.${(hash >>> 8) & 255}.${(hash & 254) + 1}`;
}

function promptForProject(page: Page, projectName: string) {
  const panel = projectName === 'desktop'
    ? page.getByTestId('desktop-venue-detail-panel')
    : page.getByTestId('mobile-venue-detail-sheet');
  return panel.getByTestId('feedback-prompt');
}

test.describe('feedback forced state', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await page.setExtraHTTPHeaders({
      'x-forwarded-for': rateLimitIpForTest(testInfo.title),
    });
  });

  test('submits sun accuracy feedback and shows inline confirmation', async ({ page }, testInfo) => {
    await bypassOnboarding(page);
    await page.route('**/api/venues/*/feedback', async (route) => {
      const body = route.request().postDataJSON() as {
        predictedState?: string;
        userTimestamp?: string;
        sunAccuracy?: string;
        wasSunny?: boolean;
      };
      expect(body.predictedState).toBe('Sunny');
      expect(body.sunAccuracy).toBe('sunny');
      expect(body.wasSunny).toBe(true);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'feedback_e2e',
          venueId: '1',
          venueSlug: 'test-venue-sunny',
          userTimestamp: body.userTimestamp,
          predictedState: body.predictedState,
          sunAccuracy: body.sunAccuracy,
          wasSunny: body.wasSunny,
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

  test('keeps failed feedback form visible with retry path', async ({ page }, testInfo) => {
    await bypassOnboarding(page);
    await page.route('**/api/venues/*/feedback', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'failed' }),
      });
    });

    await page.goto('/?venue=test-venue-sunny&_state=feedback&_time=14:00');
    const prompt = promptForProject(page, testInfo.project.name);
    await expect(prompt).toBeVisible({ timeout: 15_000 });
    const sunNo = prompt.getByRole('button', { name: 'Var det soligt när du kom? Nej' });
    await sunNo.click();
    await expect(sunNo).toHaveAttribute('aria-pressed', 'true');
    const submit = prompt.getByRole('button', { name: 'Skicka' });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(prompt.getByRole('alert')).toContainText('Kunde inte skicka. Försök igen.');
    await expect(prompt.getByRole('button', { name: 'Var det soligt när du kom? Nej' })).toHaveAttribute('aria-pressed', 'true');
  });
});
