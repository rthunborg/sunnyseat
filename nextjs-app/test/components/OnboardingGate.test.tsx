import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { OnboardingGateWithSuspense } from '@/components/custom/onboarding/OnboardingGate';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

const useForcedStateMock = vi.fn<() => string | null>(() => null);
const useMapInstanceMock = vi.fn<() => { mapRef: { current: unknown }; mapInstance: unknown }>(
  () => ({ mapRef: { current: null }, mapInstance: null }),
);

vi.mock('@/lib/dev/use-forced-state', () => ({
  useForcedState: () => useForcedStateMock(),
}));

vi.mock('@/lib/contexts/MapInstanceContext', () => ({
  useMapInstance: () => useMapInstanceMock(),
}));

// OnboardingScreen is exercised in its own test; here we replace it with
// a stub that surfaces all three callbacks as buttons so the gate's
// state transitions can be verified independently.
vi.mock('@/components/custom/onboarding/OnboardingScreen', () => ({
  OnboardingScreen: ({
    onDismiss,
    onLocationGranted,
    onLocationDenied,
  }: {
    onDismiss: () => void;
    onLocationGranted?: (coords: { lat: number; lng: number }) => void;
    onLocationDenied?: () => void;
  }) => (
    <div data-testid="onboarding-screen-stub">
      <button data-testid="dismiss" onClick={onDismiss}>dismiss</button>
      <button
        data-testid="grant"
        onClick={() => onLocationGranted?.({ lat: 57.7, lng: 11.97 })}
      >
        grant
      </button>
      <button data-testid="deny" onClick={() => onLocationDenied?.()}>deny</button>
    </div>
  ),
}));

describe('<OnboardingGate />', () => {
  let originalLocalStorage: PropertyDescriptor | undefined;
  let store: Map<string, string>;

  beforeEach(() => {
    useForcedStateMock.mockReset().mockReturnValue(null);
    useMapInstanceMock.mockReset().mockReturnValue({
      mapRef: { current: null },
      mapInstance: null,
    });
    originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
    store = new Map<string, string>();
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
  });

  afterEach(() => {
    if (originalLocalStorage) {
      Object.defineProperty(window, 'localStorage', originalLocalStorage);
    }
    vi.restoreAllMocks();
  });

  it('first visit (no flag, no _state): renders the onboarding screen', async () => {
    render(<OnboardingGateWithSuspense />);
    expect(await screen.findByTestId('onboarding-screen-stub')).toBeInTheDocument();
  });

  it('server-renders a blocking placeholder while the onboarded flag is unknown', () => {
    expect(renderToString(<OnboardingGateWithSuspense />)).toContain(
      'data-testid="onboarding-gate-placeholder"',
    );
  });

  it('returning user (flag set, no _state): renders nothing', async () => {
    store.set(ONBOARDED_FLAG_KEY, '1');
    render(<OnboardingGateWithSuspense />);
    await waitFor(() => expect(screen.queryByTestId('onboarding-screen-stub')).toBeNull());
  });

  it('forced state ("_state=onboarding") overrides the flag and renders the screen', async () => {
    store.set(ONBOARDED_FLAG_KEY, '1');
    useForcedStateMock.mockReturnValue('onboarding');
    render(<OnboardingGateWithSuspense />);
    expect(await screen.findByTestId('onboarding-screen-stub')).toBeInTheDocument();
  });

  it('isolates the underlying app shell while the dialog is visible', async () => {
    const shell = document.createElement('div');
    shell.setAttribute('data-app-shell', '');
    document.body.appendChild(shell);

    render(<OnboardingGateWithSuspense />, { container: shell });
    expect(await screen.findByTestId('onboarding-screen-stub')).toBeInTheDocument();
    await waitFor(() => expect(shell).toHaveAttribute('aria-hidden', 'true'));
    expect(shell).toHaveAttribute('inert');

    fireEvent.click(screen.getByTestId('dismiss'));
    await waitFor(() => expect(shell).not.toHaveAttribute('aria-hidden'));
    expect(shell).not.toHaveAttribute('inert');

    shell.remove();
  });

  it('grant in the real flow writes the localStorage flag', async () => {
    render(<OnboardingGateWithSuspense />);
    fireEvent.click(await screen.findByTestId('grant'));
    expect(store.get(ONBOARDED_FLAG_KEY)).toBe('1');
  });

  it('deny in the real flow writes the localStorage flag', async () => {
    render(<OnboardingGateWithSuspense />);
    fireEvent.click(await screen.findByTestId('deny'));
    expect(store.get(ONBOARDED_FLAG_KEY)).toBe('1');
  });

  it('dismiss alone does NOT write the localStorage flag (decoupled from resolution)', async () => {
    render(<OnboardingGateWithSuspense />);
    fireEvent.click(await screen.findByTestId('dismiss'));
    expect(store.get(ONBOARDED_FLAG_KEY)).toBeUndefined();
    expect(screen.queryByTestId('onboarding-screen-stub')).toBeNull();
  });

  it('grant + dismiss flow writes flag and unmounts the screen', async () => {
    render(<OnboardingGateWithSuspense />);
    fireEvent.click(await screen.findByTestId('grant'));
    fireEvent.click(screen.getByTestId('dismiss'));
    expect(store.get(ONBOARDED_FLAG_KEY)).toBe('1');
    expect(screen.queryByTestId('onboarding-screen-stub')).toBeNull();
  });

  it('grant in the forced-state flow does NOT write the localStorage flag', async () => {
    useForcedStateMock.mockReturnValue('onboarding');
    render(<OnboardingGateWithSuspense />);
    fireEvent.click(await screen.findByTestId('grant'));
    expect(store.get(ONBOARDED_FLAG_KEY)).toBeUndefined();
  });

  it('deny in the forced-state flow does NOT write the localStorage flag', async () => {
    useForcedStateMock.mockReturnValue('onboarding');
    render(<OnboardingGateWithSuspense />);
    fireEvent.click(await screen.findByTestId('deny'));
    expect(store.get(ONBOARDED_FLAG_KEY)).toBeUndefined();
  });

  it('a non-matching forced state does NOT show the screen for a returning user', async () => {
    store.set(ONBOARDED_FLAG_KEY, '1');
    useForcedStateMock.mockReturnValue('premium-paywall');
    render(<OnboardingGateWithSuspense />);
    await waitFor(() => expect(screen.queryByTestId('onboarding-screen-stub')).toBeNull());
  });
});
