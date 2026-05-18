'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Heart, Share2, X } from 'lucide-react';
import { VenueDetailContent } from '@/components/composed/venue/VenueDetailContent';
import {
  currentTimeLabel,
  resolveForcedVisualVenueDetail,
} from '@/components/custom/venue/forced-venue-detail';
import { VenueList } from '@/components/custom/venue/VenueList';
import { MapLoadingFallback } from '@/components/custom/map/MapLoadingFallback';

type ForcedVenueDetailInitialFrameProps = {
  slug: string | null;
  forcedState: string | null;
  dismissOnHydration?: boolean;
};

export function ForcedVenueDetailInitialFrame({
  slug,
  forcedState,
  dismissOnHydration = false,
}: ForcedVenueDetailInitialFrameProps) {
  const tVenueDetail = useTranslations('venue.detail');
  const tVenueList = useTranslations('venue.list');
  const [visible, setVisible] = useState(true);
  const forcedVenueDetail = resolveForcedVisualVenueDetail(slug, forcedState);

  useEffect(() => {
    if (dismissOnHydration) setVisible(false);
  }, [dismissOnHydration]);

  if (!forcedVenueDetail || !visible) return null;

  return (
    <div
      data-testid="forced-venue-detail-initial-frame"
      className="fixed inset-0 z-bottom-sheet-full bg-surface-sand lg:top-[var(--size-desktop-nav-h)]"
    >
      <MapLoadingFallback />
      <aside
        data-testid="desktop-venue-list-panel"
        className="absolute bottom-0 left-0 top-0 z-bottom-sheet-peek hidden w-venue-list-desktop flex-col border-r border-divider bg-surface-cream shadow-card lg:flex"
      >
        <div className="border-b border-divider px-3 py-4">
          <h2 className="text-heading-sm uppercase tracking-section-label text-text-body">
            {tVenueList('headerDesktop')}
          </h2>
          <p className="mt-2 text-label-lg text-text-primary">
            {tVenueList('subtitle', { count: 1 })}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <VenueList
            venues={[forcedVenueDetail]}
            mode="desktop"
            isLoading={false}
            onSelectVenue={() => undefined}
          />
        </div>
      </aside>
      <aside
        role="dialog"
        aria-modal="false"
        aria-label={forcedVenueDetail.venueName}
        data-testid="mobile-venue-detail-sheet"
        className="absolute inset-x-0 bottom-0 top-12 z-bottom-sheet-full flex flex-col overflow-hidden rounded-t-sheet-full bg-surface-cream text-text-primary shadow-sheet-full-up lg:hidden"
      >
        <button
          type="button"
          aria-label={tVenueDetail('close')}
          className="flex min-h-11 shrink-0 items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
        >
          <span
            aria-hidden="true"
            className="h-[var(--size-drag-pill-h)] w-[var(--size-drag-pill-w-lg)] rounded-pill bg-drag-handle"
          />
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <VenueDetailContent
            fallbackVenue={forcedVenueDetail}
            detail={forcedVenueDetail}
            currentTime={currentTimeLabel()}
            labels={venueDetailLabels(tVenueDetail)}
            onRoute={() => undefined}
            routeDisabled
          />
        </div>
      </aside>
      <aside
        role="dialog"
        aria-modal="false"
        aria-label={forcedVenueDetail.venueName}
        data-testid="desktop-venue-detail-panel"
        className="absolute bottom-0 right-0 top-0 z-bottom-sheet-full hidden w-venue-detail-panel flex-col overflow-hidden bg-surface-cream text-text-primary shadow-card lg:flex"
      >
        <div className="absolute right-4 top-4 z-floating-buttons flex gap-2">
          <StaticChromeButton label={tVenueDetail('favourite')} disabled>
            <Heart aria-hidden="true" className="size-4" />
          </StaticChromeButton>
          <StaticChromeButton label={tVenueDetail('share')} disabled>
            <Share2 aria-hidden="true" className="size-4" />
          </StaticChromeButton>
          <StaticChromeButton label={tVenueDetail('close')}>
            <X aria-hidden="true" className="size-4" />
          </StaticChromeButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <VenueDetailContent
            fallbackVenue={forcedVenueDetail}
            detail={forcedVenueDetail}
            currentTime={currentTimeLabel()}
            labels={venueDetailLabels(tVenueDetail)}
            onRoute={() => undefined}
            routeDisabled
          />
        </div>
      </aside>
    </div>
  );
}

function StaticChromeButton({
  label,
  children,
  disabled = false,
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className="flex size-11 items-center justify-center rounded-pill bg-glass-standard text-text-primary shadow-button-sm backdrop-blur-standard outline-none focus-visible:ring-2 focus-visible:ring-text-primary disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function venueDetailLabels(t: ReturnType<typeof useTranslations<'venue.detail'>>) {
  return {
    close: t('close'),
    favourite: t('favourite'),
    share: t('share'),
    sectionTitle: t('sectionTitle'),
    peakTime: t('peakTime', { time: '{time}' }),
    openMaps: t('openMaps'),
    route: t('route'),
    photoPlaceholder: t('photoPlaceholder'),
    loading: t('loading'),
    detailsUnavailable: t('detailsUnavailable'),
    openingHours: t('openingHours'),
    address: t('address'),
    shadowWarning: t('shadowWarning', { minutes: '{minutes}' }),
    sunBadge: t('sunBadge', { percent: '{percent}' }),
    timeline: {
      ariaLabel: t('timeline.ariaLabel'),
      currentTime: t('timeline.currentTime', { time: '{time}' }),
      sunnyWindow: t('timeline.sunnyWindow', { start: '{start}', end: '{end}' }),
      partialWindow: t('timeline.partialWindow', { start: '{start}', end: '{end}' }),
      shadedWindow: t('timeline.shadedWindow', { start: '{start}', end: '{end}' }),
    },
  };
}
