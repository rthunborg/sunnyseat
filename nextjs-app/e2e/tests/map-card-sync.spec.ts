import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

const GOTHENBURG_LAT = 57.7089;
const GOTHENBURG_LNG = 11.9746;

/**
 * Map ↔ Card Synchronization E2E Tests
 *
 * UX Spec: "Two views of the same data must feel like one unified experience."
 *
 * NOTE: On mobile, cards are inside BottomCardTray (peeking state) and may
 * not be visible without expanding the tray first. Desktop uses side panel.
 * HomeScreen renders BottomCardTray twice, so locators use specific wrappers.
 */

/** Get the visible mobile card tray */
function mobileTray(page: import('@playwright/test').Page) {
  return page.locator('.lg\\:hidden [aria-label="Venue card tray"]');
}

/** Expand mobile card tray to half-expanded so cards are scrollable */
async function expandMobileTray(page: import('@playwright/test').Page) {
  const tray = mobileTray(page);
  const grabHandle = tray.locator('[role="button"]');
  await grabHandle.click();
  await page.waitForTimeout(500);
}

/** Get venue cards scoped to the visible mobile tray */
function mobileVenueCards(page: import('@playwright/test').Page) {
  return mobileTray(page).locator('[data-testid^="venue-card-"]');
}

test.describe('Map-Card Sync — Marker Interaction', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });
  });

  test('map renders venue markers as canvas layer', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    await expandMobileTray(page);
    await expect(mobileVenueCards(page).first()).toBeAttached({ timeout: 15000 });

    const canvas = home.mapContainer.locator('canvas');
    await expect(canvas).toBeAttached();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test('venue cards in tray have valid sun-status data attributes', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    await expandMobileTray(page);
    const cards = mobileVenueCards(page);
    await expect(cards.first()).toBeAttached({ timeout: 15000 });

    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 5); i++) {
      const status = await cards.nth(i).getAttribute('data-sun-status');
      expect(['sunny', 'partial', 'shaded', 'upcoming']).toContain(status);
    }
  });

  test('clicking a VenueCard navigates to venue detail page', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    await expandMobileTray(page);
    const firstCard = mobileVenueCards(page).first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });

    const testId = await firstCard.getAttribute('data-testid');
    expect(testId).toBeTruthy();
    const slug = testId!.replace('venue-card-', '');

    await firstCard.click();
    await page.waitForURL(`**/v/${slug}`, { timeout: 10000 });
  });

  test('card has no directions button (directions on detail page only)', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    await expandMobileTray(page);
    const firstCard = mobileVenueCards(page).first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });

    // Card should have no directions button — it's on the detail page now
    const directionsBtn = firstCard.locator('[data-testid="venue-directions-btn"]');
    await expect(directionsBtn).toHaveCount(0);
  });
});

test.describe('Map-Card Sync — Card Accessibility', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });
  });

  test('venue cards have role="article" and tabindex="0"', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    await expandMobileTray(page);
    const firstCard = mobileVenueCards(page).first();
    await expect(firstCard).toBeAttached({ timeout: 15000 });

    await expect(firstCard).toHaveAttribute('role', 'article');
    await expect(firstCard).toHaveAttribute('tabindex', '0');
  });

  test('venue cards are keyboard navigable (Enter)', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    await expandMobileTray(page);
    const firstCard = mobileVenueCards(page).first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });

    await firstCard.focus();
    await expect(firstCard).toBeFocused();

    const testId = await firstCard.getAttribute('data-testid');
    const slug = testId!.replace('venue-card-', '');

    await firstCard.press('Enter');
    await page.waitForURL(`**/v/${slug}`, { timeout: 10000 });
  });
});

test.describe('Map-Card Sync — Desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });
  });

  test('side panel and map render simultaneously', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const sidePanel = page.locator('.hidden.lg\\:block aside[aria-label="Venue list"]');
    await expect(sidePanel).toBeVisible({ timeout: 10000 });

    const canvas = home.mapContainer.locator('canvas');
    await expect(canvas).toBeAttached();

    const panelBox = await sidePanel.boundingBox();
    const canvasBox = await canvas.boundingBox();

    expect(panelBox).not.toBeNull();
    expect(canvasBox).not.toBeNull();
    expect(panelBox!.width).toBeGreaterThan(0);
    expect(canvasBox!.width).toBeGreaterThan(0);
  });

  test('clicking card on desktop navigates to venue detail', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    await expect(home.venueCards().first()).toBeVisible({ timeout: 15000 });

    const firstCard = home.venueCards().first();
    const testId = await firstCard.getAttribute('data-testid');
    const slug = testId!.replace('venue-card-', '');

    await firstCard.click();
    await page.waitForURL(`**/v/${slug}`, { timeout: 10000 });
  });

  test('venue count matches cards in side panel', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const sidePanel = page.locator('.hidden.lg\\:block aside[aria-label="Venue list"]');
    await expect(sidePanel).toBeVisible({ timeout: 10000 });

    // Scope cards to the visible side panel
    const panelCards = sidePanel.locator('[data-testid^="venue-card-"]');
    await expect(panelCards.first()).toBeVisible({ timeout: 15000 });

    const cardCount = await panelCards.count();
    expect(cardCount).toBeGreaterThan(0);

    const venueCountText = await sidePanel.locator('[data-testid="venue-count"]').textContent();
    expect(venueCountText).toContain(String(cardCount));
  });
});

test.describe('Map-Card Sync — Map Interaction', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });
  });

  test('map is interactive (pointer events not blocked)', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const canvas = home.mapContainer.locator('canvas');
    await expect(canvas).toBeAttached({ timeout: 15000 });

    const isInteractive = await canvas.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.pointerEvents !== 'none';
    });
    expect(isInteractive).toBe(true);
  });

  test('map container has aria-label', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // MapContainer renders with role="application" and aria-label
    const ariaLabel = await home.mapContainer.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel!.length).toBeGreaterThan(0);
  });
});
