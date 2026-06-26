// One-off rebaseline capture for Story 7.2 (404 / not-found page).
//
// The active `not-found` reference PNGs are UNLOGGED legacy carryover — they
// predate the 2026-05-21 MVP refresh and have no REBASELINE-LOG entry. They
// diverge from the Story 7.2 AC implementation: the mobile reference shows a
// bare pin outline (no amber-gold rounded-square tile, which AC1 mandates), and
// the desktop reference shows a stale full-search navbar (the live DesktopNavBar
// has since gained the "Om" link/filter chips, and its venue-search combobox
// cannot mount on the root 404 — it depends on the map/search/time contexts that
// only exist inside the `[locale]` tree). This captures the running
// implementation at both viewports so the visual gate has an implementation-
// derived reference. Mirrors the Story 7.1 about/navbar rebaseline pattern.
// DPR 2 + sv-SE to match the existing reference resolution/locale.
//
// Usage: node scripts/capture-not-found-rebaseline.mjs            (writes references)
//        NOT_FOUND_REBASELINE_OUT=/tmp node scripts/capture-not-found-rebaseline.mjs   (dry-run to a dir)

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REF_DIR = path.resolve(__dirname, '..', 'docs', 'design', 'references', 'screens');
const OUT_BASE = process.env.NOT_FOUND_REBASELINE_OUT || null; // null => write into REF_DIR/<viewport>/not-found.png

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
];

// Deliberately-invalid path (Screen ID → Route Map) so Next.js renders the
// global app/not-found.tsx boundary.
const URL = 'http://localhost:3000/__sunnyseat-invalid';

const browser = await chromium.launch();
for (const v of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: 2,
    locale: 'sv-SE',
    extraHTTPHeaders: { 'Accept-Language': 'sv-SE,sv;q=0.9' },
  });
  const page = await ctx.newPage();
  // The route returns HTTP 404 by design; Playwright still renders the body.
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByTestId('not-found-page').waitFor({ state: 'visible' });
  // Settle the one-shot pin float so the capture is stable.
  await page.waitForTimeout(800);
  const out = OUT_BASE
    ? path.join(OUT_BASE, `not-found-${v.name}.png`)
    : path.join(REF_DIR, v.name, 'not-found.png');
  await page.screenshot({ path: out, fullPage: false });
  console.log(`captured ${v.name}: ${out}`);
  await ctx.close();
}
await browser.close();
