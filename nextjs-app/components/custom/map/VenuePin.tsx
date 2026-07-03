'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Cloud, Sun } from 'lucide-react';
import type { VenuePinData, VenuePinSelection } from '@/lib/types/map';

type VenuePinProps = {
  venue: VenuePinData;
  isSelected: boolean;
  onClick: () => void;
  /**
   * Pre-resolved aria label string. The layer above (`VenuePinLayer`)
   * resolves the three Swedish aria-key variants (`pinSunnyAria` /
   * `pinPartialAria` / `pinShadedAria`) once and passes the matching
   * string here, so each pin does not need its own `<NextIntlClientProvider>`
   * wrapper.
   */
  ariaLabel: string;
};

const MOTION_DURATION = 0.2;

/**
 * Story 1.4 — venue map pin with visual variants:
 *   sunny | sunny-selected | shaded | obscured
 *
 * Sunny pins cross-fade between a pill-with-pointer and a perfect circle
 * when selected (AC3). Shaded pins keep their pill shape regardless. The
 * morph is implemented as a true cross-fade between two compositions
 * because the pointer tail is a separate DOM element (Critical
 * constraint #4).
 *
 * Story 10.2 adds the muted `obscured` variant — the weather-gated "Sol
 * bakom moln" pill. It is a slate blue-grey pill (distinct from BOTH the
 * amber sunny pill AND the grey shaded pill) that keeps a Cloud icon (so
 * the state is not colour-only per NFR27) and keeps the geometric solläge
 * `%` visible (AC2: position, not weather). Like the shaded pill it has a
 * single rendered state and does not morph on selection.
 *
 * The pin is rendered as a focusable `<button>` so keyboard users can
 * activate it. Differentiated by icon shape (sun vs. cloud) — colour
 * alone is not relied on (NFR27).
 */
export function VenuePin({ venue, isSelected, onClick, ariaLabel }: VenuePinProps) {
  // Treat null (initial render before matchMedia resolves) as true so
  // reduced-motion users never see a one-frame entrance flicker. The
  // pin baseline opacity is `1`; without this fallback, the entrance
  // motion could flash for a frame before the hook resolves.
  //
  // Story 1.6 review (P36): the project intentionally diverges from
  // OnboardingScreen's `?? false` default. Components whose baseline
  // CSS is "fully visible" (VenuePin, VenuePinLayer) default to `true`
  // — accessibility-defensive. Components whose CSS baseline is
  // "invisible until motion runs" (OnboardingScreen) default to `false`
  // so non-reduced-motion users don't miss the entrance entirely.
  const shouldReduceMotion = useReducedMotion() ?? true;

  const isObscured = venue.sunStatus === 'CloudObscured';
  const isSunny =
    !isObscured &&
    (venue.sunStatus === 'Sunny' || venue.sunStatus === 'Partial');
  const state: VenuePinSelection = isSunny
    ? isSelected
      ? 'sunny-selected'
      : 'sunny'
    : isObscured
      ? 'obscured'
      : 'shaded';

  // Clamp + default — the API contract is `0..100`, but defensive
  // rendering means we never display "NaN%" / "undefined%" if the
  // upstream ever drifts. `Math.round` keeps the pill text crisp.
  const safePercent = Math.max(
    0,
    Math.min(100, Math.round(Number.isFinite(venue.sunExposurePercent) ? venue.sunExposurePercent : 0)),
  );

  const subtree =
    state === 'sunny-selected' ? (
      <SunnyCircle percent={safePercent} />
    ) : state === 'sunny' ? (
      <SunnyPill percent={safePercent} />
    ) : state === 'obscured' ? (
      <ObscuredPill percent={safePercent} />
    ) : (
      <ShadedPill percent={safePercent} />
    );

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      data-testid="venue-pin"
      data-pin-state={state}
      data-reduced-motion={shouldReduceMotion ? 'true' : 'false'}
      className="bg-transparent border-0 p-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 focus-visible:rounded-pill"
    >
      {shouldReduceMotion ? (
        subtree
      ) : (
        <AnimatePresence initial={false}>
          {state === 'sunny-selected' ? (
            <motion.div
              key="sunny-circle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: MOTION_DURATION, ease: 'easeInOut' }}
            >
              <SunnyCircle percent={safePercent} />
            </motion.div>
          ) : state === 'sunny' ? (
            <motion.div
              key="sunny-pill"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: MOTION_DURATION, ease: 'easeInOut' }}
            >
              <SunnyPill percent={safePercent} />
            </motion.div>
          ) : state === 'obscured' ? (
            // Mirror the shaded pill's single-state treatment: no
            // selected-morph variant, no entrance fade (initial={false},
            // duration 0) so crossing the weather gate on refresh does not
            // flash (Design Gate "Animation").
            <motion.div key="obscured-pill" initial={false} transition={{ duration: 0 }}>
              <ObscuredPill percent={safePercent} />
            </motion.div>
          ) : (
            <motion.div key="shaded-pill" initial={false} transition={{ duration: 0 }}>
              <ShadedPill percent={safePercent} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </button>
  );
}

function SunnyPill({ percent }: { percent: number }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-[50px] w-11 flex-col items-center justify-center gap-0.5 rounded-pill border-[2.5px] border-white bg-amber-pin py-1 shadow-card">
        <span className="text-label-xs leading-none text-amber-cta-text">{percent}%</span>
        <Sun
          aria-hidden="true"
          data-pin-icon="sun"
          className="size-3.5 text-amber-cta-text"
        />
      </div>
      <span
        data-pin-tail
        className="-mt-0.5 block h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-amber-pin shadow-subtle"
      />
    </div>
  );
}

function SunnyCircle({ percent }: { percent: number }) {
  return (
    <div className="bg-amber-pin border-[2px] border-white shadow-card rounded-pill flex flex-col items-center justify-center size-11">
      <span className="text-label-xs text-amber-cta-text leading-none">{percent}%</span>
      <Sun
        aria-hidden="true"
        data-pin-icon="sun"
        className="text-amber-cta-text"
        style={{ width: '16.5px', height: '16.5px' }}
      />
    </div>
  );
}

function ShadedPill({ percent }: { percent: number }) {
  return (
    <div className="opacity-80 flex flex-col items-center">
      <div className="bg-pin-shaded border border-white/20 shadow-subtle rounded-pill px-6 py-2 flex items-center gap-1">
        <Cloud
          aria-hidden="true"
          data-pin-icon="cloud"
          className="text-text-body"
          style={{ width: '13px', height: '13px' }}
        />
        <span className="text-label-md text-text-body">{percent}%</span>
      </div>
      <span
        data-pin-tail
        className="block w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-pin-shaded"
      />
    </div>
  );
}

/**
 * Story 10.2 — the muted "Sol bakom moln" (CloudObscured) pill. A slate
 * blue-grey fill (`--color-pin-obscured`) with WHITE text/icon (5.50:1, AA)
 * that reads unmistakably as "cloudy now" — distinct from the amber sunny
 * pill and the light-grey shaded pill. Keeps the Cloud icon (not colour-only,
 * NFR27) and the geometric solläge `%` (AC2 position, not weather).
 */
function ObscuredPill({ percent }: { percent: number }) {
  return (
    <div className="flex flex-col items-center" data-pin-obscured="true">
      <div className="bg-pin-obscured border-[2.5px] border-white shadow-card rounded-pill px-5 py-2 flex items-center gap-1">
        <Cloud
          aria-hidden="true"
          data-pin-icon="cloud"
          className="text-white"
          style={{ width: '14px', height: '14px' }}
        />
        <span className="text-label-md text-white">{percent}%</span>
      </div>
      <span
        data-pin-tail
        className="block w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-pin-obscured"
      />
    </div>
  );
}
