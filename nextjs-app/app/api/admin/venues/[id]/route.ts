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

  const venue = dbVenueToApi(data);
  return NextResponse.json(venue);
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
      const geoString = typeof body.geometry === 'string'
        ? body.geometry
        : JSON.stringify(body.geometry);
      update.Geometry = geoString;
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

  const venue = dbVenueToApi(data);
  return NextResponse.json(venue);
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
