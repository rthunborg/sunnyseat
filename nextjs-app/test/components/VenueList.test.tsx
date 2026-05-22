import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { VenueList } from '@/components/custom/venue/VenueList';
import { VenueListControls } from '@/components/composed/venue/VenueListControls';
import venueMessages from '@/messages/sv/venue.json';
import type { VenueDataDto } from '@/lib/types/api';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="sv" messages={{ venue: venueMessages }}>
      {children}
    </NextIntlClientProvider>
  );
}

describe('<VenueList />', () => {
  it('announces the loading state semantically', () => {
    render(
      <VenueList
        venues={[]}
        mode="mobile"
        isLoading
        onSelectVenue={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByRole('status', { name: 'Laddar platser' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getAllByTestId('venue-card-skeleton')).toHaveLength(3);
  });

  it('sorts sunny venues first and closest first within sunny venues', () => {
    render(
      <VenueList
        venues={[
          makeVenue({ id: 'shaded', name: 'Skuggan', status: 'Shaded', distanceMeters: 50 }),
          makeVenue({ id: 'partial-near', name: 'Delvis Nära', status: 'Partial', distanceMeters: 20, sunExposurePercent: 65 }),
          makeVenue({ id: 'sun-far', name: 'Sol Långt', status: 'Sunny', distanceMeters: 300 }),
          makeVenue({ id: 'sun-near', name: 'Sol Nära', status: 'Sunny', distanceMeters: 120 }),
        ]}
        mode="mobile"
        onSelectVenue={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getAllByTestId('venue-card').map((card) => card.textContent)).toEqual([
      expect.stringContaining('Sol Nära'),
      expect.stringContaining('Sol Långt'),
      expect.stringContaining('Delvis Nära'),
      expect.stringContaining('Skuggan'),
    ]);
  });

  it('sorts closest first when distance sort mode is selected explicitly', () => {
    render(
      <VenueList
        venues={[
          makeVenue({ id: 'sun-far', name: 'Sol Långt', status: 'Sunny', distanceMeters: 300 }),
          makeVenue({ id: 'shaded-near', name: 'Skugga Nära', status: 'Shaded', distanceMeters: 50 }),
          makeVenue({ id: 'partial-mid', name: 'Delvis Mitten', status: 'Partial', distanceMeters: 120 }),
        ]}
        mode="mobile"
        sortMode="distance"
        onSelectVenue={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getAllByTestId('venue-card').map((card) => card.textContent)).toEqual([
      expect.stringContaining('Skugga Nära'),
      expect.stringContaining('Delvis Mitten'),
      expect.stringContaining('Sol Långt'),
    ]);
  });

  it('renders API-backed confidence metadata in venue cards', () => {
    render(
      <VenueList
        venues={[makeVenue({ id: 'sun-near', name: 'Sol Nära', status: 'Sunny', distanceMeters: 120 })]}
        mode="mobile"
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        onSelectVenue={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('venue-card')).toHaveTextContent('Säkerhet: 90%');
    expect(screen.getByRole('button', { name: /Säkerhet 90%/ })).toBeInTheDocument();
  });

  it('places NaN distances after venues with finite distances', () => {
    render(
      <VenueList
        venues={[
          makeVenue({ id: 'bad-distance', name: 'Okänt avstånd', status: 'Sunny', distanceMeters: Number.NaN }),
          makeVenue({ id: 'near', name: 'Nära', status: 'Sunny', distanceMeters: 40 }),
        ]}
        mode="mobile"
        sortMode="distance"
        onSelectVenue={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getAllByTestId('venue-card').map((card) => card.textContent)).toEqual([
      expect.stringContaining('Nära'),
      expect.stringContaining('Okänt avstånd'),
    ]);
  });

  it('renders mobile discovery chips with unavailable future filters disabled', () => {
    render(
      <VenueListControls
        mode="mobile"
        sortMode="sun"
        onSortModeChange={vi.fn()}
        labels={{
          nearTab: 'Nära mig',
          favouritesTab: 'Favoriter',
          topPicks: 'Toppval nära dig',
          sortBySun: 'Mest sol',
          sortByDistance: 'Nära mig',
          categoryCafe: 'Kafé',
          openNow: 'Öppet nu',
          unavailable: 'Kommer senare',
        }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Mest sol' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Nära mig' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Kafé, Kommer senare' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Öppet nu, Kommer senare' })).toBeDisabled();
  });

  it('renders an empty state and calls selection with the selected DTO', () => {
    const onSelectVenue = vi.fn();
    const venue = makeVenue({ id: 'venue-1', name: 'Bellora', status: 'Sunny', distanceMeters: 90 });
    const { rerender } = render(
      <VenueList venues={[]} mode="desktop" onSelectVenue={onSelectVenue} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Inga platser hittades i det här området.')).toBeInTheDocument();

    rerender(
      <Wrapper>
        <VenueList venues={[venue]} mode="desktop" onSelectVenue={onSelectVenue} />
      </Wrapper>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Välj Bellora/ }));
    expect(onSelectVenue).toHaveBeenCalledWith(venue);
  });
});

function makeVenue({
  id,
  name,
  status,
  distanceMeters,
  sunExposurePercent,
}: {
  id: string;
  name: string;
  status: VenueDataDto['currentSunStatus'];
  distanceMeters: number;
  sunExposurePercent?: number;
}): VenueDataDto {
  return {
    id,
    venueId: id,
    venueName: name,
    venueSlug: id,
    slug: id,
    neighborhood: 'Centrum',
    location: { lat: 57.7, lng: 11.97 },
    currentSunStatus: status,
    isPartner: false,
    confidence: status === 'Sunny' ? 90 : 40,
    distanceMeters,
    sunExposurePercent: sunExposurePercent ?? (status === 'Sunny' ? 85 : 20),
    sunWindow: status === 'Sunny' ? { start: '13:00', end: '18:30' } : undefined,
    thumbnail: { alt: `${name} uteservering`, initials: name.slice(0, 2) },
  };
}
