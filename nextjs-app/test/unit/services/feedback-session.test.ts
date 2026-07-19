import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FEEDBACK_VISIT_MIN_ELAPSED_MS,
  FEEDBACK_VISIT_RADIUS_METERS,
  clearFeedbackSessionMemoryForTests,
  hasSubmittedVenueFeedback,
  isLikelyVisited,
  markVenueFeedbackSubmitted,
  readVenueDetailView,
  recordVenueDetailView,
} from '@/lib/services/feedback-session';
import type { VenueDataDto } from '@/lib/types/api';

const VENUE: Pick<
  VenueDataDto,
  'id' | 'slug' | 'venueSlug' | 'location' | 'currentSunStatus' | 'weatherGateState' | 'confidence'
> = {
  id: '1',
  slug: 'test-venue-sunny',
  venueSlug: 'test-venue-sunny',
  location: { lat: 57.705, lng: 11.97 },
  currentSunStatus: 'Sunny',
  weatherGateState: 'not_gated',
  confidence: 92,
};

describe('feedback-session', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-07T12:00:00.000Z'));
    window.sessionStorage.clear();
    clearFeedbackSessionMemoryForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('records detail views and submitted venues in sessionStorage', () => {
    recordVenueDetailView(VENUE, '2026-06-07T12:00:00.000Z');
    expect(readVenueDetailView(VENUE.id)).toMatchObject({
      venueId: '1',
      plannerTimestamp: '2026-06-07T12:00:00.000Z',
      confidenceAtPrediction: 92,
    });

    expect(hasSubmittedVenueFeedback(VENUE.id)).toBe(false);
    markVenueFeedbackSubmitted(VENUE.id);
    expect(hasSubmittedVenueFeedback(VENUE.id)).toBe(true);
  });

  it('treats only successful nearby geolocation after elapsed time as likely visited', () => {
    recordVenueDetailView(VENUE, '2026-06-07T12:00:00.000Z');
    vi.setSystemTime(new Date(Date.now() + FEEDBACK_VISIT_MIN_ELAPSED_MS + 1));

    expect(isLikelyVisited({
      venue: VENUE,
      geolocationStatus: 'success',
      coords: VENUE.location,
    })).toBe(true);
    expect(isLikelyVisited({
      venue: VENUE,
      geolocationStatus: 'fallback',
      coords: VENUE.location,
    })).toBe(false);
    expect(isLikelyVisited({
      venue: VENUE,
      geolocationStatus: 'success',
      coords: { lat: VENUE.location.lat + 0.02, lng: VENUE.location.lng },
    })).toBe(false);
  });

  it('returns false before enough time has elapsed', () => {
    recordVenueDetailView(VENUE, '2026-06-07T12:00:00.000Z');
    vi.setSystemTime(new Date(Date.now() + FEEDBACK_VISIT_MIN_ELAPSED_MS - 1));

    expect(isLikelyVisited({
      venue: VENUE,
      geolocationStatus: 'success',
      coords: VENUE.location,
    })).toBe(false);
  });

  it('handles disabled sessionStorage without throwing', () => {
    const getItem = vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(hasSubmittedVenueFeedback('1')).toBe(false);
    expect(readVenueDetailView('1')).toBeNull();
    getItem.mockRestore();
  });

  it('falls back to in-memory duplicate suppression when sessionStorage writes fail', () => {
    const setItem = vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    markVenueFeedbackSubmitted(VENUE.id);

    expect(hasSubmittedVenueFeedback(VENUE.id)).toBe(true);
    setItem.mockRestore();
  });

  it('exposes conservative eligibility constants', () => {
    expect(FEEDBACK_VISIT_RADIUS_METERS).toBeLessThanOrEqual(200);
    expect(FEEDBACK_VISIT_MIN_ELAPSED_MS).toBeGreaterThanOrEqual(5 * 60 * 1000);
  });
});
