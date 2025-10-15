import type { DrawingState } from '../../types';

interface MapControlsProps {
  drawingState: DrawingState;
  onStartDrawing: () => void;
  onStopDrawing: () => void;
  onStartEditing: () => void;
  onStopEditing: () => void;
  onUndo: () => void;
  onRedo: () => void;
  className?: string;
}

export function MapControls({
  drawingState,
  onStartDrawing,
  onStopDrawing,
  onStartEditing,
  onStopEditing,
  onUndo,
  onRedo,
  className = '',
}: MapControlsProps) {
  return (
    <div className={`bg-white rounded-lg shadow-lg p-2 space-y-2 ${className}`}>
      {/* Drawing Controls */}
      <div className="flex flex-col space-y-1">
        {drawingState.mode === 'view' && (
          <button
            onClick={onStartDrawing}
            className="btn btn-primary text-sm py-1 px-3 flex items-center space-x-2"
            title="Draw new polygon"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="hidden sm:inline">Draw</span>
          </button>
        )}

        {drawingState.isDrawing && (
          <button
            onClick={onStopDrawing}
            className="btn btn-secondary text-sm py-1 px-3 flex items-center space-x-2"
            title="Cancel drawing"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="hidden sm:inline">Cancel</span>
          </button>
        )}

        {drawingState.mode === 'view' && drawingState.activePolygon && (
          <button
            onClick={onStartEditing}
            className="btn btn-primary text-sm py-1 px-3 flex items-center space-x-2"
            title="Edit selected polygon"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="hidden sm:inline">Edit</span>
          </button>
        )}

        {drawingState.mode === 'edit' && (
          <button
            onClick={onStopEditing}
            className="btn btn-secondary text-sm py-1 px-3 flex items-center space-x-2"
            title="Finish editing"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="hidden sm:inline">Done</span>
          </button>
        )}
      </div>

      {/* Undo/Redo Controls */}
      <div className="flex space-x-1 pt-2 border-t border-gray-200">
        <button
          onClick={onUndo}
          disabled={!drawingState.canUndo}
          className="btn btn-secondary text-sm py-1 px-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          title="Undo (Ctrl+Z)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        
        <button
          onClick={onRedo}
          disabled={!drawingState.canRedo}
          className="btn btn-secondary text-sm py-1 px-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          title="Redo (Ctrl+Y)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6-6m6 6l-6 6" />
          </svg>
        </button>
      </div>

      {/* Mode Indicator */}
      <div className="pt-2 border-t border-gray-200 text-xs text-gray-600">
        {drawingState.mode === 'draw' && 'Drawing Mode'}
        {drawingState.mode === 'edit' && 'Editing Mode'}
        {drawingState.mode === 'view' && 'View Mode'}
      </div>
    </div>
  );
}