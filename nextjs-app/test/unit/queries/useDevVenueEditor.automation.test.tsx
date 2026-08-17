import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePatchDevVenueEditorVenue } from '@/hooks/queries/useDevVenueEditor';
import { queryKeys } from '@/lib/query-keys';
import { TestProviders } from '../../setup/test-utils';

describe('Story 12.5 useDevVenueEditor query invalidation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('[P1] invalidates public/editor roots plus affected id and returned slug detail keys after a save by id', async () => {
    const response = {
      venue: {
        id: '1',
        slug: 'test-venue-sunny',
        venueName: 'Kafé Magasinet',
        hidden: false,
        displayLocation: { lat: 57.7061, lng: 11.9712 },
        engineLocation: { lat: 57.705, lng: 11.970 },
        tags: ['Innergård'],
        description: null,
        thumbnail: null,
      },
      timestamp: '2026-07-27T15:00:00.000Z',
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 60_000,
          refetchOnWindowFocus: false,
        },
        mutations: { retry: false },
      },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => usePatchDevVenueEditorVenue(), {
      wrapper: ({ children }) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    result.current.mutate({
      identifier: '1',
      patch: { displayLocation: { lat: 57.7061, lng: 11.9712 } },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith('/api/dev/venues/1', expect.objectContaining({
      method: 'PATCH',
      cache: 'no-store',
      body: JSON.stringify({ displayLocation: { lat: 57.7061, lng: 11.9712 } }),
    }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.venues.all });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.venues.devVenueEditor.all(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.venues.detail('1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.venues.detail('test-venue-sunny'),
    });
  });
});
