import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VenueCarousel } from '@/components/custom/VenueCarousel';
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

function makeVenue(
  id: string,
  name: string,
  status: 'sunny' | 'partial' | 'shaded' | 'upcoming',
  opts: Partial<{ imageUrl: string | null; neighborhood: string; distance: number }> = {},
): SunExposureResult {
  return {
    venue: {
      id,
      name,
      slug: id,
      neighborhood: opts.neighborhood ?? 'Haga',
      lat: 57.70,
      lng: 11.97,
      image_url: opts.imageUrl ?? null,
    },
    current_status: status,
    sun_exposure_percent: status === 'sunny' ? 85 : status === 'partial' ? 45 : 10,
    confidence: 80,
    windows: [],
    distance_meters: opts.distance ?? 300,
  };
}

const venues: SunExposureResult[] = [
  makeVenue('v-1', 'Café Husaren', 'sunny', { imageUrl: 'https://example.com/1.jpg' }),
  makeVenue('v-2', 'Hagabion', 'sunny'),
  makeVenue('v-3', 'Trattoria', 'partial'),
  makeVenue('v-4', 'Kafé Magasinet', 'shaded'),
];

describe('VenueCarousel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // jsdom doesn't implement scrollTo
    Element.prototype.scrollTo = vi.fn();
  });

  it('renders carousel container with listbox role', () => {
    renderWithProviders(
      <VenueCarousel venues={venues} selectedVenueId={null} onVenueSelect={vi.fn()} />,
    );

    const carousel = screen.getByTestId('venue-carousel');
    expect(carousel).toHaveAttribute('role', 'listbox');
  });

  it('renders a photo card for each venue', () => {
    renderWithProviders(
      <VenueCarousel venues={venues} selectedVenueId={null} onVenueSelect={vi.fn()} />,
    );

    const cards = screen.getAllByTestId('venue-photo-card');
    expect(cards).toHaveLength(4);
  });

  it('renders venue names on cards', () => {
    renderWithProviders(
      <VenueCarousel venues={venues} selectedVenueId={null} onVenueSelect={vi.fn()} />,
    );

    expect(screen.getByText('Café Husaren')).toBeInTheDocument();
    expect(screen.getByText('Hagabion')).toBeInTheDocument();
    expect(screen.getByText('Trattoria')).toBeInTheDocument();
    expect(screen.getByText('Kafé Magasinet')).toBeInTheDocument();
  });

  it('marks selected card with aria-selected', () => {
    renderWithProviders(
      <VenueCarousel venues={venues} selectedVenueId="v-2" onVenueSelect={vi.fn()} />,
    );

    const options = screen.getAllByRole('option');
    const selected = options.find((o) => o.getAttribute('aria-selected') === 'true');
    expect(selected).toBeDefined();
    // The selected card should contain Hagabion
    expect(selected!.textContent).toContain('Hagabion');
  });

  it('calls onVenueSelect when a card is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    renderWithProviders(
      <VenueCarousel venues={venues} selectedVenueId={null} onVenueSelect={onSelect} />,
    );

    // Click the first card's button
    const cards = screen.getAllByTestId('venue-photo-card');
    await user.click(cards[0]);

    expect(onSelect).toHaveBeenCalledWith('v-1');
  });

  it('renders nothing when venues array is empty', () => {
    const { container } = renderWithProviders(
      <VenueCarousel venues={[]} selectedVenueId={null} onVenueSelect={vi.fn()} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders skeleton cards when loading', () => {
    renderWithProviders(
      <VenueCarousel venues={[]} selectedVenueId={null} onVenueSelect={vi.fn()} isLoading />,
    );

    const carousel = screen.getByTestId('venue-carousel');
    expect(carousel).toBeInTheDocument();
    // Skeleton cards should be present (5 of them)
    expect(carousel.children.length).toBe(5);
  });

  it('groups venues by sun status', () => {
    renderWithProviders(
      <VenueCarousel venues={venues} selectedVenueId={null} onVenueSelect={vi.fn()} />,
    );

    // Role groups exist for each status with venues
    const groups = screen.getAllByRole('group');
    expect(groups.length).toBeGreaterThanOrEqual(1);
  });
});
