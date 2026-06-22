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

export type ShadowCasterTier = 'primary' | 'secondary' | 'uncertain' | 'unknown';
export type ShadowCasterFilterDecision = 'include' | 'review' | 'exclude' | 'unknown';
export type ShadowCasterClass = 'building' | 'structure' | 'vegetation' | 'manual_override' | 'unknown';

export type ObstructionRiskClass =
  | 'tree'
  | 'awning'
  | 'umbrella'
  | 'bridge'
  | 'temporary_structure'
  | 'seasonal_furniture'
  | 'other';

export type ShadowDataCoverageStatus =
  | 'eligible'
  | 'blocked'
  | 'insufficient_evidence'
  | 'unknown';

export interface ShadowDataCoverage {
  clusterId: string | null;
  clusterName: string | null;
  status: ShadowDataCoverageStatus;
  checkedCount: number;
  agreementRate: number | null;
  missingConditions: string[];
  uncertaintyCounts: Partial<Record<ObstructionRiskClass | string, number>>;
  evidenceFiles: string[];
  allowsHighConfidence: boolean;
  confidenceCap: number;
}

export interface RuntimeShadowCasterMetadata {
  qualityScore: number;
  sourcePriority?: number;
  shadowCasterTier: ShadowCasterTier;
  filterDecision: ShadowCasterFilterDecision;
  casterClass: ShadowCasterClass;
  sourceFlags: string[];
  sourceObjectMetadata?: Record<string, unknown>;
  provenanceMetadata?: Record<string, unknown>;
}

export interface Building {
  id: number;
  geometry: GeoJSON.Polygon;
  height: number;
  source: string;
  qualityScore: number;
  externalId?: string;
  heightSource: HeightSource;
  buildingType?: string;
  sourcePriority?: number;
  shadowCasterTier?: ShadowCasterTier;
  filterDecision?: ShadowCasterFilterDecision;
  casterClass?: ShadowCasterClass;
  sourceFlags?: string[];
  sourceObjectMetadata?: Record<string, unknown>;
  provenanceMetadata?: Record<string, unknown>;
  obstructionRisks?: ObstructionRiskClass[];
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
  casterMetadata?: RuntimeShadowCasterMetadata;
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
  shadowDataCoverage?: ShadowDataCoverage;
  obstructionRisks?: ObstructionRiskClass[];
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
  /** When the slice was fetched (data-age model for the confidence calculator). */
  createdAt: Date;
  /**
   * The slice's own valid-time (Met.no `entry.time`). Used by the sun-engine
   * adapter for honest `weatherUpdatedAt` freshness and the >2h "approximate"
   * staleness signal, so a future-planner forecast slice is not advertised as
   * fresh "now". Optional so existing non-Met.no WeatherSlice producers and
   * fixtures remain valid. [Story 8.5 Task 5.3 / AC#4c]
   */
  validAt?: Date;
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
