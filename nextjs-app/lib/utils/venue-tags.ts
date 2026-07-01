/**
 * Story 9.7 (Tag Filtering) — pure client-side tag helpers.
 *
 * The chip row (`DesktopNavBar`) and the venue surfaces (`MapView`) both derive
 * from these. They are pure functions over already-fetched venue data — they
 * issue ZERO network requests (Story 9.4 fetch-hygiene spine is untouched).
 *
 * Matching always uses the CANONICAL stored (Swedish) tag value; only the
 * rendered chip DISPLAY is localized via `localizeTag`, so the two locales'
 * venues never match differently (Dev Notes §"Localization", approach A).
 */

type VenueWithTags = { tags: string[] };

/**
 * The `allTags` union across the loaded venues, in FIRST-SEEN order (AC2),
 * de-duped. Mirrors the reference `TopBar.jsx` `allTags` approach. A tag that no
 * venue carries never appears here (data-driven — resolves the "chips represent
 * tags no venue has" fabrication).
 */
export function collectTags(venues: VenueWithTags[]): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const venue of venues) {
    const venueTags = Array.isArray(venue.tags) ? venue.tags : [];
    for (const tag of venueTags) {
      if (typeof tag !== 'string' || seen.has(tag)) continue;
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags;
}

/**
 * Filter venues by the active tag selection.
 *   - 0 active tags → pass-through ALL venues (AC4 no-op; the show-all default
 *     is never bypassed, so a graceful-empty `tags: []` venue is still shown).
 *   - ≥1 active tag → keep venues whose tags INTERSECT the selection, i.e.
 *     multi-select is OR/union: a venue matches if it has ANY active tag
 *     (`.some()`, per AC3 + the reference `TopBar.jsx`). A `tags: []` venue then
 *     matches nothing and is excluded. Source order is preserved.
 *   - No match → `[]` (the existing `venue.list.empty` state renders).
 */
export function filterVenuesByTags<T extends VenueWithTags>(
  venues: T[],
  activeTags: ReadonlySet<string> | readonly string[],
): T[] {
  const active = activeTags instanceof Set ? activeTags : new Set(activeTags);
  if (active.size === 0) return venues;
  return venues.filter((venue) =>
    (Array.isArray(venue.tags) ? venue.tags : []).some((tag) => active.has(tag)),
  );
}

/**
 * Canonical (Swedish) → English display map for the known seeded tag set. The
 * `en` values come from the existing `venue-visual-metadata.ts` placeholder (the
 * deterministic source), so casing matches the shipped i18n (Wi-Fi, Courtyard,
 * …) — never a truncated/wrong-cased label. `Takterrass` is included defensively
 * (no seeded venue carries it, but if one is ever added the full word renders).
 */
const TAG_DISPLAY_EN: Record<string, string> = {
  Innergård: 'Courtyard',
  'Hund ok': 'Dogs ok',
  Wifi: 'Wi-Fi',
  Bakverk: 'Pastries',
  Morgonsol: 'Morning sun',
  'Take-away': 'Take-away',
  Surdeg: 'Sourdough',
  Kanal: 'Canal',
  Skaldjur: 'Seafood',
  Parasoller: 'Parasols',
  Specialkaffe: 'Specialty coffee',
  Svalt: 'Cool shade',
  Lunch: 'Lunch',
  Bakgård: 'Backyard',
  Kväll: 'Evening',
  Takterrass: 'Rooftop',
};

/**
 * Localize a canonical (Swedish) tag for DISPLAY only.
 *   - `sv` → the canonical value unchanged.
 *   - `en` → the mapped display value, or the canonical value as a safe fallback
 *     for an unmapped tag (never a truncated label).
 */
export function localizeTag(tag: string, locale: 'sv' | 'en'): string {
  if (locale === 'en') return TAG_DISPLAY_EN[tag] ?? tag;
  return tag;
}
