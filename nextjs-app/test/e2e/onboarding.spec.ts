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
