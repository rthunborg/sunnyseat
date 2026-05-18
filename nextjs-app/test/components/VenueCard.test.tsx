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
        distanceMeters={180}
        thumbnail={{ alt: 'Uteservering', initials: 'KM' }}
        isSunny
        labels={{
          select: 'Välj Kafé Magasinet, Sol 13:00-18:30, Säkerhet 92%, Avstånd 180 m',
          sun: 'Sol',
          photoPlaceholder: 'Platshållarbild',
          confidence: 'Säkerhet',
          distance: 'Avstånd',
          sunUnavailable: 'Soltid saknas',
        }}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByRole('button', { name: /Välj Kafé Magasinet/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Uteservering' })).toBeInTheDocument();
    expect(screen.getByText('Kafé Magasinet')).toBeInTheDocument();
    expect(screen.getByText('Sol 13:00-18:30')).toBeInTheDocument();
    expect(screen.getByTestId('venue-card')).toHaveTextContent('Säkerhet: 92%');
    expect(screen.getByTestId('venue-card')).toHaveTextContent('Avstånd: 180 m');
    expect(screen.getByText('Sol')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Välj Kafé Magasinet/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
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
          sun: 'Sol',
          photoPlaceholder: 'Platshållarbild',
          confidence: 'Säkerhet',
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
