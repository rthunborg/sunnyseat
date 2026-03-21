import { VenueDetailSheet } from '@/components/custom/VenueDetailSheet';
import type { SunWindow } from '@/lib/types/venue';
import type { SkyCondition, SunStatus } from '@/lib/types/design-tokens';

interface MockVenue {
  id: string;
  name: string;
  slug: string;
  neighborhood: string;
  lat: number;
  lng: number;
  todayWindows: SunWindow[];
  tomorrowWindows: SunWindow[];
  currentSkyCondition: SkyCondition;
  currentSunStatus: SunStatus;
}

// Mock venue lookup - replace with Supabase query later
async function getVenueBySlug(slug: string): Promise<MockVenue> {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  return {
    id: slug,
    name: slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    slug,
    neighborhood: 'Linné',
    lat: 57.6969,
    lng: 11.9573,
    todayWindows: [
      {
        start: `${todayStr}T08:00:00Z`,
        end: `${todayStr}T12:30:00Z`,
        sun_status: 'sunny',
        sky_condition: 'clear',
      },
      {
        start: `${todayStr}T13:00:00Z`,
        end: `${todayStr}T15:00:00Z`,
        sun_status: 'partial',
        sky_condition: 'partly-cloudy',
      },
    ],
    tomorrowWindows: [
      {
        start: `${tomorrowStr}T09:00:00Z`,
        end: `${tomorrowStr}T14:00:00Z`,
        sun_status: 'sunny',
        sky_condition: 'clear',
      },
    ],
    currentSkyCondition: 'clear',
    currentSunStatus: 'sunny',
  };
}

export default async function VenueModalRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);
  return <VenueDetailSheet venue={venue} />;
}
