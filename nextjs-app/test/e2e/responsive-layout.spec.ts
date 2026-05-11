import { test, expect } from '@playwright/test';

test.describe('Mobile responsive layout', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Mobile-viewport assertions run only in the mobile Playwright project',
    );
  });

  test('M1: mobile nav bar is visible at the bottom of /', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByTestId('mobile-nav-bar');
    await expect(nav).toBeVisible();

    const navBox = await nav.boundingBox();
    const viewport = page.viewportSize();
    expect(navBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (navBox && viewport) {
      expect(navBox.y + navBox.height).toBeCloseTo(viewport.height, 0);
    }
  });

  test('M2: desktop nav bar is hidden on mobile viewport', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('desktop-nav-bar')).toBeHidden();
  });

  test('M3: each tab exposes its visible text as the accessible name (WCAG 2.5.3)', async ({
    page,
  }) => {
    await page.goto('/');

    // Playwright's mobile iPhone 14 emulation sends Accept-Language: en-US, so
    // next-intl redirects to /en and renders English labels. Map both locales.
    const pathname = new URL(page.url()).pathname;
    const isEnglish = pathname.startsWith('/en');
    const labels = isEnglish
      ? { karta: 'Map', favoriter: 'Favourites', om: 'About' }
      : { karta: 'Karta', favoriter: 'Favoriter', om: 'Om' };

    for (const [key, name] of Object.entries(labels)) {
      const tab = page.getByTestId(`mobile-nav-tab-${key}`);
      await expect(tab).toBeVisible();
      await expect(tab).toHaveAccessibleName(name);
      // No aria-label override — keeps visible text == accessible name.
      await expect(tab).not.toHaveAttribute('aria-label', /./);
    }
  });

  test('M4: the Karta tab is active when pathname is /', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('mobile-nav-tab-karta')).toHaveAttribute(
      'data-active',
      'true',
    );
    await expect(page.getByTestId('mobile-nav-tab-favoriter')).toHaveAttribute(
      'data-active',
      'false',
    );
    await expect(page.getByTestId('mobile-nav-tab-om')).toHaveAttribute(
      'data-active',
      'false',
    );
  });

  test('M5: mobile tabs are keyboard-reachable and render a visible focus ring (AC5)', async ({
    page,
  }) => {
    await page.goto('/');

    const tabKeys = ['karta', 'favoriter', 'om'] as const;

    // iOS Safari emulation (the mobile Playwright project) does not honour
    // Tab-key traversal natively — mobile Safari deliberately restricts Tab
    // to form fields. We assert the WCAG-equivalent property directly:
    // each tab must be programmatically focusable (same primitive the
    // browser uses when Tab lands on the element) and must render a
    // non-`none` focus indicator once focused. DOM Tab-order is covered by
    // the Vitest component test (`supports keyboard navigation` above).
    for (const key of tabKeys) {
      const tab = page.getByTestId(`mobile-nav-tab-${key}`);
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
    await page.goto('/');
    const nav = page.getByTestId('desktop-nav-bar');
    await expect(nav).toBeVisible();

    const navBox = await nav.boundingBox();
    expect(navBox).not.toBeNull();
    if (navBox) {
      expect(navBox.y).toBeCloseTo(0, 0);
    }
  });

  test('D2: mobile nav bar is hidden on desktop viewport', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('mobile-nav-bar')).toBeHidden();
  });

  test('D3: the search placeholder shows placeholder text without a search landmark', async ({
    page,
  }) => {
    await page.goto('/');
    const placeholder = page.getByTestId('desktop-nav-search-placeholder');
    await expect(placeholder).toBeVisible();
    // Placeholder must not claim to be a search landmark — Story 2.4 adds
    // the real combobox and re-introduces the landmark then.
    await expect(placeholder).not.toHaveAttribute('role', /./);
    await expect(placeholder).not.toHaveAttribute('aria-label', /./);
    // It should render the placeholder text so users see the search bar stub.
    await expect(placeholder).not.toBeEmpty();
  });

  test('D4: the desktop logo link is keyboard-reachable with a visible focus ring (AC5)', async ({
    page,
  }) => {
    await page.goto('/');

    // Focus the logo directly; Tab-key origin depends on surrounding page
    // content, so we assert focusability of the logo link itself.
    const logoLink = page.locator('[data-testid="desktop-nav-bar"] a').first();
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
