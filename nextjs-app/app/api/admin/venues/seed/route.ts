import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import type { AuthUser } from '@/lib/middleware/auth';
import { supabaseAdmin } from '@/lib/supabase/server';


const SEED_VENUES = [
  {
    name: 'Café Magasinet',
    slug: 'cafe-magasinet',
    lat: 57.7065,
    lng: 11.9689,
    neighborhood: 'Centrum',
    type: 'cafe',
    address: 'Tredje Långgatan 9, 413 03 Göteborg',
    patios: [
      {
        name: 'Framsida',
        geometry: {
          type: 'Polygon' as const,
          coordinates: [
            [
              [11.9687, 57.7064],
              [11.9691, 57.7064],
              [11.9691, 57.7066],
              [11.9687, 57.7066],
              [11.9687, 57.7064],
            ],
          ],
        },
      },
    ],
  },
  {
    name: 'Hagabullen',
    slug: 'hagabullen',
    lat: 57.6985,
    lng: 11.9534,
    neighborhood: 'Haga',
    type: 'cafe',
    address: 'Haga Nygata 28, 413 01 Göteborg',
    patios: [
      {
        name: 'Uteservering',
        geometry: {
          type: 'Polygon' as const,
          coordinates: [
            [
              [11.9532, 57.6984],
              [11.9536, 57.6984],
              [11.9536, 57.6986],
              [11.9532, 57.6986],
              [11.9532, 57.6984],
            ],
          ],
        },
      },
    ],
  },
  {
    name: 'Linné Terrassen',
    slug: 'linne-terrassen',
    lat: 57.6945,
    lng: 11.9510,
    neighborhood: 'Linnéstaden',
    type: 'restaurant',
    address: 'Linnégatan 52, 413 08 Göteborg',
    patios: [
      {
        name: 'Terrassen',
        geometry: {
          type: 'Polygon' as const,
          coordinates: [
            [
              [11.9508, 57.6944],
              [11.9512, 57.6944],
              [11.9512, 57.6946],
              [11.9508, 57.6946],
              [11.9508, 57.6944],
            ],
          ],
        },
      },
      {
        name: 'Innergård',
        geometry: {
          type: 'Polygon' as const,
          coordinates: [
            [
              [11.9512, 57.6944],
              [11.9515, 57.6944],
              [11.9515, 57.6946],
              [11.9512, 57.6946],
              [11.9512, 57.6944],
            ],
          ],
        },
      },
    ],
  },
  {
    name: 'Sjöbaren',
    slug: 'sjobaren',
    lat: 57.6990,
    lng: 11.9530,
    neighborhood: 'Haga',
    type: 'restaurant',
    address: 'Haga Nygata 25, 413 01 Göteborg',
    patios: [
      {
        name: 'Uteservering',
        geometry: {
          type: 'Polygon' as const,
          coordinates: [
            [
              [11.9528, 57.6989],
              [11.9532, 57.6989],
              [11.9532, 57.6991],
              [11.9528, 57.6991],
              [11.9528, 57.6989],
            ],
          ],
        },
      },
    ],
  },
  {
    name: 'Kafé Kronhuset',
    slug: 'kafe-kronhuset',
    lat: 57.7080,
    lng: 11.9670,
    neighborhood: 'Centrum',
    type: 'cafe',
    address: 'Kronhusgatan 1D, 411 13 Göteborg',
    patios: [
      {
        name: 'Innergården',
        geometry: {
          type: 'Polygon' as const,
          coordinates: [
            [
              [11.9668, 57.7079],
              [11.9672, 57.7079],
              [11.9672, 57.7081],
              [11.9668, 57.7081],
              [11.9668, 57.7079],
            ],
          ],
        },
      },
    ],
  },
  {
    name: 'Bar Centro',
    slug: 'bar-centro',
    lat: 57.7025,
    lng: 11.9680,
    neighborhood: 'Vasastan',
    type: 'bar',
    address: 'Vasagatan 43, 411 37 Göteborg',
    patios: [
      {
        name: 'Gatusida',
        geometry: {
          type: 'Polygon' as const,
          coordinates: [
            [
              [11.9678, 57.7024],
              [11.9682, 57.7024],
              [11.9682, 57.7026],
              [11.9678, 57.7026],
              [11.9678, 57.7024],
            ],
          ],
        },
      },
    ],
  },
];

async function handlePost(_request: NextRequest, _user: AuthUser) {
  const results = { created: 0, skipped: 0, patiosCreated: 0, errors: [] as string[] };

  for (const venue of SEED_VENUES) {
    const { patios, ...venueData } = venue;

    // Upsert venue by slug
    const { data: upsertedVenue, error: venueError } = await supabaseAdmin
      .from('venues')
      .upsert(
        { ...venueData, latitude: venueData.lat, longitude: venueData.lng },
        { onConflict: 'slug' }
      )
      .select()
      .single();

    if (venueError) {
      results.errors.push(`Venue ${venueData.name}: ${venueError.message}`);
      results.skipped++;
      continue;
    }

    results.created++;

    // Insert patios for this venue
    for (const patio of patios) {
      const { error: patioError } = await supabaseAdmin
        .from('patios')
        .upsert(
          {
            venue_id: upsertedVenue.id,
            name: patio.name,
            geometry: patio.geometry,
          },
          { onConflict: 'venue_id,name', ignoreDuplicates: true }
        );

      if (patioError) {
        results.errors.push(`Patio ${patio.name}: ${patioError.message}`);
      } else {
        results.patiosCreated++;
      }
    }
  }

  return NextResponse.json({
    message: 'Seed complete',
    ...results,
  });
}

export const POST = withAdminAuth(handlePost);
