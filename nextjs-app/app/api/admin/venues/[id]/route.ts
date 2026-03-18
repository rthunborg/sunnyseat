import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import type { AuthUser } from '@/lib/middleware/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, notFound, handleDatabaseError } from '@/lib/utils/api-errors';

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

  return NextResponse.json(data);
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

  // Build update object with only provided fields
  const update: Record<string, unknown> = {};
  const allowedFields = [
    'name',
    'slug',
    'latitude',
    'longitude',
    'lat',
    'lng',
    'neighborhood',
    'type',
    'address',
    'website',
    'google_maps_url',
    'is_partner',
    'booking_url',
    'website_url',
    'VerificationStatus',
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      update[field] = body[field];
    }
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

  return NextResponse.json(data);
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
