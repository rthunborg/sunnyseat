import { describe, expect, it } from 'vitest';
import { parseDevVenueEditorPatch } from '@/lib/services/dev-venue-editor-validation';

const CONTEXT = {
  slug: 'test-venue-sunny',
  supabaseUrl: 'https://sunnyseat.supabase.co',
};

describe('Story 12.5 dev venue editor validation', () => {
  it('accepts display-only coordinates separately from seating geometry', () => {
    const parsed = parseDevVenueEditorPatch(
      {
        displayLocation: { lat: 57.7061, lng: 11.9712 },
        tags: [' Innergård ', 'Innergård', '', 'Wifi'],
        description: '  Uppdaterad uteservering.  ',
      },
      CONTEXT,
    );

    expect(parsed).toMatchObject({
      ok: true,
      patch: {
        displayLat: 57.7061,
        displayLng: 11.9712,
        tags: ['Innergård', 'Wifi'],
        description: 'Uppdaterad uteservering.',
        updateSeatingArea: false,
      },
    });
  });

  it('accepts a pasted GeoJSON Polygon, Feature, or raw ring only when it is closed, non-degenerate, and inside Gothenburg', () => {
    const polygon = parseDevVenueEditorPatch(
      {
        seatingAreaText: JSON.stringify({
          type: 'Polygon',
          coordinates: [[
            [11.9700, 57.7050],
            [11.9704, 57.7050],
            [11.9704, 57.7053],
            [11.9700, 57.7053],
            [11.9700, 57.7050],
          ]],
        }),
      },
      CONTEXT,
    );
    const feature = parseDevVenueEditorPatch(
      {
        seatingAreaText: JSON.stringify({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [11.9720, 57.7060],
              [11.9724, 57.7060],
              [11.9724, 57.7063],
              [11.9720, 57.7063],
              [11.9720, 57.7060],
            ]],
          },
        }),
      },
      CONTEXT,
    );
    const rawRing = parseDevVenueEditorPatch(
      {
        seatingAreaText: JSON.stringify([
          [11.9710, 57.7060],
          [11.9714, 57.7060],
          [11.9714, 57.7063],
          [11.9710, 57.7063],
          [11.9710, 57.7060],
        ]),
      },
      CONTEXT,
    );

    expect(polygon).toMatchObject({
      ok: true,
      patch: { updateSeatingArea: true, requiresGeometryDirty: true },
    });
    expect(feature).toMatchObject({
      ok: true,
      patch: { updateSeatingArea: true, requiresGeometryDirty: true },
    });
    expect(rawRing).toMatchObject({
      ok: true,
      patch: { updateSeatingArea: true, requiresGeometryDirty: true },
    });
  });

  it.each([
    {
      name: 'unclosed ring',
      seatingAreaText: JSON.stringify([
        [11.9700, 57.7050],
        [11.9704, 57.7050],
        [11.9704, 57.7053],
        [11.9700, 57.7053],
      ]),
      error: /closed/i,
    },
    {
      name: 'too few positions',
      seatingAreaText: JSON.stringify([
        [11.9700, 57.7050],
        [11.9704, 57.7050],
        [11.9700, 57.7050],
      ]),
      error: /at least four/i,
    },
    {
      name: 'likely lat/lng swap outside Gothenburg',
      seatingAreaText: JSON.stringify([
        [57.7050, 11.9700],
        [57.7054, 11.9700],
        [57.7054, 11.9703],
        [57.7050, 11.9703],
        [57.7050, 11.9700],
      ]),
      error: /Gothenburg/i,
    },
    {
      name: 'non-finite object input',
      seatingArea: [
        [11.9700, 57.7050],
        [Number.POSITIVE_INFINITY, 57.7050],
        [11.9704, 57.7053],
        [11.9700, 57.7050],
      ],
      error: /finite/i,
    },
    {
      name: 'malformed JSON',
      seatingAreaText: '[[11.9700,57.7050]',
      error: /valid JSON/i,
    },
    {
      name: 'degenerate outer ring',
      seatingAreaText: JSON.stringify([
        [11.9700, 57.7050],
        [11.9700, 57.7050],
        [11.9700, 57.7050],
        [11.9700, 57.7050],
      ]),
      error: /degenerate/i,
    },
    {
      name: 'invalid inner ring when holes are supplied',
      seatingAreaText: JSON.stringify({
        type: 'Polygon',
        coordinates: [
          [
            [11.9700, 57.7050],
            [11.9710, 57.7050],
            [11.9710, 57.7060],
            [11.9700, 57.7060],
            [11.9700, 57.7050],
          ],
          [
            [11.9702, 57.7052],
            [11.9704, 57.7052],
            [11.9704, 57.7054],
            [11.9702, 57.7055],
          ],
        ],
      }),
      error: /inner ring.*closed/i,
    },
  ])('rejects malformed pasted polygons: $name', ({ seatingArea, seatingAreaText, error }) => {
    const rejected = parseDevVenueEditorPatch(
      seatingAreaText !== undefined ? { seatingAreaText } : { seatingArea },
      CONTEXT,
    );

    expect(rejected).toMatchObject({
      ok: false,
      errors: {
        [seatingAreaText !== undefined ? 'seatingAreaText' : 'seatingArea']:
          expect.arrayContaining([expect.stringMatching(error)]),
      },
    });
  });

  it('rejects display coordinates outside Gothenburg with field-scoped errors', () => {
    const outOfBounds = parseDevVenueEditorPatch(
      {
        displayLocation: { lat: 59.0, lng: 11.9712 },
      },
      CONTEXT,
    );

    expect(outOfBounds).toMatchObject({
      ok: false,
      errors: { displayLocation: expect.arrayContaining([expect.stringMatching(/Gothenburg/i)]) },
    });
  });

  it('allows only managed Supabase media renditions and never accepts legacy external url writes', () => {
    const accepted = parseDevVenueEditorPatch(
      {
        thumbnail: {
          alt: 'Uteservering hos Kafé Magasinet',
          initials: 'KM',
          cardUrl:
            'https://sunnyseat.supabase.co/storage/v1/object/public/venue-media/test-venue-sunny/v20260727/card.webp',
          heroUrl:
            'https://sunnyseat.supabase.co/storage/v1/object/public/venue-media/test-venue-sunny/v20260727/hero.webp',
        },
      },
      CONTEXT,
    );
    const rejected = parseDevVenueEditorPatch(
      {
        thumbnail: {
          alt: 'Bad',
          initials: 'B',
          url: 'https://example.com/legacy.jpg',
        },
      },
      CONTEXT,
    );

    expect(accepted).toMatchObject({
      ok: true,
      patch: {
        thumbnail: {
          cardUrl:
            'https://sunnyseat.supabase.co/storage/v1/object/public/venue-media/test-venue-sunny/v20260727/card.webp',
          heroUrl:
            'https://sunnyseat.supabase.co/storage/v1/object/public/venue-media/test-venue-sunny/v20260727/hero.webp',
        },
      },
    });
    expect(rejected).toMatchObject({
      ok: false,
      errors: { thumbnail: expect.arrayContaining([expect.stringMatching(/legacy/i)]) },
    });
  });
});
