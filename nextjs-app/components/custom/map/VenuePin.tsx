'use client';

import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { Cloud, Sun } from 'lucide-react';
import type { VenuePinData, VenuePinSelection } from '@/lib/types/map';
import { isVenuePubliclySunny } from '@/lib/utils/public-sun';

type VenuePinProps = {
  venue: VenuePinData;
  isSelected: boolean;
  onClick: () => void;
  /**
   * Pre-resolved aria label string. The layer above (`VenuePinLayer`)
   * resolves the Swedish public-sun aria-key variants once and passes the matching
   * string here, so each pin does not need its own `<NextIntlClientProvider>`
   * wrapper.
   */
  ariaLabel: string;
};

/**
 * Story 1.4 — venue map pin with visual variants:
 *   sunny | shaded
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

  const state: VenuePinSelection = isVenuePubliclySunny(venue) ? 'sunny' : 'shaded';

  // Clamp + default — the API contract is `0..100`, but defensive
  // rendering means we never display "NaN%" / "undefined%" if the
  // upstream ever drifts. `Math.round` keeps the pill text crisp.
  const safePercent = Math.max(
    0,
    Math.min(100, Math.round(Number.isFinite(venue.sunExposurePercent) ? venue.sunExposurePercent : 0)),
  );

  const subtree =
    state === 'sunny' ? (
      <SunnyPill percent={safePercent} />
    ) : (
      <ShadedPill />
    );

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      data-testid="venue-pin"
      data-pin-state={state}
      data-selected={isSelected ? 'true' : 'false'}
      data-reduced-motion={shouldReduceMotion ? 'true' : 'false'}
      className="flex min-h-11 min-w-11 cursor-pointer items-end justify-center border-0 bg-transparent p-0 outline-none focus-visible:rounded-pill focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2"
    >
      {shouldReduceMotion ? (
        subtree
      ) : (
        <AnimatePresence initial={false}>
          <m.div key={`${state}-pin`} initial={false} transition={{ duration: 0 }}>
            {subtree}
          </m.div>
        </AnimatePresence>
      )}
    </button>
  );
}

function SunnyPill({ percent }: { percent: number }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-[50px] w-11 flex-col items-center justify-center gap-0.5 rounded-pill border-[2.5px] border-white bg-amber-pin py-1 shadow-card">
        <span className="text-label-xs leading-none text-text-primary">{percent}%</span>
        <Sun
          aria-hidden="true"
          data-pin-icon="sun"
          className="size-3.5 text-text-primary"
        />
      </div>
      <span
        data-pin-tail
        className="-mt-0.5 block h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-amber-pin shadow-subtle"
      />
    </div>
  );
}

function ShadedPill() {
  return (
    <div className="flex flex-col items-center opacity-80">
      <div className="flex min-h-11 min-w-11 items-center justify-center rounded-pill border border-white/20 bg-pin-shaded px-4 py-2 shadow-subtle">
        <Cloud
          aria-hidden="true"
          data-pin-icon="cloud"
          className="text-text-body"
          style={{ width: '13px', height: '13px' }}
        />
      </div>
      <span
        data-pin-tail
        className="block w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-pin-shaded"
      />
    </div>
  );
}
