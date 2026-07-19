import { expect, test, type Page } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

// Story 3.4 Task 7.2 — Epic 3 visit-loop hardening coverage:
// route overlay dismiss preserves venue context, deep links render detail,
// invalid slugs surface the localized not-found state, and browser Back
// from detail restores the map without stranding overlays.

const APP_SETTLE_TIMEOUT_MS = 15_000;

async function bypassOnboarding(page: Page): Promise<void> {
  await page.addInitScript((key: string) => {
    window.sessionStorage.clear();
    window.localStorage.setItem(key, '1');
  }, ONBOARDED_FLAG_KEY);
}

// Stub the native-map handoff exactly like map-primary.spec.ts — the test
// runner must never navigate into a real maps app.
async function stubWindowOpen(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.open = () => null;
  });
}

function detailPanel(page: Page, projectName: string) {
  return projectName === 'desktop'
    ? page.getByTestId('desktop-venue-detail-panel')
    : page.getByTestId('mobile-venue-detail-sheet');
}

test.describe('Epic 3 visit loop', () => {
  test('deep link to /?venue=test-venue-sunny renders venue detail', async ({ page }, testInfo) => {
    await bypassOnboarding(page);
    await page.goto('/?venue=test-venue-sunny&_time=14:00');

    const panel = detailPanel(page, testInfo.project.name);
    await expect(panel).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    await expect(
      panel.getByRole('heading', { name: 'Kafé Magasinet' }).first(),
    ).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
  });

  test('route overlay shows destination and walk time without confidence, and dismiss preserves venue context', async ({ page }, testInfo) => {
    await bypassOnboarding(page);
    await stubWindowOpen(page);
    await page.goto('/?venue=test-venue-sunny&_time=14:00');

    const panel = detailPanel(page, testInfo.project.name);
    await expect(panel).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    await panel.getByRole('button', { name: /Visa Rutt/ }).click();

    const overlay = page.locator('[data-testid="route-overlay"]:visible');
    await expect(overlay).toBeVisible();
    // Destination and estimated walk time render before the app attempts to
    // leave. Story 12.13 removes public confidence from this handoff.
    await expect(overlay).toContainText('Rutt till Kafé Magasinet');
    await expect(overlay).not.toContainText(/Säkerhet|Confidence/);
    await expect(overlay).toContainText(/min promenad/);
    // Blocked handoff (window.open → null): localized open-directions action
    // keeps the *directions* intent (Story 3.1 Round 1 finding #4).
    const fallback = overlay.getByRole('link', { name: 'ÖPPNA I KARTOR' });
    await expect(fallback).toHaveAttribute('href', /google\.com\/maps\/dir\//);

    await overlay.getByRole('button', { name: 'Stäng rutt' }).click();
    await expect(page.locator('[data-testid="route-overlay"]')).toHaveCount(0);

    // Venue context preserved: detail still open, URL untouched.
    await expect(panel).toBeVisible();
    expect(page.url()).toContain('venue=test-venue-sunny');
    expect(page.url()).toMatch(/_time=14(%3A|:)00/);
  });

  test('invalid venue slug renders the localized not-found state with a way back to the map', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/?venue=this-venue-does-not-exist');

    const notice = page.getByTestId('venue-detail-error');
    await expect(notice).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    await expect(notice).toContainText('Platsen hittades inte.');

    await notice.getByRole('button', { name: 'Tillbaka till kartan' }).click();
    await expect(notice).toHaveCount(0);
    await expect.poll(() => page.url()).not.toContain('venue=');
    // Back on the coherent map state — pins still rendered.
    await expect(
      page.locator('[data-testid="venue-pin"]').first(),
    ).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
  });

  test('browser Back from venue detail restores the map state without stranding overlays', async ({ page }, testInfo) => {
    await bypassOnboarding(page);
    await page.goto('/?_time=14:00');
    await page.waitForSelector('[data-testid="venue-pin"]', { timeout: APP_SETTLE_TIMEOUT_MS });

    // Select a venue through the UI so the detail URL transition is a real
    // router push (Back must pop it). On mobile the mid-state bottom sheet
    // covers the projected pin, so use the list card entry path there; on
    // desktop use the pin entry path.
    if (testInfo.project.name === 'desktop') {
      await page.locator('[data-testid="venue-pin"][data-pin-state="sunny"]').first().click();
    } else {
      await page
        .locator('[data-testid="mobile-bottom-sheet"]')
        .getByRole('button', { name: /Välj Kafé Magasinet/ })
        .click();
    }
    const quickInfo = page.locator('[data-testid="venue-quick-info"]:visible').first();
    await expect(quickInfo).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    await quickInfo.getByRole('button', { name: 'Mer Info' }).click();

    const panel = detailPanel(page, testInfo.project.name);
    await expect(panel).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    expect(page.url()).toContain('venue=');

    await page.goBack();

    await expect(panel).toHaveCount(0);
    await expect.poll(() => page.url()).not.toContain('venue=');
    // Map context restored: pins remain, planner time param survived.
    await expect(
      page.locator('[data-testid="venue-pin"]').first(),
    ).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    expect(page.url()).toMatch(/_time=14(%3A|:)00/);
  });
});
