import React, { useState } from 'react';
import type { SunWindowQuality } from '../../../types';

export interface ConfidenceExplanationProps {
  confidence: number;
  quality: SunWindowQuality;
  description?: string;
}

/**
 * ConfidenceExplanation displays detailed confidence information
 * with expandable explanations for quality factors
 */
export const ConfidenceExplanation: React.FC<ConfidenceExplanationProps> = ({
  confidence,
  quality,
  description,
}) => {
  const [expanded, setExpanded] = useState(false);

  const getQualityIcon = (qualityLevel: SunWindowQuality) => {
    switch (qualityLevel) {
      case 'Excellent':
        return '🌟';
      case 'Good':
        return '✅';
      case 'Fair':
        return '⚠️';
      case 'Poor':
        return '❌';
      default:
        return '❓';
    }
  };

  const getQualityColor = (qualityLevel: SunWindowQuality) => {
    switch (qualityLevel) {
      case 'Excellent':
        return 'text-green-600';
      case 'Good':
        return 'text-blue-600';
      case 'Fair':
        return 'text-yellow-600';
      case 'Poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getQualityDescription = (qualityLevel: SunWindowQuality, conf: number) => {
    switch (qualityLevel) {
      case 'Excellent':
        return 'High confidence based on accurate weather data and precise shadow calculations.';
      case 'Good':
        return 'Good confidence with reliable weather forecasts and shadow modeling.';
      case 'Fair':
        return 'Moderate confidence. Weather or shadow data may have some uncertainties.';
      case 'Poor':
        return 'Lower confidence. Limited weather data or complex shadow conditions.';
      default:
        return `Confidence level: ${Math.round(conf)}%`;
    }
  };

  return (
    <div className="ml-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
      >
        {expanded ? '▼' : '▶'} Show confidence details
      </button>

      {expanded && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm space-y-2">
          {/* Quality indicator */}
          <div className="flex items-center gap-2">
            <span className="text-lg">{getQualityIcon(quality)}</span>
            <span className={`font-medium ${getQualityColor(quality)}`}>
              {quality} Quality
            </span>
          </div>

          {/* Confidence percentage */}
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Confidence:</span>
            <span className="font-medium">{Math.round(confidence)}%</span>
          </div>

          {/* Quality description */}
          <div className="pt-2 border-t border-gray-200">
            <p className="text-gray-700 text-xs">
              {getQualityDescription(quality, confidence)}
            </p>
          </div>

          {/* Additional description */}
          {description && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-gray-700 text-xs italic">{description}</p>
            </div>
          )}

          {/* Factors note */}
          <div className="pt-2 border-t border-gray-200 text-xs text-gray-600">
            <p>Confidence is based on:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Weather forecast accuracy</li>
              <li>Building shadow calculations</li>
              <li>Historical sun exposure data</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
