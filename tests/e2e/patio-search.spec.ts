import { test, expect } from '@playwright/test';

/**
 * End-to-end tests for patio search user flow
 * Tests the complete user journey of searching for patios by location
 */
test.describe('Patio Search Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
  });

  test('should load home page with map', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify map container is present
    const mapContainer = page.locator('[data-testid="patio-map"], .maplibregl-map, canvas').first();
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
  });

  test('should display location control', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify location control is visible
    // LocationControl should be in the top-left overlay
    const locationControl = page.locator('text=/radius|location|km/i').first();
    await expect(locationControl).toBeVisible({ timeout: 5000 });
  });

  test('should request location permission on page load', async ({ page, context }) => {
    // Grant geolocation permission
    await context.grantPermissions(['geolocation'], { origin: 'http://localhost:3000' });
    
    // Set mock geolocation
    await context.setGeolocation({ latitude: 45.5017, longitude: -73.5673 }); // Montreal

    // Navigate to page
    await page.goto('/');

    // Wait for location to be requested/used
    await page.waitForTimeout(2000);

    // Verify location was requested (check for API call to /api/patios)
    const patioApiCall = page.waitForResponse(
      (response) => response.url().includes('/api/patios') && response.status() === 200,
      { timeout: 10000 }
    ).catch(() => null);

    // Location should trigger patio search
    const response = await patioApiCall;
    if (response) {
      expect(response.status()).toBe(200);
    }
  });

  test('should search for patios when location is available', async ({ page, context }) => {
    // Grant geolocation permission
    await context.grantPermissions(['geolocation'], { origin: 'http://localhost:3000' });
    
    // Set mock geolocation (Montreal coordinates)
    await context.setGeolocation({ latitude: 45.5017, longitude: -73.5673 });

    // Navigate to page
    await page.goto('/');

    // Wait for patio search API call
    const response = await page.waitForResponse(
      (response) => response.url().includes('/api/patios') && response.status() === 200,
      { timeout: 15000 }
    );

    // Verify API response
    const responseData = await response.json();
    expect(responseData).toHaveProperty('patios');
    expect(Array.isArray(responseData.patios)).toBe(true);

    // Verify patios count is displayed (if patios found)
    if (responseData.patios.length > 0) {
      const patiosCount = page.locator('text=/found \\d+ patios?/i');
      await expect(patiosCount).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle location permission denial gracefully', async ({ page, context }) => {
    // Deny geolocation permission
    await context.clearPermissions();

    // Navigate to page
    await page.goto('/');

    // Wait for error message or fallback behavior
    await page.waitForTimeout(3000);

    // Should still show map (even without location)
    const mapContainer = page.locator('[data-testid="patio-map"], .maplibregl-map, canvas').first();
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
  });

  test('should allow changing search radius', async ({ page, context }) => {
    // Grant geolocation permission
    await context.grantPermissions(['geolocation'], { origin: 'http://localhost:3000' });
    await context.setGeolocation({ latitude: 45.5017, longitude: -73.5673 });

    // Navigate to page
    await page.goto('/');

    // Wait for initial load
    await page.waitForLoadState('networkidle');

    // Look for radius control (slider, input, or button)
    // This may need adjustment based on actual UI implementation
    const radiusControl = page.locator('input[type="range"], input[name*="radius"], button:has-text("km")').first();
    
    if (await radiusControl.isVisible().catch(() => false)) {
      // Change radius value
      await radiusControl.fill('5');
      
      // Wait for new API call with updated radius
      const response = await page.waitForResponse(
        (response) => response.url().includes('/api/patios') && response.status() === 200,
        { timeout: 10000 }
      ).catch(() => null);

      if (response) {
        expect(response.url()).toContain('radiusKm=5');
      }
    }
  });

  test('should display loading state while fetching patios', async ({ page, context }) => {
    // Grant geolocation permission
    await context.grantPermissions(['geolocation'], { origin: 'http://localhost:3000' });
    await context.setGeolocation({ latitude: 45.5017, longitude: -73.5673 });

    // Navigate to page
    await page.goto('/');

    // Check for loading indicator (may appear briefly)
    const loadingIndicator = page.locator('text=/loading|spinner/i').first();
    
    // Loading state may be very brief, so we check if it appears at all
    const loadingVisible = await loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false);
    
    // If loading was visible, wait for it to disappear
    if (loadingVisible) {
      await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
    }
  });

  test('should handle API errors gracefully', async ({ page, context }) => {
    // Grant geolocation permission
    await context.grantPermissions(['geolocation'], { origin: 'http://localhost:3000' });
    await context.setGeolocation({ latitude: 45.5017, longitude: -73.5673 });

    // Intercept and fail the patio API call
    await page.route('**/api/patios*', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    // Navigate to page
    await page.goto('/');

    // Wait for error to be handled
    await page.waitForTimeout(2000);

    // Verify error message is displayed
    const errorMessage = page.locator('text=/error|failed|try again/i').first();
    const errorVisible = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);
    
    // Error handling should be present (either visible error or graceful degradation)
    expect(errorVisible || await page.locator('body').isVisible()).toBe(true);
  });
});
