import type { SunDataSource, SunFreshnessMeta } from '@/lib/types/api';

export const WEATHER_UPDATED_AT_HEADER = 'X-Weather-Updated-At';
export const SUN_DATA_SOURCE_HEADER = 'X-Sun-Data-Source';

export const SUN_DATA_SOURCE_WEATHER: SunDataSource = 'weather';
export const SUN_DATA_SOURCE_GEOMETRY_ONLY: SunDataSource = 'geometry-only';

export function readSunFreshnessHeaders(
  headers: Pick<Headers, 'get'>,
): SunFreshnessMeta {
  const source = normalizeSunDataSource(headers.get(SUN_DATA_SOURCE_HEADER));
  const weatherUpdatedAt = normalizeIsoTimestamp(
    headers.get(WEATHER_UPDATED_AT_HEADER),
  );

  return {
    ...(weatherUpdatedAt ? { weatherUpdatedAt } : {}),
    ...(source ? { sunDataSource: source } : {}),
  };
}

export function sunFreshnessHeaders(meta: SunFreshnessMeta): Record<string, string> {
  return {
    ...(meta.weatherUpdatedAt
      ? { [WEATHER_UPDATED_AT_HEADER]: meta.weatherUpdatedAt }
      : {}),
    ...(meta.sunDataSource ? { [SUN_DATA_SOURCE_HEADER]: meta.sunDataSource } : {}),
  };
}

export function normalizeSunDataSource(
  value: string | null | undefined,
): SunDataSource | undefined {
  if (value === SUN_DATA_SOURCE_WEATHER) return SUN_DATA_SOURCE_WEATHER;
  if (value === SUN_DATA_SOURCE_GEOMETRY_ONLY) return SUN_DATA_SOURCE_GEOMETRY_ONLY;
  return undefined;
}

function normalizeIsoTimestamp(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) return undefined;
  return new Date(parsed).toISOString();
}
