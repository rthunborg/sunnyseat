import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { normalizeVenueForResponse } from '@/lib/services/venues-fixture';
import { toVenueData, type StoredVenue } from '@/lib/services/venue-store';
import type { VenueDataDto } from '@/lib/types/api';
import {
  buildVenueMediaPublicUrl,
  normalizeVenueMediaRenditionUrl,
} from '@/lib/utils/venue-media';

const SUPABASE_ORIGIN = 'https://sunnyseat.supabase.co';
const CARD_URL =
  `${SUPABASE_ORIGIN}/storage/v1/object/public/venue-media/test-venue-sunny/v2026-07/card.webp`;
const HERO_URL =
  `${SUPABASE_ORIGIN}/storage/v1/object/public/venue-media/test-venue-sunny/v2026-07/hero.webp`;
const LEGACY_URL = 'https://example.com/legacy.jpg';

const thumbnailWithRenditions = {
  alt: 'Uteservering hos Kafe Magasinet',
  initials: 'KM',
  cardUrl: CARD_URL,
  heroUrl: HERO_URL,
  url: LEGACY_URL,
};

const baseVenue: VenueDataDto = {
  id: '1',
  venueId: '1',
  venueName: 'Kafe Magasinet',
  venueSlug: 'test-venue-sunny',
  slug: 'test-venue-sunny',
  neighborhood: 'Linne',
  location: { lat: 57.705, lng: 11.97 },
  currentSunStatus: 'Sunny',
  weatherGateState: 'not_gated',
  skyCondition: 'clear',
  isPartner: false,
  confidence: 92,
  distanceMeters: 420,
  sunExposurePercent: 95,
  tags: [],
  thumbnail: thumbnailWithRenditions,
};

function venueWithThumbnail(thumbnail: unknown): VenueDataDto {
  return {
    ...baseVenue,
    thumbnail: thumbnail as VenueDataDto['thumbnail'],
  };
}

describe('Story 12.12 ATDD - venue media DTO and sanitizer contract', () => {
  it('[P0] normalizes valid Supabase cardUrl and heroUrl without mutating public object URLs', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_ORIGIN);

    const normalized = normalizeVenueForResponse(baseVenue);

    expect(normalized.thumbnail).toEqual({
      alt: 'Uteservering hos Kafe Magasinet',
      initials: 'KM',
      cardUrl: CARD_URL,
      heroUrl: HERO_URL,
      url: LEGACY_URL,
    });
  });

  it('[P0] preserves legacy url-only rows as the read fallback during rollout', () => {
    const normalized = normalizeVenueForResponse(
      venueWithThumbnail({
        alt: 'Legacy patio',
        initials: 'LP',
        url: LEGACY_URL,
      }),
    );

    expect(normalized.thumbnail).toEqual({
      alt: 'Legacy patio',
      initials: 'LP',
      url: LEGACY_URL,
    });
  });

  it('[P0] drops malformed optional media URL fields while retaining alt and initials fallback data', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_ORIGIN);

    const normalized = normalizeVenueForResponse(
      venueWithThumbnail({
        alt: '  Venue patio  ',
        initials: ' vp ',
        cardUrl: 'not a url',
        heroUrl: 'ftp://sunnyseat.supabase.co/storage/v1/object/public/venue-media/test-venue-sunny/v1/hero.webp',
        url: 'javascript:alert(1)',
      }),
    );

    expect(normalized.thumbnail).toEqual({
      alt: 'Venue patio',
      initials: 'VP',
    });
  });

  it('[P0] rejects new cardUrl and heroUrl values outside the configured Supabase venue-media convention', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_ORIGIN);

    const wrongOrigin = `${SUPABASE_ORIGIN.replace('sunnyseat', 'other')}/storage/v1/object/public/venue-media/test-venue-sunny/v2026-07/card.webp`;
    const wrongBucket = `${SUPABASE_ORIGIN}/storage/v1/object/public/external-media/test-venue-sunny/v2026-07/hero.webp`;
    const wrongKey = `${SUPABASE_ORIGIN}/storage/v1/object/public/venue-media/test-venue-sunny/v2026-07/original.jpg`;

    const normalized = normalizeVenueForResponse(
      venueWithThumbnail({
        alt: 'Venue patio',
        initials: 'VP',
        cardUrl: wrongOrigin,
        heroUrl: wrongBucket,
        url: wrongKey,
      }),
    );

    expect(normalized.thumbnail).toEqual({
      alt: 'Venue patio',
      initials: 'VP',
      url: wrongKey,
    });
    expect(normalized.thumbnail).not.toHaveProperty('cardUrl');
    expect(normalized.thumbnail).not.toHaveProperty('heroUrl');
  });

  it('[P0] enforces exact public object paths without query, hash, empty segments, or rendition drift', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_ORIGIN);

    expect(
      buildVenueMediaPublicUrl({
        origin: SUPABASE_ORIGIN,
        slug: 'test-venue-sunny',
        mediaVersion: 'v2026-07',
        rendition: 'card',
      }),
    ).toBe(CARD_URL);

    for (const value of [
      `${CARD_URL}?download=1`,
      `${CARD_URL}#preview`,
      `${SUPABASE_ORIGIN}/storage/v1/object/public/venue-media//test-venue-sunny/v2026-07/card.webp`,
      `${SUPABASE_ORIGIN}/storage/v1/object/public/venue-media/test-venue-sunny/v2026-07/hero.webp`,
      `${SUPABASE_ORIGIN}/storage/v1/object/public/venue-media/test-venue-sunny/v2026-07/card.webp/`,
    ]) {
      expect(
        normalizeVenueMediaRenditionUrl(value, {
          slug: 'test-venue-sunny',
          rendition: 'card',
          supabaseUrl: SUPABASE_ORIGIN,
        }),
      ).toBeUndefined();
    }
  });

  it('[P0] toVenueData preserves the additive media contract and leaks no storage metadata', () => {
    const stored = {
      ...baseVenue,
      thumbnail: thumbnailWithRenditions,
      description: 'Detail only',
      address: 'Detail address',
      storageObjectId: 'private-storage-object-id',
    } as StoredVenue & { storageObjectId: string };

    const dto = toVenueData(stored);

    expect(dto.thumbnail).toEqual(thumbnailWithRenditions);
    expect(dto).not.toHaveProperty('storageObjectId');
    expect(dto).not.toHaveProperty('description');
    expect(dto).not.toHaveProperty('address');
  });

  it('[P0] shared client-safe selection helpers prevent VenueCard, VenueQuickInfo, and detail hero drift', async () => {
    const mediaModulePath = '@/lib/utils/venue-media';
    const media = await import(mediaModulePath);

    expect(media.selectVenueCardImageUrl(thumbnailWithRenditions)).toBe(CARD_URL);
    expect(media.selectVenueHeroImageUrl(thumbnailWithRenditions)).toBe(HERO_URL);
    expect(media.selectVenueCardImageUrl({ ...thumbnailWithRenditions, cardUrl: undefined })).toBe(LEGACY_URL);
    expect(media.selectVenueHeroImageUrl({ ...thumbnailWithRenditions, heroUrl: undefined })).toBe(LEGACY_URL);
  });

  it('[P0] deterministic photo-loaded forced state uses managed Storage URLs, not inline data URLs', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_ORIGIN);
    const forced = await import('@/components/custom/venue/forced-venue-detail');

    const loaded = forced.resolveForcedVisualVenueDetail(
      'test-venue-sunny',
      'venue-photo-loaded',
    );
    const fallback = forced.resolveForcedVisualVenueDetail(
      'test-venue-sunny',
      'venue-photo-fallback',
    );

    expect(loaded?.thumbnail?.cardUrl).toBe(CARD_URL);
    expect(loaded?.thumbnail?.heroUrl).toBe(HERO_URL);
    expect(loaded?.thumbnail?.cardUrl).not.toMatch(/^data:image\/webp;base64,/);
    expect(fallback?.thumbnail?.cardUrl).toBe(
      `${SUPABASE_ORIGIN}/storage/v1/object/public/venue-media/test-venue-sunny/v2026-07-missing/card.webp`,
    );
  });

  it('[P0] active runtime sources do not reintroduce external legacy photo hosts', async () => {
    const runtimeSources = [
      'lib/services/venues-fixture.ts',
      'components/custom/venue/forced-venue-detail.ts',
      'components/composed/venue/VenueCard.tsx',
      'components/composed/venue/VenueQuickInfo.tsx',
      'components/composed/venue/VenueDetailContent.tsx',
    ];
    const disallowedLegacyHosts =
      /images\.unsplash|unsplash\.com|googleusercontent|maps\.google|place-photo|pexels|pixabay/i;

    for (const source of runtimeSources) {
      const content = await readFile(path.join(process.cwd(), source), 'utf8');
      expect(content, `${source} must not hotlink legacy venue photos`).not.toMatch(
        disallowedLegacyHosts,
      );
    }
  });
});
