import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { internalServerError } from '@/lib/utils/api-errors';
import type { AuthUser } from '@/lib/middleware/auth';

interface DailyAccuracy {
  date: string;
  accuracy: number;
  feedbackCount: number;
}

interface ProblematicVenue {
  venueId: number;
  venueName: string;
  accuracy: number;
  feedbackCount: number;
}

interface AccuracyDashboardResponse {
  totalFeedback: number;
  accurateCount: number;
  inaccurateCount: number;
  accuracyPercentage: number;
  averageConfidence: number;
  dailyAccuracy: DailyAccuracy[];
  problematicVenues: ProblematicVenue[];
  alertActive: boolean;
  alertMessage: string | null;
}

function isAccurate(predictedState: string, wasSunny: boolean): boolean {
  return (
    (wasSunny && predictedState === 'Sunny') ||
    (!wasSunny && predictedState !== 'Sunny')
  );
}

async function handleGet(
  _request: NextRequest,
  _user: AuthUser
): Promise<NextResponse> {
  try {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const { data: feedbackData, error: feedbackError } = await supabaseAdmin
      .from('feedback')
      .select('*')
      .gte('BinnedTimestamp', fourteenDaysAgo.toISOString())
      .lte('BinnedTimestamp', now.toISOString());

    if (feedbackError) {
      console.error('Accuracy metrics query error:', feedbackError);
      return internalServerError('Failed to fetch accuracy metrics');
    }

    const feedback = feedbackData || [];

    // Overall metrics
    const totalFeedback = feedback.length;
    const accurateCount = feedback.filter((f) =>
      isAccurate(f.PredictedState, f.WasSunny)
    ).length;
    const inaccurateCount = totalFeedback - accurateCount;
    const accuracyPercentage =
      totalFeedback > 0
        ? Math.round((accurateCount / totalFeedback) * 10000) / 100
        : 0;
    const averageConfidence =
      totalFeedback > 0
        ? Math.round(
            (feedback.reduce((s, f) => s + (f.ConfidenceAtPrediction || 0), 0) /
              totalFeedback) *
              100
          ) / 100
        : 0;

    // Daily accuracy
    const dailyMap = new Map<string, { accurate: number; total: number }>();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now.getTime() - (13 - i) * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, { accurate: 0, total: 0 });
    }
    for (const f of feedback) {
      const key = new Date(f.BinnedTimestamp).toISOString().slice(0, 10);
      const entry = dailyMap.get(key);
      if (entry) {
        entry.total++;
        if (isAccurate(f.PredictedState, f.WasSunny)) {
          entry.accurate++;
        }
      }
    }
    const dailyAccuracy: DailyAccuracy[] = Array.from(dailyMap.entries()).map(
      ([date, { accurate, total }]) => ({
        date,
        accuracy: total > 0 ? Math.round((accurate / total) * 10000) / 100 : 0,
        feedbackCount: total,
      })
    );

    // Alert: 3+ consecutive days below 80%
    let consecutiveBelow = 0;
    let alertActive = false;
    for (const day of dailyAccuracy) {
      if (day.feedbackCount > 0 && day.accuracy < 80) {
        consecutiveBelow++;
        if (consecutiveBelow >= 3) {
          alertActive = true;
          break;
        }
      } else {
        consecutiveBelow = 0;
      }
    }

    // Problematic venues (accuracy < 80%)
    const venueMap = new Map<
      number,
      { accurate: number; total: number }
    >();
    for (const f of feedback) {
      const vid = f.VenueId;
      if (!venueMap.has(vid)) {
        venueMap.set(vid, { accurate: 0, total: 0 });
      }
      const entry = venueMap.get(vid)!;
      entry.total++;
      if (isAccurate(f.PredictedState, f.WasSunny)) {
        entry.accurate++;
      }
    }

    // Fetch venue names for problematic venues
    const problematicIds: number[] = [];
    for (const [vid, { accurate, total }] of venueMap) {
      if (total >= 2 && (accurate / total) * 100 < 80) {
        problematicIds.push(vid);
      }
    }

    let venueNames: Record<number, string> = {};
    if (problematicIds.length > 0) {
      const { data: venues } = await supabaseAdmin
        .from('venues')
        .select('Id, Name')
        .in('Id', problematicIds);
      if (venues) {
        venueNames = Object.fromEntries(
          venues.map((v) => [v.Id, v.Name])
        );
      }
    }

    const problematicVenues: ProblematicVenue[] = problematicIds.map((vid) => {
      const stats = venueMap.get(vid)!;
      return {
        venueId: vid,
        venueName: venueNames[vid] || `Venue #${vid}`,
        accuracy:
          Math.round((stats.accurate / stats.total) * 10000) / 100,
        feedbackCount: stats.total,
      };
    });
    problematicVenues.sort((a, b) => a.accuracy - b.accuracy);

    const response: AccuracyDashboardResponse = {
      totalFeedback,
      accurateCount,
      inaccurateCount,
      accuracyPercentage,
      averageConfidence,
      dailyAccuracy,
      problematicVenues,
      alertActive,
      alertMessage: alertActive
        ? 'Precision under 80% i 3+ dagar i rad — undersök problematiska restauranger'
        : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Accuracy dashboard error:', error);
    return internalServerError('Failed to load accuracy dashboard');
  }
}

export const GET = withAdminAuth(handleGet);
