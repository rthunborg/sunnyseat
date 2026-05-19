'use client';

import { useTranslations } from 'next-intl';
import { LocateFixed, Settings, SlidersHorizontal } from 'lucide-react';
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
        className="text-display-lg text-text-logo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-primary focus-visible:rounded-sm"
      >
        sunnyseat
      </Link>

      <VenueSearchShell variant="desktop" />

      <div className="ml-auto flex items-center gap-2">
        <HeaderIconButton label={t('nav.filter')}>
          <SlidersHorizontal aria-hidden="true" className="size-5" />
        </HeaderIconButton>
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
