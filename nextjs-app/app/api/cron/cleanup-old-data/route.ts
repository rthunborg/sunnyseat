import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { internalServerError } from '@/lib/utils/api-errors';

/**
 * POST /api/cron/cleanup-old-data
 * Scheduled background job: Cleanup expired precomputed data
 * Schedule: Weekly on Sundays at 1 AM UTC (triggered by GitHub Actions)
 * Workflow: .github/workflows/scheduled-jobs-cleanup.yml
 *
 * Removes expired precomputed sun exposure data older than retention period
 */
export async function POST(request: NextRequest) {
  // Verify cron secret (Vercel Cron sends this header)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    console.log('[Cleanup Old Data] Starting cleanup of expired precomputed data');

    // Retention period: 3 days (matching PrecomputedSunExposure.ExpiresAt logic)
    const retentionDays = 3;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Delete expired precomputed data
    const { data: deleted, error: deleteError } = await supabaseAdmin
      .from('precomputed_sun_exposures')
      .delete()
      .lt('ExpiresAt', cutoffDate.toISOString())
      .select('Id');

    if (deleteError) {
      throw new Error(`Failed to delete expired data: ${deleteError.message}`);
    }

    const deletedCount = deleted?.length || 0;
    const duration = Date.now() - startTime;

    console.log(`[Cleanup Old Data] Deleted ${deletedCount} expired records`);

    return NextResponse.json({
      success: true,
      duration: duration,
      deletedCount,
      cutoffDate: cutoffDate.toISOString(),
      message: `Cleaned up ${deletedCount} expired precomputed records`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Cleanup Old Data] Error:', error);
    return internalServerError(`Cleanup failed after ${duration}ms: ${error}`);
  }
}
