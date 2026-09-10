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

export type DirectSunDiagnosticOperand =
  | { availability: 'available'; value: string | number | boolean | null; unit?: string }
  | { availability: 'absent' }
  | { availability: 'invalid'; receivedType: string; renderedValue: string };

export type DirectSunDecisionRuleId =
  | 'invalid-geometry-evidence'
  | 'geometry-blocks-direct-sun'
  | 'weather-unavailable'
  | 'malformed-weather-unknown-flag'
  | 'blocking-symbol'
  | 'positive-precipitation'
  | 'dense-fog'
  | 'raw-cloud-obstruction'
  | 'weighted-cloud-obstruction'
  | 'malformed-weather-evidence'
  | 'fog-exceeds-clear-threshold'
  | 'partly-cloudy-symbol'
  | 'incomplete-clear-evidence'
  | 'clear-fair-conflict'
  | 'remaining-cloud-obstruction'
  | 'fallback-contradiction';

export type DirectSunDecisionRuleTrace = {
  id: DirectSunDecisionRuleId;
  evaluation: 'matched' | 'not-matched' | 'not-evaluated';
  decisive: boolean;
  operands: Record<string, DirectSunDiagnosticOperand>;
  threshold?: { operator: string; value: number; unit: string };
};

export type DirectSunClassificationWithTrace = DirectSunClassification & {
  trace: DirectSunDecisionRuleTrace[];
  decisiveRuleIds: DirectSunDecisionRuleId[];
  earlyExit: boolean;
};

const DIRECT_SUN_RULE_ORDER: readonly DirectSunDecisionRuleId[] = [
  'invalid-geometry-evidence',
  'geometry-blocks-direct-sun',
  'weather-unavailable',
  'malformed-weather-unknown-flag',
  'blocking-symbol',
  'positive-precipitation',
  'dense-fog',
  'raw-cloud-obstruction',
  'weighted-cloud-obstruction',
  'malformed-weather-evidence',
  'fog-exceeds-clear-threshold',
  'partly-cloudy-symbol',
  'incomplete-clear-evidence',
  'clear-fair-conflict',
  'remaining-cloud-obstruction',
  'fallback-contradiction',
];

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
  return evaluateDirectSun(input);
}

/**
 * Evaluate the canonical classifier while retaining a serializable explanation.
 * Ordinary public calls use {@link classifyDirectSun} and discard this trace, so
 * they do not allocate rule/operand objects.
 */
export function classifyDirectSunWithTrace(input: {
  geometryPotentialPercent: number;
  isSunVisible: boolean;
  weather?: DirectSunWeatherEvidence | null;
}): DirectSunClassificationWithTrace {
  const collector = createDirectSunTraceCollector();
  const classification = evaluateDirectSun(input, collector);
  return collector.result(classification);
}

type DirectSunTraceCollector = {
  record(
    id: DirectSunDecisionRuleId,
    matched: boolean,
    operands: () => Record<string, DirectSunDiagnosticOperand>,
    threshold?: DirectSunDecisionRuleTrace['threshold'],
  ): void;
  decide(id: DirectSunDecisionRuleId): void;
  result(classification: DirectSunClassification): DirectSunClassificationWithTrace;
};

function createDirectSunTraceCollector(): DirectSunTraceCollector {
  const evaluated: DirectSunDecisionRuleTrace[] = [];
  let decisiveRuleId: DirectSunDecisionRuleId = 'fallback-contradiction';
  return {
    record(id, matched, operands, threshold) {
      evaluated.push({
        id,
        evaluation: matched ? 'matched' : 'not-matched',
        decisive: false,
        operands: operands(),
        ...(threshold ? { threshold } : {}),
      });
    },
    decide(id) {
      decisiveRuleId = id;
      const decisive = evaluated.findLast((rule) => rule.id === id);
      if (decisive) decisive.decisive = true;
    },
    result(classification) {
    const evaluatedIds = new Set(evaluated.map((rule) => rule.id));
    const trace = [
      ...evaluated,
      ...DIRECT_SUN_RULE_ORDER
        .filter((id) => !evaluatedIds.has(id))
        .map((id) => ({
          id,
          evaluation: 'not-evaluated' as const,
          decisive: false,
          operands: {},
        })),
    ];
    return {
      ...classification,
      trace,
      decisiveRuleIds: [decisiveRuleId],
      earlyExit: decisiveRuleId !== 'fallback-contradiction',
    };
    },
  };
}

function evaluateDirectSun(
  input: {
    geometryPotentialPercent: number;
    isSunVisible: boolean;
    weather?: DirectSunWeatherEvidence | null;
  },
  collector?: DirectSunTraceCollector,
): DirectSunClassification {
  const record = (
    id: DirectSunDecisionRuleId,
    matched: boolean,
    operands: () => Record<string, DirectSunDiagnosticOperand>,
    threshold?: DirectSunDecisionRuleTrace['threshold'],
  ): boolean => {
    collector?.record(id, matched, operands, threshold);
    return matched;
  };
  const finish = (
    classification: DirectSunClassification,
    decisiveRuleId: DirectSunDecisionRuleId,
  ): DirectSunClassification => {
    collector?.decide(decisiveRuleId);
    return classification;
  };

  const geometry = finitePercent(input.geometryPotentialPercent);
  if (record(
    'invalid-geometry-evidence',
    geometry === undefined || typeof input.isSunVisible !== 'boolean',
    () => ({
      geometryPotentialPercent: diagnosticOperand(input.geometryPotentialPercent, '%', finitePercent),
      isSunVisible: diagnosticOperand(input.isSunVisible),
    }),
  )) {
    return finish({ state: 'unknown', reasons: ['geometry-incomplete'] }, 'invalid-geometry-evidence');
  }
  if (record(
    'geometry-blocks-direct-sun',
    !input.isSunVisible || geometry! <= 50,
    () => ({
      geometryPotentialPercent: diagnosticOperand(geometry, '%'),
      isSunVisible: diagnosticOperand(input.isSunVisible),
    }),
    { operator: '<=', value: 50, unit: '%' },
  )) {
    return finish({ state: 'blocked', reasons: ['geometry'] }, 'geometry-blocks-direct-sun');
  }

  const weather = input.weather;
  if (record(
    'weather-unavailable',
    !weather || weather.weatherUnknown === true,
    () => ({ weather: weather ? diagnosticOperand('present') : { availability: 'absent' } }),
  )) {
    return finish({ state: 'unknown', reasons: ['weather-unavailable'] }, 'weather-unavailable');
  }
  // Persisted JSON is outside TypeScript's trust boundary. A truthy string such
  // as `"false"` must not be mistaken for an intentional unavailable marker.
  if (record(
    'malformed-weather-unknown-flag',
    weather!.weatherUnknown !== undefined && typeof weather!.weatherUnknown !== 'boolean',
    () => ({ weatherUnknown: diagnosticOperand(weather!.weatherUnknown) }),
  )) {
    return finish({ state: 'unknown', reasons: ['weather-incomplete'] }, 'malformed-weather-unknown-flag');
  }

  const symbol = normalizedSymbol(weather!.symbolCode);
  const totalCover = finitePercent(weather!.cloudCover);
  const fog = finitePercent(weather!.fogAreaFraction);
  // Only form a layer-weighted blocker from valid percentages. With missing
  // layers the valid raw total remains useful as an independent blocker, but it
  // is never enough to promote the result to `likely`.
  const cover = hasValidCloudLayerEvidence(weather!)
    ? effectiveCloudCover(weather!)
    : totalCover;
  // Independent, provider-declared blockers win even if another field is
  // incomplete. This avoids silently downgrading rain, fog, or cloudy to clear.
  const blockingSymbolReason = FOG_SYMBOL.test(symbol ?? '')
    ? 'fog' as const
    : PRECIPITATION_SYMBOL.test(symbol ?? '')
      ? 'precipitation' as const
      : CLOUDY_SYMBOL.test(symbol ?? '')
        ? 'cloud-obstruction' as const
        : undefined;
  if (record(
    'blocking-symbol',
    blockingSymbolReason !== undefined,
    () => ({ symbolCode: diagnosticOperand(weather!.symbolCode) }),
  )) {
    return finish(
      {
        state: 'blocked',
        reasons: [blockingSymbolReason!],
        ...(blockingSymbolReason === 'cloud-obstruction' ? { effectiveCloudCover: cover } : {}),
      },
      'blocking-symbol',
    );
  }
  if (record(
    'positive-precipitation',
    weather!.isRaining === true || positive(weather!.precipitationAmount),
    () => ({
      isRaining: diagnosticOperand(weather!.isRaining),
      precipitationAmount: diagnosticOperand(weather!.precipitationAmount, 'mm'),
    }),
    { operator: '>', value: 0, unit: 'mm' },
  )) {
    return finish({ state: 'blocked', reasons: ['precipitation'] }, 'positive-precipitation');
  }
  if (record(
    'dense-fog',
    fog !== undefined && fog >= DIRECT_SUN_BLOCKING_FOG_MIN,
    () => ({ fogAreaFraction: diagnosticOperand(weather!.fogAreaFraction, '%', finitePercent) }),
    { operator: '>=', value: DIRECT_SUN_BLOCKING_FOG_MIN, unit: '%' },
  )) return finish({ state: 'blocked', reasons: ['fog'] }, 'dense-fog');
  // Full total coverage is a direct-beam blocker even where thin high layers
  // would yield a low weighted value. `likely` requires BOTH measurements clear.
  if (record(
    'raw-cloud-obstruction',
    totalCover !== undefined && totalCover >= DIRECT_SUN_BLOCKING_OBSTRUCTION_MIN,
    () => ({ cloudCover: diagnosticOperand(weather!.cloudCover, '%', finitePercent) }),
    { operator: '>=', value: DIRECT_SUN_BLOCKING_OBSTRUCTION_MIN, unit: '%' },
  )) {
    return finish({ state: 'blocked', reasons: ['cloud-obstruction'], effectiveCloudCover: cover }, 'raw-cloud-obstruction');
  }
  if (record(
    'weighted-cloud-obstruction',
    cover !== undefined && cover >= DIRECT_SUN_BLOCKING_OBSTRUCTION_MIN,
    () => ({ effectiveCloudCover: diagnosticOperand(cover, '%') }),
    { operator: '>=', value: DIRECT_SUN_BLOCKING_OBSTRUCTION_MIN, unit: '%' },
  )) {
    return finish({ state: 'blocked', reasons: ['cloud-obstruction'], effectiveCloudCover: cover }, 'weighted-cloud-obstruction');
  }

  if (record(
    'malformed-weather-evidence',
    hasMalformedWeatherEvidence(weather!),
    () => weatherDiagnosticOperands(weather!),
  )) {
    return finish({ state: 'unknown', reasons: ['weather-incomplete'] }, 'malformed-weather-evidence');
  }

  if (record(
    'fog-exceeds-clear-threshold',
    fog === undefined || fog > DIRECT_SUN_CLEAR_OBSTRUCTION_MAX,
    () => ({ fogAreaFraction: diagnosticOperand(weather!.fogAreaFraction, '%', finitePercent) }),
    { operator: '<=', value: DIRECT_SUN_CLEAR_OBSTRUCTION_MAX, unit: '%' },
  )) {
    return finish(
      fog === undefined
        ? { state: 'unknown', reasons: ['weather-incomplete'] }
        : { state: 'unknown', reasons: ['fog'] },
      'fog-exceeds-clear-threshold',
    );
  }
  if (record(
    'partly-cloudy-symbol',
    PARTLY_CLOUDY_SYMBOL.test(symbol ?? ''),
    () => ({ symbolCode: diagnosticOperand(weather!.symbolCode) }),
  )) {
    return finish({ state: 'unknown', reasons: ['cloud-obstruction'], effectiveCloudCover: cover }, 'partly-cloudy-symbol');
  }
  if (record(
    'incomplete-clear-evidence',
    !hasExplicitNoPrecipitation(weather!) || cover === undefined || totalCover === undefined || !hasCompleteCloudEvidence(weather!),
    () => weatherDiagnosticOperands(weather!),
  )) {
    return finish({ state: 'unknown', reasons: ['weather-incomplete'] }, 'incomplete-clear-evidence');
  }
  if (!symbol) {
    return finish({ state: 'unknown', reasons: ['weather-incomplete'], effectiveCloudCover: cover }, 'incomplete-clear-evidence');
  }

  // A clear/fair code against non-clear metrics is an unresolved forecast
  // conflict. A known independent blocker above has already won.
  if (CLEAR_OR_FAIR_SYMBOL.test(symbol)) {
    const contradictory = totalCover! > DIRECT_SUN_CLEAR_OBSTRUCTION_MAX || cover! > DIRECT_SUN_CLEAR_OBSTRUCTION_MAX;
    record(
      'clear-fair-conflict',
      contradictory,
      () => ({
        symbolCode: diagnosticOperand(symbol),
        cloudCover: diagnosticOperand(totalCover, '%'),
        effectiveCloudCover: diagnosticOperand(cover, '%'),
      }),
      { operator: '<=', value: DIRECT_SUN_CLEAR_OBSTRUCTION_MAX, unit: '%' },
    );
    return finish(
      contradictory
        ? { state: 'unknown', reasons: ['contradictory-weather'], effectiveCloudCover: cover }
        : { state: 'likely', reasons: [], effectiveCloudCover: cover },
      'clear-fair-conflict',
    );
  }
  if (record(
    'remaining-cloud-obstruction',
    cover! > DIRECT_SUN_CLEAR_OBSTRUCTION_MAX || totalCover! > DIRECT_SUN_CLEAR_OBSTRUCTION_MAX,
    () => ({
      cloudCover: diagnosticOperand(totalCover, '%'),
      effectiveCloudCover: diagnosticOperand(cover, '%'),
    }),
    { operator: '>', value: DIRECT_SUN_CLEAR_OBSTRUCTION_MAX, unit: '%' },
  )) {
    return finish({ state: 'unknown', reasons: ['cloud-obstruction'], effectiveCloudCover: cover }, 'remaining-cloud-obstruction');
  }
  record('fallback-contradiction', true, () => ({ symbolCode: diagnosticOperand(symbol) }));
  return finish({ state: 'unknown', reasons: ['contradictory-weather'], effectiveCloudCover: cover }, 'fallback-contradiction');
}

function weatherDiagnosticOperands(
  weather: DirectSunWeatherEvidence,
): Record<string, DirectSunDiagnosticOperand> {
  return {
    cloudCover: diagnosticOperand(weather.cloudCover, '%', finitePercent),
    cloudCoverLow: diagnosticOperand(weather.cloudCoverLow, '%', finitePercent),
    cloudCoverMedium: diagnosticOperand(weather.cloudCoverMedium, '%', finitePercent),
    cloudCoverHigh: diagnosticOperand(weather.cloudCoverHigh, '%', finitePercent),
    fogAreaFraction: diagnosticOperand(weather.fogAreaFraction, '%', finitePercent),
    precipitationAmount: diagnosticOperand(weather.precipitationAmount, 'mm', (value) =>
      typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined),
    symbolCode: diagnosticOperand(weather.symbolCode),
    isRaining: diagnosticOperand(weather.isRaining),
    weatherUnknown: diagnosticOperand(weather.weatherUnknown),
  };
}

function diagnosticOperand(
  value: unknown,
  unit?: string,
  validator?: (candidate: unknown) => unknown,
): DirectSunDiagnosticOperand {
  if (value === undefined) return { availability: 'absent' };
  if (
    (validator && validator(value) === undefined) ||
    (!validator && !['string', 'number', 'boolean'].includes(typeof value) && value !== null) ||
    (typeof value === 'number' && !Number.isFinite(value))
  ) {
    return {
      availability: 'invalid',
      receivedType: typeof value,
      renderedValue: typeof value === 'number' ? String(value) : Object.prototype.toString.call(value),
    };
  }
  return {
    availability: 'available',
    value: value as string | number | boolean | null,
    ...(unit ? { unit } : {}),
  };
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
