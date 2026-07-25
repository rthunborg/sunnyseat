import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor, act } from '@/test/setup/test-utils';
import { OnboardingScreen } from '@/components/custom/onboarding/OnboardingScreen';
import enOnboarding from '@/messages/en/onboarding.json';
import svOnboarding from '@/messages/sv/onboarding.json';

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

type SuccessCallback = (position: GeolocationPosition) => void;
type ErrorCallback = (error: GeolocationPositionError) => void;

type GeolocationStub = {
  getCurrentPosition: ReturnType<typeof vi.fn>;
};

function installGeolocationStub(): GeolocationStub {
  const stub: GeolocationStub = { getCurrentPosition: vi.fn() };
  Object.defineProperty(globalThis.navigator, 'geolocation', {
    configurable: true,
    value: stub,
    writable: true,
  });
  return stub;
}

describe('<OnboardingScreen />', () => {
  let originalGeolocation: PropertyDescriptor | undefined;
  let originalLocalStorage: PropertyDescriptor | undefined;

  beforeEach(() => {
    reducedMotionMock.mockReturnValue(false);
    originalGeolocation = Object.getOwnPropertyDescriptor(
      globalThis.navigator,
      'geolocation',
    );
    originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
    // Polyfill localStorage to avoid Node 25 native localStorage interference.
    const store = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      writable: true,
      value: {
        get length() { return store.size; },
        clear: () => store.clear(),
        getItem: (key: string) => store.get(key) ?? null,
        key: (i: number) => Array.from(store.keys())[i] ?? null,
        removeItem: (key: string) => { store.delete(key); },
        setItem: (key: string, value: string) => { store.set(key, String(value)); },
      },
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    if (originalGeolocation) {
      Object.defineProperty(globalThis.navigator, 'geolocation', originalGeolocation);
    }
    if (originalLocalStorage) {
      Object.defineProperty(window, 'localStorage', originalLocalStorage);
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // The headline messages are split across an explicit `<br />` (rich
  // text) so the visual rhythm matches the prototype. Strip the markup
  // when comparing rendered text so the tests don't have to mirror the
  // ICU placeholder syntax.
  const stripBr = (s: string) => s.replace(/<br><\/br>/g, '');

  it('renders Swedish copy by default with all three CTAs and the trust microcopy', () => {
    installGeolocationStub();
    renderWithProviders(
      <OnboardingScreen onDismiss={() => {}} />,
    );
    expect(screen.getByTestId('onboarding-screen')).toBeInTheDocument();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(stripBr(svOnboarding.headline));
    expect(heading.querySelector('br')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-cta-primary')).toHaveTextContent(svOnboarding.primaryCta);
    expect(screen.getByTestId('onboarding-cta-skip')).toHaveTextContent(svOnboarding.skipLink);
    expect(screen.getByText(svOnboarding.trustMicrocopy)).toBeInTheDocument();
  });

  it('renders English copy when locale="en"', () => {
    installGeolocationStub();
    renderWithProviders(
      <OnboardingScreen onDismiss={() => {}} />,
      {
        locale: 'en',
        messages: {
          common: {},
          map: {},
          onboarding: enOnboarding as Record<string, string>,
          venue: {},
          feedback: {},
          about: {},
        },
      },
    );
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(stripBr(enOnboarding.headline));
    expect(heading.querySelector('br')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-cta-primary')).toHaveTextContent(enOnboarding.primaryCta);
  });

  it('exposes the headline as the dialog label via aria-labelledby', () => {
    installGeolocationStub();
    renderWithProviders(
      <OnboardingScreen onDismiss={() => {}} />,
    );
    const dialog = screen.getByTestId('onboarding-screen');
    const heading = screen.getByRole('heading', { level: 1 });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'onboarding-headline');
    expect(heading).toHaveAttribute('id', 'onboarding-headline');
  });

  it('skip-link click → onLocationDenied + onDismiss after fade timeout', () => {
    installGeolocationStub();
    const onDismiss = vi.fn();
    const onLocationDenied = vi.fn();
    renderWithProviders(
      <OnboardingScreen onDismiss={onDismiss} onLocationDenied={onLocationDenied} />,
    );

    fireEvent.click(screen.getByTestId('onboarding-cta-skip'));

    expect(onLocationDenied).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('onboarding-screen').dataset.phase).toBe('exiting');
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('preserves exit state across a parent rerender without duplicating the dialog', () => {
    installGeolocationStub();
    const onDismiss = vi.fn();
    const onLocationDenied = vi.fn();

    const { rerender } = renderWithProviders(
      <OnboardingScreen
        onDismiss={onDismiss}
        onLocationDenied={onLocationDenied}
      />,
    );

    fireEvent.click(screen.getByTestId('onboarding-cta-skip'));

    expect(onLocationDenied).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('onboarding-screen').dataset.phase).toBe('exiting');

    rerender(
      <OnboardingScreen
        onDismiss={onDismiss}
        onLocationDenied={onLocationDenied}
      />,
    );

    expect(screen.getAllByTestId('onboarding-screen')).toHaveLength(1);
    expect(screen.getByTestId('onboarding-screen').dataset.phase).toBe('exiting');

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('preserves primary CTA pending state across a parent rerender', () => {
    const stub = installGeolocationStub();
    stub.getCurrentPosition.mockImplementation(() => {});
    const onDismiss = vi.fn();

    const { rerender } = renderWithProviders(
      <OnboardingScreen onDismiss={onDismiss} />,
    );

    fireEvent.click(screen.getByTestId('onboarding-cta-primary'));

    expect(stub.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('onboarding-cta-primary')).toBeDisabled();
    expect(screen.getByTestId('onboarding-cta-primary')).toHaveAttribute(
      'data-pending',
      'true',
    );

    rerender(<OnboardingScreen onDismiss={onDismiss} />);

    expect(screen.getAllByTestId('onboarding-screen')).toHaveLength(1);
    expect(screen.getByTestId('onboarding-cta-primary')).toBeDisabled();
    expect(screen.getByTestId('onboarding-cta-primary')).toHaveAttribute(
      'data-pending',
      'true',
    );
    expect(stub.getCurrentPosition).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('primary CTA click on success → onLocationGranted + onDismiss after fade', async () => {
    const stub = installGeolocationStub();
    stub.getCurrentPosition.mockImplementation(
      (success: SuccessCallback) => {
        success({
          coords: {
            latitude: 57.7,
            longitude: 11.97,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      },
    );
    const onDismiss = vi.fn();
    const onLocationGranted = vi.fn();
    renderWithProviders(
      <OnboardingScreen onDismiss={onDismiss} onLocationGranted={onLocationGranted} />,
    );

    fireEvent.click(screen.getByTestId('onboarding-cta-primary'));

    await waitFor(() => {
      expect(onLocationGranted).toHaveBeenCalledWith({ lat: 57.7, lng: 11.97 });
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('primary CTA click on permission denied → onLocationDenied + onDismiss', async () => {
    const stub = installGeolocationStub();
    stub.getCurrentPosition.mockImplementation(
      (_success: SuccessCallback, error: ErrorCallback) => {
        error({
          code: 1,
          message: 'denied',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError);
      },
    );
    const onDismiss = vi.fn();
    const onLocationDenied = vi.fn();
    renderWithProviders(
      <OnboardingScreen onDismiss={onDismiss} onLocationDenied={onLocationDenied} />,
    );

    fireEvent.click(screen.getByTestId('onboarding-cta-primary'));

    await waitFor(() => {
      expect(onLocationDenied).toHaveBeenCalledTimes(1);
    });

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('reduced-motion path: dismiss fires synchronously (no fade timer wait)', () => {
    reducedMotionMock.mockReturnValue(true);
    installGeolocationStub();
    const onDismiss = vi.fn();
    renderWithProviders(
      <OnboardingScreen onDismiss={onDismiss} />,
    );

    fireEvent.click(screen.getByTestId('onboarding-cta-skip'));
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('primary CTA reflects `aria-busy=true` and `disabled` while pending', () => {
    const stub = installGeolocationStub();
    // Hold the geolocation request open so `pending` stays `true`.
    stub.getCurrentPosition.mockImplementation(() => {});
    renderWithProviders(<OnboardingScreen onDismiss={() => {}} />);

    const cta = screen.getByTestId('onboarding-cta-primary');
    expect(cta).not.toBeDisabled();
    expect(cta).toHaveAttribute('aria-busy', 'false');

    fireEvent.click(cta);

    expect(cta).toBeDisabled();
    expect(cta).toHaveAttribute('aria-busy', 'true');
  });

  it('rapid double-click on primary CTA fires geolocation only once', () => {
    const stub = installGeolocationStub();
    stub.getCurrentPosition.mockImplementation(() => {});
    renderWithProviders(<OnboardingScreen onDismiss={() => {}} />);

    const cta = screen.getByTestId('onboarding-cta-primary');
    fireEvent.click(cta);
    fireEvent.click(cta);
    fireEvent.click(cta);

    // First click sets pending → subsequent clicks are guarded by the
    // pending check in `handleUseLocation`. The browser would also
    // suppress events on a `disabled` button, but assert at the
    // hook level for belt-and-braces.
    expect(stub.getCurrentPosition).toHaveBeenCalledTimes(1);
  });
});
