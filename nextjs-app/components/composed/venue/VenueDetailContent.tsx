'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Clock,
  Cloud,
  ExternalLink,
  Footprints,
  ImageIcon,
  LoaderCircle,
  MapPin,
  Star,
  Sun,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { RouteButton } from '@/components/composed/routing/RouteButton';
import { buildGoogleMapsSearchUrl } from '@/lib/services/routing';
import type { VenueDataDto, VenueDetailDto } from '@/lib/types/api';
import {
  formatVenueDistance,
  getVenueVisualMetadata,
} from '@/lib/utils/venue-visual-metadata';
import {
  isObscuredSunStatus,
  skyConditionCopy,
} from '@/lib/utils/sun-status-presentation';
import { isVenuePubliclySunny } from '@/lib/utils/public-sun';
import { formatOpeningHoursAt, getVenueAvailabilityAt } from '@/lib/utils/opening-hours';
import { stockholmInstantFromDateTime } from '@/lib/utils/time-planner';
import { selectVenueHeroImageUrl } from '@/lib/utils/venue-media';
import { cn } from '@/lib/utils';

export type VenueDetailContentLabels = {
  openMaps: string;
  route: string;
  routeLoading: string;
  photoPlaceholder: string;
  loading: string;
  detailsUnavailable: string;
  openingHours: string;
  /** Story 11.9 (AC2): the derived "Öppet till {time}" line for the Öppettider
   * row, composed from the current weekday's close. `{time}` is substituted with
   * today's close (HH:MM). */
  openUntilLine: string;
  openAtSelectedUntilLine?: string;
  openAtSelected?: string;
  closedAtSelectedTime?: string;
  address: string;
  sunBadge: string;
  /** Story 12.10: percentage-free grey hero badge copy for all public non-sunny
   * states except CloudObscured, which keeps the explicit obscured treatment. */
  notSunnyVerdict?: string;
  /** Story 10.2 (AC1): the muted "Sol bakom moln" hero headline shown when
   * the venue is CloudObscured. */
  obscuredHeadline?: string;
  /** Story 10.2 (AC3): plain-language sky descriptors + a "Himmel nu" label.
   * When the sky is unavailable, no sky line renders. Story 10.4 (AC2): adds the
   * rain descriptor. */
  sky?: {
    label: string;
    clear: string;
    partlyCloudy: string;
    overcast: string;
    rain: string;
  };
  city: string;
  openUntil: string;
  placeholderImageShort: string;
  facts: {
    distance: string;
    /** Story 9.5 AC3: honest "≈ från centrum" qualifier shown on the Avstånd
     * card when the origin is the Gothenburg-centrum fallback (not a real
     * personal fix). Only the label is qualified; the value stays visible. */
    distanceApproximate?: string;
  };
};

export type VenueDetailContentProps = {
  fallbackVenue: VenueDataDto;
  detail?: VenueDetailDto;
  currentTime: string;
  selectedInstant?: Date;
  isLivePlannerTime?: boolean;
  labels: VenueDetailContentLabels;
  /** Story 9.5 AC3 (folded into 9.9): the distance is centrum-relative (the
   * Gothenburg-centrum geolocation fallback), not a real personal fix — annotate
   * the Avstånd card's distance honestly. Mirrors `VenueList.locationIsApproximate`. */
  distanceIsApproximate?: boolean;
  isLoading?: boolean;
  className?: string;
  onRoute: () => void;
  routeEstimateLabel?: string;
  isRouteLoading?: boolean;
  routeDisabled?: boolean;
  mode?: 'mobile' | 'desktop';
  locale?: string;
  feedbackSlot?: React.ReactNode;
  reviewSlot?: React.ReactNode;
};

export function VenueDetailContent({
  fallbackVenue,
  detail,
  currentTime,
  selectedInstant,
  isLivePlannerTime = true,
  labels,
  distanceIsApproximate = false,
  isLoading = false,
  className,
  onRoute,
  routeEstimateLabel,
  isRouteLoading = false,
  routeDisabled = false,
  mode = 'mobile',
  locale = 'sv',
  feedbackSlot,
  reviewSlot,
}: VenueDetailContentProps) {
  const venue = detail ?? fallbackVenue;
  const loading = isLoading && !detail;
  const metadata = getVenueVisualMetadata(venue, locale);
  // Story 10.2: the muted "Sol bakom moln" state + the plain-language sky line.
  const isObscured = isObscuredSunStatus(venue.currentSunStatus);
  const skyLine = labels.sky
    ? skyConditionCopy(venue.skyCondition, {
        clear: labels.sky.clear,
        partlyCloudy: labels.sky.partlyCloudy,
        overcast: labels.sky.overcast,
        rain: labels.sky.rain,
      })
    : null;
  // Story 12.14: opening copy is derived from the selected planner instant,
  // not from the wall clock. The fallback keeps older isolated tests stable
  // without reintroducing live time: production callers pass `selectedInstant`.
  const effectiveSelectedInstant =
    selectedInstant ?? stockholmInstantFromDateTime('2026-05-20', currentTime);
  const availability = detail && effectiveSelectedInstant
    ? getVenueAvailabilityAt(detail.openingHours, effectiveSelectedInstant)
    : { state: 'unknown' as const };
  const openLineTemplate = isLivePlannerTime
    ? labels.openUntilLine
    : (labels.openAtSelectedUntilLine ?? labels.openUntilLine);
  const openBadgeTemplate = isLivePlannerTime
    ? labels.openUntil
    : (labels.openAtSelected ?? labels.openUntil);
  const derivedHours = detail && effectiveSelectedInstant
    ? formatOpeningHoursAt(
        detail.openingHours,
        effectiveSelectedInstant,
        locale,
        openLineTemplate,
      )
    : {};
  const closesAt = derivedHours.closesAt;
  const closedAtSelectedTimeLabel =
    availability.state === 'closed' ? (labels.closedAtSelectedTime ?? labels.detailsUnavailable) : null;
  const isDesktop = mode === 'desktop';

  return (
    <article
      aria-busy={loading}
      aria-label={venue.venueName}
      className={cn('relative bg-surface-cream text-text-primary', className)}
    >
      <HeroImage
        venue={venue}
        labels={labels}
        isLoading={loading}
        isDesktop={isDesktop}
        isObscured={isObscured}
        skyLine={skyLine}
        locale={locale}
      />
      <div className={cn('px-6 pb-8', isDesktop ? 'space-y-5 pt-6' : 'space-y-4 pt-5')}>
        <header className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-display-xl text-text-primary">{venue.venueName}</h1>
            {loading ? (
              // Story 11.6 (AC1): the badge's box occupies the same footprint so
              // the fallback→detail swap causes no layout jump.
              <Skeleton
                data-testid="venue-detail-skeleton"
                className="mt-1 h-8 w-24 shrink-0 rounded-pill bg-surface-muted"
              />
            ) : closesAt ? (
              <span className="mt-1 flex h-8 shrink-0 items-center gap-1 rounded-pill bg-amber-primary px-3 text-label-md text-amber-badge-text">
                {isDesktop ? (
                  <Sun aria-hidden="true" className="size-3.5 fill-current" />
                ) : (
                  <span aria-hidden="true" className="size-2 rounded-pill bg-amber-badge-text" />
                )}
                {formatLabel(openBadgeTemplate, { time: closesAt })}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-body-sm-medium text-text-body">
            <span>{metadata.type}</span>
            <span className="text-text-faint">·</span>
            <span>{labels.city}</span>
            <span className="text-text-faint">·</span>
            <span className="flex items-center gap-1">
              <Star aria-hidden="true" className="size-4 fill-amber-gold text-amber-gold" />
              <span className="font-bold text-text-primary">{metadata.rating}</span>
              <span className="text-text-body">({metadata.reviewCount})</span>
            </span>
            <span className="hidden text-text-faint lg:inline">·</span>
            <span className="hidden lg:inline">{metadata.price}</span>
          </div>
          {loading ? (
            <LoadingBlock />
          ) : null}
        </header>

        {feedbackSlot}

        {isDesktop && !loading ? (
          <p className="text-body-lg text-text-body">
            {detail?.description ?? labels.detailsUnavailable}
          </p>
        ) : null}

        {!isDesktop && !loading && (
          <p className="text-body-lg text-text-body">
            {detail?.description ?? labels.detailsUnavailable}
          </p>
        )}

        <div
          className={
            isDesktop
              ? 'flex flex-wrap gap-2'
              : 'flex flex-nowrap gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]'
          }
        >
          {metadata.tags.map((tag) => (
            <span
              key={tag}
              className={
                isDesktop
                  ? 'rounded-pill border border-divider bg-surface-sand px-4 py-2 text-label-lg text-amber-dark'
                  : 'shrink-0 rounded-pill border border-divider bg-surface-sand px-2.5 py-1.5 text-label-xs text-amber-dark'
              }
            >
              {tag}
            </span>
          ))}
        </div>

        {!isDesktop && (
          <FactCard
            icon={<Footprints aria-hidden="true" className="size-5" />}
            label={labels.facts.distance}
            value={metadata.distance ?? formatVenueDistance(venue.distanceMeters)}
            approximateLabel={
              distanceIsApproximate &&
              labels.facts.distanceApproximate &&
              Number.isFinite(venue.distanceMeters)
                ? labels.facts.distanceApproximate
                : undefined
            }
          />
        )}

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
              // Story 11.9 (AC2): the "Öppet till HH:MM" line is DERIVED for the
              // current weekday; closed-today / no-hours → the honest
              // detailsUnavailable copy (never a fabricated close).
              <p>
                {derivedHours.display ?? closedAtSelectedTimeLabel ?? labels.detailsUnavailable}
              </p>
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
                  href={buildGoogleMapsSearchUrl(detail ?? fallbackVenue)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {labels.openMaps}
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              </>
            )}
          </DetailRow>
        </div>

        <RouteButton
          label={labels.route}
          loadingLabel={labels.routeLoading}
          estimateLabel={routeEstimateLabel}
          isLoading={isRouteLoading}
          disabled={routeDisabled}
          onClick={onRoute}
          className="w-full text-text-primary"
        />

        {reviewSlot}
      </div>
      {loading ? <LoadingScrim /> : null}
      {loading ? <LoadingStatus label={labels.loading} /> : null}
    </article>
  );
}

function HeroImage({
  venue,
  labels,
  isLoading,
  isDesktop,
  isObscured,
  skyLine,
  locale,
}: {
  venue: VenueDataDto;
  labels: VenueDetailContentLabels;
  isLoading: boolean;
  isDesktop: boolean;
  isObscured: boolean;
  skyLine: string | null;
  locale: string;
}) {
  const thumbnail = venue.thumbnail;
  const alt = thumbnail?.alt?.trim() || labels.photoPlaceholder;
  const imageUrl = selectVenueHeroImageUrl(thumbnail);
  const [imageFailed, setImageFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const shouldRenderImage = Boolean(imageUrl) && !imageFailed && !isLoading;
  const isPubliclySunny = isVenuePubliclySunny(venue);
  const percentText = String(Math.round(venue.sunExposurePercent));
  const sunnyBadgeLabel = formatLabel(labels.sunBadge, { percent: percentText });
  const sunnyBadgeVisibleText = `${percentText}%`;
  const notSunnyLabel = defaultNotSunnyVerdict(labels, locale);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image || !shouldRenderImage) return undefined;
    const handleError = () => setImageFailed(true);
    if (image.complete && image.naturalWidth === 0) {
      handleError();
      return undefined;
    }
    image.addEventListener('error', handleError);
    return () => image.removeEventListener('error', handleError);
  }, [imageUrl, shouldRenderImage]);

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-surface-sand venue-detail-hero-gradient',
        isDesktop ? 'h-venue-detail-hero-desktop' : 'h-venue-detail-hero-mobile',
      )}
    >
      {isLoading ? (
        <Skeleton
          data-testid="venue-detail-skeleton"
          className="size-full rounded-none bg-surface-muted"
        />
      ) : shouldRenderImage ? (
        <img
          data-testid="venue-detail-hero-photo"
          ref={imageRef}
          src={imageUrl}
          alt={alt}
          className="absolute inset-0 size-full object-cover"
          loading={isDesktop ? 'eager' : 'lazy'}
          decoding="async"
        />
      ) : (
        <div
          data-testid="venue-detail-hero-fallback"
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
      {/* Story 10.2 (AC1): the always-amber hero sun badge is muted to slate
          while obscured — white text/cloud icon on `bg-pin-obscured` (5.50:1
          AA), labelled "% solläge" (position, AC2) so no amber sun badge shows
          under the gate. The geometric % value is unchanged. */}
      <div
        aria-label={
          isObscured
            ? (labels.obscuredHeadline ?? 'Sol bakom moln')
            : isPubliclySunny
              ? sunnyBadgeLabel
              : notSunnyLabel
        }
        className={cn(
          'absolute left-4 top-4 flex h-10 items-center justify-center gap-2 rounded-pill px-4 text-heading-lg backdrop-blur-standard shadow-subtle',
          isObscured
            ? 'bg-pin-obscured text-white'
            : isPubliclySunny
              ? 'bg-amber-gold/90 text-amber-cta-text'
              : 'bg-pin-shaded text-text-body',
        )}
        role="img"
      >
        {isObscured || !isPubliclySunny ? (
          <Cloud aria-hidden="true" className="size-5" />
        ) : (
          <Sun aria-hidden="true" className="size-5 fill-current" />
        )}
        {isPubliclySunny && !isObscured ? sunnyBadgeVisibleText : null}
      </div>
      {/* AC1/AC3: the muted "Sol bakom moln" headline + the plain-language sky
          line, only for the obscured state. `skyLine` is null when the DTO sky
          is unavailable → no sky descriptor (never fabricate). */}
      {isObscured && (
        <div
          data-testid="venue-detail-obscured"
          className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-card bg-surface-cream/85 px-3 py-2 text-label-md text-obscured-text backdrop-blur-standard shadow-subtle"
        >
          <Cloud aria-hidden="true" className="size-4 shrink-0" />
          <span className="font-bold">{labels.obscuredHeadline ?? 'Sol bakom moln'}</span>
          {skyLine && labels.sky && (
            <>
              <span aria-hidden="true" className="text-obscured-text/50">·</span>
              <span>
                <span className="sr-only">{labels.sky.label}: </span>
                {skyLine}
              </span>
            </>
          )}
        </div>
      )}
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
  approximateLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  approximateLabel?: string;
}) {
  return (
    <section className="rounded-card border border-divider bg-white p-3">
      <div className="mb-2 flex items-center gap-2 text-label-sm text-text-muted">
        <span className="text-amber-dark">{icon}</span>
        <span>{label}</span>
      </div>
      <p className="flex flex-wrap items-baseline gap-x-2 text-heading-xl text-text-primary">
        <span>{value}</span>
        {/* text-body, not text-muted: muted (60% alpha) fails the axe AA
            contrast gate on the white card at label-xs size. */}
        {approximateLabel && (
          <span className="text-label-xs font-normal text-text-body">{approximateLabel}</span>
        )}
      </p>
    </section>
  );
}

function LoadingBlock() {
  return (
    <div aria-hidden="true" className="space-y-2">
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

function LoadingScrim() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-bottom-sheet-peek flex items-center justify-center bg-text-primary/20 backdrop-blur-subtle"
      data-testid="venue-detail-loading-scrim"
    >
      <LoaderCircle
        aria-hidden="true"
        className="size-8 text-text-primary motion-safe:animate-spin"
        data-testid="venue-detail-loading-spinner"
      />
    </div>
  );
}

function LoadingStatus({ label }: { label: string }) {
  return (
    <div
      aria-label={label}
      aria-live="polite"
      className="sr-only"
      data-testid="venue-detail-loading-status"
      role="status"
    >
      {label}
    </div>
  );
}

function defaultNotSunnyVerdict(labels: VenueDetailContentLabels, locale: string): string {
  if (labels.notSunnyVerdict) return labels.notSunnyVerdict;
  return locale.startsWith('en') ? 'Not sunny at the selected time' : 'Inte soligt vid vald tid';
}

function formatLabel(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (label, [key, value]) => label.replaceAll(`{${key}}`, value),
    template,
  );
}
