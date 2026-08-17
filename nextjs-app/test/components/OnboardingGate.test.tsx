import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { StrictMode, useEffect } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { NextIntlClientProvider } from 'next-intl';
import {
  AppRouteOnboardingGate,
  OnboardingGateWithSuspense,
} from '@/components/custom/onboarding/OnboardingGate';
import { AppRouteFrame } from '@/components/custom/layout/AppRouteFrame';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import onboardingMessages from '@/messages/sv/onboarding.json';

const useForcedStateMock = vi.fn<() => string | null>(() => null);
const usePathnameMock = vi.fn<() => string>(() => '/');
const useMapInstanceMock = vi.fn<() => { mapRef: { current: unknown }; mapInstance: unknown }>(
  () => ({ mapRef: { current: null }, mapInstance: null }),
);
const onboardingScreenMountSpy = vi.fn();
const onboardingScreenUnmountSpy = vi.fn();

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
  }) => {
    useEffect(() => {
      onboardingScreenMountSpy();
      return () => onboardingScreenUnmountSpy();
    }, []);

    return (
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
    );
  },
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="sv" messages={{ onboarding: onboardingMessages }}>
      {children}
    </NextIntlClientProvider>
  );
}

/**
 * Run `fn` with the global `document` shadowed to `undefined` so a
 * `renderToString` call takes the same "no DOM" branch a real Node SSR render
 * does. jsdom otherwise leaves `document` defined during `renderToString`,
 * which does not match production SSR. Restored in a `finally` so later tests
 * keep the DOM.
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

function renderGate(options?: Parameters<typeof render>[1]) {
  return render(<OnboardingGateWithSuspense />, {
    wrapper: Wrapper,
    ...options,
  });
}

describe('<OnboardingGate />', () => {
  let originalLocalStorage: PropertyDescriptor | undefined;
  let store: Map<string, string>;

  beforeEach(() => {
    useForcedStateMock.mockReset().mockReturnValue(null);
    usePathnameMock.mockReset().mockReturnValue('/');
    useMapInstanceMock.mockReset().mockReturnValue({
      mapRef: { current: null },
      mapInstance: null,
    });
    onboardingScreenMountSpy.mockReset();
    onboardingScreenUnmountSpy.mockReset();
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
    renderGate();
    expect(await screen.findByTestId('onboarding-screen-stub')).toBeInTheDocument();
  });

  it('server-renders the welcome overlay (getServerSnapshot === false), not a placeholder', () => {
    // Story 9.5 AC1: the synchronous gate uses `getServerSnapshot = false`, so
    // the server HTML shows the welcome overlay for a first visit and never the
    // old non-interactive placeholder div. The map is never leaked under a
    // privacy choice on the server frame.
    //
    // Shadow `document` away so this render exercises the same no-DOM condition
    // as real Node SSR.
    const html = withoutDocument(() =>
      renderToString(
        <Wrapper>
          <OnboardingGateWithSuspense />
        </Wrapper>,
      ),
    );
    expect(html).toContain('data-testid="onboarding-screen-stub"');
    expect(html).not.toContain('aria-hidden="true"');
    expect(html).not.toContain('inert=""');
    expect(html).not.toContain('data-testid="onboarding-gate-placeholder"');
  });

  it('hydrates the server-rendered first-visit overlay without a topology mismatch', async () => {
    const html = withoutDocument(() =>
      renderToString(
        <Wrapper>
          <OnboardingGateWithSuspense />
        </Wrapper>,
      ),
    );
    const rootElement = document.createElement('div');
    rootElement.innerHTML = html;
    document.body.appendChild(rootElement);
    const recoverableErrors: string[] = [];
    let root: ReturnType<typeof hydrateRoot> | undefined;

    try {
      await act(async () => {
        root = hydrateRoot(
          rootElement,
          <Wrapper>
            <OnboardingGateWithSuspense />
          </Wrapper>,
          {
            onRecoverableError(error) {
              recoverableErrors.push(
                error instanceof Error ? error.message : String(error),
              );
            },
          },
        );
      });

      await waitFor(() =>
        expect(
          rootElement.querySelectorAll('[data-testid="onboarding-screen-stub"]'),
        ).toHaveLength(1),
      );
      expect(document.querySelectorAll('[data-onboarding-portal]')).toHaveLength(0);
      expect(
        document.querySelectorAll('[data-testid="onboarding-screen-stub"]'),
      ).toHaveLength(1);
      expect(onboardingScreenMountSpy).toHaveBeenCalledTimes(1);
      expect(onboardingScreenUnmountSpy).not.toHaveBeenCalled();
      expect(
        rootElement.querySelector('[data-testid="onboarding-screen-stub"]'),
      ).not.toBeNull();
      expect(recoverableErrors).toEqual([]);
    } finally {
      if (root) {
        const mountedRoot = root;
        await act(async () => {
          mountedRoot.unmount();
        });
      }
      rootElement.remove();
    }
  });

  it('hydrates the app route frame with one external onboarding sibling and no portal host', async () => {
    const html = withoutDocument(() =>
      renderToString(
        <Wrapper>
          <AppRouteFrame>
            <div data-testid="app-content">map content</div>
          </AppRouteFrame>
        </Wrapper>,
      ),
    );
    const rootElement = document.createElement('div');
    rootElement.innerHTML = html;
    document.body.appendChild(rootElement);
    const recoverableErrors: string[] = [];
    let root: ReturnType<typeof hydrateRoot> | undefined;

    try {
      await act(async () => {
        root = hydrateRoot(
          rootElement,
          <Wrapper>
            <AppRouteFrame>
              <div data-testid="app-content">map content</div>
            </AppRouteFrame>
          </Wrapper>,
          {
            onRecoverableError(error) {
              recoverableErrors.push(
                error instanceof Error ? error.message : String(error),
              );
            },
          },
        );
      });

      await waitFor(() =>
        expect(
          document.querySelectorAll('[data-testid="onboarding-screen-stub"]'),
        ).toHaveLength(1),
      );
      const appShell = rootElement.querySelector<HTMLElement>('[data-app-shell]');
      const onboardingScreen = document.querySelector<HTMLElement>(
        '[data-testid="onboarding-screen-stub"]',
      );

      expect(rootElement.querySelectorAll('[data-app-shell]')).toHaveLength(1);
      expect(onboardingScreen).not.toBeNull();
      expect(appShell?.contains(onboardingScreen)).toBe(false);
      expect(onboardingScreen?.parentElement).toBe(appShell?.parentElement);
      expect(appShell?.nextElementSibling).toBe(onboardingScreen);
      expect(document.querySelectorAll('[data-onboarding-portal]')).toHaveLength(0);
      expect(recoverableErrors).toEqual([]);
    } finally {
      if (root) {
        const mountedRoot = root;
        await act(async () => {
          mountedRoot.unmount();
        });
      }
      rootElement.remove();
    }
  });

  it('keeps a single onboarding screen after StrictMode hydration settles', async () => {
    const html = withoutDocument(() =>
      renderToString(
        <Wrapper>
          <OnboardingGateWithSuspense />
        </Wrapper>,
      ),
    );
    const rootElement = document.createElement('div');
    rootElement.innerHTML = html;
    document.body.appendChild(rootElement);
    const recoverableErrors: string[] = [];
    let root: ReturnType<typeof hydrateRoot> | undefined;

    try {
      await act(async () => {
        root = hydrateRoot(
          rootElement,
          <StrictMode>
            <Wrapper>
              <OnboardingGateWithSuspense />
            </Wrapper>
          </StrictMode>,
          {
            onRecoverableError(error) {
              recoverableErrors.push(
                error instanceof Error ? error.message : String(error),
              );
            },
          },
        );
      });

      await waitFor(() =>
        expect(
          document.querySelectorAll('[data-testid="onboarding-screen-stub"]'),
        ).toHaveLength(1),
      );
      expect(document.querySelectorAll('[data-onboarding-portal]')).toHaveLength(0);
      expect(
        document.querySelectorAll('[data-testid="onboarding-screen-stub"]'),
      ).toHaveLength(1);
      expect(
        rootElement.querySelector('[data-testid="onboarding-screen-stub"]'),
      ).not.toBeNull();
      expect(recoverableErrors).toEqual([]);
    } finally {
      if (root) {
        const mountedRoot = root;
        await act(async () => {
          mountedRoot.unmount();
        });
      }
      rootElement.remove();
    }
  });

  it('returning user (flag set, no _state): renders nothing', async () => {
    store.set(ONBOARDED_FLAG_KEY, '1');
    renderGate();
    await waitFor(() => expect(screen.queryByTestId('onboarding-screen-stub')).toBeNull());
  });

  it('forced state ("_state=onboarding") overrides the flag and renders the screen', async () => {
    store.set(ONBOARDED_FLAG_KEY, '1');
    useForcedStateMock.mockReturnValue('onboarding');
    renderGate();
    expect(await screen.findByTestId('onboarding-screen-stub')).toBeInTheDocument();
  });

  it.each([
    ['/', true],
    ['/favoriter', true],
    ['/about', false],
    ['/sekretess', false],
  ])('route-scoped frame gate on %s renders onboarding=%s', async (pathname, expected) => {
    usePathnameMock.mockReturnValue(pathname);
    render(
      <AppRouteOnboardingGate />,
      { wrapper: Wrapper },
    );

    if (expected) {
      expect(await screen.findByTestId('onboarding-screen-stub')).toBeInTheDocument();
    } else {
      await waitFor(() =>
        expect(screen.queryByTestId('onboarding-screen-stub')).toBeNull(),
      );
    }
  });

  it('isolates the underlying app shell while the dialog is visible', async () => {
    const { container } = render(
      <AppRouteFrame>
        <div data-testid="app-content">map content</div>
      </AppRouteFrame>,
      { wrapper: Wrapper },
    );
    const shell = container.querySelector<HTMLElement>('[data-app-shell]');

    expect(shell).not.toBeNull();
    expect(await screen.findByTestId('onboarding-screen-stub')).toBeInTheDocument();
    expect(shell?.contains(screen.getByTestId('onboarding-screen-stub'))).toBe(false);
    await waitFor(() => expect(shell).toHaveAttribute('aria-hidden', 'true'));
    expect(shell).toHaveAttribute('inert');

    fireEvent.click(screen.getByTestId('dismiss'));
    await waitFor(() => expect(shell).not.toHaveAttribute('aria-hidden'));
    expect(shell).not.toHaveAttribute('inert');
  });

  it('grant in the real flow writes the localStorage flag', async () => {
    renderGate();
    fireEvent.click(await screen.findByTestId('grant'));
    expect(store.get(ONBOARDED_FLAG_KEY)).toBe('1');
  });

  it('deny in the real flow writes the localStorage flag', async () => {
    renderGate();
    fireEvent.click(await screen.findByTestId('deny'));
    expect(store.get(ONBOARDED_FLAG_KEY)).toBe('1');
  });

  it('dismiss alone does NOT write the localStorage flag (decoupled from resolution)', async () => {
    renderGate();
    fireEvent.click(await screen.findByTestId('dismiss'));
    expect(store.get(ONBOARDED_FLAG_KEY)).toBeUndefined();
    expect(screen.queryByTestId('onboarding-screen-stub')).toBeNull();
  });

  it('grant + dismiss flow writes flag and unmounts the screen', async () => {
    renderGate();
    fireEvent.click(await screen.findByTestId('grant'));
    fireEvent.click(screen.getByTestId('dismiss'));
    expect(store.get(ONBOARDED_FLAG_KEY)).toBe('1');
    expect(screen.queryByTestId('onboarding-screen-stub')).toBeNull();
  });

  it('grant in the forced-state flow does NOT write the localStorage flag', async () => {
    useForcedStateMock.mockReturnValue('onboarding');
    renderGate();
    fireEvent.click(await screen.findByTestId('grant'));
    expect(store.get(ONBOARDED_FLAG_KEY)).toBeUndefined();
  });

  it('deny in the forced-state flow does NOT write the localStorage flag', async () => {
    useForcedStateMock.mockReturnValue('onboarding');
    renderGate();
    fireEvent.click(await screen.findByTestId('deny'));
    expect(store.get(ONBOARDED_FLAG_KEY)).toBeUndefined();
  });

  it('a non-matching forced state does NOT show the screen for a returning user', async () => {
    store.set(ONBOARDED_FLAG_KEY, '1');
    useForcedStateMock.mockReturnValue('premium-paywall');
    renderGate();
    await waitFor(() => expect(screen.queryByTestId('onboarding-screen-stub')).toBeNull());
  });
});
