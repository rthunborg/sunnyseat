'use client';

import { useMutation } from '@tanstack/react-query';
import { HttpError } from '@/hooks/queries/venue-query-options';
import type { AppFeedbackResponse, SubmitAppFeedbackRequest } from '@/lib/types/api';

/**
 * Submit general app-experience feedback (star rating + optional comment) to
 * the `/api/feedback` sink. Mirrors {@link useSubmitFeedback} but is not scoped
 * to a venue.
 */
export function useSubmitAppFeedback() {
  return useMutation<AppFeedbackResponse, Error, SubmitAppFeedbackRequest>({
    retry: false,
    mutationFn: async (payload) => {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new HttpError(
          `App feedback submit failed: ${res.status} ${res.statusText}`,
          res.status,
        );
      }
      return (await res.json()) as AppFeedbackResponse;
    },
  });
}
