import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import {
  FIRST_RUN_GUIDE_SEEN_KEY,
  ONBOARDED_FLAG_KEY,
} from '@/lib/constants/onboarding';

const APP_SETTLE_TIMEOUT_MS = 15_000;
const EXPECTED_PIN_COPY =
  'Procenten visar hur stor andel av uteserveringens platser vi tror är i direkt sol vid den valda tiden.';
const EXPECTED_PLANNER_COPY =
  'Du behöver inte ändra något – kartan visar läget just nu. Vill du planera framåt kan du välja datum och tid. Ju längre fram du tittar, desto osäkrare blir prognosen.';

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

async function expectSeparatedFooterLayout(dialog: Locator): Promise<void> {
  const skipRow = dialog.getByTestId('coach-tour-skip-row');
  const navigation = dialog.getByTestId('coach-tour-navigation');
  const skip = dialog.getByTestId('coach-tour-skip');
  const back = navigation.getByRole('button', { name: 'Tillbaka' });
  const next = navigation.getByRole('button', { name: /Nästa|Klar/ });

  await expect(skipRow).toHaveCSS('justify-content', 'flex-end');
  await expect(navigation).toHaveCSS('justify-content', 'flex-end');
  const [skipBox, skipRowBox, navigationBox, backBox, nextBox] = await Promise.all([
    requiredBox(skip, 'skip'),
    requiredBox(skipRow, 'skip row'),
    requiredBox(navigation, 'navigation row'),
    requiredBox(back, 'back button'),
    requiredBox(next, 'next button'),
  ]);

  expect(skipBox.height).toBeGreaterThanOrEqual(44);
  expect(skipBox.x).toBeGreaterThanOrEqual(skipRowBox.x - 1);
  expect(skipBox.x + skipBox.width).toBeLessThanOrEqual(skipRowBox.x + skipRowBox.width + 1);
  expect(skipBox.x + skipBox.width).toBeGreaterThanOrEqual(
    skipRowBox.x + skipRowBox.width - 1,
  );
  expect(skipBox.y + skipBox.height).toBeLessThanOrEqual(navigationBox.y + 1);
  expect(backBox.x).toBeLessThan(nextBox.x);
  expect(nextBox.x + nextBox.width).toBeGreaterThanOrEqual(
    navigationBox.x + navigationBox.width - 1,
  );
  expect(boxesOverlap(skipBox, backBox)).toBe(false);
  expect(boxesOverlap(skipBox, nextBox)).toBe(false);
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
    await expect(dialog.getByTestId('coach-tour-skip')).toHaveClass(/border-divider/);
    await expectSeparatedFooterLayout(dialog);
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
    await expectSeparatedFooterLayout(dialog);
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
