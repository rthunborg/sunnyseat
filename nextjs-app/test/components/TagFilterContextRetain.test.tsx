/**
 * Epic 9 integration review fix — TagFilterContext.retainTags (orphaned-tag guard).
 *
 * When the venue set changes (new location/time) an active tag can vanish from
 * the loaded tag union while staying active in the shared context — its chip
 * stops rendering (DesktopNavBar's `allTags.length` gate) but it keeps filtering
 * the list + pins to empty with NO affordance to un-toggle it. `retainTags`
 * prunes `activeTags` to the intersection with the newly available union, so a
 * stale filter can never strand the surfaces.
 *
 * Deterministic RTL/jsdom only: reads rendered context state after clicks / a
 * `retainTags(...)` call inside `act`. No wall-clock, no timers.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { createElement } from 'react';
import { TagFilterProvider, useTagFilter } from '@/lib/contexts/TagFilterContext';

function Probe({ retainWith }: { retainWith: readonly string[] }) {
  const { activeTags, toggleTag, retainTags } = useTagFilter();
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
      { type: 'button', onClick: () => toggleTag('Wifi'), 'data-testid': 'b' },
      'b',
    ),
    createElement(
      'button',
      { type: 'button', onClick: () => retainTags(retainWith), 'data-testid': 'retain' },
      'retain',
    ),
    createElement(
      'span',
      { 'data-testid': 'state' },
      Array.from(activeTags as Iterable<string>).join(',') || 'NONE',
    ),
  );
}

describe('TagFilterContext.retainTags — orphaned-tag guard', () => {
  it('toggles off an active tag no longer present in the new union, keeping the survivor', () => {
    // New union carries only 'Innergård' → 'Wifi' is orphaned and must be pruned.
    render(createElement(TagFilterProvider, null, createElement(Probe, { retainWith: ['Innergård'] })));

    act(() => {
      fireEvent.click(screen.getByTestId('a'));
      fireEvent.click(screen.getByTestId('b'));
    });
    expect(screen.getByTestId('state')).toHaveTextContent('Innergård,Wifi');

    act(() => {
      fireEvent.click(screen.getByTestId('retain'));
    });
    expect(screen.getByTestId('state')).toHaveTextContent('Innergård');
    expect(screen.getByTestId('state')).not.toHaveTextContent('Wifi');
  });

  it('clears ALL active tags when none survive the new union (never strands the surfaces)', () => {
    // Empty union → every active tag is orphaned; retain must clear to NONE.
    render(createElement(TagFilterProvider, null, createElement(Probe, { retainWith: [] })));

    act(() => {
      fireEvent.click(screen.getByTestId('a'));
      fireEvent.click(screen.getByTestId('b'));
    });
    expect(screen.getByTestId('state')).toHaveTextContent('Innergård,Wifi');

    act(() => {
      fireEvent.click(screen.getByTestId('retain'));
    });
    expect(screen.getByTestId('state')).toHaveTextContent('NONE');
  });

  it('is a no-op when every active tag is still present', () => {
    render(
      createElement(
        TagFilterProvider,
        null,
        createElement(Probe, { retainWith: ['Innergård', 'Wifi', 'Hund ok'] }),
      ),
    );

    act(() => {
      fireEvent.click(screen.getByTestId('a'));
      fireEvent.click(screen.getByTestId('b'));
    });
    expect(screen.getByTestId('state')).toHaveTextContent('Innergård,Wifi');

    act(() => {
      fireEvent.click(screen.getByTestId('retain'));
    });
    expect(screen.getByTestId('state')).toHaveTextContent('Innergård,Wifi');
  });
});
