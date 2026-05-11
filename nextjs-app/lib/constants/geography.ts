/**
 * Project-wide geography constants. Sourced from project-context.md
 * §"Gothenburg Constants".
 *
 * Kept in `lib/constants/` rather than `lib/types/` because these are
 * runtime values, not type definitions — exporting a `const` from a
 * types module mixes concerns and is convention-breaking.
 */

export const GOTHENBURG_CENTRE = {
  lat: 57.7089,
  lng: 11.9746,
  zoom: 13,
} as const;
