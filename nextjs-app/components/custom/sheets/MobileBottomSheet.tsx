'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useDrag } from '@use-gesture/react';
import { ChevronDown } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import {
  DURATION_FAST_S,
  DURATION_SLOW_S,
  EASE_EXIT,
  EASE_SPRING,
} from '@/lib/constants/animation';
import { cn } from '@/lib/utils';

export type MobileBottomSheetState = 'peek' | 'full' | 'dismissed';

export type MobileBottomSheetProps = {
  state: MobileBottomSheetState;
  onStateChange: (state: MobileBottomSheetState) => void;
  handleLabel: string;
  children: ReactNode;
  className?: string;
};

const DRAG_TO_FULL_PX = -36;
const DRAG_TO_PEEK_PX = 96;
const DRAG_TO_DISMISS_PX = 220;
const FAST_SWIPE_VELOCITY = 0.55;
const CLICK_SUPPRESS_DRAG_PX = 8;

export function MobileBottomSheet({
  state,
  onStateChange,
  handleLabel,
  children,
  className,
}: MobileBottomSheetProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const suppressNextClickRef = useRef(false);
  const [dragY, setDragY] = useState(0);
  const isFull = state === 'full';
  const isDismissed = state === 'dismissed';

  const handleBind = useDrag(
    ({ event, movement: [, my], offset: [, oy], velocity: [, vy], direction: [, dy], last, active }) => {
      const target = event.target instanceof Element ? event.target : null;
      const isBodyDrag = Boolean(target?.closest('[data-bottom-sheet-scroll-body="true"]'));
      const bodyScrollTop = scrollBodyRef.current?.scrollTop ?? 0;

      if (last) setDragY(0);
      if (isBodyDrag && isFull && bodyScrollTop > 0 && my > 0) return;
      if (active && !shouldReduceMotion) {
        setDragY(Math.max(-80, my));
      }
      if (!last) return;

      suppressNextClickRef.current = Math.abs(my) > CLICK_SUPPRESS_DRAG_PX;
      if (dy < 0 && (my <= DRAG_TO_FULL_PX || oy <= DRAG_TO_FULL_PX)) {
        onStateChange('full');
        return;
      }
      if (dy > 0 && isFull && (my >= DRAG_TO_DISMISS_PX || vy >= FAST_SWIPE_VELOCITY)) {
        onStateChange('peek');
        return;
      }
      if (dy > 0 && (my >= DRAG_TO_PEEK_PX || vy >= FAST_SWIPE_VELOCITY)) {
        onStateChange('peek');
      }
    },
    {
      axis: 'y',
      bounds: { top: -80, bottom: 260 },
      rubberband: 0.15,
      pointer: { capture: true },
    },
  );

  const bodyBind = useDrag(
    ({ movement: [, my], velocity: [, vy], direction: [, dy], last, active }) => {
      if (!isFull) {
        if (last) setDragY(0);
        return;
      }
      const bodyScrollTop = scrollBodyRef.current?.scrollTop ?? 0;
      if (last) setDragY(0);
      if (bodyScrollTop > 0 || my <= 0) return;

      if (active && !shouldReduceMotion) {
        setDragY(Math.min(120, my));
      }
      if (!last) return;

      suppressNextClickRef.current = my > CLICK_SUPPRESS_DRAG_PX;
      if (dy > 0 && (my >= DRAG_TO_PEEK_PX || vy >= FAST_SWIPE_VELOCITY)) {
        onStateChange('peek');
      }
    },
    {
      axis: 'y',
      bounds: { top: 0, bottom: 180 },
      rubberband: 0.12,
      pointer: { capture: false },
    },
  );

  return (
    <>
      {isFull && (
        <motion.div
          aria-hidden="true"
          data-testid="mobile-bottom-sheet-backdrop"
          className="absolute inset-0 z-bottom-sheet-peek bg-text-primary/20 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION_FAST_S, ease: EASE_EXIT }}
        />
      )}
      <motion.div
        layout={!shouldReduceMotion}
        data-testid="mobile-bottom-sheet"
        data-state={state}
        className={cn(
          'absolute inset-x-0 bottom-[var(--size-mobile-nav-h)] flex flex-col overflow-hidden bg-surface-cream text-text-primary lg:hidden',
          'touch-pan-y',
          isDismissed
            ? 'pointer-events-none z-bottom-sheet-peek h-[100px] rounded-t-panel shadow-sheet-peek-up'
            : isFull
            ? 'top-[var(--size-bottom-sheet-full-top)] z-bottom-sheet-full rounded-t-sheet-full shadow-sheet-full-up'
            : 'z-bottom-sheet-peek h-[100px] rounded-t-panel shadow-sheet-peek-up',
          className,
        )}
        initial={false}
        animate={sheetMotionState(state, shouldReduceMotion, dragY)}
        transition={{
          duration: shouldReduceMotion ? DURATION_FAST_S : DURATION_SLOW_S,
          ease: shouldReduceMotion ? EASE_EXIT : EASE_SPRING,
        }}
      >
        <button
          type="button"
          data-testid="mobile-bottom-sheet-handle"
          aria-label={handleLabel}
          {...handleBind()}
          onClick={(event) => {
            if (suppressNextClickRef.current) {
              suppressNextClickRef.current = false;
              event.preventDefault();
              return;
            }
            onStateChange(isFull ? 'peek' : 'full');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onStateChange(isFull ? 'peek' : 'full');
            }
            if (event.key === 'ArrowUp') onStateChange('full');
            if (event.key === 'ArrowDown') onStateChange('peek');
          }}
          className="flex min-h-11 shrink-0 items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          style={{ touchAction: 'none' }}
        >
          <span
            aria-hidden="true"
            className={cn(
              'h-[var(--size-drag-pill-h)] rounded-pill',
              isFull ? 'w-[var(--size-drag-pill-w-lg)] bg-drag-handle' : 'w-[var(--size-drag-pill-w)] bg-drag-handle-map/40',
            )}
          />
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-4 text-text-body motion-safe:transition-transform motion-safe:duration-slow',
              isFull && !shouldReduceMotion && 'rotate-180',
            )}
          />
        </button>
        <div
          ref={scrollBodyRef}
          data-bottom-sheet-scroll-body="true"
          {...bodyBind()}
          aria-hidden={!isFull}
          className={cn(
            'min-h-0 flex-1 px-4 pb-4',
            isFull ? 'overflow-y-auto overscroll-contain' : 'hidden overflow-hidden',
          )}
          style={{ touchAction: isFull ? 'pan-y' : 'none' }}
        >
          {children}
        </div>
      </motion.div>
    </>
  );
}

function sheetMotionState(
  state: MobileBottomSheetState,
  shouldReduceMotion: boolean,
  dragY: number,
) {
  if (shouldReduceMotion) {
    return { opacity: state === 'dismissed' ? 0 : 1, y: 0 };
  }
  if (state === 'dismissed') return { opacity: 0, y: '100%' };
  return { opacity: 1, y: dragY };
}
