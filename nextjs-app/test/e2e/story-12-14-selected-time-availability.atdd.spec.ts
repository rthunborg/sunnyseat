/**
 * Story 12.14 ATDD - selected-time availability filtering.
 *
 * This spec complements the standing request-count e2e guards from Stories
 * 11.8, 12.3, and 12.10 by proving the user-visible selected-time policy with
 * deterministic mocked DTOs: closed discovery venues disappear, exact closed
 * search matches stay labelled/actionable, and saved closed favourites stay
 * inspectable without restoring a map pin.
 */

import { expect, test, type Page, type Route } from '@playwright/test';
import { FIRST_RUN_GUIDE_SEEN_KEY, ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import { FAVOURITES_STORAGE_KEY } from '@/lib/services/favourites-storage';
import type {
  GetVenueDetailResponse,
  GetVenuesResponse,
  VenueDataDto,
  VenueDaySeriesEntry,
  VenueDetailDto,
} from '@/lib/types/api';
import {
  PLANNER_END_MINUTES,
  PLANNER_START_MINUTES,
  PLANNER_STEP_MINUTES,
} from '@/lib/utils/time-planner';

const APP_SETTLE_TIMEOUT_MS = 15_000;
const VENUES_MATCHER = '**/api/venues?**';
const CLOSED_NAME = 'Kvällskafeet';
const CLOSED_SLUG = 'closed-evening';
const CLOSED_LABEL = 'Stängt vid vald tid';

type OpeningHours = NonNullable<VenueDataDto['openingHours']>;

async function seedShell(page: Page, favouriteIds?: string[]): Promise<void> {
  await page.addInitScript(
    ({ onboardedKey, guideSeenKey, favouritesKey, ids }) => {
      window.sessionStorage.clear();
      window.localStorage.setItem(onboardedKey, '1');
      window.localStorage.setItem(guideSeenKey, '1');
      if (ids) window.localStorage.setItem(favouritesKey, JSON.stringify(ids));
    },
    {
      onboardedKey: ONBOARDED_FLAG_KEY,
      guideSeenKey: FIRST_RUN_GUIDE_SEEN_KEY,
      favouritesKey: FAVOURITES_STORAGE_KEY,
      ids: favouriteIds,
    },
  );
}

async function forceSelectedTime(page: Page, time: string): Promise<void> {
  const nativeGoto = page.goto.bind(page);
  page.goto = ((url: string, options?: Parameters<typeof nativeGoto>[1]) => {
    const target = new URL(url, 'http://localhost:3000');
    if (!target.searchParams.has('_time')) target.searchParams.set('_time', time);
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

function everyDay(open: string, close: string): OpeningHours {
  return {
    '1': { open, close },
    '2': { open, close },
    '3': { open, close },
    '4': { open, close },
    '5': { open, close },
    '6': { open, close },
    '7': { open, close },
  };
}

function daySeries(): VenueDaySeriesEntry[] {
  const series: VenueDaySeriesEntry[] = [];
  for (let minutes = PLANNER_START_MINUTES; minutes <= PLANNER_END_MINUTES; minutes += PLANNER_STEP_MINUTES) {
    series.push({
      minutes,
      sunExposurePercent: 90,
      currentSunStatus: 'Sunny',
      weatherGateState: 'not_gated',
    });
  }
  return series;
}

function venue(
  id: string,
  name: string,
  slug: string,
  openingHours?: OpeningHours,
): VenueDataDto {
  return {
    id,
    venueId: id,
    venueName: name,
    venueSlug: slug,
    slug,
    neighborhood: 'Inom Vallgraven',
    location: { lat: 57.705 + Number(id) / 1000, lng: 11.97 + Number(id) / 1000 },
    currentSunStatus: 'Sunny',
    weatherGateState: 'not_gated',
    isPartner: true,
    confidence: 90,
    distanceMeters: 120,
    sunExposurePercent: 90,
    tags: ['Innergård'],
    sunWindow: { start: '09:00', end: '18:00' },
    sunDaySeries: daySeries(),
    ...(openingHours === undefined ? {} : { openingHours }),
    thumbnail: { alt: `${name} uteservering`, initials: name.slice(0, 2) },
  };
}

const OPEN_VENUE = venue('1', 'Morgonöppet', 'morning-open', everyDay('08:00', '17:00'));
const CLOSED_VENUE = venue('2', CLOSED_NAME, CLOSED_SLUG, everyDay('11:00', '22:00'));
const UNKNOWN_VENUE = venue('3', 'Okända timmar', 'unknown-hours');

function venuesResponse(): GetVenuesResponse {
  return {
    venues: [OPEN_VENUE, CLOSED_VENUE, UNKNOWN_VENUE],
    meta: {
      count: 3,
      radiusKm: 2,
      sunDataSource: 'weather',
      weatherUpdatedAt: '2026-08-06T07:00:00.000Z',
    },
    timestamp: '2026-08-06T07:00:00.000Z',
    totalCount: 3,
  };
}

function detailResponse(base: VenueDataDto): GetVenueDetailResponse {
  const detail: VenueDetailDto = {
    ...base,
    description: `${base.venueName} har en testad uteservering.`,
    address: 'Magasinsgatan 1, Göteborg',
    timeline: {
      timezone: 'Europe/Stockholm',
      range: { start: '06:00', end: '21:00' },
      windows: [
        {
          start: '09:00',
          end: '18:00',
          status: 'Sunny',
          weatherGateState: 'not_gated',
        },
      ],
      peakTime: '13:00',
    },
  };
  return {
    venue: detail,
    meta: {
      sunDataSource: 'weather',
      weatherUpdatedAt: '2026-08-06T07:00:00.000Z',
    },
    timestamp: '2026-08-06T07:00:00.000Z',
  };
}

async function mockVenues(page: Page): Promise<void> {
  await page.route(`**/api/venues/${CLOSED_SLUG}*`, async (route: Route) => {
    await route.fulfill({ json: detailResponse(CLOSED_VENUE) });
  });
  await page.route('**/api/venues/morning-open*', async (route: Route) => {
    await route.fulfill({ json: detailResponse(OPEN_VENUE) });
  });
  await page.route(VENUES_MATCHER, async (route: Route) => {
    await route.fulfill({ json: venuesResponse() });
  });
}

function closedPin(page: Page) {
  return page.locator(`[data-testid="venue-pin"][aria-label*="${CLOSED_NAME}"]`);
}

function visibleSearchInput(page: Page) {
  return page.locator('input[aria-label="Sök plats"]:visible').first();
}

function visibleDetailPanel(page: Page) {
  return page
    .locator('[data-testid="mobile-venue-detail-sheet"]:visible, [data-testid="desktop-venue-detail-panel"]:visible')
    .filter({ hasText: CLOSED_NAME })
    .first();
}

test.describe('Story 12.14 selected-time availability', () => {
  test('discovery hides closed venues but exact closed search opens labelled detail', async ({ page }) => {
    const providerHits = await forbidProviderFanout(page);
    await seedShell(page);
    await forceSelectedTime(page, '09:00');
    await mockVenues(page);

    await page.goto('/');

    await expect(page.getByRole('button', { name: /Välj Morgonöppet/ })).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    await expect(page.getByRole('button', { name: /Välj Okända timmar/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Välj Kvällskafeet/ })).toHaveCount(0);
    await expect(closedPin(page)).toHaveCount(0);

    const search = visibleSearchInput(page);
    await search.fill('Kväll');
    await expect(page.getByTestId('venue-search-results').getByText(CLOSED_NAME)).toHaveCount(0);

    await search.fill(CLOSED_NAME);
    const closedOption = page.getByRole('option', {
      name: new RegExp(`${CLOSED_NAME}.*${CLOSED_LABEL}`),
    });
    await expect(closedOption).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    await closedOption.click();

    const detail = visibleDetailPanel(page);
    await expect(detail).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    await expect(detail).toContainText(CLOSED_LABEL);
    await expect(detail).not.toContainText(/ÖPPET ·|Öppet till|ÖPPET VID VALD TID/);
    await expect(closedPin(page)).toHaveCount(0);
    expect(providerHits).toEqual([]);
  });

  test('saved closed favourite remains actionable but unpinned', async ({ page }) => {
    const providerHits = await forbidProviderFanout(page);
    await seedShell(page, [CLOSED_VENUE.id]);
    await forceSelectedTime(page, '09:00');
    await mockVenues(page);

    await page.goto('/favoriter');

    const closedRow = page.getByRole('button', {
      name: new RegExp(`Välj ${CLOSED_NAME}.*${CLOSED_LABEL}`),
    });
    await expect(closedRow).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    await expect(
      page.locator('[data-testid="venue-card"]:visible').filter({ hasText: CLOSED_LABEL }).first(),
    ).toBeVisible();
    await expect(closedPin(page)).toHaveCount(0);

    await closedRow.click();
    const detail = visibleDetailPanel(page);
    await expect(detail).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    await expect(detail).toContainText(CLOSED_LABEL);
    await expect(detail).not.toContainText(/ÖPPET ·|Öppet till|ÖPPET VID VALD TID/);
    await expect(closedPin(page)).toHaveCount(0);
    expect(providerHits).toEqual([]);
  });
});
