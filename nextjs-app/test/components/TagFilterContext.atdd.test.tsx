/**
 * ATDD RED-PHASE SCAFFOLD — Story 9.7 AC3 / AC4 (shared tag-filter context)
 *
 * Proves the AC3 CRUX: the chip row (DesktopNavBar subtree) and the venue
 * surfaces (MapView subtree) are in SEPARATE React subtrees joined only high up
 * at `AppContextProviders`, so the filter state MUST live in a shared context —
 * a single `TagFilterProvider` instance whose writes from one subtree are read
 * by the other. Local component state cannot satisfy this; these tests fail if a
 * dev reaches for `useState` inside either surface instead of the shared context.
 *
 * STATUS: describe.skip — `@/lib/contexts/TagFilterContext` does not exist yet.
 * The block is skipped so the PostToolUse gate (tsc + vitest + eslint on every
 * test write) stays GREEN, AND every reference to the not-yet-existing module is
 * a RUNTIME dynamic specifier resolved INSIDE the skipped test bodies (never a
 * top-level static import), so neither `tsc --noEmit` nor Vitest import-analysis
 * trips on the missing path. When the dev creates
 * `lib/contexts/TagFilterContext.tsx` (Task 4), un-skip this block and (optional)
 * hoist the dynamic specifiers to a normal top-level import.
 *
 * Expected module contract (Task 4 / story Dev Notes):
 *   export function TagFilterProvider(props: { children: ReactNode }): ReactElement
 *   export function useTagFilter(): {
 *     activeTags: ReadonlySet<string> | readonly string[];
 *     toggleTag(tag: string): void;
 *     clearTags(): void;
 *     isActive(tag: string): boolean;
 *   }
 * Default context value is a NO-OP object (not a throw) so trigger components
 * render safely in unit tests WITHOUT the provider — mirrors SettingsContext.tsx.
 *
 * Deterministic RTL/jsdom only: assertions read rendered text + context state
 * after `fireEvent.click` inside `act`. No wall-clock, no timers, no animation.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { createElement, type ReactElement, type ReactNode } from 'react';

// Runtime dynamic specifier — resolved only inside (skipped) bodies. The string
// is deliberately built at call time so static import analysis cannot see it.
const TAG_FILTER_CTX = '@/lib/contexts/TagFilterContext';

type UseTagFilter = () => {
  activeTags: ReadonlySet<string> | readonly string[];
  toggleTag(tag: string): void;
  clearTags(): void;
  isActive(tag: string): boolean;
};

type TagFilterModule = {
  TagFilterProvider: (props: { children: ReactNode }) => ReactElement;
  useTagFilter: UseTagFilter;
};

async function loadTagFilter(): Promise<TagFilterModule> {
  return (await import(/* @vite-ignore */ TAG_FILTER_CTX)) as unknown as TagFilterModule;
}

describe.skip('Story 9.7 AC3/AC4 — shared TagFilterContext (RED)', () => {
  it('exposes a no-op default value so consumers render WITHOUT a provider (no throw)', async () => {
    const { useTagFilter } = await loadTagFilter();

    function Probe() {
      const { activeTags, isActive } = useTagFilter();
      // No provider: state is empty and reads are safe (isActive false, no active tags).
      return createElement(
        'div',
        { 'data-testid': 'probe' },
        `count=${Array.from(activeTags as Iterable<string>).length};active=${String(isActive('Innergård'))}`,
      );
    }

    // Rendering the raw consumer with NO TagFilterProvider must not throw.
    render(createElement(Probe));
    expect(screen.getByTestId('probe')).toHaveTextContent('count=0;active=false');
  });

  it('toggleTag adds then removes a tag; isActive tracks membership', async () => {
    const { TagFilterProvider, useTagFilter } = await loadTagFilter();

    function Probe() {
      const { activeTags, toggleTag, isActive } = useTagFilter();
      return createElement(
        'div',
        null,
        createElement(
          'button',
          { type: 'button', onClick: () => toggleTag('Innergård'), 'data-testid': 'toggle' },
          'toggle',
        ),
        createElement(
          'span',
          { 'data-testid': 'state' },
          `n=${Array.from(activeTags as Iterable<string>).length};on=${String(isActive('Innergård'))}`,
        ),
      );
    }

    render(createElement(TagFilterProvider, null, createElement(Probe)));
    expect(screen.getByTestId('state')).toHaveTextContent('n=0;on=false');

    act(() => {
      fireEvent.click(screen.getByTestId('toggle'));
    });
    expect(screen.getByTestId('state')).toHaveTextContent('n=1;on=true');

    act(() => {
      fireEvent.click(screen.getByTestId('toggle'));
    });
    expect(screen.getByTestId('state')).toHaveTextContent('n=0;on=false');
  });

  it('clearTags removes ALL active tags in one call', async () => {
    const { TagFilterProvider, useTagFilter } = await loadTagFilter();

    function Probe() {
      const { activeTags, toggleTag, clearTags } = useTagFilter();
      return createElement(
        'div',
        null,
        createElement(
          'button',
          { type: 'button', onClick: () => toggleTag('Innergård'), 'data-testid': 'a' },
          'a',
        ),
        createElement(
          'button',
          { type: 'button', onClick: () => toggleTag('Hund ok'), 'data-testid': 'b' },
          'b',
        ),
        createElement('button', { type: 'button', onClick: clearTags, 'data-testid': 'clear' }, 'clear'),
        createElement(
          'span',
          { 'data-testid': 'count' },
          String(Array.from(activeTags as Iterable<string>).length),
        ),
      );
    }

    render(createElement(TagFilterProvider, null, createElement(Probe)));
    act(() => {
      fireEvent.click(screen.getByTestId('a'));
      fireEvent.click(screen.getByTestId('b'));
    });
    expect(screen.getByTestId('count')).toHaveTextContent('2');

    act(() => {
      fireEvent.click(screen.getByTestId('clear'));
    });
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('SHARED context: a write in one subtree is read by a SIBLING subtree (nav↔venues join)', async () => {
    const { TagFilterProvider, useTagFilter } = await loadTagFilter();

    // Emulates the real layout: the chip WRITER (DesktopNavBar subtree) and the
    // venue READER (MapView subtree) are SIBLINGS under one provider — NOT in a
    // parent/child relation. The reader must see the writer's toggle purely via
    // shared context. A local-state implementation would fail this.
    function ChipWriterSubtree() {
      const { toggleTag } = useTagFilter();
      return createElement(
        'button',
        { type: 'button', onClick: () => toggleTag('Wifi'), 'data-testid': 'chip-writer' },
        'chip',
      );
    }
    function VenueReaderSubtree() {
      const { activeTags } = useTagFilter();
      const list = Array.from(activeTags as Iterable<string>).join(',');
      return createElement('div', { 'data-testid': 'venue-reader' }, list || 'ALL');
    }

    render(
      createElement(
        TagFilterProvider,
        null,
        createElement(ChipWriterSubtree),
        createElement(VenueReaderSubtree),
      ),
    );

    // Default (0 active) → the reader shows ALL (AC4 no-op default).
    expect(screen.getByTestId('venue-reader')).toHaveTextContent('ALL');

    act(() => {
      fireEvent.click(screen.getByTestId('chip-writer'));
    });
    // The sibling reader observed the writer's toggle through shared context.
    expect(screen.getByTestId('venue-reader')).toHaveTextContent('Wifi');
  });
});
