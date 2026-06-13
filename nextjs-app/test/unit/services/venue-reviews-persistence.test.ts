import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPersistedVenueReviewsForTests,
  getPersistedVenueReviewsForTests,
  getReviewSummaryForVenue,
  getReviewSummaryForVenueFromPersistence,
  getVenueReviewsFromPersistence,
  getVenueReviews,
  persistVenueReview,
  resolveReviewVenueIdentifier,
} from '@/lib/services/venue-reviews-persistence';
import type { ReviewDto } from '@/lib/types/api';

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

describe('venue-reviews-persistence', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    clearPersistedVenueReviewsForTests();
    supabaseMocks.rows = [];
    supabaseMocks.from.mockReset();
  });

  it('resolves fixture venues by id and slug identifiers', () => {
    expect(resolveReviewVenueIdentifier('1')?.slug).toBe('test-venue-sunny');
    expect(resolveReviewVenueIdentifier('test-venue-sunny')?.id).toBe('1');
    expect(resolveReviewVenueIdentifier('missing')).toBeNull();
  });

  it('returns seeded reviews newest-first and includes memory submissions', async () => {
    const venue = resolveReviewVenueIdentifier('test-venue-sunny');
    expect(venue).not.toBeNull();
    await persistVenueReview(REVIEW);

    const reviews = getVenueReviews(venue!);

    expect(reviews[0]).toMatchObject({
      id: 'review_1',
      text: 'Mycket sol på gården.',
    });
    expect(reviews.length).toBeGreaterThan(1);
    expect(getPersistedVenueReviewsForTests()).toHaveLength(1);
  });

  it('computes review summaries from seeded and submitted ratings', async () => {
    const venue = resolveReviewVenueIdentifier('test-venue-sunny');
    await persistVenueReview(REVIEW);

    expect(getReviewSummaryForVenue(venue!)).toEqual({
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
    const venue = resolveReviewVenueIdentifier('test-venue-sunny');

    await expect(persistVenueReview(REVIEW)).resolves.toMatchObject({
      id: 'supabase_review_1',
      createdAt: '2026-06-08T12:05:00.000Z',
    });

    const reviews = await getVenueReviewsFromPersistence(venue!);
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
    const venue = resolveReviewVenueIdentifier('test-venue-sunny');

    const reviews = await getVenueReviewsFromPersistence(venue!);

    expect(reviews).toEqual([{
      id: 'supabase_review_unrated',
      venueId: '1',
      venueSlug: 'test-venue-sunny',
      text: 'Text-only review.',
      createdAt: '2026-06-08T12:10:00.000Z',
    }]);
  });
});
