// PatioCard Component
// Story 4.2: Patio Information Cards & Results
// Displays patio information with sun status, distance, and mini timeline

import React from 'react';
import type { PatioData } from '../../../types/timeline';
import { ConfidenceBadge } from '../../common/ConfidenceBadge';
import { MiniTimeline } from '../MiniTimeline';
import {
  formatDistance,
  getSunStatusColor,
  getSunStatusTextColor,
} from '../../../utils/sunWindowUtils';

export interface PatioCardProps {
  patio: PatioData;
  onClick: (patioId: string) => void;
  showTimeline?: boolean;
}

export const PatioCard: React.FC<PatioCardProps> = ({
  patio,
  onClick,
  showTimeline = true,
}) => {
  const sunStatusColor = getSunStatusColor(patio.currentSunStatus);
  const sunStatusTextColor = getSunStatusTextColor(patio.currentSunStatus);

  const handleClick = () => {
    onClick(patio.id);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(patio.id);
    }
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow cursor-pointer p-4 space-y-4"
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      role="button"
      tabIndex={0}
      aria-label={`${patio.venueName}, ${formatDistance(patio.distanceMeters)} away, ${patio.currentSunStatus}`}
    >
      {/* Header: Venue name and distance */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-xl font-semibold leading-7 text-gray-900">
            {patio.venueName}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{patio.address}</p>
        </div>
        <div className="text-sm font-medium text-gray-500 ml-4">
          {formatDistance(patio.distanceMeters)}
        </div>
      </div>

      {/* Sun status indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full ${sunStatusColor}`} aria-hidden="true"></div>
          <span className={`font-medium ${sunStatusTextColor}`}>
            {patio.currentSunStatus}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          {patio.currentSunExposure}% sun
        </div>
      </div>

      {/* Confidence badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Confidence:</span>
        <ConfidenceBadge
          confidence={patio.confidence}
          showTooltip={true}
          isEstimated={patio.confidence <= 60}
        />
      </div>

      {/* Mini timeline (optional) */}
      {showTimeline && patio.miniTimeline && (
        <div className="pt-2 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Next 2 hours
          </h4>
          <MiniTimeline
            patioId={patio.id}
            startTime={new Date()}
            timelineData={patio.miniTimeline}
          />
        </div>
      )}

      {/* Geofence warning */}
      {!patio.isWithinGeofence && (
        <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
          ⚠️ This venue is beyond the 10km search radius
        </div>
      )}
    </div>
  );
};
