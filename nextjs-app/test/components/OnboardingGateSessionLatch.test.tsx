/**
 * Story 9.5 AC1 — session-latch + cross-tab dismissal edges (automate coverage).
 *
 * These assertions target the TWO refinements the synchronous
 * `useSyncExternalStore` snapshot forced, which the AC1 ATDD scaffold
 * (`OnboardingGate.synchronous.atdd.test.tsx`) does NOT cover:
 *
 *   1. SESSION LATCH — a SAME-TAB grant/deny writes the onboarded flag BEFORE
 *      the exit fade runs. With a synchronous snapshot that write would flip
 *      `liveHasOnboarded` true on the very next render and yank the overlay out
 *      from under its fade. The gate latches the first-frame value + a
 *      `wroteFlagThisSessionRef` so the overlay stays mounted after our own
 *      write and the normal dismiss timer plays out.
 *
 *   2. CROSS-TAB DISMISSAL — a GENUINE cross-tab onboarding (another tab sets
 *      the flag, surfaced here as a `storage` event we did NOT originate) still
 *      dismisses the open overlay, matching the Story 7.3 Task 8.2 behaviour.
 *
 * Deterministic jsdom/RTL only: we drive the same-tab write through the REAL
 * OnboardingScreen skip button (`useCentrum()` flips status to fallback
 * synchronously → `onLocationDenied` → `writeFlag()`), and drive the cross-tab
 * path by dispatching a `storage` event. No wall-clock / animation-timing
 * asserts — `motion/react` is stubbed to a passthrough and the exit timer is
 * driven with fake timers only to prove the overlay OUTLIVES the same-tab write,
 * not to assert any duration.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { OnboardingGateWithSuspense } from '@/components/custom/onboarding/OnboardingGate';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import onboardingMessages from '@/messages/sv/onboarding.json';

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

// Stub motion so exit animation is a synchronous passthrough (no real
// animation timing enters the assertions).
vi.mock('motion/react', async () => {
  const React = await import('react');
  type DivProps = React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;
  const passthrough = (props: DivProps) => {
    const {
      initial: _i, animate: _a, exit: _e, transition: _t, layout: _l, ...rest
    } = props;
    return React.createElement('div', rest);
  };
  return {
    motion: { div: passthrough },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useReducedMotion: () => false,
  };
});

vi.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => false,
}));

// A real-shaped geolocation whose `useCentrum` synchronously reports the
// fallback status so the skip button drives a real same-tab grant/deny write
// through the gate's `onLocationDenied` → `writeFlag()` path.
const geoState = vi.hoisted(() => ({ status: 'idle' as string }));
vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => ({
    status: geoState.status,
    coords: { lat: 57.7089, lng: 11.9746 },
    requestLocation: vi.fn(),
    useCentrum: vi.fn(() => {
      geoState.status = 'fallback';
    }),
  }),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="sv" messages={{ onboarding: onboardingMessages }}>
      {children}
    </NextIntlClientProvider>
  );
}

describe('Story 9.5 AC1 — session-latch + cross-tab dismissal', () => {
  let originalLocalStorage: PropertyDescriptor | undefined;
  let store: Map<string, string>;

  beforeEach(() => {
    useForcedStateMock.mockReset().mockReturnValue(null);
    useMapInstanceMock.mockReset().mockReturnValue({
      mapRef: { current: null },
      mapInstance: null,
    });
    geoState.status = 'idle';
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
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    if (originalLocalStorage) {
      Object.defineProperty(window, 'localStorage', originalLocalStorage);
    }
    vi.restoreAllMocks();
  });

  it('a SAME-TAB grant/deny write does NOT yank the overlay before its exit fade', () => {
    render(<OnboardingGateWithSuspense />, { wrapper: Wrapper });
    expect(screen.getByTestId('onboarding-screen')).toBeInTheDocument();

    // Skip → useCentrum() flips status to 'fallback' synchronously →
    // OnboardingScreen calls onLocationDenied → the gate's writeFlag() runs
    // and sets the same-tab wrote-flag ref. The synchronous snapshot now reads
    // '1', so WITHOUT the latch the overlay would disappear this very render.
    act(() => {
      fireEvent.click(screen.getByTestId('onboarding-cta-skip'));
    });

    // Flag WAS written (proves the same-tab write happened)...
    expect(store.get(ONBOARDED_FLAG_KEY)).toBe('1');
    // ...but the overlay is STILL mounted — the latch kept it through the fade,
    // it was not yanked by the live snapshot flip.
    expect(screen.getByTestId('onboarding-screen')).toBeInTheDocument();
  });

  it('the overlay unmounts via the normal dismiss timer after the same-tab write (not an abrupt yank)', () => {
    render(<OnboardingGateWithSuspense />, { wrapper: Wrapper });

    act(() => {
      fireEvent.click(screen.getByTestId('onboarding-cta-skip'));
    });
    expect(screen.getByTestId('onboarding-screen')).toBeInTheDocument();

    // Let the OnboardingScreen exit timer fire → onDismiss → gate hides.
    act(() => {
      vi.runOnlyPendingTimers();
    });
    expect(screen.queryByTestId('onboarding-screen')).toBeNull();
  });

  it('a GENUINE cross-tab flag set (storage event) dismisses the open overlay', async () => {
    render(<OnboardingGateWithSuspense />, { wrapper: Wrapper });
    expect(screen.getByTestId('onboarding-screen')).toBeInTheDocument();

    // Another tab completes onboarding: set the flag and fire the storage
    // event the gate's subscribe listens for. We did NOT write it this session,
    // so the cross-tab dismissal effect must run.
    act(() => {
      store.set(ONBOARDED_FLAG_KEY, '1');
      window.dispatchEvent(
        new StorageEvent('storage', { key: ONBOARDED_FLAG_KEY, newValue: '1' }),
      );
    });

    await waitFor(() =>
      expect(screen.queryByTestId('onboarding-screen')).toBeNull(),
    );
  });

  it('an UNRELATED storage key change does NOT dismiss the overlay', () => {
    render(<OnboardingGateWithSuspense />, { wrapper: Wrapper });
    expect(screen.getByTestId('onboarding-screen')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'some_other_key', newValue: 'x' }),
      );
    });

    expect(screen.getByTestId('onboarding-screen')).toBeInTheDocument();
  });
});
