import { test, expect } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

// e2e scope: routing, state-forcing, gate integration, dismissal.
//
// Locale: next-intl `localePrefix: 'as-needed'` honours `Accept-Language`
// at `/`. Playwright's default `en-US` steers root requests to `/en`
// (English). To assert Swedish copy in e2e, set `extraHTTPHeaders:
// { 'Accept-Language': 'sv-SE,sv;q=0.9' }` per-`test.use()` block — see
// `docs/dev/ci-gates.md` §"Adding locale-aware e2e tests".
test.describe('Onboarding overlay', () => {
  test('forces the onboarding state via _state=onboarding', async ({ page }) => {
    await page.goto('/?_state=onboarding');
    const screen = page.getByTestId('onboarding-screen');
    await expect(screen).toBeVisible({ timeout: 5_000 });
    await expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(screen.getByTestId('onboarding-cta-primary')).toBeVisible();
    await expect(screen.getByTestId('onboarding-cta-skip')).toBeVisible();
  });

  test('skip link dismisses the overlay and reveals the underlying map', async ({ page }) => {
    await page.goto('/?_state=onboarding');
    await page.getByTestId('onboarding-cta-skip').click();
    // Story 1.6 review (P26): OnboardingGateInner returns `null` when
    // `shouldShow=false`, so the element is absent from the DOM rather
    // than just hidden. `toHaveCount(0)` is the semantically correct
    // assertion for "never rendered".
    await expect(page.getByTestId('onboarding-screen')).toHaveCount(0, {
      timeout: 2_000,
    });
    await expect(page.getByTestId('map-container')).toBeVisible();
  });

  test('returning user sees the map immediately, no overlay', async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, '1');
    }, ONBOARDED_FLAG_KEY);
    await page.goto('/');
    await expect(page.getByTestId('map-container')).toBeVisible();
    await expect(page.getByTestId('onboarding-screen')).toHaveCount(0);
  });
});

test.describe('Onboarding overlay (Swedish locale)', () => {
  // Override the default Accept-Language so next-intl's `as-needed` mode
  // negotiates to Swedish at `/`. Story 1.6 Task 10 — confirms that the
  // negotiation works as designed; the original Story 1.5 deferred-work
  // hypothesis ("Accept-Language doesn't trigger sv") was wrong.
  // Playwright's `locale` option drives the browser's `Accept-Language`
  // from the chromium side, which is what next-intl's middleware reads.
  // `extraHTTPHeaders` does NOT override device-emulation language headers,
  // so always reach for `locale` here.
  test.use({ locale: 'sv-SE' });

  test('renders the Swedish headline when Accept-Language asks for sv', async ({
    page,
  }) => {
    await page.goto('/?_state=onboarding');
    const screen = page.getByTestId('onboarding-screen');
    await expect(screen).toBeVisible({ timeout: 5_000 });
    await expect(screen.getByRole('heading', { level: 1 })).toContainText(
      'Hitta uteplatser',
    );
  });
});
