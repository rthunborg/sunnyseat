import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/setup/test-utils';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
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

async function loadUsePathnameMock(pathname: string) {
  const { usePathname } = await import('next/navigation');
  vi.mocked(usePathname).mockReturnValue(pathname);
}

describe('MobileNavBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the three tabs with Swedish labels', async () => {
    await loadUsePathnameMock('/');
    const { MobileNavBar } = await import(
      '@/components/custom/layout/MobileNavBar'
    );

    renderWithProviders(<MobileNavBar />, { messages: NAV_MESSAGES });

    expect(screen.getByText('Karta')).toBeInTheDocument();
    expect(screen.getByText('Favoriter')).toBeInTheDocument();
    expect(screen.getByText('Om')).toBeInTheDocument();
  });

  it('points each tab at the expected href', async () => {
    await loadUsePathnameMock('/');
    const { MobileNavBar } = await import(
      '@/components/custom/layout/MobileNavBar'
    );

    renderWithProviders(<MobileNavBar />, { messages: NAV_MESSAGES });

    expect(screen.getByTestId('mobile-nav-tab-karta')).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByTestId('mobile-nav-tab-favoriter')).toHaveAttribute(
      'href',
      '/favoriter',
    );
    expect(screen.getByTestId('mobile-nav-tab-om')).toHaveAttribute(
      'href',
      '/about',
    );
  });

  it('marks the active tab and leaves the others inactive', async () => {
    await loadUsePathnameMock('/favoriter');
    const { MobileNavBar } = await import(
      '@/components/custom/layout/MobileNavBar'
    );

    renderWithProviders(<MobileNavBar />, { messages: NAV_MESSAGES });

    expect(screen.getByTestId('mobile-nav-tab-karta')).toHaveAttribute(
      'data-active',
      'false',
    );
    expect(screen.getByTestId('mobile-nav-tab-favoriter')).toHaveAttribute(
      'data-active',
      'true',
    );
    expect(screen.getByTestId('mobile-nav-tab-om')).toHaveAttribute(
      'data-active',
      'false',
    );
  });

  it('exposes an accessible name that matches the visible tab label (WCAG 2.5.3)', async () => {
    await loadUsePathnameMock('/');
    const { MobileNavBar } = await import(
      '@/components/custom/layout/MobileNavBar'
    );

    renderWithProviders(<MobileNavBar />, { messages: NAV_MESSAGES });

    // Each tab's accessible name should equal its visible text — no aria-label
    // overrides the visible label, so voice-control users saying "Karta"
    // actually activate the Karta tab.
    expect(screen.getByRole('link', { name: 'Karta' })).toBe(
      screen.getByTestId('mobile-nav-tab-karta'),
    );
    expect(screen.getByRole('link', { name: 'Favoriter' })).toBe(
      screen.getByTestId('mobile-nav-tab-favoriter'),
    );
    expect(screen.getByRole('link', { name: 'Om' })).toBe(
      screen.getByTestId('mobile-nav-tab-om'),
    );

    // Explicitly confirm aria-label is absent on the tab links.
    for (const key of ['karta', 'favoriter', 'om']) {
      expect(screen.getByTestId(`mobile-nav-tab-${key}`)).not.toHaveAttribute(
        'aria-label',
      );
    }
  });

  it('labels the outer <nav> with the Swedish nav aria-label', async () => {
    await loadUsePathnameMock('/');
    const { MobileNavBar } = await import(
      '@/components/custom/layout/MobileNavBar'
    );

    renderWithProviders(<MobileNavBar />, { messages: NAV_MESSAGES });

    expect(screen.getByTestId('mobile-nav-bar')).toHaveAttribute(
      'aria-label',
      'Huvudnavigation',
    );
  });

  it('marks Karta active on the locale-prefixed root path (/en)', async () => {
    await loadUsePathnameMock('/en');
    const { MobileNavBar } = await import(
      '@/components/custom/layout/MobileNavBar'
    );

    renderWithProviders(<MobileNavBar />, {
      locale: 'en',
      messages: NAV_MESSAGES,
    });

    expect(screen.getByTestId('mobile-nav-tab-karta')).toHaveAttribute(
      'data-active',
      'true',
    );
    expect(screen.getByTestId('mobile-nav-tab-favoriter')).toHaveAttribute(
      'data-active',
      'false',
    );
  });

  it('supports keyboard navigation — tabs are focusable in DOM order with focus-visible styling (AC5)', async () => {
    await loadUsePathnameMock('/');
    const { MobileNavBar } = await import(
      '@/components/custom/layout/MobileNavBar'
    );

    renderWithProviders(<MobileNavBar />, { messages: NAV_MESSAGES });

    const tabs = [
      screen.getByTestId('mobile-nav-tab-karta'),
      screen.getByTestId('mobile-nav-tab-favoriter'),
      screen.getByTestId('mobile-nav-tab-om'),
    ];

    // Each tab must be an <a> with an href — the implicit contract that makes
    // it keyboard-reachable without an explicit tabindex.
    for (const tab of tabs) {
      expect(tab.tagName).toBe('A');
      expect(tab).toHaveAttribute('href');
    }

    // DOM order must match the intended Tab-key traversal order.
    const nav = screen.getByTestId('mobile-nav-bar');
    const renderedOrder = Array.from(
      nav.querySelectorAll('[data-testid^="mobile-nav-tab-"]'),
    );
    expect(renderedOrder).toEqual(tabs);

    // Each tab must carry focus-visible styling so the WCAG 2.4.7 focus
    // indicator lands when the user Tabs in.
    for (const tab of tabs) {
      expect(tab.className).toMatch(/focus-visible:outline-none/);
      expect(tab.className).toMatch(/focus-visible:ring-2/);
      expect(tab.className).toMatch(/focus-visible:ring-amber-primary/);
    }

    // Each tab can receive programmatic focus — jsdom does not simulate
    // browser Tab traversal, but element.focus() is the jsdom-level stand-in
    // for "this element is focusable".
    for (const tab of tabs) {
      tab.focus();
      expect(document.activeElement).toBe(tab);
    }
  });
});
