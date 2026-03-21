import type { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly mapContainer: Locator;
  readonly cardTray: Locator;
  readonly locationPrompt: Locator;
  readonly locationFallback: Locator;
  readonly searchBar: Locator;
  readonly searchInput: Locator;
  readonly venueCount: Locator;
  readonly emptyState: Locator;
  readonly skipLink: Locator;

  constructor(private page: Page) {
    this.mapContainer = page.locator('[role="application"]');
    this.cardTray = page.locator('[aria-label="Venue card tray"], [aria-label="Venue list"]');
    this.locationPrompt = page.getByText('Tillåt plats');
    this.locationFallback = page.getByText('Eller välj på kartan');
    this.searchBar = page.locator('[data-testid="search-bar"]');
    this.searchInput = page.locator('[data-testid="search-bar"] input[type="search"]');
    this.venueCount = page.locator('[data-testid="venue-count"]');
    this.emptyState = page.locator('[data-testid="empty-state"]');
    this.skipLink = page.locator('a[href="#main-content"]');
  }

  async goto() {
    await this.page.goto('/');
  }

  async waitForReady() {
    await this.mapContainer.waitFor({ timeout: 15000 });
  }

  venueCard(slug: string): Locator {
    return this.page.locator(`[data-testid="venue-card-${slug}"]`);
  }

  venueCards(): Locator {
    return this.page.locator('[data-testid^="venue-card-"]');
  }

  miniTimelines(): Locator {
    return this.page.locator('[data-testid="mini-timeline"]');
  }

  locationPromptDialog(): Locator {
    return this.page.locator('[data-testid="location-prompt"]');
  }
}
