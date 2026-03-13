import { supabaseAdmin } from '@/lib/supabase/server';
import { calculateSolarPosition } from './solar-calculation-service';
import * as SG from './shadow-geometry';
import type {
  SolarPosition,
  Building,
  ShadowProjection,
  PatioShadowInfo,
  ShadowTimeline,
  ShadowTimelinePoint,
} from './types';

export async function calculatePatioShadow(
  patioId: number,
  timestamp: Date
): Promise<PatioShadowInfo> {
  const patio = await fetchPatio(patioId);
  const solarPosition = calculateSolarPosition(timestamp);

  if (!solarPosition.isSunVisible) {
    return createNoSunResult(patioId, timestamp, solarPosition, patio.geometry);
  }

  if (solarPosition.elevation < SG.MIN_RELIABLE_ELEVATION) {
    return createLowConfidenceResult(patioId, timestamp, solarPosition);
  }

  const searchRadiusDeg = SG.MAX_SHADOW_DISTANCE / 111300.0;
  const buildings = await fetchNearbyBuildings(patio.geometry, searchRadiusDeg);

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
    });
  }

  const affectingShadows = shadows.filter((s) => {
    try {
      return SG.calculateShadowCoveragePercent(patio.geometry, s.geometry) > 0;
    } catch {
      return false;
    }
  });

  const shadowGeometries = affectingShadows.map((s) => s.geometry);
  const { shadowed, sunlit } = SG.calculateShadowedAndSunlitAreas(
    patio.geometry,
    shadowGeometries
  );

  const shadowedPercent = shadowed
    ? SG.calculateShadowCoveragePercent(patio.geometry, shadowed)
    : 0.0;
  const sunlitPercent = Math.max(0.0, 100.0 - shadowedPercent);
  const combinedConfidence =
    affectingShadows.length > 0
      ? affectingShadows.reduce((sum, s) => sum + s.confidence, 0) / affectingShadows.length
      : 1.0;

  return {
    patioId,
    shadowedAreaPercent: shadowedPercent,
    sunlitAreaPercent: sunlitPercent,
    castingShadows: affectingShadows,
    shadowedGeometry: shadowed,
    sunlitGeometry: sunlit,
    timestamp,
    confidence: combinedConfidence,
    solarPosition,
  };
}

export async function calculatePatioShadowTimeline(
  patioId: number,
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
      const info = await calculatePatioShadow(patioId, current);
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
    patioId,
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

interface PatioRow {
  Id: number;
  Geometry: string;
  VenueId: number;
}

async function fetchPatio(
  patioId: number
): Promise<{ id: number; geometry: GeoJSON.Polygon; venueId: number }> {
  const { data, error } = await supabaseAdmin
    .from('patios')
    .select('Id, Geometry, VenueId')
    .eq('Id', patioId)
    .single<PatioRow>();

  if (error || !data) throw new Error(`Patio ${patioId} not found`);

  return {
    id: data.Id,
    geometry: parseGeometry(data.Geometry),
    venueId: data.VenueId,
  };
}

async function fetchNearbyBuildings(
  patioGeometry: GeoJSON.Polygon,
  radiusDeg: number
): Promise<Building[]> {
  const centroid = getCentroid(patioGeometry);

  const { data, error } = await supabaseAdmin.rpc('get_buildings_near_point', {
    p_latitude: centroid[1],
    p_longitude: centroid[0],
    p_radius_meters: radiusDeg * 111300,
  });

  if (error) {
    console.error('Failed to fetch buildings:', error.message);
    const { data: fallbackData } = await supabaseAdmin
      .from('buildings')
      .select('*')
      .gte('Height', SG.MIN_MEANINGFUL_HEIGHT)
      .limit(200);

    if (!fallbackData) return [];
    return fallbackData.map(mapBuildingRow);
  }

  return (data ?? []).map(mapBuildingRow);
}

function mapBuildingRow(row: Record<string, unknown>): Building {
  return {
    id: row.Id as number,
    geometry: parseGeometry(row.Geometry as string),
    height: (row.Height as number) ?? 10.0,
    source: (row.Source as string) ?? 'unknown',
    qualityScore: (row.QualityScore as number) ?? 1.0,
    externalId: row.ExternalId as string | undefined,
    heightSource: (row.HeightSource as Building['heightSource']) ?? 'Osm',
    buildingType: row.BuildingType as string | undefined,
  };
}

function parseGeometry(geom: unknown): GeoJSON.Polygon {
  if (typeof geom === 'string') {
    try {
      const parsed = JSON.parse(geom);
      if (parsed.type === 'Polygon') return parsed;
      if (parsed.coordinates) return { type: 'Polygon', coordinates: parsed.coordinates };
    } catch {
      // PostGIS WKT/hex — return a dummy for graceful degradation
    }
  }
  if (typeof geom === 'object' && geom !== null) {
    const g = geom as Record<string, unknown>;
    if (g.type === 'Polygon') return geom as GeoJSON.Polygon;
  }

  return { type: 'Polygon', coordinates: [[[0, 0], [0, 0], [0, 0], [0, 0]]] };
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

function createNoSunResult(
  patioId: number,
  timestamp: Date,
  solarPosition: SolarPosition,
  patioGeometry: GeoJSON.Polygon
): PatioShadowInfo {
  return {
    patioId,
    shadowedAreaPercent: 100.0,
    sunlitAreaPercent: 0.0,
    castingShadows: [],
    shadowedGeometry: patioGeometry,
    sunlitGeometry: null,
    timestamp,
    confidence: 1.0,
    solarPosition,
  };
}

function createLowConfidenceResult(
  patioId: number,
  timestamp: Date,
  solarPosition: SolarPosition
): PatioShadowInfo {
  return {
    patioId,
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
