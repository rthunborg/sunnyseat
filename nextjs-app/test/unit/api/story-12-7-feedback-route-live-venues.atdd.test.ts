/**
 * ATDD RED-PHASE acceptance tests - Story 12.7
 * Venue feedback POST must use the same live public venue resolver as reviews.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { POST } from '@/app/api/venues/[slug]/feedback/route';
import type { FeedbackResponse } from '@/lib/types/api';

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

const persistenceMock = vi.hoisted(() => ({
  persistVenueFeedback: vi.fn(async (feedback: FeedbackResponse) => feedback),
}));

const supabaseMocks = vi.hoisted(() => {
  const state = {
    venueRows: [] as VenueRow[],
    lastVenueFilter: '',
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

  const limit = vi.fn(async (count: number) => ({
    data: candidateVenueRows().slice(0, count),
    error: null,
  }));
  const or = vi.fn((filter: string) => {
    state.lastVenueFilter = filter;
    return { limit };
  });
  const select = vi.fn(() => ({ or }));
  const from = vi.fn((table: string) => {
    if (table !== 'venues') throw new Error(`unexpected table ${table}`);
    return { select };
  });

  return { state, from, select, or, limit };
});

vi.mock('@/lib/services/venue-feedback-persistence', () => ({
  persistVenueFeedback: persistenceMock.persistVenueFeedback,
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: () => ({
    from: supabaseMocks.from,
  }),
}));

const appRoot = process.cwd();
const feedbackRoutePath = join(appRoot, 'app', 'api', 'venues', '[slug]', 'feedback', 'route.ts');

const liveVenueRow: VenueRow = {
  id: '8',
  slug: 'live-zero-review',
  venue_name: 'Live Zero Review',
  neighborhood: 'Centrum',
  lat: 57.706,
  lng: 11.971,
  is_partner: false,
  hidden: false,
  current_sun_status: 'Sunny',
  confidence: 82,
  sun_exposure_percent: 71,
  tags: [],
};

const validFeedbackBody = {
  userTimestamp: '2026-07-18T12:00:00.000Z',
  predictedState: 'Sunny',
  sunExposurePercent: 82,
  publicSunVerdict: 'amber',
  weatherGated: false,
  weatherUnknown: false,
  geometryInputHash: 'g1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  confidenceAtPrediction: 82,
  wasSunny: true,
  outdoorSeatingConfirmed: true,
  note: 'Solen stämde på live-venue.',
};

function readRouteSource(): string {
  return existsSync(feedbackRoutePath) ? readFileSync(feedbackRoutePath, 'utf8') : '';
}

function useSupabaseVenueStore() {
  vi.stubEnv('SUNNYSEAT_VENUE_STORE', 'supabase');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
}

function makeRequest(identifier: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/venues/${encodeURIComponent(identifier)}/feedback`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('Story 12.7 AC4 - /api/venues/[slug]/feedback live venue resolution', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-18T12:05:00.000Z'));
    vi.unstubAllEnvs();
    persistenceMock.persistVenueFeedback.mockClear();
    persistenceMock.persistVenueFeedback.mockImplementation(async (feedback) => feedback);
    supabaseMocks.state.venueRows = [];
    supabaseMocks.state.lastVenueFilter = '';
    supabaseMocks.from.mockClear();
    supabaseMocks.select.mockClear();
    supabaseMocks.or.mockClear();
    supabaseMocks.limit.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  test('[P0] live venue slug absent from fixture can submit feedback', async () => {
    useSupabaseVenueStore();
    supabaseMocks.state.venueRows = [liveVenueRow];

    const res = await POST(makeRequest('live-zero-review', validFeedbackBody), {
      params: Promise.resolve({ slug: 'live-zero-review' }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as FeedbackResponse;
    expect(body).toMatchObject({
      venueId: '8',
      venueSlug: 'live-zero-review',
      predictedState: 'Sunny',
      wasSunny: true,
      createdAt: '2026-07-18T12:05:00.000Z',
    });
    expect(persistenceMock.persistVenueFeedback).toHaveBeenCalledWith(expect.objectContaining({
      venueId: '8',
      venueSlug: 'live-zero-review',
    }));
  });

  test('[P0] live numeric id path resolves to the same venue slug before feedback persistence', async () => {
    useSupabaseVenueStore();
    supabaseMocks.state.venueRows = [liveVenueRow];

    const res = await POST(makeRequest('8', {
      ...validFeedbackBody,
      venueId: '8',
      venueSlug: 'live-zero-review',
    }), {
      params: Promise.resolve({ slug: '8' }),
    });

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({
      venueId: '8',
      venueSlug: 'live-zero-review',
    });
  });

  test('[P0] hidden and unknown live identifiers return the same public 404 before persistence', async () => {
    useSupabaseVenueStore();
    supabaseMocks.state.venueRows = [
      { ...liveVenueRow, id: '9', slug: 'private-live', hidden: true },
    ];

    for (const identifier of ['private-live', 'missing-live']) {
      const res = await POST(makeRequest(identifier, validFeedbackBody), {
        params: Promise.resolve({ slug: identifier }),
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toMatchObject({ status: 404 });
      expect(JSON.stringify(body)).not.toMatch(/hidden|is_hidden|deleted|visibility/i);
    }
    expect(supabaseMocks.from).toHaveBeenCalledWith('venues');
    expect(persistenceMock.persistVenueFeedback).not.toHaveBeenCalled();
  });

  test('[P1] route source imports the shared public resolver and has no route-local fixture match', () => {
    const source = readRouteSource();

    expect(source).toMatch(/resolvePublicVenueIdentifier/);
    expect(source).not.toMatch(/import\s+\{\s*VENUE_FIXTURE\s*\}/);
    expect(source).not.toMatch(/VENUE_FIXTURE\.find/);
    expect(source).not.toMatch(/includeHidden/);
  });
});
