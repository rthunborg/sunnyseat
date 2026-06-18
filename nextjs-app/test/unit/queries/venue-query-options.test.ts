import { describe, expect, it } from 'vitest';
import {
  HttpError,
  isVenueNotFoundError,
  shouldRetryVenueQuery,
  venueQueryRetryDelay,
  VENUE_QUERY_RETRY_ATTEMPTS,
} from '@/hooks/queries/venue-query-options';

describe('HttpError', () => {
  it('carries the numeric status alongside the message', () => {
    const error = new HttpError('Venue detail failed: 404 Not Found', 404);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Venue detail failed: 404 Not Found');
    expect(error.status).toBe(404);
    expect(error.name).toBe('HttpError');
  });
});

describe('isVenueNotFoundError (status-first, regex fallback)', () => {
  it('treats a status-404 error as not-found regardless of message text', () => {
    expect(isVenueNotFoundError(new HttpError('any wording at all', 404))).toBe(true);
  });

  it('does not treat non-404 status errors as not-found', () => {
    expect(isVenueNotFoundError(new HttpError('Venue detail failed: 500', 500))).toBe(false);
    expect(isVenueNotFoundError(new HttpError('Venue detail failed: 403', 403))).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isVenueNotFoundError(null)).toBe(false);
    expect(isVenueNotFoundError(undefined)).toBe(false);
  });

  it('falls back to the message regex when no numeric status is present', () => {
    expect(isVenueNotFoundError(new Error('Venue detail failed: 404 Not Found'))).toBe(true);
    expect(isVenueNotFoundError(new Error('Venue detail failed: 500'))).toBe(false);
    expect(isVenueNotFoundError(new Error('network error'))).toBe(false);
  });

  it('ignores a status field on a non-HttpError (status trust is HttpError-only)', () => {
    // status 404 would mean not-found, but a foreign error is not trusted, so
    // the message regex decides — and "500" is not a 404. [Story 8.2 R1-P5]
    const foreign = Object.assign(new Error('Venue detail failed: 500'), { status: 404 });
    expect(isVenueNotFoundError(foreign)).toBe(false);
  });
});

describe('shouldRetryVenueQuery (status-first, regex fallback)', () => {
  it('does not retry 4xx client errors detected by status', () => {
    expect(shouldRetryVenueQuery(0, new HttpError('Venue search failed: 404', 404))).toBe(false);
    expect(shouldRetryVenueQuery(0, new HttpError('Venue search failed: 400', 400))).toBe(false);
  });

  it('retries server errors detected by status (until the attempt cap)', () => {
    expect(shouldRetryVenueQuery(0, new HttpError('Venue search failed: 500', 500))).toBe(true);
    expect(
      shouldRetryVenueQuery(VENUE_QUERY_RETRY_ATTEMPTS, new HttpError('Venue search failed: 500', 500)),
    ).toBe(false);
  });

  it('falls back to the message regex for errors without a status', () => {
    expect(shouldRetryVenueQuery(0, new Error('Venue search failed: 404 Not Found'))).toBe(false);
    expect(shouldRetryVenueQuery(0, new Error('Venue search failed: 503'))).toBe(true);
    expect(shouldRetryVenueQuery(0, new Error('unexpected content-type'))).toBe(true);
  });

  it('does not trust a foreign status field for retry decisions (HttpError-only gate)', () => {
    // A 404 on a non-HttpError is ignored; the retryable "503" message wins. [R1-P5]
    const foreign = Object.assign(new Error('Venue search failed: 503'), { status: 404 });
    expect(shouldRetryVenueQuery(0, foreign)).toBe(true);
  });
});

describe('venueQueryRetryDelay', () => {
  it('grows exponentially and caps', () => {
    expect(venueQueryRetryDelay(0)).toBe(1000);
    expect(venueQueryRetryDelay(1)).toBe(2000);
    expect(venueQueryRetryDelay(10)).toBe(30_000);
  });
});
