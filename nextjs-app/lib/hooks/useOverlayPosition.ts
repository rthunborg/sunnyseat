import { useMemo } from 'react';
import type { CardTrayState } from '@/lib/types/card-states';
import { SNAP_POINTS } from '@/lib/context/CardTrayContext';

/**
 * Maps tray snap state to the bottom offset for the time controls overlay.
 * Returns CSS bottom value and whether the controls should be visible.
 *
 * Stacking context (z-index):
 *   Map z-0 < Markers z-10 < TimeSlider/DatePicker z-20
 *   < SearchBar z-30 < CardTray z-40 < Modals z-50
 */
export function useOverlayPosition(trayState: CardTrayState): {
  bottomOffset: string;
  visible: boolean;
} {
  return useMemo(() => {
    const GAP_PX = 12;

    switch (trayState) {
      case 'collapsed': {
        // Tray occupies ~8% — place controls just above with gap
        const bottom = `calc(${SNAP_POINTS.collapsed}% + ${GAP_PX}px)`;
        return { bottomOffset: bottom, visible: true };
      }
      case 'peeking': {
        // Tray occupies ~25% — place controls above tray with gap
        const bottom = `calc(${SNAP_POINTS.peeking}% + ${GAP_PX}px)`;
        return { bottomOffset: bottom, visible: true };
      }
      case 'half-expanded': {
        // Tray occupies 50% — hide controls to avoid overlap
        return { bottomOffset: '0px', visible: false };
      }
      default:
        return { bottomOffset: `calc(${SNAP_POINTS.peeking}% + ${GAP_PX}px)`, visible: true };
    }
  }, [trayState]);
}
