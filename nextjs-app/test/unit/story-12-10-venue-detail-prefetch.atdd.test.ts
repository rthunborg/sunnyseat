import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

function appFile(relativePath: string): string {
  return path.join(process.cwd(), relativePath);
}

function readAppFile(relativePath: string): string {
  return readFileSync(appFile(relativePath), 'utf8');
}

describe('Story 12.10 ATDD - venue detail prefetch query contract', () => {
  test.skip('[P0] prefetch and mounted detail share one client-safe query-options builder', () => {
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

  test.skip('[P0] shared detail params normalize date, time, and 4-decimal coordinate buckets identically to the mounted key', () => {
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

  test.skip('[P0] initial-settle scheduler limits candidates to six and concurrent prefetches to two', () => {
    const schedulerPath = 'hooks/queries/useVenueDetailPrefetch.ts';
    expect(existsSync(appFile(schedulerPath))).toBe(true);

    const schedulerSource = readAppFile(schedulerPath);
    expect(schedulerSource).toMatch(/MAX_DETAIL_PREFETCH_CANDIDATES\s*=\s*6/);
    expect(schedulerSource).toMatch(/DETAIL_PREFETCH_CONCURRENCY\s*=\s*2/);
    expect(schedulerSource).toMatch(/prefetchQuery\(/);
    expect(schedulerSource).toMatch(/requestIdleCallback|setTimeout/);
    expect(schedulerSource).toMatch(/cancelQueries\(\s*\{\s*queryKey,\s*exact:\s*true\s*\}/);
    expect(schedulerSource).not.toMatch(/radiusKm|10\s*\*\s*1000|MAX_RADIUS_KM\s*=\s*10/);
  });

  test.skip('[P0] scheduler captures the first settled planner/location key and never restarts on scrub or planner-date changes', () => {
    const schedulerSource = readAppFile('hooks/queries/useVenueDetailPrefetch.ts');

    expect(schedulerSource).toMatch(/initial.*(settled|prefetch).*Ref/i);
    expect(schedulerSource).toMatch(/hasRun.*Ref|prefetchStarted.*Ref|initialRun.*Ref/i);
    expect(schedulerSource).toMatch(/listVenues|favouriteVenueRows/);
    expect(schedulerSource).toMatch(/dedupe|Set<|new Set/);
    expect(schedulerSource).not.toMatch(/useVenueSearch|fetch\(`?\/api\/venues\?/);
  });

  test.skip('[P0] opening Mer info preserves the opened in-flight detail key while cancelling other queued candidates', () => {
    const schedulerSource = readAppFile('hooks/queries/useVenueDetailPrefetch.ts');
    const mapSource = readAppFile('components/custom/map/MapView.tsx');

    expect(schedulerSource).toMatch(/preserve.*(opened|active|selected).*key/i);
    expect(schedulerSource).toMatch(/cancel.*candidate/i);
    expect(schedulerSource).toMatch(/queryKey.*exact:\s*true/);
    expect(mapSource).toMatch(/isVenueDetailRequested|selected.*venue/i);
    expect(mapSource).toMatch(/useVenueDetailPrefetch\(/);
  });
});
