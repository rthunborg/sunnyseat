/**
 * ATDD RED-PHASE acceptance tests - Story 12.7
 * Shared public venue identity resolver for reviews and feedback routes.
 *
 * These tests are intentionally active for the red phase. They should fail
 * before Story 12.7 implementation because the shared resolver does not exist
 * and the current review/feedback paths still resolve against VENUE_FIXTURE.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { VenueDataDto } from '@/lib/types/api';

type PublicVenueResolver = (identifier: string) => Promise<VenueDataDto | null>;

type VenueRow = {
  id: string;
  slug: string;
  venue_name: string;
  neighborhood: string;
  lat: number;
  lng: number;
  is_partner: boolean;
  hidden?: boolean | null;
  current_sun_status?: string | null;
  confidence?: number | null;
  sun_exposure_percent?: number | null;
  tags?: string[] | null;
};

const supabaseMocks = vi.hoisted(() => {
  const state = {
    venueRows: [] as VenueRow[],
    lastVenueFilter: '',
  };

  function identifiersFromFilter(filter: string): string[] {
    const quoted = [...filter.matchAll(/eq\."((?:\\"|[^"])*)"/g)]
      .map((match) => match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
    if (quoted.length > 0) return quoted;

    return [...filter.matchAll(/eq\.([^,)]+)/g)]
      .map((match) => match[1].trim())
      .filter(Boolean);
  }

  function candidateRowsForFilter(): VenueRow[] {
    const identifiers = new Set(identifiersFromFilter(state.lastVenueFilter));
    return state.venueRows.filter(
      (row) => identifiers.has(row.id) || identifiers.has(row.slug),
    );
  }

  const limit = vi.fn(async (count: number) => ({
    data: candidateRowsForFilter().slice(0, count),
    error: null,
  }));

  const or = vi.fn((filter: string) => {
    state.lastVenueFilter = filter;
    return { limit };
  });

  const select = vi.fn(() => ({ or }));
  const from = vi.fn((table: string) => {
    if (table !== 'venues') throw new Error(`unexpected table ${table}`);
    return { select };
  });

  return { state, from, select, or, limit };
});

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: () => ({
    from: supabaseMocks.from,
  }),
}));

const liveVenueRow: VenueRow = {
  id: '8',
  slug: 'live-zero-review',
  venue_name: 'Live Zero Review',
  neighborhood: 'Centrum',
  lat: 57.706,
  lng: 11.971,
  is_partner: false,
  hidden: false,
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

async function loadPublicResolver(): Promise<PublicVenueResolver> {
  const venueStore = await import('@/lib/services/venue-store');
  const resolver = (venueStore as { resolvePublicVenueIdentifier?: unknown })
    .resolvePublicVenueIdentifier;

  expect(typeof resolver).toBe('function');
  return resolver as PublicVenueResolver;
}

describe('Story 12.7 AC1/AC2/AC3 - shared public venue resolver', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    supabaseMocks.state.venueRows = [];
    supabaseMocks.state.lastVenueFilter = '';
    supabaseMocks.from.mockClear();
    supabaseMocks.select.mockClear();
    supabaseMocks.or.mockClear();
    supabaseMocks.limit.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('[P0] supabase mode resolves the same live venue by id and slug without fixture fallback', async () => {
    useSupabaseVenueStore();
    supabaseMocks.state.venueRows = [liveVenueRow];
    const resolvePublicVenueIdentifier = await loadPublicResolver();

    const byId = await resolvePublicVenueIdentifier('8');
    const bySlug = await resolvePublicVenueIdentifier('live-zero-review');

    expect(byId).toMatchObject({ id: '8', slug: 'live-zero-review' });
    expect(bySlug).toMatchObject({ id: '8', slug: 'live-zero-review' });
    expect(supabaseMocks.from).toHaveBeenCalledWith('venues');
  });

  test('[P0] supabase mode treats hidden, malformed visibility, blank, and unknown identifiers as the same public miss', async () => {
    useSupabaseVenueStore();
    supabaseMocks.state.venueRows = [
      { ...liveVenueRow, id: '9', slug: 'hidden-live', hidden: true },
      { ...liveVenueRow, id: '10', slug: 'malformed-live', hidden: null },
    ];
    const resolvePublicVenueIdentifier = await loadPublicResolver();

    await expect(resolvePublicVenueIdentifier('hidden-live')).resolves.toBeNull();
    await expect(resolvePublicVenueIdentifier('malformed-live')).resolves.toBeNull();
    await expect(resolvePublicVenueIdentifier('missing-live')).resolves.toBeNull();
    await expect(resolvePublicVenueIdentifier('   ')).resolves.toBeNull();
  });

  test('[P0] fixture fallback is allowed only outside supabase venue-store mode', async () => {
    const resolvePublicVenueIdentifier = await loadPublicResolver();

    await expect(resolvePublicVenueIdentifier('test-venue-sunny'))
      .resolves.toMatchObject({ id: '1', slug: 'test-venue-sunny' });

    useSupabaseVenueStore();
    supabaseMocks.state.venueRows = [];
    await expect(resolvePublicVenueIdentifier('test-venue-sunny')).resolves.toBeNull();
  });

  test('[P1] corrupt id/slug collisions fail closed instead of choosing an arbitrary row', async () => {
    useSupabaseVenueStore();
    supabaseMocks.state.venueRows = [
      { ...liveVenueRow, id: '8', slug: 'collision-a' },
      { ...liveVenueRow, id: '11', slug: '8' },
    ];
    const resolvePublicVenueIdentifier = await loadPublicResolver();

    await expect(resolvePublicVenueIdentifier('8')).resolves.toBeNull();
  });

  test('[P1] resolver misses are not cached over later visible rows', async () => {
    useSupabaseVenueStore();
    const resolvePublicVenueIdentifier = await loadPublicResolver();

    await expect(resolvePublicVenueIdentifier('late-live')).resolves.toBeNull();

    supabaseMocks.state.venueRows = [{ ...liveVenueRow, id: '12', slug: 'late-live' }];
    await expect(resolvePublicVenueIdentifier('late-live'))
      .resolves.toMatchObject({ id: '12', slug: 'late-live' });
  });
});
