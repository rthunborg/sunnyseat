import type { StoredVenue } from '@/lib/services/venue-store';
import type { SunFreshnessMeta, VenueDataDto, VenueDaySeriesEntry } from '@/lib/types/api';
import {
  PLANNER_END_MINUTES,
  PLANNER_START_MINUTES,
  PLANNER_STEP_MINUTES,
  stockholmDateKey,
} from '@/lib/utils/time-planner';
import { SUN_DATA_SOURCE_GEOMETRY_ONLY, SUN_DATA_SOURCE_WEATHER } from '@/lib/utils/sun-freshness';
import {
  seatingCentroidWgs84,
  venueEngineCoordinate,
} from '@/lib/services/sun-geometry-coordinates';
import { calculateSolarPosition } from '@/lib/solar/solar-calculation-service';
import { MAX_SHADOW_DISTANCE } from '@/lib/solar';
import {
  buildPlannerHashContract,
} from '@/lib/services/sun-geometry-hash';
import {
  gateGeometrySeriesWithWeatherSnapshots,
  getWeatherSnapshotRepositoryForRoute,
  type WeatherSnapshotRepository,
} from '@/lib/services/weather-snapshots';
import { normalizeVenueForResponse } from '@/lib/services/venues-fixture';
import {
  applyRealSunEngine,
  computeVenueDaySeries,
  safeSeedOutcome,
  type SunEngineOutcome,
} from '@/lib/services/sun-engine';
import { toVenueData } from '@/lib/services/venue-store';
import { extractPublicSunPeak, extractPublicSunWindow } from '@/lib/utils/public-sun';

export type PersistedGeometrySeriesEntry = {
  minutes: number;
  sunExposurePercent: number;
};

export type PersistedSunGeometryCoverage = {
  venueId?: string;
  stockholmDate: string;
  geometryInputHash: string;
  status?: 'ready' | 'building' | 'dirty';
  series: PersistedGeometrySeriesEntry[];
};

export type CurrentGeometryInputState = {
  geometryInputHash: string | null;
  status?: 'ready' | 'building' | 'dirty';
};

export interface SunGeometryRepository {
  readCurrentGeometryInput?(
    venueId: string,
    stockholmDate: string,
    venue: StoredVenue,
  ): Promise<CurrentGeometryInputState | null>;
  computeCurrentGeometryInputHash?(venue: StoredVenue, stockholmDate: string): Promise<string>;
  readCurrentCoverageForVenueDay(
    venueId: string,
    stockholmDate: string,
    geometryInputHash: string,
    venue: StoredVenue,
  ): Promise<PersistedSunGeometryCoverage | null>;
}

export type GeometryInputPayload = {
  version: 'g1';
  planner: Awaited<ReturnType<typeof buildPlannerHashContract>>;
  venue: {
    id: string;
    seatingArea: GeoJSON.Polygon;
    seatingCentroid: { lat: number; lng: number };
    seatingElevationM: number | null;
    groundElevationM: number | null;
  };
  casters: unknown[];
};

export type PersistedSunRouteRepositories = {
  sunGeometryRepository: SunGeometryRepository;
  weatherSnapshotRepository: WeatherSnapshotRepository;
};

export class SunGeometryCoverageMissingError extends Error {
  readonly code = 'SUN_GEOMETRY_COVERAGE_MISSING';
  constructor(
    readonly detail: {
      venueId: string;
      stockholmDate: string;
      geometryInputHash: string;
      reason: string;
    },
  ) {
    super(
      `Missing current geometry coverage for venue ${detail.venueId} on ${detail.stockholmDate} (${detail.reason})`,
    );
  }
}

let sunGeometryRepositoryForTests: SunGeometryRepository | undefined;

export function __setSunGeometryRepositoryForTests(repo: SunGeometryRepository | undefined): void {
  sunGeometryRepositoryForTests = repo;
}

export function getSunGeometryRepositoryForRoute(): SunGeometryRepository {
  return sunGeometryRepositoryForTests ?? defaultSunGeometryRepository;
}

export function routeUsesInjectedSunGeometryRepositoryForTests(): boolean {
  return sunGeometryRepositoryForTests !== undefined;
}

export async function buildPersistedSunOutcome(
  venue: StoredVenue,
  requestedAt: Date,
  now: Date,
  options: {
    weatherBucket?: string;
    repositories?: Partial<PersistedSunRouteRepositories>;
  } = {},
): Promise<SunEngineOutcome> {
  if (process.env.NODE_ENV === 'test' && !sunGeometryRepositoryForTests && !options.repositories?.sunGeometryRepository) {
    return buildLegacyEngineOutcomeForTests(venue, requestedAt, now);
  }

  const stockholmDate = stockholmDateKey(requestedAt);
  const geometryRepository = options.repositories?.sunGeometryRepository ?? getSunGeometryRepositoryForRoute();
  const weatherRepository =
    options.repositories?.weatherSnapshotRepository ?? getWeatherSnapshotRepositoryForRoute();
  const currentInput = await resolveCurrentGeometryInput(geometryRepository, venue, stockholmDate);
  assertCurrentGeometryInput(venue.id, stockholmDate, currentInput);
  const geometryInputHash = currentInput.geometryInputHash;
  const coverage = await geometryRepository.readCurrentCoverageForVenueDay(
    venue.id,
    stockholmDate,
    geometryInputHash,
    venue,
  );
  assertCurrentCoverage(venue.id, stockholmDate, geometryInputHash, coverage);

  const snapshot = await weatherRepository.readSnapshotForVenueDay(
    venue,
    options.weatherBucket,
    stockholmDate,
  );
  const weatherSlices = snapshot?.status === 'ready' ? snapshot.slices : [];
  const gatedSeries = gateGeometrySeriesWithWeatherSnapshots({
    geometrySeries: coverage.series,
    weatherSlices,
    venue,
    stockholmDate,
  });
  const selectedStep = selectedStepForRequestedInstant(gatedSeries, venue, requestedAt, {
    isLiveCurrentRequest: requestedAt.getTime() === now.getTime(),
  });
  const publicSunWindow = extractPublicSunWindow(gatedSeries, {
    stepMinutes: PLANNER_STEP_MINUTES,
  });
  const publicSunPeak = extractPublicSunPeak(gatedSeries);
  const freshness = freshnessFromSnapshot(snapshot);
  const venueDto = normalizeVenueForResponse({
    ...toVenueData(venue),
    currentSunStatus: selectedStep.currentSunStatus,
    weatherGateState: selectedStep.weatherGateState,
    sunExposurePercent: selectedStep.sunExposurePercent,
    confidence: freshness.sunDataSource === SUN_DATA_SOURCE_WEATHER ? venue.confidence : Math.min(venue.confidence, 40),
    skyCondition: selectedStep.skyCondition,
    sunWindow: publicSunWindow
      ? {
          start: formatPlannerMinute(publicSunWindow.startMinutes),
          end: formatPlannerMinute(publicSunWindow.endMinutes),
          weatherGateState: publicSunWindow.weatherGateState,
        }
      : undefined,
    sunDaySeries: gatedSeries,
    predictionEvidence: { geometryInputHash },
  } as VenueDataDto);

  return {
    venue: venueDto,
    freshness,
    ...(publicSunPeak
      ? {
          peakTime: formatPlannerMinute(publicSunPeak.minutes),
          peakWeatherGateState:
            publicSunPeak.weatherGateState === 'not_gated'
              ? 'not_gated' as const
              : 'unknown' as const,
        }
      : {}),
    daySeries: gatedSeries,
  };
}

async function resolveCurrentGeometryInput(
  repository: SunGeometryRepository,
  venue: StoredVenue,
  stockholmDate: string,
): Promise<CurrentGeometryInputState | null> {
  if (repository.readCurrentGeometryInput) {
    return repository.readCurrentGeometryInput(venue.id, stockholmDate, venue);
  }
  if (repository.computeCurrentGeometryInputHash) {
    return {
      status: 'ready',
      geometryInputHash: await repository.computeCurrentGeometryInputHash(venue, stockholmDate),
    };
  }
  return null;
}

function assertCurrentGeometryInput(
  venueId: string,
  stockholmDate: string,
  state: CurrentGeometryInputState | null,
): asserts state is CurrentGeometryInputState & { geometryInputHash: string } {
  const reason =
    state === null
      ? 'missing-current-input'
      : state.status && state.status !== 'ready'
        ? state.status
        : !state.geometryInputHash
          ? 'missing-current-hash'
          : undefined;
  if (reason) {
    throw new SunGeometryCoverageMissingError({
      venueId,
      stockholmDate,
      geometryInputHash: state?.geometryInputHash ?? ZERO_GEOMETRY_INPUT_HASH,
      reason,
    });
  }
}

function assertCurrentCoverage(
  venueId: string,
  stockholmDate: string,
  geometryInputHash: string,
  coverage: PersistedSunGeometryCoverage | null,
): asserts coverage is PersistedSunGeometryCoverage {
  const reason =
    coverage === null
      ? 'missing'
      : coverage.stockholmDate !== stockholmDate
        ? 'wrong-date'
        : coverage.geometryInputHash !== geometryInputHash
          ? 'wrong-hash'
          : coverage.status && coverage.status !== 'ready'
            ? coverage.status
            : coverage.series.length === 0
              ? 'empty-series'
              : undefined;
  if (reason) {
    throw new SunGeometryCoverageMissingError({
      venueId,
      stockholmDate,
      geometryInputHash,
      reason,
    });
  }
}

function freshnessFromSnapshot(snapshot: Awaited<ReturnType<WeatherSnapshotRepository['readSnapshotForVenueDay']>>): SunFreshnessMeta {
  if (snapshot?.status === 'ready' && snapshot.weatherUpdatedAt && snapshot.slices.length > 0) {
    return { sunDataSource: SUN_DATA_SOURCE_WEATHER, weatherUpdatedAt: snapshot.weatherUpdatedAt };
  }
  return { sunDataSource: SUN_DATA_SOURCE_GEOMETRY_ONLY };
}

function nearestStep<T extends { minutes: number }>(series: readonly T[], minutes: number): T {
  if (series.length === 0) {
    throw new Error('Cannot select an empty geometry series');
  }
  return series.reduce((best, candidate) =>
    Math.abs(candidate.minutes - minutes) < Math.abs(best.minutes - minutes) ? candidate : best,
  );
}

function selectedStepForRequestedInstant(
  series: readonly VenueDaySeriesEntry[],
  venue: StoredVenue,
  requestedAt: Date,
  options: { isLiveCurrentRequest?: boolean } = {},
): VenueDaySeriesEntry {
  const requestedMinutes = stockholmMinutes(requestedAt);
  const selectedStep = nearestStep(series, requestedMinutes);
  if (options.isLiveCurrentRequest && requestedMinutes > PLANNER_END_MINUTES) {
    return {
      ...selectedStep,
      sunExposurePercent: 0,
      currentSunStatus: 'NoSun',
      weatherGateState: 'unknown',
      skyCondition: 'unavailable',
    };
  }
  if (isSunBelowHorizonAtInstant(venue, requestedAt)) {
    return {
      ...selectedStep,
      sunExposurePercent: 0,
      currentSunStatus: 'NoSun',
      weatherGateState: 'not_gated',
    };
  }
  return selectedStep;
}

function isSunBelowHorizonAtInstant(venue: StoredVenue, requestedAt: Date): boolean {
  const coordinate = venueEngineCoordinate(venue);
  return !calculateSolarPosition(requestedAt, coordinate.lat, coordinate.lng).isSunVisible;
}

function stockholmMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

function formatPlannerMinute(minutesOfDay: number): string {
  const hours = Math.floor(minutesOfDay / 60).toString().padStart(2, '0');
  const minutes = (minutesOfDay % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

async function buildLegacyEngineOutcomeForTests(
  venue: StoredVenue,
  requestedAt: Date,
  now: Date,
): Promise<SunEngineOutcome> {
  try {
    const outcome = await applyRealSunEngine(venue, requestedAt, now);
    try {
      const daySeries = await computeVenueDaySeries(venue, requestedAt, now);
      return { ...outcome, daySeries };
    } catch {
      return outcome;
    }
  } catch {
    return safeSeedOutcome(venue);
  }
}

const ZERO_GEOMETRY_INPUT_HASH = 'g1:0000000000000000000000000000000000000000000000000000000000000000';

const defaultSunGeometryRepository: SunGeometryRepository = {
  async readCurrentGeometryInput(venueId) {
    const { getSupabaseServiceRole } = await import('@/lib/supabase/server');
    const { data, error } = await getSupabaseServiceRole()
      .from('venue_geometry_inputs')
      .select('status, current_geometry_input_hash')
      .eq('venue_id', venueId)
      .maybeSingle();
    if (error) throw new Error(`Geometry input read failed: ${error.message}`);
    if (!data) return null;
    return {
      status: data.status as CurrentGeometryInputState['status'],
      geometryInputHash: data.current_geometry_input_hash,
    };
  },

  async readCurrentCoverageForVenueDay(venueId, stockholmDate, geometryInputHash) {
    const { getSupabaseServiceRole } = await import('@/lib/supabase/server');
    const client = getSupabaseServiceRole();
    const { data: input, error: inputError } = await client
      .from('venue_geometry_inputs')
      .select('venue_id, status, current_geometry_input_hash')
      .eq('venue_id', venueId)
      .maybeSingle();
    if (inputError) throw new Error(`Geometry input read failed: ${inputError.message}`);
    if (!input || input.status !== 'ready' || input.current_geometry_input_hash !== geometryInputHash) {
      return null;
    }
    const { data, error } = await client
      .from('venue_sun_geometry_series')
      .select('venue_id, stockholm_date, geometry_input_hash, series')
      .eq('venue_id', venueId)
      .eq('stockholm_date', stockholmDate)
      .eq('geometry_input_hash', geometryInputHash)
      .maybeSingle();
    if (error) throw new Error(`Geometry series read failed: ${error.message}`);
    if (!data) return null;
    return {
      venueId: data.venue_id,
      stockholmDate: data.stockholm_date,
      geometryInputHash: data.geometry_input_hash,
      status: 'ready',
      series: normalizePersistedSeries(data.series),
    };
  },
};

export async function buildGeometryInputPayloadForVenue(
  venue: StoredVenue,
  stockholmDate: string,
): Promise<GeometryInputPayload> {
    if (!venue.seatingArea && process.env.SUNNYSEAT_VENUE_STORE === 'supabase') {
      throw new SunGeometryCoverageMissingError({
        venueId: venue.id,
        stockholmDate,
        geometryInputHash: 'g1:0000000000000000000000000000000000000000000000000000000000000000',
        reason: 'invalid-seating-polygon',
      });
    }
    const fallbackPoint = venue.engineLocation ?? venue.location;
    const geometry = venue.seatingArea ?? {
      type: 'Polygon',
      coordinates: [
        [
          [fallbackPoint.lng, fallbackPoint.lat],
          [fallbackPoint.lng, fallbackPoint.lat],
          [fallbackPoint.lng, fallbackPoint.lat],
          [fallbackPoint.lng, fallbackPoint.lat],
        ],
      ],
    } satisfies GeoJSON.Polygon;
    const centroid = seatingCentroidWgs84(geometry);
    let casters: unknown[];
    try {
      casters = await readRuntimeCasterHashRecords(centroid);
    } catch (error) {
      throw new SunGeometryCoverageMissingError({
        venueId: venue.id,
        stockholmDate,
        geometryInputHash: 'g1:0000000000000000000000000000000000000000000000000000000000000000',
        reason: `caster-set-unavailable:${error instanceof Error ? error.message : String(error)}`,
      });
    }
    return {
      version: 'g1',
      planner: buildPlannerHashContract(),
      venue: {
        id: venue.id,
        seatingArea: geometry,
        seatingCentroid: centroid,
        seatingElevationM: venue.seatingElevationM ?? null,
        groundElevationM: venue.groundElevationM ?? null,
      },
      casters,
    };
}

async function readRuntimeCasterHashRecords(centroid: { lat: number; lng: number }): Promise<unknown[]> {
  const { getSupabaseServiceRole } = await import('@/lib/supabase/server');
    const { data, error } = await getSupabaseServiceRole().rpc('get_shadow_caster_hash_records', {
    p_latitude: centroid.lat,
    p_longitude: centroid.lng,
    p_radius_meters: MAX_SHADOW_DISTANCE,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.Id ?? row.id ?? null,
    footprintEwkbHex: String(row.footprint_ewkb_hex ?? '').toUpperCase(),
    heightM: row.height_m ?? null,
    groundZRh2000: row.ground_z_rh2000 ?? null,
    roofZRh2000: row.roof_z_rh2000 ?? null,
    sourcePriority: row.source_priority ?? null,
    shadowCasterTier: row.shadow_caster_tier ?? null,
    filterDecision: row.filter_decision ?? null,
    casterClass: row.caster_class ?? null,
    sourceFlags: row.source_flags ?? [],
    sourceObjectMetadata: row.source_object_metadata ?? null,
    provenanceMetadata: row.provenance_metadata ?? null,
    importGeneration: row.import_generation ?? null,
  }));
}

function normalizePersistedSeries(value: unknown): PersistedGeometrySeriesEntry[] {
  if (!Array.isArray(value)) return [];
  const series: PersistedGeometrySeriesEntry[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const source = entry as Record<string, unknown>;
    const minutes = source.minutes;
    const sunExposurePercent = source.sunExposurePercent ?? source.sun_exposure_percent;
    if (
      typeof minutes === 'number' &&
      Number.isInteger(minutes) &&
      minutes >= PLANNER_START_MINUTES &&
      minutes <= PLANNER_END_MINUTES &&
      typeof sunExposurePercent === 'number' &&
      Number.isFinite(sunExposurePercent)
    ) {
      series.push({
        minutes,
        sunExposurePercent: Math.max(0, Math.min(100, sunExposurePercent)),
      });
    }
  }
  const expectedStepCount =
    Math.floor((PLANNER_END_MINUTES - PLANNER_START_MINUTES) / PLANNER_STEP_MINUTES) + 1;
  return series.length === expectedStepCount ? series.sort((a, b) => a.minutes - b.minutes) : [];
}
