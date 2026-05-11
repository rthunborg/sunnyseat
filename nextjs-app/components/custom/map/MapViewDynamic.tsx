'use client';

import dynamic from 'next/dynamic';
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
    loading: () => <MapLoadingFallback />,
  },
);

export function MapViewDynamic() {
  return <MapView />;
}
