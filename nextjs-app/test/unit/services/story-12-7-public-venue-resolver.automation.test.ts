import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
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
  hidden?: boolean | null;
  current_sun_status?: string | null;
  confidence?: number | null;
  sun_exposure_percent?: number | null;
  tags?: string[] | null;
};

const supabaseMock = vi.hoisted(() => {
  const state = {
    nextResults: [] as Array<{
      data: VenueRow[] | null;
      error: { message: string } | null;
    }>,
    lastFilter: '',
    lastSelect: '',
  };

  const limit = vi.fn(async () => {
    const next = state.nextResults.shift();
    return next ?? { data: [], error: null };
  });
  const or = vi.fn((filter: string) => {
    state.lastFilter = filter;
    return { limit };
  });
  const select = vi.fn((columns: string) => {
    state.lastSelect = columns;
    return { or };
  });
  const from = vi.fn((table: string) => {
    if (table !== 'venues') throw new Error(`unexpected table ${table}`);
    return { select };
  });

  return { state, from, select, or, limit };
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
    supabaseMock.limit.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('[P0] resolves live id and slug through the same quoted Supabase filter contract', async () => {
    supabaseMock.state.nextResults = [
      { data: [LIVE_ROW], error: null },
      { data: [LIVE_ROW], error: null },
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
    expect(supabaseMock.state.lastSelect).toContain('hidden');
    expect(supabaseMock.state.lastSelect).not.toContain('is_hidden');
    expect(supabaseMock.state.lastSelect).not.toContain('visibility');
    expect(supabaseMock.state.lastSelect).not.toContain('deleted_at');
    expect(supabaseMock.limit).toHaveBeenCalledWith(2);
  });

  it('[P0] quotes reserved PostgREST tokens so user identifiers stay literal', async () => {
    supabaseMock.state.nextResults = [{ data: [], error: null }];

    await expect(resolvePublicVenueIdentifier('a","b\\c,(x)')).resolves.toBeNull();

    expect(supabaseMock.or).toHaveBeenCalledWith(
      'id.eq."a\\",\\"b\\\\c,(x)",slug.eq."a\\",\\"b\\\\c,(x)"',
    );
  });

  it('[P0] allows only canonical hidden=false rows and fails closed for true, null, or missing visibility', async () => {
    const visible = { ...LIVE_ROW, id: '9', slug: 'public-visible', hidden: false };
    const hidden = { ...LIVE_ROW, id: '10', slug: 'private-hidden', hidden: true };
    const nullVisibility = { ...LIVE_ROW, id: '11', slug: 'null-visibility', hidden: null };
    const missingVisibility = { ...LIVE_ROW, id: '12', slug: 'missing-visibility' };
    delete missingVisibility.hidden;

    supabaseMock.state.nextResults = [
      { data: [visible], error: null },
      { data: [hidden], error: null },
      { data: [nullVisibility], error: null },
      { data: [missingVisibility], error: null },
    ];

    await expect(resolvePublicVenueIdentifier(visible.slug))
      .resolves.toMatchObject({ id: '9', slug: 'public-visible' });
    await expect(resolvePublicVenueIdentifier(hidden.slug)).resolves.toBeNull();
    await expect(resolvePublicVenueIdentifier(nullVisibility.slug)).resolves.toBeNull();
    await expect(resolvePublicVenueIdentifier(missingVisibility.slug)).resolves.toBeNull();
    expect(supabaseMock.limit).toHaveBeenCalledTimes(4);
  });

  it('[P0] rejects unsafe control characters before any Supabase data access', async () => {
    await expect(resolvePublicVenueIdentifier('live\u0000id')).resolves.toBeNull();

    expect(supabaseMock.from).not.toHaveBeenCalled();
    expect(supabaseMock.or).not.toHaveBeenCalled();
  });

  it('[P1] returns public DTO fields without leaking server-only visibility columns', async () => {
    supabaseMock.state.nextResults = [{ data: [LIVE_ROW], error: null }];

    const venue = await resolvePublicVenueIdentifier('live-zero-review');

    expect(venue).toMatchObject({
      id: '8',
      venueId: '8',
      slug: 'live-zero-review',
      venueSlug: 'live-zero-review',
    });
    expect(venue).not.toHaveProperty('hidden');
  });

  it('[P1] does not cache misses or share in-flight resolver state across visibility changes', async () => {
    supabaseMock.state.nextResults = [
      { data: [], error: null },
      { data: [{ ...LIVE_ROW, id: '13', slug: 'late-visible' }], error: null },
    ];

    await expect(resolvePublicVenueIdentifier('late-visible')).resolves.toBeNull();
    await expect(resolvePublicVenueIdentifier('late-visible'))
      .resolves.toMatchObject({ id: '13', slug: 'late-visible' });
    expect(supabaseMock.limit).toHaveBeenCalledTimes(2);
  });

  it('[P1] handles collision cardinality explicitly and propagates real store errors', async () => {
    supabaseMock.state.nextResults = [
      {
        data: [
          LIVE_ROW,
          { ...LIVE_ROW, id: '14', slug: '8' },
        ],
        error: null,
      },
      { data: null, error: { message: 'connection refused' } },
    ];

    await expect(resolvePublicVenueIdentifier('8')).resolves.toBeNull();
    await expect(resolvePublicVenueIdentifier('8')).rejects.toThrow(
      'Venue store failed: connection refused',
    );
  });
});

describe('Story 12.7 canonical visibility schema contract', () => {
  const repoRoot = join(process.cwd(), '..');
  const migrationsDir = join(repoRoot, 'supabase', 'migrations');
  const visibilityMigrationName = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .find((file) => file.includes('public_venue_visibility'));
  const visibilityMigration = visibilityMigrationName
    ? readFileSync(join(migrationsDir, visibilityMigrationName), 'utf8')
    : '';
  const generatedTypes = readFileSync(
    join(process.cwd(), 'lib', 'supabase', 'types.ts'),
    'utf8',
  );
  const venueTypes = generatedTypes
    .split('      venues: {')[1]
    ?.split('        Relationships: []')[0] ?? '';

  it('[P0] migrates hidden as a non-null boolean defaulting existing and new rows to public', () => {
    expect(visibilityMigration).toMatch(
      /add\s+column\s+if\s+not\s+exists\s+hidden\s+boolean\s+not\s+null\s+default\s+false/i,
    );
    expect(visibilityMigration).toMatch(
      /alter\s+column\s+hidden\s+set\s+not\s+null/i,
    );
    expect(visibilityMigration).toMatch(
      /alter\s+column\s+hidden\s+set\s+default\s+false/i,
    );
  });

  it('[P0] generated venue types expose the same canonical boolean contract', () => {
    expect(venueTypes).toMatch(/Row:\s*{[\s\S]*?hidden:\s*boolean/i);
    expect(venueTypes).toMatch(/Insert:\s*{[\s\S]*?hidden\?:\s*boolean/i);
    expect(venueTypes).toMatch(/Update:\s*{[\s\S]*?hidden\?:\s*boolean/i);
  });
});
