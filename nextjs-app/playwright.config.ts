import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    // Story 1.6 review (P28): Swedish is the default product copy
    // (CLAUDE.md "Swedish copy is default"); axe-core and every other
    // gate must exercise the same render path real Gothenburg users see.
    // Individual `test.use({ locale: 'en-US' })` blocks may opt back to
    // English when validating dev-fallback surfaces.
    locale: 'sv-SE',
  },
  // Story 1.6 Round 2 (R2-P6): per-project testIgnore / testMatch so the
  // CI workflow's E2E and A11y steps are wired by `--project=<name>`
  // instead of `--grep-invert "a11y:"` (a naming-convention coupling
  // with no schema or PR-template enforcement; R-007). The mobile and
  // desktop projects exclude the axe specs; the a11y projects run ONLY
  // the axe specs. Adding any future test to an axe spec is now self-
  // routing — it cannot accidentally double-execute in the E2E step.
  //
  // Story 7.3 Task 8.5: `a11y-mobile` runs axe-mobile.spec.ts at an
  // iPhone-14 viewport so the mobile-sheet variants (mobile venue-detail
  // sheet, mobile review form, mobile feedback prompt) and the offline shell
  // are inside the automated gate — the desktop-only `a11y` project cannot
  // reach those `lg`-breakpoint-hidden surfaces.
  projects: [
    {
      name: 'mobile',
      testIgnore: ['**/axe.spec.ts', '**/axe-mobile.spec.ts'],
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'desktop',
      testIgnore: ['**/axe.spec.ts', '**/axe-mobile.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'a11y',
      testMatch: '**/axe.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'a11y-mobile',
      testMatch: '**/axe-mobile.spec.ts',
      use: { ...devices['iPhone 14'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
