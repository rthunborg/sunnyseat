import { expect, test } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import { FAVOURITES_STORAGE_KEY } from '@/lib/services/favourites-storage';

const APP_SETTLE_TIMEOUT_MS = 15_000;

async function seedShell(page: import('@playwright/test').Page, favouriteIds?: string[]): Promise<void> {
  await page.addInitScript(
    ({ onboardedKey, favouritesKey, ids }) => {
      window.localStorage.setItem(onboardedKey, '1');
      if (ids) {
        window.localStorage.setItem(favouritesKey, JSON.stringify(ids));
      }
    },
    { onboardedKey: ONBOARDED_FLAG_KEY, favouritesKey: FAVOURITES_STORAGE_KEY, ids: favouriteIds },
  );
}

test.describe('favourites', () => {
  // Force a deterministic midday planner time so sun-dependent venue state
  // (sunny venues, "Sol HH:MM" windows) does not hinge on the CI runner's wall
  // clock. The time slider otherwise defaults to "now" (server-computed sun),
  // so this suite was green by day and red in the evening. The app honours
  // `?_time=` (AppContextProviders → TimeProvider.forcedTime); wrapping `goto`
  // applies it to every navigation in the spec.
  test.beforeEach(async ({ page }) => {
    const nativeGoto = page.goto.bind(page);
    page.goto = ((url: string, options?: Parameters<typeof nativeGoto>[1]) => {
      const target = new URL(url, 'http://localhost:3000');
      if (!target.searchParams.has('_time')) target.searchParams.set('_time', '13:00');
      return nativeGoto(target.pathname + target.search + target.hash, options);
    }) as typeof page.goto;
  });

  test('mobile: user can save a venue from the map list and see it in /favoriter', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Runs in the mobile project only');
    testInfo.setTimeout(45_000);

    await seedShell(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const firstCard = page.getByTestId('venue-card').first();
    await expect(firstCard).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    const firstVenue = firstCard.getByRole('button', { name: /^Välj / });
    await expect(firstVenue).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    const label = (await firstVenue.getAttribute('aria-label')) ?? '';
    const venueName = label.match(/^Välj ([^,]+)/)?.[1] ?? 'Kafé Magasinet';

    await firstCard.getByRole('button', { name: /Spara som favorit/ }).click();
    await expect(firstCard.getByRole('button', { name: /Ta bort favorit/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.goto('/favoriter', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/favoriter/);
    await expect(page.getByRole('button', { name: new RegExp(`Välj ${escapeRegex(venueName)}`) })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole('button', {
        name: new RegExp(`^Välj ${escapeRegex(venueName)}, Sol \\d{1,2}:\\d{2}-\\d{1,2}:\\d{2},`),
      }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('mobile: saved venue persists, appears in /favoriter, and can be removed', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Runs in the mobile project only');

    await seedShell(page, ['1']);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/favoriter');

    await expect(page.getByTestId('mobile-nav-tab-favoriter')).toHaveAttribute('data-active', 'true');
    await expect(page.getByRole('button', { name: /Välj Kafé Magasinet/ })).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    await expect(page.getByRole('button', {
      name: /^Välj Kafé Magasinet, Sol \d{1,2}:\d{2}-\d{1,2}:\d{2},/,
    })).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });

    await page.reload();
    await expect(page.getByRole('button', { name: /Välj Kafé Magasinet/ })).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });

    await page.getByRole('button', { name: /Ta bort favorit/ }).first().click();
    await expect(
      page.getByTestId('mobile-bottom-sheet').getByText('Du har inga sparade platser än.'),
    ).toBeVisible();
  });
});

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
