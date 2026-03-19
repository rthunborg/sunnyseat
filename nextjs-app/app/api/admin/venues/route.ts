import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import type { AuthUser } from '@/lib/middleware/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { validateCreateVenue, slugify } from '@/lib/validation/venue';
import {
  badRequest,
  createValidationErrorResponse,
  handleDatabaseError,
} from '@/lib/utils/api-errors';
import { dbVenueToApi, venueTypeToInt } from '@/lib/utils/venue-mapping';

async function handleGet(request: NextRequest, _user: AuthUser) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const type = searchParams.get('type');
  const mapped = searchParams.get('mapped');

  let query = supabaseAdmin.from('venues').select('*').order('Name');

  if (search) {
    query = query.ilike('Name', `%${search}%`);
  }

  if (type) {
    const typeInt = venueTypeToInt(type);
    query = query.eq('Type', typeInt);
  }

  const { data: venues, error } = await query;

  if (error) {
    return handleDatabaseError(error);
  }

  let result = venues ?? [];

  // Filter by mapped status (has geometry) if requested
  if (mapped !== null) {
    if (mapped === 'true') {
      result = result.filter((v) => v.Geometry != null);
    } else if (mapped === 'false') {
      result = result.filter((v) => v.Geometry == null);
    }
  }

  return NextResponse.json(result.map(dbVenueToApi));
}

async function handlePost(request: NextRequest, _user: AuthUser) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const validation = validateCreateVenue(body);
  if (!validation.valid) {
    return createValidationErrorResponse(
      'Validation Error',
      'Invalid venue data',
      validation.errors
    );
  }

  const slug = (body.slug as string) || slugify(body.name as string);
  let lat = body.latitude != null ? Number(body.latitude) : null;
  let lng = body.longitude != null ? Number(body.longitude) : null;

  // If no lat/lng provided but geometry exists, extract centroid from polygon
  if ((lat === null || lng === null) && body.geometry) {
    const centroid = extractPolygonCentroid(body.geometry as GeoJSON.Polygon);
    if (centroid) {
      lng = centroid[0];
      lat = centroid[1];
    }
  }

  const insert: Record<string, unknown> = {
    Name: (body.name as string).trim(),
    Slug: slug,
    Address: (body.address as string)?.trim() || '',
    Phone: (body.phone as string)?.trim() || null,
    Website: (body.website as string)?.trim() || null,
    Description: (body.description as string)?.trim() || null,
    Type: venueTypeToInt((body.type as string) || 'restaurant'),
    Neighborhood: body.neighborhood ?? null,
    IsActive: true,
    IsMapped: false,
    VerificationStatus: 1,
    Latitude: lat,
    Longitude: lng,
  };

  // Location is NOT NULL in the DB — require lat/lng or use Gothenburg center
  if (lat !== null && lng !== null) {
    insert.Location = `POINT(${lng} ${lat})`;
  } else {
    insert.Location = 'POINT(11.9746 57.7089)';
  }

  // If geometry provided, store directly on venue as EWKT for PostgREST
  if (body.geometry) {
    insert.Geometry = geojsonPolygonToWkt(body.geometry as GeoJSON.Polygon);
    insert.IsMapped = true;
  }

  const { data, error } = await supabaseAdmin
    .from('venues')
    .insert(insert)
    .select()
    .single();

  if (error) {
    return handleDatabaseError(error);
  }

  const venueApi = dbVenueToApi(data);
  return NextResponse.json(venueApi, { status: 201 });
}

export const GET = withAdminAuth(handleGet);
export const POST = withAdminAuth(handlePost);

/** Convert a GeoJSON Polygon (object or string) to EWKT for PostgREST geography columns */
function geojsonPolygonToWkt(geometry: GeoJSON.Polygon | string): string {
  const geo: GeoJSON.Polygon = typeof geometry === 'string' ? JSON.parse(geometry) : geometry;
  const ring = geo.coordinates[0]
    .map((coord) => `${coord[0]} ${coord[1]}`)
    .join(', ');
  return `SRID=4326;POLYGON((${ring}))`;
}

/** Extract centroid [lng, lat] from a GeoJSON Polygon */
function extractPolygonCentroid(geometry: GeoJSON.Polygon): [number, number] | null {
  try {
    const ring = geometry?.coordinates?.[0];
    if (!ring || ring.length < 3) return null;
    // Average all vertices (excluding closing vertex if first==last)
    const verts = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
    const sumLng = verts.reduce((s, v) => s + v[0], 0);
    const sumLat = verts.reduce((s, v) => s + v[1], 0);
    return [sumLng / verts.length, sumLat / verts.length];
  } catch {
    return null;
  }
}
