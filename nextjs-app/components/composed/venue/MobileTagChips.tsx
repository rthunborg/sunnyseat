'use client';

import { localizeTag } from '@/lib/utils/venue-tags';
import { cn } from '@/lib/utils';

export type MobileTagChipsProps = {
  /**
   * The data-driven tag union (canonical Swedish values, first-seen order) —
   * the SAME `collectTags(loadedVenues)` set the desktop nav renders. The row
   * renders nothing until at least one tag loads, so it never flashes a
   * placeholder set (Story 11.3 AC1).
   */
  tags: string[];
  /** `useTagFilter().isActive` — reads the SHARED filter context. */
  isActive: (tag: string) => boolean;
  /** `useTagFilter().toggleTag` — writes the SHARED filter context. */
  onToggleTag: (tag: string) => void;
  /** Display locale for the chip label only (matching stays canonical). */
  locale: 'sv' | 'en';
  /** Accessible label for the scrollable chip-row group (localized "Filter"). */
  label: string;
  className?: string;
};

/**
 * Story 11.3 (AC1): the mobile tag-chip row that lives in the `MobileBottomSheet`
 * header, directly under the "Mest sol / Nära mig" sort toggles. It is a NEW
 * consumer of the SAME `TagFilterContext` + `collectTags`/`localizeTag` the
 * desktop nav uses — a toggle here filters the list AND the map pins identically
 * on both breakpoints (the venue surfaces already apply
 * `filterVenuesByTags(rawVenues, activeTags)` once in `MapView`), with ZERO new
 * filter plumbing. Chip styling mirrors the desktop reference "on" pill so both
 * breakpoints read identically.
 *
 * AC3 axis guard (load-bearing): the row is a horizontal `overflow-x-auto`
 * scroller with `touch-action: pan-x`, so a horizontal chip fling is routed to
 * the chip scroller by the browser and NEVER hijacks the vertical sheet drag
 * (the sheet's `useDrag` is already `axis: 'y'`; this is belt-and-suspenders).
 */
export function MobileTagChips({
  tags,
  isActive,
  onToggleTag,
  locale,
  label,
  className,
}: MobileTagChipsProps) {
  if (tags.length === 0) return null;

  return (
    <nav
      aria-label={label}
      data-testid="mobile-tag-chips"
      data-tour-anchor="tag-chips"
      // `overflow-x-auto` + `pan-x` claims the horizontal axis so a fling on the
      // chips scrolls the chips and leaves the sheet `data-state` unchanged.
      className={cn(
        'flex items-center gap-2 overflow-x-auto pb-3 [scrollbar-width:none]',
        className,
      )}
      style={{ touchAction: 'pan-x' }}
    >
      {tags.map((tag) => {
        const active = isActive(tag);
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={active}
            onClick={() => onToggleTag(tag)}
            className={cn(
              // 44px min touch target on mobile (`min-h-11`) while keeping the
              // reference pill styling shared with the desktop chip row.
              'flex min-h-11 shrink-0 items-center rounded-pill border px-4 text-label-lg shadow-subtle transition-colors duration-fast ease-default outline-none focus-visible:ring-2 focus-visible:ring-text-primary',
              active
                ? 'border-text-primary bg-text-primary text-white'
                : 'border-divider bg-white text-text-body',
            )}
          >
            {localizeTag(tag, locale)}
          </button>
        );
      })}
    </nav>
  );
}
