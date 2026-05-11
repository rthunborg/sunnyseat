import { expect, test } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

// Story 1.6 review (P25): named constant for the pin-morph settle wait.
// Matches the 200 ms morph animation window in `VenuePin.tsx` plus a
// 100 ms safety margin so layout has settled before assertions read
// bounding rects.
const PIN_MORPH_SETTLE_MS = 300;

async function bypassOnboarding(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript((key: string) => {
    window.localStorage.setItem(key, '1');
  }, ONBOARDED_FLAG_KEY);
}

test.describe('map-primary', () => {
  test('mobile: map canvas, gradient overlay, controls, and at least one pin render', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Mobile-viewport map-primary checks run only in the mobile Playwright project',
    );

    await page.goto('/');

    await expect(page.getByTestId('map-container')).toBeVisible();
    await expect(page.locator('.gradient-map-overlay')).toHaveCount(1);
    await expect(page.getByTestId('map-controls')).toBeVisible();

    await page.waitForSelector('[data-testid="venue-pin"]', { timeout: 5000 });
    const pinCount = await page.locator('[data-testid="venue-pin"]').count();
    expect(pinCount).toBeGreaterThan(0);

    const navigations = await page.evaluate(
      () => performance.getEntriesByType('navigation').length,
    );
    expect(navigations).toBeGreaterThan(0);
  });

  test('desktop: map and desktop navbar coexist with pins rendering', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'Desktop-viewport map-primary checks run only in the desktop Playwright project',
    );

    await page.goto('/');

    await expect(page.getByTestId('map-container')).toBeVisible();
    await expect(page.locator('.gradient-map-overlay')).toHaveCount(1);
    await expect(page.getByTestId('map-controls')).toBeVisible();
    await expect(page.getByTestId('desktop-nav-bar')).toBeVisible();

    await page.waitForSelector('[data-testid="venue-pin"]', { timeout: 5000 });
    const pinCount = await page.locator('[data-testid="venue-pin"]').count();
    expect(pinCount).toBeGreaterThan(0);

    const navigations = await page.evaluate(
      () => performance.getEntriesByType('navigation').length,
    );
    expect(navigations).toBeGreaterThan(0);
  });

  test('mobile: gradient map overlay is transparent to pointer events', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Pointer-events check runs only in the mobile Playwright project',
    );

    await page.goto('/');
    const overlay = page.locator('.gradient-map-overlay');
    await expect(overlay).toHaveCount(1);
    const pointerEvents = await overlay.evaluate(
      (el) => window.getComputedStyle(el).pointerEvents,
    );
    expect(pointerEvents).toBe('none');
  });

  test('mobile: clicking a pin selects it (sunny-selected state)', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Pin selection check runs only in the mobile Playwright project',
    );

    await bypassOnboarding(page);
    await page.goto('/');
    await page.waitForSelector('[data-testid="venue-pin"][data-pin-state="sunny"]', {
      timeout: 15000,
    });

    const sunnyPin = page.locator('[data-testid="venue-pin"][data-pin-state="sunny"]').first();
    await sunnyPin.click();

    await expect(
      page.locator('[data-testid="venue-pin"][data-pin-state="sunny-selected"]'),
    ).toHaveCount(1);
  });

  test('mobile: pin morphs from pill to circle when selected (Story 1.4 AC3)', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Pin morph mechanics check runs only in the mobile Playwright project',
    );

    await bypassOnboarding(page);
    // (Story 1.6 review P24: removed duplicate `await bypassOnboarding(page)`.)
    await page.goto('/');
    await page.waitForSelector('[data-testid="venue-pin"][data-pin-state="sunny"]', {
      timeout: 15000,
    });

    const sunnyPin = page.locator('[data-testid="venue-pin"][data-pin-state="sunny"]').first();
    const beforeBox = await sunnyPin.boundingBox();
    expect(beforeBox).not.toBeNull();
    if (!beforeBox) return;
    // Pre-selection: pill — wider than tall.
    const beforeAspect = beforeBox.width / Math.max(beforeBox.height, 1);
    expect(beforeAspect).toBeGreaterThan(1);

    await sunnyPin.click();
    await expect(
      page.locator('[data-testid="venue-pin"][data-pin-state="sunny-selected"]'),
    ).toHaveCount(1);

    // Wait past the 200 ms morph window to let the layout settle.
    await page.waitForTimeout(PIN_MORPH_SETTLE_MS);
    const innerCircle = page
      .locator('[data-testid="venue-pin"][data-pin-state="sunny-selected"] .rounded-pill')
      .first();
    const afterBox = await innerCircle.boundingBox();
    expect(afterBox).not.toBeNull();
    if (!afterBox) return;
    // Selected sunny circle: inner element is 44×44 (size-11). Equal width
    // and height within rounding tolerance.
    expect(Math.abs(afterBox.width - afterBox.height)).toBeLessThanOrEqual(2);
  });

  test('mobile: clicking the map canvas deselects the active pin (Story 1.4 AC4)', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Deselect-by-canvas check runs only in the mobile Playwright project',
    );

    await bypassOnboarding(page);
    await page.goto('/');
    await page.waitForSelector('[data-testid="venue-pin"][data-pin-state="sunny"]', {
      timeout: 15000,
    });

    const sunnyPin = page.locator('[data-testid="venue-pin"][data-pin-state="sunny"]').first();
    await sunnyPin.click();
    await expect(
      page.locator('[data-testid="venue-pin"][data-pin-state="sunny-selected"]'),
    ).toHaveCount(1);

    // Click in the top-left of the canvas where pins are unlikely to sit.
    const canvas = page.locator('.maplibregl-canvas');
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    if (!canvasBox) return;
    await canvas.click({
      position: { x: 20, y: 20 },
    });

    await expect(
      page.locator('[data-testid="venue-pin"][data-pin-state="sunny-selected"]'),
    ).toHaveCount(0);
  });
});
