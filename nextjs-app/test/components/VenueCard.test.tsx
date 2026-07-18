import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VenueCard } from '@/components/composed/venue/VenueCard';
import {
  VENUE_CARD_FADE_MS,
  VENUE_CARD_STAGGER_STEP_MS,
} from '@/lib/constants/animation';

describe('<VenueCard />', () => {
  it('renders venue sunlight, confidence, distance, and an accessible activation label', () => {
    const onSelect = vi.fn();

    render(
      <VenueCard
        name="Kafé Magasinet"
        sunTimeRange="Sol 13:00-18:30"
        confidencePercent={92}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        distanceMeters={180}
        sunExposurePercent={92}
        thumbnail={{ alt: 'Uteservering', initials: 'KM' }}
        isSunny
        labels={{
          select: 'Välj Kafé Magasinet, Sol 13:00-18:30, Säkerhet 92%, Avstånd 180 m',
          favourite: 'Spara {name}',
          sun: 'Sol',
          photoPlaceholder: 'Platshållarbild',
          confidence: 'Säkerhet',
          confidenceApproximate: 'cirka',
          confidenceUnavailable: 'Säkerhet saknas',
          distance: 'Avstånd',
          sunUnavailable: 'Soltid saknas',
        }}
        onSelect={onSelect}
      />,
    );

    // Story 9.1: the accessible name carries name + sun + Säkerhet (once) +
    // Avstånd via labels.select — the in-card sr-only repeats are gone.
    const selectButton = screen.getByRole('button', {
      name: 'Välj Kafé Magasinet, Sol 13:00-18:30, Säkerhet 92%, Avstånd 180 m',
    });
    expect(selectButton).toBeInTheDocument();
    // "Säkerhet" appears exactly once in the accessible name (AC #3 de-dup).
    expect(selectButton.getAttribute('aria-label')?.match(/Säkerhet/g)).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Spara Kafé Magasinet' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Uteservering' })).toBeInTheDocument();
    expect(screen.getByText('Kafé Magasinet')).toBeInTheDocument();
    // No duplicated "Säkerhet: 92% Säkerhet 92%" sr-only repeat remains in the card body.
    expect(screen.getByTestId('venue-card')).not.toHaveTextContent('Säkerhet: 92%');
    // The kept visible signals still render.
    expect(screen.getByTestId('venue-card')).toHaveTextContent('92% sol');
    expect(screen.getByTestId('venue-card')).toHaveTextContent('92%');

    fireEvent.click(screen.getByRole('button', { name: /Välj Kafé Magasinet/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('renders the four sun states distinctly on the compact card (Story 10.2 AC1)', () => {
    const baseLabels = {
      favourite: 'Spara {name}',
      sun: 'Sol',
      photoPlaceholder: 'Platshållarbild',
      confidence: 'Säkerhet',
      confidenceApproximate: 'cirka',
      confidenceUnavailable: 'Säkerhet saknas',
      distance: 'Avstånd',
      sunUnavailable: 'Soltid saknas',
      statusMostlyShade: 'MEST SKUGGA',
      statusFullSun: 'FULL SOL',
      statusPartialSun: 'DELVIS SOL',
      statusObscured: 'SOL BAKOM MOLN',
    };

    // Sunny (>=75% -> FULL SOL)
    const { rerender } = render(
      <VenueCard
        name="Sol" sunExposurePercent={90} distanceMeters={100} compact isSunny
        thumbnail={{ alt: 'a', initials: 'SO' }}
        labels={{ ...baseLabels, select: 'Välj Sol' }}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByTestId('venue-card')).toHaveTextContent('FULL SOL');

    // Partial (<75% amber -> DELVIS SOL)
    rerender(
      <VenueCard
        name="Delvis" sunExposurePercent={55} distanceMeters={100} compact isSunny
        thumbnail={{ alt: 'a', initials: 'DE' }}
        labels={{ ...baseLabels, select: 'Välj Delvis' }}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByTestId('venue-card')).toHaveTextContent('DELVIS SOL');

    // Shaded (isSunny false, not obscured -> MEST SKUGGA)
    rerender(
      <VenueCard
        name="Skugga" sunExposurePercent={15} distanceMeters={100} compact isSunny={false}
        thumbnail={{ alt: 'a', initials: 'SK' }}
        labels={{ ...baseLabels, select: 'Välj Skugga' }}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByTestId('venue-card')).toHaveTextContent('MEST SKUGGA');

    // Obscured (isObscured -> SOL BAKOM MOLN, muted; NO amber sun copy)
    rerender(
      <VenueCard
        name="Moln" sunExposurePercent={90} distanceMeters={100} compact isSunny={false} isObscured
        thumbnail={{ alt: 'a', initials: 'MO' }}
        labels={{ ...baseLabels, select: 'Välj Moln' }}
        onSelect={vi.fn()}
      />,
    );
    const obscuredCard = screen.getByTestId('venue-card');
    expect(obscuredCard).toHaveTextContent('SOL BAKOM MOLN');
    expect(obscuredCard).not.toHaveTextContent('FULL SOL');
    expect(obscuredCard).not.toHaveTextContent('DELVIS SOL');
    expect(obscuredCard).not.toHaveTextContent('MEST SKUGGA');
    // The muted label uses the obscured-text token (not amber-dark) and a cloud icon.
    const statusRow = screen.getByText('SOL BAKOM MOLN').closest('span.text-obscured-text');
    expect(statusRow).not.toBeNull();
    expect(obscuredCard.querySelector('.text-amber-dark [data-lucide]')).toBeNull();
    expect(statusRow?.querySelector('svg')).not.toBeNull();
  });

  it('renders an obscured non-compact card as percentage-free not-sunny chrome', () => {
    render(
      <VenueCard
        name="Molnig" sunExposurePercent={92} distanceMeters={100} isSunny={false} isObscured
        thumbnail={{ alt: 'a', initials: 'ML' }}
        labels={{
          select: 'Välj Molnig',
          favourite: 'Spara {name}',
          sun: 'Sol',
          photoPlaceholder: 'Platshållarbild',
          confidence: 'Säkerhet',
          confidenceApproximate: 'cirka',
          confidenceUnavailable: 'Säkerhet saknas',
          distance: 'Avstånd',
          sunUnavailable: 'Soltid saknas',
          statusObscured: 'SOL BAKOM MOLN',
          obscuredPosition: '{percent} solläge · sol här när det klarnar',
        }}
        onSelect={vi.fn()}
      />,
    );

    const card = screen.getByTestId('venue-card');
    // AC1: the muted "Sol bakom moln" headline is now visibly rendered on the
    // non-compact (favourites bottom-sheet) card too, mirroring the compact card
    // (previously the non-compact variant showed only the reframed position chip).
    expect(card).toHaveTextContent('SOL BAKOM MOLN');
    expect(
      screen.getAllByText('SOL BAKOM MOLN').some((node) =>
        node.closest('span.text-obscured-text'),
      ),
    ).toBe(true);
    expect(card).not.toHaveTextContent('92%');
    expect(card).not.toHaveTextContent('solläge');
    expect(card.querySelector('.text-amber-dark.font-extrabold')).toBeNull();
  });

  it('suppresses the amber confidence chip on an obscured non-compact card (Story 10.2 AC1 — no amber under the gate)', () => {
    // Completion Note #2 / AC1: the amber `text-amber-text` confidence chip is
    // hidden for obscured venues so no amber sun chrome survives the gate. A
    // regression that re-added the amber chip under the gate would slip past the
    // headline obscured tests (which only assert the status label + position
    // chip), so pin the suppression directly.
    render(
      <VenueCard
        name="Molnig" sunExposurePercent={92} distanceMeters={100} isSunny={false} isObscured
        confidencePercent={88}
        confidenceMeta={{ sunDataSource: 'weather', weatherUpdatedAt: new Date().toISOString() }}
        thumbnail={{ alt: 'a', initials: 'ML' }}
        labels={{
          select: 'Välj Molnig',
          favourite: 'Spara {name}',
          sun: 'Sol',
          photoPlaceholder: 'Platshållarbild',
          confidence: 'Säkerhet',
          confidenceApproximate: 'cirka',
          confidenceUnavailable: 'Säkerhet saknas',
          distance: 'Avstånd',
          sunUnavailable: 'Soltid saknas',
          statusObscured: 'SOL BAKOM MOLN',
          obscuredPosition: '{percent} solläge · sol här när det klarnar',
        }}
        onSelect={vi.fn()}
      />,
    );

    const card = screen.getByTestId('venue-card');
    // No amber confidence chip element under the gate.
    expect(card.querySelector('.text-amber-text')).toBeNull();
    expect(card).not.toHaveTextContent('92%');
  });

  it('renders the muted-slate thumbnail badge (cloud icon) on an obscured card, never the amber sun badge (Story 10.2 AC1)', () => {
    render(
      <VenueCard
        name="Molnig" sunExposurePercent={92} distanceMeters={100} isSunny={false} isObscured
        thumbnail={{ alt: 'a', initials: 'ML' }}
        labels={{
          select: 'Välj Molnig',
          favourite: 'Spara {name}',
          sun: 'Sol',
          photoPlaceholder: 'Platshållarbild',
          confidence: 'Säkerhet',
          confidenceApproximate: 'cirka',
          confidenceUnavailable: 'Säkerhet saknas',
          distance: 'Avstånd',
          sunUnavailable: 'Soltid saknas',
          statusObscured: 'SOL BAKOM MOLN',
        }}
        onSelect={vi.fn()}
      />,
    );

    const thumbnail = screen.getByTestId('venue-card-thumbnail');
    // The exposure badge uses the muted slate fill (AA white icon), not amber.
    expect(thumbnail.querySelector('.bg-pin-obscured')).not.toBeNull();
    expect(thumbnail.querySelector('.bg-amber-primary')).toBeNull();
  });

  it('localizes the visible sun exposure unit from labels', () => {
    render(
      <VenueCard
        name="Bellora"
        sunTimeRange="Sun 13:00-18:30"
        confidencePercent={80}
        distanceMeters={100}
        sunExposurePercent={76}
        thumbnail={{ alt: 'Patio', initials: 'BE' }}
        isSunny
        labels={{
          select: 'Select Bellora',
          favourite: 'Save {name}',
          sun: 'Sun',
          photoPlaceholder: 'Placeholder image',
          confidence: 'Confidence',
          confidenceApproximate: 'about',
          confidenceUnavailable: 'Confidence unavailable',
          distance: 'Distance',
          sunUnavailable: 'Sun time unavailable',
        }}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByTestId('venue-card')).toHaveTextContent('76% sun');
    expect(screen.getByTestId('venue-card')).not.toHaveTextContent('76% sol');
  });

  it('uses approximate confidence copy when weather freshness is stale', () => {
    render(
      <VenueCard
        name="Bellora"
        sunTimeRange="Sol 13:00-18:30"
        confidencePercent={80}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: '2026-05-22T09:00:00.000Z',
        }}
        distanceMeters={100}
        sunExposurePercent={76}
        thumbnail={{ alt: 'Uteservering', initials: 'BE' }}
        isSunny
        labels={{
          select: 'Välj Bellora',
          favourite: 'Spara {name}',
          sun: 'Sol',
          photoPlaceholder: 'Platshållarbild',
          confidence: 'Säkerhet',
          confidenceApproximate: 'cirka',
          confidenceUnavailable: 'Säkerhet saknas',
          distance: 'Avstånd',
          sunUnavailable: 'Soltid saknas',
        }}
        onSelect={vi.fn()}
      />,
    );

    // Story 9.1: the approximate value renders as the visible "~80%" chip; the
    // duplicated "Säkerhet:" sr-only repeat is gone (the accessible value lives
    // once in the button aria-label, which here is the plain 'Välj Bellora').
    expect(screen.getByTestId('venue-card')).toHaveTextContent('~80%');
    expect(screen.getByTestId('venue-card')).not.toHaveTextContent('Säkerhet:');
  });

  it('does not surface prediction-uncertainty copy on the card (Story 9.1 de-bloat)', () => {
    render(
      <VenueCard
        name="Café Halvvägs"
        sunTimeRange="Sol 15:10-17:20"
        confidencePercent={70}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        distanceMeters={100}
        sunExposurePercent={65}
        thumbnail={{ alt: 'Uteservering', initials: 'CH' }}
        isSunny
        labels={{
          select: 'Välj Café Halvvägs, Sol 15:10-17:20, Säkerhet 70%, Avstånd 100 m',
          favourite: 'Spara {name}',
          sun: 'Sol',
          photoPlaceholder: 'Platshållarbild',
          confidence: 'Säkerhet',
          confidenceApproximate: 'cirka',
          confidenceUnavailable: 'Säkerhet saknas',
          distance: 'Avstånd',
          sunUnavailable: 'Soltid saknas',
        }}
        onSelect={vi.fn()}
      />,
    );

    const card = screen.getByTestId('venue-card');
    expect(card).not.toHaveTextContent('Osäker prognos');
    expect(card).not.toHaveTextContent('Byggnadsskuggor mer osäkra');
    expect(
      screen.queryByText(/Byggnadsskuggorna är beräknade/),
    ).not.toBeInTheDocument();
    // Confidence still appears exactly once, in the accessible name.
    const selectButton = screen.getByRole('button', { name: /Välj Café Halvvägs/ });
    expect(selectButton.getAttribute('aria-label')?.match(/Säkerhet/g)).toHaveLength(1);
  });

  it('does not surface prediction-uncertainty copy in compact mode either (Story 9.1 de-bloat)', () => {
    render(
      <VenueCard
        name="Café Halvvägs"
        sunTimeRange="Sol 15:10-17:20"
        confidencePercent={70}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        distanceMeters={100}
        sunExposurePercent={65}
        thumbnail={{ alt: 'Uteservering', initials: 'CH' }}
        isSunny
        compact
        labels={{
          select: 'Välj Café Halvvägs, Sol 15:10-17:20, Säkerhet 70%, Avstånd 100 m',
          favourite: 'Spara {name}',
          sun: 'Sol',
          photoPlaceholder: 'Platshållarbild',
          confidence: 'Säkerhet',
          confidenceApproximate: 'cirka',
          confidenceUnavailable: 'Säkerhet saknas',
          distance: 'Avstånd',
          sunUnavailable: 'Soltid saknas',
        }}
        onSelect={vi.fn()}
      />,
    );

    const card = screen.getByTestId('venue-card');
    expect(card).not.toHaveTextContent('Osäker prognos');
    expect(card).not.toHaveTextContent('Byggnadsskuggor mer osäkra');
    expect(screen.queryByText(/Byggnadsskuggorna är beräknade/)).not.toBeInTheDocument();
    // Confidence still appears exactly once, in the accessible name.
    const selectButton = screen.getByRole('button', { name: /Välj Café Halvvägs/ });
    expect(selectButton.getAttribute('aria-label')?.match(/Säkerhet/g)).toHaveLength(1);
  });

  it('leaves no orphaned trailing separator when the visible confidence chip is suppressed (Story 9.1 AC #2)', () => {
    render(
      <VenueCard
        name="Bellora"
        sunTimeRange="Sol 13:00-18:30"
        confidencePercent={80}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        distanceMeters={180}
        sunExposurePercent={76}
        thumbnail={{ alt: 'Uteservering', initials: 'BE' }}
        isSunny
        showVisibleConfidence={false}
        labels={{
          select: 'Välj Bellora',
          favourite: 'Spara {name}',
          sun: 'Sol',
          photoPlaceholder: 'Platshållarbild',
          confidence: 'Säkerhet',
          confidenceApproximate: 'cirka',
          confidenceUnavailable: 'Säkerhet saknas',
          distance: 'Avstånd',
          sunUnavailable: 'Soltid saknas',
        }}
        onSelect={vi.fn()}
      />,
    );

    // With the confidence chip hidden, the meta row keeps the kept sun signal
    // and must not end on a dangling middot. Target the VISIBLE "76% sol"
    // exposure chip specifically — the card also carries an sr-only sun-window
    // node ("Sol HH:MM–HH:MM") that likewise contains "sol", so a bare
    // getByText('sol') is now ambiguous.
    const metaRow = screen.getByText('76% sol', { exact: false }).closest('span');
    const normalized = metaRow?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    expect(normalized).toContain('76% sol');
    expect(normalized.endsWith('·')).toBe(false);
    // The hidden chip is not rendered as visible text.
    expect(screen.getByTestId('venue-card')).not.toHaveTextContent('80%');
  });

  it('renders the venue thumbnail URL when one is available', () => {
    render(
      <VenueCard
        name="Bellora"
        sunTimeRange="Sol 13:00-18:30"
        confidencePercent={80}
        distanceMeters={100}
        sunExposurePercent={76}
        thumbnail={{
          alt: 'Bellora uteservering',
          initials: 'BE',
          url: 'https://example.com/bellora.jpg',
        }}
        isSunny
        labels={{
          select: 'Välj Bellora',
          favourite: 'Spara {name}',
          sun: 'Sol',
          photoPlaceholder: 'Platshållarbild',
          confidence: 'Säkerhet',
          confidenceApproximate: 'cirka',
          confidenceUnavailable: 'Säkerhet saknas',
          distance: 'Avstånd',
          sunUnavailable: 'Soltid saknas',
        }}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('img', { name: 'Bellora uteservering' })).toHaveAttribute(
      'src',
      'https://example.com/bellora.jpg',
    );
  });

  it('falls back to initials when the thumbnail image fails to load', () => {
    const { container } = render(
      <VenueCard
        name="Bellora"
        sunTimeRange="Sol 13:00-18:30"
        confidencePercent={80}
        distanceMeters={100}
        sunExposurePercent={76}
        thumbnail={{
          alt: 'Bellora uteservering',
          initials: 'BE',
          url: 'https://example.com/broken.jpg',
        }}
        isSunny
        labels={{
          select: 'Välj Bellora',
          favourite: 'Spara {name}',
          sun: 'Sol',
          photoPlaceholder: 'Platshållarbild',
          confidence: 'Säkerhet',
          confidenceApproximate: 'cirka',
          confidenceUnavailable: 'Säkerhet saknas',
          distance: 'Avstånd',
          sunUnavailable: 'Soltid saknas',
        }}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.error(screen.getByRole('img', { name: 'Bellora uteservering' }));

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: 'Bellora uteservering' })).toHaveTextContent('B');
  });

  it('falls back when the thumbnail has already failed before listeners attach', () => {
    const complete = vi
      .spyOn(HTMLImageElement.prototype, 'complete', 'get')
      .mockReturnValue(true);
    const naturalWidth = vi
      .spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get')
      .mockReturnValue(0);

    const { container } = render(
      <VenueCard
        name="Bellora"
        sunTimeRange="Sol 13:00-18:30"
        confidencePercent={80}
        distanceMeters={100}
        sunExposurePercent={76}
        thumbnail={{
          alt: 'Bellora uteservering',
          initials: 'BE',
          url: 'https://example.com/fast-failed.jpg',
        }}
        isSunny
        labels={{
          select: 'Välj Bellora',
          favourite: 'Spara {name}',
          sun: 'Sol',
          photoPlaceholder: 'Platshållarbild',
          confidence: 'Säkerhet',
          confidenceApproximate: 'cirka',
          confidenceUnavailable: 'Säkerhet saknas',
          distance: 'Avstånd',
          sunUnavailable: 'Soltid saknas',
        }}
        onSelect={vi.fn()}
      />,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: 'Bellora uteservering' })).toHaveTextContent('B');

    complete.mockRestore();
    naturalWidth.mockRestore();
  });

  it('keeps future favourite controls disabled and at least 44px in compact mode without behaviour', () => {
    render(
      <VenueCard
        name="Bellora"
        sunTimeRange="Sol 13:00-18:30"
        confidencePercent={80}
        distanceMeters={100}
        thumbnail={{ alt: 'Uteservering', initials: 'BE' }}
        isSunny
        compact
        labels={{
          select: 'Välj Bellora',
          favourite: 'Spara {name}',
          sun: 'Sol',
          photoPlaceholder: 'Platshållarbild',
          confidence: 'Säkerhet',
          confidenceApproximate: 'cirka',
          confidenceUnavailable: 'Säkerhet saknas',
          distance: 'Avstånd',
          sunUnavailable: 'Soltid saknas',
        }}
        onSelect={vi.fn()}
      />,
    );

    const favourite = screen.getByRole('button', { name: 'Spara Bellora' });
    expect(favourite).toBeDisabled();
    expect(favourite).toHaveClass('size-11');
  });

  it('toggles active favourite state without also selecting the venue', () => {
    const onSelect = vi.fn();
    const onFavouriteToggle = vi.fn();
    const { rerender } = render(
      <VenueCard
        name="Bellora"
        sunTimeRange="Sol 13:00-18:30"
        confidencePercent={80}
        distanceMeters={100}
        thumbnail={{ alt: 'Uteservering', initials: 'BE' }}
        isSunny
        labels={{
          select: 'Välj Bellora',
          favourite: 'Spara {name}',
          favouriteAdd: 'Spara som favorit',
          favouriteRemove: 'Ta bort favorit',
          sun: 'Sol',
          photoPlaceholder: 'Platshållarbild',
          confidence: 'Säkerhet',
          confidenceApproximate: 'cirka',
          confidenceUnavailable: 'Säkerhet saknas',
          distance: 'Avstånd',
          sunUnavailable: 'Soltid saknas',
        }}
        onSelect={onSelect}
        onFavouriteToggle={onFavouriteToggle}
      />,
    );

    const addButton = screen.getByRole('button', { name: 'Spara som favorit: Bellora' });
    expect(addButton).toHaveAttribute('aria-pressed', 'false');
    expect(addButton).toHaveClass('focus-visible:ring-2');
    expect(addButton).toHaveClass('transition-colors', 'duration-fast', 'ease-default', 'motion-reduce:transition-none');
    fireEvent.click(addButton);
    expect(onFavouriteToggle).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();

    rerender(
      <VenueCard
        name="Bellora"
        sunTimeRange="Sol 13:00-18:30"
        confidencePercent={80}
        distanceMeters={100}
        thumbnail={{ alt: 'Uteservering', initials: 'BE' }}
        isSunny
        isFavourite
        labels={{
          select: 'Välj Bellora',
          favourite: 'Spara {name}',
          favouriteAdd: 'Spara som favorit',
          favouriteRemove: 'Ta bort favorit',
          sun: 'Sol',
          photoPlaceholder: 'Platshållarbild',
          confidence: 'Säkerhet',
          confidenceApproximate: 'cirka',
          confidenceUnavailable: 'Säkerhet saknas',
          distance: 'Avstånd',
          sunUnavailable: 'Soltid saknas',
        }}
        onSelect={onSelect}
        onFavouriteToggle={onFavouriteToggle}
      />,
    );

    const removeButton = screen.getByRole('button', { name: 'Ta bort favorit: Bellora' });
    expect(removeButton).toHaveAttribute('aria-pressed', 'true');
    expect(removeButton.querySelector('svg')).toHaveClass('fill-current');
  });

  it('uses design-token thumbnail sizing instead of arbitrary size utilities', () => {
    render(
      <VenueCard
        name="Bellora"
        sunTimeRange="Sol 13:00-18:30"
        confidencePercent={80}
        distanceMeters={100}
        thumbnail={{ alt: 'Uteservering', initials: 'BE' }}
        isSunny
        labels={{
          select: 'Välj Bellora',
          favourite: 'Spara {name}',
          sun: 'Sol',
          photoPlaceholder: 'Platshållarbild',
          confidence: 'Säkerhet',
          confidenceApproximate: 'cirka',
          confidenceUnavailable: 'Säkerhet saknas',
          distance: 'Avstånd',
          sunUnavailable: 'Soltid saknas',
        }}
        onSelect={vi.fn()}
      />,
    );

    const thumbnail = screen.getByTestId('venue-card-thumbnail');
    expect(thumbnail).toHaveClass('h-venue-card-thumb', 'w-venue-card-thumb');
    expect(thumbnail.className).not.toContain('[');
  });

  it('uses shared motion constants for staggered card entry', () => {
    render(
      <VenueCard
        name="Bellora"
        sunTimeRange="Sol 13:00-18:30"
        confidencePercent={80}
        distanceMeters={100}
        thumbnail={{ alt: 'Uteservering', initials: 'BE' }}
        isSunny
        animateIn
        staggerIndex={2}
        labels={{
          select: 'Välj Bellora',
          favourite: 'Spara {name}',
          sun: 'Sol',
          photoPlaceholder: 'Platshållarbild',
          confidence: 'Säkerhet',
          confidenceApproximate: 'cirka',
          confidenceUnavailable: 'Säkerhet saknas',
          distance: 'Avstånd',
          sunUnavailable: 'Soltid saknas',
        }}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByTestId('venue-card')).toHaveStyle({
      animationDelay: `${2 * VENUE_CARD_STAGGER_STEP_MS}ms`,
      animationDuration: `${VENUE_CARD_FADE_MS}ms`,
    });
  });
});
