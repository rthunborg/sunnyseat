/**
 * Story 9.5 AC4(c) — SW controllerchange reload: first-install guard + no-op
 * safety (automate coverage).
 *
 * The AC4 ATDD scaffold (`LocateAndSwReload.atdd.test.tsx`) already proves the
 * happy path with a controller present: reload fires exactly once, a repeat
 * controllerchange is guarded (no loop), and cleanup detaches the listener.
 *
 * This file covers the GENUINE gaps NOT asserted there:
 *   - FIRST-INSTALL GUARD: when there is NO prior controller at arm time (the
 *     very first SW install), the initial controllerchange must NOT reload —
 *     nothing stale is being served. This is the branch that would otherwise
 *     reload every first-time visitor the instant the SW takes control.
 *   - NO-OP SAFETY: with `serviceWorker` unavailable (SSR / unsupported browser
 *     / dev-disabled), the register call must not throw and must return a
 *     callable cleanup.
 *
 * Deterministic: we drive the `controllerchange` listener directly and stub
 * `window.location.reload`. No timing.
 */
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { registerServiceWorkerUpdateReload } from '@/hooks/useServiceWorkerUpdate';

describe('Story 9.5 AC4(c) — registerServiceWorkerUpdateReload guards', () => {
  let listeners: Array<() => void>;
  let reloadSpy: Mock;
  let originalSW: PropertyDescriptor | undefined;
  let originalLocation: PropertyDescriptor | undefined;

  function installServiceWorker(controller: object | null) {
    originalSW = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        controller,
        addEventListener: (event: string, cb: () => void) => {
          if (event === 'controllerchange') listeners.push(cb);
        },
        removeEventListener: (event: string, cb: () => void) => {
          if (event === 'controllerchange') {
            const i = listeners.indexOf(cb);
            if (i >= 0) listeners.splice(i, 1);
          }
        },
      },
    });
  }

  beforeEach(() => {
    listeners = [];
    reloadSpy = vi.fn();
    originalLocation = Object.getOwnPropertyDescriptor(window, 'location');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });
  });

  afterEach(() => {
    if (originalSW) {
      Object.defineProperty(navigator, 'serviceWorker', originalSW);
      originalSW = undefined;
    } else {
      delete (navigator as unknown as Record<string, unknown>).serviceWorker;
    }
    if (originalLocation) Object.defineProperty(window, 'location', originalLocation);
  });

  it('does NOT reload on the first install (no controller at arm time)', () => {
    installServiceWorker(null); // fresh install — nothing stale is being served
    registerServiceWorkerUpdateReload();

    expect(listeners.length).toBeGreaterThan(0);
    // The activation that gives this tab its FIRST controller fires
    // controllerchange, but there was no prior controller → must not reload.
    listeners.forEach((cb) => cb());

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('reloads when a controller was already present at arm time (stale shell replaced)', () => {
    installServiceWorker({}); // a controller is already in charge
    registerServiceWorkerUpdateReload();

    listeners.forEach((cb) => cb());

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('is a no-op returning a callable cleanup when serviceWorker is unavailable', () => {
    // No serviceWorker installed on navigator for this case.
    const swBefore = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
    if (swBefore) delete (navigator as unknown as Record<string, unknown>).serviceWorker;

    let cleanup: () => void = () => {};
    expect(() => {
      cleanup = registerServiceWorkerUpdateReload();
    }).not.toThrow();
    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
    expect(reloadSpy).not.toHaveBeenCalled();

    if (swBefore) Object.defineProperty(navigator, 'serviceWorker', swBefore);
  });
});
