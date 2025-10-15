import { useState, useCallback, useRef } from 'react';
import type { DrawingState, UsePolygonEditorReturn } from '../types';

const DEFAULT_DRAWING_STATE: DrawingState = {
  mode: 'view',
  activePolygon: null,
  isDrawing: false,
  canUndo: false,
  canRedo: false,
};

export function usePolygonEditor(): UsePolygonEditorReturn {
  const [drawingState, setDrawingState] = useState<DrawingState>(DEFAULT_DRAWING_STATE);
  const undoStack = useRef<GeoJSON.Polygon[]>([]);
  const redoStack = useRef<GeoJSON.Polygon[]>([]);

  const updateUndoRedoState = useCallback(() => {
    setDrawingState(prev => ({
      ...prev,
      canUndo: undoStack.current.length > 0,
      canRedo: redoStack.current.length > 0,
    }));
  }, []);

  const startDrawing = useCallback(() => {
    setDrawingState(prev => ({
      ...prev,
      mode: 'draw',
      isDrawing: true,
      activePolygon: null,
    }));
  }, []);

  const stopDrawing = useCallback(() => {
    setDrawingState(prev => ({
      ...prev,
      mode: 'view',
      isDrawing: false,
    }));
  }, []);

  const startEditing = useCallback((polygon: GeoJSON.Polygon) => {
    setDrawingState(prev => ({
      ...prev,
      mode: 'edit',
      activePolygon: polygon,
      isDrawing: false,
    }));
  }, []);

  const stopEditing = useCallback(() => {
    setDrawingState(prev => ({
      ...prev,
      mode: 'view',
      activePolygon: null,
    }));
  }, []);

  const undo = useCallback(() => {
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const redo = useCallback(() => {
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const savePolygon = useCallback(async (polygon: GeoJSON.Polygon) => {
    try {
      setDrawingState(prev => ({
        ...prev,
        activePolygon: polygon,
      }));
      console.log('Polygon saved successfully');
    } catch (error) {
      console.error('Failed to save polygon:', error);
      throw error;
    }
  }, []);

  return {
    drawingState,
    startDrawing,
    stopDrawing,
    startEditing,
    stopEditing,
    undo,
    redo,
    savePolygon,
  };
}