import type { Page, Locator } from '@playwright/test';

export class AdminVenueNewPage {
  readonly nameField: Locator;
  readonly slugField: Locator;
  readonly typeField: Locator;
  readonly neighborhoodField: Locator;
  readonly addressField: Locator;
  readonly phoneField: Locator;
  readonly websiteField: Locator;
  readonly descriptionField: Locator;
  readonly latitudeField: Locator;
  readonly longitudeField: Locator;
  readonly geojsonField: Locator;
  readonly createButton: Locator;
  readonly heading: Locator;
  readonly errorMessage: Locator;
  readonly backLink: Locator;

  constructor(private page: Page) {
    this.nameField = page.locator('#new-venue-name');
    this.slugField = page.locator('#new-venue-slug');
    this.typeField = page.locator('#new-venue-type');
    this.neighborhoodField = page.locator('#new-venue-neighborhood');
    this.addressField = page.locator('#new-venue-address');
    this.phoneField = page.locator('#new-venue-phone');
    this.websiteField = page.locator('#new-venue-website');
    this.descriptionField = page.locator('#new-venue-description');
    this.latitudeField = page.locator('#new-venue-lat');
    this.longitudeField = page.locator('#new-venue-lng');
    this.geojsonField = page.locator('#new-venue-geojson');
    this.createButton = page.locator('[data-testid="create-venue-button"]');
    this.heading = page.getByRole('heading', { name: 'Lägg till restaurang' });
    this.errorMessage = page.locator('[data-testid="venue-error"]');
    this.backLink = page.getByRole('link', { name: /tillbaka/i });
  }

  async goto() {
    await this.page.goto('/admin/venues/new');
  }

  async waitForReady() {
    await this.heading.waitFor({ timeout: 10000 });
  }

  async fillVenueDetails(options: {
    name: string;
    slug?: string;
    type?: string;
    neighborhood?: string;
    address?: string;
    phone?: string;
    website?: string;
    description?: string;
    latitude?: string;
    longitude?: string;
    geojson?: string;
  }) {
    await this.nameField.fill(options.name);
    if (options.slug) await this.slugField.fill(options.slug);
    if (options.type) await this.typeField.selectOption(options.type);
    if (options.neighborhood) await this.neighborhoodField.fill(options.neighborhood);
    if (options.address) await this.addressField.fill(options.address);
    if (options.phone) await this.phoneField.fill(options.phone);
    if (options.website) await this.websiteField.fill(options.website);
    if (options.description) await this.descriptionField.fill(options.description);
    if (options.latitude) await this.latitudeField.fill(options.latitude);
    if (options.longitude) await this.longitudeField.fill(options.longitude);
    if (options.geojson) await this.geojsonField.fill(options.geojson);
  }

  async submit() {
    await this.createButton.click();
  }
}
