// types/patio.ts
import { Coordinates } from './location';

export type SunStatus = 'Sunny' | 'Partial' | 'Shaded';

export interface PatioData {
  id: string;
  venueId: string;
  venueName: string;
  location: Coordinates;
  currentSunStatus: SunStatus;
  confidence: number; // 0-100
  distanceMeters: number;
}

export interface PatioSearchParams {
  location: Coordinates;
  radiusKm: number;
}
