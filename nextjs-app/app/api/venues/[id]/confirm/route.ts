import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, notFound, internalServerError } from '@/lib/utils/api-errors';
import crypto from 'crypto';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * POST /api/venues/[id]/confirm
 * Submit a crowdsource confirmation for a candidate venue.
 * Rate limited by IP hash (one confirmation per IP per venue).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: venueId } = await params;

    if (!venueId) {
      return badRequest('Venue ID is required');
    }

    // Verify venue exists and is a candidate (verification_status = 0)
    const { data: venue, error: venueError } = await supabaseAdmin
      .from('venues')
      .select('"Id", "VerificationStatus"')
      .eq('Id', venueId)
      .single();

    if (venueError || !venue) {
      return notFound('Venue');
    }

    const ipHash = hashIp(getClientIp(request));
    const userAgent = request.headers.get('user-agent') || null;

    // Insert confirmation (ON CONFLICT DO NOTHING for duplicate IP+venue)
    const { error: insertError } = await supabaseAdmin
      .from('venue_confirmations')
      .upsert(
        {
          VenueId: venueId,
          IpHash: ipHash,
          UserAgent: userAgent,
        },
        { onConflict: 'VenueId,IpHash', ignoreDuplicates: true }
      );

    if (insertError) {
      console.error('Confirmation insert error:', insertError);
      return internalServerError('Failed to submit confirmation');
    }

    // Count total confirmations for this venue
    const { count, error: countError } = await supabaseAdmin
      .from('venue_confirmations')
      .select('*', { count: 'exact', head: true })
      .eq('VenueId', venueId);

    if (countError) {
      console.error('Confirmation count error:', countError);
      return internalServerError('Failed to count confirmations');
    }

    const totalConfirmations = count ?? 0;
    let isVerified = venue.VerificationStatus === 1;

    // Auto-verify at 3+ confirmations
    if (totalConfirmations >= 3 && !isVerified) {
      const { error: updateError } = await supabaseAdmin
        .from('venues')
        .update({ VerificationStatus: 1 })
        .eq('Id', venueId);

      if (updateError) {
        console.error('Venue verification update error:', updateError);
      } else {
        isVerified = true;
      }
    }

    return NextResponse.json(
      {
        confirmed: true,
        totalConfirmations,
        isVerified,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Confirm venue error:', error);
    return internalServerError('An error occurred while confirming venue');
  }
}

/**
 * GET /api/venues/[id]/confirm
 * Get confirmation count for a venue.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: venueId } = await params;

    if (!venueId) {
      return badRequest('Venue ID is required');
    }

    const { count, error } = await supabaseAdmin
      .from('venue_confirmations')
      .select('*', { count: 'exact', head: true })
      .eq('VenueId', venueId);

    if (error) {
      console.error('Get confirmations error:', error);
      return internalServerError('Failed to get confirmations');
    }

    const totalConfirmations = count ?? 0;

    // Check current verification status
    const { data: venue } = await supabaseAdmin
      .from('venues')
      .select('"VerificationStatus"')
      .eq('Id', venueId)
      .single();

    return NextResponse.json({
      totalConfirmations,
      isVerified: venue?.VerificationStatus === 1,
    });
  } catch (error) {
    console.error('Get confirmations error:', error);
    return internalServerError('An error occurred while getting confirmations');
  }
}
