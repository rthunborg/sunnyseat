import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import type { AuthUser } from '@/lib/middleware/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { handleDatabaseError } from '@/lib/utils/api-errors';

async function handleGet(_request: NextRequest, _user: AuthUser) {
  const { data: venues, error: venueError } = await supabaseAdmin
    .from('venues')
    .select('Id, Geometry');

  if (venueError) {
    return handleDatabaseError(venueError);
  }

  const totalVenues = venues?.length ?? 0;
  const mappedVenues = (venues ?? []).filter((v) => v.Geometry != null).length;

  const mappedPercentage =
    totalVenues > 0 ? Math.round((mappedVenues / totalVenues) * 100) : 0;

  return NextResponse.json({
    totalVenues,
    mappedVenues,
    mappedPercentage,
  });
}

export const GET = withAdminAuth(handleGet);
