import createMiddleware from 'next-intl/middleware';
import { type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { venueRateLimitMiddleware } from '@/lib/utils/venue-rate-limit-middleware';

const intlMiddleware = createMiddleware(routing);

/**
 * STORY 9.3 (AC3, Option A) — composed Edge proxy (Next 16's renamed
 * `middleware.ts`). For the venue READ routes it runs the relocated per-IP rate
 * limiter ({@link venueRateLimitMiddleware}); for everything else it runs the
 * next-intl locale middleware. The matcher below routes BOTH families here, so we
 * branch on the pathname (`/api/venues...` → limiter; everything else → next-intl).
 *
 * WHY THE LIMITER MOVED HERE: the venue list route's GET handler used to read
 * `x-forwarded-for` / `x-real-ip` to key the token bucket. Reading request headers
 * makes a route effectively dynamic, so the Vercel edge could never serve its
 * `Cache-Control: public, s-maxage=30` response from cache — the header was dead.
 * Running the limiter here (ahead of the response cache) leaves the GET handler a
 * pure, header-independent, edge-cacheable function while keeping DoS protection
 * (429) + malformed-XFF rejection (400). Staleness window: CDN s-maxage 30s /
 * sun-compute cache 15 min / buildings cache 24h (see lib/services/sun-engine-cache.ts
 * + _bmad-output/planning-artifacts/architecture.md Caching Strategy). [Story 9.3 AC3]
 *
 * EDGE-SAFE: the limiter chain uses a pure-JS IP validator (no node:net), so it
 * imports cleanly into the Edge runtime.
 */
export default function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/venues')) {
    return venueRateLimitMiddleware(request);
  }
  return intlMiddleware(request);
}

// `dev` is excluded from the negative lookahead so /dev/* bypasses locale
// routing (Story 1.2 — the dev-only state-forcing demo must not be locale-prefixed).
// STORY 9.3: the matcher now ALSO includes `/api/venues` + `/api/venues/[slug]`
// so the relocated per-IP limiter runs on the venue read routes (the negative
// lookahead still excludes all OTHER `/api/*` routes from locale handling).
export const config = {
  matcher: [
    '/((?!api|trpc|_next|_vercel|dev|.*\\.(?:avif|br|css|csv|gif|gz|ico|jpg|jpeg|js|json|map|mp3|mp4|ogg|opus|pdf|png|svg|txt|wasm|webmanifest|webm|webp|woff|woff2|xml|zip)$).*)',
    '/api/venues',
    '/api/venues/:slug*',
  ],
};
