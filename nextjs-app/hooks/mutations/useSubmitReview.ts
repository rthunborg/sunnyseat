'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type {
  GetReviewsResponse,
  GetVenueDetailResponse,
  SubmitReviewRequest,
  SubmitReviewResponse,
  VenueDataDto,
} from '@/lib/types/api';

export function useSubmitReview(identifier: string) {
  const normalizedIdentifier = identifier.trim();
  const queryClient = useQueryClient();

  return useMutation<SubmitReviewResponse, Error, SubmitReviewRequest>({
    retry: false,
    mutationFn: async (payload) => {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Review submit failed: ${res.status} ${res.statusText}`);
      }
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('application/json')) {
        throw new Error(`Review submit returned unexpected content-type: ${contentType || '(missing)'}`);
      }
      return (await res.json()) as SubmitReviewResponse;
    },
    onSuccess: (response) => {
      const key = queryKeys.reviews.byVenue(normalizedIdentifier);
      queryClient.setQueryData<GetReviewsResponse>(key, (current) => {
        if (!current) {
          return {
            reviews: [response.review],
            summary: response.summary,
            timestamp: response.timestamp,
          };
        }
        const reviews = current.reviews.some((review) => review.id === response.review.id)
          ? current.reviews
          : [response.review, ...current.reviews];
        return {
          ...current,
          reviews,
          summary: response.summary,
          timestamp: response.timestamp,
        };
      });
      queryClient.setQueriesData<GetVenueDetailResponse>(
        {
          predicate: ({ queryKey }) => isMatchingVenueDetailKey(queryKey, normalizedIdentifier, response),
        },
        (current) => {
          if (!current || !venueMatchesSubmittedReview(current.venue, response)) return current;
          return {
            ...current,
            venue: {
              ...current.venue,
              reviewSummary: response.summary,
            },
          };
        },
      );
      void queryClient.invalidateQueries({
        predicate: ({ queryKey }) => isMatchingVenueDetailKey(queryKey, normalizedIdentifier, response),
      });
    },
  });
}

function isMatchingVenueDetailKey(
  queryKey: readonly unknown[],
  identifier: string,
  response: SubmitReviewResponse,
): boolean {
  if (queryKey[0] !== 'venues' || queryKey[1] !== 'detail') return false;
  const detailIdentifier = queryKey[2];
  if (typeof detailIdentifier !== 'string') return false;
  return identifierMatchesReview(detailIdentifier, identifier, response);
}

function venueMatchesSubmittedReview(
  venue: Pick<VenueDataDto, 'id' | 'venueId' | 'slug' | 'venueSlug'>,
  response: SubmitReviewResponse,
): boolean {
  return identifierMatchesReview(venue.id, '', response) ||
    identifierMatchesReview(venue.venueId, '', response) ||
    identifierMatchesReview(venue.slug, '', response) ||
    identifierMatchesReview(venue.venueSlug, '', response);
}

function identifierMatchesReview(
  candidate: string,
  requestedIdentifier: string,
  response: SubmitReviewResponse,
): boolean {
  return candidate === requestedIdentifier ||
    candidate === response.review.venueId ||
    candidate === response.review.venueSlug;
}
