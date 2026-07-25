import { expect, test, type ConsoleMessage, type Page, type TestInfo } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

const APP_SETTLE_TIMEOUT_MS = 15_000;
const WATCHED_CONSOLE_TYPES = new Set(['warning', 'error']);
const MAX_POSITRON_WARNINGS_PER_WORKER = 3;
const POSITRON_REF_LENGTH_WARNING =
  'Expected value to be of type number, but found null instead.';
const CHROMIUM_READPIXELS_WARNING_PATTERN =
  /^\[\.WebGL-0x[0-9A-Fa-f]+\]GL Driver Message \(OpenGL, Performance, GL_CLOSE_PATH_NV, High\): GPU stall due to ReadPixels(?: \(this message will no longer repeat\))?$/;

// OpenFreeMap Positron style expressions in `highway-shield-non-us`,
// `highway-shield-us-interstate`, and `road_shield_us` can compare a
// missing/null `ref_length` against a numeric threshold. MapLibre 5 reports
// that upstream style-worker warning during tile/style evaluation.
// The runtime URL/line belongs to the bundled MapLibre logger and is not stable
// enough to match; the stable source shape is exact text from a same-origin
// blob worker, capped at three warnings per worker.
const ALLOWED_THIRD_PARTY_WARNING_TEXTS = new Set([
  POSITRON_REF_LENGTH_WARNING,
]);

type ConsoleIssue = {
  source: 'console' | 'pageerror';
  type: string;
  text: string;
  location: string;
};

function pageOriginForMessage(message: ConsoleMessage): string | null {
  const pageUrl = message.page()?.url();
  if (!pageUrl) return null;
  try {
    return new URL(pageUrl).origin;
  } catch {
    return null;
  }
}

function isAllowedThirdPartyWarning(message: ConsoleMessage): boolean {
  const workerUrl = message.worker()?.url();
  const pageOrigin = pageOriginForMessage(message);
  const locationUrl = message.location().url;

  return (
    message.type() === 'warning' &&
    ALLOWED_THIRD_PARTY_WARNING_TEXTS.has(message.text()) &&
    workerUrl !== undefined &&
    pageOrigin !== null &&
    locationUrl === workerUrl &&
    workerUrl.startsWith(`blob:${pageOrigin}/`)
  );
}

function isAllowedBrowserNoise(message: ConsoleMessage): boolean {
  const location = message.location();
  return (
    message.type() === 'warning' &&
    message.worker() === null &&
    location.url === message.page()?.url() &&
    location.lineNumber === 0 &&
    location.columnNumber === 0 &&
    CHROMIUM_READPIXELS_WARNING_PATTERN.test(message.text())
  );
}

function formatConsoleLocation(message: ConsoleMessage): string {
  const location = message.location();
  const workerUrl = message.worker()?.url();
  const parts = [location.url, location.lineNumber, location.columnNumber]
    .filter((part) => part !== undefined && part !== '');
  const source = parts.length > 0 ? parts.join(':') : 'unknown';
  return workerUrl ? `${source} worker=${workerUrl}` : source;
}

function formatIssue(issue: ConsoleIssue): string {
  return `${issue.source}:${issue.type} @ ${issue.location}\n${issue.text}`;
}

function attachConsoleHygieneGuard(page: Page): {
  issues: () => ConsoleIssue[];
  assertClean: () => void;
} {
  const issues: ConsoleIssue[] = [];
  const allowedPositronWarningsByWorker = new Map<string, number>();

  page.on('console', (message) => {
    if (!WATCHED_CONSOLE_TYPES.has(message.type())) return;
    if (isAllowedThirdPartyWarning(message)) {
      const workerUrl = message.worker()?.url() ?? 'unknown-worker';
      const allowedPositronWarningCount =
        (allowedPositronWarningsByWorker.get(workerUrl) ?? 0) + 1;
      allowedPositronWarningsByWorker.set(workerUrl, allowedPositronWarningCount);
      if (allowedPositronWarningCount <= MAX_POSITRON_WARNINGS_PER_WORKER) return;
      issues.push({
        source: 'console',
        type: message.type(),
        text: `Allowed Positron warning cap exceeded for worker (${allowedPositronWarningCount}/${MAX_POSITRON_WARNINGS_PER_WORKER}): ${message.text()}`,
        location: formatConsoleLocation(message),
      });
      return;
    }
    if (isAllowedBrowserNoise(message)) return;
    issues.push({
      source: 'console',
      type: message.type(),
      text: message.text(),
      location: formatConsoleLocation(message),
    });
  });

  page.on('pageerror', (error) => {
    issues.push({
      source: 'pageerror',
      type: 'pageerror',
      text: error.stack ?? error.message,
      location: 'window',
    });
  });

  return {
    issues: () => issues,
    assertClean: () => {
      expect(issues.map(formatIssue)).toEqual([]);
    },
  };
}

async function bypassOnboarding(page: Page): Promise<void> {
  await page.addInitScript((key: string) => {
    window.sessionStorage.clear();
    window.localStorage.setItem(key, '1');
  }, ONBOARDED_FLAG_KEY);
}

function canonicalMapRoute(projectName: string): string {
  return projectName === 'desktop' ? '/?_time=16:30' : '/?_time=14:00';
}

function venueDetailRoute(projectName: string): string {
  const time = projectName === 'desktop' ? '16:30' : '14:00';
  return `/?venue=test-venue-sunny&_state=venue-detail&_time=${time}`;
}

function detailSurface(page: Page, projectName: string) {
  return projectName === 'desktop'
    ? page.getByTestId('desktop-venue-detail-panel')
    : page.getByTestId('mobile-venue-detail-sheet');
}

async function waitForMapReady(page: Page): Promise<void> {
  await page.locator('[data-testid="map-container"]').first().waitFor({
    state: 'attached',
    timeout: APP_SETTLE_TIMEOUT_MS,
  });
  await page.locator('.maplibregl-canvas').first().waitFor({
    state: 'attached',
    timeout: APP_SETTLE_TIMEOUT_MS,
  });
  await expect(page.locator('[data-testid="map-tile-paint-cover"]')).toHaveCount(0, {
    timeout: APP_SETTLE_TIMEOUT_MS,
  });
  await page.evaluate(() => new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  }));
  await page.locator('[data-testid="venue-pin"]').first().waitFor({
    state: 'attached',
    timeout: APP_SETTLE_TIMEOUT_MS,
  });
}

test.describe('Story 12.4 production console hygiene', () => {
  test('guard captures synthetic console warnings and page errors', async ({ page }) => {
    const guard = attachConsoleHygieneGuard(page);

    await page.goto('data:text/html,<html><body>console guard self-test</body></html>');
    await page.evaluate(() => {
      console.warn('[story-12-4] synthetic app warning');
      console.warn('Expected value to be of type number, but found null instead.');
      window.setTimeout(() => {
        throw new Error('[story-12-4] synthetic async pageerror');
      }, 0);
    });

    await expect
      .poll(
        () => guard.issues().map((issue) => issue.text).join('\n'),
        { timeout: 5_000 },
      )
      .toContain('[story-12-4] synthetic async pageerror');

    expect(guard.issues().map((issue) => issue.text)).toEqual(
      expect.arrayContaining([
        '[story-12-4] synthetic app warning',
        'Expected value to be of type number, but found null instead.',
        expect.stringContaining('[story-12-4] synthetic async pageerror'),
      ]),
    );
  });

  test('first-user cold root route has no app console warnings/errors or page errors', async ({
    page,
  }) => {
    const guard = attachConsoleHygieneGuard(page);

    await page.goto('/');
    await expect(
      page.locator('[data-testid="onboarding-screen"]:visible').first(),
    ).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    await expect(page.locator('[data-app-shell]')).toHaveAttribute('aria-hidden', 'true', {
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    await expect(page.locator('[data-testid="onboarding-screen"]')).toHaveCount(1);
    await expect(page.locator('[data-onboarding-portal]')).toHaveCount(0);
    const shellContainsScreen = await page.locator('[data-app-shell]').evaluate((shell) => {
      const onboardingScreen = document.querySelector('[data-testid="onboarding-screen"]');
      return onboardingScreen !== null && shell.contains(onboardingScreen);
    });
    expect(shellContainsScreen).toBe(false);
    await waitForMapReady(page);

    guard.assertClean();
  });

  test('canonical forced-time map route has no app console warnings/errors or page errors', async ({
    page,
  }, testInfo: TestInfo) => {
    const guard = attachConsoleHygieneGuard(page);
    await bypassOnboarding(page);

    await page.goto(canonicalMapRoute(testInfo.project.name));
    await waitForMapReady(page);

    guard.assertClean();
  });

  test('venue-detail cold entry has no app console warnings/errors or page errors', async ({
    page,
  }, testInfo: TestInfo) => {
    const guard = attachConsoleHygieneGuard(page);
    await bypassOnboarding(page);

    await page.goto(venueDetailRoute(testInfo.project.name));
    await expect(detailSurface(page, testInfo.project.name)).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    await waitForMapReady(page);

    guard.assertClean();
  });
});
