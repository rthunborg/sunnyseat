/**
 * Story 11.5 (AC3 / test-design R-013) — viewport-aware recenter padding.
 *
 * The padding MUST be derived from the current obstruction state (snap enum +
 * panel flags), NOT a fixed offset — otherwise the dot lands off-centre when
 * the sheet is collapsed vs full, or when the desktop detail panel is open vs
 * closed. These deterministic cases lock the per-snap / per-panel derivation.
 */
import { describe, expect, it } from 'vitest';
import { computeRecenterPadding } from '@/lib/utils/recenter-padding';

describe('computeRecenterPadding (Story 11.5 AC3)', () => {
  describe('mobile (bottom sheet)', () => {
    it('bottom padding tracks the current snap height (per-snap, not fixed)', () => {
      const base = { isDesktop: false, isVenueDetailOpen: false } as const;
      expect(computeRecenterPadding({ ...base, mobileSheetState: 'peek' }).bottom).toBe(120);
      expect(computeRecenterPadding({ ...base, mobileSheetState: 'mid' }).bottom).toBe(320);
      expect(computeRecenterPadding({ ...base, mobileSheetState: 'full' }).bottom).toBe(560);
    });

    it('collapsed snap uses the 44 px handle strip + a safe-area allowance', () => {
      const p = computeRecenterPadding({
        isDesktop: false,
        mobileSheetState: 'collapsed',
        isVenueDetailOpen: false,
      });
      expect(p.bottom).toBe(68);
    });

    it('dismissed snap covers nothing at the bottom', () => {
      const p = computeRecenterPadding({
        isDesktop: false,
        mobileSheetState: 'dismissed',
        isVenueDetailOpen: false,
      });
      expect(p.bottom).toBe(0);
    });

    it('adds a top padding for the mobile search bar and no side padding', () => {
      const p = computeRecenterPadding({
        isDesktop: false,
        mobileSheetState: 'mid',
        isVenueDetailOpen: false,
      });
      expect(p.top).toBe(72);
      expect(p.left).toBe(0);
      expect(p.right).toBe(0);
    });

    it('mid and full snaps produce DIFFERENT bottom padding (a fixed offset would not)', () => {
      const mid = computeRecenterPadding({
        isDesktop: false,
        mobileSheetState: 'mid',
        isVenueDetailOpen: false,
      });
      const full = computeRecenterPadding({
        isDesktop: false,
        mobileSheetState: 'full',
        isVenueDetailOpen: false,
      });
      expect(mid.bottom).not.toBe(full.bottom);
    });
  });

  describe('desktop (side panels)', () => {
    it('left padding = the always-present 340 px venue list; no bottom sheet', () => {
      const p = computeRecenterPadding({
        isDesktop: true,
        mobileSheetState: 'mid',
        isVenueDetailOpen: false,
      });
      expect(p.left).toBe(340);
      expect(p.bottom).toBe(0);
      expect(p.top).toBe(0);
      expect(p.right).toBe(0);
    });

    it('right padding = 390 px detail panel ONLY when the detail panel is open', () => {
      const closed = computeRecenterPadding({
        isDesktop: true,
        mobileSheetState: 'mid',
        isVenueDetailOpen: false,
      });
      const open = computeRecenterPadding({
        isDesktop: true,
        mobileSheetState: 'mid',
        isVenueDetailOpen: true,
      });
      expect(closed.right).toBe(0);
      expect(open.right).toBe(390);
      // The two must differ — proving detail-open state feeds the padding.
      expect(closed.right).not.toBe(open.right);
    });

    it('ignores the mobile snap state on desktop (sheet is hidden below lg)', () => {
      const collapsed = computeRecenterPadding({
        isDesktop: true,
        mobileSheetState: 'collapsed',
        isVenueDetailOpen: false,
      });
      const full = computeRecenterPadding({
        isDesktop: true,
        mobileSheetState: 'full',
        isVenueDetailOpen: false,
      });
      expect(collapsed).toEqual(full);
    });
  });
});
