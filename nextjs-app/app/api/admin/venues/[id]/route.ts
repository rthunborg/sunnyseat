import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import type { AuthUser } from '@/lib/middleware/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, notFound, handleDatabaseError } from '@/lib/utils/api-errors';
import { dbVenueToApi, venueTypeToInt } from '@/lib/utils/venue-mapping';

async function handleGet(
  _request: NextRequest,
  _user: AuthUser,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;

  const { data, error } = await supabaseAdmin
    .from('venues')
    .select('*')
    .eq('Id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return notFound('Venue');
    }
    return handleDatabaseError(error);
  }

  // PostgREST returns geography as WKB hex; convert to GeoJSON for frontend
  let geometry: GeoJSON.Polygon | null = null;
  if (data.Geometry) {
    geometry = await fetchVenueGeometryAsGeoJSON(Number(id));
  }

  const venue = dbVenueToApi(data);
  return NextResponse.json({ ...venue, geometry });
}

async function handlePut(
  request: NextRequest,
  _user: AuthUser,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  // Map camelCase frontend fields to PascalCase DB columns
  const update: Record<string, unknown> = {};

  if (body.name !== undefined) update.Name = (body.name as string).trim();
  if (body.slug !== undefined) update.Slug = (body.slug as string).trim();
  if (body.neighborhood !== undefined) update.Neighborhood = body.neighborhood;
  if (body.type !== undefined) update.Type = venueTypeToInt(body.type as string);
  if (body.address !== undefined) update.Address = (body.address as string)?.trim() || '';
  if (body.phone !== undefined) update.Phone = (body.phone as string)?.trim() || null;
  if (body.website !== undefined) update.Website = (body.website as string)?.trim() || null;
  if (body.description !== undefined) update.Description = (body.description as string)?.trim() || null;

  // Update Location + Latitude/Longitude if lat/lng provided
  const lat = body.latitude !== undefined ? Number(body.latitude) : undefined;
  const lng = body.longitude !== undefined ? Number(body.longitude) : undefined;
  if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
    update.Location = `POINT(${lng} ${lat})`;
    update.Latitude = lat;
    update.Longitude = lng;
  }

  // These columns are already lowercase in the DB (migration 008)
  if (body.is_partner !== undefined) update.is_partner = body.is_partner;
  if (body.booking_url !== undefined) update.booking_url = body.booking_url;
  if (body.website_url !== undefined) update.website_url = body.website_url;
  if (body.VerificationStatus !== undefined) update.VerificationStatus = body.VerificationStatus;

  // Handle geometry update directly on venue
  if (body.geometry !== undefined) {
    if (body.geometry === null) {
      update.Geometry = null;
      update.IsMapped = false;
    } else {
      update.Geometry = geojsonPolygonToWkt(body.geometry as GeoJSON.Polygon);
      update.IsMapped = true;
    }
    if (body.height_source !== undefined) update.HeightSource = body.height_source;
  }

  if (Object.keys(update).length === 0) {
    return badRequest('No fields to update');
  }

  const { data, error } = await supabaseAdmin
    .from('venues')
    .update(update)
    .eq('Id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return notFound('Venue');
    }
    return handleDatabaseError(error);
  }

  // Convert WKB hex geometry to GeoJSON for frontend (same as GET handler)
  let geometry: GeoJSON.Polygon | null = null;
  if (data.Geometry) {
    geometry = await fetchVenueGeometryAsGeoJSON(Number(id));
  }

  const venue = dbVenueToApi(data);
  return NextResponse.json({ ...venue, geometry });
}

async function handleDelete(
  _request: NextRequest,
  _user: AuthUser,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;

  const { error } = await supabaseAdmin
    .from('venues')
    .delete()
    .eq('Id', id);

  if (error) {
    return handleDatabaseError(error);
  }

  return NextResponse.json({ message: 'Venue deleted' }, { status: 200 });
}

export const GET = withAdminAuth(handleGet as Parameters<typeof withAdminAuth>[0]);
export const PUT = withAdminAuth(handlePut as Parameters<typeof withAdminAuth>[0]);
export const DELETE = withAdminAuth(handleDelete as Parameters<typeof withAdminAuth>[0]);

/** Fetch venue geometry as GeoJSON using PostGIS ST_AsGeoJSON via RPC */
async function fetchVenueGeometryAsGeoJSON(venueId: number): Promise<GeoJSON.Polygon | null> {
  // Try the dedicated RPC function first
  try {
    const { data, error } = await supabaseAdmin.rpc('get_venue_geometry_geojson', {
      venue_id: venueId,
    });
    if (!error && data && data.length > 0) {
      return JSON.parse(data[0].geojson);
    }
  } catch {
    // RPC not available — fall through to WKB parsing
  }

  // Fallback: parse WKB hex directly
  const { data: row } = await supabaseAdmin
    .from('venues')
    .select('Geometry')
    .eq('Id', venueId)
    .single();

  if (!row?.Geometry) return null;
  return parseWkbHexPolygon(row.Geometry);
}

/** Parse a PostGIS WKB hex string for a simple Polygon into GeoJSON */
function parseWkbHexPolygon(hex: string): GeoJSON.Polygon | null {
  try {
    const buf = Buffer.from(hex, 'hex');
    let offset = 0;

    // Byte order: 01 = little-endian, 00 = big-endian
    const le = buf.readUInt8(offset) === 1;
    offset += 1;

    // Geometry type (with SRID flag)
    const rawType = le ? buf.readUInt32LE(offset) : buf.readUInt32BE(offset);
    offset += 4;
    const hasSRID = (rawType & 0x20000000) !== 0;
    const geomType = rawType & 0xff;

    if (hasSRID) offset += 4; // skip SRID

    // geomType 3 = Polygon
    if (geomType !== 3) return null;

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

/** Convert a GeoJSON Polygon (object or string) to EWKT for PostgREST geography columns */
function geojsonPolygonToWkt(geometry: GeoJSON.Polygon | string): string {
  const geo: GeoJSON.Polygon = typeof geometry === 'string' ? JSON.parse(geometry) : geometry;
  const ring = geo.coordinates[0]
    .map((coord) => `${coord[0]} ${coord[1]}`)
    .join(', ');
  return `SRID=4326;POLYGON((${ring}))`;
}
