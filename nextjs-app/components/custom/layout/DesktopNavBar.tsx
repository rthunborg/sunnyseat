'use client';

import { useDeferredValue, useEffect, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { LocateFixed, Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { VenueSearchShell } from '@/components/custom/search/VenueSearchShell';
import { LanguageSwitcher } from '@/components/custom/layout/LanguageSwitcher';
import { useVenueSearch } from '@/hooks/queries/useVenueSearch';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useSettings } from '@/lib/contexts/SettingsContext';
import { useTagFilter } from '@/lib/contexts/TagFilterContext';
import { useTimeContext } from '@/lib/contexts/TimeContext';
import { collectTags, localizeTag } from '@/lib/utils/venue-tags';
import { cn } from '@/lib/utils';

const SEARCH_RADIUS_KM = 1.5;

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
  const locale = useLocale();
  const geolocation = useGeolocation();
  const { openSettings } = useSettings();
  const { isActive, toggleTag, retainTags } = useTagFilter();
  const plannerTime = useTimeContext();

  // Story 9.7: source the chip row from the SAME venue query MapView issues, so
  // the chips are the real union of the loaded venues' tags (AC2) with ZERO new
  // network requests — TanStack de-dupes on the identical key (no `q`, same
  // coords/radius/planner). The nav only reads the cached data for `allTags`.
  //
  // The nav's key + gate MUST be byte-identical to MapView's for the de-dupe to
  // hold. MapView (MapView.tsx:194-201) feeds `useDeferredValue(plannerTime.
  // plannerQuery)` gated on `enabled: coordsSettled`; the nav mirrors BOTH so a
  // rapid time-slider drag never diverges the two keys (Story 9.4 fetch-hygiene:
  // the un-deferred planner would jump ahead of MapView's deferred key and fire
  // an extra ungated fetch) and neither fires before geolocation settles.
  const coordsSettled =
    geolocation.status === 'success' || geolocation.status === 'fallback';
  const deferredPlanner = useDeferredValue(plannerTime.plannerQuery);
  const venueQuery = useVenueSearch({
    lat: geolocation.coords.lat,
    lng: geolocation.coords.lng,
    radiusKm: SEARCH_RADIUS_KM,
    enabled: coordsSettled,
    ...deferredPlanner,
  });
  const allTags = useMemo(
    () => collectTags(venueQuery.data?.venues ?? []),
    [venueQuery.data?.venues],
  );

  // Story 9.7 orphaned-tag guard: when the venue set changes (new location/time)
  // an active tag can vanish from `allTags` while staying active in the shared
  // TagFilterContext — its chip stops rendering (the `allTags.length` gate) but it
  // keeps filtering the list + pins to empty with NO affordance to un-toggle it.
  // Prune `activeTags` to the intersection with the newly loaded union so a stale
  // filter can never strand the surfaces. Only runs once a venue set has actually
  // loaded (`venueQuery.data`) — never prunes during the pre-fetch empty window.
  useEffect(() => {
    if (!venueQuery.data) return;
    retainTags(allTags);
  }, [venueQuery.data, allTags, retainTags]);

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

      {/* Story 9.7: the chip row is now DATA-DRIVEN — the union of the loaded
          venues' real `tags` (first-seen order), enabled and toggleable via the
          shared TagFilterContext. Matching is on the canonical (Swedish) tag
          value; only the DISPLAY label is localized. Active chips render the
          reference "on" pill (dark #1b1b1e = text-primary bg + white label). The
          row renders nothing until at least one tag is loaded, so it never
          flashes a hardcoded placeholder set. Story 9.6 removed the two dead
          pager chevrons that used to flank this row — do NOT re-add them. */}
      {allTags.length > 0 && (
        <nav
          aria-label={t('nav.filter')}
          className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden"
        >
          {allTags.map((tag) => {
            const active = isActive(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={active}
                onClick={() => toggleTag(tag)}
                className={cn(
                  'flex h-9 shrink-0 items-center rounded-pill border px-4 text-label-lg shadow-subtle transition-colors duration-fast ease-default outline-none focus-visible:ring-2 focus-visible:ring-text-primary',
                  active
                    ? 'border-text-primary bg-text-primary text-white'
                    : 'border-divider bg-white text-text-body',
                )}
              >
                {localizeTag(tag, locale === 'en' ? 'en' : 'sv')}
              </button>
            );
          })}
        </nav>
      )}

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
