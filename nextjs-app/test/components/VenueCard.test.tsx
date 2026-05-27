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

    expect(screen.getByRole('button', { name: /Välj Kafé Magasinet/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spara Kafé Magasinet' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Uteservering' })).toBeInTheDocument();
    expect(screen.getByText('Kafé Magasinet')).toBeInTheDocument();
    expect(screen.getByTestId('venue-card')).toHaveTextContent('Sol 13:00-18:30');
    expect(screen.getByTestId('venue-card')).toHaveTextContent('Säkerhet: 92%');
    expect(screen.getByTestId('venue-card')).toHaveTextContent('Avstånd: 180 m');
    expect(screen.getByTestId('venue-card')).toHaveTextContent('92% sol');

    fireEvent.click(screen.getByRole('button', { name: /Välj Kafé Magasinet/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
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

    expect(screen.getByTestId('venue-card')).toHaveTextContent('Säkerhet: ~80%');
    expect(screen.getByTestId('venue-card')).toHaveTextContent('Säkerhet cirka 80%');
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
