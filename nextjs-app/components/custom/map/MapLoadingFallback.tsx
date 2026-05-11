'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Story 1.4 — placeholder rendered while the dynamically-imported
 * MapLibre chunk is loading. Fills the parent (which provides position
 * and height) with the sand-coloured map fallback so the user sees a
 * recognisable surface, not a blank screen.
 */
export function MapLoadingFallback() {
  return (
    <div
      data-testid="map-loading-fallback"
      className="absolute inset-0 bg-surface-sand flex items-center justify-center"
    >
      <Skeleton className="w-12 h-12 rounded-pill bg-amber-pin/20" />
    </div>
  );
}
