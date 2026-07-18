/**
 * ATDD RED-PHASE acceptance tests - Story 12.7
 * Reviews GET/POST must resolve live venues through one shared public resolver.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  clearReviewRateLimitForTests,
  GET,
  POST,
} from '@/app/api/reviews/route';
import { clearPersistedVenueReviewsForTests } from '@/lib/services/venue-reviews-persistence';
import type { GetReviewsResponse, SubmitReviewResponse } from '@/lib/types/api';

type VenueRow = {
  id: string;
  slug: string;
  venue_name: string;
  neighborhood: string;
  lat: number;
  lng: number;
  is_partner: boolean;
  hidden?: boolean | null;
  current_sun_status?: string | null;
  confidence?: number | null;
  sun_exposure_percent?: number | null;
  tags?: string[] | null;
};

type ReviewRow = {
  id: string;
  venue_id: string;
  venue_slug: string;
  text: string;
  rating?: number | null;
  created_at: string;
};

const supabaseMocks = vi.hoisted(() => {
  const state = {
    venueRows: [] as VenueRow[],
    reviewRows: [] as ReviewRow[],
    lastVenueFilter: '',
    reviewInserts: [] as Array<Record<string, unknown>>,
  };

  function identifiersFromFilter(filter: string): string[] {
    const quoted = [...filter.matchAll(/eq\."((?:\\"|[^"])*)"/g)]
      .map((match) => match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
    if (quoted.length > 0) return quoted;
    return [...filter.matchAll(/eq\.([^,)]+)/g)]
      .map((match) => match[1].trim())
      .filter(Boolean);
  }

  function candidateVenueRows(): VenueRow[] {
    const identifiers = new Set(identifiersFromFilter(state.lastVenueFilter));
    return state.venueRows.filter(
      (row) => identifiers.has(row.id) || identifiers.has(row.slug),
    );
  }

  const venueLimit = vi.fn(async (count: number) => ({
    data: candidateVenueRows().slice(0, count),
    error: null,
  }));
  const venueOr = vi.fn((filter: string) => {
    state.lastVenueFilter = filter;
    return { limit: venueLimit };
  });
  const venueSelect = vi.fn(() => ({ or: venueOr }));

  const reviewOrder = vi.fn(async () => ({ data: state.reviewRows, error: null }));
  const reviewOr = vi.fn(() => ({ order: reviewOrder }));
  const reviewSelect = vi.fn(() => ({ or: reviewOr }));
  const reviewSingle = vi.fn(async () => ({
    data: { id: 'db_review_12_7', created_at: '2026-07-18T12:00:00.000Z' },
    error: null,
  }));
  const reviewInsertSelect = vi.fn(() => ({ single: reviewSingle }));
  const reviewInsert = vi.fn((row: Record<string, unknown>) => {
    state.reviewInserts.push(row);
    return { select: reviewInsertSelect };
  });

  const from = vi.fn((table: string) => {
    if (table === 'venues') return { select: venueSelect };
    if (table === 'reviews') return { select: reviewSelect, insert: reviewInsert };
    throw new Error(`unexpected table ${table}`);
  });

  return {
    state,
    from,
    venueSelect,
    venueOr,
    venueLimit,
    reviewSelect,
    reviewOr,
    reviewOrder,
    reviewInsert,
    reviewInsertSelect,
    reviewSingle,
  };
});

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: () => ({
    from: supabaseMocks.from,
  }),
}));

const appRoot = process.cwd();
const reviewsRoutePath = join(appRoot, 'app', 'api', 'reviews', 'route.ts');
const reviewPersistencePath = join(appRoot, 'lib', 'services', 'venue-reviews-persistence.ts');

const liveVenueRow: VenueRow = {
  id: '8',
  slug: 'live-zero-review',
  venue_name: 'Live Zero Review',
  neighborhood: 'Centrum',
  lat: 57.706,
  lng: 11.971,
  is_partner: false,
  hidden: false,
  current_sun_status: 'NoSun',
  confidence: 76,
  sun_exposure_percent: 0,
  tags: [],
};

function readSource(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function useLiveSupabaseMode() {
  vi.stubEnv('SUNNYSEAT_VENUE_STORE', 'supabase');
  vi.stubEnv('SUNNYSEAT_REVIEW_PERSISTENCE', 'supabase');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
}

function makeGet(identifier?: string): NextRequest {
  const suffix = identifier === undefined ? '' : `?venueId=${encodeURIComponent(identifier)}`;
  return new NextRequest(`http://localhost/api/reviews${suffix}`);
}

function makePost(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/reviews', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.27',
    },
  });
}

describe('Story 12.7 AC1/AC2/AC3 - /api/reviews live venue resolution', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-18T12:00:00.000Z'));
    vi.unstubAllEnvs();
    clearPersistedVenueReviewsForTests();
    clearReviewRateLimitForTests();
    supabaseMocks.state.venueRows = [];
    supabaseMocks.state.reviewRows = [];
    supabaseMocks.state.reviewInserts = [];
    supabaseMocks.state.lastVenueFilter = '';
    supabaseMocks.from.mockClear();
    supabaseMocks.venueSelect.mockClear();
    supabaseMocks.venueOr.mockClear();
    supabaseMocks.venueLimit.mockClear();
    supabaseMocks.reviewSelect.mockClear();
    supabaseMocks.reviewOr.mockClear();
    supabaseMocks.reviewOrder.mockClear();
    supabaseMocks.reviewInsert.mockClear();
    supabaseMocks.reviewInsertSelect.mockClear();
    supabaseMocks.reviewSingle.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  test('[P0] live venue slug absent from fixture returns 200 empty reviews instead of 404', async () => {
    useLiveSupabaseMode();
    supabaseMocks.state.venueRows = [liveVenueRow];

    const res = await GET(makeGet('live-zero-review'));

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    const body = (await res.json()) as GetReviewsResponse;
    expect(body.reviews).toEqual([]);
    expect(body.summary).toEqual({ averageRating: null, reviewCount: 0 });
    expect(supabaseMocks.from).toHaveBeenCalledWith('venues');
  });

  test('[P0] live venue numeric id resolves before slug on POST', async () => {
    useLiveSupabaseMode();
    supabaseMocks.state.venueRows = [liveVenueRow];

    const res = await POST(makePost({
      venueId: '8',
      venueSlug: 'live-zero-review',
      text: 'Live venue review works.',
      rating: 5,
    }));

    expect(res.status).toBe(201);
    const body = (await res.json()) as SubmitReviewResponse;
    expect(body.review).toMatchObject({
      id: 'db_review_12_7',
      venueId: '8',
      venueSlug: 'live-zero-review',
      text: 'Live venue review works.',
      rating: 5,
    });
    expect(supabaseMocks.state.reviewInserts).toEqual([
      expect.objectContaining({
        venue_id: '8',
        venue_slug: 'live-zero-review',
      }),
    ]);
  });

  test('[P1] supabase mode never falls back to fixture identity when the live store misses', async () => {
    useLiveSupabaseMode();
    supabaseMocks.state.venueRows = [];

    const res = await GET(makeGet('test-venue-sunny'));

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ status: 404 });
    expect(supabaseMocks.from).toHaveBeenCalledWith('venues');
    expect(supabaseMocks.reviewSelect).not.toHaveBeenCalled();
  });

  test('[P0] hidden and unknown live identifiers share the same 404 class and do not hit review persistence', async () => {
    useLiveSupabaseMode();
    supabaseMocks.state.venueRows = [
      { ...liveVenueRow, id: '9', slug: 'private-live', hidden: true },
    ];

    for (const identifier of ['private-live', 'missing-live']) {
      const res = await GET(makeGet(identifier));
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toMatchObject({ status: 404 });
      expect(JSON.stringify(body)).not.toMatch(/hidden|is_hidden|deleted|visibility/i);
    }
    expect(supabaseMocks.from).toHaveBeenCalledWith('venues');
    expect(supabaseMocks.reviewSelect).not.toHaveBeenCalled();
  });

  test('[P1] route source converges on the shared resolver instead of review-persistence fixture resolution', () => {
    const routeSource = readSource(reviewsRoutePath);
    const persistenceSource = readSource(reviewPersistencePath);

    expect(routeSource).toMatch(/resolvePublicVenueIdentifier/);
    expect(routeSource).not.toMatch(/resolveReviewVenueIdentifier/);
    expect(routeSource).not.toMatch(/VENUE_FIXTURE/);
    expect(persistenceSource).not.toMatch(/export function resolveReviewVenueIdentifier/);
    expect(persistenceSource).not.toMatch(/import\s+\{\s*VENUE_FIXTURE\s*\}/);
  });
});
