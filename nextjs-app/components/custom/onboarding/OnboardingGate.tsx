'use client';

import { Suspense, type ReactNode, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { AMBER_CTA_BUTTON_CLASSNAME } from '@/components/composed/shared/AmberCTAButton';
import { useForcedState } from '@/lib/dev/use-forced-state';
import { useMapInstance } from '@/lib/contexts/MapInstanceContext';
import { GOTHENBURG_CENTRE } from '@/lib/constants/geography';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import { DURATION_FLY_MS } from '@/lib/constants/animation';
import { cn } from '@/lib/utils';
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
  const t = useTranslations('onboarding');
  const forcedState = useForcedState();
  const isForced = forcedState === 'onboarding';
  const bypassForVisualState = Boolean(forcedState && forcedState !== 'onboarding');
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

  const shouldShow = !bypassForVisualState && hasReadFlag && !dismissed && (isForced || !hasOnboarded);
  const shouldBlockAppShell = !bypassForVisualState && !dismissed && (!hasReadFlag || isForced || !hasOnboarded);

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

  if (bypassForVisualState) return null;

  if (!hasReadFlag && !dismissed) {
    return (
      <OnboardingGatePlaceholder
        wordmark={t('wordmark')}
        headline={t.rich('headline', { br: () => <br /> })}
        subtitle={t('subtitle')}
        primaryCta={t('primaryCta')}
        skipLink={t('skipLink')}
        trustMicrocopy={t('trustMicrocopy')}
      />
    );
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

type OnboardingGatePlaceholderProps = {
  wordmark: string;
  headline: ReactNode;
  subtitle: string;
  primaryCta: string;
  skipLink: string;
  trustMicrocopy: string;
};

function OnboardingGatePlaceholder({
  wordmark,
  headline,
  subtitle,
  primaryCta,
  skipLink,
  trustMicrocopy,
}: OnboardingGatePlaceholderProps) {
  return (
    <div
      aria-hidden="true"
      data-testid="onboarding-gate-placeholder"
      className="fixed inset-0 z-toast gradient-onboarding text-white flex flex-col px-8 py-16 overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="absolute left-1/2 -top-10 w-[340px] h-[340px] -translate-x-1/2 rounded-full opacity-80 pointer-events-none gradient-sun-burst-warm"
      />
      <div
        aria-hidden="true"
        className="absolute -left-32 -bottom-32 w-[480px] h-[480px] rounded-full pointer-events-none gradient-sun-burst-amber"
      />
      <div className="mt-5 flex justify-center items-center gap-2 font-display font-extrabold text-[22px] tracking-[-0.04em] text-white/90 relative z-10">
        <span
          aria-hidden="true"
          className="w-7 h-7 rounded-full gradient-wordmark-sun shadow-wordmark-sun"
        />
        {wordmark}
      </div>
      <div className="flex-1 flex flex-col justify-center items-center relative z-10 text-balance">
        <h1 className="text-display-xl text-center leading-[1.15] tracking-[-0.03em] m-0">
          {headline}
        </h1>
        <p className="mt-3.5 text-body-md text-white/70 text-center tracking-[0.02em]">
          {subtitle}
        </p>
      </div>
      <div className="relative z-10">
        <div className={cn(AMBER_CTA_BUTTON_CLASSNAME, 'h-14 w-full text-[16px] font-bold tracking-[-0.01em]')}>
          {primaryCta}
        </div>
        <div className="w-full mt-[18px] min-h-11 flex items-center justify-center bg-transparent text-white/90 underline underline-offset-4 text-body-sm font-bold">
          {skipLink}
        </div>
        <p className="mt-[18px] text-center text-[11px] font-medium tracking-[0.04em] text-white/65">
          {trustMicrocopy}
        </p>
      </div>
    </div>
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
