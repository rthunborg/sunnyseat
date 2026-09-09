import { effectiveCloudCover } from '@/lib/solar/effective-cloud-cover';
import type { WeatherSlice } from '@/lib/solar/types';
import type {
  DirectSunReason,
  DirectSunState,
  VenueSunStatus,
  WeatherGateState,
} from '@/lib/types/api';

/**
 * The single policy boundary between clear-sky geometry and forecast direct sun.
 *
 * A high geometric percentage only says that a clear sky would reach the venue
 * polygon. It must not itself become an affirmative public sun claim. This
 * classifier is intentionally conservative: a `likely` result requires complete,
 * coherent Met.no evidence; unknown, old, or partly-cloudy evidence stays
 * `unknown`, never clear.
 */
export const DIRECT_SUN_CLEAR_OBSTRUCTION_MAX = 20;
export const DIRECT_SUN_BLOCKING_OBSTRUCTION_MIN = 80;
export const DIRECT_SUN_BLOCKING_FOG_MIN = 80;

export type DirectSunWeatherEvidence = Pick<
  WeatherSlice,
  'cloudCover' | 'cloudCoverLow' | 'cloudCoverMedium' | 'cloudCoverHigh'
> & {
  fogAreaFraction?: number;
  precipitationAmount?: number;
  symbolCode?: string;
  isRaining?: boolean;
  weatherUnknown?: boolean;
};

export type DirectSunClassification = {
  state: DirectSunState;
  reasons: DirectSunReason[];
  effectiveCloudCover?: number;
};

export type DirectSunSkyCondition =
  | 'clear'
  | 'partly-cloudy'
  | 'overcast'
  | 'rain'
  | 'unavailable';

const CLEAR_OR_FAIR_SYMBOL = /^(clearsky|fair)(?:_(?:day|night|polartwilight))?$/;
const FOG_SYMBOL = /^fog(?:_(?:day|night|polartwilight))?$/;
const PRECIPITATION_SYMBOL = /(rain|sleet|snow|thunder)/;
const CLOUDY_SYMBOL = /^cloudy(?:_(?:day|night|polartwilight))?$/;
const PARTLY_CLOUDY_SYMBOL = /^partlycloudy(?:_(?:day|night|polartwilight))?$/;

export function classifyDirectSun(input: {
  geometryPotentialPercent: number;
  isSunVisible: boolean;
  weather?: DirectSunWeatherEvidence | null;
}): DirectSunClassification {
  const geometry = finitePercent(input.geometryPotentialPercent);
  if (geometry === undefined || typeof input.isSunVisible !== 'boolean') {
    return { state: 'unknown', reasons: ['geometry-incomplete'] };
  }
  if (!input.isSunVisible || geometry <= 50) {
    return { state: 'blocked', reasons: ['geometry'] };
  }

  const weather = input.weather;
  if (!weather || weather.weatherUnknown === true) {
    return { state: 'unknown', reasons: ['weather-unavailable'] };
  }
  // Persisted JSON is outside TypeScript's trust boundary. A truthy string such
  // as `"false"` must not be mistaken for an intentional unavailable marker.
  if (weather.weatherUnknown !== undefined && typeof weather.weatherUnknown !== 'boolean') {
    return { state: 'unknown', reasons: ['weather-incomplete'] };
  }

  const symbol = normalizedSymbol(weather.symbolCode);
  const totalCover = finitePercent(weather.cloudCover);
  const fog = finitePercent(weather.fogAreaFraction);
  // Only form a layer-weighted blocker from valid percentages. With missing
  // layers the valid raw total remains useful as an independent blocker, but it
  // is never enough to promote the result to `likely`.
  const cover = hasValidCloudLayerEvidence(weather)
    ? effectiveCloudCover(weather)
    : totalCover;
  // Independent, provider-declared blockers win even if another field is
  // incomplete. This avoids silently downgrading rain, fog, or cloudy to clear.
  if (FOG_SYMBOL.test(symbol ?? '')) return { state: 'blocked', reasons: ['fog'] };
  if (PRECIPITATION_SYMBOL.test(symbol ?? '')) {
    return { state: 'blocked', reasons: ['precipitation'] };
  }
  if (CLOUDY_SYMBOL.test(symbol ?? '')) {
    return { state: 'blocked', reasons: ['cloud-obstruction'], effectiveCloudCover: cover };
  }
  if (weather.isRaining === true || positive(weather.precipitationAmount)) {
    return { state: 'blocked', reasons: ['precipitation'] };
  }
  if (fog !== undefined && fog >= DIRECT_SUN_BLOCKING_FOG_MIN) return { state: 'blocked', reasons: ['fog'] };
  // Full total coverage is a direct-beam blocker even where thin high layers
  // would yield a low weighted value. `likely` requires BOTH measurements clear.
  if (totalCover !== undefined && totalCover >= DIRECT_SUN_BLOCKING_OBSTRUCTION_MIN) {
    return { state: 'blocked', reasons: ['cloud-obstruction'], effectiveCloudCover: cover };
  }
  if (cover !== undefined && cover >= DIRECT_SUN_BLOCKING_OBSTRUCTION_MIN) {
    return { state: 'blocked', reasons: ['cloud-obstruction'], effectiveCloudCover: cover };
  }

  if (hasMalformedWeatherEvidence(weather)) {
    return { state: 'unknown', reasons: ['weather-incomplete'] };
  }

  if (fog === undefined) return { state: 'unknown', reasons: ['weather-incomplete'] };
  if (fog > DIRECT_SUN_CLEAR_OBSTRUCTION_MAX) return { state: 'unknown', reasons: ['fog'] };
  if (PARTLY_CLOUDY_SYMBOL.test(symbol ?? '')) {
    return { state: 'unknown', reasons: ['cloud-obstruction'], effectiveCloudCover: cover };
  }
  if (!hasExplicitNoPrecipitation(weather) || cover === undefined || totalCover === undefined || !hasCompleteCloudEvidence(weather)) {
    return { state: 'unknown', reasons: ['weather-incomplete'] };
  }
  if (!symbol) return { state: 'unknown', reasons: ['weather-incomplete'], effectiveCloudCover: cover };

  // A clear/fair code against non-clear metrics is an unresolved forecast
  // conflict. A known independent blocker above has already won.
  if (CLEAR_OR_FAIR_SYMBOL.test(symbol)) {
    return totalCover <= DIRECT_SUN_CLEAR_OBSTRUCTION_MAX && cover <= DIRECT_SUN_CLEAR_OBSTRUCTION_MAX
      ? { state: 'likely', reasons: [], effectiveCloudCover: cover }
      : { state: 'unknown', reasons: ['contradictory-weather'], effectiveCloudCover: cover };
  }
  if (cover > DIRECT_SUN_CLEAR_OBSTRUCTION_MAX || totalCover > DIRECT_SUN_CLEAR_OBSTRUCTION_MAX) {
    return { state: 'unknown', reasons: ['cloud-obstruction'], effectiveCloudCover: cover };
  }
  return { state: 'unknown', reasons: ['contradictory-weather'], effectiveCloudCover: cover };
}

/**
 * Compatibility projection for existing DTO consumers. The affirmative public
 * decision remains `classification.state`; this helper only keeps the older
 * headline enum internally coherent with that decision.
 */
export function sunStatusForDirectSun(
  geometricStatus: VenueSunStatus,
  classification: Pick<DirectSunClassification, 'state' | 'reasons'>,
): VenueSunStatus {
  const isWeatherBlocked =
    classification.state === 'blocked' &&
    !classification.reasons.includes('geometry');
  return isWeatherBlocked && (geometricStatus === 'Sunny' || geometricStatus === 'Partial')
    ? 'CloudObscured'
    : geometricStatus;
}

/** Map the explicit three-state decision to the legacy weather-gate field. */
export function weatherGateStateForDirectSun(
  classification: Pick<DirectSunClassification, 'state' | 'reasons'>,
): WeatherGateState {
  if (classification.reasons.includes('geometry')) return 'not_gated';
  if (classification.state === 'likely') return 'not_gated';
  return classification.state === 'blocked' ? 'gated' : 'unknown';
}

/**
 * Produce a non-contradictory, provider-safe sky descriptor. This is display
 * context only; it never changes the direct-sun decision.
 */
export function skyConditionForDirectSun(
  weather: DirectSunWeatherEvidence | null | undefined,
  classification: Pick<DirectSunClassification, 'state' | 'reasons'>,
): DirectSunSkyCondition {
  if (
    !weather ||
    weather.weatherUnknown ||
    classification.reasons.includes('weather-unavailable') ||
    classification.reasons.includes('weather-incomplete')
  ) {
    return 'unavailable';
  }
  const symbol = normalizedSymbol(weather.symbolCode);
  if (
    weather.isRaining === true ||
    positive(weather.precipitationAmount) ||
    PRECIPITATION_SYMBOL.test(symbol ?? '') ||
    classification.reasons.includes('precipitation')
  ) {
    return 'rain';
  }
  if (
    FOG_SYMBOL.test(symbol ?? '') ||
    CLOUDY_SYMBOL.test(symbol ?? '') ||
    (finitePercent(weather.fogAreaFraction) ?? 0) >= DIRECT_SUN_BLOCKING_FOG_MIN ||
    (classification.state === 'blocked' &&
      (classification.reasons.includes('fog') ||
        classification.reasons.includes('cloud-obstruction')))
  ) {
    return 'overcast';
  }

  const totalCover = finitePercent(weather.cloudCover);
  if (totalCover === undefined) return 'unavailable';
  if (totalCover >= DIRECT_SUN_BLOCKING_OBSTRUCTION_MIN) return 'overcast';
  // A conservative unknown verdict must never be paired with a clear-sky label.
  // Partial fog has no dedicated public sky descriptor, so omit the descriptor;
  // broken-cloud evidence can still be described as partly cloudy.
  if (classification.state === 'unknown') {
    if (classification.reasons.includes('fog')) return 'unavailable';
    if (
      PARTLY_CLOUDY_SYMBOL.test(symbol ?? '') ||
      classification.reasons.includes('cloud-obstruction') ||
      totalCover > DIRECT_SUN_CLEAR_OBSTRUCTION_MAX
    ) {
      return 'partly-cloudy';
    }
    return 'unavailable';
  }
  if (totalCover > DIRECT_SUN_CLEAR_OBSTRUCTION_MAX) return 'partly-cloudy';
  return 'clear';
}

function hasExplicitNoPrecipitation(weather: DirectSunWeatherEvidence): boolean {
  const amount = weather.precipitationAmount;
  // A negative nowcast flag says only that radar did not detect current rain; it
  // cannot fill a missing Locationforecast precipitation period. Promotion to
  // `likely` therefore requires the provider's explicit zero amount.
  return typeof amount === 'number' && Number.isFinite(amount) && amount === 0;
}

function hasCompleteCloudEvidence(weather: DirectSunWeatherEvidence): boolean {
  return [
    weather.cloudCover,
    weather.cloudCoverLow,
    weather.cloudCoverMedium,
    weather.cloudCoverHigh,
  ].every((value) => finitePercent(value) !== undefined);
}

function hasValidCloudLayerEvidence(weather: DirectSunWeatherEvidence): boolean {
  return [
    weather.cloudCoverLow,
    weather.cloudCoverMedium,
    weather.cloudCoverHigh,
  ].every((value) => finitePercent(value) !== undefined);
}

function hasMalformedWeatherEvidence(weather: DirectSunWeatherEvidence): boolean {
  const hasMalformedPercent = [
    weather.cloudCover,
    weather.cloudCoverLow,
    weather.cloudCoverMedium,
    weather.cloudCoverHigh,
    weather.fogAreaFraction,
  ].some((value) => value !== undefined && finitePercent(value) === undefined);
  if (hasMalformedPercent) return true;

  if (
    weather.precipitationAmount !== undefined &&
    (!Number.isFinite(weather.precipitationAmount) || weather.precipitationAmount < 0)
  ) {
    return true;
  }
  if (weather.symbolCode !== undefined && normalizedSymbol(weather.symbolCode) === undefined) {
    return true;
  }
  if (weather.isRaining !== undefined && typeof weather.isRaining !== 'boolean') return true;
  return weather.weatherUnknown !== undefined && typeof weather.weatherUnknown !== 'boolean';
}

function normalizedSymbol(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim().toLowerCase()
    : undefined;
}

function finitePercent(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : undefined;
}

function positive(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
