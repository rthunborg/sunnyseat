import { NextRequest, NextResponse } from 'next/server';
import {
  parseNumberQuery,
  parseOptionalNumberQuery,
  parseOptionalDateQuery,
  validateLatitude,
  validateLongitude,
  validateRadius,
} from '@/lib/utils/validation';
import { badRequest, internalServerError } from '@/lib/utils/api-errors';
import { getVenuesNearPoint } from '@/lib/services/venue-service';
import { calculateVenueShadow } from '@/lib/solar/shadow-calculation-service';
import type { VenueShadowInfo } from '@/lib/solar/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RADIUS_KM = 1.0;
const DEFAULT_RADIUS_KM = 0.5;
const MAX_VENUES = 20; // Limit venues processed for shadow calc (expensive)
const MIN_ZOOM_HINT = 15; // Client should only call this at zoom >= 15

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShadowFeatureProperties {
  type: 'shadow' | 'building-footprint';
  venueId: number;
  buildingId?: number;
  buildingHeight?: number;
  shadowedPercent?: number;
  sunlitPercent?: number;
  confidence?: number;
}

// ---------------------------------------------------------------------------
// GET /api/shadows
// Returns shadow and building footprint GeoJSON for venues near a point.
// Query params: lat, lng, radiusKm?, timestamp?, zoom?
// Only meaningful at zoom >= 15 — client should gate calls.
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse lat/lng
    const rawLat = searchParams.get('lat') ?? searchParams.get('latitude');
    const rawLng = searchParams.get('lng') ?? searchParams.get('longitude');

    const latResult = parseNumberQuery(rawLat, 'lat');
    if (!latResult.success) return badRequest(latResult.error);
    if (!validateLatitude(latResult.value)) {
      return badRequest('Latitude must be between -90 and 90 degrees');
    }

    const lngResult = parseNumberQuery(rawLng, 'lng');
    if (!lngResult.success) return badRequest(lngResult.error);
    if (!validateLongitude(lngResult.value)) {
      return badRequest('Longitude must be between -180 and 180 degrees');
    }

    // Optional radius (default 0.5 km, max 1 km)
    const radiusKmParam = parseOptionalNumberQuery(searchParams.get('radiusKm'));
    const radiusKm = radiusKmParam ?? DEFAULT_RADIUS_KM;
    if (!validateRadius(radiusKm, MAX_RADIUS_KM)) {
      return badRequest(`Radius must be between 0 and ${MAX_RADIUS_KM} km`);
    }

    // Optional timestamp (ISO 8601) — defaults to now
    const timestampParam = parseOptionalDateQuery(searchParams.get('timestamp'));
    const timestamp = timestampParam ?? new Date();

    // Optional zoom hint — if provided and < MIN_ZOOM_HINT, return empty
    const zoomParam = parseOptionalNumberQuery(searchParams.get('zoom'));
    if (zoomParam !== null && zoomParam < MIN_ZOOM_HINT) {
      return NextResponse.json(emptyResponse(timestamp), {
        headers: cacheHeaders(),
      });
    }

    // Fetch venues near point
    const venues = await getVenuesNearPoint(latResult.value, lngResult.value, radiusKm);
    if (venues.length === 0) {
      return NextResponse.json(emptyResponse(timestamp), {
        headers: cacheHeaders(),
      });
    }

    // Limit to MAX_VENUES (shadow calc is expensive per venue)
    const limitedVenues = venues.slice(0, MAX_VENUES);

    // Calculate shadows for each venue in parallel
    const shadowResults = await Promise.allSettled(
      limitedVenues.map((v) => calculateVenueShadow(v.Id, timestamp)),
    );

    // Build GeoJSON features
    const features: GeoJSON.Feature<GeoJSON.Polygon, ShadowFeatureProperties>[] = [];
    const seenBuildings = new Set<number>();

    for (const result of shadowResults) {
      if (result.status !== 'fulfilled') continue;
      const info: VenueShadowInfo = result.value;

      // Add shadow polygons from each casting building
      for (const shadow of info.castingShadows) {
        features.push({
          type: 'Feature',
          geometry: shadow.geometry,
          properties: {
            type: 'shadow',
            venueId: info.venueId,
            buildingId: shadow.buildingId,
            buildingHeight: shadow.buildingHeight,
            shadowedPercent: info.shadowedAreaPercent,
            sunlitPercent: info.sunlitAreaPercent,
            confidence: shadow.confidence,
          },
        });

        // Deduplicate building footprints — a building may cast shadows
        // on multiple venues but we only want to show it once
        if (!seenBuildings.has(shadow.buildingId)) {
          seenBuildings.add(shadow.buildingId);
          // We don't have the original building footprint geometry here,
          // but it could be derived. For now, skip footprint features and
          // let the client request building footprints separately or
          // use the building layer from the tile provider.
        }
      }
    }

    const featureCollection: GeoJSON.FeatureCollection<GeoJSON.Polygon, ShadowFeatureProperties> = {
      type: 'FeatureCollection',
      features,
    };

    return NextResponse.json(
      {
        shadows: featureCollection,
        meta: {
          venuesProcessed: limitedVenues.length,
          shadowFeaturesCount: features.length,
          timestamp: timestamp.toISOString(),
          radiusKm,
        },
      },
      { headers: cacheHeaders() },
    );
  } catch (error) {
    console.error('Error computing shadows:', error);
    return internalServerError('An error occurred while computing shadow data');
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyResponse(timestamp: Date) {
  return {
    shadows: { type: 'FeatureCollection' as const, features: [] },
    meta: {
      venuesProcessed: 0,
      shadowFeaturesCount: 0,
      timestamp: timestamp.toISOString(),
      radiusKm: 0,
    },
  };
}

function cacheHeaders(): Record<string, string> {
  return { 'Cache-Control': 'public, s-maxage=60' };
}
