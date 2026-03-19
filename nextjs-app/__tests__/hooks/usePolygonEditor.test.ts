import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePolygonEditor } from '@/lib/hooks/usePolygonEditor';

describe('usePolygonEditor', () => {
  it('starts in idle mode with empty state', () => {
    const { result } = renderHook(() => usePolygonEditor());
    expect(result.current.mode).toBe('idle');
    expect(result.current.vertices).toEqual([]);
    expect(result.current.selectedVenueId).toBeNull();
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('enters drawing mode', () => {
    const { result } = renderHook(() => usePolygonEditor());
    act(() => result.current.startDrawing());
    expect(result.current.mode).toBe('drawing');
    expect(result.current.vertices).toEqual([]);
  });

  it('adds vertices in drawing mode', () => {
    const { result } = renderHook(() => usePolygonEditor());
    act(() => result.current.startDrawing());
    act(() => result.current.addVertex([11.97, 57.70]));
    act(() => result.current.addVertex([11.98, 57.70]));
    expect(result.current.vertices).toHaveLength(2);
    expect(result.current.vertices[0]).toEqual([11.97, 57.70]);
  });

  it('does not add vertices outside drawing mode', () => {
    const { result } = renderHook(() => usePolygonEditor());
    act(() => result.current.addVertex([11.97, 57.70]));
    expect(result.current.vertices).toHaveLength(0);
  });

  it('closes polygon with at least 3 vertices', () => {
    const { result } = renderHook(() => usePolygonEditor());
    act(() => result.current.startDrawing());
    act(() => result.current.addVertex([11.97, 57.70]));
    act(() => result.current.addVertex([11.98, 57.70]));
    act(() => result.current.addVertex([11.98, 57.71]));

    let geometry: GeoJSON.Polygon | null = null;
    act(() => {
      geometry = result.current.closePolygon();
    });

    expect(geometry).not.toBeNull();
    expect(geometry!.type).toBe('Polygon');
    expect(geometry!.coordinates[0]).toHaveLength(4); // 3 vertices + closing vertex
    expect(result.current.mode).toBe('idle');
  });

  it('does not close polygon with fewer than 3 vertices', () => {
    const { result } = renderHook(() => usePolygonEditor());
    act(() => result.current.startDrawing());
    act(() => result.current.addVertex([11.97, 57.70]));
    act(() => result.current.addVertex([11.98, 57.70]));

    let geometry: GeoJSON.Polygon | null = null;
    act(() => {
      geometry = result.current.closePolygon();
    });

    expect(geometry).toBeNull();
    expect(result.current.mode).toBe('drawing');
  });

  it('selects a venue', () => {
    const { result } = renderHook(() => usePolygonEditor());
    const verts: [number, number][] = [
      [11.97, 57.70],
      [11.98, 57.70],
      [11.98, 57.71],
    ];
    act(() => result.current.selectVenue('venue-1', verts));
    expect(result.current.mode).toBe('selected');
    expect(result.current.selectedVenueId).toBe('venue-1');
    expect(result.current.vertices).toEqual(verts);
  });

  it('deselects', () => {
    const { result } = renderHook(() => usePolygonEditor());
    act(() => result.current.selectVenue('venue-1', [[11.97, 57.70]]));
    act(() => result.current.deselect());
    expect(result.current.mode).toBe('idle');
    expect(result.current.selectedVenueId).toBeNull();
    expect(result.current.vertices).toEqual([]);
  });

  it('enters editing mode from selected', () => {
    const { result } = renderHook(() => usePolygonEditor());
    const verts: [number, number][] = [
      [11.97, 57.70],
      [11.98, 57.70],
      [11.98, 57.71],
    ];
    act(() => result.current.selectVenue('venue-1', verts));
    act(() => result.current.startEditing());
    expect(result.current.mode).toBe('editing');
  });

  it('moves a vertex in editing mode', () => {
    const { result } = renderHook(() => usePolygonEditor());
    const verts: [number, number][] = [
      [11.97, 57.70],
      [11.98, 57.70],
      [11.98, 57.71],
    ];
    act(() => result.current.selectVenue('venue-1', verts));
    act(() => result.current.startEditing());
    act(() => result.current.moveVertex(1, [11.985, 57.705]));
    expect(result.current.vertices[1]).toEqual([11.985, 57.705]);
  });

  it('does not move vertex outside editing mode', () => {
    const { result } = renderHook(() => usePolygonEditor());
    act(() =>
      result.current.selectVenue('venue-1', [
        [11.97, 57.70],
        [11.98, 57.70],
      ])
    );
    act(() => result.current.moveVertex(0, [12.0, 58.0]));
    expect(result.current.vertices[0]).toEqual([11.97, 57.70]);
  });

  it('deletes selected venue', () => {
    const { result } = renderHook(() => usePolygonEditor());
    act(() =>
      result.current.selectVenue('venue-1', [
        [11.97, 57.70],
        [11.98, 57.70],
      ])
    );
    act(() => result.current.deleteSelected());
    expect(result.current.mode).toBe('idle');
    expect(result.current.selectedVenueId).toBeNull();
  });

  it('undo/redo works', () => {
    const { result } = renderHook(() => usePolygonEditor());
    act(() => result.current.startDrawing());
    expect(result.current.mode).toBe('drawing');
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.mode).toBe('idle');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(result.current.mode).toBe('drawing');
    expect(result.current.canRedo).toBe(false);
  });

  it('reset returns to initial state', () => {
    const { result } = renderHook(() => usePolygonEditor());
    act(() => result.current.startDrawing());
    act(() => result.current.addVertex([11.97, 57.70]));
    act(() => result.current.reset());
    expect(result.current.mode).toBe('idle');
    expect(result.current.vertices).toEqual([]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});
