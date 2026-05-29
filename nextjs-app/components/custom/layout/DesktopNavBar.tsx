'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, LocateFixed, Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { VenueSearchShell } from '@/components/custom/search/VenueSearchShell';

/**
 * Desktop top navigation (viewport >= 1024 px). 84 px tall, holds the
 * SunnySeat wordmark, the Story 2.4 venue search combobox, and inert
 * accessible chrome buttons that match the accepted desktop header.
 *
 * Visibility is controlled by `hidden lg:flex` so both navbars render
 * in SSR and CSS picks the correct one before any JS runs.
 */
export function DesktopNavBar() {
  const t = useTranslations('common');

  return (
    <header
      aria-label={t('nav.headerLabel')}
      data-testid="desktop-nav-bar"
      className="fixed top-0 inset-x-0 h-[var(--size-desktop-nav-h)] bg-surface-cream shadow-card z-40 hidden lg:flex items-center px-12 gap-12"
    >
      <Link
        href="/"
        aria-label={t('nav.logoAria')}
        className="flex shrink-0 items-center gap-3 text-display-lg text-text-logo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-primary focus-visible:rounded-sm"
      >
        <span className="size-8 rounded-pill gradient-wordmark-sun shadow-wordmark-sun" />
        <span>
          Sunny<span className="text-amber-dark">Seat</span>
        </span>
      </Link>

      <VenueSearchShell variant="desktop" />

      <nav
        aria-label={t('nav.filter')}
        className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden"
      >
        <HeaderChevron label={t('nav.previous')} direction="left" />
        {[
          t('nav.filterChips.courtyard'),
          t('nav.filterChips.dogs'),
          t('nav.filterChips.wifi'),
          t('nav.filterChips.pastries'),
          t('nav.filterChips.morningSun'),
          t('nav.filterChips.takeAway'),
          t('nav.filterChips.sourdough'),
          t('nav.filterChips.rooftop'),
        ].map((chip) => (
            <button
              key={chip}
              type="button"
              disabled
              className="flex h-9 shrink-0 cursor-not-allowed items-center rounded-pill border border-divider bg-white px-4 text-label-lg text-text-body shadow-subtle"
            >
              {chip}
            </button>
        ))}
        <HeaderChevron label={t('nav.next')} direction="right" />
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        <HeaderIconButton label={t('nav.myLocation')}>
          <LocateFixed aria-hidden="true" className="size-5" />
        </HeaderIconButton>
        <HeaderIconButton label={t('nav.settings')}>
          <Settings aria-hidden="true" className="size-5" />
        </HeaderIconButton>
      </div>
    </header>
  );
}

function HeaderChevron({
  label,
  direction,
}: {
  label: string;
  direction: 'left' | 'right';
}) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={label}
      disabled
      className="flex size-9 shrink-0 cursor-not-allowed items-center justify-center rounded-pill text-text-muted outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
    >
      <Icon aria-hidden="true" className="size-4" />
    </button>
  );
}

function HeaderIconButton({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled
      className="flex size-11 cursor-not-allowed items-center justify-center rounded-pill text-text-body opacity-60 outline-none transition-colors duration-fast ease-default focus-visible:ring-2 focus-visible:ring-text-primary"
    >
      {children}
    </button>
  );
}
