import { expect, test, type Page } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

async function bypassOnboarding(page: Page): Promise<void> {
  await page.addInitScript((key: string) => {
    window.sessionStorage.clear();
    window.localStorage.setItem(key, '1');
  }, ONBOARDED_FLAG_KEY);
}

function panelForProject(page: Page, projectName: string) {
  return projectName === 'desktop'
    ? page.getByTestId('desktop-venue-detail-panel')
    : page.getByTestId('mobile-venue-detail-sheet');
}

test.describe('review forced state', () => {
  test('opens inline review form, submits, and shows confirmation', async ({ page }, testInfo) => {
    await bypassOnboarding(page);
    await page.route('**/api/reviews?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reviews: [
            {
              id: 'review_e2e_existing',
              venueId: '1',
              venueSlug: 'test-venue-sunny',
              text: 'Soligt från start.',
              rating: 5,
              createdAt: '2026-06-07T12:00:00.000Z',
            },
          ],
          summary: { averageRating: 5, reviewCount: 1 },
          timestamp: '2026-06-08T12:00:00.000Z',
        }),
      });
    });
    await page.route('**/api/reviews', async (route) => {
      const body = route.request().postDataJSON() as {
        venueId?: string;
        venueSlug?: string;
        text?: string;
        rating?: number;
      };
      expect(body).toMatchObject({
        venueId: '1',
        venueSlug: 'test-venue-sunny',
        text: 'Ny recension.',
      });
      expect(body.rating).toBeUndefined();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          review: {
            id: 'review_e2e_new',
            venueId: '1',
            venueSlug: 'test-venue-sunny',
            text: body.text,
            createdAt: '2026-06-08T12:00:00.000Z',
          },
          summary: { averageRating: 5, reviewCount: 2 },
          timestamp: '2026-06-08T12:00:00.000Z',
        }),
      });
    });

    await page.goto('/?venue=test-venue-sunny&_state=review&_time=14:00');
    const panel = panelForProject(page, testInfo.project.name);
    const formTestId = testInfo.project.name === 'desktop'
      ? 'review-form-desktop'
      : 'review-form-mobile';
    await expect(panel.getByTestId(formTestId)).toBeVisible({ timeout: 15_000 });
    await expect(panel.getByText('Soligt från start.')).toBeVisible();
    const submit = panel.getByRole('button', { name: 'Skicka' });
    await expect(submit).toBeDisabled();
    await panel.getByRole('textbox', { name: 'Omdöme' }).fill('Ny recension.');
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(panel.getByText('Tack för ditt omdöme.')).toBeVisible();
  });
});
