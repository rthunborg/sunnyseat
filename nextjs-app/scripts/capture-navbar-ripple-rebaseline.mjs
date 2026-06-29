// One-off rebaseline capture for the Story 7.1 DesktopNavBar "Om" link ripple.
//
// Adding the "Om" → /about link to the shared DesktopNavBar changes the top
// nav on every desktop screen, so the implementation-derived desktop reference
// PNGs that include the navbar drift. This re-captures them from the running
// implementation. Desktop viewport only (the navbar is desktop chrome).
//
// Usage: node scripts/capture-navbar-ripple-rebaseline.mjs
//        NAVBAR_REBASELINE_OUT=/tmp node scripts/capture-navbar-ripple-rebaseline.mjs  (dry-run)

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REF_DIR = path.resolve(__dirname, '..', 'docs', 'design', 'references', 'screens', 'desktop');
const OUT_BASE = process.env.NAVBAR_REBASELINE_OUT || null;

const SCREENS = [
  {
    id: 'map-primary',
    route: '/?_time=16:30',
    favourites: false,
    wait: '[data-testid="venue-pin"]',
  },
  {
    id: 'venue-detail',
    route: '/?venue=test-venue-sunny&_state=venue-detail&_time=16:30',
    favourites: false,
    wait: '[data-testid="desktop-venue-detail-panel"]',
  },
  {
    id: 'favourites-tab',
    route: '/favoriter?_state=favourites-tab&_time=14:00',
    favourites: true,
    wait: '[data-testid="desktop-venue-list-panel"] [data-testid="venue-card"]',
  },
];

const browser = await chromium.launch();
for (const s of SCREENS) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: 'sv-SE',
    extraHTTPHeaders: { 'Accept-Language': 'sv-SE,sv;q=0.9' },
  });
  await ctx.addInitScript((withFavs) => {
    window.localStorage.setItem('sunnyseat_onboarded', '1');
    if (withFavs) window.localStorage.setItem('sunnyseat_favourite_ids', '["1","2"]');
  }, s.favourites);
  const page = await ctx.newPage();
  await page.goto(`http://localhost:3000${s.route}`, { waitUntil: 'networkidle' });
  try {
    await page.locator(s.wait).first().waitFor({ state: 'visible', timeout: 15000 });
  } catch {
    console.log(`WARN ${s.id}: wait selector "${s.wait}" not visible in time`);
  }
  await page.waitForTimeout(1200);
  const out = OUT_BASE
    ? path.join(OUT_BASE, `ripple-${s.id}.png`)
    : path.join(REF_DIR, `${s.id}.png`);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`captured ${s.id}: ${out}`);
  await ctx.close();
}
await browser.close();
