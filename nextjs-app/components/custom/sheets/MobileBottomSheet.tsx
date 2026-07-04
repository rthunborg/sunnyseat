'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useDrag } from '@use-gesture/react';
import { motion, useReducedMotion } from 'motion/react';
import {
  DURATION_FAST_S,
  DURATION_SLOW_S,
  EASE_EXIT,
  EASE_SPRING,
} from '@/lib/constants/animation';
import { cn } from '@/lib/utils';

// Story 11.3 (AC2): the fourth INTERACTIVE snap is `'collapsed'` — handle-only
// (just the drag pill + safe-area). It is DISTINCT from `'dismissed'`: collapsed
// stays draggable + keyboard-reachable (the user drags it back up through
// peek → mid → full), while `'dismissed'` is a `pointer-events-none` exit state
// used elsewhere. Ordered smallest → largest for the gesture cascade.
export type MobileBottomSheetState = 'collapsed' | 'peek' | 'mid' | 'full' | 'dismissed';

export type MobileBottomSheetProps = {
  state: MobileBottomSheetState;
  onStateChange: (state: MobileBottomSheetState) => void;
  handleLabel: string;
  children: ReactNode;
  className?: string;
};

const DRAG_TO_FULL_PX = -36;
const DRAG_TO_PEEK_PX = 96;
// Story 11.3 (AC2/AC3): a downward drag past this distance (or a fast swipe)
// from peek reaches the handle-only `'collapsed'` snap. Kept below
// DRAG_TO_PEEK_PX so a shorter downward drag from mid/full lands on peek first
// (peek → collapsed needs a deliberate further pull). SET from the real drag
// feel (the epic left the gesture thresholds UNKNOWN); tests pin the BEHAVIOUR
// (peek ⇄ collapsed reachable by gesture + keyboard), not this exact number.
const DRAG_TO_COLLAPSED_PX = 64;
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
  const isMid = state === 'mid';
  const isPeek = state === 'peek';
  const isCollapsed = state === 'collapsed';
  const isDismissed = state === 'dismissed';
  const isScrollable = isFull || isMid;

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
      // Story 11.3 (AC2/AC3): resolve the release to one of the FOUR interactive
      // snaps (collapsed → peek → mid → full) using BOTH distance (`my`/`oy`) and
      // velocity (`vy` vs FAST_SWIPE_VELOCITY). Derive the release DIRECTION from
      // the accumulated movement sign, NOT the instantaneous `direction` — at the
      // final (release) event the pointer/touch delta is 0, so `dy` can read 0 and
      // a valid drag would otherwise snap back with no state change (the real bug
      // behind the reported jank; a CDP touchEnd carries no residual direction).
      const releaseDir = my < 0 ? -1 : my > 0 ? 1 : dy;
      // ---- UPWARD (expand) ----
      if (releaseDir < 0 && (my <= DRAG_TO_FULL_PX || oy <= DRAG_TO_FULL_PX)) {
        // collapsed climbs to peek; peek → mid; mid/full → full.
        onStateChange(isCollapsed ? 'peek' : isPeek ? 'mid' : 'full');
        return;
      }
      // ---- DOWNWARD (collapse) ----
      if (releaseDir > 0 && isFull && (my >= DRAG_TO_DISMISS_PX || vy >= FAST_SWIPE_VELOCITY)) {
        onStateChange('peek');
        return;
      }
      if (releaseDir > 0 && isFull && my >= DRAG_TO_PEEK_PX) {
        onStateChange('mid');
        return;
      }
      // From mid, a downward drag past the peek threshold (or a fast swipe) → peek.
      if (releaseDir > 0 && isMid && (my >= DRAG_TO_PEEK_PX || vy >= FAST_SWIPE_VELOCITY)) {
        onStateChange('peek');
        return;
      }
      // From peek, a downward drag past the collapsed threshold (or a fast swipe)
      // reaches the handle-only collapsed snap; a shorter drag settles back to peek.
      if (releaseDir > 0 && isPeek && (my >= DRAG_TO_COLLAPSED_PX || vy >= FAST_SWIPE_VELOCITY)) {
        onStateChange('collapsed');
        return;
      }
    },
    {
      axis: 'y',
      bounds: { top: -80, bottom: 320 },
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
      // See handleBind: derive release direction from the accumulated movement
      // (a release event carries no instantaneous direction). `my > 0` is already
      // guaranteed above, so this collapses to a distance/velocity test downward.
      const releaseDir = my > 0 ? 1 : dy;
      if (releaseDir > 0 && (my >= DRAG_TO_PEEK_PX || vy >= FAST_SWIPE_VELOCITY)) {
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
            ? 'pointer-events-none z-bottom-sheet-peek h-[var(--size-bottom-sheet-peek-h)] rounded-t-panel shadow-sheet-peek-up'
            : isFull
            ? 'z-bottom-sheet-full h-[min(var(--size-bottom-sheet-full-h),calc(100dvh-var(--size-mobile-nav-h)-env(safe-area-inset-top)-var(--spacing)*6))] rounded-t-sheet-full shadow-sheet-full-up'
            : isMid
            ? 'z-bottom-sheet-peek h-[var(--size-bottom-sheet-mid-h)] rounded-t-panel shadow-sheet-peek-up'
            : isCollapsed
            ? 'z-bottom-sheet-peek h-[var(--size-bottom-sheet-collapsed-h)] rounded-t-panel shadow-sheet-peek-up'
            : 'z-bottom-sheet-peek h-[var(--size-bottom-sheet-peek-h)] rounded-t-panel shadow-sheet-peek-up',
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
            onStateChange(clickCycle(state));
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onStateChange(clickCycle(state));
            }
            // Story 11.3 (AC2): the ArrowUp/ArrowDown cascade now spans the four
            // interactive snaps. ArrowUp expands one rung (collapsed → peek → mid
            // → full); ArrowDown collapses one rung (full → mid → peek →
            // collapsed). Both saturate at the ends (never reaching 'dismissed').
            if (event.key === 'ArrowUp') onStateChange(expandOneRung(state));
            if (event.key === 'ArrowDown') onStateChange(collapseOneRung(state));
          }}
          className="flex min-h-11 shrink-0 items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          style={{ touchAction: 'none' }}
        >
          <span
            aria-hidden="true"
            className={cn(
              'h-[var(--size-drag-pill-h)] rounded-pill',
              isFull ? 'w-[var(--size-drag-pill-w-lg)] bg-drag-handle' : 'w-[var(--size-drag-pill-w)] bg-drag-handle-map',
            )}
          />
        </button>
        <div
          ref={scrollBodyRef}
          data-bottom-sheet-scroll-body="true"
          {...bodyBind()}
          // Story 11.3 (AC2): in the handle-only collapsed snap the body content
          // (sort toggles, chip row, list) is hidden from AT + interaction — only
          // the drag pill + safe-area show. Distinct from 'dismissed' (which
          // hides the whole sheet); here the handle above stays interactive.
          aria-hidden={isDismissed || isCollapsed}
          className={cn(
            'min-h-0 flex-1 px-4 pb-4',
            isScrollable ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden',
            isCollapsed && 'pointer-events-none',
          )}
          style={{ touchAction: isScrollable ? 'pan-y' : 'none' }}
        >
          {children}
        </div>
      </motion.div>
    </>
  );
}

// Story 11.3 (AC2): the four INTERACTIVE snaps ordered smallest → largest for
// the keyboard/click cascade. `'dismissed'` is the non-interactive exit state and
// is deliberately NOT part of this ladder — the handle can never reach it.
const SNAP_LADDER = ['collapsed', 'peek', 'mid', 'full'] as const;

/** ArrowUp / expand: move up one rung, saturating at 'full'. */
function expandOneRung(state: MobileBottomSheetState): MobileBottomSheetState {
  const index = SNAP_LADDER.indexOf(state as (typeof SNAP_LADDER)[number]);
  if (index === -1) return 'mid';
  return SNAP_LADDER[Math.min(index + 1, SNAP_LADDER.length - 1)];
}

/** ArrowDown / collapse: move down one rung, saturating at 'collapsed'. */
function collapseOneRung(state: MobileBottomSheetState): MobileBottomSheetState {
  const index = SNAP_LADDER.indexOf(state as (typeof SNAP_LADDER)[number]);
  if (index === -1) return 'peek';
  return SNAP_LADDER[Math.max(index - 1, 0)];
}

/**
 * Click / Enter / Space toggle: cycle upward through the ladder, then wrap from
 * the top back down to peek so a tap keeps opening the sheet and, once full,
 * tucks it back to peek (never straight to the handle-only collapsed state,
 * which is a deliberate drag/keyboard action).
 */
function clickCycle(state: MobileBottomSheetState): MobileBottomSheetState {
  switch (state) {
    case 'collapsed':
      return 'peek';
    case 'peek':
      return 'mid';
    case 'mid':
      return 'full';
    case 'full':
      return 'peek';
    default:
      return 'mid';
  }
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
