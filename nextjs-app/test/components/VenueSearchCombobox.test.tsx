import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentPropsWithoutRef } from 'react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VenueSearchCombobox } from '@/components/composed/search/VenueSearchCombobox';
import type { VenueDataDto } from '@/lib/types/api';

const motionState = vi.hoisted(() => ({ reducedMotion: false }));

vi.mock('motion/react-m', () => {
  type MotionDivProps = ComponentPropsWithoutRef<'div'> & {
    animate?: unknown;
    initial?: unknown;
    transition?: unknown;
  };

  return {
    div: ({ animate: _animate, initial: _initial, transition: _transition, ...props }: MotionDivProps) => {
      const isHidden = props['aria-hidden'] === true || props['aria-hidden'] === 'true';
      return (
        <div
          {...props}
          style={{ ...(props.style ?? {}), display: isHidden ? 'none' : props.style?.display }}
        />
      );
    },
  };
});

vi.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => motionState.reducedMotion,
}));

const LABELS = {
  label: 'Sök plats',
  placeholder: 'Sök plats eller område i Göteborg...',
  clear: 'Rensa sökning',
  loading: 'Söker platser',
  error: 'Sökningen kunde inte genomföras',
  noResults: (query: string) => `Inga resultat för "${query}"`,
  resultCount: (count: number) => `${count} resultat`,
};

describe('<VenueSearchCombobox />', () => {
  afterEach(() => {
    motionState.reducedMotion = false;
  });

  it('filters by venue name and neighborhood and selects a clicked result', async () => {
    const onSelectVenue = vi.fn();
    render(
      <Harness
        venues={[
          makeVenue({ id: '1', name: 'Kafé Magasinet', neighborhood: 'Inom Vallgraven' }),
          makeVenue({ id: '2', name: 'Brygghuset Lerum', neighborhood: 'Haga' }),
        ]}
        onSelectVenue={onSelectVenue}
      />,
    );

    const input = screen.getByRole('combobox', { name: 'Sök plats' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'haga' } });

    expect(screen.getByTestId('venue-search-results')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: /Brygghuset Lerum/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Kafé Magasinet/ })).toBeNull();

    fireEvent.click(screen.getByRole('option', { name: /Brygghuset Lerum/ }));
    expect(onSelectVenue).toHaveBeenCalledWith(expect.objectContaining({ id: '2' }));
    await waitFor(() => expect(screen.getByTestId('venue-search-results')).not.toBeVisible());
    expect(input).not.toHaveFocus();
  });

  it('supports keyboard navigation with arrow keys and Enter', () => {
    const onSelectVenue = vi.fn();
    render(
      <Harness
        venues={[
          makeVenue({ id: '1', name: 'Kafé Magasinet', neighborhood: 'Inom Vallgraven' }),
          makeVenue({ id: '2', name: 'Café Halvvägs', neighborhood: 'Vasastaden' }),
        ]}
        onSelectVenue={onSelectVenue}
      />,
    );

    const input = screen.getByRole('combobox', { name: 'Sök plats' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'kafé' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelectVenue).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
  });

  // Story 9.6 AC4 (low-priority polish): pressing Enter with NO prior ArrowDown
  // selects the first visible result. This guards the combobox contract directly
  // now that the launch bundle no longer ships a separate command-menu package.
  it('selects the first visible result on a bare Enter with no prior ArrowDown', () => {
    const onSelectVenue = vi.fn();
    render(
      <Harness
        venues={[
          makeVenue({ id: '1', name: 'Kafé Magasinet', neighborhood: 'Inom Vallgraven' }),
          makeVenue({ id: '2', name: 'Café Halvvägs', neighborhood: 'Vasastaden' }),
        ]}
        onSelectVenue={onSelectVenue}
      />,
    );

    const input = screen.getByRole('combobox', { name: 'Sök plats' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'kafé' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelectVenue).toHaveBeenCalledTimes(1);
    expect(onSelectVenue).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
  });

  it('tracks ARIA expansion, active option, and Home/End keyboard movement', () => {
    const onSelectVenue = vi.fn();
    render(
      <Harness
        venues={[
          makeVenue({ id: '1', name: 'Kafé Magasinet', neighborhood: 'Inom Vallgraven' }),
          makeVenue({ id: '2', name: 'Café Halvvägs', neighborhood: 'Vasastaden' }),
          makeVenue({ id: '3', name: 'Cafe Zenith', neighborhood: 'Haga' }),
        ]}
        onSelectVenue={onSelectVenue}
      />,
    );

    const input = screen.getByRole('combobox', { name: 'Sök plats' });
    expect(input).toHaveAttribute('aria-expanded', 'false');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'a' } });

    const options = screen.getAllByRole('option');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls', screen.getByRole('listbox').id);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0]!.id);

    fireEvent.keyDown(input, { key: 'End' });
    expect(options[2]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'Home' });
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelectVenue).toHaveBeenCalledWith(expect.objectContaining({ id: '2' }));
  });

  it('dismisses on Escape, clears query from the clear button, and renders no-results copy', async () => {
    const onSelectVenue = vi.fn();
    render(
      <Harness
        venues={[makeVenue({ id: '1', name: 'Kafé Magasinet', neighborhood: 'Inom Vallgraven' })]}
        onSelectVenue={onSelectVenue}
      />,
    );

    const input = screen.getByRole('combobox', { name: 'Sök plats' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'zzz' } });
    expect(screen.getByText('Inga resultat för "zzz"')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => expect(screen.getByTestId('venue-search-results')).not.toBeVisible());
    expect(onSelectVenue).not.toHaveBeenCalled();

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'kafé' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rensa sökning' }));
    expect(input).toHaveValue('');
    await waitFor(() => expect(screen.getByTestId('venue-search-results')).not.toBeVisible());
  });

  it('dismisses when keyboard focus moves outside the combobox', async () => {
    render(
      <>
        <Harness
          venues={[makeVenue({ id: '1', name: 'Kafé Magasinet', neighborhood: 'Inom Vallgraven' })]}
          onSelectVenue={vi.fn()}
        />
        <button type="button">Nästa kontroll</button>
      </>,
    );

    const input = screen.getByRole('combobox', { name: 'Sök plats' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'kafé' } });
    expect(await screen.findByRole('option', { name: /Kafé Magasinet/ })).toBeInTheDocument();

    fireEvent.focus(screen.getByRole('button', { name: 'Nästa kontroll' }));

    await waitFor(() => expect(screen.getByTestId('venue-search-results')).not.toBeVisible());
  });

  it('caps pasted query text to the configured API limit', () => {
    render(
      <Harness
        venues={[makeVenue({ id: '1', name: 'Kafé Magasinet', neighborhood: 'Inom Vallgraven' })]}
        onSelectVenue={vi.fn()}
        maxLength={5}
      />,
    );

    const input = screen.getByRole('combobox', { name: 'Sök plats' });
    fireEvent.change(input, { target: { value: 'magasinet' } });

    expect(input).toHaveValue('magas');
  });

  it('renders an error instead of false no-results copy when search fails', async () => {
    render(
      <Harness
        venues={[]}
        error="Sökningen kunde inte genomföras"
        onSelectVenue={vi.fn()}
      />,
    );

    const input = screen.getByRole('combobox', { name: 'Sök plats' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'magasinet' } });

    expect(await screen.findByRole('alert')).toHaveTextContent('Sökningen kunde inte genomföras');
    expect(screen.queryByText('Inga resultat för "magasinet"')).toBeNull();
  });

  it('does not filter local fallback results by hidden slug fields', () => {
    render(
      <Harness
        venues={[
          makeVenue({
            id: '1',
            name: 'Kafé Magasinet',
            neighborhood: 'Inom Vallgraven',
            slug: 'test-venue-sunny',
          }),
        ]}
        onSelectVenue={vi.fn()}
      />,
    );

    const input = screen.getByRole('combobox', { name: 'Sök plats' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'test-venue-sunny' } });

    expect(screen.queryByRole('option', { name: /Kafé Magasinet/ })).toBeNull();
    expect(screen.getByText('Inga resultat för "test-venue-sunny"')).toBeInTheDocument();
  });

  it('marks retained closed exact-match results with selected-time copy in text and accessible name', () => {
    render(
      <Harness
        venues={[makeVenue({ id: '1', name: 'Kafé Magasinet', neighborhood: 'Inom Vallgraven' })]}
        availabilityByVenueId={{ '1': 'closed' }}
        onSelectVenue={vi.fn()}
      />,
    );

    const input = screen.getByRole('combobox', { name: 'Sök plats' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Kafé Magasinet' } });

    expect(screen.getByText('Stängt vid vald tid')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Kafé Magasinet, Inom Vallgraven, Stängt vid vald tid'),
    ).toHaveAttribute('role', 'option');
  });

  it('marks the reduced-motion dropdown path for instant/opacity-only transitions', async () => {
    motionState.reducedMotion = true;
    render(
      <Harness
        venues={[makeVenue({ id: '1', name: 'Kafé Magasinet', neighborhood: 'Inom Vallgraven' })]}
        onSelectVenue={vi.fn()}
      />,
    );

    const input = screen.getByRole('combobox', { name: 'Sök plats' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'kafé' } });

    await waitFor(() => {
      expect(screen.getByTestId('venue-search-results')).toHaveAttribute(
        'data-reduced-motion',
        'true',
      );
    });
    motionState.reducedMotion = false;
  });
});

function Harness({
  venues,
  onSelectVenue,
  error,
  maxLength,
  availabilityByVenueId,
}: {
  venues: VenueDataDto[];
  onSelectVenue: (venue: VenueDataDto) => void;
  error?: string;
  maxLength?: number;
  availabilityByVenueId?: Record<string, 'open' | 'closed' | 'unknown'>;
}) {
  const [query, setQuery] = useState('');
  return (
    <VenueSearchCombobox
      venues={venues}
      query={query}
      onQueryChange={setQuery}
      onSelectVenue={onSelectVenue}
      labels={LABELS}
      variant="mobile"
      error={error}
      maxLength={maxLength}
      availabilityByVenueId={availabilityByVenueId}
      closedAtSelectedTimeLabel="Stängt vid vald tid"
    />
  );
}

function makeVenue({
  id,
  name,
  neighborhood,
  slug,
}: {
  id: string;
  name: string;
  neighborhood: string;
  slug?: string;
}): VenueDataDto {
  return {
    id,
    venueId: id,
    venueName: name,
    venueSlug: slug ?? id,
    slug: slug ?? id,
    neighborhood,
    location: { lat: 57.7, lng: 11.97 },
    currentSunStatus: 'Sunny',
    weatherGateState: 'not_gated',
    isPartner: false,
    confidence: 92,
    distanceMeters: 180,
    sunExposurePercent: 95,
    tags: [],
    sunWindow: { start: '13:00', end: '18:30' },
    thumbnail: {
      alt: `${name} uteservering`,
      initials: name.slice(0, 2),
    },
  };
}
