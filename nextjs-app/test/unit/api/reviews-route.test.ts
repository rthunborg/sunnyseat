import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  GET,
  POST,
  clearReviewRateLimitForTests,
} from '@/app/api/reviews/route';
import {
  clearPersistedVenueReviewsForTests,
} from '@/lib/services/venue-reviews-persistence';
import type { GetReviewsResponse, SubmitReviewResponse } from '@/lib/types/api';

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: () => ({
    from: supabaseMocks.from,
  }),
}));

function makeGet(url: string): NextRequest {
  return new NextRequest(url);
}

function makePost(
  body: unknown,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest('http://localhost/api/reviews', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.10',
      ...headers,
    },
  });
}

const VALID_BODY = {
  venueId: '1',
  venueSlug: 'test-venue-sunny',
  text: 'Soligt och bra bord.',
};

const LIVE_VENUE_ROW = {
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

function useLiveSupabaseReviews() {
  vi.stubEnv('SUNNYSEAT_VENUE_STORE', 'supabase');
  vi.stubEnv('SUNNYSEAT_REVIEW_PERSISTENCE', 'supabase');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
}

describe('/api/reviews', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-08T12:00:00.000Z'));
    clearPersistedVenueReviewsForTests();
    clearReviewRateLimitForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    supabaseMocks.from.mockReset();
  });

  it('returns fixture-backed reviews and summary for venue identifiers', async () => {
    const res = await GET(makeGet('http://localhost/api/reviews?venueId=test-venue-sunny'));

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    const body = (await res.json()) as GetReviewsResponse;
    expect(body.reviews.length).toBeGreaterThan(0);
    expect(body.reviews[0].createdAt >= body.reviews[1].createdAt).toBe(true);
    expect(body.summary).toEqual({ averageRating: 4.5, reviewCount: 2 });
  });

  it('rejects missing and unknown venue ids with stable 4xx responses', async () => {
    const missing = await GET(makeGet('http://localhost/api/reviews'));
    expect(missing.status).toBe(400);
    await expect(missing.json()).resolves.toMatchObject({
      detail: 'venueId query parameter is required',
      status: 400,
    });

    const unknown = await GET(makeGet('http://localhost/api/reviews?venueId=missing'));
    expect(unknown.status).toBe(404);
    await expect(unknown.json()).resolves.toMatchObject({
      detail: 'Venue not found: missing',
      status: 404,
    });
  });

  it('submits a valid anonymous review with optional rating and photo metadata', async () => {
    const res = await POST(makePost({
      ...VALID_BODY,
      text: 'Rad ett\r\nRad två',
      rating: 5,
      photo: {
        name: 'ute.jpg',
        type: 'image/jpeg',
        size: 1024,
        lastModified: 123,
      },
    }));

    expect(res.status).toBe(201);
    const body = (await res.json()) as SubmitReviewResponse;
    expect(body.review).toMatchObject({
      venueId: '1',
      venueSlug: 'test-venue-sunny',
      text: 'Rad ett\nRad två',
      rating: 5,
      photo: {
        name: 'ute.jpg',
        type: 'image/jpeg',
        size: 1024,
      },
      createdAt: '2026-06-08T12:00:00.000Z',
    });
    expect(body.summary).toEqual({ averageRating: 4.7, reviewCount: 3 });
  });

  it('accepts text-only reviews without a rating', async () => {
    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({
      review: {
        text: 'Soligt och bra bord.',
      },
    });
  });

  it('returns success after a persisted review even when the follow-up summary read fails', async () => {
    vi.stubEnv('SUNNYSEAT_REVIEW_PERSISTENCE', 'supabase');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
    supabaseMocks.from.mockImplementation(() => ({
      insert: () => ({
        select: () => ({
          single: async () => ({
            data: {
              id: 'supabase_review_1',
              created_at: '2026-06-08T12:00:00.000Z',
            },
            error: null,
          }),
        }),
      }),
      select: () => ({
        or: () => ({
          order: async () => ({
            data: null,
            error: { message: 'read unavailable' },
          }),
        }),
      }),
    }));

    const res = await POST(makePost({
      ...VALID_BODY,
      rating: 5,
    }));

    expect(res.status).toBe(201);
    const body = (await res.json()) as SubmitReviewResponse;
    expect(body.review).toMatchObject({
      id: 'supabase_review_1',
      text: 'Soligt och bra bord.',
      rating: 5,
    });
    expect(body.summary).toEqual({ averageRating: 5, reviewCount: 1 });
  });

  it('resolves live Supabase venues absent from fixtures for empty reads and id-first posts', async () => {
    useLiveSupabaseReviews();
    const reviewInserts: Array<Record<string, unknown>> = [];
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table === 'venues') {
        const venueQuery = {
          eq: () => venueQuery,
          is: () => venueQuery,
          limit: async () => ({ data: [LIVE_VENUE_ROW], error: null }),
        };
        return {
          select: () => ({
            or: () => venueQuery,
          }),
        };
      }
      if (table === 'reviews') {
        return {
          select: () => ({
            or: () => ({
              order: async () => ({ data: [], error: null }),
            }),
          }),
          insert: (row: Record<string, unknown>) => {
            reviewInserts.push(row);
            return {
              select: () => ({
                single: async () => ({
                  data: {
                    id: 'db_live_review',
                    created_at: '2026-06-08T12:00:00.000Z',
                  },
                  error: null,
                }),
              }),
            };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const read = await GET(makeGet('http://localhost/api/reviews?venueId=live-zero-review'));
    expect(read.status).toBe(200);
    await expect(read.json()).resolves.toMatchObject({
      reviews: [],
      summary: { averageRating: null, reviewCount: 0 },
    });

    const write = await POST(makePost({
      venueId: '8',
      venueSlug: 'live-zero-review',
      text: 'Live venue review works.',
      rating: 5,
    }));
    expect(write.status).toBe(201);
    await expect(write.json()).resolves.toMatchObject({
      review: {
        id: 'db_live_review',
        venueId: '8',
        venueSlug: 'live-zero-review',
      },
    });
    expect(reviewInserts).toEqual([
      expect.objectContaining({
        venue_id: '8',
        venue_slug: 'live-zero-review',
      }),
    ]);
  });

  it('rejects invalid content type and oversized JSON before persistence', async () => {
    const contentType = await POST(makePost(VALID_BODY, {
      'content-type': 'text/plain',
    }));
    expect(contentType.status).toBe(415);

    const oversized = await POST(makePost(VALID_BODY, {
      'content-length': String(17 * 1024),
    }));
    expect(oversized.status).toBe(413);
  });

  it('rejects oversized JSON bodies without requiring a content-length header', async () => {
    const oversizedText = 'x'.repeat(17 * 1024);
    const res = await POST(makePost({
      ...VALID_BODY,
      text: oversizedText,
    }));

    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toMatchObject({
      detail: 'Review payload is too large',
      status: 413,
    });
  });

  it('rejects malformed text, rating, and photo metadata with stable validation shape', async () => {
    const cases = [
      { ...VALID_BODY, text: '   ' },
      { ...VALID_BODY, text: 'bad\u0000text' },
      { ...VALID_BODY, rating: 6 },
      { ...VALID_BODY, photo: { name: 'note.txt', type: 'text/plain', size: 100 } },
      { ...VALID_BODY, photo: { name: 'huge.jpg', type: 'image/jpeg', size: 6 * 1024 * 1024 } },
    ];

    for (const body of cases) {
      const res = await POST(makePost(body));
      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toMatchObject({
        title: 'Invalid review payload',
        status: 400,
      });
    }
  });

  it('rejects unknown venues and mismatched identifiers', async () => {
    const unknown = await POST(makePost({ ...VALID_BODY, venueId: 'missing' }));
    expect(unknown.status).toBe(404);

    const mismatch = await POST(makePost({ ...VALID_BODY, venueId: '1', venueSlug: 'bryggeriet-soltak' }));
    expect(mismatch.status).toBe(409);
    await expect(mismatch.json()).resolves.toMatchObject({
      detail: 'Body venueSlug does not match venueId',
      status: 409,
    });
  });

  it('accepts slug-like values in venueId because identifier resolution supports venue aliases', async () => {
    const res = await POST(makePost({
      venueId: 'test-venue-sunny',
      text: 'Sluggen används som identifierare.',
    }));

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({
      review: {
        venueId: '1',
        venueSlug: 'test-venue-sunny',
        text: 'Sluggen används som identifierare.',
      },
    });
  });

  it('rate-limits repeated review submissions without storing raw IP values', async () => {
    let last: Response | undefined;
    for (let index = 0; index < 31; index += 1) {
      last = await POST(makePost({
        ...VALID_BODY,
        text: `Soligt ${index}`,
      }, {
        'x-forwarded-for': '203.0.113.99',
      }));
    }

    expect(last?.status).toBe(429);
    await expect(last?.json()).resolves.toMatchObject({
      detail: 'Too many review requests',
      status: 429,
    });
  });
});
