'use client';

import { useReducer, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// State machine: browsing → selected → detail
// ---------------------------------------------------------------------------

export type MobileViewState = 'browsing' | 'selected' | 'detail';

interface SelectionFlowState {
  viewState: MobileViewState;
  selectedVenueId: string | null;
  /** Map view to restore when deselecting */
  previousMapView: { center: [number, number]; zoom: number } | null;
}

type SelectionAction =
  | { type: 'SELECT_VENUE'; venueId: string; mapCenter: [number, number]; mapZoom: number }
  | { type: 'DESELECT' }
  | { type: 'OPEN_DETAIL' }
  | { type: 'CLOSE_DETAIL' }
  | { type: 'SWITCH_VENUE'; venueId: string };

const initialState: SelectionFlowState = {
  viewState: 'browsing',
  selectedVenueId: null,
  previousMapView: null,
};

function reducer(state: SelectionFlowState, action: SelectionAction): SelectionFlowState {
  switch (action.type) {
    case 'SELECT_VENUE':
      return {
        viewState: 'selected',
        selectedVenueId: action.venueId,
        // Only store previous view if coming from browsing (not re-selecting)
        previousMapView:
          state.viewState === 'browsing'
            ? { center: action.mapCenter, zoom: action.mapZoom }
            : state.previousMapView,
      };
    case 'SWITCH_VENUE':
      // Switch to different venue without restoring view first
      return {
        ...state,
        viewState: 'selected',
        selectedVenueId: action.venueId,
      };
    case 'DESELECT':
      return { ...initialState };
    case 'OPEN_DETAIL':
      if (state.viewState !== 'selected') return state;
      return { ...state, viewState: 'detail' };
    case 'CLOSE_DETAIL':
      if (state.viewState !== 'detail') return state;
      return { ...state, viewState: 'selected' };
    default:
      return state;
  }
}

/**
 * useVenueSelectionFlow — manages the mobile venue interaction state machine.
 *
 * browsing  → tap card/marker → selected (map zooms in, SelectedVenueCard shows)
 * selected  → tap "Mer info"  → detail   (VenueDetailProfile slides up)
 * selected  → tap map bg      → browsing (map zooms back, carousel returns)
 * detail    → swipe down / ←  → selected
 */
export function useVenueSelectionFlow() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const selectVenue = useCallback(
    (venueId: string, mapCenter: [number, number], mapZoom: number) => {
      if (state.selectedVenueId && state.selectedVenueId !== venueId) {
        dispatch({ type: 'SWITCH_VENUE', venueId });
      } else {
        dispatch({ type: 'SELECT_VENUE', venueId, mapCenter, mapZoom });
      }
    },
    [state.selectedVenueId],
  );

  const deselectVenue = useCallback(() => {
    dispatch({ type: 'DESELECT' });
  }, []);

  const openDetail = useCallback(() => {
    dispatch({ type: 'OPEN_DETAIL' });
  }, []);

  const closeDetail = useCallback(() => {
    dispatch({ type: 'CLOSE_DETAIL' });
  }, []);

  return {
    ...state,
    selectVenue,
    deselectVenue,
    openDetail,
    closeDetail,
  };
}
