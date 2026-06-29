import type { AnchorHTMLAttributes } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, within } from '@/test/setup/test-utils';
import { AboutPage } from '@/components/custom/about/AboutPage';
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

const reducedMotionMock = vi.fn<() => boolean>(() => false);

// Stub Motion so the count-up resolves to its final value synchronously and
// jsdom never needs IntersectionObserver. AC #3 / #5 detail lives in the
// dedicated AccuracyCountUp test.
vi.mock('motion/react', () => ({
  useReducedMotion: () => reducedMotionMock(),
  useInView: () => true,
  animate: (
    _from: number,
    to: number,
    opts?: { onUpdate?: (v: number) => void; onComplete?: () => void },
  ) => {
    opts?.onUpdate?.(to);
    opts?.onComplete?.();
    return { stop: () => {} };
  },
}));

const svMessages = { about: aboutSv, common: commonSv };
const enMessages = { about: aboutEn, common: commonEn };

describe('<AboutPage />', () => {
  beforeEach(() => {
    reducedMotionMock.mockReturnValue(false);
  });

  it('renders the AC1 sections in order: h1 then ALGORITMEN, DATAKÄLLOR, TRÄFFSÄKERHET, Kontakt', () => {
    renderWithProviders(<AboutPage />, { messages: svMessages });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hur fungerar SunnySeat?');

    const sectionHeadings = screen
      .getAllByRole('heading', { level: 2 })
      .map((node) => node.textContent);
    expect(sectionHeadings).toEqual([
      'ALGORITMEN',
      'DATAKÄLLOR',
      'TRÄFFSÄKERHET',
      'Kontakt & feedback',
    ]);
  });

  it('renders the hero image with localized alt text (AC1)', () => {
    renderWithProviders(<AboutPage />, { messages: svMessages });
    expect(
      screen.getByRole('img', { name: 'Solnedgång över en uteservering i Göteborg' }),
    ).toBeInTheDocument();
  });

  it('lists the four user-safe data sources (AC1) without leaking geodata internals', () => {
    const { container } = renderWithProviders(<AboutPage />, { messages: svMessages });

    const items = within(screen.getByTestId('about-data-sources')).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(screen.getByText('Lantmäteriet')).toBeInTheDocument();
    expect(screen.getByText('Göteborgs Stad öppna data')).toBeInTheDocument();
    expect(screen.getByText('Met.no')).toBeInTheDocument();
    expect(screen.getByText('OpenStreetMap')).toBeInTheDocument();

    // Story 3.0.6: no EPSG / Baskarta / DTM / RPC internals in any string.
    expectNoSensitiveSourceTerms(container as HTMLElement);
  });

  it('counts the accuracy stat up to the placeholder figure (AC3)', () => {
    renderWithProviders(<AboutPage />, { messages: svMessages });
    expect(screen.getByTestId('about-accuracy-stat')).toHaveTextContent('85%');
  });

  it('still shows the figure under reduced motion (AC5)', () => {
    reducedMotionMock.mockReturnValue(true);
    renderWithProviders(<AboutPage />, { messages: svMessages });
    expect(screen.getByTestId('about-accuracy-stat')).toHaveTextContent('85%');
  });

  it('navigates back to the map from the back link and both CTAs (AC4)', () => {
    renderWithProviders(<AboutPage />, { messages: svMessages });
    expect(screen.getByTestId('about-back-link')).toHaveAttribute('href', '/');
    expect(screen.getByTestId('about-cta-map-mobile')).toHaveAttribute('href', '/');
    expect(screen.getByTestId('about-cta-map-desktop')).toHaveAttribute('href', '/');
  });

  it('includes a privacy-policy link in the contact section (AC6 / NFR16)', () => {
    renderWithProviders(<AboutPage />, { messages: svMessages });
    const privacyLink = screen.getByTestId('about-privacy-link');
    expect(privacyLink).toHaveTextContent('Integritetspolicy');
    expect(privacyLink).toHaveAttribute('href', '/sekretess');
  });

  it('shows the desktop footer chrome (wordmark + KONTAKT + map CTA)', () => {
    renderWithProviders(<AboutPage />, { messages: svMessages });
    expect(screen.getByText('sunnyseat')).toBeInTheDocument();
    expect(screen.getByText('KONTAKT')).toBeInTheDocument();
    expect(screen.getByTestId('about-cta-map-desktop')).toHaveTextContent('Tillbaka till kartan');
  });

  it('renders English copy when the locale is en (AC7)', () => {
    renderWithProviders(<AboutPage />, { messages: enMessages, locale: 'en' });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('How does SunnySeat work?');
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent),
    ).toEqual(['THE ALGORITHM', 'DATA SOURCES', 'ACCURACY', 'Contact & feedback']);
  });
});
