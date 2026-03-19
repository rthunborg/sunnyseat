/**
 * Story 10.9 — E2E Accessibility Audit
 *
 * Runs axe-core on every public page and admin page to verify
 * zero WCAG 2.1 AA violations.
 *
 * NOTE: Requires Chromium installed (`npx playwright install chromium`).
 * These tests will be skipped in environments without browser dependencies.
 */
import { test, expect } from '@playwright/test';
import { checkAccessibility } from '../helpers/accessibility';

const PUBLIC_PAGES = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
  { name: 'Offline', path: '/offline' },
];

const ADMIN_PAGES = [
  { name: 'Admin Login', path: '/admin/login' },
];

// ─── AC 1: WCAG 2.1 AA Compliance (axe-core) ────────────────────────
test.describe('AC 1: WCAG 2.1 AA — Public Pages', () => {
  for (const page of PUBLIC_PAGES) {
    test(`${page.name} (${page.path}) has zero axe-core violations`, async ({ page: p }) => {
      await p.goto(page.path, { waitUntil: 'networkidle' });
      const results = await checkAccessibility(p, {
        exclude: ['[role="application"]'], // Exclude MapLibre canvas
      });
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe('AC 1: WCAG 2.1 AA — Admin Pages', () => {
  for (const page of ADMIN_PAGES) {
    test(`${page.name} (${page.path}) has zero axe-core violations`, async ({ page: p }) => {
      await p.goto(page.path, { waitUntil: 'networkidle' });
      const results = await checkAccessibility(p);
      expect(results.violations).toEqual([]);
    });
  }
});

// ─── AC 2: Touch Target Sizes ────────────────────────────────────────
test.describe('AC 2: Touch Target Sizes', () => {
  test('Search bar input is at least 48px tall', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const searchInput = page.getByTestId('search-bar').locator('input');
    const box = await searchInput.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThanOrEqual(48);
  });
});

// ─── AC 3: Color Contrast ────────────────────────────────────────────
test.describe('AC 3: Color Contrast', () => {
  test('axe-core catches any contrast violations on About page', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'networkidle' });
    const results = await checkAccessibility(page);
    const contrastViolations = results.violations.filter(
      (v) => v.id === 'color-contrast'
    );
    expect(contrastViolations).toEqual([]);
  });
});

// ─── AC 7: Motion Accessibility ──────────────────────────────────────
test.describe('AC 7: Reduced Motion', () => {
  test('animations disabled when prefers-reduced-motion is set', async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });

    // Verify no CSS animations are running on key elements
    const hasAnimations = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      for (const el of elements) {
        const style = window.getComputedStyle(el);
        if (
          style.animationName !== 'none' &&
          style.animationDuration !== '0s' &&
          style.animationPlayState === 'running'
        ) {
          return true;
        }
      }
      return false;
    });

    expect(hasAnimations).toBe(false);
    await context.close();
  });
});

// ─── AC 8: Screen Reader Support ─────────────────────────────────────
test.describe('AC 8: Screen Reader Support', () => {
  test('skip link exists and targets main content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // The skip link should be first focusable element
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeFocused();

    // Target should exist
    const target = page.locator('#main-content');
    await expect(target).toBeAttached();
  });

  test('map has role="application" and aria-label', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const map = page.locator('[role="application"]');
    await expect(map).toBeAttached();
    const label = await map.getAttribute('aria-label');
    expect(label).toBeTruthy();
    expect(label!.length).toBeGreaterThan(0);
  });
});
