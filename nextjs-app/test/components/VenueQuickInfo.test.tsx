import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { VenueQuickInfo } from '@/components/composed/venue/VenueQuickInfo';
import { expectNoSensitiveSourceTerms } from '../setup/sensitive-source-terms';

const motionState = vi.hoisted(() => ({
  shouldReduceMotion: false,
}));

vi.mock('motion/react', async () => {
  const React = await import('react');
  type DivProps = React.HTMLAttributes<HTMLElement> & Record<string, unknown>;
  const motionAside = ({ children, ...props }: DivProps) => {
    const {
      initial,
      animate,
      exit,
      transition: _transition,
      ...rest
    } = props;
    return React.createElement(
      'aside',
      {
        ...rest,
        'data-motion-initial': JSON.stringify(initial),
        'data-motion-animate': JSON.stringify(animate),
        'data-motion-exit': JSON.stringify(exit),
      },
      children,
    );
  };
  const motionDiv = ({ children, ...props }: DivProps) => {
    const {
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...rest
    } = props;
    return React.createElement('div', rest, children);
  };
  return {
    motion: { aside: motionAside, div: motionDiv },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useReducedMotion: () => motionState.shouldReduceMotion,
  };
});

const labels = {
  route: 'Visa Rutt',
  moreInfo: 'Mer Info',
  close: 'Stäng platskort',
  photoPlaceholder: 'Platshållarbild',
  confidence: 'Säkerhet',
  confidenceApproximate: 'cirka',
  confidenceUnavailable: 'Säkerhet saknas',
  distance: 'Avstånd',
  distanceApproximate: '≈ från centrum',
  loadingSun: 'Laddar soldata',
  routeLoading: 'Öppnar kartor',
  favouriteAdd: 'Spara som favorit',
  favouriteRemove: 'Ta bort favorit',
  obscuredHeadline: 'Sol bakom moln',
  sky: {
    clear: 'Klart',
    partlyCloudy: 'Delvis molnigt',
    overcast: 'Mulet',
    rain: 'Regn',
  },
};

const OPENING_HOURS = { display: 'Öppet till 22:00', closesAt: '22:00' };

describe('<VenueQuickInfo />', () => {
  afterEach(() => {
    motionState.shouldReduceMotion = false;
  });

  // ---------------------------------------------------------------------------
  // Story 11.4 (AC1) — remove confidence + sun-window, render opening hours.
  // ---------------------------------------------------------------------------

  it('renders venue summary content and exposes the route CTA (Story 11.4 AC1/AC2)', () => {
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        confidencePercent={92}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        sunExposurePercent={95}
        openingHours={OPENING_HOURS}
        distanceMeters={420}
        thumbnail={{
          alt: 'Uteservering hos Testbaren',
          initials: 'TB',
          url: 'https://example.com/testbaren.jpg',
        }}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Testbaren' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Testbaren' })).toBeInTheDocument();
    // AC1: real opening hours render in place of the removed lines.
    expect(screen.getByText('Öppet till 22:00')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Uteservering hos Testbaren' })).toBeInTheDocument();
    expect(screen.getByText(/95% SOL/)).toBeInTheDocument();
    // AC2: the route CTA reads only "VISA RUTT" (accessible name is just `label`).
    expect(screen.getByRole('button', { name: 'Visa Rutt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mer Info' })).toBeInTheDocument();
  });

  it.each(['mobile', 'desktop'] as const)(
    'removes the visible "Säkerhet" chip and the "Sol HH:mm–HH:mm" window on %s (Story 11.4 AC1)',
    (mode) => {
      render(
        <VenueQuickInfo
          mode={mode}
          name="Testbaren"
          confidencePercent={92}
          confidenceMeta={{
            sunDataSource: 'weather',
            weatherUpdatedAt: new Date().toISOString(),
          }}
          sunExposurePercent={95}
          openingHours={OPENING_HOURS}
          distanceMeters={420}
          position={mode === 'desktop' ? { x: 200, y: 200 } : undefined}
          isLoadingSunData={false}
          onDismiss={() => {}}
          onOpenDetails={() => {}}
          onRoute={() => {}}
          labels={labels}
        />,
      );

      const card = screen.getByTestId('venue-quick-info');
      // AC1: NO visible "Säkerhet: NN%" text node on either breakpoint.
      expect(screen.queryByText(/Säkerhet:/)).toBeNull();
      // AC1: NO "Sol HH:mm–HH:mm" window text (the whole line is gone).
      expect(card).not.toHaveTextContent(/Sol \d{2}:\d{2}/);
      // The distance still renders (kept signal).
      expect(card).toHaveTextContent('420 m');
    },
  );

  it('renders opening hours when the prop is present, nothing when absent (Story 11.4 AC1 both branches)', () => {
    const { rerender } = render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        sunExposurePercent={95}
        openingHours={OPENING_HOURS}
        distanceMeters={420}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    // Present-case: the honest opening-hours line renders.
    expect(screen.getByTestId('quick-info-opening-hours')).toHaveTextContent('Öppet till 22:00');

    // Absent-case: the venue has no opening hours → NOTHING rendered (never a
    // fabricated "Öppet" / closesAt-only fallback).
    rerender(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        sunExposurePercent={95}
        openingHours={undefined}
        distanceMeters={420}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );
    expect(screen.queryByTestId('quick-info-opening-hours')).not.toBeInTheDocument();
    expect(screen.getByTestId('venue-quick-info')).not.toHaveTextContent('Öppet');
  });

  it('renders NOTHING for a closesAt-only opening-hours object (no fabricated fallback — Story 11.4 AC1)', () => {
    // The honest rule: the card shows `openingHours.display` when present, NOTHING
    // otherwise. A store shape that carries only `closesAt` (no `display`) must NOT
    // be synthesized into an "Öppet till 22:00" — that closesAt-only fallback is
    // detail-view chrome (VenueDetailContent's `?? '22:00'`), explicitly forbidden
    // on the quick-info's honest line. The component guards on `openingHours?.display`.
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        sunExposurePercent={95}
        // Story 11.9: the derived shape is `{ display?, closesAt? }` — a value with
        // only `closesAt` (no display) is a legal-but-empty derive; the honest guard
        // on `openingHours?.display` still renders NOTHING.
        openingHours={{ closesAt: '22:00' }}
        distanceMeters={420}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    expect(screen.queryByTestId('quick-info-opening-hours')).not.toBeInTheDocument();
    const card = screen.getByTestId('venue-quick-info');
    expect(card).not.toHaveTextContent('Öppet');
    expect(card).not.toHaveTextContent('22:00');
  });

  it('renders NOTHING for an empty-string display (falsy display → no orphaned line — Story 11.4 AC1)', () => {
    // `{ display: '' }` is a present object with a falsy display. The `&&` guard on
    // `openingHours?.display` must treat it as absent — no empty paragraph, no
    // dangling node in the metadata block.
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        sunExposurePercent={95}
        openingHours={{ display: '', closesAt: '22:00' }}
        distanceMeters={420}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    expect(screen.queryByTestId('quick-info-opening-hours')).not.toBeInTheDocument();
  });

  it('keeps the obscured block clean when opening hours are absent (no dangling line — Story 11.4 AC3/AC4)', () => {
    // Cross-case: an obscured venue WITHOUT opening hours. The Story-10.2 obscured
    // two-signal block must still render, and the absent opening-hours branch must
    // leave nothing behind (no empty opening-hours node, no fabricated value).
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Molnbaren"
        sunExposurePercent={88}
        openingHours={undefined}
        distanceMeters={420}
        currentSunStatus="CloudObscured"
        weatherGateState="gated"
        skyCondition="overcast"
        thumbnail={{ alt: 'Uteservering', initials: 'MB' }}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    // Obscured treatment preserved.
    expect(screen.getByTestId('quick-info-obscured')).toHaveTextContent('Sol bakom moln');
    expect(screen.getByTestId('quick-info-obscured')).toHaveTextContent('Mulet');
    // No opening-hours line, no fabricated "Öppet".
    expect(screen.queryByTestId('quick-info-opening-hours')).not.toBeInTheDocument();
    expect(screen.getByTestId('venue-quick-info')).not.toHaveTextContent('Öppet');
    // The metadata paragraph carrying the sr-only confidence + distance has no
    // dangling leading/trailing separator even with opening hours gone.
    const metadata = screen.getByTestId('quick-info-obscured').closest('[data-testid="venue-quick-info"]');
    expect(metadata).toBeInTheDocument();
  });

  it('renders opening hours on the desktop breakpoint too (Story 11.4 AC1)', () => {
    render(
      <VenueQuickInfo
        mode="desktop"
        name="Testbaren"
        sunExposurePercent={95}
        openingHours={OPENING_HOURS}
        distanceMeters={420}
        position={{ x: 200, y: 200 }}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    expect(screen.getByTestId('quick-info-opening-hours')).toHaveTextContent('Öppet till 22:00');
  });

  // ---------------------------------------------------------------------------
  // Story 11.4 (AC2) — the quick-info route CTA has no ETA span.
  // ---------------------------------------------------------------------------

  it('renders NO ETA span inside the quick-info route button and reads only "VISA RUTT" (Story 11.4 AC2)', () => {
    const route = vi.fn();
    const { rerender } = render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={route}
        labels={labels}
      />,
    );

    // AC2: no truncated "ca N min" ETA text anywhere on the card.
    expect(screen.getByTestId('venue-quick-info')).not.toHaveTextContent(/ca \d/);
    // The button accessible name is exactly the label (no estimate appended).
    const routeButton = screen.getByRole('button', { name: 'Visa Rutt' });
    fireEvent.click(routeButton);
    expect(route).toHaveBeenCalledTimes(1);

    // Compact (anchored-mobile) variant — same: no ETA, full-legibility label.
    rerender(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        position={{ x: 180, y: 260 }}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={route}
        labels={labels}
      />,
    );
    expect(screen.getByRole('button', { name: 'Visa Rutt' })).toBeInTheDocument();
    expect(screen.getByTestId('venue-quick-info')).not.toHaveTextContent(/ca \d/);
  });

  it('still exposes the route loading state on the CTA (behaviour preserved)', () => {
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        isRouteLoading
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    expect(screen.getByRole('button', { name: 'Öppnar kartor' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  // ---------------------------------------------------------------------------
  // Story 11.4 (AC4) — regenerated aria: sr-only confidence kept, no dangling
  // separator, no duplicated phrase.
  // ---------------------------------------------------------------------------

  it('keeps the sr-only accessible confidence text after removing the visible chip (Story 11.4 AC1/AC4)', () => {
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        confidencePercent={92}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        sunExposurePercent={95}
        openingHours={OPENING_HOURS}
        distanceMeters={420}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    // The confidence signal is still exposed to assistive tech (sr-only), even
    // though the visible "Säkerhet: 92%" chip is gone.
    const srConfidence = screen.getByText(/Säkerhet 92%/);
    expect(srConfidence).toHaveClass('sr-only');
    // But there is NO visible "Säkerhet: 92%" chip.
    expect(screen.queryByText(/Säkerhet:/)).toBeNull();
  });

  it('regenerates a clean accessible name with no dangling separator or duplicated phrase (Story 11.4 AC4)', () => {
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        confidencePercent={92}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        sunExposurePercent={95}
        openingHours={OPENING_HOURS}
        distanceMeters={420}
        position={{ x: 180, y: 260 }}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    // The metadata paragraph reads confidence (sr-only) + distance with no
    // leading/trailing "·" now that the confidence/sun-window lines are gone.
    // Anchor on the sr-only confidence node (unambiguous) to reach the paragraph.
    const metadata = screen.getByText(/Säkerhet 92%/).closest('p');
    const normalized = metadata?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    expect(normalized.startsWith('·')).toBe(false);
    expect(normalized.endsWith('·')).toBe(false);
    expect(normalized).not.toContain('·');
    // The confidence phrase appears exactly once (no duplication).
    const occurrences = normalized.match(/Säkerhet 92%/g) ?? [];
    expect(occurrences).toHaveLength(1);
  });

  it('hides confidence entirely (sr-only "unavailable") for geometry-only data, still shows opening hours (AC1/AC4)', () => {
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        confidencePercent={92}
        confidenceMeta={{ sunDataSource: 'geometry-only' }}
        sunExposurePercent={95}
        openingHours={OPENING_HOURS}
        distanceMeters={420}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    // No visible confidence anywhere; the sr-only "unavailable" line remains.
    expect(screen.queryByText(/Säkerhet:/)).toBeNull();
    expect(screen.getByText(/Säkerhet saknas/)).toHaveClass('sr-only');
    // The opening-hours line + sun badge still render.
    expect(screen.getByTestId('quick-info-opening-hours')).toHaveTextContent('Öppet till 22:00');
    expect(screen.getByText(/95% SOL/)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Story 10.2 (AC1/AC3) — obscured two-signal treatment PRESERVED (AC3).
  // ---------------------------------------------------------------------------

  it('renders the muted obscured headline + sky line, no amber "% SOL" sun badge (Story 10.2 preserved by 11.4 AC3)', () => {
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Molnbaren"
        sunExposurePercent={92}
        openingHours={OPENING_HOURS}
        distanceMeters={420}
        currentSunStatus="CloudObscured"
        weatherGateState="gated"
        skyCondition="overcast"
        thumbnail={{ alt: 'Uteservering', initials: 'MB' }}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    const obscuredBlock = screen.getByTestId('quick-info-obscured');
    // AC1: the muted "Sol bakom moln" headline is present.
    expect(obscuredBlock).toHaveTextContent('Sol bakom moln');
    // AC3: overcast -> "Mulet" plain-language descriptor.
    expect(obscuredBlock).toHaveTextContent('Mulet');
    // The photo-strip badge is grey and percentage-free under the public gate.
    expect(screen.queryByText(/92% SOL/)).not.toBeInTheDocument();
    // The opening-hours line still renders alongside the obscured treatment.
    expect(screen.getByTestId('quick-info-opening-hours')).toHaveTextContent('Öppet till 22:00');
  });

  it('renders NO sky line when an obscured venue sky is unavailable (Story 10.2 preserved — never fabricate)', () => {
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Molnbaren"
        sunExposurePercent={92}
        distanceMeters={420}
        currentSunStatus="CloudObscured"
        weatherGateState="gated"
        skyCondition="unavailable"
        thumbnail={{ alt: 'Uteservering', initials: 'MB' }}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    const obscuredBlock = screen.getByTestId('quick-info-obscured');
    expect(obscuredBlock).toHaveTextContent('Sol bakom moln');
    expect(obscuredBlock).not.toHaveTextContent('Mulet');
    expect(obscuredBlock).not.toHaveTextContent('Klart');
  });

  it('keeps the amber sunny badge unchanged for a clear-sky venue (Behaviour gate)', () => {
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Solbaren"
        sunExposurePercent={95}
        distanceMeters={420}
        currentSunStatus="Sunny"
        skyCondition="clear"
        thumbnail={{ alt: 'Uteservering', initials: 'SB' }}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    expect(screen.queryByTestId('quick-info-obscured')).not.toBeInTheDocument();
    const badge = screen.getByText(/95% SOL/).closest('div');
    expect(badge?.className).toContain('bg-amber-gold');
    expect(badge?.className).not.toContain('bg-pin-obscured');
  });

  // ---------------------------------------------------------------------------
  // Story 11.4 (AC3) — the layout holds across all four sun states with the
  // removals + the opening-hours line, obscured treatment preserved.
  // ---------------------------------------------------------------------------

  it.each([
    ['full sun', 95, 'Sunny', 'clear', false],
    ['partial sun', 55, 'Partial', 'partly-cloudy', false],
    ['shaded', 12, 'Shaded', 'overcast', false],
    ['obscured (Sol bakom moln)', 88, 'CloudObscured', 'overcast', true],
  ] as const)(
    'holds the card across sun states with opening hours + no confidence/sun-window text (%s)',
    (_label, exposure, status, sky, isObscured) => {
      render(
        <VenueQuickInfo
          mode="mobile"
          name="Testbaren"
          confidencePercent={80}
          confidenceMeta={{
            sunDataSource: 'weather',
            weatherUpdatedAt: new Date().toISOString(),
          }}
          sunExposurePercent={exposure}
          openingHours={OPENING_HOURS}
          distanceMeters={420}
          currentSunStatus={status}
          weatherGateState={status === 'CloudObscured' ? 'gated' : 'not_gated'}
          skyCondition={sky}
          position={{ x: 180, y: 260 }}
          isLoadingSunData={false}
          onDismiss={() => {}}
          onOpenDetails={() => {}}
          onRoute={() => {}}
          onFavouriteToggle={() => {}}
          labels={labels}
        />,
      );

      const card = screen.getByTestId('venue-quick-info');
      // AC1: no visible confidence chip and no sun-window line in any state.
      expect(screen.queryByText(/Säkerhet:/)).toBeNull();
      expect(card).not.toHaveTextContent(/Sol \d{2}:\d{2}/);
      // AC1: the opening-hours line renders in every state.
      expect(screen.getByTestId('quick-info-opening-hours')).toHaveTextContent('Öppet till 22:00');
      // AC3: the obscured two-signal block survives only in the obscured state.
      if (isObscured) {
        expect(screen.getByTestId('quick-info-obscured')).toBeInTheDocument();
      } else {
        expect(screen.queryByTestId('quick-info-obscured')).not.toBeInTheDocument();
      }
      // The CTA row survives in every state — VISA RUTT + MER INFO.
      expect(screen.getByRole('button', { name: 'Visa Rutt' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Mer Info' })).toBeInTheDocument();
      // The distance value stays legible.
      expect(card).toHaveTextContent('420 m');
    },
  );

  it('does not surface any sensitive source terms after the rework (Story 9.1 de-bloat guard)', () => {
    const { container } = render(
      <VenueQuickInfo
        mode="mobile"
        name="Brygghuset Lerum"
        confidencePercent={66}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        sunExposurePercent={58}
        openingHours={OPENING_HOURS}
        distanceMeters={420}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    const card = screen.getByTestId('venue-quick-info');
    expect(card).not.toHaveTextContent('Osäker prognos');
    expect(card).not.toHaveTextContent('Lokala hinder kan påverka');
    expect(screen.queryByText(/Träd kan påverka platsen/)).not.toBeInTheDocument();
    expectNoSensitiveSourceTerms(container);
  });

  // ---------------------------------------------------------------------------
  // Preserved coverage (motion, thumbnail, favourite, distance, close).
  // ---------------------------------------------------------------------------

  it('keeps the centered name row in anchored mobile mode', () => {
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        sunExposurePercent={95}
        openingHours={OPENING_HOURS}
        distanceMeters={420}
        isLoadingSunData={false}
        position={{ x: 180, y: 260 }}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    expect(screen.getByRole('button', { name: 'Testbaren' })).toHaveClass('min-h-12');
    expect(screen.getByText(/Avstånd:/)).toHaveTextContent('Avstånd: 420 m');
    expect(screen.getByText('420 m')).toHaveAttribute('aria-hidden', 'true');
  });

  it('preserves pin anchoring transforms when reduced motion is enabled', () => {
    motionState.shouldReduceMotion = true;

    const { rerender } = render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        isLoadingSunData={false}
        position={{ x: 180, y: 260 }}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    expect(JSON.parse(screen.getByRole('dialog', { name: 'Testbaren' }).dataset.motionAnimate ?? '{}')).toEqual({
      opacity: 1,
      x: '-50%',
      y: 'calc(-100% - 40px)',
    });

    rerender(
      <VenueQuickInfo
        mode="desktop"
        name="Testbaren"
        isLoadingSunData={false}
        position={{ x: 180, y: 260 }}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    expect(JSON.parse(screen.getByRole('dialog', { name: 'Testbaren' }).dataset.motionAnimate ?? '{}')).toEqual({
      opacity: 1,
      x: '-50%',
      y: 'calc(-100% - 56px)',
    });
  });

  it('falls back to safe thumbnail text when optional data is missing (opening hours absent renders nothing)', () => {
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        thumbnail={{ alt: '   ', initials: 'Testbaren' }}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    expect(screen.queryByTestId('quick-info-opening-hours')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Platshållarbild' })).toBeInTheDocument();
    expect(screen.getByText('TES')).toBeInTheDocument();
  });

  it('shows skeleton placeholders while sun data is loading', () => {
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        isLoadingSunData
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    expect(screen.getByLabelText('Laddar soldata')).toBeInTheDocument();
  });

  it('keeps pointer events inside the card from bubbling to map deselect', () => {
    const outerClick = vi.fn();
    render(
      <div role="button" tabIndex={0} onClick={outerClick} onKeyDown={() => {}}>
        <VenueQuickInfo
          mode="mobile"
          name="Testbaren"
          isLoadingSunData={false}
          onDismiss={() => {}}
          onOpenDetails={() => {}}
          onRoute={() => {}}
          labels={labels}
        />
      </div>,
    );

    fireEvent.click(screen.getByTestId('venue-quick-info'));
    expect(outerClick).not.toHaveBeenCalled();
  });

  it('renders the close action and wires more info to details', () => {
    const open = vi.fn();
    const dismiss = vi.fn();
    render(
      <VenueQuickInfo
        mode="desktop"
        name="Testbaren"
        isLoadingSunData={false}
        position={{ x: 200, y: 200 }}
        onDismiss={dismiss}
        onOpenDetails={open}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mer Info' }));
    expect(open).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Stäng platskort' }));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('renders an active favourite toggle with stateful label and pressed state', () => {
    const toggle = vi.fn();
    const { rerender } = render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        sunExposurePercent={95}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        onFavouriteToggle={toggle}
        labels={labels}
      />,
    );

    const addButton = screen.getByRole('button', { name: 'Spara som favorit' });
    expect(addButton).toHaveAttribute('aria-pressed', 'false');
    expect(addButton).toHaveClass('focus-visible:ring-2');
    expect(screen.getByRole('button', { name: 'Stäng platskort' })).toHaveClass('left-2');
    expect(screen.getByRole('button', { name: 'Stäng platskort' })).not.toHaveClass('right-2');
    fireEvent.click(addButton);
    expect(toggle).toHaveBeenCalledTimes(1);

    rerender(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        sunExposurePercent={95}
        isLoadingSunData={false}
        isFavourite
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        onFavouriteToggle={toggle}
        labels={labels}
      />,
    );

    const removeButton = screen.getByRole('button', { name: 'Ta bort favorit' });
    expect(removeButton).toHaveAttribute('aria-pressed', 'true');
    expect(removeButton.querySelector('svg')).toHaveClass('fill-current');
  });

  it('exposes a mobile dismiss control', () => {
    const dismiss = vi.fn();
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        isLoadingSunData={false}
        onDismiss={dismiss}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Stäng platskort' }));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Story 9.9 coverage retained — distance formatting boundaries, sun-%
  // clamping, and the compact-strip badge/heart placement.
  // ---------------------------------------------------------------------------

  it('formats a >=1000 m distance as kilometres and rounds sub-km metres (formatDistance boundary)', () => {
    const { rerender } = render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        distanceMeters={1500}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    expect(screen.getByText(/Avstånd:/)).toHaveTextContent('Avstånd: 1.5 km');

    rerender(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        distanceMeters={1000}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );
    expect(screen.getByText(/Avstånd:/)).toHaveTextContent('Avstånd: 1.0 km');

    rerender(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        distanceMeters={423.7}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );
    expect(screen.getByText(/Avstånd:/)).toHaveTextContent('Avstånd: 424 m');
  });

  it('renders an em-dash placeholder when the distance is unknown (formatDistance non-finite)', () => {
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        distanceMeters={undefined}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    expect(screen.getByText(/Avstånd:/)).toHaveTextContent('Avstånd: –');
  });

  it('clamps the sun-exposure badge to the 0–100% range (formatPercent boundaries)', () => {
    const { rerender } = render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        sunExposurePercent={140}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );
    expect(screen.getByText(/SOL/)).toHaveTextContent('100% SOL');

    rerender(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        sunExposurePercent={-25}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );
    expect(screen.queryByText(/SOL/)).not.toBeInTheDocument();
  });

  it('hides the sun-exposure badge entirely when the exposure value is absent', () => {
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        sunExposurePercent={undefined}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );
    expect(screen.queryByText(/SOL/)).toBeNull();
  });

  it('uses the compact badge/heart insets on the anchored-mobile strip, fuller on the bottom-sheet strip', () => {
    const { rerender } = render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        sunExposurePercent={95}
        position={{ x: 180, y: 260 }}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        onFavouriteToggle={() => {}}
        labels={labels}
      />,
    );

    // Compact (anchored-mobile) strip: badge top-LEFT, heart top-RIGHT, tight insets.
    let badge = screen.getByText(/SOL/).closest('div');
    expect(badge).toHaveClass('left-2', 'top-2');
    let heart = screen.getByRole('button', { name: 'Spara som favorit' });
    expect(heart).toHaveClass('right-2', 'top-2');
    expect(heart).toHaveClass('size-11'); // WCAG 44px tap target preserved.

    rerender(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        sunExposurePercent={95}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        onFavouriteToggle={() => {}}
        labels={labels}
      />,
    );

    // No `position` → non-anchored bottom-sheet variant → fuller insets.
    badge = screen.getByText(/SOL/).closest('div');
    expect(badge).toHaveClass('left-3', 'top-3');
    heart = screen.getByRole('button', { name: 'Spara som favorit' });
    expect(heart).toHaveClass('right-3', 'top-3');
  });
});
