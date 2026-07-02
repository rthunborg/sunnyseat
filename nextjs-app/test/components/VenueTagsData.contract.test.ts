/**
 * Story 9.7 (Tag Filtering) — coverage EXPANSION beyond the ATDD acceptance
 * scaffolds. These tests close genuine gaps the existing suites do not assert:
 *
 *  1. OR-vs-AND MONOTONIC-WIDENING guard (the key OR-vs-AND regression). The
 *     ATDD `VenueTagsData.atdd` block asserts the final union for one fixed
 *     multi-chip selection, but NOT the structural invariant that most directly
 *     distinguishes OR from AND: adding a chip to an active selection can only
 *     GROW (or hold) the result — never shrink it — and every single-chip result
 *     is a subset of the multi-chip result. An accidental AND (intersection)
 *     implementation narrows on the second chip; these assertions catch that.
 *
 *  2. Every SEEDED tag round-trips through `localizeTag` with consistent casing
 *     and no truncation. The ATDD block spot-checks 3 tags; the seed carries 15
 *     canonical tags (sourced from the real `VENUE_FIXTURE`). This proves the
 *     whole shipped set is sv-identity + en-mapped, distinct, non-empty, and
 *     never a truncated label (AC5 — "Takterrass" not "Takt").
 *
 *  3. `collectTags` over the REAL 7-venue seeded `VENUE_FIXTURE` yields the exact
 *     deterministic first-seen union that drives the desktop chip row. The ATDD
 *     block uses a synthetic 5-venue array; this guards the actual seed↔chip-row
 *     contract (the union the app renders) against seed drift.
 *
 *  4. Graceful-empty interaction over the real fixture: an untagged venue never
 *     contributes a chip to the union and is excluded the moment any chip is
 *     active (AC1/AC4), while the 0-active default still shows it.
 *
 * Deterministic pure-function assertions only — NO wall-clock, NO timers, NO
 * network. Does not duplicate the ATDD/MapView/venue-store assertions. Stays
 * clear of Story 9.10's regression/Playwright scope.
 */
import { describe, it, expect } from 'vitest';
import { collectTags, filterVenuesByTags, localizeTag } from '@/lib/utils/venue-tags';
import { VENUE_FIXTURE } from '@/lib/services/venues-fixture';

type VenueWithTags = { tags: string[] };

// The exact canonical (sv) seed set, sourced from the story Dev Notes §"Seed
// values" and byte-identical to `VENUE_FIXTURE`. First-seen order across ids 1-7.
const SEED_TAGS_UNION_FIRST_SEEN = [
  'Innergård',
  'Hund ok',
  'Wifi',
  'Bakverk',
  'Morgonsol',
  'Take-away',
  'Surdeg',
  'Kanal',
  'Skaldjur',
  'Parasoller',
  'Specialkaffe',
  'Svalt',
  'Lunch',
  'Bakgård',
  'Kväll',
];

// Every canonical seeded tag → its expected English DISPLAY (from the placeholder
// `venue-visual-metadata.ts`, the deterministic source). Consistent casing, full
// words — never a truncation.
const SEED_TAG_EN_DISPLAY: Record<string, string> = {
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
};

describe('Story 9.7 — OR-vs-AND monotonic-widening guard (the key multi-chip invariant)', () => {
  // Venues chosen so a second chip strictly ADDS matches: only OR grows the set.
  const venues: VenueWithTags[] = [
    { tags: ['Innergård', 'Hund ok'] }, // 0 — Innergård only
    { tags: ['Kanal'] }, // 1 — Kanal only (disjoint from Innergård)
    { tags: ['Innergård'] }, // 2 — Innergård only
    { tags: ['Skaldjur'] }, // 3 — matches neither chip below
    { tags: [] }, // 4 — untagged (graceful-empty)
  ];

  it('toggling a SECOND chip WIDENS the result — it never narrows it (OR, not AND)', () => {
    const oneChip = filterVenuesByTags(venues, new Set(['Innergård']));
    const twoChips = filterVenuesByTags(venues, new Set(['Innergård', 'Kanal']));

    // One chip → the two Innergård venues. Two chips → those PLUS the Kanal one.
    expect(oneChip).toEqual([venues[0], venues[2]]);
    expect(twoChips).toEqual([venues[0], venues[1], venues[2]]);

    // The strict invariant: adding a chip can only grow (or hold) the set.
    expect(twoChips.length).toBeGreaterThan(oneChip.length);
    // Every one-chip match is still present after the second chip is added.
    for (const venue of oneChip) {
      expect(twoChips).toContain(venue);
    }
    // Under an accidental AND, {Innergård, Kanal} would intersect to [] — assert
    // we are emphatically NOT that.
    expect(twoChips).not.toHaveLength(0);
  });

  it('each single-chip result is a SUBSET of the union of both single-chip results', () => {
    const a = filterVenuesByTags(venues, new Set(['Innergård']));
    const b = filterVenuesByTags(venues, new Set(['Kanal']));
    const union = filterVenuesByTags(venues, new Set(['Innergård', 'Kanal']));

    for (const venue of a) expect(union).toContain(venue);
    for (const venue of b) expect(union).toContain(venue);
    // The union has exactly the distinct members of A ∪ B (no double-count, no drop).
    const expectedSize = new Set([...a, ...b]).size;
    expect(union).toHaveLength(expectedSize);
  });

  it('a third disjoint chip keeps widening monotonically', () => {
    const sizes = [
      filterVenuesByTags(venues, new Set(['Innergård'])).length,
      filterVenuesByTags(venues, new Set(['Innergård', 'Kanal'])).length,
      filterVenuesByTags(venues, new Set(['Innergård', 'Kanal', 'Skaldjur'])).length,
    ];
    // Strictly non-decreasing (here strictly increasing: 2 → 3 → 4).
    expect(sizes[1]).toBeGreaterThanOrEqual(sizes[0]);
    expect(sizes[2]).toBeGreaterThanOrEqual(sizes[1]);
    expect(sizes).toEqual([2, 3, 4]);
  });
});

describe('Story 9.7 — collectTags over the REAL seeded VENUE_FIXTURE (seed↔chip-row contract)', () => {
  it('yields the exact deterministic first-seen union the chip row renders', () => {
    expect(collectTags(VENUE_FIXTURE as VenueWithTags[])).toEqual(SEED_TAGS_UNION_FIRST_SEEN);
  });

  it('the union is de-duped even though Innergård/Hund ok recur across venues', () => {
    const union = collectTags(VENUE_FIXTURE as VenueWithTags[]);
    expect(new Set(union).size).toBe(union.length);
    // "Innergård" and "Hund ok" appear on two venues each but only once in the row.
    expect(union.filter((t) => t === 'Innergård')).toHaveLength(1);
    expect(union.filter((t) => t === 'Hund ok')).toHaveLength(1);
  });
});

describe('Story 9.7 — an untagged venue is graceful-empty against the real fixture', () => {
  const untagged: VenueWithTags = { tags: [] };
  const withUntagged = [...(VENUE_FIXTURE as VenueWithTags[]), untagged];

  it('contributes NO chip to the union', () => {
    expect(collectTags(withUntagged)).toEqual(SEED_TAGS_UNION_FIRST_SEEN);
  });

  it('is shown with 0 active chips but excluded once any chip is active', () => {
    expect(filterVenuesByTags(withUntagged, new Set())).toContain(untagged);
    expect(filterVenuesByTags(withUntagged, new Set(['Innergård']))).not.toContain(untagged);
  });
});

describe('Story 9.7 — every SEEDED tag round-trips through localizeTag with consistent casing', () => {
  const seededTags = collectTags(VENUE_FIXTURE as VenueWithTags[]);

  it('collectTags returns exactly the 15 seeded canonical tags', () => {
    expect(seededTags).toHaveLength(15);
    expect(new Set(seededTags)).toEqual(new Set(Object.keys(SEED_TAG_EN_DISPLAY)));
  });

  it('sv is an identity round-trip for every seeded tag (no drift)', () => {
    for (const tag of seededTags) {
      expect(localizeTag(tag, 'sv')).toBe(tag);
    }
  });

  it('en maps every seeded tag to its full-word display with consistent casing', () => {
    for (const tag of seededTags) {
      const en = localizeTag(tag, 'en');
      expect(en).toBe(SEED_TAG_EN_DISPLAY[tag]);
      // Non-empty, and never a truncated label.
      expect(en.length).toBeGreaterThan(0);
      expect(en).not.toBe('Takt');
    }
  });

  it('produces distinct, non-empty en labels for every seeded tag (no collisions/truncation)', () => {
    const enLabels = seededTags.map((tag) => localizeTag(tag, 'en'));
    expect(new Set(enLabels).size).toBe(enLabels.length);
    for (const label of enLabels) {
      expect(label.trim()).not.toBe('');
    }
  });
});
