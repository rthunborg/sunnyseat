import { supabaseServiceRole } from '@/lib/supabase/server';
import { calculateSolarPosition } from './solar-calculation-service';
import { extractObstructionRiskClasses, getObstructionRiskConfidenceCap } from './obstruction-risk';
import {
  applyShadowDataCoverageCap,
  getShadowDataCoverage,
  type ShadowDataCoverageMap,
} from './shadow-data-coverage';
import * as SG from './shadow-geometry';
import type {
  SolarPosition,
  Building,
  ShadowProjection,
  VenueShadowInfo,
  ShadowTimeline,
  ShadowTimelinePoint,
} from './types';

export interface CalculateVenueShadowOptions {
  coverageMap?: ShadowDataCoverageMap;
  /**
   * Numeric id used ONLY to populate the result's `venueId` field. The
   * geometry-first entrypoint defaults this to 0 because the Story 8.2 venue
   * store keys venues by text id and never consumes this field. [Story 8.3]
   */
  venueId?: number;
  /**
   * Metres the venue's seating surface sits above its own local ground (Story 8.6
   * height gate). A nearby caster only shadows the venue by its height ABOVE this
   * surface: `effectiveHeight = building.height - seatingElevationM`. Defaults to
   * 0 (ground level) so the math is identical to the pre-8.6 behaviour. A negative
   * value is floored to 0 at the call sites (`Math.max(0, …)`) — the data layer
   * (`coerceSeatingElevation`) already drops negatives, this just keeps the public
   * entrypoint honouring its own ground-level-minimum invariant.
   */
  seatingElevationM?: number;
  /**
   * RH2000 absolute ground elevation (metres) at the venue point (Story 8.7 terrain
   * gate). When this AND a caster's `groundZRh2000` are both known, the gate uses the
   * absolute ground delta so a caster standing downhill stops shadowing a venue uphill
   * from it. Undefined (or a caster lacking `groundZRh2000`) falls back to the Story 8.6
   * relative gate, so flat terrain and the default path stay byte-identical.
   */
  venueGroundZ?: number;
}

/**
 * Legacy entrypoint: resolves a venue's polygon from the PascalCase
 * `Id`/`Geometry` `venues` table via {@link fetchVenue}, then delegates to
 * {@link calculateVenueShadowForGeometry}. The Story 8.2 `public.venues` store
 * is text-id / snake_case / point-only and INCOMPATIBLE with this table, so
 * the Story 8.3 sun-engine adapter drives `calculateVenueShadowForGeometry`
 * directly and never this wrapper. Left intact for any legacy caller.
 */
export async function calculateVenueShadow(
  venueId: number,
  timestamp: Date,
  options: CalculateVenueShadowOptions = {}
): Promise<VenueShadowInfo> {
  const venue = await fetchVenue(venueId);
  return calculateVenueShadowForGeometry(venue.geometry, timestamp, {
    ...options,
    venueId,
  });
}

/**
 * The shadow-caster search radius in degrees for a venue geometry. Both the
 * single-shot shadow and the full-day timeline use the SAME radius and the SAME
 * centroid, so a caller (the Story 9.3 sun-engine) can fetch the building set
 * ONCE with {@link fetchVenueBuildings} and feed it to both
 * {@link calculateVenueShadowFromBuildings} and
 * {@link calculateVenueShadowTimelineFromBuildings}. [Story 9.3 AC1]
 */
export const SHADOW_SEARCH_RADIUS_DEG = SG.MAX_SHADOW_DISTANCE / 111300.0;

/**
 * Fetch the nearby shadow casters for a venue geometry ONCE so both the
 * single-shot shadow and the full-day timeline can reuse the result (Story 9.3
 * AC1 — was previously fetched twice per venue, one RPC inside each entrypoint).
 * Returns `null` on RPC failure; the caller MUST preserve the `null`
 * (data-unavailable) behaviour for BOTH the single-shot and the timeline path.
 */
export async function fetchVenueBuildings(
  geometry: GeoJSON.Polygon,
): Promise<Building[] | null> {
  return fetchNearbyBuildings(geometry, SHADOW_SEARCH_RADIUS_DEG);
}

/**
 * Geometry-first shadow entrypoint (Story 8.3 DECISION B). Identical pipeline
 * to the legacy {@link calculateVenueShadow} but takes a GeoJSON polygon
 * directly (a venue's real seating-area polygon, or a synthesized footprint
 * fallback) instead of looking it up in the incompatible legacy table.
 * Inherits the Story 3.0.5/3.0.6 coverage + obstruction caps with no math change.
 *
 * Thin wrapper: fetches the building set then delegates to the pure
 * {@link calculateVenueShadowFromBuildings}. Legacy callers and the existing
 * tests stay valid. The Story 9.3 sun-engine bypasses this wrapper and calls
 * {@link fetchVenueBuildings} + {@link calculateVenueShadowFromBuildings}
 * directly so the building set is fetched once and shared with the timeline.
 */
export async function calculateVenueShadowForGeometry(
  geometry: GeoJSON.Polygon,
  timestamp: Date,
  options: CalculateVenueShadowOptions = {}
): Promise<VenueShadowInfo> {
  const solarPosition = calculateSolarPosition(timestamp);
  // Match the historical fetch-then-compute ordering exactly: the RPC only
  // fires when the sun is visible AND above the reliable-elevation floor, so a
  // pre-fetched caller must apply the same gates (see *FromBuildings).
  if (!solarPosition.isSunVisible || solarPosition.elevation < SG.MIN_RELIABLE_ELEVATION) {
    return calculateVenueShadowFromBuildings(geometry, timestamp, null, options);
  }
  const buildings = await fetchVenueBuildings(geometry);
  return calculateVenueShadowFromBuildings(geometry, timestamp, buildings, options);
}

/**
 * Pure (no IO) single-shot shadow entrypoint: identical to
 * {@link calculateVenueShadowForGeometry} but takes an ALREADY-FETCHED building
 * set (or `null` for an RPC failure) instead of issuing the
 * `get_buildings_near_point` RPC itself. Lets the Story 9.3 sun-engine fetch
 * the casters once and reuse them for both the single-shot shadow and the
 * timeline. Preserves the null behaviour exactly: `buildings === null` →
 * {@link createShadowDataUnavailableResult}. [Story 9.3 AC1]
 *
 * Note: the no-sun / low-elevation early-outs are evaluated FIRST (matching the
 * fetch-then-compute wrapper), so a `null` building set only surfaces as
 * data-unavailable when the sun is actually up — exactly as before.
 */
export function calculateVenueShadowFromBuildings(
  geometry: GeoJSON.Polygon,
  timestamp: Date,
  buildings: Building[] | null,
  options: CalculateVenueShadowOptions = {}
): VenueShadowInfo {
  const venueId = options.venueId ?? 0;
  const solarPosition = calculateSolarPosition(timestamp);

  if (!solarPosition.isSunVisible) {
    return createNoSunResult(venueId, timestamp, solarPosition, geometry);
  }

  if (solarPosition.elevation < SG.MIN_RELIABLE_ELEVATION) {
    return createLowConfidenceResult(venueId, timestamp, solarPosition);
  }

  if (buildings === null) {
    return createShadowDataUnavailableResult(venueId, timestamp, solarPosition);
  }

  return computeShadowInfo(
    geometry,
    timestamp,
    solarPosition,
    buildings,
    venueId,
    options.coverageMap,
    Math.max(0, options.seatingElevationM ?? 0),
    options.venueGroundZ
  );
}

/**
 * Pure (no-IO) shadow core shared by the single-shot entrypoint and the
 * timeline sampler. Given already-fetched nearby buildings it projects
 * shadows, computes shadowed/sunlit areas, and applies the coverage +
 * obstruction confidence caps. Extracted verbatim from the original
 * `calculateVenueShadow` body — no math change. [Story 8.3]
 */
function computeShadowInfo(
  geometry: GeoJSON.Polygon,
  timestamp: Date,
  solarPosition: SolarPosition,
  buildings: Building[],
  venueId: number,
  coverageMap?: ShadowDataCoverageMap,
  seatingElevationM = 0,
  venueGroundZ?: number
): VenueShadowInfo {
  // Story 8.7 terrain gate: when the venue's own RH2000 ground elevation is known,
  // a caster's effective casting height is measured against the venue's GROUND, not
  // the caster's own. The absolute caster-roof Z is `casterGroundZ + height` (the
  // conservative runtime `height`, NOT roof_z_rh2000 — see below), and the venue
  // seating-surface Z is `venueGroundZ + seatingElevationM`, so
  //   effectiveHeight = (casterGroundZ + height) − (venueGroundZ + seatingElevationM)
  //                   = (height − seatingElevationM) + (casterGroundZ − venueGroundZ)
  // i.e. the Story 8.6 relative effective height PLUS the ground delta. A caster
  // downhill from the venue (casterGroundZ < venueGroundZ) is therefore gated out
  // once its roof falls below the venue's seating surface (AC1), while flat terrain
  // (casterGroundZ == venueGroundZ → delta 0) reduces EXACTLY to Story 8.6 (AC2/AC3).
  //
  // Why `height` and not `roofZRh2000`: for the ~1.2k height-uncertain casters that
  // Story 8.1.1 capped at a conservative 15 m, `roofZRh2000 − groundZRh2000` is the
  // RAW (uncapped, taller) source height. Using roof_z as the casting height would
  // resurrect those raw heights and re-introduce the over-shadowing 8.1.1 fixed, and
  // would break the AC2 flat-terrain byte-identity. So only the GROUND delta comes
  // from absolute Z; the casting height stays the conservative runtime `height`.
  const venueGroundZKnown = typeof venueGroundZ === 'number' && Number.isFinite(venueGroundZ);
  const shadowDataCoverage = getShadowDataCoverage(geometry, coverageMap);
  const obstructionRisks = extractObstructionRiskClasses(
    ...buildings.flatMap((building) => [
      building.obstructionRisks,
      building.sourceFlags,
      building.sourceObjectMetadata,
      building.provenanceMetadata,
    ])
  );

  const shadows: ShadowProjection[] = [];
  for (const building of buildings) {
    // Story 8.6 height gate: a caster only shadows the venue by its height ABOVE
    // the seating surface, so a caster at/below that surface is excluded and the
    // part above the terrace is what casts the shadow. ALL-OR-NOTHING MVP
    // approximation — a caster slightly taller than the terrace still casts a
    // FULL-coverage shadow; fractional / sub-shadow partial occlusion is Tier-3
    // future work (AC4). Symmetrically, MIN_MEANINGFUL_HEIGHT applies to
    // effectiveHeight, so a caster only 0–MIN_MEANINGFUL_HEIGHT m above the
    // seating surface is dropped as not-meaningful (same coarse floor that already
    // ignores sub-3 m casters at ground level). seatingElevationM defaults to 0,
    // so for a ground-level venue effectiveHeight === building.height and the math
    // is unchanged (AC2).
    //
    // Story 8.7 terrain delta: when both the venue ground Z and this caster's ground
    // Z are known, add the ground delta (casterGroundZ − venueGroundZ) so a caster
    // standing downhill stops mattering once its roof drops below the venue surface.
    // Any missing / non-finite Z falls back to the relative gate (no degenerate
    // polygon), keeping flat terrain and the default path byte-identical (AC2).
    const useTerrainDelta =
      venueGroundZKnown &&
      typeof building.groundZRh2000 === 'number' &&
      Number.isFinite(building.groundZRh2000);
    const groundDelta = useTerrainDelta
      ? (building.groundZRh2000 as number) - (venueGroundZ as number)
      : 0;
    const effectiveHeight = building.height - seatingElevationM + groundDelta;
    if (effectiveHeight < SG.MIN_MEANINGFUL_HEIGHT) continue;

    const shadowPoly = SG.projectBuildingShadow(
      building.geometry,
      effectiveHeight,
      solarPosition
    );
    if (!shadowPoly) continue;

    const shadowLength = SG.calculateShadowLength(effectiveHeight, solarPosition.elevation);
    const confidence = SG.calculateShadowConfidence(building, solarPosition, shadowLength);

    shadows.push({
      geometry: shadowPoly,
      length: shadowLength,
      direction: (solarPosition.azimuth + 180) % 360,
      buildingId: building.id,
      buildingHeight: building.height,
      solarPosition,
      timestamp: new Date(),
      confidence,
      casterMetadata: {
        qualityScore: building.qualityScore,
        sourcePriority: building.sourcePriority,
        shadowCasterTier: building.shadowCasterTier ?? 'unknown',
        filterDecision: building.filterDecision ?? 'unknown',
        casterClass: building.casterClass ?? 'unknown',
        sourceFlags: building.sourceFlags ?? [],
        sourceObjectMetadata: building.sourceObjectMetadata,
        provenanceMetadata: building.provenanceMetadata,
      },
    });
  }

  const affectingShadows = shadows.filter((s) => {
    try {
      return SG.calculateShadowCoveragePercent(geometry, s.geometry) > 0;
    } catch {
      return false;
    }
  });

  const shadowGeometries = affectingShadows.map((s) => s.geometry);
  const { shadowed, sunlit } = SG.calculateShadowedAndSunlitAreas(
    geometry,
    shadowGeometries
  );

  const shadowedPercent = shadowed
    ? SG.calculateShadowCoveragePercent(geometry, shadowed)
    : 0.0;
  const sunlitPercent = Math.max(0.0, 100.0 - shadowedPercent);
  const baseConfidence = averageConfidence(
    affectingShadows.length > 0 ? affectingShadows : shadows
  );
  const coverageCappedConfidence = applyShadowDataCoverageCap(
    baseConfidence,
    shadowDataCoverage
  );
  const combinedConfidence = Math.min(
    coverageCappedConfidence,
    getObstructionRiskConfidenceCap(obstructionRisks)
  );

  return {
    venueId,
    shadowedAreaPercent: shadowedPercent,
    sunlitAreaPercent: sunlitPercent,
    castingShadows: affectingShadows,
    shadowedGeometry: shadowed,
    sunlitGeometry: sunlit,
    timestamp,
    confidence: combinedConfidence,
    solarPosition,
    shadowDataCoverage,
    obstructionRisks,
  };
}

export async function calculateVenueShadowTimeline(
  venueId: number,
  startTime: Date,
  endTime: Date,
  intervalMs: number
): Promise<ShadowTimeline> {
  if (startTime >= endTime) throw new Error('Start time must be before end time');
  if (intervalMs <= 0) throw new Error('Interval must be positive');

  const points: ShadowTimelinePoint[] = [];
  let confidenceSum = 0;

  for (
    let current = new Date(startTime.getTime());
    current <= endTime;
    current = new Date(current.getTime() + intervalMs)
  ) {
    try {
      const info = await calculateVenueShadow(venueId, current);
      points.push({
        timestamp: new Date(current),
        shadowedAreaPercent: info.shadowedAreaPercent,
        sunlitAreaPercent: info.sunlitAreaPercent,
        confidence: info.confidence,
        isSunVisible: info.solarPosition.isSunVisible,
      });
      confidenceSum += info.confidence;
    } catch {
      points.push({
        timestamp: new Date(current),
        shadowedAreaPercent: 50.0,
        sunlitAreaPercent: 50.0,
        confidence: 0.2,
        isSunVisible: true,
      });
      confidenceSum += 0.2;
    }
  }

  return {
    venueId,
    startTime,
    endTime,
    intervalMs,
    points,
    averageConfidence: points.length > 0 ? confidenceSum / points.length : 0,
  };
}

/**
 * Geometry-first timeline (Story 8.3). Fetches the nearby shadow casters ONCE
 * and samples shadows across [startTime, endTime], so a full-day sun-window
 * scan costs a single RPC per venue rather than one RPC per sample. Used by the
 * sun-engine adapter to derive `sunWindow` / `peakTime` for the requested day.
 *
 * Thin wrapper: fetches the building set then delegates to the pure
 * {@link calculateVenueShadowTimelineFromBuildings}. The Story 9.3 sun-engine
 * bypasses this wrapper and shares ONE {@link fetchVenueBuildings} result with
 * the single-shot path so a request issues a single building RPC, not two.
 */
export async function calculateVenueShadowTimelineForGeometry(
  geometry: GeoJSON.Polygon,
  startTime: Date,
  endTime: Date,
  intervalMs: number,
  options: CalculateVenueShadowOptions = {}
): Promise<ShadowTimeline> {
  if (startTime >= endTime) throw new Error('Start time must be before end time');
  if (intervalMs <= 0) throw new Error('Interval must be positive');

  const buildings = await fetchVenueBuildings(geometry);
  return calculateVenueShadowTimelineFromBuildings(
    geometry,
    startTime,
    endTime,
    intervalMs,
    buildings,
    options,
  );
}

/**
 * Pure (no IO) full-day timeline: identical sampling to
 * {@link calculateVenueShadowTimelineForGeometry} but takes an ALREADY-FETCHED
 * building set (or `null` for an RPC failure) instead of issuing the RPC. Lets
 * the Story 9.3 sun-engine reuse the single shared {@link fetchVenueBuildings}
 * result. Preserves the per-sample null behaviour exactly: when
 * `buildings === null`, each in-sun sample becomes
 * {@link createShadowDataUnavailableResult} (matching the pre-9.3 timeline
 * loop), and the per-sample try/catch neutral-50/50 fallback is unchanged.
 * [Story 9.3 AC1]
 */
export function calculateVenueShadowTimelineFromBuildings(
  geometry: GeoJSON.Polygon,
  startTime: Date,
  endTime: Date,
  intervalMs: number,
  buildings: Building[] | null,
  options: CalculateVenueShadowOptions = {}
): ShadowTimeline {
  if (startTime >= endTime) throw new Error('Start time must be before end time');
  if (intervalMs <= 0) throw new Error('Interval must be positive');

  const venueId = options.venueId ?? 0;

  const points: ShadowTimelinePoint[] = [];
  let confidenceSum = 0;

  for (
    let current = new Date(startTime.getTime());
    current <= endTime;
    current = new Date(current.getTime() + intervalMs)
  ) {
    try {
      const solarPosition = calculateSolarPosition(current);
      let info: VenueShadowInfo;
      if (!solarPosition.isSunVisible) {
        info = createNoSunResult(venueId, current, solarPosition, geometry);
      } else if (solarPosition.elevation < SG.MIN_RELIABLE_ELEVATION) {
        info = createLowConfidenceResult(venueId, current, solarPosition);
      } else if (buildings === null) {
        info = createShadowDataUnavailableResult(venueId, current, solarPosition);
      } else {
        info = computeShadowInfo(
          geometry,
          current,
          solarPosition,
          buildings,
          venueId,
          options.coverageMap,
          Math.max(0, options.seatingElevationM ?? 0),
          options.venueGroundZ
        );
      }

      points.push({
        timestamp: new Date(current),
        shadowedAreaPercent: info.shadowedAreaPercent,
        sunlitAreaPercent: info.sunlitAreaPercent,
        confidence: info.confidence,
        isSunVisible: info.solarPosition.isSunVisible,
      });
      confidenceSum += info.confidence;
    } catch {
      // Mirror the legacy calculateVenueShadowTimeline per-sample guard: one bad
      // sample degrades to a neutral 50/50 point rather than rejecting the whole
      // timeline (which would degrade the entire venue to seed). [Story 8.3 review R1]
      points.push({
        timestamp: new Date(current),
        shadowedAreaPercent: 50.0,
        sunlitAreaPercent: 50.0,
        confidence: 0.2,
        isSunVisible: true,
      });
      confidenceSum += 0.2;
    }
  }

  return {
    venueId,
    startTime,
    endTime,
    intervalMs,
    points,
    averageConfidence: points.length > 0 ? confidenceSum / points.length : 0,
  };
}

// ---------------------------------------------------------------------------
// Database helpers
// ---------------------------------------------------------------------------

interface VenueRow {
  Id: number;
  Geometry: string;
}

async function fetchVenue(
  venueId: number
): Promise<{ id: number; geometry: GeoJSON.Polygon }> {
  const { data, error } = await supabaseServiceRole
    .from('venues')
    .select('Id, Geometry')
    .eq('Id', venueId)
    .single<VenueRow>();

  if (error || !data) throw new Error(`Venue ${venueId} not found`);

  return {
    id: data.Id,
    geometry: parseGeometry(data.Geometry),
  };
}

async function fetchNearbyBuildings(
  venueGeometry: GeoJSON.Polygon,
  radiusDeg: number
): Promise<Building[] | null> {
  const centroid = getCentroid(venueGeometry);

  let response: Awaited<ReturnType<typeof supabaseServiceRole.rpc>>;
  try {
    response = await supabaseServiceRole.rpc('get_buildings_near_point', {
      p_latitude: centroid[1],
      p_longitude: centroid[0],
      p_radius_meters: radiusDeg * 111300,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch runtime shadow casters:', message);
    return null;
  }

  const { data, error } = response;

  if (error) {
    console.error('Failed to fetch runtime shadow casters:', error.message);
    return null;
  }

  return (data ?? []).map(mapBuildingRow);
}

function mapBuildingRow(row: Record<string, unknown>): Building {
  const sourceFlags = readStringArray(row, 'SourceFlags', 'source_flags');
  const sourceObjectMetadata = readRecord(row, 'SourceObjectMetadata', 'source_object_metadata');
  const provenanceMetadata = readRecord(row, 'ProvenanceMetadata', 'provenance_metadata');
  const casterClass = readCasterClass(row, 'CasterClass', 'caster_class')
    ?? readCasterClass(row, 'BuildingType', 'building_type');

  return {
    id: row.Id as number,
    geometry: parseGeometry(row.Geometry as string),
    height: (row.Height as number) ?? 10.0,
    source: (row.Source as string) ?? 'unknown',
    qualityScore: readClampedNumber(row, 0.7, 'QualityScore', 'quality_score'),
    externalId: row.ExternalId as string | undefined,
    heightSource: (row.HeightSource as Building['heightSource']) ?? 'Osm',
    buildingType: row.BuildingType as string | undefined,
    sourcePriority: readNumber(row, 'SourcePriority', 'source_priority'),
    shadowCasterTier: readShadowCasterTier(row, 'ShadowCasterTier', 'shadow_caster_tier'),
    filterDecision: readFilterDecision(row, 'FilterDecision', 'filter_decision'),
    casterClass,
    // RH2000 absolute Z (Story 8.7). readNumber returns undefined for missing /
    // non-finite values, so a fixture caster without them falls back to the relative gate.
    groundZRh2000: readNumber(row, 'GroundZRh2000', 'ground_z_rh2000'),
    roofZRh2000: readNumber(row, 'RoofZRh2000', 'roof_z_rh2000'),
    sourceFlags,
    sourceObjectMetadata,
    provenanceMetadata,
    obstructionRisks: extractObstructionRiskClasses(
      sourceFlags,
      sourceObjectMetadata,
      provenanceMetadata,
      casterClass === 'vegetation' ? 'tree' : null
    ),
  };
}

function parseGeometry(geom: unknown): GeoJSON.Polygon {
  if (typeof geom === 'string') {
    // Try JSON/GeoJSON first
    try {
      const parsed = JSON.parse(geom);
      if (parsed.type === 'Polygon') return parsed;
      if (parsed.coordinates) return { type: 'Polygon', coordinates: parsed.coordinates };
    } catch {
      // Not JSON — try WKB hex
    }

    // Try WKB hex (PostgREST returns geography as hex-encoded WKB)
    const wkbResult = parseWkbHexPolygon(geom);
    if (wkbResult) return wkbResult;
  }
  if (typeof geom === 'object' && geom !== null) {
    const g = geom as Record<string, unknown>;
    if (g.type === 'Polygon') return geom as GeoJSON.Polygon;
  }

  return { type: 'Polygon', coordinates: [[[0, 0], [0, 0], [0, 0], [0, 0]]] };
}

/** Parse a PostGIS WKB hex string for a Polygon into GeoJSON */
function parseWkbHexPolygon(hex: string): GeoJSON.Polygon | null {
  try {
    const buf = Buffer.from(hex, 'hex');
    if (buf.length < 13) return null;

    let offset = 0;
    const le = buf.readUInt8(offset) === 1;
    offset += 1;

    const rawType = le ? buf.readUInt32LE(offset) : buf.readUInt32BE(offset);
    offset += 4;
    const hasSRID = (rawType & 0x20000000) !== 0;
    const geomType = rawType & 0xff;
    if (hasSRID) offset += 4;

    if (geomType !== 3) return null; // Not a Polygon

    const readDouble = (o: number) => le ? buf.readDoubleLE(o) : buf.readDoubleBE(o);
    const readUInt32 = (o: number) => le ? buf.readUInt32LE(o) : buf.readUInt32BE(o);

    const numRings = readUInt32(offset);
    offset += 4;

    const coordinates: number[][][] = [];
    for (let r = 0; r < numRings; r++) {
      const numPoints = readUInt32(offset);
      offset += 4;
      const ring: number[][] = [];
      for (let p = 0; p < numPoints; p++) {
        const x = readDouble(offset); offset += 8;
        const y = readDouble(offset); offset += 8;
        ring.push([x, y]);
      }
      coordinates.push(ring);
    }

    return { type: 'Polygon', coordinates };
  } catch {
    return null;
  }
}

function getCentroid(polygon: GeoJSON.Polygon): [number, number] {
  const ring = polygon.coordinates[0];
  const n = ring.length - 1;
  if (n === 0) return [0, 0];
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    cx += ring[i][0];
    cy += ring[i][1];
  }
  return [cx / n, cy / n];
}

function averageConfidence(shadows: ShadowProjection[]): number {
  if (shadows.length === 0) return 1.0;
  return shadows.reduce((sum, shadow) => sum + shadow.confidence, 0) / shadows.length;
}

function readNumber(row: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

function readClampedNumber(
  row: Record<string, unknown>,
  fallback: number,
  ...keys: string[]
): number {
  const value = readNumber(row, ...keys) ?? fallback;
  return Math.max(0, Math.min(1, value));
}

function readStringArray(row: Record<string, unknown>, ...keys: string[]): string[] {
  for (const key of keys) {
    const value = row[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
    if (typeof value === 'string') return [value];
  }
  return [];
}

function readRecord(
  row: Record<string, unknown>,
  ...keys: string[]
): Record<string, unknown> | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return undefined;
}

function readShadowCasterTier(
  row: Record<string, unknown>,
  ...keys: string[]
): Building['shadowCasterTier'] {
  const value = readString(row, ...keys);
  if (value === 'primary' || value === 'secondary' || value === 'uncertain') return value;
  return value ? 'unknown' : undefined;
}

function readFilterDecision(
  row: Record<string, unknown>,
  ...keys: string[]
): Building['filterDecision'] {
  const value = readString(row, ...keys);
  if (value === 'include' || value === 'review' || value === 'exclude') return value;
  return value ? 'unknown' : undefined;
}

function readCasterClass(
  row: Record<string, unknown>,
  ...keys: string[]
): Building['casterClass'] {
  const value = readString(row, ...keys);
  if (
    value === 'building' ||
    value === 'structure' ||
    value === 'vegetation' ||
    value === 'manual_override'
  ) {
    return value;
  }
  return value ? 'unknown' : undefined;
}

function readString(row: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string') return value.trim().toLowerCase();
  }
  return undefined;
}

function createNoSunResult(
  venueId: number,
  timestamp: Date,
  solarPosition: SolarPosition,
  venueGeometry: GeoJSON.Polygon
): VenueShadowInfo {
  return {
    venueId,
    shadowedAreaPercent: 100.0,
    sunlitAreaPercent: 0.0,
    castingShadows: [],
    shadowedGeometry: venueGeometry,
    sunlitGeometry: null,
    timestamp,
    confidence: 1.0,
    solarPosition,
  };
}

function createLowConfidenceResult(
  venueId: number,
  timestamp: Date,
  solarPosition: SolarPosition
): VenueShadowInfo {
  return {
    venueId,
    shadowedAreaPercent: 75.0,
    sunlitAreaPercent: 25.0,
    castingShadows: [],
    shadowedGeometry: null,
    sunlitGeometry: null,
    timestamp,
    confidence: 0.3,
    solarPosition,
  };
}

function createShadowDataUnavailableResult(
  venueId: number,
  timestamp: Date,
  solarPosition: SolarPosition
): VenueShadowInfo {
  return {
    venueId,
    shadowedAreaPercent: 50.0,
    sunlitAreaPercent: 50.0,
    castingShadows: [],
    shadowedGeometry: null,
    sunlitGeometry: null,
    timestamp,
    confidence: 0.2,
    solarPosition,
  };
}
