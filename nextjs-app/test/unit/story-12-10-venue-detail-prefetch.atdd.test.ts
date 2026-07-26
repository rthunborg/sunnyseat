import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  __createVenueDetailPrefetchRunForTests,
  __enterVenueDetailPrefetchCooldownForTests,
  __resetVenueDetailPrefetchCooldownForTests,
  __runVenueDetailPrefetchForTests,
  DETAIL_PREFETCH_ERROR_COOLDOWN_MS,
  MAX_DETAIL_PREFETCH_CANDIDATES,
  isVenueDetailPrefetchInCooldown,
  selectVenueDetailPrefetchCandidates,
} from '@/hooks/queries/useVenueDetailPrefetch';
import { queryKeys } from '@/lib/query-keys';

function appFile(relativePath: string): string {
  return path.join(process.cwd(), relativePath);
}

function readAppFile(relativePath: string): string {
  return readFileSync(appFile(relativePath), 'utf8');
}

describe('Story 12.10 ATDD - venue detail prefetch query contract', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    __resetVenueDetailPrefetchCooldownForTests();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    __resetVenueDetailPrefetchCooldownForTests();
  });

  test('[P0] prefetch and mounted detail share one client-safe query-options builder', () => {
    const helperPath = 'hooks/queries/venue-detail-query-options.ts';
    expect(existsSync(appFile(helperPath))).toBe(true);

    const helperSource = readAppFile(helperPath);
    const hookSource = readAppFile('hooks/queries/useVenueDetail.ts');

    expect(helperSource).toMatch(/queryKeys\.venues\.detailAt\(/);
    expect(helperSource).toMatch(/encodeURIComponent\(normalizedSlug\)/);
    expect(helperSource).toMatch(/signal/);
    expect(helperSource).toMatch(/staleTime:\s*5\s*\*\s*60\s*\*\s*1000|FIVE_MINUTES/);
    expect(helperSource).toMatch(/retry:\s*shouldRetryVenueQuery/);
    expect(hookSource).toMatch(/venue-detail-query-options/);
    expect(hookSource).not.toMatch(/function\s+bucket\(/);
  });

  test('[P0] shared detail params normalize date, time, and 4-decimal coordinate buckets identically to the mounted key', () => {
    const key = queryKeys.venues.detailAt('test-venue-sunny', {
      date: '2026-07-27',
      time: '14:00',
      lat: 57.7089,
      lng: 11.9746,
    });

    expect(key).toEqual([
      'venues',
      'detail',
      'test-venue-sunny',
      {
        date: '2026-07-27',
        lat: 57.7089,
        lng: 11.9746,
        time: '14:00',
      },
    ]);

    const helperSource = readAppFile('hooks/queries/venue-detail-query-options.ts');
    expect(helperSource).toMatch(/BUCKET_DECIMALS\s*=\s*4/);
    expect(helperSource).toMatch(/date.*trim\(\)/);
    expect(helperSource).toMatch(/time.*trim\(\)/);
    expect(helperSource).not.toMatch(/queryKeys\.venues\.detail\([^)]*slug[^)]*\)/);
  });

  test('[P0] initial-settle scheduler limits candidates to six and concurrent prefetches to two', () => {
    const schedulerPath = 'hooks/queries/useVenueDetailPrefetch.ts';
    expect(existsSync(appFile(schedulerPath))).toBe(true);

    const schedulerSource = readAppFile(schedulerPath);
    expect(schedulerSource).toMatch(/MAX_DETAIL_PREFETCH_CANDIDATES\s*=\s*6/);
    expect(schedulerSource).toMatch(/DETAIL_PREFETCH_CONCURRENCY\s*=\s*2/);
    expect(schedulerSource).toMatch(/DETAIL_PREFETCH_ERROR_COOLDOWN_MS\s*=\s*60_000/);
    expect(schedulerSource).toMatch(/prefetchQuery\(/);
    expect(schedulerSource).toMatch(/requestIdleCallback|setTimeout/);
    expect(schedulerSource).toMatch(/cancelQueries\(\s*\{\s*queryKey,\s*exact:\s*true\s*\}/);
    expect(schedulerSource).not.toMatch(/radiusKm|10\s*\*\s*1000|MAX_RADIUS_KM\s*=\s*10/);
  });

  test('[P0] a 429 prefetch stops after the current concurrency pair, enters cooldown, and stays console-silent', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Too many venue requests', status: 429 }), {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const run = __createVenueDetailPrefetchRunForTests(
      Array.from({ length: MAX_DETAIL_PREFETCH_CANDIDATES }, (_, index) =>
        candidate(`venue-${index + 1}`, `venue-${index + 1}`, index),
      ),
      { date: '2026-07-27', time: '14:00', lat: 57.70894, lng: 11.97464 },
    );

    await __runVenueDetailPrefetchForTests(client, run);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls.map((call: [RequestInfo | URL, RequestInit?]) => call[0])).toEqual([
      '/api/venues/venue-1?date=2026-07-27&time=14%3A00&lat=57.7089&lng=11.9746',
      '/api/venues/venue-2?date=2026-07-27&time=14%3A00&lat=57.7089&lng=11.9746',
    ]);
    expect(client.getQueryCache().findAll({ queryKey: ['venues', 'detail'] })).toHaveLength(0);
    expect(isVenueDetailPrefetchInCooldown()).toBe(true);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test('[P0] prefetch error cooldown lasts for the venue read rate-limit window', () => {
    const now = Date.UTC(2026, 6, 27, 12, 0, 0);

    __enterVenueDetailPrefetchCooldownForTests(now);

    expect(isVenueDetailPrefetchInCooldown(now + DETAIL_PREFETCH_ERROR_COOLDOWN_MS - 1)).toBe(true);
    expect(isVenueDetailPrefetchInCooldown(now + DETAIL_PREFETCH_ERROR_COOLDOWN_MS)).toBe(false);
  });

  test('[P0] scheduler captures the first settled planner/location key and never restarts on scrub or planner-date changes', () => {
    const schedulerSource = readAppFile('hooks/queries/useVenueDetailPrefetch.ts');

    expect(schedulerSource).toMatch(/initial.*(settled|prefetch).*Ref/i);
    expect(schedulerSource).toMatch(/hasRun.*Ref|prefetchStarted.*Ref|initialRun.*Ref/i);
    expect(schedulerSource).toMatch(/listVenues|favouriteVenueRows/);
    expect(schedulerSource).toMatch(/dedupe|Set<|new Set/);
    expect(schedulerSource).not.toMatch(/useVenueSearch|fetch\(`?\/api\/venues\?/);
  });

  test('[P0] opening Mer info preserves the opened in-flight detail key while cancelling other queued candidates', () => {
    const schedulerSource = readAppFile('hooks/queries/useVenueDetailPrefetch.ts');
    const mapSource = readAppFile('components/custom/map/MapView.tsx');

    expect(schedulerSource).toMatch(/preserve.*(opened|active|selected).*key/i);
    expect(schedulerSource).toMatch(/cancel.*candidate/i);
    expect(schedulerSource).toMatch(/queryKey.*exact:\s*true/);
    expect(mapSource).toMatch(/isVenueDetailRequested|selected.*venue/i);
    expect(mapSource).toMatch(/useVenueDetailPrefetch\(/);
  });

  test('[P0] forced dev routes require an explicit venue-detail prefetch opt-in', () => {
    const mapSource = readAppFile('components/custom/map/MapView.tsx');

    expect(mapSource).toMatch(/hasDevForcingSearchParam/);
    expect(mapSource).toMatch(/searchParams\.get\('_prefetch'\)\s*===\s*'venue-detail'/);
    expect(mapSource).toMatch(/routeAllowsVenueDetailPrefetch/);
  });

  test('[P0] favourites mode selects loaded favourite rows first, then nearest already-loaded list fallback', () => {
    const candidates = selectVenueDetailPrefetchCandidates({
      listMode: 'favourites',
      favouriteVenueRows: [
        candidate('fav-1', 'fav-one', 500),
        candidate('dup-id', 'fav-two', 300),
        candidate('unsafe', '\u0000hidden', 1),
        candidate('dup-slug', 'fav-one', 250),
      ],
      listVenues: [
        candidate('near-3', 'near-three', 30),
        candidate('near-1', 'near-one', 10),
        candidate('dup-id', 'near-dup-id', 1),
        candidate('near-2', 'near-two', 20),
        candidate('near-4', 'near-four', 40),
        candidate('near-5', 'near-five', 50),
      ],
    });

    expect(candidates).toHaveLength(MAX_DETAIL_PREFETCH_CANDIDATES);
    expect(candidates.map((venue) => venue.slug)).toEqual([
      'fav-one',
      'fav-two',
      'near-one',
      'near-two',
      'near-three',
      'near-four',
    ]);
  });
});

function candidate(id: string, slug: string, distanceMeters: number) {
  return {
    id,
    slug,
    venueSlug: slug,
    distanceMeters,
  };
}
