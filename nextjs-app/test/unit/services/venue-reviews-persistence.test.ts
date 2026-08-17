import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPersistedVenueReviewsForTests,
  getPersistedVenueReviewsForTests,
  getReviewSummaryForVenue,
  getReviewSummaryForVenueFromPersistence,
  getVenueReviewsFromPersistence,
  getVenueReviews,
  persistVenueReview,
} from '@/lib/services/venue-reviews-persistence';
import { resolvePublicVenueIdentifier } from '@/lib/services/venue-store';
import type { ReviewDto, VenueDataDto } from '@/lib/types/api';

const supabaseMocks = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  from: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: () => ({
    from: supabaseMocks.from,
  }),
}));

const REVIEW: ReviewDto = {
  id: 'review_1',
  venueId: '1',
  venueSlug: 'test-venue-sunny',
  text: 'Mycket sol på gården.',
  rating: 5,
  createdAt: '2026-06-08T12:00:00.000Z',
};

async function fixtureVenue(identifier = 'test-venue-sunny'): Promise<VenueDataDto> {
  const venue = await resolvePublicVenueIdentifier(identifier);
  expect(venue).not.toBeNull();
  return venue!;
}

describe('venue-reviews-persistence', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    clearPersistedVenueReviewsForTests();
    supabaseMocks.rows = [];
    supabaseMocks.from.mockReset();
  });

  it('uses the shared public resolver for fixture venues by id and slug identifiers', async () => {
    await expect(resolvePublicVenueIdentifier('1'))
      .resolves.toMatchObject({ slug: 'test-venue-sunny' });
    await expect(resolvePublicVenueIdentifier('test-venue-sunny'))
      .resolves.toMatchObject({ id: '1' });
    await expect(resolvePublicVenueIdentifier('missing')).resolves.toBeNull();
  });

  it('returns seeded reviews newest-first and includes memory submissions', async () => {
    const venue = await fixtureVenue();
    await persistVenueReview(REVIEW);

    const reviews = getVenueReviews(venue);

    expect(reviews[0]).toMatchObject({
      id: 'review_1',
      text: 'Mycket sol på gården.',
    });
    expect(reviews.length).toBeGreaterThan(1);
    expect(getPersistedVenueReviewsForTests()).toHaveLength(1);
  });

  it('computes review summaries from seeded and submitted ratings', async () => {
    const venue = await fixtureVenue();
    await persistVenueReview(REVIEW);

    expect(getReviewSummaryForVenue(venue)).toEqual({
      averageRating: 4.7,
      reviewCount: 3,
    });
  });

  it('keeps memory persistence as the default even when Supabase env vars exist', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');

    await expect(persistVenueReview(REVIEW)).resolves.toMatchObject({ id: 'review_1' });
    expect(getPersistedVenueReviewsForTests()).toHaveLength(1);
  });

  it('fails closed when Supabase review persistence is explicitly selected without full credentials', async () => {
    vi.stubEnv('SUNNYSEAT_REVIEW_PERSISTENCE', 'supabase');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');

    await expect(persistVenueReview(REVIEW)).rejects.toThrow(
      'Review persistence is configured for Supabase but credentials are incomplete',
    );
    expect(getPersistedVenueReviewsForTests()).toHaveLength(0);
  });

  it('reads submitted Supabase reviews when Supabase review persistence is explicitly selected', async () => {
    vi.stubEnv('SUNNYSEAT_REVIEW_PERSISTENCE', 'supabase');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
    supabaseMocks.from.mockImplementation(() => ({
      insert: (row: Record<string, unknown>) => ({
        select: () => ({
          single: async () => {
            const saved = {
              ...row,
              id: 'supabase_review_1',
              created_at: '2026-06-08T12:05:00.000Z',
            };
            supabaseMocks.rows.push(saved);
            return {
              data: saved,
              error: null,
            };
          },
        }),
      }),
      select: () => ({
        or: () => ({
          order: async () => ({
            data: supabaseMocks.rows,
            error: null,
          }),
        }),
      }),
    }));
    const venue = await fixtureVenue();

    await expect(persistVenueReview(REVIEW)).resolves.toMatchObject({
      id: 'supabase_review_1',
      createdAt: '2026-06-08T12:05:00.000Z',
    });

    const reviews = await getVenueReviewsFromPersistence(venue);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({
      id: 'supabase_review_1',
      text: 'Mycket sol på gården.',
      rating: 5,
    });
    await expect(getReviewSummaryForVenueFromPersistence(venue!)).resolves.toEqual({
      averageRating: 5,
      reviewCount: 1,
    });
  });

  it('omits nullable Supabase optional fields from public review DTOs', async () => {
    vi.stubEnv('SUNNYSEAT_REVIEW_PERSISTENCE', 'supabase');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
    supabaseMocks.rows = [{
      id: 'supabase_review_unrated',
      venue_id: '1',
      venue_slug: 'test-venue-sunny',
      text: 'Text-only review.',
      rating: null,
      photo_name: null,
      photo_type: null,
      photo_size: null,
      photo_last_modified: null,
      created_at: '2026-06-08T12:10:00.000Z',
    }];
    supabaseMocks.from.mockImplementation(() => ({
      select: () => ({
        or: () => ({
          order: async () => ({
            data: supabaseMocks.rows,
            error: null,
          }),
        }),
      }),
    }));
    const venue = await fixtureVenue();

    const reviews = await getVenueReviewsFromPersistence(venue);

    expect(reviews).toEqual([{
      id: 'supabase_review_unrated',
      venueId: '1',
      venueSlug: 'test-venue-sunny',
      text: 'Text-only review.',
      createdAt: '2026-06-08T12:10:00.000Z',
    }]);
  });

  it('writes via the snake_case insert/select chain and excludes fixture seeds on the index-backed live read', async () => {
    vi.stubEnv('SUNNYSEAT_REVIEW_PERSISTENCE', 'supabase');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');

    const single = vi.fn(async () => ({
      data: { id: 'db_review_1', created_at: '2026-06-09T09:00:00.000Z' },
      error: null,
    }));
    const insertSelect = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select: insertSelect }));
    const order = vi.fn(async () => ({
      data: [
        {
          id: 'db_review_1',
          venue_id: '1',
          venue_slug: 'test-venue-sunny',
          text: 'Live DB review.',
          rating: 4,
          photo_name: null,
          photo_type: null,
          photo_size: null,
          photo_last_modified: null,
          created_at: '2026-06-09T09:00:00.000Z',
        },
      ],
      error: null,
    }));
    const or = vi.fn(() => ({ order }));
    const readSelect = vi.fn(() => ({ or }));
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table !== 'reviews') throw new Error(`unexpected table ${table}`);
      return { insert, select: readSelect };
    });

    const venue = await fixtureVenue();
    const photoReview: ReviewDto = {
      ...REVIEW,
      photo: { name: 'ute.jpg', type: 'image/jpeg', size: 2048, lastModified: 111 },
    };

    const persisted = await persistVenueReview(photoReview);
    expect(supabaseMocks.from).toHaveBeenCalledWith('reviews');
    expect(insert).toHaveBeenCalledWith({
      venue_id: '1',
      venue_slug: 'test-venue-sunny',
      text: 'Mycket sol på gården.',
      rating: 5,
      photo_name: 'ute.jpg',
      photo_type: 'image/jpeg',
      photo_size: 2048,
      photo_last_modified: 111,
    });
    expect(insertSelect).toHaveBeenCalledWith('id, created_at');
    expect(persisted).toMatchObject({
      id: 'db_review_1',
      createdAt: '2026-06-09T09:00:00.000Z',
    });

    const reviews = await getVenueReviewsFromPersistence(venue);
    // Operands are double-quoted so reserved PostgREST tokens in a slug/id can't
    // corrupt the filter; plain values are semantically unchanged. [Story 8.5 6.3]
    expect(or).toHaveBeenCalledWith('venue_id.eq."1",venue_slug.eq."test-venue-sunny"');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    // Clean swap: the live read returns ONLY DB rows; the in-memory fixture
    // seeds (review_fixture_1_*) must not leak into the Supabase-backed path.
    expect(reviews).toHaveLength(1);
    expect(reviews.every((review) => !review.id.startsWith('review_fixture_'))).toBe(true);
    expect(reviews[0]).toMatchObject({ id: 'db_review_1', text: 'Live DB review.', rating: 4 });
  });

  it('escapes reserved PostgREST tokens in the slug so the .or() filter cannot be corrupted (6.3)', async () => {
    vi.stubEnv('SUNNYSEAT_REVIEW_PERSISTENCE', 'supabase');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');

    const order = vi.fn(async () => ({ data: [], error: null }));
    const or = vi.fn(() => ({ order }));
    const readSelect = vi.fn(() => ({ or }));
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table !== 'reviews') throw new Error(`unexpected table ${table}`);
      return { select: readSelect };
    });

    // A live venue store can supply arbitrary slugs; a reserved token (comma,
    // dot, parens, quote) must be quoted/escaped, not raw-interpolated.
    const hostileVenue = {
      id: '1,2',
      slug: 'a","b',
    } as Parameters<typeof getVenueReviewsFromPersistence>[0];

    await getVenueReviewsFromPersistence(hostileVenue);

    // Each operand wrapped in double quotes; inner quotes backslash-escaped.
    expect(or).toHaveBeenCalledWith('venue_id.eq."1,2",venue_slug.eq."a\\",\\"b"');
  });
});
