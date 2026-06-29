'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';
import { EASE_ENTER } from '@/lib/constants/animation';
import { ABOUT_ACCURACY_COUNTUP_MS } from '@/lib/constants/about';

export type AccuracyCountUpProps = {
  /** Final figure to count up to (the placeholder accuracy constant). */
  value: number;
  /** Suffix appended to the figure, e.g. "%". */
  suffix: string;
  /** Static, screen-reader-only label announcing the final figure once. */
  ariaLabel: string;
  className?: string;
};

/**
 * Scroll-triggered count-up for the About "TRÄFFSÄKERHET" stat (AC #3, #5).
 *
 * Built from scratch on Motion (`motion/react`) — the repo has no count-up
 * primitive. `useInView({ once: true })` fires the first time the stat scrolls
 * into view; `animate(0 → value)` runs over 800 ms with `easing-enter`.
 *
 * Accessibility: the animating digits are `aria-hidden`; a static `sr-only`
 * label announces the final figure once, so assistive tech never reads a
 * rapidly-changing number. Under `prefers-reduced-motion` the figure renders
 * instantly at its final value with no count-up.
 *
 * Resting state: the initial render shows the final `value` (not 0), so SSR,
 * no-JS, and crawler renders show the real figure rather than shipping a stuck
 * "0%". A JS client resets to 0 only while the stat is still below the fold
 * (off-screen, so the reset is never seen) and counts up as it scrolls into
 * view — a connected user sees the 0 → value animation, never a resting 0%.
 */
export function AccuracyCountUp({ value, suffix, ariaLabel, className }: AccuracyCountUpProps) {
  const ref = useRef<HTMLDivElement>(null);
  // `amount: 0.6` so the stat is meaningfully on-screen before it counts.
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduceMotion = useReducedMotion() ?? false;
  // Initial value is the final figure so SSR / no-JS / crawler renders show the
  // real number, never a stuck "0%". The effect below resets to 0 only while
  // off-screen (see the !inView branch) so the count-up still plays on scroll-in.
  const [display, setDisplay] = useState(value);
  // The count-up is a one-time animation (AC #3). `once: true` only stops
  // `useInView` re-firing; this ref makes "fire once" hold across dependency
  // changes too, so disabling prefers-reduced-motion at runtime can't reset the
  // already-shown figure back to 0 and replay the tween.
  const hasRun = useRef(false);

  useEffect(() => {
    // Reduced motion: show the final figure immediately, regardless of scroll
    // (also covers enabling reduced motion mid-animation — snap to the final).
    if (reduceMotion) {
      hasRun.current = true;
      setDisplay(value);
      return;
    }
    if (hasRun.current) return;
    // Below the fold: reset to 0 so the count-up has somewhere to start. This
    // runs while the stat is off-screen, so the reset itself is never seen; the
    // initial `value` covered SSR / no-JS. `hasRun` stays false so the tween
    // still fires when the stat scrolls into view.
    if (!inView) {
      setDisplay(0);
      return;
    }
    hasRun.current = true;
    const controls = animate(0, value, {
      duration: ABOUT_ACCURACY_COUNTUP_MS / 1000,
      ease: EASE_ENTER,
      onUpdate: (latest) => setDisplay(Math.round(latest)),
      onComplete: () => setDisplay(value),
    });
    return () => controls.stop();
  }, [inView, reduceMotion, value]);

  return (
    <div ref={ref} data-testid="about-accuracy-stat" className={className}>
      <span className="sr-only">{ariaLabel}</span>
      <span aria-hidden="true">
        {display}
        {suffix}
      </span>
    </div>
  );
}
