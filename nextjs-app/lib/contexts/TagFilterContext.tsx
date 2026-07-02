'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * Story 9.7 (Tag Filtering) — the shared tag-filter state.
 *
 * The chip UI (the `DesktopNavBar` subtree) and the venue surfaces (the
 * `MapView` subtree: desktop/mobile lists + map pins) live in SEPARATE React
 * subtrees joined only high up at `AppContextProviders`. Filter state therefore
 * cannot be local to either surface — it MUST live in a shared context so a
 * chip toggle written from the nav is read by the venue surfaces. This is the
 * crux of AC3.
 *
 * `activeTags` is a `ReadonlySet<string>` of the CANONICAL (Swedish) stored tag
 * values — matching is always canonical; only the rendered chip label is
 * localized (see `lib/utils/venue-tags.ts`). Zero active tags = the no-op
 * default (AC4: show ALL venues).
 */
export type TagFilterContextValue = {
  activeTags: ReadonlySet<string>;
  toggleTag: (tag: string) => void;
  clearTags: () => void;
  isActive: (tag: string) => boolean;
  /**
   * Prune `activeTags` to the intersection with `availableTags` — toggle off any
   * active tag no longer present in the currently loaded venue set's tag union.
   * Guards against an orphaned active filter with no visible chip to clear it
   * (a stale filter silently stranding the list + pins to empty). Story 9.7
   * "dead/confusing control" class. No-op (stable reference) when nothing changes.
   */
  retainTags: (availableTags: readonly string[]) => void;
};

const EMPTY_TAGS: ReadonlySet<string> = new Set();
const noop = () => {};

/**
 * Default value is a no-op (not a throw) so trigger components — the desktop
 * nav chip row, the venue surfaces — keep rendering in unit tests that mount
 * them WITHOUT the provider. Mirrors `SettingsContext.tsx`. With zero active
 * tags the filter is a pass-through, so a provider-less render shows all
 * venues (AC4).
 */
const TagFilterContext = createContext<TagFilterContextValue>({
  activeTags: EMPTY_TAGS,
  toggleTag: noop,
  clearTags: noop,
  isActive: () => false,
  retainTags: noop,
});

export function TagFilterProvider({ children }: { children: ReactNode }) {
  const [activeTags, setActiveTags] = useState<ReadonlySet<string>>(EMPTY_TAGS);

  const toggleTag = useCallback((tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }, []);

  const clearTags = useCallback(() => {
    setActiveTags((prev) => (prev.size === 0 ? prev : EMPTY_TAGS));
  }, []);

  const retainTags = useCallback((availableTags: readonly string[]) => {
    setActiveTags((prev) => {
      if (prev.size === 0) return prev;
      const available = new Set(availableTags);
      let changed = false;
      const next = new Set<string>();
      for (const tag of prev) {
        if (available.has(tag)) {
          next.add(tag);
        } else {
          changed = true;
        }
      }
      if (!changed) return prev;
      return next.size === 0 ? EMPTY_TAGS : next;
    });
  }, []);

  const isActive = useCallback((tag: string) => activeTags.has(tag), [activeTags]);

  const value = useMemo<TagFilterContextValue>(
    () => ({ activeTags, toggleTag, clearTags, isActive, retainTags }),
    [activeTags, toggleTag, clearTags, isActive, retainTags],
  );

  return <TagFilterContext.Provider value={value}>{children}</TagFilterContext.Provider>;
}

export function useTagFilter(): TagFilterContextValue {
  return useContext(TagFilterContext);
}
