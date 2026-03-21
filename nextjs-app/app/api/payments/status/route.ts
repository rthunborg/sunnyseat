import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, internalServerError } from '@/lib/utils/api-errors';
import type { PremiumStatus } from '@/lib/types/payment';

/**
 * GET /api/payments/status?sessionId=xxx
 * Check premium status for a session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return badRequest('sessionId query parameter is required');
    }

    const { data, error } = await supabaseAdmin
      .from('user_premium_status')
      .select('session_id, is_premium, purchase_id, activated_at, expires_at')
      .eq('session_id', sessionId)
      .single();

    if (error || !data) {
      // No record means not premium
      const response: PremiumStatus = {
        sessionId,
        isPremium: false,
      };
      return NextResponse.json(response);
    }

    // Check expiry
    const isExpired = data.expires_at ? new Date(data.expires_at) < new Date() : false;

    const response: PremiumStatus = {
      sessionId: data.session_id,
      isPremium: data.is_premium && !isExpired,
      purchaseId: data.purchase_id,
      activatedAt: data.activated_at,
      expiresAt: data.expires_at,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Payment status error:', error);
    return internalServerError('Failed to check premium status');
  }
}
