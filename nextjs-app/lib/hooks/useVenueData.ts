'use client';

// Hook for fetching venue data using TanStack Query
import { useQuery } from '@tanstack/react-query';
import { venueService } from '@/lib/services/api/venueService';
import type { Coordinates } from '@/lib/types/location';
import type { GetVenuesResponse } from '@/lib/types/api';

export const useVenueData = (location: Coordinates | null, radiusKm: number) => {
  return useQuery<GetVenuesResponse>({
    queryKey: ['venues', location?.latitude, location?.longitude, radiusKm],
    queryFn: () => {
      if (!location) {
        throw new Error('Location is required');
      }
      return venueService.getVenues({
        latitude: location.latitude,
        longitude: location.longitude,
        radiusKm,
      });
    },
    enabled: location !== null,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};
