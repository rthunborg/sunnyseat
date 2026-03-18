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
  const lat = body.latitude !== undefined ? Number(body.latitude) : null;
  const lng = body.longitude !== undefined ? Number(body.longitude) : null;

  const insert: Record<string, unknown> = {
    Name: (body.name as string).trim(),
    Slug: slug,
    Address: (body.address as string)?.trim() || '',
    Type: venueTypeToInt((body.type as string) || 'restaurant'),
    Neighborhood: body.neighborhood ?? null,
    IsActive: true,
    IsMapped: false,
    VerificationStatus: 1,
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

  return NextResponse.json(dbVenueToApi(data), { status: 201 });
}

export const GET = withAdminAuth(handleGet);
export const POST = withAdminAuth(handlePost);
