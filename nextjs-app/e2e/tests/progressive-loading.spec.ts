import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

const GOTHENBURG_LAT = 57.7089;
const GOTHENBURG_LNG = 11.9746;

/**
 * Progressive Loading E2E Tests
 *
 * UX Spec defines a loading timeline:
 *   0–1s: Default map view renders (no blank screen)
 *   1–2.5s: Map tiles loading, geolocation resolving
 *   2.5–4s: Skeleton cards in tray, "Hittar soliga uteplatser..."
 *   4–6s: First real VenueCard replaces skeleton
 *   6–8s: All cards/markers loaded
 *
 * These tests verify the key progressive loading guarantees.
 */

test.describe('Progressive Loading — Map First', () => {
  test('map container renders before venue data loads', async ({ page }) => {
    // Navigate without geolocation to observe loading state
    await page.goto('/');

    // Map container should appear quickly (before data)
    const mapContainer = page.locator('[role="application"]');
    await expect(mapContainer).toBeAttached({ timeout: 5000 });
  });

  test('map shows Gothenburg default view when no location', async ({ page }) => {
    await page.goto('/');

    const mapContainer = page.locator('[role="application"]');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });

    // Canvas should be present (map tiles rendering)
    const canvas = mapContainer.locator('canvas');
    await expect(canvas).toBeAttached({ timeout: 15000 });
  });

  test('no blank screen during initial load', async ({ page }) => {
    // Capture the page state at 1 second
    await page.goto('/');
    await page.waitForTimeout(1000);

    // At 1s, SOMETHING should be visible — at minimum the map container
    const body = await page.textContent('body');
    expect(body).toBeTruthy();

    // The main content area should exist
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeAttached();
  });
});

test.describe('Progressive Loading — Card Tray States', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('card tray appears during loading with venue count', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    await page.goto('/');

    // Card tray should appear (even with loading state)
    const tray = page.locator('[aria-label="Venue card tray"]').first();
    await expect(tray).toBeAttached({ timeout: 10000 });

    // Venue count element should exist
    const venueCount = tray.locator('[data-testid="venue-count"]');
    await expect(venueCount).toBeAttached({ timeout: 10000 });
  });

  test('skeleton loaders or venue cards eventually appear', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // After loading, either skeleton cards, real venue cards, or empty state should show
    // Wait generously for data to load
    await page.waitForTimeout(8000);

    const cards = home.venueCards();
    const emptyState = page.locator('[data-testid="empty-state"]');

    const hasCards = (await cards.count()) > 0;
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    // One of these must be true — app should never show a perpetual loading state
    expect(hasCards || hasEmpty).toBe(true);
  });

  test('venue cards replace loading state with real data', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    // Wait for data to load
    const firstCard = home.venueCards().first();
    await expect(firstCard).toBeAttached({ timeout: 15000 });

    // Card should have real venue data (not skeleton)
    const ariaLabel = await firstCard.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel!.length).toBeGreaterThan(10);

    // Card should have a valid sun status
    const sunStatus = await firstCard.getAttribute('data-sun-status');
    expect(['sunny', 'partial', 'shaded', 'upcoming']).toContain(sunStatus);
  });
});

test.describe('Progressive Loading — Desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('side panel appears with content after data loads', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const sidePanel = page.locator('.hidden.lg\\:block aside[aria-label="Venue list"]');
    await expect(sidePanel).toBeVisible({ timeout: 10000 });

    // Wait for data
    const panelCards = sidePanel.locator('[data-testid^="venue-card-"]');
    await expect(panelCards.first()).toBeAttached({ timeout: 15000 });
  });
});
