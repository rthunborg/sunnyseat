/**
 * Story 11.3 (AC2 + AC3) — REAL-TOUCH sheet/chip gesture proof.
 *
 * =========================================================================
 * WHAT THIS SPEC IS
 * =========================================================================
 * The whole-app facts only a REAL touch gesture can prove (test-design R-008/
 * R-004 — "emulated mouse-drag can pass while a real finger fails"):
 *
 *   - AC2: the bottom sheet can be dragged by a REAL finger through ALL FOUR
 *     snaps — down to the handle-only `collapsed` state and back up through
 *     peek → mid → full (asserted via the `data-state` attribute, not px).
 *   - AC2: the map stays fully interactive behind the collapsed sheet — a
 *     venue-pin tap selects a venue while the sheet is collapsed.
 *   - AC3 (the load-bearing axis guard): a HORIZONTAL fling on the header chip
 *     row scrolls the chips and leaves the sheet `data-state` UNCHANGED — a
 *     horizontal chip scroll must never hijack the vertical sheet drag.
 *
 * =========================================================================
 * DETERMINISTIC MECHANISM (no live Met.no) — reuses the epic-11 harness
 * =========================================================================
 * `page.route` DTO fulfillment for `**​/api/venues?**` returns venues that carry
 * real `tags` (so the mobile chip row renders). `?_time=13:00` pins the wall
 * clock; live api.met.no is forbidden (belt-and-braces). The gesture drives raw
 * CDP `Input.dispatchTouchEvent` (touchStart/Move/End) — a real finger, NOT a
 * `click()` / mouse drag. The acceptance signals are the sheet `data-state`
 * attribute transitions + a pin selection — all deterministic, no latency asserts.
 *
 * =========================================================================
 * PROJECT / PROFILE (real touch)
 * =========================================================================
 * Runs under the `touch` project (`devices['Pixel 5']`, Chromium + `hasTouch`) —
 * CDP raw touch is Chromium-only, so the WebKit `mobile`/iPhone-14 project cannot
 * drive it. The four standard projects `testIgnore` this file so it does not
 * double-run. CI invokes it via `npx playwright test --project=touch` (the same
 * step Story 11.2 wired), which matches both epic-11 touch specs.
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
      // Many tags so the chip row genuinely overflows the header horizontally.
      buildVenue('1', 'Kafé Magasinet', 57.705, 11.97, [
        'Innergård',
        'Hund ok',
        'Wifi',
        'Bakverk',
        'Morgonsol',
        'Take-away',
        'Surdeg',
        'Kanal',
      ]),
      buildVenue('2', 'Solterrassen', 57.706, 11.972, ['Innergård', 'Skaldjur', 'Parasoller']),
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

/**
 * Drive a real vertical finger drag from (x, yStart) to (x, yEnd) via CDP.
 * Steps are paced with a small delay so `@use-gesture` sees realistic
 * inter-event timing (its distance/velocity math reads event timestamps — all
 * moves in one microtask read as an unrealistic infinite-velocity fling).
 */
async function touchDragVertical(
  page: Page,
  x: number,
  yStart: number,
  yEnd: number,
): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y: yStart }],
  });
  await page.waitForTimeout(20);
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const y = yStart + ((yEnd - yStart) * i) / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  // Let the release snap settle before the next assertion.
  await page.waitForTimeout(120);
}

/** Drive a real horizontal finger fling from (xStart, y) to (xEnd, y) via CDP. */
async function touchFlingHorizontal(
  page: Page,
  xStart: number,
  xEnd: number,
  y: number,
): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: xStart, y }],
  });
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    const x = xStart + ((xEnd - xStart) * i) / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

async function dragHandleBy(page: Page, deltaY: number): Promise<void> {
  const handle = page.getByTestId('mobile-bottom-sheet-handle');
  const box = await handle.boundingBox();
  if (!box) throw new Error('sheet handle has no bounding box');
  const x = box.x + box.width / 2;
  const yStart = box.y + box.height / 2;
  await touchDragVertical(page, x, yStart, yStart + deltaY);
}

test.describe('[11.3 AC2/AC3] four-snap sheet by real touch + chip axis guard', () => {
  // Real touch requires a hasTouch context (the `touch`/Pixel-5 project). Under a
  // no-touch project, skip rather than false-fail.
  test.beforeEach(({ browserName }, testInfo) => {
    test.skip(
      !testInfo.project.use.hasTouch,
      'real-touch sheet gesture requires a hasTouch project (run under --project=touch)',
    );
    void browserName;
  });

  test('drags through all four snaps (down to collapsed, back up to full) and keeps the map interactive behind collapsed', async ({
    page,
  }) => {
    const metnoHits = await forbidLiveMetno(page);
    await bypassOnboarding(page);
    await forceMiddayTime(page);
    await mockVenues(page);

    await page.goto('/');

    const sheet = page.getByTestId('mobile-bottom-sheet');
    await sheet.waitFor({ state: 'visible', timeout: APP_SETTLE_TIMEOUT_MS });
    await page.locator('[data-testid="venue-pin"]').first().waitFor({
      state: 'visible',
      timeout: APP_SETTLE_TIMEOUT_MS,
    });

    // ---- All FOUR snaps reachable by a real finger, both directions ----
    // Default snap is 'mid'. Drag DOWN to peek.
    await dragHandleBy(page, 140);
    await expect(sheet).toHaveAttribute('data-state', 'peek');

    // From peek, drag DOWN further to the handle-only 'collapsed' snap.
    await dragHandleBy(page, 90);
    await expect(sheet).toHaveAttribute('data-state', 'collapsed');

    // Climb back UP: collapsed → peek → mid → full (every rung reachable upward).
    await dragHandleBy(page, -70);
    await expect(sheet).toHaveAttribute('data-state', 'peek');
    await dragHandleBy(page, -80);
    await expect(sheet).toHaveAttribute('data-state', 'mid');
    await dragHandleBy(page, -80);
    await expect(sheet).toHaveAttribute('data-state', 'full');

    // ---- MAP INTERACTIVE BEHIND COLLAPSED ----
    // Descend all the way back to collapsed, then prove a venue-pin tap reaches
    // the map through the handle-only sheet (no backdrop covers the map). The
    // pin's onClick fires → it becomes selected (`data-pin-state` → `*-selected`),
    // proving the tap landed on the map canvas. (Selecting a venue then
    // legitimately raises the sheet to peek to surface its quick-info — existing
    // UX — so we assert the SELECTION, not that the sheet stays collapsed.)
    // Descend one rung at a time (full → mid → peek → collapsed) — each single
    // downward drag clears exactly one snap threshold.
    await dragHandleBy(page, 110); // full → mid
    await expect(sheet).toHaveAttribute('data-state', 'mid');
    await dragHandleBy(page, 110); // mid → peek
    await expect(sheet).toHaveAttribute('data-state', 'peek');
    await dragHandleBy(page, 90); // peek → collapsed
    await expect(sheet).toHaveAttribute('data-state', 'collapsed');

    // Pick a venue pin that sits ABOVE the collapsed sheet's thin handle strip —
    // that map area is uncovered, so a tap there must reach the map (the strip
    // occupies only its own ~44px at the bottom; the rest of the map is fully
    // interactive behind the collapsed sheet — no full-screen backdrop). The tap
    // reaching the map selects a venue, which raises the sheet from 'collapsed'
    // to 'peek' — a state transition caused by a MAP tap (not a handle drag),
    // proving the map received the pointer event behind the collapsed sheet.
    const sheetBox = await sheet.boundingBox();
    if (!sheetBox) throw new Error('collapsed sheet has no bounding box');
    const sheetTop = sheetBox.y;
    const pins = page.locator('[data-testid="venue-pin"]');
    const pinCount = await pins.count();
    // Find a pin whose full glyph sits above the collapsed sheet's handle strip.
    let targetPin: ReturnType<typeof pins.nth> | null = null;
    for (let i = 0; i < pinCount; i++) {
      const box = await pins.nth(i).boundingBox();
      if (box && box.y + box.height < sheetTop - 8) {
        targetPin = pins.nth(i);
        break;
      }
    }
    expect(targetPin, 'a venue pin above the collapsed strip must exist to tap').not.toBeNull();

    // REAL-TOUCH tap the pin (Story 11.8 hardening). A single raw
    // `page.touchscreen.tap(centerX, centerY)` at the pin's geometric center is
    // flaky against a MapLibre marker: the pin is a `<button>` nested in a
    // transformed marker wrapper whose clickable pill occupies only the upper
    // portion of the button box (a pointer tail + flex gap sit below it), so a
    // discrete touch at the box center intermittently lands off the interactive
    // pill and the select handler never fires — the venue stays unselected and the
    // sheet stays 'collapsed' (observed ~66% first-attempt failure on the `touch`
    // project; masked in CI only by retries:2). We keep the REAL finger tap (AC3
    // intent) but re-aim + bounded-retry until the tap registers as a selection
    // (`data-pin-state` gains the `-selected` suffix). The retry loop dispatches a
    // genuine touchscreen tap each iteration — NOT a synthetic click — so the
    // real-touch acceptance signal is preserved. Once the pin reports selected, the
    // `selectedVenueId` effect raises the sheet from 'collapsed' → 'peek'.
    // Any pin entering the selected visual state (`data-pin-state` gains a
    // `-selected` suffix) is the deterministic signal that a tap registered.
    const anySelectedPin = page.locator('[data-testid="venue-pin"][data-pin-state*="selected"]');
    let selected = false;
    for (let attempt = 0; attempt < 4 && !selected; attempt++) {
      const box = await targetPin!.boundingBox();
      if (!box) throw new Error('target pin lost its bounding box');
      // Aim near the top of the button box where the tappable pill actually sits,
      // not the geometric center (which can fall on the pointer tail / gap).
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.35);
      // Poll (not an immediate read) so a tap that DID register has time to flip the
      // selected state before we decide whether to re-tap. Re-tapping an
      // already-selected pin would `toggleVenue` it back off (deselect), so we must
      // wait out the render before concluding the tap missed.
      selected = await anySelectedPin
        .first()
        .waitFor({ state: 'attached', timeout: 1200 })
        .then(() => true)
        .catch(() => false);
    }
    expect(selected, 'a real-touch tap on the pin must select the venue behind the collapsed sheet').toBe(true);
    // The map tap reached a venue and selected it → the sheet auto-rose off the
    // handle-only snap.
    await expect(sheet).toHaveAttribute('data-state', 'peek', { timeout: APP_SETTLE_TIMEOUT_MS });

    expect(metnoHits, 'no outbound api.met.no during sheet gestures').toEqual([]);
  });

  test('a horizontal chip-row fling scrolls the chips and leaves the sheet data-state unchanged (axis guard)', async ({
    page,
  }) => {
    await forbidLiveMetno(page);
    await bypassOnboarding(page);
    await forceMiddayTime(page);
    await mockVenues(page);

    await page.goto('/');

    const sheet = page.getByTestId('mobile-bottom-sheet');
    await sheet.waitFor({ state: 'visible', timeout: APP_SETTLE_TIMEOUT_MS });

    // The chip row renders under the sort toggles in the mid-snap header.
    const chipRow = page.getByTestId('mobile-tag-chips');
    await chipRow.waitFor({ state: 'visible', timeout: APP_SETTLE_TIMEOUT_MS });

    const stateBefore = await sheet.getAttribute('data-state');
    expect(stateBefore).toBe('mid');

    const box = await chipRow.boundingBox();
    if (!box) throw new Error('chip row has no bounding box');
    const y = box.y + box.height / 2;
    const xStart = box.x + box.width - 20;
    const xEnd = box.x + 20;

    const scrollLeftBefore = await chipRow.evaluate((el) => el.scrollLeft);

    // A strongly HORIZONTAL fling across the chip row.
    await touchFlingHorizontal(page, xStart, xEnd, y);

    // The chips scrolled (horizontal axis claimed by the chip scroller)...
    const scrollLeftAfter = await chipRow.evaluate((el) => el.scrollLeft);
    expect(scrollLeftAfter).toBeGreaterThan(scrollLeftBefore);

    // ...and the sheet snap did NOT change (no vertical hijack).
    await expect(sheet).toHaveAttribute('data-state', 'mid');
  });
});
