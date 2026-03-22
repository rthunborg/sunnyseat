import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

// --- AC 1: Mobile Layout (375×667) Tests ---

test.describe('AC1: Mobile Layout (375×667)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('card tray renders as bottom sheet (not side panel)', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // Mobile: bottom sheet has aria-label "Venue card tray"
    const bottomSheet = page.locator('[aria-label="Venue card tray"]');
    await expect(bottomSheet).toBeAttached({ timeout: 10000 });

    // Desktop side panel should NOT be visible
    const sidePanel = page.locator('aside[aria-label="Venue list"]');
    await expect(sidePanel).not.toBeVisible();
  });

  test('cards are full-width single column', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 57.7089, longitude: 11.9746 });

    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const firstCard = home.venueCards().first();
    await expect(firstCard).toBeAttached({ timeout: 15000 });

    const cardBox = await firstCard.boundingBox();
    expect(cardBox).not.toBeNull();
    // Card should be nearly full width (375px - 2×16px padding = 343px min)
    expect(cardBox!.width).toBeGreaterThanOrEqual(330);
  });

  test('map occupies full viewport behind card tray', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const mapBox = await home.mapContainer.boundingBox();
    expect(mapBox).not.toBeNull();
    // Map should span full viewport width
    expect(mapBox!.width).toBeGreaterThanOrEqual(370);
  });

  test('search bar is full-width', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    await expect(home.searchBar).toBeVisible({ timeout: 10000 });
    const searchBox = await home.searchBar.boundingBox();
    expect(searchBox).not.toBeNull();
    // Should span most of the 375px viewport (minus small margins)
    expect(searchBox!.width).toBeGreaterThanOrEqual(330);
  });

  test('side padding is 16px on mobile', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // The card tray content area uses px-4 (16px)
    const bottomSheet = page.locator('[aria-label="Venue card tray"]');
    await expect(bottomSheet).toBeAttached({ timeout: 10000 });

    const contentArea = bottomSheet.locator('.overflow-y-auto');
    const paddingLeft = await contentArea.evaluate(
      (el) => window.getComputedStyle(el).paddingLeft
    );
    expect(paddingLeft).toBe('16px');
  });
});

// --- AC 2: Tablet Layout (768×1024) Tests ---

test.describe('AC2: Tablet Layout (768×1024)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('card tray still renders as bottom sheet', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const bottomSheet = page.locator('[aria-label="Venue card tray"]');
    await expect(bottomSheet).toBeAttached({ timeout: 10000 });

    // Desktop side panel should NOT be visible at 768px
    const sidePanel = page.locator('aside[aria-label="Venue list"]');
    await expect(sidePanel).not.toBeVisible();
  });

  test('cards are full-width single column on tablet', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 57.7089, longitude: 11.9746 });

    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const firstCard = home.venueCards().first();
    await expect(firstCard).toBeAttached({ timeout: 15000 });

    const cardBox = await firstCard.boundingBox();
    expect(cardBox).not.toBeNull();
    // Card should be wider on tablet (768px - 2×24px padding = 720px min)
    expect(cardBox!.width).toBeGreaterThanOrEqual(700);
  });

  test('side padding is 24px on tablet', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const bottomSheet = page.locator('[aria-label="Venue card tray"]');
    await expect(bottomSheet).toBeAttached({ timeout: 10000 });

    const contentArea = bottomSheet.locator('.overflow-y-auto');
    const paddingLeft = await contentArea.evaluate(
      (el) => window.getComputedStyle(el).paddingLeft
    );
    expect(paddingLeft).toBe('24px');
  });

  test('all components scale properly at tablet width', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // Search bar should be visible and well-sized
    await expect(home.searchBar).toBeVisible({ timeout: 10000 });
    const searchBox = await home.searchBar.boundingBox();
    expect(searchBox).not.toBeNull();
    expect(searchBox!.width).toBeGreaterThanOrEqual(700);
  });
});

// --- AC 3: Desktop Layout (1280×720) Tests ---

test.describe('AC3: Desktop Layout (1280×720)', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('card tray becomes side panel on left side', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const sidePanel = page.locator('aside[aria-label="Venue list"]');
    await expect(sidePanel).toBeVisible({ timeout: 10000 });

    const panelBox = await sidePanel.boundingBox();
    expect(panelBox).not.toBeNull();
    // Side panel should be ~380px wide
    expect(panelBox!.width).toBeGreaterThanOrEqual(370);
    expect(panelBox!.width).toBeLessThanOrEqual(400);
    // Should be on the left side
    expect(panelBox!.x).toBeLessThanOrEqual(10);
  });

  test('map occupies remaining viewport width', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const sidePanel = page.locator('aside[aria-label="Venue list"]');
    await expect(sidePanel).toBeVisible({ timeout: 10000 });

    const panelBox = await sidePanel.boundingBox();
    const mapContainer = page.locator('[role="application"]');
    const mapBox = await mapContainer.boundingBox();

    expect(panelBox).not.toBeNull();
    expect(mapBox).not.toBeNull();
    // Map should start after side panel
    expect(mapBox!.x).toBeGreaterThanOrEqual(panelBox!.width - 10);
    // Map + panel should span full viewport
    expect(panelBox!.width + mapBox!.width).toBeGreaterThanOrEqual(1270);
  });

  test('side panel is scrollable with venue cards', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 57.7089, longitude: 11.9746 });

    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const sidePanel = page.locator('aside[aria-label="Venue list"]');
    await expect(sidePanel).toBeVisible({ timeout: 10000 });

    // Verify overflow-y-auto is set
    const overflow = await sidePanel.evaluate(
      (el) => window.getComputedStyle(el).overflowY
    );
    expect(overflow).toBe('auto');
  });

  test('no bottom sheet behavior on desktop', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // The mobile bottom sheet should be hidden on desktop (wrapped in lg:hidden)
    const mobileWrapper = page.locator('.lg\\:hidden');
    const _bottomSheet = mobileWrapper.locator('[aria-label="Venue card tray"]');

    // The mobile wrapper is display:none at lg, so contents should not be visible
    await expect(mobileWrapper).toBeHidden();
  });

  test('search bar is constrained width on desktop', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    await expect(home.searchBar).toBeVisible({ timeout: 10000 });
    const searchBox = await home.searchBar.boundingBox();
    expect(searchBox).not.toBeNull();
    // Should be ~288px (w-72 = 18rem = 288px)
    expect(searchBox!.width).toBeLessThanOrEqual(320);
  });
});

// --- AC 4: Responsive Breakpoint Transition Tests ---

test.describe('AC4: Responsive Breakpoint Transitions', () => {
  test('resizing from mobile to desktop: bottom sheet transitions to side panel', async ({
    page,
  }) => {
    // Start at mobile
    await page.setViewportSize({ width: 375, height: 667 });
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // Mobile: bottom sheet visible
    const bottomSheet = page.locator('[aria-label="Venue card tray"]');
    await expect(bottomSheet).toBeAttached({ timeout: 10000 });

    // Resize to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500); // Allow CSS transition + hook update

    // Desktop: side panel should appear
    const sidePanel = page.locator('aside[aria-label="Venue list"]');
    await expect(sidePanel).toBeVisible({ timeout: 5000 });
  });

  test('resizing from desktop to mobile: side panel transitions to bottom sheet', async ({
    page,
  }) => {
    // Start at desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const sidePanel = page.locator('aside[aria-label="Venue list"]');
    await expect(sidePanel).toBeVisible({ timeout: 10000 });

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Mobile: bottom sheet should appear
    const bottomSheet = page.locator('[aria-label="Venue card tray"]');
    await expect(bottomSheet).toBeAttached({ timeout: 5000 });

    // Side panel should be hidden
    await expect(sidePanel).not.toBeVisible();
  });

  test('no layout breaks at 768px breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // Should still be bottom sheet at 768px (below 1024px threshold)
    const bottomSheet = page.locator('[aria-label="Venue card tray"]');
    await expect(bottomSheet).toBeAttached({ timeout: 10000 });
    const sidePanel = page.locator('aside[aria-label="Venue list"]');
    await expect(sidePanel).not.toBeVisible();

    // No horizontal scrollbar
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('no layout breaks at 1024px breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // At exactly 1024px, should transition to desktop side panel
    const sidePanel = page.locator('aside[aria-label="Venue list"]');
    await expect(sidePanel).toBeVisible({ timeout: 10000 });

    // No horizontal scrollbar
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});

// --- AC 5: Component Responsiveness Tests ---

test.describe('AC5: Component Responsiveness', () => {
  test('VenueCard adapts to container width without overflow at 375px', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 57.7089, longitude: 11.9746 });

    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const firstCard = home.venueCards().first();
    await expect(firstCard).toBeAttached({ timeout: 15000 });

    // Card should not overflow its container
    const cardBox = await firstCard.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(cardBox!.x).toBeGreaterThanOrEqual(0);
    expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(375);
  });

  test('VenueCard adapts to container width without overflow at 1280px', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 57.7089, longitude: 11.9746 });

    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const firstCard = home.venueCards().first();
    await expect(firstCard).toBeAttached({ timeout: 15000 });

    const cardBox = await firstCard.boundingBox();
    expect(cardBox).not.toBeNull();
    // On desktop, cards are inside 380px side panel
    expect(cardBox!.width).toBeLessThanOrEqual(380);
  });

  test('MiniTimeline scales to available width', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 57.7089, longitude: 11.9746 });

    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 720 });
      const home = new HomePage(page);
      await home.goto();
      await home.waitForReady();

      const timeline = home.miniTimelines().first();
      await expect(timeline).toBeAttached({ timeout: 15000 });

      const box = await timeline.boundingBox();
      expect(box).not.toBeNull();
      // Timeline should fill its container width (w-full)
      expect(box!.width).toBeGreaterThan(50);
    }
  });
});

// --- AC 6: Visual Regression (Viewport-Specific) ---

test.describe('AC6: Visual Regression', () => {
  for (const vp of [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 720 },
  ]) {
    test(`home page screenshot at ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const home = new HomePage(page);
      await home.goto();
      await home.waitForReady();

      await expect(page).toHaveScreenshot(`home-${vp.name}.png`, {
        fullPage: false,
        timeout: 15000,
      });
    });
  }

  for (const vp of [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 720 },
  ]) {
    test(`venue detail screenshot at ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      // Navigate to a known venue slug — uses first available or static route
      await page.goto('/v/cafe-husaren');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot(`venue-detail-${vp.name}.png`, {
        fullPage: true,
        timeout: 15000,
      });
    });
  }
});
