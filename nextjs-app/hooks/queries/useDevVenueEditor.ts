'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  DevVenueEditorListResponse,
  DevVenueEditorMutationResponse,
  DevVenueEditorPatchRequest,
} from '@/lib/types/dev-venue-editor';
import { queryKeys } from '@/lib/query-keys';
import { HttpError, shouldRetryVenueQuery, venueQueryRetryDelay } from './venue-query-options';

export function useDevVenueEditorVenues(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.venues.devVenueEditor.list(),
    queryFn: fetchDevVenueEditorVenues,
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: (failureCount, error) => shouldRetryVenueQuery(failureCount, error),
    retryDelay: venueQueryRetryDelay,
  });
}

export function usePatchDevVenueEditorVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchDevVenueEditorVenue,
    onSuccess: async (data, variables) => {
      const exactDetailKeys = new Set([
        variables.identifier,
        data.venue.id,
        data.venue.slug,
      ]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.venues.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.venues.devVenueEditor.all() }),
        ...Array.from(exactDetailKeys).map((identifier) =>
          queryClient.invalidateQueries({
            queryKey: queryKeys.venues.detail(identifier),
          }),
        ),
      ]);
    },
  });
}

async function fetchDevVenueEditorVenues(): Promise<DevVenueEditorListResponse> {
  const response = await fetch('/api/dev/venues', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new HttpError(`Dev venue editor failed: ${response.status}`, response.status);
  }
  return await response.json() as DevVenueEditorListResponse;
}

async function patchDevVenueEditorVenue({
  identifier,
  patch,
}: {
  identifier: string;
  patch: DevVenueEditorPatchRequest;
}): Promise<DevVenueEditorMutationResponse> {
  const response = await fetch(`/api/dev/venues/${encodeURIComponent(identifier)}`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify(patch),
  });
  if (!response.ok) {
    throw new HttpError(`Dev venue editor failed: ${response.status}`, response.status);
  }
  return await response.json() as DevVenueEditorMutationResponse;
}
