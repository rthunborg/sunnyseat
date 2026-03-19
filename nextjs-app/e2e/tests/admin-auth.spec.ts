import { test, expect } from '@playwright/test';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { checkAccessibility } from '../helpers/accessibility';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'test-password';

test.describe('Admin Authentication', () => {
  // -------------------------------------------------------------------------
  // AC 1: Login Flow Tests
  // -------------------------------------------------------------------------

  test.describe('AC 1 — Login Flow', () => {
    test('login page renders with username and password fields', async ({ page }) => {
      const loginPage = new AdminLoginPage(page);
      await loginPage.goto();
      await loginPage.waitForReady();

      await expect(loginPage.heading).toBeVisible();
      await expect(loginPage.usernameField).toBeVisible();
      await expect(loginPage.passwordField).toBeVisible();
      await expect(loginPage.loginButton).toBeVisible();
      await expect(loginPage.form).toBeVisible();

      // Verify field labels
      await expect(page.getByText('Användarnamn')).toBeVisible();
      await expect(page.getByText('Lösenord')).toBeVisible();
    });

    test('valid credentials redirect to /admin dashboard', async ({ page }) => {
      const loginPage = new AdminLoginPage(page);
      await loginPage.goto();
      await loginPage.waitForReady();

      await loginPage.login(ADMIN_USERNAME, ADMIN_PASSWORD);

      // Should redirect to /admin
      await page.waitForURL('**/admin', { timeout: 10000 });
      const dashboard = new AdminDashboardPage(page);
      await expect(dashboard.heading).toBeVisible();
    });

    test('invalid credentials show error message (not a crash)', async ({ page }) => {
      const loginPage = new AdminLoginPage(page);
      await loginPage.goto();
      await loginPage.waitForReady();

      await loginPage.login('wrong-user', 'wrong-password');

      // Error message should be visible, page should not crash
      await expect(loginPage.errorDisplay).toBeVisible({ timeout: 5000 });
      // Should still be on the login page
      expect(page.url()).toContain('/admin/login');
      // Login form should still be functional
      await expect(loginPage.loginButton).toBeVisible();
    });

    test('empty fields show validation error', async ({ page }) => {
      const loginPage = new AdminLoginPage(page);
      await loginPage.goto();
      await loginPage.waitForReady();

      // Click login without filling fields — HTML5 required attribute should prevent submit
      await loginPage.loginButton.click();

      // Should still be on login page (HTML5 validation blocks submission)
      expect(page.url()).toContain('/admin/login');

      // Try with just username
      await loginPage.usernameField.fill('admin');
      await loginPage.loginButton.click();
      expect(page.url()).toContain('/admin/login');
    });

    test('after login, JWT token stored in localStorage', async ({ page }) => {
      const loginPage = new AdminLoginPage(page);
      await loginPage.goto();
      await loginPage.waitForReady();

      await loginPage.login(ADMIN_USERNAME, ADMIN_PASSWORD);
      await page.waitForURL('**/admin', { timeout: 10000 });

      // Verify token is stored in localStorage
      const token = await page.evaluate(() =>
        localStorage.getItem('sunnyseat-admin-token')
      );
      expect(token).not.toBeNull();
      expect(token!.length).toBeGreaterThan(0);

      // Verify refresh token is stored
      const refreshToken = await page.evaluate(() =>
        localStorage.getItem('sunnyseat-admin-refresh-token')
      );
      expect(refreshToken).not.toBeNull();

      // Verify user info is stored
      const userInfo = await page.evaluate(() =>
        localStorage.getItem('sunnyseat-admin-user')
      );
      expect(userInfo).not.toBeNull();
      const user = JSON.parse(userInfo!);
      expect(user).toHaveProperty('username');
      expect(user).toHaveProperty('role');
    });
  });

  // -------------------------------------------------------------------------
  // AC 2: Protected Route Tests
  // -------------------------------------------------------------------------

  test.describe('AC 2 — Protected Routes', () => {
    const protectedRoutes = [
      { path: '/admin', name: 'Dashboard' },
      { path: '/admin/venues', name: 'Venues' },
      { path: '/admin/kpi', name: 'KPI' },
      { path: '/admin/verification', name: 'Verification' },
    ];

    for (const route of protectedRoutes) {
      test(`unauthenticated access to ${route.path} redirects to /admin/login`, async ({
        page,
      }) => {
        // Clear any stored auth state
        await page.goto('/admin/login');
        await page.evaluate(() => {
          localStorage.removeItem('sunnyseat-admin-token');
          localStorage.removeItem('sunnyseat-admin-refresh-token');
          localStorage.removeItem('sunnyseat-admin-user');
        });

        await page.goto(route.path);

        // Should redirect to login
        await page.waitForURL('**/admin/login', { timeout: 10000 });
        const loginPage = new AdminLoginPage(page);
        await expect(loginPage.heading).toBeVisible();
      });
    }

    test('after login, all admin routes are accessible', async ({ page }) => {
      // Login first
      const loginPage = new AdminLoginPage(page);
      await loginPage.goto();
      await loginPage.waitForReady();
      await loginPage.login(ADMIN_USERNAME, ADMIN_PASSWORD);
      await page.waitForURL('**/admin', { timeout: 10000 });

      // Check each admin route is accessible (no redirect to login)
      for (const route of protectedRoutes) {
        await page.goto(route.path);
        // Should NOT redirect to login
        await page.waitForTimeout(1000);
        expect(page.url()).not.toContain('/admin/login');
      }
    });
  });

  // -------------------------------------------------------------------------
  // AC 7: Logout Flow
  // -------------------------------------------------------------------------

  test.describe('AC 7 — Logout Flow', () => {
    test('logout clears auth state', async ({ page }) => {
      // Login first
      const loginPage = new AdminLoginPage(page);
      await loginPage.goto();
      await loginPage.waitForReady();
      await loginPage.login(ADMIN_USERNAME, ADMIN_PASSWORD);
      await page.waitForURL('**/admin', { timeout: 10000 });

      // Verify logged in
      const tokenBefore = await page.evaluate(() =>
        localStorage.getItem('sunnyseat-admin-token')
      );
      expect(tokenBefore).not.toBeNull();

      // Click logout
      const dashboard = new AdminDashboardPage(page);
      await dashboard.logoutButton.click();

      // Should redirect to login
      await page.waitForURL('**/admin/login', { timeout: 10000 });

      // Auth state should be cleared
      const tokenAfter = await page.evaluate(() =>
        localStorage.getItem('sunnyseat-admin-token')
      );
      expect(tokenAfter).toBeNull();

      const refreshAfter = await page.evaluate(() =>
        localStorage.getItem('sunnyseat-admin-refresh-token')
      );
      expect(refreshAfter).toBeNull();

      const userAfter = await page.evaluate(() =>
        localStorage.getItem('sunnyseat-admin-user')
      );
      expect(userAfter).toBeNull();
    });

    test('after logout, admin routes redirect to login', async ({ page }) => {
      // Login first
      const loginPage = new AdminLoginPage(page);
      await loginPage.goto();
      await loginPage.waitForReady();
      await loginPage.login(ADMIN_USERNAME, ADMIN_PASSWORD);
      await page.waitForURL('**/admin', { timeout: 10000 });

      // Logout
      const dashboard = new AdminDashboardPage(page);
      await dashboard.logoutButton.click();
      await page.waitForURL('**/admin/login', { timeout: 10000 });

      // Try accessing protected route
      await page.goto('/admin');
      await page.waitForURL('**/admin/login', { timeout: 10000 });
      await expect(loginPage.heading).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // AC 8: Accessibility — Login Page
  // -------------------------------------------------------------------------

  test.describe('AC 8 — Accessibility', () => {
    test('axe-core scan on admin login page passes WCAG 2.1 AA', async ({ page }) => {
      const loginPage = new AdminLoginPage(page);
      await loginPage.goto();
      await loginPage.waitForReady();

      const results = await checkAccessibility(page);
      expect(results.violations).toEqual([]);
    });
  });
});
