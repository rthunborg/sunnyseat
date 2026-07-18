import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  clearReviewRateLimitForTests,
  GET as reviewsGET,
  POST as reviewsPOST,
} from '@/app/api/reviews/route';
import { POST as feedbackPOST } from '@/app/api/venues/[slug]/feedback/route';
import type { FeedbackResponse, ReviewDto, VenueDataDto } from '@/lib/types/api';

const venueStoreMock = vi.hoisted(() => ({
  resolvePublicVenueIdentifier: vi.fn(),
}));

const reviewPersistenceMock = vi.hoisted(() => ({
  getVenueReviewsFromPersistence: vi.fn(),
  persistVenueReview: vi.fn(),
  summarizeReviews: vi.fn((reviews: ReviewDto[]) => ({
    averageRating: null,
    reviewCount: reviews.length,
  })),
}));

const feedbackPersistenceMock = vi.hoisted(() => ({
  persistVenueFeedback: vi.fn(async (feedback: FeedbackResponse) => feedback),
}));

vi.mock('@/lib/services/venue-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/venue-store')>();
  return {
    ...actual,
    resolvePublicVenueIdentifier: venueStoreMock.resolvePublicVenueIdentifier,
  };
});

vi.mock('@/lib/services/venue-reviews-persistence', () => ({
  getVenueReviewsFromPersistence: reviewPersistenceMock.getVenueReviewsFromPersistence,
  persistVenueReview: reviewPersistenceMock.persistVenueReview,
  summarizeReviews: reviewPersistenceMock.summarizeReviews,
}));

vi.mock('@/lib/services/venue-feedback-persistence', () => ({
  persistVenueFeedback: feedbackPersistenceMock.persistVenueFeedback,
}));

const LIVE_VENUE: VenueDataDto = {
  id: '8',
  venueId: '8',
  venueName: 'Live Zero Review',
  venueSlug: 'live-zero-review',
  slug: 'live-zero-review',
  neighborhood: 'Centrum',
  location: { lat: 57.706, lng: 11.971 },
  currentSunStatus: 'NoSun',
  isPartner: false,
  confidence: 76,
  distanceMeters: 0,
  sunExposurePercent: 0,
  tags: [],
};

function makeReviewGet(identifier: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/reviews?venueId=${encodeURIComponent(identifier)}`,
  );
}

function makeReviewPost(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/reviews', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.71',
    },
  });
}

function makeFeedbackPost(identifier: string, body: unknown): NextRequest {
  return new NextRequest(
    `http://localhost/api/venues/${encodeURIComponent(identifier)}/feedback`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    },
  );
}

const VALID_FEEDBACK_BODY = {
  userTimestamp: '2026-07-18T12:00:00.000Z',
  predictedState: 'Sunny',
  wasSunny: true,
};

describe('Story 12.7 automated route convergence coverage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-18T12:00:00.000Z'));
    clearReviewRateLimitForTests();
    venueStoreMock.resolvePublicVenueIdentifier.mockReset();
    reviewPersistenceMock.getVenueReviewsFromPersistence.mockReset();
    reviewPersistenceMock.persistVenueReview.mockReset();
    reviewPersistenceMock.summarizeReviews.mockClear();
    feedbackPersistenceMock.persistVenueFeedback.mockClear();
    feedbackPersistenceMock.persistVenueFeedback.mockImplementation(async (feedback) => feedback);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('[P0] reviews GET uses the shared resolver and preserves the zero-review no-store response', async () => {
    venueStoreMock.resolvePublicVenueIdentifier.mockResolvedValueOnce(LIVE_VENUE);
    reviewPersistenceMock.getVenueReviewsFromPersistence.mockResolvedValueOnce([]);

    const res = await reviewsGET(makeReviewGet('live-zero-review'));

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    await expect(res.json()).resolves.toMatchObject({
      reviews: [],
      summary: { averageRating: null, reviewCount: 0 },
    });
    expect(venueStoreMock.resolvePublicVenueIdentifier).toHaveBeenCalledTimes(1);
    expect(venueStoreMock.resolvePublicVenueIdentifier)
      .toHaveBeenCalledWith('live-zero-review');
    expect(reviewPersistenceMock.getVenueReviewsFromPersistence).toHaveBeenCalledTimes(1);
    expect(reviewPersistenceMock.getVenueReviewsFromPersistence)
      .toHaveBeenCalledWith(LIVE_VENUE);
  });

  it('[P0] reviews POST resolves body venueId first and persists against the resolved live identity', async () => {
    venueStoreMock.resolvePublicVenueIdentifier.mockResolvedValueOnce(LIVE_VENUE);
    reviewPersistenceMock.persistVenueReview.mockImplementationOnce(async (review) => ({
      ...review,
      id: 'persisted-live-review',
      createdAt: '2026-07-18T12:00:00.000Z',
    }));
    reviewPersistenceMock.getVenueReviewsFromPersistence.mockResolvedValueOnce([
      {
        id: 'persisted-live-review',
        venueId: '8',
        venueSlug: 'live-zero-review',
        text: 'Live write.',
        createdAt: '2026-07-18T12:00:00.000Z',
      },
    ]);

    const res = await reviewsPOST(makeReviewPost({
      venueId: '8',
      venueSlug: 'live-zero-review',
      text: 'Live write.',
    }));

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({
      review: {
        id: 'persisted-live-review',
        venueId: '8',
        venueSlug: 'live-zero-review',
        text: 'Live write.',
      },
    });
    expect(venueStoreMock.resolvePublicVenueIdentifier).toHaveBeenCalledTimes(1);
    expect(venueStoreMock.resolvePublicVenueIdentifier).toHaveBeenCalledWith('8');
    expect(reviewPersistenceMock.persistVenueReview).toHaveBeenCalledWith(
      expect.objectContaining({
        venueId: '8',
        venueSlug: 'live-zero-review',
      }),
    );
  });

  it('[P0] feedback POST decodes the route identifier and uses the same shared resolver before persistence', async () => {
    venueStoreMock.resolvePublicVenueIdentifier.mockResolvedValueOnce(LIVE_VENUE);

    const res = await feedbackPOST(
      makeFeedbackPost('live%20zero%20review', {
        ...VALID_FEEDBACK_BODY,
        venueId: '8',
        venueSlug: 'live-zero-review',
      }),
      { params: Promise.resolve({ slug: 'live%20zero%20review' }) },
    );

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({
      venueId: '8',
      venueSlug: 'live-zero-review',
      wasSunny: true,
    });
    expect(venueStoreMock.resolvePublicVenueIdentifier).toHaveBeenCalledTimes(1);
    expect(venueStoreMock.resolvePublicVenueIdentifier)
      .toHaveBeenCalledWith('live zero review');
    expect(feedbackPersistenceMock.persistVenueFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        venueId: '8',
        venueSlug: 'live-zero-review',
      }),
    );
  });

  it('[P0] rejects malformed review body identifiers before resolver or persistence access', async () => {
    const res = await reviewsPOST(makeReviewPost({
      venueId: 'live\u0000id',
      text: 'Should not reach the store.',
    }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      title: 'Invalid review payload',
      status: 400,
    });
    expect(venueStoreMock.resolvePublicVenueIdentifier).not.toHaveBeenCalled();
    expect(reviewPersistenceMock.persistVenueReview).not.toHaveBeenCalled();
  });

  it('[P0] rejects malformed feedback path identifiers before resolver or persistence access', async () => {
    const res = await feedbackPOST(
      makeFeedbackPost('live\u0000id', VALID_FEEDBACK_BODY),
      { params: Promise.resolve({ slug: 'live%00id' }) },
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      detail: 'Invalid venue identifier',
      status: 400,
    });
    expect(venueStoreMock.resolvePublicVenueIdentifier).not.toHaveBeenCalled();
    expect(feedbackPersistenceMock.persistVenueFeedback).not.toHaveBeenCalled();
  });

  it('[P0] reviews and feedback share the same non-leaking not-found boundary before persistence', async () => {
    venueStoreMock.resolvePublicVenueIdentifier.mockResolvedValue(null);

    const reviewMiss = await reviewsGET(makeReviewGet('private-live'));
    const feedbackMiss = await feedbackPOST(
      makeFeedbackPost('private-live', VALID_FEEDBACK_BODY),
      { params: Promise.resolve({ slug: 'private-live' }) },
    );

    expect(reviewMiss.status).toBe(404);
    expect(feedbackMiss.status).toBe(404);
    for (const res of [reviewMiss, feedbackMiss]) {
      const body = await res.json();
      expect(body).toMatchObject({ status: 404 });
      expect(JSON.stringify(body)).not.toMatch(/is_hidden|deleted_at|visibility|includeHidden/i);
    }
    expect(reviewPersistenceMock.getVenueReviewsFromPersistence).not.toHaveBeenCalled();
    expect(reviewPersistenceMock.persistVenueReview).not.toHaveBeenCalled();
    expect(feedbackPersistenceMock.persistVenueFeedback).not.toHaveBeenCalled();
  });
});
