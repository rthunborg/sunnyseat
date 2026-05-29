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

/** Motion/Tailwind `duration-slow` token, expressed in seconds for Motion. */
export const DURATION_SLOW_S = 0.3;

/** Venue detail sheet/panel exit duration, expressed in seconds for Motion. */
export const DURATION_DETAIL_EXIT_S = 0.25;

/** Motion/Tailwind `duration-fast` token, expressed in seconds for Motion. */
export const DURATION_FAST_S = 0.15;

/** Venue-list card fade-in duration, mirrors the 150 ms UX spec timing. */
export const VENUE_CARD_FADE_MS = 150;

/** Venue-list card stagger step, mirrors the 50 ms UX spec timing. */
export const VENUE_CARD_STAGGER_STEP_MS = 50;

/** Design token `ease-enter`; keep in sync with `--ease-enter`. */
export const EASE_ENTER = 'easeOut' as const;

/** Design token `ease-exit`; keep in sync with `--ease-exit`. */
export const EASE_EXIT = 'easeIn' as const;

/** Design token `ease-default`; keep in sync with `--ease-default`. */
export const EASE_DEFAULT = 'easeInOut' as const;

/** Design token `ease-spring`; keep in sync with `--ease-spring`. */
export const EASE_SPRING = [0.22, 1, 0.36, 1] as const;
