/**
 * ATDD RED-PHASE SCAFFOLD — Story 9.5 AC1
 * Synchronous first-render onboarding-state strategy (no map-flash, no dead-click).
 *
 * STATUS: describe.skip — these tests assert the POST-implementation behaviour and
 * WILL FAIL against the old placeholder-then-mount gate. They are skipped so CI
 * stays green. The dev un-skips this block while implementing Task 1.
 *
 * What this proves (deterministic jsdom / RTL — no wall-clock, no flaky timing):
 *  - A first-time user (empty localStorage) sees the REAL interactive OnboardingScreen
 *    on the FIRST render (synchronous flag resolution), NOT the non-interactive
 *    `onboarding-gate-placeholder` stand-in.
 *  - The wired "Use my location" CTA exists on the first frame and an EARLY click
 *    reaches geolocation.requestLocation() — the dead-click fix.
 *  - A returning user (flag set) renders nothing from the first render, with no
 *    placeholder window.
 *  - The chosen hydration strategy does not crash SSR (useSyncExternalStore:
 *    getServerSnapshot === false renders the overlay; cookie: initialOnboarded prop).
 *
 * Implementation note for the dev (un-skip path):
 *  - If `useSyncExternalStore` is chosen (RECOMMENDED): `getSnapshot` reads readFlag()
 *    synchronously on the client → the gate knows `hasOnboarded` on render #1. The
 *    placeholder branch is deleted. The two SSR assertions below assert
 *    getServerSnapshot === false (welcome overlay server-rendered), which is the
 *    intended "never leak the map under a privacy choice" default.
 *  - If the cookie alternative is chosen: thread `initialOnboarded` through
 *    OnboardingGateWithSuspense and adapt the two SSR assertions to render with
 *    `initialOnboarded={false}` / `{true}` instead of asserting the localStorage path.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { OnboardingGateWithSuspense } from '@/components/custom/onboarding/OnboardingGate';
import { AppRouteFrame } from '@/components/custom/layout/AppRouteFrame';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import onboardingMessages from '@/messages/sv/onboarding.json';

const useForcedStateMock = vi.fn<() => string | null>(() => null);
const usePathnameMock = vi.fn<() => string>(() => '/');
const useMapInstanceMock = vi.fn<() => { mapRef: { current: unknown }; mapInstance: unknown }>(
  () => ({ mapRef: { current: null }, mapInstance: null }),
);

// Spy on the real geolocation request so the dead-click assertion is concrete:
// an early CTA click MUST reach requestLocation().
const requestLocationSpy = vi.fn();

vi.mock('@/lib/dev/use-forced-state', () => ({
  useForcedState: () => useForcedStateMock(),
}));

vi.mock('@/lib/contexts/MapInstanceContext', () => ({
  useMapInstance: () => useMapInstanceMock(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock('@/components/custom/layout/DesktopNavBar', () => ({
  DesktopNavBar: () => <header data-testid="desktop-nav-bar" />,
}));

vi.mock('@/components/custom/layout/MobileNavBar', () => ({
  MobileNavBar: () => <nav data-testid="mobile-nav-bar" />,
}));

vi.mock('@/hooks/useGeolocation', () => ({
  // The gate mounts a tree that consumes useGeolocation (via OnboardingScreen).
  // We expose a real-shaped result whose requestLocation is a spy so the
  // early-click → requestLocation wiring is observable without a real GPS prompt.
  useGeolocation: () => ({
    status: 'idle' as const,
    coords: { lat: 57.7089, lng: 11.9746 },
    requestLocation: requestLocationSpy,
    useCentrum: vi.fn(),
  }),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="sv" messages={{ onboarding: onboardingMessages }}>
      {children}
    </NextIntlClientProvider>
  );
}

/**
 * Run `fn` with the global `document` shadowed to `undefined` so `renderToString`
 * takes the same "no DOM" branch a real Node SSR render does. Restored in
 * `finally`.
 */
function withoutDocument<T>(fn: () => T): T {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: undefined,
  });
  try {
    return fn();
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, 'document', descriptor);
    }
  }
}

describe('Story 9.5 AC1 — synchronous first-render onboarding gate (RED)', () => {
  let originalLocalStorage: PropertyDescriptor | undefined;
  let store: Map<string, string>;

  beforeEach(() => {
    useForcedStateMock.mockReset().mockReturnValue(null);
    usePathnameMock.mockReset().mockReturnValue('/');
    useMapInstanceMock.mockReset().mockReturnValue({
      mapRef: { current: null },
      mapInstance: null,
    });
    requestLocationSpy.mockReset();
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

  it('first visit (empty localStorage) renders the REAL OnboardingScreen on the FIRST render — no placeholder', () => {
    // No `await findBy` — this is a synchronous first-render assertion. The real
    // wired screen must be present on render #1.
    render(<OnboardingGateWithSuspense />, { wrapper: Wrapper });

    expect(screen.getByTestId('onboarding-screen')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-cta-primary')).toBeInTheDocument();
    // The non-interactive stand-in must NOT be the first-paint surface.
    expect(screen.queryByTestId('onboarding-gate-placeholder')).toBeNull();
  });

  it('an EARLY click on the first-frame CTA reaches geolocation.requestLocation() (dead-click fix)', () => {
    render(<OnboardingGateWithSuspense />, { wrapper: Wrapper });

    // Synchronous click on the first render — no waitFor/findBy hydration window.
    fireEvent.click(screen.getByTestId('onboarding-cta-primary'));

    expect(requestLocationSpy).toHaveBeenCalledTimes(1);
  });

  it('returning user (flag set) renders nothing from the FIRST render — no placeholder window', () => {
    store.set(ONBOARDED_FLAG_KEY, '1');
    render(<OnboardingGateWithSuspense />, { wrapper: Wrapper });

    expect(screen.queryByTestId('onboarding-screen')).toBeNull();
    expect(screen.queryByTestId('onboarding-gate-placeholder')).toBeNull();
  });

  it('SSR: server render shows the welcome overlay for a first visit (getServerSnapshot === false)', () => {
    // getServerSnapshot must default to "not onboarded" so the server HTML never
    // leaks the map under a privacy choice. The render must not throw. Shadow
    // `document` away so `renderToString` exercises the real Node-SSR path.
    const html = withoutDocument(() =>
      renderToString(
        <Wrapper>
          <OnboardingGateWithSuspense />
        </Wrapper>,
      ),
    );
    expect(html).toContain('data-testid="onboarding-screen"');
    // The old non-interactive placeholder div must no longer be the SSR output.
    expect(html).not.toContain('data-testid="onboarding-gate-placeholder"');
  });

  it('SSR does not crash and produces a string of HTML (hydration-safe snapshot)', () => {
    expect(() =>
      renderToString(
        <Wrapper>
          <OnboardingGateWithSuspense />
        </Wrapper>,
      ),
    ).not.toThrow();
  });

  it('forced state ("_state=onboarding") still shows the screen on the first render for a returning user', () => {
    store.set(ONBOARDED_FLAG_KEY, '1');
    useForcedStateMock.mockReturnValue('onboarding');
    render(<OnboardingGateWithSuspense />, { wrapper: Wrapper });

    expect(screen.getByTestId('onboarding-screen')).toBeInTheDocument();
  });

  it('preserves the dual inert + aria-hidden app-shell isolation while the overlay is up', async () => {
    const { container } = render(
      <AppRouteFrame>
        <div data-testid="app-content">map content</div>
      </AppRouteFrame>,
      { wrapper: Wrapper },
    );
    const shell = container.querySelector<HTMLElement>('[data-app-shell]');

    expect(shell).not.toBeNull();
    if (!shell) throw new Error('Expected app shell to render');
    await waitFor(() => expect(shell).toHaveAttribute('aria-hidden', 'true'));
    expect(shell).toHaveAttribute('inert');
    expect(shell.contains(screen.getByTestId('onboarding-screen'))).toBe(false);
  });

  it('renders the interactive overlay as a sibling outside the inert `[data-app-shell]` subtree', async () => {
    const { container } = render(
      <AppRouteFrame>
        <div data-testid="app-content">map content</div>
      </AppRouteFrame>,
      { wrapper: Wrapper },
    );
    const shell = container.querySelector<HTMLElement>('[data-app-shell]');

    expect(shell).not.toBeNull();
    if (!shell) throw new Error('Expected app shell to render');

    await waitFor(() => expect(shell).toHaveAttribute('inert'));

    const overlay = screen.getByTestId('onboarding-screen');
    expect(overlay).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-cta-primary')).toBeInTheDocument();
    expect(shell.contains(overlay)).toBe(false);
    expect(overlay.parentElement).toBe(shell.parentElement);
    expect(shell.nextElementSibling).toBe(overlay);
  });
});
