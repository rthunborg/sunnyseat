import {
  addDaysToDateKey,
  PLANNER_MAX_FUTURE_DAYS,
  STOCKHOLM_TIME_ZONE,
  stockholmDateKey,
} from '@/lib/utils/time-planner';
import { fromZonedTime } from 'date-fns-tz';
import type { VenueDaySeriesEntry, VenueSunStatus, WeatherGateState } from '@/lib/types/api';
import { applyCloudGate, classifySunStatus, CLOUD_GATE_THRESHOLD_PERCENT } from '@/lib/services/sun-engine';
import { venueEngineCoordinate } from '@/lib/services/sun-geometry-coordinates';
import { calculateSolarPosition } from '@/lib/solar/solar-calculation-service';

export type WeatherSnapshotSlice = {
  minutes?: number;
  validAt?: string;
  cloudCover?: number;
  cloudCoverLow?: number;
  cloudCoverMedium?: number;
  cloudCoverHigh?: number;
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
  forecastSlices?: Array<{ validAt: string; cloudCover?: number }>;
  nowcastRateByValidAt?: Record<string, number | undefined>;
}): Promise<{ venueId?: string; slices: WeatherSnapshotSlice[] }> {
  const now = input.now ?? new Date();
  const horizonMs = 90 * 60 * 1000;
  const slices = (input.forecastSlices ?? []).map((slice) => {
    const validAtMs = new Date(slice.validAt).getTime();
    const isNearNow = validAtMs >= now.getTime() && validAtMs <= now.getTime() + horizonMs;
    const rate = isNearNow ? input.nowcastRateByValidAt?.[slice.validAt] : undefined;
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
  const maxStalenessMs = (input.maxStalenessMinutes ?? 90) * 60 * 1000;
  let best: WeatherSnapshotSlice | undefined;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const slice of slices) {
    if (!slice.validAt) continue;
    const delta = Math.abs(new Date(slice.validAt).getTime() - requestedAt.getTime());
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
    const weather = weatherByMinutes.get(entry.minutes) ?? { weatherUnknown: true };
    const isSunVisible = isSunVisibleAtStep(input.venue, input.stockholmDate, entry.minutes);
    const geometricStatus = isSunVisible
      ? classifySunStatus(entry.sunExposurePercent)
      : 'NoSun';
    const isRaining = weather.isRaining === true;
    const cloudCover = weather.weatherUnknown ? undefined : effectiveSnapshotCloudCover(weather);
    const currentSunStatus = applyCloudGate(geometricStatus, isSunVisible, cloudCover, isRaining);
    const skyCondition = weather.weatherUnknown
      ? 'unavailable'
      : isRaining
        ? 'rain'
        : skyConditionFromSnapshotCloudCover(weather.cloudCover);
    return {
      minutes: entry.minutes,
      sunExposurePercent: entry.sunExposurePercent,
      currentSunStatus,
      weatherGateState: weatherGateStateFromSnapshot(weather, currentSunStatus),
      skyCondition,
    };
  });
}

function weatherGateStateFromSnapshot(
  weather: WeatherSnapshotSlice,
  currentSunStatus: VenueSunStatus,
): WeatherGateState {
  if (weather.weatherUnknown) return 'unknown';
  return currentSunStatus === 'CloudObscured' ? 'gated' : 'not_gated';
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

function effectiveSnapshotCloudCover(slice: WeatherSnapshotSlice): number | undefined {
  const low = slice.cloudCoverLow;
  const medium = slice.cloudCoverMedium;
  const high = slice.cloudCoverHigh;
  if ([low, medium, high].every((value) => typeof value === 'number' && Number.isFinite(value))) {
    return Math.max(low as number, (medium as number) * 0.7, (high as number) * 0.35);
  }
  return typeof slice.cloudCover === 'number' && Number.isFinite(slice.cloudCover)
    ? slice.cloudCover
    : undefined;
}

function skyConditionFromSnapshotCloudCover(cloudCover: number | undefined): string {
  if (cloudCover === undefined) return 'unavailable';
  if (cloudCover >= CLOUD_GATE_THRESHOLD_PERCENT) return 'overcast';
  if (cloudCover >= 30) return 'partly-cloudy';
  return 'clear';
}

const defaultWeatherSnapshotRepository: WeatherSnapshotRepository = {
  async readSnapshotForVenueDay(venue, bucket, stockholmDate) {
    const { getSupabaseServiceRole } = await import('@/lib/supabase/server');
    const coordinate = venueEngineCoordinate(venue);
    const coordinateBucket = `${coordinate.lat.toFixed(4)},${coordinate.lng.toFixed(4)}`;
    const { data, error } = await getSupabaseServiceRole()
      .from('weather_bucket_snapshots')
      .select('bucket_key, stockholm_date, slices, weather_updated_at, expires_at')
      .eq('coordinate_bucket', coordinateBucket)
      .eq('stockholm_date', stockholmDate)
      .eq('bucket_key', bucket ?? 'current')
      .maybeSingle();
    if (error) throw new Error(`Weather snapshot read failed: ${error.message}`);
    if (!data) return null;
    const expiresAt = typeof data.expires_at === 'string' ? new Date(data.expires_at) : null;
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      return {
        status: 'expired',
        bucket: data.bucket_key,
        weatherUpdatedAt: data.weather_updated_at ?? undefined,
        slices: [],
      };
    }
    return {
      status: 'ready',
      bucket: data.bucket_key,
      weatherUpdatedAt: data.weather_updated_at ?? undefined,
      slices: Array.isArray(data.slices) ? data.slices : [],
    };
  },
};
