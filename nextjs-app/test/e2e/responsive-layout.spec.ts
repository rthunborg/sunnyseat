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

    // Playwright's mobile iPhone 14 emulation sends Accept-Language: en-US, so
    // next-intl redirects to /en and renders English labels. Map both locales.
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
});
