import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MobileBottomSheet,
  computeMaxVisibleRows,
  computeSheetHeight,
  resolveVisibleRowsAfterDrag,
} from '@/components/custom/sheets/MobileBottomSheet';

let reducedMotionMock = false;

vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react');
  return {
    ...actual,
    motion: {
      div: ({
        children,
        layout: _layout,
        initial: _initial,
        animate,
        exit: _exit,
        transition,
        ...props
      }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
        <div
          {...props}
          data-motion-height={String((animate as { height?: number } | undefined)?.height ?? '')}
          data-motion-duration={String((transition as { duration?: number } | undefined)?.duration ?? '')}
          data-motion-type={String((transition as { type?: string } | undefined)?.type ?? '')}
        >
          {children}
        </div>
      ),
    },
    useReducedMotion: () => reducedMotionMock,
  };
});

function renderSheet({
  visibleRows = 3,
  rowCount = 5,
  onVisibleRowsChange,
  forcedDragOffsetPx,
}: {
  visibleRows?: number;
  rowCount?: number;
  onVisibleRowsChange?: (visibleRows: number, reason?: 'layout' | 'interaction') => void;
  forcedDragOffsetPx?: number;
} = {}) {
  const handleRowsChange = onVisibleRowsChange ??
    vi.fn<(visibleRows: number, reason?: 'layout' | 'interaction') => void>();
  render(
    <MobileBottomSheet
      visibleRows={visibleRows}
      onVisibleRowsChange={handleRowsChange}
      rowCount={rowCount}
      forcedDragOffsetPx={forcedDragOffsetPx}
      handleLabel="Visa platslistan"
      rowStatusLabel={(rows, maxRows) =>
        rows === 0 ? 'Platslistan är infälld' : `Visar ${rows} rader av ${maxRows}`
      }
      chrome={(
        <div data-testid="sheet-chrome">
          <button type="button">Mest sol</button>
          <button type="button">Nära mig</button>
        </div>
      )}
    >
      {Array.from({ length: rowCount }, (_, index) => (
        <article key={index} data-testid="venue-card">
          <button type="button">Plats {index + 1}</button>
        </article>
      ))}
    </MobileBottomSheet>,
  );
  return handleRowsChange;
}

describe('<MobileBottomSheet /> row-count contract', () => {
  beforeEach(() => {
    reducedMotionMock = false;
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 768,
    });
  });

  it('renders bottom-anchored row data hooks without translate-based gap state', () => {
    renderSheet({ visibleRows: 3, rowCount: 5 });

    const sheet = screen.getByTestId('mobile-bottom-sheet');
    expect(sheet).toHaveAttribute('data-state', 'rows-3');
    expect(sheet).toHaveAttribute('data-visible-rows', '3');
    expect(sheet).toHaveAttribute('data-max-rows', '3');
    expect(sheet).toHaveAttribute('data-row-height', '88');
    expect(sheet).toHaveAttribute('data-sheet-height', '428');
    expect(sheet).toHaveAttribute('data-dragging', 'false');
    expect(sheet).toHaveClass(
      'bottom-[calc(var(--size-mobile-nav-h)+env(safe-area-inset-bottom))]',
      'shadow-sheet-peek-up',
    );
    expect(sheet.className).not.toContain('translate-y');
  });

  it('uses measured chrome as a separate term so N rows never consume controls/chips height', () => {
    expect(
      computeSheetHeight({
        visibleRows: 3,
        rowHeightPx: 88,
        handleHeightPx: 44,
        chromeHeightPx: 104,
      }),
    ).toBe(428);
  });

  it('computes maxRows from viewport, chrome, handle, row height, and row count', () => {
    expect(
      computeMaxVisibleRows({
        viewportHeightPx: 768,
        rowCount: 10,
        rowHeightPx: 88,
        handleHeightPx: 44,
        chromeHeightPx: 104,
      }),
    ).toBe(3);
    expect(
      computeMaxVisibleRows({
        viewportHeightPx: 900,
        rowCount: 2,
        rowHeightPx: 88,
        handleHeightPx: 44,
        chromeHeightPx: 104,
      }),
    ).toBe(2);
  });

  it('subtracts bottom safe-area inset from the maxRows height budget', () => {
    expect(
      computeMaxVisibleRows({
        viewportHeightPx: 680,
        rowCount: 10,
        rowHeightPx: 88,
        handleHeightPx: 44,
        chromeHeightPx: 104,
        safeAreaInsetBottomPx: 0,
      }),
    ).toBe(2);
    expect(
      computeMaxVisibleRows({
        viewportHeightPx: 680,
        rowCount: 10,
        rowHeightPx: 88,
        handleHeightPx: 44,
        chromeHeightPx: 104,
        safeAreaInsetBottomPx: 80,
      }),
    ).toBe(1);
  });

  it('clamps an out-of-range parent row count back to the computed maxRows', () => {
    const onVisibleRowsChange = renderSheet({ visibleRows: 9, rowCount: 5 });

    const sheet = screen.getByTestId('mobile-bottom-sheet');
    expect(sheet).toHaveAttribute('data-max-rows', '3');
    expect(sheet).toHaveAttribute('data-visible-rows', '3');
    expect(sheet).toHaveAttribute('data-sheet-height', '428');
    expect(onVisibleRowsChange).toHaveBeenLastCalledWith(3, 'layout');
  });

  it('makes N=0 handle-only and keeps body content inert while chrome remains measurable', () => {
    renderSheet({ visibleRows: 0, rowCount: 5 });

    const sheet = screen.getByTestId('mobile-bottom-sheet');
    const body = document.querySelector('[data-bottom-sheet-body="true"]') as HTMLElement;
    const scrollBody = document.querySelector('[data-bottom-sheet-scroll-body="true"]') as HTMLElement;
    expect(sheet).toHaveAttribute('data-visible-rows', '0');
    expect(sheet).not.toHaveAttribute('data-tour-anchor');
    expect(sheet).toHaveAttribute('data-sheet-height', '44');
    expect(body).toHaveAttribute('aria-hidden', 'true');
    expect(body.hasAttribute('inert')).toBe(true);
    expect(scrollBody.style.height).toBe('0px');
    expect(screen.getByTestId('sheet-chrome')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Visa platslistan' }).focus();
    expect(screen.getByRole('button', { name: 'Visa platslistan' })).toHaveFocus();
  });

  it('exposes the venue-list tour anchor only when at least one row is visible', () => {
    renderSheet({ visibleRows: 1, rowCount: 5 });

    expect(screen.getByTestId('mobile-bottom-sheet')).toHaveAttribute(
      'data-tour-anchor',
      'venue-list',
    );
  });

  it('keyboard ArrowUp/ArrowDown changes exactly one row and saturates at 0..maxRows', () => {
    const onVisibleRowsChange = renderSheet({ visibleRows: 1, rowCount: 5 });
    const handle = screen.getByRole('button', { name: 'Visa platslistan' });

    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(onVisibleRowsChange).toHaveBeenCalledWith(2, 'interaction');

    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(onVisibleRowsChange).toHaveBeenCalledWith(0, 'interaction');
  });

  it('keyboard saturates at max and handle-only without leaving the row model', () => {
    const maxChange = renderSheet({ visibleRows: 3, rowCount: 5 });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Visa platslistan' }), { key: 'ArrowUp' });
    expect(maxChange).toHaveBeenCalledWith(3, 'interaction');

    cleanup();
    const minChange = renderSheet({ visibleRows: 0, rowCount: 5 });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Visa platslistan' }), { key: 'ArrowDown' });
    expect(minChange).toHaveBeenCalledWith(0, 'interaction');
  });

  it('click/Enter cycles rows upward and wraps maxRows to handle-only', () => {
    const increment = renderSheet({ visibleRows: 1, rowCount: 5 });
    const handle = screen.getByRole('button', { name: 'Visa platslistan' });
    fireEvent.click(handle);
    expect(increment).toHaveBeenCalledWith(2, 'interaction');

    cleanup();
    const wrap = renderSheet({ visibleRows: 3, rowCount: 5 });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Visa platslistan' }), { key: 'Enter' });
    expect(wrap).toHaveBeenCalledWith(0, 'interaction');
  });

  it('announces the current visible-row count without moving focus', () => {
    renderSheet({ visibleRows: 2, rowCount: 5 });

    expect(screen.getByText('Visar 2 rader av 3')).toHaveClass('sr-only');
    const handle = screen.getByRole('button', { name: 'Visa platslistan' });
    handle.focus();
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(handle).toHaveFocus();
  });

  it('reduced motion disables height transition duration while preserving final row count', () => {
    reducedMotionMock = true;
    renderSheet({ visibleRows: 2, rowCount: 5 });

    const sheet = screen.getByTestId('mobile-bottom-sheet');
    expect(sheet).toHaveAttribute('data-visible-rows', '2');
    expect(sheet).toHaveAttribute('data-motion-duration', '0');
  });

  it('settles row-height changes with a real Motion spring when motion is allowed', () => {
    renderSheet({ visibleRows: 2, rowCount: 5 });

    expect(screen.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-motion-type', 'spring');
  });

  it('forced mid-drag fixture exposes dragging data and an in-between sheet height', () => {
    renderSheet({ visibleRows: 2, rowCount: 5, forcedDragOffsetPx: 44 });

    const sheet = screen.getByTestId('mobile-bottom-sheet');
    const scrollBody = document.querySelector('[data-bottom-sheet-scroll-body="true"]') as HTMLElement;
    expect(sheet).toHaveAttribute('data-dragging', 'true');
    expect(sheet).toHaveAttribute('data-sheet-height', '384');
    expect(scrollBody.style.height).toBe('220px');
  });

  it('drag release helper settles slow drags to the nearest row boundary and lets clear flings skip rows', () => {
    expect(
      resolveVisibleRowsAfterDrag({
        visibleRows: 2,
        maxRows: 5,
        rowHeightPx: 88,
        movementY: 40,
        velocityY: 0.1,
      }),
    ).toBe(2);
    expect(
      resolveVisibleRowsAfterDrag({
        visibleRows: 2,
        maxRows: 5,
        rowHeightPx: 88,
        movementY: 50,
        velocityY: 0.1,
      }),
    ).toBe(1);
    expect(
      resolveVisibleRowsAfterDrag({
        visibleRows: 2,
        maxRows: 5,
        rowHeightPx: 88,
        movementY: -50,
        velocityY: 0.1,
      }),
    ).toBe(3);
    expect(
      resolveVisibleRowsAfterDrag({
        visibleRows: 1,
        maxRows: 5,
        rowHeightPx: 88,
        movementY: -20,
        velocityY: 0.7,
      }),
    ).toBe(3);
  });

  it('treats a measured real-touch sub-row flick as a two-row fling without skipping slow drags', () => {
    expect(
      resolveVisibleRowsAfterDrag({
        visibleRows: 1,
        maxRows: 3,
        rowHeightPx: 96,
        movementY: -59,
        velocityY: 0.3,
      }),
    ).toBe(3);

    expect(
      resolveVisibleRowsAfterDrag({
        visibleRows: 1,
        maxRows: 3,
        rowHeightPx: 96,
        movementY: -59,
        velocityY: 0.1,
      }),
    ).toBe(2);
  });
});
