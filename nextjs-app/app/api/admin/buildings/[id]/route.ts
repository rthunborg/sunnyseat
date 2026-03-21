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
    .from('buildings')
    .select('*')
    .eq('Id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return notFound('Building');
    }
    return handleDatabaseError(error);
  }

  return NextResponse.json(data);
}

async function handlePut(
  request: NextRequest,
  user: AuthUser,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const update: Record<string, unknown> = {};

  if (body.height !== undefined) {
    const h = Number(body.height);
    if (isNaN(h) || h < 0) {
      return badRequest('Height must be a non-negative number');
    }
    update.AdminHeightOverride = h;
    update.UpdatedBy = user.username;
  }

  if (body.BuildingType !== undefined) {
    update.BuildingType = body.BuildingType;
  }

  if (Object.keys(update).length === 0) {
    return badRequest('No fields to update');
  }

  update.UpdatedAt = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('buildings')
    .update(update)
    .eq('Id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return notFound('Building');
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

  const { error } = await supabaseAdmin
    .from('buildings')
    .delete()
    .eq('Id', id);

  if (error) {
    return handleDatabaseError(error);
  }

  return NextResponse.json({ message: 'Building deleted' }, { status: 200 });
}

export const GET = withAdminAuth(handleGet as Parameters<typeof withAdminAuth>[0]);
export const PUT = withAdminAuth(handlePut as Parameters<typeof withAdminAuth>[0]);
export const DELETE = withAdminAuth(handleDelete as Parameters<typeof withAdminAuth>[0]);
