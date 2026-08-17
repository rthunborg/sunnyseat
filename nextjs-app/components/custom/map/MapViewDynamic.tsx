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

const ForcedVenueDetailInitialFrame =
  process.env.NODE_ENV === 'production'
    ? null
    : dynamic(
        () => import('@/components/custom/venue/ForcedVenueDetailInitialFrame')
          .then((m) => m.ForcedVenueDetailInitialFrame),
        {
          ssr: false,
          loading: () => null,
        },
      );

const DevVenueEditor =
  process.env.NODE_ENV === 'production'
    ? null
    : dynamic(
        () => import('@/components/custom/dev/DevVenueEditor')
          .then((m) => m.DevVenueEditor),
        {
          ssr: false,
          loading: () => null,
        },
      );

type MapViewDynamicProps = {
  devVenueEditorEnabled?: boolean;
};

export function MapViewDynamic({ devVenueEditorEnabled = false }: MapViewDynamicProps) {
  const searchParams = useSearchParams();
  const showDevEditor =
    process.env.NODE_ENV !== 'production' &&
    devVenueEditorEnabled &&
    searchParams.get('_editor') === 'venues';
  return (
    <>
      <MapView />
      {showDevEditor && DevVenueEditor && (
        <DevVenueEditor adminEnabled={devVenueEditorEnabled} />
      )}
    </>
  );
}

function MapViewLoadingFallback() {
  const forcedState = useForcedState();
  if (
    process.env.NODE_ENV === 'production' ||
    (forcedState !== 'venue-detail' && forcedState !== 'feedback') ||
    !ForcedVenueDetailInitialFrame
  ) {
    return <MapLoadingFallback />;
  }

  return (
    <>
      <MapLoadingFallback />
      <ForcedVenueDetailInitialFrameLoader forcedState={forcedState} />
    </>
  );
}

function ForcedVenueDetailInitialFrameLoader({ forcedState }: { forcedState: string }) {
  const searchParams = useSearchParams();
  if (!ForcedVenueDetailInitialFrame) return null;
  return (
    <ForcedVenueDetailInitialFrame
      slug={searchParams.get('venue')}
      forcedState={forcedState}
    />
  );
}
