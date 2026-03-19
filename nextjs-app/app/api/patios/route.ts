import { NextRequest, NextResponse } from 'next/server';
import {
  parseNumberQuery,
  parseOptionalNumberQuery,
  validateLatitude,
  validateLongitude,
  validateRadius,
} from '@/lib/utils/validation';
import { badRequest, internalServerError } from '@/lib/utils/api-errors';
import { getVenuesNearPoint } from '@/lib/services/venue-service';
import { calculateSunExposure } from '@/lib/solar/sun-exposure-service';
import type { GetPatiosResponse, PatioDataDto } from '@/lib/types/api';

interface VenueRow {
  Id: number;
  Name?: string;
  Location?: string; // PostGIS POINT as WKB hex or WKT
  Geometry?: string; // PostGIS POLYGON as WKB hex or WKT
  DistanceMeters?: number;
}

const MAX_RADIUS_KM = 3.0;
const DEFAULT_RADIUS_KM = 1.5;
const MAX_RESULTS = 50;

/**
 * GET /api/patios
 * Search for venues by location with current sun exposure
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

    // Get venues near location using PostGIS spatial query
    const venues = await getVenuesNearPoint(latitude, longitude, radiusKm);

    if (venues.length === 0) {
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
    const limitedVenues = venues.slice(0, MAX_RESULTS);

    const patioDtos: PatioDataDto[] = await Promise.all(
      limitedVenues.map(async (venue: VenueRow) => {
        const distanceMeters = venue.DistanceMeters || 0;

        // Parse venue location from PostGIS data (WKB hex or WKT)
        let location = { lat: latitude, lng: longitude };
        if (venue.Location) {
          location = parsePostGISGeometry(venue.Location);
        }
        // Fallback: if Location parse failed, try Geometry centroid
        if (location.lat === 0 && location.lng === 0 && venue.Geometry) {
          location = parsePostGISGeometry(venue.Geometry);
        }

        let sunStatus: 'Sunny' | 'Partial' | 'Shaded' = 'Shaded';
        let confidence = 0;
        let sunExposurePercent = 0;

        try {
          const exposure = await calculateSunExposure(venue.Id, timestamp);
          sunStatus = exposure.state === 'NoSun' ? 'Shaded' : exposure.state;
          confidence = exposure.confidence;
          sunExposurePercent = exposure.sunExposurePercent;
        } catch {
          // Gracefully degrade — show venue with unknown sun status
        }

        return {
          id: venue.Id.toString(),
          venueId: venue.Id.toString(),
          venueName: venue.Name || 'Unknown Venue',
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
    console.error('Error searching venues:', error);
    return internalServerError('An error occurred while searching for venues');
  }
}

/**
 * Parse PostGIS geometry (WKB hex or WKT) and extract a point (lng, lat).
 * For POINT: returns the point directly.
 * For POLYGON: returns the centroid of the first ring.
 */
function parsePostGISGeometry(geometry: string): { lat: number; lng: number } {
  // Try WKT format first: "POINT(lng lat)" or "SRID=4326;POINT(lng lat)"
  const cleaned = geometry.replace(/^SRID=\d+;/, '');
  const pointMatch = cleaned.match(/POINT\(([^)]+)\)/);
  if (pointMatch) {
    const coords = pointMatch[1].split(/\s+/);
    return { lng: parseFloat(coords[0]), lat: parseFloat(coords[1]) };
  }

  // Try WKB hex format
  try {
    const buf = Buffer.from(geometry, 'hex');
    if (buf.length < 9) return { lat: 0, lng: 0 };

    let offset = 0;
    const le = buf.readUInt8(offset) === 1;
    offset += 1;

    const rawType = le ? buf.readUInt32LE(offset) : buf.readUInt32BE(offset);
    offset += 4;
    const hasSRID = (rawType & 0x20000000) !== 0;
    const geomType = rawType & 0xff;
    if (hasSRID) offset += 4;

    const readDouble = (o: number) => le ? buf.readDoubleLE(o) : buf.readDoubleBE(o);

    if (geomType === 1) {
      // POINT
      const lng = readDouble(offset);
      const lat = readDouble(offset + 8);
      return { lat, lng };
    }

    if (geomType === 3) {
      // POLYGON — compute centroid of first ring
      const readUInt32 = (o: number) => le ? buf.readUInt32LE(o) : buf.readUInt32BE(o);
      const _numRings = readUInt32(offset);
      offset += 4;
      const numPoints = readUInt32(offset);
      offset += 4;

      let sumLng = 0, sumLat = 0;
      const n = numPoints > 1 ? numPoints - 1 : numPoints; // exclude closing vertex
      for (let p = 0; p < numPoints; p++) {
        const x = readDouble(offset); offset += 8;
        const y = readDouble(offset); offset += 8;
        if (p < n) { sumLng += x; sumLat += y; }
      }
      return { lat: sumLat / n, lng: sumLng / n };
    }
  } catch {
    // Not valid WKB
  }

  return { lat: 0, lng: 0 };
}
