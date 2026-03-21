'use client';

import { useCallback, useReducer } from 'react';

export type EditorMode = 'idle' | 'drawing' | 'editing' | 'selected';

export interface VenuePolygon {
  id: string;
  name: string;
  height_source: string | null;
  geometry: GeoJSON.Polygon;
}

interface EditorState {
  mode: EditorMode;
  vertices: [number, number][];
  selectedVenueId: string | null;
  editingVertexIndex: number | null;
  past: EditorSnapshot[];
  future: EditorSnapshot[];
}

interface EditorSnapshot {
  vertices: [number, number][];
  selectedVenueId: string | null;
  mode: EditorMode;
}

type EditorAction =
  | { type: 'START_DRAWING' }
  | { type: 'ADD_VERTEX'; lngLat: [number, number] }
  | { type: 'CLOSE_POLYGON' }
  | { type: 'SELECT_VENUE'; venueId: string; vertices: [number, number][] }
  | { type: 'DESELECT' }
  | { type: 'START_EDITING' }
  | { type: 'MOVE_VERTEX'; index: number; lngLat: [number, number] }
  | { type: 'DELETE_SELECTED' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET' };

function snapshot(state: EditorState): EditorSnapshot {
  return {
    vertices: [...state.vertices.map((v) => [...v] as [number, number])],
    selectedVenueId: state.selectedVenueId,
    mode: state.mode,
  };
}

function pushHistory(state: EditorState): EditorState {
  return {
    ...state,
    past: [...state.past, snapshot(state)],
    future: [],
  };
}

const initialState: EditorState = {
  mode: 'idle',
  vertices: [],
  selectedVenueId: null,
  editingVertexIndex: null,
  past: [],
  future: [],
};

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'START_DRAWING': {
      const next = pushHistory(state);
      return { ...next, mode: 'drawing', vertices: [], selectedVenueId: null };
    }
    case 'ADD_VERTEX': {
      if (state.mode !== 'drawing') return state;
      return {
        ...state,
        vertices: [...state.vertices, action.lngLat],
      };
    }
    case 'CLOSE_POLYGON': {
      if (state.mode !== 'drawing' || state.vertices.length < 3) return state;
      return {
        ...state,
        mode: 'idle',
      };
    }
    case 'SELECT_VENUE': {
      const next = pushHistory(state);
      return {
        ...next,
        mode: 'selected',
        selectedVenueId: action.venueId,
        vertices: action.vertices,
      };
    }
    case 'DESELECT': {
      return {
        ...state,
        mode: 'idle',
        selectedVenueId: null,
        vertices: [],
        editingVertexIndex: null,
      };
    }
    case 'START_EDITING': {
      if (state.mode !== 'selected' || !state.selectedVenueId) return state;
      const next = pushHistory(state);
      return { ...next, mode: 'editing' };
    }
    case 'MOVE_VERTEX': {
      if (state.mode !== 'editing') return state;
      const newVertices = [...state.vertices];
      newVertices[action.index] = action.lngLat;
      return { ...state, vertices: newVertices };
    }
    case 'DELETE_SELECTED': {
      const next = pushHistory(state);
      return {
        ...next,
        mode: 'idle',
        selectedVenueId: null,
        vertices: [],
      };
    }
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return {
        ...state,
        mode: prev.mode,
        vertices: prev.vertices,
        selectedVenueId: prev.selectedVenueId,
        past: state.past.slice(0, -1),
        future: [snapshot(state), ...state.future],
        editingVertexIndex: null,
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        ...state,
        mode: next.mode,
        vertices: next.vertices,
        selectedVenueId: next.selectedVenueId,
        past: [...state.past, snapshot(state)],
        future: state.future.slice(1),
        editingVertexIndex: null,
      };
    }
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function usePolygonEditor() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const startDrawing = useCallback(() => dispatch({ type: 'START_DRAWING' }), []);
  const addVertex = useCallback(
    (lngLat: [number, number]) => dispatch({ type: 'ADD_VERTEX', lngLat }),
    []
  );
  const closePolygon = useCallback(() => {
    if (state.vertices.length < 3) return null;
    const coords = [...state.vertices, state.vertices[0]];
    dispatch({ type: 'CLOSE_POLYGON' });
    return {
      type: 'Polygon' as const,
      coordinates: [coords],
    };
  }, [state.vertices]);

  const selectVenue = useCallback(
    (venueId: string, vertices: [number, number][]) =>
      dispatch({ type: 'SELECT_VENUE', venueId, vertices }),
    []
  );
  const deselect = useCallback(() => dispatch({ type: 'DESELECT' }), []);
  const startEditing = useCallback(() => dispatch({ type: 'START_EDITING' }), []);
  const moveVertex = useCallback(
    (index: number, lngLat: [number, number]) =>
      dispatch({ type: 'MOVE_VERTEX', index, lngLat }),
    []
  );
  const deleteSelected = useCallback(() => dispatch({ type: 'DELETE_SELECTED' }), []);
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    ...state,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    startDrawing,
    addVertex,
    closePolygon,
    selectVenue,
    deselect,
    startEditing,
    moveVertex,
    deleteSelected,
    undo,
    redo,
    reset,
  };
}
