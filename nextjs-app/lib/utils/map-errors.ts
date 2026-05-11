/**
 * Shared MapLibre error-classification helpers.
 *
 * `MapView` and `MapContainer` both read `error.url` off MapLibre's `error`
 * events, but they used to maintain separate predicates that drifted across
 * Story 1.6 review patches (Round 1 P29 widened MapContainer to include
 * `/sprite` + `/glyphs/`; P31 narrowed MapView to just `/styles/` +
 * `/style.json`). The drift produced Round 2 R-001: a sprite or glyph
 * failure correctly latched MapContainer's sand fallback, but MapView's
 * loading cover at `z-floating-buttons` did not release because the URL
 * pattern didn't match — leaving the user with a permanent loading
 * skeleton hiding the fallback. Round 2 R2-P1 extracts the predicate
 * here so both files cannot drift again.
 *
 * The set of recognized style-resource path segments mirrors OpenFreeMap's
 * style descriptor + glyph + sprite layout (see `MapContainer.tsx` style
 * URL config). If we ever swap tile providers, audit this list against the
 * new provider's path conventions and grow it accordingly.
 */
const STYLE_RESOURCE_SEGMENTS = ['/styles/', '/sprite', '/glyphs/'] as const;
const STYLE_DESCRIPTOR_SUFFIX = '/style.json';

/**
 * Returns true when the failed URL belongs to a style descriptor, sprite,
 * or glyphs resource — i.e. a request whose failure genuinely blocks tile
 * paint and should release the loading cover / latch the sand fallback.
 *
 * Returns false for tile, vector, and unrelated JSON resources. Tile
 * failures are tracked separately by both consumers (counter-based
 * threshold in MapContainer; per-error gate in MapView).
 */
export function isStyleResourceUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  if (url.endsWith(STYLE_DESCRIPTOR_SUFFIX)) return true;
  return STYLE_RESOURCE_SEGMENTS.some((segment) => url.includes(segment));
}
