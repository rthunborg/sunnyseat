import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVenueSelectionFlow } from '@/lib/hooks/useVenueSelectionFlow';

describe('useVenueSelectionFlow', () => {
  it('starts in browsing state with no selection', () => {
    const { result } = renderHook(() => useVenueSelectionFlow());
    expect(result.current.viewState).toBe('browsing');
    expect(result.current.selectedVenueId).toBeNull();
    expect(result.current.previousMapView).toBeNull();
  });

  it('transitions to selected state on selectVenue', () => {
    const { result } = renderHook(() => useVenueSelectionFlow());

    act(() => {
      result.current.selectVenue('v-1', [11.97, 57.70], 14);
    });

    expect(result.current.viewState).toBe('selected');
    expect(result.current.selectedVenueId).toBe('v-1');
    expect(result.current.previousMapView).toEqual({
      center: [11.97, 57.70],
      zoom: 14,
    });
  });

  it('stores previous map view only when coming from browsing', () => {
    const { result } = renderHook(() => useVenueSelectionFlow());

    // First select from browsing → stores previous
    act(() => {
      result.current.selectVenue('v-1', [11.97, 57.70], 14);
    });
    expect(result.current.previousMapView).toEqual({
      center: [11.97, 57.70],
      zoom: 14,
    });

    // Switch venue → should keep the original previous view
    act(() => {
      result.current.selectVenue('v-2', [12.0, 57.71], 16);
    });
    expect(result.current.selectedVenueId).toBe('v-2');
    expect(result.current.previousMapView).toEqual({
      center: [11.97, 57.70],
      zoom: 14,
    });
  });

  it('transitions to detail state on openDetail from selected', () => {
    const { result } = renderHook(() => useVenueSelectionFlow());

    act(() => result.current.selectVenue('v-1', [11.97, 57.70], 14));
    act(() => result.current.openDetail());

    expect(result.current.viewState).toBe('detail');
    expect(result.current.selectedVenueId).toBe('v-1');
  });

  it('ignores openDetail when in browsing state', () => {
    const { result } = renderHook(() => useVenueSelectionFlow());

    act(() => result.current.openDetail());

    expect(result.current.viewState).toBe('browsing');
  });

  it('transitions from detail back to selected on closeDetail', () => {
    const { result } = renderHook(() => useVenueSelectionFlow());

    act(() => result.current.selectVenue('v-1', [11.97, 57.70], 14));
    act(() => result.current.openDetail());
    act(() => result.current.closeDetail());

    expect(result.current.viewState).toBe('selected');
    expect(result.current.selectedVenueId).toBe('v-1');
  });

  it('ignores closeDetail when not in detail state', () => {
    const { result } = renderHook(() => useVenueSelectionFlow());

    act(() => result.current.selectVenue('v-1', [11.97, 57.70], 14));
    act(() => result.current.closeDetail());

    expect(result.current.viewState).toBe('selected');
  });

  it('resets to browsing on deselectVenue', () => {
    const { result } = renderHook(() => useVenueSelectionFlow());

    act(() => result.current.selectVenue('v-1', [11.97, 57.70], 14));
    act(() => result.current.deselectVenue());

    expect(result.current.viewState).toBe('browsing');
    expect(result.current.selectedVenueId).toBeNull();
    expect(result.current.previousMapView).toBeNull();
  });

  it('resets from detail state all the way to browsing on deselectVenue', () => {
    const { result } = renderHook(() => useVenueSelectionFlow());

    act(() => result.current.selectVenue('v-1', [11.97, 57.70], 14));
    act(() => result.current.openDetail());
    act(() => result.current.deselectVenue());

    expect(result.current.viewState).toBe('browsing');
    expect(result.current.selectedVenueId).toBeNull();
  });

  it('handles full flow: browsing → selected → detail → selected → browsing', () => {
    const { result } = renderHook(() => useVenueSelectionFlow());

    // browsing → selected
    act(() => result.current.selectVenue('v-1', [11.97, 57.70], 14));
    expect(result.current.viewState).toBe('selected');

    // selected → detail
    act(() => result.current.openDetail());
    expect(result.current.viewState).toBe('detail');

    // detail → selected
    act(() => result.current.closeDetail());
    expect(result.current.viewState).toBe('selected');

    // selected → browsing
    act(() => result.current.deselectVenue());
    expect(result.current.viewState).toBe('browsing');
  });
});
