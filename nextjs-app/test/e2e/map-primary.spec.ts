import { expect, test } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

// Story 1.6 review (P25): named timeout for the pin-morph settle wait.
// The morph animation is 200 ms, but CI WebKit can keep the exiting pill
// in the DOM longer under load. Poll for the visual condition instead of
// sleeping a fixed duration.
const PIN_MORPH_SETTLE_TIMEOUT_MS = 2000;

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
    await expect(page.getByTestId('venue-quick-info').first()).toBeVisible();
  });

  test('mobile: forced selected venue opens QuickInfo and detail handoff URL', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Selected-venue QuickInfo flow runs only in the mobile Playwright project',
    );

    await bypassOnboarding(page);
    await page.goto('/?venue=test-venue-sunny&_state=map-with-selected-venue');
    await page.waitForSelector('[data-testid="venue-pin"]', { timeout: 15000 });

    const quickInfo = page.getByTestId('venue-quick-info').first();
    await expect(quickInfo).toBeVisible();
    await expect(quickInfo.getByRole('button', { name: /Kafé Magasinet/i })).toBeVisible();
    await expect(quickInfo.getByRole('button', { name: 'Visa Rutt' })).toBeVisible();

    await quickInfo.getByRole('button', { name: /Kafé Magasinet/i }).click();
    await expect(page).toHaveURL(/venue=test-venue-sunny/);
    await expect(page).not.toHaveURL(/_state=venue-detail/);
    const sheet = page.getByTestId('mobile-venue-detail-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('heading', { name: /Kafé Magasinet/i })).toBeVisible();
    await expect(sheet.getByRole('link', { name: /ÖPPNA I KARTOR/i })).toHaveAttribute(
      'href',
      /57\.705/,
    );
    await sheet.getByRole('button', { name: 'Stäng platsdetaljer' }).press('ArrowDown');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('[data-testid="venue-pin"][data-pin-state="sunny-selected"]')).toHaveCount(1);
  });

  test('mobile: forced venue panel expands and collapses without covering bottom nav', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Venue-list bottom sheet checks run only in the mobile Playwright project',
    );

    await bypassOnboarding(page);
    await page.goto('/?_state=map-panel-venues');

    const sheet = page.getByTestId('mobile-bottom-sheet');
    const nav = page.getByTestId('mobile-nav-bar');
    await expect(sheet).toHaveAttribute('data-state', 'full');
    await expect(page.getByRole('heading', { name: 'Hitta solen nu' })).toBeVisible();
    await expect(page.getByTestId('venue-card').first()).toBeVisible();

    const handle = page.getByTestId('mobile-bottom-sheet-handle');
    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();
    await handle.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const pointer = {
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
        bubbles: true,
        cancelable: true,
      } as const;
      element.dispatchEvent(new PointerEvent('pointerdown', {
        ...pointer,
        clientX: x,
        clientY: y,
        buttons: 1,
      }));
      element.dispatchEvent(new PointerEvent('pointermove', {
        ...pointer,
        clientX: x,
        clientY: y + 260,
        buttons: 1,
      }));
      element.dispatchEvent(new PointerEvent('pointerup', {
        ...pointer,
        clientX: x,
        clientY: y + 260,
        buttons: 0,
      }));
    });
    await expect(sheet).toHaveAttribute('data-state', 'peek');
    await expect(nav).toBeVisible();

    const sheetBox = await sheet.boundingBox();
    const navBox = await nav.boundingBox();
    expect(sheetBox).not.toBeNull();
    expect(navBox).not.toBeNull();
    if (sheetBox && navBox) {
      expect(sheetBox.y + sheetBox.height).toBeLessThanOrEqual(navBox.y + 1);
    }
  });

  test('mobile: selecting a venue from the full panel returns to peek and opens QuickInfo', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Venue-list selection flow runs only in the mobile Playwright project',
    );

    await bypassOnboarding(page);
    await page.goto('/?_state=map-panel-venues');

    const firstCard = page.getByTestId('venue-card').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await expect(page.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-state', 'peek');
    await expect(page.getByTestId('venue-quick-info').first()).toBeVisible();
  });

  test('mobile: reduced motion disables venue-card stagger and sheet transform animation', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Reduced-motion venue-list check runs only in the mobile Playwright project',
    );

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await bypassOnboarding(page);
    await page.goto('/?_state=map-panel-venues');

    const firstCard = page.getByTestId('venue-card').first();
    await expect(firstCard).toBeVisible();
    const animationName = await firstCard.evaluate(
      (el) => window.getComputedStyle(el).animationName,
    );
    expect(animationName).toBe('none');

    await page.getByTestId('mobile-bottom-sheet-handle').press('ArrowDown');
    await expect(page.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-state', 'peek');
    const sheetTransform = await page.getByTestId('mobile-bottom-sheet').evaluate(
      (el) => window.getComputedStyle(el).transform,
    );
    expect(sheetTransform === 'none' || sheetTransform === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true);
  });

  test('desktop: selected venue renders a popover with Mer Info handoff', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'Desktop QuickInfo popover flow runs only in the desktop Playwright project',
    );

    await bypassOnboarding(page);
    await page.goto('/?venue=test-venue-sunny&_state=map-with-selected-venue');
    await page.waitForSelector('[data-testid="venue-pin"]', { timeout: 15000 });

    const quickInfo = page.getByTestId('venue-quick-info').last();
    await expect(quickInfo).toBeVisible();
    await expect(quickInfo.getByRole('button', { name: 'Mer Info' })).toBeVisible();
    await quickInfo.getByRole('button', { name: 'Mer Info' }).click();
    await expect(page).toHaveURL(/venue=test-venue-sunny/);
    await expect(page).not.toHaveURL(/_state=venue-detail/);
    const panel = page.getByTestId('desktop-venue-detail-panel');
    await expect(panel).toBeVisible();
    await expect(page.getByTestId('desktop-venue-list-panel')).toBeVisible();
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    if (panelBox) {
      expect(panelBox.width).toBeCloseTo(390, 0);
    }
    await panel.getByRole('button', { name: 'Stäng platsdetaljer' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('desktop: venue list renders as a 190px overlay panel above the full map', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'Desktop venue-list panel check runs only in the desktop Playwright project',
    );

    await bypassOnboarding(page);
    await page.goto('/');

    const panel = page.getByTestId('desktop-venue-list-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'TOPPVAL NÄRA DIG' })).toBeVisible();
    const firstCard = panel.getByTestId('venue-card').first();
    await expect(firstCard).toBeVisible();
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    if (panelBox) {
      expect(panelBox.width).toBeCloseTo(190, 0);
    }
    await expect(page.getByTestId('map-container')).toBeVisible();

    await firstCard.click();
    await expect(page.getByTestId('venue-quick-info').last()).toBeVisible();
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

    const innerCircle = page
      .locator('[data-testid="venue-pin"][data-pin-state="sunny-selected"] .rounded-pill')
      .first();
    // Selected sunny circle: inner element is 44×44 (size-11). Equal width
    // and height within rounding tolerance.
    await expect
      .poll(
        async () => {
          const afterBox = await innerCircle.boundingBox();
          if (!afterBox) return Number.POSITIVE_INFINITY;
          return Math.abs(afterBox.width - afterBox.height);
        },
        { timeout: PIN_MORPH_SETTLE_TIMEOUT_MS },
      )
      .toBeLessThanOrEqual(2);
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
    await expect(page.getByTestId('venue-quick-info')).toHaveCount(0);
  });
});
