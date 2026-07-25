import { expect, test, type ConsoleMessage, type Page, type TestInfo } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

const APP_SETTLE_TIMEOUT_MS = 15_000;
const WATCHED_CONSOLE_TYPES = new Set(['warning', 'error']);
const MAX_POSITRON_WARNINGS_PER_WORKER = 3;
const POSITRON_REF_LENGTH_WARNING =
  'Expected value to be of type number, but found null instead.';
const POSITRON_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const POSITRON_REF_LENGTH_LAYER_IDS = [
  'highway-shield-non-us',
  'highway-shield-us-interstate',
  'road_shield_us',
] as const;
const CHROMIUM_READPIXELS_WARNING_PATTERN =
  /^\[\.WebGL-0x[0-9A-Fa-f]+\]GL Driver Message \(OpenGL, Performance, GL_CLOSE_PATH_NV, High\): GPU stall due to ReadPixels(?: \(this message will no longer repeat\))?$/;

// OpenFreeMap Positron style expressions in `highway-shield-non-us`,
// `highway-shield-us-interstate`, and `road_shield_us` can compare a
// missing/null `ref_length` against a numeric threshold. MapLibre 5 reports
// that upstream style-worker warning during tile/style evaluation.
// The runtime URL/line belongs to the bundled MapLibre logger, so the guard
// records candidate worker warnings first and only allows them at assertion time
// after the page has loaded the Positron style and the exact `ref_length` layers
// are still present.

type ConsoleIssue = {
  source: 'console' | 'pageerror';
  type: string;
  text: string;
  location: string;
};

type PositronWarningCandidate = ConsoleIssue & {
  workerUrl: string;
};

type PositronStyleLayer = {
  id?: unknown;
  source?: unknown;
  'source-layer'?: unknown;
  filter?: unknown;
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

function isPotentialPositronRefLengthWarning(message: ConsoleMessage): boolean {
  const workerUrl = message.worker()?.url();
  const pageOrigin = pageOriginForMessage(message);
  const locationUrl = message.location().url;

  return (
    message.type() === 'warning' &&
    message.text() === POSITRON_REF_LENGTH_WARNING &&
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

function containsRefLengthGet(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value[0] === 'get' &&
    value[1] === 'ref_length'
  );
}

function containsRefLengthNumericComparison(value: unknown): boolean {
  if (!Array.isArray(value)) return false;

  const [operator, ...operands] = value;
  const isNumericComparison =
    operator === '<' || operator === '<=' || operator === '>' || operator === '>=';
  if (
    isNumericComparison &&
    operands.some(containsRefLengthGet) &&
    operands.some((operand) => typeof operand === 'number' && Number.isFinite(operand))
  ) {
    return true;
  }

  return value.some(containsRefLengthNumericComparison);
}

function hasExpectedPositronRefLengthLayers(style: unknown): boolean {
  if (
    style === null ||
    typeof style !== 'object' ||
    !Array.isArray((style as { layers?: unknown }).layers)
  ) {
    return false;
  }

  const layers = (style as { layers: PositronStyleLayer[] }).layers;
  return POSITRON_REF_LENGTH_LAYER_IDS.every((layerId) => {
    const layer = layers.find((candidate) => candidate.id === layerId);
    return (
      layer?.source === 'openmaptiles' &&
      layer['source-layer'] === 'transportation_name' &&
      containsRefLengthNumericComparison(layer.filter)
    );
  });
}

async function hasLoadedExpectedPositronRefLengthStyle(page: Page): Promise<boolean> {
  const loadedStyleUrl = await page.evaluate((styleUrl) => {
    return performance
      .getEntriesByType('resource')
      .some((entry) => entry.name === styleUrl || entry.name === `${styleUrl}/`);
  }, POSITRON_STYLE_URL);
  if (!loadedStyleUrl) return false;

  const response = await page.request.get(POSITRON_STYLE_URL);
  if (!response.ok()) return false;

  return hasExpectedPositronRefLengthLayers(await response.json());
}

function attachConsoleHygieneGuard(page: Page): {
  issues: () => ConsoleIssue[];
  assertClean: () => Promise<void>;
} {
  const issues: ConsoleIssue[] = [];
  const positronWarningCandidates: PositronWarningCandidate[] = [];
  const allowedPositronWarningsByWorker = new Map<string, number>();

  page.on('console', (message) => {
    if (!WATCHED_CONSOLE_TYPES.has(message.type())) return;
    if (isPotentialPositronRefLengthWarning(message)) {
      const workerUrl = message.worker()?.url() ?? 'unknown-worker';
      const allowedPositronWarningCount =
        (allowedPositronWarningsByWorker.get(workerUrl) ?? 0) + 1;
      allowedPositronWarningsByWorker.set(workerUrl, allowedPositronWarningCount);
      if (allowedPositronWarningCount <= MAX_POSITRON_WARNINGS_PER_WORKER) {
        positronWarningCandidates.push({
          source: 'console',
          type: message.type(),
          text: message.text(),
          location: formatConsoleLocation(message),
          workerUrl,
        });
        return;
      }
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
    assertClean: async () => {
      const unresolvedPositronWarnings =
        positronWarningCandidates.length > 0 &&
        !(await hasLoadedExpectedPositronRefLengthStyle(page))
          ? positronWarningCandidates
          : [];

      expect([...issues, ...unresolvedPositronWarnings].map(formatIssue)).toEqual([]);
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

  test('guard rejects unattributed same-origin blob warnings with the Positron text', async ({
    page,
  }) => {
    const guard = attachConsoleHygieneGuard(page);

    await page.goto('/about');
    await page.evaluate((warningText) => {
      return new Promise<void>((resolve) => {
        const script = `console.warn(${JSON.stringify(warningText)}); self.postMessage('done');`;
        const worker = new Worker(
          URL.createObjectURL(new Blob([script], { type: 'text/javascript' })),
        );
        worker.addEventListener('message', () => {
          worker.terminate();
          resolve();
        }, { once: true });
      });
    }, POSITRON_REF_LENGTH_WARNING);

    await expect(guard.assertClean()).rejects.toThrow(POSITRON_REF_LENGTH_WARNING);
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

    await guard.assertClean();
  });

  test('canonical forced-time map route has no app console warnings/errors or page errors', async ({
    page,
  }, testInfo: TestInfo) => {
    const guard = attachConsoleHygieneGuard(page);
    await bypassOnboarding(page);

    await page.goto(canonicalMapRoute(testInfo.project.name));
    await waitForMapReady(page);

    await guard.assertClean();
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

    await guard.assertClean();
  });
});
