'use client';

import { useRef, type MouseEvent } from 'react';
import { useTranslations } from 'next-intl';
import { LocateFixed, Settings } from 'lucide-react';
import * as m from 'motion/react-m';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { Link, useRouter } from '@/i18n/navigation';
import { DURATION_SLOW_S, EASE_DEFAULT } from '@/lib/constants/animation';

// In-app "back to the map" CTA — a locale-aware <Link> styled with the
// `gradient-route-button` recipe (AC1, mirrors the About page CTA). This is
// deliberately NOT the Story 3.1 routing `RouteButton`, which builds native-maps
// directions URLs; here we just navigate to `/`.
const CTA_CLASSNAME =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-pill gradient-route-button px-6 py-2 text-label-lg text-amber-cta-text shadow-route-button outline-none transition-opacity duration-default ease-default hover:opacity-90 focus-visible:ring-2 focus-visible:ring-text-primary motion-reduce:transition-none';

const FOCUS_LINK_CLASSNAME =
  'outline-none focus-visible:ring-2 focus-visible:ring-amber-primary focus-visible:rounded-sm';

/**
 * Story 7.2 — the global 404 / not-found screen.
 *
 * Rendered by `app/not-found.tsx` (the single 404 boundary for the whole app)
 * inside its own `NextIntlClientProvider`, so all copy comes from `next-intl`
 * `common.notFound.*` keys (AC6). Because that boundary lives OUTSIDE the
 * `[locale]` segment it does NOT get `ResponsiveLayout`'s navbars, so the
 * desktop chrome is supplied here explicitly (AC2). The chrome is a bespoke,
 * context-free header rather than the real `<DesktopNavBar />` because the live
 * navbar mounts a venue-search combobox that depends on the map/search/time
 * contexts (`AppContextProviders`), which are not — and should not be — present
 * on a static dead-end page.
 */
export function NotFoundPage() {
  const t = useTranslations('common');
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  // Guards the one-shot exit fade: a rapid double-click (or any re-entry while
  // the fade is already in flight) must navigate to the map exactly once, not
  // push `/` onto the history stack twice.
  const navigatingRef = useRef(false);
  // `?? true` keeps the first paint static (no float flash) until the
  // matchMedia query resolves; same convention as `VenuePin`.
  const reduceMotion = useReducedMotion() ?? true;

  // AC4 — fade the page out over ~300 ms, then navigate to the map. The CTA
  // stays a real <Link href="/"> so modified clicks (new tab) and the no-JS
  // path keep working; we only intercept the plain primary click. Under reduced
  // motion (AC5 / Task 4.3) we skip the fade and let the Link navigate.
  const handleCtaClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    if (reduceMotion) return;
    const node = rootRef.current;
    if (!node) return;
    event.preventDefault();
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    const goToMap = () => router.push('/');
    const exitAnimation = node.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      {
        duration: DURATION_SLOW_S * 1000,
        easing: 'ease-in',
        fill: 'forwards',
      },
    );
    void exitAnimation.finished.then(
      goToMap,
      goToMap,
    );
  };

  return (
    <div
      ref={rootRef}
      data-testid="not-found-page"
      className="relative flex min-h-dvh flex-col bg-surface-cream"
    >
      {/* Desktop chrome (>=1024px): bespoke header mirroring the DesktopNavBar
          shell — wordmark left, inert decorative icons right (AC2). */}
      <header
        aria-label={t('nav.headerLabel')}
        data-testid="not-found-desktop-nav"
        className="fixed inset-x-0 top-0 z-40 hidden h-[var(--size-desktop-nav-h)] items-center gap-12 bg-surface-cream px-12 shadow-card lg:flex"
      >
        <Link
          href="/"
          aria-label={t('nav.logoAria')}
          className={`flex shrink-0 items-center gap-3 text-display-lg text-text-logo ${FOCUS_LINK_CLASSNAME}`}
        >
          <span className="size-8 rounded-pill gradient-wordmark-sun shadow-wordmark-sun" />
          <span>
            Sunny<span className="text-amber-dark">Seat</span>
          </span>
        </Link>
        <div className="flex flex-1 items-center justify-end gap-2">
          <InertHeaderIcon label={t('nav.myLocation')}>
            <LocateFixed aria-hidden="true" className="size-5" />
          </InertHeaderIcon>
          <InertHeaderIcon label={t('nav.settings')}>
            <Settings aria-hidden="true" className="size-5" />
          </InertHeaderIcon>
        </div>
      </header>

      {/* Mobile chrome: wordmark top-left (AC1). On desktop the header above
          provides navigation, so this is hidden. */}
      <div className="absolute left-4 top-3 lg:hidden">
        <Link
          href="/"
          aria-label={t('nav.logoAria')}
          className={`inline-flex min-h-11 items-center text-display-sm text-text-logo ${FOCUS_LINK_CLASSNAME}`}
        >
          Sunny<span className="text-amber-dark">Seat</span>
        </Link>
      </div>

      {/* Centred dead-end content (AC1/AC2). `lg:pt-[nav-h]` reserves space for
          the fixed desktop header so the block stays optically centred. */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center lg:pt-[var(--size-desktop-nav-h)]">
        <div className="relative">
          {/* Soft sun-glow behind the pin (decorative). */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-10 gradient-sun-burst-warm"
          />
          {/* Amber-gold rounded-square pin tile with a "?" inside (AC1). The
              float (AC3) is gated by reduced motion (AC5). */}
          <m.div
            data-testid="not-found-pin"
            aria-hidden="true"
            animate={reduceMotion ? undefined : { y: [0, -4, 0, 4, 0] }}
            transition={
              reduceMotion ? undefined : { duration: 2, ease: EASE_DEFAULT, repeat: Infinity }
            }
            className="relative grid size-24 place-items-center rounded-card bg-amber-gold shadow-card"
          >
            <PinQuestionMark className="size-14 text-amber-cta-text" />
          </m.div>
        </div>

        <h1 className="mt-8 max-w-[15ch] text-display-xl text-text-primary">
          {t('notFound.heading')}
        </h1>

        <div className="mt-8 w-full max-w-sm lg:w-auto">
          <Link
            href="/"
            data-testid="not-found-cta"
            onClick={handleCtaClick}
            className={`${CTA_CLASSNAME} w-full lg:w-auto`}
          >
            {t('notFound.cta')}
          </Link>
        </div>
      </main>
    </div>
  );
}

/** Disabled, decorative header icon mirroring the DesktopNavBar right cluster. */
function InertHeaderIcon({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled
      className="flex size-11 cursor-not-allowed items-center justify-center rounded-pill text-text-body opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
    >
      {children}
    </button>
  );
}

/** Decorative map-pin outline with a "?" centred in the bulb (AC1). */
function PinQuestionMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 60" fill="none" aria-hidden="true" className={className}>
      <path
        d="M24 3C12.954 3 4 11.954 4 23c0 13.5 16.5 30.5 20 34 3.5-3.5 20-20.5 20-34C44 11.954 35.046 3 24 3Z"
        stroke="currentColor"
        strokeWidth={3.25}
        strokeLinejoin="round"
      />
      <text
        x="24"
        y="24"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="24"
        fontWeight="700"
        fill="currentColor"
      >
        ?
      </text>
    </svg>
  );
}
