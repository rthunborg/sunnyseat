'use client';

import { useTranslations } from 'next-intl';
import { LocateFixed, Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { VenueSearchShell } from '@/components/custom/search/VenueSearchShell';
import { LanguageSwitcher } from '@/components/custom/layout/LanguageSwitcher';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useSettings } from '@/lib/contexts/SettingsContext';
import { cn } from '@/lib/utils';

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
  const geolocation = useGeolocation();
  const { openSettings } = useSettings();

  return (
    <header
      aria-label={t('nav.headerLabel')}
      data-testid="desktop-nav-bar"
      className="fixed top-0 inset-x-0 h-[var(--size-desktop-nav-h)] bg-surface-cream shadow-card z-40 hidden lg:flex items-center px-12 gap-12"
    >
      <Link
        href="/"
        aria-label={t('nav.logoAria')}
        className="flex shrink-0 items-center gap-3 text-display-lg text-text-logo focus:outline-none focus:ring-2 focus:ring-amber-primary focus:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-primary focus-visible:rounded-sm"
      >
        <span className="size-8 rounded-pill gradient-wordmark-sun shadow-wordmark-sun" />
        <span>
          Sunny<span className="text-amber-dark">Seat</span>
        </span>
      </Link>

      <VenueSearchShell variant="desktop" />

      {/* Story 9.6: the two dead pager chevrons that flanked this chip row were
          removed (inert `disabled` placeholders with no handler read as broken).
          The 8 filter chips remain the decorative tag placeholders that Story
          9.7 (Tag Filtering) will wire up. */}
      <nav
        aria-label={t('nav.filter')}
        className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden"
      >
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
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        <LanguageSwitcher />
        {/* About moved into the settings modal ("Om SunnySeat"); the standalone
            top-nav About link was removed to declutter the header. */}
        {/* Locate is the canonical desktop control (the map-stack duplicate is
            `lg:hidden`); it shares the geolocation context, so the fly-to wired
            in MapControls fires on success. Settings opens the settings modal. */}
        <HeaderIconButton
          label={t('nav.myLocation')}
          onClick={() => geolocation.requestLocation()}
          testId="desktop-nav-my-location"
        >
          <LocateFixed aria-hidden="true" className="size-5" />
        </HeaderIconButton>
        <HeaderIconButton
          label={t('nav.settings')}
          onClick={openSettings}
          testId="desktop-nav-settings"
        >
          <Settings aria-hidden="true" className="size-5" />
        </HeaderIconButton>
      </div>
    </header>
  );
}

function HeaderIconButton({
  label,
  children,
  onClick,
  disabled = onClick === undefined,
  testId,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={cn(
        'flex size-11 items-center justify-center rounded-pill text-text-body outline-none transition-colors duration-fast ease-default focus-visible:ring-2 focus-visible:ring-text-primary',
        disabled
          ? 'cursor-not-allowed opacity-60'
          : 'hover:bg-surface-cream/60 hover:text-amber-dark',
      )}
    >
      {children}
    </button>
  );
}
