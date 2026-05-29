import type { SunFreshnessMeta, VenueDataDto } from '@/lib/types/api';
import {
  SUN_DATA_SOURCE_GEOMETRY_ONLY,
  SUN_DATA_SOURCE_WEATHER,
} from '@/lib/utils/sun-freshness';

const WEATHER_OVERRIDE_PARAM = '_weather';
const STALE_WEATHER_AGE_MS = 3 * 60 * 60 * 1000;
const WEATHER_TIMESTAMP_BUCKET_MS = 5 * 60 * 1000;

export function resolveFixtureSunFreshness(
  params: URLSearchParams,
  now = new Date(),
): SunFreshnessMeta {
  const override = process.env.NODE_ENV === 'production'
    ? null
    : params.get(WEATHER_OVERRIDE_PARAM);

  if (override === 'unavailable') {
    return { sunDataSource: SUN_DATA_SOURCE_GEOMETRY_ONLY };
  }

  const updatedAt = override === 'stale'
    ? new Date(now.getTime() - STALE_WEATHER_AGE_MS)
    : bucketTimestamp(now);

  return {
    sunDataSource: SUN_DATA_SOURCE_WEATHER,
    weatherUpdatedAt: updatedAt.toISOString(),
  };
}

export function applyFixtureWeatherAvailability(
  venue: VenueDataDto,
  freshness: SunFreshnessMeta,
): VenueDataDto {
  if (freshness.sunDataSource !== SUN_DATA_SOURCE_GEOMETRY_ONLY) return venue;
  return {
    ...venue,
    skyCondition: 'unavailable',
  };
}

function bucketTimestamp(now: Date): Date {
  return new Date(
    Math.floor(now.getTime() / WEATHER_TIMESTAMP_BUCKET_MS) *
      WEATHER_TIMESTAMP_BUCKET_MS,
  );
}
