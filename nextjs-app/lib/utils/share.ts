/**
 * Story 9.8 — Venue sharing.
 *
 * Builds the shareable venue deep-link and dispatches the native Web Share
 * sheet. The share URL REUSES the existing `?venue=<slug>` deep-link (the same
 * query param `MapView.handleOpenDetails` pushes and `venueSlugParam =
 * searchParams.get('venue')` resolves) — it does NOT introduce a new `/v/<slug>`
 * route surface. AC3 is therefore satisfied by the existing routing; this module
 * only points a recipient at it.
 *
 * This is a share/deep-link URL, NOT a native-maps URL — the routing-boundary
 * contract (`test/unit/routing-boundary.test.ts`, which pins the single popup
 * call site + the native-maps URL builders in `lib/services/routing.ts`) does
 * NOT apply here. `navigator.share` / `navigator.clipboard` / share-intent
 * anchors are none of those, so this code deliberately opens no popup window
 * and never routes through the maps helper.
 */

/**
 * Params that describe the sharer's transient planner/dev state. A clean venue
 * link must drop these so the recipient gets the venue, not the sharer's forced
 * state or planner time (Story 9.8 Open Question 1 default).
 */
const STRIPPED_SHARE_PARAMS = ['_state', '_time', '_date', 'tags', 'tag'] as const;

/**
 * Build a clean shareable venue URL from the CURRENT browser location.
 *
 * We read the real `origin`/`pathname` (which preserve the `localePrefix:
 * 'as-needed'` locale segment — sv unprefixed `/`, en `/en`) rather than
 * next-intl's `usePathname()` (which STRIPS the locale prefix), so an English
 * user shares an English link by construction. Only `?venue=<slug>` survives;
 * the sharer's `_state`/`_time`/`_date`/tag-filter params are dropped.
 *
 * @param origin   `window.location.origin` (e.g. `https://sunnyseat.app`).
 * @param pathname `window.location.pathname` (e.g. `/` or `/en`).
 * @param search   `window.location.search` (e.g. `?_time=14:00`); optional.
 * @param slug     the venue slug to deep-link to.
 */
export function buildVenueShareUrl(
  origin: string,
  pathname: string,
  search: string,
  slug: string,
): string {
  const params = new URLSearchParams(search);
  for (const key of STRIPPED_SHARE_PARAMS) {
    params.delete(key);
  }
  params.set('venue', slug);
  const query = params.toString();
  return `${origin}${pathname}${query ? `?${query}` : ''}`;
}

/**
 * Build the share URL from the live `window.location`. Client-only — callers
 * MUST invoke this from a user-gesture handler, never during render (SSR-safe).
 * Returns `null` when `window` is unavailable or no slug is supplied.
 */
export function currentVenueShareUrl(slug: string | null | undefined): string | null {
  if (!slug) return null;
  if (typeof window === 'undefined') return null;
  const { origin, pathname, search } = window.location;
  return buildVenueShareUrl(origin, pathname, search, slug);
}

export type VenueSharePayload = {
  title: string;
  text?: string;
  url: string;
};

/**
 * Outcome of a native-share attempt so the caller can decide whether to fall
 * back to the desktop share surface.
 *
 * - `shared`      — `navigator.share` resolved (the OS sheet handled it).
 * - `cancelled`   — the user dismissed the OS sheet (`AbortError`); no fallback,
 *                   no error surfaced.
 * - `unsupported` — `navigator.share` is unavailable → open the modal fallback.
 * - `failed`      — `navigator.share` rejected for another reason → fall back to
 *                   the modal so the user still has a working path.
 */
export type NativeShareOutcome = 'shared' | 'cancelled' | 'unsupported' | 'failed';

/**
 * Capability-gated native Web Share. The decision is capability-based (does
 * `navigator.share` exist?), NOT a viewport check — a desktop Chrome with share
 * support may use it, a mobile browser without it falls back. Never reads
 * `navigator` during render; call only from a click handler.
 */
export async function shareVenueNatively(
  payload: VenueSharePayload,
): Promise<NativeShareOutcome> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return 'unsupported';
  }
  try {
    await navigator.share(payload);
    return 'shared';
  } catch (error) {
    // A user-cancelled share rejects with an AbortError — swallow it silently,
    // do NOT surface an error and do NOT open the fallback modal.
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelled';
    }
    return 'failed';
  }
}
