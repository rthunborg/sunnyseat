'use client';

import { useMutation } from '@tanstack/react-query';
import { markVenueFeedbackSubmitted } from '@/lib/services/feedback-session';
import { HttpError } from '@/hooks/queries/venue-query-options';
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
        throw new HttpError(`Feedback submit failed: ${res.status} ${res.statusText}`, res.status);
      }
      return (await res.json()) as FeedbackResponse;
    },
    onSuccess: (response) => {
      markVenueFeedbackSubmitted(response.venueId);
      markVenueFeedbackSubmitted(normalizedIdentifier);
    },
  });
}
