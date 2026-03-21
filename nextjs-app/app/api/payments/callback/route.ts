import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { SwishCallbackPayload } from '@/lib/types/payment';

/**
 * POST /api/payments/callback
 * Swish webhook callback — called by Swish servers when payment status changes
 */
export async function POST(request: NextRequest) {
  try {
    const payload: SwishCallbackPayload = await request.json();

    if (!payload.id || !payload.status) {
      return NextResponse.json({ error: 'Invalid callback payload' }, { status: 400 });
    }

    // Find purchase by Swish payment ID
    const { data: purchase, error: findError } = await supabaseAdmin
      .from('purchases')
      .select('id, session_id, status')
      .eq('swish_payment_id', payload.id)
      .single();

    if (findError || !purchase) {
      console.error('Purchase not found for Swish payment:', payload.id);
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    // Don't re-process already completed purchases
    if (purchase.status === 'paid') {
      return NextResponse.json({ ok: true });
    }

    const now = new Date().toISOString();

    if (payload.status === 'PAID') {
      // Update purchase status
      await supabaseAdmin
        .from('purchases')
        .update({ status: 'paid', completed_at: now })
        .eq('id', purchase.id);

      // Calculate expiry: end of current season (October 31)
      const today = new Date();
      const seasonEnd = new Date(today.getFullYear(), 9, 31, 23, 59, 59); // Oct 31
      if (today > seasonEnd) {
        seasonEnd.setFullYear(seasonEnd.getFullYear() + 1);
      }

      // Activate premium status
      await supabaseAdmin.from('user_premium_status').upsert(
        {
          session_id: purchase.session_id,
          is_premium: true,
          purchase_id: purchase.id,
          activated_at: now,
          expires_at: seasonEnd.toISOString(),
        },
        { onConflict: 'session_id' }
      );
    } else if (payload.status === 'DECLINED' || payload.status === 'ERROR') {
      await supabaseAdmin
        .from('purchases')
        .update({ status: 'failed', completed_at: now })
        .eq('id', purchase.id);
    } else if (payload.status === 'CANCELLED') {
      await supabaseAdmin
        .from('purchases')
        .update({ status: 'cancelled', completed_at: now })
        .eq('id', purchase.id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
