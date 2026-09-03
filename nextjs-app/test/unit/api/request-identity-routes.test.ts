import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as venueDetailGET } from '@/app/api/venues/[slug]/route';
import { POST as venueFeedbackPOST } from '@/app/api/venues/[slug]/feedback/route';
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

function routeProbeId(sequence: number): string {
  return `lr-20260818t090000z-a1b2c3d4-origin-${String(sequence).padStart(3, '0')}`;
}

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

function expectCacheableGetIdentityHeaders(response: Response): void {
  expect(response.headers.get('x-sunnyseat-request-id')).toBeNull();
  expect(response.headers.get('x-sunnyseat-deployment-id')).toBe(DEPLOYMENT_ID);
}

function apiRequestCompleteEvents(): Array<Record<string, unknown>> {
  return vi.mocked(console.info).mock.calls
    .flatMap(([message]) => {
      if (typeof message !== 'string') return [];
      try {
        const parsed = JSON.parse(message);
        return parsed?.event === 'api_request_complete' ? [parsed] : [];
      } catch {
        return [];
      }
    });
}

function expectNoStructuredTelemetryLeak(...unsafeValues: string[]): void {
  const structuredTelemetry = JSON.stringify(apiRequestCompleteEvents());
  for (const unsafeValue of unsafeValues) {
    expect(structuredTelemetry).not.toContain(unsafeValue);
  }
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

  it('does not replay a request ID on a successful cacheable venue-detail GET', async () => {
    const requestId = routeProbeId(1);
    const response = await venueDetailGET(
      request('http://localhost/api/venues/test-venue-sunny', requestId),
      { params: Promise.resolve({ slug: 'test-venue-sunny' }) },
    );

    expect(response.status).toBe(200);
    expectCacheableGetIdentityHeaders(response);
    expect(apiRequestCompleteEvents().at(-1)).toMatchObject({
      event: 'api_request_complete',
      request_id: requestId,
      method: 'GET',
      route: '/api/venues/[slug]',
      status: 200,
      deployment_id: DEPLOYMENT_ID,
    });
  });

  it('echoes canonical identity headers on an error venue-detail GET', async () => {
    const requestId = routeProbeId(2);
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

  it('normalizes venue-detail structured telemetry without slug or query leakage', async () => {
    const requestId = routeProbeId(9);
    const secretSlug = 'private-venue-slug';
    const secretQuery = 'do-not-log-this-query';
    const response = await venueDetailGET(
      request(
        `http://localhost/api/venues/${secretSlug}?token=${secretQuery}`,
        requestId,
      ),
      { params: Promise.resolve({ slug: secretSlug }) },
    );

    expect(response.status).toBe(404);
    expect(apiRequestCompleteEvents().at(-1)).toMatchObject({
      event: 'api_request_complete',
      request_id: requestId,
      method: 'GET',
      route: '/api/venues/[slug]',
      status: 404,
    });
    expectNoStructuredTelemetryLeak(secretSlug, secretQuery);
  });

  it('normalizes venue-feedback structured telemetry without slug or query leakage', async () => {
    const requestId = routeProbeId(10);
    const secretSlug = 'private-feedback-venue';
    const secretQuery = 'feedback-query-secret';
    const response = await venueFeedbackPOST(
      request(
        `http://localhost/api/venues/${secretSlug}/feedback?token=${secretQuery}`,
        requestId,
        { method: 'POST' },
      ),
      { params: Promise.resolve({ slug: secretSlug }) },
    );

    expect(response.status).toBe(404);
    expect(apiRequestCompleteEvents().at(-1)).toMatchObject({
      event: 'api_request_complete',
      request_id: requestId,
      method: 'POST',
      route: '/api/venues/[slug]/feedback',
      status: 404,
    });
    expectNoStructuredTelemetryLeak(secretSlug, secretQuery);
  });

  it('echoes canonical identity headers on a successful reviews GET', async () => {
    const requestId = routeProbeId(3);
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
    const requestId = routeProbeId(4);
    const response = await reviewsGET(
      request('http://localhost/api/reviews', requestId),
    );

    expect(response.status).toBe(400);
    expectIdentityHeaders(response, requestId);
  });

  it('echoes canonical identity headers on a successful reviews POST', async () => {
    const requestId = routeProbeId(5);
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
    const requestId = routeProbeId(6);
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
    const requestId = routeProbeId(7);
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
    const requestId = routeProbeId(8);
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
