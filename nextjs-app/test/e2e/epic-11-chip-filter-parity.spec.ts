/**
 * Story 11.3 (AC1) — chip-filter PARITY across breakpoints.
 *
 * =========================================================================
 * WHAT THIS SPEC IS
 * =========================================================================
 * The whole-app fact that only an e2e can prove: toggling a tag chip filters the
 * venue LIST *and* the map PINS identically on BOTH breakpoints (test-design
 * R-009 — a forked mobile filter would diverge list/pin behaviour across
 * breakpoints). The mobile chip lives in the bottom-sheet header; the desktop
 * chip lives in the nav — but both write the SAME shared `TagFilterContext`, so
 * a toggle from either surface filters the same `filterVenuesByTags(rawVenues,
 * activeTags)` memo feeding both the lists and the pins.
 *
 * Runs under BOTH `--project=mobile` (chip in the sheet) and `--project=desktop`
 * (chip in the nav); the per-project breakpoint picks which chip surface is
 * visible. No new Playwright project needed (emulated click is sufficient here —
 * the REAL-touch gesture proof is `epic-11-sheet-touch-gestures.spec.ts`).
 *
 * =========================================================================
 * DETERMINISTIC MECHANISM (no live Met.no) — epic-10/11 DTO-mock precedent
 * =========================================================================
 * `page.route` DTO fulfillment for `**​/api/venues?**` returns two venues, one
 * carrying a UNIQUE tag. `?_time=13:00` pins the wall clock; live api.met.no is
 * forbidden. Toggling the unique tag prunes the list + pins to the one venue that
 * carries it — asserted on the visible list cards + the rendered pins.
 */

import { expect, test, type Page, type Route } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import type { GetVenuesResponse, VenueDataDto } from '@/lib/types/api';

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

async function forbidLiveMetno(page: Page): Promise<string[]> {
  const hits: string[] = [];
  await page.route('**://api.met.no/**', (route: Route) => {
    hits.push(route.request().url());
    return route.abort();
  });
  return hits;
}

function buildVenue(
  id: string,
  name: string,
  lat: number,
  lng: number,
  tags: string[],
): VenueDataDto {
  return {
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
    distanceMeters: 120,
    sunExposurePercent: 90,
    tags,
    sunWindow: { start: '11:00', end: '18:00' },
    thumbnail: { alt: name, initials: name.slice(0, 2) },
  };
}

function buildVenuesResponse(): GetVenuesResponse {
  return {
    venues: [
      // Both carry 'Innergård'; only Solterrassen carries the unique 'Kanal' tag.
      buildVenue('1', 'Kafé Magasinet', 57.705, 11.97, ['Innergård', 'Wifi']),
      buildVenue('2', 'Solterrassen', 57.706, 11.972, ['Innergård', 'Kanal']),
    ],
    meta: { count: 2, radiusKm: 2 },
    timestamp: '2026-07-04T11:00:00.000Z',
    totalCount: 2,
  };
}

async function mockVenues(page: Page): Promise<void> {
  await page.route(VENUES_MATCHER, async (route: Route) => {
    await route.fulfill({ json: buildVenuesResponse() });
  });
}

/** The visible chip surface: the sheet chip row on mobile, the nav strip on desktop. */
function chipSurface(page: Page, isMobile: boolean) {
  return page.getByTestId(isMobile ? 'mobile-tag-chips' : 'desktop-tag-chip-strip');
}

test.describe('[11.3 AC1] tag chip filters list + pins identically on both breakpoints', () => {
  test('toggling a chip prunes the list AND the pins to matching venues (same shared context)', async ({
    page,
  }, testInfo) => {
    const isMobile = Boolean(testInfo.project.use.isMobile) || Boolean(testInfo.project.use.hasTouch);
    const metnoHits = await forbidLiveMetno(page);
    await bypassOnboarding(page);
    await forceMiddayTime(page);
    await mockVenues(page);

    await page.goto('/');

    // Both venues load → 2 pins.
    await expect(page.locator('[data-testid="venue-pin"]')).toHaveCount(2, {
      timeout: APP_SETTLE_TIMEOUT_MS,
    });

    const chips = chipSurface(page, isMobile);
    await chips.waitFor({ state: 'visible', timeout: APP_SETTLE_TIMEOUT_MS });

    // Toggle the UNIQUE 'Kanal' chip — only Solterrassen carries it.
    const kanalChip = chips.getByRole('button', { name: 'Kanal' });
    await kanalChip.click();
    await expect(kanalChip).toHaveAttribute('aria-pressed', 'true');

    // PINS filtered to the single matching venue.
    await expect(page.locator('[data-testid="venue-pin"]')).toHaveCount(1, {
      timeout: APP_SETTLE_TIMEOUT_MS,
    });

    // LIST filtered identically — only the matching venue's card remains in the
    // VISIBLE list for this breakpoint. (Both the mobile sheet list and the
    // desktop panel list render in the DOM at all times, CSS-hidden by
    // breakpoint, so scope to the visible one.)
    const visibleCards = page.locator('[data-testid="venue-card"]:visible');
    await expect(visibleCards).toHaveCount(1);
    await expect(visibleCards.first()).toContainText('Solterrassen');
    await expect(visibleCards.first()).not.toContainText('Kafé Magasinet');

    // Toggle OFF → both venues + pins return (the show-all default).
    await kanalChip.click();
    await expect(page.locator('[data-testid="venue-pin"]')).toHaveCount(2, {
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    await expect(page.locator('[data-testid="venue-card"]:visible')).toHaveCount(2);

    expect(metnoHits, 'no outbound api.met.no during chip filtering').toEqual([]);
  });
});
