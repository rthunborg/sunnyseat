import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calculateVenueShadow,
  calculateVenueShadowForGeometry,
} from '@/lib/solar/shadow-calculation-service';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  supabaseServiceRole: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

const venueGeometry: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [[
    [11.9740, 57.7080],
    [11.9744, 57.7080],
    [11.9744, 57.7083],
    [11.9740, 57.7083],
    [11.9740, 57.7080],
  ]],
};

type VenueQuery = {
  select: (columns: string) => VenueQuery;
  eq: (column: string, value: unknown) => VenueQuery;
  single: () => Promise<{ data: { Id: number; Geometry: string }; error: null }>;
};

type LegacyBuildingsQuery = {
  select: (columns: string) => LegacyBuildingsQuery;
  gte: (column: string, value: number) => LegacyBuildingsQuery;
  limit: (count: number) => Promise<{ data: never[]; error: null }>;
};

function createVenueQuery(geometry: GeoJSON.Polygon = venueGeometry): VenueQuery {
  const query = {} as VenueQuery;
  query.select = () => query;
  query.eq = () => query;
  query.single = async () => ({
    data: { Id: 42, Geometry: JSON.stringify(geometry) },
    error: null,
  });
  return query;
}

function createLegacyBuildingsQuery(): LegacyBuildingsQuery {
  const query = {} as LegacyBuildingsQuery;
  query.select = () => query;
  query.gte = () => query;
  query.limit = async () => ({ data: [], error: null });
  return query;
}

function mockVenueLookup(geometry: GeoJSON.Polygon = venueGeometry): void {
  mocks.from.mockImplementation((table: string) => {
    if (table === 'venues') return createVenueQuery(geometry);
    if (table === 'buildings') return createLegacyBuildingsQuery();
    throw new Error(`Unexpected table lookup: ${table}`);
  });
}

describe('shadow calculation service RPC boundary', () => {
  beforeEach(() => {
    mocks.from.mockReset();
    mocks.rpc.mockReset();
    mockVenueLookup();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls get_buildings_near_point with the compatibility argument names', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        Id: 1001,
        Geometry: JSON.stringify(venueGeometry),
        Height: 12,
        Source: 'goteborg_open_data',
        QualityScore: 0.92,
        ExternalId: 'footprint-1001',
        HeightSource: 'Surveyed',
        BuildingType: 'building',
      }],
      error: null,
    });

    const result = await calculateVenueShadow(42, new Date('2026-06-21T10:30:00.000Z'));

    expect(mocks.rpc).toHaveBeenCalledWith('get_buildings_near_point', {
      p_latitude: expect.any(Number),
      p_longitude: expect.any(Number),
      p_radius_meters: expect.any(Number),
    });
    const [, args] = mocks.rpc.mock.calls[0];
    expect(args.p_latitude).toBeCloseTo(57.70815, 5);
    expect(args.p_longitude).toBeCloseTo(11.9742, 5);
    expect(args.p_radius_meters).toBeCloseTo(200, 5);
    expect(mocks.from).not.toHaveBeenCalledWith('buildings');
    expect(result.castingShadows[0]).toEqual(
      expect.objectContaining({
        buildingId: 1001,
        buildingHeight: 12,
      })
    );
  });

  it('returns a low-confidence unavailable result when the RPC fails', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: 'RPC unavailable' },
    });

    const result = await calculateVenueShadow(42, new Date('2026-06-21T10:30:00.000Z'));

    expect(result.castingShadows).toEqual([]);
    expect(result.shadowedAreaPercent).toBe(50);
    expect(result.sunlitAreaPercent).toBe(50);
    expect(result.confidence).toBeLessThanOrEqual(0.2);
    expect(mocks.from).not.toHaveBeenCalledWith('buildings');
  });

  it('returns a low-confidence unavailable result when the RPC call rejects', async () => {
    mocks.rpc.mockRejectedValue(new Error('network timeout'));

    const result = await calculateVenueShadow(42, new Date('2026-06-21T10:30:00.000Z'));

    expect(result.castingShadows).toEqual([]);
    expect(result.shadowedAreaPercent).toBe(50);
    expect(result.sunlitAreaPercent).toBe(50);
    expect(result.confidence).toBeLessThanOrEqual(0.2);
    expect(mocks.from).not.toHaveBeenCalledWith('buildings');
  });

  it('does not treat an empty successful RPC response as high confidence when coverage is unknown', async () => {
    mocks.rpc.mockResolvedValue({
      data: [],
      error: null,
    });

    const result = await calculateVenueShadow(42, new Date('2026-06-21T10:30:00.000Z'));

    expect(result.castingShadows).toEqual([]);
    expect(result.sunlitAreaPercent).toBe(100);
    expect(result.shadowDataCoverage).toEqual(
      expect.objectContaining({
        status: 'unknown',
        allowsHighConfidence: false,
      })
    );
    expect(result.confidence).toBeLessThan(0.7);
  });

  it.each([
    ['blocked', 0.55],
    ['insufficient_evidence', 0.65],
  ] as const)('caps empty successful RPC confidence when coverage is %s', async (status, cap) => {
    mocks.rpc.mockResolvedValue({
      data: [],
      error: null,
    });

    const result = await calculateVenueShadow(
      42,
      new Date('2026-06-21T10:30:00.000Z'),
      {
        coverageMap: {
          nordstan: {
            clusterId: 'nordstan',
            clusterName: 'Nordstan',
            status,
            checkedCount: 10,
            agreementRate: status === 'blocked' ? 0.5 : 0.9,
            missingConditions: status === 'blocked' ? [] : ['midday_high_sun'],
            uncertaintyCounts: {},
            evidenceFiles: ['fixture'],
            allowsHighConfidence: false,
            confidenceCap: cap,
          },
        },
      }
    );

    expect(result.castingShadows).toEqual([]);
    expect(result.shadowDataCoverage).toEqual(
      expect.objectContaining({
        status,
        allowsHighConfidence: false,
      })
    );
    expect(result.confidence).toBeLessThan(0.7);
    expect(result.confidence).toBeLessThanOrEqual(cap);
  });

  it('caps empty successful RPC confidence for venues outside launch coverage', async () => {
    mockVenueLookup({
      type: 'Polygon',
      coordinates: [[
        [11.50, 57.90],
        [11.51, 57.90],
        [11.51, 57.91],
        [11.50, 57.91],
        [11.50, 57.90],
      ]],
    });
    mocks.rpc.mockResolvedValue({
      data: [],
      error: null,
    });

    const result = await calculateVenueShadow(42, new Date('2026-06-21T10:30:00.000Z'));

    expect(result.shadowDataCoverage).toEqual(
      expect.objectContaining({
        clusterId: null,
        status: 'unknown',
        allowsHighConfidence: false,
      })
    );
    expect(result.confidence).toBeLessThan(0.7);
  });

  it('allows high confidence for empty shadow results when the launch cluster is validated', async () => {
    mocks.rpc.mockResolvedValue({
      data: [],
      error: null,
    });

    const result = await calculateVenueShadow(
      42,
      new Date('2026-06-21T10:30:00.000Z'),
      {
        coverageMap: {
          nordstan: {
            clusterId: 'nordstan',
            clusterName: 'Nordstan',
            status: 'eligible',
            checkedCount: 70,
            agreementRate: 0.9,
            missingConditions: [],
            uncertaintyCounts: {},
            evidenceFiles: ['fixture'],
            allowsHighConfidence: true,
            confidenceCap: 1,
          },
        },
      }
    );

    expect(result.shadowDataCoverage).toEqual(
      expect.objectContaining({
        status: 'eligible',
        allowsHighConfidence: true,
      })
    );
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('maps optional runtime shadow-caster metadata from the compatibility RPC', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        Id: 1001,
        Geometry: JSON.stringify(venueGeometry),
        Height: 12,
        Source: 'goteborg_open_data',
        QualityScore: 0.92,
        ExternalId: 'footprint-1001',
        HeightSource: 'Surveyed',
        BuildingType: 'building',
        SourcePriority: 40,
        ShadowCasterTier: 'primary',
        FilterDecision: 'include',
        CasterClass: 'building',
        SourceFlags: ['obstruction:awning'],
        SourceObjectMetadata: { runtimeApproved: true },
        ProvenanceMetadata: { batch: 'fixture' },
      }],
      error: null,
    });

    const result = await calculateVenueShadow(42, new Date('2026-06-21T10:30:00.000Z'));

    expect(result.castingShadows[0]).toEqual(
      expect.objectContaining({
        buildingId: 1001,
        buildingHeight: 12,
        casterMetadata: expect.objectContaining({
          sourcePriority: 40,
          shadowCasterTier: 'primary',
          filterDecision: 'include',
          casterClass: 'building',
        }),
      })
    );
    expect(result.obstructionRisks).toContain('awning');
  });
});

describe('Story 8.6 seating-elevation height gate', () => {
  // Sun high over Gothenburg (Stockholm 12:30) so casters reliably project — the
  // same instant the RPC-boundary tests above use to cast a height-12 shadow.
  const NOON = new Date('2026-06-21T10:30:00.000Z');

  // A caster whose footprint coincides with the venue, so when it is NOT gated
  // out its projected shadow fully covers the venue (binary, deterministic): the
  // only variable under test is the height gate, not the overlap geometry.
  function casterRpc(height: number) {
    return {
      data: [{
        Id: 2001,
        Geometry: JSON.stringify(venueGeometry),
        Height: height,
        Source: 'goteborg_open_data',
        QualityScore: 0.9,
        HeightSource: 'Surveyed',
        BuildingType: 'building',
      }],
      error: null,
    };
  }

  beforeEach(() => {
    mocks.from.mockReset();
    mocks.rpc.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('excludes a caster shorter than the seating elevation → venue reported sunlit (AC1)', async () => {
    mocks.rpc.mockResolvedValue(casterRpc(12));

    // effectiveHeight = 12 - 50 < MIN_MEANINGFUL_HEIGHT → caster gated out.
    const result = await calculateVenueShadowForGeometry(venueGeometry, NOON, {
      seatingElevationM: 50,
    });

    expect(result.castingShadows).toEqual([]);
    expect(result.shadowedAreaPercent).toBe(0);
    expect(result.sunlitAreaPercent).toBe(100);
  });

  it('the SAME caster shadows the venue at ground level (seatingElevationM 0) — proves the gate (AC1)', async () => {
    mocks.rpc.mockResolvedValue(casterRpc(12));

    const result = await calculateVenueShadowForGeometry(venueGeometry, NOON, {
      seatingElevationM: 0,
    });

    expect(result.castingShadows.length).toBeGreaterThan(0);
    expect(result.shadowedAreaPercent).toBeGreaterThan(0);
    expect(result.sunlitAreaPercent).toBeLessThan(100);
  });

  it('still shadows the venue when the caster is much taller than the terrace (AC1/AC4)', async () => {
    mocks.rpc.mockResolvedValue(casterRpc(50));

    // effectiveHeight = 50 - 10 = 40 ≥ MIN_MEANINGFUL_HEIGHT → still casts.
    const result = await calculateVenueShadowForGeometry(venueGeometry, NOON, {
      seatingElevationM: 10,
    });

    expect(result.castingShadows.length).toBeGreaterThan(0);
    expect(result.shadowedAreaPercent).toBeGreaterThan(0);
  });

  it('keeps the TRUE caster height in the projection record while gating on effective height (provenance)', async () => {
    mocks.rpc.mockResolvedValue(casterRpc(12));

    const result = await calculateVenueShadowForGeometry(venueGeometry, NOON, {
      seatingElevationM: 5, // effectiveHeight = 7 ≥ 3 → casts
    });

    expect(result.castingShadows[0].buildingHeight).toBe(12);
  });

  it('is byte-identical for seatingElevationM unset vs 0 (AC2 regression)', async () => {
    mocks.rpc.mockResolvedValue(casterRpc(12));
    const unset = await calculateVenueShadowForGeometry(venueGeometry, NOON);

    mocks.rpc.mockResolvedValue(casterRpc(12));
    const zero = await calculateVenueShadowForGeometry(venueGeometry, NOON, {
      seatingElevationM: 0,
    });

    expect(unset.shadowedAreaPercent).toBe(zero.shadowedAreaPercent);
    expect(unset.sunlitAreaPercent).toBe(zero.sunlitAreaPercent);
    // Meaningful only if the caster actually casts at ground level.
    expect(unset.shadowedAreaPercent).toBeGreaterThan(0);
  });
});

describe('Story 8.7 terrain ground-elevation gate', () => {
  const NOON = new Date('2026-06-21T10:30:00.000Z');

  // A caster footprint coinciding with the venue (full-coverage when it casts), with
  // the RH2000 absolute Z columns the 8.7 RPC now exposes. roofZRh2000 is set to an
  // INFLATED value (groundZ + rawHeight) to prove the gate uses the conservative
  // runtime height + the ground delta, NOT the raw roof Z.
  function casterRpcZ(height: number, groundZ: number, rawHeight = height) {
    return {
      data: [{
        Id: 7001,
        Geometry: JSON.stringify(venueGeometry),
        Height: height,
        Source: 'goteborg_open_data',
        QualityScore: 0.9,
        HeightSource: 'Surveyed',
        BuildingType: 'building',
        GroundZRh2000: groundZ,
        RoofZRh2000: groundZ + rawHeight,
      }],
      error: null,
    };
  }

  beforeEach(() => {
    mocks.from.mockReset();
    mocks.rpc.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('excludes a caster standing downhill from the venue (its roof falls below the seating surface) (AC1)', async () => {
    // Venue ground at 40 m; a height-12 caster on ground at 10 m → roof at 22 m, which
    // is below the venue surface (40 m): effectiveHeight = 12 + (10 − 40) = −18 < gate.
    mocks.rpc.mockResolvedValue(casterRpcZ(12, 10));

    const result = await calculateVenueShadowForGeometry(venueGeometry, NOON, {
      venueGroundZ: 40,
    });

    expect(result.castingShadows).toEqual([]);
    expect(result.sunlitAreaPercent).toBe(100);
  });

  it('the SAME caster shadows the venue when it stands uphill (high ground Z) — proves the terrain delta (AC1)', async () => {
    // Same height-12 caster, same venue ground (40 m), but caster ground at 70 m →
    // roof at 82 m, well above the venue surface: effectiveHeight = 12 + (70 − 40) = 42.
    mocks.rpc.mockResolvedValue(casterRpcZ(12, 70));

    const result = await calculateVenueShadowForGeometry(venueGeometry, NOON, {
      venueGroundZ: 40,
    });

    expect(result.castingShadows.length).toBeGreaterThan(0);
    expect(result.shadowedAreaPercent).toBeGreaterThan(0);
  });

  it('is byte-identical to the Story 8.6 relative gate on flat terrain (casterGroundZ == venueGroundZ) (AC2/AC3)', async () => {
    // Flat terrain: ground delta is 0, so the absolute gate must reduce EXACTLY to 8.6.
    // roofZRh2000 is inflated (rawHeight 60) to prove it is NOT used as the casting
    // height — otherwise this would diverge from the height-12 relative result.
    mocks.rpc.mockResolvedValue(casterRpcZ(12, 20, 60));
    const terrain = await calculateVenueShadowForGeometry(venueGeometry, NOON, {
      venueGroundZ: 20,
    });

    mocks.rpc.mockResolvedValue(casterRpcZ(12, 20, 60));
    const relative = await calculateVenueShadowForGeometry(venueGeometry, NOON);

    expect(terrain.shadowedAreaPercent).toBe(relative.shadowedAreaPercent);
    expect(terrain.sunlitAreaPercent).toBe(relative.sunlitAreaPercent);
    // Meaningful only if the caster actually casts (height 12 at ground level).
    expect(terrain.shadowedAreaPercent).toBeGreaterThan(0);
  });

  it('falls back to the relative gate when the venue has no groundElevationM (AC2 no regression)', async () => {
    // Caster carries Z, but the venue does not → terrain delta is NOT applied; the
    // height-12 caster casts exactly as in 8.6 (would be EXCLUDED if a downhill delta
    // were wrongly applied).
    mocks.rpc.mockResolvedValue(casterRpcZ(12, 10));
    const result = await calculateVenueShadowForGeometry(venueGeometry, NOON);

    expect(result.castingShadows.length).toBeGreaterThan(0);
    expect(result.shadowedAreaPercent).toBeGreaterThan(0);
  });

  it('falls back to the relative gate when a caster has no roof/ground Z (AC2 no regression)', async () => {
    // Venue has groundElevationM, but this caster (e.g. a fixture) lacks the Z columns
    // → no terrain delta for it; it casts on the conservative relative height.
    mocks.rpc.mockResolvedValue({
      data: [{
        Id: 7002,
        Geometry: JSON.stringify(venueGeometry),
        Height: 12,
        Source: 'goteborg_open_data',
        QualityScore: 0.9,
        HeightSource: 'Surveyed',
        BuildingType: 'building',
      }],
      error: null,
    });

    const result = await calculateVenueShadowForGeometry(venueGeometry, NOON, {
      venueGroundZ: 40,
    });

    expect(result.castingShadows.length).toBeGreaterThan(0);
    expect(result.shadowedAreaPercent).toBeGreaterThan(0);
  });

  it('composes with the Story 8.6 seating elevation without double-counting (AC3)', async () => {
    // Venue surface Z = venueGroundZ (20) + seatingElevationM (10) = 30. A height-12
    // caster on ground at 20 → roof at 32, only 2 m above the surface (< MIN 3) → gated
    // out. effectiveHeight = 12 − 10 + (20 − 20) = 2. (Single absolute comparison; the
    // seating elevation is not subtracted twice.)
    mocks.rpc.mockResolvedValue(casterRpcZ(12, 20));

    const result = await calculateVenueShadowForGeometry(venueGeometry, NOON, {
      seatingElevationM: 10,
      venueGroundZ: 20,
    });

    expect(result.castingShadows).toEqual([]);
    expect(result.sunlitAreaPercent).toBe(100);
  });
});
