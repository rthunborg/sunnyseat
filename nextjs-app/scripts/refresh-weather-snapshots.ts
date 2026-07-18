import { appendFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import {
  buildWeatherSnapshotWindow,
  type WeatherSnapshotSlice,
} from '../lib/services/weather-snapshots';
import { collectSunGeometryPrecomputeTargets } from '../lib/services/sun-geometry-precompute';
import { mapWithConcurrency } from '../lib/services/sun-engine';
import { stockholmDateKey } from '../lib/utils/time-planner';
import { getForecast } from '../lib/weather/met-no-service';
import { getNowcastPrecipitationRate } from '../lib/weather/nowcast-service';
import type { WeatherSlice } from '../lib/solar/types';
import type { Database } from '../lib/supabase/types';

const enabled = process.env.SUN_WEATHER_REFRESH_ENABLED === 'true';
const now = new Date();
const PROVIDER_CONCURRENCY = 4;
const PROVIDER_TIMEOUT_MS = 2_000;
const MAX_RETRIES = 2;
process.env.NEXT_PUBLIC_SUPABASE_URL ??= process.env.SUPABASE_URL;

if (!enabled) {
  await writeSummary([
    '## SunnySeat weather snapshot refresh',
    '',
    '- Status: disabled by SUN_WEATHER_REFRESH_ENABLED',
  ]);
  console.log('Weather snapshot refresh disabled');
  process.exit(0);
}

const runId = [
  'weather-snapshots',
  process.env.GITHUB_RUN_ID ?? randomUUID(),
  process.env.GITHUB_RUN_ATTEMPT ?? '1',
].join('-');

const supabase = createClient<Database>(
  requiredEnv('SUPABASE_URL'),
  requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const window = buildWeatherSnapshotWindow(now);
const targets = await collectSunGeometryPrecomputeTargets({ includeHidden: true });
const buckets = new Map<string, { lat: number; lng: number; venueCount: number }>();
for (const target of targets) {
  if (!target.venue) continue;
  const key = coordinateBucket(target.venue.location);
  const existing = buckets.get(key);
  if (existing) {
    existing.venueCount += 1;
  } else {
    buckets.set(key, { ...target.venue.location, venueCount: 1 });
  }
}

let writtenBuckets = 0;
let failedBuckets = 0;
await mapWithConcurrency([...buckets.entries()], PROVIDER_CONCURRENCY, async ([bucketKey, bucket]) => {
  try {
    const forecast = await retryWithJitter(() =>
      withTimeout(getForecast(bucket.lat, bucket.lng), PROVIDER_TIMEOUT_MS, 'locationforecast timeout'),
    );
    const nowcastRate = await retryWithJitter(() =>
      withTimeout(getNowcastPrecipitationRate(bucket.lat, bucket.lng), PROVIDER_TIMEOUT_MS, 'nowcast timeout'),
    );
    const rows = buildSnapshotRows({
      bucketKey,
      forecast,
      nowcastRate,
      window,
      now,
      runId,
    });
    if (rows.length > 0) {
      const { error } = await supabase
        .from('weather_bucket_snapshots' as never)
        .upsert(rows as never, { onConflict: 'coordinate_bucket,stockholm_date,bucket_key' });
      if (error) throw new Error(error.message);
    }
    writtenBuckets += 1;
  } catch (error) {
    failedBuckets += 1;
    console.error(
      `Weather snapshot refresh failed for bucket ${bucketKey}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
});

const status = failedBuckets === 0 ? 'completed' : 'failed';

await writeSummary([
  '## SunnySeat weather snapshot refresh',
  '',
  `- Status: ${status}`,
  `- Run ID: ${runId}`,
  `- Window: ${window[0]} through ${window.at(-1)}`,
  `- Coordinate buckets: ${buckets.size}`,
  `- Buckets written: ${writtenBuckets}`,
  `- Buckets failed: ${failedBuckets}`,
]);

if (failedBuckets > 0) {
  process.exitCode = 1;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function writeSummary(lines: string[]): Promise<void> {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  await appendFile(summaryPath, `${lines.join('\n')}\n`);
}

function coordinateBucket(location: { lat: number; lng: number }): string {
  return `${location.lat.toFixed(4)},${location.lng.toFixed(4)}`;
}

function buildSnapshotRows(input: {
  bucketKey: string;
  forecast: WeatherSlice[];
  nowcastRate: number | undefined;
  window: string[];
  now: Date;
  runId: string;
}): Array<{
  coordinate_bucket: string;
  stockholm_date: string;
  bucket_key: string;
  slices: WeatherSnapshotSlice[];
  weather_updated_at: string;
  expires_at: string;
  refreshed_at: string;
  run_id: string;
}> {
  const refreshedAt = input.now.toISOString();
  const expiresAt = new Date(input.now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  return input.window.map((stockholmDate) => ({
    coordinate_bucket: input.bucketKey,
    stockholm_date: stockholmDate,
    bucket_key: 'current',
    slices: input.forecast
      .filter((slice) => slice.validAt && stockholmDateKey(slice.validAt) === stockholmDate)
      .map((slice) => snapshotSlice(slice, input.nowcastRate, input.now)),
    weather_updated_at: refreshedAt,
    expires_at: expiresAt,
    refreshed_at: refreshedAt,
    run_id: input.runId,
  }));
}

function snapshotSlice(
  slice: WeatherSlice,
  nowcastRate: number | undefined,
  now: Date,
): WeatherSnapshotSlice {
  const validAt = slice.validAt ?? slice.createdAt;
  const validAtMs = validAt.getTime();
  const nearNow =
    validAtMs >= now.getTime() &&
    validAtMs <= now.getTime() + 90 * 60 * 1000;
  return {
    minutes: stockholmMinutes(validAt),
    validAt: validAt.toISOString(),
    cloudCover: slice.cloudCover,
    cloudCoverLow: slice.cloudCoverLow,
    cloudCoverMedium: slice.cloudCoverMedium,
    cloudCoverHigh: slice.cloudCoverHigh,
    ...(nearNow && nowcastRate !== undefined ? { isRaining: nowcastRate > 0 } : {}),
  };
}

function stockholmMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

async function retryWithJitter<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 100 + Math.floor(Math.random() * 150)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
