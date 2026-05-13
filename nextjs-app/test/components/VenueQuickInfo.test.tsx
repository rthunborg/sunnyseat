import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { VenueQuickInfo } from '@/components/composed/venue/VenueQuickInfo';

vi.mock('motion/react', async () => {
  const React = await import('react');
  type DivProps = React.HTMLAttributes<HTMLElement> & Record<string, unknown>;
  const motionAside = ({ children, ...props }: DivProps) => {
    const {
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...rest
    } = props;
    return React.createElement('aside', rest, children);
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
    useReducedMotion: () => false,
  };
});

const labels = {
  route: 'Visa Rutt',
  moreInfo: 'Mer Info',
  close: 'Stäng platskort',
  photoPlaceholder: 'Platshållarbild',
  confidence: 'Säkerhet',
  distance: 'Avstånd',
  loadingSun: 'Laddar soldata',
  sunUnavailable: 'Soltid saknas',
};

describe('<VenueQuickInfo />', () => {
  it('renders venue summary content and exposes the route CTA', () => {
    render(
      <VenueQuickInfo
        mode="mobile"
        name="Testbaren"
        sunTimeRange="Sol 13:00–18:30"
        confidencePercent={92}
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
    expect(screen.getAllByText(/92/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Visa Rutt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mer Info' })).toBeInTheDocument();
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
