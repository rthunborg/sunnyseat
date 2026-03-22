import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

const GOTHENBURG_LAT = 57.7089;
const GOTHENBURG_LNG = 11.9746;

/**
 * SkyConditionBadge E2E Tests
 *
 * Verifies that the weather qualifier (Clear / Partly cloudy / Overcast / Rain)
 * renders correctly on VenueCards. This is a core UX element that separates
 * sun certainty from weather uncertainty.
 *
 * Note: SkyConditionBadge renders as <span role="img"> while MiniTimeline
 * renders as <div role="img">, so we use span[role="img"] for specificity.
 */

test.describe('SkyConditionBadge on VenueCards', () => {
  test.beforeEach(async ({ page: _page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });
  });

  test('each VenueCard renders a SkyConditionBadge with role="img"', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const firstCard = home.venueCards().first();
    await expect(firstCard).toBeAttached({ timeout: 15000 });

    // SkyConditionBadge renders as <span role="img"> (not <div> like MiniTimeline)
    const badge = firstCard.locator('span[role="img"]');
    await expect(badge).toBeAttached();
  });

  test('SkyConditionBadge has aria-label describing weather condition', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const firstCard = home.venueCards().first();
    await expect(firstCard).toBeAttached({ timeout: 15000 });

    const badge = firstCard.locator('span[role="img"]');
    await expect(badge).toBeAttached();

    const ariaLabel = await badge.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    // aria-label contains "Weather conditions:" (EN) or "Väderförhållanden:" (SV)
    expect(ariaLabel!.length).toBeGreaterThan(5);
  });

  test('SkyConditionBadge contains an SVG icon', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const firstCard = home.venueCards().first();
    await expect(firstCard).toBeAttached({ timeout: 15000 });

    const badge = firstCard.locator('span[role="img"]');
    await expect(badge).toBeAttached();

    // Each condition renders an SVG (SunIcon, SunCloudIcon, CloudIcon, or RainIcon)
    const svg = badge.locator('svg');
    await expect(svg).toBeAttached();
  });

  test('all VenueCards have SkyConditionBadge — none missing', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const cards = home.venueCards();
    await expect(cards.first()).toBeAttached({ timeout: 15000 });

    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Every card should have exactly one SkyConditionBadge (span[role="img"])
    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      const badge = card.locator('span[role="img"]');
      await expect(badge).toBeAttached();
    }
  });

  test('VenueCard aria-label includes sky condition text', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const firstCard = home.venueCards().first();
    await expect(firstCard).toBeAttached({ timeout: 15000 });

    // VenueCard constructs its aria-label as:
    //   "{name}, {statusLabel}, {distanceLabel}, {detailText}, {skyLabel}"
    // The sky label is the last segment — matches EN or SV sky condition terms
    const cardAriaLabel = await firstCard.getAttribute('aria-label');
    expect(cardAriaLabel).toBeTruthy();

    // Should contain one of the sky condition labels (EN or SV)
    const hasSkyCond = /Clear|Partly cloudy|Overcast|Rain|Unavailable|Klart|Halvklart|Mulet|Regn|Ej tillgängligt/.test(cardAriaLabel!);
    expect(hasSkyCond).toBe(true);
  });

  test('SkyConditionBadge SVG icons have aria-hidden="true"', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const firstCard = home.venueCards().first();
    await expect(firstCard).toBeAttached({ timeout: 15000 });

    const badge = firstCard.locator('span[role="img"]');
    await expect(badge).toBeAttached();

    // The SVG icons inside the badge should be aria-hidden (the badge span provides the label)
    const svg = badge.locator('svg');
    await expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  test('SkyConditionBadge text label is visible (not icon-only on cards)', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForReady();

    const firstCard = home.venueCards().first();
    await expect(firstCard).toBeAttached({ timeout: 15000 });

    const badge = firstCard.locator('span[role="img"]');
    await expect(badge).toBeAttached();

    // The badge should have visible text content (not just an icon)
    const textContent = await badge.textContent();
    expect(textContent).toBeTruthy();
    expect(textContent!.trim().length).toBeGreaterThan(0);
  });
});

test.describe('SkyConditionBadge on Venue Detail Page', () => {
  test('venue detail page loads without crashing', async ({ page }) => {
    await page.goto('/v/test-venue');
    await page.waitForLoadState('domcontentloaded');

    // The page should render with heading
    const heading = page.locator('h1');
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});
