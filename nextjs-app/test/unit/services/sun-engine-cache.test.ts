/**
 * Story 9.3 — UNIT coverage for the process-scoped TTL caches and key builders in
 * `lib/services/sun-engine-cache.ts`.
 *
 * The engine-level ATDD suite (`sun-engine-caching.atdd.test.ts`) already proves
 * the integrated call-count behaviour (2->1 dedupe, co-located collapse, same/new
 * bucket). This file fills the GENUINE unit-level gaps the integration tests do
 * not reach:
 *   - TTL expiry / eviction at the boundary instant (deterministic injectable `now`,
 *     NO wall-clock — the project lesson forbids latency/wall-clock asserts);
 *   - cache-KEY collisions vs near-but-distinct co-located venues (the ATDD only
 *     asserts the positive collapse, never that distinct venues stay distinct);
 *   - concurrent / repeated-request in-flight reuse (one shared promise per key);
 *   - success-ONLY caching — a `null` (RPC failure) and a `cacheable:false`
 *     (degraded) producer result must NOT be pinned for the window.
 *
 * Every assertion is deterministic (call-counts, cache keys, injected `now`).
 */

import { describe, expect, it, vi } from 'vitest';
import {
  BUILDINGS_CACHE_TTL_MS,
  SUN_COMPUTE_CACHE_TTL_MS,
  TtlCache,
  buildingsCacheKey,
  getOrCompute,
  getOrComputeConditional,
  getOrFetchNonNull,
  roundCentroidComponent,
  sunComputeCacheKey,
  timeBucketMs,
} from '@/lib/services/sun-engine-cache';

// ===========================================================================
// TtlCache — TTL expiry / eviction with an injected, deterministic clock
// ===========================================================================
describe('TtlCache — TTL expiry & eviction (injected clock, no wall-clock)', () => {
  it('returns a value before the TTL elapses and undefined after', () => {
    const cache = new TtlCache<number>(1000);
    cache.set('k', 42, 0);

    expect(cache.get('k', 0)).toBe(42);
    expect(cache.get('k', 999)).toBe(42); // still inside the window
  });

  it('expires AT the boundary instant (expiresAt <= now is expired)', () => {
    const cache = new TtlCache<number>(1000);
    cache.set('k', 42, 0); // expiresAt = 1000

    // The entry expires when now reaches expiresAt (<=), not strictly after.
    expect(cache.get('k', 1000)).toBeUndefined();
    expect(cache.has('k', 1000)).toBe(false);
  });

  it('hard-evicts an expired entry on read (lazy eviction, no leak)', () => {
    const cache = new TtlCache<number>(1000);
    cache.set('k', 1, 0);
    expect(cache.get('k', 2000)).toBeUndefined(); // read past TTL evicts it

    // A subsequent set re-primes from the NEW now, not the stale expiresAt.
    cache.set('k', 2, 2000);
    expect(cache.get('k', 2500)).toBe(2);
    expect(cache.get('k', 3000)).toBeUndefined(); // 2000 + 1000 boundary
  });

  it('a fresh set after expiry restarts the TTL window from the new now', () => {
    const cache = new TtlCache<string>(100);
    cache.set('k', 'a', 0);
    expect(cache.get('k', 100)).toBeUndefined();
    cache.set('k', 'b', 100);
    expect(cache.get('k', 199)).toBe('b'); // window restarted at 100
  });

  it('clear() drops every entry', () => {
    const cache = new TtlCache<number>(1000);
    cache.set('a', 1, 0);
    cache.set('b', 2, 0);
    cache.clear();
    expect(cache.get('a', 0)).toBeUndefined();
    expect(cache.get('b', 0)).toBeUndefined();
  });

  it('honours the configured TTL constants (24h buildings, 15min sun-compute)', () => {
    const buildings = new TtlCache<number>(BUILDINGS_CACHE_TTL_MS);
    buildings.set('b', 1, 0);
    expect(buildings.get('b', BUILDINGS_CACHE_TTL_MS - 1)).toBe(1);
    expect(buildings.get('b', BUILDINGS_CACHE_TTL_MS)).toBeUndefined();

    const sun = new TtlCache<number>(SUN_COMPUTE_CACHE_TTL_MS);
    sun.set('s', 1, 0);
    expect(sun.get('s', SUN_COMPUTE_CACHE_TTL_MS - 1)).toBe(1);
    expect(sun.get('s', SUN_COMPUTE_CACHE_TTL_MS)).toBeUndefined();
  });
});

// ===========================================================================
// buildingsCacheKey — collisions vs near-but-distinct co-located venues
// ===========================================================================
describe('buildingsCacheKey — co-located collapse vs distinct separation', () => {
  it('collapses two venues whose centroids round to the same 4-dp key', () => {
    // ~11 m apart at the 5th decimal -> identical 4-dp key.
    const a = buildingsCacheKey(11.96391, 57.70531, 500);
    const b = buildingsCacheKey(11.96394, 57.70534, 500);
    expect(a).toBe(b);
  });

  it('keeps venues whose centroids differ at the 4th decimal DISTINCT', () => {
    // ~11 m+ apart at the 4th decimal -> different rounded key (no false collapse).
    const a = buildingsCacheKey(11.9639, 57.7053, 500);
    const b = buildingsCacheKey(11.964, 57.7054, 500);
    expect(a).not.toBe(b);
  });

  it('folds the radius into the key so a different radius does not collide', () => {
    const near = buildingsCacheKey(11.9639, 57.7053, 500);
    const far = buildingsCacheKey(11.9639, 57.7053, 900);
    expect(near).not.toBe(far);
    // Radius is rounded to whole metres, so sub-metre jitter stays one key.
    expect(buildingsCacheKey(11.9639, 57.7053, 500.4)).toBe(near);
  });

  it('round-trips lat,lng ordering in the key (lat first, then lng)', () => {
    expect(buildingsCacheKey(11.9639, 57.7053, 500)).toBe('57.7053,11.9639@500');
  });

  it('produces a stable sentinel for a non-finite centroid/radius', () => {
    expect(roundCentroidComponent(Number.NaN)).toBe('nan');
    expect(buildingsCacheKey(Number.NaN, Number.NaN, Number.NaN)).toBe('nan,nan@0');
  });
});

// ===========================================================================
// timeBucketMs / sunComputeCacheKey — 15-min bucketing + key disambiguation
// ===========================================================================
describe('sun-compute key — 15-min bucketing & disambiguation', () => {
  it('floors instants in the same 15-min window to one bucket', () => {
    const a = new Date('2026-06-21T10:30:00.000Z');
    const b = new Date('2026-06-21T10:37:30.000Z'); // same 12:30 bucket
    const c = new Date('2026-06-21T10:44:59.999Z'); // still same bucket
    expect(timeBucketMs(b)).toBe(timeBucketMs(a));
    expect(timeBucketMs(c)).toBe(timeBucketMs(a));
  });

  it('separates an instant that crosses into the next 15-min bucket', () => {
    const a = new Date('2026-06-21T10:44:59.999Z'); // 12:30 bucket
    const b = new Date('2026-06-21T10:45:00.000Z'); // 12:45 bucket
    expect(timeBucketMs(b)).not.toBe(timeBucketMs(a));
  });

  it('collides two requests in the same (venue, bucket, day, variant)', () => {
    const t1 = new Date('2026-06-21T10:30:00.000Z');
    const t2 = new Date('2026-06-21T10:37:00.000Z');
    expect(sunComputeCacheKey('v1', t1, '2026-06-21', 'geo')).toBe(
      sunComputeCacheKey('v1', t2, '2026-06-21', 'geo'),
    );
  });

  it('disambiguates by venue id, day, and variant key', () => {
    const t = new Date('2026-06-21T10:30:00.000Z');
    const base = sunComputeCacheKey('v1', t, '2026-06-21', 'geo');
    expect(sunComputeCacheKey('v2', t, '2026-06-21', 'geo')).not.toBe(base); // id
    expect(sunComputeCacheKey('v1', t, '2026-06-22', 'geo')).not.toBe(base); // day
    expect(sunComputeCacheKey('v1', t, '2026-06-21', 'roof')).not.toBe(base); // variant
  });

  it('keys the same wall clock on different days distinctly (day folds in)', () => {
    const t1 = new Date('2026-06-21T10:30:00.000Z');
    const t2 = new Date('2026-06-22T10:30:00.000Z'); // same clock, next day
    // The bucket ms differ by a day, AND the explicit day key differs.
    expect(sunComputeCacheKey('v1', t1, '2026-06-21')).not.toBe(
      sunComputeCacheKey('v1', t2, '2026-06-22'),
    );
  });
});

// ===========================================================================
// getOrFetchNonNull — success-only caching, in-flight reuse, eviction
// ===========================================================================
describe('getOrFetchNonNull — non-null caching, concurrency, TTL', () => {
  function freshCache() {
    return {
      cache: new TtlCache<number[]>(1000),
      inFlight: new Map<string, Promise<number[] | null>>(),
    };
  }

  it('caches a non-null result so the 2nd call does not re-produce', async () => {
    const { cache, inFlight } = freshCache();
    const produce = vi.fn().mockResolvedValue([1, 2, 3]);

    const first = await getOrFetchNonNull(cache, inFlight, 'k', produce, 0);
    const second = await getOrFetchNonNull(cache, inFlight, 'k', produce, 10);

    expect(first).toEqual([1, 2, 3]);
    expect(second).toBe(first); // same cached object
    expect(produce).toHaveBeenCalledTimes(1); // 2nd served from cache
  });

  it('NEVER caches a null (RPC failure) — the next call retries', async () => {
    const { cache, inFlight } = freshCache();
    const produce = vi
      .fn()
      .mockResolvedValueOnce(null) // RPC failed
      .mockResolvedValueOnce([7]); // recovers

    const failed = await getOrFetchNonNull(cache, inFlight, 'k', produce, 0);
    const retried = await getOrFetchNonNull(cache, inFlight, 'k', produce, 1);

    expect(failed).toBeNull();
    expect(retried).toEqual([7]); // retried, NOT pinned as a cached null
    expect(produce).toHaveBeenCalledTimes(2);
  });

  it('shares ONE in-flight promise for concurrent same-key calls', async () => {
    const { cache, inFlight } = freshCache();
    let resolveFn: (v: number[]) => void = () => {};
    const produce = vi.fn().mockImplementation(
      () => new Promise<number[]>((resolve) => (resolveFn = resolve)),
    );

    const p1 = getOrFetchNonNull(cache, inFlight, 'k', produce, 0);
    const p2 = getOrFetchNonNull(cache, inFlight, 'k', produce, 0);
    resolveFn([9]);
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(produce).toHaveBeenCalledTimes(1); // one shared RPC for the race
    expect(r1).toEqual([9]);
    expect(r2).toEqual([9]);
  });

  it('evicts a rejected in-flight promise so it does not poison the cache', async () => {
    const { cache, inFlight } = freshCache();
    const produce = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([5]);

    await expect(getOrFetchNonNull(cache, inFlight, 'k', produce, 0)).rejects.toThrow('boom');
    // The rejection was evicted from inFlight; a retry produces afresh.
    await expect(getOrFetchNonNull(cache, inFlight, 'k', produce, 0)).resolves.toEqual([5]);
    expect(produce).toHaveBeenCalledTimes(2);
  });

  it('re-fetches once the cached entry crosses the TTL boundary', async () => {
    const { cache, inFlight } = freshCache();
    const produce = vi.fn().mockResolvedValue([1]);

    await getOrFetchNonNull(cache, inFlight, 'k', produce, 0); // cached, expires at 1000
    await getOrFetchNonNull(cache, inFlight, 'k', produce, 999); // still cached
    await getOrFetchNonNull(cache, inFlight, 'k', produce, 1000); // boundary -> refetch

    expect(produce).toHaveBeenCalledTimes(2);
  });
});

// ===========================================================================
// getOrComputeConditional — degraded results must NOT be pinned
// ===========================================================================
describe('getOrComputeConditional — success-only (degraded not pinned)', () => {
  function freshCache() {
    return {
      cache: new TtlCache<string>(1000),
      inFlight: new Map<string, Promise<string>>(),
    };
  }

  it('caches a cacheable:true compute (2nd call served from cache)', async () => {
    const { cache, inFlight } = freshCache();
    const compute = vi.fn().mockResolvedValue({ value: 'ok', cacheable: true });

    await getOrComputeConditional(cache, inFlight, 'k', compute, 0);
    const second = await getOrComputeConditional(cache, inFlight, 'k', compute, 10);

    expect(second).toBe('ok');
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('does NOT cache a cacheable:false (degraded) compute — next call recomputes', async () => {
    const { cache, inFlight } = freshCache();
    // First call is the degraded outcome (e.g. building RPC failed); second recovers.
    const compute = vi
      .fn()
      .mockResolvedValueOnce({ value: 'degraded', cacheable: false })
      .mockResolvedValueOnce({ value: 'recovered', cacheable: true });

    const degraded = await getOrComputeConditional(cache, inFlight, 'k', compute, 0);
    const recovered = await getOrComputeConditional(cache, inFlight, 'k', compute, 1);

    expect(degraded).toBe('degraded'); // still returned to the caller
    expect(recovered).toBe('recovered'); // NOT pinned to the degraded result
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it('shares one in-flight promise for concurrent same-key computes', async () => {
    const { cache, inFlight } = freshCache();
    let resolveFn: (v: { value: string; cacheable: boolean }) => void = () => {};
    const compute = vi.fn().mockImplementation(
      () => new Promise<{ value: string; cacheable: boolean }>((r) => (resolveFn = r)),
    );

    const p1 = getOrComputeConditional(cache, inFlight, 'k', compute, 0);
    const p2 = getOrComputeConditional(cache, inFlight, 'k', compute, 0);
    resolveFn({ value: 'x', cacheable: true });
    await Promise.all([p1, p2]);

    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('evicts a rejected compute so a retry recomputes', async () => {
    const { cache, inFlight } = freshCache();
    const compute = vi
      .fn()
      .mockRejectedValueOnce(new Error('compute boom'))
      .mockResolvedValueOnce({ value: 'ok', cacheable: true });

    await expect(getOrComputeConditional(cache, inFlight, 'k', compute, 0)).rejects.toThrow(
      'compute boom',
    );
    await expect(getOrComputeConditional(cache, inFlight, 'k', compute, 0)).resolves.toBe('ok');
    expect(compute).toHaveBeenCalledTimes(2);
  });
});

// ===========================================================================
// getOrCompute — always-cacheable variant: caching, concurrency, eviction
// ===========================================================================
describe('getOrCompute — unconditional caching, concurrency, eviction', () => {
  function freshCache() {
    return {
      cache: new TtlCache<string>(1000),
      inFlight: new Map<string, Promise<string>>(),
    };
  }

  it('caches the computed value (2nd call does not recompute)', async () => {
    const { cache, inFlight } = freshCache();
    const compute = vi.fn().mockResolvedValue('v');
    await getOrCompute(cache, inFlight, 'k', compute, 0);
    const second = await getOrCompute(cache, inFlight, 'k', compute, 5);
    expect(second).toBe('v');
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('shares one in-flight promise for a concurrent race', async () => {
    const { cache, inFlight } = freshCache();
    let resolveFn: (v: string) => void = () => {};
    const compute = vi
      .fn()
      .mockImplementation(() => new Promise<string>((r) => (resolveFn = r)));
    const p1 = getOrCompute(cache, inFlight, 'k', compute, 0);
    const p2 = getOrCompute(cache, inFlight, 'k', compute, 0);
    resolveFn('shared');
    await Promise.all([p1, p2]);
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('evicts a rejection (never caches a failed compute)', async () => {
    const { cache, inFlight } = freshCache();
    const compute = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce('ok');
    await expect(getOrCompute(cache, inFlight, 'k', compute, 0)).rejects.toThrow('x');
    await expect(getOrCompute(cache, inFlight, 'k', compute, 0)).resolves.toBe('ok');
    expect(compute).toHaveBeenCalledTimes(2);
  });
});
