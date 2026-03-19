import type { Page, Locator } from '@playwright/test';

export class VenueDetailPage {
  readonly heading: Locator;
  readonly neighborhoodText: Locator;
  readonly sunWindowsTable: Locator;
  readonly miniTimeline: Locator;
  readonly backButton: Locator;
  readonly directionsLink: Locator;
  readonly shareButton: Locator;
  readonly todayHeader: Locator;
  readonly tomorrowHeader: Locator;
  readonly sunWindowRows: Locator;
  readonly noSunMessage: Locator;

  constructor(private page: Page) {
    this.heading = page.locator('h1');
    this.neighborhoodText = page.locator('[data-testid="venue-neighborhood"]');
    this.sunWindowsTable = page.locator('[role="table"]');
    this.miniTimeline = page.locator('[data-testid="mini-timeline"]');
    this.backButton = page.locator('[data-testid="back-button"]');
    this.directionsLink = page.locator('[data-testid="directions-link"]');
    this.shareButton = page.locator('[data-testid="share-button"]');
    this.todayHeader = page.getByText('Idag');
    this.tomorrowHeader = page.getByText('Imorgon');
    this.sunWindowRows = page.locator('[role="row"][aria-label]');
    this.noSunMessage = page.getByText('Ingen direkt sol förväntad');
  }

  async goto(slug: string) {
    await this.page.goto(`/v/${slug}`);
  }

  async waitForReady() {
    await this.heading.waitFor({ timeout: 10000 });
  }

  async getMetaContent(name: string): Promise<string | null> {
    return this.page.locator(`meta[name="${name}"]`).getAttribute('content');
  }

  async getOgContent(property: string): Promise<string | null> {
    return this.page.locator(`meta[property="${property}"]`).getAttribute('content');
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  getActiveRow(): Locator {
    return this.page.locator('[aria-current="true"]');
  }

  getForecastText(): Locator {
    return this.page.getByText(/Prognos:/);
  }

  getReasonBadge(reason: 'Skugga' | 'Mulet'): Locator {
    return this.page.getByText(reason);
  }
}
