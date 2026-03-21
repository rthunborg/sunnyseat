import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { internalServerError } from '@/lib/utils/api-errors';

/**
 * POST /api/cron/accuracy-metrics
 * Scheduled background job: Accuracy metrics calculation
 * Schedule: Daily at 4 AM UTC (triggered by GitHub Actions)
 * Workflow: .github/workflows/scheduled-jobs-accuracy.yml
 *
 * Calculates and caches accuracy metrics for monitoring
 */
export async function POST(request: NextRequest) {
  // Verify cron secret (Vercel Cron sends this header)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    console.log('[Accuracy Metrics] Starting accuracy metrics calculation');

    // Calculate 14-day rolling window
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14);

    // Get feedback data for the period
    const { data: feedback, error: feedbackError } = await supabaseAdmin
      .from('feedback')
      .select('*')
      .gte('BinnedTimestamp', startDate.toISOString())
      .lte('BinnedTimestamp', endDate.toISOString());

    if (feedbackError) {
      throw new Error(`Failed to fetch feedback: ${feedbackError.message}`);
    }

    // Calculate overall metrics
    const totalFeedback = feedback?.length || 0;
    const accuratePredictions =
      feedback?.filter(
        (f) =>
          (f.WasSunny && f.PredictedState === 'Sunny') ||
          (!f.WasSunny && f.PredictedState !== 'Sunny')
      ).length || 0;
    const accuracyRate = totalFeedback > 0 ? (accuratePredictions / totalFeedback) * 100 : 0;

    // Calculate problematic venues (accuracy < 80% with at least 10 feedback entries)
    const venueMetrics = new Map<number, { accurate: number; total: number; name: string }>();

    feedback?.forEach((f) => {
      if (!venueMetrics.has(f.VenueId)) {
        venueMetrics.set(f.VenueId, { accurate: 0, total: 0, name: 'Unknown' });
      }
      const metrics = venueMetrics.get(f.VenueId)!;
      metrics.total++;
      if (
        (f.WasSunny && f.PredictedState === 'Sunny') ||
        (!f.WasSunny && f.PredictedState !== 'Sunny')
      ) {
        metrics.accurate++;
      }
    });

    const problematicVenues = Array.from(venueMetrics.entries())
      .filter(
        ([_, metrics]) => metrics.total >= 10 && (metrics.accurate / metrics.total) * 100 < 80
      )
      .map(([venueId, metrics]) => ({
        venueId,
        accuracyRate: (metrics.accurate / metrics.total) * 100,
        feedbackCount: metrics.total,
      }));

    // Check alert threshold (accuracy < 80% for 3 consecutive days)
    // Simplified check - would need daily aggregation for full implementation
    const shouldAlert = accuracyRate < 80 && totalFeedback >= 30;

    const duration = Date.now() - startTime;

    console.log(
      `[Accuracy Metrics] Completed: ${accuracyRate.toFixed(1)}% accuracy, ${totalFeedback} total feedback, ${problematicVenues.length} problematic venues`
    );

    // TODO: Cache metrics (would need cache service)
    // TODO: Broadcast via alternative to SignalR (webhooks, polling, etc.)
    // TODO: Send alerts for problematic venues

    return NextResponse.json({
      success: true,
      duration: duration,
      metrics: {
        accuracyRate: Math.round(accuracyRate * 100) / 100,
        totalFeedback,
        accuratePredictions,
        problematicVenuesCount: problematicVenues.length,
        shouldAlert,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Accuracy Metrics] Error:', error);
    return internalServerError(`Accuracy metrics calculation failed after ${duration}ms: ${error}`);
  }
}
