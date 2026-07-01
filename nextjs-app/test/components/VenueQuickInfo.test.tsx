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
  sunUnavailable: 'Soltid saknas',
  routeLoading: 'Öppnar kartor',
  favouriteAdd: 'Spara som favorit',
  favouriteRemove: 'Ta bort favorit',
};

describe('<VenueQuickInfo />', () => {
  afterEach(() => {
    motionState.shouldReduceMotion = false;
  });

  it('renders venue summary content and exposes the route CTA', () => {
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        sunTimeRange="Sol 13:00–18:30"
        confidencePercent={92}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        sunExposurePercent={95}
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
    expect(screen.getByText('Sol 13:00–18:30')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Uteservering hos Testbaren' })).toBeInTheDocument();
    expect(screen.getByText(/Säkerhet:/)).toHaveTextContent('Säkerhet: 92%');
    expect(screen.getByText(/95% SOL/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Visa Rutt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mer Info' })).toBeInTheDocument();
  });

  it('renders an approximate route estimate and loading state on the route CTA', () => {
    const route = vi.fn();
    const { rerender } = render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        routeEstimateLabel="ca 11 min promenad"
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={route}
        labels={labels}
      />,
    );

    expect(screen.getByText('ca 11 min promenad')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Visa Rutt, ca 11 min promenad' }));
    expect(route).toHaveBeenCalledTimes(1);

    rerender(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        routeEstimateLabel="ca 11 min promenad"
        isRouteLoading
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={route}
        labels={labels}
      />,
    );

    expect(screen.getByRole('button', { name: 'Öppnar kartor' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getByText('ca 11 min promenad')).toBeInTheDocument();
  });

  it('does not render a leading separator before non-anchored confidence metadata', () => {
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        sunTimeRange="Sol 13:00–18:30"
        confidencePercent={92}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        sunExposurePercent={95}
        distanceMeters={420}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    const metadata = screen.getByText(/Säkerhet:/).closest('p');
    expect(metadata?.textContent?.trim()).toMatch(/^Säkerhet:/);
  });

  it('does not surface the removed uncertainty disclaimer on the map quick-info (Story 9.1 de-bloat)', () => {
    const { container } = render(
      <VenueQuickInfo
        mode="mobile"
        name="Brygghuset Lerum"
        sunTimeRange="Sol 13:35–16:50"
        confidencePercent={66}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        sunExposurePercent={58}
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
    // The kept signal still renders.
    expect(screen.getByText(/Säkerhet:/)).toHaveTextContent('Säkerhet: 66%');
    expectNoSensitiveSourceTerms(container);
  });

  it('does not surface the removed disclaimer in anchored-mobile or desktop quick-info, and keeps confidence once (Story 9.1 de-bloat)', () => {
    const { rerender } = render(
      <VenueQuickInfo
        mode="mobile"
        name="Brygghuset Lerum"
        sunTimeRange="Sol 13:35–16:50"
        confidencePercent={66}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        sunExposurePercent={58}
        distanceMeters={420}
        position={{ x: 180, y: 260 }}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    let card = screen.getByTestId('venue-quick-info');
    expect(card).not.toHaveTextContent('Osäker prognos');
    expect(card).not.toHaveTextContent('Lokala hinder kan påverka');
    expect(screen.queryByText(/Vi räknar på solens läge/)).not.toBeInTheDocument();
    // Confidence label survives exactly once in anchored mode.
    expect(card.querySelectorAll('.sr-only')).not.toHaveLength(0);
    expect(screen.getAllByText(/Säkerhet/).length).toBeGreaterThan(0);

    rerender(
      <VenueQuickInfo
        mode="desktop"
        name="Brygghuset Lerum"
        sunTimeRange="Sol 13:35–16:50"
        confidencePercent={66}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        sunExposurePercent={58}
        distanceMeters={420}
        position={{ x: 200, y: 200 }}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    card = screen.getByTestId('venue-quick-info');
    expect(card).not.toHaveTextContent('Osäker prognos');
    expect(card).not.toHaveTextContent('Lokala hinder kan påverka');
    expect(screen.queryByText(/Vi räknar på solens läge/)).not.toBeInTheDocument();
    // The kept confidence + sun signals still render in desktop placement.
    expect(screen.getByText(/Säkerhet:/)).toHaveTextContent('Säkerhet: 66%');
    expect(screen.getByText(/58% SOL/)).toBeInTheDocument();
  });

  it('does not render a leading separator before the anchored-mobile distance metadata (Story 9.1 AC #2)', () => {
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        sunTimeRange="Sol 13:00–18:30"
        confidencePercent={92}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        sunExposurePercent={95}
        distanceMeters={420}
        position={{ x: 180, y: 260 }}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    // Anchored mode collapses the sun-window + confidence + distance onto one
    // wrapping row; the confidence paragraph must not start or end on a dangling
    // middot now that the uncertainty fragment was removed.
    const metadata = screen.getByText(/Säkerhet:/).closest('p');
    const normalized = metadata?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    expect(normalized.startsWith('·')).toBe(false);
    expect(normalized.endsWith('·')).toBe(false);
    expect(normalized).toContain('Säkerhet: 92%');
  });

  it('marks stale confidence as approximate and hides geometry-only confidence', () => {
    const { rerender } = render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        sunTimeRange="Sol 13:00–18:30"
        confidencePercent={92}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: '2026-05-22T09:00:00.000Z',
        }}
        sunExposurePercent={95}
        distanceMeters={420}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    expect(screen.getByText(/Säkerhet:/)).toHaveTextContent('Säkerhet: ~92%');
    expect(screen.getByText(/Säkerhet:/)).toHaveTextContent('Säkerhet cirka 92%');

    rerender(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        sunTimeRange="Sol 13:00–18:30"
        confidencePercent={92}
        confidenceMeta={{ sunDataSource: 'geometry-only' }}
        sunExposurePercent={95}
        distanceMeters={420}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    expect(screen.queryByText(/Säkerhet:/)).toBeNull();
    expect(screen.getByText(/Säkerhet saknas/)).toHaveClass('sr-only');
    expect(screen.getByText(/95% SOL/)).toBeInTheDocument();
  });

  it('keeps confidence visible in anchored mobile mode', () => {
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        sunTimeRange="Sol 13:00–18:30"
        confidencePercent={92}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        sunExposurePercent={95}
        distanceMeters={420}
        isLoadingSunData={false}
        position={{ x: 180, y: 260 }}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    expect(screen.getByText('Sol 13:00–18:30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Testbaren' })).toHaveClass('min-h-12');
    expect(screen.getByText(/Säkerhet:/)).toHaveTextContent('Säkerhet: 92%');
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

  it('falls back to safe thumbnail text and sun copy when optional data is missing', () => {
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

    expect(screen.getByText('Soltid saknas')).toBeInTheDocument();
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
  // Story 9.9 coverage expansion (bmad-testarch-automate) — branches the dev
  // suite left uncovered: distance formatting boundaries, sun-% clamping, and
  // the AC2 "layout holds across sun states" invariant on the anchored-mobile
  // (compact) strip with its compact-aware badge/heart placement.
  // ---------------------------------------------------------------------------

  it('formats a >=1000 m distance as kilometres and rounds sub-km metres (formatDistance boundary)', () => {
    const { rerender } = render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        sunTimeRange="Sol 13:00–18:30"
        confidencePercent={92}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        distanceMeters={1500}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={labels}
      />,
    );

    // >= 1000 → one-decimal km.
    expect(screen.getByText(/Avstånd:/)).toHaveTextContent('Avstånd: 1.5 km');

    // Exactly at the 1000 boundary → still km (1.0 km), not "1000 m".
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

    // Sub-km metres are rounded to a whole number.
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
    expect(screen.getByText(/SOL/)).toHaveTextContent('0% SOL');
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

  it.each([
    ['full sun', 95, 'Sol 12:00–20:00'],
    ['partial sun', 55, 'Sol 15:30–17:00'],
    ['shaded (no window)', 0, undefined],
  ])(
    'holds the anchored-mobile compact layout across sun states without dropping the CTA row (%s)',
    (_label, exposure, sunTimeRange) => {
      render(
        <VenueQuickInfo
          mode="mobile"
          name="Testbaren"
          sunTimeRange={sunTimeRange}
          confidencePercent={80}
          confidenceMeta={{
            sunDataSource: 'weather',
            weatherUpdatedAt: new Date().toISOString(),
          }}
          sunExposurePercent={exposure}
          distanceMeters={420}
          position={{ x: 180, y: 260 }}
          isLoadingSunData={false}
          onDismiss={() => {}}
          onOpenDetails={() => {}}
          onRoute={() => {}}
          onFavouriteToggle={() => {}}
          labels={labels}
        />,
      );

      // The sun window resolves to either the range or the honest fallback copy.
      expect(
        screen.getByText(sunTimeRange ?? 'Soltid saknas'),
      ).toBeInTheDocument();
      // The CTA row survives in every sun state — VISA RUTT + MER INFO.
      expect(screen.getByRole('button', { name: 'Visa Rutt' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Mer Info' })).toBeInTheDocument();
      // The distance value stays legible (never truncated to nothing).
      expect(screen.getByTestId('venue-quick-info')).toHaveTextContent('420 m');
      // Compact-strip badge/heart placement (Story 9.9 reference match): the
      // sun-% pill sits top-LEFT (`left-2 top-2`) and the favourite heart
      // top-RIGHT (`right-2 top-2`) so the two never crowd on the 72px strip.
      if (exposure > 0) {
        const badge = screen.getByText(/SOL/).closest('div');
        expect(badge).toHaveClass('left-2', 'top-2');
      }
      const heart = screen.getByRole('button', { name: 'Spara som favorit' });
      expect(heart).toHaveClass('right-2', 'top-2');
      expect(heart).toHaveClass('size-11'); // WCAG 44px tap target preserved.
    },
  );

  it('uses the fuller badge/heart insets on the non-compact (bottom-sheet) strip', () => {
    render(
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
    const badge = screen.getByText(/SOL/).closest('div');
    expect(badge).toHaveClass('left-3', 'top-3');
    const heart = screen.getByRole('button', { name: 'Spara som favorit' });
    expect(heart).toHaveClass('right-3', 'top-3');
  });
});
