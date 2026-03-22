'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Lightweight slide/fade animation hook replacing framer-motion
 * for simple enter/exit transitions.
 *
 * Manages a three-phase lifecycle: mount → animate-in → (visible) → animate-out → unmount.
 * Uses CSS transitions for all animation, keeping JS bundle minimal.
 */

export type SlideDirection = 'up' | 'right' | 'down' | 'left';

interface UseSlideAnimationOptions {
  /** Whether the content should be visible */
  isOpen: boolean;
  /** Slide direction for enter (exit reverses automatically) */
  direction?: SlideDirection;
  /** Duration in ms */
  duration?: number;
  /** Whether to use opacity only (for reduced motion) */
  reducedMotion?: boolean;
}

interface SlideAnimationResult {
  /** Whether the DOM element should be mounted */
  mounted: boolean;
  /** CSS styles to apply */
  style: React.CSSProperties;
  /** Call when the element's transitionend fires */
  onTransitionEnd: () => void;
}

const TRANSFORMS: Record<SlideDirection, string> = {
  up: 'translateY(100%)',
  down: 'translateY(-100%)',
  right: 'translateX(100%)',
  left: 'translateX(-100%)',
};

export function useSlideAnimation({
  isOpen,
  direction = 'up',
  duration = 300,
  reducedMotion = false,
}: UseSlideAnimationOptions): SlideAnimationResult {
  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState<'enter' | 'exit' | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen && !mounted) {
      setMounted(true);
      // Double-rAF to ensure DOM is painted before triggering transition
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => {
          setAnimating('enter');
        });
      });
    } else if (!isOpen && mounted) {
      setAnimating('exit');
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen, mounted]);

  const onTransitionEnd = useCallback(() => {
    if (animating === 'exit') {
      setMounted(false);
      setAnimating(null);
    }
  }, [animating]);

  // For exit: also unmount after duration as fallback
  useEffect(() => {
    if (animating !== 'exit') return;
    const timer = setTimeout(() => {
      setMounted(false);
      setAnimating(null);
    }, duration + 50);
    return () => clearTimeout(timer);
  }, [animating, duration]);

  const isVisible = animating === 'enter';
  const transform = TRANSFORMS[direction];

  const style: React.CSSProperties = reducedMotion
    ? {
        opacity: isVisible ? 1 : 0,
        transition: `opacity ${duration}ms ease`,
      }
    : {
        transform: isVisible ? 'translate(0, 0)' : transform,
        transition: `transform ${duration}ms cubic-bezier(0.32, 0.72, 0, 1)`,
      };

  return { mounted, style, onTransitionEnd };
}
