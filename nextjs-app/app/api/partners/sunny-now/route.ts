import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { calculateSunExposure } from '@/lib/solar/sun-exposure-service';
import { internalServerError } from '@/lib/utils/api-errors';

interface PartnerVenueRow {
  Id: number;
  Name: string;
  Slug: string;
  patios: { Id: number }[];
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
 * Cached for 5 minutes.
 */
export async function GET() {
  try {
    const { data: partners, error } = await supabaseAdmin
      .from('venues')
      .select('Id, Name, Slug, patios(Id)')
      .eq('is_partner', true)
      .eq('VerificationStatus', 1);

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
      if (!partner.patios || partner.patios.length === 0) continue;

      let bestExposure = 0;
      let bestStatus: 'Sunny' | 'Partial' | 'Shaded' = 'Shaded';

      for (const patio of partner.patios) {
        try {
          const exposure = await calculateSunExposure(patio.Id, now);
          if (exposure.sunExposurePercent > bestExposure) {
            bestExposure = exposure.sunExposurePercent;
            bestStatus = exposure.state === 'NoSun' ? 'Shaded' : exposure.state;
          }
        } catch {
          // Skip patio if calculation fails
        }
      }

      if (bestExposure >= SUNNY_THRESHOLD && (bestStatus === 'Sunny' || bestStatus === 'Partial')) {
        sunnyVenues.push({
          id: partner.Id,
          name: partner.Name,
          slug: partner.Slug,
          sunStatus: bestStatus,
          sunPercentage: Math.round(bestExposure),
        });
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
