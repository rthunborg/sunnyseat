import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/setup/test-utils';
import { VenuePin } from '@/components/custom/map/VenuePin';
import type { VenuePinData } from '@/lib/types/map';

type WeatherGateState = 'gated' | 'not_gated' | 'unknown';
type StoryVenuePinData = VenuePinData & { weatherGateState: WeatherGateState };

const motionHarness = vi.hoisted(() => ({
  reducedMotion: false as boolean | null,
  calls: [] as Array<{ initial: unknown; transition: unknown }>,
}));

vi.mock('motion/react', async () => {
  const ReactModule = await import('react');
  type MotionProps = React.HTMLAttributes<HTMLDivElement> & {
    initial?: unknown;
    animate?: unknown;
    exit?: unknown;
    transition?: unknown;
  };
  const MotionDiv = ({ initial, animate: _animate, exit: _exit, transition, ...rest }: MotionProps) => {
    motionHarness.calls.push({ initial, transition });
    return ReactModule.createElement('div', rest);
  };
  return {
    motion: { div: MotionDiv },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useReducedMotion: () => motionHarness.reducedMotion,
  };
});

function venue(overrides: Partial<StoryVenuePinData> = {}): StoryVenuePinData {
  return {
    id: 'venue',
    slug: 'venue',
    name: 'Venue',
    lat: 57.7089,
    lng: 11.9746,
    sunStatus: 'Sunny',
    sunExposurePercent: 80,
    weatherGateState: 'not_gated',
    isPartner: false,
    ...overrides,
  };
}

function renderPin(pin: StoryVenuePinData, isSelected = false) {
  return renderWithProviders(
    <VenuePin
      venue={pin}
      isSelected={isSelected}
      onClick={() => {}}
      ariaLabel={`${pin.name} aria`}
    />,
  );
}

describe('Story 12.6 - exactly two honest pin presentations', () => {
  beforeEach(() => {
    motionHarness.reducedMotion = false;
    motionHarness.calls.length = 0;
  });

  test.each([
    ['exactly 50', venue({ sunExposurePercent: 50, sunStatus: 'Sunny' })],
    ['low Partial', venue({ sunExposurePercent: 40, sunStatus: 'Partial' })],
    [
      'gated CloudObscured',
      venue({ sunExposurePercent: 95, sunStatus: 'CloudObscured', weatherGateState: 'gated' }),
    ],
  ] as const)('[P0] %s renders the same canonical percentage-free grey cloud', (_label, pin) => {
    renderPin(pin);
    const button = screen.getByTestId('venue-pin');

    expect(button).toHaveAttribute('data-pin-state', 'shaded');
    expect(button).not.toHaveTextContent(/\d+%/);
    expect(button.querySelector('[data-pin-icon="cloud"]')).not.toBeNull();
    expect(button.querySelector('[data-pin-icon="sun"]')).toBeNull();
    expect(button.querySelector('.bg-pin-shaded')).not.toBeNull();
    expect(button.querySelector('[data-pin-obscured]')).toBeNull();
  });

  test.each([
    ['51% known clear', venue({ sunExposurePercent: 51, weatherGateState: 'not_gated' })],
    ['80% weather unknown', venue({ sunExposurePercent: 80, weatherGateState: 'unknown' })],
  ] as const)('[P0] %s keeps the amber sun and seating-share percentage', (_label, pin) => {
    renderPin(pin);
    const button = screen.getByTestId('venue-pin');

    expect(button).toHaveAttribute('data-pin-state', 'sunny');
    expect(button).toHaveTextContent(`${Math.round(pin.sunExposurePercent)}%`);
    expect(button.querySelector('[data-pin-icon="sun"]')).not.toBeNull();
    expect(button.querySelector('[data-pin-tail]')).not.toBeNull();
  });

  test('[P0] selection adds emphasis without changing semantic state or subtree shape', () => {
    const pin = venue({ sunExposurePercent: 80 });
    const rendered = renderPin(pin, false);
    const before = screen.getByTestId('venue-pin');
    const beforeShape = {
      state: before.dataset.pinState,
      text: before.textContent,
      icon: before.querySelector('[data-pin-icon]')?.getAttribute('data-pin-icon'),
      tail: before.querySelector('[data-pin-tail]') !== null,
    };

    rendered.rerender(
      <VenuePin venue={pin} isSelected onClick={() => {}} ariaLabel={`${pin.name} aria`} />,
    );
    const after = screen.getByTestId('venue-pin');
    expect({
      state: after.dataset.pinState,
      text: after.textContent,
      icon: after.querySelector('[data-pin-icon]')?.getAttribute('data-pin-icon'),
      tail: after.querySelector('[data-pin-tail]') !== null,
    }).toEqual(beforeShape);
  });

  test('[P0] an existing marker crossing from grey to amber updates without an entrance flash', () => {
    const rendered = renderPin(venue({ sunExposurePercent: 40, sunStatus: 'Partial' }));
    motionHarness.calls.length = 0;

    rendered.rerender(
      <VenuePin
        venue={venue({ sunExposurePercent: 51, sunStatus: 'Partial' })}
        isSelected={false}
        onClick={() => {}}
        ariaLabel="Venue aria"
      />,
    );

    expect(motionHarness.calls.at(-1)).toMatchObject({
      initial: false,
      transition: { duration: 0 },
    });
  });

  test.each([true, null])(
    '[P1] reduced or unresolved motion keeps selected pin shape and transitions instant (%s)',
    (preference) => {
      motionHarness.reducedMotion = preference;
      renderPin(venue({ sunExposurePercent: 80 }), true);
      const button = screen.getByTestId('venue-pin');

      expect(button).toHaveAttribute('data-reduced-motion', 'true');
      expect(button).toHaveAttribute('data-pin-state', 'sunny');
      expect(button.querySelector('[data-pin-tail]')).not.toBeNull();
      expect(motionHarness.calls).toEqual([]);
    },
  );
});
