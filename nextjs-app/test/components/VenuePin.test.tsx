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

const sunnyVenue: VenuePinData = {
  id: '1',
  slug: 'test-venue-sunny',
  name: 'Test Sunny',
  lat: 57.7089,
  lng: 11.9746,
  sunStatus: 'Sunny',
  sunExposurePercent: 95,
  isPartner: false,
};

const shadedVenue: VenuePinData = {
  ...sunnyVenue,
  id: '2',
  slug: 'test-venue-shaded',
  name: 'Test Shaded',
  sunStatus: 'Shaded',
  sunExposurePercent: 22,
};

const obscuredVenue: VenuePinData = {
  ...sunnyVenue,
  id: '3',
  slug: 'test-venue-obscured',
  name: 'Test Obscured',
  sunStatus: 'CloudObscured',
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

  it('renders the sunny circle (no tail) when selected', () => {
    renderWithProviders(
      <VenuePin venue={sunnyVenue} isSelected={true} onClick={() => {}} ariaLabel="Test Sunny — solig plats — 95 procent sol" />,
    );
    const button = screen.getByTestId('venue-pin');
    expect(button.dataset.pinState).toBe('sunny-selected');
    expect(button.querySelector('[data-pin-tail]')).toBeNull();
    expect(button.querySelector('span')).toHaveClass('text-amber-cta-text');
    expect(button.querySelector('[data-pin-icon="sun"]')).toHaveClass('text-amber-cta-text');
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

  it('renders a muted obscured pill distinct from sunny and shaded (Story 10.2 AC1)', () => {
    renderWithProviders(
      <VenuePin venue={obscuredVenue} isSelected={false} onClick={() => {}} ariaLabel="Test Obscured — sol bakom moln just nu — 88 procent solläge" />,
    );
    const button = screen.getByTestId('venue-pin');
    // A fourth, distinct pin state — not 'sunny', not 'shaded'.
    expect(button.dataset.pinState).toBe('obscured');
    // Cloud icon kept so the state is not colour-only (NFR27).
    expect(button.querySelector('[data-pin-icon="cloud"]')).not.toBeNull();
    expect(button.querySelector('[data-pin-icon="sun"]')).toBeNull();
    // The geometric solläge % survives the gate and stays visible (AC2).
    expect(button).toHaveTextContent('88%');
    // Muted slate fill token, distinct from amber sun and shaded grey.
    expect(button.querySelector('[data-pin-obscured="true"] .bg-pin-obscured')).not.toBeNull();
  });

  it('does not morph the obscured pill on selection (single obscured variant)', () => {
    const { rerender } = renderWithProviders(
      <VenuePin venue={obscuredVenue} isSelected={false} onClick={() => {}} ariaLabel="aria" />,
    );
    let button = screen.getByTestId('venue-pin');
    expect(button.dataset.pinState).toBe('obscured');

    rerender(<VenuePin venue={obscuredVenue} isSelected={true} onClick={() => {}} ariaLabel="aria" />);
    button = screen.getByTestId('venue-pin');
    expect(button.dataset.pinState).toBe('obscured');
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
