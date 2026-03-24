import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { internalServerError } from '@/lib/utils/api-errors';

/**
 * POST /api/cron/precomputation-schedule
 * Scheduled background job: Schedule upcoming precomputations
 * Schedule: Daily at midnight UTC (triggered by GitHub Actions)
 * Workflow: .github/workflows/scheduled-jobs-precomputation.yml
 *
 * Schedules precomputation jobs for today, tomorrow, and day after
 */
export async function POST(request: NextRequest) {
  // Verify cron secret (Vercel Cron sends this header)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    console.log('[Precomputation Schedule] Starting precomputation scheduling');

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const datesToSchedule = [
      new Date(today),
      new Date(today.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
      new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // Day after
    ];

    const scheduledDates: string[] = [];

    for (const date of datesToSchedule) {
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

      // Check if schedule already exists
      const { data: existing, error: checkError } = await supabaseAdmin
        .from('precomputation_schedules')
        .select('Id')
        .eq('TargetDate', dateStr)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = not found, which is fine
        console.error(
          `[Precomputation Schedule] Error checking schedule for ${dateStr}:`,
          checkError
        );
        continue;
      }

      if (existing) {
        console.log(`[Precomputation Schedule] Schedule already exists for ${dateStr}`);
        continue;
      }

      // Create new schedule
      const { error: insertError } = await supabaseAdmin.from('precomputation_schedules').insert({
        TargetDate: dateStr,
        Status: 0,
        ScheduledAt: new Date().toISOString(),
        VenuesTotal: 0,
        VenuesProcessed: 0,
        Metrics: {},
        UpdatedAt: new Date().toISOString(),
      });

      if (insertError) {
        console.error(
          `[Precomputation Schedule] Error creating schedule for ${dateStr}:`,
          insertError
        );
        continue;
      }

      scheduledDates.push(dateStr);
      console.log(`[Precomputation Schedule] Scheduled precomputation for ${dateStr}`);

      // Note: Actual precomputation execution will be triggered by alternative solution
      // (Supabase Edge Functions or external service) at 2 AM local time
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      duration: duration,
      scheduledDates,
      message: `Scheduled ${scheduledDates.length} precomputation jobs`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Precomputation Schedule] Error:', error);
    return internalServerError(`Precomputation scheduling failed after ${duration}ms: ${error}`);
  }
}
