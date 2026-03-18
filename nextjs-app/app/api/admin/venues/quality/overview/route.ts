import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import type { AuthUser } from '@/lib/middleware/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { handleDatabaseError } from '@/lib/utils/api-errors';

async function handleGet(_request: NextRequest, _user: AuthUser) {
  const { data: venues, error: venueError } = await supabaseAdmin
    .from('venues')
    .select('Id');

  if (venueError) {
    return handleDatabaseError(venueError);
  }

  const { data: patios, error: patioError } = await supabaseAdmin
    .from('patios')
    .select('VenueId');

  if (patioError) {
    return handleDatabaseError(patioError);
  }

  const totalVenues = venues?.length ?? 0;
  const venueIdsWithPatios = new Set((patios ?? []).map((p) => p.VenueId));
  const mappedVenues = venueIdsWithPatios.size;
  const totalPatios = patios?.length ?? 0;

  const mappedPercentage =
    totalVenues > 0 ? Math.round((mappedVenues / totalVenues) * 100) : 0;
  const avgPatiosPerVenue =
    mappedVenues > 0
      ? Math.round((totalPatios / mappedVenues) * 100) / 100
      : 0;

  return NextResponse.json({
    totalVenues,
    mappedVenues,
    mappedPercentage,
    avgPatiosPerVenue,
    totalPatios,
  });
}

export const GET = withAdminAuth(handleGet);
