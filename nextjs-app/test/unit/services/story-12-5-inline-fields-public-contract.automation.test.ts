import { describe, expect, it } from 'vitest';
import { parseDevVenueEditorPatch } from '@/lib/services/dev-venue-editor-validation';
import { toVenueData, type StoredVenue } from '@/lib/services/venue-store';
import { localizeTag } from '@/lib/utils/venue-tags';

describe('Story 12.5 inline field public contract', () => {
  it('keeps unknown tag vocabulary legible through editor validation and tag localization fallback', () => {
    const unknownTag = 'Kvällssol deluxe';
    const parsed = parseDevVenueEditorPatch(
      { tags: [' Innergård ', unknownTag, unknownTag, ''] },
      {
        slug: 'test-venue-sunny',
        supabaseUrl: 'https://sunnyseat.supabase.co',
      },
    );

    expect(parsed).toMatchObject({
      ok: true,
      patch: {
        tags: ['Innergård', unknownTag],
      },
    });
    expect(localizeTag(unknownTag, 'sv')).toBe(unknownTag);
    expect(localizeTag(unknownTag, 'en')).toBe(unknownTag);
  });

  it('surfaces editor-safe tags and thumbnail on the public DTO without leaking editor-only fields', () => {
    const stored: StoredVenue = {
      id: '1',
      venueId: '1',
      venueName: 'Kafé Magasinet',
      venueSlug: 'test-venue-sunny',
      slug: 'test-venue-sunny',
      neighborhood: 'Inom Vallgraven',
      location: { lat: 57.7061, lng: 11.9712 },
      engineLocation: { lat: 57.705, lng: 11.97 },
      currentSunStatus: 'Sunny',
      weatherGateState: 'not_gated',
      isPartner: true,
      confidence: 92,
      distanceMeters: 0,
      sunExposurePercent: 95,
      tags: ['Innergård', 'Kvällssol deluxe'],
      description: 'Detaljtext ska inte finnas på list-DTO.',
      address: 'Tredje Långgatan 9, Göteborg',
      thumbnail: {
        alt: 'Uteservering hos Kafé Magasinet',
        initials: 'KM',
        cardUrl:
          'https://sunnyseat.supabase.co/storage/v1/object/public/venue-media/test-venue-sunny/v20260727/card.webp',
        heroUrl:
          'https://sunnyseat.supabase.co/storage/v1/object/public/venue-media/test-venue-sunny/v20260727/hero.webp',
      },
    };

    const dto = toVenueData(stored);

    expect(dto).toMatchObject({
      tags: ['Innergård', 'Kvällssol deluxe'],
      thumbnail: {
        alt: 'Uteservering hos Kafé Magasinet',
        initials: 'KM',
      },
    });
    expect(dto).not.toHaveProperty('engineLocation');
    expect(dto).not.toHaveProperty('description');
    expect(dto).not.toHaveProperty('address');
  });
});
