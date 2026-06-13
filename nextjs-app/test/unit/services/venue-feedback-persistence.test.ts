import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPersistedVenueFeedbackForTests,
  getPersistedVenueFeedbackForTests,
  persistVenueFeedback,
} from '@/lib/services/venue-feedback-persistence';
import type { FeedbackResponse } from '@/lib/types/api';

const FEEDBACK: FeedbackResponse = {
  id: 'feedback_1',
  venueId: '1',
  venueSlug: 'test-venue-sunny',
  userTimestamp: '2026-06-07T12:00:00.000Z',
  predictedState: 'Sunny',
  sunAccuracy: 'sunny',
  createdAt: '2026-06-07T12:01:00.000Z',
};

describe('venue-feedback-persistence', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    clearPersistedVenueFeedbackForTests();
  });

  it('keeps memory persistence as the default even when Supabase env vars exist', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');

    await expect(persistVenueFeedback(FEEDBACK)).resolves.toMatchObject({
      id: 'feedback_1',
    });

    expect(getPersistedVenueFeedbackForTests()).toHaveLength(1);
  });

  it('fails closed when Supabase persistence is explicitly selected without full credentials', async () => {
    vi.stubEnv('SUNNYSEAT_FEEDBACK_PERSISTENCE', 'supabase');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');

    await expect(persistVenueFeedback(FEEDBACK)).rejects.toThrow(
      'Feedback persistence is configured for Supabase but credentials are incomplete',
    );
    expect(getPersistedVenueFeedbackForTests()).toHaveLength(0);
  });
});
