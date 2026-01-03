// Patio API service
// Uses Next.js API routes

import type { GetPatiosResponse } from '@/lib/types/api';
import type { Coordinates } from '@/lib/types/location';

export interface GetPatiosRequest {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export const patioService = {
  async getPatios(request: GetPatiosRequest): Promise<GetPatiosResponse> {
    const params = new URLSearchParams({
      latitude: request.latitude.toString(),
      longitude: request.longitude.toString(),
      radiusKm: request.radiusKm.toString(),
    });

    const response = await fetch(`/api/patios?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch patios: ${response.statusText}`);
    }

    return response.json();
  },
};
