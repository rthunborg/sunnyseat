export interface SolarPosition {
  azimuth: number;
  elevation: number;
  zenith: number;
  declination: number;
  hourAngle: number;
  earthDistance: number;
  timestamp: Date;
  localTime: Date;
  isSunVisible: boolean;
  latitude: number;
  longitude: number;
}

export interface SunTimes {
  sunriseUtc: Date;
  sunsetUtc: Date;
  sunriseLocal: Date;
  sunsetLocal: Date;
  solarNoon: Date;
  maxElevation: number;
  date: string;
  latitude: number;
  longitude: number;
}

export type HeightSource = 'Surveyed' | 'Osm' | 'Heuristic' | 'ManualOverride';

export interface Building {
  id: number;
  geometry: GeoJSON.Polygon;
  height: number;
  source: string;
  qualityScore: number;
  externalId?: string;
  heightSource: HeightSource;
  buildingType?: string;
}

export interface ShadowProjection {
  geometry: GeoJSON.Polygon;
  length: number;
  direction: number;
  buildingId: number;
  buildingHeight: number;
  solarPosition: SolarPosition;
  timestamp: Date;
  confidence: number;
}

export interface VenueShadowInfo {
  venueId: number;
  shadowedAreaPercent: number;
  sunlitAreaPercent: number;
  castingShadows: ShadowProjection[];
  shadowedGeometry: GeoJSON.Polygon | null;
  sunlitGeometry: GeoJSON.Polygon | null;
  timestamp: Date;
  confidence: number;
  solarPosition: SolarPosition;
}

export type SunState = 'Sunny' | 'Partial' | 'Shaded' | 'NoSun';

export interface ShadowTimelinePoint {
  timestamp: Date;
  shadowedAreaPercent: number;
  sunlitAreaPercent: number;
  confidence: number;
  isSunVisible: boolean;
}

export interface ShadowTimeline {
  venueId: number;
  startTime: Date;
  endTime: Date;
  intervalMs: number;
  points: ShadowTimelinePoint[];
  averageConfidence: number;
}

export interface WeatherSlice {
  cloudCover: number;
  temperature: number;
  visibility?: number;
  isForecast: boolean;
  source: string;
  createdAt: Date;
}

export interface ConfidenceFactors {
  buildingDataQuality: number;
  geometryPrecision: number;
  solarAccuracy: number;
  shadowAccuracy: number;
  geometryQuality: number;
  cloudCertainty: number;
  overallConfidence: number;
  confidenceCategory: 'High' | 'Medium' | 'Low';
  qualityIssues: string[];
  improvements: string[];
}
