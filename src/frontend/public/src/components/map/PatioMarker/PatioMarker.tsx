// components/map/PatioMarker/PatioMarker.tsx
import React from 'react';
import { PatioData, SunStatus } from '../../../types/patio';

interface PatioMarkerProps {
  patio: PatioData;
  onClick?: (patio: PatioData) => void;
}

const getSunStatusColor = (status: SunStatus): string => {
  switch (status) {
    case 'Sunny':
      return '#22C55E'; // Green
    case 'Partial':
      return '#F59E0B'; // Amber
    case 'Shaded':
      return '#9CA3AF'; // Gray
    default:
      return '#9CA3AF';
  }
};

const PatioMarker: React.FC<PatioMarkerProps> = ({ patio, onClick }) => {
  const color = getSunStatusColor(patio.currentSunStatus);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); // Prevent space from scrolling
      onClick?.(patio);
    }
  };

  return (
    <div
      className="patio-marker cursor-pointer"
      onClick={() => onClick?.(patio)}
      role="button"
      tabIndex={0}
      aria-label={`${patio.venueName} - ${patio.currentSunStatus} (${patio.confidence}% confidence)`}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-caption font-semibold shadow-md hover:scale-110 transition-transform"
        style={{ backgroundColor: color }}
      >
        {patio.confidence}%
      </div>
    </div>
  );
};

// Memoize to prevent re-renders when patio data hasn't changed
export default React.memo(PatioMarker, (prevProps, nextProps) => {
  return (
    prevProps.patio.id === nextProps.patio.id &&
    prevProps.patio.currentSunStatus === nextProps.patio.currentSunStatus &&
    prevProps.patio.confidence === nextProps.patio.confidence
  );
});
