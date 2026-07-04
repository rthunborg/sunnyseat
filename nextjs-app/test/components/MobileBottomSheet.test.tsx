import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MobileBottomSheet,
  type MobileBottomSheetState,
} from '@/components/custom/sheets/MobileBottomSheet';

let reducedMotionMock = false;

vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react');
  return {
    ...actual,
    motion: {
      div: ({
        children,
        layout,
        initial: _initial,
        animate: _animate,
        exit: _exit,
        transition: _transition,
        ...props
      }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
        <div {...props} data-layout-motion={String(Boolean(layout))}>
          {children}
        </div>
      ),
    },
    useReducedMotion: () => reducedMotionMock,
  };
});

describe('<MobileBottomSheet />', () => {
  beforeEach(() => {
    reducedMotionMock = false;
  });

  it('renders an accessible 44px handle and toggles peek/mid/full from keyboard', () => {
    const onStateChange = vi.fn();
    render(
      <MobileBottomSheet
        state="peek"
        onStateChange={onStateChange}
        handleLabel="Visa platslistan"
      >
        <p>Listinnehåll</p>
      </MobileBottomSheet>,
    );

    const handle = screen.getByRole('button', { name: 'Visa platslistan' });
    expect(handle).toHaveClass('min-h-11');

    fireEvent.keyDown(handle, { key: 'Enter' });
    expect(onStateChange).toHaveBeenCalledWith('mid');
  });

  it('advances from mid to full from keyboard', () => {
    const onStateChange = vi.fn();
    render(
      <MobileBottomSheet
        state="mid"
        onStateChange={onStateChange}
        handleLabel="Visa platslistan"
      >
        <p>Listinnehåll</p>
      </MobileBottomSheet>,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Visa platslistan' }), { key: 'Enter' });
    expect(onStateChange).toHaveBeenCalledWith('full');
  });

  it('collapses (never dismisses) from peek with keyboard ArrowDown — Story 11.3 fourth snap', () => {
    const onStateChange = vi.fn();
    render(
      <MobileBottomSheet
        state="peek"
        onStateChange={onStateChange}
        handleLabel="Visa platslistan"
      >
        <p>Listinnehåll</p>
      </MobileBottomSheet>,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Visa platslistan' }), { key: 'ArrowDown' });
    // ArrowDown from peek reaches the interactive handle-only 'collapsed' snap —
    // NOT the non-interactive 'dismissed' exit state (the sheet can still be
    // dragged/keyboard'd back up).
    expect(onStateChange).toHaveBeenCalledWith('collapsed');
    expect(onStateChange).not.toHaveBeenCalledWith('dismissed');
  });

  it('climbs back up from collapsed to peek with keyboard ArrowUp — Story 11.3', () => {
    const onStateChange = vi.fn();
    render(
      <MobileBottomSheet
        state="collapsed"
        onStateChange={onStateChange}
        handleLabel="Visa platslistan"
      >
        <p>Listinnehåll</p>
      </MobileBottomSheet>,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Visa platslistan' }), { key: 'ArrowUp' });
    expect(onStateChange).toHaveBeenCalledWith('peek');
  });

  it('saturates at collapsed — ArrowDown from collapsed stays collapsed (never dismissed)', () => {
    const onStateChange = vi.fn();
    render(
      <MobileBottomSheet
        state="collapsed"
        onStateChange={onStateChange}
        handleLabel="Visa platslistan"
      >
        <p>Listinnehåll</p>
      </MobileBottomSheet>,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Visa platslistan' }), { key: 'ArrowDown' });
    expect(onStateChange).toHaveBeenCalledWith('collapsed');
    expect(onStateChange).not.toHaveBeenCalledWith('dismissed');
  });

  it('renders the collapsed snap handle-only: collapsed height token, no backdrop, still interactive', () => {
    render(
      <MobileBottomSheet
        state="collapsed"
        onStateChange={vi.fn()}
        handleLabel="Visa platslistan"
      >
        <p>Listinnehåll</p>
      </MobileBottomSheet>,
    );

    const sheet = screen.getByTestId('mobile-bottom-sheet');
    // The collapsed snap uses its dedicated token-based height (handle + safe-area).
    expect(sheet).toHaveClass('h-[var(--size-bottom-sheet-collapsed-h)]');
    expect(sheet).toHaveAttribute('data-state', 'collapsed');
    // Distinct from 'dismissed' — collapsed stays interactive (draggable/keyboard).
    expect(sheet).not.toHaveClass('pointer-events-none');
    // The full-state backdrop must NOT render for collapsed (map stays interactive).
    expect(screen.queryByTestId('mobile-bottom-sheet-backdrop')).toBeNull();
  });

  it.each([
    ['collapsed', 'z-bottom-sheet-peek'],
    ['peek', 'z-bottom-sheet-peek'],
    ['mid', 'z-bottom-sheet-peek'],
    ['full', 'z-bottom-sheet-full'],
  ] as Array<[MobileBottomSheetState, string]>)(
    'uses the expected z-index token in %s state',
    (state, expectedClass) => {
      render(
        <MobileBottomSheet
          state={state}
          onStateChange={vi.fn()}
          handleLabel="Visa platslistan"
        >
          <p>Listinnehåll</p>
        </MobileBottomSheet>,
      );

      expect(screen.getByTestId('mobile-bottom-sheet')).toHaveClass(expectedClass);
    },
  );

  it('uses the full snap token for the full state', () => {
    render(
      <MobileBottomSheet
        state="full"
        onStateChange={vi.fn()}
        handleLabel="Visa platslistan"
      >
        <p>Listinnehåll</p>
      </MobileBottomSheet>,
    );

    expect(screen.getByTestId('mobile-bottom-sheet')).toHaveClass(
      'h-[min(var(--size-bottom-sheet-full-h),calc(100dvh-var(--size-mobile-nav-h)-env(safe-area-inset-top)-var(--spacing)*6))]',
    );
  });

  it('keeps the full snap token taller than the mid snap token', () => {
    const css = readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8');
    const mid = Number(css.match(/--size-bottom-sheet-mid-h:\s*(\d+)px/)?.[1]);
    const full = Number(css.match(/--size-bottom-sheet-full-h:\s*(\d+)px/)?.[1]);

    expect(full).toBeGreaterThan(mid);
  });

  it('defines a collapsed-snap height token (handle + safe-area) smaller than peek — Story 11.3', () => {
    const css = readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8');
    // The token exists and is derived from the real handle strip (calc + safe-area),
    // not a bare px baked into the component.
    const collapsed = css.match(/--size-bottom-sheet-collapsed-h:\s*([^;]+);/)?.[1]?.trim();
    expect(collapsed).toBeTruthy();
    expect(collapsed).toContain('env(safe-area-inset-bottom)');
    // The collapsed base (44px handle) is smaller than the 120px peek — the
    // handle-only snap is the smallest rung.
    const collapsedBase = Number(collapsed?.match(/(\d+)px/)?.[1]);
    const peek = Number(css.match(/--size-bottom-sheet-peek-h:\s*(\d+)px/)?.[1]);
    expect(collapsedBase).toBeLessThan(peek);
  });

  it('renders dismissed only as a non-interactive exit state', () => {
    render(
      <MobileBottomSheet
        state="dismissed"
        onStateChange={vi.fn()}
        handleLabel="Visa platslistan"
      >
        <p>Listinnehåll</p>
      </MobileBottomSheet>,
    );

    expect(screen.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-state', 'dismissed');
    expect(screen.getByTestId('mobile-bottom-sheet')).toHaveClass('pointer-events-none');
  });

  it('disables layout motion when reduced motion is enabled', () => {
    reducedMotionMock = true;
    render(
      <MobileBottomSheet
        state="full"
        onStateChange={vi.fn()}
        handleLabel="Visa platslistan"
      >
        <p>Listinnehåll</p>
      </MobileBottomSheet>,
    );

    expect(screen.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-layout-motion', 'false');
  });
});
