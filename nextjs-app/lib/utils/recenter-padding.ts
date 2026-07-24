/**
 * Story 12.9 — viewport-aware recenter padding for the row-count mobile sheet.
 *
 * The "center on me" recenter `flyTo` must land the user-location dot in the
 * visual centre of the unobscured map area. Mobile now passes the measured
 * bottom-sheet obstruction height instead of the old collapsed/peek/mid/full
 * enum, while desktop keeps its exact side-panel constants.
 */

/** MapLibre `CameraOptions.padding` shape. */
export type RecenterPadding = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

/** Mobile top search bar cover (the `top-3` card materially covers the top). */
const MOBILE_TOP_BAR_COVER = 72;

/** Mobile bottom nav-bar cover, mirroring `--size-mobile-nav-h`. */
const MOBILE_NAV_BAR_COVER = 52;

/** JS cannot resolve `env(safe-area-inset-bottom)`; keep the notched-device
 * allowance explicit for the same bottom band the CSS anchor uses. */
const MOBILE_SAFE_AREA_BOTTOM_ALLOWANCE = 24;

/** Desktop venue-list panel width, mirroring `--size-venue-list-desktop-w`. */
const DESKTOP_LIST_W = 340;

/** Desktop venue-detail panel width, mirroring `--size-venue-detail-panel-w`. */
const DESKTOP_DETAIL_W = 390;

/** Keep a usable centre region when a very small canvas reports dimensions. */
const MIN_UNOBSCURED_CANVAS_PX = 96;

export type RecenterPaddingInput = {
  /** True at the desktop breakpoint (`min-width: 1024px`). */
  isDesktop: boolean;
  /** Current measured mobile row-sheet height above the 52 px nav bar. */
  mobileSheetHeightPx?: number;
  /** Whether the desktop venue-detail panel is open (only when `isDesktop`). */
  isVenueDetailOpen: boolean;
  /** Optional live canvas height for finite mobile top/bottom clamping. */
  viewportHeightPx?: number;
};

/**
 * Compute the `flyTo` padding for the currently-visible obstructions.
 *
 * - Desktop: exact left/right side-panel offsets; no mobile top/bottom padding.
 * - Mobile: top search cover + measured row-sheet height + bottom nav cover,
 *   clamped to finite non-negative values and, when canvas height is known, to
 *   leave a useful central viewport.
 */
export function computeRecenterPadding({
  isDesktop,
  mobileSheetHeightPx = 0,
  isVenueDetailOpen,
  viewportHeightPx,
}: RecenterPaddingInput): RecenterPadding {
  if (isDesktop) {
    return {
      top: 0,
      bottom: 0,
      left: DESKTOP_LIST_W,
      right: isVenueDetailOpen ? DESKTOP_DETAIL_W : 0,
    };
  }

  const top = MOBILE_TOP_BAR_COVER;
  const unclampedBottom =
    nonNegative(mobileSheetHeightPx) +
    MOBILE_NAV_BAR_COVER +
    MOBILE_SAFE_AREA_BOTTOM_ALLOWANCE;
  const bottom = clampMobileBottomPadding(top, unclampedBottom, viewportHeightPx);

  return {
    top,
    bottom,
    left: 0,
    right: 0,
  };
}

function clampMobileBottomPadding(
  top: number,
  bottom: number,
  viewportHeightPx: number | undefined,
): number {
  if (!Number.isFinite(viewportHeightPx)) return nonNegative(bottom);
  const maxCombined = Math.max(0, nonNegative(viewportHeightPx) - MIN_UNOBSCURED_CANVAS_PX);
  return Math.min(nonNegative(bottom), Math.max(0, maxCombined - top));
}

function nonNegative(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}
