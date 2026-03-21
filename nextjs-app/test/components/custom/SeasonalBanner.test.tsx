import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SeasonalBanner } from '@/components/custom/SeasonalBanner';

// Mock useLanguage
vi.mock('@/lib/i18n', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'seasonalBanner.winterMessage':
          'Vintern har kommit, men solen kommer tillbaka! 🌞',
        'common.close': 'Stäng',
      };
      return translations[key] ?? key;
    },
    language: 'sv' as const,
    setLanguage: vi.fn(),
  }),
}));

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: () => {
      store = {};
    },
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    key: vi.fn(),
    length: 0,
  };
})();

Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

describe('SeasonalBanner', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setFakeMonth(month: number) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, month, 15, 12, 0, 0));
  }

  it('renders during winter months (January)', () => {
    setFakeMonth(0);
    render(<SeasonalBanner />);
    expect(screen.getByText(/Vintern har kommit/)).toBeDefined();
  });

  it('renders during winter months (November)', () => {
    setFakeMonth(10);
    render(<SeasonalBanner />);
    expect(screen.getByText(/Vintern har kommit/)).toBeDefined();
  });

  it('renders during winter months (December)', () => {
    setFakeMonth(11);
    render(<SeasonalBanner />);
    expect(screen.getByText(/Vintern har kommit/)).toBeDefined();
  });

  it('renders during winter months (February)', () => {
    setFakeMonth(1);
    render(<SeasonalBanner />);
    expect(screen.getByText(/Vintern har kommit/)).toBeDefined();
  });

  it('does not render during summer months (June)', () => {
    setFakeMonth(5);
    const { container } = render(<SeasonalBanner />);
    expect(container.innerHTML).toBe('');
  });

  it('is dismissible', () => {
    setFakeMonth(0);
    render(<SeasonalBanner />);

    expect(screen.getByText(/Vintern har kommit/)).toBeDefined();

    const dismissBtn = screen.getByLabelText('Stäng');
    fireEvent.click(dismissBtn);

    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
      'sunnyseat-seasonal-banner-dismissed',
      'true'
    );
  });

  it('does not show if previously dismissed', () => {
    setFakeMonth(0);
    sessionStorageMock.getItem.mockReturnValueOnce('true');
    const { container } = render(<SeasonalBanner />);
    expect(container.innerHTML).toBe('');
  });

  it('shows warm seasonal message in Swedish', () => {
    setFakeMonth(0);
    render(<SeasonalBanner />);
    expect(
      screen.getByText(
        'Vintern har kommit, men solen kommer tillbaka! 🌞'
      )
    ).toBeDefined();
  });

  it('has role="status" for accessibility', () => {
    setFakeMonth(0);
    render(<SeasonalBanner />);
    const banner = screen.getByRole('status');
    expect(banner).toBeDefined();
  });

  it('dismiss button meets touch target via CSS variable', () => {
    setFakeMonth(0);
    render(<SeasonalBanner />);
    const dismissBtn = screen.getByLabelText('Stäng');
    expect(dismissBtn.className).toContain('min-w-[var(--spacing-touch-min)]');
    expect(dismissBtn.className).toContain('min-h-[var(--spacing-touch-min)]');
  });
});
