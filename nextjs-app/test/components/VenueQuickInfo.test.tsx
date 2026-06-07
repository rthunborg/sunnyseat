import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { VenueQuickInfo } from '@/components/composed/venue/VenueQuickInfo';
import type { PredictionUncertaintyDisplayLabels } from '@/lib/utils/prediction-uncertainty-display';
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
  loadingSun: 'Laddar soldata',
  sunUnavailable: 'Soltid saknas',
  favouriteAdd: 'Spara som favorit',
  favouriteRemove: 'Ta bort favorit',
};

const uncertaintyLabels: PredictionUncertaintyDisplayLabels = {
  description:
    'Vi räknar på solens läge, byggnadsskuggor och väder. Träd, markiser, parasoller, broar och tillfälliga konstruktioner kan påverka platsen.',
  accessible: '{label}. {description}',
  levels: {
    low: 'Låg osäkerhet',
    medium: 'Osäker prognos',
    high: 'Mer osäker prognos',
  },
  short: {
    building_shadow_coverage: 'Byggnadsskuggor mer osäkra',
    obstruction: 'Lokala hinder kan påverka',
    weather: 'Vädret gör prognosen osäkrare',
    other: 'Lokala förhållanden kan påverka',
  },
  reasons: {
    building_shadow_coverage: 'Byggnadsskuggorna är beräknade med begränsad täckning här.',
    vegetation: 'Träd kan påverka platsen.',
    awning: 'Markiser kan påverka platsen.',
    umbrella: 'Parasoller kan påverka platsen.',
    bridge: 'Broar kan påverka platsen.',
    temporary_structure: 'Tillfälliga konstruktioner kan påverka platsen.',
    seasonal_furniture: 'Säsongsmöbler kan påverka platsen.',
    weather: 'Vädret gör prognosen mer osäker.',
    other: 'Lokala förhållanden kan påverka platsen.',
  },
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

  it('renders uncertainty text for the selected map surface', () => {
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
        predictionUncertainty={{
          level: 'medium',
          reasons: ['vegetation', 'source_layer' as never, 'awning', 'seasonal_furniture'],
        }}
        sunExposurePercent={58}
        distanceMeters={420}
        isLoadingSunData={false}
        onDismiss={() => {}}
        onOpenDetails={() => {}}
        onRoute={() => {}}
        labels={{ ...labels, uncertainty: uncertaintyLabels }}
      />,
    );

    expect(screen.getByTestId('venue-quick-info')).toHaveTextContent('Osäker prognos');
    expect(screen.getByTestId('venue-quick-info')).toHaveTextContent('Lokala hinder kan påverka');
    expect(screen.getByText(/Träd kan påverka platsen/)).toHaveClass('sr-only');
    expectNoSensitiveSourceTerms(container);
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
});
