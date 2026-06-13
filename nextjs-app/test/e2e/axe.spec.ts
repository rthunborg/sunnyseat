// Runs axe-core against every CURRENTLY-IMPLEMENTED route in the Screen
// ID → Route Map (project-context.md). Currently covers `/` (map-primary)
// and `/?_state=onboarding`; the rest of the map (venue-detail, premium-*,
// favourites, etc.) lands in Epics 2–6 and each owning story extends the
// list per the pattern in `docs/dev/ci-gates.md` §"Adding a new route to
// the axe gate". Story 1.6 review P27: comment was misleading — said
// "every route" but only 2 of 26+ Screen IDs are reachable today.
// Rationale for the impact filter is documented in `helpers/axe.ts`.

import { expect, test } from '@playwright/test';
import { runAxe, formatViolations } from './helpers/axe';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

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
});
