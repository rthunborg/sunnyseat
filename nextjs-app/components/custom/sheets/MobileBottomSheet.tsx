'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useDrag } from '@use-gesture/react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

export type MobileBottomSheetMetrics = {
  visibleRows: number;
  maxRows: number;
  rowCount: number;
  rowHeightPx: number;
  chromeHeightPx: number;
  handleHeightPx: number;
  safeAreaInsetBottomPx: number;
  sheetHeightPx: number;
  maxSheetHeightPx: number;
};

export type MobileBottomSheetProps = {
  visibleRows: number;
  onVisibleRowsChange: (visibleRows: number) => void;
  handleLabel: string;
  rowStatusLabel: (visibleRows: number, maxRows: number) => string;
  children: ReactNode;
  chrome?: ReactNode;
  rowCount?: number;
  forcedDragOffsetPx?: number;
  onMetricsChange?: (metrics: MobileBottomSheetMetrics) => void;
  className?: string;
};

const HANDLE_HEIGHT_FALLBACK_PX = 44;
const ROW_HEIGHT_FALLBACK_PX = 88;
const CHROME_HEIGHT_FALLBACK_PX = 104;
const BODY_BOTTOM_PADDING_PX = 16;
const MOBILE_NAV_HEIGHT_PX = 52;
const MOBILE_TOP_CHROME_CLEARANCE_PX = 211;
const CLICK_SUPPRESS_DRAG_PX = 8;
const FAST_SWIPE_VELOCITY = 0.25;
const FLING_ROW_SKIP = 2;
const SHEET_SETTLE_SPRING = {
  type: 'spring',
  stiffness: 420,
  damping: 38,
  mass: 0.9,
} as const;

export type ComputeMaxVisibleRowsInput = {
  viewportHeightPx: number;
  rowCount: number;
  rowHeightPx: number;
  handleHeightPx?: number;
  chromeHeightPx?: number;
  navHeightPx?: number;
  topChromeClearancePx?: number;
  safeAreaInsetBottomPx?: number;
  bodyBottomPaddingPx?: number;
};

export function computeMaxVisibleRows({
  viewportHeightPx,
  rowCount,
  rowHeightPx,
  handleHeightPx = HANDLE_HEIGHT_FALLBACK_PX,
  chromeHeightPx = CHROME_HEIGHT_FALLBACK_PX,
  navHeightPx = MOBILE_NAV_HEIGHT_PX,
  topChromeClearancePx = MOBILE_TOP_CHROME_CLEARANCE_PX,
  safeAreaInsetBottomPx = 0,
  bodyBottomPaddingPx = BODY_BOTTOM_PADDING_PX,
}: ComputeMaxVisibleRowsInput): number {
  const finiteRows = Math.max(0, Math.floor(finiteOr(rowCount, 0)));
  if (finiteRows === 0) return 0;

  const viewport = Math.max(0, finiteOr(viewportHeightPx, 0));
  const rowHeight = Math.max(1, finiteOr(rowHeightPx, ROW_HEIGHT_FALLBACK_PX));
  const safeAreaInsetBottom = Math.max(0, finiteOr(safeAreaInsetBottomPx, 0));
  const availableSheetHeight = Math.max(
    handleHeightPx,
    viewport - navHeightPx - safeAreaInsetBottom - topChromeClearancePx,
  );
  const rowBudget =
    availableSheetHeight - handleHeightPx - chromeHeightPx - bodyBottomPaddingPx;

  return clampInteger(Math.floor(rowBudget / rowHeight), 0, finiteRows);
}

export type ComputeSheetHeightInput = {
  visibleRows: number;
  rowHeightPx: number;
  handleHeightPx?: number;
  chromeHeightPx?: number;
  bodyBottomPaddingPx?: number;
};

export function computeSheetHeight({
  visibleRows,
  rowHeightPx,
  handleHeightPx = HANDLE_HEIGHT_FALLBACK_PX,
  chromeHeightPx = CHROME_HEIGHT_FALLBACK_PX,
  bodyBottomPaddingPx = BODY_BOTTOM_PADDING_PX,
}: ComputeSheetHeightInput): number {
  const rows = Math.max(0, Math.floor(finiteOr(visibleRows, 0)));
  if (rows === 0) return handleHeightPx;
  return handleHeightPx + chromeHeightPx + bodyBottomPaddingPx + rows * rowHeightPx;
}

export type ResolveVisibleRowsAfterDragInput = {
  visibleRows: number;
  maxRows: number;
  rowHeightPx: number;
  movementY: number;
  velocityY: number;
  directionY?: number;
};

export function resolveVisibleRowsAfterDrag({
  visibleRows,
  maxRows,
  rowHeightPx,
  movementY,
  velocityY,
  directionY = 0,
}: ResolveVisibleRowsAfterDragInput): number {
  const currentRows = clampInteger(visibleRows, 0, maxRows);
  if (maxRows <= 0) return 0;
  if (Math.abs(movementY) <= CLICK_SUPPRESS_DRAG_PX) return currentRows;

  const releaseDir = movementY < 0 ? 1 : movementY > 0 ? -1 : -directionY;
  if (releaseDir === 0) return currentRows;

  const rowHeight = Math.max(1, rowHeightPx);
  const distanceRows = Math.round(Math.abs(movementY) / rowHeight);
  const velocityRows = velocityY >= FAST_SWIPE_VELOCITY ? FLING_ROW_SKIP : 0;
  const deltaRows = releaseDir * Math.max(distanceRows, velocityRows);
  if (deltaRows === 0) return currentRows;

  return clampInteger(currentRows + deltaRows, 0, maxRows);
}

export function MobileBottomSheet({
  visibleRows,
  onVisibleRowsChange,
  handleLabel,
  rowStatusLabel,
  children,
  chrome,
  rowCount = 0,
  forcedDragOffsetPx = 0,
  onMetricsChange,
  className,
}: MobileBottomSheetProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const suppressNextClickRef = useRef(false);
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [measured, setMeasured] = useState({
    handleHeightPx: HANDLE_HEIGHT_FALLBACK_PX,
    rowHeightPx: ROW_HEIGHT_FALLBACK_PX,
    chromeHeightPx: CHROME_HEIGHT_FALLBACK_PX,
    safeAreaInsetBottomPx: 0,
    rowCount: Math.max(0, rowCount),
    viewportHeightPx: 844,
  });

  const measure = useCallback(() => {
    const handleHeightPx = elementHeight(handleRef.current, HANDLE_HEIGHT_FALLBACK_PX);
    const chromeHeightPx = elementHeight(chromeRef.current, CHROME_HEIGHT_FALLBACK_PX);
    const rowNodes = Array.from(
      scrollBodyRef.current?.querySelectorAll<HTMLElement>(
        '[data-testid="venue-card"], [data-testid="venue-card-skeleton"]',
      ) ?? [],
    );
    const measuredRowCount = Math.max(rowCount, rowNodes.length);
    const rowHeightPx = measureRowHeight(rowNodes, ROW_HEIGHT_FALLBACK_PX);
    const viewportHeightPx =
      typeof window === 'undefined' ? 844 : window.innerHeight || 844;
    const safeAreaInsetBottomPx = measureSafeAreaInsetBottomPx();

    setMeasured((previous) => {
      const next = {
        handleHeightPx,
        rowHeightPx,
        chromeHeightPx,
        safeAreaInsetBottomPx,
        rowCount: measuredRowCount,
        viewportHeightPx,
      };
      return measurementsEqual(previous, next) ? previous : next;
    });
  }, [rowCount]);

  useLayoutEffect(() => {
    measure();
  }, [children, chrome, measure, visibleRows]);

  useLayoutEffect(() => {
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => measure());
    const nodes: Element[] = [];
    if (sheetRef.current) nodes.push(sheetRef.current);
    if (handleRef.current) nodes.push(handleRef.current);
    if (bodyRef.current) nodes.push(bodyRef.current);
    if (chromeRef.current) nodes.push(chromeRef.current);
    if (scrollBodyRef.current) nodes.push(scrollBodyRef.current);
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [measure]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => measure();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [measure]);

  const maxRows = useMemo(
    () =>
      computeMaxVisibleRows({
        viewportHeightPx: measured.viewportHeightPx,
        rowCount: measured.rowCount,
        rowHeightPx: measured.rowHeightPx,
        handleHeightPx: measured.handleHeightPx,
        chromeHeightPx: measured.chromeHeightPx,
        safeAreaInsetBottomPx: measured.safeAreaInsetBottomPx,
      }),
    [measured],
  );
  const clampedVisibleRows = clampInteger(visibleRows, 0, maxRows);
  const sheetHeightPx = computeSheetHeight({
    visibleRows: clampedVisibleRows,
    rowHeightPx: measured.rowHeightPx,
    handleHeightPx: measured.handleHeightPx,
    chromeHeightPx: measured.chromeHeightPx,
  });
  const maxSheetHeightPx = computeSheetHeight({
    visibleRows: maxRows,
    rowHeightPx: measured.rowHeightPx,
    handleHeightPx: measured.handleHeightPx,
    chromeHeightPx: measured.chromeHeightPx,
  });
  const dragHeightPx = clampNumber(
    sheetHeightPx + dragOffsetPx + forcedDragOffsetPx,
    measured.handleHeightPx,
    Math.max(measured.handleHeightPx, maxSheetHeightPx),
  );
  const renderedHeightPx = isDragging || forcedDragOffsetPx !== 0 ? dragHeightPx : sheetHeightPx;
  const bodyIsHidden = clampedVisibleRows === 0;
  const scrollCanOverflow = clampedVisibleRows >= maxRows && measured.rowCount > maxRows;

  const metrics = useMemo<MobileBottomSheetMetrics>(
    () => ({
      visibleRows: clampedVisibleRows,
      maxRows,
      rowCount: measured.rowCount,
      rowHeightPx: measured.rowHeightPx,
      chromeHeightPx: measured.chromeHeightPx,
      handleHeightPx: measured.handleHeightPx,
      safeAreaInsetBottomPx: measured.safeAreaInsetBottomPx,
      sheetHeightPx: renderedHeightPx,
      maxSheetHeightPx,
    }),
    [
      clampedVisibleRows,
      maxRows,
      maxSheetHeightPx,
      measured.chromeHeightPx,
      measured.handleHeightPx,
      measured.rowCount,
      measured.rowHeightPx,
      measured.safeAreaInsetBottomPx,
      renderedHeightPx,
    ],
  );

  useEffect(() => {
    onMetricsChange?.(metrics);
  }, [metrics, onMetricsChange]);

  useEffect(() => {
    if (visibleRows !== clampedVisibleRows) {
      onVisibleRowsChange(clampedVisibleRows);
    }
  }, [clampedVisibleRows, onVisibleRowsChange, visibleRows]);

  const settleFromDrag = useCallback(
    (movementY: number, velocityY: number, directionY?: number) => {
      const nextRows = resolveVisibleRowsAfterDrag({
        visibleRows: clampedVisibleRows,
        maxRows,
        rowHeightPx: measured.rowHeightPx,
        movementY,
        velocityY,
        directionY,
      });
      onVisibleRowsChange(nextRows);
    },
    [clampedVisibleRows, maxRows, measured.rowHeightPx, onVisibleRowsChange],
  );

  const handleBind = useDrag(
    ({ movement: [, my], velocity: [, vy], direction: [, dy], last, active }) => {
      if (last) {
        setDragOffsetPx(0);
        setIsDragging(false);
      } else if (active) {
        setIsDragging(true);
      }
      if (active) {
        setDragOffsetPx(-my);
      }
      if (!last) return;

      suppressNextClickRef.current = Math.abs(my) > CLICK_SUPPRESS_DRAG_PX;
      settleFromDrag(my, vy, dy);
    },
    {
      axis: 'y',
      bounds: { top: -maxSheetHeightPx, bottom: maxSheetHeightPx },
      rubberband: 0.12,
      pointer: { capture: true },
    },
  );

  const bodyBind = useDrag(
    ({ movement: [, my], velocity: [, vy], direction: [, dy], last, active }) => {
      const bodyScrollTop = scrollBodyRef.current?.scrollTop ?? 0;
      const draggingDown = my > 0;
      const draggingUp = my < 0;
      const listOwnsScroll =
        (draggingDown && bodyScrollTop > 0) ||
        (draggingUp && clampedVisibleRows >= maxRows && scrollCanOverflow);

      if (last) {
        setDragOffsetPx(0);
        setIsDragging(false);
      } else if (active && !listOwnsScroll) {
        setIsDragging(true);
      }
      if (listOwnsScroll) return;
      if (active) {
        setDragOffsetPx(-my);
      }
      if (!last) return;

      suppressNextClickRef.current = Math.abs(my) > CLICK_SUPPRESS_DRAG_PX;
      settleFromDrag(my, vy, dy);
    },
    {
      axis: 'y',
      bounds: { top: -maxSheetHeightPx, bottom: maxSheetHeightPx },
      rubberband: 0.12,
      pointer: { capture: false },
    },
  );

  const statusLabel = rowStatusLabel(clampedVisibleRows, maxRows);
  const handleStyle: CSSProperties = { touchAction: 'none' };
  const renderedScrollBodyHeightPx =
    clampedVisibleRows === 0
      ? 0
      : clampNumber(
          renderedHeightPx -
            measured.handleHeightPx -
            measured.chromeHeightPx -
            BODY_BOTTOM_PADDING_PX,
          0,
          maxRows * measured.rowHeightPx,
        );
  const scrollBodyStyle: CSSProperties = {
    height: renderedScrollBodyHeightPx,
    maxHeight: renderedScrollBodyHeightPx,
    touchAction: scrollCanOverflow ? 'pan-y' : 'none',
  };

  return (
    <motion.div
      ref={sheetRef}
      data-testid="mobile-bottom-sheet"
      data-state={`rows-${clampedVisibleRows}`}
      data-visible-rows={clampedVisibleRows}
      data-max-rows={maxRows}
      data-row-height={Math.round(measured.rowHeightPx)}
      data-sheet-height={Math.round(renderedHeightPx)}
      data-dragging={String(isDragging || forcedDragOffsetPx !== 0)}
      className={cn(
        'absolute inset-x-0 bottom-[calc(var(--size-mobile-nav-h)+env(safe-area-inset-bottom))] z-bottom-sheet-peek flex flex-col overflow-hidden rounded-t-panel bg-surface-cream text-text-primary shadow-sheet-peek-up lg:hidden',
        'touch-pan-y',
        className,
      )}
      initial={false}
      animate={{
        opacity: 1,
        height: renderedHeightPx,
      }}
      transition={{
        ...(shouldReduceMotion || isDragging ? { duration: 0 } : SHEET_SETTLE_SPRING),
      }}
      style={{ height: renderedHeightPx, maxHeight: maxSheetHeightPx }}
    >
      <button
        ref={handleRef}
        type="button"
        data-testid="mobile-bottom-sheet-handle"
        aria-label={handleLabel}
        aria-describedby="mobile-bottom-sheet-row-status"
        {...handleBind()}
        onClick={(event) => {
          if (suppressNextClickRef.current) {
            suppressNextClickRef.current = false;
            event.preventDefault();
            return;
          }
          onVisibleRowsChange(clickCycleRows(clampedVisibleRows, maxRows));
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onVisibleRowsChange(clickCycleRows(clampedVisibleRows, maxRows));
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            onVisibleRowsChange(clampInteger(clampedVisibleRows + 1, 0, maxRows));
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            onVisibleRowsChange(clampInteger(clampedVisibleRows - 1, 0, maxRows));
          }
        }}
        className="flex min-h-11 shrink-0 items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
        style={handleStyle}
      >
        <span
          aria-hidden="true"
          className="h-[var(--size-drag-pill-h)] w-[var(--size-drag-pill-w-lg)] rounded-pill bg-drag-handle-map"
        />
      </button>
      <div
        ref={bodyRef}
        data-bottom-sheet-body="true"
        aria-hidden={bodyIsHidden}
        inert={bodyIsHidden}
        className={cn(
          'min-h-0 flex-1 px-4 pb-4',
          bodyIsHidden && 'pointer-events-none',
        )}
      >
        <div ref={chromeRef} data-bottom-sheet-chrome="true">
          {chrome}
        </div>
        <div
          ref={scrollBodyRef}
          data-bottom-sheet-scroll-body="true"
          {...bodyBind()}
          onClickCapture={(event) => {
            if (!suppressNextClickRef.current) return;
            suppressNextClickRef.current = false;
            event.preventDefault();
            event.stopPropagation();
          }}
          className={cn(
            'min-h-0',
            scrollCanOverflow ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden',
          )}
          style={scrollBodyStyle}
        >
          {children}
        </div>
      </div>
      <p id="mobile-bottom-sheet-row-status" className="sr-only" aria-live="polite">
        {statusLabel}
      </p>
    </motion.div>
  );
}

function clickCycleRows(visibleRows: number, maxRows: number): number {
  if (maxRows <= 0) return 0;
  if (visibleRows >= maxRows) return 0;
  return clampInteger(visibleRows + 1, 0, maxRows);
}

function measureRowHeight(rowNodes: HTMLElement[], fallback: number): number {
  const first = rowNodes[0];
  if (!first) return fallback;
  const firstRect = first.getBoundingClientRect();
  const firstHeight = positiveOr(firstRect.height || first.offsetHeight, fallback);
  const second = rowNodes[1];
  if (!second) return Math.max(1, firstHeight);

  const distance = second.getBoundingClientRect().top - firstRect.top;
  return Math.max(1, positiveOr(distance > 0 ? distance : firstHeight, firstHeight));
}

function elementHeight(node: HTMLElement | null, fallback: number): number {
  if (!node) return fallback;
  return Math.max(1, positiveOr(node.getBoundingClientRect().height || node.offsetHeight, fallback));
}

function measureSafeAreaInsetBottomPx(): number {
  if (typeof document === 'undefined' || typeof window === 'undefined') return 0;
  const probe = document.createElement('div');
  probe.style.position = 'fixed';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  probe.style.paddingBottom = 'env(safe-area-inset-bottom)';
  document.body.appendChild(probe);
  const computed = window.getComputedStyle(probe).paddingBottom;
  probe.remove();
  return Math.max(0, Number.parseFloat(computed) || 0);
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function positiveOr(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.round(clampNumber(value, min, max));
}

function clampNumber(value: number, min: number, max: number): number {
  const safeValue = finiteOr(value, min);
  const safeMax = Math.max(min, finiteOr(max, min));
  return Math.min(safeMax, Math.max(min, safeValue));
}

function measurementsEqual(
  left: {
    handleHeightPx: number;
    rowHeightPx: number;
    chromeHeightPx: number;
    safeAreaInsetBottomPx: number;
    rowCount: number;
    viewportHeightPx: number;
  },
  right: {
    handleHeightPx: number;
    rowHeightPx: number;
    chromeHeightPx: number;
    safeAreaInsetBottomPx: number;
    rowCount: number;
    viewportHeightPx: number;
  },
): boolean {
  return left.handleHeightPx === right.handleHeightPx &&
    left.rowHeightPx === right.rowHeightPx &&
    left.chromeHeightPx === right.chromeHeightPx &&
    left.safeAreaInsetBottomPx === right.safeAreaInsetBottomPx &&
    left.rowCount === right.rowCount &&
    left.viewportHeightPx === right.viewportHeightPx;
}
