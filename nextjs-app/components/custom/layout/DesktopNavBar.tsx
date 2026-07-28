'use client';

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, LocateFixed, Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { VenueSearchShell } from '@/components/custom/search/VenueSearchShell';
import { LanguageSwitcher } from '@/components/custom/layout/LanguageSwitcher';
import { useVenueSearch } from '@/hooks/queries/useVenueSearch';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useSettings } from '@/lib/contexts/SettingsContext';
import { useTagFilter } from '@/lib/contexts/TagFilterContext';
import { useTimeContext } from '@/lib/contexts/TimeContext';
import { collectTags, localizeTag } from '@/lib/utils/venue-tags';
import { venuePlannerQueryArgs } from '@/lib/utils/venue-query-planner';
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
  const pathname = usePathname();

  // Story 11.3 review (AC1 parity): the tag-chip strip scopes to the Närmast
  // list, so hide it in favourites mode — mirroring the mobile gate in MapView
  // (`listMode !== 'favourites'`) so both breakpoints treat the favourites
  // surface as intentionally unfiltered. On desktop `listMode === 'favourites'`
  // is equivalent to the favourites route (the nearest/favourites toggle pushes
  // `/favoriter` and MapView syncs `desktopListMode` to `isFavouritesRoute`), so
  // the pathname is the shared signal this sibling component can read.
  const isFavouritesRoute =
    pathname === '/favoriter' || pathname.startsWith('/favoriter/');

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
  // External-review fix (R-001): use the SHARED `venuePlannerQueryArgs` — the
  // IDENTICAL derivation MapView uses — so the nav's key stays byte-identical to
  // MapView's in BOTH the live and off-live cases. Previously this spread the raw
  // `plannerTime.plannerQuery` (undefined on live-today → the `list` key, diverging
  // from MapView's `planner` key) and flipped `list`→`planner` on the first scrub
  // away from live, firing a hidden second /api/venues request mid-scrub.
  const plannerArgs = useMemo(
    () =>
      venuePlannerQueryArgs({
        isLiveNow: plannerTime.isLiveNow,
        plannerQuery: plannerTime.plannerQuery,
        selectedDate: plannerTime.selectedDate,
        selectedTime: plannerTime.selectedTime,
      }),
    [
      plannerTime.isLiveNow,
      plannerTime.plannerQuery,
      plannerTime.selectedDate,
      plannerTime.selectedTime,
    ],
  );
  const deferredPlanner = useDeferredValue(plannerArgs);
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

      {/* Story 9.7: the chip row is DATA-DRIVEN — the union of the loaded venues'
          real `tags` (first-seen order), enabled and toggleable via the shared
          TagFilterContext. Matching is on the canonical (Swedish) tag value; only
          the DISPLAY label is localized. Active chips render the reference "on"
          pill (dark #1b1b1e = text-primary bg + white label). The row renders
          nothing until at least one tag is loaded, so it never flashes a
          hardcoded placeholder set.
          Story 11.3 (AC4): the strip is now horizontally SCROLLABLE with real
          left/right arrow buttons + edge-fade affordances (replacing the
          overflow-hidden mid-chip clip) so every tag is reachable at any viewport
          width. These are REAL wired scroll controls — NOT the Story-9.6-removed
          dead pager chevrons.
          Story 11.3 review: the strip is hidden in favourites mode so both
          breakpoints scope chips to the Närmast list identically (AC1 parity).
          The `retainTags` orphan-prune effect above still runs so a residual
          active tag can never strand the shared surfaces while favourites is
          open. */}
      {!isFavouritesRoute && allTags.length > 0 && (
        <TagChipStrip
          tags={allTags}
          isActive={isActive}
          onToggleTag={toggleTag}
          locale={locale === 'en' ? 'en' : 'sv'}
          label={t('nav.filter')}
          scrollLeftLabel={t('nav.scrollFiltersLeft')}
          scrollRightLabel={t('nav.scrollFiltersRight')}
        />
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

/**
 * Story 11.3 (AC4): the desktop tag-chip strip — horizontally scrollable with
 * real left/right arrow buttons + edge-fade affordances, keyboard-navigable, all
 * tags reachable at any viewport width.
 *
 * - The chips are a horizontal `overflow-x-auto` scroller; they keep their width
 *   (`shrink-0`) and overflow rather than squashing or clipping mid-chip.
 * - Left/right arrow BUTTONS scroll by a page (~the visible width) and DISABLE at
 *   the respective end (left disabled at scrollLeft 0; right disabled at max
 *   scroll). Scroll position is tracked via a scroll/resize listener.
 * - Edge-fade gradient masks (token-based) signal more content, shown only when
 *   scrollable in that direction.
 * - Chips stay focusable buttons; a focused off-screen chip scrolls into view
 *   (native focus + `scrollIntoView`). The arrows are additional Tab stops.
 */
function TagChipStrip({
  tags,
  isActive,
  onToggleTag,
  locale,
  label,
  scrollLeftLabel,
  scrollRightLabel,
}: {
  tags: string[];
  isActive: (tag: string) => boolean;
  onToggleTag: (tag: string) => void;
  locale: 'sv' | 'en';
  label: string;
  scrollLeftLabel: string;
  scrollRightLabel: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  // External-review fix: the arrow scroll + the scroller's CSS scroll-behavior
  // were unconditionally `smooth`, so prefers-reduced-motion users still got an
  // animated scroll. Gate both on reduced motion → `auto`/instant, matching the
  // app's motion policy. `?? false` keeps SSR/jsdom (no matchMedia) on the
  // animated default. `motion-reduce:scroll-auto` is the CSS backstop so a user
  // who toggles the OS setting after mount still gets an instant native scroll.
  const reducedMotion = useReducedMotion() ?? false;
  const scrollBehavior: ScrollBehavior = reducedMotion ? 'auto' : 'smooth';

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // 1px slack absorbs sub-pixel rounding so the right arrow disables cleanly
    // at the true max scroll instead of hovering one fractional pixel short.
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < maxScrollLeft - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    // Re-evaluate on viewport resize (a wider viewport can reveal all chips).
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollState) : null;
    observer?.observe(el);
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      observer?.disconnect();
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, tags.length]);

  const scrollByPage = useCallback((direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    // Scroll by ~the visible width (a "page"), less a small overlap for context.
    const page = Math.max(el.clientWidth - 48, 120);
    // Reduced-motion users get an instant (`auto`) jump instead of an animation.
    el.scrollBy({ left: direction * page, behavior: scrollBehavior });
  }, [scrollBehavior]);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <ChipScrollArrow
        label={scrollLeftLabel}
        disabled={!canScrollLeft}
        onClick={() => scrollByPage(-1)}
        icon={<ChevronLeft aria-hidden="true" className="size-5" />}
      />
      <div className="relative min-w-0 flex-1">
        <nav
          ref={scrollerRef}
          aria-label={label}
          data-testid="desktop-tag-chip-strip"
          data-tour-anchor="tag-chips"
          className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden motion-reduce:scroll-auto"
          style={{ scrollBehavior }}
        >
          {tags.map((tag) => {
            const active = isActive(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={active}
                onClick={() => onToggleTag(tag)}
                onFocus={(event) =>
                  event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' })
                }
                className={cn(
                  'flex h-9 shrink-0 scroll-mx-2 items-center rounded-pill border px-4 text-label-lg shadow-subtle transition-colors duration-fast ease-default outline-none focus-visible:ring-2 focus-visible:ring-text-primary',
                  active
                    ? 'border-text-primary bg-text-primary text-white'
                    : 'border-divider bg-white text-text-body',
                )}
              >
                {localizeTag(tag, locale)}
              </button>
            );
          })}
        </nav>
        {/* Edge-fade masks — token gradients, shown only when scrollable that way. */}
        {canScrollLeft && (
          <span
            aria-hidden="true"
            data-testid="chip-fade-left"
            className="pointer-events-none absolute inset-y-0 left-0 w-8 gradient-chip-fade-left"
          />
        )}
        {canScrollRight && (
          <span
            aria-hidden="true"
            data-testid="chip-fade-right"
            className="pointer-events-none absolute inset-y-0 right-0 w-8 gradient-chip-fade-right"
          />
        )}
      </div>
      <ChipScrollArrow
        label={scrollRightLabel}
        disabled={!canScrollRight}
        onClick={() => scrollByPage(1)}
        icon={<ChevronRight aria-hidden="true" className="size-5" />}
      />
    </div>
  );
}

function ChipScrollArrow({
  label,
  disabled,
  onClick,
  icon,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        // External-review fix: 44px min interactive target (size-11) — was size-9
        // (36px), below the repo's 44px minimum. Icon size is unchanged.
        'flex size-11 shrink-0 items-center justify-center rounded-pill text-text-body outline-none transition-colors duration-fast ease-default focus-visible:ring-2 focus-visible:ring-text-primary',
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-surface-cream/60 hover:text-amber-dark',
      )}
    >
      {icon}
    </button>
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
