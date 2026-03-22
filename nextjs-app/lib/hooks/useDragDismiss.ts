'use client';

import { useRef, useCallback } from 'react';

/**
 * Lightweight drag-to-dismiss replacing framer-motion's drag prop.
 * Tracks touch/pointer movement and calls onDismiss when the user
 * drags past a threshold or with sufficient velocity.
 */

interface UseDragDismissOptions {
  /** Direction the user drags to dismiss */
  axis: 'y' | 'x';
  /** Offset threshold in px to trigger dismiss (default 80) */
  threshold?: number;
  /** Velocity threshold in px/s (default 400) */
  velocityThreshold?: number;
  /** Called when dismiss is triggered */
  onDismiss: () => void;
  /** Elastic factor (0-1) for drag resistance (default 0.4) */
  elasticity?: number;
}

interface DragDismissResult {
  /** Spread these onto the draggable element */
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  /** Ref to attach to the draggable element for transform updates */
  dragRef: React.RefObject<HTMLDivElement | null>;
}

export function useDragDismiss({
  axis,
  threshold = 80,
  velocityThreshold = 400,
  onDismiss,
  elasticity = 0.4,
}: UseDragDismissOptions): DragDismissResult {
  const dragRef = useRef<HTMLDivElement>(null);
  const startPos = useRef(0);
  const startTime = useRef(0);
  const currentOffset = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startPos.current = axis === 'y' ? touch.clientY : touch.clientX;
    startTime.current = Date.now();
    currentOffset.current = 0;

    if (dragRef.current) {
      dragRef.current.style.transition = 'none';
    }
  }, [axis]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const current = axis === 'y' ? touch.clientY : touch.clientX;
    let offset = current - startPos.current;

    // Only allow dragging in the positive direction (down for y, right for x)
    if (offset < 0) offset = 0;

    // Apply elasticity
    offset = offset * elasticity;
    currentOffset.current = offset;

    if (dragRef.current) {
      const transform = axis === 'y'
        ? `translateY(${offset}px)`
        : `translateX(${offset}px)`;
      dragRef.current.style.transform = transform;
    }
  }, [axis, elasticity]);

  const onTouchEnd = useCallback(() => {
    const elapsed = (Date.now() - startTime.current) / 1000; // seconds
    const velocity = elapsed > 0 ? currentOffset.current / elapsed : 0;
    const rawOffset = currentOffset.current / elasticity; // un-elastic offset

    if (rawOffset > threshold || velocity > velocityThreshold) {
      onDismiss();
    } else if (dragRef.current) {
      // Snap back
      dragRef.current.style.transition = 'transform 200ms ease-out';
      dragRef.current.style.transform = 'translate(0, 0)';
    }

    currentOffset.current = 0;
  }, [threshold, velocityThreshold, onDismiss, elasticity]);

  return {
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
    dragRef,
  };
}
