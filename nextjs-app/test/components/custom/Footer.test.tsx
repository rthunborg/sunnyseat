import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Footer } from '@/components/custom/Footer';

const mockSetLanguage = vi.fn();

vi.mock('@/lib/i18n', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'footer.copyright': '© 2026 SunnySeat',
        'footer.dataSources': 'Data: Met.no, Lantmäteriet, OSM',
        'footer.about': 'Om SunnySeat',
        'footer.switchLanguage': 'Byt språk',
      };
      return translations[key] ?? key;
    },
    language: 'sv' as const,
    setLanguage: mockSetLanguage,
  }),
}));

describe('Footer', () => {
  it('renders copyright text', () => {
    render(<Footer />);
    expect(screen.getByText('© 2026 SunnySeat')).toBeDefined();
  });

  it('renders data sources text', () => {
    render(<Footer />);
    expect(screen.getByText('Data: Met.no, Lantmäteriet, OSM')).toBeDefined();
  });

  it('has "Om SunnySeat" link pointing to /about', () => {
    render(<Footer />);
    const link = screen.getByRole('link', { name: 'Om SunnySeat' });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/about');
  });

  it('has language toggle button', () => {
    render(<Footer />);
    const btn = screen.getByLabelText('Byt språk');
    expect(btn).toBeDefined();
    expect(btn.textContent).toBe('EN');
  });

  it('language toggle calls setLanguage', () => {
    render(<Footer />);
    const btn = screen.getByLabelText('Byt språk');
    fireEvent.click(btn);
    expect(mockSetLanguage).toHaveBeenCalledWith('en');
  });

  it('about link meets touch target minimum', () => {
    render(<Footer />);
    const link = screen.getByRole('link', { name: 'Om SunnySeat' });
    expect(link.className).toContain('min-h-[var(--spacing-touch-min)]');
  });
});
