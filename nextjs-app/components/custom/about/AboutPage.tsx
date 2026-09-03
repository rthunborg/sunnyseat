import { Cloud, Shield, Sun } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  ABOUT_HERO_SRC_DESKTOP,
  ABOUT_HERO_SRC_MOBILE,
} from '@/lib/constants/about';
import { DataSourceList, type DataSourceListCopy } from './DataSourceList';

// Primary in-app "back to map" CTA — a locale-aware <Link> styled with the
// `gradient-route-button` recipe (Story 7.1 Task 6.1). NOT the routing
// RouteButton (that builds native-maps directions URLs).
const CTA_LINK_CLASSNAME =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-pill gradient-route-button px-6 py-2 text-label-lg text-amber-cta-text shadow-route-button outline-none transition-opacity duration-default ease-default hover:opacity-90 focus-visible:ring-2 focus-visible:ring-text-primary motion-reduce:transition-none';

const FOCUS_LINK_CLASSNAME =
  'outline-none focus-visible:ring-2 focus-visible:ring-amber-primary focus-visible:rounded-sm';

// Uppercase amber section labels (DESIGN.md text-heading-sm = uppercase + tracking).
const SECTION_LABEL_CLASSNAME = 'text-heading-sm text-amber-dark';

export type AboutPageCopy = {
  title: string;
  logoAria: string;
  backLink: string;
  heroAlt: string;
  sectionMapLegend: string;
  mapLegendIntro: string;
  mapLegendSunnyTitle: string;
  mapLegendSunnyBody: string;
  mapLegendShadedTitle: string;
  mapLegendShadedBody: string;
  mapLegendExample: string;
  sectionAlgorithm: string;
  model: string;
  algorithmBody: string;
  uncertainty: string;
  sectionDataSources: string;
  dataSources: DataSourceListCopy;
  sectionAccuracy: string;
  accuracyHeading: string;
  accuracyBody: string;
  sectionContact: string;
  contactBody: string;
  privacyLink: string;
  ctaToMap: string;
  ctaToMapDesktop: string;
  footerContact: string;
};

export async function AboutPage() {
  const t = await getTranslations('about');
  const tCommon = await getTranslations('common');
  return <AboutPageView copy={{
    title: t('title'),
    logoAria: tCommon('nav.logoAria'),
    backLink: t('backLink'),
    heroAlt: t('heroAlt'),
    sectionMapLegend: t('sectionMapLegend'),
    mapLegendIntro: t('mapLegendIntro'),
    mapLegendSunnyTitle: t('mapLegendSunnyTitle'),
    mapLegendSunnyBody: t('mapLegendSunnyBody'),
    mapLegendShadedTitle: t('mapLegendShadedTitle'),
    mapLegendShadedBody: t('mapLegendShadedBody'),
    mapLegendExample: t('mapLegendExample'),
    sectionAlgorithm: t('sectionAlgorithm'),
    model: t('model'),
    algorithmBody: t('algorithmBody'),
    uncertainty: t('uncertainty'),
    sectionDataSources: t('sectionDataSources'),
    dataSources: {
      lantmateriet: {
        name: t('sourceLantmaterietName'),
        desc: t('sourceLantmaterietDesc'),
      },
      goteborg: {
        name: t('sourceGoteborgName'),
        desc: t('sourceGoteborgDesc'),
      },
      metno: {
        name: t('sourceMetnoName'),
        desc: t('sourceMetnoDesc'),
      },
      venueFacts: {
        name: t('sourceVenueFactsName'),
        desc: t('sourceVenueFactsDesc'),
      },
      osm: {
        name: t('sourceOsmName'),
        desc: t('sourceOsmDesc'),
      },
    },
    sectionAccuracy: t('sectionAccuracy'),
    accuracyHeading: t('accuracyHeading'),
    accuracyBody: t('accuracyBody'),
    sectionContact: t('sectionContact'),
    contactBody: t('contactBody'),
    privacyLink: t('privacyLink'),
    ctaToMap: t('ctaToMap'),
    ctaToMapDesktop: t('ctaToMapDesktop'),
    footerContact: t('footerContact'),
  }} />;
}

export function AboutPageView({ copy }: { copy: AboutPageCopy }) {
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
          aria-label={copy.logoAria}
          className={`flex min-h-11 items-center text-display-sm text-text-logo ${FOCUS_LINK_CLASSNAME}`}
        >
          Sunny<span className="text-amber-dark">Seat</span>
        </Link>
        <Link
          href="/"
          data-testid="about-back-link"
          className={`inline-flex min-h-11 items-center text-label-lg text-amber-dark ${FOCUS_LINK_CLASSNAME}`}
        >
          {copy.backLink}
        </Link>
      </div>

      <h1 className="text-display-xl text-text-primary lg:text-center">{copy.title}</h1>

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
            alt={copy.heroAlt}
            className="absolute inset-0 size-full object-cover"
          />
        </picture>
      </div>

      {/* SÅ LÄSER DU KARTAN */}
      <section className="mt-10" aria-labelledby="about-map-legend-heading">
        <h2 id="about-map-legend-heading" className={SECTION_LABEL_CLASSNAME}>
          {copy.sectionMapLegend}
        </h2>
        <div className="mt-4 flex flex-col gap-4 text-body-lg text-text-body">
          <p>{copy.mapLegendIntro}</p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <li className="flex gap-3 rounded-card bg-surface-muted p-4">
              <span
                aria-hidden="true"
                className="flex min-h-11 w-12 shrink-0 items-center justify-center"
              >
                <span className="flex flex-col items-center">
                  <span
                    data-testid="about-pin-swatch-sunny"
                    className="flex h-[50px] w-11 flex-col items-center justify-center gap-0.5 rounded-pill border-[2.5px] border-white bg-amber-pin py-1 shadow-card"
                  >
                    <span className="text-label-xs leading-none text-text-primary">70%</span>
                    <Sun
                      aria-hidden="true"
                      data-testid="about-pin-icon-sun"
                      className="size-3.5 text-text-primary"
                    />
                  </span>
                  <span className="-mt-0.5 block h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-amber-pin shadow-subtle" />
                </span>
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-label-lg text-text-primary">{copy.mapLegendSunnyTitle}</span>
                <span className="text-body-sm text-text-body">{copy.mapLegendSunnyBody}</span>
              </span>
            </li>
            <li className="flex gap-3 rounded-card bg-surface-muted p-4">
              <span
                aria-hidden="true"
                className="flex min-h-11 w-12 shrink-0 items-center justify-center"
              >
                <span className="flex flex-col items-center opacity-80">
                  <span
                    data-testid="about-pin-swatch-shaded"
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-pill border border-white/20 bg-pin-shaded px-4 py-2 shadow-subtle"
                  >
                    <Cloud
                      aria-hidden="true"
                      data-testid="about-pin-icon-cloud"
                      className="size-3.5 text-text-body"
                    />
                  </span>
                  <span className="block h-0 w-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-pin-shaded" />
                </span>
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-label-lg text-text-primary">{copy.mapLegendShadedTitle}</span>
                <span className="text-body-sm text-text-body">{copy.mapLegendShadedBody}</span>
              </span>
            </li>
          </ul>
          <p className="rounded-card bg-surface-muted p-4 text-body-md text-text-body">
            {copy.mapLegendExample}
          </p>
        </div>
      </section>

      {/* ALGORITMEN */}
      <section className="mt-10" aria-labelledby="about-algorithm-heading">
        <h2 id="about-algorithm-heading" className={SECTION_LABEL_CLASSNAME}>
          {copy.sectionAlgorithm}
        </h2>
        <div className="mt-4 flex flex-col gap-4 text-body-lg text-text-body">
          <p>{copy.model}</p>
          <p>{copy.algorithmBody}</p>
          <p>{copy.uncertainty}</p>
        </div>
      </section>

      {/* DATAKÄLLOR */}
      <section className="mt-10" aria-labelledby="about-data-sources-heading">
        <h2 id="about-data-sources-heading" className={SECTION_LABEL_CLASSNAME}>
          {copy.sectionDataSources}
        </h2>
        <div className="mt-4">
          <DataSourceList copy={copy.dataSources} />
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
              {copy.sectionAccuracy}
            </h2>
            <h3 className="mt-3 text-heading-md text-text-primary">{copy.accuracyHeading}</h3>
            <p className="mt-3 text-body-md text-text-body">{copy.accuracyBody}</p>
          </div>
        </div>
      </section>

      {/* Kontakt & feedback (anchor target for the desktop footer KONTAKT link). */}
      <section id="kontakt" className="mt-10 scroll-mt-24" aria-labelledby="about-contact-heading">
        <h2 id="about-contact-heading" className="text-heading-md text-text-primary">
          {copy.sectionContact}
        </h2>
        <p className="mt-4 text-body-lg text-text-body">{copy.contactBody}</p>
        <p className="mt-4">
          <Link
            href="/sekretess"
            data-testid="about-privacy-link"
            className={`inline-flex min-h-11 items-center gap-1.5 text-label-lg text-amber-dark underline underline-offset-4 ${FOCUS_LINK_CLASSNAME}`}
          >
            <Shield aria-hidden="true" className="size-4" />
            {copy.privacyLink}
          </Link>
        </p>
      </section>

      {/* Mobile CTA — full-width "Tillbaka till kartan". */}
      <div className="mt-10 lg:hidden">
        <Link href="/" data-testid="about-cta-map-mobile" className={`${CTA_LINK_CLASSNAME} w-full`}>
          {copy.ctaToMap}
        </Link>
      </div>

      {/* Desktop footer — wordmark + KONTAKT + "Tillbaka till kartan ↗" (AC2).
          No "← Tillbaka" back link on desktop. */}
      <footer className="mt-12 hidden items-center justify-between border-t border-divider pt-8 lg:flex">
        <span className="text-display-sm text-text-logo">sunnyseat</span>
        <div className="flex items-center gap-6">
          <a
            href="#kontakt"
            className={`inline-flex min-h-11 items-center text-label-md text-text-body ${FOCUS_LINK_CLASSNAME}`}
          >
            {copy.footerContact}
          </a>
          <Link href="/" data-testid="about-cta-map-desktop" className={CTA_LINK_CLASSNAME}>
            {copy.ctaToMapDesktop}
          </Link>
        </div>
      </footer>
    </article>
  );
}
