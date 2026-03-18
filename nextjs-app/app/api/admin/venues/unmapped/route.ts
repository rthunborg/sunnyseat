import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import type { AuthUser } from '@/lib/middleware/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { handleDatabaseError } from '@/lib/utils/api-errors';

async function handleGet(_request: NextRequest, _user: AuthUser) {
  const { data: venues, error: venueError } = await supabaseAdmin
    .from('venues')
    .select('*')
    .order('Name');

  if (venueError) {
    return handleDatabaseError(venueError);
  }

  const { data: patios, error: patioError } = await supabaseAdmin
    .from('patios')
    .select('VenueId');

  if (patioError) {
    return handleDatabaseError(patioError);
  }

  const venueIdsWithPatios = new Set((patios ?? []).map((p) => p.VenueId));
  const unmapped = (venues ?? []).filter((v) => !venueIdsWithPatios.has(v.Id));

  return NextResponse.json(unmapped);
}

export const GET = withAdminAuth(handleGet);
