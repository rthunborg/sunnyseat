import { expect, test, type Page } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

const APP_SETTLE_TIMEOUT_MS = 15_000;
const DEV_EDITOR_MATCHER = '**/api/dev/venues**';

const editorVenue = {
  id: 'venue-test-id',
  slug: 'test-venue-sunny',
  venueName: 'Test Venue Sunny',
  hidden: false,
  displayLocation: { lat: 57.705, lng: 11.97 },
  persistedLocation: { lat: 57.7048, lng: 11.9698 },
  engineLocation: { lat: 57.7048, lng: 11.9698 },
  seatingArea: null,
  tags: ['sunny'],
  description: 'Solig testplats',
  thumbnail: {
    alt: 'Testbild',
    initials: 'TV',
    cardUrl: 'http://127.0.0.1:54321/storage/v1/object/public/venue-media/test-venue-sunny/v1/card.webp',
    heroUrl: 'http://127.0.0.1:54321/storage/v1/object/public/venue-media/test-venue-sunny/v1/hero.webp',
  },
};

async function bypassOnboarding(page: Page): Promise<void> {
  await page.addInitScript((key: string) => {
    window.localStorage.setItem(key, '1');
  }, ONBOARDED_FLAG_KEY);
}

test.describe('Story 12.5 dev venue editor browser regression', () => {
  test('gate-off map does not render editor chrome or request the dev API', async ({ page }) => {
    await bypassOnboarding(page);
    const devRequests: string[] = [];
    await page.route(DEV_EDITOR_MATCHER, async (route) => {
      devRequests.push(route.request().url());
      await route.fallback();
    });

    await page.goto('/?_state=map-default');
    await expect(page.locator('[data-testid="venue-pin"]').first()).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });

    await expect(page.getByTestId('dev-venue-editor')).toHaveCount(0);
    expect(devRequests).toEqual([]);
  });

  test('mocked local editor renders and saves a display-coordinate patch', async ({ page }) => {
    await bypassOnboarding(page);
    const patches: unknown[] = [];
    await page.route(DEV_EDITOR_MATCHER, async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;

      if (request.method() === 'GET' && path.endsWith('/api/dev/venues')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ venues: [editorVenue] }),
        });
        return;
      }

      if (
        request.method() === 'PATCH' &&
        path.endsWith('/api/dev/venues/test-venue-sunny')
      ) {
        patches.push(JSON.parse(request.postData() ?? '{}'));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            venue: {
              ...editorVenue,
              displayLocation: { lat: 57.7061, lng: 11.97 },
            },
          }),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto('/?_editor=venues&_state=map-default');
    const editor = page.getByTestId('dev-venue-editor');
    await expect(editor).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    await expect(page.getByTestId('dev-venue-editor-display-pin')).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });

    await editor.getByLabel('Visningslatitud').fill('57.706100');
    await editor.getByRole('button', { name: 'Spara' }).click();

    await expect.poll(() => patches.length).toBe(1);
    expect(patches[0]).toMatchObject({
      displayLocation: { lat: 57.7061, lng: 11.97 },
    });
  });
});
