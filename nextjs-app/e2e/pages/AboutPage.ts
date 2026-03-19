import type { Page, Locator } from '@playwright/test';

export class AboutPage {
  readonly title: Locator;
  readonly metNoAttribution: Locator;
  readonly lantmaterietAttribution: Locator;
  readonly osmAttribution: Locator;
  readonly disclaimer: Locator;
  readonly backLink: Locator;

  constructor(private page: Page) {
    this.title = page.getByRole('heading', { name: 'Om SunnySeat' });
    this.metNoAttribution = page.getByText('Met.no');
    this.lantmaterietAttribution = page.getByText('Lantmäteriet');
    this.osmAttribution = page.getByText('OpenStreetMap');
    this.disclaimer = page.getByText('Ansvarsfriskrivning');
    this.backLink = page.getByText('Tillbaka');
  }

  async goto() {
    await this.page.goto('/about');
  }

  async waitForReady() {
    await this.title.waitFor({ timeout: 5000 });
  }
}
