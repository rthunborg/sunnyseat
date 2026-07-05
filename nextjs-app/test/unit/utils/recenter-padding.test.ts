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
import type { MobileBottomSheetState } from '@/components/custom/sheets/MobileBottomSheet';

const ALL_SNAPS: MobileBottomSheetState[] = [
  'collapsed',
  'peek',
  'mid',
  'full',
  'dismissed',
];

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

    // --- automate coverage: edge cases / boundary conditions ---

    it('peek snap: full padding object (locks the 120 bottom + 72 top, no side padding)', () => {
      // The unit suite only asserted peek's .bottom in a combined check; lock
      // the complete object so a regression to top/side padding at peek is caught.
      expect(
        computeRecenterPadding({
          isDesktop: false,
          mobileSheetState: 'peek',
          isVenueDetailOpen: false,
        }),
      ).toEqual({ top: 72, bottom: 120, left: 0, right: 0 });
    });

    it('collapsed cover is strictly less than peek — the snaps stay monotonically ordered', () => {
      // Boundary: collapsed (handle strip + safe-area) must never exceed the
      // next rung up (peek); otherwise the dot framing inverts between snaps.
      const cover = (s: MobileBottomSheetState) =>
        computeRecenterPadding({ isDesktop: false, mobileSheetState: s, isVenueDetailOpen: false })
          .bottom;
      expect(cover('dismissed')).toBeLessThan(cover('collapsed'));
      expect(cover('collapsed')).toBeLessThan(cover('peek'));
      expect(cover('peek')).toBeLessThan(cover('mid'));
      expect(cover('mid')).toBeLessThan(cover('full'));
    });

    it('IGNORES isVenueDetailOpen on mobile — the detail panel is desktop-only (no right padding)', () => {
      // Cross-axis boundary: the venue-detail panel does not exist below lg, so
      // a mobile recenter must never add right padding even when the flag is on.
      const closed = computeRecenterPadding({
        isDesktop: false,
        mobileSheetState: 'mid',
        isVenueDetailOpen: false,
      });
      const open = computeRecenterPadding({
        isDesktop: false,
        mobileSheetState: 'mid',
        isVenueDetailOpen: true,
      });
      expect(open).toEqual(closed);
      expect(open.right).toBe(0);
    });

    it('every mobile snap returns a well-formed padding (4 finite numeric keys, top always 72)', () => {
      // Guards against undefined/NaN leaking into MapLibre CameraOptions.padding
      // for any enum member (the SHEET_COVER_H `?? 0` fallback + shape invariant).
      for (const snap of ALL_SNAPS) {
        const p = computeRecenterPadding({
          isDesktop: false,
          mobileSheetState: snap,
          isVenueDetailOpen: false,
        });
        for (const key of ['top', 'bottom', 'left', 'right'] as const) {
          expect(Number.isFinite(p[key]), `${snap}.${key}`).toBe(true);
        }
        expect(p.top).toBe(72);
        expect(p.left).toBe(0);
        expect(p.right).toBe(0);
        expect(p.bottom).toBeGreaterThanOrEqual(0);
      }
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

    // --- automate coverage: edge cases / boundary conditions ---

    it('desktop NEVER adds bottom/top padding for ANY mobile snap (no phantom sheet)', () => {
      // The mobile sheet + top bar are CSS-hidden on desktop; recenter framing
      // there depends only on the side panels. Assert every snap collapses to
      // the same side-only padding so a snap leak into desktop is caught.
      for (const snap of ALL_SNAPS) {
        const p = computeRecenterPadding({
          isDesktop: true,
          mobileSheetState: snap,
          isVenueDetailOpen: false,
        });
        expect(p.top).toBe(0);
        expect(p.bottom).toBe(0);
        expect(p.left).toBe(340);
      }
    });

    it('desktop padding is well-formed for both detail states (4 finite numeric keys)', () => {
      for (const isVenueDetailOpen of [false, true]) {
        const p = computeRecenterPadding({
          isDesktop: true,
          mobileSheetState: 'mid',
          isVenueDetailOpen,
        });
        for (const key of ['top', 'bottom', 'left', 'right'] as const) {
          expect(Number.isFinite(p[key]), `open=${isVenueDetailOpen}.${key}`).toBe(true);
        }
      }
    });
  });
});
