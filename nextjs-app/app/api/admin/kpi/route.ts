import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { internalServerError } from '@/lib/utils/api-errors';
import type { AuthUser } from '@/lib/middleware/auth';

interface WeeklyTrend {
  week: string;
  newVenues: number;
  newVerified: number;
  newPurchases: number;
}

interface KpiResponse {
  totalVenues: number;
  verifiedVenues: number;
  verificationRate: number;
  totalFeedback: number;
  accuracyRate: number;
  totalPartners: number;
  partnerClicks: number;
  totalPurchases: number;
  premiumUsers: number;
  conversionRate: number;
  weeklyTrend: WeeklyTrend[];
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

async function handleGet(
  _request: NextRequest,
  _user: AuthUser
): Promise<NextResponse> {
  try {
    // Fetch venues
    const { data: venues, error: venuesError } = await supabaseAdmin
      .from('venues')
      .select('"Id", "VerificationStatus", "IsActive", "CreatedAt", is_partner');

    if (venuesError) {
      console.error('KPI venues query error:', venuesError);
      return internalServerError('Failed to fetch KPI metrics');
    }

    const allVenues = venues || [];
    const totalVenues = allVenues.length;
    const verifiedVenues = allVenues.filter(
      (v) => v.VerificationStatus === 1
    ).length;
    const verificationRate =
      totalVenues > 0
        ? Math.round((verifiedVenues / totalVenues) * 10000) / 100
        : 0;
    const totalPartners = allVenues.filter((v) => v.is_partner).length;

    // Fetch feedback for accuracy
    const { data: feedbackData, error: feedbackError } = await supabaseAdmin
      .from('feedback')
      .select('"PredictedState", "WasSunny"');

    if (feedbackError) {
      console.error('KPI feedback query error:', feedbackError);
      return internalServerError('Failed to fetch KPI metrics');
    }

    const feedback = feedbackData || [];
    const totalFeedback = feedback.length;
    const accurateCount = feedback.filter(
      (f) =>
        (f.WasSunny && f.PredictedState === 'Sunny') ||
        (!f.WasSunny && f.PredictedState !== 'Sunny')
    ).length;
    const accuracyRate =
      totalFeedback > 0
        ? Math.round((accurateCount / totalFeedback) * 10000) / 100
        : 0;

    // Fetch purchases
    const { data: purchaseData, error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .select('id, status, created_at');

    const purchases = !purchaseError && purchaseData ? purchaseData : [];
    const completedPurchases = purchases.filter(
      (p) => p.status === 'completed'
    );
    const totalPurchases = completedPurchases.length;

    // Fetch premium users
    const { data: premiumData, error: premiumError } = await supabaseAdmin
      .from('user_premium_status')
      .select('session_id, is_premium');

    const premiumUsers =
      !premiumError && premiumData
        ? premiumData.filter((p) => p.is_premium).length
        : 0;

    // Partner clicks: no tracking table exists yet, return 0
    const partnerClicks = 0;

    // Conversion rate: premium users / total unique feedback sessions as proxy
    const conversionRate =
      totalPurchases > 0 && totalVenues > 0
        ? Math.round((premiumUsers / Math.max(totalPurchases, 1)) * 10000) / 100
        : 0;

    // Weekly trends (last 4 weeks)
    const now = new Date();
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const weeklyTrend: WeeklyTrend[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i * 7 + 6) * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekLabel = getWeekStart(weekStart);

      const newVenues = allVenues.filter((v) => {
        const created = new Date(v.CreatedAt);
        return created >= weekStart && created < weekEnd;
      }).length;

      const newVerified = allVenues.filter((v) => {
        const created = new Date(v.CreatedAt);
        return (
          created >= weekStart &&
          created < weekEnd &&
          v.VerificationStatus === 1
        );
      }).length;

      const newPurchases = completedPurchases.filter((p) => {
        const created = new Date(p.created_at);
        return created >= weekStart && created < weekEnd;
      }).length;

      weeklyTrend.push({
        week: weekLabel,
        newVenues,
        newVerified,
        newPurchases,
      });
    }

    const response: KpiResponse = {
      totalVenues,
      verifiedVenues,
      verificationRate,
      totalFeedback,
      accuracyRate,
      totalPartners,
      partnerClicks,
      totalPurchases,
      premiumUsers,
      conversionRate,
      weeklyTrend,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('KPI dashboard error:', error);
    return internalServerError('Failed to load KPI dashboard');
  }
}

export const GET = withAdminAuth(handleGet);
