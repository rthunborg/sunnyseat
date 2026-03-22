import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectedVenueCard } from '@/components/custom/SelectedVenueCard';
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
    windows: [],
    distance_meters: 350,
  };
}

describe('SelectedVenueCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when venue is null', () => {
    const { container } = renderWithProviders(
      <SelectedVenueCard venue={null} onMoreInfo={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders venue name', () => {
    renderWithProviders(
      <SelectedVenueCard venue={makeVenue()} onMoreInfo={vi.fn()} onDismiss={vi.fn()} />,
    );

    expect(screen.getByTestId('selected-venue-name')).toHaveTextContent('Café Husaren');
  });

  it('renders venue address', () => {
    renderWithProviders(
      <SelectedVenueCard venue={makeVenue()} onMoreInfo={vi.fn()} onDismiss={vi.fn()} />,
    );

    expect(screen.getByTestId('selected-venue-address')).toHaveTextContent('Haga Nygata 24');
  });

  it('renders venue photo', () => {
    renderWithProviders(
      <SelectedVenueCard venue={makeVenue()} onMoreInfo={vi.fn()} onDismiss={vi.fn()} />,
    );

    const img = screen.getByRole('img', { name: 'Café Husaren' });
    expect(img).toHaveAttribute('src', 'https://example.com/husaren.jpg');
  });

  it('renders fallback when no photo', () => {
    renderWithProviders(
      <SelectedVenueCard
        venue={makeVenue({ image_url: null })}
        onMoreInfo={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByTestId('venue-photo-fallback')).toBeInTheDocument();
  });

  it('renders opening hours for today', () => {
    renderWithProviders(
      <SelectedVenueCard venue={makeVenue()} onMoreInfo={vi.fn()} onDismiss={vi.fn()} />,
    );

    const hoursEl = screen.getByTestId('selected-venue-hours');
    // Should contain today's hours (will vary by day — just check it's not empty)
    expect(hoursEl.textContent!.length).toBeGreaterThan(0);
  });

  it('shows "Stängt" when closed today', () => {
    // Create hours where all days have values except today
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayIndex = new Date().getDay();
    const todayKey = days[todayIndex];
    const hours: Record<string, string | null> = {};
    for (const d of days) {
      hours[d] = d === todayKey ? null : '09:00-18:00';
    }

    renderWithProviders(
      <SelectedVenueCard
        venue={makeVenue({ opening_hours: hours })}
        onMoreInfo={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByTestId('selected-venue-hours')).toHaveTextContent('Stängt');
  });

  it('renders "Mer info" button', () => {
    renderWithProviders(
      <SelectedVenueCard venue={makeVenue()} onMoreInfo={vi.fn()} onDismiss={vi.fn()} />,
    );

    expect(screen.getByTestId('more-info-button')).toHaveTextContent('Mer info');
  });

  it('calls onMoreInfo when "Mer info" is clicked', async () => {
    const user = userEvent.setup();
    const onMoreInfo = vi.fn();

    renderWithProviders(
      <SelectedVenueCard venue={makeVenue()} onMoreInfo={onMoreInfo} onDismiss={vi.fn()} />,
    );

    await user.click(screen.getByTestId('more-info-button'));
    expect(onMoreInfo).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when Escape key is pressed', () => {
    const onDismiss = vi.fn();

    renderWithProviders(
      <SelectedVenueCard venue={makeVenue()} onMoreInfo={vi.fn()} onDismiss={onDismiss} />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders the SunTimeline', () => {
    renderWithProviders(
      <SelectedVenueCard venue={makeVenue()} onMoreInfo={vi.fn()} onDismiss={vi.fn()} />,
    );

    expect(screen.getByTestId('sun-timeline')).toBeInTheDocument();
  });

  it('has region role with accessible label', () => {
    renderWithProviders(
      <SelectedVenueCard venue={makeVenue()} onMoreInfo={vi.fn()} onDismiss={vi.fn()} />,
    );

    const region = screen.getByRole('region');
    expect(region.getAttribute('aria-label')).toContain('Café Husaren');
  });
});
