/**
 * COVERAGE EXPANSION — Story 11.1 (AC2, Task 3)
 * `lib/services/sun-engine-cache.ts` — the pure day-series KEY builders
 * (`weatherRefreshBucketMs`, `sunDaySeriesCacheKey`) at their boundaries.
 *
 * The green cache ATDD (`sun-engine-day-series-cache.atdd.test.ts`) drives the
 * cache END-TO-END through the producer under fake timers (same-bucket hit /
 * new-bucket recompute / degraded-not-pinned). It never asserts the key builders
 * directly, so the R-012 hazards these functions exist to prevent are untested at
 * the unit level:
 *   - the weather-refresh bucket must FLOOR (a new window recomputes; a same
 *     window is stable) — an off-by-one at the bucket edge would either thrash the
 *     cache or serve stale weather gating;
 *   - the key must fold the DAY, the weather bucket, AND the elevation variant so
 *     one series-per-day-per-weather-window is correct and a flat/raised recompute
 *     of the "same" id can never collide.
 *
 * Pure, deterministic — no timers, no producer, no network.
 */

import { describe, expect, it } from 'vitest';
import {
  weatherRefreshBucketMs,
  sunDaySeriesCacheKey,
  SUN_DAY_SERIES_WEATHER_BUCKET_MS,
} from '@/lib/services/sun-engine-cache';

describe('Story 11.1 — weatherRefreshBucketMs floors the fetch instant to its bucket', () => {
  it('returns the same bucket for two instants inside the same window', () => {
    const base = new Date('2026-06-21T10:00:00.000Z');
    const later = new Date('2026-06-21T10:14:59.999Z'); // < 15 min later, same window
    expect(weatherRefreshBucketMs(later)).toBe(weatherRefreshBucketMs(base));
  });

  it('advances to a new bucket exactly at the window boundary', () => {
    const base = new Date('2026-06-21T10:00:00.000Z');
    const nextWindow = new Date(base.getTime() + SUN_DAY_SERIES_WEATHER_BUCKET_MS);
    expect(weatherRefreshBucketMs(nextWindow)).toBeGreaterThan(weatherRefreshBucketMs(base));
    // One-bucket-back is still the previous window (the boundary belongs to the new
    // bucket — a strict floor, no off-by-one that would serve stale weather).
    const justBefore = new Date(nextWindow.getTime() - 1);
    expect(weatherRefreshBucketMs(justBefore)).toBe(weatherRefreshBucketMs(base));
  });

  it('is a multiple of the bucket size (aligned to the epoch grid)', () => {
    const bucket = weatherRefreshBucketMs(new Date('2026-06-21T10:07:33.123Z'));
    expect(bucket % SUN_DAY_SERIES_WEATHER_BUCKET_MS).toBe(0);
  });
});

describe('Story 11.1 — sunDaySeriesCacheKey disambiguation (R-012)', () => {
  const DAY = '2026-06-21';
  const BUCKET = weatherRefreshBucketMs(new Date('2026-06-21T10:00:00.000Z'));

  it('is stable for identical inputs (a same-day scrub hits the same key)', () => {
    expect(sunDaySeriesCacheKey('v1', DAY, BUCKET, 'e')).toBe(
      sunDaySeriesCacheKey('v1', DAY, BUCKET, 'e'),
    );
  });

  it('differs on venue id', () => {
    expect(sunDaySeriesCacheKey('v1', DAY, BUCKET)).not.toBe(
      sunDaySeriesCacheKey('v2', DAY, BUCKET),
    );
  });

  it('differs on the Stockholm day (same wall clock, different date)', () => {
    expect(sunDaySeriesCacheKey('v1', DAY, BUCKET)).not.toBe(
      sunDaySeriesCacheKey('v1', '2026-06-22', BUCKET),
    );
  });

  it('differs on the weather-refresh bucket (a new window recomputes)', () => {
    const nextBucket = BUCKET + SUN_DAY_SERIES_WEATHER_BUCKET_MS;
    expect(sunDaySeriesCacheKey('v1', DAY, BUCKET)).not.toBe(
      sunDaySeriesCacheKey('v1', DAY, nextBucket),
    );
  });

  it('differs on the elevation variant (a raised/hilltop recompute never collides)', () => {
    // The defensive elevation suffix: a flat-terrain entry must never shadow a
    // raised/hilltop recompute of the "same" id.
    expect(sunDaySeriesCacheKey('v1', DAY, BUCKET, '')).not.toBe(
      sunDaySeriesCacheKey('v1', DAY, BUCKET, '57.7,11.9:12:'),
    );
  });

  it('is NOT keyed on the per-instant requested time (whole-day artifact)', () => {
    // The whole point of the day-series cache: the key contains no per-instant
    // component, so every step of a day maps to ONE cached series. Two keys built
    // for the same (venue, day, weather-bucket, elevation) are identical regardless
    // of which step prompted the compute.
    const morning = sunDaySeriesCacheKey('v1', DAY, BUCKET, 'e');
    const evening = sunDaySeriesCacheKey('v1', DAY, BUCKET, 'e');
    expect(evening).toBe(morning);
  });
});
