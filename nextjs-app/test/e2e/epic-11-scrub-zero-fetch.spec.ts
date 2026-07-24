/**
 * STANDING Story-11.8 invariant (promoted from the Story 11.1 seam — AC1 + AC3)
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
 * STANDING STORY-11.8 INVARIANT (promoted from the 11.1 seam — no longer red-phase):
 * This is now the durable epic request-count + marker-persistence gate that Story 11.8
 * OWNS. The 11.1 day-series has landed (scrub no longer changes the query key), the
 * `date-change-overlay` testid exists in `MapView.tsx`, and the visible planner calendar
 * trigger selects the next in-window date on each breakpoint.
 * The `test.describe(...)` below is LIVE (not `.skip`) and MUST stay un-skipped, green, and
 * CI-wired: it runs under `--project=desktop` AND `--project=mobile` (the CI "E2E tests" step).
 * The two assertions are load-bearing — do NOT weaken them:
 *   (a) a settled same-date TIME scrub adds ZERO `**​/api/venues*` requests (R-001 headline —
 *       "REMOVE the fetch, do not dampen it"); and
 *   (b) a DATE change fires EXACTLY ONE request, markers stay MOUNTED (keyed by venue id) under
 *       the dim + centered spinner `date-change-overlay`, then update in place.
 * Belt-and-braces: FAILS if any outbound `api.met.no` request is observed. A settled scrub that
 * fires even ONE venue request, or a date change that unmounts markers, is a genuine Epic-11
 * regression — fix the implementation, never the assertion.
 */

import { expect, test, type Page, type Route } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import type { GetVenuesResponse, VenueDataDto, VenueDaySeriesEntry } from '@/lib/types/api';
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
function daySeries(): VenueDaySeriesEntry[] {
  const series: VenueDaySeriesEntry[] = [];
  for (let m = PLANNER_START_MINUTES; m <= PLANNER_END_MINUTES; m += PLANNER_STEP_MINUTES) {
    const sunlit = m >= 11 * 60 && m <= 18 * 60;
    series.push({
      minutes: m,
      sunExposurePercent: sunlit ? 90 : 10,
      currentSunStatus: sunlit ? (m === 13 * 60 ? 'CloudObscured' : 'Sunny') : 'Shaded',
      weatherGateState: sunlit && m === 13 * 60 ? 'gated' : 'not_gated',
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
    weatherGateState: 'not_gated',
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

/**
 * Install the day-series DTO mock + a request counter on the venues matcher. The
 * FIRST request (initial load) fulfills immediately so the app settles fast; any
 * SUBSEQUENT request (a date change) is delayed briefly so the in-flight
 * dim+spinner overlay is observable (a settled state, not a race). The delay does
 * not affect the request COUNT invariant — a scrub must still add zero requests.
 */
async function mockVenuesWithCounter(page: Page): Promise<{ count: () => number }> {
  let count = 0;
  await page.route(VENUES_MATCHER, async (route: Route) => {
    count += 1;
    if (count > 1) {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    await route.fulfill({ json: buildVenuesResponse() });
  });
  return { count: () => count };
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

test.describe('[11.1 AC1/AC3] day-series scrub = 0 requests, date change = 1 + markers persist', () => {
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

    // Trigger a DATE change (the one fetch AC3 permits) via the planner calendar
    // trigger. Story 12.9 removes the mobile next-day shortcut, so the durable
    // request-count gate uses the date dialog path that exists on both breakpoints.
    const expectedDate = await selectDifferentDateFromCalendar(page);
    expect(expectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // (a) EXACTLY ONE new venue request fires for the date change.
    // (b) the dim + centered spinner OVERLAY appears while the request is in flight
    //     (a NEW visual state Task 5 adds with this testid).
    const overlay = page.locator('[data-testid="date-change-overlay"]');
    // The overlay must show while the single new-date request is in flight, then
    // the markers update in place WITHOUT unmounting.
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
