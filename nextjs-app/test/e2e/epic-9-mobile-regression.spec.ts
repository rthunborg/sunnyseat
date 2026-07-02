import { test, expect, type Locator, type Page } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

const GBG_LAT = 57.705;
const GBG_LNG = 11.93;

/**
 * Story 9.10 — Consolidated Epic 9 mobile regression net (AC1 mobile pass + AC2
 * mobile e2e dimension).
 *
 * Runs at the `iPhone 14` viewport (Playwright `mobile` project) and asserts the
 * load-bearing Epic 9 fixes hold on the form factor most users are on, so a
 * future edit that regresses one trips the gate:
 *
 *   - 9.5  onboarding gate shows for a CLEAN (empty-localStorage) mobile session
 *   - 9.5  the amber location dot renders on a mocked geolocation SUCCESS
 *   - 9.8  the mobile share button is present + enabled in the venue header
 *   - 9.6  the mobile chrome exposes a SINGLE control set with no dead control
 *          (top-bar locate + settings work; settings opens the modal; no
 *          floating locate/settings duplicates over the map)
 *   - 9.9  the reworked mobile quick-info card sits CLEAR of the planner panel
 *          (a LIVE-layout clearance assertion, folding in the 9.9 review defer
 *          that previously rested on a fixed-estimate arithmetic-only unit test)
 *
 * Sun/time assertions are pinned with `?_time=13:00`: the `?_time=` forcing is
 * dev-mode only and stays honoured under `next dev` (CI e2e runs vs `npm run
 * dev`, NODE_ENV=development — retro-notes 9-0), so this is deterministic in CI
 * without depending on the runner's wall clock.
 *
 * Every test is mobile-only; the shared `beforeEach` skips it in other projects.
 */

const APP_SETTLE_TIMEOUT_MS = 15_000;

async function bypassOnboarding(page: Page): Promise<void> {
  await page.addInitScript((key: string) => {
    window.localStorage.setItem(key, '1');
  }, ONBOARDED_FLAG_KEY);
}

function visibleTestId(page: Page, testId: string): Locator {
  return page.locator(`[data-testid="${testId}"]:visible`).first();
}

test.describe('Epic 9 mobile regression', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'Epic 9 mobile regression net runs only in the mobile Playwright project',
    );
    // Deterministic midday planner time so sun-dependent state (sunny pins,
    // quick-info sun window) does not hinge on the CI runner's wall clock.
    const nativeGoto = page.goto.bind(page);
    page.goto = ((url: string, options?: Parameters<typeof nativeGoto>[1]) => {
      const target = new URL(url, 'http://localhost:3000');
      if (!target.searchParams.has('_time')) target.searchParams.set('_time', '13:00');
      return nativeGoto(target.pathname + target.search + target.hash, options);
    }) as typeof page.goto;
  });

  // ── 9.5 onboarding gate (clean context) ──────────────────────────────────
  test('9.5: a clean (empty-localStorage) mobile session shows the welcome overlay, gating the map', async ({
    page,
  }) => {
    // No onboarded flag seeded — a genuinely fresh mobile visitor.
    await page.goto('/');
    const screen = page.getByTestId('onboarding-screen');
    await expect(screen).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    await expect(screen.getByTestId('onboarding-cta-primary')).toBeVisible();
    // The app shell underneath is inert/hidden while the overlay is up (no
    // flash-through) — the placeholder-then-portal flash the 9.5 fix closed.
    const appShell = page.locator('[data-app-shell]');
    await expect(appShell).toHaveAttribute('aria-hidden', 'true');
    await expect(appShell).toHaveAttribute('inert', /.*/);
  });

  // ── 9.5 location dot on geolocation success ──────────────────────────────
  test('9.5: the amber location dot renders on a geolocation success', async ({
    page,
  }) => {
    // Reliable success path: a RETURNING user (onboarded flag set) with granted
    // geolocation silently re-acquires on load (`useGeolocation` auto-acquire),
    // resolving `getCurrentPosition` to `status === 'success'`. This exercises
    // the same success → dot render seam as the onboarding CTA, but WITHOUT the
    // flaky CTA-click geolocation resolution that mobile-emulated Chromium does
    // not deliver reliably (see the deferred mobile-only gap in Completion
    // Notes — a pre-existing onboarding.spec.ts:88 mobile flake, not 9.10).
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: GBG_LAT, longitude: GBG_LNG });
    await bypassOnboarding(page);
    await page.goto('/');

    // On a real GPS fix (`status === 'success'`) the UserLocationLayer mounts a
    // single amber marker (`user-location-pin`). It is NOT drawn on the
    // Gothenburg fallback / idle / pending, so its presence proves the success
    // path fired and the dot renders on mobile.
    await expect(page.getByTestId('user-location-pin')).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    await expect(page.getByTestId('user-location-pin')).toHaveCount(1);
  });

  // ── 9.8 mobile share button ──────────────────────────────────────────────
  test('9.8: the mobile venue header exposes an enabled share button', async ({
    page,
  }) => {
    await bypassOnboarding(page);
    await page.goto('/?venue=test-venue-sunny&_state=venue-detail');

    const sheet = page.getByTestId('mobile-venue-detail-sheet');
    await expect(sheet).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });

    // The share affordance is present AND enabled on mobile (Story 9.6 left a
    // disabled stub; 9.8 wired it). "Dela plats" is the Swedish share label.
    const share = sheet.getByRole('button', { name: 'Dela plats' });
    await expect(share).toBeVisible();
    await expect(share).toBeEnabled();
  });

  // ── 9.6 single mobile control set, no dead control ───────────────────────
  test('9.6: the mobile chrome is a single control set with no dead control (settings opens the modal)', async ({
    page,
  }) => {
    await bypassOnboarding(page);
    await page.goto('/');
    await expect(visibleTestId(page, 'map-container')).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });

    // The surviving top-bar locate + settings are present and enabled.
    const locate = visibleTestId(page, 'search-shell-my-location');
    await expect(locate).toBeVisible();
    await expect(locate).toBeEnabled();
    const settings = visibleTestId(page, 'search-shell-settings');
    await expect(settings).toBeVisible();
    await expect(settings).toBeEnabled();

    // The floating map-stack duplicates are gone; zoom stays.
    await expect(page.locator('[data-testid="map-control-my-location"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="map-control-settings"]')).toHaveCount(0);
    await expect(visibleTestId(page, 'map-control-zoom-in')).toBeVisible();

    // The settings gear is WIRED, not a dead stub: tapping opens the modal.
    await settings.click();
    await expect(page.getByTestId('settings-modal')).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
  });

  // ── 9.9 quick-info card clears the planner panel (live layout) ───────────
  test('9.9: the reworked mobile quick-info card sits clear of the planner panel (live-layout clearance)', async ({
    page,
  }) => {
    await bypassOnboarding(page);
    // Forced selected-venue state deterministically opens the mobile quick-info
    // card without needing to hit a specific pin.
    await page.goto('/?venue=test-venue-sunny&_state=map-with-selected-venue');
    await page.waitForSelector('[data-testid="venue-pin"]', {
      timeout: APP_SETTLE_TIMEOUT_MS,
    });

    const quickInfo = page.getByTestId('venue-quick-info').first();
    await expect(quickInfo).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    const planner = page.locator('[data-testid="time-slider-panel"]:visible').first();
    await expect(planner).toBeVisible();

    const cardBox = await quickInfo.boundingBox();
    const plannerBox = await planner.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(plannerBox).not.toBeNull();
    if (cardBox && plannerBox) {
      // Story 9.9 AC3: the card's rendered TOP edge must sit BELOW the planner
      // panel's bottom edge — the sun-% badge (top-left of the card) is not
      // jammed under the slider. This is the LIVE-DOM clearance assertion the
      // 9.9 review deferred (the unit test only proved the fixed-estimate
      // arithmetic, not that it clears the rendered panel).
      expect(cardBox.y).toBeGreaterThanOrEqual(plannerBox.y + plannerBox.height);
    }
  });
});
