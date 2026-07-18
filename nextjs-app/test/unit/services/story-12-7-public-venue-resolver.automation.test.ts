import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolvePublicVenueIdentifier } from '@/lib/services/venue-store';

type VenueRow = {
  id: string;
  slug: string;
  venue_name: string;
  neighborhood: string;
  lat: number;
  lng: number;
  is_partner: boolean;
  is_hidden?: boolean | null;
  hidden?: boolean | null;
  visibility?: string | null;
  deleted_at?: string | null;
  current_sun_status?: string | null;
  confidence?: number | null;
  sun_exposure_percent?: number | null;
  tags?: string[] | null;
};

const supabaseMock = vi.hoisted(() => {
  const state = {
    nextResults: [] as Array<{ data: VenueRow | null; error: { message: string } | null }>,
    lastFilter: '',
    lastSelect: '',
  };

  const maybeSingle = vi.fn(async () => {
    const next = state.nextResults.shift();
    return next ?? { data: null, error: null };
  });
  const or = vi.fn((filter: string) => {
    state.lastFilter = filter;
    return { maybeSingle };
  });
  const select = vi.fn((columns: string) => {
    state.lastSelect = columns;
    return { or };
  });
  const from = vi.fn((table: string) => {
    if (table !== 'venues') throw new Error(`unexpected table ${table}`);
    return { select };
  });

  return { state, from, select, or, maybeSingle };
});

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: () => ({
    from: supabaseMock.from,
  }),
}));

const LIVE_ROW: VenueRow = {
  id: '8',
  slug: 'live-zero-review',
  venue_name: 'Live Zero Review',
  neighborhood: 'Centrum',
  lat: 57.706,
  lng: 11.971,
  is_partner: false,
  is_hidden: false,
  visibility: 'public',
  deleted_at: null,
  current_sun_status: 'NoSun',
  confidence: 76,
  sun_exposure_percent: 0,
  tags: [],
};

function useSupabaseVenueStore() {
  vi.stubEnv('SUNNYSEAT_VENUE_STORE', 'supabase');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
}

describe('Story 12.7 automated resolver coverage', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    useSupabaseVenueStore();
    supabaseMock.state.nextResults = [];
    supabaseMock.state.lastFilter = '';
    supabaseMock.state.lastSelect = '';
    supabaseMock.from.mockClear();
    supabaseMock.select.mockClear();
    supabaseMock.or.mockClear();
    supabaseMock.maybeSingle.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('[P0] resolves live id and slug through the same quoted Supabase filter contract', async () => {
    supabaseMock.state.nextResults = [
      { data: LIVE_ROW, error: null },
      { data: LIVE_ROW, error: null },
    ];

    const byId = await resolvePublicVenueIdentifier('8');
    const bySlug = await resolvePublicVenueIdentifier('live-zero-review');

    expect(byId).toMatchObject({ id: '8', slug: 'live-zero-review' });
    expect(bySlug).toMatchObject({ id: '8', slug: 'live-zero-review' });
    expect(supabaseMock.or).toHaveBeenNthCalledWith(
      1,
      'id.eq."8",slug.eq."8"',
    );
    expect(supabaseMock.or).toHaveBeenNthCalledWith(
      2,
      'id.eq."live-zero-review",slug.eq."live-zero-review"',
    );
    expect(supabaseMock.state.lastSelect).toContain('is_hidden');
    expect(supabaseMock.state.lastSelect).toContain('visibility');
    expect(supabaseMock.state.lastSelect).toContain('deleted_at');
  });

  it('[P0] quotes reserved PostgREST tokens so user identifiers stay literal', async () => {
    supabaseMock.state.nextResults = [{ data: null, error: null }];

    await expect(resolvePublicVenueIdentifier('a","b\\c,(x)')).resolves.toBeNull();

    expect(supabaseMock.or).toHaveBeenCalledWith(
      'id.eq."a\\",\\"b\\\\c,(x)",slug.eq."a\\",\\"b\\\\c,(x)"',
    );
  });

  it('[P0] rejects hidden, legacy-hidden, private-visibility, and deleted rows after lookup', async () => {
    const privateRows = [
      { ...LIVE_ROW, id: '9', slug: 'private-is-hidden', is_hidden: true },
      { ...LIVE_ROW, id: '10', slug: 'private-hidden', hidden: true },
      { ...LIVE_ROW, id: '11', slug: 'private-visibility', visibility: ' hidden ' },
      { ...LIVE_ROW, id: '12', slug: 'private-deleted', deleted_at: '2026-07-18T00:00:00.000Z' },
    ];

    for (const row of privateRows) {
      supabaseMock.state.nextResults = [{ data: row, error: null }];
      await expect(resolvePublicVenueIdentifier(row.slug)).resolves.toBeNull();
    }
    expect(supabaseMock.maybeSingle).toHaveBeenCalledTimes(privateRows.length);
  });

  it('[P1] returns public DTO fields without leaking server-only visibility columns', async () => {
    supabaseMock.state.nextResults = [{ data: LIVE_ROW, error: null }];

    const venue = await resolvePublicVenueIdentifier('live-zero-review');

    expect(venue).toMatchObject({
      id: '8',
      venueId: '8',
      slug: 'live-zero-review',
      venueSlug: 'live-zero-review',
    });
    expect(venue).not.toHaveProperty('is_hidden');
    expect(venue).not.toHaveProperty('hidden');
    expect(venue).not.toHaveProperty('visibility');
    expect(venue).not.toHaveProperty('deleted_at');
  });

  it('[P1] does not cache misses or share in-flight resolver state across visibility changes', async () => {
    supabaseMock.state.nextResults = [
      { data: null, error: null },
      { data: { ...LIVE_ROW, id: '13', slug: 'late-visible' }, error: null },
    ];

    await expect(resolvePublicVenueIdentifier('late-visible')).resolves.toBeNull();
    await expect(resolvePublicVenueIdentifier('late-visible'))
      .resolves.toMatchObject({ id: '13', slug: 'late-visible' });
    expect(supabaseMock.maybeSingle).toHaveBeenCalledTimes(2);
  });

  it('[P1] fails closed for Supabase identity collisions and propagates real store errors', async () => {
    supabaseMock.state.nextResults = [
      { data: null, error: { message: 'multiple rows returned' } },
      { data: null, error: { message: 'connection refused' } },
    ];

    await expect(resolvePublicVenueIdentifier('8')).resolves.toBeNull();
    await expect(resolvePublicVenueIdentifier('8')).rejects.toThrow(
      'Venue store failed: connection refused',
    );
  });
});
