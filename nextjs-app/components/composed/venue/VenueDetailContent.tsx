'use client';

import { Clock, ExternalLink, MapPin, Navigation, Sun } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SunTimeline, type SunTimelineLabels } from '@/components/composed/venue/SunTimeline';
import type { VenueDataDto, VenueDetailDto } from '@/lib/types/api';
import { cn } from '@/lib/utils';

export type VenueDetailContentLabels = {
  sectionTitle: string;
  peakTime: string;
  openMaps: string;
  route: string;
  photoPlaceholder: string;
  loading: string;
  detailsUnavailable: string;
  openingHours: string;
  address: string;
  shadowWarning: string;
  sunBadge: string;
  timeline: SunTimelineLabels;
};

export type VenueDetailContentProps = {
  fallbackVenue: VenueDataDto;
  detail?: VenueDetailDto;
  currentTime: string;
  labels: VenueDetailContentLabels;
  isLoading?: boolean;
  className?: string;
  onRoute: () => void;
  routeDisabled?: boolean;
};

export function VenueDetailContent({
  fallbackVenue,
  detail,
  currentTime,
  labels,
  isLoading = false,
  className,
  onRoute,
  routeDisabled = false,
}: VenueDetailContentProps) {
  const venue = detail ?? fallbackVenue;
  const loading = isLoading && !detail;
  const timeline = detail?.timeline ?? timelineFromListVenue(fallbackVenue);

  return (
    <article
      aria-busy={loading}
      aria-label={venue.venueName}
      className={cn('bg-surface-cream text-text-primary', className)}
    >
      <HeroImage venue={venue} labels={labels} isLoading={loading} />
      <div className="space-y-6 px-6 pb-10 pt-6">
        <header className="space-y-3">
          <h1 className="text-display-xl text-text-primary">{venue.venueName}</h1>
          {loading ? (
            <LoadingBlock label={labels.loading} />
          ) : (
            <p className="text-body-lg text-text-body">
              {detail?.description ?? labels.detailsUnavailable}
            </p>
          )}
        </header>

        <section className="rounded-card bg-surface-muted p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-heading-sm text-text-body">{labels.sectionTitle}</h2>
            {timeline.peakTime && (
              <p className="text-label-md normal-case tracking-normal text-amber-dark">
                {formatLabel(labels.peakTime, { time: timeline.peakTime })}
              </p>
            )}
          </div>
          {loading ? (
            <Skeleton
              data-testid="venue-detail-skeleton"
              className="h-timeline-h w-full rounded-pill bg-surface-icon-bg"
            />
          ) : (
            <SunTimeline
              timeline={timeline}
              currentTime={currentTime}
              labels={labels.timeline}
            />
          )}
        </section>

        <div className="space-y-5">
          <DetailRow
            icon={<Clock aria-hidden="true" className="size-5" />}
            title={labels.openingHours}
          >
            {loading ? (
              <Skeleton
                data-testid="venue-detail-skeleton"
                className="h-5 w-44 bg-surface-muted"
              />
            ) : (
              <>
                <p>{detail?.openingHours.display ?? labels.detailsUnavailable}</p>
                {detail?.shadowWarningMinutes != null && (
                  <p className="mt-1 text-error">
                    {formatLabel(labels.shadowWarning, {
                      minutes: String(detail.shadowWarningMinutes),
                    })}
                  </p>
                )}
              </>
            )}
          </DetailRow>

          <DetailRow
            icon={<MapPin aria-hidden="true" className="size-5" />}
            title={labels.address}
          >
            {loading ? (
              <Skeleton
                data-testid="venue-detail-skeleton"
                className="h-5 w-56 bg-surface-muted"
              />
            ) : (
              <>
                <p>{detail?.address ?? labels.detailsUnavailable}</p>
                <a
                  className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-pill text-label-md text-amber-dark outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
                  href={mapsUrl(detail ?? fallbackVenue)}
                  rel="noreferrer"
                  target="_blank"
                >
                  {labels.openMaps}
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              </>
            )}
          </DetailRow>
        </div>

        <button
          type="button"
          aria-disabled={routeDisabled}
          disabled={routeDisabled}
          onClick={routeDisabled ? undefined : onRoute}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-pill gradient-route-button px-5 text-label-lg text-text-primary shadow-route-button outline-none focus-visible:ring-2 focus-visible:ring-text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Navigation aria-hidden="true" className="size-5" />
          {labels.route}
        </button>
      </div>
    </article>
  );
}

function HeroImage({
  venue,
  labels,
  isLoading,
}: {
  venue: VenueDataDto;
  labels: VenueDetailContentLabels;
  isLoading: boolean;
}) {
  const thumbnail = venue.thumbnail;
  const alt = thumbnail?.alt?.trim() || labels.photoPlaceholder;
  return (
    <div className="relative h-55 overflow-hidden bg-surface-sand venue-detail-hero-gradient">
      {isLoading ? (
        <Skeleton
          data-testid="venue-detail-skeleton"
          className="size-full rounded-none bg-surface-muted"
        />
      ) : thumbnail?.url ? (
        <img
          alt={alt}
          className="size-full object-cover"
          decoding="async"
          loading="lazy"
          src={thumbnail.url}
        />
      ) : (
        <div
          aria-label={alt}
          className="flex size-full items-center justify-center"
          role="img"
        >
          <span className="rounded-venue-image border border-surface-cream/60 bg-surface-cream/80 px-4 py-3 text-display-sm text-amber-cta-text shadow-subtle">
            {normalizeInitials(thumbnail?.initials)}
          </span>
        </div>
      )}
      <div
        aria-label={formatLabel(labels.sunBadge, {
          percent: String(Math.round(venue.sunExposurePercent)),
        })}
        className="absolute right-4 top-4 flex size-badge-sm items-center justify-center gap-0.5 rounded-badge bg-amber-gold/90 text-label-xs text-amber-cta-text backdrop-blur-standard shadow-subtle"
      >
        <Sun aria-hidden="true" className="size-3" />
        {Math.round(venue.sunExposurePercent)}%
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex gap-3 text-body-sm text-text-body">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-badge bg-surface-icon-bg text-amber-dark">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="mb-1 text-heading-sm text-text-primary">{title}</h3>
        {children}
      </div>
    </section>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div aria-label={label} className="space-y-2" role="status">
      <Skeleton
        data-testid="venue-detail-skeleton"
        className="h-5 w-full bg-surface-muted"
      />
      <Skeleton
        data-testid="venue-detail-skeleton"
        className="h-5 w-4/5 bg-surface-muted"
      />
    </div>
  );
}

function timelineFromListVenue(venue: VenueDataDto): VenueDetailDto['timeline'] {
  return {
    timezone: 'Europe/Stockholm',
    range: { start: '06:00', end: '21:00' },
    windows: venue.sunWindow
      ? [{ ...venue.sunWindow, status: venue.currentSunStatus }]
      : [],
  };
}

function mapsUrl(venue: VenueDetailDto | VenueDataDto): string {
  const query = Number.isFinite(venue.location.lat) && Number.isFinite(venue.location.lng)
    ? `${venue.location.lat},${venue.location.lng}`
    : 'address' in venue && venue.address
      ? venue.address
      : venue.venueName;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function normalizeInitials(value: string | undefined): string {
  const trimmed = value?.trim() || 'SS';
  return Array.from(trimmed).slice(0, 3).join('').toUpperCase();
}

function formatLabel(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (label, [key, value]) => label.replaceAll(`{${key}}`, value),
    template,
  );
}
