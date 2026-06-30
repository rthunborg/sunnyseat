import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/feedback/route';
import type { AppFeedbackResponse } from '@/lib/types/api';

const persistenceMock = vi.hoisted(() => ({
  persistAppFeedback: vi.fn(async (feedback: AppFeedbackResponse) => feedback),
}));

vi.mock('@/lib/services/app-feedback-persistence', () => ({
  persistAppFeedback: persistenceMock.persistAppFeedback,
}));

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/feedback', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/feedback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T12:00:00.000Z'));
    persistenceMock.persistAppFeedback.mockClear();
    persistenceMock.persistAppFeedback.mockImplementation(async (feedback) => feedback);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('persists a valid rating + comment and returns 201', async () => {
    const res = await POST(makeRequest({ rating: 4, comment: 'Toppen!', locale: 'sv' }));

    expect(res.status).toBe(201);
    const body = (await res.json()) as AppFeedbackResponse;
    expect(body).toMatchObject({
      rating: 4,
      comment: 'Toppen!',
      locale: 'sv',
      createdAt: '2026-06-29T12:00:00.000Z',
    });
    expect(body.id).toMatch(/[0-9a-f-]{36}|app_feedback_/);
    expect(persistenceMock.persistAppFeedback).toHaveBeenCalledTimes(1);
  });

  it('accepts a rating with no comment', async () => {
    const res = await POST(makeRequest({ rating: 5 }));

    expect(res.status).toBe(201);
    const body = (await res.json()) as AppFeedbackResponse;
    expect(body.rating).toBe(5);
    expect(body.comment).toBeUndefined();
  });

  it('rejects an out-of-range or non-integer rating', async () => {
    expect((await POST(makeRequest({ rating: 6 }))).status).toBe(400);
    expect((await POST(makeRequest({ rating: 0 }))).status).toBe(400);
    expect((await POST(makeRequest({ rating: 2.5 }))).status).toBe(400);
    expect((await POST(makeRequest({ comment: 'no stars' }))).status).toBe(400);
    expect(persistenceMock.persistAppFeedback).not.toHaveBeenCalled();
  });

  it('rejects unknown fields (strict schema)', async () => {
    const res = await POST(makeRequest({ rating: 3, venueId: 'x' }));
    expect(res.status).toBe(400);
  });

  it('returns 503 when persistence is unavailable', async () => {
    persistenceMock.persistAppFeedback.mockImplementationOnce(async () => {
      throw new Error('sink down');
    });
    const res = await POST(makeRequest({ rating: 3 }));
    expect(res.status).toBe(503);
  });
});
