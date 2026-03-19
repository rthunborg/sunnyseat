import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import type { AuthUser } from '@/lib/middleware/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, notFound, handleDatabaseError } from '@/lib/utils/api-errors';
import { dbVenueToApi, dbPatioToApi, venueTypeToInt } from '@/lib/utils/venue-mapping';

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

  // Fetch the venue's patio (single polygon)
  const { data: patios } = await supabaseAdmin
    .from('patios')
    .select('*')
    .eq('VenueId', id)
    .limit(1);

  const venue = dbVenueToApi(data);
  const patio = patios && patios.length > 0 ? dbPatioToApi(patios[0]) : null;

  return NextResponse.json({
    ...venue,
    geometry: patio?.geometry ?? null,
    patio_id: patio?.id ?? null,
    height_source: patio?.height_source ?? null,
  });
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

  if (Object.keys(update).length === 0 && body.geometry === undefined) {
    return badRequest('No fields to update');
  }

  // Update venue fields
  let venueData;
  if (Object.keys(update).length > 0) {
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
    venueData = data;
  } else {
    // No venue fields to update, just fetch current
    const { data, error } = await supabaseAdmin
      .from('venues')
      .select('*')
      .eq('Id', id)
      .single();

    if (error) return handleDatabaseError(error);
    venueData = data;
  }

  // Handle geometry (patio polygon) update
  let geometry = null;
  let patioId = null;
  let heightSource = null;

  if (body.geometry !== undefined) {
    // Check if venue already has a patio
    const { data: existingPatios } = await supabaseAdmin
      .from('patios')
      .select('*')
      .eq('VenueId', id)
      .limit(1);

    if (body.geometry === null) {
      // Remove polygon: delete existing patio
      if (existingPatios && existingPatios.length > 0) {
        await supabaseAdmin
          .from('patios')
          .delete()
          .eq('Id', existingPatios[0].Id);
        await supabaseAdmin
          .from('venues')
          .update({ IsMapped: false })
          .eq('Id', id);
      }
    } else if (existingPatios && existingPatios.length > 0) {
      // Update existing patio
      // PostgREST requires geography values as GeoJSON strings, not objects
      const geoString = typeof body.geometry === 'string'
        ? body.geometry
        : JSON.stringify(body.geometry);
      const patioUpdate: Record<string, unknown> = {
        Geometry: geoString,
      };
      if (body.height_source !== undefined) patioUpdate.HeightSource = body.height_source;

      const { data: updatedPatio, error: patioError } = await supabaseAdmin
        .from('patios')
        .update(patioUpdate)
        .eq('Id', existingPatios[0].Id)
        .select()
        .single();

      if (patioError) {
        console.error('Failed to update patio:', patioError);
      } else {
        const mapped = dbPatioToApi(updatedPatio);
        geometry = mapped.geometry;
        patioId = mapped.id;
        heightSource = mapped.height_source;
      }
    } else {
      // Create new patio
      const venueName = venueData.Name || 'Uteplats';
      const geoStr = typeof body.geometry === 'string'
        ? body.geometry
        : JSON.stringify(body.geometry);
      const { data: newPatio, error: patioError } = await supabaseAdmin
        .from('patios')
        .insert({
          VenueId: Number(id),
          Name: venueName,
          Geometry: geoStr,
          HeightSource: body.height_source ?? 0,
          PolygonQuality: 0,
        })
        .select()
        .single();

      if (patioError) {
        console.error('Failed to create patio:', patioError);
      } else {
        await supabaseAdmin
          .from('venues')
          .update({ IsMapped: true })
          .eq('Id', id);
        const mapped = dbPatioToApi(newPatio);
        geometry = mapped.geometry;
        patioId = mapped.id;
        heightSource = mapped.height_source;
      }
    }
  } else {
    // Geometry not in request — fetch existing patio
    const { data: existingPatios } = await supabaseAdmin
      .from('patios')
      .select('*')
      .eq('VenueId', id)
      .limit(1);

    if (existingPatios && existingPatios.length > 0) {
      const mapped = dbPatioToApi(existingPatios[0]);
      geometry = mapped.geometry;
      patioId = mapped.id;
      heightSource = mapped.height_source;
    }
  }

  const venue = dbVenueToApi(venueData);
  return NextResponse.json({
    ...venue,
    geometry,
    patio_id: patioId,
    height_source: heightSource,
  });
}

async function handleDelete(
  _request: NextRequest,
  _user: AuthUser,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;

  // Delete associated patios first
  await supabaseAdmin.from('patios').delete().eq('VenueId', id);

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
