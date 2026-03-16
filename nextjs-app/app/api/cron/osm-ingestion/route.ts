import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { internalServerError } from '@/lib/utils/api-errors';
import { runOsmIngestion } from '@/lib/services/osm-ingestion';

/**
 * GET /api/cron/osm-ingestion
 * Weekly scheduled job to ingest venues from OpenStreetMap.
 * Validates CRON_SECRET for authorization.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron: OSM Ingestion] Starting scheduled OSM ingestion');

    const result = await runOsmIngestion('gothenburg', supabaseAdmin);

    console.log(
      `[Cron: OSM Ingestion] Done: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors in ${result.duration}ms`
    );

    return NextResponse.json({
      success: true,
      city: 'gothenburg',
      totalFromOsm: result.totalFromOsm,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      duration: result.duration,
    });
  } catch (error) {
    console.error('[Cron: OSM Ingestion] Error:', error);
    return internalServerError(
      `Scheduled OSM ingestion failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
