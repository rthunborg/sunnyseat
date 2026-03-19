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

  // Filter by mapped status (has patios) if requested
  if (mapped !== null) {
    const { data: patios, error: patioError } = await supabaseAdmin
      .from('patios')
      .select('VenueId');

    if (patioError) {
      return handleDatabaseError(patioError);
    }

    const venueIdsWithPatios = new Set((patios ?? []).map((p) => p.VenueId));

    if (mapped === 'true') {
      result = result.filter((v) => venueIdsWithPatios.has(v.Id));
    } else if (mapped === 'false') {
      result = result.filter((v) => !venueIdsWithPatios.has(v.Id));
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
  const lat = body.latitude != null ? Number(body.latitude) : null;
  const lng = body.longitude != null ? Number(body.longitude) : null;

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

  const { data, error } = await supabaseAdmin
    .from('venues')
    .insert(insert)
    .select()
    .single();

  if (error) {
    return handleDatabaseError(error);
  }

  // If geometry provided, create the venue's patio record
  if (body.geometry) {
    const venueId = data.Id;
    const patioInsert = {
      VenueId: venueId,
      Name: (body.name as string).trim(),
      Geometry: body.geometry,
      HeightSource: 0,
      PolygonQuality: 0,
    };

    const { error: patioError } = await supabaseAdmin
      .from('patios')
      .insert(patioInsert);

    if (patioError) {
      // Venue created but patio failed — still return venue
      console.error('Failed to create patio for venue:', patioError);
    } else {
      // Mark venue as mapped
      await supabaseAdmin
        .from('venues')
        .update({ IsMapped: true })
        .eq('Id', venueId);
    }
  }

  const venueApi = dbVenueToApi(data);

  // Include geometry in response if it was provided
  if (body.geometry) {
    return NextResponse.json({ ...venueApi, geometry: body.geometry }, { status: 201 });
  }

  return NextResponse.json(venueApi, { status: 201 });
}

export const GET = withAdminAuth(handleGet);
export const POST = withAdminAuth(handlePost);
