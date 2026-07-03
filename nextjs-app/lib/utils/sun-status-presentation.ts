import type { VenueSunStatus } from '@/lib/types/api';
import type { SunStatus } from '@/lib/types/design-tokens';

/**
 * Story 10.2 — shared DTO→UI-token status mapper.
 *
 * Maps the DTO-layer {@link VenueSunStatus} (`'Sunny' | 'Partial' | 'Shaded'
 * | 'NoSun' | 'CloudObscured'`) onto the presentational {@link SunStatus}
 * vocabulary (`'sunny' | 'partial' | 'shaded' | 'obscured'`). The `switch`
 * is `never`-exhaustive (epic-10 ratified convention): a future
 * `VenueSunStatus` member that is not handled here is a COMPILE error, so
 * no render surface silently falls through to a Shaded-like placeholder
 * again (the exact 10.1 → 10.2 hand-off failure this story fixes).
 */
export function toSunStatusToken(status: VenueSunStatus): SunStatus {
  switch (status) {
    case 'Sunny':
      return 'sunny';
    case 'Partial':
      return 'partial';
    case 'CloudObscured':
      return 'obscured';
    case 'Shaded':
    case 'NoSun':
      return 'shaded';
    default: {
      // Exhaustiveness guard — see doc comment. If this line stops
      // compiling, a new VenueSunStatus was added; map it above.
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

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

/** Plain-language sky descriptors (no meteorology internals per Story 3.0.6). */
export type SkyConditionCopy = {
  clear: string;
  partlyCloudy: string;
  overcast: string;
};

/**
 * Story 10.2 (AC3) — maps the serialized `skyCondition` DTO field
 * (`'clear' | 'partly-cloudy' | 'overcast' | 'unavailable'`) onto
 * user-facing plain-language copy with NO meteorology internals (no cloud
 * %, no `cloud_area_fraction`, no geodata).
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
    // 'unavailable', undefined, 'rain' (Story 10.4's, not surfaced here), or
    // any unknown value → render nothing. Never fabricate a sky descriptor.
    default:
      return null;
  }
}
