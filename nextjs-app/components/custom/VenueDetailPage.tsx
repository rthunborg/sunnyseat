'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import type { SunWindow } from '@/lib/types/venue';
import type { SkyCondition, SunStatus } from '@/lib/types/design-tokens';
import { MiniTimeline } from '@/components/custom/MiniTimeline';
import { SunWindowsTable } from '@/components/custom/SunWindowsTable';
import { SkyConditionBadge } from '@/components/composed/SkyConditionBadge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { PartnerActions } from '@/components/composed/PartnerActions';
import { getAmbientToneClass } from '@/lib/hooks/useAmbientTone';

interface VenueDetailProps {
  venue: {
    id: string;
    name: string;
    slug: string;
    neighborhood: string;
    lat: number;
    lng: number;
    todayWindows: SunWindow[];
    tomorrowWindows: SunWindow[];
    currentSkyCondition: SkyCondition;
    currentSunStatus: SunStatus;
    is_partner?: boolean;
    booking_url?: string | null;
    website_url?: string | null;
  };
  isModal?: boolean;
  onClose?: () => void;
}

export default function VenueDetailPage({ venue, isModal = false, onClose }: VenueDetailProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const ambientClass = getAmbientToneClass(venue.currentSunStatus);

  const handleBack = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  }, [onClose, router]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const title = `${venue.name} — SunnySeat`;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(url);
      setShareMessage(t('venueDetail.linkCopied'));
      setTimeout(() => setShareMessage(null), 2000);
    }
  }, [venue.name, t]);

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`;

  // Handle Escape key for closing modal
  useEffect(() => {
    if (!isModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModal, onClose]);

  const Container = isModal ? 'div' : 'main';

  return (
    <Container
      {...(!isModal ? { id: 'main-content' } : {})}
      className={`${isModal ? 'bg-transparent' : 'min-h-screen bg-surface-primary'} pb-[var(--spacing-touch-comfortable)] ${ambientClass}`}
    >
      {/* Back navigation */}
      <nav className="px-4 md:px-6 pt-4 pb-2">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1 text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-secondary min-h-[var(--spacing-touch-min)] px-2 -ml-2 rounded-button hover:bg-surface-secondary transition-colors"
          aria-label={t('common.back')}
          data-testid="back-button"
        >
          <span aria-hidden="true">←</span> {t('common.back')}
        </button>
      </nav>

      {/* Header */}
      <header className="px-4 md:px-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[length:var(--font-size-title)] leading-[var(--line-height-title)] font-bold text-text-primary">
              {venue.name}
            </h1>
            <p
              className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-secondary mt-1"
              data-testid="venue-neighborhood"
            >
              {venue.neighborhood}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {venue.is_partner && (
              <span
                className="inline-flex items-center rounded-full border border-[var(--color-partner-gold)] bg-[var(--color-partner-gold-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--color-partner-gold-dark)]"
                data-testid="partner-badge"
              >
                {t('partner.badge')}
              </span>
            )}
            <SkyConditionBadge condition={venue.currentSkyCondition} size={24} />
          </div>
        </div>
      </header>

      {/* Timeline */}
      <section className="px-4 md:px-6 pb-6" aria-label={t('venueDetail.sunTimeline')}>
        <MiniTimeline
          sunWindows={venue.todayWindows}
          variant="detail"
          className="mt-2"
        />
      </section>

      {/* Sun windows table */}
      <section className="px-4 md:px-6 pb-6">
        <SunWindowsTable
          todayWindows={venue.todayWindows}
          tomorrowWindows={venue.tomorrowWindows}
        />
      </section>

      {/* Primary CTA: Directions */}
      <section className="px-4 md:px-6 pb-4">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('venue.directionsTo', { name: venue.name })}
          className="w-full inline-flex items-center justify-center rounded-button bg-black/90 text-white h-[var(--spacing-touch-comfortable)] px-6 text-base font-semibold transition-all hover:bg-black active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 shadow-sm"
          data-testid="directions-link"
        >
          {t('venue.directions')}
        </a>
      </section>

      {/* Secondary action: Share */}
      <section className="px-4 md:px-6 pb-6">
        <Button
          variant="outline"
          size="lg"
          className="w-full min-h-[var(--spacing-touch-min)]"
          onClick={handleShare}
          aria-label={t('venueDetail.share')}
          data-testid="share-button"
        >
          {t('venueDetail.share')}
        </Button>
      </section>

      {/* Partner actions */}
      {venue.is_partner && (venue.booking_url || venue.website_url) && (
        <section className="px-4 md:px-6 pb-6" data-testid="partner-actions-section">
          <PartnerActions
            isPartner={venue.is_partner}
            bookingUrl={venue.booking_url}
            websiteUrl={venue.website_url}
          />
        </section>
      )}

      {/* Share confirmation toast */}
      {shareMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-text-primary text-surface-primary px-4 py-2 rounded-button text-[length:var(--font-size-body)] leading-[var(--line-height-body)] shadow-card z-50"
        >
          {shareMessage}
        </div>
      )}
    </Container>
  );
}
