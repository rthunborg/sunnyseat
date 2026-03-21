import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, internalServerError } from '@/lib/utils/api-errors';
import {
  createPaymentRequest,
  getSwishRedirectUrl,
  getSwishQrCode,
} from '@/lib/services/swish';
import type { CreatePaymentResponse } from '@/lib/types/payment';

const PREMIUM_PRICE = 39.0;

/**
 * POST /api/payments/create
 * Create a Swish payment request for SunnySeat Premium
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId: string | undefined = body.sessionId;

    if (!sessionId) {
      return badRequest('sessionId is required');
    }

    // Check if already premium
    const { data: existing } = await supabaseAdmin
      .from('user_premium_status')
      .select('is_premium, expires_at')
      .eq('session_id', sessionId)
      .single();

    if (existing?.is_premium) {
      const expiresAt = existing.expires_at ? new Date(existing.expires_at) : null;
      if (!expiresAt || expiresAt > new Date()) {
        return NextResponse.json({ alreadyPremium: true }, { status: 200 });
      }
    }

    // Insert purchase record
    const { data: purchase, error: insertError } = await supabaseAdmin
      .from('purchases')
      .insert({
        session_id: sessionId,
        amount: PREMIUM_PRICE,
        currency: 'SEK',
        status: 'pending',
      })
      .select()
      .single();

    if (insertError || !purchase) {
      console.error('Purchase insert error:', insertError);
      return internalServerError('Failed to create purchase record');
    }

    // Build callback URL
    const origin = request.headers.get('origin') || request.nextUrl.origin;
    const callbackUrl = `${origin}/api/payments/callback`;

    // Create Swish payment request
    const { paymentId, paymentRequestToken } = await createPaymentRequest(
      PREMIUM_PRICE,
      callbackUrl,
      purchase.id
    );

    // Update purchase with Swish payment ID
    await supabaseAdmin
      .from('purchases')
      .update({ swish_payment_id: paymentId })
      .eq('id', purchase.id);

    const response: CreatePaymentResponse = {
      paymentId,
      swishUrl: getSwishRedirectUrl(paymentRequestToken),
      qrCode: getSwishQrCode(paymentRequestToken),
      purchaseId: purchase.id,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Create payment error:', error);
    return internalServerError('Failed to create payment');
  }
}
