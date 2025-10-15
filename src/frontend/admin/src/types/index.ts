// Auth types
export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: 'Admin' | 'SuperAdmin';
  claims: string[];
  lastLoginAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: AdminUser;
}

// Venue and Patio types
export interface Venue {
  id: number;
  name: string;
  address: string;
  coordinates: [number, number]; // [lng, lat]
  patios: Patio[];
  isMapped: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Patio {
  id: number;
  venueId: number;
  polygon: GeoJSON.Polygon;
  heightSource: 'surveyed' | 'osm' | 'heuristic';
  polygonQuality: number; // 0-1
  reviewNeeded: boolean;
  orientation?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Sun Timeline & Exposure Types (Story 2.5)
export interface SunExposureTimeline {
  patioId: number;
  patio?: Patio;
  startTime: string; // ISO string
  endTime: string; // ISO string
  interval: string; // TimeSpan as string (e.g. "00:10:00")
  timeZone: string;
  points: SunExposureTimelinePoint[];
  sunWindows: SunWindow[];
  metadata: TimelineMetadata;
  averageConfidence: number;
  overallQuality: ConfidenceFactors;
  pointCount: number;
  duration: string; // TimeSpan as string
  precomputedPointsCount: number;
  interpolatedPointsCount: number;
  generatedAt: string; // ISO string
}

export interface SunExposureTimelinePoint {
  timestamp: string; // ISO string UTC
  localTime: string; // ISO string local time
  sunExposurePercent: number; // 0-100
  state: SunExposureState;
  confidence: number; // 0-100
  isSunVisible: boolean;
  solarElevation: number;
  solarAzimuth: number;
  source: DataSource;
  calculationTime?: string; // TimeSpan as string
}

export interface SunWindow {
  id: number;
  patioId: number;
  date: string; // DateOnly as string
  startTime: string; // ISO string UTC
  endTime: string; // ISO string UTC
  localStartTime: string; // ISO string local
  localEndTime: string; // ISO string local
  duration: string; // TimeSpan as string
  peakExposure: number; // 0-100
  minExposurePercent: number;
  maxExposurePercent: number;
  averageExposurePercent: number;
  peakExposureTime: string; // ISO string UTC
  localPeakExposureTime: string; // ISO string local
  quality: SunWindowQuality;
  confidence: number; // 0-100
  description: string;
  isRecommended: boolean;
  recommendationReason: string;
  priorityScore: number;
  dataPointCount: number;
  calculatedAt: string; // ISO string
}

export interface TimelineMetadata {
  weatherSource: string;
  lastDataUpdate: string; // ISO string
  totalSunWindows: number;
  totalSunDuration: string; // TimeSpan as string
  dayLightHours: number;
  sunTimes?: SunTimes;
  dataQualityNotes: string[];
  precomputedDataPercent: number;
  averageCalculationTime: string; // TimeSpan as string
}

export interface SunTimes {
  date: string; // DateOnly as string
  sunriseUtc: string; // ISO string
  sunsetUtc: string; // ISO string
  sunriseLocal: string; // ISO string
  sunsetLocal: string; // ISO string
  dayLength: string; // TimeSpan as string
  solarNoon: string; // ISO string
  maxElevation: number;
  latitude: number;
  longitude: number;
}

export interface ConfidenceFactors {
  geometryPrecision: number; // 0-1
  buildingDataQuality: number; // 0-1
  solarAccuracy: number; // 0-1
  shadowAccuracy: number; // 0-1
  overallConfidence: number; // 0-1
}

export interface TimelineComparison {
  timelines: SunExposureTimeline[];
  summary: ComparisonSummary;
  bestTimes: RecommendedTime[];
  generatedAt: string; // ISO string
}

export interface ComparisonSummary {
  venuesCompared: number;
  bestOverallTime: string; // ISO string
  bestOverallVenue: string;
  bestOverallPatioId: number;
  averageConfidence: number;
  comparisonDuration: string; // TimeSpan as string
  totalSunWindows: number;
}

export interface RecommendedTime {
  time: string; // ISO string local
  patioId: number;
  venueName: string;
  sunExposure: number; // 0-100
  reason: string;
  confidence: number; // 0-100
  rank: number;
}

export interface TimelineQualityAssessment {
  qualityScore: number; // 0-100
  completenessPercent: number; // 0-100
  confidenceReliability: number; // 0-100
  highQualityDataPercent: number; // 0-100
  qualityIssues: string[];
  improvementRecommendations: string[];
  meetsQualityStandards: boolean;
}

export interface TimelinePerformanceMetrics {
  averageGenerationTime: string; // TimeSpan as string
  cacheHitRate: number; // 0-1
  precomputedDataUsage: number; // 0-1
  timelinesGeneratedLastHour: number;
  averageDataPointsPerTimeline: number;
  performanceStatus: string;
}

export interface BatchTimelineRequest {
  patioIds: number[];
  startTime: string; // ISO string
  endTime: string; // ISO string
  resolutionMinutes: number;
}

// Enums as string union types
export type SunExposureState = 'NoSun' | 'Shaded' | 'Partial' | 'Sunny';
export type SunWindowQuality = 'Excellent' | 'Good' | 'Fair' | 'Poor';
export type DataSource = 'Precomputed' | 'Interpolated' | 'Calculated' | 'Cached';

// Timeline UI Types
export interface TimelineViewOptions {
  timeRange: 'today' | 'tomorrow' | 'next12h' | 'custom';
  resolution: 5 | 10 | 15 | 30 | 60; // minutes
  showConfidence: boolean;
  showSunWindows: boolean;
  showRecommendations: boolean;
  customStart?: string; // ISO string
  customEnd?: string; // ISO string
}

export interface TimelineChartData {
  labels: string[]; // Time labels for chart
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill?: boolean;
    tension?: number;
  }[];
}

export interface SunWindowCard {
  window: SunWindow;
  venue: string;
  isSelected: boolean;
  onClick: () => void;
}

// GeoJSON types for import/export
export interface PatioFeature extends GeoJSON.Feature<GeoJSON.Polygon> {
  properties: {
    venueId: number;
    heightSource: 'surveyed' | 'osm' | 'heuristic';
    polygonQuality: number;
    reviewNeeded: boolean;
    notes?: string;
  };
}

export interface PatioGeoJSON extends GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  features: PatioFeature[];
}

// Map types
export interface MapState {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface DrawingState {
  mode: 'draw' | 'edit' | 'view';
  activePolygon: GeoJSON.Polygon | null;
  isDrawing: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form types
export interface PatioMetadataForm {
  heightSource: 'surveyed' | 'osm' | 'heuristic';
  polygonQuality: number;
  reviewNeeded: boolean;
  orientation?: string;
  notes?: string;
}

export interface VenueSearchParams {
  query?: string;
  isMapped?: boolean;
  page?: number;
  limit?: number;
}

// File import types
export interface ImportPreview {
  fileName: string;
  fileSize: number;
  featureCount: number;
  features: PatioFeature[];
  errors: string[];
  warnings: string[];
}

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  warnings: string[];
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Hook return types
export interface UseMapStateReturn {
  mapState: MapState;
  updateMapState: (updates: Partial<MapState>) => void;
  resetMapState: () => void;
}

export interface UsePolygonEditorReturn {
  drawingState: DrawingState;
  startDrawing: () => void;
  stopDrawing: () => void;
  startEditing: (polygon: GeoJSON.Polygon) => void;
  stopEditing: () => void;
  undo: () => void;
  redo: () => void;
  savePolygon: (polygon: GeoJSON.Polygon) => Promise<void>;
}

export interface UseTimelineReturn {
  timeline: SunExposureTimeline | null;
  isLoading: boolean;
  error: string | null;
  loadTimeline: (patioId: number, options: TimelineViewOptions) => Promise<void>;
  clearTimeline: () => void;
  refreshTimeline: () => Promise<void>;
}

export interface UseTimelineComparisonReturn {
  comparison: TimelineComparison | null;
  isLoading: boolean;
  error: string | null;
  comparePatios: (patioIds: number[], startTime: string, endTime: string) => Promise<void>;
  clearComparison: () => void;
}

// Venue Detail Types (Story 4.3)
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface VenueDetails {
  id: number;
  slug: string;
  name: string;
  address: string;
  location: Coordinates;
  patios: Patio[];
  sunForecast: SunForecast;
}

export interface SunForecast {
  today: DaySunForecast;
  tomorrow: DaySunForecast;
  generatedAt: string;
}

export interface DaySunForecast {
  date: string;
  sunWindows: SunWindow[];
  noSunReason?: 'Shadow' | 'Cloud' | 'Weather' | 'Unknown';
  nextSunWindow?: {
    date: string;
    window: SunWindow;
  };
}

export interface WeatherFactor {
  type: 'CloudCover' | 'Precipitation' | 'Temperature' | 'WindSpeed';
  impact: 'Positive' | 'Negative' | 'Neutral';
  description: string;
}

// Extend existing SunWindow interface with additional fields for Story 4.3
export interface SunWindowDetailed extends SunWindow {
  weatherFactors?: WeatherFactor[];
  shadowImpact?: number; // 0-100
}

// Auto-refresh hook types
export interface UseAutoRefreshOptions {
  intervalMs: number;
  enabled: boolean;
  onRefresh: () => void;
}

export interface UseAutoRefreshReturn {
  lastRefresh: Date;
}