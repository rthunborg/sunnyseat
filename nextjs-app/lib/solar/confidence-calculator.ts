import type {
  SolarPosition,
  VenueShadowInfo,
  WeatherSlice,
  ConfidenceFactors,
  ShadowProjection,
} from './types';

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
  const buildingDataQuality = calcBuildingDataQuality(shadowInfo.castingShadows);
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
      buildingDataQuality
    );
  } else {
    overallConfidence =
      buildingDataQuality * 0.4 +
      geometryPrecision * 0.25 +
      solarAccuracy * 0.2 +
      shadowAccuracy * 0.15;
    overallConfidence = applyConfidenceCaps(overallConfidence, null, buildingDataQuality);
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
    weatherData
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

function calcBuildingDataQuality(shadows: ShadowProjection[]): number {
  if (shadows.length === 0) return 1.0;
  return shadows.reduce((s, sh) => s + sh.confidence, 0) / shadows.length;
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
  return clamp(forecastFactor * freshness * sourceReliability, 0, 1);
}

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
  buildingQuality: number
): number {
  let c = confidence;
  if (weather?.isForecast === true) c = Math.min(c, 0.9);
  if (weather?.isForecast === false) c = Math.min(c, 0.95);
  if (!weather) c = Math.min(c, 0.6);
  if (buildingQuality < 0.6) c = Math.min(c, 0.7);
  return c;
}

function identifyQualityIssues(
  buildingQuality: number,
  geometryPrecision: number,
  pos: SolarPosition,
  info: VenueShadowInfo,
  overall: number,
  weather?: WeatherSlice | null
): string[] {
  const issues: string[] = [];
  if (buildingQuality < 0.7) issues.push('Building height data has low reliability');
  if (geometryPrecision < 0.7) issues.push('Venue polygon has low quality score');
  if (pos.elevation > 0 && pos.elevation < 10) issues.push('Sun at low angle - shadow calculations less reliable');
  if (pos.elevation <= 0) issues.push('Sun below horizon - no direct sunlight');
  if (info.castingShadows.length > 5) issues.push('Complex shadow environment with many buildings');
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
