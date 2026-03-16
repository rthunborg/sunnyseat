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

async function handleGet(
  _request: NextRequest,
  _user: AuthUser,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;

  const { data, error } = await supabaseAdmin
    .from('patios')
    .select('*')
    .eq('venue_id', id);

  if (error) {
    return handleDatabaseError(error);
  }

  return NextResponse.json(data ?? []);
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
      venue_id: id,
      name: (body.name as string).trim(),
      geometry: body.geometry,
      orientation: body.orientation ?? null,
      has_awning: body.has_awning ?? false,
      height_source: body.height_source ?? null,
    })
    .select()
    .single();

  if (error) {
    return handleDatabaseError(error);
  }

  return NextResponse.json(data, { status: 201 });
}

export const GET = withAdminAuth(handleGet as Parameters<typeof withAdminAuth>[0]);
export const POST = withAdminAuth(handlePost as Parameters<typeof withAdminAuth>[0]);
