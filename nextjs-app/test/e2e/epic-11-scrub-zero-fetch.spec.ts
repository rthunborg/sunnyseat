/**
 * ATDD RED-PHASE acceptance scaffolds — Story 11.1 (AC1 + AC3, Task 6)
 * "Client-Side Day-Series — the request-count invariant + markers-persist e2e"
 *
 * =========================================================================
 * WHAT THIS SPEC IS
 * =========================================================================
 * The whole-app network facts that only an e2e can prove (test-design dedup: the
 * request-count invariant lives at e2e). This is the 11.1 SEAM-provable subset of
 * the guards Story 11.8 later OWNS + extends with a real-touch profile:
 *
 *   - AC1 / R-001 (CRITICAL): a settled same-date TIME scrub issues ZERO
 *     `**​/api/venues*` requests (the headline — "do not dampen the fetch, REMOVE
 *     it"). One settled scrub that fires even ONE venue request is a FAIL.
 *   - AC3 / R-005: a DATE change fires EXACTLY ONE `**​/api/venues*` request, the
 *     existing venue markers stay MOUNTED (keyed by venue id — no unmount/remount)
 *     under a dim + centered spinner OVERLAY, then update in place.
 *
 * =========================================================================
 * DETERMINISTIC MECHANISM (Epic-10 precedent, no live Met.no)
 * =========================================================================
 * `page.route` DTO fulfillment for `**​/api/venues?**` returns a hand-crafted
 * response whose venues carry a `sunDaySeries` (one gated entry per 15-min step),
 * exactly the Epic-10 `epic-10-weather-matrix.spec.ts` pattern. A request COUNTER
 * on the same matcher is the acceptance signal. `?_time=13:00` pins the wall clock
 * so the scrub starts from a deterministic step. NO latency asserts — only the
 * request COUNT and marker-element persistence (both deterministic). Belt-and-
 * braces: FAILS if any outbound `api.met.no` request is observed.
 *
 * NOTE (11.1 ↔ 11.8 boundary): the standing request-count + marker-persistence
 * guards + the real-touch profile are Story 11.8's. This spec leaves the seam
 * testable NOW (scrub=0 / date-change=1 / markers keyed by id / overlay present);
 * 11.8 promotes/extends it. Runs under `--project=desktop` AND `--project=mobile`.
 *
 * =========================================================================
 * RED PHASE
 * =========================================================================
 * `test.describe.skip` — the day-series is not yet on the DTO, the scrub still
 * changes the query key (so it still fetches), and the date-change overlay testid
 * does not exist yet. Un-skip once Tasks 2/4/5 land.
 */

import { expect, test, type Page, type Route } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import type { GetVenuesResponse, VenueDataDto, VenueSunStatus } from '@/lib/types/api';
import {
  PLANNER_START_MINUTES,
  PLANNER_END_MINUTES,
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

/** Force `?_time=13:00` so the sun is deterministically up (retro-note pattern). */
async function forceMiddayTime(page: Page): Promise<void> {
  const nativeGoto = page.goto.bind(page);
  page.goto = ((url: string, options?: Parameters<typeof nativeGoto>[1]) => {
    const target = new URL(url, 'http://localhost:3000');
    if (!target.searchParams.has('_time')) target.searchParams.set('_time', '13:00');
    return nativeGoto(target.pathname + target.search + target.hash, options);
  }) as typeof page.goto;
}

async function forbidLiveMetno(page: Page): Promise<string[]> {
  const hits: string[] = [];
  await page.route('**://api.met.no/**', (route: Route) => {
    hits.push(route.request().url());
    return route.abort();
  });
  return hits;
}

/** One gated day-series (61 entries) — midday sunlit, one gated step. */
function daySeries(): { minutes: number; sunExposurePercent: number; currentSunStatus: VenueSunStatus }[] {
  const series: { minutes: number; sunExposurePercent: number; currentSunStatus: VenueSunStatus }[] = [];
  for (let m = PLANNER_START_MINUTES; m <= PLANNER_END_MINUTES; m += PLANNER_STEP_MINUTES) {
    const sunlit = m >= 11 * 60 && m <= 18 * 60;
    series.push({
      minutes: m,
      sunExposurePercent: sunlit ? 90 : 10,
      currentSunStatus: sunlit ? (m === 13 * 60 ? 'CloudObscured' : 'Sunny') : 'Shaded',
    });
  }
  return series;
}

function buildVenue(id: string, name: string, lat: number, lng: number): VenueDataDto {
  const venue: VenueDataDto = {
    id,
    venueId: id,
    venueName: name,
    venueSlug: `venue-${id}`,
    slug: `venue-${id}`,
    neighborhood: 'Inom Vallgraven',
    location: { lat, lng },
    currentSunStatus: 'Sunny',
    isPartner: true,
    confidence: 90,
    distanceMeters: 0,
    sunExposurePercent: 90,
    tags: [],
    sunWindow: { start: '11:00', end: '18:00' },
    thumbnail: { alt: name, initials: name.slice(0, 2) },
  };
  // Task 2's optional field — loose-cast until the type carries it.
  (venue as unknown as { sunDaySeries: unknown }).sunDaySeries = daySeries();
  return venue;
}

function buildVenuesResponse(): GetVenuesResponse {
  return {
    venues: [
      buildVenue('1', 'Kafé Magasinet', 57.705, 11.97),
      buildVenue('2', 'Solterrassen', 57.706, 11.972),
    ],
    meta: { count: 2, radiusKm: 2, sunDataSource: 'weather', weatherUpdatedAt: '2026-07-04T11:00:00.000Z' },
    timestamp: '2026-07-04T11:00:00.000Z',
    totalCount: 2,
  };
}

/** Install the day-series DTO mock + a request counter on the venues matcher. */
async function mockVenuesWithCounter(page: Page): Promise<{ count: () => number }> {
  let count = 0;
  await page.route(VENUES_MATCHER, async (route: Route) => {
    count += 1;
    await route.fulfill({ json: buildVenuesResponse() });
  });
  return { count: () => count };
}

test.describe.skip('[11.1 AC1/AC3] day-series scrub = 0 requests, date change = 1 + markers persist', () => {
  test('a settled same-date time scrub issues ZERO /api/venues requests', async ({ page }) => {
    const metnoHits = await forbidLiveMetno(page);
    await bypassOnboarding(page);
    await forceMiddayTime(page);
    const venues = await mockVenuesWithCounter(page);

    await page.goto('/');

    // Wait for the initial load (the ONE allowed fetch).
    await page.locator('[data-testid="venue-pin"]').first().waitFor({
      state: 'visible',
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    const afterLoad = venues.count();
    expect(afterLoad).toBeGreaterThanOrEqual(1);

    // Scrub the time slider (same date) via keyboard — deterministic, settled
    // commits. With the day-series present, each settled step is a client-side
    // lookup: it must NOT change the query key and must issue ZERO venue requests.
    const slider = page.getByRole('slider').first();
    await slider.focus();
    for (let i = 0; i < 6; i++) {
      await slider.press('ArrowRight');
    }
    // Give any (wrongly) triggered fetch time to fire before asserting.
    await page.waitForTimeout(500);

    // THE HEADLINE: the scrub added ZERO venue requests.
    expect(venues.count()).toBe(afterLoad);
    expect(metnoHits, 'no outbound api.met.no during a scrub').toEqual([]);
  });

  test('a date change fires EXACTLY ONE request, markers persist under a dim + spinner overlay', async ({
    page,
  }) => {
    const metnoHits = await forbidLiveMetno(page);
    await bypassOnboarding(page);
    await forceMiddayTime(page);
    const venues = await mockVenuesWithCounter(page);

    await page.goto('/');

    const firstPin = page.locator('[data-testid="venue-pin"]').first();
    await firstPin.waitFor({ state: 'visible', timeout: APP_SETTLE_TIMEOUT_MS });
    const afterLoad = venues.count();
    const pinCountBefore = await page.locator('[data-testid="venue-pin"]').count();

    // Trigger a DATE change (the one fetch AC3 permits). The exact date-picker
    // interaction is filled in by the dev when un-skipping (open the planner date
    // control, pick today+1); the invariant is what matters. Placeholder using the
    // planner date control the dev exposes a testid for in the green phase:
    //   await page.getByTestId('planner-date-next').click();
    // For the red-phase contract we assert the invariants the interaction must satisfy:

    // (a) EXACTLY ONE new venue request fires for the date change.
    // (b) the dim + centered spinner OVERLAY appears while the request is in flight
    //     (a NEW visual state Task 5 adds with this testid).
    const overlay = page.locator('[data-testid="date-change-overlay"]');
    // The dev un-comments the date-change trigger above; the overlay must show,
    // then the markers update in place WITHOUT unmounting.
    await expect(overlay).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });

    // Markers must NOT have been unmounted/remounted: the same number of pins is
    // present throughout (keyed by venue id via VenuePinLayer), and the first pin
    // element handle is still attached after the swap.
    await expect(page.locator('[data-testid="venue-pin"]')).toHaveCount(pinCountBefore);
    await expect(firstPin).toBeAttached();

    // EXACTLY ONE new request for the date change.
    expect(venues.count()).toBe(afterLoad + 1);
    expect(metnoHits, 'no outbound api.met.no during a date change').toEqual([]);
  });
});
