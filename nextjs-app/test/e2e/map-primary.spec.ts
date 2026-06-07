import { expect, test, type Locator, type Page } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

// Story 1.6 review (P25): named timeout for the pin-morph settle wait.
// The morph animation is 200 ms, but CI WebKit can keep the exiting pill
// in the DOM longer under load. Poll for the visual condition instead of
// sleeping a fixed duration.
const PIN_MORPH_SETTLE_TIMEOUT_MS = 2000;
const APP_SETTLE_TIMEOUT_MS = 15_000;

type WindowOpenCall = {
  url: string;
  target?: string;
  features?: string;
};

async function bypassOnboarding(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript((key: string) => {
    window.localStorage.setItem(key, '1');
  }, ONBOARDED_FLAG_KEY);
}

async function captureWindowOpen(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.open = (url?: string | URL, target?: string, features?: string) => {
      const calls = ((window as unknown as {
        __sunnyseatWindowOpenCalls?: Array<{
          url: string;
          target?: string;
          features?: string;
        }>;
      }).__sunnyseatWindowOpenCalls ??= []);
      calls.push({
        url: String(url ?? ''),
        target,
        features,
      });
      return null;
    };
  });
}

async function windowOpenCalls(page: Page): Promise<Array<{
  url: string;
  target?: string;
  features?: string;
}>> {
  return page.evaluate(() => (
    (window as unknown as {
      __sunnyseatWindowOpenCalls?: Array<{
        url: string;
        target?: string;
        features?: string;
      }>;
    }).__sunnyseatWindowOpenCalls ?? []
  ));
}

function rateLimitIpForTest(title: string): string {
  let hash = 0;
  for (const char of title) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) >>> 0;
  }

  return `10.${(hash >>> 16) & 255}.${(hash >>> 8) & 255}.${(hash & 254) + 1}`;
}

function expectCoordinatePair(value: string | null): asserts value is string {
  expect(value).toMatch(/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/);
}

function expectNativeDirectionsHandoff(
  calls: WindowOpenCall[],
  expectedDestination?: string,
): void {
  const call = calls.find((candidate) =>
    candidate.url.startsWith('https://maps.apple.com/') ||
    candidate.url.startsWith('https://www.google.com/maps/dir/'));

  expect(call, `Expected native maps handoff, received: ${JSON.stringify(calls)}`).toBeTruthy();
  if (!call) throw new Error('Missing native maps handoff');
  expect(call.target).toBe('_blank');
  expect(call.features).toBe('noopener,noreferrer');

  const url = new URL(call.url);
  if (url.hostname === 'maps.apple.com') {
    const destination = url.searchParams.get('daddr');
    expectCoordinatePair(destination);
    if (expectedDestination) expect(destination).toBe(expectedDestination);
    expect(url.searchParams.get('dirflg')).toBe('w');
    return;
  }

  expect(url.pathname).toBe('/maps/dir/');
  const destination = url.searchParams.get('destination');
  expectCoordinatePair(destination);
  if (expectedDestination) expect(destination).toBe(expectedDestination);
  expect(url.searchParams.get('travelmode')).toBe('walking');
  expect(url.searchParams.get('dir_action')).toBe('navigate');
}

function visiblePlanner(page: Page): Locator {
  return page.locator('[data-testid="time-slider-panel"]:visible').first();
}

function visibleTestId(page: Page, testId: string): Locator {
  return page.locator(`[data-testid="${testId}"]:visible`).first();
}

async function expectFreePlannerChrome(page: Page): Promise<Locator> {
  const planner = visiblePlanner(page);
  await expect(planner).toBeVisible();
  await expect(planner.getByRole('button', { name: 'Öppna kalender' })).toBeVisible();
  await expect(planner.getByRole('slider', { name: 'Välj tid' })).toBeVisible();
  await expect(planner).not.toContainText(/Säsongskortet|Swish|Premium|Season Pass/i);
  return planner;
}

async function firstUncoveredSunnyPin(page: Page): Promise<Locator> {
  const pins = page.locator('[data-testid="venue-pin"][data-pin-state="sunny"]');
  await expect(pins.first()).toBeVisible();
  const plannerBox = await visiblePlanner(page).boundingBox().catch(() => null);
  const sheetBox = await page.getByTestId('mobile-bottom-sheet').boundingBox().catch(() => null);
  const viewport = page.viewportSize();
  const count = await pins.count();
  let firstInViewport: Locator | null = null;

  for (let index = 0; index < count; index += 1) {
    const pin = pins.nth(index);
    const box = await pin.boundingBox();
    if (!box || !plannerBox) return pin;
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const outsideViewport = viewport
      ? centerX < 0 || centerX > viewport.width || centerY < 0 || centerY > viewport.height
      : false;
    if (outsideViewport) continue;
    firstInViewport ??= pin;
    const coveredByPlanner = plannerBox
      ? isPointInsideBox(centerX, centerY, plannerBox)
      : false;
    const coveredBySheet = sheetBox
      ? isPointInsideBox(centerX, centerY, sheetBox)
      : false;
    if (!coveredByPlanner && !coveredBySheet) return pin;
  }

  return firstInViewport ?? pins.first();
}

async function collapseVenueSheetToPeek(page: Page): Promise<void> {
  const sheet = page.getByTestId('mobile-bottom-sheet');
  const state = await sheet.getAttribute('data-state');
  if (state !== 'peek') {
    await page.getByTestId('mobile-bottom-sheet-handle').press('ArrowDown');
  }
  await expect(sheet).toHaveAttribute('data-state', 'peek');
}

function isPointInsideBox(
  x: number,
  y: number,
  box: { x: number; y: number; width: number; height: number },
): boolean {
  return x >= box.x &&
    x <= box.x + box.width &&
    y >= box.y &&
    y <= box.y + box.height;
}

function stockholmDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function addDaysToDateKey(dateKey: string, days: number): string {
  const [year = '1970', month = '01', day = '01'] = dateKey.split('-');
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function swedishSelectDateLabel(dateKey: string): string {
  const [year = '1970', month = '01', day = '01'] = dateKey.split('-');
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const label = new Intl.DateTimeFormat('sv-SE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
  return `Välj ${label}`;
}

test.describe('map-primary', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await page.setExtraHTTPHeaders({
      'x-forwarded-for': rateLimitIpForTest(testInfo.title),
    });
  });

  test('mobile: map canvas, gradient overlay, controls, and at least one pin render', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Mobile-viewport map-primary checks run only in the mobile Playwright project',
    );

    await page.goto('/');

    await expect(visibleTestId(page, 'map-container')).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    await expect(page.locator('.gradient-map-overlay')).toHaveCount(1, {
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    await expect(visibleTestId(page, 'map-controls')).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });

    await page.waitForSelector('[data-testid="venue-pin"]', { timeout: APP_SETTLE_TIMEOUT_MS });
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

    await bypassOnboarding(page);
    await page.goto('/');

    await expect(page.getByTestId('map-container')).toBeVisible();
    await expect(page.locator('.gradient-map-overlay')).toHaveCount(1);
    await expect(page.getByTestId('map-controls')).toBeVisible();
    await expect(page.getByTestId('map-control-zoom-in')).toBeVisible();
    await expect(page.getByTestId('map-control-zoom-out')).toBeVisible();
    const desktopNav = page.getByTestId('desktop-nav-bar');
    await expect(desktopNav).toBeVisible();
    await expect(desktopNav.getByRole('button', { name: 'Min plats' })).toBeVisible();
    await expect(desktopNav.getByRole('button', { name: 'Inställningar' })).toBeVisible();

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
    await expect(overlay).toHaveCount(1, { timeout: APP_SETTLE_TIMEOUT_MS });
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
    await collapseVenueSheetToPeek(page);

    const sunnyPin = await firstUncoveredSunnyPin(page);
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
    await expect(quickInfo.getByRole('button', { name: /Visa Rutt/ })).toBeVisible();

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
    await page.getByTestId('mobile-venue-detail-handle').press('ArrowDown');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('[data-testid="venue-pin"][data-pin-state="sunny-selected"]')).toHaveCount(1);
  });

  test('mobile: QuickInfo route opens maps and keeps route overlay dismissible', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'QuickInfo route handoff runs only in the mobile Playwright project',
    );

    await captureWindowOpen(page);
    await bypassOnboarding(page);
    await page.goto('/?venue=test-venue-sunny&_state=map-with-selected-venue');
    await page.waitForSelector('[data-testid="venue-pin"]', { timeout: 15000 });

    const quickInfo = page.getByTestId('venue-quick-info').first();
    await expect(quickInfo).toBeVisible();
    await expect(quickInfo.getByText(/ca \d+ min/)).toBeVisible();
    await quickInfo.getByRole('button', { name: /Visa Rutt/ }).click();

    const calls = await windowOpenCalls(page);
    expectNativeDirectionsHandoff(calls);

    const overlay = page.getByRole('dialog', { name: /Rutt till Kafé Magasinet/i });
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText(/ca \d+ min promenad/);
    await expect(overlay.getByRole('link', { name: 'ÖPPNA I KARTOR' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    await overlay.getByRole('button', { name: 'Stäng rutt' }).click();
    await expect(overlay).toBeHidden();
    await expect(page.locator('[data-testid="venue-pin"][data-pin-state="sunny-selected"]')).toHaveCount(1);
  });

  test('mobile: venue detail route and open-map link share the maps handoff contract', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Venue-detail route handoff runs only in the mobile Playwright project',
    );

    await captureWindowOpen(page);
    await bypassOnboarding(page);
    await page.goto('/?venue=test-venue-sunny&_state=venue-detail');

    const sheet = page.getByTestId('mobile-venue-detail-sheet');
    await expect(sheet).toBeVisible();
    const openMaps = sheet.getByRole('link', { name: /ÖPPNA I KARTOR/i });
    const openMapsHref = await openMaps.getAttribute('href');
    expect(openMapsHref).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    const openMapsDestination = new URL(openMapsHref ?? '').searchParams.get('query');
    expectCoordinatePair(openMapsDestination);
    await expect(openMaps).toHaveAttribute('rel', 'noopener noreferrer');

    await expect(sheet.getByText(/ca \d+ min promenad/)).toBeVisible();
    await sheet.getByRole('button', { name: /Visa Rutt/ }).click();
    await expect(page.getByRole('dialog', { name: /Rutt till Kafé Magasinet/i })).toBeVisible();

    const calls = await windowOpenCalls(page);
    expectNativeDirectionsHandoff(calls, openMapsDestination);
  });

  test('mobile: selected venue state includes free planner chrome without covering QuickInfo', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Selected-venue planner chrome runs only in the mobile Playwright project',
    );

    await bypassOnboarding(page);
    await page.goto('/?venue=test-venue-sunny&_state=map-with-selected-venue');
    await page.waitForSelector('[data-testid="venue-pin"]', { timeout: 15000 });

    const quickInfo = page.getByTestId('venue-quick-info').first();
    await expect(quickInfo).toBeVisible();
    const planner = await expectFreePlannerChrome(page);

    const quickInfoBox = await quickInfo.boundingBox();
    const plannerBox = await planner.boundingBox();
    expect(quickInfoBox).not.toBeNull();
    expect(plannerBox).not.toBeNull();
    if (quickInfoBox && plannerBox) {
      const overlapX = Math.max(
        0,
        Math.min(quickInfoBox.x + quickInfoBox.width, plannerBox.x + plannerBox.width) -
          Math.max(quickInfoBox.x, plannerBox.x),
      );
      const overlapY = Math.max(
        0,
        Math.min(quickInfoBox.y + quickInfoBox.height, plannerBox.y + plannerBox.height) -
          Math.max(quickInfoBox.y, plannerBox.y),
      );
      expect(overlapX * overlapY).toBe(0);
      expect(plannerBox.y).toBeLessThan(quickInfoBox.y);
    }
  });

  test('mobile: selecting a future date sends planner params to the venues API', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Future-date planner request runs only in the mobile Playwright project',
    );

    await bypassOnboarding(page);
    await page.goto('/');
    await page.waitForSelector('[data-testid="venue-pin"]', { timeout: 15000 });

    const planner = await expectFreePlannerChrome(page);
    await planner.getByRole('slider', { name: 'Välj tid' }).press('Home');
    await expect(planner.getByText('06:00')).toBeVisible();
    const expectedDate = addDaysToDateKey(stockholmDateKey(), 1);
    const plannedResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.endsWith('/api/venues') &&
        url.searchParams.get('date') === expectedDate &&
        url.searchParams.get('time') === '06:00';
    });
    await planner.getByRole('button', { name: 'Öppna kalender' }).click();
    await page.getByRole('button', { name: swedishSelectDateLabel(expectedDate) }).click();

    const response = await plannedResponse;
    expect(response.ok()).toBe(true);
    const params = new URL(response.url()).searchParams;
    expect(params.get('time')).toMatch(/^\d{2}:\d{2}$/);
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
    await expect(sheet).toHaveAttribute('data-state', 'mid');
    await expect(page.getByTestId('venue-card').first()).toBeVisible();

    const handle = page.getByTestId('mobile-bottom-sheet-handle');
    await handle.press('Enter');
    await expect(sheet).toHaveAttribute('data-state', 'full');

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

  test('mobile: expanded venue panel keeps planner chrome available without premium copy', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Venue-list planner chrome runs only in the mobile Playwright project',
    );

    await bypassOnboarding(page);
    await page.goto('/?_state=map-panel-venues');

    const sheet = page.getByTestId('mobile-bottom-sheet');
    await expect(sheet).toHaveAttribute('data-state', 'mid');
    await page.getByTestId('mobile-bottom-sheet-handle').press('Enter');
    await expect(sheet).toHaveAttribute('data-state', 'full');
    await expectFreePlannerChrome(page);
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

    const sheet = page.getByTestId('mobile-bottom-sheet');
    const handle = page.getByTestId('mobile-bottom-sheet-handle');
    await expect(sheet).toHaveAttribute('data-state', 'mid');
    await handle.press('ArrowUp');
    await expect(sheet).toHaveAttribute('data-state', 'full');
    await handle.press('ArrowDown');
    await expect(page.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-state', 'mid');
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

  test('desktop: venue detail and planner bottom bar spans the map viewport under overlay panels', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'Desktop venue-detail planner layout runs only in the desktop Playwright project',
    );

    await bypassOnboarding(page);
    await page.goto('/?venue=test-venue-sunny&_state=venue-detail');
    const panel = page.getByTestId('desktop-venue-detail-panel');
    await expect(panel).toBeVisible();
    const planner = await expectFreePlannerChrome(page);

    const panelBox = await panel.boundingBox();
    const plannerBox = await planner.boundingBox();
    expect(panelBox).not.toBeNull();
    expect(plannerBox).not.toBeNull();
    if (panelBox && plannerBox) {
      expect(plannerBox.x).toBeLessThan(panelBox.x);
      expect(plannerBox.x + plannerBox.width).toBeGreaterThan(panelBox.x + panelBox.width - 24);
    }
  });

  test('desktop: venue list renders as a 340px overlay panel above the full map', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'Desktop venue-list panel check runs only in the desktop Playwright project',
    );

    await bypassOnboarding(page);
    await bypassOnboarding(page);
    await page.goto('/');

    const panel = page.getByTestId('desktop-venue-list-panel');
    await expect(panel).toBeVisible();
    const firstCard = panel.getByTestId('venue-card').first();
    await expect(firstCard).toBeVisible();
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    if (panelBox) {
      expect(panelBox.width).toBeCloseTo(340, 0);
    }
    await expect(page.getByTestId('map-container')).toBeVisible();

    await firstCard.click();
    await expect(page.getByTestId('venue-quick-info').last()).toBeVisible();
  });

  test('desktop: navbar search selects a venue and opens QuickInfo without navigation', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'Desktop search handoff runs only in the desktop Playwright project',
    );

    await bypassOnboarding(page);
    await page.goto('/');
    await page.waitForSelector('[data-testid="venue-pin"]', { timeout: 15000 });
    const combobox = page.getByRole('combobox', { name: /Sök plats|Search venue/ });
    await combobox.fill('magasinet');
    await page.getByRole('option', { name: /Kafé Magasinet/i }).click();

    await expect(page).not.toHaveURL(/venue=/);
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
    await collapseVenueSheetToPeek(page);

    const sunnyPin = await firstUncoveredSunnyPin(page);
    const beforeBox = await sunnyPin.boundingBox();
    expect(beforeBox).not.toBeNull();
    if (!beforeBox) return;
    // Refreshed MVP pins render as teardrops: circular body plus tail.
    const beforeAspect = beforeBox.width / Math.max(beforeBox.height, 1);
    expect(beforeAspect).toBeLessThan(1.1);
    await expect(sunnyPin.locator('[data-pin-tail]')).toHaveCount(1);

    await sunnyPin.click();
    await expect(
      page.locator('[data-testid="venue-pin"][data-pin-state="sunny-selected"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('[data-testid="venue-pin"][data-pin-state="sunny-selected"] [data-pin-tail]'),
    ).toHaveCount(0);

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
    await collapseVenueSheetToPeek(page);

    const sunnyPin = await firstUncoveredSunnyPin(page);
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
      position: { x: canvasBox.width - 8, y: 80 },
    });

    await expect(
      page.locator('[data-testid="venue-pin"][data-pin-state="sunny-selected"]'),
    ).toHaveCount(0);
    await expect(page.getByTestId('venue-quick-info')).toHaveCount(0);
  });
});
