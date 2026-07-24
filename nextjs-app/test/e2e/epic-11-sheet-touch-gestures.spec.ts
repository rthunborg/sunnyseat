/**
 * Story 11.3 (AC2 + AC3) — REAL-TOUCH sheet/chip gesture proof.
 *
 * =========================================================================
 * WHAT THIS SPEC IS
 * =========================================================================
 * The whole-app facts only a REAL touch gesture can prove (test-design R-008/
 * R-004 — "emulated mouse-drag can pass while a real finger fails"):
 *
 *   - AC2/Story 12.9: the bottom sheet can be dragged by a REAL finger through
 *     row-count stops — down to the handle-only 0-row state and back up one
 *     venue row at a time (asserted via `data-visible-rows`, not px).
 *   - AC2: the map stays fully interactive behind the 0-row sheet — a venue-pin
 *     tap selects a venue while the sheet is handle-only.
 *   - AC3 (the load-bearing axis guard): a HORIZONTAL fling on the header chip
 *     row scrolls the chips and leaves `data-visible-rows` UNCHANGED — a
 *     horizontal chip scroll must never hijack the vertical sheet drag.
 *
 * =========================================================================
 * DETERMINISTIC MECHANISM (no live Met.no) — reuses the epic-11 harness
 * =========================================================================
 * `page.route` DTO fulfillment for `**​/api/venues?**` returns venues that carry
 * real `tags` (so the mobile chip row renders). `?_time=13:00` pins the wall
 * clock; live api.met.no is forbidden (belt-and-braces). The gesture drives raw
 * CDP `Input.dispatchTouchEvent` (touchStart/Move/End) — a real finger, NOT a
 * `click()` / mouse drag. The acceptance signals are the sheet
 * `data-visible-rows` transitions + a pin selection — all deterministic, no
 * latency asserts.
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

import { expect, test, type Locator, type Page, type Route } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import type { GetVenuesResponse, VenueDataDto } from '@/lib/types/api';

const APP_SETTLE_TIMEOUT_MS = 15_000;
const VENUES_MATCHER = '**/api/venues?**';

type TouchDragOptions = {
  steps?: number;
  startDelayMs?: number;
  moveDelayMs?: number;
  settleDelayMs?: number;
};

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
      buildVenue('3', 'Takbaren', 57.704, 11.973, ['Takbar', 'Kvällssol']),
      buildVenue('4', 'Bryggsolen', 57.707, 11.969, ['Kanal', 'Lunch']),
      buildVenue('5', 'Gårdsljuset', 57.703, 11.971, ['Innergård', 'Morgonsol']),
      buildVenue('6', 'Parkhörnet', 57.702, 11.968, ['Uteservering', 'Eftermiddag']),
      buildVenue('7', 'Kajkanten', 57.708, 11.966, ['Kanal', 'Kvällssol']),
      buildVenue('8', 'Solgränden', 57.709, 11.974, ['Innergård', 'Lunch']),
    ],
    meta: { count: 8, radiusKm: 2 },
    timestamp: '2026-07-04T11:00:00.000Z',
    totalCount: 8,
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
  {
    steps = 10,
    startDelayMs = 20,
    moveDelayMs = 16,
    settleDelayMs = 120,
  }: TouchDragOptions = {},
): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y: yStart }],
  });
  if (startDelayMs > 0) await page.waitForTimeout(startDelayMs);
  for (let i = 1; i <= steps; i++) {
    const y = yStart + ((yEnd - yStart) * i) / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    if (moveDelayMs > 0) await page.waitForTimeout(moveDelayMs);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  // Let the release snap settle before the next assertion.
  if (settleDelayMs > 0) await page.waitForTimeout(settleDelayMs);
}

async function startTouchDragVertical(
  page: Page,
  x: number,
  yStart: number,
  yEnd: number,
): Promise<{ end: () => Promise<void> }> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y: yStart }],
  });
  await page.waitForTimeout(20);
  const steps = 5;
  for (let i = 1; i <= steps; i++) {
    const y = yStart + ((yEnd - yStart) * i) / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    await page.waitForTimeout(16);
  }
  return {
    end: async () => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
      await page.waitForTimeout(120);
    },
  };
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

async function dragLocatorBy(page: Page, locator: Locator, deltaY: number): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('drag source has no bounding box');
  const x = box.x + box.width / 2;
  const yStart = box.y + box.height / 2;
  await touchDragVertical(page, x, yStart, yStart + deltaY);
}

async function mousePointerFlingBy(
  page: Page,
  locator: Locator,
  deltaY: number,
): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('pointer fling source has no bounding box');
  const x = box.x + box.width / 2;
  const yStart = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  const timestamp = Date.now() / 1000;
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x,
    y: yStart,
    button: 'left',
    buttons: 1,
    clickCount: 1,
    timestamp,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x,
    y: yStart + deltaY * 0.4,
    button: 'left',
    buttons: 1,
    timestamp: timestamp + 0.008,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x,
    y: yStart + deltaY,
    button: 'left',
    buttons: 1,
    timestamp: timestamp + 0.016,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x,
    y: yStart + deltaY,
    button: 'left',
    buttons: 0,
    clickCount: 1,
    timestamp: timestamp + 0.018,
  });
  await cdp.detach();
  await page.waitForTimeout(120);
}

async function expectSheetRows(page: Page, rows: number): Promise<void> {
  const sheet = page.getByTestId('mobile-bottom-sheet');
  await expect(sheet).toHaveAttribute('data-visible-rows', String(rows), {
    timeout: APP_SETTLE_TIMEOUT_MS,
  });
  await expect(sheet).toHaveAttribute('data-state', `rows-${rows}`);
}

async function waitForStableSheetHeight(page: Page): Promise<void> {
  const sheet = page.getByTestId('mobile-bottom-sheet');
  await expect.poll(
    async () => {
      const firstHeight = Number(await sheet.getAttribute('data-sheet-height'));
      await page.waitForTimeout(80);
      const secondHeight = Number(await sheet.getAttribute('data-sheet-height'));
      if (!Number.isFinite(firstHeight) || !Number.isFinite(secondHeight)) return Number.POSITIVE_INFINITY;
      return Math.abs(secondHeight - firstHeight);
    },
    { timeout: APP_SETTLE_TIMEOUT_MS },
  ).toBeLessThanOrEqual(1);
}

async function getSheetRows(page: Page): Promise<number> {
  const sheet = page.getByTestId('mobile-bottom-sheet');
  await expect(sheet).toHaveAttribute('data-visible-rows', /^\d+$/, {
    timeout: APP_SETTLE_TIMEOUT_MS,
  });
  return Number(await sheet.getAttribute('data-visible-rows'));
}

async function getSheetMaxRows(page: Page): Promise<number> {
  const sheet = page.getByTestId('mobile-bottom-sheet');
  await expect(sheet).toHaveAttribute('data-max-rows', /^\d+$/, {
    timeout: APP_SETTLE_TIMEOUT_MS,
  });
  return Number(await sheet.getAttribute('data-max-rows'));
}

async function openMockedMap(page: Page, route = '/'): Promise<void> {
  const metnoHits = await forbidLiveMetno(page);
  await bypassOnboarding(page);
  await forceMiddayTime(page);
  await mockVenues(page);
  await page.goto(route);
  const sheet = page.getByTestId('mobile-bottom-sheet');
  await sheet.waitFor({ state: 'visible', timeout: APP_SETTLE_TIMEOUT_MS });
  await page.locator('[data-testid="venue-pin"]').first().waitFor({
    state: 'visible',
    timeout: APP_SETTLE_TIMEOUT_MS,
  });
  expect(metnoHits, 'no outbound api.met.no during sheet gesture setup').toEqual([]);
}

test.describe('[11.3 AC2/AC3 + 12.9] row-count sheet by real touch + chip axis guard', () => {
  // Real touch requires a hasTouch context (the `touch`/Pixel-5 project). Under a
  // no-touch project, skip rather than false-fail.
  test.beforeEach(({ browserName }, testInfo) => {
    test.skip(
      !testInfo.project.use.hasTouch,
      'real-touch sheet gesture requires a hasTouch project (run under --project=touch)',
    );
    void browserName;
  });

  test('drags through row stops down to 0, back up to max, and keeps the map interactive behind 0 rows', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 393, height: 940 });
    await openMockedMap(page);

    const sheet = page.getByTestId('mobile-bottom-sheet');

    const maxRows = Number(await sheet.getAttribute('data-max-rows'));
    expect(maxRows).toBeGreaterThan(3);

    // ---- Row stops reachable by a real finger, both directions ----
    await expectSheetRows(page, 3);
    for (let expectedRows = 2; expectedRows >= 0; expectedRows -= 1) {
      await dragHandleBy(page, 60);
      await expectSheetRows(page, expectedRows);
    }

    for (let expectedRows = 1; expectedRows <= maxRows; expectedRows += 1) {
      await dragHandleBy(page, -60);
      await expectSheetRows(page, expectedRows);
    }

    for (let expectedRows = maxRows - 1; expectedRows >= 0; expectedRows -= 1) {
      await dragHandleBy(page, 60);
      await expectSheetRows(page, expectedRows);
    }

    // ---- MAP INTERACTIVE BEHIND 0 ROWS ----
    // Descend to the handle-only row state, then prove a venue-pin tap reaches
    // the map through the sheet (no backdrop covers the map). The pin's onClick
    // fires -> it becomes selected (`data-selected` -> `true`), proving the tap
    // landed on the map canvas.
    await expectSheetRows(page, 0);

    // Pick a venue pin that sits ABOVE the 0-row sheet's handle strip — that map
    // area is uncovered, so a tap there must reach the map (the strip occupies
    // only its own ~44px at the bottom; the rest of the map is interactive).
    const sheetBox = await sheet.boundingBox();
    if (!sheetBox) throw new Error('0-row sheet has no bounding box');
    const sheetTop = sheetBox.y;
    const pins = page.locator('[data-testid="venue-pin"]');
    const pinCount = await pins.count();
    // Find a pin whose full glyph sits above the handle-only sheet strip.
    let targetPin: ReturnType<typeof pins.nth> | null = null;
    for (let i = 0; i < pinCount; i++) {
      const box = await pins.nth(i).boundingBox();
      if (box && box.y + box.height < sheetTop - 8) {
        targetPin = pins.nth(i);
        break;
      }
    }
    expect(targetPin, 'a venue pin above the handle-only strip must exist to tap').not.toBeNull();

    // REAL-TOUCH tap the pin (Story 11.8 hardening). A single raw
    // `page.touchscreen.tap(centerX, centerY)` at the pin's geometric center is
    // flaky against a MapLibre marker: the pin is a `<button>` nested in a
    // transformed marker wrapper whose clickable pill occupies only the upper
    // portion of the button box (a pointer tail + flex gap sit below it), so a
    // discrete touch at the box center intermittently lands off the interactive
    // pill and the select handler never fires — the venue stays unselected and the
    // sheet stays at rows-0 (observed ~66% first-attempt failure on the `touch`
    // project; masked in CI only by retries:2). We keep the REAL finger tap (AC3
    // intent) but re-aim + bounded-retry until the tap registers as a selection
    // (`data-selected` flips to `true`). The retry loop dispatches a
    // genuine touchscreen tap each iteration — NOT a synthetic click — so the
    // real-touch acceptance signal is preserved.
    // Any pin entering the selected state is the deterministic signal that a tap
    // registered; Story 12.6 keeps pin shape/state separate from selection.
    const anySelectedPin = page.locator('[data-testid="venue-pin"][data-selected="true"]');
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
    expect(selected, 'a real-touch tap on the pin must select the venue behind the 0-row sheet').toBe(true);
    await expect(page.getByTestId('venue-quick-info').first()).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    await expectSheetRows(page, 0);
  });

  test('a horizontal chip-row fling scrolls the chips and leaves the sheet row count unchanged (axis guard)', async ({
    page,
  }) => {
    await openMockedMap(page);

    const sheet = page.getByTestId('mobile-bottom-sheet');

    // The chip row renders under the sort toggles once the sheet has visible rows.
    const chipRow = page.getByTestId('mobile-tag-chips');
    await chipRow.waitFor({ state: 'visible', timeout: APP_SETTLE_TIMEOUT_MS });

    const rowsBefore = await sheet.getAttribute('data-visible-rows');
    if (rowsBefore !== '3') {
      throw new Error(`expected chip fling to start at 3 visible rows, saw ${rowsBefore}`);
    }

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

    // ...and the sheet row count did NOT change (no vertical hijack).
    await expect(sheet).toHaveAttribute('data-visible-rows', rowsBefore);
  });

  test('a row-origin downward drag at scroll top collapses exactly one row', async ({
    page,
  }) => {
    await openMockedMap(page, '/?_state=map-panel-venues&_sheetRows=max');

    const maxRows = await getSheetMaxRows(page);
    expect(maxRows).toBeGreaterThan(1);
    await expectSheetRows(page, maxRows);

    const scrollBody = page.locator('[data-bottom-sheet-scroll-body="true"]');
    await scrollBody.evaluate((el) => {
      el.scrollTop = 0;
    });
    await dragLocatorBy(page, page.getByTestId('venue-card').first(), 70);

    await expectSheetRows(page, maxRows - 1);
  });

  test('a scrolled max-row list owns downward touch scroll instead of collapsing the sheet', async ({
    page,
  }) => {
    await openMockedMap(page, '/?_state=map-panel-venues&_sheetRows=max');

    const maxRows = await getSheetMaxRows(page);
    await expectSheetRows(page, maxRows);
    const scrollBody = page.locator('[data-bottom-sheet-scroll-body="true"]');
    await scrollBody.evaluate((el) => {
      el.scrollTop = Math.min(160, el.scrollHeight - el.clientHeight);
    });
    const scrollBefore = await scrollBody.evaluate((el) => el.scrollTop);
    expect(scrollBefore).toBeGreaterThan(0);

    const box = await scrollBody.boundingBox();
    if (!box) throw new Error('scroll body has no bounding box');
    await touchDragVertical(
      page,
      box.x + box.width / 2,
      box.y + Math.min(72, box.height / 2),
      box.y + Math.min(72, box.height / 2) + 100,
    );

    await expectSheetRows(page, maxRows);
    const scrollAfter = await scrollBody.evaluate((el) => el.scrollTop);
    expect(scrollAfter).toBeLessThan(scrollBefore);
  });

  test('a deterministic pointer release skips one intermediate row stop for a sub-row fling', async ({
    page,
  }) => {
    await openMockedMap(page, '/?_state=map-panel-venues&_sheetRows=1');

    const maxRows = await getSheetMaxRows(page);
    expect(maxRows).toBeGreaterThanOrEqual(3);
    await expectSheetRows(page, 1);
    await waitForStableSheetHeight(page);

    const sheet = page.getByTestId('mobile-bottom-sheet');
    const rowHeight = Number(await sheet.getAttribute('data-row-height'));
    const flickDeltaPx = -60;
    expect(Math.abs(flickDeltaPx), 'fling fixture must stay below one measured row').toBeLessThan(rowHeight);
    // Raw CDP touch can prove row walking and scroll ownership above, but it
    // could not reliably deliver a sub-row high-velocity release without
    // diagnostic listeners perturbing timing. This deterministic native
    // pointer seam still drives the same `useDrag` release handler and
    // `resolveVisibleRowsAfterDrag` path that touch releases use.
    await mousePointerFlingBy(page, page.getByTestId('mobile-bottom-sheet-handle'), flickDeltaPx);

    await expectSheetRows(page, 3);
  });

  test('keyboard ArrowUp walks from handle-only to dynamic max and then saturates', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 393, height: 920 });
    await openMockedMap(page, '/?_state=map-panel-venues&_sheetRows=0');

    const maxRows = await getSheetMaxRows(page);
    expect(maxRows).toBeGreaterThan(3);
    await expectSheetRows(page, 0);

    const handle = page.getByTestId('mobile-bottom-sheet-handle');
    for (let expectedRows = 1; expectedRows <= maxRows; expectedRows += 1) {
      await handle.press('ArrowUp');
      await expectSheetRows(page, expectedRows);
    }

    await handle.press('ArrowUp');
    await expectSheetRows(page, maxRows);
  });

  test('reduced motion keeps direct drag tracking while only disabling settle animation', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await forbidLiveMetno(page);
    await bypassOnboarding(page);
    await forceMiddayTime(page);
    await mockVenues(page);

    await page.goto('/?_state=map-panel-venues&_sheetRows=2');

    const sheet = page.getByTestId('mobile-bottom-sheet');
    await expect(sheet).toHaveAttribute('data-visible-rows', '2', {
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    const initialHeight = Number(await sheet.getAttribute('data-sheet-height'));
    expect(initialHeight).toBeGreaterThan(0);

    const handle = page.getByTestId('mobile-bottom-sheet-handle');
    const box = await handle.boundingBox();
    if (!box) throw new Error('sheet handle has no bounding box');
    const drag = await startTouchDragVertical(
      page,
      box.x + box.width / 2,
      box.y + box.height / 2,
      box.y + box.height / 2 - 70,
    );
    try {
      await expect(sheet).toHaveAttribute('data-dragging', 'true');
      await expect.poll(
        async () => Number(await sheet.getAttribute('data-sheet-height')),
        { timeout: APP_SETTLE_TIMEOUT_MS },
      ).toBeGreaterThan(initialHeight);
    } finally {
      await drag.end();
    }
  });
});
