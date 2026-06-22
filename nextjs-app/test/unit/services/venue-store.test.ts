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
  opening_hours: { display: 'Öppet till 22:00', closesAt: '22:00' },
  peak_time: '15:00',
  shadow_warning_minutes: 30,
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
      expect(venue).not.toHaveProperty('openingHours');
      expect(venue).not.toHaveProperty('peakTime');
      expect(venue).not.toHaveProperty('shadowWarningMinutes');
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
      openingHours: { display: 'Öppet till 22:00', closesAt: '22:00' },
      peakTime: '15:30',
      shadowWarningMinutes: 45,
    });
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

    // The column set must include all 20 contract columns (incl. the server-only
    // seating_area). A dropped/renamed column would fail here.
    const columns = VENUE_SELECT_COLUMNS.split(', ');
    expect(columns).toEqual([
      'id', 'slug', 'venue_name', 'neighborhood', 'lat', 'lng', 'is_partner',
      'thumbnail', 'description', 'address', 'opening_hours', 'peak_time',
      'shadow_warning_minutes', 'current_sun_status', 'sky_condition', 'confidence',
      'sun_exposure_percent', 'sun_window', 'prediction_uncertainty', 'seating_area',
    ]);
    expect(columns).toHaveLength(20);
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
      openingHours: { display: 'Öppet till 22:00', closesAt: '22:00' },
      peakTime: '15:00',
      shadowWarningMinutes: 30,
    });
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
      peak_time: null,
      shadow_warning_minutes: null,
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
    sunWindow: { start: '13:00', end: '18:30' },
    description: 'desc',
    address: 'addr',
    openingHours: { display: 'Öppet till 22:00' },
    peakTime: '15:30',
    shadowWarningMinutes: 45,
  };

  it('toVenueData strips the detail block but keeps base fields', () => {
    const base = toVenueData(stored);
    expect(base).not.toHaveProperty('description');
    expect(base).not.toHaveProperty('address');
    expect(base).not.toHaveProperty('openingHours');
    expect(base).not.toHaveProperty('peakTime');
    expect(base).not.toHaveProperty('shadowWarningMinutes');
    expect(base).toMatchObject({ id: '1', skyCondition: 'clear', sunWindow: { start: '13:00', end: '18:30' } });
  });

  it('storedVenueDetail extracts only the detail block', () => {
    expect(storedVenueDetail(stored)).toEqual({
      description: 'desc',
      address: 'addr',
      openingHours: { display: 'Öppet till 22:00' },
      peakTime: '15:30',
      shadowWarningMinutes: 45,
    });
  });
});
