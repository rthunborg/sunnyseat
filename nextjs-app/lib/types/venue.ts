import type { SunStatus, SkyCondition } from './design-tokens';

/** 0 = Candidate (from OSM import), 1 = Verified (admin-approved) */
export type VerificationStatus = 0 | 1;

export interface Venue {
  id: string;
  name: string;
  slug: string;
  neighborhood: string;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  website?: string;
  description?: string;
  type?: string;
  is_active?: boolean;
  is_mapped?: boolean;
  verification_status?: VerificationStatus;
  osm_node_id?: number;
  is_partner?: boolean;
  booking_url?: string;
  website_url?: string;
  /** The venue's outdoor seating polygon (from its single patio record) */
  geometry?: GeoJSON.Polygon | null;
}

export interface Patio {
  id: string;
  venue_id: string;
  name: string;
  geometry: GeoJSON.Polygon | null;
  height_m?: number;
  height_source?: string | number;
  polygon_quality?: number;
  orientation?: string | number;
  notes?: string;
  review_needed?: boolean;
}

export interface SunWindow {
  start: string;
  end: string;
  sun_status: SunStatus;
  sky_condition: SkyCondition;
}

export interface WeatherContext {
  cloud_cover_percent: number;
  sky_condition: SkyCondition;
  temperature_c?: number;
  wind_speed_ms?: number;
  source: string;
  fetched_at: string;
}

export interface SunExposureResult {
  venue: Venue;
  patio: Patio;
  current_status: SunStatus;
  sun_exposure_percent: number;
  confidence: number;
  windows: SunWindow[];
  weather?: WeatherContext;
  distance_meters?: number;
}
