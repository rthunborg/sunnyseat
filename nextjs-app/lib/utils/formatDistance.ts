/**
 * Format a distance in meters for display.
 * - Below 900m: round to nearest 100m, show as "X m" (e.g. "500 m")
 * - 900m and above: show as km with 1 decimal (e.g. "1,2 km" for sv, "1.2 km" for en)
 */
export function formatDistance(meters: number, locale: 'sv' | 'en' = 'sv'): string {
  if (meters < 0) meters = 0;

  if (meters < 900) {
    const rounded = Math.round(meters / 100) * 100;
    // Minimum display: 100 m
    const display = Math.max(rounded, 100);
    return `${display} m`;
  }

  const km = meters / 1000;
  const rounded = Math.round(km * 10) / 10;
  const formatted = locale === 'sv'
    ? rounded.toFixed(1).replace('.', ',')
    : rounded.toFixed(1);
  return `${formatted} km`;
}
