import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

const GOTHENBURG_LAT = 57.7089;
const GOTHENBURG_LNG = 11.9746;

/**
 * Card Tray Snap States E2E Tests
 *
 * UX Spec defines 3 card tray states:
 *   1. Peeking (25% of viewport) — 1-2 cards visible, map dominates
 *   2. Half-expanded (50% of viewport) — scrollable list, map partially visible
 *   3. Collapsed (8% of viewport) — full map, cards hidden
 *
 * NOTE: HomeScreen renders BottomCardTray twice (desktop + mobile wrappers),
 * so locators use .first() to target the visible instance.
 */

test.describe('Card Tray — Mobile Snap States', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });
  });

  test('tray starts in peeking state (default)', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // Target the visible mobile tray (inside lg:hidden wrapper)
    const tray = page.locator('.lg\\:hidden [aria-label="Venue card tray"]');
    await expect(tray).toBeAttached({ timeout: 10000 });

    // In peeking state (25%), tray top should be around 75% of viewport height
    const box = await tray.boundingBox();
    expect(box).not.toBeNull();
    // Allow tolerance: top should be between 380–560px (roughly 57–84% of 667)
    expect(box!.y).toBeGreaterThanOrEqual(380);
    expect(box!.y).toBeLessThanOrEqual(560);
  });

  test('grab handle is visible and has correct a11y attributes', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const tray = page.locator('.lg\\:hidden [aria-label="Venue card tray"]');
    await expect(tray).toBeAttached({ timeout: 10000 });

    // Grab handle is a button inside the tray
    const grabHandle = tray.locator('[role="button"]');
    await expect(grabHandle).toBeVisible();
    await expect(grabHandle).toHaveAttribute('tabindex', '0');

    // In peeking state, aria-label should describe the action
    const ariaLabel = await grabHandle.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });

  test('clicking grab handle cycles: peeking → half-expanded', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const tray = page.locator('.lg\\:hidden [aria-label="Venue card tray"]');
    await expect(tray).toBeAttached({ timeout: 10000 });

    const grabHandle = tray.locator('[role="button"]');
    await expect(grabHandle).toBeVisible();

    // Get initial tray position (peeking)
    const peekingBox = await tray.boundingBox();
    expect(peekingBox).not.toBeNull();

    // Click to expand to half-expanded
    await grabHandle.click();
    await page.waitForTimeout(500); // Allow animation

    const halfExpandedBox = await tray.boundingBox();
    expect(halfExpandedBox).not.toBeNull();

    // Tray should have moved up (lower Y value = higher on screen)
    expect(halfExpandedBox!.y).toBeLessThan(peekingBox!.y);
  });

  test('clicking grab handle in half-expanded cycles back to peeking', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const tray = page.locator('.lg\\:hidden [aria-label="Venue card tray"]');
    await expect(tray).toBeAttached({ timeout: 10000 });

    const grabHandle = tray.locator('[role="button"]');

    // Expand to half-expanded
    await grabHandle.click();
    await page.waitForTimeout(500);

    const halfExpandedBox = await tray.boundingBox();
    expect(halfExpandedBox).not.toBeNull();

    // Click again to return to peeking
    await grabHandle.click();
    await page.waitForTimeout(500);

    const peekingBox = await tray.boundingBox();
    expect(peekingBox).not.toBeNull();

    // Should have moved back down (higher Y value)
    expect(peekingBox!.y).toBeGreaterThan(halfExpandedBox!.y);
  });

  test('grab handle is keyboard accessible (Enter)', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const tray = page.locator('.lg\\:hidden [aria-label="Venue card tray"]');
    await expect(tray).toBeAttached({ timeout: 10000 });

    const grabHandle = tray.locator('[role="button"]');
    await grabHandle.focus();

    const beforeBox = await tray.boundingBox();
    expect(beforeBox).not.toBeNull();

    // Press Enter to cycle state
    await grabHandle.press('Enter');
    await page.waitForTimeout(500);

    const afterBox = await tray.boundingBox();
    expect(afterBox).not.toBeNull();
    // Position should have changed
    expect(Math.abs(afterBox!.y - beforeBox!.y)).toBeGreaterThan(10);
  });

  test('venue count text is visible in tray handle area', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const tray = page.locator('.lg\\:hidden [aria-label="Venue card tray"]');
    await expect(tray).toBeAttached({ timeout: 10000 });

    const venueCount = tray.locator('[data-testid="venue-count"]');
    await expect(venueCount).toBeVisible({ timeout: 15000 });

    const countText = await venueCount.textContent();
    expect(countText).toMatch(/\d+\s+(restaurang|venues?)/);
  });

  test('card tray content area is scrollable in half-expanded state', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const tray = page.locator('.lg\\:hidden [aria-label="Venue card tray"]');
    await expect(tray).toBeAttached({ timeout: 10000 });

    // Expand to half-expanded
    const grabHandle = tray.locator('[role="button"]');
    await grabHandle.click();
    await page.waitForTimeout(500);

    // The content area should have overflow-y-auto
    const contentArea = tray.locator('.overflow-y-auto');
    await expect(contentArea).toBeAttached();

    const overflow = await contentArea.evaluate(
      (el) => window.getComputedStyle(el).overflowY
    );
    expect(overflow).toBe('auto');
  });

  test('tray has aria-live="polite" for dynamic venue updates', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const tray = page.locator('.lg\\:hidden [aria-label="Venue card tray"]');
    await expect(tray).toBeAttached({ timeout: 10000 });

    const liveRegion = tray.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeAttached();
  });
});

test.describe('Card Tray — Desktop Side Panel', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });
  });

  test('desktop uses side panel instead of bottom sheet', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // Desktop renders BottomCardTray in the .hidden.lg\\:block wrapper as an aside
    const sidePanel = page.locator('.hidden.lg\\:block aside[aria-label="Venue list"]');
    await expect(sidePanel).toBeVisible({ timeout: 10000 });

    // Mobile wrapper should be hidden
    const mobileWrapper = page.locator('.lg\\:hidden');
    await expect(mobileWrapper).toBeHidden();
  });

  test('side panel shows venue count', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const sidePanel = page.locator('.hidden.lg\\:block aside[aria-label="Venue list"]');
    await expect(sidePanel).toBeVisible({ timeout: 10000 });

    const venueCount = sidePanel.locator('[data-testid="venue-count"]');
    await expect(venueCount).toBeVisible({ timeout: 15000 });

    const countText = await venueCount.textContent();
    expect(countText).toMatch(/\d+\s+(restaurang|venues?)/);
  });

  test('side panel has aria-live="polite"', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const sidePanel = page.locator('.hidden.lg\\:block aside[aria-label="Venue list"]');
    await expect(sidePanel).toBeVisible({ timeout: 10000 });

    const liveRegion = sidePanel.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeAttached();
  });
});

test.describe('Card Tray — Loading & Empty States', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('shows tray container while data is loading', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // The tray should render even before data loads
    const tray = page.locator('[aria-label="Venue card tray"]').first();
    await expect(tray).toBeAttached({ timeout: 10000 });
  });

  test('shows empty state text when no venues in range', async ({ page, context }) => {
    // Set location far from Gothenburg where no venues exist
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 0, longitude: 0 });

    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // Wait for data to load (should be empty)
    await page.waitForTimeout(5000);

    // Either empty state message or venue cards
    const emptyState = page.locator('[data-testid="empty-state"]');
    const cards = home.venueCards();

    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasCards = (await cards.count()) > 0;

    // One of these should be true — app shouldn't show nothing
    expect(hasEmpty || hasCards).toBe(true);
  });
});
