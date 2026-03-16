'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import type { SunWindow } from '@/lib/types/venue';
import type { SkyCondition, SunStatus } from '@/lib/types/design-tokens';
import { MiniTimeline } from '@/components/custom/MiniTimeline';
import { SunWindowsTable } from '@/components/custom/SunWindowsTable';
import { SkyConditionBadge } from '@/components/composed/SkyConditionBadge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { PartnerActions } from '@/components/composed/PartnerActions';

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
}

export default function VenueDetailPage({ venue }: VenueDetailProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [shareMessage, setShareMessage] = useState<string | null>(null);

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

  return (
    <main
      id="main-content"
      className="min-h-screen bg-surface-primary pb-[var(--spacing-touch-comfortable)]"
    >
      {/* Back navigation */}
      <nav className="px-4 pt-4 pb-2">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-secondary min-h-[var(--spacing-touch-min)] px-2 -ml-2 rounded-button hover:bg-surface-secondary transition-colors"
          aria-label={t('common.back')}
        >
          <span aria-hidden="true">←</span> {t('common.back')}
        </button>
      </nav>

      {/* Header */}
      <header className="px-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[length:var(--font-size-title)] leading-[var(--line-height-title)] font-bold text-text-primary">
              {venue.name}
            </h1>
            <p className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-secondary mt-1">
              {venue.neighborhood}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {venue.is_partner && (
              <span className="inline-flex items-center rounded-full border border-[var(--color-partner-gold)] bg-[var(--color-partner-gold-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--color-partner-gold-dark)]">
                {t('partner.badge')}
              </span>
            )}
            <SkyConditionBadge condition={venue.currentSkyCondition} size={24} />
          </div>
        </div>
      </header>

      {/* Timeline */}
      <section className="px-4 pb-6" aria-label={t('venueDetail.sunTimeline')}>
        <MiniTimeline
          sunWindows={venue.todayWindows}
          variant="detail"
          className="mt-2"
        />
      </section>

      {/* Sun windows table */}
      <section className="px-4 pb-6">
        <SunWindowsTable
          todayWindows={venue.todayWindows}
          tomorrowWindows={venue.tomorrowWindows}
        />
      </section>

      {/* Action buttons */}
      <section className="px-4 pb-6 flex gap-3">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('venue.directionsTo', { name: venue.name })}
          className="flex-1 inline-flex shrink-0 items-center justify-center rounded-button bg-primary text-primary-foreground h-[var(--spacing-touch-comfortable)] px-6 text-sm font-medium transition-all hover:bg-primary/80"
        >
          {t('venue.directions')}
        </a>
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          onClick={handleShare}
        >
          {t('venueDetail.share')}
        </Button>
      </section>

      {/* Partner actions */}
      {venue.is_partner && (venue.booking_url || venue.website_url) && (
        <section className="px-4 pb-6">
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
    </main>
  );
}
