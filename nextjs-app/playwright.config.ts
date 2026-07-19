import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const webServerPort = Number(process.env.PLAYWRIGHT_PORT ?? (new URL(baseURL).port || 3000));
const webServerCommand =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ??
  (webServerPort === 3000 ? 'npm run dev' : `npm run dev -- --port ${webServerPort}`);

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30_000,
  // CI runs E2E against the dev server (`npm run dev`); the first hit on a
  // route triggers on-demand Turbopack compilation that can eat into a test's
  // 30s budget and flake an animation-"stable" wait (observed on
  // feedback.spec.ts under CI load — the button resolved visible+enabled but
  // never settled in time). Retry twice in CI, where the warmed second attempt
  // is fast; keep 0 locally so flakes surface immediately during development.
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
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
  // Story 11.2 (AC1) real-touch profile: the thumb-grab drag can only be proven
  // by a REAL touch gesture (test-design R-004 — emulated mouse-drag can pass
  // while a finger fails). The gesture drives raw CDP `Input.dispatchTouchEvent`,
  // which is Chromium-only, so it runs under a dedicated `touch` project on a
  // Chromium mobile device (`Pixel 5`, `hasTouch`) rather than the WebKit-backed
  // `mobile`/iPhone-14 project (CDP is unavailable there). The four existing
  // projects exclude the touch-drag spec so it does not double-run/false-fail.
  projects: [
    {
      name: 'mobile',
      testIgnore: [
        '**/axe.spec.ts',
        '**/axe-mobile.spec.ts',
        '**/epic-11-slider-touch-drag.spec.ts',
        // Story 11.3 (AC2/AC3): the sheet/chip real-touch gesture spec is a
        // `touch`-project-only CDP raw-touch spec — exclude it here so it does
        // not double-run/false-fail under the WebKit mobile project.
        '**/epic-11-sheet-touch-gestures.spec.ts',
      ],
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'desktop',
      testIgnore: [
        '**/axe.spec.ts',
        '**/axe-mobile.spec.ts',
        '**/epic-11-slider-touch-drag.spec.ts',
        '**/epic-11-sheet-touch-gestures.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'touch',
      // Story 11.2 slider-drag + Story 11.3 sheet/chip gestures both live under
      // the Chromium/Pixel-5 real-touch project (CDP `Input.dispatchTouchEvent`).
      testMatch: [
        '**/epic-11-slider-touch-drag.spec.ts',
        '**/epic-11-sheet-touch-gestures.spec.ts',
      ],
      use: { ...devices['Pixel 5'] },
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
    command: webServerCommand,
    port: webServerPort,
    reuseExistingServer: !process.env.CI,
  },
});
