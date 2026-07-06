import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getVenueBySlug,
  getVenues,
  storedVenueDetail,
  toVenueData,
  VENUE_SELECT_COLUMNS,
  type StoredVenue,
} from '@/lib/services/venue-store';
import { validateVenueUniqueness } from '@/app/api/venues/route';

const supabaseMock = vi.hoisted(() => {
  const state = {
    listResult: { data: [] as unknown, error: null as unknown },
    singleResult: { data: null as unknown, error: null as unknown },
  };
  const maybeSingle = vi.fn(() => Promise.resolve(state.singleResult));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({
    // Thenable so `await client.from('venues').select(cols)` resolves the list.
    then: (
      onFulfilled: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(state.listResult).then(onFulfilled, onRejected),
    eq,
  }));
  const from = vi.fn(() => ({ select }));
  const client = { from };
  return { state, client, from, select, eq, maybeSingle };
});

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: () => supabaseMock.client,
}));

function useSupabaseStore() {
  vi.stubEnv('SUNNYSEAT_VENUE_STORE', 'supabase');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
}

const SUPABASE_ROW = {
  id: '9',
  slug: 'supa-venue',
  venue_name: 'Supa Venue',
  neighborhood: 'Centrum',
  lat: 57.71,
  lng: 11.98,
  is_partner: true,
  thumbnail: { alt: 'Supa', initials: 'SV', url: 'https://example.com/x.jpg' },
  description: 'En riktig uteservering.',
  address: 'Storgatan 1, Göteborg',
  // Story 11.9 (AC2): per-weekday opening_hours jsonb (closes 22:00 every day).
  // Story 11.9 (AC3/AC4): peak_time + shadow_warning_minutes columns are gone.
  opening_hours: {
    '1': { open: '09:00', close: '22:00' },
    '2': { open: '09:00', close: '22:00' },
    '3': { open: '09:00', close: '22:00' },
    '4': { open: '09:00', close: '22:00' },
    '5': { open: '09:00', close: '22:00' },
    '6': { open: '09:00', close: '22:00' },
    '7': { open: '09:00', close: '22:00' },
  },
  current_sun_status: 'Sunny',
  sky_condition: 'clear',
  confidence: 84,
  sun_exposure_percent: 77,
  sun_window: { start: '12:00', end: '18:00' },
  prediction_uncertainty: { level: 'low', reasons: ['weather'] },
};

describe('venue-store (default in-memory)', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    supabaseMock.state.listResult = { data: [], error: null };
    supabaseMock.state.singleResult = { data: null, error: null };
  });

  it('returns the canonical launch list that passes uniqueness validation', async () => {
    const venues = await getVenues();
    expect(venues).toHaveLength(7);
    expect(validateVenueUniqueness(venues)).toEqual({ valid: true });

    const gate = venues.find((venue) => venue.slug === 'test-venue-sunny');
    expect(gate).toMatchObject({
      id: '1',
      venueId: '1',
      venueName: 'Kafé Magasinet',
      neighborhood: 'Inom Vallgraven',
      location: { lat: 57.705, lng: 11.97 },
      isPartner: true,
      confidence: 92,
      sunExposurePercent: 95,
      sunWindow: { start: '13:00', end: '18:30' },
    });
  });

  it('omits the detail block from the list shape (served only by slug)', async () => {
    const venues = await getVenues();
    for (const venue of venues) {
      expect(venue).not.toHaveProperty('description');
      expect(venue).not.toHaveProperty('address');
      expect(venue).not.toHaveProperty('peakTime');
      expect(venue).not.toHaveProperty('shadowWarningMinutes');
    }
  });

  it('surfaces openingHours on seeded list venues that carry it, and omits it otherwise (Story 11.4 AC1)', async () => {
    // Story 11.4 (AC1) CI-determinism: the seed path returns raw VENUE_FIXTURE
    // (no VENUE_DETAIL_SEED merge), so opening hours reach the list DTO ONLY for
    // the fixtures that carry them. The two sunny fixtures seed a real value
    // (present-case); at least one fixture omits it (absent-case) so the
    // "renders nothing when absent" branch is CI-provable.
    const venues = await getVenues();
    const sunny = venues.find((venue) => venue.slug === 'test-venue-sunny');
    // Story 11.9 (AC2): the per-weekday structure (closes 22:00 every day). The
    // render layer derives "Öppet till 22:00" for the current weekday.
    expect(sunny?.openingHours?.['1']).toEqual({ open: '11:00', close: '22:00' });
    expect(sunny?.openingHours?.['7']).toEqual({ open: '11:00', close: '22:00' });

    const withoutHours = venues.filter((venue) => venue.openingHours === undefined);
    expect(withoutHours.length).toBeGreaterThan(0);
    // The absent case never carries a fabricated placeholder.
    for (const venue of withoutHours) {
      expect(venue).not.toHaveProperty('openingHours');
    }
  });

  it('resolves the gate venue with its detail block by slug', async () => {
    const venue = await getVenueBySlug('test-venue-sunny');
    expect(venue).toMatchObject({
      id: '1',
      venueName: 'Kafé Magasinet',
      description:
        'Stor uteservering med eftermiddagssol, skyddade bord och nära till både spårvagn och kajstråk.',
      address: 'Tredje Långgatan 9, 413 03 Göteborg',
      // Story 11.9 (AC2): per-weekday hours (closes 22:00 every day). No stored
      // peakTime / shadowWarningMinutes any more (AC3/AC4).
      openingHours: {
        '1': { open: '11:00', close: '22:00' },
        '7': { open: '11:00', close: '22:00' },
      },
    });
    expect(venue).not.toHaveProperty('peakTime');
    expect(venue).not.toHaveProperty('shadowWarningMinutes');
  });

  it('resolves by venueSlug as well and trims the input', async () => {
    const venue = await getVenueBySlug('  test-venue-sunny  ');
    expect(venue?.id).toBe('1');
  });

  it('returns null for unknown, empty, or whitespace slugs', async () => {
    expect(await getVenueBySlug('does-not-exist')).toBeNull();
    expect(await getVenueBySlug('')).toBeNull();
    expect(await getVenueBySlug('   ')).toBeNull();
  });
});

describe('venue-store (Supabase opt-in)', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    supabaseMock.state.listResult = { data: [], error: null };
    supabaseMock.state.singleResult = { data: null, error: null };
    supabaseMock.from.mockClear();
    supabaseMock.select.mockClear();
    supabaseMock.eq.mockClear();
    supabaseMock.maybeSingle.mockClear();
  });

  it('issues the agreed Supabase query contract: full column list + slug filter (R2 6.2)', async () => {
    useSupabaseStore();
    supabaseMock.state.singleResult = { data: SUPABASE_ROW, error: null };

    await getVenueBySlug('supa-venue');

    // Reads public.venues with the exact agreed column projection and filters by
    // slug — so a snake_case column/filter typo is caught offline before the live
    // table. VENUE_SELECT_COLUMNS is imported from the source so it cannot drift.
    expect(supabaseMock.from).toHaveBeenCalledWith('venues');
    expect(supabaseMock.select).toHaveBeenCalledWith(VENUE_SELECT_COLUMNS);
    expect(supabaseMock.eq).toHaveBeenCalledWith('slug', 'supa-venue');

    // The column set must include all 22 contract columns (incl. the server-only
    // seating_area, seating_elevation_m, and ground_elevation_m). A dropped/renamed
    // column would fail here.
    const columns = VENUE_SELECT_COLUMNS.split(', ');
    // Story 11.9 (AC3/AC4): peak_time + shadow_warning_minutes are DROPPED; the
    // opening_hours column stays (its jsonb shape changed, not the column list).
    expect(columns).toEqual([
      'id', 'slug', 'venue_name', 'neighborhood', 'lat', 'lng', 'is_partner',
      'thumbnail', 'description', 'address', 'opening_hours',
      'current_sun_status', 'sky_condition', 'confidence',
      'sun_exposure_percent', 'sun_window', 'prediction_uncertainty', 'tags',
      'seating_area', 'seating_elevation_m', 'ground_elevation_m',
    ]);
    expect(columns).not.toContain('peak_time');
    expect(columns).not.toContain('shadow_warning_minutes');
    // Story 11.9 (AC3/AC4): 23 − peak_time − shadow_warning_minutes = 21 columns.
    expect(columns).toHaveLength(21);
    // Story 9.7: `tags` IS a client field (mapped into the DTO), unlike the
    // server-only seating_* columns.
    expect(columns).toContain('tags');
  });

  it('selects the full column list on the list read too', async () => {
    useSupabaseStore();
    supabaseMock.state.listResult = { data: [SUPABASE_ROW], error: null };

    await getVenues();

    expect(supabaseMock.from).toHaveBeenCalledWith('venues');
    expect(supabaseMock.select).toHaveBeenCalledWith(VENUE_SELECT_COLUMNS);
  });

  it('fails closed when configured for Supabase without full credentials', async () => {
    vi.stubEnv('SUNNYSEAT_VENUE_STORE', 'supabase');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');

    await expect(getVenues()).rejects.toThrow(
      'Venue store is configured for Supabase but credentials are incomplete',
    );
    await expect(getVenueBySlug('supa-venue')).rejects.toThrow(
      'Venue store is configured for Supabase but credentials are incomplete',
    );
  });

  it('maps snake_case rows to base list DTOs (detail stripped)', async () => {
    useSupabaseStore();
    supabaseMock.state.listResult = { data: [SUPABASE_ROW], error: null };

    const venues = await getVenues();
    expect(venues).toHaveLength(1);
    expect(venues[0]).toMatchObject({
      id: '9',
      venueId: '9',
      venueName: 'Supa Venue',
      venueSlug: 'supa-venue',
      slug: 'supa-venue',
      neighborhood: 'Centrum',
      location: { lat: 57.71, lng: 11.98 },
      isPartner: true,
      confidence: 84,
      distanceMeters: 0,
      sunExposurePercent: 77,
      skyCondition: 'clear',
      sunWindow: { start: '12:00', end: '18:00' },
      predictionUncertainty: { level: 'low', reasons: ['weather'] },
      thumbnail: { alt: 'Supa', initials: 'SV', url: 'https://example.com/x.jpg' },
    });
    expect(venues[0]).not.toHaveProperty('description');
    expect(venues[0]).not.toHaveProperty('peakTime');
  });

  it('maps a row to a detailed StoredVenue by slug', async () => {
    useSupabaseStore();
    supabaseMock.state.singleResult = { data: SUPABASE_ROW, error: null };

    const venue = await getVenueBySlug('supa-venue');
    expect(venue).toMatchObject({
      id: '9',
      description: 'En riktig uteservering.',
      address: 'Storgatan 1, Göteborg',
      // Story 11.9 (AC2): coerceOpeningHours maps the per-weekday jsonb through.
      openingHours: {
        '1': { open: '09:00', close: '22:00' },
        '7': { open: '09:00', close: '22:00' },
      },
    });
    // Story 11.9 (AC3/AC4): the dropped columns never map onto the DTO.
    expect(venue).not.toHaveProperty('peakTime');
    expect(venue).not.toHaveProperty('shadowWarningMinutes');
  });

  it('tolerates null jsonb sub-fields without crashing', async () => {
    useSupabaseStore();
    const sparseRow = {
      id: '10',
      slug: 'sparse',
      venue_name: 'Sparse',
      neighborhood: 'Nord',
      lat: 57.7,
      lng: 11.9,
      is_partner: false,
      thumbnail: null,
      description: null,
      address: null,
      opening_hours: null,
      current_sun_status: 'Shaded',
      sky_condition: null,
      confidence: 50,
      sun_exposure_percent: 10,
      sun_window: null,
      prediction_uncertainty: null,
    };
    supabaseMock.state.singleResult = { data: sparseRow, error: null };

    const venue = await getVenueBySlug('sparse');
    expect(venue).toMatchObject({
      id: '10',
      currentSunStatus: 'Shaded',
      confidence: 50,
      sunExposurePercent: 10,
      isPartner: false,
    });
    expect(venue).not.toHaveProperty('thumbnail');
    expect(venue).not.toHaveProperty('sunWindow');
    expect(venue).not.toHaveProperty('predictionUncertainty');
    expect(venue).not.toHaveProperty('skyCondition');
    expect(venue).not.toHaveProperty('description');
  });

  it('returns null when no row matches the slug', async () => {
    useSupabaseStore();
    supabaseMock.state.singleResult = { data: null, error: null };
    expect(await getVenueBySlug('missing')).toBeNull();
  });

  it('throws a stable error when the Supabase read fails', async () => {
    useSupabaseStore();
    supabaseMock.state.listResult = { data: null, error: { message: 'boom' } };
    await expect(getVenues()).rejects.toThrow('Venue store failed: boom');
  });

  it('throws a stable error when the by-slug Supabase read fails', async () => {
    useSupabaseStore();
    supabaseMock.state.singleResult = { data: null, error: { message: 'boom' } };
    await expect(getVenueBySlug('supa-venue')).rejects.toThrow('Venue store failed: boom');
  });

  it('coerces an out-of-enum current_sun_status to NoSun and drops an unknown sky_condition', async () => {
    useSupabaseStore();
    supabaseMock.state.singleResult = {
      data: { ...SUPABASE_ROW, current_sun_status: 'Bogus', sky_condition: 'mystery' },
      error: null,
    };

    const venue = await getVenueBySlug('supa-venue');
    expect(venue?.currentSunStatus).toBe('NoSun');
    expect(venue).not.toHaveProperty('skyCondition');
  });

  it("round-trips a persisted 'rain' sky_condition instead of stripping it (Story 10 review Patch[Low])", async () => {
    // 10.4 added 'rain' to the SkyCondition union; the SKY_CONDITIONS allow-list
    // must include it or a persisted+re-read 'rain' is silently dropped to
    // undefined (→ no sky line).
    useSupabaseStore();
    supabaseMock.state.singleResult = {
      data: { ...SUPABASE_ROW, sky_condition: 'rain' },
      error: null,
    };

    const venue = await getVenueBySlug('supa-venue');
    expect(venue?.skyCondition).toBe('rain');
  });

  it('keeps a well-formed seating_area polygon as a server-only field (never in the DTO)', async () => {
    useSupabaseStore();
    const seatingArea = {
      type: 'Polygon',
      coordinates: [[
        [11.98, 57.71],
        [11.981, 57.71],
        [11.981, 57.711],
        [11.98, 57.711],
        [11.98, 57.71],
      ]],
    };
    supabaseMock.state.singleResult = {
      data: { ...SUPABASE_ROW, seating_area: seatingArea },
      error: null,
    };

    const venue = await getVenueBySlug('supa-venue');
    expect(venue?.seatingArea).toEqual(seatingArea);
    // Server-only: the seating polygon must never surface through the client projection.
    expect(toVenueData(venue!)).not.toHaveProperty('seatingArea');
  });

  it('drops a degenerate/non-Polygon seating_area so the engine falls back to the footprint (review R1 P2)', async () => {
    useSupabaseStore();
    const malformed = [
      { type: 'Polygon', coordinates: [] }, // no ring
      { type: 'Polygon', coordinates: [[]] }, // empty ring
      { type: 'Polygon', coordinates: [[[11.98, 57.71], [11.981, 57.71]]] }, // short ring (<4)
      { type: 'Point', coordinates: [11.98, 57.71] }, // not a Polygon
    ];
    for (const seating_area of malformed) {
      supabaseMock.state.singleResult = {
        data: { ...SUPABASE_ROW, seating_area },
        error: null,
      };
      const venue = await getVenueBySlug('supa-venue');
      expect(venue).not.toHaveProperty('seatingArea');
    }
  });

  it('maps a positive seating_elevation_m to a server-only seatingElevationM (never in the DTO) (Story 8.6)', async () => {
    useSupabaseStore();
    supabaseMock.state.singleResult = {
      data: { ...SUPABASE_ROW, seating_elevation_m: 12.5 },
      error: null,
    };

    const venue = await getVenueBySlug('supa-venue');
    expect(venue?.seatingElevationM).toBe(12.5);
    // Server-only: the seating elevation must never surface through the client projection.
    expect(toVenueData(venue!)).not.toHaveProperty('seatingElevationM');
  });

  it('preserves a stored seating_elevation_m of 0 (ground level) (Story 8.6)', async () => {
    useSupabaseStore();
    supabaseMock.state.singleResult = {
      data: { ...SUPABASE_ROW, seating_elevation_m: 0 },
      error: null,
    };

    const venue = await getVenueBySlug('supa-venue');
    expect(venue?.seatingElevationM).toBe(0);
  });

  it('drops a null / negative / NaN seating_elevation_m so the venue is treated as ground level (Story 8.6)', async () => {
    useSupabaseStore();
    for (const seating_elevation_m of [null, -3, Number.NaN] as const) {
      supabaseMock.state.singleResult = {
        data: { ...SUPABASE_ROW, seating_elevation_m },
        error: null,
      };
      const venue = await getVenueBySlug('supa-venue');
      expect(venue).not.toHaveProperty('seatingElevationM');
    }
  });

  it('maps a ground_elevation_m to a server-only groundElevationM (never in the DTO) (Story 8.7)', async () => {
    useSupabaseStore();
    supabaseMock.state.singleResult = {
      data: { ...SUPABASE_ROW, ground_elevation_m: 38.4 },
      error: null,
    };

    const venue = await getVenueBySlug('supa-venue');
    expect(venue?.groundElevationM).toBe(38.4);
    // Server-only: the ground elevation must never surface through the client projection.
    expect(toVenueData(venue!)).not.toHaveProperty('groundElevationM');
  });

  it('keeps a NEGATIVE ground_elevation_m (absolute RH2000 Z, may be below datum) (Story 8.7)', async () => {
    useSupabaseStore();
    supabaseMock.state.singleResult = {
      data: { ...SUPABASE_ROW, ground_elevation_m: -4.2 },
      error: null,
    };

    const venue = await getVenueBySlug('supa-venue');
    // Unlike seating_elevation_m, ground_elevation_m is an absolute elevation and a
    // negative value is valid (and must be preserved, not dropped).
    expect(venue?.groundElevationM).toBe(-4.2);
  });

  it('drops a null / NaN ground_elevation_m so the venue falls back to the relative gate (Story 8.7)', async () => {
    useSupabaseStore();
    for (const ground_elevation_m of [null, Number.NaN] as const) {
      supabaseMock.state.singleResult = {
        data: { ...SUPABASE_ROW, ground_elevation_m },
        error: null,
      };
      const venue = await getVenueBySlug('supa-venue');
      expect(venue).not.toHaveProperty('groundElevationM');
    }
  });

  it('maps a tags array from the store row into the DTO (Story 9.7)', async () => {
    useSupabaseStore();
    supabaseMock.state.singleResult = {
      data: { ...SUPABASE_ROW, tags: ['Innergård', 'Hund ok', 'Wifi'] },
      error: null,
    };

    const venue = await getVenueBySlug('supa-venue');
    expect(venue?.tags).toEqual(['Innergård', 'Hund ok', 'Wifi']);
    // Unlike the server-only seating_* columns, `tags` IS surfaced into the DTO.
    expect(toVenueData(venue!).tags).toEqual(['Innergård', 'Hund ok', 'Wifi']);
  });

  it('coerces a null / non-array / garbage tags column to [] (graceful-empty — Story 9.7)', async () => {
    useSupabaseStore();
    for (const tags of [null, undefined, 'not-an-array', 42, {}] as const) {
      supabaseMock.state.singleResult = {
        data: { ...SUPABASE_ROW, tags },
        error: null,
      };
      const venue = await getVenueBySlug('supa-venue');
      // Never undefined, never a crash — always an array (AC1/AC4).
      expect(venue?.tags).toEqual([]);
      expect(Array.isArray(venue?.tags)).toBe(true);
    }
  });

  it('drops non-string / empty / duplicate tag entries and trims (Story 9.7)', async () => {
    useSupabaseStore();
    supabaseMock.state.singleResult = {
      data: {
        ...SUPABASE_ROW,
        tags: ['Innergård', '  Hund ok  ', '', '   ', 'Innergård', 7, null, 'Wifi'],
      },
      error: null,
    };

    const venue = await getVenueBySlug('supa-venue');
    expect(venue?.tags).toEqual(['Innergård', 'Hund ok', 'Wifi']);
  });

  it('emits tags: [] when the column is absent so the DTO field is always present (Story 9.7)', async () => {
    useSupabaseStore();
    const { tags: _omit, ...rowWithoutTags } = { ...SUPABASE_ROW, tags: undefined };
    void _omit;
    supabaseMock.state.listResult = { data: [rowWithoutTags], error: null };

    const venues = await getVenues();
    expect(venues[0].tags).toEqual([]);
  });

  it('rejects a row missing identity (id/slug) instead of emitting an empty-id venue', async () => {
    useSupabaseStore();
    supabaseMock.state.listResult = {
      data: [{ ...SUPABASE_ROW, id: null }],
      error: null,
    };
    await expect(getVenues()).rejects.toThrow('Venue store failed: row missing id/slug');
  });

  it('rejects a row with non-finite coordinates instead of emitting a (0,0) venue', async () => {
    useSupabaseStore();
    supabaseMock.state.singleResult = {
      data: { ...SUPABASE_ROW, lat: null },
      error: null,
    };
    await expect(getVenueBySlug('supa-venue')).rejects.toThrow(
      'Venue store failed: venue 9 has invalid coordinates',
    );
  });
});

describe('venue-store projection helpers', () => {
  const stored: StoredVenue = {
    id: '1',
    venueId: '1',
    venueName: 'Kafé Magasinet',
    venueSlug: 'test-venue-sunny',
    slug: 'test-venue-sunny',
    neighborhood: 'Inom Vallgraven',
    location: { lat: 57.705, lng: 11.97 },
    currentSunStatus: 'Sunny',
    skyCondition: 'clear',
    isPartner: true,
    confidence: 92,
    distanceMeters: 0,
    sunExposurePercent: 95,
    tags: ['Innergård', 'Hund ok', 'Wifi', 'Bakverk'],
    sunWindow: { start: '13:00', end: '18:30' },
    description: 'desc',
    address: 'addr',
    // Story 11.9 (AC2): per-weekday opening hours (closes 22:00 every day). No
    // stored peakTime / shadowWarningMinutes any more (AC3/AC4).
    openingHours: {
      '1': { open: '11:00', close: '22:00' },
      '2': { open: '11:00', close: '22:00' },
      '3': { open: '11:00', close: '22:00' },
      '4': { open: '11:00', close: '22:00' },
      '5': { open: '11:00', close: '22:00' },
      '6': { open: '11:00', close: '22:00' },
      '7': { open: '11:00', close: '22:00' },
    },
  };

  it('toVenueData strips the detail block but keeps base fields', () => {
    const base = toVenueData(stored);
    expect(base).not.toHaveProperty('description');
    expect(base).not.toHaveProperty('address');
    expect(base).not.toHaveProperty('peakTime');
    expect(base).not.toHaveProperty('shadowWarningMinutes');
    expect(base).toMatchObject({ id: '1', skyCondition: 'clear', sunWindow: { start: '13:00', end: '18:30' } });
    // Story 9.7: `tags` IS a client field — it survives the projection.
    expect(base.tags).toEqual(['Innergård', 'Hund ok', 'Wifi', 'Bakverk']);
  });

  it('toVenueData surfaces openingHours on the list DTO when the store carries it (Story 11.4 AC1 / 11.9 AC2)', () => {
    // Opening hours are the ONE detail-adjacent field carried through to the list
    // surface so the quick-info caller can DERIVE "Öppet till HH:MM". Now the
    // per-weekday structure passes through verbatim (same reference).
    const base = toVenueData(stored);
    expect(base.openingHours).toBe(stored.openingHours);
    expect(base.openingHours?.['1']).toEqual({ open: '11:00', close: '22:00' });
  });

  it('toVenueData omits openingHours when the store has none (never fabricated — Story 11.4 AC1)', () => {
    // Absent → absent: a venue without opening hours must NOT gain a fabricated
    // value on the list DTO (the card renders nothing for it).
    const { openingHours: _omit, ...withoutHours } = stored;
    void _omit;
    const base = toVenueData(withoutHours);
    expect(base).not.toHaveProperty('openingHours');
  });

  it('storedVenueDetail extracts only the detail block', () => {
    // Story 11.9 (AC3/AC4): the block no longer carries peakTime/shadowWarningMinutes.
    expect(storedVenueDetail(stored)).toEqual({
      description: 'desc',
      address: 'addr',
      openingHours: {
        '1': { open: '11:00', close: '22:00' },
        '2': { open: '11:00', close: '22:00' },
        '3': { open: '11:00', close: '22:00' },
        '4': { open: '11:00', close: '22:00' },
        '5': { open: '11:00', close: '22:00' },
        '6': { open: '11:00', close: '22:00' },
        '7': { open: '11:00', close: '22:00' },
      },
    });
  });
});
