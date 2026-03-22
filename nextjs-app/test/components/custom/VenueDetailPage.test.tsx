import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VenueDetailPage from '@/components/custom/VenueDetailPage';
import { LanguageProvider } from '@/lib/i18n';
import type { SunWindow } from '@/lib/types/venue';
import type { SkyCondition, SunStatus } from '@/lib/types/design-tokens';

// Mock next/navigation
const backMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: backMock }),
}));

// Mock useReducedMotion
vi.mock('@/lib/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

function makeWindow(
  startHour: number,
  endHour: number,
  sunStatus: SunStatus = 'sunny',
  skyCondition: SkyCondition = 'clear'
): SunWindow {
  return {
    start: `2026-03-15T${String(startHour).padStart(2, '0')}:00:00Z`,
    end: `2026-03-15T${String(endHour).padStart(2, '0')}:00:00Z`,
    sun_status: sunStatus,
    sky_condition: skyCondition,
  };
}

interface VenueProps {
  id?: string;
  name?: string;
  slug?: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
  todayWindows?: SunWindow[];
  tomorrowWindows?: SunWindow[];
  currentSkyCondition?: SkyCondition;
  currentSunStatus?: SunStatus;
  is_partner?: boolean;
  booking_url?: string | null;
  website_url?: string | null;
}

function renderPage(overrides: VenueProps = {}, { isModal, onClose }: { isModal?: boolean; onClose?: () => void } = {}) {
  const venue = {
    id: 'v1',
    name: 'Test Café',
    slug: 'test-cafe',
    neighborhood: 'Linné',
    lat: 57.6969,
    lng: 11.9573,
    todayWindows: [makeWindow(8, 12)],
    tomorrowWindows: [makeWindow(9, 14)],
    currentSkyCondition: 'clear' as SkyCondition,
    currentSunStatus: 'sunny' as SunStatus,
    ...overrides,
  };

  return render(
    <LanguageProvider>
      <VenueDetailPage venue={venue} isModal={isModal} onClose={onClose} />
    </LanguageProvider>
  );
}

describe('VenueDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders venue name as h1', () => {
    renderPage({ name: 'Magasinsgatan Café' });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Magasinsgatan Café');
  });

  it('renders neighborhood', () => {
    renderPage({ neighborhood: 'Haga' });
    const el = screen.getByTestId('venue-neighborhood');
    expect(el).toHaveTextContent('Haga');
  });

  it('renders back button with data-testid', () => {
    renderPage();
    const btn = screen.getByTestId('back-button');
    expect(btn).toBeVisible();
    expect(btn).toHaveTextContent('Tillbaka');
  });

  it('back button calls router.back()', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('back-button'));
    expect(backMock).toHaveBeenCalledOnce();
  });

  it('renders directions link with Google Maps href', () => {
    renderPage({ lat: 57.7, lng: 11.96 });
    const link = screen.getByTestId('directions-link');
    expect(link).toBeVisible();
    expect(link).toHaveTextContent('Gå dit');
    expect(link).toHaveAttribute('href', expect.stringContaining('google.com/maps'));
    expect(link).toHaveAttribute('href', expect.stringContaining('57.7'));
    expect(link).toHaveAttribute('href', expect.stringContaining('11.96'));
  });

  it('renders share button with data-testid', () => {
    renderPage();
    const btn = screen.getByTestId('share-button');
    expect(btn).toBeVisible();
    expect(btn).toHaveTextContent('Dela');
  });

  it('renders SunWindowsTable with today and tomorrow sections', () => {
    renderPage();
    expect(screen.getByText('Idag')).toBeVisible();
    expect(screen.getByText('Imorgon')).toBeVisible();
  });

  it('renders MiniTimeline with data-testid', () => {
    renderPage();
    expect(screen.getByTestId('mini-timeline')).toBeVisible();
  });

  it('renders MiniTimeline in detail variant (38px height)', () => {
    const { container } = renderPage();
    const timeline = container.querySelector('[data-testid="mini-timeline"]');
    expect(timeline?.className).toContain('h-[38px]');
  });

  it('renders partner badge when is_partner is true', () => {
    renderPage({ is_partner: true, booking_url: 'https://example.com' });
    expect(screen.getByText('Partner')).toBeVisible();
  });

  it('does not render partner badge when is_partner is false', () => {
    renderPage({ is_partner: false });
    expect(screen.queryByText('Partner')).toBeNull();
  });

  it('directions link opens in new tab', () => {
    renderPage();
    const link = screen.getByTestId('directions-link');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('directions link is full-width prominent CTA', () => {
    renderPage();
    const link = screen.getByTestId('directions-link');
    expect(link.className).toContain('w-full');
    expect(link.className).toContain('font-semibold');
    expect(link.className).toContain('bg-black/90');
  });

  describe('modal mode', () => {
    it('renders as div instead of main when isModal', () => {
      const { container } = renderPage({}, { isModal: true });
      expect(container.querySelector('main')).toBeNull();
      expect(container.querySelector('div.bg-transparent')).not.toBeNull();
    });

    it('does not include min-h-screen in modal mode', () => {
      const { container } = renderPage({}, { isModal: true });
      const wrapper = container.querySelector('.bg-transparent');
      expect(wrapper?.className).not.toContain('min-h-screen');
    });

    it('renders as main element when not in modal mode', () => {
      const { container } = renderPage();
      expect(container.querySelector('main#main-content')).not.toBeNull();
    });

    it('calls onClose instead of router.back when onClose provided', () => {
      const onClose = vi.fn();
      renderPage({}, { isModal: true, onClose });
      fireEvent.click(screen.getByTestId('back-button'));
      expect(onClose).toHaveBeenCalledOnce();
      expect(backMock).not.toHaveBeenCalled();
    });

    it('Escape key calls onClose in modal mode', () => {
      const onClose = vi.fn();
      renderPage({}, { isModal: true, onClose });
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('Escape key does not call onClose when not in modal mode', () => {
      const onClose = vi.fn();
      renderPage({}, { isModal: false, onClose });
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
