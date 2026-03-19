import type { Page, Locator } from '@playwright/test';

export class AdminDashboardPage {
  readonly heading: Locator;
  readonly navLinks: Locator;
  readonly venuesLink: Locator;
  readonly importLink: Locator;
  readonly accuracyLink: Locator;
  readonly verificationLink: Locator;
  readonly kpiLink: Locator;
  readonly dashboardLink: Locator;
  readonly statsCards: Locator;
  readonly quickLinks: Locator;
  readonly logoutButton: Locator;
  readonly adminNav: Locator;

  constructor(private page: Page) {
    this.heading = page.getByRole('heading', { name: 'Dashboard' });
    this.adminNav = page.locator('[data-testid="admin-nav"]');
    this.navLinks = page.locator('[data-testid="admin-nav"] a');
    this.venuesLink = page.getByRole('link', { name: 'Restauranger' });
    this.importLink = page.getByRole('link', { name: 'Import' });
    this.accuracyLink = page.getByRole('link', { name: 'Precision' });
    this.verificationLink = page.getByRole('link', { name: 'Verifiering' });
    this.kpiLink = page.getByRole('link', { name: 'KPI' });
    this.dashboardLink = page.getByRole('link', { name: 'Dashboard' });
    this.statsCards = page.locator('[data-testid="dashboard-stats"] > div');
    this.quickLinks = page.locator('[data-testid="quick-links"]');
    this.logoutButton = page.locator('[data-testid="logout-button"]');
  }

  async goto() {
    await this.page.goto('/admin');
  }

  async waitForReady() {
    await this.heading.waitFor({ timeout: 10000 });
  }
}
