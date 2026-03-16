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
import { calculateSunExposure } from '@/lib/solar/sun-exposure-service';
import type { GetPatiosResponse, PatioDataDto } from '@/lib/types/api';

interface PatioRow {
  Id: number;
  VenueId: number;
  VenueName?: string;
  VenueLocation?: string;
  Geometry?: string;
  DistanceMeters?: number;
}

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

    // Parse optional time offset (0-3 hours into the future)
    const offsetHoursParam = parseOptionalNumberQuery(searchParams.get('offset_hours'));
    const offsetHours = offsetHoursParam != null ? Math.min(Math.max(Math.round(offsetHoursParam), 0), 3) : 0;

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

    const timestamp = new Date();
    if (offsetHours > 0) {
      timestamp.setHours(timestamp.getHours() + offsetHours);
    }
    const limitedPatios = patios.slice(0, MAX_RESULTS);

    const patioDtos: PatioDataDto[] = await Promise.all(
      limitedPatios.map(async (patio: PatioRow) => {
        const distanceMeters = patio.DistanceMeters || 0;

        let location = { lat: latitude, lng: longitude };
        if (patio.VenueLocation) {
          location = parsePostGISPoint(patio.VenueLocation);
        } else if (patio.Geometry) {
          location = parsePostGISPoint(patio.Geometry);
        }

        let sunStatus: 'Sunny' | 'Partial' | 'Shaded' = 'Shaded';
        let confidence = 0;
        let sunExposurePercent = 0;

        try {
          const exposure = await calculateSunExposure(patio.Id, timestamp);
          sunStatus = exposure.state === 'NoSun' ? 'Shaded' : exposure.state;
          confidence = exposure.confidence;
          sunExposurePercent = exposure.sunExposurePercent;
        } catch {
          // Gracefully degrade — show patio with unknown sun status
        }

        return {
          id: `${patio.VenueId}-${patio.Id}`,
          venueId: patio.VenueId.toString(),
          venueName: patio.VenueName || 'Unknown Venue',
          location: {
            latitude: location.lat,
            longitude: location.lng,
          },
          currentSunStatus: sunStatus,
          confidence,
          distanceMeters,
          sunExposurePercent,
        };
      })
    );

    const sortedPatios = patioDtos.sort((a, b) => a.distanceMeters - b.distanceMeters);

    const response: GetPatiosResponse = {
      patios: sortedPatios,
      timestamp: timestamp.toISOString(),
      totalCount: sortedPatios.length,
    };

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
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
