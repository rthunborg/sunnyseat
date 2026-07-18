/**
 * ATDD RED-PHASE acceptance scaffolds - Story 12.3
 * Whole-app request-count guard for persisted geometry reads.
 */

import { expect, test, type Page, type Route } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import type { GetVenuesResponse, VenueDataDto, VenueSunStatus } from '@/lib/types/api';
import {
  PLANNER_END_MINUTES,
  PLANNER_START_MINUTES,
  PLANNER_STEP_MINUTES,
} from '@/lib/utils/time-planner';

const APP_SETTLE_TIMEOUT_MS = 15_000;
const VENUES_MATCHER = '**/api/venues?**';

async function bypassOnboarding(page: Page): Promise<void> {
  await page.addInitScript((key: string) => {
    window.sessionStorage.clear();
    window.localStorage.setItem(key, '1');
  }, ONBOARDED_FLAG_KEY);
}

async function forceMiddayTime(page: Page): Promise<void> {
  const nativeGoto = page.goto.bind(page);
  page.goto = ((url: string, options?: Parameters<typeof nativeGoto>[1]) => {
    const target = new URL(url, 'http://localhost:3000');
    if (!target.searchParams.has('_time')) target.searchParams.set('_time', '13:00');
    return nativeGoto(target.pathname + target.search + target.hash, options);
  }) as typeof page.goto;
}

async function forbidProviderFanout(page: Page): Promise<string[]> {
  const hits: string[] = [];
  await page.route('**://api.met.no/**', (route: Route) => {
    hits.push(route.request().url());
    return route.abort();
  });
  await page.route('**/api/weather/**', (route: Route) => {
    hits.push(route.request().url());
    return route.abort();
  });
  return hits;
}

function daySeries(): Array<{ minutes: number; sunExposurePercent: number; currentSunStatus: VenueSunStatus }> {
  const series: Array<{ minutes: number; sunExposurePercent: number; currentSunStatus: VenueSunStatus }> = [];
  for (let minutes = PLANNER_START_MINUTES; minutes <= PLANNER_END_MINUTES; minutes += PLANNER_STEP_MINUTES) {
    const sunlit = minutes >= 11 * 60 && minutes <= 18 * 60;
    series.push({
      minutes,
      sunExposurePercent: sunlit ? 90 : 10,
      currentSunStatus: sunlit ? 'Sunny' : 'Shaded',
    });
  }
  return series;
}

function buildVenue(id: string, name: string): VenueDataDto {
  const venue: VenueDataDto = {
    id,
    venueId: id,
    venueName: name,
    venueSlug: `venue-${id}`,
    slug: `venue-${id}`,
    neighborhood: 'Inom Vallgraven',
    location: { lat: 57.705, lng: 11.97 },
    currentSunStatus: 'Sunny',
    isPartner: true,
    confidence: 90,
    distanceMeters: 0,
    sunExposurePercent: 90,
    tags: [],
    sunWindow: { start: '11:00', end: '18:00' },
    thumbnail: { alt: name, initials: name.slice(0, 2) },
  };
  (venue as unknown as { sunDaySeries: ReturnType<typeof daySeries> }).sunDaySeries = daySeries();
  return venue;
}

function response(): GetVenuesResponse {
  return {
    venues: [buildVenue('1', 'Kafe Magasinet'), buildVenue('2', 'Solterrassen')],
    meta: {
      count: 2,
      radiusKm: 2,
      sunDataSource: 'weather',
      weatherUpdatedAt: '2026-07-18T11:00:00.000Z',
    },
    timestamp: '2026-07-18T11:00:00.000Z',
    totalCount: 2,
  };
}

async function mockVenues(page: Page): Promise<{ count: () => number; urls: () => string[] }> {
  let count = 0;
  const urls: string[] = [];
  await page.route(VENUES_MATCHER, async (route) => {
    count += 1;
    urls.push(route.request().url());
    if (count > 1) await new Promise((resolve) => setTimeout(resolve, 400));
    await route.fulfill({ json: response() });
  });
  return { count: () => count, urls: () => urls };
}

test.describe.skip('Story 12.3 persisted geometry request-count invariants', () => {
  test('same-date time scrub remains zero /api/venues requests with persisted day series', async ({ page }) => {
    const providerHits = await forbidProviderFanout(page);
    await bypassOnboarding(page);
    await forceMiddayTime(page);
    const venues = await mockVenues(page);

    await page.goto('/');
    await page.locator('[data-testid="venue-pin"]').first().waitFor({
      state: 'visible',
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    const afterLoad = venues.count();

    const slider = page.getByRole('slider').first();
    await slider.focus();
    for (let i = 0; i < 6; i++) await slider.press('ArrowRight');
    await page.waitForTimeout(500);

    expect(venues.count()).toBe(afterLoad);
    expect(providerHits).toEqual([]);
  });

  test('date change emits exactly one list request and no weather/provider burst', async ({ page }) => {
    const providerHits = await forbidProviderFanout(page);
    await bypassOnboarding(page);
    await forceMiddayTime(page);
    const venues = await mockVenues(page);

    await page.goto('/');
    await page.locator('[data-testid="venue-pin"]').first().waitFor({
      state: 'visible',
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    const afterLoad = venues.count();

    await page.getByTestId('planner-date-next').filter({ visible: true }).click();
    await expect(page.locator('[data-testid="date-change-overlay"]')).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });

    expect(venues.count()).toBe(afterLoad + 1);
    expect(providerHits).toEqual([]);
  });
});
