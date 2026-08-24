'use client';

import { useEffect, useState } from 'react';
import * as m from 'motion/react-m';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTranslations } from 'next-intl';
import { Navigation, Sun } from 'lucide-react';
import { AmberCTAButton } from '@/components/composed/shared/AmberCTAButton';
import { useGeolocation } from '@/hooks/useGeolocation';

const EXIT_MS = 250;
const OUTER_ENTRANCE_DURATION_S = 0.4;
const ENTRANCE_HEADLINE_DELAY_S = 0.2;
const ENTRANCE_CTA_DELAY_S = 0.4;
const ENTRANCE_DURATION_S = 0.3;
const EXIT_DURATION_S = 0.25;

export type OnboardingScreenProps = {
  onDismiss: () => void;
  onLocationGranted?: (coords: { lat: number; lng: number }) => void;
  onLocationDenied?: () => void;
  interactive?: boolean;
};

/**
 * First-visit welcome overlay. Warm amber gradient + value promise + a
 * single CTA that requests browser geolocation, with a skip link that
 * falls back to Gothenburg centrum.
 *
 * The component owns: phase state (visible → exiting), pending state
 * (CTA pulse during permission dialog), and the post-resolution dismiss
 * timer. It does NOT own localStorage — that lives in `OnboardingGate`.
 */
export function OnboardingScreen({
  onDismiss,
  onLocationGranted,
  onLocationDenied,
  interactive = true,
}: OnboardingScreenProps) {
  const t = useTranslations('onboarding');
  // Fail closed while the media query is unresolved so reduced-motion
  // users never receive a first-frame fade/slide before the hook settles.
  const reduceMotion = useReducedMotion() ?? true;
  const geolocation = useGeolocation();
  const [phase, setPhase] = useState<'visible' | 'exiting'>('visible');
  const [pending, setPending] = useState(false);
  const suppressEntranceMotion = reduceMotion || !interactive;

  // Phase 1 — react to a resolved geolocation status (success | fallback)
  // ONLY when we initiated the request via the primary CTA. Sets the
  // exit phase; the dismiss timer is owned by the second effect so it
  // is not torn down when this effect re-runs to clear `pending`.
  useEffect(() => {
    if (!pending) return;
    if (geolocation.status !== 'success' && geolocation.status !== 'fallback') return;

    if (geolocation.status === 'success') {
      onLocationGranted?.(geolocation.coords);
    } else {
      onLocationDenied?.();
    }
    setPending(false);
    setPhase('exiting');
  }, [
    geolocation.status,
    geolocation.coords,
    pending,
    onLocationGranted,
    onLocationDenied,
  ]);

  // Phase 2 — once we are in `exiting`, schedule dismissal once and
  // clean up only on unmount. (Effect re-runs only if `phase` flips.)
  useEffect(() => {
    if (phase !== 'exiting') return;
    const timer = window.setTimeout(onDismiss, reduceMotion ? 0 : EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [phase, reduceMotion, onDismiss]);

  const handleUseLocation = () => {
    if (!interactive) return;
    // Guard rapid double-clicks: the second call would fire a second
    // `getCurrentPosition` and racey the first resolution.
    if (pending) return;
    setPending(true);
    geolocation.requestLocation();
  };

  const handleUseCentrum = () => {
    if (!interactive) return;
    // Clear `pending` first so the Phase-1 effect can't re-fire
    // `onLocationDenied` on the next render — `useCentrum()` flips
    // status to `'fallback'` synchronously, which would otherwise
    // retrigger the resolution effect with `pending=true`.
    setPending(false);
    geolocation.useCentrum();
    onLocationDenied?.();
    setPhase('exiting');
  };

  return (
    <m.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-headline"
      data-testid="onboarding-screen"
      data-phase={phase}
      initial={suppressEntranceMotion ? false : { opacity: 0 }}
      animate={{ opacity: phase === 'exiting' ? 0 : 1 }}
      transition={{
        duration: suppressEntranceMotion
          ? 0
          : phase === 'exiting'
            ? EXIT_DURATION_S
            : OUTER_ENTRANCE_DURATION_S,
        ease: phase === 'exiting' ? 'easeIn' : 'easeOut',
      }}
      className="fixed inset-0 z-toast gradient-onboarding text-white flex flex-col px-8 py-16 overflow-hidden lg:items-center lg:justify-center lg:gap-7"
    >
      {/* Decorative sun bursts — token-backed gradients (DESIGN.md §Gradients). */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 -top-10 w-[340px] h-[340px] -translate-x-1/2 rounded-full opacity-80 pointer-events-none gradient-sun-burst-warm"
      />
      <div
        aria-hidden="true"
        className="absolute -left-32 -bottom-32 w-[480px] h-[480px] rounded-full pointer-events-none gradient-sun-burst-amber"
      />

      {/* Brand wordmark */}
      <div className="mt-5 lg:mt-0 flex justify-center items-center gap-2 font-display font-extrabold text-[22px] tracking-[-0.04em] text-white/90 relative z-10">
        <span
          aria-hidden="true"
          className="w-7 h-7 rounded-full gradient-wordmark-sun shadow-wordmark-sun"
        />
        {t('wordmark')}
      </div>

      {/* Hero copy */}
      <m.div
        initial={suppressEntranceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: suppressEntranceMotion ? 0 : ENTRANCE_DURATION_S,
          delay: suppressEntranceMotion ? 0 : ENTRANCE_HEADLINE_DELAY_S,
          ease: 'easeOut',
        }}
        className="flex-1 lg:flex-none flex flex-col justify-center items-center relative z-10 text-balance"
      >
        <h1
          id="onboarding-headline"
          className="text-display-xl text-center leading-[1.15] tracking-[-0.03em] m-0"
        >
          {t.rich('headline', { br: () => <br /> })}
        </h1>
        <p className="mt-3.5 text-body-md text-white/70 text-center tracking-[0.02em]">
          {t('subtitle')}
        </p>
      </m.div>

      {/* CTA stack */}
      <m.div
        initial={suppressEntranceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: suppressEntranceMotion ? 0 : ENTRANCE_DURATION_S,
          delay: suppressEntranceMotion ? 0 : ENTRANCE_CTA_DELAY_S,
          ease: 'easeOut',
        }}
        className="relative z-10 lg:w-full lg:max-w-md"
      >
        <AmberCTAButton
          onClick={handleUseLocation}
          disabled={pending || !interactive}
          aria-busy={pending}
          data-testid="onboarding-cta-primary"
          data-pending={pending ? 'true' : 'false'}
          className="h-14 w-full text-[16px] font-bold tracking-[-0.01em] motion-safe:data-[pending=true]:animate-pulse-cta"
        >
          <Navigation aria-hidden="true" style={{ width: 16, height: 16 }} />
          {t('primaryCta')}
        </AmberCTAButton>
        <button
          type="button"
          onClick={handleUseCentrum}
          disabled={!interactive}
          data-testid="onboarding-cta-skip"
          className="w-full mt-[18px] min-h-11 flex items-center justify-center bg-transparent text-white/90 underline underline-offset-4 text-body-sm font-bold"
        >
          {t('skipLink')}
        </button>
        <p className="mt-[18px] text-center text-[11px] font-medium tracking-[0.04em] text-white/65">
          <Sun
            aria-hidden="true"
            className="inline-block align-middle -translate-y-px mr-1.5"
            style={{ width: 14, height: 14 }}
          />
          {t('trustMicrocopy')}
        </p>
      </m.div>
    </m.div>
  );
}
