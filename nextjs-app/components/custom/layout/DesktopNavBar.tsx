'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

/**
 * Desktop top navigation (viewport ≥ 1024 px). 84 px tall, holds the
 * SunnySeat wordmark and a visual placeholder for the search combobox.
 *
 * The search placeholder is a plain `<div>` — not `role="search"` and
 * not an `<input>`. A real search landmark without a focusable input
 * misleads assistive tech (VoiceOver rotor sends users here expecting
 * to type). Story 2.4 replaces this stub with a real cmdk combobox and
 * re-introduces the landmark then.
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

      <div
        data-testid="desktop-nav-search-placeholder"
        className="bg-surface-muted rounded-pill px-8 py-4 text-body-sm text-text-body w-[384px]"
      >
        <span>{t('nav.searchPlaceholder')}</span>
      </div>
    </header>
  );
}
