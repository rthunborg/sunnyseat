import type { Page, Locator } from '@playwright/test';

export class AdminLoginPage {
  readonly usernameField: Locator;
  readonly passwordField: Locator;
  readonly loginButton: Locator;
  readonly errorDisplay: Locator;
  readonly heading: Locator;
  readonly form: Locator;

  constructor(private page: Page) {
    this.usernameField = page.locator('#username');
    this.passwordField = page.locator('#password');
    this.loginButton = page.getByRole('button', { name: 'Logga in' });
    this.errorDisplay = page.locator('[data-testid="login-error"]');
    this.heading = page.getByRole('heading', { name: 'SunnySeat Admin' });
    this.form = page.locator('[data-testid="login-form"]');
  }

  async goto() {
    await this.page.goto('/admin/login');
  }

  async waitForReady() {
    await this.heading.waitFor({ timeout: 10000 });
  }

  async login(username: string, password: string) {
    await this.usernameField.fill(username);
    await this.passwordField.fill(password);
    await this.loginButton.click();
  }
}
