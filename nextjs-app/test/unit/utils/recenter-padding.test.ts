/**
 * Story 12.9 — viewport-aware recenter padding.
 *
 * Mobile padding is now based on the measured row-sheet obstruction height,
 * not fixed snap names. Desktop side-panel behaviour remains exact.
 */
import { describe, expect, it } from 'vitest';
import { computeRecenterPadding } from '@/lib/utils/recenter-padding';

describe('computeRecenterPadding (Story 12.9 row-sheet obstruction)', () => {
  describe('mobile', () => {
    it('uses measured sheet height + nav + safe-area allowance for bottom padding', () => {
      expect(
        computeRecenterPadding({
          isDesktop: false,
          mobileSheetHeightPx: 44,
          isVenueDetailOpen: false,
        }),
      ).toEqual({ top: 72, bottom: 120, left: 0, right: 0 });

      expect(
        computeRecenterPadding({
          isDesktop: false,
          mobileSheetHeightPx: 320,
          isVenueDetailOpen: false,
        }).bottom,
      ).toBe(396);
    });

    it('makes row-count height differences visible to recenter padding', () => {
      const oneRow = computeRecenterPadding({
        isDesktop: false,
        mobileSheetHeightPx: 44 + 104 + 16 + 88,
        isVenueDetailOpen: false,
      });
      const threeRows = computeRecenterPadding({
        isDesktop: false,
        mobileSheetHeightPx: 44 + 104 + 16 + 88 * 3,
        isVenueDetailOpen: false,
      });

      expect(oneRow.bottom).toBe(328);
      expect(threeRows.bottom).toBe(504);
      expect(threeRows.bottom).toBeGreaterThan(oneRow.bottom);
    });

    it('keeps padding finite and non-negative for bad measured values', () => {
      for (const mobileSheetHeightPx of [Number.NaN, Number.POSITIVE_INFINITY, -200]) {
        const padding = computeRecenterPadding({
          isDesktop: false,
          mobileSheetHeightPx,
          isVenueDetailOpen: false,
        });
        expect(padding).toEqual({ top: 72, bottom: 76, left: 0, right: 0 });
      }
    });

    it('clamps bottom padding to keep a usable unobscured canvas when height is known', () => {
      const padding = computeRecenterPadding({
        isDesktop: false,
        mobileSheetHeightPx: 900,
        isVenueDetailOpen: false,
        viewportHeightPx: 500,
      });

      // viewport 500 - required visible centre 96 - top 72 = max bottom 332.
      expect(padding).toEqual({ top: 72, bottom: 332, left: 0, right: 0 });
    });

    it('ignores desktop detail-open on mobile', () => {
      const closed = computeRecenterPadding({
        isDesktop: false,
        mobileSheetHeightPx: 320,
        isVenueDetailOpen: false,
      });
      const open = computeRecenterPadding({
        isDesktop: false,
        mobileSheetHeightPx: 320,
        isVenueDetailOpen: true,
      });

      expect(open).toEqual(closed);
      expect(open.right).toBe(0);
    });
  });

  describe('desktop', () => {
    it('left padding = the always-present 340 px venue list; no mobile bottom padding', () => {
      const padding = computeRecenterPadding({
        isDesktop: true,
        mobileSheetHeightPx: 560,
        isVenueDetailOpen: false,
      });

      expect(padding).toEqual({ top: 0, bottom: 0, left: 340, right: 0 });
    });

    it('right padding = 390 px detail panel only when the detail panel is open', () => {
      const closed = computeRecenterPadding({
        isDesktop: true,
        mobileSheetHeightPx: 320,
        isVenueDetailOpen: false,
      });
      const open = computeRecenterPadding({
        isDesktop: true,
        mobileSheetHeightPx: 320,
        isVenueDetailOpen: true,
      });

      expect(closed.right).toBe(0);
      expect(open.right).toBe(390);
      expect(open.bottom).toBe(0);
    });
  });
});
