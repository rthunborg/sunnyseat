/**
 * ATDD RED-PHASE SCAFFOLD — Story 9.7 AC1 / AC3 / AC4 / AC5
 * (real `tags` on the venue DTO + the client-side tag-filter/union util)
 *
 * Two deterministic acceptance spines, no wall-clock:
 *
 *  A. VENUE DTO CARRIES REAL `tags` FROM THE DB (AC1) — mocked at the ADAPTER
 *     boundary (`@/lib/supabase/server` → `getSupabaseServiceRole`) per the
 *     vitest dynamic-import-bypass lesson (mock the adapter, NOT deep internals).
 *     Proves `getVenues()` on the Supabase path surfaces each venue's real tag
 *     array from the store row (NOT the fabricated `venue-visual-metadata.ts`
 *     placeholder), and a venue whose row has null/garbage/missing tags maps to
 *     `tags: []` (graceful-empty coercion — AC1/AC4).
 *
 *  B. TAG-FILTER + UNION UTIL (`@/lib/utils/venue-tags`) (AC3/AC4/AC5) — the pure
 *     client-side helpers the chip row + MapView derive from:
 *       - `collectTags(venues)` → the allTags union in FIRST-SEEN order (AC2).
 *       - `filterVenuesByTags(venues, activeTags)` → 0 active ⇒ pass-through ALL
 *         (AC4 no-op); ≥1 active ⇒ keep venues whose tags intersect the selection
 *         (multi-select = OR/union: a venue matches if it has ANY active tag —
 *         story AC3 + reference TopBar.jsx). A graceful-empty (`tags: []`) venue
 *         is shown when nothing is active and hidden once any chip is active.
 *         No match ⇒ [] (AC3 empty-result → the existing empty state renders).
 *       - `localizeTag(tag, locale)` → sv passes the canonical value through; en
 *         maps to the display value with CONSISTENT casing (AC5 — e.g. Wifi→Wi-Fi,
 *         Innergård→Courtyard; never a truncated "Takt").
 *
 * STATUS: describe.skip — the `tags` field does not yet exist on `VenueDataDto`
 * / the store mapping, and `@/lib/utils/venue-tags` does not exist yet. The block
 * is skipped so the PostToolUse gate (tsc + vitest + eslint) stays GREEN, AND
 * every not-yet-existing surface is reached through a RUNTIME dynamic specifier
 * resolved INSIDE the skipped bodies (never a top-level static import), so tsc
 * and Vitest import-analysis do not trip. When the dev adds `tags` to the DTO /
 * store (Tasks 2-3) and creates `lib/utils/venue-tags.ts` (Task 5), un-skip and
 * (optionally) hoist the specifiers to normal imports + drop the loose casts.
 *
 * Expected `@/lib/utils/venue-tags` contract (Task 5 / Dev Notes · Localization):
 *   export function collectTags(venues: Array<{ tags: string[] }>): string[];
 *   export function filterVenuesByTags<T extends { tags: string[] }>(
 *     venues: T[], activeTags: ReadonlySet<string> | readonly string[],
 *   ): T[];
 *   export function localizeTag(tag: string, locale: 'sv' | 'en'): string;
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Runtime dynamic specifiers — resolved only inside (skipped) bodies. Built at
// call time so static import analysis cannot resolve the not-yet-existing shapes.
const VENUE_STORE = '@/lib/services/venue-store';
const VENUE_TAGS = '@/lib/utils/venue-tags';

type VenueWithTags = { tags: string[] };

type VenueStoreModule = {
  // Post-implementation these carry `tags` on the returned DTO/StoredVenue.
  getVenues: () => Promise<Array<Record<string, unknown> & { slug?: string; tags?: string[] }>>;
  VENUE_SELECT_COLUMNS: string;
};

type VenueTagsModule = {
  collectTags: (venues: VenueWithTags[]) => string[];
  filterVenuesByTags: <T extends VenueWithTags>(
    venues: T[],
    activeTags: ReadonlySet<string> | readonly string[],
  ) => T[];
  localizeTag: (tag: string, locale: 'sv' | 'en') => string;
};

async function loadVenueStore(): Promise<VenueStoreModule> {
  return (await import(/* @vite-ignore */ VENUE_STORE)) as unknown as VenueStoreModule;
}
async function loadVenueTags(): Promise<VenueTagsModule> {
  return (await import(/* @vite-ignore */ VENUE_TAGS)) as unknown as VenueTagsModule;
}

// ---------------------------------------------------------------------------
// A. DTO carries real tags from the DB adapter (AC1)
// ---------------------------------------------------------------------------

// Two DB rows: one with a real tag array, one with a NULL tags column (graceful
// empty). Only the columns the mapper reads matter — the rest can be minimal.
const ROW_WITH_TAGS = {
  id: '1',
  slug: 'test-venue-sunny',
  venue_name: 'Kafé Magasinet',
  neighborhood: 'Inom Vallgraven',
  lat: 57.7,
  lng: 11.97,
  hidden: false,
  is_partner: false,
  confidence: 92,
  sun_exposure_percent: 95,
  current_sun_status: 'Sunny',
  tags: ['Innergård', 'Hund ok', 'Wifi', 'Bakverk'],
};
const ROW_WITH_NULL_TAGS = {
  id: '6',
  slug: 'skuggans-hus',
  venue_name: 'Skuggans Hus',
  neighborhood: 'Haga',
  lat: 57.7,
  lng: 11.95,
  hidden: false,
  is_partner: false,
  confidence: 80,
  sun_exposure_percent: 10,
  current_sun_status: 'Shaded',
  tags: null,
};

describe('Story 9.7 AC1 — venue DTO carries real tags from the DB adapter (RED)', () => {
  const ORIGINAL_STORE_ENV = process.env.SUNNYSEAT_VENUE_STORE;
  const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const ORIGINAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    vi.resetModules();
    // Force the Supabase read path so getVenues() maps rows through fromVenueRow.
    process.env.SUNNYSEAT_VENUE_STORE = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';

    // Mock the ADAPTER boundary (per the dynamic-import-bypass lesson): stub
    // getSupabaseServiceRole().from('venues').select(cols) to resolve our rows.
    vi.doMock('@/lib/supabase/server', () => ({
      getSupabaseServiceRole: () => ({
        from: () => ({
          select: () => {
            const query = {
              eq: () => query,
              is: () =>
                Promise.resolve({ data: [ROW_WITH_TAGS, ROW_WITH_NULL_TAGS], error: null }),
            };
            return query;
          },
        }),
      }),
    }));
  });

  afterEach(() => {
    vi.doUnmock('@/lib/supabase/server');
    vi.resetModules();
    process.env.SUNNYSEAT_VENUE_STORE = ORIGINAL_STORE_ENV;
    process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = ORIGINAL_KEY;
  });

  it('selects the `tags` column (VENUE_SELECT_COLUMNS includes it)', async () => {
    const { VENUE_SELECT_COLUMNS } = await loadVenueStore();
    expect(VENUE_SELECT_COLUMNS).toContain('tags');
  });

  it('surfaces each venue real tag array from the store row (NOT the placeholder)', async () => {
    const { getVenues } = await loadVenueStore();
    const venues = await getVenues();

    const sunny = venues.find((v) => v.slug === 'test-venue-sunny');
    expect(sunny?.tags).toEqual(['Innergård', 'Hund ok', 'Wifi', 'Bakverk']);
  });

  it('maps a NULL tags column to [] (graceful-empty — never undefined, never a crash)', async () => {
    const { getVenues } = await loadVenueStore();
    const venues = await getVenues();

    const shade = venues.find((v) => v.slug === 'skuggans-hus');
    expect(shade?.tags).toEqual([]);
    // Every venue exposes `tags` as an array (required DTO field).
    for (const v of venues) {
      expect(Array.isArray(v.tags)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// B. Tag-filter + union util (AC3 / AC4 / AC5)
// ---------------------------------------------------------------------------

const VENUES: VenueWithTags[] = [
  { tags: ['Innergård', 'Hund ok', 'Wifi', 'Bakverk'] }, // 0
  { tags: ['Morgonsol', 'Take-away', 'Surdeg'] }, // 1
  { tags: ['Kanal', 'Skaldjur'] }, // 2
  { tags: ['Innergård', 'Hund ok'] }, // 3 — shares Innergård + Hund ok with 0
  { tags: [] }, // 4 — graceful-empty venue (no tags)
];

describe('Story 9.7 AC2/AC3/AC4 — tag-filter + union helpers (RED)', () => {
  it('collectTags returns the allTags UNION in first-seen order (AC2)', async () => {
    const { collectTags } = await loadVenueTags();
    expect(collectTags(VENUES)).toEqual([
      'Innergård',
      'Hund ok',
      'Wifi',
      'Bakverk',
      'Morgonsol',
      'Take-away',
      'Surdeg',
      'Kanal',
      'Skaldjur',
    ]);
  });

  it('0 active tags → pass-through ALL venues incl. the empty-tags one (AC4 no-op)', async () => {
    const { filterVenuesByTags } = await loadVenueTags();
    expect(filterVenuesByTags(VENUES, new Set())).toEqual(VENUES);
  });

  it('1 active tag → only venues whose tags include it (empty-tags venue hidden)', async () => {
    const { filterVenuesByTags } = await loadVenueTags();
    const result = filterVenuesByTags(VENUES, new Set(['Innergård']));
    // Venues 0 and 3 carry Innergård; the empty-tags venue (4) is now hidden.
    expect(result).toEqual([VENUES[0], VENUES[3]]);
  });

  it('multi-select intersects the selection = OR/union (a venue matches ANY active tag) (AC3)', async () => {
    const { filterVenuesByTags } = await loadVenueTags();
    // Innergård (venues 0,3) OR Kanal (venue 2) → union {0,2,3}, source order preserved.
    const result = filterVenuesByTags(VENUES, new Set(['Innergård', 'Kanal']));
    expect(result).toEqual([VENUES[0], VENUES[2], VENUES[3]]);
  });

  it('no venue matches → [] (empty-result state; the existing list-empty copy renders) (AC3)', async () => {
    const { filterVenuesByTags } = await loadVenueTags();
    expect(filterVenuesByTags(VENUES, new Set(['NoSuchTag']))).toEqual([]);
  });
});

describe('Story 9.7 AC5 — localizeTag copy casing consistent across sv/en (RED)', () => {
  it('sv passes the canonical stored value through unchanged', async () => {
    const { localizeTag } = await loadVenueTags();
    expect(localizeTag('Innergård', 'sv')).toBe('Innergård');
    expect(localizeTag('Wifi', 'sv')).toBe('Wifi');
  });

  it('en maps the canonical value to the display label with consistent casing', async () => {
    const { localizeTag } = await loadVenueTags();
    // Values already exist in venue-visual-metadata.ts; casing must match the
    // shipped i18n (Wi-Fi, Courtyard) — never a truncated/wrong-cased label.
    expect(localizeTag('Wifi', 'en')).toBe('Wi-Fi');
    expect(localizeTag('Innergård', 'en')).toBe('Courtyard');
    expect(localizeTag('Hund ok', 'en')).toBe('Dogs ok');
  });

  it('never yields a truncated "Takt" — full words only (AC5 defensive)', async () => {
    const { localizeTag } = await loadVenueTags();
    // No seeded venue carries a rooftop tag, but if one is ever added the label
    // must be the full word, not the truncated placeholder.
    expect(localizeTag('Takterrass', 'sv')).toBe('Takterrass');
    expect(localizeTag('Takterrass', 'en')).not.toBe('Takt');
  });
});
