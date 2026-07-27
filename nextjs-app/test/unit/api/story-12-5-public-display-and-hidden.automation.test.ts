import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as venuesGET } from '@/app/api/venues/route';
import { GET as detailGET } from '@/app/api/venues/[slug]/route';
import {
  clearReviewRateLimitForTests,
  GET as reviewsGET,
  POST as reviewsPOST,
} from '@/app/api/reviews/route';
import { POST as feedbackPOST } from '@/app/api/venues/[slug]/feedback/route';
import {
  getVenues,
  resolvePublicVenueIdentifier,
} from '@/lib/services/venue-store';
import {
  getVenueReviewsFromPersistence,
  persistVenueReview,
  summarizeReviews,
} from '@/lib/services/venue-reviews-persistence';
import { persistVenueFeedback } from '@/lib/services/venue-feedback-persistence';
import type {
  FeedbackResponse,
  ReviewDto,
  VenueDataDto,
} from '@/lib/types/api';
import type { StoredVenue } from '@/lib/services/venue-store';

const venueStoreMock = vi.hoisted(() => ({
  getVenues: vi.fn(),
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
    getVenues: venueStoreMock.getVenues,
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

const displayVenue: VenueDataDto = {
  id: 'display',
  venueId: 'display',
  venueName: 'Display Venue',
  venueSlug: 'display-venue',
  slug: 'display-venue',
  neighborhood: 'Centrum',
  location: { lat: 57.7061, lng: 11.9712 },
  currentSunStatus: 'Sunny',
  weatherGateState: 'not_gated',
  isPartner: false,
  confidence: 90,
  distanceMeters: 0,
  sunExposurePercent: 90,
  tags: ['Innergård'],
};

const engineOnlyNearVenue: VenueDataDto = {
  ...displayVenue,
  id: 'engine-near',
  venueId: 'engine-near',
  venueName: 'Engine Near Venue',
  venueSlug: 'engine-near-venue',
  slug: 'engine-near-venue',
  location: { lat: 57.72, lng: 12.0 },
  sunExposurePercent: 80,
};

const visibleDetailVenue: StoredVenue = {
  ...displayVenue,
  description: 'Synlig publik beskrivning.',
  address: 'Tredje Långgatan 9, Göteborg',
};

function venuesRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`);
}

function detailContext(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function reviewGet(identifier: string): NextRequest {
  return venuesRequest(`/api/reviews?venueId=${encodeURIComponent(identifier)}`);
}

function reviewPost(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/reviews', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.72',
    },
  });
}

function feedbackPost(identifier: string, body: unknown): NextRequest {
  return new NextRequest(
    `http://localhost/api/venues/${encodeURIComponent(identifier)}/feedback`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    },
  );
}

describe('Story 12.5 public display coordinates and hidden route matrix', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T12:00:00.000Z'));
    clearReviewRateLimitForTests();
    venueStoreMock.getVenues.mockReset();
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

  it('uses display coordinates for public radius inclusion and distance calculation', async () => {
    venueStoreMock.getVenues.mockResolvedValueOnce([
      displayVenue,
      engineOnlyNearVenue,
    ]);

    const res = await venuesGET(venuesRequest(
      '/api/venues?lat=57.7061&lng=11.9712&radiusKm=0.05',
    ));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(getVenues).toHaveBeenCalledTimes(1);
    expect(body.venues).toHaveLength(1);
    expect(body.venues[0]).toMatchObject({
      id: 'display',
      location: displayVenue.location,
      distanceMeters: 0,
    });
    expect(body.venues[0]).not.toHaveProperty('engineLocation');
  });

  it('keeps public list/detail responses hidden-blind and restores visibility through the shared resolver', async () => {
    venueStoreMock.resolvePublicVenueIdentifier
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(visibleDetailVenue);

    const hidden = await detailGET(
      venuesRequest('/api/venues/private-hidden'),
      detailContext('private-hidden'),
    );
    const visible = await detailGET(
      venuesRequest('/api/venues/display-venue'),
      detailContext('display-venue'),
    );

    expect(hidden.status).toBe(404);
    expect(JSON.stringify(await hidden.json())).not.toMatch(/hidden|private|visibility|includeHidden/i);
    expect(visible.status).toBe(200);
    const visibleBody = await visible.json();
    expect(visibleBody.venue).toMatchObject({
      id: 'display',
      location: displayVenue.location,
      description: 'Synlig publik beskrivning.',
    });
    expect(visibleBody.venue).not.toHaveProperty('hidden');
    expect(resolvePublicVenueIdentifier).toHaveBeenCalledWith('private-hidden');
    expect(resolvePublicVenueIdentifier).toHaveBeenCalledWith('display-venue');
  });

  it('returns the same public not-found class for hidden detail, reviews, and feedback before persistence', async () => {
    venueStoreMock.resolvePublicVenueIdentifier.mockResolvedValue(null);

    const hiddenIdentifier = 'skyddad-testplats';
    const detailMiss = await detailGET(
      venuesRequest(`/api/venues/${hiddenIdentifier}`),
      detailContext(hiddenIdentifier),
    );
    const reviewsMiss = await reviewsGET(reviewGet(hiddenIdentifier));
    const reviewWriteMiss = await reviewsPOST(reviewPost({
      venueId: hiddenIdentifier,
      text: 'Ska inte sparas.',
    }));
    const feedbackMiss = await feedbackPOST(
      feedbackPost(hiddenIdentifier, {
        userTimestamp: '2026-07-27T12:00:00.000Z',
        predictedState: 'Sunny',
        wasSunny: true,
      }),
      detailContext(hiddenIdentifier),
    );

    expect(detailMiss.status).toBe(404);
    expect(reviewsMiss.status).toBe(404);
    expect(reviewWriteMiss.status).toBe(404);
    expect(feedbackMiss.status).toBe(404);
    for (const res of [detailMiss, reviewsMiss, reviewWriteMiss, feedbackMiss]) {
      expect(JSON.stringify(await res.json())).not.toMatch(/hidden|visibility|includeHidden/i);
    }
    expect(getVenueReviewsFromPersistence).not.toHaveBeenCalled();
    expect(persistVenueReview).not.toHaveBeenCalled();
    expect(persistVenueFeedback).not.toHaveBeenCalled();
  });
});
