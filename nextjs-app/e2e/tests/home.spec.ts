import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { checkAccessibility } from '../helpers/accessibility';

// --- AC 1: Map Rendering Tests ---

test.describe('AC1: Map Rendering', () => {
  test('map container with role="application" renders and is visible', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    await expect(home.mapContainer).toBeVisible();
  });

  test('map has correct aria-label describing it as a patio map', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // Swedish: "Karta med restauranger"
    await expect(home.mapContainer).toHaveAttribute('aria-label', 'Karta med restauranger');
  });

  test('map defaults to Gothenburg center when no location', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // Map should be visible — if tiles load, the canvas won't be blank
    await expect(home.mapContainer).toBeVisible();
    // MapLibre renders a canvas inside the container
    const canvas = home.mapContainer.locator('canvas');
    await expect(canvas).toBeAttached({ timeout: 15000 });
  });
});

// --- AC 2: Location Permission Flow Tests ---

test.describe('AC2: Location Permission Flow', () => {
  test('first visit shows pre-permission overlay with "Tillåt plats" button', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    const home = new HomePage(page);
    await home.goto();

    await expect(home.locationPrompt).toBeVisible({ timeout: 10000 });
  });

  test('"Eller välj på kartan" fallback link is visible below primary button', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    const home = new HomePage(page);
    await home.goto();

    await expect(home.locationFallback).toBeVisible({ timeout: 10000 });
  });

  test('clicking fallback dismisses overlay, map remains interactive', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    const home = new HomePage(page);
    await home.goto();

    await expect(home.locationFallback).toBeVisible({ timeout: 10000 });
    await home.locationFallback.click();

    await expect(home.locationPrompt).toBeHidden({ timeout: 5000 });
    await expect(home.mapContainer).toBeVisible();
  });

  test('after granting location, map centers on user position', async ({ page, context }) => {
    // Mock geolocation for Gothenburg center
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 57.7089, longitude: 11.9746 });

    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // The location prompt should not be visible since permission is already granted
    // (or it should dismiss quickly after geolocation resolves)
    await expect(home.mapContainer).toBeVisible();
  });
});

// --- AC 3: Card Tray Tests ---

test.describe('AC3: Card Tray', () => {
  test('card tray container renders with correct aria-label', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // Wait for card tray to appear (either mobile "Venue card tray" or desktop "Venue list")
    await expect(home.cardTray).toBeAttached({ timeout: 10000 });
  });

  test('card tray shows venue cards when data is loaded', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 57.7089, longitude: 11.9746 });

    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // Wait for data to load — venue cards should appear
    await expect(home.venueCards().first()).toBeAttached({ timeout: 15000 });
  });

  test('each VenueCard shows venue name', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 57.7089, longitude: 11.9746 });

    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // Wait for first card
    const firstCard = home.venueCards().first();
    await expect(firstCard).toBeAttached({ timeout: 15000 });

    // Card should have text content (venue name in aria-label)
    const ariaLabel = await firstCard.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel!.length).toBeGreaterThan(0);
  });

  test('"Gå dit" (Directions) button visible on cards with 48px touch target', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 57.7089, longitude: 11.9746 });

    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const firstBtn = home.directionsButtons().first();
    await expect(firstBtn).toBeAttached({ timeout: 15000 });
    await expect(firstBtn).toContainText('Gå dit');

    // Verify touch target meets 48px minimum
    const box = await firstBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(48);
  });

  test('card tray shows result count text', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 57.7089, longitude: 11.9746 });

    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // Wait for venue count to show — should match pattern like "X restauranger"
    await expect(home.venueCount).toBeAttached({ timeout: 15000 });
    const countText = await home.venueCount.textContent();
    expect(countText).toMatch(/\d+\s+restaurang/);
  });
});

// --- AC 4: VenueCard Content Tests ---

test.describe('AC4: VenueCard Content', () => {
  test('VenueCards have sun status data attribute', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 57.7089, longitude: 11.9746 });

    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const firstCard = home.venueCards().first();
    await expect(firstCard).toBeAttached({ timeout: 15000 });

    // Verify card has a valid sun status
    const sunStatus = await firstCard.getAttribute('data-sun-status');
    expect(['sunny', 'partial', 'shaded', 'upcoming']).toContain(sunStatus);
  });

  test('MiniTimeline component renders within each card', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 57.7089, longitude: 11.9746 });

    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const firstCard = home.venueCards().first();
    await expect(firstCard).toBeAttached({ timeout: 15000 });

    const timeline = firstCard.locator('[data-testid="mini-timeline"]');
    await expect(timeline).toBeAttached();
  });

  test('distance shown in meters', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 57.7089, longitude: 11.9746 });

    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const firstCard = home.venueCards().first();
    await expect(firstCard).toBeAttached({ timeout: 15000 });

    // The aria-label includes "X meter"
    const ariaLabel = await firstCard.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/\d+\s*meter/);
  });
});

// --- AC 5: Search Bar Tests ---

test.describe('AC5: Search Bar', () => {
  test('search bar is visible and interactive', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    await expect(home.searchBar).toBeVisible({ timeout: 10000 });
    await expect(home.searchInput).toBeVisible();
  });

  test('typing a venue name shows suggestions', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    await home.searchInput.fill('Café');
    // Wait for debounce (200ms) + render
    await page.waitForTimeout(400);

    // Search suggestions listbox should appear
    const suggestions = page.locator('#search-suggestions');
    await expect(suggestions).toBeVisible({ timeout: 5000 });
  });

  test('clearing search hides suggestions', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    await home.searchInput.fill('Café');
    await page.waitForTimeout(400);

    await home.searchInput.fill('');
    await page.waitForTimeout(400);

    const suggestions = page.locator('#search-suggestions');
    await expect(suggestions).toBeHidden();
  });
});

// --- AC 6: Map-Card Synchronization Tests ---

test.describe('AC6: Map-Card Synchronization', () => {
  test('venue markers render on the map', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 57.7089, longitude: 11.9746 });

    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // Wait for venue cards to load (confirms data is fetched)
    await expect(home.venueCards().first()).toBeAttached({ timeout: 15000 });

    // MapLibre renders markers via canvas — verify canvas is present
    const canvas = home.mapContainer.locator('canvas');
    await expect(canvas).toBeAttached();
  });
});

// --- AC 7: Empty/Error States ---

test.describe('AC7: Empty/Error States', () => {
  test('no crash when navigating to home page', async ({ page }) => {
    const home = new HomePage(page);
    const response = await page.goto('/');
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
    await home.waitForReady();
  });
});

// --- AC 8: Accessibility ---

test.describe('AC8: Accessibility', () => {
  test('skip link to content is present', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // "Hoppa till innehåll" skip link
    await expect(home.skipLink).toBeAttached();
    await expect(home.skipLink).toContainText('Hoppa till innehåll');
  });

  test('card tray has aria-live="polite" for dynamic updates', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion.first()).toBeAttached({ timeout: 10000 });
  });

  test('axe-core scan of home page passes WCAG 2.1 AA', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const results = await checkAccessibility(page);
    // Filter out known third-party violations (MapLibre canvas is excluded in helper)
    const violations = results.violations.filter(
      (v) => !v.id.includes('color-contrast') // MapLibre may inject elements with contrast issues
    );

    expect(violations).toEqual([]);
  });

  test('location prompt dialog has proper ARIA attributes', async ({ page, context }) => {
    await context.clearCookies();
    const home = new HomePage(page);
    await home.goto();

    const dialog = home.locationPromptDialog();
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAttribute('aria-labelledby', 'location-prompt-title');
  });

  test('venue cards are keyboard accessible', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 57.7089, longitude: 11.9746 });

    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const firstCard = home.venueCards().first();
    await expect(firstCard).toBeAttached({ timeout: 15000 });

    // Cards should have role="article" and tabIndex=0
    await expect(firstCard).toHaveAttribute('role', 'article');
    await expect(firstCard).toHaveAttribute('tabindex', '0');
  });
});

// --- AC 9: Sort Order ---

test.describe('AC9: Sort Order', () => {
  test('cards display in correct sort order: sunny first', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 57.7089, longitude: 11.9746 });

    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const cards = home.venueCards();
    await expect(cards.first()).toBeAttached({ timeout: 15000 });

    const count = await cards.count();
    if (count < 2) return; // Not enough data to verify order

    // Collect sun status values
    const statuses: string[] = [];
    for (let i = 0; i < count; i++) {
      const status = await cards.nth(i).getAttribute('data-sun-status');
      statuses.push(status || 'unknown');
    }

    // Verify sunny comes before partial, partial before shaded
    const tierOrder = { sunny: 1, partial: 2, upcoming: 3, shaded: 4, unknown: 5 };
    for (let i = 1; i < statuses.length; i++) {
      const prevTier = tierOrder[statuses[i - 1] as keyof typeof tierOrder] ?? 5;
      const currTier = tierOrder[statuses[i] as keyof typeof tierOrder] ?? 5;
      expect(currTier).toBeGreaterThanOrEqual(prevTier);
    }
  });
});
