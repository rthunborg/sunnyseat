// Runs axe-core against every CURRENTLY-IMPLEMENTED route in the Screen
// ID → Route Map (project-context.md). Currently covers `/` (map-primary)
// and `/?_state=onboarding`; the rest of the map (venue-detail, premium-*,
// favourites, etc.) lands in Epics 2–6 and each owning story extends the
// list per the pattern in `docs/dev/ci-gates.md` §"Adding a new route to
// the axe gate". Story 1.6 review P27: comment was misleading — said
// "every route" but only 2 of 26+ Screen IDs are reachable today.
// Rationale for the impact filter is documented in `helpers/axe.ts`.

import { expect, test, type Page } from '@playwright/test';
import { runAxe, formatViolations } from './helpers/axe';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import { arrangeVenuePhotoMedia } from './helpers/venue-photo-media';

async function bypassOnboarding(page: Page) {
  await page.addInitScript((key: string) => {
    window.localStorage.clear();
    window.localStorage.setItem(key, '1');
  }, ONBOARDED_FLAG_KEY);
}

test.describe('axe-core a11y gate', () => {
  test('a11y: map-primary (/)', async ({ page }) => {
    // Bypass onboarding so axe sees the underlying map shell, not the
    // overlay (the overlay is exercised by the dedicated sweep below).
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, '1');
    }, ONBOARDED_FLAG_KEY);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="venue-pin"]').first().waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('a11y: map selected venue QuickInfo', async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, '1');
    }, ONBOARDED_FLAG_KEY);

    await page.goto('/?venue=test-venue-sunny&_state=map-with-selected-venue');
    await page.locator('[data-testid="venue-pin"]').first().waitFor({ state: 'visible' });
    await page.locator('[data-testid="venue-quick-info"]:visible').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  // Story 10.2 (Task 5, AC4) — the muted "Sol bakom moln" obscured surface.
  // The forced-state normalizer pins the selected venue to CloudObscured +
  // overcast sky WITHOUT live Met.no, so the muted slate palette's WCAG AA
  // contrast is a CI gate rather than a manual claim. Desktop viewport covers
  // the obscured quick-info + the obscured venue-detail overlay.
  test('a11y: map obscured venue QuickInfo (/?_state=map-with-obscured-venue)', async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, '1');
    }, ONBOARDED_FLAG_KEY);

    await page.goto('/?_state=map-with-obscured-venue');
    await page.locator('[data-testid="venue-pin"]').first().waitFor({ state: 'visible' });
    await page.locator('[data-testid="venue-quick-info"]:visible').waitFor({ state: 'visible' });
    await page.locator('[data-testid="quick-info-obscured"]:visible').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('a11y: obscured venue detail (/?_state=venue-detail-obscured)', async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, '1');
    }, ONBOARDED_FLAG_KEY);

    await page.goto('/?venue=test-venue-sunny&_state=venue-detail-obscured');
    await page.locator('[data-testid="desktop-venue-detail-panel"]:visible').waitFor({ state: 'visible' });
    await page.locator('[data-testid="venue-detail-obscured"]:visible').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('a11y: venue photo loaded card, desktop QuickInfo, and detail', async ({ page }) => {
    await bypassOnboarding(page);
    await arrangeVenuePhotoMedia(page, 'venue-photo-loaded');

    await page.goto('/?_state=venue-photo-loaded&_time=16:30');
    const targetCard = page.locator('[data-testid="venue-card"]:visible', {
      hasText: /Kaf[eé] Magasinet/i,
    }).first();
    await targetCard.waitFor({ state: 'visible' });
    await expect(targetCard.getByTestId('venue-card-photo')).toHaveAttribute(
      'src',
      /^data:image\/webp;base64,/,
    );
    await targetCard.click();
    const quickInfo = page.locator('[data-testid="venue-quick-info"]:visible').first();
    await quickInfo.waitFor({ state: 'visible' });
    await expect(quickInfo.getByTestId('venue-quick-info-photo')).toHaveAttribute(
      'src',
      /^data:image\/webp;base64,/,
    );
    let violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);

    await page.goto('/?venue=test-venue-sunny&_state=venue-photo-loaded&_time=16:30');
    const detailPanel = page.getByTestId('desktop-venue-detail-panel');
    await detailPanel.waitFor({ state: 'visible' });
    await expect(detailPanel.getByTestId('venue-detail-hero-photo')).toHaveAttribute(
      'src',
      /^data:image\/webp;base64,/,
    );
    violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('a11y: venue photo fallback card, desktop QuickInfo, and detail', async ({ page }) => {
    await bypassOnboarding(page);
    await arrangeVenuePhotoMedia(page, 'venue-photo-fallback');

    await page.goto('/?_state=venue-photo-fallback&_time=16:30');
    const targetCard = page.locator('[data-testid="venue-card"]:visible', {
      hasText: /Kaf[eé] Magasinet/i,
    }).first();
    await targetCard.waitFor({ state: 'visible' });
    await expect(targetCard.getByTestId('venue-card-photo-fallback')).toHaveCount(1);
    await targetCard.click();
    const quickInfo = page.locator('[data-testid="venue-quick-info"]:visible').first();
    await quickInfo.waitFor({ state: 'visible' });
    await expect(quickInfo.getByTestId('venue-quick-info-photo-fallback')).toHaveCount(1);
    let violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);

    await page.goto('/?venue=test-venue-sunny&_state=venue-photo-fallback&_time=16:30');
    const detailPanel = page.getByTestId('desktop-venue-detail-panel');
    await detailPanel.waitFor({ state: 'visible' });
    await detailPanel.getByTestId('venue-detail-hero-fallback').waitFor({ state: 'visible' });
    violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('a11y: onboarding overlay (/?_state=onboarding)', async ({ page }) => {
    await page.goto('/?_state=onboarding');
    await page.getByTestId('onboarding-screen').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  // Story 3.4 Task 5.4 — Epic 3 visit-loop surfaces: venue detail, route
  // overlay, feedback prompt, and review form (forced states per the Screen
  // ID → Route Map in project-context.md).

  test('a11y: venue detail (/?venue=test-venue-sunny&_state=venue-detail)', async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, '1');
    }, ONBOARDED_FLAG_KEY);

    await page.goto('/?venue=test-venue-sunny&_state=venue-detail');
    await page.locator('[data-testid="desktop-venue-detail-panel"]:visible').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('a11y: route overlay after Visa Rutt', async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, '1');
    }, ONBOARDED_FLAG_KEY);
    // Stub the native-map handoff so the runner never leaves the app and
    // the overlay's blocked-handoff fallback state stays on screen.
    await page.addInitScript(() => {
      window.open = () => null;
    });

    await page.goto('/?venue=test-venue-sunny&_state=map-with-selected-venue');
    await page.locator('[data-testid="venue-quick-info"]:visible').waitFor({ state: 'visible' });
    await page
      .locator('[data-testid="venue-quick-info"]:visible')
      .getByRole('button', { name: /Visa Rutt/ })
      .click();
    await page.locator('[data-testid="route-overlay"]:visible').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('a11y: feedback prompt (/?venue=test-venue-sunny&_state=feedback)', async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, '1');
    }, ONBOARDED_FLAG_KEY);

    await page.goto('/?venue=test-venue-sunny&_state=feedback');
    await page.locator('[data-testid="feedback-prompt"]:visible').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('a11y: review form (/?venue=test-venue-sunny&_state=review)', async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, '1');
    }, ONBOARDED_FLAG_KEY);

    await page.goto('/?venue=test-venue-sunny&_state=review');
    await page.locator('[data-testid="review-form-desktop"]:visible').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  // Story 12.8 resolves the About footer contrast debt and makes the
  // standalone route executable in the a11y gate. Privacy still carries the
  // same pre-existing footer debt and remains explicitly tracked as fixme.
  test('a11y: about page (/about)', async ({ page }) => {
    await page.goto('/about');
    await page.getByTestId('about-page').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  // FAST-FOLLOW (maintainer decision, 2026-06-29 — Epic 7 close-out): privacy
  // currently fails color contrast on its footer wordmark (`text-text-muted`).
  // Leave this unrelated debt alone for Story 12.8.
  test.fixme('a11y: privacy page (/sekretess)', async ({ page }) => {
    await page.goto('/sekretess');
    await page.getByTestId('privacy-page').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  // Story 7.2 — the global 404 page. `/__sunnyseat-invalid` is a deliberately
  // invalid path (Screen ID → Route Map) so Next.js renders `app/not-found.tsx`.
  test('a11y: not-found page (/__sunnyseat-invalid)', async ({ page }) => {
    await page.goto('/__sunnyseat-invalid');
    await page.getByTestId('not-found-page').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  // Story 3.4 review R1-P7 — the localized venue-detail not-found/error
  // notice is its own interactive surface and must pass the gate too.
  test('a11y: venue detail not-found notice (/?venue=<invalid slug>)', async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, '1');
    }, ONBOARDED_FLAG_KEY);

    await page.goto('/?venue=this-venue-does-not-exist');
    await page.getByTestId('venue-detail-error').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  // Story 7.3 Task 9.2 — the offline shell. `/?_state=map-primary-offline`
  // forces the cached app shell + "Ingen anslutning" banner with no venue
  // data, regardless of real network state. The mobile-viewport variant is
  // covered by the `a11y-mobile` project (axe-mobile.spec.ts / Task 8.5).
  test('a11y: offline shell (/?_state=map-primary-offline)', async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, '1');
    }, ONBOARDED_FLAG_KEY);

    await page.goto('/?_state=map-primary-offline');
    await page.getByTestId('offline-banner').waitFor({ state: 'visible' });
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });
});
