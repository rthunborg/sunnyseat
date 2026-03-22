'use client';

import type { SunExposureResult } from '@/lib/types/venue';
import type { SunStatus } from '@/lib/types/design-tokens';
import { VenuePhoto } from '@/components/ui/VenuePhoto';
import { selectVariant } from '@/lib/utils/selectVenueCardVariant';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MapPopupProps {
  venue: SunExposureResult;
  onMoreInfo: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_DOT: Record<SunStatus, string> = {
  sunny: 'bg-sun-sunny',
  partial: 'bg-sun-partial',
  shaded: 'bg-sun-shaded',
  upcoming: 'bg-sun-upcoming',
};

const STATUS_LABEL_KEY: Record<SunStatus, string> = {
  sunny: 'status.sunny',
  partial: 'status.partial',
  shaded: 'status.shaded',
  upcoming: 'status.upcoming',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * MapPopup — compact floating card rendered inside a MapLibre GL Popup
 * when a venue marker is clicked on desktop.
 *
 * This is a pure React component; the MapLibre Popup DOM container and
 * React portal are managed by MapContainer. This component just renders
 * the popup content.
 *
 * Shows: venue photo thumbnail, name, status badge, neighborhood,
 * and a "Mer info" link.
 */
export function MapPopup({ venue, onMoreInfo }: MapPopupProps) {
  const { t } = useLanguage();
  const v = venue.venue;
  const variant = selectVariant(venue);

  return (
    <div
      data-testid="map-popup"
      className="w-[260px] overflow-hidden rounded-xl bg-white shadow-elevated"
    >
      {/* Photo */}
      <VenuePhoto
        src={v.image_url}
        venueName={v.name}
        aspectRatio="16:9"
        sizes="260px"
        className="w-full"
      />

      {/* Info */}
      <div className="px-3 py-2.5 space-y-1.5">
        <div className="flex items-center gap-2">
          <span
            className={cn('h-2.5 w-2.5 shrink-0 rounded-full', STATUS_DOT[variant])}
            aria-hidden="true"
          />
          <h3
            className="truncate text-sm font-semibold text-text-primary"
            data-testid="popup-venue-name"
          >
            {v.name}
          </h3>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted truncate">
            {v.neighborhood && <span>{v.neighborhood}</span>}
            {v.neighborhood && ' · '}
            <span>{t(STATUS_LABEL_KEY[variant])}</span>
          </p>

          <button
            type="button"
            onClick={onMoreInfo}
            data-testid="popup-more-info"
            className="shrink-0 text-xs font-semibold text-brand-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-primary"
          >
            {t('selectedCard.moreInfo')}
          </button>
        </div>
      </div>
    </div>
  );
}
