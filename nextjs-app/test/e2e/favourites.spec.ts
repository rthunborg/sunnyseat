import { expect, test } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import { FAVOURITES_STORAGE_KEY } from '@/lib/services/favourites-storage';

async function seedShell(page: import('@playwright/test').Page, favouriteIds: string[] = []): Promise<void> {
  await page.addInitScript(
    ({ onboardedKey, favouritesKey, ids }) => {
      window.localStorage.setItem(onboardedKey, '1');
      window.localStorage.setItem(favouritesKey, JSON.stringify(ids));
    },
    { onboardedKey: ONBOARDED_FLAG_KEY, favouritesKey: FAVOURITES_STORAGE_KEY, ids: favouriteIds },
  );
}

test.describe('favourites', () => {
  test('mobile: user can save a venue from the map list and see it in /favoriter', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Runs in the mobile project only');

    await seedShell(page);
    await page.goto('/');

    const firstVenue = page.getByRole('button', { name: /^Välj / }).first();
    await expect(firstVenue).toBeVisible();
    const label = (await firstVenue.getAttribute('aria-label')) ?? '';
    const venueName = label.match(/^Välj ([^,]+)/)?.[1] ?? 'Kafé Magasinet';

    await page.getByRole('button', { name: /Spara som favorit/ }).first().click();
    await expect.poll(async () => {
      return page.evaluate((key) => {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
      }, FAVOURITES_STORAGE_KEY);
    }).toEqual(expect.arrayContaining([expect.any(String)]));

    await page.getByTestId('mobile-nav-tab-favoriter').click();
    await expect(page).toHaveURL(/\/favoriter/);
    await expect(page.getByRole('button', { name: new RegExp(`Välj ${escapeRegex(venueName)}`) })).toBeVisible();
    await expect(page.getByText(/Sol 13:00/)).toBeVisible();
  });

  test('mobile: saved venue persists, appears in /favoriter, and can be removed', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Runs in the mobile project only');

    await seedShell(page, ['1']);
    await page.goto('/favoriter');

    await expect(page.getByTestId('mobile-nav-tab-favoriter')).toHaveAttribute('data-active', 'true');
    await expect(page.getByRole('button', { name: /Välj Kafé Magasinet/ })).toBeVisible();
    await expect(page.getByText(/Sol 13:00/)).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: /Välj Kafé Magasinet/ })).toBeVisible();

    await page.getByRole('button', { name: /Ta bort favorit/ }).first().click();
    await expect(
      page.getByTestId('mobile-bottom-sheet').getByText('Du har inga sparade platser än.'),
    ).toBeVisible();
  });
});

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
