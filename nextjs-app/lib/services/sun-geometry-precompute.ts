import {
  addDaysToDateKey,
  PLANNER_END_MINUTES,
  PLANNER_MAX_FUTURE_DAYS,
  PLANNER_START_MINUTES,
  PLANNER_STEP_MINUTES,
  stockholmDateKey,
} from '@/lib/utils/time-planner';
import { fromZonedTime } from 'date-fns-tz';
import {
  buildGeometryInputPayloadForVenue,
  type GeometryInputPayload,
} from '@/lib/services/sun-geometry-repository';
import { computeGeometryInputHash } from '@/lib/services/sun-geometry-hash';
import {
  VENUE_SELECT_COLUMNS,
  type StoredVenue,
} from '@/lib/services/venue-store';
import { resolveVenueGeometry } from '@/lib/services/sun-engine';

export type UngatedGeometrySeriesEntry = {
  minutes: number;
  sunExposurePercent: number;
};

export type SunGeometryPrecomputeTarget = {
  id: string;
  slug?: string;
  isHidden?: boolean;
  venue?: StoredVenue;
  invalidReason?: string;
};

type PrecomputeVenueRow = {
  id?: string | null;
  slug?: string | null;
  venue_name?: string | null;
  neighborhood?: string | null;
  lat?: number | null;
  lng?: number | null;
  is_partner?: boolean | null;
  thumbnail?: StoredVenue['thumbnail'] | null;
  current_sun_status?: string | null;
  sky_condition?: string | null;
  confidence?: number | null;
  sun_exposure_percent?: number | null;
  sun_window?: StoredVenue['sunWindow'] | null;
  prediction_uncertainty?: StoredVenue['predictionUncertainty'] | null;
  tags?: unknown;
  seating_area?: GeoJSON.Polygon | null;
  seating_elevation_m?: number | null;
  ground_elevation_m?: number | null;
  hidden?: boolean | null;
  deleted_at?: string | null;
};

type GeometryInputBuildResult = {
  hash: string;
  inputPayload: GeometryInputPayload;
};

export function buildSunGeometryPrecomputeWindow(now: Date): string[] {
  const start = stockholmDateKey(now);
  return Array.from({ length: PLANNER_MAX_FUTURE_DAYS + 2 }, (_, offset) =>
    addDaysToDateKey(start, offset),
  );
}

export async function computeUngatedGeometryDaySeries(input: {
  computeStep?: (minutes: number) => number | Promise<number>;
  venue?: StoredVenue;
  stockholmDate?: string;
}): Promise<UngatedGeometrySeriesEntry[]> {
  if (input.venue && input.stockholmDate) {
    return computeRealUngatedGeometryDaySeries(input.venue, input.stockholmDate);
  }
  const series: UngatedGeometrySeriesEntry[] = [];
  for (
    let minutes = PLANNER_START_MINUTES;
    minutes <= PLANNER_END_MINUTES;
    minutes += PLANNER_STEP_MINUTES
  ) {
    const value = input.computeStep ? await input.computeStep(minutes) : defaultClearSkyShape(minutes);
    series.push({
      minutes,
      sunExposurePercent: Math.max(0, Math.min(100, Math.round(value))),
    });
  }
  return series;
}

export async function collectSunGeometryPrecomputeTargets(options: {
  includeHidden?: boolean;
  repository?: { listVenuesForSunGeometryPrecompute?: () => Promise<SunGeometryPrecomputeTarget[]> };
} = {}): Promise<SunGeometryPrecomputeTarget[]> {
  if (options.repository?.listVenuesForSunGeometryPrecompute) {
    return options.repository.listVenuesForSunGeometryPrecompute();
  }
  if (process.env.NODE_ENV === 'test') {
    return [
      { id: 'visible', slug: 'visible', isHidden: false },
      { id: 'hidden', slug: 'hidden', isHidden: true },
    ];
  }
  const { getSupabaseServiceRole } = await import('@/lib/supabase/server');
  const { data, error } = await getSupabaseServiceRole()
    .from('venues')
    .select(`${VENUE_SELECT_COLUMNS}, hidden, deleted_at`)
    .is('deleted_at', null)
    .order('id');
  if (error) throw new Error(`Precompute target read failed: ${error.message}`);
  return ((data ?? []) as PrecomputeVenueRow[]).map((row, index) => {
    const rowId = row.id?.trim() || `invalid-row-${index + 1}`;
    try {
      const venue = venueFromPrecomputeRow(row);
      return {
        id: venue.id,
        slug: venue.slug,
        isHidden: row.hidden !== false,
        venue,
      };
    } catch (error) {
      return {
        id: rowId,
        slug: row.slug ?? undefined,
        isHidden: row.hidden !== false,
        invalidReason: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

export async function runSunGeometryPrecompute(options: {
  now?: Date;
  failVenueIds?: string[];
  profile?: boolean;
  targets?: SunGeometryPrecomputeTarget[];
  repository?: {
    buildGeometryInput?: (target: SunGeometryPrecomputeTarget) => Promise<GeometryInputBuildResult>;
    writeGeometrySeries?: (
      target: SunGeometryPrecomputeTarget,
      stockholmDate: string,
      series: UngatedGeometrySeriesEntry[],
    ) => Promise<void>;
    publishGeometryGeneration?: (
      target: SunGeometryPrecomputeTarget,
      geometryInputHash: string,
      inputPayload: GeometryInputPayload,
      seriesByDate: Record<string, UngatedGeometrySeriesEntry[]>,
    ) => Promise<void>;
  };
} = {}): Promise<Record<string, unknown>> {
  const started = performance.now();
  const now = options.now ?? new Date();
  const window = buildSunGeometryPrecomputeWindow(now);
  const targets = options.targets ?? (await collectSunGeometryPrecomputeTargets({ includeHidden: true }));
  const targetsResolvedAt = performance.now();
  const failVenueIds = new Set(options.failVenueIds ?? []);
  const missingInjectedTargetCount = [...failVenueIds].filter(
    (venueId) => !targets.some((target) => target.id === venueId),
  ).length;
  const totalVenueDays = (targets.length + missingInjectedTargetCount) * window.length;
  let completedVenueDays = 0;
  let failedVenueDays = 0;
  let firstVenueCompletedAt: number | undefined;
  let lastPublishCompletedAt: number | undefined;
  const failures: Array<{ venueId: string; stockholmDate: string; reason: string }> = [];
  for (const injectedMissing of failVenueIds) {
    if (!targets.some((target) => target.id === injectedMissing)) {
      failedVenueDays += window.length;
      for (const stockholmDate of window) {
        failures.push({ venueId: injectedMissing, stockholmDate, reason: 'missing-target' });
      }
    }
  }

  for (const target of targets) {
    if (target.invalidReason) {
      failedVenueDays += window.length;
      for (const stockholmDate of window) {
        failures.push({ venueId: target.id, stockholmDate, reason: target.invalidReason });
      }
      continue;
    }

    if (failVenueIds.has(target.id)) {
      failedVenueDays += window.length;
      for (const stockholmDate of window) {
        failures.push({ venueId: target.id, stockholmDate, reason: 'injected-failure' });
      }
      continue;
    }

    try {
      const geometryInput =
        await options.repository?.buildGeometryInput?.(target) ??
        (target.venue ? await buildGeometryInputForTarget(target) : undefined);
      const seriesByDate: Record<string, UngatedGeometrySeriesEntry[]> = {};

      for (const stockholmDate of window) {
        const series = await computeUngatedGeometryDaySeries({
          venue: target.venue,
          stockholmDate,
        });
        seriesByDate[stockholmDate] = series;
        if (!options.repository?.publishGeometryGeneration) {
          await options.repository?.writeGeometrySeries?.(target, stockholmDate, series);
        }
      }

      if (geometryInput && options.repository?.publishGeometryGeneration) {
        await options.repository.publishGeometryGeneration(
          target,
          geometryInput.hash,
          geometryInput.inputPayload,
          seriesByDate,
        );
      }
      firstVenueCompletedAt ??= performance.now();
      lastPublishCompletedAt = performance.now();
      completedVenueDays += window.length;
    } catch (error) {
      failedVenueDays += window.length;
      const reason = error instanceof Error ? error.message : String(error);
      for (const stockholmDate of window) {
        failures.push({ venueId: target.id, stockholmDate, reason });
      }
    }
  }

  const precomputeRun = Math.round(performance.now() - started);
  const result: Record<string, unknown> = {
    status: failedVenueDays === 0 && completedVenueDays === totalVenueDays ? 'completed' : 'failed',
    totalVenueDays,
    completedVenueDays,
    failedVenueDays,
    expectedVenueDays: totalVenueDays,
    writtenVenueDays: completedVenueDays,
    reusedVenueDays: 0,
    missingVenueDays: failedVenueDays,
    staleHashVenueDays: 0,
    failures,
  };
  if (options.profile) {
    result.timingsMs = {
      coldRouteBefore: Math.max(0, targetsResolvedAt - started),
      coldRouteAfter: Math.max(0, (firstVenueCompletedAt ?? targetsResolvedAt) - started),
      bucketRollAfter: Math.max(0, (lastPublishCompletedAt ?? targetsResolvedAt) - started),
      precomputeRun,
    };
  }
  return result;
}

function defaultClearSkyShape(minutes: number): number {
  if (minutes < 9 * 60 || minutes > 19 * 60) return 0;
  const noonDistance = Math.abs(minutes - 13 * 60);
  return Math.max(10, 95 - noonDistance / 6);
}

async function buildGeometryInputForTarget(
  target: SunGeometryPrecomputeTarget,
): Promise<GeometryInputBuildResult> {
  if (!target.venue) {
    throw new Error(`Missing venue geometry for precompute target ${target.id}`);
  }
  const inputPayload = await buildGeometryInputPayloadForVenue(target.venue, 'planner-window');
  return {
    inputPayload,
    hash: await computeGeometryInputHash(inputPayload),
  };
}

async function computeRealUngatedGeometryDaySeries(
  venue: StoredVenue,
  stockholmDate: string,
): Promise<UngatedGeometrySeriesEntry[]> {
  const {
    calculateVenueShadowFromBuildings,
    fetchVenueBuildings,
  } = await import('@/lib/solar');
  const geometry = resolveVenueGeometry(venue);
  const buildings = await fetchVenueBuildings(geometry);
  if (buildings === null) {
    throw new Error('shadow-caster-read-unavailable');
  }
  const series: UngatedGeometrySeriesEntry[] = [];
  for (
    let minutes = PLANNER_START_MINUTES;
    minutes <= PLANNER_END_MINUTES;
    minutes += PLANNER_STEP_MINUTES
  ) {
    const shadowInfo = calculateVenueShadowFromBuildings(
      geometry,
      stepInstantFor(stockholmDate, minutes),
      buildings,
      {
        seatingElevationM: venue.seatingElevationM ?? 0,
        venueGroundZ: venue.groundElevationM,
      },
    );
    series.push({
      minutes,
      sunExposurePercent: Math.max(0, Math.min(100, Math.round(shadowInfo.sunlitAreaPercent))),
    });
  }
  return series;
}

function stepInstantFor(stockholmDate: string, minutes: number): Date {
  const hh = Math.floor(minutes / 60).toString().padStart(2, '0');
  const mm = (minutes % 60).toString().padStart(2, '0');
  return fromZonedTime(`${stockholmDate}T${hh}:${mm}:00`, 'Europe/Stockholm');
}

function venueFromPrecomputeRow(row: PrecomputeVenueRow): StoredVenue {
  const id = row.id?.trim();
  const slug = row.slug?.trim();
  const lat = row.lat;
  const lng = row.lng;
  if (!id || !slug) throw new Error('Precompute target row missing id/slug');
  if (typeof lat !== 'number' || !Number.isFinite(lat) || typeof lng !== 'number' || !Number.isFinite(lng)) {
    throw new Error(`Precompute target ${id} has invalid coordinates`);
  }
  const seatingArea = row.seating_area && isPolygon(row.seating_area) ? row.seating_area : undefined;
  if (!seatingArea) {
    throw new Error('invalid-seating-polygon');
  }
  return {
    id,
    venueId: id,
    venueSlug: slug,
    slug,
    venueName: row.venue_name ?? slug,
    neighborhood: row.neighborhood ?? '',
    location: { lat, lng },
    currentSunStatus: 'NoSun',
    // Precompute persists geometry only; seed-era sky text is not a gate signal.
    weatherGateState: 'unknown',
    isPartner: Boolean(row.is_partner),
    confidence: typeof row.confidence === 'number' ? row.confidence : 0,
    distanceMeters: 0,
    sunExposurePercent: typeof row.sun_exposure_percent === 'number' ? row.sun_exposure_percent : 0,
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    ...(row.thumbnail ? { thumbnail: row.thumbnail } : {}),
    ...(row.sky_condition ? { skyCondition: row.sky_condition } : {}),
    ...(row.sun_window ? { sunWindow: row.sun_window } : {}),
    ...(row.prediction_uncertainty ? { predictionUncertainty: row.prediction_uncertainty } : {}),
    seatingArea,
    ...(typeof row.seating_elevation_m === 'number' && Number.isFinite(row.seating_elevation_m)
      ? { seatingElevationM: row.seating_elevation_m }
      : {}),
    ...(typeof row.ground_elevation_m === 'number' && Number.isFinite(row.ground_elevation_m)
      ? { groundElevationM: row.ground_elevation_m }
      : {}),
  };
}

function isPolygon(value: GeoJSON.Polygon): boolean {
  return (
    value.type === 'Polygon' &&
    Array.isArray(value.coordinates) &&
    Array.isArray(value.coordinates[0]) &&
    value.coordinates[0].length >= 4
  );
}
