/**
 * Story 9.5 AC2 / Story 11.5 AC2 — UserPin presentational dot (automate coverage).
 *
 * The AC2 layer test (`UserLocationLayer.atdd.test.tsx`) mocks `maplibre-gl`,
 * so the actual `UserPin` DOM is never rendered there — the marker element is a
 * stub. This file asserts the presentational contract of the dot itself so a
 * regression to its fill / dimensions / non-interactivity / halo is caught:
 *   - tokenized amber fill (`var(--color-amber-location-dot)`, Story 11.5 —
 *     no raw `#d97706` in the component), 24×24 (Story 11.5 scaled 18→24),
 *     white ring,
 *   - `pointer-events: none` (never intercepts a map drag / venue-pin tap),
 *   - `aria-hidden` (decorative — not announced),
 *   - a pulsing halo layer behind the dot carrying the
 *     `animate-user-location-halo` utility (static under reduced motion via the
 *     CSS media query — jsdom does not run CSS animations, so we assert the
 *     class the media query keys off, not a computed animation).
 *
 * Deterministic DOM/style assertions only.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserPin } from '@/components/custom/map/UserPin';

describe('Story 9.5 / 11.5 AC2 — <UserPin />', () => {
  it('renders an aria-hidden, non-interactive 24x24 amber dot (Story 11.5 scaled up)', () => {
    render(<UserPin />);
    const pin = screen.getByTestId('user-location-pin');

    expect(pin).toHaveAttribute('aria-hidden', 'true');
    expect(pin.style.pointerEvents).toBe('none');
    // Story 11.5 AC2: noticeably larger than the previous 18px so it is
    // clearly distinguishable from venue pins at all zooms.
    expect(pin.style.width).toBe('24px');
    expect(pin.style.height).toBe('24px');
  });

  it('paints the tokenized amber fill with a white ring on the dot layer', () => {
    render(<UserPin />);
    const pin = screen.getByTestId('user-location-pin');
    // Two absolutely-positioned children: [0] halo, [1] the dot.
    const dot = pin.children[pin.children.length - 1] as HTMLElement;

    // Story 11.5 (R-016): the fill routes through the design token, so no raw
    // `#d97706` remains in the component. jsdom does not resolve `var(...)` to
    // rgb — assert the token reference the source now emits.
    expect(dot.style.background).toBe('var(--color-amber-location-dot)');
    // jsdom normalises the `#fff` border colour to rgb.
    expect(dot.style.border).toBe('3px solid rgb(255, 255, 255)');
    expect(dot.style.borderRadius).toBe('50%');
  });

  it('renders a soft radial halo that carries the pulsing-halo utility (static under reduced motion)', () => {
    render(<UserPin />);
    const pin = screen.getByTestId('user-location-pin');
    const halo = pin.children[0] as HTMLElement;

    expect(halo).toHaveAttribute('data-testid', 'user-location-halo');
    expect(halo.style.background).toContain('radial-gradient');
    expect(halo.style.pointerEvents).toBe('none');
    // The pulse is a global CSS @utility/@keyframes; the reduced-motion media
    // query in globals.css pins THIS class to a static resting halo. Assert
    // the class the CSS keys off (jsdom does not run CSS animations).
    expect(halo).toHaveClass('animate-user-location-halo');
  });

  it('never leaves a raw #d97706 literal in the component source (R-016 token guard)', async () => {
    // Guards the SOURCE so a future edit cannot reintroduce the raw hex the
    // Story-9.5 token gap left behind — the fill must stay tokenized.
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const source = readFileSync(
      join(process.cwd(), 'components', 'custom', 'map', 'UserPin.tsx'),
      'utf8',
    );
    // Strip comments so the doc-comment's historical mention of the hex does
    // not mask an executable literal.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(code).not.toContain('#d97706');
  });
});
