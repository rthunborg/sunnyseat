import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { calculateSunExposure } from '@/lib/solar/sun-exposure-service';
import { internalServerError } from '@/lib/utils/api-errors';

interface PartnerVenueRow {
  Id: number;
  Name: string;
  Slug: string;
}

interface SunnyNowVenue {
  id: number;
  name: string;
  slug: string;
  sunStatus: 'Sunny' | 'Partial';
  sunPercentage: number;
}

const SUNNY_THRESHOLD = 50;

/**
 * GET /api/partners/sunny-now
 * Returns partner venues currently receiving sunlight (>50% exposure).
 * Venues table was consolidated — partner venues are queried directly
 * (no separate patios table). Sun exposure is calculated per venue.
 * Cached for 5 minutes.
 */
export async function GET() {
  try {
    // Query partner venues directly (patios table was merged into venues)
    const { data: partners, error } = await supabaseAdmin
      .from('venues')
      .select('Id, Name, Slug')
      .eq('is_partner', true)
      .eq('IsActive', true);

    if (error) {
      console.error('Error fetching partner venues:', error);
      return internalServerError('Failed to fetch partner venues');
    }

    if (!partners || partners.length === 0) {
      return NextResponse.json(
        { venues: [], timestamp: new Date().toISOString() },
        { headers: { 'Cache-Control': 'public, s-maxage=300' } }
      );
    }

    const now = new Date();
    const sunnyVenues: SunnyNowVenue[] = [];

    for (const partner of partners as PartnerVenueRow[]) {
      try {
        const exposure = await calculateSunExposure(partner.Id, now);
        const sunStatus = exposure.state === 'NoSun' ? 'Shaded' : exposure.state;

        if (
          exposure.sunExposurePercent >= SUNNY_THRESHOLD &&
          (sunStatus === 'Sunny' || sunStatus === 'Partial')
        ) {
          sunnyVenues.push({
            id: partner.Id,
            name: partner.Name,
            slug: partner.Slug,
            sunStatus,
            sunPercentage: Math.round(exposure.sunExposurePercent),
          });
        }
      } catch {
        // Skip venue if sun calculation fails
      }
    }

    return NextResponse.json(
      { venues: sunnyVenues, timestamp: now.toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=300' } }
    );
  } catch (error) {
    console.error('Error in sunny-now endpoint:', error);
    return internalServerError('An error occurred checking sunny status');
  }
}
