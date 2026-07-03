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
  /**
   * RH2000 absolute ground/roof elevation (metres) of the caster, from
   * `shadow_casters.ground_z_rh2000` / `roof_z_rh2000` via the `get_buildings_near_point`
   * RPC (Story 8.7). Optional: non-RPC / fixture casters omit them and the engine
   * falls back to the relative (Story 8.6) height gate.
   *
   * IMPORTANT: `roofZRh2000 − groundZRh2000` is the RAW source height and does NOT
   * equal `height` for the ~1.2k height-uncertain casters that Story 8.1.1 capped at a
   * conservative 15 m. The terrain gate therefore uses `groundZRh2000` (the ground
   * delta) together with the conservative runtime `height`, NOT `roofZRh2000` as the
   * casting height — see `computeShadowInfo`.
   */
  groundZRh2000?: number;
  roofZRh2000?: number;
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

// Mirrors the DTO `VenueSunStatus` (lib/types/api.ts). STORY 10.1 (AC1) added the
// weather-gated `CloudObscured` value; kept identical here so the two vocabularies
// do not drift.
export type SunState = 'Sunny' | 'Partial' | 'Shaded' | 'NoSun' | 'CloudObscured';

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
  /**
   * Total cloud cover 0..100 (`cloud_area_fraction`). STORY 10.1 (AC2): OPTIONAL
   * so a timeseries entry that lacks cloud data reads "unknown" rather than the
   * old optimistic `?? 0` (clear-sky) default — absent cloud must NEVER produce a
   * clear gate input. `undefined` = unknown = NON-gating AND NON-clear: the cloud
   * gate (sun-engine `applyCloudGate`) does not fire, `skyConditionFromCloudCover`
   * maps it to `'unavailable'`, and the confidence blend (`calcCloudCertainty`)
   * treats it as neutral (freshness-only), not as 100% overcast.
   */
  cloudCover?: number;
  /**
   * Low-cloud cover 0..100 (`cloud_area_fraction_low`, below ~2000 m). STORY 10.3
   * (AC1): the Met.no `complete` product's three-layer split. OPTIONAL — a partial
   * `complete` entry, a non-Met.no producer, or a fixture without it stays valid;
   * `undefined` = this layer unknown ⇒ `effectiveCloudCover` falls back to the raw
   * total (Story 10.3 AC3). NOT a partition of the total: each band is an
   * independent cover fraction, so low+medium+high can exceed 100. Do NOT `?? 0`.
   */
  cloudCoverLow?: number;
  /** Medium-cloud cover 0..100 (`cloud_area_fraction_medium`, ~2000–5000 m). See {@link WeatherSlice.cloudCoverLow}. */
  cloudCoverMedium?: number;
  /** High-cloud cover 0..100 (`cloud_area_fraction_high`, cirrus above ~5000 m). See {@link WeatherSlice.cloudCoverLow}. */
  cloudCoverHigh?: number;
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
