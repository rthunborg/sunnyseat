import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { LanguageProvider } from '@/lib/i18n';
import { AboutContent } from '@/app/about/AboutContent';

function renderAbout() {
  return render(
    <LanguageProvider>
      <AboutContent />
    </LanguageProvider>
  );
}

describe('AboutContent', () => {
  describe('hero section', () => {
    it('renders title and tagline in Swedish', () => {
      renderAbout();
      expect(screen.getByText('Om SunnySeat')).toBeInTheDocument();
      expect(
        screen.getByText('Hitta soliga uteplatser i Göteborg — just nu')
      ).toBeInTheDocument();
    });

    it('renders sun wordmark SVG', () => {
      renderAbout();
      const title = screen.getByText('Om SunnySeat');
      const section = title.closest('section');
      const svg = section?.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('how it works section', () => {
    it('renders 3 step cards', () => {
      renderAbout();
      expect(screen.getByText('Beräknar solens position')).toBeInTheDocument();
      expect(screen.getByText('Modellerar byggnaders skuggor')).toBeInTheDocument();
      expect(screen.getByText('Lägger till väderdata')).toBeInTheDocument();
    });

    it('renders step descriptions', () => {
      renderAbout();
      expect(screen.getByText(/Astronomiska formler/)).toBeInTheDocument();
      expect(screen.getByText(/2\.5D-modell/)).toBeInTheDocument();
      expect(screen.getByText(/Aktuell molnighet/)).toBeInTheDocument();
    });

    it('each step card has an inline SVG icon', () => {
      renderAbout();
      const howItWorks = screen.getByText('Så fungerar det').closest('section');
      const svgs = howItWorks?.querySelectorAll('svg');
      expect(svgs?.length).toBe(3);
      svgs?.forEach((svg) => {
        expect(svg.getAttribute('aria-hidden')).toBe('true');
      });
    });

    it('step cards use rounded-card and shadow-card tokens', () => {
      renderAbout();
      const card = screen.getByText('Beräknar solens position').closest('article');
      expect(card?.className).toContain('rounded-card');
      expect(card?.className).toContain('shadow-card');
    });

    it('steps are vertical on mobile, horizontal on md', () => {
      renderAbout();
      const howItWorks = screen.getByText('Så fungerar det').closest('section');
      const container = howItWorks?.querySelector('.flex.flex-col');
      expect(container?.className).toContain('md:flex-row');
    });
  });

  describe('data sources section', () => {
    it('renders 4 data source cards', () => {
      renderAbout();
      expect(screen.getByText('Met.no')).toBeInTheDocument();
      expect(screen.getByText('SMHI')).toBeInTheDocument();
      expect(screen.getByText('OpenStreetMap')).toBeInTheDocument();
      expect(screen.getByText('Lantmäteriet')).toBeInTheDocument();
    });

    it('data source cards have descriptions', () => {
      renderAbout();
      expect(screen.getByText(/Meteorologisk institutt/)).toBeInTheDocument();
      expect(screen.getByText(/klimatdata/)).toBeInTheDocument();
      expect(screen.getByText(/öppna bidragsgivare/)).toBeInTheDocument();
      expect(screen.getByText(/officiell geodata/)).toBeInTheDocument();
    });

    it('data source cards use rounded-card and shadow-card tokens', () => {
      renderAbout();
      const card = screen.getByText('Met.no').closest('article');
      expect(card?.className).toContain('rounded-card');
      expect(card?.className).toContain('shadow-card');
    });

    it('renders as a grid', () => {
      renderAbout();
      const section = screen.getByText('Datakällor').closest('section');
      const grid = section?.querySelector('.grid');
      expect(grid).toBeTruthy();
      expect(grid?.className).toContain('md:grid-cols-2');
    });
  });

  describe('disclaimer callout', () => {
    it('renders as a styled callout box', () => {
      renderAbout();
      const disclaimerTitle = screen.getByText('Observera');
      const callout = disclaimerTitle.closest('div.flex');
      expect(callout?.className).toContain('bg-surface-secondary');
      expect(callout?.className).toContain('border');
      expect(callout?.className).toContain('rounded-card');
    });

    it('has an info icon', () => {
      renderAbout();
      const disclaimerTitle = screen.getByText('Observera');
      const callout = disclaimerTitle.closest('div.flex');
      const svg = callout?.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
    });

    it('renders disclaimer text', () => {
      renderAbout();
      expect(screen.getByText(/beräkningsmodeller/)).toBeInTheDocument();
    });
  });

  describe('feedback section', () => {
    it('renders feedback heading and text', () => {
      renderAbout();
      expect(screen.getByText('Feedback')).toBeInTheDocument();
      expect(screen.getByText(/Stämmer solläget/)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has correct heading hierarchy (h1 > h2)', () => {
      renderAbout();
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('Om SunnySeat');
      const h2s = screen.getAllByRole('heading', { level: 2 });
      expect(h2s.length).toBeGreaterThanOrEqual(3);
    });

    it('has landmark regions via section elements', () => {
      renderAbout();
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });

    it('has a back navigation link', () => {
      renderAbout();
      const link = screen.getByRole('link', { name: /tillbaka/i });
      expect(link).toHaveAttribute('href', '/');
    });

    it('all SVG icons are aria-hidden', () => {
      renderAbout();
      const main = screen.getByRole('main');
      const svgs = main.querySelectorAll('svg');
      svgs.forEach((svg) => {
        expect(svg.getAttribute('aria-hidden')).toBe('true');
      });
    });

    it('nav has aria-label', () => {
      renderAbout();
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label');
    });
  });

  describe('ambient tone', () => {
    it('applies ambient tone class to main element', () => {
      renderAbout();
      const main = screen.getByRole('main');
      // getAmbientToneClass('sunny') returns 'ambient-sunny' in non-winter months
      // or 'ambient-winter' in winter months
      const hasAmbient =
        main.className.includes('ambient-sunny') ||
        main.className.includes('ambient-winter');
      expect(hasAmbient).toBe(true);
    });
  });

  describe('no external images', () => {
    it('does not render any img elements', () => {
      renderAbout();
      const main = screen.getByRole('main');
      const imgs = main.querySelectorAll('img');
      expect(imgs.length).toBe(0);
    });
  });
});
