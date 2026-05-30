import type { SunStatus, SkyCondition } from './design-tokens';

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
  osm_node_id?: number;
  is_partner?: boolean;
  booking_url?: string;
  website_url?: string;
  /** The venue's outdoor seating polygon */
  geometry?: GeoJSON.Polygon | null;
  height_m?: number;
  height_source?: string | number;
  polygon_quality?: number;
  orientation?: string | number;
  notes?: string;
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
  current_status: SunStatus;
  sun_exposure_percent: number;
  confidence: number;
  windows: SunWindow[];
  weather?: WeatherContext;
  distance_meters?: number;
}
