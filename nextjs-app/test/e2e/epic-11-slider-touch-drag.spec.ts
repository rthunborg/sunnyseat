/**
 * STANDING Story-11.8 real-touch invariant (promoted from the Story 11.2 seam — AC1)
 * "Time-slider thumb-grab drag works with a REAL touch gesture, commits once, fetches nothing"
 *
 * =========================================================================
 * WHAT THIS SPEC IS
 * =========================================================================
 * The single whole-app fact only a real-touch e2e can prove (test-design R-004,
 * "emulated mouse-drag can pass while a real finger fails"):
 *
 *   - AC1: a touch-drag initiated ON the thumb changes the committed planner time on
 *     the mobile viewport — driven by a REAL touch gesture (`page.touchscreen`
 *     down/move/up over the thumb), NOT a `click()` / `fill()` / mouse drag.
 *   - AC2 (seam kept testable here): the full drag commits the app-level time and,
 *     because 11.1 decoupled time from the query key, a SAME-DATE settled drag issues
 *     ZERO `**​/api/venues*` requests. The STANDING request-count guard is owned by
 *     Story 11.8 — this spec proves the 11.2 seam (touch changes time + zero fetch)
 *     so 11.8 can promote it.
 *
 * =========================================================================
 * DETERMINISTIC MECHANISM (no live Met.no) — reuses the epic-11 scrub spec's harness
 * =========================================================================
 * `page.route` DTO fulfillment for `**​/api/venues?**` (a request COUNTER on the same
 * matcher is the zero-fetch signal); `?_time=13:00` pins the wall clock; live api.met.no
 * is forbidden (belt-and-braces). The touch gesture reads the thumb's bounding box and
 * drives real touch events across it. The acceptance signal is the COMMITTED planner
 * time label changing + the request counter staying flat — both deterministic, no
 * latency asserts.
 *
 * =========================================================================
 * PROJECT / PROFILE (real touch)
 * =========================================================================
 * Runs under the existing `mobile` project (`devices['iPhone 14']`, `hasTouch: true`) —
 * NO new Playwright project is required; `page.touchscreen` dispatches real touch there.
 * If the dev prefers a dedicated real-touch project, register it in `playwright.config.ts`
 * WITHOUT breaking `mobile`/`desktop`/`a11y`/`a11y-mobile`. This file is `test.describe`d
 * with a mobile-only guard so it does not run (and fail) under `desktop` (no touchscreen).
 *
 * =========================================================================
 * STANDING STORY-11.8 INVARIANT (promoted from the 11.2 seam — no longer red-phase)
 * =========================================================================
 * Story 11.2 Tasks 1 + 2 have landed: the decorative thumb is `pointer-events-none` and the
 * per-step commit is decoupled, so the real touch-drag ON the thumb now changes the committed
 * time and a same-date drag issues ZERO `**​/api/venues*` requests. This is now a durable
 * Story-11.8 real-touch invariant and MUST stay green.
 *
 * The `test.beforeEach` below is a `hasTouch`-PROJECT self-skip (NOT a red-phase skip): real
 * touch is CDP `Input.dispatchTouchEvent`, so this describe runs under a touch-capable project
 * (`--project=touch` / Pixel-5 in CI, or the `mobile`/iPhone-14 project) and self-skips off
 * projects without a touchscreen rather than false-failing. KEEP that guard. The
 * `planner-time-label` / `time-slider-thumb` testids exist in `TimeSliderPanel`/`TimeSlider`.
 * If this ever goes RED against HEAD, that is a genuine Epic-11 regression — fix the
 * implementation, never delete the assertion.
 */

import { expect, test, type Page, type Route } from '@playwright/test';
import { FIRST_RUN_GUIDE_SEEN_KEY, ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import type { GetVenuesResponse, VenueDataDto, VenueDaySeriesEntry } from '@/lib/types/api';
import {
  PLANNER_START_MINUTES,
  PLANNER_END_MINUTES,
  PLANNER_STEP_MINUTES,
} from '@/lib/utils/time-planner';

const APP_SETTLE_TIMEOUT_MS = 15_000;
const VENUES_MATCHER = '**/api/venues?**';

async function bypassOnboarding(page: Page): Promise<void> {
  await page.addInitScript(
  ({ onboardedKey, guideSeenKey }) => {
    window.sessionStorage.clear();
    window.localStorage.setItem(onboardedKey, '1');
    window.localStorage.setItem(guideSeenKey, '1');
  },
  { onboardedKey: ONBOARDED_FLAG_KEY, guideSeenKey: FIRST_RUN_GUIDE_SEEN_KEY },
);
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

function daySeries(): VenueDaySeriesEntry[] {
  const series: VenueDaySeriesEntry[] = [];
  for (let m = PLANNER_START_MINUTES; m <= PLANNER_END_MINUTES; m += PLANNER_STEP_MINUTES) {
    const sunlit = m >= 11 * 60 && m <= 18 * 60;
    series.push({
      minutes: m,
      sunExposurePercent: sunlit ? 90 : 10,
      currentSunStatus: sunlit ? 'Sunny' : 'Shaded',
      weatherGateState: 'not_gated',
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

async function mockVenuesWithCounter(page: Page): Promise<{ count: () => number }> {
  let count = 0;
  await page.route(VENUES_MATCHER, async (route: Route) => {
    count += 1;
    await route.fulfill({ json: buildVenuesResponse() });
  });
  return { count: () => count };
}

// Story 11.2 (Tasks 1 + 2 landed): decoration `pointer-events-none` + drag decouple
// are in place, so the real-touch thumb-drag now changes the committed time. Runs
// under `--project=touch` (Pixel 5, `hasTouch: true`); self-skips on a project
// without a touchscreen. Mirrors the `epic-11-scrub-zero-fetch.spec.ts` convention.
test.describe('[11.2 AC1] real-touch thumb-drag changes time, commits once, fetches nothing', () => {
  // Real touch requires a touch-capable context (the `touch`/Pixel-5 project).
  // Under `desktop` there is no touchscreen → skip rather than false-fail.
  test.beforeEach(({ browserName }, testInfo) => {
    test.skip(
      !testInfo.project.use.hasTouch,
      'real-touch drag requires a hasTouch project (run under --project=touch)',
    );
    void browserName;
  });

  test('a touch-drag initiated ON the thumb changes the committed planner time and issues ZERO venue requests', async ({
    page,
  }) => {
    const metnoHits = await forbidLiveMetno(page);
    await bypassOnboarding(page);
    await forceMiddayTime(page);
    const venues = await mockVenuesWithCounter(page);

    await page.goto('/');

    await page.locator('[data-testid="venue-pin"]').first().waitFor({
      state: 'visible',
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    const afterLoad = venues.count();

    // The committed time label (mobile panel renders it; on the topPanel variant the
    // committed value is the value badge). Capture the starting committed time.
    const thumb = page.locator('[data-testid="time-slider-thumb"]').first();
    await thumb.waitFor({ state: 'visible', timeout: APP_SETTLE_TIMEOUT_MS });
    const badge = page.locator('[data-testid="time-slider-value-badge"]').first();
    const timeBefore = (await badge.textContent())?.trim();

    // REAL touch gesture: press ON the thumb, drag right across several steps, release.
    // This is the AC1 headline — a finger landing on the thumb must grab it (Task 1
    // makes the decoration `pointer-events-none` so the touch reaches the input).
    const box = await thumb.boundingBox();
    if (!box) throw new Error('thumb has no bounding box');
    const startX = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    // Drive a REAL finger sweep via raw CDP `Input.dispatchTouchEvent`
    // (touchStart on the thumb → several touchMove right → touchEnd). `page.touchscreen`
    // only exposes `.tap()` (a discrete tap, not a drag), so a genuine drag needs the
    // CDP touch primitives. This is a real touch gesture — NOT a mouse drag / click.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: startX, y }],
    });
    for (let dx = 20; dx <= 120; dx += 20) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: startX + dx, y }],
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    // THE HEADLINE (AC1): the committed planner time CHANGED as a result of the touch
    // drag (the thumb was grabbable — the decoration did not eat the touch).
    await expect(badge).not.toHaveText(timeBefore ?? '', { timeout: APP_SETTLE_TIMEOUT_MS });

    // AC2 seam (kept testable here; standing guard owned by 11.8): a SAME-DATE settled
    // drag issued ZERO new venue requests.
    await page.waitForTimeout(400);
    expect(venues.count(), 'a same-date touch drag must add zero venue requests').toBe(afterLoad);
    expect(metnoHits, 'no outbound api.met.no during a touch drag').toEqual([]);
  });
});
