import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import type { AuthUser } from '@/lib/middleware/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { handleDatabaseError } from '@/lib/utils/api-errors';

async function handleGet(request: NextRequest, _user: AuthUser) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const offset = (page - 1) * limit;

  const { data: buildings, error } = await supabaseAdmin
    .from('buildings')
    .select('*')
    .order('Id')
    .range(offset, offset + limit - 1);

  if (error) {
    return handleDatabaseError(error);
  }

  const { count, error: countError } = await supabaseAdmin
    .from('buildings')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    return handleDatabaseError(countError);
  }

  return NextResponse.json({
    buildings: buildings ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}

export const GET = withAdminAuth(handleGet);
