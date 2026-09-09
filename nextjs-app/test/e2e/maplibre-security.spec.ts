import { expect, test } from '@playwright/test';
import { FIRST_RUN_GUIDE_SEEN_KEY, ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

test('local module worker renders geometry and strips consecutive unsafe attribution attributes', async ({ page }, testInfo) => {
  const errors: string[] = [];
  const workers: string[] = [];
  const unexpectedRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('worker', (worker) => workers.push(worker.url()));
  await page.addInitScript(({ onboarded, guide }) => {
    localStorage.setItem(onboarded, '1');
    localStorage.setItem(guide, '1');
  }, { onboarded: ONBOARDED_FLAG_KEY, guide: FIRST_RUN_GUIDE_SEEN_KEY });

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === 'tiles.openfreemap.org' && url.pathname === '/styles/positron') {
      await route.fulfill({ json: {
        version: 8,
        sources: {
          openmaptiles: {
            type: 'geojson',
            attribution: '<details open onload="window.__attributionExecuted=true" ontoggle="window.__attributionExecuted=true">Safe attribution</details>',
            data: { type: 'FeatureCollection', features: [{
              type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [11.9746, 57.7089] },
            }] },
          },
        },
        layers: [{ id: 'fixture-point', type: 'circle', source: 'openmaptiles' }],
      } });
      return;
    }
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      if (url.pathname.startsWith('/api/venues')) {
        await route.fulfill({ json: {
          venues: [], totalCount: 0, timestamp: '2026-06-21T10:00:00Z', meta: { isDaytime: true },
        } });
      } else await route.continue();
      return;
    }
    unexpectedRequests.push(url.origin);
    await route.abort();
  });

  await page.goto('/?_time=13:00');
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  await expect(page.getByTestId('map-tile-paint-cover')).toHaveCount(0);
  const attribution = page.locator('.maplibregl-ctrl-attrib-inner');
  await expect(attribution).toContainText('Safe attribution');
  await expect(attribution.locator('[onload], [ontoggle]')).toHaveCount(0);
  await attribution.locator('details').evaluate((element) => element.dispatchEvent(new Event('toggle')));
  expect(await page.evaluate(() => '__attributionExecuted' in window)).toBe(false);
  expect(workers.some((url) => url.includes('/vendor/maplibre/') && url.endsWith('/maplibre-gl-worker.mjs'))).toBe(true);
  expect(errors).toEqual([]);
  expect(unexpectedRequests).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath(`${testInfo.project.name}-maplibre-security.png`) });
});
