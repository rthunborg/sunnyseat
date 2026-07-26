import { expect, test, type Locator, type Page } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

// Story 1.6 review (P25): named timeout for the pin-morph settle wait.
// The morph animation is 200 ms, but CI WebKit can keep the exiting pill
// in the DOM longer under load. Poll for the visual condition instead of
// sleeping a fixed duration.
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

async function firstUncoveredPin(page: Page, selector = '[data-testid="venue-pin"]'): Promise<Locator> {
  const pins = page.locator(selector);
  await expect(pins.first()).toBeVisible();
  const plannerBox = await visiblePlanner(page).boundingBox().catch(() => null);
  const sheetBox = await page.getByTestId('mobile-bottom-sheet').boundingBox().catch(() => null);
  const viewport = page.viewportSize();
  const count = await pins.count();
  let targetPin: Locator | null = null;

  for (let index = 0; index < count; index += 1) {
    const pin = pins.nth(index);
    const box = await pin.boundingBox();
    if (!box) continue;
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const outsideViewport = viewport
      ? box.x < 0 ||
        box.y < 0 ||
        box.x + box.width > viewport.width ||
        box.y + box.height > viewport.height
      : false;
    if (outsideViewport) continue;
    const coveredByPlanner = plannerBox
      ? isPointInsideBox(centerX, centerY, plannerBox)
      : false;
    const coveredBySheet = sheetBox
      ? box.y + box.height >= sheetBox.y - 8
      : false;
    if (!coveredByPlanner && !coveredBySheet) {
      targetPin = pin;
      break;
    }
  }

  expect(targetPin, `Expected an uncovered map pin matching ${selector}`).not.toBeNull();
  return targetPin!;
}

async function firstUncoveredSunnyPin(page: Page): Promise<Locator> {
  return firstUncoveredPin(page, '[data-testid="venue-pin"][data-pin-state="sunny"]');
}

async function setVenueSheetRows(page: Page, targetRows: number): Promise<void> {
  const sheet = page.getByTestId('mobile-bottom-sheet');
  const handle = page.getByTestId('mobile-bottom-sheet-handle');
  await expect(sheet).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const maxRowsAttribute = await sheet.getAttribute('data-max-rows');
    const maxRows = Number(maxRowsAttribute);
    const clampedTargetRows = Number.isFinite(maxRows)
      ? Math.min(targetRows, maxRows)
      : targetRows;
    const currentRowsAttribute = await sheet.getAttribute('data-visible-rows');
    const currentRows = Number(currentRowsAttribute);
    if (!Number.isFinite(currentRows)) {
      await expect(sheet).toHaveAttribute('data-visible-rows', /^\d+$/);
      continue;
    }
    if (currentRows === clampedTargetRows) {
      await expect(sheet).toHaveAttribute('data-state', `rows-${clampedTargetRows}`);
      return;
    }
    await handle.press(currentRows > clampedTargetRows ? 'ArrowDown' : 'ArrowUp');
  }

  const finalMaxRows = await getSheetMaxRows(page);
  const finalTargetRows = Math.min(targetRows, finalMaxRows);
  await expectSheetRowsClamped(page, finalTargetRows);
}

async function getSheetRows(page: Page): Promise<number> {
  const sheet = page.getByTestId('mobile-bottom-sheet');
  await expect(sheet).toHaveAttribute('data-visible-rows', /^\d+$/, {
    timeout: APP_SETTLE_TIMEOUT_MS,
  });
  const value = await sheet.getAttribute('data-visible-rows');
  return Number(value);
}

async function getSheetMaxRows(page: Page): Promise<number> {
  const sheet = page.getByTestId('mobile-bottom-sheet');
  await expect(sheet).toHaveAttribute('data-max-rows', /^\d+$/, {
    timeout: APP_SETTLE_TIMEOUT_MS,
  });
  const value = await sheet.getAttribute('data-max-rows');
  return Number(value);
}

async function expectSheetRowsClamped(page: Page, requestedRows: number): Promise<number> {
  const sheet = page.getByTestId('mobile-bottom-sheet');
  let resolvedRows = 0;
  await expect(async () => {
    const [rowsAttribute, maxRowsAttribute, stateAttribute] = await Promise.all([
      sheet.getAttribute('data-visible-rows'),
      sheet.getAttribute('data-max-rows'),
      sheet.getAttribute('data-state'),
    ]);
    const currentRows = Number(rowsAttribute);
    const maxRows = Number(maxRowsAttribute);
    expect(Number.isFinite(currentRows)).toBe(true);
    expect(Number.isFinite(maxRows)).toBe(true);
    const expectedRows = Math.min(requestedRows, maxRows);
    expect(currentRows).toBe(expectedRows);
    expect(stateAttribute).toBe(`rows-${expectedRows}`);
    resolvedRows = expectedRows;
  }).toPass({ timeout: APP_SETTLE_TIMEOUT_MS });
  return resolvedRows;
}

async function visibleVenueRowCounts(page: Page): Promise<{
  fullyVisible: number;
  partiallyVisible: number;
}> {
  const scrollBody = page.locator('[data-bottom-sheet-scroll-body="true"]').first();
  const bodyBox = await scrollBody.boundingBox();
  expect(bodyBox).not.toBeNull();
  if (!bodyBox) return { fullyVisible: 0, partiallyVisible: 0 };

  return page.locator('[data-testid="venue-card"]').evaluateAll((nodes, box) => {
    const bodyTop = box.y;
    const bodyBottom = box.y + box.height;
    let fullyVisible = 0;
    let partiallyVisible = 0;
    for (const node of nodes) {
      const element = node as HTMLElement;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const visible =
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        rect.width > 0 &&
        rect.height > 0;
      const overlaps = visible && rect.bottom > bodyTop + 1 && rect.top < bodyBottom - 1;
      const fully = visible && rect.top >= bodyTop - 1 && rect.bottom <= bodyBottom + 1;
      if (overlaps) partiallyVisible += 1;
      if (fully) fullyVisible += 1;
    }
    return { fullyVisible, partiallyVisible };
  }, bodyBox);
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
    // Force a deterministic midday planner time so sun-dependent state (the
    // `sunny` pin state, server-computed) does not hinge on the CI runner's
    // wall clock — the slider otherwise defaults to "now", so this suite was
    // green by day and red in the evening. The app honours `?_time=`
    // (AppContextProviders → TimeProvider.forcedTime).
    const nativeGoto = page.goto.bind(page);
    page.goto = ((url: string, options?: Parameters<typeof nativeGoto>[1]) => {
      const target = new URL(url, 'http://localhost:3000');
      if (!target.searchParams.has('_time')) target.searchParams.set('_time', '13:00');
      return nativeGoto(target.pathname + target.search + target.hash, options);
    }) as typeof page.goto;
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

  test('mobile: clicking a pin selects it without changing public-sun state', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Pin selection check runs only in the mobile Playwright project',
    );

    await bypassOnboarding(page);
    await page.goto('/');
    await page.waitForSelector('[data-testid="venue-pin"]', {
      timeout: 15000,
    });
    await setVenueSheetRows(page, 0);

    const pin = await firstUncoveredPin(page);
    const stateBefore = await pin.getAttribute('data-pin-state');
    expect(stateBefore).toBeTruthy();
    await pin.click();

    const selectedPin = page.locator('[data-testid="venue-pin"][data-selected="true"]');
    await expect(selectedPin).toHaveCount(1);
    await expect(selectedPin).toHaveAttribute('data-pin-state', stateBefore!);
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
    await expect(page).toHaveURL(/\/(\?.*)?$/); // map root; tolerate the forced dev `?_time=` query
    await expect(page.locator('[data-testid="venue-pin"][data-selected="true"]')).toHaveCount(1);
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
    // Story 11.4 (AC2): the quick-info route CTA reads only "VISA RUTT" — the
    // ETA was deliberately removed from the card and now lives only on the
    // route overlay (asserted below). Anchor on the button itself and confirm
    // the card carries no "ca N min" estimate text.
    const routeButton = quickInfo.getByRole('button', { name: /Visa Rutt/ });
    await expect(routeButton).toBeVisible();
    await expect(quickInfo.getByText(/ca \d+ min/)).toHaveCount(0);
    await routeButton.click();

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
    await expect(page.locator('[data-testid="venue-pin"][data-selected="true"]')).toHaveCount(1);
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

  test('mobile: planner chrome meets the 12.9 slider/date geometry contract at 390x844', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Mobile planner geometry runs only in the mobile Playwright project',
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await bypassOnboarding(page);
    await page.goto('/?_state=map-primary&_time=14:00');
    await page.waitForSelector('[data-testid="venue-pin"]', { timeout: APP_SETTLE_TIMEOUT_MS });

    const planner = await expectFreePlannerChrome(page);
    const panelBox = await planner.boundingBox();
    expect(panelBox).not.toBeNull();
    if (!panelBox) return;
    expect(panelBox.height).toBeGreaterThanOrEqual(68);
    expect(panelBox.height).toBeLessThanOrEqual(72);

    const trackBox = await planner.getByTestId('time-slider-track').boundingBox();
    const thumbBox = await planner.getByTestId('time-slider-thumb').boundingBox();
    const badgeBox = await planner.getByTestId('time-slider-value-badge').boundingBox();
    const hitBox = await planner.getByRole('slider', { name: 'Välj tid' }).boundingBox();
    const trigger = planner.getByTestId('planner-date-trigger');
    const triggerBox = await trigger.boundingBox();
    expect(trackBox).not.toBeNull();
    expect(thumbBox).not.toBeNull();
    expect(badgeBox).not.toBeNull();
    expect(hitBox).not.toBeNull();
    expect(triggerBox).not.toBeNull();
    if (!trackBox || !thumbBox || !badgeBox || !hitBox || !triggerBox) return;

    expect(trackBox.height).toBeCloseTo(6, 0);
    expect(thumbBox.width).toBeCloseTo(14.1, 0);
    expect(thumbBox.height).toBeCloseTo(14.1, 0);
    expect(hitBox.width).toBeGreaterThanOrEqual(44);
    expect(hitBox.height).toBeGreaterThanOrEqual(44);
    expect(badgeBox.y + badgeBox.height).toBeLessThan(thumbBox.y);
    expect(thumbBox.y - (badgeBox.y + badgeBox.height)).toBeGreaterThanOrEqual(4);
    expect(triggerBox.width).toBeGreaterThanOrEqual(44);
    expect(triggerBox.height).toBeGreaterThanOrEqual(44);
    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(await trigger.locator('svg').count()).toBe(1);
    await expect(planner.getByTestId('planner-date-next')).toHaveCount(0);
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
    const slider = planner.getByRole('slider', { name: 'Välj tid' });
    const expectedDate = addDaysToDateKey(stockholmDateKey(), 1);
    const selectedTime = await slider.getAttribute('aria-valuetext');
    expect(selectedTime).toMatch(/^\d{2}:\d{2}$/);

    const plannedResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.endsWith('/api/venues') &&
        url.searchParams.get('date') === expectedDate &&
        url.searchParams.get('time') === selectedTime;
    });
    await planner.getByRole('button', { name: 'Öppna kalender' }).click();
    await page.getByRole('button', { name: swedishSelectDateLabel(expectedDate) }).click();
    const response = await plannedResponse;
    expect(response.ok()).toBe(true);
    const params = new URL(response.url()).searchParams;
    expect(params.get('time')).toBe(selectedTime);

    await expect(slider).toHaveAttribute('aria-valuemin', '360');
    await slider.press('Home');
    await expect(slider).toHaveValue('360');
    await expect(planner.getByTestId('time-slider-value-badge')).toHaveText('06:00');
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
    await expectSheetRowsClamped(page, 3);
    await expect(page.getByTestId('venue-card').first()).toBeVisible();

    await setVenueSheetRows(page, 4);
    await setVenueSheetRows(page, 0);
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

    await expectSheetRowsClamped(page, 3);
    await setVenueSheetRows(page, 4);
    await expectFreePlannerChrome(page);
  });

  test('mobile: selecting a venue from the max-row panel preserves rows and opens QuickInfo', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Venue-list selection flow runs only in the mobile Playwright project',
    );

    await bypassOnboarding(page);
    await page.goto('/?_state=map-panel-venues&_sheetRows=max');
    const sheet = page.getByTestId('mobile-bottom-sheet');
    await expect(async () => {
      const rows = await getSheetRows(page);
      const maxRows = await getSheetMaxRows(page);
      expect(rows).toBe(maxRows);
      expect(rows).toBeGreaterThan(0);
    }).toPass({ timeout: APP_SETTLE_TIMEOUT_MS });
    const rowsBefore = await getSheetRows(page);

    const firstCard = page.getByTestId('venue-card').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await expect(sheet).toHaveAttribute('data-visible-rows', String(rowsBefore));
    await expect(page.getByTestId('venue-quick-info').first()).toBeVisible();
  });

  test('mobile: max-row venue panel removes sheet-covered zoom controls from interaction', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Max-row zoom-control overlap check runs only in the mobile Playwright project',
    );

    await bypassOnboarding(page);
    await page.goto('/?_state=map-panel-venues&_sheetRows=max');
    await expect(async () => {
      const rows = await getSheetRows(page);
      const maxRows = await getSheetMaxRows(page);
      expect(rows).toBe(maxRows);
      expect(rows).toBeGreaterThan(0);
    }).toPass({ timeout: APP_SETTLE_TIMEOUT_MS });

    const controls = page.getByTestId('map-controls');
    await expect(controls).toHaveAttribute('data-mobile-sheet-overlap', 'true');
    await expect(controls).toHaveAttribute('aria-hidden', 'true');
    await expect(controls).toHaveAttribute('inert');
    await expect(controls).toHaveCSS('opacity', '0');
  });

  test('mobile: forced N=3 venue panel shows exactly three complete rows at rest', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Row-sheet geometry runs only on mobile');

    await page.setViewportSize({ width: 390, height: 844 });
    await bypassOnboarding(page);
    await page.goto('/?_state=map-panel-venues&_time=14:00&_sheetRows=3');
    const resolvedRows = await expectSheetRowsClamped(page, 3);
    expect(resolvedRows).toBe(3);

    const counts = await visibleVenueRowCounts(page);
    expect(counts.fullyVisible).toBe(3);
    expect(counts.partiallyVisible).toBe(3);
  });

  test('mobile: forced mid-drag venue panel keeps three full rows plus a partial next row', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Mid-drag geometry runs only on mobile');

    await page.setViewportSize({ width: 390, height: 844 });
    await bypassOnboarding(page);
    await page.goto('/?_state=map-panel-venues&_time=14:00&_sheetDrag=mid');
    const sheet = page.getByTestId('mobile-bottom-sheet');
    await expect(sheet).toHaveAttribute('data-visible-rows', '3', {
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    await expect(sheet).toHaveAttribute('data-dragging', 'true');

    const counts = await visibleVenueRowCounts(page);
    expect(counts.fullyVisible).toBeGreaterThanOrEqual(3);
    expect(counts.partiallyVisible).toBeGreaterThan(3);
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
    await setVenueSheetRows(page, 1);
    await handle.press('ArrowUp');
    await expect(sheet).toHaveAttribute('data-visible-rows', '2');
    await handle.press('ArrowDown');
    await expect(sheet).toHaveAttribute('data-visible-rows', '1');
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
    await expect(page).toHaveURL(/\/(\?.*)?$/); // map root; tolerate the forced dev `?_time=` query
  });

  test('desktop: venue detail keeps the planner bar contained between the overlay panels', async ({
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
    const listPanel = page.getByTestId('desktop-venue-list-panel');
    await expect(listPanel).toBeVisible();

    // The desktop planner is a CONTAINED bar mirroring the Claude Design
    // reference (MapView.tsx desktop TimeSliderPanel, landed with the settings
    // modal in e371005): it clears the venue-list panel on the left and shrinks
    // from the right to clear the 390px detail panel while it is open — it no
    // longer spans the full map viewport under the overlay panels, which is
    // what this test asserted before it was updated. The panel slides in with a
    // 200ms right-edge transition, so poll until the boxes settle.
    await expect(async () => {
      const panelBox = await panel.boundingBox();
      const plannerBox = await planner.boundingBox();
      const listBox = await listPanel.boundingBox();
      expect(panelBox).not.toBeNull();
      expect(plannerBox).not.toBeNull();
      expect(listBox).not.toBeNull();
      if (panelBox && plannerBox && listBox) {
        // Clears the venue list on the left …
        expect(plannerBox.x).toBeGreaterThanOrEqual(listBox.x + listBox.width);
        // … stops before the open detail panel on the right …
        expect(plannerBox.x + plannerBox.width).toBeLessThanOrEqual(panelBox.x + 1);
        // … and is still a substantial bar between them, not a collapsed sliver.
        expect(plannerBox.width).toBeGreaterThan(300);
      }
    }).toPass({ timeout: 5_000 });
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

  test('mobile: selecting a pin preserves its public-sun shape (Story 12.6)', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Pin selection shape check runs only in the mobile Playwright project',
    );

    await bypassOnboarding(page);
    // (Story 1.6 review P24: removed duplicate `await bypassOnboarding(page)`.)
    await page.goto('/?_state=map-primary');
    await page.waitForSelector('[data-testid="venue-pin"][data-pin-state="sunny"]', {
      timeout: 15000,
    });
    await setVenueSheetRows(page, 0);

    const sunnyPin = await firstUncoveredSunnyPin(page);
    const beforeBox = await sunnyPin.boundingBox();
    expect(beforeBox).not.toBeNull();
    if (!beforeBox) return;
    // Refreshed MVP pins render as teardrops: circular body plus tail.
    const beforeAspect = beforeBox.width / Math.max(beforeBox.height, 1);
    expect(beforeAspect).toBeLessThan(1.1);
    await expect(sunnyPin.locator('[data-pin-tail]')).toHaveCount(1);

    await sunnyPin.click();
    const selectedPin = page.locator('[data-testid="venue-pin"][data-selected="true"]');
    await expect(selectedPin).toHaveCount(1);
    await expect(selectedPin).toHaveAttribute('data-pin-state', 'sunny');
    await expect(selectedPin.locator('[data-pin-tail]')).toHaveCount(1);

    const afterBox = await selectedPin.boundingBox();
    expect(afterBox).not.toBeNull();
    if (!afterBox) return;
    const afterAspect = afterBox.width / Math.max(afterBox.height, 1);
    expect(afterAspect).toBeLessThan(1.1);
  });

  test('mobile: user-location dot renders with the pulsing-halo utility (Story 11.5 AC2)', async ({
    page,
    context,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'User-location dot check runs only in the mobile Playwright project',
    );

    // A real GPS fix (`status === 'success'`) is the only state that mounts the
    // dot. Grant permission + a Gothenburg position; on a returning onboarded
    // user with granted permission the hook auto-runs and the layer mounts the
    // UserPin into a detached MapLibre marker via createRoot — proving here that
    // the GLOBAL halo @utility still reaches that detached root in a real
    // browser (the component test can only assert the class, not the animation).
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 57.7089, longitude: 11.9746 });
    await bypassOnboarding(page);
    await page.goto('/');
    await page.waitForSelector('[data-testid="venue-pin"]', { timeout: APP_SETTLE_TIMEOUT_MS });

    const dot = visibleTestId(page, 'user-location-pin');
    await expect(dot).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    const halo = page.locator('[data-testid="user-location-halo"]:visible').first();
    await expect(halo).toHaveClass(/animate-user-location-halo/);
    // Under normal motion the pulse keyframes are live (name resolved, not none).
    const animationName = await halo.evaluate(
      (el) => window.getComputedStyle(el).animationName,
    );
    expect(animationName).toBe('user-location-halo');
    // The dot is decorative + non-interactive (never intercepts a map drag).
    await expect(dot).toHaveAttribute('aria-hidden', 'true');
    const pointerEvents = await dot.evaluate((el) => window.getComputedStyle(el).pointerEvents);
    expect(pointerEvents).toBe('none');
  });

  test('mobile: reduced motion pins the location-dot halo to a static state (Story 11.5 AC2)', async ({
    page,
    context,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Reduced-motion location-dot check runs only in the mobile Playwright project',
    );

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 57.7089, longitude: 11.9746 });
    await bypassOnboarding(page);
    await page.goto('/');
    await page.waitForSelector('[data-testid="venue-pin"]', { timeout: APP_SETTLE_TIMEOUT_MS });

    const halo = page.locator('[data-testid="user-location-halo"]:visible').first();
    await expect(halo).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    // The `@media (prefers-reduced-motion: reduce)` override in globals.css pins
    // the pulse to `animation: none` — a reduced-motion user sees a STATIC halo.
    const animationName = await halo.evaluate(
      (el) => window.getComputedStyle(el).animationName,
    );
    expect(animationName).toBe('none');
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
    await page.waitForSelector('[data-testid="venue-pin"]', {
      timeout: 15000,
    });
    await setVenueSheetRows(page, 0);

    const pin = await firstUncoveredPin(page);
    await pin.click();
    await expect(
      page.locator('[data-testid="venue-pin"][data-selected="true"]'),
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
      page.locator('[data-testid="venue-pin"][data-selected="true"]'),
    ).toHaveCount(0);
    await expect(page.getByTestId('venue-quick-info')).toHaveCount(0);
  });
});
