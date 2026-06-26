// capture-claude-design-refs.mjs
// Drives the Claude Design HTML prototypes to specific screen-states and saves
// Playwright screenshots into nextjs-app/docs/design/references/screens/{viewport}/.
// These PNGs are the inputs the visual validation gate compares against.
//
// Usage:
//   cd nextjs-app
//   npx playwright install chromium     # first run only
//   node scripts/capture-claude-design-refs.mjs                 # capture all MVP states
//   node scripts/capture-claude-design-refs.mjs map-primary     # capture only specified screen IDs
//
// How it drives state:
//   - SUNNY_DEFAULTS overrides:  set window.SUNNY_DEFAULTS before page load
//                                (controls hour, mapStyle, variant)
//   - localStorage seeding:      pre-populates sunny_screen, sunny_favs, etc.
//   - Tweaks panel:              activated via postMessage('__activate_edit_mode'),
//                                buttons clicked by label, then deactivated before screenshot.
//                                Feedback/review/empty states are reachable
//                                this way without modifying the prototype source.
//   - Direct UI clicks:          for pin selection ([data-pin]), bottom-sheet expansion, etc.
//
// To add a new state recipe: add an entry to RECIPES below.
//
// IMPORTANT: this script writes to docs/design/references/screens/{mobile,desktop}/
// (NOT to .../legacy/). The legacy/ folder holds the original Figma exports kept
// only for font sampling and screens the prototype does not cover.
//
// AUDIT TRAIL: any change to a recipe in this file (add / remove / edit), and
// any time the active reference PNG is replaced manually (typically promoted
// from legacy/), MUST land an entry in:
//   nextjs-app/docs/design/references/REBASELINE-LOG.md
// — same operation. The log is what tells the next dev agent why the active
// reference might diverge from a fresh prototype capture. See CLAUDE.md
// §"Critical rules" for the full re-baseline rule.

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import http from 'http';
import fsSync from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NEXTJS_ROOT = path.resolve(__dirname, '..');
const PROTOTYPES_DIR = path.resolve(NEXTJS_ROOT, 'docs/design/references/claude-design/project');
const REF_DIR = path.resolve(NEXTJS_ROOT, 'docs/design/references/screens');

const PROTO = {
  mvpMobile: 'SunnySeat MVP Mobile Unlocked.html',
  mvpDesktop: 'SunnySeat MVP Desktop Unlocked.html',
};

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
};

// Recipe shape:
//   screenId      Output filename: docs/design/references/screens/{viewport}/{screenId}.png
//   viewport      'mobile' | 'desktop' — drives the Playwright viewport.
//   prototype     Filename inside docs/design/references/claude-design/project/.
//   localStorage  Map of localStorage keys to seed before the page loads.
//   defaults      Overrides merged into window.SUNNY_DEFAULTS before page load.
//   steps         Sequence of:
//                   { wait: ms }
//                   { click: 'css selector' }
//                   { clickText: 'visible text' }   — convenience for label clicks
//                   { clickXY: [x, y] }             — viewport-coordinate click (last resort)
//                   { tweaks: 'button-label' }      — opens Tweaks, clicks the labelled button,
//                                                     then closes Tweaks. MVP mobile labels:
//                                                       'Datum', 'Feedback', 'Recension', 'Tomt'.
//                                                     MVP desktop labels:
//                                                       'Onboarding', 'Planner'.
//   skip          Truthy = recipe is documented but not yet wired (logged + skipped).
const RECIPES = [
  // ─── MVP Mobile · top-level screens (localStorage-driven) ──────────────────
  {
    screenId: 'onboarding',
    viewport: 'mobile',
    prototype: PROTO.mvpMobile,
    // No localStorage seed → onboarding is the default screen.
  },
  {
    screenId: 'map-primary',
    viewport: 'mobile',
    prototype: PROTO.mvpMobile,
    localStorage: { sunny_screen: 'map' },
  },
  {
    screenId: 'map-panel-venues',
    viewport: 'mobile',
    prototype: PROTO.mvpMobile,
    localStorage: { sunny_screen: 'map' },
    // BottomSheet starts in 'mid' state. The drag handle is a 26-tall div at the
    // top of the sheet with `onClick={cycle}`. For a 390x844 viewport, mid sheet
    // height = 320 + footer 52, so the handle sits ~y=485 (vertical centre).
    // We click it twice to advance peek -> mid -> full. (Already at mid by default,
    // so one click goes mid -> full.)
    steps: [
      { wait: 600 },
      { clickXY: [195, 485] },
      { wait: 500 },
    ],
  },
  {
    screenId: 'map-with-selected-venue',
    viewport: 'mobile',
    prototype: PROTO.mvpMobile,
    localStorage: { sunny_screen: 'map' },
    steps: [
      { wait: 500 },
      { click: '[data-pin]' },         // pick the first pin
      { wait: 300 },
    ],
  },
  {
    screenId: 'venue-detail',
    viewport: 'mobile',
    prototype: PROTO.mvpMobile,
    localStorage: { sunny_screen: 'map' },
    // The QuickInfo popover (after clicking a pin) has 4 buttons; the one that
    // opens VenueDetail is the white "Mer info" button (calls `onOpen`).
    steps: [
      { wait: 500 },
      { click: '[data-pin]' },
      { wait: 400 },
      { clickText: 'Mer info' },
      { wait: 600 },
    ],
  },

  // ─── MVP Mobile · modal flows (Tweaks/direct UI driven) ────────────────────
  {
    screenId: 'feedback',
    viewport: 'mobile',
    prototype: PROTO.mvpMobile,
    localStorage: { sunny_screen: 'map' },
    steps: [{ wait: 400 }, { tweaks: 'Feedback' }, { wait: 400 }],
    skip:
      'Story 3.2 rebaselined feedback to the inline venue-detail sun accuracy prompt; MVP prototype Tweaks -> Feedback still renders obsolete general feedback modal.',
  },
  {
    screenId: 'review',
    viewport: 'mobile',
    prototype: PROTO.mvpMobile,
    localStorage: { sunny_screen: 'map' },
    steps: [{ wait: 400 }, { tweaks: 'Recension' }, { wait: 400 }],
    skip:
      'Story 3.3 rebaselined review to the inline venue-detail ReviewForm; MVP prototype Tweaks -> Recension still renders obsolete required-rating/tag modal.',
  },
  {
    screenId: 'about',
    viewport: 'mobile',
    prototype: PROTO.mvpMobile,
    localStorage: { sunny_screen: 'map' },
    steps: [
      { wait: 400 },
      { click: 'button[title="Inställningar"]' },
      { wait: 250 },
      { clickText: 'Om SunnySeat' },
      { wait: 500 },
    ],
    skip:
      'Story 7.1 rebaselined about to the standalone /about route implementation (hero, ALGORITMEN/DATAKÄLLOR/TRÄFFSÄKERHET count-up, contact + privacy link); the MVP prototype Settings -> Om SunnySeat renders an obsolete simplified screen (no hero, no accuracy stat). Re-baseline via scripts/capture-about-rebaseline.mjs against the running app.',
  },
  {
    screenId: 'favourites-tab',
    viewport: 'mobile',
    prototype: PROTO.mvpMobile,
    localStorage: { sunny_screen: 'map', sunny_favs: '["mariatorget","tjoget"]' },
    steps: [
      { wait: 500 },
      { clickText: 'Favoriter' },
      { wait: 400 },
    ],
  },

  // ─── MVP Desktop · top-level screens ───────────────────────────────────────
  {
    screenId: 'map-primary',
    viewport: 'desktop',
    prototype: PROTO.mvpDesktop,
  },
  {
    screenId: 'venue-detail',
    viewport: 'desktop',
    prototype: PROTO.mvpDesktop,
    steps: [
      { wait: 500 },
      { click: '[data-pin]' },
      { wait: 400 },
      { clickText: 'Mer info' },
      { wait: 600 },
    ],
  },
  {
    screenId: 'about',
    viewport: 'desktop',
    prototype: PROTO.mvpDesktop,
    steps: [
      { wait: 400 },
      { click: 'button[title="Inställningar"]' },
      { wait: 250 },
      { clickText: 'Om SunnySeat' },
      { wait: 500 },
    ],
    skip:
      'Story 7.1 rebaselined about to the standalone /about route implementation (full DesktopNavBar incl. the new "Om" link, hero, sections, count-up, footer); the MVP prototype Settings -> Om SunnySeat renders an obsolete simplified screen. Re-baseline via scripts/capture-about-rebaseline.mjs against the running app.',
  },
  {
    screenId: 'favourites-tab',
    viewport: 'desktop',
    prototype: PROTO.mvpDesktop,
    steps: [{ wait: 400 }, { clickText: 'Favoriter' }, { wait: 400 }],
  },

  // ─── Screens NOT covered by MVP Unlocked prototypes ────────────────────────
  // desktop onboarding: intentionally preserved as the existing curated
  // implementation-derived baseline until Rasmus accepts a new desktop-specific
  // onboarding design. See REBASELINE-LOG.md 2026-05-04 entries.
  // not-found: Story 7.2 rebaselined both references to the routed /not-found
  // implementation (amber-gold pin tile + heading + map CTA; desktop = bespoke
  // minimal navbar). The prototype "Tomt" modal is an empty venue/search state,
  // not the routed app 404 page, so there is no prototype recipe here. Re-baseline
  // via scripts/capture-not-found-rebaseline.mjs against the running app.
  // map-primary-offline: needs its first implementation-driven baseline when the
  // offline shell story lands.
  // premium/paywall/payment/recovery: Future Monetization only. Existing active
  // PNGs are retained as archived future references but are not regenerated by
  // this MVP capture script.
];

// ─── Tweaks panel control ───────────────────────────────────────────────────
// Mobile prototypes listen for window.parent.postMessage('__activate_edit_mode'),
// so we have to dispatch the message *as if it came from the parent*. From a
// Playwright page that means dispatching a synthetic MessageEvent on window.
async function activateTweaks(page) {
  await page.evaluate(() => {
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: '__activate_edit_mode' },
    }));
  });
  await page.waitForTimeout(250);
}
async function deactivateTweaks(page) {
  await page.evaluate(() => {
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: '__deactivate_edit_mode' },
    }));
  });
  await page.waitForTimeout(250);
}

async function clickTweaksButton(page, label) {
  await activateTweaks(page);
  // Tweaks has fixed bottom-right positioning with z-index 200; the button is
  // identified by its visible label.
  await page.locator(`button:has-text("${label}")`).first().click();
  await page.waitForTimeout(300);
  await deactivateTweaks(page);
}

// ─── Capture a single recipe ────────────────────────────────────────────────
// We serve the prototype directory over a tiny local HTTP server because
// Babel-standalone fetches `type="text/babel"` script sources via XHR, and
// Chromium blocks those XHRs when the page is loaded from `file://`.
function startStaticServer(rootDir) {
  const mimes = {
    '.html': 'text/html; charset=utf-8',
    '.jsx':  'text/javascript; charset=utf-8',
    '.js':   'text/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.png':  'image/png',
    '.svg':  'image/svg+xml',
    '.json': 'application/json',
  };
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const target = path.normalize(path.join(rootDir, urlPath));
    if (!target.startsWith(rootDir)) {
      res.writeHead(403); return res.end();
    }
    fsSync.stat(target, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404); return res.end();
      }
      const ext = path.extname(target).toLowerCase();
      res.writeHead(200, { 'Content-Type': mimes[ext] || 'application/octet-stream' });
      fsSync.createReadStream(target).pipe(res);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function captureOne(browser, recipe, baseUrl) {
  const viewport = VIEWPORTS[recipe.viewport];
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();

  if (recipe.localStorage) {
    await page.addInitScript((entries) => {
      for (const [k, v] of Object.entries(entries)) {
        localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      }
    }, recipe.localStorage);
  }
  if (recipe.defaults) {
    await page.addInitScript((d) => {
      window.SUNNY_DEFAULTS = { ...(window.SUNNY_DEFAULTS || {}), ...d };
    }, recipe.defaults);
  }

  const url = `${baseUrl}/${encodeURIComponent(recipe.prototype)}`;
  await page.goto(url, { waitUntil: 'networkidle' });

  // Babel-standalone compiles JSX in the browser; the #root mounts after
  // networkidle. Wait for first child before continuing.
  await page.waitForFunction(
    () => document.querySelector('#root')?.children.length > 0,
    { timeout: 15_000 }
  );

  for (const step of recipe.steps ?? []) {
    if (step.wait) await page.waitForTimeout(step.wait);
    if (step.click) await page.locator(step.click).first().click();
    if (step.clickText) await page.locator(`text=${step.clickText}`).first().click();
    if (step.clickXY) await page.mouse.click(step.clickXY[0], step.clickXY[1]);
    if (step.hover) await page.locator(step.hover).first().hover();
    if (step.tweaks) await clickTweaksButton(page, step.tweaks);
  }

  // Final settle so entrance animations end before screenshot.
  await page.waitForTimeout(500);

  const dest = path.resolve(REF_DIR, recipe.viewport, `${recipe.screenId}.png`);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await page.screenshot({ path: dest, fullPage: false });

  await ctx.close();
  return dest;
}

async function main() {
  const filter = process.argv.slice(2);
  const recipes = filter.length
    ? RECIPES.filter((r) => filter.includes(r.screenId))
    : RECIPES;

  if (!recipes.length) {
    console.error(`No recipes match: ${filter.join(', ')}`);
    process.exit(1);
  }

  const { server, baseUrl } = await startStaticServer(PROTOTYPES_DIR);
  const browser = await chromium.launch();
  const results = { ok: [], skipped: [], failed: [] };

  try {
    for (const recipe of recipes) {
      const tag = `${recipe.screenId}/${recipe.viewport}`;
      if (recipe.skip) {
        console.log(`SKIP  ${tag}  (recipe needs verification — see comments)`);
        results.skipped.push(tag);
        continue;
      }
      try {
        const dest = await captureOne(browser, recipe, baseUrl);
        console.log(`OK    ${tag}  ->  ${path.relative(NEXTJS_ROOT, dest)}`);
        results.ok.push(tag);
      } catch (err) {
        console.error(`FAIL  ${tag}  ${err.message}`);
        results.failed.push(tag);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\nCaptured ${results.ok.length}, skipped ${results.skipped.length}, failed ${results.failed.length}`);
  if (results.failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
