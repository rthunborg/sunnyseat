import { fireEvent, render, screen } from '@testing-library/react';
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

  it('renders an accessible 44px handle and toggles peek/full from keyboard', () => {
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
    expect(onStateChange).toHaveBeenCalledWith('full');
  });

  it('does not dismiss permanently from peek with keyboard ArrowDown', () => {
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
    expect(onStateChange).toHaveBeenCalledWith('peek');
  });

  it.each([
    ['peek', 'z-bottom-sheet-peek'],
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

  it('leaves the map band visible above the full sheet', () => {
    render(
      <MobileBottomSheet
        state="full"
        onStateChange={vi.fn()}
        handleLabel="Visa platslistan"
      >
        <p>Listinnehåll</p>
      </MobileBottomSheet>,
    );

    expect(screen.getByTestId('mobile-bottom-sheet')).toHaveClass('top-[var(--size-bottom-sheet-full-top)]');
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
