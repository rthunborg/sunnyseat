import type { VenueSunStatus } from '@/lib/types/api';

/**
 * True when the venue's headline state is the weather-gated obscured state.
 * The single branch predicate every render surface uses to switch on the
 * muted "Sol bakom moln" presentation.
 */
export function isObscuredSunStatus(
  status: VenueSunStatus | undefined,
): boolean {
  return status === 'CloudObscured';
}

/**
 * The three presentational tiers a sun window collapses into for label + fill
 * purposes. This is the geometric-potential vocabulary: `CloudObscured` is a
 * WEATHER headline, not a geometric status, so per Story 10.2 (AC2) it is
 * treated as clear-sky POTENTIAL — i.e. the same `'partial'` tier as `Partial`
 * — never as `'shaded'`.
 */
export type WindowLabelTier = 'sunny' | 'partial' | 'shaded';

/**
 * Story 10.2 — the single, `never`-exhaustive mapping from a sun-window status
 * to its presentational tier. This is the sole `never`-exhaustive `switch` over
 * the `VenueSunStatus` union in this module, so a future `VenueSunStatus` member
 * that is not handled here is a COMPILE error at exactly one place — preserving
 * the epic-10 convention that no new status silently falls through to a
 * Shaded-like default. Currently backs {@link isSunWindowStatus}; its former
 * timeline-window consumers (`SunTimeline` desktop bars and `SunForecastBars`
 * mobile sr-only labels) were removed with the venue-detail timeline in
 * Story 11.6.
 *
 * `CloudObscured` maps to `'partial'`: a sun window is the geometric "when the
 * sun COULD reach this seat" potential, and the weather gate is applied
 * separately at the headline — so an obscured window must count as clear-sky
 * potential, never "Shaded"/"Skugga".
 */
export function windowLabelTier(status: VenueSunStatus): WindowLabelTier {
  switch (status) {
    case 'Sunny':
      return 'sunny';
    case 'Partial':
    case 'CloudObscured':
      return 'partial';
    case 'Shaded':
    case 'NoSun':
      return 'shaded';
    default: {
      // Exhaustiveness guard — adding a VenueSunStatus without handling it
      // here is a compile error. See doc comment.
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/**
 * True when the window status should be treated as a sun window (geometric
 * sun potential) for "best window" / peak selection. `Sunny`, `Partial`, and
 * (per 10.2 AC2) `CloudObscured` all count — the latter is clear-sky potential
 * masked by weather, not an absence of sun geometry. Backed by
 * {@link windowLabelTier} so a new `VenueSunStatus` breaks at compile time
 * instead of silently dropping the window.
 */
export function isSunWindowStatus(status: VenueSunStatus): boolean {
  return windowLabelTier(status) !== 'shaded';
}

/** Plain-language sky descriptors (no meteorology internals per Story 3.0.6). */
export type SkyConditionCopy = {
  clear: string;
  partlyCloudy: string;
  overcast: string;
  /** Story 10.4 (AC2): plain-language copy for the rain-now sky condition. */
  rain: string;
};

/**
 * Story 10.2 (AC3) — maps the serialized `skyCondition` DTO field
 * (`'clear' | 'partly-cloudy' | 'overcast' | 'rain' | 'unavailable'`) onto
 * user-facing plain-language copy with NO meteorology internals (no cloud
 * %, no `cloud_area_fraction`, no rate/radar/mm/h, no geodata).
 *
 * Story 10.4 (AC2) realises the `'rain'` case: when the near-now radar reports
 * active precipitation the engine surfaces `skyCondition === 'rain'`, and this
 * renders the plain-language rain descriptor.
 *
 * Returns `null` for `'unavailable'`, an absent value, or any unrecognised
 * string — the caller renders NO sky line rather than fabricating one
 * (10.1's honest "we don't know"; never invent the sky).
 */
export function skyConditionCopy(
  skyCondition: string | undefined,
  copy: SkyConditionCopy,
): string | null {
  switch (skyCondition) {
    case 'clear':
      return copy.clear;
    case 'partly-cloudy':
      return copy.partlyCloudy;
    case 'overcast':
      return copy.overcast;
    case 'rain':
      return copy.rain;
    // 'unavailable', undefined, or any unknown value → render nothing. Never
    // fabricate a sky descriptor.
    default:
      return null;
  }
}
