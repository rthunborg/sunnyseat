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
  const tVenue = useTranslations('venue');
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
        <div className="absolute right-5 top-16 z-floating-buttons flex gap-3">
          <StaticChromeButton label={tVenue('detail.favourite')}>
            <Heart aria-hidden="true" className="size-5" />
          </StaticChromeButton>
          <StaticChromeButton label={tVenue('detail.close')}>
            <X aria-hidden="true" className="size-5" />
          </StaticChromeButton>
        </div>
        <button
          type="button"
          data-testid="mobile-venue-detail-handle"
          aria-label={tVenue('detail.close')}
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
            labels={venueDetailLabels(tVenue)}
            onRoute={() => undefined}
            routeDisabled
            mode="mobile"
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
          <StaticChromeButton label={tVenue('detail.favourite')}>
            <Heart aria-hidden="true" className="size-4" />
          </StaticChromeButton>
          <StaticChromeButton label={tVenue('detail.share')}>
            <Share2 aria-hidden="true" className="size-4" />
          </StaticChromeButton>
          <StaticChromeButton label={tVenue('detail.close')}>
            <X aria-hidden="true" className="size-4" />
          </StaticChromeButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <VenueDetailContent
            fallbackVenue={forcedVenueDetail}
            detail={forcedVenueDetail}
            currentTime={currentTimeLabel()}
            labels={venueDetailLabels(tVenue)}
            onRoute={() => undefined}
            routeDisabled
            mode="desktop"
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

function venueDetailLabels(t: ReturnType<typeof useTranslations<'venue'>>) {
  return {
    close: t('detail.close'),
    favourite: t('detail.favourite'),
    share: t('detail.share'),
    sectionTitle: t('detail.sectionTitle'),
    peakTime: t('detail.peakTime', { time: '{time}' }),
    openMaps: t('detail.openMaps'),
    route: t('detail.route'),
    routeLoading: t('route.loading'),
    photoPlaceholder: t('detail.photoPlaceholder'),
    loading: t('detail.loading'),
    detailsUnavailable: t('detail.detailsUnavailable'),
    openingHours: t('detail.openingHours'),
    address: t('detail.address'),
    sunBadge: t('detail.sunBadge', { percent: '{percent}' }),
    confidence: t('detail.confidence'),
    confidenceApproximate: t('detail.confidenceApproximate'),
    confidenceUnavailable: t('detail.confidenceUnavailable'),
    city: t('detail.city'),
    openUntil: t('detail.openUntil', { time: '{time}' }),
    placeholderImageShort: t('detail.placeholderImageShort'),
    facts: {
      distance: t('detail.facts.distance'),
    },
    timeline: {
      ariaLabel: t('detail.timeline.ariaLabel'),
      currentTime: t('detail.timeline.currentTime', { time: '{time}' }),
      sunnyWindow: t('detail.timeline.sunnyWindow', { start: '{start}', end: '{end}' }),
      partialWindow: t('detail.timeline.partialWindow', { start: '{start}', end: '{end}' }),
      shadedWindow: t('detail.timeline.shadedWindow', { start: '{start}', end: '{end}' }),
    },
  };
}
