import { NextRequest, NextResponse } from 'next/server';
import {
  parseNumberQuery,
  parseOptionalNumberQuery,
  validateLatitude,
  validateLongitude,
  validateRadius,
} from '@/lib/utils/validation';
import { badRequest, internalServerError } from '@/lib/utils/api-errors';
import { getPatiosNearPoint } from '@/lib/services/patio-service';
import type { GetPatiosResponse, PatioDataDto } from '@/lib/types/api';

const MAX_RADIUS_KM = 3.0;
const DEFAULT_RADIUS_KM = 1.5;
const MAX_RESULTS = 50;

/**
 * GET /api/patios
 * Search for patios by location with current sun exposure
 * Query params: latitude, longitude, radiusKm (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse and validate latitude
    const latResult = parseNumberQuery(searchParams.get('latitude'), 'latitude');
    if (!latResult.success) {
      return badRequest(latResult.error);
    }
    const latitude = latResult.value;

    if (!validateLatitude(latitude)) {
      return badRequest('Latitude must be between -90 and 90 degrees');
    }

    // Parse and validate longitude
    const lngResult = parseNumberQuery(searchParams.get('longitude'), 'longitude');
    if (!lngResult.success) {
      return badRequest(lngResult.error);
    }
    const longitude = lngResult.value;

    if (!validateLongitude(longitude)) {
      return badRequest('Longitude must be between -180 and 180 degrees');
    }

    // Parse and validate optional radius
    const radiusKmParam = parseOptionalNumberQuery(searchParams.get('radiusKm'));
    const radiusKm = radiusKmParam ?? DEFAULT_RADIUS_KM;

    if (!validateRadius(radiusKm, MAX_RADIUS_KM)) {
      return badRequest(`Radius must be between 0 and ${MAX_RADIUS_KM} km`);
    }

    // Get patios near location using PostGIS spatial query
    const patios = await getPatiosNearPoint(latitude, longitude, radiusKm);

    if (patios.length === 0) {
      const response: GetPatiosResponse = {
        patios: [],
        timestamp: new Date().toISOString(),
        totalCount: 0,
      };
      return NextResponse.json(response);
    }

    // Build response DTOs
    // Note: Sun exposure calculation will be added in a future story
    // For now, return basic patio information with spatial data
    const timestamp = new Date().toISOString();
    const patioDtos: PatioDataDto[] = patios.slice(0, MAX_RESULTS).map((patio: any) => {
      // Use distance from RPC function if available, otherwise calculate
      const distanceMeters = patio.DistanceMeters || 0;

      // Extract coordinates from venue location or patio centroid
      let location = { lat: latitude, lng: longitude };
      if (patio.VenueLocation) {
        location = parsePostGISPoint(patio.VenueLocation);
      } else if (patio.Geometry) {
        // Try to extract centroid from patio geometry
        // This is a simplified extraction - full implementation would use PostGIS
        location = parsePostGISPoint(patio.Geometry);
      }

      return {
        id: `${patio.VenueId}-${patio.Id}`,
        venueId: patio.VenueId.toString(),
        venueName: patio.VenueName || 'Unknown Venue',
        location: {
          latitude: location.lat,
          longitude: location.lng,
        },
        currentSunStatus: 'Shaded', // Placeholder - sun exposure calculation in future story
        confidence: 0, // Placeholder
        distanceMeters,
        sunExposurePercent: 0, // Placeholder - sun exposure calculation in future story
      };
    });

    // Sort by distance and limit results
    const sortedPatios = patioDtos.sort((a, b) => a.distanceMeters - b.distanceMeters);

    const response: GetPatiosResponse = {
      patios: sortedPatios,
      timestamp,
      totalCount: sortedPatios.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error searching patios:', error);
    return internalServerError('An error occurred while searching for patios');
  }
}

/**
 * Parse PostGIS POINT geometry string
 * Format: "POINT(longitude latitude)" or "SRID=4326;POINT(longitude latitude)"
 */
function parsePostGISPoint(geometry: string): { lat: number; lng: number } {
  // Remove SRID prefix if present
  const cleaned = geometry.replace(/^SRID=\d+;/, '');
  // Extract coordinates from POINT(lng lat)
  const match = cleaned.match(/POINT\(([^)]+)\)/);
  if (match) {
    const coords = match[1].split(/\s+/);
    return {
      lng: parseFloat(coords[0]),
      lat: parseFloat(coords[1]),
    };
  }
  // Fallback
  return { lat: 0, lng: 0 };
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
