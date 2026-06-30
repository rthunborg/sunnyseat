import { afterEach, describe, expect, it } from 'vitest';
import {
  clearPersistedAppFeedbackForTests,
  getPersistedAppFeedbackForTests,
  persistAppFeedback,
} from '@/lib/services/app-feedback-persistence';
import type { AppFeedbackResponse } from '@/lib/types/api';

const FEEDBACK: AppFeedbackResponse = {
  id: 'app_feedback_1',
  rating: 4,
  comment: 'Bra app!',
  locale: 'sv',
  createdAt: '2026-06-29T12:00:00.000Z',
};

describe('persistAppFeedback (memory mode)', () => {
  afterEach(() => clearPersistedAppFeedbackForTests());

  it('records submissions in the in-memory sink when not configured for Supabase', async () => {
    const result = await persistAppFeedback(FEEDBACK);

    expect(result).toEqual(FEEDBACK);
    expect(getPersistedAppFeedbackForTests()).toEqual([FEEDBACK]);
  });
});
