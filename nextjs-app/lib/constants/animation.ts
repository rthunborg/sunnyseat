/**
 * Animation duration constants used by JS-driven animations that consume
 * numeric APIs (MapLibre's `flyTo({ duration })`, Motion's `transition.duration`).
 * Keep this file in sync with `--duration-*` tokens in `app/globals.css`;
 * both must agree because CSS reads the token, JS reads this constant.
 *
 * See `docs/design/DESIGN.md` §"Transitions" for the canonical values.
 */

/** MapLibre `flyTo()` duration when navigating to user location or map controls. */
export const DURATION_FLY_MS = 500;
