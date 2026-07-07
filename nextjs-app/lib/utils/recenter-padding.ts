/**
 * Story 11.5 (AC3) — viewport-aware recenter padding.
 *
 * The "center on me" recenter `flyTo` must land the user-location dot in the
 * visual centre of the UNOBSCURED map area, not the raw viewport centre — the
 * mobile bottom sheet (at its current snap) and the desktop side panels cover
 * part of the map. MapLibre's `flyTo({ padding })` shifts the visual centre so
 * the target sits centred inside the padded (unobscured) rectangle.
 *
 * The padding is DERIVED from the CURRENT obstruction state (test-design
 * R-013 — a FIXED offset lands the dot off-centre at the collapsed vs full
 * sheet), computed from the snap-state enum + the height/width tokens rather
 * than an imperative DOM read (deterministic + unit-testable per snap).
 *
 * These pixel constants MIRROR the CSS tokens in `app/globals.css`
 * (`--size-bottom-sheet-*-h`, `--size-venue-list-desktop-w`,
 * `--size-venue-detail-panel-w`); keep the two in sync (same convention as
 * `DURATION_FLY_MS` mirroring `--duration-fly`).
 */

import type { MobileBottomSheetState } from '@/components/custom/sheets/MobileBottomSheet';

/** MapLibre `CameraOptions.padding` shape. */
export type RecenterPadding = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

/**
 * Mobile bottom-sheet cover height per snap, mirroring
 * `--size-bottom-sheet-*-h`. `collapsed` mirrors the 44 px handle strip; its
 * token also adds `env(safe-area-inset-bottom)`, so we add a small safe-area
 * allowance here (the exact inset is device-only and not resolvable in JS —
 * a modest constant keeps the dot clear of the handle on notched devices).
 * `dismissed` covers nothing.
 */
const SHEET_COVER_H: Record<MobileBottomSheetState, number> = {
  collapsed: 44 + 24,
  peek: 120,
  mid: 320,
  full: 560,
  dismissed: 0,
};

/** Mobile top search bar cover (the `top-3` card materially covers the top). */
const MOBILE_TOP_BAR_COVER = 72;

/**
 * Mobile bottom nav-bar cover, mirroring `--size-mobile-nav-h`. The bottom
 * sheet is positioned `bottom-[var(--size-mobile-nav-h)]` ABOVE the
 * `fixed bottom-0` MobileNavBar (`lg:hidden`), so the true obstructed band from
 * the viewport bottom is `snapHeight + 52`. Added to every non-`dismissed`
 * mobile snap so the dot lands in the visual centre of the unobscured area
 * (Story 11.5 AC3) rather than ~52 px low.
 */
const MOBILE_NAV_BAR_COVER = 52;

/** Desktop venue-list panel width, mirroring `--size-venue-list-desktop-w`. */
const DESKTOP_LIST_W = 340;

/** Desktop venue-detail panel width, mirroring `--size-venue-detail-panel-w`. */
const DESKTOP_DETAIL_W = 390;

export type RecenterPaddingInput = {
  /** True at the desktop breakpoint (`min-width: 1024px`) where the side
   *  panels are visible and the mobile sheet/top-bar are hidden. */
  isDesktop: boolean;
  /** Current mobile bottom-sheet snap (only consulted when `!isDesktop`). */
  mobileSheetState: MobileBottomSheetState;
  /** Whether the desktop venue-detail panel is open (only when `isDesktop`). */
  isVenueDetailOpen: boolean;
};

/**
 * Compute the `flyTo` padding for the currently-visible obstructions.
 *
 * - Desktop: `left` = the always-present 340 px venue list; `right` = the
 *   390 px detail panel WHEN open. No bottom (no mobile sheet on desktop).
 * - Mobile: `bottom` = the current snap's cover height (per-snap, NOT fixed);
 *   `top` = the top search bar cover.
 */
export function computeRecenterPadding({
  isDesktop,
  mobileSheetState,
  isVenueDetailOpen,
}: RecenterPaddingInput): RecenterPadding {
  if (isDesktop) {
    return {
      top: 0,
      bottom: 0,
      left: DESKTOP_LIST_W,
      right: isVenueDetailOpen ? DESKTOP_DETAIL_W : 0,
    };
  }

  const sheetCover = SHEET_COVER_H[mobileSheetState] ?? 0;
  return {
    top: MOBILE_TOP_BAR_COVER,
    // `dismissed` covers nothing (sheet hidden); every other snap sits above the
    // 52 px nav bar, so the obstructed band = sheet cover + nav-bar cover.
    bottom: mobileSheetState === 'dismissed' ? 0 : sheetCover + MOBILE_NAV_BAR_COVER,
    left: 0,
    right: 0,
  };
}
