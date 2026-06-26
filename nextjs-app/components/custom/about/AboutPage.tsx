'use client';

import { Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  ABOUT_ACCURACY_PLACEHOLDER,
  ABOUT_HERO_SRC_DESKTOP,
  ABOUT_HERO_SRC_MOBILE,
} from '@/lib/constants/about';
import { AccuracyCountUp } from './AccuracyCountUp';
import { DataSourceList } from './DataSourceList';

// Primary in-app "back to map" CTA — a locale-aware <Link> styled with the
// `gradient-route-button` recipe (Story 7.1 Task 6.1). NOT the routing
// RouteButton (that builds native-maps directions URLs).
const CTA_LINK_CLASSNAME =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-pill gradient-route-button px-6 py-2 text-label-lg text-amber-cta-text shadow-route-button outline-none transition-opacity duration-default ease-default hover:opacity-90 focus-visible:ring-2 focus-visible:ring-text-primary motion-reduce:transition-none';

const FOCUS_LINK_CLASSNAME =
  'outline-none focus-visible:ring-2 focus-visible:ring-amber-primary focus-visible:rounded-sm';

// Uppercase amber section labels (DESIGN.md text-heading-sm = uppercase + tracking).
const SECTION_LABEL_CLASSNAME = 'text-heading-sm text-amber-dark';

export function AboutPage() {
  const t = useTranslations('about');
  const tCommon = useTranslations('common');

  return (
    <article
      data-testid="about-page"
      className="mx-auto w-full max-w-[720px] px-4 pb-28 pt-3 lg:px-6 lg:pb-16 lg:pt-10"
    >
      {/* Mobile top bar — wordmark + back link. On desktop the DesktopNavBar
          (from ResponsiveLayout) provides navigation, so this is hidden and
          there is no "← Tillbaka" link (AC2). */}
      <div className="mb-6 flex items-center justify-between lg:hidden">
        <Link
          href="/"
          aria-label={tCommon('nav.logoAria')}
          className={`flex min-h-11 items-center text-display-sm text-text-logo ${FOCUS_LINK_CLASSNAME}`}
        >
          Sunny<span className="text-amber-dark">Seat</span>
        </Link>
        <Link
          href="/"
          data-testid="about-back-link"
          className={`inline-flex min-h-11 items-center text-label-lg text-amber-dark ${FOCUS_LINK_CLASSNAME}`}
        >
          {t('backLink')}
        </Link>
      </div>

      <h1 className="text-display-xl text-text-primary lg:text-center">{t('title')}</h1>

      {/* Hero photo (sunset/outdoor scene) — maintainer-provided, art-directed
          per viewport: portrait (4:5) on mobile, landscape (16:9) on desktop.
          A <picture> element is used (rather than next/image) so the browser
          fetches exactly one crop; the source files are already optimized. */}
      <div className="relative mt-6 aspect-[4/5] overflow-hidden rounded-card bg-surface-muted sm:aspect-[16/9] lg:mt-8">
        <picture>
          <source media="(min-width: 640px)" srcSet={ABOUT_HERO_SRC_DESKTOP} />
          {/* eslint-disable-next-line @next/next/no-img-element -- art-directed responsive hero requires <picture>; sources are pre-optimized */}
          <img
            src={ABOUT_HERO_SRC_MOBILE}
            alt={t('heroAlt')}
            className="absolute inset-0 size-full object-cover"
          />
        </picture>
      </div>

      {/* ALGORITMEN */}
      <section className="mt-10" aria-labelledby="about-algorithm-heading">
        <h2 id="about-algorithm-heading" className={SECTION_LABEL_CLASSNAME}>
          {t('sectionAlgorithm')}
        </h2>
        <div className="mt-4 flex flex-col gap-4 text-body-lg text-text-body">
          <p>{t('model')}</p>
          <p>{t('algorithmBody')}</p>
          <p>{t('uncertainty')}</p>
        </div>
      </section>

      {/* DATAKÄLLOR */}
      <section className="mt-10" aria-labelledby="about-data-sources-heading">
        <h2 id="about-data-sources-heading" className={SECTION_LABEL_CLASSNAME}>
          {t('sectionDataSources')}
        </h2>
        <div className="mt-4">
          <DataSourceList />
        </div>
      </section>

      {/* TRÄFFSÄKERHET — warm gradient background (token-based sun-burst glows). */}
      <section className="mt-10" aria-labelledby="about-accuracy-heading">
        <div className="relative overflow-hidden rounded-card bg-surface-cream p-6 shadow-card">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-16 size-64 gradient-sun-burst-warm"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-16 size-72 gradient-sun-burst-amber"
          />
          <div className="relative">
            <h2 id="about-accuracy-heading" className={SECTION_LABEL_CLASSNAME}>
              {t('sectionAccuracy')}
            </h2>
            <AccuracyCountUp
              value={ABOUT_ACCURACY_PLACEHOLDER}
              suffix={t('accuracyStatSuffix')}
              ariaLabel={t('accuracyStatAria', { value: ABOUT_ACCURACY_PLACEHOLDER })}
              className="mt-3 font-display text-[56px] font-extrabold leading-none text-amber-text lg:text-[64px]"
            />
            <p className="mt-4 text-body-md text-text-body">{t('accuracyBody')}</p>
          </div>
        </div>
      </section>

      {/* Kontakt & feedback (anchor target for the desktop footer KONTAKT link). */}
      <section id="kontakt" className="mt-10 scroll-mt-24" aria-labelledby="about-contact-heading">
        <h2 id="about-contact-heading" className="text-heading-md text-text-primary">
          {t('sectionContact')}
        </h2>
        <p className="mt-4 text-body-lg text-text-body">{t('contactBody')}</p>
        <p className="mt-4">
          <Link
            href="/sekretess"
            data-testid="about-privacy-link"
            className={`inline-flex min-h-11 items-center gap-1.5 text-label-lg text-amber-dark underline underline-offset-4 ${FOCUS_LINK_CLASSNAME}`}
          >
            <Shield aria-hidden="true" className="size-4" />
            {t('privacyLink')}
          </Link>
        </p>
      </section>

      {/* Mobile CTA — full-width "Tillbaka till kartan". */}
      <div className="mt-10 lg:hidden">
        <Link href="/" data-testid="about-cta-map-mobile" className={`${CTA_LINK_CLASSNAME} w-full`}>
          {t('ctaToMap')}
        </Link>
      </div>

      {/* Desktop footer — wordmark + KONTAKT + "Tillbaka till kartan ↗" (AC2).
          No "← Tillbaka" back link on desktop. */}
      <footer className="mt-12 hidden items-center justify-between border-t border-divider pt-8 lg:flex">
        <span className="text-display-sm text-text-muted">sunnyseat</span>
        <div className="flex items-center gap-6">
          <a
            href="#kontakt"
            className={`inline-flex min-h-11 items-center text-label-md text-text-body ${FOCUS_LINK_CLASSNAME}`}
          >
            {t('footerContact')}
          </a>
          <Link href="/" data-testid="about-cta-map-desktop" className={CTA_LINK_CLASSNAME}>
            {t('ctaToMapDesktop')}
          </Link>
        </div>
      </footer>
    </article>
  );
}
