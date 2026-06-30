'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { useForcedState } from '@/lib/dev/use-forced-state';
import { useMapInstance } from '@/lib/contexts/MapInstanceContext';
import { GOTHENBURG_CENTRE } from '@/lib/constants/geography';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import { DURATION_FLY_MS } from '@/lib/constants/animation';
import { OnboardingScreen } from './OnboardingScreen';

const isDev = process.env.NODE_ENV !== 'production';

function readFlag(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
  // Safari private mode and partitioned-storage contexts raise
  // `SecurityError` on `getItem`. Treat any throw as "flag unset" so the
  // gate fails open into the onboarding screen rather than crashing the
  // app on first render.
  try {
    return localStorage.getItem(ONBOARDED_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

// Story 9.5 AC1 — synchronous first-render onboarding state via
// `useSyncExternalStore`. `getSnapshot` reads the localStorage flag
// SYNCHRONOUSLY during the first client render, so the gate knows
// `hasOnboarded` on frame #1 — eliminating the placeholder-then-portal
// window that caused BOTH the "map flashes before the welcome overlay"
// symptom AND the "Use my location did nothing" dead-click. `subscribe`
// wires the existing cross-tab `storage` listener (Story 7.3 Task 8.2)
// through the store so completing onboarding in one tab dismisses an
// overlay open in another. `getServerSnapshot` returns `false` — the
// server cannot read localStorage, and a first-visit assumption is the
// safe default (it shows the welcome overlay, never leaks the map under a
// privacy choice).
function subscribeToOnboardedFlag(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (event: StorageEvent) => {
    // `key === null` is a `localStorage.clear()`; otherwise only react to
    // the onboarded flag.
    if (event.key !== null && event.key !== ONBOARDED_FLAG_KEY) return;
    onStoreChange();
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

function getServerOnboardedSnapshot(): boolean {
  return false;
}

/**
 * Subscribe to the onboarded flag with a synchronous client snapshot and a
 * `false` server snapshot. Returning users see at most a single full-screen
 * overlay frame that resolves to `null` on hydration — strictly better than
 * the prior placeholder-then-portal flash.
 */
function useHasOnboarded(): boolean {
  return useSyncExternalStore(
    subscribeToOnboardedFlag,
    readFlag,
    getServerOnboardedSnapshot,
  );
}

function writeFlag(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  // `setItem` can throw `QuotaExceededError` (full storage) or
  // `SecurityError` (private mode). Either way, dropping the write is
  // the correct fallback — the user simply re-sees the overlay on the
  // next visit, which is harmless.
  try {
    localStorage.setItem(ONBOARDED_FLAG_KEY, '1');
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.warn('[OnboardingGate] failed to write onboarded flag:', error);
    }
  }
}

/**
 * Gate that decides whether the welcome overlay should be visible.
 *
 * Three branches:
 *   - `_state=onboarding` (dev-only forced state) → render the screen
 *     regardless of localStorage; do NOT mutate the flag on dismiss
 *     (so a single dev visit doesn't permanently mark the user as
 *     onboarded).
 *   - First visit (no flag) → render the screen; write the flag on
 *     dismiss so the next visit skips it.
 *   - Returning user (flag set) → render `null`; the underlying map
 *     is the only visible content.
 */
function OnboardingGateInner() {
  const forcedState = useForcedState();
  const isForced = forcedState === 'onboarding';
  const bypassForVisualState = Boolean(forcedState && forcedState !== 'onboarding');
  const { mapInstance } = useMapInstance();

  // Story 9.5 AC1: resolve the onboarded state SYNCHRONOUSLY on the first
  // render via `useSyncExternalStore`. On the client `readFlag()` runs during
  // render #1, so the gate knows the answer on the first frame — no
  // placeholder-then-portal window, no map-flash, no dead-click. The store's
  // `subscribe` carries the cross-tab `storage` listener (Story 7.3 Task 8.2),
  // so completing onboarding in another tab still dismisses an open overlay.
  const liveHasOnboarded = useHasOnboarded();
  // Latch the FIRST observed onboarded value so a SAME-TAB flag write — which
  // happens on grant/deny via `writeFlag()` BEFORE the exit animation runs —
  // does not yank the overlay out from under its fade-out. The original
  // (Story 7.3) gate had this property for free because `writeFlag()` never
  // touched the local `hasOnboarded` state; with a synchronous snapshot the
  // same-tab write would otherwise flip `liveHasOnboarded` mid-exit. The
  // session decision is therefore this latched `useState` (initialiser runs
  // once, capturing the first-frame snapshot); cross-tab dismissal is
  // restored explicitly below. A `useState` latch (not a ref) keeps the value
  // out of the render-time ref-access lint and is genuinely render-stable.
  const [initialHasOnboarded] = useState(() => liveHasOnboarded);
  const wroteFlagThisSessionRef = useRef(false);
  const [dismissed, setDismissed] = useState(false);
  const [pendingFly, setPendingFly] = useState<{ lat: number; lng: number } | null>(null);
  // Portal-after-mount: the overlay must be portalled to `document.body` so it
  // escapes the `[data-app-shell]` subtree that this gate's blocking effect
  // makes `inert` — otherwise the overlay would inert ITSELF and reintroduce
  // the dead-click. `createPortal` is browser-only, so on the server frame
  // (and React's first hydration render) we return the screen inline; the
  // first effect flips `mounted` and the overlay portals to body. A fixed
  // full-screen overlay looks identical inline vs portalled, so the one-frame
  // inline render is invisible.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Cross-tab dismissal: if ANOTHER tab marks the user onboarded while this
  // overlay is open (and WE did not write the flag ourselves this session),
  // dismiss so the two tabs stay in sync — matching the original Story 7.3
  // Task 8.2 behaviour. A same-tab grant/deny sets `wroteFlagThisSessionRef`,
  // so its own write is ignored here and the exit animation plays out via the
  // normal `onDismiss` path instead of an abrupt unmount.
  useEffect(() => {
    if (!liveHasOnboarded) return;
    if (initialHasOnboarded) return;
    if (wroteFlagThisSessionRef.current) return;
    setDismissed(true);
  }, [liveHasOnboarded]);

  // Defer the map flyTo until both the granted coords and the map
  // instance are ready — the dynamic-imported MapView may not have
  // initialised the MapLibre canvas at the moment the user grants
  // permission. Bail if the gate has been dismissed: the React
  // component instance lives on (rendering null) and a late
  // `mapInstance` could otherwise execute a stale `flyTo` after the
  // user has already left the overlay.
  useEffect(() => {
    if (dismissed) return;
    if (!pendingFly || !mapInstance) return;
    mapInstance.flyTo({
      center: [pendingFly.lng, pendingFly.lat],
      zoom: GOTHENBURG_CENTRE.zoom,
      duration: DURATION_FLY_MS,
    });
    setPendingFly(null);
  }, [pendingFly, mapInstance, dismissed]);

  // Stable callback identities — without `useCallback`, every gate
  // re-render (e.g. when `mapInstance` is set) hands new function refs
  // to `OnboardingScreen`, which tears down and re-schedules the
  // dismiss timer in a loop. Stable refs let the screen's exit effect
  // run exactly once when phase flips to 'exiting'.
  //
  // Flag write happens on the resolution callbacks (granted / denied),
  // not on dismiss, so the user is marked onboarded the moment they
  // make the choice — the Phase-2 fade-out timer simply unmounts the
  // overlay afterwards. The forced-state branch never writes the flag
  // so dev `?_state=onboarding` reloads remain repeatable.
  const handleLocationGranted = useCallback(
    (coords: { lat: number; lng: number }) => {
      if (!isForced) {
        wroteFlagThisSessionRef.current = true;
        writeFlag();
      }
      setPendingFly(coords);
    },
    [isForced],
  );

  const handleLocationDenied = useCallback(() => {
    if (!isForced) {
      wroteFlagThisSessionRef.current = true;
      writeFlag();
    }
  }, [isForced]);

  const handleDismiss = useCallback(() => {
    // `dismissed` is independent of `hasOnboarded` so the forced-state
    // path can hide the overlay on this visit without permanently
    // marking the user as onboarded.
    setDismissed(true);
    // Drop any in-flight flyTo so a late `mapInstance` resolution
    // doesn't move the canvas after the screen is gone.
    setPendingFly(null);
  }, []);

  // `initialHasOnboardedRef` is resolved on the first render (synchronous
  // snapshot), so there is no "flag unknown" branch — the gate either shows
  // the real wired screen or `null` from frame #1. The session decision is
  // latched: a same-tab grant/deny write does not re-evaluate the snapshot
  // mid-exit (the exit animation drives the unmount via `dismissed`);
  // cross-tab onboarding flips `dismissed` through the effect above.
  const shouldShow =
    !bypassForVisualState && !dismissed && (isForced || !initialHasOnboarded);
  const shouldBlockAppShell = shouldShow;

  useEffect(() => {
    if (!shouldBlockAppShell || typeof document === 'undefined') return;

    const appShell = document.querySelector<HTMLElement>('[data-app-shell]');
    if (!appShell) return;

    const previousAriaHidden = appShell.getAttribute('aria-hidden');
    const hadInertAttribute = appShell.hasAttribute('inert');
    const previousInert = appShell.inert;

    appShell.setAttribute('aria-hidden', 'true');
    appShell.inert = true;
    appShell.setAttribute('inert', '');

    return () => {
      if (previousAriaHidden === null) {
        appShell.removeAttribute('aria-hidden');
      } else {
        appShell.setAttribute('aria-hidden', previousAriaHidden);
      }
      appShell.inert = previousInert;
      if (!hadInertAttribute) {
        appShell.removeAttribute('inert');
      }
    };
  }, [shouldBlockAppShell]);

  if (!shouldShow) return null;

  const screen = (
    <OnboardingScreen
      onDismiss={handleDismiss}
      onLocationGranted={handleLocationGranted}
      onLocationDenied={handleLocationDenied}
    />
  );

  // Inline on the server frame + the first hydration render; portal to body
  // only after mount, where `document.body` is guaranteed and the overlay can
  // escape the inert `[data-app-shell]` subtree.
  if (!mounted || typeof document === 'undefined') return screen;
  return createPortal(screen, document.body);
}

/**
 * Required Suspense wrapper — `useForcedState` calls `useSearchParams`,
 * which Next.js 16 requires inside a Suspense boundary or a build-time
 * prerender bailout occurs.
 */
export function OnboardingGateWithSuspense() {
  return (
    <Suspense fallback={null}>
      <OnboardingGateInner />
    </Suspense>
  );
}
