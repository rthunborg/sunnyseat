'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
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
  const { mapInstance } = useMapInstance();

  // The server cannot read localStorage. Until the first client effect
  // resolves the flag, render a visual blocker instead of exposing the
  // map underneath a first-visit privacy choice. Returning users only
  // see that blocker for the hydration window, not the full onboarding
  // dialog.
  const [hasReadFlag, setHasReadFlag] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [pendingFly, setPendingFly] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    setHasOnboarded(readFlag());
    setHasReadFlag(true);
  }, []);

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
      if (!isForced) writeFlag();
      setPendingFly(coords);
    },
    [isForced],
  );

  const handleLocationDenied = useCallback(() => {
    if (!isForced) writeFlag();
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

  const shouldShow = hasReadFlag && !dismissed && (isForced || !hasOnboarded);
  const shouldBlockAppShell = !dismissed && (!hasReadFlag || isForced || !hasOnboarded);

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

  if (!hasReadFlag && !dismissed) {
    return <OnboardingGatePlaceholder />;
  }

  if (!shouldShow) return null;

  const screen = (
    <OnboardingScreen
      onDismiss={handleDismiss}
      onLocationGranted={handleLocationGranted}
      onLocationDenied={handleLocationDenied}
    />
  );

  return typeof document === 'undefined' ? screen : createPortal(screen, document.body);
}

function OnboardingGatePlaceholder() {
  return (
    <div
      aria-hidden="true"
      data-testid="onboarding-gate-placeholder"
      className="fixed inset-0 z-toast gradient-onboarding"
    />
  );
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
