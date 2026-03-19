import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import type { AuthUser } from '@/lib/middleware/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { validateCreatePatio } from '@/lib/validation/venue';
import {
  badRequest,
  createValidationErrorResponse,
  handleDatabaseError,
} from '@/lib/utils/api-errors';
import { dbPatioToApi } from '@/lib/utils/venue-mapping';

async function handleGet(
  _request: NextRequest,
  _user: AuthUser,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;

  const { data, error } = await supabaseAdmin
    .from('patios')
    .select('*')
    .eq('VenueId', id);

  if (error) {
    return handleDatabaseError(error);
  }

  return NextResponse.json((data ?? []).map(dbPatioToApi));
}

async function handlePost(
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

  const validation = validateCreatePatio(body);
  if (!validation.valid) {
    return createValidationErrorResponse(
      'Validation Error',
      'Invalid patio data',
      validation.errors
    );
  }

  const { data, error } = await supabaseAdmin
    .from('patios')
    .insert({
      VenueId: Number(id),
      Name: (body.name as string).trim(),
      Geometry: body.geometry,
      Orientation: body.orientation ?? null,
      HeightSource: body.height_source ?? 0,
      PolygonQuality: 0,
    })
    .select()
    .single();

  if (error) {
    return handleDatabaseError(error);
  }

  return NextResponse.json(dbPatioToApi(data), { status: 201 });
}

export const GET = withAdminAuth(handleGet as Parameters<typeof withAdminAuth>[0]);
export const POST = withAdminAuth(handlePost as Parameters<typeof withAdminAuth>[0]);
