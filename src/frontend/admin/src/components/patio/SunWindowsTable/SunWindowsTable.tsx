import React from 'react';
import type { SunWindow } from '../../../types';
import { ConfidenceExplanation } from '../ConfidenceExplanation';

export interface SunWindowsTableProps {
  windows: SunWindow[];
  date: Date;
  noSunReason?: 'Shadow' | 'Cloud' | 'Weather' | 'Unknown';
}

/**
 * SunWindowsTable displays sorted sun windows with time ranges,
 * duration, and confidence explanations
 */
export const SunWindowsTable: React.FC<SunWindowsTableProps> = ({ windows }) => {
  // Sort windows by start time
  const sortedWindows = [...windows].sort((a, b) => {
    const timeA = new Date(a.localStartTime).getTime();
    const timeB = new Date(b.localStartTime).getTime();
    return timeA - timeB;
  });

  return (
    <div className="space-y-4">
      {sortedWindows.map((window) => (
        <SunWindowCard key={window.id} window={window} />
      ))}
    </div>
  );
};

interface SunWindowCardProps {
  window: SunWindow;
}

const SunWindowCard: React.FC<SunWindowCardProps> = ({ window }) => {
  const startTime = new Date(window.localStartTime);
  const endTime = new Date(window.localEndTime);
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (durationStr: string) => {
    // Parse TimeSpan format (HH:MM:SS)
    const parts = durationStr.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Calculate sun intensity level based on average exposure
  const getSunIntensityColor = (exposure: number) => {
    if (exposure >= 75) return 'bg-yellow-400';
    if (exposure >= 50) return 'bg-yellow-300';
    if (exposure >= 25) return 'bg-yellow-200';
    return 'bg-yellow-100';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <div className="bg-white rounded-2xl shadow p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {/* Sun intensity indicator */}
            <div
              className={`w-3 h-3 rounded-full ${getSunIntensityColor(
                window.averageExposurePercent
              )}`}
              title={`${Math.round(window.averageExposurePercent)}% sun exposure`}
            />
            
            {/* Time range */}
            <div className="text-lg font-semibold text-gray-900">
              {formatTime(startTime)} - {formatTime(endTime)}
            </div>
            
            {/* Duration */}
            <div className="text-sm text-gray-500">
              ({formatDuration(window.duration)})
            </div>
          </div>

          {/* Description */}
          {window.description && (
            <p className="text-sm text-gray-600 mt-1 ml-6">{window.description}</p>
          )}
        </div>

        {/* Confidence badge */}
        <div className={`text-sm font-medium ${getConfidenceColor(window.confidence)}`}>
          {Math.round(window.confidence)}% confidence
        </div>
      </div>

      {/* Sun exposure bar */}
      <div className="mb-3 ml-6">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <span>Sun exposure: {Math.round(window.averageExposurePercent)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${getSunIntensityColor(
              window.averageExposurePercent
            )}`}
            style={{ width: `${window.averageExposurePercent}%` }}
          />
        </div>
      </div>

      {/* Confidence explanation */}
      <ConfidenceExplanation
        confidence={window.confidence}
        quality={window.quality}
        description={window.description}
      />
    </div>
  );
};
