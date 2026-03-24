// Venue API service
// Uses Next.js API routes

import type { GetVenuesResponse } from '@/lib/types/api';

export interface GetVenuesRequest {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export const venueService = {
  async getVenues(request: GetVenuesRequest): Promise<GetVenuesResponse> {
    const params = new URLSearchParams({
      latitude: request.latitude.toString(),
      longitude: request.longitude.toString(),
      radiusKm: request.radiusKm.toString(),
    });

    const response = await fetch(`/api/venues?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch venues: ${response.statusText}`);
    }

    return response.json();
  },
};
