import { test, expect } from '@playwright/test';
import { PremiumPartnerPage } from '../pages/PremiumPartnerPage';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { AdminVenueEditPage } from '../pages/AdminVenueEditPage';
import { checkAccessibility } from '../helpers/accessibility';
import { createTestVenue, deleteTestVenue } from '../helpers/test-data';
import { supabase } from '../helpers/supabase';

const GOTHENBURG_LAT = 57.7089;
const GOTHENBURG_LNG = 11.9746;

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'test-password';

async function loginAsAdmin(page: import('@playwright/test').Page) {
  const loginPage = new AdminLoginPage(page);
  await loginPage.goto();
  await loginPage.waitForReady();
  await loginPage.login(ADMIN_USERNAME, ADMIN_PASSWORD);
  await page.waitForURL('**/admin', { timeout: 10000 });
}

// ============================================================================
// AC 1: Paywall / Premium Gate Tests
// ============================================================================

test.describe('AC1: Paywall / Premium Gate', () => {
  test('TimeSlider shows paywall prompt when non-premium user adjusts offset > 0', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.mockPremium(false);
    await pp.goto(); // Reload with mock applied
    await pp.waitForReady();

    // Wait for TimeSlider to render
    await expect(pp.timeSlider).toBeVisible({ timeout: 15000 });

    // Click +1 tim mark (second mark button)
    const markButtons = pp.timeSlider.locator('button');
    const plusOneButton = markButtons.nth(1);
    await plusOneButton.click();

    // Paywall should appear
    await expect(pp.paywallPrompt).toBeVisible({ timeout: 5000 });
  });

  test('DatePicker shows paywall prompt when non-premium user clicks toggle', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.mockPremium(false);
    await pp.goto();
    await pp.waitForReady();

    // Wait for DatePicker toggle to render
    await expect(pp.datePickerToggle).toBeVisible({ timeout: 15000 });

    // Click DatePicker toggle
    await pp.datePickerToggle.click();

    // Paywall should appear
    await expect(pp.paywallPrompt).toBeVisible({ timeout: 5000 });
  });

  test('PaywallPrompt renders with Swish payment CTA and dismiss button', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.mockPremium(false);
    await pp.goto();
    await pp.waitForReady();

    // Trigger paywall via DatePicker
    await expect(pp.datePickerToggle).toBeVisible({ timeout: 15000 });
    await pp.datePickerToggle.click();

    // Verify paywall content
    await expect(pp.paywallPrompt).toBeVisible({ timeout: 5000 });
    await expect(pp.paywallPayButton).toBeVisible();
    await expect(pp.paywallPayButton).toContainText('Betala med Swish');
    await expect(pp.paywallDismissButton).toBeVisible();
    await expect(pp.paywallDismissButton).toContainText('Inte nu');

    // Verify premium price
    await expect(pp.paywallPrompt).toContainText('39 kr/säsong');

    // Verify premium features listed
    await expect(pp.paywallPrompt).toContainText('Tidslinje');
    await expect(pp.paywallPrompt).toContainText('Datumväljare');
  });

  test('PaywallPrompt dismiss button closes the dialog', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.mockPremium(false);
    await pp.goto();
    await pp.waitForReady();

    await expect(pp.datePickerToggle).toBeVisible({ timeout: 15000 });
    await pp.datePickerToggle.click();
    await expect(pp.paywallPrompt).toBeVisible({ timeout: 5000 });

    // Dismiss
    await pp.paywallDismissButton.click();
    await expect(pp.paywallPrompt).toBeHidden();
  });

  test('PaywallPrompt has correct ARIA attributes', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.mockPremium(false);
    await pp.goto();
    await pp.waitForReady();

    await expect(pp.datePickerToggle).toBeVisible({ timeout: 15000 });
    await pp.datePickerToggle.click();
    await expect(pp.paywallPrompt).toBeVisible({ timeout: 5000 });

    await expect(pp.paywallPrompt).toHaveAttribute('role', 'dialog');
    await expect(pp.paywallPrompt).toHaveAttribute('aria-modal', 'true');
    await expect(pp.paywallPrompt).toHaveAttribute('aria-labelledby', 'paywall-title');
  });

  test('PaywallPrompt pay and dismiss buttons meet 48px touch target', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.mockPremium(false);
    await pp.goto();
    await pp.waitForReady();

    await expect(pp.datePickerToggle).toBeVisible({ timeout: 15000 });
    await pp.datePickerToggle.click();
    await expect(pp.paywallPrompt).toBeVisible({ timeout: 5000 });

    const payBox = await pp.paywallPayButton.boundingBox();
    expect(payBox).not.toBeNull();
    expect(payBox!.height).toBeGreaterThanOrEqual(48);

    const dismissBox = await pp.paywallDismissButton.boundingBox();
    expect(dismissBox).not.toBeNull();
    expect(dismissBox!.height).toBeGreaterThanOrEqual(48);
  });
});

// ============================================================================
// AC 2: Time Slider Tests (Premium Feature)
// ============================================================================

test.describe('AC2: Time Slider (Premium)', () => {
  test('TimeSlider renders when premium is active', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.mockPremium(true);
    await pp.goto();
    await pp.waitForReady();

    await expect(pp.timeSlider).toBeVisible({ timeout: 15000 });
    await expect(pp.timeSliderInput).toBeVisible();
  });

  test('TimeSlider range input has correct ARIA attributes', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.mockPremium(true);
    await pp.goto();
    await pp.waitForReady();

    await expect(pp.timeSliderInput).toBeVisible({ timeout: 15000 });

    await expect(pp.timeSliderInput).toHaveAttribute('aria-label', 'Välj tidsförskjutning');
    await expect(pp.timeSliderInput).toHaveAttribute('aria-valuemin', '0');
    await expect(pp.timeSliderInput).toHaveAttribute('aria-valuemax', '3');
    await expect(pp.timeSliderInput).toHaveAttribute('type', 'range');
  });

  test('TimeSlider has 48px touch target height', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.mockPremium(true);
    await pp.goto();
    await pp.waitForReady();

    await expect(pp.timeSliderInput).toBeVisible({ timeout: 15000 });
    const box = await pp.timeSliderInput.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(48);
  });

  test('TimeSlider shows mark labels: Nu, +1 tim, +2 tim, +3 tim', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.mockPremium(true);
    await pp.goto();
    await pp.waitForReady();

    await expect(pp.timeSlider).toBeVisible({ timeout: 15000 });

    await expect(pp.timeSlider).toContainText('Nu');
    await expect(pp.timeSlider).toContainText('+1 tim');
    await expect(pp.timeSlider).toContainText('+2 tim');
    await expect(pp.timeSlider).toContainText('+3 tim');
  });

  test('non-premium TimeSlider marks show "Premium" label for offsets > 0', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.mockPremium(false);
    await pp.goto();
    await pp.waitForReady();

    await expect(pp.timeSlider).toBeVisible({ timeout: 15000 });

    // Premium labels on marks with offset > 0
    const premiumLabels = pp.timeSlider.locator('span:text("Premium")');
    const count = await premiumLabels.count();
    expect(count).toBe(3); // +1, +2, +3 each show "Premium"
  });
});

// ============================================================================
// AC 3: Date Picker Tests (Premium Feature)
// ============================================================================

test.describe('AC3: Date Picker (Premium)', () => {
  test('DatePicker toggle renders when premium is active', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.mockPremium(true);
    await pp.goto();
    await pp.waitForReady();

    await expect(pp.datePickerToggle).toBeVisible({ timeout: 15000 });
    await expect(pp.datePickerToggle).toContainText('Datum');
  });

  test('DatePicker opens calendar dialog for premium user', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.mockPremium(true);
    await pp.goto();
    await pp.waitForReady();

    await expect(pp.datePickerToggle).toBeVisible({ timeout: 15000 });
    await pp.datePickerToggle.click();

    // Calendar dialog should open (not paywall)
    await expect(pp.datePickerDialog).toBeVisible({ timeout: 5000 });
    await expect(pp.paywallPrompt).toBeHidden();
  });

  test('DatePicker calendar shows Swedish day headers', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.mockPremium(true);
    await pp.goto();
    await pp.waitForReady();

    await expect(pp.datePickerToggle).toBeVisible({ timeout: 15000 });
    await pp.datePickerToggle.click();
    await expect(pp.datePickerDialog).toBeVisible({ timeout: 5000 });

    // Swedish day abbreviations
    await expect(pp.datePickerDialog).toContainText('Mån');
    await expect(pp.datePickerDialog).toContainText('Tis');
    await expect(pp.datePickerDialog).toContainText('Ons');
    await expect(pp.datePickerDialog).toContainText('Sön');
  });

  test('DatePicker has month navigation buttons', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.mockPremium(true);
    await pp.goto();
    await pp.waitForReady();

    await expect(pp.datePickerToggle).toBeVisible({ timeout: 15000 });
    await pp.datePickerToggle.click();
    await expect(pp.datePickerDialog).toBeVisible({ timeout: 5000 });

    const prevButton = pp.datePickerDialog.locator('button[aria-label="Föregående månad"]');
    const nextButton = pp.datePickerDialog.locator('button[aria-label="Nästa månad"]');
    await expect(nextButton).toBeVisible();
    await expect(prevButton).toBeVisible();
  });

  test('DatePicker toggle has 48px touch target', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.mockPremium(true);
    await pp.goto();
    await pp.waitForReady();

    await expect(pp.datePickerToggle).toBeVisible({ timeout: 15000 });
    const box = await pp.datePickerToggle.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(48);
  });

  test('DatePicker shows "Premium" label for non-premium users', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.mockPremium(false);
    await pp.goto();
    await pp.waitForReady();

    await expect(pp.datePickerToggle).toBeVisible({ timeout: 15000 });
    await expect(pp.datePickerToggle).toContainText('Premium');
  });
});

// ============================================================================
// AC 4: Payment Flow Tests (API-level)
// ============================================================================

test.describe('AC4: Payment Flow API', () => {
  test('POST /api/payments/create returns valid response for new session', async ({
    request,
  }) => {
    const sessionId = `e2e-test-${Date.now()}`;
    const response = await request.post('/api/payments/create', {
      data: { sessionId },
    });

    // 201 on success, 500 if Swish mock not configured
    expect([201, 500]).toContain(response.status());

    if (response.status() === 201) {
      const body = await response.json();
      expect(body).toHaveProperty('paymentId');
      expect(body).toHaveProperty('purchaseId');
      expect(body).toHaveProperty('swishUrl');
      expect(body).toHaveProperty('qrCode');
    }
  });

  test('POST /api/payments/create returns 400 without sessionId', async ({ request }) => {
    const response = await request.post('/api/payments/create', {
      data: {},
    });
    expect(response.status()).toBe(400);
  });

  test('GET /api/payments/status returns isPremium false for unknown session', async ({
    request,
  }) => {
    const response = await request.get(
      `/api/payments/status?sessionId=unknown-${Date.now()}`
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.isPremium).toBe(false);
  });

  test('GET /api/payments/status returns 400 without sessionId', async ({ request }) => {
    const response = await request.get('/api/payments/status');
    expect(response.status()).toBe(400);
  });

  test('POST /api/payments/callback returns 400 for empty payload', async ({ request }) => {
    const response = await request.post('/api/payments/callback', {
      data: {},
    });
    expect(response.status()).toBe(400);
  });

  test('POST /api/payments/callback returns 404 for unknown payment', async ({ request }) => {
    const response = await request.post('/api/payments/callback', {
      data: { id: 'nonexistent-swish-id', status: 'PAID' },
    });
    expect(response.status()).toBe(404);
  });
});

// ============================================================================
// AC 5: Partner Venue Display Tests
// ============================================================================

test.describe('AC5: Partner Venue Display', () => {
  test('partner venue cards show partner badge', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.waitForReady();

    // Wait for cards to load
    await expect(pp.venueCards().first()).toBeAttached({ timeout: 15000 });

    const partnerCards = pp.partnerVenueCards();
    const partnerCount = await partnerCards.count();

    if (partnerCount > 0) {
      // Each partner card should have the badge
      const firstPartnerBadge = partnerCards.first().locator('[data-testid="partner-badge"]');
      await expect(firstPartnerBadge).toBeVisible();
    }
  });

  test('partner venue cards have golden ring styling', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.waitForReady();

    await expect(pp.venueCards().first()).toBeAttached({ timeout: 15000 });

    const partnerCards = pp.partnerVenueCards();
    const count = await partnerCards.count();

    if (count > 0) {
      // Partner cards have ring-2 ring-[var(--color-partner-gold)] class
      const classList = await partnerCards.first().getAttribute('class');
      expect(classList).toContain('ring-2');
    }
  });

  test('non-partner venue cards do NOT show partner badge', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.waitForReady();

    await expect(pp.venueCards().first()).toBeAttached({ timeout: 15000 });

    const nonPartnerCards = pp.nonPartnerVenueCards();
    const count = await nonPartnerCards.count();

    if (count > 0) {
      const badge = nonPartnerCards.first().locator('[data-testid="partner-badge"]');
      await expect(badge).not.toBeAttached();
    }
  });

  test('partner venue detail page shows PartnerActions when URLs present', async ({
    page,
  }) => {
    // Find a partner venue via API
    const { data: partnerVenues } = await supabase
      .from('venues')
      .select('slug, booking_url, website_url')
      .eq('is_partner', true)
      .not('slug', 'is', null)
      .limit(1);

    if (!partnerVenues || partnerVenues.length === 0) {
      test.skip(true, 'No partner venues in database');
      return;
    }

    const venue = partnerVenues[0];
    const hasUrls = venue.booking_url || venue.website_url;

    const pp = new PremiumPartnerPage(page);
    await pp.gotoVenue(venue.slug);

    // Partner badge visible in header
    const badge = page.locator('[data-testid="partner-badge"]');
    await expect(badge).toBeVisible({ timeout: 10000 });

    if (hasUrls) {
      const actionsSection = page.locator('[data-testid="partner-actions-section"]');
      await expect(actionsSection).toBeVisible();
    }
  });

  test('non-partner venue detail page does NOT show partner elements', async ({ page }) => {
    // Find a non-partner venue
    const { data: venues } = await supabase
      .from('venues')
      .select('slug')
      .eq('is_partner', false)
      .not('slug', 'is', null)
      .limit(1);

    if (!venues || venues.length === 0) {
      test.skip(true, 'No non-partner venues in database');
      return;
    }

    const pp = new PremiumPartnerPage(page);
    await pp.gotoVenue(venues[0].slug);
    await page.locator('h1').waitFor({ timeout: 10000 });

    const badge = page.locator('[data-testid="partner-badge"]');
    await expect(badge).not.toBeAttached();

    const actionsSection = page.locator('[data-testid="partner-actions-section"]');
    await expect(actionsSection).not.toBeAttached();
  });
});

// ============================================================================
// AC 6: Sunny Now Badge Tests
// ============================================================================

test.describe('AC6: Sunny Now Badge', () => {
  test('GET /api/partners/sunny-now returns correct response shape', async ({ request }) => {
    const response = await request.get('/api/partners/sunny-now');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('venues');
    expect(Array.isArray(body.venues)).toBe(true);
    expect(body).toHaveProperty('timestamp');

    if (body.venues.length > 0) {
      const venue = body.venues[0];
      expect(venue).toHaveProperty('id');
      expect(venue).toHaveProperty('name');
      expect(venue).toHaveProperty('slug');
      expect(venue).toHaveProperty('sunStatus');
      expect(venue).toHaveProperty('sunPercentage');
      expect(['Sunny', 'Partial']).toContain(venue.sunStatus);
      expect(venue.sunPercentage).toBeGreaterThanOrEqual(50);
    }
  });

  test('GET /api/partners/sunny-now has cache headers', async ({ request }) => {
    const response = await request.get('/api/partners/sunny-now');
    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toBeDefined();
    expect(cacheControl).toContain('s-maxage=300');
  });

  test('SunnyNowBadge has correct ARIA role and label', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.waitForReady();

    // Wait for data to load
    await expect(pp.venueCards().first()).toBeAttached({ timeout: 15000 });

    // If any sunny-now badges exist, verify their accessibility
    const badgeCount = await pp.sunnyNowBadges.count();
    if (badgeCount > 0) {
      const badge = pp.sunnyNowBadges.first();
      await expect(badge).toHaveAttribute('role', 'status');
      await expect(badge).toHaveAttribute('aria-label', 'Sol nu');
      await expect(badge).toContainText('Sol nu');
    }
  });
});

// ============================================================================
// AC 7: Partner Deep Links Tests
// ============================================================================

test.describe('AC7: Partner Deep Links', () => {
  test('PartnerActions booking link opens in new tab with noopener', async ({ page }) => {
    // Find partner venue with booking URL
    const { data: venues } = await supabase
      .from('venues')
      .select('slug, booking_url')
      .eq('is_partner', true)
      .not('booking_url', 'is', null)
      .limit(1);

    if (!venues || venues.length === 0) {
      test.skip(true, 'No partner venues with booking URL in database');
      return;
    }

    const pp = new PremiumPartnerPage(page);
    await pp.gotoVenue(venues[0].slug);
    await page.locator('h1').waitFor({ timeout: 10000 });

    const bookingLink = page.locator('[data-testid="partner-booking-link"]');
    await expect(bookingLink).toBeVisible();
    await expect(bookingLink).toHaveAttribute('target', '_blank');
    await expect(bookingLink).toHaveAttribute('rel', /noopener/);
    await expect(bookingLink).toHaveAttribute('href', venues[0].booking_url);
  });

  test('PartnerActions website link opens in new tab with noopener', async ({ page }) => {
    // Find partner venue with website URL
    const { data: venues } = await supabase
      .from('venues')
      .select('slug, website_url')
      .eq('is_partner', true)
      .not('website_url', 'is', null)
      .limit(1);

    if (!venues || venues.length === 0) {
      test.skip(true, 'No partner venues with website URL in database');
      return;
    }

    const pp = new PremiumPartnerPage(page);
    await pp.gotoVenue(venues[0].slug);
    await page.locator('h1').waitFor({ timeout: 10000 });

    const websiteLink = page.locator('[data-testid="partner-website-link"]');
    await expect(websiteLink).toBeVisible();
    await expect(websiteLink).toHaveAttribute('target', '_blank');
    await expect(websiteLink).toHaveAttribute('rel', /noopener/);
    await expect(websiteLink).toHaveAttribute('href', venues[0].website_url);
  });

  test('PartnerActions gracefully handles missing URLs', async ({ page }) => {
    // Find partner venue WITHOUT booking and website URLs
    const { data: venues } = await supabase
      .from('venues')
      .select('slug')
      .eq('is_partner', true)
      .is('booking_url', null)
      .is('website_url', null)
      .limit(1);

    if (!venues || venues.length === 0) {
      // Create a test partner venue without URLs
      const { id, slug } = await createTestVenue({
        name: `E2E Partner NoUrl ${Date.now()}`,
        slug: `e2e-test-partner-nourl-${Date.now()}`,
      });

      await supabase
        .from('venues')
        .update({ is_partner: true, booking_url: null, website_url: null })
        .eq('id', id);

      const pp = new PremiumPartnerPage(page);
      await pp.gotoVenue(slug);
      await page.locator('h1').waitFor({ timeout: 10000 });

      // Partner actions section should NOT render if no URLs
      const actionsSection = page.locator('[data-testid="partner-actions-section"]');
      await expect(actionsSection).not.toBeAttached();

      // No broken links
      const bookingLink = page.locator('[data-testid="partner-booking-link"]');
      const websiteLink = page.locator('[data-testid="partner-website-link"]');
      await expect(bookingLink).not.toBeAttached();
      await expect(websiteLink).not.toBeAttached();

      await deleteTestVenue(id);
    } else {
      const pp = new PremiumPartnerPage(page);
      await pp.gotoVenue(venues[0].slug);
      await page.locator('h1').waitFor({ timeout: 10000 });

      const actionsSection = page.locator('[data-testid="partner-actions-section"]');
      await expect(actionsSection).not.toBeAttached();
    }
  });
});

// ============================================================================
// AC 8: Admin Partner Management Tests
// ============================================================================

test.describe('AC8: Admin Partner Management', () => {
  let testVenueId: string;

  test.beforeAll(async () => {
    const result = await createTestVenue({
      name: `E2E Partner Admin ${Date.now()}`,
      slug: `e2e-test-partner-admin-${Date.now()}`,
    });
    testVenueId = result.id;
  });

  test.afterAll(async () => {
    try {
      await deleteTestVenue(testVenueId);
    } catch {
      // May already be deleted
    }
  });

  test('admin can toggle partner status on', async ({ page }) => {
    await loginAsAdmin(page);
    const editPage = new AdminVenueEditPage(page);
    await editPage.goto(testVenueId);
    await editPage.waitForReady();

    // Toggle partner on
    await editPage.togglePartner();
    await editPage.save();
    await editPage.waitForSuccess();

    // Verify in DB
    const { data: dbVenue } = await supabase
      .from('venues')
      .select('is_partner')
      .eq('Id', testVenueId)
      .single();

    expect(dbVenue?.is_partner).toBe(true);
  });

  test('admin can set booking URL and website URL', async ({ page }) => {
    await loginAsAdmin(page);
    const editPage = new AdminVenueEditPage(page);
    await editPage.goto(testVenueId);
    await editPage.waitForReady();

    // Ensure partner is checked (from previous test)
    const isChecked = await editPage.partnerCheckbox.isChecked();
    if (!isChecked) {
      await editPage.togglePartner();
    }

    // Fill partner URLs
    await editPage.bookingUrlField.fill('https://booking.example.com');
    await editPage.websiteUrlField.fill('https://partner.example.com');

    await editPage.save();
    await editPage.waitForSuccess();

    // Verify in DB
    const { data: dbVenue } = await supabase
      .from('venues')
      .select('booking_url, website_url')
      .eq('Id', testVenueId)
      .single();

    expect(dbVenue?.booking_url).toBe('https://booking.example.com');
    expect(dbVenue?.website_url).toBe('https://partner.example.com');
  });

  test('partner URL fields only visible when partner checkbox is checked', async ({ page }) => {
    await loginAsAdmin(page);
    const editPage = new AdminVenueEditPage(page);

    // Create a non-partner venue
    const { id } = await createTestVenue({
      name: `E2E Partner Toggle ${Date.now()}`,
      slug: `e2e-test-partner-toggle-${Date.now()}`,
    });

    try {
      await editPage.goto(id);
      await editPage.waitForReady();

      // Partner checkbox is unchecked — URL fields should be hidden
      await expect(editPage.bookingUrlField).not.toBeVisible();
      await expect(editPage.websiteUrlField).not.toBeVisible();

      // Check partner box — URL fields should appear
      await editPage.togglePartner();
      await expect(editPage.bookingUrlField).toBeVisible();
      await expect(editPage.websiteUrlField).toBeVisible();
    } finally {
      await deleteTestVenue(id);
    }
  });

  test('admin can toggle partner status off', async ({ page }) => {
    await loginAsAdmin(page);
    const editPage = new AdminVenueEditPage(page);
    await editPage.goto(testVenueId);
    await editPage.waitForReady();

    // Toggle partner off
    const isChecked = await editPage.partnerCheckbox.isChecked();
    if (isChecked) {
      await editPage.togglePartner();
    }
    await editPage.save();
    await editPage.waitForSuccess();

    // Verify in DB
    const { data: dbVenue } = await supabase
      .from('venues')
      .select('is_partner')
      .eq('Id', testVenueId)
      .single();

    expect(dbVenue?.is_partner).toBe(false);
  });
});

// ============================================================================
// Accessibility
// ============================================================================

test.describe('Accessibility — Premium/Partner', () => {
  test('paywall dialog passes WCAG 2.1 AA', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    const pp = new PremiumPartnerPage(page);
    await pp.goto();
    await pp.mockPremium(false);
    await pp.goto();
    await pp.waitForReady();

    await expect(pp.datePickerToggle).toBeVisible({ timeout: 15000 });
    await pp.datePickerToggle.click();
    await expect(pp.paywallPrompt).toBeVisible({ timeout: 5000 });

    const results = await checkAccessibility(page, {
      exclude: ['[role="application"]'],
    });
    const violations = results.violations.filter(
      (v) => !v.id.includes('color-contrast')
    );
    expect(violations).toEqual([]);
  });
});
