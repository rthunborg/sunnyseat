import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/venues/[slug]/feedback/route';
import type { FeedbackResponse } from '@/lib/types/api';

const persistenceMock = vi.hoisted(() => ({
  persistVenueFeedback: vi.fn(async (feedback: FeedbackResponse) => feedback),
}));

vi.mock('@/lib/services/venue-feedback-persistence', () => ({
  persistVenueFeedback: persistenceMock.persistVenueFeedback,
}));

function makeRequest(slug: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/venues/${slug}/feedback`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const VALID_BODY = {
  userTimestamp: '2026-06-07T12:00:00.000Z',
  predictedState: 'Sunny',
  confidenceAtPrediction: 92,
  wasSunny: true,
  outdoorSeatingConfirmed: true,
  note: 'Solen stämde.',
};

describe('POST /api/venues/[slug]/feedback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-07T12:05:00.000Z'));
    persistenceMock.persistVenueFeedback.mockClear();
    persistenceMock.persistVenueFeedback.mockImplementation(async (feedback) => feedback);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('persists a valid fixture-backed feedback payload through the adapter', async () => {
    const res = await POST(makeRequest('test-venue-sunny', VALID_BODY), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as FeedbackResponse;
    expect(body).toMatchObject({
      venueId: '1',
      venueSlug: 'test-venue-sunny',
      userTimestamp: VALID_BODY.userTimestamp,
      predictedState: 'Sunny',
      wasSunny: true,
      outdoorSeatingConfirmed: true,
      note: 'Solen stämde.',
      createdAt: '2026-06-07T12:05:00.000Z',
    });
    expect(body.id).toMatch(/[0-9a-f-]{36}|feedback_/);
    expect(persistenceMock.persistVenueFeedback).toHaveBeenCalledTimes(1);
    expect(persistenceMock.persistVenueFeedback).toHaveBeenCalledWith(expect.objectContaining({
      venueId: '1',
      venueSlug: 'test-venue-sunny',
    }));
  });

  it('accepts a CloudObscured predictedState (weather-gated real-engine path)', async () => {
    // Story 10 review [Patch][High] regression guard: on the live real-engine
    // path a detail view's predictedState can be 'CloudObscured', which
    // FeedbackFlow POSTs verbatim. The Zod enum must accept the full
    // VenueSunStatus union or the user sees a feedback-flow validation error.
    const res = await POST(makeRequest('test-venue-sunny', {
      ...VALID_BODY,
      predictedState: 'CloudObscured',
    }), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({ predictedState: 'CloudObscured' });
    expect(persistenceMock.persistVenueFeedback).toHaveBeenCalledWith(expect.objectContaining({
      predictedState: 'CloudObscured',
    }));
  });

  it('accepts venue id as the path identifier', async () => {
    const res = await POST(makeRequest('1', { ...VALID_BODY, venueId: '1' }), {
      params: Promise.resolve({ slug: '1' }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as FeedbackResponse;
    expect(body.venueSlug).toBe('test-venue-sunny');
  });

  it('rejects unknown venues with stable 404', async () => {
    const res = await POST(makeRequest('missing', VALID_BODY), {
      params: Promise.resolve({ slug: 'missing' }),
    });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({
      detail: 'Venue not found: missing',
      status: 404,
    });
  });

  it('rejects payloads without any feedback answer or note', async () => {
    const res = await POST(makeRequest('test-venue-sunny', {
      userTimestamp: VALID_BODY.userTimestamp,
      predictedState: 'Sunny',
    }), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ status: 400 });
    expect(persistenceMock.persistVenueFeedback).not.toHaveBeenCalled();
  });

  it('rejects malformed booleans, impossible confidence, unknown state, and unsafe control characters', async () => {
    const cases = [
      { ...VALID_BODY, wasSunny: 'yes' },
      { ...VALID_BODY, confidenceAtPrediction: 101 },
      { ...VALID_BODY, predictedState: 'Cloudy' },
      { ...VALID_BODY, note: 'bad\u0000note' },
      { ...VALID_BODY, sunAccuracy: 'unsure', wasSunny: false },
    ];

    for (const body of cases) {
      const res = await POST(makeRequest('test-venue-sunny', body), {
        params: Promise.resolve({ slug: 'test-venue-sunny' }),
      });
      expect(res.status).toBe(400);
    }
    expect(persistenceMock.persistVenueFeedback).not.toHaveBeenCalled();
  });

  it('accepts the explicit unsure sun answer and safe multiline notes', async () => {
    const res = await POST(makeRequest('test-venue-sunny', {
      userTimestamp: VALID_BODY.userTimestamp,
      predictedState: 'Sunny',
      sunAccuracy: 'unsure',
      note: 'Rad ett\r\nRad två',
    }), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({
      sunAccuracy: 'unsure',
      note: 'Rad ett\nRad två',
    });
  });

  it('derives wasSunny for decisive sunAccuracy payloads before persistence', async () => {
    const res = await POST(makeRequest('test-venue-sunny', {
      userTimestamp: VALID_BODY.userTimestamp,
      predictedState: 'Sunny',
      sunAccuracy: 'not_sunny',
    }), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({
      sunAccuracy: 'not_sunny',
      wasSunny: false,
    });
    expect(persistenceMock.persistVenueFeedback).toHaveBeenCalledWith(expect.objectContaining({
      sunAccuracy: 'not_sunny',
      wasSunny: false,
    }));
  });

  it('rejects mismatched body venue ids', async () => {
    const res = await POST(makeRequest('test-venue-sunny', { ...VALID_BODY, venueId: '2' }), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({ status: 409 });
    expect(persistenceMock.persistVenueFeedback).not.toHaveBeenCalled();
  });

  it('returns a stable 503 when the persistence adapter fails', async () => {
    persistenceMock.persistVenueFeedback.mockRejectedValueOnce(new Error('missing table'));

    const res = await POST(makeRequest('test-venue-sunny', VALID_BODY), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      detail: 'Feedback persistence unavailable',
      status: 503,
    });
  });
});
