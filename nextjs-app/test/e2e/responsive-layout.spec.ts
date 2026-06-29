import { test, expect, type Locator, type Page } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

const APP_SETTLE_TIMEOUT_MS = 15_000;

async function bypassOnboarding(page: Page): Promise<void> {
  await page.addInitScript((key: string) => {
    window.localStorage.setItem(key, '1');
  }, ONBOARDED_FLAG_KEY);
}

function visibleTestId(page: Page, testId: string): Locator {
  return page.locator(`[data-testid="${testId}"]:visible`).first();
}

async function expectBypassedOnboarding(page: Page): Promise<void> {
  await expect(page.getByTestId('onboarding-gate-placeholder')).toHaveCount(0, {
    timeout: APP_SETTLE_TIMEOUT_MS,
  });
  await expect(page.getByTestId('onboarding-screen')).toHaveCount(0);
}

test.describe('Mobile responsive layout', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Mobile-viewport assertions run only in the mobile Playwright project',
    );
  });

  test('M1: mobile nav bar is visible at the bottom of /', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/');
    await expectBypassedOnboarding(page);
    const nav = visibleTestId(page, 'mobile-nav-bar');
    await expect(nav).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });

    const navBox = await nav.boundingBox();
    const viewport = page.viewportSize();
    expect(navBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (navBox && viewport) {
      expect(navBox.y + navBox.height).toBeCloseTo(viewport.height, 0);
    }
  });

  test('M2: desktop nav bar is hidden on mobile viewport', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/');
    await expectBypassedOnboarding(page);
    await expect(page.locator('[data-testid="desktop-nav-bar"]:visible')).toHaveCount(0);
  });

  test('M3: each tab exposes its visible text as the accessible name (WCAG 2.5.3)', async ({
    page,
  }) => {
    await bypassOnboarding(page);
    await page.goto('/');
    await expectBypassedOnboarding(page);

    // Swedish is the default for everyone (localeDetection disabled), so `/`
    // renders Swedish labels; the English branch only applies if a future test
    // pins the `/en` prefix. Keep the mapping so the assertion stays robust.
    const pathname = new URL(page.url()).pathname;
    const isEnglish = pathname.startsWith('/en');
    const labels = isEnglish
      ? { naraMig: 'Near me', favoriter: 'Favourites' }
      : { naraMig: 'Nära mig', favoriter: 'Favoriter' };

    for (const [key, name] of Object.entries(labels)) {
      const tab = visibleTestId(page, `mobile-nav-tab-${key}`);
      await expect(tab).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
      await expect(tab).toHaveAccessibleName(name);
      // No aria-label override — keeps visible text == accessible name.
      await expect(tab).not.toHaveAttribute('aria-label', /./);
    }
  });

  test('M4: the Nära mig tab is active when pathname is /', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/');
    await expectBypassedOnboarding(page);
    await expect(visibleTestId(page, 'mobile-nav-tab-naraMig')).toHaveAttribute(
      'data-active',
      'true',
    );
    await expect(visibleTestId(page, 'mobile-nav-tab-favoriter')).toHaveAttribute(
      'data-active',
      'false',
    );
    await expect(page.getByTestId('mobile-nav-tab-om')).toHaveCount(0);
  });

  test('M5: mobile tabs are keyboard-reachable and render a visible focus ring (AC5)', async ({
    page,
  }) => {
    await bypassOnboarding(page);
    await page.goto('/');
    await expectBypassedOnboarding(page);

    const tabKeys = ['naraMig', 'favoriter'] as const;

    // iOS Safari emulation (the mobile Playwright project) does not honour
    // Tab-key traversal natively — mobile Safari deliberately restricts Tab
    // to form fields. We assert the WCAG-equivalent property directly:
    // each tab must be programmatically focusable (same primitive the
    // browser uses when Tab lands on the element) and must render a
    // non-`none` focus indicator once focused. DOM Tab-order is covered by
    // the Vitest component test (`supports keyboard navigation` above).
    for (const key of tabKeys) {
      const tab = visibleTestId(page, `mobile-nav-tab-${key}`);
      await tab.focus();
      await expect(tab).toBeFocused();

      const { outlineStyle, boxShadow } = await tab.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          outlineStyle: style.outlineStyle,
          boxShadow: style.boxShadow,
        };
      });
      const hasVisibleIndicator =
        outlineStyle !== 'none' ||
        (boxShadow !== 'none' && boxShadow !== '');
      expect(hasVisibleIndicator).toBe(true);
    }
  });
});

test.describe('Desktop responsive layout', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'Desktop-viewport assertions run only in the desktop Playwright project',
    );
  });

  test('D1: desktop nav bar is visible at the top of /', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/');
    await expectBypassedOnboarding(page);
    const nav = visibleTestId(page, 'desktop-nav-bar');
    await expect(nav).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });

    const navBox = await nav.boundingBox();
    expect(navBox).not.toBeNull();
    if (navBox) {
      expect(navBox.y).toBeCloseTo(0, 0);
    }
  });

  test('D2: mobile nav bar is hidden on desktop viewport', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/');
    await expectBypassedOnboarding(page);
    await expect(page.locator('[data-testid="mobile-nav-bar"]:visible')).toHaveCount(0);
  });

  test('D3: desktop navbar exposes the real search combobox', async ({
    page,
  }) => {
    await bypassOnboarding(page);
    await page.goto('/');
    await expectBypassedOnboarding(page);
    const searchLandmark = page.getByRole('search', {
      name: /Sök plats|Search venue/,
    }).first();
    await expect(searchLandmark).toBeVisible();
    const combobox = searchLandmark.getByRole('combobox', {
      name: /Sök plats|Search venue/,
    });
    await expect(combobox).toBeVisible();
    await expect(combobox).toHaveAttribute(
      'placeholder',
      /Sök plats eller område i Göteborg|Search place or area in Gothenburg/,
    );
  });

  test('D4: the desktop logo link is keyboard-reachable with a visible focus ring (AC5)', async ({
    page,
  }) => {
    await bypassOnboarding(page);
    await page.goto('/');
    await expectBypassedOnboarding(page);

    // Focus the logo directly; Tab-key origin depends on surrounding page
    // content, so we assert focusability of the logo link itself.
    const logoLink = visibleTestId(page, 'desktop-nav-bar').locator('a').first();
    await logoLink.focus();
    await expect(logoLink).toBeFocused();

    const focusStyle = await logoLink.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return { outlineStyle: style.outlineStyle, boxShadow: style.boxShadow };
    });
    const hasVisibleIndicator =
      focusStyle.outlineStyle !== 'none' ||
      (focusStyle.boxShadow !== 'none' && focusStyle.boxShadow !== '');
    expect(hasVisibleIndicator).toBe(true);
  });

  // Layout-invariant gate (hardening for the full-width time-planner miss):
  // the LLM screenshot gate is told to forgive sizing, so it could not catch
  // a chrome bar shipped edge-to-edge. These deterministic bounding-box
  // assertions can, and double as regression tests for the planner + map
  // control de-duplication.
  test('D5: the desktop time planner clears the venue list sidebar and stays contained (not full-bleed)', async ({
    page,
  }) => {
    await bypassOnboarding(page);
    await page.goto('/');
    await expectBypassedOnboarding(page);

    const sidebar = visibleTestId(page, 'desktop-venue-list-panel');
    await expect(sidebar).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    const planner = visibleTestId(page, 'time-slider-panel');
    await expect(planner).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });

    const sidebarBox = await sidebar.boundingBox();
    const plannerBox = await planner.boundingBox();
    const viewport = page.viewportSize();
    expect(sidebarBox).not.toBeNull();
    expect(plannerBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (sidebarBox && plannerBox && viewport) {
      // Must begin to the RIGHT of the venue list, never slide under it.
      expect(plannerBox.x).toBeGreaterThanOrEqual(sidebarBox.x + sidebarBox.width - 1);
      // Must stay inside the viewport and NOT stretch edge-to-edge: at least
      // the sidebar's width of horizontal space stays clear of the planner.
      // (The shipped bug rendered it `left-4 right-4` — full-bleed.)
      expect(plannerBox.x + plannerBox.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(plannerBox.width).toBeLessThan(viewport.width - sidebarBox.width + 2);
    }
  });

  test('D6: redundant map-stack locate/settings are hidden on desktop while zoom +/- remain', async ({
    page,
  }) => {
    await bypassOnboarding(page);
    await page.goto('/');
    await expectBypassedOnboarding(page);

    // Zoom controls are a desktop-welcome addition — they stay.
    await expect(visibleTestId(page, 'map-control-zoom-in')).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    await expect(visibleTestId(page, 'map-control-zoom-out')).toBeVisible();

    // Locate + settings must NOT be duplicated over the map on desktop — the
    // top nav owns them. Hidden via `lg:hidden`, so nothing visible here.
    await expect(page.locator('[data-testid="map-control-my-location"]:visible')).toHaveCount(0);
    await expect(page.locator('[data-testid="map-control-settings"]:visible')).toHaveCount(0);
  });

  test('D7: the desktop nav my-location button is shown and wired (enabled)', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/');
    await expectBypassedOnboarding(page);

    const locate = visibleTestId(page, 'desktop-nav-my-location');
    await expect(locate).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    await expect(locate).toBeEnabled();
  });
});
