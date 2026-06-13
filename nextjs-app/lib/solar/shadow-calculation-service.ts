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
}

export async function calculateVenueShadow(
  venueId: number,
  timestamp: Date,
  options: CalculateVenueShadowOptions = {}
): Promise<VenueShadowInfo> {
  const venue = await fetchVenue(venueId);
  const solarPosition = calculateSolarPosition(timestamp);

  if (!solarPosition.isSunVisible) {
    return createNoSunResult(venueId, timestamp, solarPosition, venue.geometry);
  }

  if (solarPosition.elevation < SG.MIN_RELIABLE_ELEVATION) {
    return createLowConfidenceResult(venueId, timestamp, solarPosition);
  }

  const searchRadiusDeg = SG.MAX_SHADOW_DISTANCE / 111300.0;
  const buildings = await fetchNearbyBuildings(venue.geometry, searchRadiusDeg);
  if (buildings === null) {
    return createShadowDataUnavailableResult(venueId, timestamp, solarPosition);
  }
  const shadowDataCoverage = getShadowDataCoverage(venue.geometry, options.coverageMap);
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
    if (building.height < SG.MIN_MEANINGFUL_HEIGHT) continue;

    const shadowPoly = SG.projectBuildingShadow(
      building.geometry,
      building.height,
      solarPosition
    );
    if (!shadowPoly) continue;

    const shadowLength = SG.calculateShadowLength(building.height, solarPosition.elevation);
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
      return SG.calculateShadowCoveragePercent(venue.geometry, s.geometry) > 0;
    } catch {
      return false;
    }
  });

  const shadowGeometries = affectingShadows.map((s) => s.geometry);
  const { shadowed, sunlit } = SG.calculateShadowedAndSunlitAreas(
    venue.geometry,
    shadowGeometries
  );

  const shadowedPercent = shadowed
    ? SG.calculateShadowCoveragePercent(venue.geometry, shadowed)
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
