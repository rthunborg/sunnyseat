import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';

const repoRoot = 'C:/Users/Rasmus/sunnyseat';
const appRoot = path.join(repoRoot, 'nextjs-app');
const requireFromApp = createRequire(path.join(appRoot, 'package.json'));
const { chromium } = requireFromApp('playwright');
const outDir = path.join(
  repoRoot,
  '_bmad-output/implementation-artifacts/validation/story-12-13-candidates/20260719-163445',
);
const baseUrl = 'http://localhost:3000';

const viewports = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
};

const targets = [
  {
    viewport: 'mobile',
    screenId: 'map-panel-venues',
    route: '/?_state=map-panel-venues&_time=14:00',
    reference: 'mobile/map-panel-venues.png',
    assertions: ['map', 'pins', 'venueCards', 'bottomSheetMid', 'favouritesSunExposure', 'noConfidence'],
  },
  {
    viewport: 'mobile',
    screenId: 'map-with-selected-venue',
    route: '/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00',
    reference: 'mobile/map-with-selected-venue.png',
    assertions: ['map', 'pins', 'quickInfo', 'quickInfoSunExposure', 'noConfidence'],
  },
  {
    viewport: 'mobile',
    screenId: 'favourites-tab',
    route: '/favoriter?_state=favourites-tab&_time=14:00',
    reference: 'mobile/favourites-tab.png',
    assertions: ['map', 'pins', 'venueCards', 'favouritesSunExposure', 'noConfidence'],
    favourites: true,
  },
  {
    viewport: 'mobile',
    screenId: 'venue-detail',
    route: '/?venue=test-venue-sunny&_state=venue-detail&_time=14:00',
    reference: 'mobile/venue-detail.png',
    assertions: ['map', 'pins', 'mobileDetail', 'detailSunExposure', 'noDetailSkeleton', 'noConfidence'],
  },
  {
    viewport: 'mobile',
    screenId: 'venue-detail-obscured',
    route: '/?venue=test-venue-sunny&_state=venue-detail-obscured&_time=14:00',
    reference: 'mobile/venue-detail-obscured.png',
    assertions: ['map', 'pins', 'mobileDetail', 'obscuredCopy', 'obscuredDetailNoPercent', 'noDetailSkeleton', 'noConfidence'],
  },
  {
    viewport: 'desktop',
    screenId: 'map-primary',
    route: '/?_time=16:30',
    reference: 'desktop/map-primary.png',
    assertions: ['map', 'pins', 'desktopVenuePanel', 'venueListText', 'noConfidence'],
  },
  {
    viewport: 'desktop',
    screenId: 'favourites-tab',
    route: '/favoriter?_state=favourites-tab&_time=14:00',
    reference: 'desktop/favourites-tab.png',
    assertions: ['map', 'pins', 'venueListText', 'favouritesSunExposure', 'noConfidence'],
    favourites: true,
  },
  {
    viewport: 'desktop',
    screenId: 'venue-detail',
    route: '/?venue=test-venue-sunny&_state=venue-detail&_time=16:30',
    reference: 'desktop/venue-detail.png',
    assertions: ['map', 'pins', 'desktopDetail', 'detailSunExposure', 'noDetailSkeleton', 'noConfidence'],
  },
  {
    viewport: 'desktop',
    screenId: 'venue-detail-obscured',
    route: '/?venue=test-venue-sunny&_state=venue-detail-obscured&_time=16:30',
    reference: 'desktop/venue-detail-obscured.png',
    assertions: ['map', 'pins', 'desktopDetail', 'obscuredCopy', 'obscuredDetailNoPercent', 'noDetailSkeleton', 'noConfidence'],
  },
];

const forbiddenConfidencePatterns = [
  /Säkerhet\s*(?:cirka\s*)?\d{1,3}\s*%/gi,
  /Säkerhet\s+saknas/gi,
  /Confidence\s*(?:approximately\s*)?\d{1,3}\s*%/gi,
  /Confidence\s+unavailable/gi,
  /~\s*\d{1,3}\s*%/g,
];

function sha256(file) {
  return crypto.createHash('sha256').update(fsSync.readFileSync(file)).digest('hex');
}

function pngDimensions(file) {
  const buf = fsSync.readFileSync(file);
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') {
    return null;
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function isVisible(page, selector, timeout = 15_000) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: 'visible', timeout });
  return true;
}

async function countVisible(page, selector) {
  return await page.locator(selector).evaluateAll((nodes) =>
    nodes.filter((node) => {
      const el = node;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    }).length,
  );
}

async function installPageChromeGuards(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
      }
      nextjs-portal, [data-nextjs-dialog-overlay], [data-nextjs-toast] {
        display: none !important;
        visibility: hidden !important;
      }
    `,
  });
}

async function collectConfidenceText(page) {
  const visibleText = await page.locator('body').innerText({ timeout: 10_000 }).catch(() => '');
  const srText = await page.locator('.sr-only').evaluateAll((nodes) =>
    nodes.map((node) => node.textContent || '').join('\n'),
  );
  const ariaText = await page.locator('[aria-label]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('aria-label') || '').join('\n'),
  );
  const titleText = await page.locator('[title]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('title') || '').join('\n'),
  );
  const combined = `${visibleText}\n${srText}\n${ariaText}\n${titleText}`;
  const matches = forbiddenConfidencePatterns
    .flatMap((pattern) => Array.from(combined.matchAll(pattern)).map((match) => match[0]))
    .filter((value, index, list) => list.indexOf(value) === index);
  return { visibleText, srText, ariaText, titleText, matches };
}

function detailSurfaceLocator(page, target) {
  if (target.viewport === 'desktop') return page.locator('[data-testid="desktop-venue-detail-panel"]').first();
  return page.locator('[data-testid="mobile-venue-detail-sheet"]').first();
}

async function hasVisibleSunIconNearDetailFigure(page, target) {
  return await detailSurfaceLocator(page, target).locator('svg, [aria-hidden="true"]').evaluateAll((nodes) =>
    nodes.some((node) => {
      const el = node;
      const text = (el.textContent || '').toLowerCase();
      const label = (el.getAttribute('aria-label') || '').toLowerCase();
      const cls = (el.getAttribute('class') || '').toLowerCase();
      const testId = (el.getAttribute('data-testid') || '').toLowerCase();
      const iconName = (el.getAttribute('data-lucide') || '').toLowerCase();
      return text.includes('sol') || label.includes('sol') || cls.includes('sun') || testId.includes('sun') || iconName.includes('sun');
    }),
  );
}

async function runAssertions(page, target) {
  const details = {};
  const failures = [];
  const add = async (name, fn) => {
    try {
      details[name] = await fn();
    } catch (error) {
      details[name] = false;
      failures.push(`${name}: ${error.message}`);
    }
  };

  if (target.assertions.includes('map')) {
    await add('map visible', async () => isVisible(page, '[data-testid="map-container"], .maplibregl-map'));
  }
  if (target.assertions.includes('pins')) {
    await add('visible pin count', async () => {
      await isVisible(page, '[data-testid="venue-pin"]');
      return await countVisible(page, '[data-testid="venue-pin"]');
    });
  }
  if (target.assertions.includes('venueCards')) {
    await add('visible venue-card count', async () => {
      await isVisible(page, '[data-testid="venue-card"]');
      return await countVisible(page, '[data-testid="venue-card"]');
    });
  }
  if (target.assertions.includes('favouritesSunExposure')) {
    await add('favourites/list retain primary sun-exposure value', async () => {
      const text = await page.locator('body').innerText({ timeout: 10_000 });
      if (!/\b\d{1,3}\s*%\s*sol/i.test(text) && !/FULL SOL|DELVIS SOL|MEST SKUGGA/i.test(text)) {
        throw new Error('expected primary sun-exposure value/verdict in list or favourites surface');
      }
      return true;
    });
  }
  if (target.assertions.includes('venueListText')) {
    await add('venue list text visible', async () => {
      const text = await page.locator('body').innerText({ timeout: 10_000 });
      if (!text.includes('Kafé Magasinet')) throw new Error('expected Kafé Magasinet in visible venue list');
      return true;
    });
  }
  if (target.assertions.includes('bottomSheetMid')) {
    await add('mobile bottom sheet state', async () => {
      const value = await page.locator('[data-testid="mobile-bottom-sheet"]').first().getAttribute('data-state');
      if (value !== 'mid') throw new Error(`expected data-state="mid", saw "${value}"`);
      return value;
    });
  }
  if (target.assertions.includes('quickInfo')) {
    await add('quick info visible', async () => isVisible(page, '[data-testid="venue-quick-info"]'));
  }
  if (target.assertions.includes('quickInfoSunExposure')) {
    await add('quick info retains sunny sun-exposure figure', async () => {
      const text = await page.locator('[data-testid="venue-quick-info"]').first().innerText({ timeout: 10_000 });
      if (!/\b95\s*%/.test(text)) throw new Error('expected visible 95% sun-exposure figure in selected QuickInfo');
      if (!/SOL/i.test(text)) throw new Error('expected visible SOL label in selected QuickInfo');
      return true;
    });
  }
  if (target.assertions.includes('mobileDetail')) {
    await add('mobile detail visible', async () => isVisible(page, '[data-testid="mobile-venue-detail-sheet"]'));
  }
  if (target.assertions.includes('desktopDetail')) {
    await add('desktop detail visible', async () => isVisible(page, '[data-testid="desktop-venue-detail-panel"]'));
  }
  if (target.assertions.includes('detailSunExposure')) {
    await add('sunny detail retains sun-exposure figure', async () => {
      const text = await detailSurfaceLocator(page, target).innerText({ timeout: 10_000 });
      if (!/\b95\s*%/.test(text)) throw new Error('expected visible 95% sun-exposure figure in sunny detail');
      if (!(await hasVisibleSunIconNearDetailFigure(page, target))) {
        throw new Error('expected visible/detail sun icon with the 95% sun-exposure figure');
      }
      return true;
    });
  }
  if (target.assertions.includes('desktopVenuePanel')) {
    await add('desktop venue panel visible', async () => isVisible(page, '[data-testid="desktop-venue-list-panel"]'));
  }
  if (target.assertions.includes('obscuredCopy')) {
    await add('obscured sky copy visible', async () => {
      const text = await page.locator('body').innerText({ timeout: 10_000 });
      if (!/SOL BAKOM MOLN/i.test(text) || !/MULET/i.test(text)) {
        throw new Error('expected SOL BAKOM MOLN and MULET obscured copy');
      }
      return true;
    });
  }
  if (target.assertions.includes('obscuredDetailNoPercent')) {
    await add('obscured detail percentage-free', async () => {
      const text = await detailSurfaceLocator(page, target).innerText({ timeout: 10_000 });
      if (/\b\d{1,3}\s*%/.test(text)) throw new Error(`expected no percentage in obscured detail surface, saw "${text.match(/\b\d{1,3}\s*%/)?.[0]}"`);
      if (!/SOL BAKOM MOLN/i.test(text) || !/MULET/i.test(text)) {
        throw new Error('expected SOL BAKOM MOLN and MULET obscured copy in detail surface');
      }
      return true;
    });
  }
  if (target.assertions.includes('noDetailSkeleton')) {
    await add('detail skeleton absent', async () => {
      const count = await countVisible(page, '[data-testid="venue-detail-skeleton"]');
      if (count !== 0) throw new Error(`expected no visible skeleton, saw ${count}`);
      return true;
    });
  }
  if (target.assertions.includes('noConfidence')) {
    await add('confidence absent from visible/sr/aria/title text', async () => {
      const confidence = await collectConfidenceText(page);
      if (confidence.matches.length > 0) {
        throw new Error(`forbidden confidence text: ${confidence.matches.join(', ')}`);
      }
      return true;
    });
  }

  await add('sun exposure retained somewhere when applicable', async () => {
    const text = await page.locator('body').innerText({ timeout: 10_000 }).catch(() => '');
    return /\d{1,3}\s*%\s*sol/i.test(text) || target.screenId.includes('obscured');
  });

  return { details, failures };
}

async function captureTarget(browser, target) {
  const events = {
    console: [],
    pageErrors: [],
    requestFailed: [],
    httpErrors: [],
  };
  const context = await browser.newContext({
    viewport: viewports[target.viewport],
    deviceScaleFactor: 2,
    locale: 'sv-SE',
    timezoneId: 'Europe/Stockholm',
    reducedMotion: 'reduce',
    colorScheme: 'light',
    extraHTTPHeaders: { 'Accept-Language': 'sv-SE,sv;q=0.9' },
  });
  await context.addInitScript(({ favourites }) => {
    window.localStorage.setItem('sunnyseat_onboarded', '1');
    if (favourites) window.localStorage.setItem('sunnyseat_favourite_ids', '["1","2"]');
  }, { favourites: Boolean(target.favourites) });

  const page = await context.newPage();
  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) {
      events.console.push({ type: msg.type(), text: msg.text() });
    }
  });
  page.on('pageerror', (error) => events.pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    events.requestFailed.push({
      method: request.method(),
      url: request.url(),
      failure: request.failure()?.errorText || '',
    });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      events.httpErrors.push({ status: response.status(), url: response.url() });
    }
  });

  const url = `${baseUrl}${target.route}`;
  const fileName = `${target.viewport}-${target.screenId}.png`;
  const outPath = path.join(outDir, fileName);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await installPageChromeGuards(page);
    await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => undefined);
    await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
    await page.waitForTimeout(1_000);
    const htmlLang = await page.locator('html').getAttribute('lang').catch(() => null);
    const assertions = await runAssertions(page, target);
    await page.screenshot({ path: outPath, fullPage: false });
    const confidence = await collectConfidenceText(page);
    const referencePath = path.join(appRoot, 'docs/design/references/screens', target.reference);
    const candidateStats = await fs.stat(outPath);
    const refExists = fsSync.existsSync(referencePath);
    const referenceStats = refExists ? await fs.stat(referencePath) : null;
    const candidateHash = sha256(outPath);
    const referenceHash = refExists ? sha256(referencePath) : null;
    return {
      ...target,
      url,
      fileName,
      outPath,
      htmlLang,
      status: assertions.failures.length ? 'assertion-failed' : 'captured',
      assertions,
      confidenceMatches: confidence.matches,
      events,
      candidate: {
        bytes: candidateStats.size,
        sha256: candidateHash,
        dimensions: pngDimensions(outPath),
      },
      reference: {
        path: referencePath,
        exists: refExists,
        bytes: referenceStats?.size ?? null,
        sha256: referenceHash,
        dimensions: refExists ? pngDimensions(referencePath) : null,
        sameSha256: referenceHash === candidateHash,
      },
    };
  } catch (error) {
    return {
      ...target,
      url,
      fileName,
      outPath,
      status: 'failed',
      error: error.message,
      events,
    };
  } finally {
    await context.close();
  }
}

function formatEvents(events) {
  const lines = [];
  for (const [kind, items] of Object.entries(events)) {
    if (!items || items.length === 0) continue;
    const sample = items.slice(0, 10).map((item) => {
      if (typeof item === 'string') return item.replace(/\s+/g, ' ').slice(0, 220);
      return JSON.stringify(item).replace(/\s+/g, ' ').slice(0, 260);
    });
    lines.push(`  - ${kind}: ${items.length}${items.length > sample.length ? ` (first ${sample.length} shown)` : ''}`);
    for (const value of sample) lines.push(`    - ${value}`);
  }
  return lines.length ? lines.join('\n') : '  - none';
}

async function writeManifest(results) {
  const capturedAt = new Date().toISOString();
  const failures = results.filter((r) => r.status !== 'captured');
  const mismatchRows = results.map((result) => {
    const refHash = result.reference?.sha256 ? `\`${result.reference.sha256}\`` : 'n/a';
    const candHash = result.candidate?.sha256 ? `\`${result.candidate.sha256}\`` : 'n/a';
    const same = result.reference?.sameSha256 ? 'same' : 'different';
    return `| ${result.viewport} | \`${result.screenId}\` | \`${result.route}\` | \`${result.fileName}\` | ${result.candidate?.dimensions ? `${result.candidate.dimensions.width}x${result.candidate.dimensions.height}` : 'n/a'} | ${result.candidate?.bytes ?? 'n/a'} | ${candHash} | ${result.reference?.exists ? 'yes' : 'no'} | ${same} | ${refHash} | ${result.status} |`;
  });
  const resultSections = results.map((result) => {
    const structuredAssertions = result.assertions?.details ? result.assertions : null;
    const assertionLines = structuredAssertions
      ? Object.entries(structuredAssertions.details).map(([name, value]) => `  - ${name}: ${JSON.stringify(value)}`).join('\n')
      : '  - not run';
    const failuresText = structuredAssertions?.failures?.length
      ? structuredAssertions.failures.map((failure) => `  - ${failure}`).join('\n')
      : '  - none';
    const confidenceText = result.confidenceMatches?.length
      ? result.confidenceMatches.map((match) => `  - ${match}`).join('\n')
      : '  - none';
    return `### ${result.viewport}/${result.screenId}

- Route: \`${result.route}\`
- URL: \`${result.url}\`
- Candidate: \`${result.fileName}\`
- Reference: \`${result.reference?.path ?? result.reference ?? 'n/a'}\`
- HTML lang: \`${result.htmlLang ?? 'n/a'}\`
- Status: \`${result.status}\`

Assertions:
${assertionLines}

Assertion failures:
${failuresText}

Forbidden confidence matches:
${confidenceText}

Console/page/request/HTTP observations:
${formatEvents(result.events ?? {})}`;
  });
  const manifest = `# Story 12.13 non-authoritative candidate captures

Captured ${capturedAt} from the running SunnySeat implementation. These files are **candidate review evidence only**. They do not replace or bless any authoritative reference PNG.

## Capture environment

- Application command: \`npm run dev\` from \`C:\\Users\\Rasmus\\sunnyseat\\nextjs-app\`
- Capture origin and port: \`${baseUrl}\`
- Browser: Windows-native Playwright Chromium, headless
- Locale: \`sv-SE\`; \`Accept-Language: sv-SE,sv;q=0.9\`; \`html[lang]\` recorded per page
- Time zone: \`Europe/Stockholm\`
- Motion/color: reduced motion, light color scheme, screenshot animations disabled
- Viewports: mobile \`390x844\`, desktop \`1440x900\`, both at device scale factor 2. Written PNG dimensions should be \`780x1688\` and \`2880x1800\`.
- Storage before each navigation: \`sunnyseat_onboarded=1\`; favourites screens additionally used \`sunnyseat_favourite_ids=["1","2"]\`.
- Readiness: \`domcontentloaded\`, best-effort \`networkidle\`, font readiness, explicit product selectors, and a 1s settle before screenshot. The Next development portal was hidden as non-product chrome.
- Scope: Story 12.13 design gate targets only. No route-overlay screenshot was invented; route overlay remains covered by component/E2E evidence.

## Candidate inventory and reference comparison

| Viewport | Screen ID | Canonical route | Candidate | PNG dimensions | Bytes | Candidate SHA-256 | Reference exists | Candidate vs reference SHA | Reference SHA-256 | Status |
|---|---|---|---|---:|---:|---|---|---|---|---|
${mismatchRows.join('\n')}

## Result summary

- Complete expected set captured: ${failures.length === 0 ? 'yes' : 'no'}
- Screens captured: ${results.filter((r) => r.status === 'captured').length}/${results.length}
- Screens with assertion failures or capture errors: ${failures.length ? failures.map((r) => `${r.viewport}/${r.screenId}`).join(', ') : 'none'}
- Rebaseline implication: \`different\` candidate/reference SHA values are not automatically promotion candidates. Treat them as requiring human review only when the user-visible result intentionally changes for Story 12.13: secondary confidence removed while primary sun exposure remains, or obscured detail made percentage-free. Hash-only noise with the same visible result should not be promoted.

## Per-screen evidence

${resultSections.join('\n\n')}

## Files intentionally not changed

- No application source files were modified by this capture pass.
- No authoritative PNG under \`nextjs-app/docs/design/references/screens/\` was modified.
- \`nextjs-app/docs/design/references/REBASELINE-LOG.md\` was not modified.
- Auto-BMAD state, story files, and sprint status were not modified by this capture pass.
`;
  await fs.writeFile(path.join(outDir, 'evidence.md'), manifest, 'utf8');
  await fs.writeFile(path.join(outDir, 'evidence.json'), JSON.stringify({ capturedAt, results }, null, 2), 'utf8');
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const target of targets) {
      console.log(`CAPTURE ${target.viewport}/${target.screenId}`);
      results.push(await captureTarget(browser, target));
    }
  } finally {
    await browser.close();
  }
  await writeManifest(results);
  const failed = results.filter((r) => r.status === 'failed');
  if (failed.length) {
    console.error(`Capture failures: ${failed.map((r) => `${r.viewport}/${r.screenId}`).join(', ')}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
