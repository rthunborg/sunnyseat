'use client';

// Hook for fetching patio data using TanStack Query
import { useQuery } from '@tanstack/react-query';
import { patioService } from '@/lib/services/api/patioService';
import type { Coordinates } from '@/lib/types/location';
import type { GetPatiosResponse } from '@/lib/types/api';

export const usePatioData = (location: Coordinates | null, radiusKm: number) => {
  return useQuery<GetPatiosResponse>({
    queryKey: ['patios', location?.latitude, location?.longitude, radiusKm],
    queryFn: () => {
      if (!location) {
        throw new Error('Location is required');
      }
      return patioService.getPatios({
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
