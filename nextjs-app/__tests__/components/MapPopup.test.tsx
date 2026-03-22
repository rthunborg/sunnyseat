import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MapPopup } from '@/components/custom/MapPopup';
import { LanguageProvider } from '@/lib/i18n';
import type { SunExposureResult } from '@/lib/types/venue';

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, onError, ...rest } = props;
    return <img {...rest} onError={onError as React.ReactEventHandler<HTMLImageElement>} />;
  },
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
      image_url: 'https://example.com/husaren.jpg',
      ...overrides,
    },
    current_status: 'sunny',
    sun_exposure_percent: 85,
    confidence: 80,
    windows: [],
    distance_meters: 350,
  };
}

describe('MapPopup', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders popup container', () => {
    renderWithProviders(<MapPopup venue={makeVenue()} onMoreInfo={vi.fn()} />);
    expect(screen.getByTestId('map-popup')).toBeInTheDocument();
  });

  it('renders venue name', () => {
    renderWithProviders(<MapPopup venue={makeVenue()} onMoreInfo={vi.fn()} />);
    expect(screen.getByTestId('popup-venue-name')).toHaveTextContent('Café Husaren');
  });

  it('renders venue photo', () => {
    renderWithProviders(<MapPopup venue={makeVenue()} onMoreInfo={vi.fn()} />);
    const img = screen.getByRole('img', { name: 'Café Husaren' });
    expect(img).toHaveAttribute('src', 'https://example.com/husaren.jpg');
  });

  it('shows fallback when no photo', () => {
    renderWithProviders(
      <MapPopup venue={makeVenue({ image_url: null })} onMoreInfo={vi.fn()} />,
    );
    expect(screen.getByTestId('venue-photo-fallback')).toBeInTheDocument();
  });

  it('renders neighborhood', () => {
    renderWithProviders(<MapPopup venue={makeVenue()} onMoreInfo={vi.fn()} />);
    expect(screen.getByTestId('map-popup').textContent).toContain('Haga');
  });

  it('renders status label', () => {
    renderWithProviders(<MapPopup venue={makeVenue()} onMoreInfo={vi.fn()} />);
    expect(screen.getByTestId('map-popup').textContent).toContain('Soligt');
  });

  it('renders "Mer info" button', () => {
    renderWithProviders(<MapPopup venue={makeVenue()} onMoreInfo={vi.fn()} />);
    expect(screen.getByTestId('popup-more-info')).toHaveTextContent('Mer info');
  });

  it('calls onMoreInfo when "Mer info" is clicked', async () => {
    const user = userEvent.setup();
    const onMoreInfo = vi.fn();
    renderWithProviders(<MapPopup venue={makeVenue()} onMoreInfo={onMoreInfo} />);
    await user.click(screen.getByTestId('popup-more-info'));
    expect(onMoreInfo).toHaveBeenCalledTimes(1);
  });

  it('has correct width class', () => {
    renderWithProviders(<MapPopup venue={makeVenue()} onMoreInfo={vi.fn()} />);
    expect(screen.getByTestId('map-popup').className).toContain('w-[260px]');
  });
});
