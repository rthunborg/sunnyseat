import type { WeatherSlice } from './types';

/**
 * STORY 10.3 (AC2) — layer-weighted "effective cloud cover".
 *
 * Tier 0 (Story 10.1) gated on the single TOTAL `cloud_area_fraction`, treating a
 * 100%-cirrus sky the same as a 100%-stratus deck. But you can feel the sun
 * through high cirrus, and a terrace under high haze still gets meaningful direct
 * light — so gating both as "80% ⇒ obscured" is a false negative. Tier 1 fixes it
 * by weighting the Met.no `complete` three-layer split (low/medium/high cover) so
 * low + medium cloud dominate and high cloud contributes only weakly, producing a
 * single "how much sun is actually BLOCKED" scalar that feeds BOTH the Story 10.1
 * cloud gate (`applyCloudGate`) AND the FR12 confidence blend (`calcCloudCertainty`).
 *
 * THE PHYSICS (why these weights):
 *  - Low/medium cloud (stratus, cumulus, altostratus, below ~5000 m) blocks the
 *    direct beam — a full low deck = no sun at ground level. Weight ≈ 1.0.
 *  - High cloud (cirrus/cirrostratus above ~5000 m) is thin ice crystal; a fully
 *    cirrus sky still transmits a large fraction of direct sun. Weight must be
 *    small (≈ 0.25) so 100% cirrus lands the effective cover WELL BELOW the 80
 *    gate. 100 * 0.25 = 25 ≪ 80 ⇒ 100%-high-only does NOT gate (AC2), while
 *    100 * 1.0 = 100 ≥ 80 ⇒ 100%-low-only DOES gate (AC2).
 *
 * These weights are DELIBERATELY RE-TUNABLE (like the 80 threshold) — tests assert
 * the boundary INTENT (cirrus doesn't gate, low deck does) and the ordering
 * (cirrus effective < stratus effective), never the exact number.
 *
 * NOT a partition: `_low`/`_medium`/`_high` are each an independent cover fraction
 * for their altitude band, so `low + medium + high` can exceed 100 for a genuinely
 * fully-clouded multi-layer sky. The weighted SUM is therefore clamped to 0..100 —
 * a real 100/100/100 sky IS overcast, and clamping keeps it at 100 rather than
 * fabricating a >100 value.
 *
 * FALLBACK (AC3): the weighting applies ONLY when ALL THREE layers are present. If
 * ANY of low/medium/high is `undefined` (a partial `complete` entry, a non-Met.no
 * producer, a fixture without the split), the effective value degrades to the raw
 * TOTAL `slice.cloudCover` — exactly Tier-0 behaviour. And if that total is itself
 * `undefined` (Story 10.1 AC2: field absent), the effective value stays `undefined`
 * — non-gating AND non-clear. NEVER fabricate a `0` or `100` when data is missing.
 */

/** Weight for low-cloud cover (below ~2000 m). Blocks the direct beam fully. */
export const CLOUD_WEIGHT_LOW = 1.0;
/** Weight for medium-cloud cover (~2000–5000 m). Altostratus/cumulus also blocks. */
export const CLOUD_WEIGHT_MEDIUM = 1.0;
/**
 * Weight for high-cloud cover (cirrus, above ~5000 m). Thin ice crystal transmits
 * most of the direct beam, so it must contribute only weakly: 100 * 0.25 = 25,
 * well below the 80 gate. Re-tunable within ≈0.2–0.3.
 */
export const CLOUD_WEIGHT_HIGH = 0.25;

/**
 * The layer-weighted effective cloud cover for a weather slice, or `undefined` when
 * cloud data is unusable (unknown-never-clear). See the module doc for the physics,
 * the weights, and the AC3 fallback contract.
 */
export function effectiveCloudCover(slice: WeatherSlice | null | undefined): number | undefined {
  if (!slice) return undefined;

  const { cloudCoverLow: low, cloudCoverMedium: medium, cloudCoverHigh: high } = slice;

  // AC3: only the FULL three-layer split enables the layer weighting. Any missing
  // band ⇒ degrade to the Tier-0 raw total (itself possibly `undefined`).
  if (low === undefined || medium === undefined || high === undefined) {
    return typeof slice.cloudCover === 'number' && Number.isFinite(slice.cloudCover)
      ? slice.cloudCover
      : undefined;
  }

  if (![low, medium, high].every(Number.isFinite)) {
    return typeof slice.cloudCover === 'number' && Number.isFinite(slice.cloudCover)
      ? slice.cloudCover
      : undefined;
  }

  const weighted =
    CLOUD_WEIGHT_LOW * low + CLOUD_WEIGHT_MEDIUM * medium + CLOUD_WEIGHT_HIGH * high;
  // Clamp: layers are not a partition, so the weighted sum can exceed 100 (and a
  // negative sensor glitch could dip below 0). Clamp to the honest 0..100 range.
  return Math.max(0, Math.min(100, weighted));
}
