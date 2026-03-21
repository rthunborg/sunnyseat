import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOverlayPosition } from '@/lib/hooks/useOverlayPosition';
import { SNAP_POINTS } from '@/lib/context/CardTrayContext';
import type { CardTrayState } from '@/lib/types/card-states';

describe('useOverlayPosition', () => {
  it('returns visible with offset above collapsed tray', () => {
    const { result } = renderHook(() => useOverlayPosition('collapsed'));
    expect(result.current.visible).toBe(true);
    expect(result.current.bottomOffset).toBe(`calc(${SNAP_POINTS.collapsed}% + 12px)`);
  });

  it('returns visible with offset above peeking tray', () => {
    const { result } = renderHook(() => useOverlayPosition('peeking'));
    expect(result.current.visible).toBe(true);
    expect(result.current.bottomOffset).toBe(`calc(${SNAP_POINTS.peeking}% + 12px)`);
  });

  it('returns hidden when tray is half-expanded', () => {
    const { result } = renderHook(() => useOverlayPosition('half-expanded'));
    expect(result.current.visible).toBe(false);
  });

  it('updates when tray state changes', () => {
    const { result, rerender } = renderHook(
      ({ state }: { state: CardTrayState }) => useOverlayPosition(state),
      { initialProps: { state: 'collapsed' as CardTrayState } }
    );
    expect(result.current.visible).toBe(true);
    expect(result.current.bottomOffset).toContain(`${SNAP_POINTS.collapsed}%`);

    rerender({ state: 'peeking' as CardTrayState });
    expect(result.current.visible).toBe(true);
    expect(result.current.bottomOffset).toContain(`${SNAP_POINTS.peeking}%`);

    rerender({ state: 'half-expanded' as CardTrayState });
    expect(result.current.visible).toBe(false);
  });
});
