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
