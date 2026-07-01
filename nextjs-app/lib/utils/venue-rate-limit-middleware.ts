/**
 * STORY 9.3 (AC3, Option A) — the per-IP rate-limit HANDLER for the venue read
 * routes, used by the Edge proxy (`proxy.ts`). Kept in its own module (importing
 * only `next/server` + the Edge-safe `rate-limit.ts`, NOT next-intl) so it can be
 * unit-tested in isolation without pulling the locale middleware into the test
 * graph.
 *
 * Returns a 400 (malformed X-Forwarded-For), a 429 (quota exhausted), or
 * `NextResponse.next()` (allowed). This is the relocated home of the limiter that
 * used to read request headers inside `app/api/venues/route.ts` — moving it here
 * (ahead of the response cache) is what lets the GET handler be a pure,
 * header-independent, edge-cacheable function. [Story 9.3 AC3]
 */
import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit, clientKeyFromHeaders } from '@/lib/utils/rate-limit';

export function venueRateLimitMiddleware(request: NextRequest): NextResponse {
  // Story 9.3 scoped this bucket to the venue READ routes only. The proxy matcher
  // also routes mutation subpaths here (notably `POST /api/venues/[slug]/feedback`),
  // so gate this read rate-limit bucket to `method === 'GET'` — otherwise a feedback
  // submission and a browsing read would share one 120/60s per-IP bucket and 429 each
  // other, a net-new cross-route behaviour never in 9.3's scope. The feedback POST
  // (and any non-GET mutation) is intentionally NOT edge-throttled here: it is an
  // anonymous route guarded by its own strict Zod schema. There is no separate
  // mutation rate-limit bucket — these requests simply pass through untouched.
  if (request.method !== 'GET') {
    return NextResponse.next();
  }

  const clientKey = clientKeyFromHeaders(request.headers);

  if (clientKey === 'invalid') {
    return NextResponse.json(
      { detail: 'Invalid X-Forwarded-For header', status: 400 },
      { status: 400 },
    );
  }

  if (!checkRateLimit(clientKey)) {
    return NextResponse.json(
      { detail: 'Too many venue requests', status: 429 },
      { status: 429 },
    );
  }

  return NextResponse.next();
}
