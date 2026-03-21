import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import type { AuthUser } from '@/lib/middleware/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { handleDatabaseError } from '@/lib/utils/api-errors';

async function handleGet(_request: NextRequest, _user: AuthUser) {
  const { data: venues, error: venueError } = await supabaseAdmin
    .from('venues')
    .select('*')
    .is('Geometry', null)
    .order('Name');

  if (venueError) {
    return handleDatabaseError(venueError);
  }

  return NextResponse.json(venues ?? []);
}

export const GET = withAdminAuth(handleGet);
