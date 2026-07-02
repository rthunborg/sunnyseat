/**
 * STORY 9.3 (AC3, Option A) — per-IP token-bucket rate limiter, EXTRACTED from
 * `app/api/venues/route.ts` so it can run in `middleware.ts` (Edge) BEFORE the
 * response cache instead of inside the route handler.
 *
 * WHY THIS MOVED: the route GET handler used to read `x-forwarded-for` /
 * `x-real-ip` to key this bucket. Reading request headers makes a route
 * effectively dynamic, so Vercel's edge could never serve the route's
 * `Cache-Control: public, s-maxage=30` response from cache — the header was
 * dead. Running the limiter in Edge middleware keeps the per-IP DoS protection
 * (and the 429 / malformed-XFF 400 behaviour) while leaving the GET handler a
 * pure, header-independent, edge-cacheable function. [Story 9.3 AC3]
 *
 * The in-memory token bucket is per-instance (same as before the move) — fine for
 * MVP scale; a distributed limiter is a platform/firewall concern for later.
 *
 * EDGE-RUNTIME SAFE: middleware.ts runs in the Edge runtime, which forbids native
 * Node.js APIs (no `node:net`). The previous route version used `node:net`'s
 * `isIP`; here IP validity is checked with a pure-JS validator instead so this
 * module can be imported by Edge middleware. [Story 9.3 AC3]
 */

export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 120;
export const MISSING_CLIENT_RATE_LIMIT_KEY = 'missing-client-ip';
const RATE_LIMIT_SWEEP_INTERVAL_MS = RATE_LIMIT_WINDOW_MS;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();
let lastRateLimitSweepAt = 0;

// Pure-JS IPv4 (dotted-quad, each octet 0-255) and IPv6 validators — Edge-safe
// replacements for `node:net`'s `isIP`. Mirrors `isIP(x) !== 0` semantics: any
// well-formed v4 or v6 (incl. compressed `::` and v4-mapped tails) is accepted.
const IPV4_PATTERN =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

function isValidIpv4(value: string): boolean {
  return IPV4_PATTERN.test(value);
}

function isValidIpv6(value: string): boolean {
  // Reject obvious non-v6 early; a bare v4 is handled by isValidIpv4.
  if (!value.includes(':')) return false;
  // At most one "::" compression group.
  const doubleColons = value.match(/::/g);
  if (doubleColons && doubleColons.length > 1) return false;
  const hasCompression = value.includes('::');
  // Split off an optional trailing IPv4-mapped tail (e.g. ::ffff:1.2.3.4).
  let head = value;
  let tailGroups = 0;
  const lastColon = value.lastIndexOf(':');
  const tail = value.slice(lastColon + 1);
  if (tail.includes('.')) {
    if (!isValidIpv4(tail)) return false;
    head = value.slice(0, lastColon);
    tailGroups = 2; // an embedded IPv4 occupies two 16-bit groups
  }
  const segments = head.split(':');
  for (const seg of segments) {
    if (seg === '') continue; // from a "::" boundary
    if (!/^[0-9a-fA-F]{1,4}$/.test(seg)) return false;
  }
  const hextetCount =
    segments.filter((s) => s !== '').length + tailGroups;
  if (hasCompression) return hextetCount <= 7;
  return hextetCount === 8;
}

function isValidIp(value: string): boolean {
  return isValidIpv4(value) || isValidIpv6(value);
}

/**
 * Derive a stable rate-limit key from a forwarded-for value. Returns the
 * lowercased IP for a single valid address, `'invalid'` for a malformed / unsafe
 * value (the caller should 400), or the missing-client sentinel for `null`.
 */
export function clientKeyFromForwardedFor(value: string | null): string {
  if (value === null) return MISSING_CLIENT_RATE_LIMIT_KEY;
  const [first] = value.split(',');
  const candidate = first.trim();
  if (!candidate || /[\r\n]/.test(candidate) || candidate.length > 64) return 'invalid';
  if (isValidIp(candidate)) return candidate.toLowerCase();
  return 'invalid';
}

/** Resolve the rate-limit key from a request's forwarding headers. */
export function clientKeyFromHeaders(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor?.trim()) return clientKeyFromForwardedFor(forwardedFor);
  const realIp = headers.get('x-real-ip');
  if (realIp?.trim()) return clientKeyFromForwardedFor(realIp);
  return MISSING_CLIENT_RATE_LIMIT_KEY;
}

/**
 * Consume one token for `key`. Returns `true` if the request is allowed, `false`
 * once the per-window quota is exhausted (the caller should 429). Sweeps expired
 * buckets lazily once per window.
 */
export function checkRateLimit(key: string, now = Date.now()): boolean {
  if (now - lastRateLimitSweepAt >= RATE_LIMIT_SWEEP_INTERVAL_MS) {
    for (const [bucketKey, bucket] of rateLimitBuckets) {
      if (bucket.resetAt <= now) rateLimitBuckets.delete(bucketKey);
    }
    lastRateLimitSweepAt = now;
  }
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  bucket.count += 1;
  return true;
}

/** Test-only: reset the limiter so each test starts with empty buckets. */
export function clearVenueRateLimitForTests(): void {
  rateLimitBuckets.clear();
  lastRateLimitSweepAt = 0;
}
