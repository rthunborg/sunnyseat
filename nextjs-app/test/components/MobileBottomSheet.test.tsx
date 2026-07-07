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

  // --- Story 11.3 coverage expansion (automate): the FULL keyboard/click cascade
  // over the four-snap ladder + the collapsed body a11y facts. The existing suite
  // covers peek→mid, mid→full, peek→collapsed and the collapsed saturate; these
  // fill the remaining rungs, the wrap, and the fallback branches so every arm of
  // clickCycle / expandOneRung / collapseOneRung is pinned. ---

  describe('Story 11.3 — full keyboard rung cascade (ArrowUp/ArrowDown)', () => {
    function arrow(state: MobileBottomSheetState, key: 'ArrowUp' | 'ArrowDown') {
      const onStateChange = vi.fn();
      render(
        <MobileBottomSheet state={state} onStateChange={onStateChange} handleLabel="H">
          <p>Listinnehåll</p>
        </MobileBottomSheet>,
      );
      fireEvent.keyDown(screen.getByRole('button', { name: 'H' }), { key });
      return onStateChange;
    }

    it('ArrowUp climbs peek → mid (intermediate expand rung)', () => {
      expect(arrow('peek', 'ArrowUp')).toHaveBeenCalledWith('mid');
    });

    it('ArrowUp climbs mid → full (intermediate expand rung)', () => {
      expect(arrow('mid', 'ArrowUp')).toHaveBeenCalledWith('full');
    });

    it('ArrowUp saturates at full — full stays full (never overshoots the ladder)', () => {
      expect(arrow('full', 'ArrowUp')).toHaveBeenCalledWith('full');
    });

    it('ArrowDown collapses full → mid (intermediate collapse rung)', () => {
      expect(arrow('full', 'ArrowDown')).toHaveBeenCalledWith('mid');
    });

    it('ArrowDown collapses mid → peek (intermediate collapse rung)', () => {
      expect(arrow('mid', 'ArrowDown')).toHaveBeenCalledWith('peek');
    });

    it('ArrowUp from the off-ladder dismissed state falls back to mid (never NaN/undefined)', () => {
      const onStateChange = arrow('dismissed', 'ArrowUp');
      // 'dismissed' is not on SNAP_LADDER (index === -1); expandOneRung returns the
      // safe 'mid' default rather than reading SNAP_LADDER[NaN].
      expect(onStateChange).toHaveBeenCalledWith('mid');
      expect(onStateChange).not.toHaveBeenCalledWith('dismissed');
    });

    it('ArrowDown from the off-ladder dismissed state falls back to peek (never NaN/undefined)', () => {
      const onStateChange = arrow('dismissed', 'ArrowDown');
      // collapseOneRung's index === -1 fallback returns 'peek', keeping the handle
      // on the interactive ladder even from the exit state.
      expect(onStateChange).toHaveBeenCalledWith('peek');
      expect(onStateChange).not.toHaveBeenCalledWith('dismissed');
    });
  });

  describe('Story 11.3 — click/Enter/Space cycle (clickCycle) over the four snaps', () => {
    function activate(state: MobileBottomSheetState, via: 'click' | 'Enter' | ' ') {
      const onStateChange = vi.fn();
      render(
        <MobileBottomSheet state={state} onStateChange={onStateChange} handleLabel="H">
          <p>Listinnehåll</p>
        </MobileBottomSheet>,
      );
      const handle = screen.getByRole('button', { name: 'H' });
      if (via === 'click') fireEvent.click(handle);
      else fireEvent.keyDown(handle, { key: via });
      return onStateChange;
    }

    it('click on the collapsed handle climbs to peek (the handle-only snap re-opens the list)', () => {
      expect(activate('collapsed', 'click')).toHaveBeenCalledWith('peek');
    });

    it('click wraps full → peek (a tap on the full sheet tucks it back to peek, not straight to collapsed)', () => {
      const onStateChange = activate('full', 'click');
      expect(onStateChange).toHaveBeenCalledWith('peek');
      // The wrap deliberately never drops straight to the handle-only collapsed
      // state — collapsing fully is a deliberate drag/Arrow action.
      expect(onStateChange).not.toHaveBeenCalledWith('collapsed');
    });

    it('Space (not just Enter) advances the click cycle collapsed → peek', () => {
      expect(activate('collapsed', ' ')).toHaveBeenCalledWith('peek');
    });

    it('Enter on the full handle wraps to peek (keyboard parity with click)', () => {
      expect(activate('full', 'Enter')).toHaveBeenCalledWith('peek');
    });
  });

  describe('Story 11.3 — collapsed snap body is inert but the handle stays reachable (AC2)', () => {
    it('the collapsed sheet body is aria-hidden and pointer-events-none while the handle is not', () => {
      render(
        <MobileBottomSheet state="collapsed" onStateChange={vi.fn()} handleLabel="Visa platslistan">
          <p>Listinnehåll</p>
        </MobileBottomSheet>,
      );

      const body = document.querySelector('[data-bottom-sheet-scroll-body="true"]');
      expect(body).not.toBeNull();
      // Body content (sort toggles, chip row, list) is hidden from AT + inert.
      expect(body).toHaveAttribute('aria-hidden', 'true');
      expect(body?.className).toContain('pointer-events-none');
      // ...but the handle itself stays an interactive button so the user can drag
      // or keyboard the sheet back up (this is what makes 'collapsed' distinct
      // from the fully-inert 'dismissed').
      const handle = screen.getByRole('button', { name: 'Visa platslistan' });
      expect(handle.className).not.toContain('pointer-events-none');
    });

    it('the peek body is NOT aria-hidden (content stays accessible above the collapsed rung)', () => {
      render(
        <MobileBottomSheet state="peek" onStateChange={vi.fn()} handleLabel="Visa platslistan">
          <p>Listinnehåll</p>
        </MobileBottomSheet>,
      );

      const body = document.querySelector('[data-bottom-sheet-scroll-body="true"]');
      // aria-hidden is only set for collapsed | dismissed; peek/mid/full keep the
      // body exposed. jsdom drops a `false` boolean-ish attr, so assert it's absent.
      expect(body?.getAttribute('aria-hidden')).not.toBe('true');
    });

    it('the collapsed body is INERT so its focusable children leave the tab order, while the handle stays focusable (external-review fix)', () => {
      render(
        <MobileBottomSheet state="collapsed" onStateChange={vi.fn()} handleLabel="Visa platslistan">
          <button type="button">Sortera</button>
        </MobileBottomSheet>,
      );

      const body = document.querySelector('[data-bottom-sheet-scroll-body="true"]') as HTMLElement;
      // `inert` removes the whole body subtree from tab order + the a11y tree —
      // aria-hidden + pointer-events-none alone left the child button TABBABLE.
      // React renders the boolean `inert` prop as the `inert` ATTRIBUTE (jsdom
      // does not reflect the DOM `.inert` property, so assert the attribute).
      expect(body.hasAttribute('inert')).toBe(true);
      // The inner control lives inside the inert subtree (so it is not tabbable).
      const innerButton = body.querySelector('button');
      expect(innerButton).not.toBeNull();
      // The handle sits OUTSIDE the inert body, so it stays an interactive,
      // focusable button (drag/keyboard the sheet back up).
      const handle = screen.getByRole('button', { name: 'Visa platslistan' });
      handle.focus();
      expect(handle).toHaveFocus();
    });

    it('the peek body is NOT inert (content remains interactive above the collapsed rung)', () => {
      render(
        <MobileBottomSheet state="peek" onStateChange={vi.fn()} handleLabel="Visa platslistan">
          <button type="button">Sortera</button>
        </MobileBottomSheet>,
      );

      const body = document.querySelector('[data-bottom-sheet-scroll-body="true"]') as HTMLElement;
      // `inert={false}` → React omits the attribute entirely (interactive body).
      expect(body.hasAttribute('inert')).toBe(false);
    });
  });
});
