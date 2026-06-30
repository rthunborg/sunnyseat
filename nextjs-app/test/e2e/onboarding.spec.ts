import { test, expect } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

const APP_SETTLE_TIMEOUT_MS = 15_000;

// e2e scope: routing, state-forcing, gate integration, dismissal.
//
// Locale: Swedish is the default for everyone. `localeDetection` is disabled
// in `i18n/routing`, so `/` always renders Swedish regardless of the browser's
// Accept-Language; English is only served from the explicit `/en` prefix (the
// manual language switcher navigates there).
test.describe('Onboarding overlay', () => {
  test('forces the onboarding state via _state=onboarding', async ({ page }) => {
    await page.goto('/?_state=onboarding');
    const screen = page.getByTestId('onboarding-screen');
    await expect(screen).toBeVisible({ timeout: 15_000 });
    await expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(screen.getByTestId('onboarding-cta-primary')).toBeVisible();
    await expect(screen.getByTestId('onboarding-cta-skip')).toBeVisible();
  });

  test('skip link dismisses the overlay and reveals the underlying map', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?_state=onboarding');
    await page.getByTestId('onboarding-cta-skip').click();
    // Story 1.6 review (P26): OnboardingGateInner returns `null` when
    // `shouldShow=false`, so the element is absent from the DOM rather
    // than just hidden. `toHaveCount(0)` is the semantically correct
    // assertion for "never rendered"; CI can delay post-click timers
    // under the full desktop+mobile matrix, so do not use a hard 2s cap.
    await expect(page.getByTestId('onboarding-screen')).toHaveCount(0, {
      timeout: 5_000,
    });
    await expect(page.getByTestId('map-container')).toBeVisible();
  });

  test('returning user sees the map immediately, no overlay', async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, '1');
    }, ONBOARDED_FLAG_KEY);
    await page.goto('/');
    await expect(page.locator('[data-testid="map-container"]:visible').first()).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    await expect(page.getByTestId('onboarding-screen')).toHaveCount(0);
  });
});

// ATDD RED-PHASE SCAFFOLD — Story 9.5 AC1/AC4 (clean-context reliability).
//
// STATUS: test.describe.skip — these assert the POST-implementation behaviour
// (synchronous first-render gate, no map-flash) and close the live smoke-test
// gap "onboarding did not gate a fresh automated session" (epics.md:2360) +
// test-design R-004 verification. Skipped so CI stays green; the dev un-skips
// while implementing Task 1, after which a CLEAN (empty-localStorage) context
// must reliably show the welcome overlay.
//
// Deterministic by construction: a fresh Playwright context starts with empty
// localStorage, so no wall-clock or timing dependency — the assertion is purely
// "first-time user sees the overlay, the map is NOT interactable underneath".
test.describe('Story 9.5 — clean-context onboarding reliability (RED)', () => {
  test('a first-time user (empty localStorage) reliably sees the welcome overlay', async ({
    page,
  }) => {
    // No addInitScript setting the onboarded flag — a genuinely fresh visitor.
    await page.goto('/');
    const screen = page.getByTestId('onboarding-screen');
    // The overlay must appear; today's placeholder-then-portal flash lets a
    // clean automated session slip straight to the map (the smoke-test gap).
    await expect(screen).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    await expect(screen.getByTestId('onboarding-cta-primary')).toBeVisible();
  });

  test('the map underneath is inert/hidden while the welcome overlay is up (no flash-through)', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('onboarding-screen')).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    // The gate's dual inert + aria-hidden blocking effect keeps the app shell
    // unreachable while the overlay covers it (Story 9.5 Task 1 preserves this).
    const appShell = page.locator('[data-app-shell]');
    await expect(appShell).toHaveAttribute('aria-hidden', 'true');
    await expect(appShell).toHaveAttribute('inert', /.*/);
  });

  test('the first-frame CTA is interactive immediately — an early click triggers the geolocation flow', async ({
    page,
  }) => {
    // Grant geolocation so the click resolves to a success path rather than a
    // permission prompt the headless browser cannot answer.
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 57.705, longitude: 11.93 });
    await page.goto('/');
    const cta = page.getByTestId('onboarding-cta-primary');
    await expect(cta).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    // The dead-click fix: clicking the CTA on first paint dismisses the overlay
    // (it resolves location and exits) rather than landing on a no-op placeholder.
    await cta.click();
    await expect(page.getByTestId('onboarding-screen')).toHaveCount(0, {
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    await expect(page.getByTestId('map-container')).toBeVisible();
  });
});

test.describe('Onboarding overlay (Swedish locale)', () => {
  // Swedish is now the default at `/` for every browser (localeDetection is
  // disabled), so this no longer depends on Accept-Language. The explicit
  // `locale: 'sv-SE'` is kept as a belt-and-braces guard.
  test.use({ locale: 'sv-SE' });

  test('renders the Swedish headline at the default root route', async ({
    page,
  }) => {
    await page.goto('/?_state=onboarding');
    const screen = page.getByTestId('onboarding-screen');
    await expect(screen).toBeVisible({ timeout: 15_000 });
    await expect(screen.getByRole('heading', { level: 1 })).toContainText(
      'Hitta uteplatser',
    );
  });
});
