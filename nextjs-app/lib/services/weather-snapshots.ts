import {
  addDaysToDateKey,
  PLANNER_MAX_FUTURE_DAYS,
  stockholmDateKey,
} from '@/lib/utils/time-planner';
import type { VenueDaySeriesEntry, VenueSunStatus } from '@/lib/types/api';
import { applyCloudGate, classifySunStatus, CLOUD_GATE_THRESHOLD_PERCENT } from '@/lib/services/sun-engine';

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
    venue: { id: string; location: { lat: number; lng: number } },
    bucket: string | undefined,
    stockholmDate: string,
  ): Promise<WeatherSnapshotRecord | null>;
}

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
}): VenueDaySeriesEntry[] {
  const weatherByMinutes = new Map<number, WeatherSnapshotSlice>();
  for (const slice of input.weatherSlices ?? []) {
    if (typeof slice.minutes === 'number') weatherByMinutes.set(slice.minutes, slice);
  }

  return input.geometrySeries.map((entry) => {
    const weather = weatherByMinutes.get(entry.minutes) ?? { weatherUnknown: true };
    const geometricStatus = classifySunStatus(entry.sunExposurePercent);
    const isRaining = weather.isRaining === true;
    const cloudCover = weather.weatherUnknown ? undefined : effectiveSnapshotCloudCover(weather);
    const currentSunStatus = applyCloudGate(geometricStatus, true, cloudCover, isRaining);
    const skyCondition = weather.weatherUnknown
      ? 'unavailable'
      : isRaining
        ? 'rain'
        : skyConditionFromSnapshotCloudCover(weather.cloudCover);
    return {
      minutes: entry.minutes,
      sunExposurePercent: entry.sunExposurePercent,
      currentSunStatus,
      skyCondition,
    };
  });
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
    const coordinateBucket = `${venue.location.lat.toFixed(4)},${venue.location.lng.toFixed(4)}`;
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
