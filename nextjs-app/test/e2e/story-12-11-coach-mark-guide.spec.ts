import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import {
  FIRST_RUN_GUIDE_SEEN_KEY,
  ONBOARDED_FLAG_KEY,
} from '@/lib/constants/onboarding';

const APP_SETTLE_TIMEOUT_MS = 15_000;
const GEOMETRY_TOLERANCE_PX = 1.5;
const EXPECTED_PIN_COPY =
  'Procenten visar hur stor andel av uteserveringens platser vi tror är i direkt sol vid den valda tiden.';
const EXPECTED_PLANNER_COPY =
  'Du behöver inte ändra något – kartan visar läget just nu. Vill du planera framåt kan du välja datum och tid. Ju längre fram du tittar, desto osäkrare blir prognosen.';
const EXPECTED_ACTION_PROGRESS_RGB = { r: 53, g: 107, b: 79, a: 1 };
const EXPECTED_SURFACE_CREAM_RGB = { r: 253, g: 250, b: 244, a: 1 };
const EXPECTED_TEXT_PRIMARY_RGB = { r: 27, g: 27, b: 30, a: 1 };
const EXPECTED_ERROR_RGB = { r: 186, g: 26, b: 26 };
const COLOR_CHANNEL_TOLERANCE = 1;
const COLOR_ALPHA_TOLERANCE = 0.02;

async function seedOnboarded(page: Page, seenGuide = false): Promise<void> {
  await page.addInitScript(
    ({ onboardedKey, guideKey, seen }) => {
      window.localStorage.setItem(onboardedKey, '1');
      if (seen) window.localStorage.setItem(guideKey, '1');
    },
    {
      onboardedKey: ONBOARDED_FLAG_KEY,
      guideKey: FIRST_RUN_GUIDE_SEEN_KEY,
      seen: seenGuide,
    },
  );
}

function routeFor(testInfo: TestInfo, state?: 'coach-mark-first' | 'coach-mark-middle'): string {
  const time = testInfo.project.name === 'desktop' ? '16:30' : '14:00';
  if (!state) return `/?_time=${time}`;
  return `/?_state=${state}&_time=${time}`;
}

function activeDialog(page: Page) {
  return page.getByTestId('coach-tour-dialog');
}

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Rgba = {
  r: number;
  g: number;
  b: number;
  a: number;
};

function boxesOverlap(first: Box, second: Box): boolean {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

async function requiredBox(locator: Locator, label: string): Promise<Box> {
  const box = await locator.boundingBox();
  expect(box, `${label} should have a rendered bounding box`).not.toBeNull();
  return box as Box;
}

function expectWithinTolerance(actual: number, expected: number, label: string): void {
  expect(
    Math.abs(actual - expected),
    `${label}: expected ${actual} to be within ${GEOMETRY_TOLERANCE_PX}px of ${expected}`,
  ).toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);
}

async function expectActionProgressTokenValues(page: Page): Promise<void> {
  const tokens = await page.evaluate(() => {
    const styles = window.getComputedStyle(document.documentElement);
    return {
      progress: styles.getPropertyValue('--color-action-progress').trim().toLowerCase(),
      progressHover: styles
        .getPropertyValue('--color-action-progress-hover')
        .trim()
        .toLowerCase(),
    };
  });
  expect(tokens).toEqual({
    progress: '#356b4f',
    progressHover: '#28563e',
  });
}

async function normalizedComputedColor(locator: Locator, property: string): Promise<Rgba> {
  return locator.evaluate((element, cssProperty) => {
    const value = window.getComputedStyle(element).getPropertyValue(cssProperty);
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context is unavailable');
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, alpha] = context.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a: alpha / 255 };
  }, property);
}

async function normalizedCssColor(page: Page, value: string): Promise<Rgba> {
  return page.evaluate((cssColor) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context is unavailable');
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = cssColor;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, alpha] = context.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a: alpha / 255 };
  }, value);
}

function expectRgbaChannels(actual: Rgba, expected: Rgba, label: string): void {
  expect(Math.abs(actual.r - expected.r), `${label} red channel`).toBeLessThanOrEqual(
    COLOR_CHANNEL_TOLERANCE,
  );
  expect(Math.abs(actual.g - expected.g), `${label} green channel`).toBeLessThanOrEqual(
    COLOR_CHANNEL_TOLERANCE,
  );
  expect(Math.abs(actual.b - expected.b), `${label} blue channel`).toBeLessThanOrEqual(
    COLOR_CHANNEL_TOLERANCE,
  );
  expect(Math.abs(actual.a - expected.a), `${label} alpha channel`).toBeLessThanOrEqual(
    COLOR_ALPHA_TOLERANCE,
  );
}

function expectErrorTint(actual: Rgba, expected: Rgba, label: string): void {
  expect(actual.a, `${label} should not be transparent`).toBeGreaterThan(0);
  expect(
    Math.abs(actual.r - expected.r),
    `${label} red channel should derive from color-error`,
  ).toBeLessThanOrEqual(COLOR_CHANNEL_TOLERANCE);
  expect(
    Math.abs(actual.g - expected.g),
    `${label} green channel should derive from color-error`,
  ).toBeLessThanOrEqual(COLOR_CHANNEL_TOLERANCE);
  expect(
    Math.abs(actual.b - expected.b),
    `${label} blue channel should derive from color-error`,
  ).toBeLessThanOrEqual(COLOR_CHANNEL_TOLERANCE);
  expect(
    Math.abs(actual.a - expected.a),
    `${label} alpha channel should match the token opacity`,
  ).toBeLessThanOrEqual(COLOR_ALPHA_TOLERANCE);
}

async function expectRenderedActionColors(page: Page, skip: Locator, next: Locator): Promise<void> {
  const [
    skipBackground,
    skipBorder,
    skipText,
    nextBackground,
    nextText,
    expectedSkipBackground,
    expectedSkipBorder,
  ] = await Promise.all([
    normalizedComputedColor(skip, 'background-color'),
    normalizedComputedColor(skip, 'border-top-color'),
    normalizedComputedColor(skip, 'color'),
    normalizedComputedColor(next, 'background-color'),
    normalizedComputedColor(next, 'color'),
    normalizedCssColor(
      page,
      `color-mix(in oklab, rgb(${EXPECTED_ERROR_RGB.r} ${EXPECTED_ERROR_RGB.g} ${EXPECTED_ERROR_RGB.b}) 5%, transparent)`,
    ),
    normalizedCssColor(
      page,
      `color-mix(in oklab, rgb(${EXPECTED_ERROR_RGB.r} ${EXPECTED_ERROR_RGB.g} ${EXPECTED_ERROR_RGB.b}) 10%, transparent)`,
    ),
  ]);

  expectErrorTint(skipBackground, expectedSkipBackground, 'Skip background');
  expectErrorTint(skipBorder, expectedSkipBorder, 'Skip border');
  expectRgbaChannels(skipText, EXPECTED_TEXT_PRIMARY_RGB, 'Skip text');
  expectRgbaChannels(nextBackground, EXPECTED_ACTION_PROGRESS_RGB, 'Next background');
  expectRgbaChannels(nextText, EXPECTED_SURFACE_CREAM_RGB, 'Next text');
}

async function expectCenteredSkipSplitFooterLayout(
  page: Page,
  dialog: Locator,
  testInfo: TestInfo,
): Promise<void> {
  const isDesktop = testInfo.project.name === 'desktop';
  const expectedRowGapPx = isDesktop ? 8 : 12;
  const expectedSkipPillHeightPx = isDesktop ? 44 : 40;

  const skipRow = dialog.getByTestId('coach-tour-skip-row');
  const navigation = dialog.getByTestId('coach-tour-navigation');
  const skip = dialog.getByTestId('coach-tour-skip');
  const skipPill = dialog.getByTestId('coach-tour-skip-pill');
  const back = navigation.getByRole('button', { name: 'Tillbaka' });
  const next = navigation.getByRole('button', { name: /Nästa|Klar/ });

  await expect(skipRow).toHaveCSS('justify-content', 'center');
  await expect(navigation).toHaveCSS('justify-content', 'space-between');
  await expect(skip).toHaveClass(/min-h-11/);
  await expect(skip).toHaveClass(/min-w-11/);
  await expect(skip).toHaveClass(/text-text-primary/);
  await expect(skipPill).toHaveClass(/bg-error\/5/);
  await expect(skipPill).toHaveClass(/border-error\/10/);
  await expect(skipPill).toHaveClass(/group-hover:border-error\/20/);
  await expect(skipPill).toHaveClass(/group-hover:bg-error\/10/);
  await expect(skipPill).toHaveClass(isDesktop ? /desktop:text-label-lg/ : /text-label-md/);
  await expect(next).toHaveClass(/bg-action-progress/);
  await expect(next).toHaveClass(/hover:bg-action-progress-hover/);
  await expect(next).toHaveClass(/text-surface-cream/);
  await expect(back).toBeDisabled();
  await expectRenderedActionColors(page, skipPill, next);

  const [dialogBox, skipBox, skipPillBox, skipRowBox, navigationBox, backBox, nextBox] =
    await Promise.all([
      requiredBox(dialog, 'dialog'),
      requiredBox(skip, 'skip'),
      requiredBox(skipPill, 'skip visible pill'),
      requiredBox(skipRow, 'skip row'),
      requiredBox(navigation, 'navigation row'),
      requiredBox(back, 'back button'),
      requiredBox(next, 'next button'),
    ]);

  expect(skipBox.height).toBeGreaterThanOrEqual(44);
  expect(backBox.height).toBeGreaterThanOrEqual(44);
  expect(nextBox.height).toBeGreaterThanOrEqual(44);
  expectWithinTolerance(
    skipPillBox.height,
    expectedSkipPillHeightPx,
    'visible skip pill height follows breakpoint sizing',
  );

  expectWithinTolerance(
    skipPillBox.x + skipPillBox.width / 2,
    skipRowBox.x + skipRowBox.width / 2,
    'visible skip pill center aligns with skip-row center',
  );
  expect(skipBox.x).toBeGreaterThanOrEqual(skipRowBox.x - GEOMETRY_TOLERANCE_PX);
  expect(skipBox.x + skipBox.width).toBeLessThanOrEqual(
    skipRowBox.x + skipRowBox.width + GEOMETRY_TOLERANCE_PX,
  );
  expect(skipBox.y).toBeGreaterThanOrEqual(skipRowBox.y - GEOMETRY_TOLERANCE_PX);
  expect(skipBox.y + skipBox.height).toBeLessThanOrEqual(
    skipRowBox.y + skipRowBox.height + GEOMETRY_TOLERANCE_PX,
  );
  expect(skipPillBox.y).toBeGreaterThanOrEqual(skipBox.y - GEOMETRY_TOLERANCE_PX);
  expect(skipPillBox.y + skipPillBox.height).toBeLessThanOrEqual(
    skipBox.y + skipBox.height + GEOMETRY_TOLERANCE_PX,
  );

  expect(boxesOverlap(skipRowBox, navigationBox)).toBe(false);
  expect(skipRowBox.y + skipRowBox.height).toBeLessThanOrEqual(
    navigationBox.y + GEOMETRY_TOLERANCE_PX,
  );
  expectWithinTolerance(
    navigationBox.y - (skipRowBox.y + skipRowBox.height),
    expectedRowGapPx,
    'gap between skip and navigation rows follows breakpoint sizing',
  );
  expect(boxesOverlap(skipBox, backBox)).toBe(false);
  expect(boxesOverlap(skipBox, nextBox)).toBe(false);
  expect(boxesOverlap(skipPillBox, backBox)).toBe(false);
  expect(boxesOverlap(skipPillBox, nextBox)).toBe(false);
  expect(boxesOverlap(backBox, nextBox)).toBe(false);

  expectWithinTolerance(backBox.x, navigationBox.x, 'Back touches navigation left edge');
  expect(backBox.x).toBeLessThan(nextBox.x);
  expectWithinTolerance(
    nextBox.x + nextBox.width,
    navigationBox.x + navigationBox.width,
    'Next touches navigation right edge',
  );
  expectWithinTolerance(backBox.y, nextBox.y, 'Back and Next share a row');
  expect(backBox.y).toBeGreaterThanOrEqual(navigationBox.y - GEOMETRY_TOLERANCE_PX);
  expect(nextBox.y).toBeGreaterThanOrEqual(navigationBox.y - GEOMETRY_TOLERANCE_PX);
  expect(backBox.y + backBox.height).toBeLessThanOrEqual(
    navigationBox.y + navigationBox.height + GEOMETRY_TOLERANCE_PX,
  );
  expect(nextBox.y + nextBox.height).toBeLessThanOrEqual(
    navigationBox.y + navigationBox.height + GEOMETRY_TOLERANCE_PX,
  );

  for (const [label, box] of [
    ['skip', skipBox],
    ['visible skip pill', skipPillBox],
    ['back', backBox],
    ['next', nextBox],
  ] as const) {
    expect(box.x, `${label} should not clip left`).toBeGreaterThanOrEqual(
      dialogBox.x - GEOMETRY_TOLERANCE_PX,
    );
    expect(box.x + box.width, `${label} should not clip right`).toBeLessThanOrEqual(
      dialogBox.x + dialogBox.width + GEOMETRY_TOLERANCE_PX,
    );
    expect(box.y, `${label} should not clip top`).toBeGreaterThanOrEqual(
      dialogBox.y - GEOMETRY_TOLERANCE_PX,
    );
    expect(box.y + box.height, `${label} should not clip bottom`).toBeLessThanOrEqual(
      dialogBox.y + dialogBox.height + GEOMETRY_TOLERANCE_PX,
    );
  }
}

async function openSettings(page: Page, testInfo: TestInfo): Promise<void> {
  const trigger = testInfo.project.name === 'desktop'
    ? page.getByTestId('desktop-nav-settings')
    : page.getByTestId('search-shell-settings');
  await expect(trigger).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
  await trigger.click();
  await expect(page.getByTestId('settings-modal')).toBeVisible();
}

async function expectNoDetailOrFeedbackTransition(page: Page): Promise<void> {
  await expect(page.getByTestId('feedback-prompt')).toHaveCount(0);
  await expect(page.getByTestId('mobile-venue-detail-sheet')).toHaveCount(0);
  await expect(page.getByTestId('desktop-venue-detail-panel')).toHaveCount(0);
  await expect(page).not.toHaveURL(/venue=/);
}

test.describe('Story 12.11 coach-mark guide', () => {
  test('first post-onboarding map entry auto-shows once and skip persists seen state', async ({
    page,
  }, testInfo) => {
    await seedOnboarded(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(routeFor(testInfo));

    const dialog = activeDialog(page);
    await expect(dialog).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    await expect(dialog).toHaveAttribute('data-tour-source', 'auto');
    await expect(dialog.getByRole('heading', { name: 'Kartnålarna' })).toBeFocused();
    await expect(dialog.getByRole('button', { name: 'Hoppa över guide' })).toBeVisible();
    await expectActionProgressTokenValues(page);
    await expectCenteredSkipSplitFooterLayout(page, dialog, testInfo);
    await expect(dialog.getByRole('button', { name: 'Stäng guide' })).toBeVisible();

    await dialog.getByRole('button', { name: 'Hoppa över guide' }).click();
    await expect(dialog).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate((key) => window.localStorage.getItem(key), FIRST_RUN_GUIDE_SEEN_KEY),
      )
      .toBe('1');

    await page.reload();
    await expect(activeDialog(page)).toHaveCount(0);
  });

  test('returning user with seen flag gets no auto-show, but Settings relaunch starts step one', async ({
    page,
  }, testInfo) => {
    await seedOnboarded(page, true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(routeFor(testInfo));

    await expect(activeDialog(page)).toHaveCount(0);
    await openSettings(page, testInfo);
    await page.getByTestId('settings-row-guide').click();

    const dialog = activeDialog(page);
    await expect(dialog).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    await expect(dialog).toHaveAttribute('data-tour-source', 'settings');
    await expect(dialog.getByRole('heading', { name: 'Kartnålarna' })).toBeFocused();
    await expect
      .poll(() =>
        page.evaluate((key) => window.localStorage.getItem(key), FIRST_RUN_GUIDE_SEEN_KEY),
      )
      .toBe('1');
  });

  test('forced first state mounts the first step on a real map anchor without feedback/detail side effects', async ({
    page,
  }, testInfo) => {
    await seedOnboarded(page, true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(routeFor(testInfo, 'coach-mark-first'));

    const dialog = activeDialog(page);
    await expect(dialog).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    await expect(dialog).toHaveAttribute('data-tour-source', 'forced');
    await expect(page.getByTestId('coach-tour-step-pin-legend')).toBeVisible();
    await expectCenteredSkipSplitFooterLayout(page, dialog, testInfo);
    await expect(dialog).toContainText(EXPECTED_PIN_COPY);
    await expect(page.getByTestId('coach-tour-pin-legend')).toContainText('Soligt');
    await expect(page.getByTestId('coach-tour-pin-legend')).toContainText('Skuggat');
    await expect(page.locator('[data-tour-anchor="map-surface"]')).toHaveAttribute(
      'aria-describedby',
      /coach-tour-target-description/,
    );
    await expectNoDetailOrFeedbackTransition(page);
  });

  test('forced middle state anchors to the mounted planner controls', async ({
    page,
  }, testInfo) => {
    await seedOnboarded(page, true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(routeFor(testInfo, 'coach-mark-middle'));

    const dialog = activeDialog(page);
    await expect(dialog).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    await expect(page.getByTestId('coach-tour-step-time-slider')).toBeVisible();
    await expect(dialog).toContainText(EXPECTED_PLANNER_COPY);
    const planner = page.locator('[data-tour-anchor="time-slider"]:visible').first();
    await expect(planner).toBeVisible();
    await expect(planner).toHaveAttribute(
      'aria-describedby',
      /coach-tour-target-description/,
    );
    await expect(page.locator('[data-tour-anchor="date-planner"]:visible').first()).toBeVisible();
    await expectNoDetailOrFeedbackTransition(page);
  });

  test('copy-only feedback guidance never opens detail or feedback while navigating steps', async ({
    page,
  }, testInfo) => {
    await seedOnboarded(page, true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(routeFor(testInfo, 'coach-mark-first'));

    await expect(activeDialog(page)).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (await page.getByTestId('coach-tour-step-venue-list').isVisible().catch(() => false)) {
        break;
      }
      await activeDialog(page).getByRole('button', { name: 'Nästa' }).click();
    }

    await expect(page.getByTestId('coach-tour-step-venue-list')).toBeVisible();
    await expect(activeDialog(page)).toContainText('svara på om solen stämde');
    await expectNoDetailOrFeedbackTransition(page);
  });
});
