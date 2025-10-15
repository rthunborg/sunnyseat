// types/api.ts
import { PatioData } from './patio';

export interface GetPatiosRequest {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export interface GetPatiosResponse {
  patios: PatioData[];
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
