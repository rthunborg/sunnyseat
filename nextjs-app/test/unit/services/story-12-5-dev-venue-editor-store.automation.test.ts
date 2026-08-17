import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  patchDevEditorVenue,
} from '@/lib/services/dev-venue-editor-store';

const supabaseMock = vi.hoisted(() => {
  type QueryResult = { data: unknown; error: { message: string } | null };
  const state = {
    resolveResult: { data: [], error: null } as QueryResult,
    readByIdResult: { data: null, error: null } as QueryResult,
    rpcResult: { data: true, error: null } as QueryResult,
    storageResults: new Map<string, QueryResult>(),
  };
  const limit = vi.fn(() => Promise.resolve(state.resolveResult));
  const or = vi.fn(() => ({ limit }));
  const maybeSingle = vi.fn(() => Promise.resolve(state.readByIdResult));
  const eq = vi.fn(() => ({ maybeSingle }));
  const order = vi.fn(() => Promise.resolve({ data: [], error: null }));
  const select = vi.fn(() => ({ or, eq, order }));
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn(() => Promise.resolve(state.rpcResult));
  const list = vi.fn((prefix: string, options?: { search?: string }) => {
    if (options?.search) {
      const key = `${prefix}/${options.search}`;
      return Promise.resolve(
        state.storageResults.get(key) ?? { data: [], error: null },
      );
    }
    const files = [...state.storageResults.entries()]
      .filter(([key]) => key.startsWith(`${prefix}/`))
      .flatMap(([, result]) => Array.isArray(result.data) ? result.data : []);
    return Promise.resolve({ data: files, error: null });
  });
  const storageFrom = vi.fn(() => ({ list }));
  const client = { from, rpc, storage: { from: storageFrom } };
  return {
    state,
    client,
    from,
    select,
    or,
    limit,
    eq,
    maybeSingle,
    order,
    rpc,
    storageFrom,
    list,
  };
});

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: () => supabaseMock.client,
}));

const CURRENT_ROW = {
  id: '1',
  slug: 'test-venue-sunny',
  venue_name: 'Kafé Magasinet',
  lat: 57.705,
  lng: 11.97,
  display_lat: null,
  display_lng: null,
  hidden: false,
  seating_area: null,
  tags: ['Innergård'],
  description: null,
  thumbnail: null,
};

const VALID_RING = [
  [11.9700, 57.7050],
  [11.9704, 57.7050],
  [11.9704, 57.7053],
  [11.9700, 57.7053],
  [11.9700, 57.7050],
];

const SUPABASE_URL = 'https://sunnyseat.supabase.co';
const CARD_URL =
  `${SUPABASE_URL}/storage/v1/object/public/venue-media/test-venue-sunny/v20260727/card.webp`;
const HERO_URL =
  `${SUPABASE_URL}/storage/v1/object/public/venue-media/test-venue-sunny/v20260727/hero.webp`;

function resetSupabaseMocks() {
  supabaseMock.state.resolveResult = { data: [CURRENT_ROW], error: null };
  supabaseMock.state.readByIdResult = { data: CURRENT_ROW, error: null };
  supabaseMock.state.rpcResult = { data: true, error: null };
  supabaseMock.state.storageResults.clear();
  supabaseMock.from.mockClear();
  supabaseMock.select.mockClear();
  supabaseMock.or.mockClear();
  supabaseMock.limit.mockClear();
  supabaseMock.eq.mockClear();
  supabaseMock.maybeSingle.mockClear();
  supabaseMock.order.mockClear();
  supabaseMock.rpc.mockClear();
  supabaseMock.storageFrom.mockClear();
  supabaseMock.list.mockClear();
}

function storageFile(name: string, mimetype: string, size: number) {
  return {
    name,
    metadata: {
      mimetype,
      size,
    },
  };
}

describe('Story 12.5 dev venue editor store writes', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL);
    resetSupabaseMocks();
  });

  it('rejects invalid seating polygons before the RPC write', async () => {
    await expect(
      patchDevEditorVenue('test-venue-sunny', {
        seatingAreaText: JSON.stringify(VALID_RING.slice(0, 3)),
      }),
    ).rejects.toMatchObject({
      status: 400,
      errors: {
        seatingAreaText: expect.arrayContaining([expect.stringMatching(/at least four/i)]),
      },
    });

    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('writes valid seating polygons through the dirty geometry RPC seam', async () => {
    supabaseMock.state.readByIdResult = {
      data: {
        ...CURRENT_ROW,
        seating_area: { type: 'Polygon', coordinates: [VALID_RING] },
      },
      error: null,
    };

    const venue = await patchDevEditorVenue('test-venue-sunny', {
      seatingAreaText: JSON.stringify(VALID_RING),
    });

    expect(venue.seatingArea).toEqual({ type: 'Polygon', coordinates: [VALID_RING] });
    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      'apply_dev_venue_editor_patch',
      expect.objectContaining({
        p_venue_id: '1',
        p_update_seating_area: true,
        p_seating_area: { type: 'Polygon', coordinates: [VALID_RING] },
        p_dirty_reason: 'dev-venue-editor-seating-area',
      }),
    );
  });

  it('rejects thumbnail renditions with wrong Storage metadata before the venue row write', async () => {
    supabaseMock.state.storageResults.set(
      'test-venue-sunny/v20260727/card.webp',
      { data: [storageFile('card.webp', 'image/jpeg', 82_000)], error: null },
    );
    supabaseMock.state.storageResults.set(
      'test-venue-sunny/v20260727/hero.webp',
      { data: [storageFile('hero.webp', 'image/webp', 5_000_000)], error: null },
    );

    await expect(
      patchDevEditorVenue('test-venue-sunny', {
        thumbnail: {
          alt: 'Uteservering hos Kafé Magasinet',
          initials: 'KM',
          cardUrl: CARD_URL,
          heroUrl: HERO_URL,
        },
      }),
    ).rejects.toMatchObject({
      status: 400,
      errors: {
        'thumbnail.cardUrl': expect.arrayContaining([expect.stringMatching(/image\/webp/i)]),
        'thumbnail.heroUrl': expect.arrayContaining([expect.stringMatching(/at most/i)]),
      },
    });

    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('verifies managed card and hero renditions before writing inline thumbnail fields', async () => {
    supabaseMock.state.storageResults.set(
      'test-venue-sunny/v20260727/card.webp',
      { data: [storageFile('card.webp', 'image/webp', 82_000)], error: null },
    );
    supabaseMock.state.storageResults.set(
      'test-venue-sunny/v20260727/hero.webp',
      { data: [storageFile('hero.webp', 'image/webp', 240_000)], error: null },
    );
    supabaseMock.state.readByIdResult = {
      data: {
        ...CURRENT_ROW,
        thumbnail: {
          alt: 'Uteservering hos Kafé Magasinet',
          initials: 'KM',
          cardUrl: CARD_URL,
          heroUrl: HERO_URL,
        },
      },
      error: null,
    };

    const venue = await patchDevEditorVenue('test-venue-sunny', {
      thumbnail: {
        alt: ' Uteservering hos Kafé Magasinet ',
        initials: 'km',
        cardUrl: CARD_URL,
        heroUrl: HERO_URL,
      },
    });

    expect(venue.thumbnail).toMatchObject({
      alt: 'Uteservering hos Kafé Magasinet',
      initials: 'KM',
      cardUrl: CARD_URL,
      heroUrl: HERO_URL,
    });
    expect(supabaseMock.storageFrom).toHaveBeenCalledWith('venue-media');
    expect(supabaseMock.list).toHaveBeenCalledWith(
      'test-venue-sunny/v20260727',
      { limit: 100 },
    );
    expect(supabaseMock.list).toHaveBeenCalledWith(
      'test-venue-sunny/v20260727',
      { limit: 100 },
    );
    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      'apply_dev_venue_editor_patch',
      expect.objectContaining({
        p_update_thumbnail: true,
        p_thumbnail: {
          alt: 'Uteservering hos Kafé Magasinet',
          initials: 'KM',
          cardUrl: CARD_URL,
          heroUrl: HERO_URL,
        },
      }),
    );
  });

  it('requires each thumbnail URL to resolve to its exact rendition object', async () => {
    supabaseMock.state.storageResults.set(
      'test-venue-sunny/v20260727/hero.webp',
      { data: [storageFile('hero.webp', 'image/webp', 240_000)], error: null },
    );

    await expect(
      patchDevEditorVenue('test-venue-sunny', {
        thumbnail: {
          alt: 'Uteservering hos Kafé Magasinet',
          initials: 'KM',
          cardUrl: CARD_URL,
          heroUrl: HERO_URL,
        },
      }),
    ).rejects.toMatchObject({
      status: 400,
      errors: {
        'thumbnail.cardUrl': expect.arrayContaining([expect.stringMatching(/missing/i)]),
      },
    });

    expect(supabaseMock.rpc).not.toHaveBeenCalled();
    expect(supabaseMock.list).toHaveBeenCalledWith(
      'test-venue-sunny/v20260727',
      { limit: 100 },
    );
  });

  it('preserves an existing legacy thumbnail url fallback when writing editor-managed renditions', async () => {
    const legacyUrl = 'https://example.com/legacy-patio.jpg';
    supabaseMock.state.resolveResult = {
      data: [
        {
          ...CURRENT_ROW,
          thumbnail: {
            alt: 'Legacy patio',
            initials: 'LP',
            url: legacyUrl,
          },
        },
      ],
      error: null,
    };
    supabaseMock.state.storageResults.set(
      'test-venue-sunny/v20260727/card.webp',
      { data: [storageFile('card.webp', 'image/webp', 82_000)], error: null },
    );
    supabaseMock.state.readByIdResult = {
      data: {
        ...CURRENT_ROW,
        thumbnail: {
          alt: 'Uteservering hos Kafé Magasinet',
          initials: 'KM',
          cardUrl: CARD_URL,
          url: legacyUrl,
        },
      },
      error: null,
    };

    const venue = await patchDevEditorVenue('test-venue-sunny', {
      thumbnail: {
        alt: 'Uteservering hos Kafé Magasinet',
        initials: 'KM',
        cardUrl: CARD_URL,
      },
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      'apply_dev_venue_editor_patch',
      expect.objectContaining({
        p_update_thumbnail: true,
        p_thumbnail: {
          alt: 'Uteservering hos Kafé Magasinet',
          initials: 'KM',
          cardUrl: CARD_URL,
          url: legacyUrl,
        },
      }),
    );
    expect(venue.thumbnail).toMatchObject({
      cardUrl: CARD_URL,
      url: legacyUrl,
    });
  });
});
