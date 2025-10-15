// ConfidenceBadge Component
// Story 4.2: Patio Information Cards & Results
// Displays confidence level with color coding and optional tooltip

import React, { useState } from 'react';
import type { ConfidenceLevel } from '../../../types/timeline';
import {
  getConfidenceLevel,
  getConfidenceBadgeColor,
  getConfidenceDescription,
} from '../../../utils/sunWindowUtils';

export interface ConfidenceBadgeProps {
  confidence: number; // 0-100
  showTooltip?: boolean;
  weatherFactors?: string[];
  isEstimated?: boolean;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence,
  showTooltip = true,
  weatherFactors = [],
  isEstimated = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Cap at 60% for estimated values
  const displayConfidence = isEstimated ? Math.min(confidence, 60) : confidence;
  const level: ConfidenceLevel = getConfidenceLevel(confidence, isEstimated);
  const colorClass = getConfidenceBadgeColor(level);
  const description = getConfidenceDescription(level);

  return (
    <div className="relative inline-block">
      <div
        className={`px-3 py-1 rounded-full text-sm font-medium ${colorClass} cursor-default`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="status"
        aria-label={`Confidence: ${level} (${displayConfidence}%)`}
      >
        <span className="flex items-center gap-1">
          <span>{level}</span>
          <span className="text-xs opacity-90">{displayConfidence}%</span>
        </span>
      </div>

      {/* Tooltip */}
      {showTooltip && isHovered && (
        <div
          className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg"
          role="tooltip"
        >
          <div className="font-semibold mb-1">{description}</div>
          
          {isEstimated && (
            <div className="text-xs opacity-90 mb-2">
              Estimated values are capped at 60% confidence
            </div>
          )}

          {weatherFactors.length > 0 && (
            <div className="text-xs opacity-90 mt-2">
              <div className="font-medium mb-1">Factors affecting confidence:</div>
              <ul className="list-disc list-inside space-y-1">
                {weatherFactors.map((factor, index) => (
                  <li key={index}>{factor}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
};
