import { expect, test, type Page, type Route } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import type { GetVenueDetailResponse, GetVenuesResponse, VenueDataDto, VenueDaySeriesEntry } from '@/lib/types/api';
import {
  PLANNER_END_MINUTES,
  PLANNER_START_MINUTES,
  PLANNER_STEP_MINUTES,
} from '@/lib/utils/time-planner';

const APP_SETTLE_TIMEOUT_MS = 15_000;
const LIST_MATCHER = '**/api/venues?**';
const DETAIL_MATCHER = /\/api\/venues\/(?!.*\/feedback)([^/?#]+)(?:\?.*)?$/;

async function bypassOnboarding(page: Page): Promise<void> {
  await page.addInitScript((key: string) => {
    window.sessionStorage.clear();
    window.localStorage.setItem(key, '1');
  }, ONBOARDED_FLAG_KEY);
}

async function forbidLiveMetno(page: Page): Promise<string[]> {
  const hits: string[] = [];
  await page.route('**://api.met.no/**', (route: Route) => {
    hits.push(route.request().url());
    return route.abort();
  });
  return hits;
}

function daySeries(): VenueDaySeriesEntry[] {
  const series: VenueDaySeriesEntry[] = [];
  for (let minutes = PLANNER_START_MINUTES; minutes <= PLANNER_END_MINUTES; minutes += PLANNER_STEP_MINUTES) {
    const sunlit = minutes >= 11 * 60 && minutes <= 18 * 60;
    series.push({
      minutes,
      sunExposurePercent: sunlit ? 90 : 10,
      currentSunStatus: sunlit ? 'Sunny' : 'Shaded',
      weatherGateState: 'not_gated',
    });
  }
  return series;
}

function venue(id: number): VenueDataDto {
  const data: VenueDataDto = {
    id: String(id),
    venueId: String(id),
    venueName: `Prefetch Venue ${id}`,
    venueSlug: `prefetch-venue-${id}`,
    slug: `prefetch-venue-${id}`,
    neighborhood: 'Inom Vallgraven',
    location: { lat: 57.705 + id / 10_000, lng: 11.97 + id / 10_000 },
    currentSunStatus: 'Sunny',
    weatherGateState: 'not_gated',
    isPartner: false,
    confidence: 90,
    distanceMeters: id * 20,
    sunExposurePercent: 90,
    tags: [],
    sunWindow: { start: '11:00', end: '18:00' },
    thumbnail: { alt: `Prefetch Venue ${id}`, initials: `P${id}` },
  };
  (data as VenueDataDto & { sunDaySeries: VenueDaySeriesEntry[] }).sunDaySeries = daySeries();
  return data;
}

function listResponse(count = 8): GetVenuesResponse {
  return {
    venues: Array.from({ length: count }, (_, index) => venue(index + 1)),
    meta: {
      count,
      radiusKm: 1.5,
      sunDataSource: 'weather',
      weatherUpdatedAt: '2026-07-27T11:00:00.000Z',
    },
    timestamp: '2026-07-27T11:00:00.000Z',
    totalCount: count,
  };
}

function detailResponse(slug: string): GetVenueDetailResponse {
  const match = slug.match(/(\d+)$/);
  const id = match ? Number(match[1]) : 1;
  return {
    venue: {
      ...venue(id),
      description: `Loaded detail for ${slug}`,
      address: 'Tredje Långgatan 9, Göteborg',
      openingHours: {
        '1': { open: '11:00', close: '22:00' },
        '2': { open: '11:00', close: '22:00' },
        '3': { open: '11:00', close: '22:00' },
        '4': { open: '11:00', close: '22:00' },
        '5': { open: '11:00', close: '22:00' },
        '6': { open: '11:00', close: '22:00' },
        '7': { open: '11:00', close: '22:00' },
      },
      timeline: {
        timezone: 'Europe/Stockholm',
        range: { start: '06:00', end: '21:00' },
        windows: [{ start: '11:00', end: '18:00', status: 'Sunny' }],
        peakTime: '14:00',
      },
    },
    timestamp: '2026-07-27T11:00:00.000Z',
  };
}

async function mockListAndDetail(page: Page): Promise<{
  listCount: () => number;
  detailCount: () => number;
  detailUrls: () => string[];
  maxConcurrentDetails: () => number;
}> {
  let lists = 0;
  let details = 0;
  let inFlightDetails = 0;
  let maxConcurrent = 0;
  const detailUrls: string[] = [];

  await page.route(LIST_MATCHER, async (route) => {
    lists += 1;
    await route.fulfill({ json: listResponse() });
  });

  await page.route(DETAIL_MATCHER, async (route) => {
    details += 1;
    inFlightDetails += 1;
    maxConcurrent = Math.max(maxConcurrent, inFlightDetails);
    detailUrls.push(route.request().url());
    const slug = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    await route.fulfill({ json: detailResponse(decodeURIComponent(slug)) });
    inFlightDetails -= 1;
  });

  return {
    listCount: () => lists,
    detailCount: () => details,
    detailUrls: () => [...detailUrls],
    maxConcurrentDetails: () => maxConcurrent,
  };
}

test.describe('Story 12.10 ATDD - detail prefetch request-count behavior', () => {
  test.skip('[P0] initial settled surface prefetches at most six detail keys with concurrency two and exact planner params', async ({ page }) => {
    const metnoHits = await forbidLiveMetno(page);
    await bypassOnboarding(page);
    const network = await mockListAndDetail(page);

    await page.goto('/?_time=14:00');
    await page.locator('[data-testid="venue-pin"]').first().waitFor({
      state: 'visible',
      timeout: APP_SETTLE_TIMEOUT_MS,
    });

    await expect.poll(() => network.detailCount(), { timeout: APP_SETTLE_TIMEOUT_MS }).toBe(6);
    expect(network.maxConcurrentDetails()).toBeLessThanOrEqual(2);
    expect(network.detailUrls().map((url) => new URL(url).pathname.split('/').pop())).toEqual([
      'prefetch-venue-1',
      'prefetch-venue-2',
      'prefetch-venue-3',
      'prefetch-venue-4',
      'prefetch-venue-5',
      'prefetch-venue-6',
    ]);
    for (const url of network.detailUrls()) {
      const params = new URL(url).searchParams;
      expect(params.get('date')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(params.get('time')).toBe('14:00');
      expect(params.get('lat')).toMatch(/^-?\d+\.\d{4}$/);
      expect(params.get('lng')).toMatch(/^-?\d+\.\d{4}$/);
    }
    expect(network.listCount()).toBe(1);
    expect(metnoHits).toEqual([]);
  });

  test.skip('[P0] same-date scrub and planner-date change do not restart detail prefetch after the first pass settles', async ({ page }) => {
    await forbidLiveMetno(page);
    await bypassOnboarding(page);
    const network = await mockListAndDetail(page);

    await page.goto('/?_time=14:00');
    await page.locator('[data-testid="venue-pin"]').first().waitFor({
      state: 'visible',
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    await expect.poll(() => network.detailCount(), { timeout: APP_SETTLE_TIMEOUT_MS }).toBe(6);
    const detailsAfterInitialPass = network.detailCount();
    const listsAfterInitialPass = network.listCount();

    const slider = page.getByRole('slider').first();
    await slider.focus();
    await slider.press('ArrowRight');
    await expect.poll(() => network.detailCount(), { timeout: 750 }).toBe(detailsAfterInitialPass);
    expect(network.listCount()).toBe(listsAfterInitialPass);

    await page.getByTestId('planner-date-trigger').click();
    await page.getByRole('button', { name: /Välj / }).nth(1).click();
    await expect.poll(() => network.listCount(), { timeout: APP_SETTLE_TIMEOUT_MS }).toBe(listsAfterInitialPass + 1);
    await expect.poll(() => network.detailCount(), { timeout: 750 }).toBe(detailsAfterInitialPass);
  });

  test.skip('[P0] Mer info for a warmed candidate opens from cache and an unwarmed candidate uses the existing busy shell', async ({ page }) => {
    await bypassOnboarding(page);
    const network = await mockListAndDetail(page);

    await page.goto('/?_time=14:00');
    await page.locator('[data-testid="venue-pin"]').first().waitFor({
      state: 'visible',
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    await expect.poll(() => network.detailCount(), { timeout: APP_SETTLE_TIMEOUT_MS }).toBe(6);

    await page.getByRole('button', { name: /Prefetch Venue 1/ }).click();
    await page.getByRole('button', { name: /Mer info/i }).click();
    expect(network.detailCount()).toBe(6);
    await expect(page.getByRole('heading', { name: 'Prefetch Venue 1' })).toBeVisible();

    await page.getByRole('button', { name: /Stäng/i }).click();
    await page.getByRole('button', { name: /Prefetch Venue 8/ }).click();
    await page.getByRole('button', { name: /Mer info/i }).click();
    await expect(page.getByRole('article', { name: 'Prefetch Venue 8' })).toHaveAttribute('aria-busy', 'true');
    await expect.poll(() => network.detailCount(), { timeout: APP_SETTLE_TIMEOUT_MS }).toBe(7);
  });
});
