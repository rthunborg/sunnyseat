import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { spawn, execFile } from 'child_process';

const repoRoot = 'C:/Users/Rasmus/sunnyseat';
const appRoot = path.join(repoRoot, 'nextjs-app');
const requireFromApp = createRequire(path.join(appRoot, 'package.json'));
const { chromium } = requireFromApp('playwright');
const defaultOutDir = path.join(
  repoRoot,
  '_bmad-output/implementation-artifacts/validation/story-12-9-row-sheet-candidates/20260720-151908',
);
const outDir = process.env.STORY_12_9_OUT_DIR
  ? path.resolve(process.env.STORY_12_9_OUT_DIR)
  : defaultOutDir;
const baseUrl = process.env.STORY_12_9_BASE_URL ?? 'http://localhost:3000';
const venuesMatcher = '**/api/venues?**';

const viewports = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
};

const targets = [
  {
    viewport: 'mobile',
    screenId: 'map-primary',
    variant: 'slim-slider-rows-0',
    route: '/?_state=map-primary&_time=14:00',
    reference: 'mobile/map-primary.png',
    expectedRows: 0,
    expectedDragging: false,
    assertions: ['map', 'pins', 'mobileSheet', 'planner', 'mapControls', 'bodyHidden', 'chromeHidden'],
  },
  {
    viewport: 'mobile',
    screenId: 'map-panel-venues',
    variant: 'rows-0',
    route: '/?_state=map-panel-venues&_time=14:00&_sheetRows=0',
    reference: 'mobile/map-panel-venues.png',
    expectedRows: 0,
    expectedDragging: false,
    assertions: ['map', 'pins', 'mobileSheet', 'planner', 'mapControls', 'bodyHidden', 'chromeHidden'],
  },
  {
    viewport: 'mobile',
    screenId: 'map-panel-venues',
    variant: 'rows-1',
    route: '/?_state=map-panel-venues&_time=14:00&_sheetRows=1',
    reference: 'mobile/map-panel-venues.png',
    expectedRows: 1,
    expectedDragging: false,
    assertions: ['map', 'pins', 'mobileSheet', 'planner', 'mapControls', 'bodyShown', 'chromeShown', 'venueCards'],
  },
  {
    viewport: 'mobile',
    screenId: 'map-panel-venues',
    variant: 'rows-3',
    route: '/?_state=map-panel-venues&_time=14:00&_sheetRows=3',
    reference: 'mobile/map-panel-venues.png',
    expectedRows: 3,
    expectedDragging: false,
    assertions: ['map', 'pins', 'mobileSheet', 'planner', 'mapControls', 'bodyShown', 'chromeShown', 'venueCards'],
  },
  {
    viewport: 'mobile',
    screenId: 'map-panel-venues',
    variant: 'rows-max',
    route: '/?_state=map-panel-venues&_time=14:00&_sheetRows=max',
    reference: 'mobile/map-panel-venues.png',
    expectedRows: 'max',
    expectedDragging: false,
    assertions: ['map', 'pins', 'mobileSheet', 'planner', 'mapControls', 'bodyShown', 'chromeShown', 'venueCards'],
  },
  {
    viewport: 'mobile',
    screenId: 'map-panel-venues',
    variant: 'mid-drag',
    route: '/?_state=map-panel-venues&_time=14:00&_sheetDrag=mid',
    reference: 'mobile/map-panel-venues.png',
    expectedRows: 3,
    expectedDragging: true,
    assertions: ['map', 'pins', 'mobileSheet', 'planner', 'mapControls', 'bodyShown', 'chromeShown', 'venueCards'],
  },
  {
    viewport: 'desktop',
    screenId: 'map-primary',
    variant: 'desktop-regression',
    route: '/?_time=16:30',
    reference: 'desktop/map-primary.png',
    assertions: ['map', 'pins', 'desktopPanel', 'planner'],
  },
];

function buildVenue(id, name, lat, lng, tags, exposure = 90) {
  return {
    id,
    venueId: id,
    venueName: name,
    venueSlug: id === '1' ? 'test-venue-sunny' : `story-12-9-${id}`,
    slug: id === '1' ? 'test-venue-sunny' : `story-12-9-${id}`,
    neighborhood: 'Inom Vallgraven',
    location: { lat, lng },
    currentSunStatus: 'Sunny',
    weatherGateState: 'not_gated',
    isPartner: true,
    confidence: 90,
    distanceMeters: 100 + Number(id) * 20,
    sunExposurePercent: exposure,
    skyCondition: 'clear',
    tags,
    sunWindow: { start: '11:00', end: '18:00' },
    thumbnail: { alt: name, initials: name.slice(0, 2).toUpperCase() },
  };
}

function buildVenuesResponse() {
  const venues = [
    buildVenue('1', 'Kafé Magasinet', 57.705, 11.97, [
      'Innergård',
      'Hund ok',
      'Wifi',
      'Bakverk',
      'Morgonsol',
      'Take-away',
      'Surdeg',
      'Kanal',
    ], 95),
    buildVenue('2', 'Skuggans Hus', 57.706, 11.972, ['Innergård', 'Bakverk'], 82),
    buildVenue('3', 'Solterrassen', 57.704, 11.973, ['Takbar', 'Kvällssol'], 74),
    buildVenue('4', 'Bryggsolen', 57.707, 11.969, ['Kanal', 'Lunch'], 68),
    buildVenue('5', 'Gårdsljuset', 57.703, 11.971, ['Innergård', 'Morgonsol'], 61),
    buildVenue('6', 'Avenyns Hörn', 57.702, 11.975, ['Wifi', 'Lunch'], 57),
    buildVenue('7', 'Parkkaféet', 57.709, 11.968, ['Hund ok', 'Bakverk'], 54),
  ];

  return {
    venues,
    meta: { count: venues.length, radiusKm: 1.5, sunDataSource: 'fixture' },
    timestamp: '2026-07-20T12:00:00.000Z',
    totalCount: venues.length,
  };
}

function sha256(file) {
  return crypto.createHash('sha256').update(fsSync.readFileSync(file)).digest('hex');
}

function pngDimensions(file) {
  const buf = fsSync.readFileSync(file);
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function serverResponds(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await serverResponds(url)) return;
    await sleep(1_000);
  }
  throw new Error(`Timed out waiting for dev server at ${url}`);
}

function startServerIfNeeded() {
  const stdoutPath = path.join(outDir, 'dev-server.stdout.log');
  const stderrPath = path.join(outDir, 'dev-server.stderr.log');
  let child = null;
  let stdoutStream = null;
  let stderrStream = null;

  async function start() {
    if (await serverResponds(baseUrl)) {
      return { started: false, stdoutPath: null, stderrPath: null };
    }

    stdoutStream = fsSync.createWriteStream(stdoutPath, { flags: 'a' });
    stderrStream = fsSync.createWriteStream(stderrPath, { flags: 'a' });
    const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
    const args = process.platform === 'win32'
      ? ['/d', '/s', '/c', 'npm run dev']
      : ['run', 'dev'];
    child = spawn(command, args, {
      cwd: appRoot,
      env: { ...process.env, BROWSER: 'none' },
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout?.pipe(stdoutStream);
    child.stderr?.pipe(stderrStream);
    await waitForServer(baseUrl);
    return { started: true, stdoutPath, stderrPath, pid: child.pid };
  }

  async function stop() {
    if (!child?.pid) return;
    if (process.platform === 'win32') {
      await new Promise((resolve) => {
        execFile('taskkill', ['/pid', String(child.pid), '/t', '/f'], () => resolve());
      });
      stdoutStream?.end();
      stderrStream?.end();
      return;
    }
    child.kill('SIGTERM');
    stdoutStream?.end();
    stderrStream?.end();
  }

  return { start, stop };
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

async function installDeterministicRoutes(page) {
  await page.route(venuesMatcher, async (route) => {
    await route.fulfill({ json: buildVenuesResponse() });
  });
}

async function dismissOnboardingIfPresent(page) {
  const skip = page.locator('[data-testid="onboarding-cta-skip"]').first();
  const visible = await skip.isVisible({ timeout: 2_000 }).catch(() => false);
  if (!visible) return false;

  await skip.click();
  await page.locator('[data-testid="onboarding-screen"]').first()
    .waitFor({ state: 'detached', timeout: 10_000 })
    .catch(async () => {
      await page.locator('[data-testid="onboarding-screen"]').first()
        .waitFor({ state: 'hidden', timeout: 10_000 });
    });
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

async function visibleBox(locator) {
  await locator.waitFor({ state: 'visible', timeout: 15_000 });
  return await locator.boundingBox();
}

function numberAttribute(attrs, name) {
  const value = Number(attrs[name]);
  if (!Number.isFinite(value)) throw new Error(`expected numeric ${name}, saw ${JSON.stringify(attrs[name])}`);
  return value;
}

async function readSheetState(page) {
  const sheet = page.locator('[data-testid="mobile-bottom-sheet"]').first();
  await sheet.waitFor({ state: 'visible', timeout: 15_000 });
  const body = sheet.locator('[data-bottom-sheet-body="true"]').first();
  const chrome = sheet.locator('[data-bottom-sheet-chrome="true"]').first();
  const scrollBody = sheet.locator('[data-bottom-sheet-scroll-body="true"]').first();
  const attrs = await sheet.evaluate((el) => {
    const html = el;
    return {
      state: html.getAttribute('data-state'),
      visibleRows: html.getAttribute('data-visible-rows'),
      maxRows: html.getAttribute('data-max-rows'),
      rowHeight: html.getAttribute('data-row-height'),
      sheetHeight: html.getAttribute('data-sheet-height'),
      dragging: html.getAttribute('data-dragging'),
      className: html.getAttribute('class'),
      style: html.getAttribute('style'),
    };
  });
  const bodyAttrs = await body.evaluate((el) => {
    const html = el;
    const rect = html.getBoundingClientRect();
    return {
      ariaHidden: html.getAttribute('aria-hidden'),
      inert: html.hasAttribute('inert'),
      className: html.getAttribute('class'),
      rect: { width: rect.width, height: rect.height },
    };
  });
  const chromeBox = await chrome.boundingBox().catch(() => null);
  const scrollBodyBox = await scrollBody.boundingBox().catch(() => null);
  const sheetBox = await sheet.boundingBox().catch(() => null);
  const navBox = await page.locator('[data-testid="mobile-nav-bar"]').first().boundingBox().catch(() => null);
  return { attrs, bodyAttrs, chromeBox, scrollBodyBox, sheetBox, navBox };
}

async function readVenueRowVisibility(page, scrollBodyBox) {
  if (!scrollBodyBox) return { fullyVisible: 0, partiallyVisible: 0, rows: [] };
  return await page.locator('[data-testid="venue-card"]').evaluateAll((nodes, viewport) => {
    const bodyTop = viewport.y;
    const bodyBottom = viewport.y + viewport.height;
    const rows = nodes.map((node, index) => {
      const el = node;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const visible =
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        rect.width > 0 &&
        rect.height > 0;
      const overlaps = visible && rect.bottom > bodyTop + 1 && rect.top < bodyBottom - 1;
      const fullyVisible = visible && rect.top >= bodyTop - 1 && rect.bottom <= bodyBottom + 1;
      return {
        index,
        visible,
        overlaps,
        fullyVisible,
        rect: { top: rect.top, bottom: rect.bottom, height: rect.height },
      };
    });
    return {
      fullyVisible: rows.filter((row) => row.fullyVisible).length,
      partiallyVisible: rows.filter((row) => row.overlaps).length,
      rows,
    };
  }, scrollBodyBox);
}

async function assertMobileSheet(page, target) {
  const sheet = await readSheetState(page);
  const visibleRows = numberAttribute(sheet.attrs, 'visibleRows');
  const maxRows = numberAttribute(sheet.attrs, 'maxRows');
  const rowHeight = numberAttribute(sheet.attrs, 'rowHeight');
  const sheetHeight = numberAttribute(sheet.attrs, 'sheetHeight');
  const expectedRows = target.expectedRows === 'max'
    ? maxRows
    : Math.min(Number(target.expectedRows), maxRows);

  if (visibleRows !== expectedRows) {
    throw new Error(`expected ${expectedRows} visible rows, saw ${visibleRows}`);
  }
  if (sheet.attrs.state !== `rows-${visibleRows}`) {
    throw new Error(`expected data-state rows-${visibleRows}, saw ${sheet.attrs.state}`);
  }
  if (rowHeight <= 0) throw new Error(`expected positive row height, saw ${rowHeight}`);
  if (sheetHeight <= 0) throw new Error(`expected positive sheet height, saw ${sheetHeight}`);
  if (target.expectedDragging !== undefined && sheet.attrs.dragging !== String(target.expectedDragging)) {
    throw new Error(`expected data-dragging=${target.expectedDragging}, saw ${sheet.attrs.dragging}`);
  }
  if (target.assertions.includes('bodyHidden') && (sheet.bodyAttrs.ariaHidden !== 'true' || !sheet.bodyAttrs.inert)) {
    throw new Error(`expected inert hidden body at N=0, saw ${JSON.stringify(sheet.bodyAttrs)}`);
  }
  if (target.assertions.includes('bodyShown') && (sheet.bodyAttrs.ariaHidden === 'true' || sheet.bodyAttrs.inert)) {
    throw new Error(`expected non-inert body at N>0, saw ${JSON.stringify(sheet.bodyAttrs)}`);
  }
  if (target.assertions.includes('chromeShown') && (!sheet.chromeBox || sheet.chromeBox.height <= 0)) {
    throw new Error('expected visible sheet chrome at N>0');
  }
  if (target.assertions.includes('chromeHidden') && sheetHeight > 60) {
    throw new Error(`expected handle-only sheet height at N=0, saw ${sheetHeight}`);
  }
  if (sheet.sheetBox && sheet.navBox) {
    const sheetBottom = sheet.sheetBox.y + sheet.sheetBox.height;
    if (Math.abs(sheetBottom - sheet.navBox.y) > 1) {
      throw new Error(`expected sheet bottom ${sheetBottom} adjacent to nav top ${sheet.navBox.y}`);
    }
  }
  if (target.assertions.includes('venueCards')) {
    await page.locator('[data-testid="venue-card"]').first().waitFor({ state: 'visible', timeout: 15_000 });
    const rowVisibility = await readVenueRowVisibility(page, sheet.scrollBodyBox);
    const scrollHeight = sheet.scrollBodyBox?.height ?? 0;
    const expectedScrollHeight = expectedRows * rowHeight;

    if (target.expectedDragging) {
      if (scrollHeight <= expectedScrollHeight + 1) {
        throw new Error(`expected mid-drag scroll body taller than ${expectedScrollHeight}, saw ${scrollHeight}`);
      }
      if (rowVisibility.fullyVisible < expectedRows) {
        throw new Error(`expected at least ${expectedRows} fully visible rows mid-drag, saw ${rowVisibility.fullyVisible}`);
      }
      if (rowVisibility.partiallyVisible <= expectedRows) {
        throw new Error(`expected mid-drag to reveal a partial next row, saw ${rowVisibility.partiallyVisible} overlapping rows`);
      }
    } else {
      if (Math.abs(scrollHeight - expectedScrollHeight) > 2) {
        throw new Error(`expected scroll body height ${expectedScrollHeight}, saw ${scrollHeight}`);
      }
      if (rowVisibility.fullyVisible !== expectedRows) {
        throw new Error(`expected exactly ${expectedRows} fully visible rows, saw ${rowVisibility.fullyVisible}`);
      }
    }

    return { visibleRows, maxRows, rowHeight, sheetHeight, rowVisibility, ...sheet };
  }
  return { visibleRows, maxRows, rowHeight, sheetHeight, ...sheet };
}

async function assertMapControls(page, target) {
  const controls = page.locator('[data-testid="map-controls"]').first();
  await controls.waitFor({ state: 'attached', timeout: 15_000 });
  const state = await controls.evaluate((el) => {
    const html = el;
    const style = window.getComputedStyle(html);
    return {
      overlap: html.getAttribute('data-mobile-sheet-overlap'),
      ariaHidden: html.getAttribute('aria-hidden'),
      inert: html.hasAttribute('inert'),
      opacity: style.opacity,
      pointerEvents: style.pointerEvents,
      rect: (() => {
        const rect = html.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, height: rect.height };
      })(),
    };
  });
  const measuredCovered = state.overlap === 'true';
  if (target.expectedRows === 'max' && !measuredCovered) {
    throw new Error(`expected max-row controls to report measured sheet overlap, saw ${JSON.stringify(state)}`);
  }
  if (measuredCovered) {
    if (state.ariaHidden !== 'true' || !state.inert || state.opacity !== '0') {
      throw new Error(`expected sheet-covered controls hidden/inert, saw ${JSON.stringify(state)}`);
    }
  } else if (state.overlap !== 'false' || state.ariaHidden === 'true' || state.inert || state.opacity === '0') {
    throw new Error(`expected uncovered controls available, saw ${JSON.stringify(state)}`);
  }
  return { ...state, measuredCovered };
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
    await add('map visible', async () => {
      await page.locator('[data-testid="map-container"], .maplibregl-map').first().waitFor({ state: 'visible', timeout: 20_000 });
      return true;
    });
  }
  if (target.assertions.includes('pins')) {
    await add('visible pin count', async () => {
      await page.locator('[data-testid="venue-pin"]').first().waitFor({ state: 'visible', timeout: 20_000 });
      return await countVisible(page, '[data-testid="venue-pin"]');
    });
  }
  if (target.assertions.includes('planner')) {
    await add('planner visible and sized', async () => {
      const panel = page.locator('[data-testid="time-slider-panel"]:visible').first();
      const box = await visibleBox(panel);
      const classes = await panel.getAttribute('class');
      const slider = panel.getByRole('slider', { name: 'Välj tid' });
      await slider.waitFor({ state: 'visible', timeout: 10_000 });
      if (target.viewport === 'mobile' && box.height > 88) {
        throw new Error(`expected slim mobile planner height <= 88px, saw ${box.height}`);
      }
      return { box, className: classes };
    });
  }
  if (target.assertions.includes('mobileSheet')) {
    await add('mobile row sheet state', async () => await assertMobileSheet(page, target));
  }
  if (target.assertions.includes('mapControls')) {
    await add('map controls sheet-overlap state', async () => await assertMapControls(page, target));
  }
  if (target.assertions.includes('venueCards')) {
    await add('venue row visibility geometry', async () => {
      await page.locator('[data-testid="venue-card"]').first().waitFor({ state: 'visible', timeout: 15_000 });
      const sheet = await readSheetState(page);
      return await readVenueRowVisibility(page, sheet.scrollBodyBox);
    });
  }
  if (target.assertions.includes('desktopPanel')) {
    await add('desktop venue panel visible', async () => {
      const panel = page.locator('[data-testid="desktop-venue-list-panel"]').first();
      const box = await visibleBox(panel);
      return { box };
    });
  }

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
  const page = await context.newPage();
  await installDeterministicRoutes(page);
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
  const fileName = `${target.viewport}-${target.screenId}-${target.variant}.png`;
  const outPath = path.join(outDir, fileName);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await installPageChromeGuards(page);
    await dismissOnboardingIfPresent(page);
    await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => undefined);
    await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
    await page.waitForTimeout(1_000);
    const htmlLang = await page.locator('html').getAttribute('lang').catch(() => null);
    const assertions = await runAssertions(page, target);
    const productErrors = productErrorSummary(events);
    if (productErrors.length) {
      assertions.failures.push(...productErrors);
    }
    await page.screenshot({ path: outPath, fullPage: false });
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

function productErrorSummary(events) {
  const failures = [];
  const consoleErrors = (events.console ?? []).filter((entry) => entry.type === 'error');
  if (consoleErrors.length) {
    failures.push(`console errors observed: ${consoleErrors.map((entry) => entry.text).join(' | ')}`);
  }
  if ((events.pageErrors ?? []).length) {
    failures.push(`page errors observed: ${events.pageErrors.join(' | ')}`);
  }
  if ((events.httpErrors ?? []).length) {
    failures.push(`HTTP >=400 observed: ${events.httpErrors.map((entry) => `${entry.status} ${entry.url}`).join(' | ')}`);
  }
  if ((events.requestFailed ?? []).length) {
    failures.push(`request failures observed: ${events.requestFailed.map((entry) => `${entry.method} ${entry.url} ${entry.failure}`).join(' | ')}`);
  }
  return failures;
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

async function writeManifest(results, serverInfo) {
  const capturedAt = new Date().toISOString();
  const failures = results.filter((r) => r.status !== 'captured');
  const productEventTotals = results.reduce(
    (totals, result) => {
      totals.consoleErrors += (result.events?.console ?? []).filter((entry) => entry.type === 'error').length;
      totals.pageErrors += result.events?.pageErrors?.length ?? 0;
      totals.httpErrors += result.events?.httpErrors?.length ?? 0;
      totals.requestFailed += result.events?.requestFailed?.length ?? 0;
      return totals;
    },
    { consoleErrors: 0, pageErrors: 0, httpErrors: 0, requestFailed: 0 },
  );
  const rows = results.map((result) => {
    const refHash = result.reference?.sha256 ? `\`${result.reference.sha256}\`` : 'n/a';
    const candHash = result.candidate?.sha256 ? `\`${result.candidate.sha256}\`` : 'n/a';
    const same = result.reference?.sameSha256 ? 'same' : 'different';
    return `| ${result.viewport} | \`${result.screenId}\` | \`${result.variant}\` | \`${result.route}\` | \`${result.fileName}\` | ${result.candidate?.dimensions ? `${result.candidate.dimensions.width}x${result.candidate.dimensions.height}` : 'n/a'} | ${result.candidate?.bytes ?? 'n/a'} | ${candHash} | ${result.reference?.exists ? 'yes' : 'no'} | ${same} | ${refHash} | ${result.status} |`;
  });
  const sections = results.map((result) => {
    const assertionLines = result.assertions?.details
      ? Object.entries(result.assertions.details).map(([name, value]) => `  - ${name}: ${JSON.stringify(value)}`).join('\n')
      : '  - not run';
    const failuresText = result.assertions?.failures?.length
      ? result.assertions.failures.map((failure) => `  - ${failure}`).join('\n')
      : (result.error ? `  - ${result.error}` : '  - none');
    return `### ${result.viewport}/${result.screenId}/${result.variant}

- Route: \`${result.route}\`
- URL: \`${result.url}\`
- Candidate: \`${result.fileName}\`
- Reference compared: \`${result.reference?.path ?? result.reference ?? 'n/a'}\`
- HTML lang: \`${result.htmlLang ?? 'n/a'}\`
- Status: \`${result.status}\`

Assertions:
${assertionLines}

Assertion failures:
${failuresText}

Console/page/request/HTTP observations:
${formatEvents(result.events ?? {})}`;
  });
  const evidence = `# Story 12.9 non-authoritative row-sheet candidate captures

Captured ${capturedAt} from the running SunnySeat implementation. These files are **candidate review evidence only**. They do not replace or bless any authoritative reference PNG.

## Capture environment

- Application command: \`npm run dev\` from \`C:\\Users\\Rasmus\\sunnyseat\\nextjs-app\` when no reusable server was already answering.
- Capture origin and port: \`${baseUrl}\`
- Dev server: ${serverInfo.started ? `started by this script (pid ${serverInfo.pid}; logs \`${path.basename(serverInfo.stdoutPath)}\`, \`${path.basename(serverInfo.stderrPath)}\`)` : 'reused an already-running server'}
- Browser: Windows-native Playwright Chromium, headless
- Locale: \`sv-SE\`; \`Accept-Language: sv-SE,sv;q=0.9\`; \`html[lang]\` recorded per page
- Time zone: \`Europe/Stockholm\`
- Motion/color: reduced motion, light color scheme, screenshot animations disabled
- Viewports: mobile \`390x844\`, desktop \`1440x900\`, both at device scale factor 2.
- Onboarding: no preseeded localStorage; if the first-visit overlay appears, the script dismisses it through the product skip CTA after hydration and records any hydration pageError as a product observation.
- Data seam: Playwright \`page.route('${venuesMatcher}')\` fulfills a deterministic 7-venue DTO response, matching the existing Epic 10/11 E2E convention and avoiding the transient hydration-seed \`2026-05-20\` API request during screenshot capture.
- Readiness: \`domcontentloaded\`, best-effort \`networkidle\`, font readiness, explicit product selectors, and a 1s settle before screenshot. The Next development portal was hidden as non-product chrome.
- Scope: Story 12.9 row-count bottom sheet and slim mobile time slider evidence. No canonical reference PNG was overwritten.

## Candidate inventory and reference comparison

| Viewport | Screen ID | Variant | Route | Candidate | PNG dimensions | Bytes | Candidate SHA-256 | Reference exists | Candidate vs reference SHA | Reference SHA-256 | Status |
|---|---|---|---|---|---:|---:|---|---|---|---|---|
${rows.join('\n')}

## Result

- Captured: ${results.filter((r) => r.status === 'captured').length}
- Failed/assertion-failed: ${failures.length}
- Canonical refs promoted: 0
- Product errors observed: ${productEventTotals.consoleErrors} console errors, ${productEventTotals.pageErrors} page errors, ${productEventTotals.httpErrors} HTTP >=400 responses, ${productEventTotals.requestFailed} failed requests.
- Non-failing warnings observed may include Motion's reduced-motion diagnostic plus MapLibre/WebGL screenshot-time warnings. These are browser/library capture noise; product request/page failures are treated as capture failures.

${failures.length ? `Failures require investigation before human review:\n${failures.map((r) => `- ${r.viewport}/${r.screenId}/${r.variant}: ${r.error ?? r.assertions?.failures?.join('; ') ?? r.status}`).join('\n')}` : 'All candidate captures satisfied their DOM assertions before screenshot write.'}

## Per-target evidence

${sections.join('\n\n')}
`;
  await fs.writeFile(path.join(outDir, 'evidence.md'), evidence);
  await fs.writeFile(path.join(outDir, 'evidence.json'), JSON.stringify({ capturedAt, baseUrl, serverInfo, results }, null, 2));
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const server = startServerIfNeeded();
  const serverInfo = await server.start();
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const target of targets) {
      const result = await captureTarget(browser, target);
      results.push(result);
      console.log(`${result.status.toUpperCase()} ${target.viewport}/${target.screenId}/${target.variant}`);
      if (result.error) console.log(`  ${result.error}`);
      for (const failure of result.assertions?.failures ?? []) console.log(`  ${failure}`);
    }
  } finally {
    await browser.close();
    await server.stop();
  }
  await writeManifest(results, serverInfo);
  const failed = results.filter((r) => r.status !== 'captured');
  console.log(`\nCaptured ${results.length - failed.length}, failed ${failed.length}`);
  console.log(path.join(outDir, 'evidence.md'));
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
