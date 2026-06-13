import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateVenueShadow } from '@/lib/solar/shadow-calculation-service';

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
