/**
 * ATDD RED-PHASE acceptance scaffolds - Story 12.5
 * Dev editor text, tags, and Story 12.12 media contract preservation.
 */

import { describe, expect, test, vi } from 'vitest';

type ThumbnailEditorInput = {
  alt?: string;
  initials?: string;
  cardUrl?: string;
  heroUrl?: string;
  url?: string;
};

type PlannedEditorMediaModule = {
  normalizeEditorTags: (input: unknown) => string[];
  normalizeEditorDescription: (input: unknown) => string | null;
  validateEditorThumbnail: (input: ThumbnailEditorInput, storage: unknown) => Promise<unknown>;
};

async function loadPlannedEditorMediaModule(): Promise<PlannedEditorMediaModule> {
  throw new Error('RED: implement editor media validation and import it here.');
}

const supabaseOrigin = 'https://sunnyseat.supabase.co';
const cardUrl =
  `${supabaseOrigin}/storage/v1/object/public/venue-media/test-venue-sunny/v2026-07/card.webp`;
const heroUrl =
  `${supabaseOrigin}/storage/v1/object/public/venue-media/test-venue-sunny/v2026-07/hero.webp`;

describe.skip('Story 12.5 ATDD - media and inline field editor contract', () => {
  test('[P1] tags trim, remove empties, dedupe case-insensitively, and preserve clean Swedish display text', async () => {
    const editor = await loadPlannedEditorMediaModule();

    expect(editor.normalizeEditorTags(['  Soligt ', 'soligt', '', 'Uteservering'])).toEqual([
      'Soligt',
      'Uteservering',
    ]);
  });

  test('[P1] description is bounded, trimmed, nullable, and not accepted as unbounded HTML', async () => {
    const editor = await loadPlannedEditorMediaModule();

    expect(editor.normalizeEditorDescription('  Kort beskrivning.  ')).toBe('Kort beskrivning.');
    expect(editor.normalizeEditorDescription('   ')).toBeNull();
    expect(() => editor.normalizeEditorDescription('<script>alert(1)</script>'.repeat(200))).toThrow(
      /description.*length|html/i,
    );
  });

  test('[P0] new editor-created cardUrl and heroUrl must be exact Story 12.12 Supabase venue-media renditions', async () => {
    const editor = await loadPlannedEditorMediaModule();
    const storage = {
      headObject: vi.fn(async () => ({
        contentType: 'image/webp',
        byteLength: 82_000,
      })),
    };

    await expect(editor.validateEditorThumbnail({
      alt: 'Uteservering hos Kafe Magasinet',
      initials: 'KM',
      cardUrl,
      heroUrl,
    }, storage)).resolves.toMatchObject({
      alt: 'Uteservering hos Kafe Magasinet',
      initials: 'KM',
      cardUrl,
      heroUrl,
    });
  });

  test('[P0] editor rejects wrong origin, bucket, slug, version, rendition, content-type, or byte limit', async () => {
    const editor = await loadPlannedEditorMediaModule();
    const storage = { headObject: vi.fn(async () => ({ contentType: 'image/jpeg', byteLength: 500_000 })) };

    await expect(editor.validateEditorThumbnail({
      alt: 'Venue',
      initials: 'VP',
      cardUrl: cardUrl.replace('sunnyseat', 'other'),
    }, storage)).rejects.toThrow(/venue-media|origin/i);
    await expect(editor.validateEditorThumbnail({
      alt: 'Venue',
      initials: 'VP',
      heroUrl: heroUrl.replace('/hero.webp', '/original.webp'),
    }, storage)).rejects.toThrow(/rendition/i);
    await expect(editor.validateEditorThumbnail({
      alt: 'Venue',
      initials: 'VP',
      cardUrl,
    }, storage)).rejects.toThrow(/content-type|byte/i);
  });

  test('[P0] legacy external thumbnail.url remains read fallback only and cannot be created by the editor', async () => {
    const editor = await loadPlannedEditorMediaModule();

    await expect(editor.validateEditorThumbnail({
      alt: 'Legacy',
      initials: 'LG',
      url: 'https://example.com/legacy.jpg',
    }, {})).rejects.toThrow(/legacy.*read/i);
  });
});
