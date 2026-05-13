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
});
