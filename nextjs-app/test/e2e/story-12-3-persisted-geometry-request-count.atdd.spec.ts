/**
 * ATDD RED-PHASE acceptance scaffolds - Story 12.3
 * Whole-app request-count guard for persisted geometry reads.
 */

import { expect, test, type Page, type Route } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import type { GetVenuesResponse, VenueDataDto, VenueDaySeriesEntry } from '@/lib/types/api';
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
    weatherGateState: 'not_gated',
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

function stockholmDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function addDaysToDateKey(dateKey: string, days: number): string {
  const [year = '1970', month = '01', day = '01'] = dateKey.split('-');
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function swedishSelectDateLabel(dateKey: string): string {
  const [year = '1970', month = '01', day = '01'] = dateKey.split('-');
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const label = new Intl.DateTimeFormat('sv-SE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
  return `Välj ${label}`;
}

async function selectDifferentDateFromCalendar(page: Page): Promise<string> {
  const targetDate = addDaysToDateKey(stockholmDateKey(), 1);
  const planner = page.locator('[data-testid="time-slider-panel"]:visible').first();
  const trigger = planner.getByTestId('planner-date-trigger');
  await expect(trigger).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
  await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: swedishSelectDateLabel(targetDate) }).click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  return targetDate;
}

test.describe('Story 12.3 persisted geometry request-count invariants', () => {
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

    const expectedDate = await selectDifferentDateFromCalendar(page);
    expect(expectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await expect(page.locator('[data-testid="date-change-overlay"]')).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });

    expect(venues.count()).toBe(afterLoad + 1);
    expect(providerHits).toEqual([]);
  });
});
