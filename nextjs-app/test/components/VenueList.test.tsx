import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { VenueList } from '@/components/custom/venue/VenueList';
import { VenueListControls } from '@/components/composed/venue/VenueListControls';
import venueMessages from '@/messages/sv/venue.json';
import type { VenueDataDto } from '@/lib/types/api';
import { expectNoSensitiveSourceTerms } from '../setup/sensitive-source-terms';

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

  it('renders partial-sun venues as partially sunny compact cards', () => {
    render(
      <VenueList
        venues={[
          makeVenue({ id: 'partial', name: 'Delvis Solig', status: 'Partial', distanceMeters: 80, sunExposurePercent: 55 }),
        ]}
        mode="desktop"
        onSelectVenue={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    const card = screen.getByTestId('venue-card');
    expect(card).toHaveTextContent('DELVIS SOL');
    expect(card).not.toHaveTextContent('MEST SKUGGA');
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

    // Story 9.1: the visible confidence chip stays; confidence appears once in
    // the button accessible name and the duplicated "Säkerhet:" sr-only is gone.
    expect(screen.getByTestId('venue-card')).toHaveTextContent('90%');
    expect(screen.getByTestId('venue-card')).not.toHaveTextContent('Säkerhet: 90%');
    const selectButton = screen.getByRole('button', { name: /Säkerhet 90%/ });
    expect(selectButton).toBeInTheDocument();
    expect(selectButton.getAttribute('aria-label')?.match(/Säkerhet/g)).toHaveLength(1);
  });

  it('does not surface prediction-uncertainty metadata on list cards (Story 9.1 de-bloat)', () => {
    const { container } = render(
      <VenueList
        venues={[
          makeVenue({
            id: 'risk',
            name: 'Brygghuset Lerum',
            status: 'Partial',
            distanceMeters: 120,
            predictionUncertainty: {
              level: 'medium',
              reasons: ['vegetation', 'awning', 'seasonal_furniture'],
            },
          }),
        ]}
        mode="mobile"
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        onSelectVenue={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    const card = screen.getByTestId('venue-card');
    expect(card).not.toHaveTextContent('Osäker prognos');
    expect(card).not.toHaveTextContent('Lokala hinder kan påverka');
    expect(screen.queryByText(/Träd kan påverka platsen/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Träd kan påverka platsen/ }),
    ).not.toBeInTheDocument();
    expectNoSensitiveSourceTerms(container);
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

  it('renders the working sort buttons and no longer renders the dead category placeholders', () => {
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
          unavailable: 'Kommer senare',
        }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Mest sol' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Mest sol' })).toHaveClass('text-label-lg');
    expect(screen.getByRole('button', { name: 'Mest sol' })).not.toHaveClass('text-label-md');
    expect(screen.getByRole('button', { name: 'Nära mig' })).toHaveAttribute('aria-pressed', 'false');
    // Story 9.6: the "Café"/"Öppet nu" dead category placeholders were removed.
    expect(screen.queryByRole('button', { name: /Kafé/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Öppet nu/ })).toBeNull();
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
  predictionUncertainty,
}: {
  id: string;
  name: string;
  status: VenueDataDto['currentSunStatus'];
  distanceMeters: number;
  sunExposurePercent?: number;
  predictionUncertainty?: VenueDataDto['predictionUncertainty'];
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
    tags: [],
    predictionUncertainty,
    sunWindow: status === 'Sunny' ? { start: '13:00', end: '18:30' } : undefined,
    thumbnail: { alt: `${name} uteservering`, initials: name.slice(0, 2) },
  };
}
