import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSubmitFeedback } from '@/hooks/mutations/useSubmitFeedback';
import { hasSubmittedVenueFeedback } from '@/lib/services/feedback-session';
import { TestProviders } from '../../setup/test-utils';

const VALID_FEEDBACK_PAYLOAD = {
  userTimestamp: '2026-06-07T12:00:00.000Z',
  predictedState: 'Sunny' as const,
  sunExposurePercent: 82,
  publicSunVerdict: 'amber' as const,
  weatherGated: false,
  weatherUnknown: false,
  geometryInputHash: 'g1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
};

describe('useSubmitFeedback', () => {
  it('posts feedback, disables automatic retry, and marks session only on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'feedback_1', venueId: '1', venueSlug: 'test-venue-sunny', createdAt: '2026-06-07T12:00:00.000Z' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useSubmitFeedback('test-venue-sunny'), {
      wrapper: TestProviders,
    });

    result.current.mutate({
      ...VALID_FEEDBACK_PAYLOAD,
      wasSunny: true,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/venues/test-venue-sunny/feedback', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"wasSunny":true'),
    }));
    expect(hasSubmittedVenueFeedback('test-venue-sunny')).toBe(true);
  });

  it('leaves session unmarked on failure and does not retry automatically', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'bad' }), { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useSubmitFeedback('test-venue-sunny'), {
      wrapper: TestProviders,
    });

    result.current.mutate({
      ...VALID_FEEDBACK_PAYLOAD,
      wasSunny: false,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(hasSubmittedVenueFeedback('test-venue-sunny')).toBe(false);
  });
});
