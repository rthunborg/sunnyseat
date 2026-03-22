import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VenueDetailPanel } from '@/components/custom/VenueDetailPanel';
import { LanguageProvider } from '@/lib/i18n';
import type { SunExposureResult } from '@/lib/types/venue';

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { _fill, onError, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...rest} onError={onError as React.ReactEventHandler<HTMLImageElement>} />;
  },
}));

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      aside: ({ children, ...props }: React.HTMLAttributes<HTMLElement> & Record<string, unknown>) => {
        const { _initial, _animate, _exit, _transition, ...htmlProps } = props as Record<string, unknown>;
        return <aside {...(htmlProps as React.HTMLAttributes<HTMLElement>)}>{children}</aside>;
      },
    },
  };
});

// Mock timezone-utils
vi.mock('@/lib/solar/timezone-utils', () => ({
  convertUtcToStockholm: (d: Date) => d,
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

function makeVenue(): SunExposureResult {
  return {
    venue: {
      id: 'v-42',
      name: 'Café Husaren',
      slug: 'cafe-husaren',
      neighborhood: 'Haga',
      lat: 57.70,
      lng: 11.97,
      address: 'Haga Nygata 24',
      image_url: 'https://example.com/husaren.jpg',
      opening_hours: {
        mon: '09:00-18:00', tue: '09:00-18:00', wed: '09:00-18:00',
        thu: '09:00-18:00', fri: '09:00-20:00', sat: '10:00-18:00', sun: '10:00-17:00',
      },
    },
    current_status: 'sunny',
    sun_exposure_percent: 85,
    confidence: 80,
    windows: [],
    distance_meters: 350,
  };
}

describe('VenueDetailPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when venue is null', () => {
    const { container } = renderWithProviders(
      <VenueDetailPanel venue={null} onClose={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders panel with venue content', () => {
    renderWithProviders(
      <VenueDetailPanel venue={makeVenue()} onClose={vi.fn()} />,
    );
    expect(screen.getByTestId('venue-detail-panel')).toBeInTheDocument();
    expect(screen.getByTestId('profile-venue-name')).toHaveTextContent('Café Husaren');
  });

  it('has complementary role and accessible label', () => {
    renderWithProviders(
      <VenueDetailPanel venue={makeVenue()} onClose={vi.fn()} />,
    );
    const panel = screen.getByRole('complementary');
    expect(panel).toHaveAttribute('aria-label', 'Café Husaren');
  });

  it('renders close button', () => {
    renderWithProviders(
      <VenueDetailPanel venue={makeVenue()} onClose={vi.fn()} />,
    );
    expect(screen.getByTestId('panel-close-button')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(
      <VenueDetailPanel venue={makeVenue()} onClose={onClose} />,
    );
    await user.click(screen.getByTestId('panel-close-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <VenueDetailPanel venue={makeVenue()} onClose={onClose} />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has correct width class', () => {
    renderWithProviders(
      <VenueDetailPanel venue={makeVenue()} onClose={vi.fn()} />,
    );
    expect(screen.getByTestId('venue-detail-panel').className).toContain('w-[420px]');
  });

  it('renders directions and share buttons via VenueProfileContent', () => {
    renderWithProviders(
      <VenueDetailPanel venue={makeVenue()} onClose={vi.fn()} />,
    );
    expect(screen.getByTestId('directions-button')).toBeInTheDocument();
    expect(screen.getByTestId('share-button')).toBeInTheDocument();
  });
});
