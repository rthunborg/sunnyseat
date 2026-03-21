'use client';

import { CalendarIcon, ExternalLinkIcon } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

interface PartnerActionsProps {
  isPartner?: boolean;
  bookingUrl?: string | null;
  websiteUrl?: string | null;
}

export function PartnerActions({ isPartner, bookingUrl, websiteUrl }: PartnerActionsProps) {
  const { t } = useLanguage();

  if (!isPartner) return null;
  if (!bookingUrl && !websiteUrl) return null;

  return (
    <div className="flex gap-3" data-testid="partner-actions">
      {bookingUrl && (
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-button border-2 border-[var(--color-partner-gold)] text-text-primary font-medium text-sm h-14 px-4 transition-colors hover:bg-[var(--color-partner-gold-bg)]"
          data-testid="partner-booking-link"
        >
          <CalendarIcon className="size-5 shrink-0" aria-hidden="true" />
          {t('partner.bookTable')}
        </a>
      )}
      {websiteUrl && (
        <a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-button border-2 border-[var(--color-partner-gold)] text-text-primary font-medium text-sm h-14 px-4 transition-colors hover:bg-[var(--color-partner-gold-bg)]"
          data-testid="partner-website-link"
        >
          <ExternalLinkIcon className="size-5 shrink-0" aria-hidden="true" />
          {t('partner.visitWebsite')}
        </a>
      )}
    </div>
  );
}
