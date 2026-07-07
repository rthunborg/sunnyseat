/**
 * Shared planner→venue-query derivation (Story 11.1 R-001 zero-fetch invariant).
 *
 * TWO seams that MUST stay in lock-step across every `/api/venues` consumer, so
 * a scrub (same-date time change) NEVER changes the query key and fires zero
 * fetches:
 *
 *  1. `venuePlannerQueryArgs(planner)` — the CALLER-side shape. Every caller
 *     (`MapView`, `DesktopNavBar`, `VenueSearchShell`) feeds the venue hooks the
 *     IDENTICAL `{ date, time, isLiveNow }` args. Previously `MapView` built this
 *     inline (passing `date` + `isLiveNow: true` on live-today → the `planner`
 *     key) while the nav/search callers spread the raw `plannerTime.plannerQuery`
 *     (which is `undefined` on live-today → the `list` key). That divergence put
 *     the always-mounted `DesktopNavBar` on a DIFFERENT key from `MapView` on
 *     live-today and, worse, flipped its key `list`→`planner` on the FIRST scrub
 *     away from live — a hidden second `/api/venues` request during a same-day
 *     scrub, breaking the scrub=0 invariant. Deriving the args in ONE place makes
 *     the three callers un-divergeable.
 *
 *  2. `deriveQueryKeyPlanner(date)` — the HOOK-side key fragment. `useVenueSearch`
 *     and `useFavouriteVenues` both key on the selected `date` (never `time`) in
 *     BOTH the live and off-live cases. Extracted here so a future edit to one
 *     hook cannot silently reintroduce a `time`-keyed fetch in only one of them.
 */

/**
 * The subset of the TimeContext value the venue-query derivation reads. Kept as a
 * structural type (not an import of `TimeContextValue`) so this util stays a leaf
 * with no context dependency and is trivially unit-testable.
 */
export type PlannerQuerySource = {
  isLiveNow: boolean;
  plannerQuery: { date: string; time: string } | undefined;
  selectedDate: string;
  selectedTime: string;
};

/**
 * The planner args every `/api/venues` caller spreads into `useVenueSearch` /
 * `useFavouriteVenues`. Returns `undefined` only when the selection is neither a
 * valid off-live planner selection NOR live-now (an out-of-range/invalid date) —
 * the callers then fall back to the plain live key (no date).
 */
export type VenuePlannerQueryArgs =
  | { date: string; time: string; isLiveNow: boolean }
  | undefined;

/**
 * Build the shared `{ date, time, isLiveNow }` venue-query args from the planner.
 *
 * - Off-live selection → the context exposes a concrete `plannerQuery`; pass it
 *   with `isLiveNow: false` so the request sends date/time and the key uses the
 *   selected date.
 * - Live-now → pass the selected date/time but flag `isLiveNow: true` so the hook
 *   OMITS date/time from the request (server computes "now", freshness stays
 *   live) while STILL keying on the selected date. This keeps the live-today ↔
 *   off-live-today scrub on the SAME key (zero fetch).
 * - Otherwise (an out-of-range/invalid, non-live date) → `undefined`; fall back
 *   to the plain live key rather than keying on a bad date.
 */
export function venuePlannerQueryArgs(planner: PlannerQuerySource): VenuePlannerQueryArgs {
  if (planner.plannerQuery) {
    return { ...planner.plannerQuery, isLiveNow: false };
  }
  if (planner.isLiveNow) {
    return {
      date: planner.selectedDate,
      time: planner.selectedTime,
      isLiveNow: true,
    };
  }
  return undefined;
}

/**
 * The date-only key fragment shared by both venue hooks. Includes the selected
 * `date` (never `time`) so a settled same-date scrub keeps the SAME key. Returns
 * `undefined` when there is no date to key on (the plain live/list key).
 */
export function deriveQueryKeyPlanner(
  date: string | undefined,
): { date: string } | undefined {
  return date ? { date } : undefined;
}
