import * as turf from '@turf/turf';
import type { SolarPosition, Building, HeightSource } from './types';

const MAX_SHADOW_DISTANCE = 200.0;
const MIN_MEANINGFUL_HEIGHT = 3.0;
const MIN_RELIABLE_ELEVATION = 5.0;

// At Gothenburg latitude (~58°N): 1° lon ≈ 55.8 km, 1° lat ≈ 111.3 km
const METERS_PER_DEG_LON = 55800.0;
const METERS_PER_DEG_LAT = 111300.0;

export { MAX_SHADOW_DISTANCE, MIN_MEANINGFUL_HEIGHT, MIN_RELIABLE_ELEVATION };

export function projectBuildingShadow(
  buildingFootprint: GeoJSON.Polygon,
  buildingHeight: number,
  solarPosition: SolarPosition
): GeoJSON.Polygon | null {
  if (solarPosition.elevation <= 0 || solarPosition.elevation < MIN_RELIABLE_ELEVATION) {
    return null;
  }

  let shadowLength = calculateShadowLength(buildingHeight, solarPosition.elevation);
  shadowLength = Math.min(shadowLength, MAX_SHADOW_DISTANCE);

  const shadowDirection = (solarPosition.azimuth + 180) % 360;
  return projectPolygonInDirection(buildingFootprint, shadowLength, shadowDirection);
}

export function calculateShadowLength(
  buildingHeight: number,
  sunElevationDegrees: number
): number {
  if (sunElevationDegrees <= 0) return 0;
  const sunElevationRadians = sunElevationDegrees * (Math.PI / 180.0);
  return buildingHeight / Math.tan(sunElevationRadians);
}

export function projectPolygonInDirection(
  polygon: GeoJSON.Polygon,
  distance: number,
  directionDegrees: number
): GeoJSON.Polygon {
  const directionRadians = -(directionDegrees - 90) * (Math.PI / 180.0);
  const dx = distance * Math.cos(directionRadians);
  const dy = distance * Math.sin(directionRadians);

  const dxDeg = dx / METERS_PER_DEG_LON;
  const dyDeg = dy / METERS_PER_DEG_LAT;

  const ring = polygon.coordinates[0];
  const origCoords = ring.slice(0, -1);
  const projectedCoords = origCoords.map(([x, y]) => [x + dxDeg, y + dyDeg]);

  const allCoords = [
    ...origCoords,
    ...projectedCoords.slice().reverse(),
    origCoords[0],
  ];

  try {
    const multiPoint = turf.multiPoint(allCoords);
    const hull = turf.convex(multiPoint);
    if (hull) return hull.geometry as GeoJSON.Polygon;
  } catch {
    // Fall through to raw polygon
  }

  return { type: 'Polygon', coordinates: [allCoords.concat([allCoords[0]])] };
}

export function calculateShadowCoveragePercent(
  venueGeometry: GeoJSON.Polygon,
  shadowGeometry: GeoJSON.Polygon
): number {
  try {
    const venuePoly = turf.polygon(venueGeometry.coordinates);
    const shadowPoly = turf.polygon(shadowGeometry.coordinates);
    const intersection = turf.intersect(
      turf.featureCollection([venuePoly, shadowPoly])
    );

    if (!intersection) return 0.0;

    const intersectionArea = turf.area(intersection);
    const venueArea = turf.area(venuePoly);

    return venueArea > 0 ? (intersectionArea / venueArea) * 100.0 : 0.0;
  } catch {
    return 0.0;
  }
}

export function calculateShadowedAndSunlitAreas(
  venueGeometry: GeoJSON.Polygon,
  shadowGeometries: GeoJSON.Polygon[]
): { shadowed: GeoJSON.Polygon | null; sunlit: GeoJSON.Polygon | null } {
  try {
    if (shadowGeometries.length === 0) {
      return { shadowed: null, sunlit: venueGeometry };
    }

    let combinedShadows: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null = null;
    for (const shadow of shadowGeometries) {
      const shadowFeature = turf.polygon(shadow.coordinates);
      if (!combinedShadows) {
        combinedShadows = shadowFeature;
      } else {
        const result = turf.union(
          turf.featureCollection([combinedShadows, shadowFeature])
        );
        if (result) combinedShadows = result as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
      }
    }

    if (!combinedShadows) return { shadowed: null, sunlit: venueGeometry };

    const venuePoly = turf.polygon(venueGeometry.coordinates);

    const shadowedIntersection = turf.intersect(
      turf.featureCollection([venuePoly, combinedShadows])
    );
    const sunlitDifference = turf.difference(
      turf.featureCollection([venuePoly, combinedShadows])
    );

    const shadowed = shadowedIntersection
      ? extractPolygon(shadowedIntersection.geometry)
      : null;
    const sunlit = sunlitDifference
      ? extractPolygon(sunlitDifference.geometry)
      : null;

    return { shadowed, sunlit };
  } catch {
    return { shadowed: null, sunlit: venueGeometry };
  }
}

export function calculateShadowConfidence(
  building: Building,
  solarPosition: SolarPosition,
  shadowLength: number
): number {
  let confidence = clamp01(building.qualityScore ?? 0.7);

  if (solarPosition.elevation < 10.0) confidence *= 0.7;
  else if (solarPosition.elevation < 20.0) confidence *= 0.9;

  if (shadowLength > 100.0) confidence *= 0.8;
  else if (shadowLength > 50.0) confidence *= 0.9;

  const heightMultiplier: Record<HeightSource, number> = {
    Surveyed: 1.0,
    Osm: 0.85,
    Heuristic: 0.7,
    ManualOverride: 0.6,
  };
  confidence *= heightMultiplier[building.heightSource] ?? 0.6;
  confidence *= sourcePriorityMultiplier(building.sourcePriority);
  confidence *= shadowCasterTierMultiplier(building.shadowCasterTier);
  confidence *= filterDecisionMultiplier(building.filterDecision);
  confidence *= casterClassMultiplier(building.casterClass);

  return clamp01(confidence);
}

function sourcePriorityMultiplier(priority: number | undefined): number {
  if (priority === undefined || !Number.isFinite(priority)) return 0.7;
  if (priority <= 10) return 1;
  if (priority <= 30) return 0.95;
  if (priority <= 40) return 0.9;
  if (priority <= 90) return 0.75;
  return 0.65;
}

function shadowCasterTierMultiplier(tier: Building['shadowCasterTier']): number {
  switch (tier) {
    case 'primary':
      return 1;
    case 'secondary':
      return 0.85;
    case 'uncertain':
      return 0.65;
    case 'unknown':
    case undefined:
      return 0.7;
  }
}

function filterDecisionMultiplier(decision: Building['filterDecision']): number {
  switch (decision) {
    case 'include':
      return 1;
    case 'review':
      return 0.5;
    case 'exclude':
      return 0.3;
    case 'unknown':
    case undefined:
      return 0.75;
  }
}

function casterClassMultiplier(casterClass: Building['casterClass']): number {
  switch (casterClass) {
    case 'building':
      return 1;
    case 'manual_override':
      return 0.95;
    case 'structure':
      return 0.85;
    case 'vegetation':
      return 0.5;
    case 'unknown':
    case undefined:
      return 0.7;
  }
}

function clamp01(value: number): number {
  return Math.max(0.0, Math.min(1.0, value));
}

function extractPolygon(
  geometry: GeoJSON.Geometry
): GeoJSON.Polygon | null {
  if (geometry.type === 'Polygon') return geometry;
  if (geometry.type === 'MultiPolygon') {
    let largest: GeoJSON.Polygon | null = null;
    let maxArea = 0;
    for (const coords of geometry.coordinates) {
      const poly: GeoJSON.Polygon = { type: 'Polygon', coordinates: coords };
      const area = turf.area(turf.polygon(coords));
      if (area > maxArea) {
        maxArea = area;
        largest = poly;
      }
    }
    return largest;
  }
  return null;
}
