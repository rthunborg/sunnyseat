'use client';

import { useMutation } from '@tanstack/react-query';
import { markVenueFeedbackSubmitted } from '@/lib/services/feedback-session';
import type { FeedbackResponse, SubmitFeedbackRequest } from '@/lib/types/api';

export function useSubmitFeedback(identifier: string) {
  const normalizedIdentifier = identifier.trim();
  return useMutation<FeedbackResponse, Error, SubmitFeedbackRequest>({
    retry: false,
    mutationFn: async (payload) => {
      const res = await fetch(`/api/venues/${encodeURIComponent(normalizedIdentifier)}/feedback`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Feedback submit failed: ${res.status} ${res.statusText}`);
      }
      return (await res.json()) as FeedbackResponse;
    },
    onSuccess: (response) => {
      markVenueFeedbackSubmitted(response.venueId);
      markVenueFeedbackSubmitted(normalizedIdentifier);
    },
  });
}
