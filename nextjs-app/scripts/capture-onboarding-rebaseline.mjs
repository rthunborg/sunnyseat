// One-off rebaseline capture for Story 1.5 Round 1 review patches.
// Captures the implementation's Swedish onboarding overlay at both
// viewports with `Accept-Language: sv-SE,sv` so locale negotiation
// resolves to Swedish (Playwright's default `Accept-Language: en-US`
// would otherwise produce English captures — see deferred-work.md
// "Investigate why Accept-Language is not honoured" entry).
//
// Usage: node scripts/capture-onboarding-rebaseline.mjs

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REF_DIR = path.resolve(__dirname, '..', 'docs', 'design', 'references', 'screens');

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
];

const URL = 'http://localhost:3000/?_state=onboarding';

const browser = await chromium.launch();
for (const v of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: 1,
    locale: 'sv-SE',
    extraHTTPHeaders: { 'Accept-Language': 'sv-SE,sv;q=0.9' },
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const out = path.join(REF_DIR, v.name, 'onboarding.png');
  await page.screenshot({ path: out, fullPage: false });
  console.log(`captured ${v.name}: ${out}`);
  await ctx.close();
}
await browser.close();
