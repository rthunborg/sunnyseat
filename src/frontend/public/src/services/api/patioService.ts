// services/api/patioService.ts
import { apiClient } from './client';
import { API_URLS } from '../../constants/apiUrls';
import { GetPatiosRequest, GetPatiosResponse } from '../../types/api';

export const patioService = {
  async getPatios(request: GetPatiosRequest): Promise<GetPatiosResponse> {
    return apiClient.get<GetPatiosResponse>(API_URLS.patios, {
      latitude: request.latitude,
      longitude: request.longitude,
      radiusKm: request.radiusKm,
    });
  },
};
