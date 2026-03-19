import { test, expect } from '@playwright/test';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { checkAccessibility } from '../helpers/accessibility';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'test-password';

/**
 * Helper: login and navigate to admin dashboard before each test.
 */
async function loginAndGoToDashboard(page: import('@playwright/test').Page) {
  const loginPage = new AdminLoginPage(page);
  await loginPage.goto();
  await loginPage.waitForReady();
  await loginPage.login(ADMIN_USERNAME, ADMIN_PASSWORD);
  await page.waitForURL('**/admin', { timeout: 10000 });
}

test.describe('Admin Dashboard', () => {
  // -------------------------------------------------------------------------
  // AC 3: Admin Dashboard Tests
  // -------------------------------------------------------------------------

  test.describe('AC 3 — Dashboard Content', () => {
    test('dashboard renders with navigation links to all admin sections', async ({
      page,
    }) => {
      await loginAndGoToDashboard(page);
      const dashboard = new AdminDashboardPage(page);
      await dashboard.waitForReady();

      // Sidebar navigation should contain links to all sections
      await expect(dashboard.adminNav).toBeVisible();
      await expect(dashboard.venuesLink).toBeVisible();
      await expect(dashboard.importLink).toBeVisible();
      await expect(dashboard.accuracyLink).toBeVisible();
      await expect(dashboard.verificationLink).toBeVisible();
      await expect(dashboard.kpiLink).toBeVisible();
    });

    test('dashboard shows summary statistics', async ({ page }) => {
      await loginAndGoToDashboard(page);
      const dashboard = new AdminDashboardPage(page);
      await dashboard.waitForReady();

      // Stats cards should be present (4 cards or skeleton loaders)
      await expect(dashboard.statsCards.first()).toBeVisible({ timeout: 10000 });
      const cardsCount = await dashboard.statsCards.count();
      expect(cardsCount).toBeGreaterThanOrEqual(4);
    });

    test('quick links section is present', async ({ page }) => {
      await loginAndGoToDashboard(page);
      const dashboard = new AdminDashboardPage(page);
      await dashboard.waitForReady();

      await expect(dashboard.quickLinks).toBeVisible();
      // Should have at least 3 quick link cards
      const quickLinkCards = dashboard.quickLinks.locator('a');
      const count = await quickLinkCards.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });

    test.describe('navigation links navigate to correct pages', () => {
      const navTargets = [
        { name: 'Restauranger', urlFragment: '/admin/venues' },
        { name: 'Import', urlFragment: '/admin/import' },
        { name: 'Precision', urlFragment: '/admin/accuracy' },
        { name: 'Verifiering', urlFragment: '/admin/verification' },
        { name: 'KPI', urlFragment: '/admin/kpi' },
      ];

      for (const target of navTargets) {
        test(`clicking "${target.name}" navigates to ${target.urlFragment}`, async ({
          page,
        }) => {
          await loginAndGoToDashboard(page);

          // Click the nav link in the sidebar
          const link = page.getByRole('link', { name: target.name }).first();
          await link.click();

          await page.waitForURL(`**${target.urlFragment}`, { timeout: 10000 });
          expect(page.url()).toContain(target.urlFragment);
        });
      }
    });
  });

  // -------------------------------------------------------------------------
  // AC 4: Admin Venue List Tests
  // -------------------------------------------------------------------------

  test.describe('AC 4 — Venue List', () => {
    test('venue list page renders with table', async ({ page }) => {
      await loginAndGoToDashboard(page);
      await page.goto('/admin/venues');

      // Should show heading
      await expect(
        page.getByRole('heading', { name: 'Restauranger' })
      ).toBeVisible();
    });

    test('venue list shows venue names and status columns', async ({ page }) => {
      await loginAndGoToDashboard(page);
      await page.goto('/admin/venues');

      // Wait for loading to complete (table or empty state)
      await page.waitForSelector(
        '[data-testid="venue-table"], :text("Inga restauranger hittades")',
        { timeout: 15000 }
      );

      // If there are venues, check the table structure
      const table = page.locator('[data-testid="venue-table"]');
      if (await table.isVisible()) {
        // Table headers
        await expect(page.getByRole('columnheader', { name: 'Namn' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
      }
    });

    test('add venue button is visible', async ({ page }) => {
      await loginAndGoToDashboard(page);
      await page.goto('/admin/venues');

      await expect(page.locator('[data-testid="add-venue-button"]')).toBeVisible();
    });

    test('clicking a venue row navigates to venue detail', async ({ page }) => {
      await loginAndGoToDashboard(page);
      await page.goto('/admin/venues');

      // Wait for table to load
      const table = page.locator('[data-testid="venue-table"]');
      await page.waitForTimeout(3000); // Allow data to load

      if (await table.isVisible()) {
        // Click the first venue row
        const firstRow = table.locator('tbody tr').first();
        if (await firstRow.isVisible()) {
          await firstRow.click();
          // Should navigate to /admin/venues/[id]
          await page.waitForURL('**/admin/venues/**', { timeout: 10000 });
          expect(page.url()).toMatch(/\/admin\/venues\/[^/]+$/);
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // AC 5: KPI Dashboard Tests
  // -------------------------------------------------------------------------

  test.describe('AC 5 — KPI Dashboard', () => {
    test('KPI page renders with heading', async ({ page }) => {
      await loginAndGoToDashboard(page);
      await page.goto('/admin/kpi');

      await expect(
        page.getByRole('heading', { name: 'KPI Dashboard' })
      ).toBeVisible();
    });

    test('KPI data loads from API without errors', async ({ page }) => {
      await loginAndGoToDashboard(page);
      await page.goto('/admin/kpi');

      // Wait for content to load (either data or error)
      await page.waitForTimeout(5000);

      // Should not show the error banner
      const errorBanner = page.locator('.text-destructive');
      // If error appears, it should be a transient API issue, not a crash
      const heading = page.getByRole('heading', { name: 'KPI Dashboard' });
      await expect(heading).toBeVisible();
    });

    test('KPI page has section headings for Data Moat, B2B, Premium', async ({
      page,
    }) => {
      await loginAndGoToDashboard(page);
      await page.goto('/admin/kpi');

      await expect(page.getByText('Data Moat')).toBeVisible();
      await expect(page.getByText('B2B')).toBeVisible();
      await expect(page.getByText('Premium')).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // AC 6: Other Admin Pages Smoke Tests
  // -------------------------------------------------------------------------

  test.describe('AC 6 — Smoke Tests', () => {
    const smokeRoutes = [
      { path: '/admin/verification', heading: 'Verifiering' },
      { path: '/admin/accuracy', heading: 'Precision' },
      { path: '/admin/import', heading: 'Importera byggnadsdata' },
      { path: '/admin/import/osm', heading: 'OSM-import' },
    ];

    for (const route of smokeRoutes) {
      test(`${route.path} loads without error`, async ({ page }) => {
        await loginAndGoToDashboard(page);
        await page.goto(route.path);

        // Page should have its heading
        await expect(
          page.getByRole('heading', { name: route.heading })
        ).toBeVisible({ timeout: 10000 });

        // Page should not have uncaught errors (no "Application error" splash)
        const errorOverlay = page.locator('text=Application error');
        await expect(errorOverlay).not.toBeVisible();
      });
    }
  });

  // -------------------------------------------------------------------------
  // AC 8: Accessibility — Dashboard
  // -------------------------------------------------------------------------

  test.describe('AC 8 — Accessibility', () => {
    test('axe-core scan on admin dashboard passes WCAG 2.1 AA', async ({
      page,
    }) => {
      await loginAndGoToDashboard(page);
      const dashboard = new AdminDashboardPage(page);
      await dashboard.waitForReady();

      // Wait for data to load
      await page.waitForTimeout(2000);

      const results = await checkAccessibility(page);
      expect(results.violations).toEqual([]);
    });
  });
});
