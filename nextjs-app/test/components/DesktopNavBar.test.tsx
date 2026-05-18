import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { AnchorHTMLAttributes } from 'react';
import { renderWithProviders } from '@/test/setup/test-utils';
import { DesktopNavBar } from '@/components/custom/layout/DesktopNavBar';

vi.mock('next-intl/navigation', () => ({
  createNavigation: () => ({
    Link: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a href={String(href)} {...props}>
        {children}
      </a>
    ),
  }),
}));

const NAV_MESSAGES = {
  common: {
    appName: 'SunnySeat',
    loading: 'Laddar...',
    error: 'Kunde inte ladda',
    retry: 'Försök igen',
    nav: {
      barLabel: 'Huvudnavigation',
      headerLabel: 'Sidhuvud',
      karta: 'Karta',
      favoriter: 'Favoriter',
      om: 'Om',
      logoAria: 'SunnySeat — gå till kartan',
      searchPlaceholder: 'Sök plats eller adress',
    },
  },
};

describe('DesktopNavBar', () => {
  it('renders the SunnySeat wordmark inside a link to /', () => {
    renderWithProviders(<DesktopNavBar />, { messages: NAV_MESSAGES });

    const logo = screen.getByRole('link', {
      name: 'SunnySeat — gå till kartan',
    });
    expect(logo).toHaveAttribute('href', '/');
    expect(logo).toHaveTextContent('sunnyseat');
  });

  it('renders the search placeholder as plain text without the search landmark', () => {
    renderWithProviders(<DesktopNavBar />, { messages: NAV_MESSAGES });

    const placeholder = screen.getByTestId('desktop-nav-search-placeholder');
    expect(placeholder).toHaveTextContent('Sök plats eller adress');
    // Stub placeholder must not advertise itself as a search landmark — an
    // inert landmark misleads assistive tech. Story 2.4 adds the real combobox.
    expect(placeholder).not.toHaveAttribute('role', 'search');
    expect(placeholder).not.toHaveAttribute('aria-label');
  });

  it('does not render a real <input> or searchbox inside the placeholder', () => {
    renderWithProviders(<DesktopNavBar />, { messages: NAV_MESSAGES });

    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByRole('search')).toBeNull();
    expect(
      screen
        .getByTestId('desktop-nav-search-placeholder')
        .querySelector('input'),
    ).toBeNull();
  });

  it('labels the outer <header> with the Swedish header aria-label', () => {
    renderWithProviders(<DesktopNavBar />, { messages: NAV_MESSAGES });

    expect(screen.getByTestId('desktop-nav-bar')).toHaveAttribute(
      'aria-label',
      'Sidhuvud',
    );
  });
});
