'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useForcedState } from '@/lib/dev/use-forced-state';
import { MapLoadingFallback } from './MapLoadingFallback';

/**
 * Client-side dynamic loader for `MapView`. Lives in a `'use client'`
 * module because Next.js 16 only allows `dynamic({ ssr: false })` from
 * client components — the API page (`app/[locale]/page.tsx`) imports
 * this so it can stay declarative without itself becoming a client
 * component.
 *
 * The dynamic boundary keeps the ~200 KB `maplibre-gl` chunk out of
 * the main bundle (PRD NFR8).
 */
const MapView = dynamic(
  () => import('./MapView').then((m) => m.MapView),
  {
    ssr: false,
    loading: () => <MapViewLoadingFallback />,
  },
);

const ForcedVenueDetailInitialFrame = dynamic(
  () => import('@/components/custom/venue/ForcedVenueDetailInitialFrame')
    .then((m) => m.ForcedVenueDetailInitialFrame),
  {
    ssr: false,
    loading: () => null,
  },
);

export function MapViewDynamic() {
  return <MapView />;
}

function MapViewLoadingFallback() {
  const searchParams = useSearchParams();
  const forcedState = useForcedState();
  if (process.env.NODE_ENV === 'production' || forcedState !== 'venue-detail') {
    return <MapLoadingFallback />;
  }

  return (
    <>
      <MapLoadingFallback />
      <ForcedVenueDetailInitialFrame
        slug={searchParams.get('venue')}
        forcedState={forcedState}
      />
    </>
  );
}
