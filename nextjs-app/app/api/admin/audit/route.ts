import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import type { AuthUser } from '@/lib/middleware/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, handleDatabaseError } from '@/lib/utils/api-errors';

async function handlePost(request: NextRequest, _user: AuthUser) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { admin_user, action, venue_id, details } = body as {
    admin_user?: string;
    action?: string;
    venue_id?: string;
    details?: Record<string, unknown>;
  };

  if (!admin_user || !action) {
    return badRequest('admin_user and action are required');
  }

  const { data, error } = await supabaseAdmin
    .from('admin_actions')
    .insert({
      AdminUser: admin_user,
      Action: action,
      VenueId: venue_id || null,
      Details: details || {},
    })
    .select()
    .single();

  if (error) {
    return handleDatabaseError(error);
  }

  return NextResponse.json(data, { status: 201 });
}

async function handleGet(request: NextRequest, _user: AuthUser) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
  const venueId = searchParams.get('venue_id');

  let query = supabaseAdmin
    .from('admin_actions')
    .select('*')
    .order('CreatedAt', { ascending: false })
    .limit(limit);

  if (venueId) {
    query = query.eq('VenueId', venueId);
  }

  const { data, error } = await query;

  if (error) {
    return handleDatabaseError(error);
  }

  return NextResponse.json(data ?? []);
}

export const POST = withAdminAuth(handlePost);
export const GET = withAdminAuth(handleGet);
