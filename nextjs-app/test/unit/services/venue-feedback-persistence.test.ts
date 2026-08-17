import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPersistedVenueFeedbackForTests,
  getPersistedVenueFeedbackForTests,
  persistVenueFeedback,
} from '@/lib/services/venue-feedback-persistence';
import type { FeedbackResponse } from '@/lib/types/api';

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: () => ({
    from: supabaseMocks.from,
  }),
}));

const FEEDBACK: FeedbackResponse = {
  id: 'feedback_1',
  venueId: '1',
  venueSlug: 'test-venue-sunny',
  userTimestamp: '2026-06-07T12:00:00.000Z',
  predictedState: 'Sunny',
  sunExposurePercent: 82,
  publicSunVerdict: 'amber',
  weatherGated: false,
  weatherUnknown: false,
  geometryInputHash: 'g1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  sunAccuracy: 'sunny',
  createdAt: '2026-06-07T12:01:00.000Z',
};

describe('venue-feedback-persistence', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    clearPersistedVenueFeedbackForTests();
    supabaseMocks.from.mockReset();
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

  it('writes via the write-only snake_case insert/select chain and merges the returned id/createdAt', async () => {
    vi.stubEnv('SUNNYSEAT_FEEDBACK_PERSISTENCE', 'supabase');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');

    const single = vi.fn(async () => ({
      data: { id: 'db_feedback_1', created_at: '2026-06-07T12:02:00.000Z' },
      error: null,
    }));
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table !== 'feedback') throw new Error(`unexpected table ${table}`);
      return { insert };
    });

    const persisted = await persistVenueFeedback(FEEDBACK);

    expect(supabaseMocks.from).toHaveBeenCalledWith('feedback');
    // sun_accuracy 'sunny' derives was_sunny true; the undefined confidence /
    // outdoor_seating_confirmed / note columns are omitted, not written null.
    expect(insert).toHaveBeenCalledWith({
      venue_id: '1',
      venue_slug: 'test-venue-sunny',
      user_timestamp: '2026-06-07T12:00:00.000Z',
      predicted_state: 'Sunny',
      sun_exposure_percent: 82,
      public_sun_verdict: 'amber',
      weather_gated: false,
      weather_unknown: false,
      geometry_input_hash: 'g1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      sun_accuracy: 'sunny',
      was_sunny: true,
    });
    expect(select).toHaveBeenCalledWith('id, created_at');
    expect(persisted).toMatchObject({
      id: 'db_feedback_1',
      createdAt: '2026-06-07T12:02:00.000Z',
    });
    // Write-only sink: there is no read-back helper to exercise.
    expect(getPersistedVenueFeedbackForTests()).toHaveLength(0);
  });
});
