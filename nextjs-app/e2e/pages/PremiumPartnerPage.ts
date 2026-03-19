import type { Page, Locator } from '@playwright/test';

/**
 * Page Object for premium and partner feature interactions on the home page.
 */
export class PremiumPartnerPage {
  // Time Slider
  readonly timeSlider: Locator;
  readonly timeSliderInput: Locator;

  // Date Picker
  readonly datePickerToggle: Locator;
  readonly datePickerDialog: Locator;

  // Paywall
  readonly paywallPrompt: Locator;
  readonly paywallPayButton: Locator;
  readonly paywallDismissButton: Locator;

  // Partner elements (on venue cards)
  readonly partnerBadges: Locator;
  readonly partnerActions: Locator;
  readonly partnerBookingLink: Locator;
  readonly partnerWebsiteLink: Locator;

  // Sunny Now Badge
  readonly sunnyNowBadges: Locator;

  constructor(private page: Page) {
    this.timeSlider = page.locator('[data-testid="time-slider"]');
    this.timeSliderInput = page.locator('[data-testid="time-slider-input"]');
    this.datePickerToggle = page.locator('[data-testid="date-picker-toggle"]');
    this.datePickerDialog = page.locator('[data-testid="date-picker-dialog"]');
    this.paywallPrompt = page.locator('[data-testid="paywall-prompt"]');
    this.paywallPayButton = page.locator('[data-testid="paywall-pay-button"]');
    this.paywallDismissButton = page.locator('[data-testid="paywall-dismiss-button"]');
    this.partnerBadges = page.locator('[data-testid="partner-badge"]');
    this.partnerActions = page.locator('[data-testid="partner-actions"]');
    this.partnerBookingLink = page.locator('[data-testid="partner-booking-link"]');
    this.partnerWebsiteLink = page.locator('[data-testid="partner-website-link"]');
    this.sunnyNowBadges = page.locator('[data-testid="sunny-now-badge"]');
  }

  async goto() {
    await this.page.goto('/');
  }

  async gotoVenue(slug: string) {
    await this.page.goto(`/v/${slug}`);
  }

  async waitForReady() {
    await this.page.locator('[role="application"]').waitFor({ timeout: 15000 });
  }

  /** Set premium status in localStorage (mock for E2E) */
  async mockPremium(isPremium: boolean) {
    if (isPremium) {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      await this.page.evaluate((expiry) => {
        const sessionId = crypto.randomUUID();
        localStorage.setItem('sunnyseat_session_id', sessionId);
        localStorage.setItem(
          'sunnyseat_premium',
          JSON.stringify({
            sessionId,
            isPremium: true,
            expiresAt: expiry,
          })
        );
      }, futureDate);
    } else {
      await this.page.evaluate(() => {
        localStorage.removeItem('sunnyseat_premium');
        const sessionId = crypto.randomUUID();
        localStorage.setItem('sunnyseat_session_id', sessionId);
      });
    }
  }

  venueCards(): Locator {
    return this.page.locator('[data-testid^="venue-card-"]');
  }

  partnerVenueCards(): Locator {
    return this.page.locator('[data-testid^="venue-card-"]:has([data-testid="partner-badge"])');
  }

  nonPartnerVenueCards(): Locator {
    return this.page.locator('[data-testid^="venue-card-"]:not(:has([data-testid="partner-badge"]))');
  }
}
