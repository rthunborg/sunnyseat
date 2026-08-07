import { describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen } from '@/test/setup/test-utils';
import { FavouritesList } from '@/components/custom/favourites/FavouritesList';
import type { VenueDataDto } from '@/lib/types/api';

const venue: VenueDataDto = {
  id: '1',
  venueId: '1',
  venueName: 'Kafé Magasinet',
  venueSlug: 'test-venue-sunny',
  slug: 'test-venue-sunny',
  neighborhood: 'Centrum',
  location: { lat: 57.705, lng: 11.97 },
  currentSunStatus: 'Sunny',
  weatherGateState: 'not_gated',
  skyCondition: 'clear',
  isPartner: false,
  confidence: 92,
  distanceMeters: 180,
  sunExposurePercent: 95,
  tags: [],
  sunWindow: { start: '13:00', end: '18:30' },
  thumbnail: { alt: 'Uteservering', initials: 'KM' },
};

const shadedVenue: VenueDataDto = {
  ...venue,
  id: '2',
  venueId: '2',
  venueName: 'Skuggbaren',
  currentSunStatus: 'Shaded',
  weatherGateState: 'not_gated',
  distanceMeters: 20,
  sunExposurePercent: 10,
};

const messages = {
  common: {},
  map: {},
  onboarding: {},
  feedback: {},
  about: {},
  favourites: {
    empty: 'Du har inga sparade platser än.',
    loadFailed: 'Kunde inte ladda favoriter.',
    retry: 'Försök igen',
  },
  venue: {
    list: {
      loading: 'Laddar platser',
      empty: 'Inga platser hittades i det här området.',
      sun: 'Sol',
      photoPlaceholder: 'Platshållarbild för platsen',
      distance: 'Avstånd',
      distanceApproximate: '≈ från centrum',
      sunUnavailable: 'Soltid saknas',
      closedAtSelectedTime: 'Stängt vid vald tid',
      statusMostlyShade: 'MEST SKUGGA',
      statusFullSun: 'FULL SOL',
      statusPartialSun: 'DELVIS SOL',
      favourite: 'Spara {name}',
      favouriteAdd: 'Spara som favorit',
      favouriteRemove: 'Ta bort favorit',
      cardAria: 'Välj {name}, {sun}, Avstånd {distance}',
    },
  },
};

describe('<FavouritesList />', () => {
  it('renders the exact empty state when no favourites are saved', () => {
    renderWithProviders(
      <FavouritesList
        favouriteIds={[]}
        venues={[]}
        mode="mobile"
        sortMode="sun"
        onSelectVenue={vi.fn()}
        onFavouriteToggle={vi.fn()}
        isFavourite={() => false}
      />,
      {
        messages,
      },
    );

    expect(screen.getByText('Du har inga sparade platser än.')).toBeInTheDocument();
  });

  it('renders saved venues and toggles the matching venue ID', () => {
    const toggle = vi.fn();
    renderWithProviders(
      <FavouritesList
        favouriteIds={['1']}
        venues={[venue]}
        mode="mobile"
        sortMode="sun"
        onSelectVenue={vi.fn()}
        onFavouriteToggle={toggle}
        isFavourite={(id) => id === '1'}
      />,
      {
        messages,
      },
    );

    fireEvent.click(screen.getByRole('button', { name: /Ta bort favorit/ }));
    expect(toggle).toHaveBeenCalledWith(venue);
  });

  it('shows an inline retry state when saved favourites fail to load', () => {
    const retry = vi.fn();
    renderWithProviders(
      <FavouritesList
        favouriteIds={['1']}
        venues={[]}
        mode="mobile"
        sortMode="sun"
        isError
        onRetry={retry}
        onSelectVenue={vi.fn()}
        onFavouriteToggle={vi.fn()}
        isFavourite={() => true}
      />,
      { messages },
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Kunde inte ladda favoriter.');
    fireEvent.click(screen.getByRole('button', { name: 'Försök igen' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('threads locationIsApproximate so favourite cards qualify the distance honestly', () => {
    renderWithProviders(
      <FavouritesList
        favouriteIds={['1']}
        venues={[venue]}
        mode="mobile"
        sortMode="sun"
        locationIsApproximate
        onSelectVenue={vi.fn()}
        onFavouriteToggle={vi.fn()}
        isFavourite={() => true}
      />,
      { messages },
    );

    expect(screen.getByText('≈ från centrum')).toBeInTheDocument();
    expect(screen.getByTestId('venue-card')).toHaveTextContent('180 m');
  });

  it('does NOT qualify the distance when the location is a real personal fix', () => {
    renderWithProviders(
      <FavouritesList
        favouriteIds={['1']}
        venues={[venue]}
        mode="mobile"
        sortMode="sun"
        onSelectVenue={vi.fn()}
        onFavouriteToggle={vi.fn()}
        isFavourite={() => true}
      />,
      { messages },
    );

    expect(screen.queryByText('≈ från centrum')).toBeNull();
  });

  it('keeps favourite cards sorted sunny-first even when the parent sort mode is distance', () => {
    renderWithProviders(
      <FavouritesList
        favouriteIds={['1', '2']}
        venues={[shadedVenue, venue]}
        mode="mobile"
        sortMode="distance"
        onSelectVenue={vi.fn()}
        onFavouriteToggle={vi.fn()}
        isFavourite={() => true}
      />,
      { messages },
    );

    expect(screen.getAllByTestId('venue-card').map((card) => card.textContent)).toEqual([
      expect.stringContaining('Kafé Magasinet'),
      expect.stringContaining('Skuggbaren'),
    ]);
  });

  it('retains a closed saved venue as an actionable favourite row with selected-time copy', () => {
    const onSelectVenue = vi.fn();
    renderWithProviders(
      <FavouritesList
        favouriteIds={['1']}
        venues={[venue]}
        mode="mobile"
        sortMode="sun"
        availabilityByVenueId={{ '1': 'closed' }}
        onSelectVenue={onSelectVenue}
        onFavouriteToggle={vi.fn()}
        isFavourite={() => true}
      />,
      { messages },
    );

    expect(screen.getByText('Stängt vid vald tid')).toBeInTheDocument();
    const rowButton = screen.getByRole('button', {
      name: /Välj Kafé Magasinet.*Stängt vid vald tid/,
    });
    expect(rowButton).toBeEnabled();
    fireEvent.click(rowButton);
    expect(onSelectVenue).toHaveBeenCalledWith(venue);
  });
});
