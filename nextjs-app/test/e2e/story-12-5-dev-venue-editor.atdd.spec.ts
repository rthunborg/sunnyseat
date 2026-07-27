/**
 * ATDD RED-PHASE acceptance scaffolds - Story 12.5
 * Local-only dev venue editor browser workflows.
 *
 * These tests are skipped until the implementation provides the guarded editor route and UI.
 */

import { expect, test, type Page, type Route } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

const APP_SETTLE_TIMEOUT_MS = 15_000;
const EDITOR_ROUTE = '/?_state=map-default';
const EDITOR_PANEL = '[data-testid="dev-venue-editor-panel"]';
const PUBLIC_VENUES_MATCHER = '**/api/venues?**';
const DEV_EDITOR_MATCHER = '**/api/dev/venues**';

async function bypassOnboarding(page: Page): Promise<void> {
  await page.addInitScript((key: string) => {
    window.localStorage.setItem(key, '1');
  }, ONBOARDED_FLAG_KEY);
}

async function recordRequests(page: Page, matcher: string | RegExp): Promise<string[]> {
  const urls: string[] = [];
  await page.route(matcher, async (route: Route) => {
    urls.push(route.request().url());
    await route.fallback();
  });
  return urls;
}

test.describe.skip('Story 12.5 ATDD - dev venue editor E2E workflows', () => {
  test('[P0] production or gate-off browsing cannot reveal editor UI or dev API route', async ({ page }) => {
    await bypassOnboarding(page);
    const devRequests = await recordRequests(page, DEV_EDITOR_MATCHER);

    await page.goto('/?_state=map-default');
    await expect(page.locator('[data-testid="venue-pin"]').first()).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });

    await expect(page.locator(EDITOR_PANEL)).toHaveCount(0);
    expect(devRequests).toEqual([]);
  });

  test('[P0] local dev guard can include hidden venues and hide/show changes public visibility semantics', async ({ page }) => {
    await bypassOnboarding(page);

    await page.goto(EDITOR_ROUTE);
    await expect(page.locator(EDITOR_PANEL)).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    await page.getByLabel(/visa dolda/i).check();
    await expect(page.getByRole('option', { name: /test venue hidden/i })).toBeVisible();

    await page.getByRole('button', { name: /dolj/i }).click();
    await expect(page.getByRole('status')).toHaveText(/sparad|uppdaterad/i);
    await page.reload();
    await expect(page.getByText(/test venue hidden/i)).toHaveCount(0);

    await page.locator(EDITOR_PANEL).getByRole('button', { name: /visa igen/i }).click();
    await expect(page.getByRole('status')).toHaveText(/sparad|uppdaterad/i);
  });

  test('[P0] dragging display pin changes marker routing data while prediction params and geometry hash stay stable', async ({ page }) => {
    await bypassOnboarding(page);
    const publicRequests = await recordRequests(page, PUBLIC_VENUES_MATCHER);

    await page.goto(EDITOR_ROUTE);
    await expect(page.locator(EDITOR_PANEL)).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    const beforeHash = await page.locator('[data-testid="dev-venue-editor-geometry-hash"]').textContent();

    await page.locator('[data-testid="dev-venue-editor-display-pin"]').dragTo(
      page.locator('[data-testid="map-canvas"]'),
      { targetPosition: { x: 160, y: 160 } },
    );
    await page.locator(EDITOR_PANEL).getByRole('button', { name: /spara/i }).click();

    await expect(page.getByRole('status')).toHaveText(/sparad|uppdaterad/i);
    await expect(page.locator('[data-testid="dev-venue-editor-geometry-hash"]')).toHaveText(beforeHash ?? '');
    expect(publicRequests.every((url) => !new URL(url).searchParams.has('displayLat'))).toBe(true);
  });

  test('[P0] invalid polygon shows inline error and performs no PATCH; valid polygon saves and marks geometry dirty', async ({ page }) => {
    await bypassOnboarding(page);
    const devRequests = await recordRequests(page, DEV_EDITOR_MATCHER);

    await page.goto(EDITOR_ROUTE);
    await page.getByLabel(/polygon/i).fill('[[11.97,57.70],[11.98,57.70]]');
    await expect(page.getByRole('alert')).toHaveText(/polygon/i);
    await expect(page.locator(EDITOR_PANEL).getByRole('button', { name: /spara/i })).toBeDisabled();
    expect(devRequests.filter((url) => new URL(url).pathname.endsWith('/api/dev/venues'))).toEqual([]);

    await page.getByLabel(/polygon/i).fill(
      '[[11.9700,57.7050],[11.9704,57.7050],[11.9704,57.7054],[11.9700,57.7050]]',
    );
    await page.locator(EDITOR_PANEL).getByRole('button', { name: /spara/i }).click();
    await expect(page.getByTestId('dev-venue-editor-geometry-state')).toHaveText(/dirty|queued|ready/i);
  });

  test('[P1] gate-off map and detail pixel surface remain free of editor markup and extra requests', async ({ page }) => {
    await bypassOnboarding(page);
    const devRequests = await recordRequests(page, DEV_EDITOR_MATCHER);

    await page.goto('/?venue=test-venue-sunny&_state=venue-detail-loaded');
    await expect(page.getByRole('heading', { name: /kafe magasinet|kafé magasinet/i })).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });

    await expect(page.locator(EDITOR_PANEL)).toHaveCount(0);
    expect(devRequests).toEqual([]);
  });
});
