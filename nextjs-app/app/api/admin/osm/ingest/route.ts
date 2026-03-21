import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import type { AuthUser } from '@/lib/middleware/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, internalServerError } from '@/lib/utils/api-errors';
import { runOsmIngestion, CITY_BBOXES } from '@/lib/services/osm-ingestion';

async function handlePost(request: NextRequest, _user: AuthUser) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const city = (body.city as string) ?? 'gothenburg';

  if (!CITY_BBOXES[city]) {
    return badRequest(`Unknown city: ${city}. Available: ${Object.keys(CITY_BBOXES).join(', ')}`);
  }

  try {
    const result = await runOsmIngestion(city, supabaseAdmin);
    return NextResponse.json({
      success: true,
      city,
      totalFromOsm: result.totalFromOsm,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      duration: result.duration,
    });
  } catch (error) {
    console.error('[OSM Ingest API] Error:', error);
    return internalServerError(
      `OSM ingestion failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export const POST = withAdminAuth(handlePost);
