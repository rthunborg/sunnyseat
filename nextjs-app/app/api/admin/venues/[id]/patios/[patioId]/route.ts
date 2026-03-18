import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import type { AuthUser } from '@/lib/middleware/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  badRequest,
  handleDatabaseError,
} from '@/lib/utils/api-errors';

type RouteContext = { params: Promise<{ id: string; patioId: string }> };

async function handlePut(
  request: NextRequest,
  _user: AuthUser,
  context: RouteContext
) {
  const { id, patioId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = (body.name as string).trim();
  if (body.geometry !== undefined) updates.geometry = body.geometry;
  if (body.height_source !== undefined) updates.height_source = body.height_source;
  if (body.orientation !== undefined) updates.orientation = body.orientation;
  if (body.has_awning !== undefined) updates.has_awning = body.has_awning;

  if (Object.keys(updates).length === 0) {
    return badRequest('No fields to update');
  }

  const { data, error } = await supabaseAdmin
    .from('patios')
    .update(updates)
    .eq('Id', patioId)
    .eq('VenueId', id)
    .select()
    .single();

  if (error) {
    return handleDatabaseError(error);
  }

  return NextResponse.json(data);
}

async function handleDelete(
  _request: NextRequest,
  _user: AuthUser,
  context: RouteContext
) {
  const { id, patioId } = await context.params;

  const { error } = await supabaseAdmin
    .from('patios')
    .delete()
    .eq('Id', patioId)
    .eq('VenueId', id);

  if (error) {
    return handleDatabaseError(error);
  }

  return NextResponse.json({ success: true });
}

export const PUT = withAdminAuth(handlePut as Parameters<typeof withAdminAuth>[0]);
export const DELETE = withAdminAuth(handleDelete as Parameters<typeof withAdminAuth>[0]);
