import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  aggregateSunFreshness,
  applyRealSunEngine,
  buildPredictionUncertainty,
  classifySunStatus,
  createDedupedForecastFetcher,
  extractSunlitWindow,
  mapWithConcurrency,
  peakTimeFromTimeline,
  resolveRequestedAt,
  resolveVenueGeometry,
  shouldUseRealSunEngine,
  skyConditionFromCloudCover,
  synthesizeFootprint,
  usesRealSunEngine,
} from '@/lib/services/sun-engine';
import { clearSunEngineCachesForTests } from '@/lib/services/sun-engine-cache';
import type { StoredVenue } from '@/lib/services/venue-store';
import type { ObstructionRiskClass, ShadowTimelinePoint, WeatherSlice } from '@/lib/solar/types';

// Real path drives the engine + weather through these two boundaries ONLY:
// the get_buildings_near_point RPC and the Met.no weather fetch. Both mocked —
// no live Supabase / Met.no, exactly like shadow-calculation-service.test.ts.
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  getForecast: vi.fn(),
  getCurrentWeather: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  supabaseServiceRole: { from: mocks.from, rpc: mocks.rpc },
  getSupabaseServiceRole: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));

vi.mock('@/lib/weather/met-no-service', () => ({
  getForecast: mocks.getForecast,
  getCurrentWeather: mocks.getCurrentWeather,
}));

const SUMMER_MIDDAY = new Date('2026-06-21T10:30:00.000Z'); // Stockholm 12:30, sun high
const WINTER_NIGHT = new Date('2026-01-15T18:00:00.000Z'); // Stockholm 19:00, sun down

function makeStoredVenue(overrides: Partial<StoredVenue> = {}): StoredVenue {
  return {
    id: '1',
    venueId: '1',
    venueName: 'Kafé Magasinet',
    venueSlug: 'test-venue-sunny',
    slug: 'test-venue-sunny',
    neighborhood: 'Inom Vallgraven',
    location: { lat: 57.7053, lng: 11.9639 }, // inom-vallgraven launch cluster
    currentSunStatus: 'Sunny',
    skyCondition: 'clear',
    isPartner: true,
    confidence: 92,
    distanceMeters: 0,
    sunExposurePercent: 95,
    sunWindow: { start: '13:00', end: '18:30' },
    ...overrides,
  };
}

function weatherSlice(overrides: Partial<WeatherSlice> = {}): WeatherSlice {
  return {
    cloudCover: 10,
    temperature: 18,
    isForecast: false,
    source: 'metno',
    createdAt: new Date(),
    ...overrides,
  };
}

function timelinePoint(overrides: Partial<ShadowTimelinePoint>): ShadowTimelinePoint {
  return {
    timestamp: new Date('2026-06-21T10:00:00.000Z'),
    shadowedAreaPercent: 0,
    sunlitAreaPercent: 100,
    confidence: 0.6,
    isSunVisible: true,
    ...overrides,
  };
}

describe('sun-engine pure mappers', () => {
  it('maps Met.no cloud_area_fraction to skyCondition incl. boundaries', () => {
    expect(skyConditionFromCloudCover(0)).toBe('clear');
    expect(skyConditionFromCloudCover(19.9)).toBe('clear');
    expect(skyConditionFromCloudCover(20)).toBe('partly-cloudy');
    expect(skyConditionFromCloudCover(60)).toBe('partly-cloudy');
    expect(skyConditionFromCloudCover(60.1)).toBe('overcast');
    expect(skyConditionFromCloudCover(100)).toBe('overcast');
  });

  it('classifies sun status from the Sunny>=70 / Partial>=30 / Shaded thresholds', () => {
    expect(classifySunStatus(100)).toBe('Sunny');
    expect(classifySunStatus(70)).toBe('Sunny');
    expect(classifySunStatus(69)).toBe('Partial');
    expect(classifySunStatus(30)).toBe('Partial');
    expect(classifySunStatus(29)).toBe('Shaded');
    expect(classifySunStatus(0)).toBe('Shaded');
  });

  it('synthesizes a closed footprint polygon centred on the venue point', () => {
    const polygon = synthesizeFootprint(57.7053, 11.9639, 10);
    expect(polygon.type).toBe('Polygon');
    const ring = polygon.coordinates[0];
    expect(ring).toHaveLength(5);
    expect(ring[0]).toEqual(ring[4]); // closed
    // Centroid of the four corners is the venue point.
    const cx = (ring[0][0] + ring[1][0] + ring[2][0] + ring[3][0]) / 4;
    const cy = (ring[0][1] + ring[1][1] + ring[2][1] + ring[3][1]) / 4;
    expect(cx).toBeCloseTo(11.9639, 6);
    expect(cy).toBeCloseTo(57.7053, 6);
  });

  it('resolves the engine geometry polygon-first, footprint-fallback (DECISION B)', () => {
    const polygon: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[
        [11.97, 57.70],
        [11.971, 57.70],
        [11.971, 57.701],
        [11.97, 57.701],
        [11.97, 57.70],
      ]],
    };
    expect(resolveVenueGeometry(makeStoredVenue({ seatingArea: polygon }))).toBe(polygon);

    const fallback = resolveVenueGeometry(makeStoredVenue({ seatingArea: undefined }));
    expect(fallback.coordinates[0]).toHaveLength(5);
  });

  it('extracts the longest contiguous sunlit window, or undefined when none', () => {
    const points: ShadowTimelinePoint[] = [
      timelinePoint({ timestamp: new Date('2026-06-21T09:00:00.000Z'), sunlitAreaPercent: 10 }),
      timelinePoint({ timestamp: new Date('2026-06-21T10:00:00.000Z'), sunlitAreaPercent: 80 }), // 12:00 Sthlm
      timelinePoint({ timestamp: new Date('2026-06-21T12:00:00.000Z'), sunlitAreaPercent: 90 }), // 14:00 Sthlm
      timelinePoint({ timestamp: new Date('2026-06-21T14:00:00.000Z'), sunlitAreaPercent: 5 }),
    ];
    expect(extractSunlitWindow(points)).toEqual({ start: '12:00', end: '14:00' });

    const noSun = [
      timelinePoint({ sunlitAreaPercent: 0, isSunVisible: false }),
      timelinePoint({ sunlitAreaPercent: 10 }),
    ];
    expect(extractSunlitWindow(noSun)).toBeUndefined();
  });

  it('reports the peak-exposure time, or undefined when never sunlit', () => {
    const points: ShadowTimelinePoint[] = [
      timelinePoint({ timestamp: new Date('2026-06-21T10:00:00.000Z'), sunlitAreaPercent: 60 }),
      timelinePoint({ timestamp: new Date('2026-06-21T11:00:00.000Z'), sunlitAreaPercent: 95 }), // 13:00 Sthlm
    ];
    expect(peakTimeFromTimeline(points)).toBe('13:00');
    expect(peakTimeFromTimeline([timelinePoint({ sunlitAreaPercent: 5 })])).toBeUndefined();
  });

  it('builds predictionUncertainty: coverage->building_shadow_coverage, tree->vegetation, stale->weather', () => {
    const now = new Date('2026-06-21T12:00:00.000Z');
    const result = buildPredictionUncertainty(
      {
        shadowDataCoverage: {
          clusterId: 'inom-vallgraven',
          clusterName: 'Inom Vallgraven',
          status: 'unknown',
          checkedCount: 0,
          agreementRate: null,
          missingConditions: [],
          uncertaintyCounts: {},
          evidenceFiles: [],
          allowsHighConfidence: false,
          confidenceCap: 0.6,
        },
        obstructionRisks: ['tree', 'awning'],
      },
      weatherSlice({ isForecast: true }),
      55,
      now,
    );
    expect(result).toEqual({
      level: 'medium',
      reasons: ['building_shadow_coverage', 'vegetation', 'awning', 'weather'],
    });
  });

  it('omits predictionUncertainty when coverage is eligible and weather is fresh', () => {
    const now = new Date('2026-06-21T12:00:00.000Z');
    const result = buildPredictionUncertainty(
      {
        shadowDataCoverage: {
          clusterId: 'inom-vallgraven',
          clusterName: 'Inom Vallgraven',
          status: 'eligible',
          checkedCount: 70,
          agreementRate: 0.9,
          missingConditions: [],
          uncertaintyCounts: {},
          evidenceFiles: ['fixture'],
          allowsHighConfidence: true,
          confidenceCap: 1,
        },
        obstructionRisks: [],
      },
      weatherSlice({ createdAt: now }),
      90,
      now,
    );
    expect(result).toBeUndefined();
  });

  it('derives the uncertainty level from the confidence band', () => {
    const now = new Date('2026-06-21T12:00:00.000Z');
    const coverage = {
      obstructionRisks: ['tree'] as ObstructionRiskClass[],
      shadowDataCoverage: undefined,
    };
    expect(buildPredictionUncertainty(coverage, weatherSlice({ createdAt: now, validAt: now }), 40, now)?.level).toBe('high');
    expect(buildPredictionUncertainty(coverage, weatherSlice({ createdAt: now, validAt: now }), 60, now)?.level).toBe('medium');
    expect(buildPredictionUncertainty(coverage, weatherSlice({ createdAt: now, validAt: now }), 80, now)?.level).toBe('low');
  });

  it('flags weather uncertainty when the slice valid-time is >2h stale, not the fetch instant (5.3)', () => {
    const now = new Date('2026-06-21T12:00:00.000Z');
    // Fetched "now" (createdAt), but the slice is valid for 3h ago → genuinely
    // stale. The OLD code keyed staleness off createdAt and could never fire.
    const staleValidAt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const result = buildPredictionUncertainty(
      { shadowDataCoverage: undefined, obstructionRisks: [] },
      weatherSlice({ isForecast: false, createdAt: now, validAt: staleValidAt }),
      80,
      now,
    );
    expect(result?.reasons).toContain('weather');
  });

  it('does NOT flag weather uncertainty for a fresh current slice (validAt ~ now)', () => {
    const now = new Date('2026-06-21T12:00:00.000Z');
    const result = buildPredictionUncertainty(
      { shadowDataCoverage: undefined, obstructionRisks: [] },
      weatherSlice({ isForecast: false, createdAt: now, validAt: now }),
      80,
      now,
    );
    expect(result).toBeUndefined();
  });

  it('flags a future-planner forecast slice as approximate via isForecast (5.3)', () => {
    const now = new Date('2026-06-21T12:00:00.000Z');
    const futureValidAt = new Date(now.getTime() + 8 * 60 * 60 * 1000); // planning ahead
    const result = buildPredictionUncertainty(
      { shadowDataCoverage: undefined, obstructionRisks: [] },
      weatherSlice({ isForecast: true, createdAt: now, validAt: futureValidAt }),
      80,
      now,
    );
    expect(result?.reasons).toContain('weather');
  });

  it('aggregates per-venue freshness to a single response value', () => {
    expect(
      aggregateSunFreshness([
        { sunDataSource: 'weather', weatherUpdatedAt: '2026-06-21T10:00:00.000Z' },
        { sunDataSource: 'geometry-only' },
        { sunDataSource: 'weather', weatherUpdatedAt: '2026-06-21T10:05:00.000Z' },
      ]),
    ).toEqual({ sunDataSource: 'weather', weatherUpdatedAt: '2026-06-21T10:05:00.000Z' });

    expect(aggregateSunFreshness([{ sunDataSource: 'geometry-only' }])).toEqual({
      sunDataSource: 'geometry-only',
    });
  });

  it('resolves the requested instant from now or the planner Stockholm-local selection', () => {
    const now = new Date('2026-06-21T08:00:00.000Z');
    expect(resolveRequestedAt(undefined, now)).toBe(now);
    // 14:00 Stockholm summer (CEST, +02:00) === 12:00Z
    expect(
      resolveRequestedAt({ date: '2026-06-21', time: '14:00', isFutureDate: true }, now).toISOString(),
    ).toBe('2026-06-21T12:00:00.000Z');
  });
});

describe('shouldUseRealSunEngine / usesRealSunEngine env gate', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is opt-in via SUNNYSEAT_SUN_ENGINE=real and requires service-role config', () => {
    vi.stubEnv('SUNNYSEAT_SUN_ENGINE', '');
    expect(usesRealSunEngine()).toBe(false);
    expect(shouldUseRealSunEngine()).toBe(false);

    vi.stubEnv('SUNNYSEAT_SUN_ENGINE', 'real');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect(usesRealSunEngine()).toBe(true);
    expect(shouldUseRealSunEngine()).toBe(false); // flag on but no config -> seed path

    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
    expect(shouldUseRealSunEngine()).toBe(true);
  });
});

describe('applyRealSunEngine integration (mocked RPC + weather)', () => {
  beforeEach(() => {
    // Story 9.3: the engine now caches per (venue, 15-min bucket, day) + buildings
    // per (centroid, radius). These cases reuse the same venue/time, so clear both
    // caches each test to keep them independent (otherwise a primed success would
    // shadow a later case that mocks a failure).
    clearSunEngineCachesForTests();
    mocks.from.mockReset();
    mocks.rpc.mockReset();
    mocks.getForecast.mockReset();
    mocks.getCurrentWeather.mockReset();
    mocks.rpc.mockResolvedValue({ data: [], error: null }); // no shadow casters
    mocks.getForecast.mockResolvedValue([weatherSlice()]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(SUMMER_MIDDAY);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('produces engine sun fields through the unchanged DTO (AC #1)', async () => {
    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    // No shadow casters at midday -> fully sunlit; integer 0..100.
    expect(outcome.venue.currentSunStatus).toBe('Sunny');
    expect(outcome.venue.sunExposurePercent).toBe(100);
    expect(Number.isInteger(outcome.venue.confidence)).toBe(true);
    expect(outcome.venue.confidence).toBeGreaterThanOrEqual(0);
    expect(outcome.venue.confidence).toBeLessThanOrEqual(100);
    expect(outcome.venue.skyCondition).toBe('clear'); // cloudCover 10
  });

  it('caps confidence below the high-confidence band for unknown coverage (Story 3.0.5)', async () => {
    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);

    // Conservative default coverage = unknown -> cannot be "confidently sunny".
    expect(outcome.venue.confidence).toBeLessThan(70);
    expect(outcome.venue.predictionUncertainty?.reasons).toContain('building_shadow_coverage');
  });

  it('reports NoSun when the sun is below the horizon (AC #1)', async () => {
    vi.setSystemTime(WINTER_NIGHT);
    const outcome = await applyRealSunEngine(makeStoredVenue(), WINTER_NIGHT, WINTER_NIGHT);
    expect(outcome.venue.currentSunStatus).toBe('NoSun');
    expect(outcome.venue.sunExposurePercent).toBe(0);
  });

  it('reflects real weather freshness when a weather slice is present (AC #3)', async () => {
    const createdAt = new Date(SUMMER_MIDDAY);
    mocks.getForecast.mockResolvedValue([weatherSlice({ createdAt })]);

    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    expect(outcome.freshness).toEqual({
      sunDataSource: 'weather',
      weatherUpdatedAt: createdAt.toISOString(),
    });
  });

  it('falls back to geometry-only + unavailable sky when Met.no is unavailable (AC #3)', async () => {
    mocks.getForecast.mockResolvedValue([]);

    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    expect(outcome.freshness).toEqual({ sunDataSource: 'geometry-only' });
    expect(outcome.venue.skyCondition).toBe('unavailable');
  });

  it('drives calculateVenueShadowForGeometry, never the legacy fetchVenue table (DECISION B)', async () => {
    await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    // The legacy fetchVenue path does supabaseServiceRole.from('venues')...single().
    // The geometry-first adapter must never touch .from — only the RPC.
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith(
      'get_buildings_near_point',
      expect.objectContaining({
        p_latitude: expect.any(Number),
        p_longitude: expect.any(Number),
        p_radius_meters: expect.any(Number),
      }),
    );
  });

  it('resolves geometry from the seating polygon when present, else the point footprint', async () => {
    // Without a seatingArea: RPC centroid == the venue location.
    await applyRealSunEngine(makeStoredVenue({ seatingArea: undefined }), SUMMER_MIDDAY, SUMMER_MIDDAY);
    const [, footprintArgs] = mocks.rpc.mock.calls[0];
    expect(footprintArgs.p_latitude).toBeCloseTo(57.7053, 4);
    expect(footprintArgs.p_longitude).toBeCloseTo(11.9639, 4);

    mocks.rpc.mockClear();

    // With a seatingArea polygon: RPC centroid == the polygon centroid (offset
    // from the point), proving the engine used the real polygon.
    const seatingArea: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[
        [11.9698, 57.6998],
        [11.9702, 57.6998],
        [11.9702, 57.7002],
        [11.9698, 57.7002],
        [11.9698, 57.6998],
      ]],
    };
    await applyRealSunEngine(makeStoredVenue({ seatingArea }), SUMMER_MIDDAY, SUMMER_MIDDAY);
    const [, polygonArgs] = mocks.rpc.mock.calls[0];
    expect(polygonArgs.p_latitude).toBeCloseTo(57.7000, 4);
    expect(polygonArgs.p_longitude).toBeCloseTo(11.9700, 4);
  });

  it('maps obstruction-risk casters onto the public uncertainty reasons (Story 3.0.6)', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        Id: 1,
        Geometry: JSON.stringify(synthesizeFootprint(57.7053, 11.9639, 6)),
        Height: 12,
        Source: 'goteborg_open_data',
        QualityScore: 0.9,
        HeightSource: 'Surveyed',
        SourceFlags: ['obstruction:tree'],
        FilterDecision: 'include',
        CasterClass: 'vegetation',
      }],
      error: null,
    });

    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    expect(outcome.venue.predictionUncertainty?.reasons).toContain('vegetation');
  });

  it('threads seatingElevationM through to the height gate: a raised terrace excludes an otherwise-shadowing caster (Story 8.6 AC #1/#3)', async () => {
    // A height-12 caster whose footprint coincides with the venue footprint, so
    // at ground level it fully shadows the venue.
    const caster = synthesizeFootprint(57.7053, 11.9639, 10);
    mocks.rpc.mockResolvedValue({
      data: [{
        Id: 3001,
        Geometry: JSON.stringify(caster),
        Height: 12,
        Source: 'goteborg_open_data',
        QualityScore: 0.9,
        HeightSource: 'Surveyed',
        BuildingType: 'building',
      }],
      error: null,
    });

    // Ground-level venue (no seatingElevationM): the caster shadows it.
    const groundLevel = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    // Same venue raised 50 m: effectiveHeight = 12 - 50 < 0 → caster gated out → sunlit.
    const rooftop = await applyRealSunEngine(
      makeStoredVenue({ seatingElevationM: 50 }),
      SUMMER_MIDDAY,
      SUMMER_MIDDAY,
    );

    expect(groundLevel.venue.sunExposurePercent).toBeLessThan(100);
    expect(rooftop.venue.sunExposurePercent).toBe(100);
    expect(rooftop.venue.sunExposurePercent).toBeGreaterThan(
      groundLevel.venue.sunExposurePercent,
    );
    expect(rooftop.venue.currentSunStatus).toBe('Sunny');
  });

  it('threads groundElevationM end-to-end: a venue uphill of a downhill caster is no longer shadowed (Story 8.7 AC #1/#3)', async () => {
    // A height-12 caster whose footprint coincides with the venue, standing on ground
    // at 10 m RH2000 (roof ≈ 22 m). At ground level it shadows the venue.
    const caster = synthesizeFootprint(57.7053, 11.9639, 10);
    const rpcRow = {
      Id: 4001,
      Geometry: JSON.stringify(caster),
      Height: 12,
      Source: 'goteborg_open_data',
      QualityScore: 0.9,
      HeightSource: 'Surveyed',
      BuildingType: 'building',
      GroundZRh2000: 10,
      RoofZRh2000: 22,
    };
    mocks.rpc.mockResolvedValue({ data: [rpcRow], error: null });

    // Venue with no ground elevation (flat assumption) → caster shadows it.
    const flat = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    // Same venue on a 40 m rise → the downhill caster's roof (22 m) is below the
    // venue surface (40 m) → gated out → fully sunlit.
    const hilltop = await applyRealSunEngine(
      makeStoredVenue({ groundElevationM: 40 }),
      SUMMER_MIDDAY,
      SUMMER_MIDDAY,
    );

    expect(flat.venue.sunExposurePercent).toBeLessThan(100);
    expect(hilltop.venue.sunExposurePercent).toBe(100);
    expect(hilltop.venue.currentSunStatus).toBe('Sunny');
  });

  it('degrades to a safe seed result instead of throwing (never a 500, DECISION D)', async () => {
    mocks.getForecast.mockResolvedValue([weatherSlice()]);
    mocks.rpc.mockRejectedValue(new Error('boom'));
    // RPC rejection is swallowed inside the engine (returns shadow-data-unavailable),
    // so force a hard failure to exercise the adapter's own catch.
    mocks.getForecast.mockRejectedValue(new Error('weather exploded'));

    const outcome = await applyRealSunEngine(makeStoredVenue(), SUMMER_MIDDAY, SUMMER_MIDDAY);
    expect(outcome.freshness).toEqual({ sunDataSource: 'geometry-only' });
    // Safe fallback returns the venue's base DTO (seed values), never throws.
    expect(outcome.venue.id).toBe('1');
  });
});

describe('mapWithConcurrency + createDedupedForecastFetcher (Story 8.5 5.1/5.2)', () => {
  it('never runs more than the concurrency cap at once and preserves input order', async () => {
    let active = 0;
    let maxActive = 0;
    const task = async (n: number): Promise<number> => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return n * 2;
    };

    const results = await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, task);

    expect(maxActive).toBeLessThanOrEqual(3);
    expect(maxActive).toBeGreaterThan(1); // actually ran concurrently
    expect(results).toEqual([2, 4, 6, 8, 10, 12, 14]); // order preserved
  });

  it('returns an empty result for no items without running the task', async () => {
    const task = vi.fn(async (n: number) => n);
    expect(await mapWithConcurrency([], 4, task)).toEqual([]);
    expect(task).not.toHaveBeenCalled();
  });

  it('dedupes Met.no forecasts by rounded coordinates (one upstream fetch per ≤4-decimal key)', async () => {
    const underlying = vi.fn(async () => [weatherSlice()]);
    const deduped = createDedupedForecastFetcher(underlying);

    await Promise.all([
      deduped(57.70531, 11.96391), // rounds to 57.7053,11.9639
      deduped(57.70534, 11.96394), // same rounded key → coalesced
      deduped(57.71823, 11.98012), // distinct key
    ]);

    expect(underlying).toHaveBeenCalledTimes(2);
  });
});
