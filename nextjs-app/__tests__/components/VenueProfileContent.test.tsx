import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VenueProfileContent } from '@/components/composed/VenueProfileContent';
import { LanguageProvider } from '@/lib/i18n';
import type { SunExposureResult } from '@/lib/types/venue';

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, onError, ...rest } = props;
    return <img {...rest} onError={onError as React.ReactEventHandler<HTMLImageElement>} />;
  },
}));

// Mock timezone-utils
vi.mock('@/lib/solar/timezone-utils', () => ({
  convertUtcToStockholm: (d: Date) => d,
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

function makeVenue(overrides: Partial<SunExposureResult['venue']> = {}): SunExposureResult {
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
        mon: '09:00-18:00',
        tue: '09:00-18:00',
        wed: '09:00-18:00',
        thu: '09:00-18:00',
        fri: '09:00-20:00',
        sat: '10:00-18:00',
        sun: '10:00-17:00',
      },
      ...overrides,
    },
    current_status: 'sunny',
    sun_exposure_percent: 85,
    confidence: 80,
    windows: [
      {
        start: '2026-03-22T08:00:00.000Z',
        end: '2026-03-22T14:00:00.000Z',
        sun_status: 'sunny',
        sky_condition: 'clear',
      },
    ],
    distance_meters: 350,
  };
}

describe('VenueProfileContent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders venue name', () => {
    renderWithProviders(
      <VenueProfileContent venue={makeVenue()} layout="mobile" onDirections={vi.fn()} />,
    );
    expect(screen.getByTestId('profile-venue-name')).toHaveTextContent('Café Husaren');
  });

  it('renders venue address', () => {
    renderWithProviders(
      <VenueProfileContent venue={makeVenue()} layout="mobile" onDirections={vi.fn()} />,
    );
    expect(screen.getByTestId('profile-venue-address')).toHaveTextContent('Haga Nygata 24');
  });

  it('renders hero photo', () => {
    renderWithProviders(
      <VenueProfileContent venue={makeVenue()} layout="mobile" onDirections={vi.fn()} />,
    );
    const img = screen.getByRole('img', { name: 'Café Husaren' });
    expect(img).toHaveAttribute('src', 'https://example.com/husaren.jpg');
  });

  it('renders opening hours section with all days', () => {
    renderWithProviders(
      <VenueProfileContent venue={makeVenue()} layout="mobile" onDirections={vi.fn()} />,
    );
    const section = screen.getByTestId('opening-hours-section');
    expect(section).toBeInTheDocument();
    // Should contain day abbreviations (Swedish)
    expect(section.textContent).toContain('Mån');
    expect(section.textContent).toContain('Sön');
  });

  it('does not render opening hours section when hours are null', () => {
    renderWithProviders(
      <VenueProfileContent
        venue={makeVenue({ opening_hours: null })}
        layout="mobile"
        onDirections={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('opening-hours-section')).not.toBeInTheDocument();
  });

  it('renders sun forecast timeline', () => {
    renderWithProviders(
      <VenueProfileContent venue={makeVenue()} layout="mobile" onDirections={vi.fn()} />,
    );
    expect(screen.getByTestId('sun-forecast-section')).toBeInTheDocument();
    expect(screen.getByTestId('sun-timeline')).toBeInTheDocument();
  });

  it('renders directions button', () => {
    renderWithProviders(
      <VenueProfileContent venue={makeVenue()} layout="mobile" onDirections={vi.fn()} />,
    );
    expect(screen.getByTestId('directions-button')).toHaveTextContent('Gå dit');
  });

  it('calls onDirections when button is clicked', async () => {
    const user = userEvent.setup();
    const onDirections = vi.fn();
    renderWithProviders(
      <VenueProfileContent venue={makeVenue()} layout="mobile" onDirections={onDirections} />,
    );
    await user.click(screen.getByTestId('directions-button'));
    expect(onDirections).toHaveBeenCalledTimes(1);
  });

  it('renders share button when onShare is provided', () => {
    renderWithProviders(
      <VenueProfileContent
        venue={makeVenue()}
        layout="mobile"
        onDirections={vi.fn()}
        onShare={vi.fn()}
      />,
    );
    expect(screen.getByTestId('share-button')).toHaveTextContent('Dela');
  });

  it('does not render share button when onShare is not provided', () => {
    renderWithProviders(
      <VenueProfileContent venue={makeVenue()} layout="mobile" onDirections={vi.fn()} />,
    );
    expect(screen.queryByTestId('share-button')).not.toBeInTheDocument();
  });

  it('calls onShare when share button is clicked', async () => {
    const user = userEvent.setup();
    const onShare = vi.fn();
    renderWithProviders(
      <VenueProfileContent
        venue={makeVenue()}
        layout="mobile"
        onDirections={vi.fn()}
        onShare={onShare}
      />,
    );
    await user.click(screen.getByTestId('share-button'));
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('renders neighborhood', () => {
    renderWithProviders(
      <VenueProfileContent venue={makeVenue()} layout="mobile" onDirections={vi.fn()} />,
    );
    expect(screen.getByTestId('venue-profile-content').textContent).toContain('Haga');
  });
});
