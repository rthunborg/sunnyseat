import type {
  SolarPosition,
  VenueShadowInfo,
  WeatherSlice,
  ConfidenceFactors,
  ShadowDataCoverage,
} from './types';
import { getObstructionRiskConfidenceCap } from './obstruction-risk';
import { applyShadowDataCoverageCap } from './shadow-data-coverage';
import { effectiveCloudCover } from './effective-cloud-cover';

/**
 * Two modes:
 * 1. Geometry-only (no weather): 40% building + 25% polygon + 20% solar + 15% shadow
 * 2. Weather-enhanced: 60% GeometryQuality + 40% CloudCertainty, with caps
 */

export function calculateConfidenceFactors(
  polygonQuality: number,
  shadowInfo: VenueShadowInfo,
  solarPosition: SolarPosition,
  weatherData?: WeatherSlice | null
): ConfidenceFactors {
  const buildingDataQuality = calcBuildingDataQuality(shadowInfo);
  const geometryPrecision = polygonQuality;
  const solarAccuracy = calcSolarAccuracy(solarPosition);
  const shadowAccuracy = calcShadowAccuracy(shadowInfo, solarPosition);

  let overallConfidence: number;
  let geometryQuality = 0;
  let cloudCertainty = 0;

  if (weatherData) {
    geometryQuality = calcGeometryQuality(
      buildingDataQuality,
      geometryPrecision,
      shadowInfo.confidence
    );
    cloudCertainty = calcCloudCertainty(weatherData);
    overallConfidence = geometryQuality * 0.6 + cloudCertainty * 0.4;
    overallConfidence = applyConfidenceCaps(
      overallConfidence,
      weatherData,
      buildingDataQuality,
      shadowInfo,
      solarPosition
    );
  } else {
    overallConfidence =
      buildingDataQuality * 0.4 +
      geometryPrecision * 0.25 +
      solarAccuracy * 0.2 +
      shadowAccuracy * 0.15;
    overallConfidence = applyConfidenceCaps(
      overallConfidence,
      null,
      buildingDataQuality,
      shadowInfo,
      solarPosition
    );
  }

  overallConfidence = clamp(overallConfidence, 0, 1);

  const confidenceCategory: ConfidenceFactors['confidenceCategory'] =
    overallConfidence >= 0.7 ? 'High' : overallConfidence >= 0.4 ? 'Medium' : 'Low';

  const qualityIssues = identifyQualityIssues(
    buildingDataQuality,
    geometryPrecision,
    solarPosition,
    shadowInfo,
    overallConfidence,
    weatherData,
    shadowInfo.shadowDataCoverage
  );
  const improvements = suggestImprovements(
    buildingDataQuality,
    geometryPrecision,
    shadowInfo,
    overallConfidence,
    weatherData
  );

  return {
    buildingDataQuality,
    geometryPrecision,
    solarAccuracy,
    shadowAccuracy,
    geometryQuality,
    cloudCertainty,
    overallConfidence,
    confidenceCategory,
    qualityIssues,
    improvements,
  };
}

export function calculateDisplayConfidence(factors: ConfidenceFactors): number {
  return Math.round(factors.overallConfidence * 1000) / 10;
}

export function isSufficientConfidence(factors: ConfidenceFactors): boolean {
  return factors.overallConfidence >= 0.6;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function calcBuildingDataQuality(info: VenueShadowInfo): number {
  if (info.castingShadows.length === 0) {
    if (info.shadowDataCoverage?.allowsHighConfidence === true) return 1.0;
    return applyShadowDataCoverageCap(Math.min(info.confidence, 1.0), info.shadowDataCoverage);
  }
  const average =
    info.castingShadows.reduce((sum, shadow) => sum + shadow.confidence, 0) /
    info.castingShadows.length;
  return applyShadowDataCoverageCap(average, info.shadowDataCoverage);
}

function calcSolarAccuracy(pos: SolarPosition): number {
  if (pos.elevation > 30) return 0.98;
  if (pos.elevation > 15) return 0.95;
  if (pos.elevation > 5) return 0.85;
  if (pos.elevation > 0) return 0.7;
  return 0.5;
}

function calcShadowAccuracy(
  info: VenueShadowInfo,
  pos: SolarPosition
): number {
  const base = info.confidence;
  const complexityPenalty = Math.min(info.castingShadows.length * 0.03, 0.15);
  const elevationPenalty = pos.elevation < 10 ? 0.1 : 0;
  return Math.max(base - complexityPenalty - elevationPenalty, 0.3);
}

function calcGeometryQuality(
  buildingQuality: number,
  polygonPrecision: number,
  shadowConfidence: number
): number {
  return clamp(
    buildingQuality * 0.5 + polygonPrecision * 0.3 + shadowConfidence * 0.2,
    0,
    1
  );
}

function calcCloudCertainty(weather: WeatherSlice): number {
  const ageMs = Date.now() - weather.createdAt.getTime();
  const freshness = weatherFreshnessFactor(ageMs);
  const forecastFactor = weather.isForecast ? 0.9 : 0.95;
  const sourceReliability = weatherSourceReliability(weather.source);
  // STORY 10.1 (AC3, FR12): fold the actual cloud amount into the confidence blend.
  // Until now this function ignored `weather.cloudCover` entirely, so a downpour
  // with fresh Met.no data still scored ~0.9 "cloud certainty" — FR12's promised
  // "weather-based cloud cover uncertainty" was never implemented. The DISPLAYED
  // confidence must fall as cover rises toward total overcast (per the AC), so we
  // multiply the freshness × forecast × source product by a cloud factor that is
  // 1.0 at clear sky and decays linearly to CLOUD_CONFIDENCE_FLOOR at 100% cover.
  // STORY 10.3 (AC2): read the layer-weighted EFFECTIVE cover (via the SAME shared
  // helper the gate uses) rather than the raw total, so confidence and the gate
  // agree on one cloud number — a thin-cirrus sky no longer drops confidence as if
  // it were a blocking deck. UNKNOWN cloud (10.1 AC2 / 10.3 AC3: `effectiveCloudCover`
  // ⇒ `undefined`) stays NEUTRAL — factor 1.0, freshness-only — so a missing-weather
  // slice is NOT penalised as if it were 100% overcast.
  const cloudFactor = cloudConfidenceFactor(effectiveCloudCover(weather));
  return clamp(forecastFactor * freshness * sourceReliability * cloudFactor, 0, 1);
}

/**
 * STORY 10.1 (AC3): map cloud cover (0..100, or `undefined` = unknown) to a
 * confidence multiplier. Clear sky (0%) → 1.0; total overcast (100%) →
 * {@link CLOUD_CONFIDENCE_FLOOR}; unknown cover → 1.0 (neutral, freshness-only).
 * Linear so a re-tune of the floor keeps the monotone "more cloud ⇒ less
 * displayed confidence" property that FR12 requires and the red-first test asserts
 * (relative: 100% materially lower than 0%).
 */
function cloudConfidenceFactor(cloudCover: number | undefined): number {
  if (cloudCover === undefined) return 1;
  const cover = clamp(cloudCover, 0, 100) / 100;
  return CLOUD_CONFIDENCE_FLOOR + (1 - CLOUD_CONFIDENCE_FLOOR) * (1 - cover);
}

// Lowest cloud multiplier, reached at 100% cover. 0.5 makes total overcast cut the
// cloud-certainty term in half — a material, tunable drop (cloud-certainty is 40%
// of the weather-enhanced overall, so a fully-overcast sky pulls overall down by
// up to ~0.2 versus a clear sky with otherwise-identical geometry/freshness).
const CLOUD_CONFIDENCE_FLOOR = 0.5;

function weatherFreshnessFactor(ageMs: number): number {
  const mins = ageMs / 60000;
  if (mins < 5) return 1.0;
  if (mins < 15) return 0.95;
  if (mins < 30) return 0.9;
  if (mins < 60) return 0.85;
  const hrs = mins / 60;
  if (hrs < 2) return 0.75;
  if (hrs < 6) return 0.6;
  return 0.4;
}

function weatherSourceReliability(source: string): number {
  switch (source?.toLowerCase()) {
    case 'yr.no':
    case 'metno':
      return 0.95;
    case 'openweathermap':
    case 'openweather':
      return 0.85;
    default:
      return 0.8;
  }
}

function applyConfidenceCaps(
  confidence: number,
  weather: WeatherSlice | null | undefined,
  buildingQuality: number,
  shadowInfo: VenueShadowInfo,
  solarPosition: SolarPosition
): number {
  let c = confidence;
  if (weather?.isForecast === true) c = Math.min(c, 0.9);
  if (weather?.isForecast === false) c = Math.min(c, 0.95);
  if (!weather) c = Math.min(c, 0.6);
  if (buildingQuality < 0.6) c = Math.min(c, 0.7);
  c = applyShadowDataCoverageCap(c, shadowInfo.shadowDataCoverage);
  c = Math.min(c, getObstructionRiskConfidenceCap(shadowInfo.obstructionRisks));
  if (solarPosition.elevation > 0 && solarPosition.elevation < 5) c = Math.min(c, 0.35);
  else if (solarPosition.elevation > 0 && solarPosition.elevation < 10) c = Math.min(c, 0.55);
  return c;
}

function identifyQualityIssues(
  buildingQuality: number,
  geometryPrecision: number,
  pos: SolarPosition,
  info: VenueShadowInfo,
  overall: number,
  weather?: WeatherSlice | null,
  coverage?: ShadowDataCoverage
): string[] {
  const issues: string[] = [];
  if (buildingQuality < 0.7) issues.push('Building height data has low reliability');
  if (coverage && !coverage.allowsHighConfidence) {
    issues.push('Shadow-caster coverage is not validated for this launch cluster');
  }
  if (geometryPrecision < 0.7) issues.push('Venue polygon has low quality score');
  if (pos.elevation > 0 && pos.elevation < 10) issues.push('Sun at low angle - shadow calculations less reliable');
  if (pos.elevation <= 0) issues.push('Sun below horizon - no direct sunlight');
  if (info.castingShadows.length > 5) issues.push('Complex shadow environment with many buildings');
  if ((info.obstructionRisks?.length ?? 0) > 0) {
    issues.push('Known unmodelled obstruction risk caps confidence');
  }
  if (overall < 0.4) issues.push('Multiple data quality factors reduce overall confidence');
  if (!weather) {
    issues.push('No weather data available - confidence capped at 60%');
  } else {
    const ageHrs = (Date.now() - weather.createdAt.getTime()) / 3600000;
    if (ageHrs > 2) issues.push(`Weather data is ${ageHrs.toFixed(1)} hours old - reduced confidence`);
    if (weather.isForecast) issues.push('Using forecast data - confidence capped at 90%');
  }
  return issues;
}

function suggestImprovements(
  buildingQuality: number,
  geometryPrecision: number,
  info: VenueShadowInfo,
  overall: number,
  weather?: WeatherSlice | null
): string[] {
  const improvements: string[] = [];
  if (buildingQuality < 0.7) {
    improvements.push('Survey building heights for more accurate shadow calculations');
  }
  if (geometryPrecision < 0.7) {
    improvements.push('Refine venue boundary with higher precision GPS data');
  }
  if (info.castingShadows.some((s) => s.confidence < 0.7)) {
    improvements.push('Update building height data for nearby structures');
  }
  if (overall < 0.7) {
    improvements.push('Consider multiple data sources for validation');
  }
  if (!weather) {
    improvements.push('Integrate weather data for higher confidence scores');
  } else {
    const ageHrs = (Date.now() - weather.createdAt.getTime()) / 3600000;
    if (ageHrs > 1) improvements.push('Refresh weather data for improved confidence');
  }
  if (improvements.length === 0) {
    improvements.push('Data quality is good - confidence level is appropriate');
  }
  return improvements;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
