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

export const GOTHENBURG_BOUNDS = {
  minLatitude: 57.6,
  maxLatitude: 57.8,
  minLongitude: 11.8,
  maxLongitude: 12.1,
} as const;

export function isWithinGothenburgBounds(lat: number, lng: number): boolean {
  return (
    lat >= GOTHENBURG_BOUNDS.minLatitude &&
    lat <= GOTHENBURG_BOUNDS.maxLatitude &&
    lng >= GOTHENBURG_BOUNDS.minLongitude &&
    lng <= GOTHENBURG_BOUNDS.maxLongitude
  );
}
