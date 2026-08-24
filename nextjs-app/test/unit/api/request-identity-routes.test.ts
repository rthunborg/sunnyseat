import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as venueDetailGET } from '@/app/api/venues/[slug]/route';
import {
  GET as reviewsGET,
  POST as reviewsPOST,
  clearReviewRateLimitForTests,
} from '@/app/api/reviews/route';
import { POST as feedbackPOST } from '@/app/api/feedback/route';
import { clearPersistedAppFeedbackForTests } from '@/lib/services/app-feedback-persistence';
import { clearPersistedVenueReviewsForTests } from '@/lib/services/venue-reviews-persistence';

const DEPLOYMENT_ID = 'dpl_route_identity_test';
type NextRequestInit = NonNullable<ConstructorParameters<typeof NextRequest>[1]>;

function request(
  url: string,
  requestId: string,
  init: NextRequestInit = {},
): NextRequest {
  const headers = new Headers(init.headers);
  headers.set('x-sunnyseat-request-id', requestId);
  return new NextRequest(url, { ...init, headers });
}

function expectIdentityHeaders(response: Response, requestId: string): void {
  expect(response.headers.get('x-sunnyseat-request-id')).toBe(requestId);
  expect(response.headers.get('x-sunnyseat-deployment-id')).toBe(DEPLOYMENT_ID);
}

describe('public route response identity', () => {
  beforeEach(() => {
    vi.stubEnv('VERCEL_DEPLOYMENT_ID', DEPLOYMENT_ID);
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('VERCEL_REGION', 'arn1');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    clearPersistedAppFeedbackForTests();
    clearPersistedVenueReviewsForTests();
    clearReviewRateLimitForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('echoes canonical identity headers on a successful venue-detail GET', async () => {
    const requestId = 'lr-routeidentity-origin-001';
    const response = await venueDetailGET(
      request('http://localhost/api/venues/test-venue-sunny', requestId),
      { params: Promise.resolve({ slug: 'test-venue-sunny' }) },
    );

    expect(response.status).toBe(200);
    expectIdentityHeaders(response, requestId);
  });

  it('echoes canonical identity headers on an error venue-detail GET', async () => {
    const requestId = 'lr-routeidentity-origin-002';
    const response = await venueDetailGET(
      request(
        'http://localhost/api/venues/test-venue-sunny?lat=invalid&lng=11.9746',
        requestId,
      ),
      { params: Promise.resolve({ slug: 'test-venue-sunny' }) },
    );

    expect(response.status).toBe(400);
    expectIdentityHeaders(response, requestId);
  });

  it('echoes canonical identity headers on a successful reviews GET', async () => {
    const requestId = 'lr-routeidentity-origin-003';
    const response = await reviewsGET(
      request(
        'http://localhost/api/reviews?venueId=test-venue-sunny',
        requestId,
      ),
    );

    expect(response.status).toBe(200);
    expectIdentityHeaders(response, requestId);
  });

  it('echoes canonical identity headers on an error reviews GET', async () => {
    const requestId = 'lr-routeidentity-origin-004';
    const response = await reviewsGET(
      request('http://localhost/api/reviews', requestId),
    );

    expect(response.status).toBe(400);
    expectIdentityHeaders(response, requestId);
  });

  it('echoes canonical identity headers on a successful reviews POST', async () => {
    const requestId = 'lr-routeidentity-origin-005';
    const response = await reviewsPOST(
      request('http://localhost/api/reviews', requestId, {
        method: 'POST',
        body: JSON.stringify({
          venueId: '1',
          venueSlug: 'test-venue-sunny',
          text: 'Identitetstest.',
          rating: 5,
        }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '203.0.113.42',
        },
      }),
    );

    expect(response.status).toBe(201);
    expectIdentityHeaders(response, requestId);
  });

  it('echoes canonical identity headers on an error reviews POST', async () => {
    const requestId = 'lr-routeidentity-origin-006';
    const response = await reviewsPOST(
      request('http://localhost/api/reviews', requestId, {
        method: 'POST',
        body: '{}',
        headers: { 'content-type': 'text/plain' },
      }),
    );

    expect(response.status).toBe(415);
    expectIdentityHeaders(response, requestId);
  });

  it('echoes canonical identity headers on a successful feedback POST', async () => {
    const requestId = 'lr-routeidentity-origin-007';
    const response = await feedbackPOST(
      request('http://localhost/api/feedback', requestId, {
        method: 'POST',
        body: JSON.stringify({ rating: 5, comment: 'Identitetstest.' }),
        headers: { 'content-type': 'application/json' },
      }),
    );

    expect(response.status).toBe(201);
    expectIdentityHeaders(response, requestId);
  });

  it('echoes canonical identity headers on an error feedback POST', async () => {
    const requestId = 'lr-routeidentity-origin-008';
    const response = await feedbackPOST(
      request('http://localhost/api/feedback', requestId, {
        method: 'POST',
        body: JSON.stringify({ rating: 6 }),
        headers: { 'content-type': 'application/json' },
      }),
    );

    expect(response.status).toBe(400);
    expectIdentityHeaders(response, requestId);
  });
});
