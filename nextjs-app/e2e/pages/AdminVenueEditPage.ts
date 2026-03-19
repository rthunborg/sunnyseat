import type { Page, Locator } from '@playwright/test';

export class AdminVenueEditPage {
  // Form fields
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
  readonly partnerCheckbox: Locator;
  readonly bookingUrlField: Locator;
  readonly websiteUrlField: Locator;

  // Buttons
  readonly saveButton: Locator;
  readonly deleteButton: Locator;
  readonly confirmDeleteButton: Locator;
  readonly drawPolygonButton: Locator;
  readonly editPolygonButton: Locator;
  readonly removePolygonButton: Locator;
  readonly pasteGeoJsonButton: Locator;

  // Status indicators
  readonly heading: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly polygonEditor: Locator;
  readonly polygonVertexCount: Locator;
  readonly backLink: Locator;

  constructor(private page: Page) {
    this.nameField = page.locator('#venue-name');
    this.slugField = page.locator('#venue-slug');
    this.typeField = page.locator('#venue-type');
    this.neighborhoodField = page.locator('#venue-neighborhood');
    this.addressField = page.locator('#venue-address');
    this.phoneField = page.locator('#venue-phone');
    this.websiteField = page.locator('#venue-website');
    this.descriptionField = page.locator('#venue-description');
    this.latitudeField = page.locator('#venue-lat');
    this.longitudeField = page.locator('#venue-lng');
    this.partnerCheckbox = page.locator('[data-testid="partner-checkbox"]');
    this.bookingUrlField = page.locator('#venue-booking-url');
    this.websiteUrlField = page.locator('#venue-website-url');

    this.saveButton = page.locator('[data-testid="save-venue-button"]');
    this.deleteButton = page.locator('[data-testid="delete-venue-button"]');
    this.confirmDeleteButton = page.locator('[data-testid="confirm-delete-button"]');
    this.drawPolygonButton = page.getByRole('button', { name: /rita polygon/i });
    this.editPolygonButton = page.getByRole('button', { name: /redigera polygon/i });
    this.removePolygonButton = page.getByRole('button', { name: /ta bort polygon/i });
    this.pasteGeoJsonButton = page.getByRole('button', { name: /klistra in geojson/i });

    this.heading = page.locator('h1');
    this.successMessage = page.locator('[data-testid="venue-success"]');
    this.errorMessage = page.locator('[data-testid="venue-error"]');
    this.polygonEditor = page.locator('[role="application"]');
    this.polygonVertexCount = page.locator('text=/\\d+ hörn i polygonen/');
    this.backLink = page.getByRole('link', { name: /tillbaka/i });
  }

  async goto(id: string) {
    await this.page.goto(`/admin/venues/${id}`);
  }

  async waitForReady() {
    await this.heading.waitFor({ timeout: 10000 });
  }

  async fillName(value: string) {
    await this.nameField.fill(value);
  }

  async fillAddress(value: string) {
    await this.addressField.fill(value);
  }

  async fillCoordinates(lat: string, lng: string) {
    await this.latitudeField.fill(lat);
    await this.longitudeField.fill(lng);
  }

  async selectType(type: string) {
    await this.typeField.selectOption(type);
  }

  async togglePartner() {
    await this.partnerCheckbox.click();
  }

  async save() {
    await this.saveButton.click();
  }

  async deleteVenue() {
    await this.deleteButton.click();
    await this.confirmDeleteButton.waitFor({ timeout: 5000 });
    await this.confirmDeleteButton.click();
  }

  async waitForSuccess() {
    await this.successMessage.waitFor({ timeout: 10000 });
  }
}
