import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PartnerActions } from '@/components/composed/PartnerActions';
import { LanguageProvider } from '@/lib/i18n';

function renderPartnerActions(props: Parameters<typeof PartnerActions>[0]) {
  return render(
    <LanguageProvider>
      <PartnerActions {...props} />
    </LanguageProvider>
  );
}

describe('PartnerActions', () => {
  it('renders nothing when isPartner is false', () => {
    const { container } = renderPartnerActions({
      isPartner: false,
      bookingUrl: 'https://example.com/book',
      websiteUrl: 'https://example.com',
    });
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when isPartner is true but no URLs', () => {
    const { container } = renderPartnerActions({
      isPartner: true,
      bookingUrl: null,
      websiteUrl: null,
    });
    expect(container.innerHTML).toBe('');
  });

  it('renders booking button when bookingUrl is provided', () => {
    renderPartnerActions({
      isPartner: true,
      bookingUrl: 'https://example.com/book',
      websiteUrl: null,
    });
    const link = screen.getByText('Boka bord');
    expect(link).toBeTruthy();
    expect(link.closest('a')?.getAttribute('href')).toBe('https://example.com/book');
    expect(link.closest('a')?.getAttribute('target')).toBe('_blank');
    expect(link.closest('a')?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders website button when websiteUrl is provided', () => {
    renderPartnerActions({
      isPartner: true,
      bookingUrl: null,
      websiteUrl: 'https://example.com',
    });
    const link = screen.getByText('Besök hemsida');
    expect(link).toBeTruthy();
    expect(link.closest('a')?.getAttribute('href')).toBe('https://example.com');
    expect(link.closest('a')?.getAttribute('target')).toBe('_blank');
    expect(link.closest('a')?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders both buttons when both URLs are provided', () => {
    renderPartnerActions({
      isPartner: true,
      bookingUrl: 'https://example.com/book',
      websiteUrl: 'https://example.com',
    });
    expect(screen.getByText('Boka bord')).toBeTruthy();
    expect(screen.getByText('Besök hemsida')).toBeTruthy();
  });

  it('buttons have minimum 44px touch target height (h-14 = 56px)', () => {
    renderPartnerActions({
      isPartner: true,
      bookingUrl: 'https://example.com/book',
      websiteUrl: 'https://example.com',
    });
    const links = screen.getAllByRole('link');
    for (const link of links) {
      expect(link.className).toContain('h-14');
    }
  });
});
