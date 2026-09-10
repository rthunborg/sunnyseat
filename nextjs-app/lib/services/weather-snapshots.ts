import {
  addDaysToDateKey,
  PLANNER_MAX_FUTURE_DAYS,
  STOCKHOLM_TIME_ZONE,
  stockholmDateKey,
} from '@/lib/utils/time-planner';
import { fromZonedTime } from 'date-fns-tz';
import type { VenueDaySeriesEntry } from '@/lib/types/api';
import {
  classifyDirectSun,
  skyConditionForDirectSun,
  sunStatusForDirectSun,
  weatherGateStateForDirectSun,
} from '@/lib/services/direct-sun-classifier';
import { classifySunStatus } from '@/lib/services/sun-engine';
import { venueEngineCoordinate } from '@/lib/services/sun-geometry-coordinates';
import { calculateSolarPosition } from '@/lib/solar/solar-calculation-service';

export type WeatherSnapshotSlice = {
  minutes?: number;
  validAt?: string;
  cloudCover?: number;
  cloudCoverLow?: number;
  cloudCoverMedium?: number;
  cloudCoverHigh?: number;
  fogAreaFraction?: number;
  precipitationAmount?: number;
  symbolCode?: string;
  nowcastValidAt?: string;
  nowcastPrecipitationRate?: number;
  isRaining?: boolean;
  weatherUnknown?: boolean;
};

export type WeatherSnapshotRecord = {
  status?: 'ready' | 'expired' | 'missing';
  bucket?: string;
  weatherUpdatedAt?: string;
  expiresAt?: string;
  slices: WeatherSnapshotSlice[];
  normalizationIssues?: WeatherSnapshotNormalizationIssue[];
};

export type WeatherSnapshotNormalizationIssue = {
  index: number;
  code:
    | 'invalid-slice'
    | 'missing-valid-time'
    | 'malformed-boolean-flag'
    | 'invalid-field';
  fields: string[];
};

export type WeatherSnapshotMatchDiagnostics = {
  slice: WeatherSnapshotSlice;
  matched: boolean;
  providerValidAt?: string;
  signedDifferenceMinutes?: number;
  absoluteDifferenceMinutes?: number;
  matchingLimitMinutes: number;
  rejected: boolean;
  rejectionReason?: 'invalid-requested-instant' | 'no-valid-slice' | 'outside-matching-limit';
};

export type SnapshotNowcastObservation = {
  validAt: string;
  precipitationRate: number;
};

export type SnapshotNowcastMatch = {
  forecastValidAt: string;
  observation: SnapshotNowcastObservation;
};

/** Nowcast is a roughly five-minute product; older observations are not current evidence. */
export const NOWCAST_OBSERVATION_MAX_AGE_MINUTES = 15;

const SNAPSHOT_PERCENT_FIELDS = [
  'cloudCover',
  'cloudCoverLow',
  'cloudCoverMedium',
  'cloudCoverHigh',
  'fogAreaFraction',
] as const;

/**
 * Runtime trust boundary for JSON-backed weather slices.
 *
 * Invalid entries are discarded instead of being cast into the typed domain.
 * A mixed array can therefore retain its valid evidence, while an all-malformed
 * array becomes empty and is handled as weather-unknown.
 */
export function normalizeWeatherSnapshotSlices(
  value: unknown,
  options: { requireValidAt?: boolean } = {},
): WeatherSnapshotSlice[] {
  if (!Array.isArray(value)) return [];
  const normalized: WeatherSnapshotSlice[] = [];
  for (const candidate of value) {
    const slice = normalizeWeatherSnapshotSlice(candidate, options.requireValidAt === true);
    if (slice) normalized.push(slice);
  }
  return normalized;
}

export function normalizeWeatherSnapshotSlicesWithDiagnostics(
  value: unknown,
  options: { requireValidAt?: boolean } = {},
): { slices: WeatherSnapshotSlice[]; issues: WeatherSnapshotNormalizationIssue[] } {
  if (!Array.isArray(value)) {
    return {
      slices: [],
      issues: [{ index: -1, code: 'invalid-slice', fields: ['slices'] }],
    };
  }
  const slices: WeatherSnapshotSlice[] = [];
  const issues: WeatherSnapshotNormalizationIssue[] = [];
  value.forEach((candidate, index) => {
    const normalized = normalizeWeatherSnapshotSlice(candidate, options.requireValidAt === true);
    if (!normalized) {
      const raw = candidate && typeof candidate === 'object' && !Array.isArray(candidate)
        ? candidate as Record<string, unknown>
        : undefined;
      issues.push({
        index,
        code: options.requireValidAt === true && raw && !normalizedInstant(raw.validAt)
          ? 'missing-valid-time'
          : 'invalid-slice',
        fields: options.requireValidAt === true ? ['validAt'] : [],
      });
      return;
    }
    slices.push(normalized);
    const raw = candidate as Record<string, unknown>;
    const malformedFlags = ['weatherUnknown', 'isRaining'].filter(
      (field) => Object.hasOwn(raw, field) && typeof raw[field] !== 'boolean',
    );
    if (malformedFlags.length > 0) {
      issues.push({ index, code: 'malformed-boolean-flag', fields: malformedFlags });
      return;
    }
    const invalidFields = [
      ...SNAPSHOT_PERCENT_FIELDS,
      'precipitationAmount',
      'nowcastValidAt',
      'nowcastPrecipitationRate',
    ].filter((field) => Object.hasOwn(raw, field) && !Object.hasOwn(normalized, field));
    if (Object.hasOwn(raw, 'symbolCode') && !Object.hasOwn(normalized, 'symbolCode')) {
      invalidFields.push('symbolCode');
    }
    if (invalidFields.length > 0) {
      issues.push({ index, code: 'invalid-field', fields: invalidFields });
    }
  });
  return { slices, issues };
}

/**
 * Attach one timestamped near-now radar observation to the closest forecast
 * slice. This avoids both losing rain just after an hourly boundary and applying
 * a single instantaneous rate to every slice in the 90-minute forecast horizon.
 */
export function matchNowcastObservationToForecast(input: {
  forecastSlices: ReadonlyArray<{ validAt?: Date | string }>;
  observation?: SnapshotNowcastObservation;
  refreshedAt: Date;
  maxForecastMatchMinutes?: number;
}): SnapshotNowcastMatch | undefined {
  const refreshedAtMs = input.refreshedAt.getTime();
  const observationAtMs = input.observation
    ? new Date(input.observation.validAt).getTime()
    : Number.NaN;
  const precipitationRate = input.observation?.precipitationRate;
  if (
    !Number.isFinite(refreshedAtMs) ||
    !Number.isFinite(observationAtMs) ||
    typeof precipitationRate !== 'number' ||
    !Number.isFinite(precipitationRate) ||
    precipitationRate < 0 ||
    Math.abs(observationAtMs - refreshedAtMs) > NOWCAST_OBSERVATION_MAX_AGE_MINUTES * 60_000
  ) {
    return undefined;
  }

  let closestValidAt: string | undefined;
  let closestDelta = Number.POSITIVE_INFINITY;
  for (const slice of input.forecastSlices) {
    if (slice.validAt === undefined) continue;
    const validAtMs = new Date(slice.validAt).getTime();
    if (!Number.isFinite(validAtMs)) continue;
    const delta = Math.abs(validAtMs - observationAtMs);
    if (delta < closestDelta) {
      closestDelta = delta;
      closestValidAt = new Date(validAtMs).toISOString();
    }
  }

  const maxForecastMatchMs = (input.maxForecastMatchMinutes ?? 90) * 60_000;
  return closestValidAt && closestDelta <= maxForecastMatchMs
    ? {
        forecastValidAt: closestValidAt,
        observation: {
          validAt: new Date(observationAtMs).toISOString(),
          precipitationRate,
        },
      }
    : undefined;
}

/** Persist the matched observation and derive the legacy rain blocker from it. */
export function attachMatchedNowcastEvidence(
  slice: WeatherSnapshotSlice,
  match: SnapshotNowcastMatch | undefined,
): WeatherSnapshotSlice {
  const sliceValidAt = normalizedInstant(slice.validAt);
  if (!sliceValidAt || match?.forecastValidAt !== sliceValidAt) return { ...slice };
  return {
    ...slice,
    validAt: sliceValidAt,
    nowcastValidAt: match.observation.validAt,
    nowcastPrecipitationRate: match.observation.precipitationRate,
    isRaining: match.observation.precipitationRate > 0,
  };
}

export interface WeatherSnapshotRepository {
  readSnapshotForVenueDay(
    venue: WeatherSnapshotVenue,
    bucket: string | undefined,
    stockholmDate: string,
  ): Promise<WeatherSnapshotRecord | null>;
}

type WeatherSnapshotVenue = {
  id: string;
  location: { lat: number; lng: number };
  seatingArea?: GeoJSON.Polygon;
};

let weatherSnapshotRepositoryForTests: WeatherSnapshotRepository | undefined;

export function __setWeatherSnapshotRepositoryForTests(repo: WeatherSnapshotRepository | undefined): void {
  weatherSnapshotRepositoryForTests = repo;
}

export function getWeatherSnapshotRepositoryForRoute(): WeatherSnapshotRepository {
  return weatherSnapshotRepositoryForTests ?? defaultWeatherSnapshotRepository;
}

export function buildWeatherSnapshotWindow(now: Date): string[] {
  const start = stockholmDateKey(now);
  return Array.from({ length: PLANNER_MAX_FUTURE_DAYS + 1 }, (_, offset) =>
    addDaysToDateKey(start, offset),
  );
}

export async function refreshWeatherSnapshotsForVenue(input: {
  venueId?: string;
  now?: Date;
  forecastSlices?: Array<Omit<WeatherSnapshotSlice, 'isRaining' | 'weatherUnknown'>>;
  nowcastObservation?: SnapshotNowcastObservation;
}): Promise<{ venueId?: string; slices: WeatherSnapshotSlice[] }> {
  const now = input.now ?? new Date();
  const forecastSlices = input.forecastSlices ?? [];
  const nowcastMatch = matchNowcastObservationToForecast({
    forecastSlices,
    observation: input.nowcastObservation,
    refreshedAt: now,
  });
  const slices = forecastSlices.map((slice) =>
    attachMatchedNowcastEvidence(slice, nowcastMatch),
  );
  return { venueId: input.venueId, slices };
}

export function selectSnapshotSliceForStep(input: {
  requestedAt: Date;
  slices: WeatherSnapshotSlice[];
  maxStalenessMinutes?: number;
}): WeatherSnapshotSlice {
  return selectSnapshotSliceForStepWithDiagnostics(input).slice;
}

export function selectSnapshotSliceForStepWithDiagnostics(input: {
  requestedAt: Date;
  slices: WeatherSnapshotSlice[];
  maxStalenessMinutes?: number;
}): WeatherSnapshotMatchDiagnostics {
  const { requestedAt } = input;
  const slices = normalizeWeatherSnapshotSlices(input.slices);
  const requestedAtMs = requestedAt.getTime();
  const matchingLimitMinutes = input.maxStalenessMinutes ?? 90;
  if (!Number.isFinite(requestedAtMs)) {
    return {
      slice: { weatherUnknown: true },
      matched: false,
      matchingLimitMinutes,
      rejected: true,
      rejectionReason: 'invalid-requested-instant',
    };
  }
  const maxStalenessMs = matchingLimitMinutes * 60 * 1000;
  let best: WeatherSnapshotSlice | undefined;
  let bestDelta = Number.POSITIVE_INFINITY;
  let bestSignedDelta = Number.NaN;
  for (const slice of slices) {
    if (!slice.validAt) continue;
    const validAtMs = new Date(slice.validAt).getTime();
    if (!Number.isFinite(validAtMs)) continue;
    const delta = Math.abs(validAtMs - requestedAtMs);
    if (delta < bestDelta || (delta === bestDelta && slice.weatherUnknown === true)) {
      best = slice;
      bestDelta = delta;
      bestSignedDelta = validAtMs - requestedAtMs;
    }
  }
  if (!best) {
    return {
      slice: { weatherUnknown: true },
      matched: false,
      matchingLimitMinutes,
      rejected: true,
      rejectionReason: 'no-valid-slice',
    };
  }
  if (bestDelta > maxStalenessMs) {
    return {
      slice: { weatherUnknown: true },
      matched: false,
      providerValidAt: best.validAt,
      signedDifferenceMinutes: bestSignedDelta / 60_000,
      absoluteDifferenceMinutes: bestDelta / 60_000,
      matchingLimitMinutes,
      rejected: true,
      rejectionReason: 'outside-matching-limit',
    };
  }
  return {
    slice: best,
    matched: true,
    providerValidAt: best.validAt,
    signedDifferenceMinutes: bestSignedDelta / 60_000,
    absoluteDifferenceMinutes: bestDelta / 60_000,
    matchingLimitMinutes,
    rejected: false,
  };
}

export function gateGeometrySeriesWithWeatherSnapshots(input: {
  geometrySeries: Array<{ minutes: number; sunExposurePercent: number }>;
  weatherSlices?: WeatherSnapshotSlice[];
  venue?: WeatherSnapshotVenue;
  stockholmDate?: string;
}): VenueDaySeriesEntry[] {
  const weatherSlices = normalizeWeatherSnapshotSlices(input.weatherSlices);
  const weatherByMinutes = new Map<number, WeatherSnapshotSlice>();
  for (const slice of weatherSlices) {
    if (typeof slice.minutes === 'number' && weatherByMinutes.get(slice.minutes)?.weatherUnknown !== true) {
      weatherByMinutes.set(slice.minutes, slice);
    }
  }

  return input.geometrySeries.map((entry) => {
    // Persisted/public reads always carry the Stockholm date, so even an exact
    // minute key must prove a valid provider timestamp within the 90-minute
    // boundary. Minute-only matching remains solely for isolated pure fixtures.
    const matchedWeather = input.stockholmDate
      ? nearestSnapshotSliceForGeometryStep(
          weatherSlices,
          input.stockholmDate,
          entry.minutes,
        )
      : weatherByMinutes.get(entry.minutes);
    const weather: WeatherSnapshotSlice = isUsableSnapshotWeather(matchedWeather)
      ? matchedWeather
      : { weatherUnknown: true };
    const isSunVisible = isSunVisibleAtStep(input.venue, input.stockholmDate, entry.minutes);
    const geometricStatus = isSunVisible
      ? classifySunStatus(entry.sunExposurePercent)
      : 'NoSun';
    const directSun = classifyDirectSun({
      geometryPotentialPercent: entry.sunExposurePercent,
      isSunVisible,
      weather,
    });
    const currentSunStatus = sunStatusForDirectSun(geometricStatus, directSun);
    const skyCondition = skyConditionForDirectSun(weather, directSun);
    return {
      minutes: entry.minutes,
      sunExposurePercent: entry.sunExposurePercent,
      currentSunStatus,
      weatherGateState: weatherGateStateForDirectSun(directSun),
      directSunState: directSun.state,
      directSunReasons: directSun.reasons,
      skyCondition,
    };
  });
}

/**
 * Report weather-backed freshness only when the requested step can consume a
 * timestamped slice with real forecast evidence. A nominally `ready` row with
 * an empty/malformed body must not receive full weather confidence.
 */
export function hasUsableWeatherSnapshotEvidenceForStep(input: {
  requestedAt: Date;
  slices: WeatherSnapshotSlice[];
  maxStalenessMinutes?: number;
}): boolean {
  const slice = selectSnapshotSliceForStep(input);
  if (slice.weatherUnknown === true) return false;
  return SNAPSHOT_PERCENT_FIELDS.some((field) => slice[field] !== undefined) ||
    slice.precipitationAmount !== undefined ||
    slice.symbolCode !== undefined ||
    (slice.nowcastValidAt !== undefined && slice.nowcastPrecipitationRate !== undefined);
}

function nearestSnapshotSliceForGeometryStep(
  slices: WeatherSnapshotSlice[],
  stockholmDate: string | undefined,
  minutes: number,
): WeatherSnapshotSlice | undefined {
  if (!stockholmDate) return undefined;
  const slice = selectSnapshotSliceForStep({
    requestedAt: stepInstantFor(stockholmDate, minutes),
    slices,
    maxStalenessMinutes: 90,
  });
  return slice.weatherUnknown ? undefined : { ...slice, minutes };
}

function isUsableSnapshotWeather(
  weather: WeatherSnapshotSlice | undefined,
): weather is WeatherSnapshotSlice {
  if (!weather || weather.weatherUnknown === true) return false;
  return true;
}

function normalizeWeatherSnapshotSlice(
  candidate: unknown,
  requireValidAt: boolean,
): WeatherSnapshotSlice | undefined {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return undefined;
  const raw = candidate as Record<string, unknown>;

  const minutes = finiteIntegerInRange(raw.minutes, 0, 24 * 60 - 1);
  const validAt = normalizedInstant(raw.validAt);
  if (requireValidAt && !validAt) return undefined;
  if (minutes === undefined && !validAt) return undefined;

  const slice: WeatherSnapshotSlice = {};
  if (minutes !== undefined) slice.minutes = minutes;
  if (validAt) slice.validAt = validAt;
  if (['weatherUnknown', 'isRaining'].some((field) =>
    Object.hasOwn(raw, field) && typeof raw[field] !== 'boolean',
  )) {
    // Keep the identity so nearest-time matching cannot replace malformed
    // current evidence with a neighbouring clear forecast.
    return { ...slice, weatherUnknown: true };
  }
  for (const field of SNAPSHOT_PERCENT_FIELDS) {
    const value = finiteNumberInRange(raw[field], 0, 100);
    if (value !== undefined) slice[field] = value;
  }
  const precipitationAmount = finiteNumberInRange(
    raw.precipitationAmount,
    0,
    Number.POSITIVE_INFINITY,
  );
  if (precipitationAmount !== undefined) slice.precipitationAmount = precipitationAmount;
  if (typeof raw.symbolCode === 'string' && raw.symbolCode.trim()) {
    slice.symbolCode = raw.symbolCode.trim();
  }
  const nowcastValidAt = normalizedInstant(raw.nowcastValidAt);
  const nowcastPrecipitationRate = finiteNumberInRange(
    raw.nowcastPrecipitationRate,
    0,
    Number.POSITIVE_INFINITY,
  );
  if (nowcastValidAt && nowcastPrecipitationRate !== undefined) {
    slice.nowcastValidAt = nowcastValidAt;
    slice.nowcastPrecipitationRate = nowcastPrecipitationRate;
    slice.isRaining = nowcastPrecipitationRate > 0;
  } else if (typeof raw.isRaining === 'boolean') {
    // Backward-compatible for still-unexpired pre-hardening snapshots. A false
    // flag remains non-affirmative in the classifier.
    slice.isRaining = raw.isRaining;
  }
  if (typeof raw.weatherUnknown === 'boolean') slice.weatherUnknown = raw.weatherUnknown;
  return slice;
}

function normalizedInstant(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const instantMs = new Date(value).getTime();
  return Number.isFinite(instantMs) ? new Date(instantMs).toISOString() : undefined;
}

function finiteNumberInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : undefined;
}

function finiteIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): number | undefined {
  const normalized = finiteNumberInRange(value, minimum, maximum);
  return normalized !== undefined && Number.isInteger(normalized) ? normalized : undefined;
}

function isSunVisibleAtStep(
  venue: WeatherSnapshotVenue | undefined,
  stockholmDate: string | undefined,
  minutes: number,
): boolean {
  if (!venue || !stockholmDate) return true;
  const coordinate = venueEngineCoordinate(venue);
  return calculateSolarPosition(
    stepInstantFor(stockholmDate, minutes),
    coordinate.lat,
    coordinate.lng,
  ).isSunVisible;
}

function stepInstantFor(stockholmDate: string, minutes: number): Date {
  const hh = Math.floor(minutes / 60).toString().padStart(2, '0');
  const mm = (minutes % 60).toString().padStart(2, '0');
  return fromZonedTime(`${stockholmDate}T${hh}:${mm}:00`, STOCKHOLM_TIME_ZONE);
}

type PersistedWeatherSnapshotRow = {
  coordinate_bucket?: unknown;
  stockholm_date?: unknown;
  bucket_key?: unknown;
  slices?: unknown;
  weather_updated_at?: unknown;
  expires_at?: unknown;
};

function coordinateBucketForVenue(venue: WeatherSnapshotVenue): string {
  const coordinate = venueEngineCoordinate(venue);
  return `${coordinate.lat.toFixed(4)},${coordinate.lng.toFixed(4)}`;
}

function weatherSnapshotRecordFromRow(
  row: PersistedWeatherSnapshotRow,
  includeDiagnostics = false,
): WeatherSnapshotRecord {
  const expiresAt = typeof row.expires_at === 'string' ? new Date(row.expires_at) : null;
  const normalizedExpiresAt = expiresAt && !Number.isNaN(expiresAt.getTime())
    ? expiresAt.toISOString()
    : undefined;
  const normalized = normalizeWeatherSnapshotSlicesWithDiagnostics(row.slices, {
    requireValidAt: true,
  });
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    return {
      status: 'expired',
      bucket: typeof row.bucket_key === 'string' ? row.bucket_key : undefined,
      weatherUpdatedAt: normalizedInstant(row.weather_updated_at),
      ...(includeDiagnostics && normalizedExpiresAt ? { expiresAt: normalizedExpiresAt } : {}),
      slices: includeDiagnostics ? normalized.slices : [],
      ...(includeDiagnostics && normalized.issues.length > 0
        ? { normalizationIssues: normalized.issues }
        : {}),
    };
  }
  return {
    status: 'ready',
    bucket: typeof row.bucket_key === 'string' ? row.bucket_key : undefined,
    weatherUpdatedAt: normalizedInstant(row.weather_updated_at),
    ...(includeDiagnostics ? { expiresAt: normalizedExpiresAt } : {}),
    slices: normalized.slices,
    ...(includeDiagnostics && normalized.issues.length > 0
      ? { normalizationIssues: normalized.issues }
      : {}),
  };
}

/**
 * Preload the server-owned current snapshots for a list request in one query.
 * Coordinate buckets are deduplicated, while the returned repository still
 * gates each venue independently through `buildPersistedSunOutcome`.
 */
export async function prepareWeatherSnapshotRepositoryForVenueDays(
  venues: readonly WeatherSnapshotVenue[],
  stockholmDate: string,
  options: { includeDiagnostics?: boolean } = {},
): Promise<WeatherSnapshotRepository> {
  const coordinateBuckets = [
    ...new Set(venues.map((venue) => coordinateBucketForVenue(venue))),
  ];
  const requestedBuckets = new Set(coordinateBuckets);
  const snapshotsByCoordinateBucket = new Map<string, PersistedWeatherSnapshotRow>();

  if (coordinateBuckets.length > 0) {
    const { getSupabaseServiceRole } = await import('@/lib/supabase/server');
    const { data, error } = await getSupabaseServiceRole()
      .from('weather_bucket_snapshots')
      .select('coordinate_bucket, bucket_key, stockholm_date, slices, weather_updated_at, expires_at')
      .in('coordinate_bucket', coordinateBuckets)
      .eq('stockholm_date', stockholmDate)
      .eq('bucket_key', 'current');
    if (error) throw new Error(`Weather snapshot batch read failed: ${error.message}`);

    for (const value of Array.isArray(data) ? data : []) {
      if (!value || typeof value !== 'object') continue;
      const row = value as PersistedWeatherSnapshotRow;
      const coordinateBucket = typeof row.coordinate_bucket === 'string'
        ? row.coordinate_bucket
        : null;
      if (
        !coordinateBucket ||
        !requestedBuckets.has(coordinateBucket) ||
        row.stockholm_date !== stockholmDate ||
        row.bucket_key !== 'current'
      ) {
        continue;
      }
      snapshotsByCoordinateBucket.set(coordinateBucket, row);
    }
  }

  return {
    async readSnapshotForVenueDay(venue, _bucket, requestedStockholmDate) {
      if (requestedStockholmDate !== stockholmDate) return null;
      const row = snapshotsByCoordinateBucket.get(coordinateBucketForVenue(venue));
      return row
        ? weatherSnapshotRecordFromRow(row, options.includeDiagnostics === true)
        : null;
    },
  };
}

const defaultWeatherSnapshotRepository: WeatherSnapshotRepository = {
  async readSnapshotForVenueDay(venue, _bucket, stockholmDate) {
    const { getSupabaseServiceRole } = await import('@/lib/supabase/server');
    const coordinateBucket = coordinateBucketForVenue(venue);
    const { data, error } = await getSupabaseServiceRole()
      .from('weather_bucket_snapshots')
      .select('bucket_key, stockholm_date, slices, weather_updated_at, expires_at')
      .eq('coordinate_bucket', coordinateBucket)
      .eq('stockholm_date', stockholmDate)
      .eq('bucket_key', 'current')
      .maybeSingle();
    if (error) throw new Error(`Weather snapshot read failed: ${error.message}`);
    if (!data) return null;
    return weatherSnapshotRecordFromRow(data);
  },
};
