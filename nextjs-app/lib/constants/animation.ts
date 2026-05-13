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

/** Motion/Tailwind `duration-default` token, expressed in seconds for Motion. */
export const DURATION_DEFAULT_S = 0.2;

/** Motion/Tailwind `duration-fast` token, expressed in seconds for Motion. */
export const DURATION_FAST_S = 0.15;

/** Design token `ease-enter`; keep in sync with `--ease-enter`. */
export const EASE_ENTER = 'easeOut' as const;

/** Design token `ease-exit`; keep in sync with `--ease-exit`. */
export const EASE_EXIT = 'easeIn' as const;

/** Design token `ease-default`; keep in sync with `--ease-default`. */
export const EASE_DEFAULT = 'easeInOut' as const;
