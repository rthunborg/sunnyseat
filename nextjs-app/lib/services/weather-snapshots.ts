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
  isRaining?: boolean;
  weatherUnknown?: boolean;
};

export type WeatherSnapshotRecord = {
  status?: 'ready' | 'expired' | 'missing';
  bucket?: string;
  weatherUpdatedAt?: string;
  slices: WeatherSnapshotSlice[];
};

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
  nowcastRateByValidAt?: Record<string, number | undefined>;
}): Promise<{ venueId?: string; slices: WeatherSnapshotSlice[] }> {
  const now = input.now ?? new Date();
  const horizonMs = 90 * 60 * 1000;
  const slices = (input.forecastSlices ?? []).map((slice) => {
    const validAt = slice.validAt;
    const validAtMs = validAt ? new Date(validAt).getTime() : Number.NaN;
    const isNearNow = validAtMs >= now.getTime() && validAtMs <= now.getTime() + horizonMs;
    const rate = isNearNow && validAt ? input.nowcastRateByValidAt?.[validAt] : undefined;
    return {
      ...slice,
      isRaining: rate !== undefined ? rate > 0 : undefined,
    };
  });
  return { venueId: input.venueId, slices };
}

export function selectSnapshotSliceForStep(input: {
  requestedAt: Date;
  slices: WeatherSnapshotSlice[];
  maxStalenessMinutes?: number;
}): WeatherSnapshotSlice {
  const { requestedAt, slices } = input;
  const requestedAtMs = requestedAt.getTime();
  if (!Number.isFinite(requestedAtMs)) return { weatherUnknown: true };
  const maxStalenessMs = (input.maxStalenessMinutes ?? 90) * 60 * 1000;
  let best: WeatherSnapshotSlice | undefined;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const slice of slices) {
    if (!slice.validAt) continue;
    const validAtMs = new Date(slice.validAt).getTime();
    if (!Number.isFinite(validAtMs)) continue;
    const delta = Math.abs(validAtMs - requestedAtMs);
    if (delta < bestDelta) {
      best = slice;
      bestDelta = delta;
    }
  }
  if (!best || bestDelta > maxStalenessMs) {
    return { weatherUnknown: true };
  }
  return best;
}

export function gateGeometrySeriesWithWeatherSnapshots(input: {
  geometrySeries: Array<{ minutes: number; sunExposurePercent: number }>;
  weatherSlices?: WeatherSnapshotSlice[];
  venue?: WeatherSnapshotVenue;
  stockholmDate?: string;
}): VenueDaySeriesEntry[] {
  const weatherByMinutes = new Map<number, WeatherSnapshotSlice>();
  for (const slice of input.weatherSlices ?? []) {
    if (typeof slice.minutes === 'number') weatherByMinutes.set(slice.minutes, slice);
  }

  return input.geometrySeries.map((entry) => {
    // Persisted/public reads always carry the Stockholm date, so even an exact
    // minute key must prove a valid provider timestamp within the 90-minute
    // boundary. Minute-only matching remains solely for isolated pure fixtures.
    const matchedWeather = input.stockholmDate
      ? nearestSnapshotSliceForGeometryStep(
          input.weatherSlices ?? [],
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

function weatherSnapshotRecordFromRow(row: PersistedWeatherSnapshotRow): WeatherSnapshotRecord {
  const expiresAt = typeof row.expires_at === 'string' ? new Date(row.expires_at) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    return {
      status: 'expired',
      bucket: typeof row.bucket_key === 'string' ? row.bucket_key : undefined,
      weatherUpdatedAt:
        typeof row.weather_updated_at === 'string' ? row.weather_updated_at : undefined,
      slices: [],
    };
  }
  return {
    status: 'ready',
    bucket: typeof row.bucket_key === 'string' ? row.bucket_key : undefined,
    weatherUpdatedAt:
      typeof row.weather_updated_at === 'string' ? row.weather_updated_at : undefined,
    slices: Array.isArray(row.slices) ? row.slices : [],
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
      return row ? weatherSnapshotRecordFromRow(row) : null;
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
