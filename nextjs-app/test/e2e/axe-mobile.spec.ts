// Mobile-viewport axe-core a11y gate (Story 7.3 Task 8.5).
//
// The desktop `a11y` project (axe.spec.ts, Desktop Chrome) cannot exercise the
// mobile-sheet variants — the mobile venue-detail sheet, the mobile review
// form, the mobile feedback prompt — because those selectors are only visible
// below the `lg` breakpoint. This spec runs under the `a11y-mobile` project
// (iPhone 14) so those mobile surfaces, plus the new offline shell, are inside
// the automated accessibility gate. Carried from the Story 3.4 review
// deferred-work ("mobile-viewport axe a11y-gate extension").

import { expect, test } from '@playwright/test';
import { runAxe, formatViolations } from './helpers/axe';
import { FIRST_RUN_GUIDE_SEEN_KEY, ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import { arrangeVenuePhotoMedia } from './helpers/venue-photo-media';

async function bypassOnboarding(page: import('@playwright/test').Page) {
  await page.addInitScript(
  ({ onboardedKey, guideSeenKey }) => {
    window.localStorage.setItem(onboardedKey, '1');
    window.localStorage.setItem(guideSeenKey, '1');
  },
  { onboardedKey: ONBOARDED_FLAG_KEY, guideSeenKey: FIRST_RUN_GUIDE_SEEN_KEY },
);
}

async function mockEmptyVenues(page: import('@playwright/test').Page) {
  await page.route('**/api/venues?**', async (route) => {
    await route.fulfill({
      json: {
        venues: [],
        meta: { count: 0, radiusKm: 2 },
        timestamp: '2026-07-28T12:00:00.000Z',
        totalCount: 0,
      },
    });
  });
}

test.describe('axe-core a11y gate (mobile viewport)', () => {
  test.beforeEach(async ({ page }) => {
    // Axe samples composited colours. Reduced motion keeps each scan on the
    // settled UI instead of catching sheet/page opacity during entrance.
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  // Mobile-specific surfaces are active CI gates. The historical venue-card
  // amber-label contrast debt was resolved by the readable `text-amber-dark`
  // treatment, so these scans must not remain deferred.
  test('a11y: mobile row-count sheet handle-only state (/?_state=map-primary)', async ({ page }) => {
    await bypassOnboarding(page);
    await page.route('**://api.met.no/**', (route) => route.abort());
    await page.route('**/api/venues?**', async (route) => {
      await route.fulfill({
        json: {
          venues: [
            {
              id: 'venue-1',
              venueId: 'venue-1',
              venueName: 'Kafé Magasinet',
              venueSlug: 'test-venue-sunny',
              slug: 'test-venue-sunny',
              neighborhood: 'Inom Vallgraven',
              location: { lat: 57.705, lng: 11.97 },
              currentSunStatus: 'Sunny',
              weatherGateState: 'not_gated',
              isPartner: true,
              confidence: 90,
              distanceMeters: 120,
              sunExposurePercent: 90,
              tags: [],
              sunWindow: { start: '11:00', end: '18:00' },
              thumbnail: { alt: 'Kafé Magasinet', initials: 'K' },
            },
          ],
          meta: { count: 1, radiusKm: 2 },
          timestamp: '2026-07-20T12:00:00.000Z',
          totalCount: 1,
        },
      });
    });

    await page.goto('/?_state=map-primary&_time=14:00');
    const sheet = page.getByTestId('mobile-bottom-sheet');
    await expect(sheet).toHaveAttribute('data-visible-rows', '0');
    await expect(sheet).toHaveAttribute('data-dragging', 'false');
    const handle = page.getByTestId('mobile-bottom-sheet-handle');
    await expect(handle).toHaveAttribute('aria-describedby', 'mobile-bottom-sheet-row-status');
    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();
    expect(handleBox!.height).toBeGreaterThanOrEqual(44);
    await expect(page.locator('[data-bottom-sheet-body="true"]')).toHaveAttribute('aria-hidden', 'true');

    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('a11y: coach-mark first step mobile (/?_state=coach-mark-first)', async ({ page }) => {
    await bypassOnboarding(page);
    await mockEmptyVenues(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?_state=coach-mark-first&_time=14:00');
    await page.getByTestId('coach-tour-dialog').waitFor({ state: 'visible' });
    await expect(page.getByTestId('coach-tour-dialog')).toHaveAttribute(
      'data-reduced-motion',
      'true',
    );
    await expect(page.getByTestId('coach-tour-step-pin-legend')).toBeVisible();
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('a11y: coach-mark middle step mobile (/?_state=coach-mark-middle)', async ({ page }) => {
    await bypassOnboarding(page);
    await mockEmptyVenues(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?_state=coach-mark-middle&_time=14:00');
    await page.getByTestId('coach-tour-dialog').waitFor({ state: 'visible' });
    await expect(page.getByTestId('coach-tour-dialog')).toHaveAttribute(
      'data-reduced-motion',
      'true',
    );
    await expect(page.getByTestId('coach-tour-step-time-slider')).toBeVisible();
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('a11y: map-primary mobile (/)', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="venue-pin"]').first().waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('a11y: mobile venue-detail sheet (/?venue=test-venue-sunny&_state=venue-detail)', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/?venue=test-venue-sunny&_state=venue-detail');
    await page.locator('[data-testid="mobile-venue-detail-sheet"]:visible').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('a11y: mobile feedback prompt (/?venue=test-venue-sunny&_state=feedback)', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/?venue=test-venue-sunny&_state=feedback');
    await page.locator('[data-testid="feedback-prompt"]:visible').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('a11y: mobile review form (/?venue=test-venue-sunny&_state=review)', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/?venue=test-venue-sunny&_state=review');
    await page.locator('[data-testid="review-form-mobile"]:visible').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('a11y: about page mobile (/about)', async ({ page }) => {
    await page.goto('/about');
    await page.getByTestId('about-page').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  // Story 10.2 (Task 5, AC4) — the obscured slate palette and its surrounding
  // mobile map/detail surfaces are exercised together at the mobile viewport.
  test('a11y: mobile obscured quick-info (/?_state=map-with-obscured-venue)', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/?_state=map-with-obscured-venue');
    await page.locator('[data-testid="venue-pin"]').first().waitFor({ state: 'visible' });
    await page.locator('[data-testid="quick-info-obscured"]:visible').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('a11y: mobile obscured venue-detail (/?_state=venue-detail-obscured)', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/?venue=test-venue-sunny&_state=venue-detail-obscured');
    await page.locator('[data-testid="mobile-venue-detail-sheet"]:visible').waitFor({ state: 'visible' });
    await page.locator('[data-testid="venue-detail-obscured"]:visible').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  // Story 12.12: photo states open the mobile detail sheet directly, so both
  // loaded and fallback media paths are active mobile accessibility gates.
  test('a11y: mobile venue photo loaded (/?_state=venue-photo-loaded)', async ({ page }) => {
    await bypassOnboarding(page);
    await arrangeVenuePhotoMedia(page, 'venue-photo-loaded');
    await page.goto('/?venue=test-venue-sunny&_state=venue-photo-loaded&_time=14:00');
    await page.locator('[data-testid="mobile-venue-detail-sheet"]:visible').waitFor({ state: 'visible' });
    await page.locator('[data-testid="venue-detail-hero-photo"]:visible').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('a11y: mobile venue photo fallback (/?_state=venue-photo-fallback)', async ({ page }) => {
    await bypassOnboarding(page);
    await arrangeVenuePhotoMedia(page, 'venue-photo-fallback');
    await page.goto('/?venue=test-venue-sunny&_state=venue-photo-fallback&_time=14:00');
    await page.locator('[data-testid="mobile-venue-detail-sheet"]:visible').waitFor({ state: 'visible' });
    await page.locator('[data-testid="venue-detail-hero-fallback"]:visible').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  // Story 7.3 Task 9.2 — the offline shell at mobile viewport.
  test('a11y: offline shell mobile (/?_state=map-primary-offline)', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/?_state=map-primary-offline');
    await page.getByTestId('offline-banner').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });
});
