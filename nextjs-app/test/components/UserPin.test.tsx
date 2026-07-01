/**
 * Story 9.5 AC2 — UserPin presentational dot (automate coverage).
 *
 * The AC2 layer test (`UserLocationLayer.atdd.test.tsx`) mocks `maplibre-gl`,
 * so the actual `UserPin` DOM is never rendered there — the marker element is a
 * stub. This file asserts the presentational contract of the dot itself so a
 * regression to its fill / dimensions / non-interactivity is caught:
 *   - amber fill `#d97706` (rgb(217,119,6)), 18×18, white border,
 *   - `pointer-events: none` (never intercepts a map drag / venue-pin tap),
 *   - `aria-hidden` (decorative — not announced),
 *   - a halo layer behind the dot.
 *
 * Deterministic DOM/style assertions only.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserPin } from '@/components/custom/map/UserPin';

describe('Story 9.5 AC2 — <UserPin />', () => {
  it('renders an aria-hidden, non-interactive 18x18 amber dot', () => {
    render(<UserPin />);
    const pin = screen.getByTestId('user-location-pin');

    expect(pin).toHaveAttribute('aria-hidden', 'true');
    expect(pin.style.pointerEvents).toBe('none');
    expect(pin.style.width).toBe('18px');
    expect(pin.style.height).toBe('18px');
  });

  it('paints the amber #d97706 fill with a white border on the dot layer', () => {
    render(<UserPin />);
    const pin = screen.getByTestId('user-location-pin');
    // Two absolutely-positioned children: [0] halo, [1] the dot.
    const dot = pin.children[pin.children.length - 1] as HTMLElement;

    // jsdom normalises the hex to rgb.
    expect(dot.style.background).toBe('rgb(217, 119, 6)');
    // jsdom normalises the `#fff` border colour to rgb.
    expect(dot.style.border).toBe('3px solid rgb(255, 255, 255)');
    expect(dot.style.borderRadius).toBe('50%');
  });

  it('renders a soft radial halo behind the dot', () => {
    render(<UserPin />);
    const pin = screen.getByTestId('user-location-pin');
    const halo = pin.children[0] as HTMLElement;

    expect(halo.style.background).toContain('radial-gradient');
    expect(halo.style.pointerEvents).toBe('none');
  });
});
