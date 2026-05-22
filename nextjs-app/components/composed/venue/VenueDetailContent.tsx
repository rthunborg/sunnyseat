'use client';

import {
  Armchair,
  Clock,
  Compass,
  ExternalLink,
  Footprints,
  ImageIcon,
  MapPin,
  Navigation,
  Star,
  Sun,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SunTimeline, type SunTimelineLabels } from '@/components/composed/venue/SunTimeline';
import type { SunFreshnessMeta, VenueDataDto, VenueDetailDto } from '@/lib/types/api';
import {
  formatPeakHour,
  formatVenueDistance,
  formatVenueSunPercent,
  getVenueVisualMetadata,
} from '@/lib/utils/venue-visual-metadata';
import {
  getConfidenceDisplayState,
  type ConfidenceDisplayLabels,
} from '@/lib/utils/confidence-display';
import { cn } from '@/lib/utils';

export type VenueDetailContentLabels = {
  sectionTitle: string;
  peakTime: string;
  bestWindow?: string;
  openMaps: string;
  route: string;
  photoPlaceholder: string;
  loading: string;
  detailsUnavailable: string;
  openingHours: string;
  address: string;
  shadowWarning: string;
  sunBadge: string;
  confidence: string;
  confidenceApproximate: string;
  confidenceUnavailable: string;
  city: string;
  openUntil: string;
  placeholderImageShort: string;
  facts: {
    distance: string;
    exposure: string;
    bestAt: string;
    outdoorSeats: string;
  };
  timeline: SunTimelineLabels;
};

export type VenueDetailContentProps = {
  fallbackVenue: VenueDataDto;
  detail?: VenueDetailDto;
  confidenceMeta?: SunFreshnessMeta;
  currentTime: string;
  labels: VenueDetailContentLabels;
  isLoading?: boolean;
  className?: string;
  onRoute: () => void;
  routeDisabled?: boolean;
  mode?: 'mobile' | 'desktop';
};

export function VenueDetailContent({
  fallbackVenue,
  detail,
  confidenceMeta,
  currentTime,
  labels,
  isLoading = false,
  className,
  onRoute,
  routeDisabled = false,
  mode = 'mobile',
}: VenueDetailContentProps) {
  const venue = detail ?? fallbackVenue;
  const loading = isLoading && !detail;
  const timeline = detail?.timeline ?? timelineFromListVenue(fallbackVenue);
  const metadata = getVenueVisualMetadata(venue);
  const peakHour = formatPeakHour(venue);
  const bestAt = metadata.bestAt ?? peakHour;
  const openUntil = detail?.openingHours.closesAt ?? '22:00';
  const isDesktop = mode === 'desktop';
  const confidenceDisplay = getConfidenceDisplayState({
    confidence: venue.confidence,
    meta: confidenceMeta,
    labels: confidenceDisplayLabels(labels),
  });

  return (
    <article
      aria-busy={loading}
      aria-label={venue.venueName}
      className={cn('bg-surface-cream text-text-primary', className)}
    >
      <HeroImage venue={venue} labels={labels} isLoading={loading} isDesktop={isDesktop} />
      <div className="space-y-5 px-6 pb-8 pt-5">
        <header className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-display-xl text-text-primary">{venue.venueName}</h1>
            <span className="mt-1 flex h-8 shrink-0 items-center gap-1 rounded-pill bg-amber-primary px-3 text-label-md text-amber-badge-text">
              {isDesktop ? (
                <Sun aria-hidden="true" className="size-3.5 fill-current" />
              ) : (
                <span aria-hidden="true" className="size-2 rounded-pill bg-amber-badge-text" />
              )}
              {isDesktop ? 'SOL NU' : formatLabel(labels.openUntil, { time: openUntil })}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-body-sm-medium text-text-body">
            <span>{metadata.type}</span>
            <span className="text-text-faint">·</span>
            <span>{labels.city}</span>
            <span className="text-text-faint">·</span>
            <span className="flex items-center gap-1">
              <Star aria-hidden="true" className="size-4 fill-amber-gold text-amber-gold" />
              <span className="font-bold text-text-primary">{metadata.rating}</span>
              <span className="text-text-muted">({metadata.reviewCount})</span>
            </span>
            <span className="hidden text-text-faint lg:inline">·</span>
            <span className="hidden lg:inline">{metadata.price}</span>
            {confidenceDisplay.visibleText ? (
              <>
                <span className="text-text-faint">·</span>
                <span className="font-bold text-amber-dark">
                  {labels.confidence}: {confidenceDisplay.visibleText}
                  <span className="sr-only"> {confidenceDisplay.accessibleText}</span>
                </span>
              </>
            ) : (
              <span className="sr-only">{confidenceDisplay.accessibleText}</span>
            )}
          </div>
          {loading ? (
            <LoadingBlock label={labels.loading} />
          ) : null}
        </header>

        <section className="rounded-card border border-divider bg-white p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className={isDesktop ? 'text-heading-sm text-text-body' : 'text-heading-lg text-text-primary'}>
                {isDesktop ? labels.timeline.ariaLabel.toUpperCase() : labels.sectionTitle}
              </h2>
              <p className="text-body-sm-medium text-text-body">
                {isDesktop
                  ? formatLabel(labels.peakTime, { time: peakHour })
                  : labels.bestWindow ?? formatLabel(labels.peakTime, { time: peakHour })}
              </p>
            </div>
            <Sun aria-hidden="true" className="size-7 fill-amber-gold text-amber-gold" />
          </div>
          {loading ? (
            <Skeleton
              data-testid="venue-detail-skeleton"
              className="h-24 w-full rounded-card bg-surface-icon-bg"
            />
          ) : (
            isDesktop ? (
              <SunTimeline
                timeline={timeline}
                currentTime={currentTime}
                labels={labels.timeline}
              />
            ) : (
              <SunForecastBars
                currentTime={currentTime}
                timeline={timeline}
                peakTime={bestAt}
              />
            )
          )}
        </section>

        {!loading && (
          <p className="text-body-lg text-text-body">
            {detail?.description ?? labels.detailsUnavailable}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {metadata.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-pill border border-divider bg-surface-sand px-4 py-2 text-label-lg text-amber-dark"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FactCard
            icon={<Footprints aria-hidden="true" className="size-5" />}
            label={labels.facts.distance}
            value={metadata.distance ?? formatVenueDistance(venue.distanceMeters)}
          />
          <FactCard
            icon={<Compass aria-hidden="true" className="size-5" />}
            label={labels.facts.exposure}
            value={metadata.exposure}
          />
          <FactCard
            icon={<Clock aria-hidden="true" className="size-5" />}
            label={labels.facts.bestAt}
            value={bestAt}
          />
          <FactCard
            icon={<Armchair aria-hidden="true" className="size-5" />}
            label={labels.facts.outdoorSeats}
            value={metadata.seats}
          />
        </div>

        <div className="space-y-5 border-t border-divider pt-5">
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
  isDesktop,
}: {
  venue: VenueDataDto;
  labels: VenueDetailContentLabels;
  isLoading: boolean;
  isDesktop: boolean;
}) {
  const thumbnail = venue.thumbnail;
  const alt = thumbnail?.alt?.trim() || labels.photoPlaceholder;
  return (
    <div className={cn('relative overflow-hidden bg-surface-sand venue-detail-hero-gradient', isDesktop ? 'h-48' : 'h-[220px]')}>
      {isLoading ? (
        <Skeleton
          data-testid="venue-detail-skeleton"
          className="size-full rounded-none bg-surface-muted"
        />
      ) : (
        <div
          aria-label={alt}
          className="flex size-full flex-col items-center justify-center gap-3"
          role="img"
        >
          <span className="flex size-16 items-center justify-center rounded-venue-image border border-dashed border-amber-dark/35 bg-surface-cream/70 text-text-muted shadow-subtle">
            <ImageIcon aria-hidden="true" className="size-8" />
          </span>
          <span className="text-label-sm text-text-muted">
            {labels.placeholderImageShort}
          </span>
          <span className="text-heading-sm normal-case tracking-normal text-amber-dark">
            {venue.venueName}
          </span>
        </div>
      )}
      <div
        aria-label={formatLabel(labels.sunBadge, {
          percent: String(Math.round(venue.sunExposurePercent)),
        })}
        className="absolute left-4 top-4 flex h-10 items-center justify-center gap-2 rounded-pill bg-amber-gold/90 px-4 text-heading-lg text-amber-cta-text backdrop-blur-standard shadow-subtle"
      >
        <Sun aria-hidden="true" className="size-5 fill-current" />
        {formatVenueSunPercent(venue.sunExposurePercent)}
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

function FactCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <section className="rounded-card border border-divider bg-white p-3">
      <div className="mb-2 flex items-center gap-2 text-label-sm text-text-muted">
        <span className="text-amber-dark">{icon}</span>
        <span>{label}</span>
      </div>
      <p className="text-heading-xl text-text-primary">{value}</p>
    </section>
  );
}

function SunForecastBars({
  currentTime,
  timeline,
  peakTime,
}: {
  currentTime: string;
  timeline: VenueDetailDto['timeline'];
  peakTime: string;
}) {
  const currentHour = parseHour(currentTime);
  const peak = parseHour(peakTime || timeline.peakTime || '13:00');
  const bars = Array.from({ length: 13 }, (_, index) => {
    const hour = index + 8;
    const distanceFromPeak = Math.abs(hour - peak);
    const value = Math.max(0.22, 1 - distanceFromPeak * 0.11);
    return { hour, value };
  });

  return (
    <div>
      <div className="flex h-20 items-end gap-2">
        {bars.map(({ hour, value }) => {
          const isCurrent = Math.abs(hour - currentHour) < 0.75;
          return (
            <span
              key={hour}
              aria-hidden="true"
              className={cn(
                'flex-1 rounded-t-md bg-amber-primary/70',
                isCurrent && 'bg-text-primary',
              )}
              style={{ height: `${Math.max(18, value * 72)}px` }}
            />
          );
        })}
      </div>
      <div className="mt-3 flex justify-between text-label-lg text-text-muted">
        {[8, 10, 12, 14, 16, 18, 20].map((hour) => (
          <span key={hour}>{hour}</span>
        ))}
      </div>
    </div>
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

function parseHour(time: string): number {
  const [hour, minute = '0'] = time.split(':');
  const parsedHour = Number(hour);
  const parsedMinute = Number(minute);
  if (!Number.isFinite(parsedHour)) return 13;
  return parsedHour + (Number.isFinite(parsedMinute) ? parsedMinute / 60 : 0);
}

function formatLabel(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (label, [key, value]) => label.replaceAll(`{${key}}`, value),
    template,
  );
}

function confidenceDisplayLabels(
  labels: VenueDetailContentLabels,
): ConfidenceDisplayLabels {
  return {
    confidence: labels.confidence,
    approximate: labels.confidenceApproximate,
    unavailable: labels.confidenceUnavailable,
  };
}
