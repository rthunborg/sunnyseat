import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/setup/test-utils';
import { VenuePin } from '@/components/custom/map/VenuePin';
import type { VenuePinData } from '@/lib/types/map';

const reducedMotionMock = vi.fn(() => false);

vi.mock('motion/react', async () => {
  const React = await import('react');
  type DivProps = React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;
  const passthrough = (props: DivProps) => {
    const {
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      layout: _layout,
      ...rest
    } = props;
    return React.createElement('div', rest);
  };
  return {
    motion: { div: passthrough },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useReducedMotion: () => reducedMotionMock(),
  };
});

vi.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => reducedMotionMock(),
}));

const sunnyVenue: VenuePinData = {
  id: '1',
  slug: 'test-venue-sunny',
  name: 'Test Sunny',
  lat: 57.7089,
  lng: 11.9746,
  sunStatus: 'Sunny',
  weatherGateState: 'not_gated',
  sunExposurePercent: 95,
  isPartner: false,
};

const shadedVenue: VenuePinData = {
  ...sunnyVenue,
  id: '2',
  slug: 'test-venue-shaded',
  name: 'Test Shaded',
  sunStatus: 'Shaded',
  weatherGateState: 'not_gated',
  sunExposurePercent: 22,
};

const obscuredVenue: VenuePinData = {
  ...sunnyVenue,
  id: '3',
  slug: 'test-venue-obscured',
  name: 'Test Obscured',
  sunStatus: 'CloudObscured',
  weatherGateState: 'gated',
  sunExposurePercent: 88,
};

describe('<VenuePin />', () => {
  it('renders the sunny pill (default state) with percent text and sun icon', () => {
    renderWithProviders(
      <VenuePin venue={sunnyVenue} isSelected={false} onClick={() => {}} ariaLabel="Test Sunny — solig plats — 95 procent sol" />,
    );
    const button = screen.getByTestId('venue-pin');
    expect(button.dataset.pinState).toBe('sunny');
    expect(button).toHaveTextContent('95%');
    expect(button.querySelector('[data-pin-icon="sun"]')).not.toBeNull();
  });

  it('keeps the sunny pill shape when selected', () => {
    renderWithProviders(
      <VenuePin venue={sunnyVenue} isSelected={true} onClick={() => {}} ariaLabel="Test Sunny — solig plats — 95 procent sol" />,
    );
    const button = screen.getByTestId('venue-pin');
    expect(button.dataset.pinState).toBe('sunny');
    expect(button.dataset.selected).toBe('true');
    expect(button.querySelector('[data-pin-tail]')).not.toBeNull();
    expect(button.querySelector('span')).toHaveClass('text-text-primary');
    expect(button.querySelector('[data-pin-icon="sun"]')).toHaveClass('text-text-primary');
  });

  it('renders the shaded pill regardless of isSelected (single shaded variant)', () => {
    const { rerender } = renderWithProviders(
      <VenuePin venue={shadedVenue} isSelected={false} onClick={() => {}} ariaLabel="Test Shaded — skuggad plats — 22 procent sol" />,
    );
    let button = screen.getByTestId('venue-pin');
    expect(button.dataset.pinState).toBe('shaded');
    expect(button.querySelector('[data-pin-icon="cloud"]')).not.toBeNull();

    rerender(<VenuePin venue={shadedVenue} isSelected={true} onClick={() => {}} ariaLabel="Test Shaded — skuggad plats — 22 procent sol" />);
    button = screen.getByTestId('venue-pin');
    // Shaded pins do not morph on selection — the variant collapses to
    // the same `shaded` state regardless of `isSelected`.
    expect(button.dataset.pinState).toBe('shaded');
    expect(button.querySelector('[data-pin-icon="cloud"]')).not.toBeNull();
  });

  it('renders gated CloudObscured as the single grey not-sunny shape', () => {
    renderWithProviders(
      <VenuePin venue={obscuredVenue} isSelected={false} onClick={() => {}} ariaLabel="Test Obscured — sol bakom moln just nu — 88 procent solläge" />,
    );
    const button = screen.getByTestId('venue-pin');
    expect(button.dataset.pinState).toBe('shaded');
    // Cloud icon kept so the state is not colour-only (NFR27).
    expect(button.querySelector('[data-pin-icon="cloud"]')).not.toBeNull();
    expect(button.querySelector('[data-pin-icon="sun"]')).toBeNull();
    expect(button).not.toHaveTextContent('88%');
    expect(button.querySelector('.bg-pin-shaded')).not.toBeNull();
  });

  it('does not morph a gated CloudObscured pin on selection', () => {
    const { rerender } = renderWithProviders(
      <VenuePin venue={obscuredVenue} isSelected={false} onClick={() => {}} ariaLabel="aria" />,
    );
    let button = screen.getByTestId('venue-pin');
    expect(button.dataset.pinState).toBe('shaded');

    rerender(<VenuePin venue={obscuredVenue} isSelected={true} onClick={() => {}} ariaLabel="aria" />);
    button = screen.getByTestId('venue-pin');
    expect(button.dataset.pinState).toBe('shaded');
    expect(button.dataset.selected).toBe('true');
  });

  it('reflects the ariaLabel prop verbatim (resolved upstream by VenuePinLayer)', () => {
    renderWithProviders(
      <VenuePin venue={sunnyVenue} isSelected={false} onClick={() => {}} ariaLabel="Test Sunny — solig plats — 95 procent sol" />,
    );
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Test Sunny — solig plats — 95 procent sol',
    );

    renderWithProviders(
      <VenuePin venue={shadedVenue} isSelected={false} onClick={() => {}} ariaLabel="Test Shaded — skuggad plats — 22 procent sol" />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons[buttons.length - 1]).toHaveAttribute(
      'aria-label',
      'Test Shaded — skuggad plats — 22 procent sol',
    );
  });

  it('invokes onClick once on tap', () => {
    const handler = vi.fn();
    renderWithProviders(
      <VenuePin venue={sunnyVenue} isSelected={false} onClick={handler} ariaLabel="aria" />,
    );
    fireEvent.click(screen.getByTestId('venue-pin'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('respects prefers-reduced-motion (no transition prop applied to motion wrapper)', () => {
    reducedMotionMock.mockReturnValueOnce(true);
    renderWithProviders(
      <VenuePin venue={sunnyVenue} isSelected={false} onClick={() => {}} ariaLabel="Test Sunny — solig plats — 95 procent sol" />,
    );
    const button = screen.getByTestId('venue-pin');
    expect(button.dataset.reducedMotion).toBe('true');
  });
});
