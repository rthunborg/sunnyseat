// One-off rebaseline capture for Story 7.1 (About page).
//
// The active MVP `about` reference PNGs were captured from the simplified
// Claude Design prototype (no hero, no TRÄFFSÄKERHET stat, single source) and
// the desktop one shows a simplified header — both predate the Story 7.1 AC1/AC2
// implementation (full page + real DesktopNavBar + the new "Om" link). This
// captures the running implementation at both viewports so the visual gate has
// an implementation-derived reference. Mirrors the feedback/review rebaseline
// pattern. DPR 2 + sv-SE to match the existing reference resolution/locale.
//
// Usage: node scripts/capture-about-rebaseline.mjs            (writes references)
//        ABOUT_REBASELINE_OUT=/tmp node scripts/capture-about-rebaseline.mjs   (dry-run to a dir)

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REF_DIR = path.resolve(__dirname, '..', 'docs', 'design', 'references', 'screens');
const OUT_BASE = process.env.ABOUT_REBASELINE_OUT || null; // null => write into REF_DIR/<viewport>/about.png

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
];

const URL = 'http://localhost:3000/about';

const browser = await chromium.launch();
for (const v of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: 2,
    locale: 'sv-SE',
    extraHTTPHeaders: { 'Accept-Language': 'sv-SE,sv;q=0.9' },
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByTestId('about-page').waitFor({ state: 'visible' });
  // Wait for the hero <img> to actually decode so the capture isn't blank.
  await page.evaluate(async () => {
    const img = document.querySelector('picture img');
    if (img && !img.complete) {
      await img.decode().catch(() => {});
    }
  });
  await page.waitForTimeout(800);
  const out = OUT_BASE
    ? path.join(OUT_BASE, `about-${v.name}.png`)
    : path.join(REF_DIR, v.name, 'about.png');
  await page.screenshot({ path: out, fullPage: false });
  console.log(`captured ${v.name}: ${out}`);
  await ctx.close();
}
await browser.close();
