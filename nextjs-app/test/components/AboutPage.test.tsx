import type { AnchorHTMLAttributes } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, within } from '@/test/setup/test-utils';
import { AboutPageView, type AboutPageCopy } from '@/components/custom/about/AboutPage';
import aboutSv from '@/messages/sv/about.json';
import aboutEn from '@/messages/en/about.json';
import commonSv from '@/messages/sv/common.json';
import commonEn from '@/messages/en/common.json';
import { expectNoSensitiveSourceTerms } from '@/test/setup/sensitive-source-terms';

// next-intl's locale-aware Link pulls in `next/navigation`, which vitest can't
// resolve; stub it to a plain anchor (same pattern as MobileNavBar.test.tsx).
vi.mock('next-intl/navigation', () => ({
  createNavigation: () => ({
    Link: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a href={String(href)} {...props}>
        {children}
      </a>
    ),
  }),
}));

const svMessages = { about: aboutSv, common: commonSv };
const enMessages = { about: aboutEn, common: commonEn };
const svCopy = makeAboutCopy(aboutSv, commonSv);
const enCopy = makeAboutCopy(aboutEn, commonEn);

describe('<AboutPage />', () => {
  it('renders the sections in order with the map-reading legend before ALGORITMEN', () => {
    renderWithProviders(<AboutPageView copy={svCopy} />, { messages: svMessages });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hur fungerar SunnySeat?');

    const sectionHeadings = screen
      .getAllByRole('heading', { level: 2 })
      .map((node) => node.textContent);
    expect(sectionHeadings).toEqual([
      'SÅ LÄSER DU KARTAN',
      'ALGORITMEN',
      'DATAKÄLLOR',
      'TRÄFFSÄKERHET',
      'Kontakt & feedback',
    ]);
  });

  it('renders the hero image with localized alt text (AC1)', () => {
    renderWithProviders(<AboutPageView copy={svCopy} />, { messages: svMessages });
    expect(
      screen.getByRole('img', { name: 'Solnedgång över en uteservering i Göteborg' }),
    ).toBeInTheDocument();
  });

  it('renders the Swedish pin legend copy and seating-share example', () => {
    renderWithProviders(<AboutPageView copy={svCopy} />, { messages: svMessages });

    expect(
      screen.getByText(/Pinnarna följer vald tid: just nu som standard/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/mer än hälften av sittytan ligger i direkt sol/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/vädret inte blockerar solen/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/skugga, låg solexponering, moln, regn eller annan blockering/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/70% betyder att ungefär 70% av sittytan är solig vid vald tid/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/inte att det är 70% chans/i)).toBeInTheDocument();
  });

  it('renders static token-backed swatches that mirror the public pin semantics', () => {
    renderWithProviders(<AboutPageView copy={svCopy} />, { messages: svMessages });

    const sunnySwatch = screen.getByTestId('about-pin-swatch-sunny');
    expect(sunnySwatch).toHaveClass('bg-amber-pin');
    expect(sunnySwatch).toHaveTextContent('70%');
    expect(within(sunnySwatch).getByTestId('about-pin-icon-sun')).toBeInTheDocument();

    const shadedSwatch = screen.getByTestId('about-pin-swatch-shaded');
    expect(shadedSwatch).toHaveClass('bg-pin-shaded');
    expect(shadedSwatch).not.toHaveTextContent(/\d+%/);
    expect(within(shadedSwatch).getByTestId('about-pin-icon-cloud')).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /70%/ })).not.toBeInTheDocument();
  });

  it('lists user-safe data sources without leaking geodata internals or active Google/OSM hour claims', () => {
    const { container } = renderWithProviders(<AboutPageView copy={svCopy} />, { messages: svMessages });

    const items = within(screen.getByTestId('about-data-sources')).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(screen.getByText('Lantmäteriet')).toBeInTheDocument();
    expect(screen.getByText('Göteborgs Stad öppna data')).toBeInTheDocument();
    expect(screen.getByText('Met.no')).toBeInTheDocument();
    expect(screen.getByText('Verifierade platsuppgifter')).toBeInTheDocument();
    expect(screen.getByText('OpenStreetMap')).toBeInTheDocument();
    expect(screen.getByText(/kompletterande pilot/i)).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/Google/i);

    // Story 3.0.6: no EPSG / Baskarta / DTM / RPC internals in any string.
    expectNoSensitiveSourceTerms(container as HTMLElement);
  });

  it('reframes accuracy as feedback-driven prose without fake public rates or confidence percentages', () => {
    const { container } = renderWithProviders(<AboutPageView copy={svCopy} />, { messages: svMessages });

    expect(screen.getByRole('heading', { level: 3, name: 'Hur säkra är vi?' })).toBeInTheDocument();
    expect(screen.getByText(/målet är att solfiguren ska stämma/i)).toBeInTheDocument();
    expect(screen.getByText(/stämmer det\?/i)).toBeInTheDocument();
    expect(screen.getByText(/internt för att prioritera förbättringar/i)).toBeInTheDocument();

    expect(screen.queryByTestId('about-accuracy-stat')).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent('85%');
    expect(container).not.toHaveTextContent('Träffsäkerhet: 85 procent');
    expect(container).not.toHaveTextContent(/Säkerhet\s+\d+%/i);
    expect(container).not.toHaveTextContent(/Confidence\s+\d+%/i);
  });

  it('navigates back to the map from the back link and both CTAs (AC4)', () => {
    renderWithProviders(<AboutPageView copy={svCopy} />, { messages: svMessages });
    expect(screen.getByTestId('about-back-link')).toHaveAttribute('href', '/');
    expect(screen.getByTestId('about-cta-map-mobile')).toHaveAttribute('href', '/');
    expect(screen.getByTestId('about-cta-map-desktop')).toHaveAttribute('href', '/');
  });

  it('includes a privacy-policy link in the contact section (AC6 / NFR16)', () => {
    renderWithProviders(<AboutPageView copy={svCopy} />, { messages: svMessages });
    const privacyLink = screen.getByTestId('about-privacy-link');
    expect(privacyLink).toHaveTextContent('Integritetspolicy');
    expect(privacyLink).toHaveAttribute('href', '/sekretess');
  });

  it('shows the desktop footer chrome (wordmark + KONTAKT + map CTA)', () => {
    renderWithProviders(<AboutPageView copy={svCopy} />, { messages: svMessages });
    expect(screen.getByText('sunnyseat')).toBeInTheDocument();
    expect(screen.getByText('KONTAKT')).toBeInTheDocument();
    expect(screen.getByTestId('about-cta-map-desktop')).toHaveTextContent('Tillbaka till kartan');
  });

  it('renders English copy when the locale is en (AC7)', () => {
    renderWithProviders(<AboutPageView copy={enCopy} />, { messages: enMessages, locale: 'en' });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('How does SunnySeat work?');
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent),
    ).toEqual(['HOW TO READ THE MAP', 'THE ALGORITHM', 'DATA SOURCES', 'ACCURACY', 'Contact & feedback']);
    expect(screen.getByText(/70% means roughly 70% of the seating area is sunny/i)).toBeInTheDocument();
    expect(screen.getByText(/not a 70% chance/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'How sure are we?' })).toBeInTheDocument();
    expect(screen.getByText(/internal confidence/i)).toBeInTheDocument();
  });
});

function makeAboutCopy(
  about: typeof aboutSv,
  common: typeof commonSv,
): AboutPageCopy {
  return {
    title: about.title,
    logoAria: common.nav.logoAria,
    backLink: about.backLink,
    heroAlt: about.heroAlt,
    sectionMapLegend: about.sectionMapLegend,
    mapLegendIntro: about.mapLegendIntro,
    mapLegendSunnyTitle: about.mapLegendSunnyTitle,
    mapLegendSunnyBody: about.mapLegendSunnyBody,
    mapLegendShadedTitle: about.mapLegendShadedTitle,
    mapLegendShadedBody: about.mapLegendShadedBody,
    mapLegendExample: about.mapLegendExample,
    sectionAlgorithm: about.sectionAlgorithm,
    model: about.model,
    algorithmBody: about.algorithmBody,
    uncertainty: about.uncertainty,
    sectionDataSources: about.sectionDataSources,
    dataSources: {
      lantmateriet: {
        name: about.sourceLantmaterietName,
        desc: about.sourceLantmaterietDesc,
      },
      goteborg: {
        name: about.sourceGoteborgName,
        desc: about.sourceGoteborgDesc,
      },
      metno: {
        name: about.sourceMetnoName,
        desc: about.sourceMetnoDesc,
      },
      venueFacts: {
        name: about.sourceVenueFactsName,
        desc: about.sourceVenueFactsDesc,
      },
      osm: {
        name: about.sourceOsmName,
        desc: about.sourceOsmDesc,
      },
    },
    sectionAccuracy: about.sectionAccuracy,
    accuracyHeading: about.accuracyHeading,
    accuracyBody: about.accuracyBody,
    sectionContact: about.sectionContact,
    contactBody: about.contactBody,
    privacyLink: about.privacyLink,
    ctaToMap: about.ctaToMap,
    ctaToMapDesktop: about.ctaToMapDesktop,
    footerContact: about.footerContact,
  };
}
