import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';
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
const BASE_ROUTE = '/?_time=14:00';
const PREFETCH_ROUTE = '/?_time=14:00&_prefetch=venue-detail';
const PREFETCH_DEEP_LINK_ROUTE =
  '/?venue=prefetch-venue-1&_time=14:00&_prefetch=venue-detail';
const COLD_DETAIL_DELAY_MS = 1500;
const TIMING_EVIDENCE_DIR = path.join(
  process.cwd(),
  '..',
  '_bmad-output',
  'implementation-artifacts',
  'validation',
  'story-12-10-mer-info-timing',
  '20260726-local',
);
const TIMING_EVIDENCE_PATH = path.join(TIMING_EVIDENCE_DIR, 'evidence.json');
const TIMING_EVIDENCE_LOCK_DIR = path.join(TIMING_EVIDENCE_DIR, '.evidence.lock');

type OpenTiming = {
  slug: string;
  detailRequestsBefore: number;
  detailRequestsAfter: number;
  detailRequestDelta: number;
  clickToLoadedMs: number;
  loadedMarker: string;
};

type ProjectTimingEvidence = {
  project: string;
  injectedDetailDelayMs: number;
  prefetched: OpenTiming;
  nonPrefetched: OpenTiming;
};

type TimingEvidenceAggregate = {
  story: '12.10';
  source: 'local Playwright fixtures';
  injectedDetailDelayMs: number;
  projects: Record<string, ProjectTimingEvidence>;
};

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
  const index = id - 1;
  const column = index % 4;
  const row = Math.floor(index / 4);
  const data: VenueDataDto = {
    id: String(id),
    venueId: String(id),
    venueName: `Prefetch Venue ${id}`,
    venueSlug: `prefetch-venue-${id}`,
    slug: `prefetch-venue-${id}`,
    neighborhood: 'Inom Vallgraven',
    // Keep fixture pins separated enough for real browser clicks. The
    // production marker layer intentionally preserves map-native hit-testing,
    // so a test fixture with near-identical coordinates can click the wrong
    // overlapping marker while the accessible button names still look unique.
    location: { lat: 57.7075 - row * 0.003, lng: 11.9685 + column * 0.003 },
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

async function mockListAndDetail(page: Page, options: {
  delayAllDetailsMs?: number;
} = {}): Promise<{
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
    if (options.delayAllDetailsMs) {
      await new Promise((resolve) => setTimeout(resolve, options.delayAllDetailsMs));
    } else if (decodeURIComponent(slug) === 'prefetch-venue-8') {
      await new Promise((resolve) => setTimeout(resolve, COLD_DETAIL_DELAY_MS));
    }
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

async function openVenueDetailAndMeasure(
  page: Page,
  network: Awaited<ReturnType<typeof mockListAndDetail>>,
  venueName: string,
  slug: string,
): Promise<OpenTiming> {
  const loadedMarker = `Loaded detail for ${slug}`;
  const detailRequestsBefore = network.detailCount();

  await clickVisibleVenueCard(page, venueName);
  await expect(
    page.locator('[data-testid="venue-quick-info"]:visible').filter({ hasText: venueName }),
  ).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });

  const start = await page.evaluate(() => performance.now());
  await page.getByRole('button', { name: /Mer info/i }).click();
  const detailSurface = visibleDetailSurface(page, venueName, loadedMarker);
  await expect(detailSurface.getByText(loadedMarker)).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
  await expect(detailSurface.getByRole('article', { name: venueName })).toHaveAttribute('aria-busy', 'false');
  const end = await page.evaluate(() => performance.now());

  const detailRequestsAfter = network.detailCount();
  return {
    slug,
    detailRequestsBefore,
    detailRequestsAfter,
    detailRequestDelta: detailRequestsAfter - detailRequestsBefore,
    clickToLoadedMs: Math.round((end - start) * 10) / 10,
    loadedMarker,
  };
}

function visibleDetailSurface(page: Page, venueName: string, loadedMarker?: string) {
  const surface = activeDetailSurfaces(page, venueName);
  return loadedMarker ? surface.filter({ hasText: loadedMarker }).first() : surface.first();
}

function activeDetailSurfaces(page: Page, venueName: string) {
  return page
    .locator('[data-testid="desktop-venue-detail-panel"]:visible, [data-testid="mobile-venue-detail-sheet"]:visible')
    .filter({ hasText: venueName });
}

async function clickVisibleVenueCard(page: Page, venueName: string): Promise<void> {
  const cards = page.getByTestId('venue-card').filter({ hasText: venueName });
  const count = await cards.count();
  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index);
    if (!(await card.isVisible())) continue;
    await card.scrollIntoViewIfNeeded();
    await card.getByRole('button', { name: new RegExp(`^Välj ${escapeRegExp(venueName)}`) }).click();
    return;
  }
  throw new Error(`Visible venue card not found: ${venueName}`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function writeTimingEvidence(
  projectName: string,
  evidence: ProjectTimingEvidence,
): void {
  mkdirSync(TIMING_EVIDENCE_DIR, { recursive: true });
  withTimingEvidenceLock(() => {
    const aggregate = readTimingEvidenceAggregate();
    aggregate.projects[projectName] = evidence;
    const sortedProjects = Object.fromEntries(
      Object.entries(aggregate.projects).sort(([a], [b]) => a.localeCompare(b)),
    );
    writeFileSync(
      TIMING_EVIDENCE_PATH,
      `${JSON.stringify({ ...aggregate, projects: sortedProjects }, null, 2)}\n`,
      'utf8',
    );
  });
}

function readTimingEvidenceAggregate(): TimingEvidenceAggregate {
  if (!existsSync(TIMING_EVIDENCE_PATH)) {
    return {
      story: '12.10',
      source: 'local Playwright fixtures',
      injectedDetailDelayMs: COLD_DETAIL_DELAY_MS,
      projects: {},
    };
  }
  try {
    const parsed = JSON.parse(readFileSync(TIMING_EVIDENCE_PATH, 'utf8')) as TimingEvidenceAggregate;
    return {
      story: '12.10',
      source: 'local Playwright fixtures',
      injectedDetailDelayMs: COLD_DETAIL_DELAY_MS,
      projects: parsed.projects ?? {},
    };
  } catch {
    return {
      story: '12.10',
      source: 'local Playwright fixtures',
      injectedDetailDelayMs: COLD_DETAIL_DELAY_MS,
      projects: {},
    };
  }
}

function withTimingEvidenceLock(writeEvidence: () => void): void {
  const deadline = Date.now() + 5000;
  while (true) {
    try {
      mkdirSync(TIMING_EVIDENCE_LOCK_DIR);
      break;
    } catch (error) {
      if (Date.now() > deadline) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
  try {
    writeEvidence();
  } finally {
    rmSync(TIMING_EVIDENCE_LOCK_DIR, { recursive: true, force: true });
  }
}

function detailSlugCount(urls: string[], slug: string): number {
  return urls.filter((url) => decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '') === slug).length;
}

test.describe('Story 12.10 ATDD - detail prefetch request-count behavior', () => {
  test('[P0] initial settled surface prefetches at most six detail keys with concurrency two and exact planner params', async ({ page }) => {
    const metnoHits = await forbidLiveMetno(page);
    await bypassOnboarding(page);
    const network = await mockListAndDetail(page);

    await page.goto(PREFETCH_ROUTE);
    await page.locator('[data-testid="venue-pin"]').first().waitFor({
      state: 'visible',
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    const listsAfterSurfaceSettle = network.listCount();

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
    expect(network.listCount()).toBe(listsAfterSurfaceSettle);
    expect(metnoHits).toEqual([]);
  });

  test('[P0] same-date scrub and planner-date change do not restart detail prefetch after the first pass settles', async ({ page }) => {
    await forbidLiveMetno(page);
    await bypassOnboarding(page);
    const network = await mockListAndDetail(page);

    await page.goto(PREFETCH_ROUTE);
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

    const planner = page.locator('[data-testid="time-slider-panel"]:visible').first();
    await planner.getByTestId('planner-date-trigger').click();
    await page.getByRole('button', { name: /Välj / }).nth(1).click();
    await expect.poll(() => network.listCount(), { timeout: APP_SETTLE_TIMEOUT_MS }).toBe(listsAfterInitialPass + 1);
    await expect.poll(() => network.detailCount(), { timeout: 750 }).toBe(detailsAfterInitialPass);
  });

  test('[P0] direct venue deep links do not launch speculative detail prefetch', async ({ page }) => {
    await forbidLiveMetno(page);
    await bypassOnboarding(page);
    const network = await mockListAndDetail(page);

    await page.goto(PREFETCH_DEEP_LINK_ROUTE);
    await expect(page.getByRole('heading', { name: 'Prefetch Venue 1' })).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });

    await expect.poll(() => network.detailCount(), { timeout: APP_SETTLE_TIMEOUT_MS }).toBeGreaterThan(0);
    expect(network.detailCount()).toBeLessThanOrEqual(2);
    expect(new Set(network.detailUrls().map((url) => new URL(url).pathname.split('/').pop()))).toEqual(
      new Set(['prefetch-venue-1']),
    );
    await expect.poll(() => network.detailCount(), { timeout: 750 }).toBeLessThanOrEqual(2);
  });

  test('[P0] Mer info for a warmed candidate opens from cache and an unwarmed candidate uses the existing busy shell', async ({ page }, testInfo: TestInfo) => {
    await bypassOnboarding(page);
    const network = await mockListAndDetail(page);

    await page.goto(PREFETCH_ROUTE);
    await page.locator('[data-testid="venue-pin"]').first().waitFor({
      state: 'visible',
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    await expect.poll(() => network.detailCount(), { timeout: APP_SETTLE_TIMEOUT_MS }).toBe(6);

    const warmTiming = await openVenueDetailAndMeasure(
      page,
      network,
      'Prefetch Venue 1',
      'prefetch-venue-1',
    );
    expect(network.detailCount()).toBe(6);
    expect(warmTiming.detailRequestDelta).toBe(0);
    await expect(page.getByRole('heading', { name: 'Prefetch Venue 1' })).toBeVisible();

    await visibleDetailSurface(page, 'Prefetch Venue 1', 'Loaded detail for prefetch-venue-1')
      .getByRole('button', { name: /Stäng platsdetaljer/i })
      .first()
      .click();
    await expect(activeDetailSurfaces(page, 'Prefetch Venue 1')).toHaveCount(0, {
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    const coldIntentRequestsBefore = network.detailCount();
    await clickVisibleVenueCard(page, 'Prefetch Venue 8');
    await expect(
      page.locator('[data-testid="venue-quick-info"]:visible').filter({ hasText: 'Prefetch Venue 8' }),
    ).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    await expect
      .poll(() => detailSlugCount(network.detailUrls(), 'prefetch-venue-8'), {
        timeout: APP_SETTLE_TIMEOUT_MS,
      })
      .toBe(1);
    const coldStart = await page.evaluate(() => performance.now());
    const coldRequestsBefore = network.detailCount();
    await page.getByRole('button', { name: /Mer info/i }).click();
    const coldDetailSurface = visibleDetailSurface(page, 'Prefetch Venue 8');
    await expect(coldDetailSurface.getByRole('article', { name: 'Prefetch Venue 8' })).toHaveAttribute('aria-busy', 'true');
    await expect.poll(() => network.detailCount(), { timeout: APP_SETTLE_TIMEOUT_MS }).toBe(7);
    const loadedColdDetailSurface = visibleDetailSurface(page, 'Prefetch Venue 8', 'Loaded detail for prefetch-venue-8');
    await expect(loadedColdDetailSurface.getByText('Loaded detail for prefetch-venue-8')).toBeVisible({
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    await expect(loadedColdDetailSurface.getByRole('article', { name: 'Prefetch Venue 8' })).toHaveAttribute('aria-busy', 'false');
    const coldEnd = await page.evaluate(() => performance.now());
    const coldTiming: OpenTiming = {
      slug: 'prefetch-venue-8',
      detailRequestsBefore: coldRequestsBefore,
      detailRequestsAfter: network.detailCount(),
      detailRequestDelta: network.detailCount() - coldRequestsBefore,
      clickToLoadedMs: Math.round((coldEnd - coldStart) * 10) / 10,
      loadedMarker: 'Loaded detail for prefetch-venue-8',
    };
    expect(coldTiming.detailRequestDelta).toBe(0);
    expect(coldTiming.detailRequestsAfter - coldIntentRequestsBefore).toBe(1);

    const timingEvidence: ProjectTimingEvidence = {
      project: testInfo.project.name,
      injectedDetailDelayMs: COLD_DETAIL_DELAY_MS,
      prefetched: warmTiming,
      nonPrefetched: coldTiming,
    };
    await testInfo.attach('story-12-10-mer-info-timing', {
      body: JSON.stringify(timingEvidence, null, 2),
      contentType: 'application/json',
    });
    writeTimingEvidence(testInfo.project.name, timingEvidence);
  });

  test('[P0] desktop A-to-B pin switch replaces the venue URL so Back returns to the map', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop-specific URL/history regression');
    await forbidLiveMetno(page);
    await bypassOnboarding(page);
    const network = await mockListAndDetail(page);

    await page.goto(BASE_ROUTE);
    await page.locator('[data-testid="venue-pin"]').first().waitFor({
      state: 'visible',
      timeout: APP_SETTLE_TIMEOUT_MS,
    });

    await openVenueDetailAndMeasure(page, network, 'Prefetch Venue 1', 'prefetch-venue-1');
    await expect
      .poll(() => new URL(page.url()).searchParams.get('venue'), { timeout: APP_SETTLE_TIMEOUT_MS })
      .toBe('prefetch-venue-1');

    await page.getByRole('button', { name: /Prefetch Venue 2 .*soligt vid vald tid/i }).click();

    await expect
      .poll(() => new URL(page.url()).searchParams.get('venue'), { timeout: APP_SETTLE_TIMEOUT_MS })
      .toBe('prefetch-venue-2');
    await expect(page.locator('[data-testid="desktop-venue-detail-panel"]:visible')).toContainText(
      'Prefetch Venue 2',
      { timeout: APP_SETTLE_TIMEOUT_MS },
    );

    await page.goBack();

    await expect(page.locator('[data-testid="desktop-venue-detail-panel"]:visible')).toHaveCount(0, {
      timeout: APP_SETTLE_TIMEOUT_MS,
    });
    await expect
      .poll(() => new URL(page.url()).searchParams.get('venue'))
      .toBeNull();
    await expect(page.locator('[data-testid="venue-pin"]').first()).toBeVisible();
  });

  test('[P0] desktop early selected venue detail request is adopted by Mer info without duplicate fetch', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop-specific early-click race');
    await forbidLiveMetno(page);
    await bypassOnboarding(page);
    const network = await mockListAndDetail(page, { delayAllDetailsMs: COLD_DETAIL_DELAY_MS });

    await page.goto(PREFETCH_ROUTE);
    await page.locator('[data-testid="venue-pin"]').first().waitFor({
      state: 'visible',
      timeout: APP_SETTLE_TIMEOUT_MS,
    });

    await clickVisibleVenueCard(page, 'Prefetch Venue 8');
    await expect(
      page.locator('[data-testid="venue-quick-info"]:visible').filter({ hasText: 'Prefetch Venue 8' }),
    ).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
    await expect
      .poll(() => detailSlugCount(network.detailUrls(), 'prefetch-venue-8'), {
        timeout: APP_SETTLE_TIMEOUT_MS,
      })
      .toBe(1);

    const detailRequestsBeforeOpen = network.detailCount();
    await page.getByRole('button', { name: /Mer info/i }).click();

    const detailSurface = visibleDetailSurface(page, 'Prefetch Venue 8');
    await expect(detailSurface.getByRole('article', { name: 'Prefetch Venue 8' })).toHaveAttribute(
      'aria-busy',
      'true',
      { timeout: APP_SETTLE_TIMEOUT_MS },
    );
    await expect(
      visibleDetailSurface(page, 'Prefetch Venue 8', 'Loaded detail for prefetch-venue-8')
        .getByText('Loaded detail for prefetch-venue-8'),
    ).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });

    expect(detailSlugCount(network.detailUrls(), 'prefetch-venue-8')).toBe(1);
    expect(network.detailCount()).toBeLessThanOrEqual(Math.max(detailRequestsBeforeOpen, 3));
    expect(network.detailCount()).toBeLessThan(8);
  });
});
