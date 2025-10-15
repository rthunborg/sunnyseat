// hooks/usePatioData.ts
import { useQuery } from '@tanstack/react-query';
import { patioService } from '../services/api/patioService';
import { Coordinates } from '../types/location';
import { GetPatiosResponse } from '../types/api';

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
