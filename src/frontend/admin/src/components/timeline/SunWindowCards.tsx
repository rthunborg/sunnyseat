import React from 'react';
import { ClockIcon, SunIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { SunWindow } from '../../types';

interface SunWindowCardProps {
  window: SunWindow;
  venueName?: string;
  onClick?: () => void;
  className?: string;
}

export const SunWindowCard: React.FC<SunWindowCardProps> = ({
  window,
  venueName,
  onClick,
  className = ''
}) => {
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (duration: string) => {
    // Parse TimeSpan format (HH:mm:ss)
    const parts = duration.split(':');
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'Excellent':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'Good':
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />;
      case 'Fair':
        return <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />;
      case 'Poor':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <SunIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getQualityBgClass = (quality: string) => {
    switch (quality) {
      case 'Excellent':
        return 'bg-green-50 border-green-200 hover:bg-green-100';
      case 'Good':
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
      case 'Fair':
        return 'bg-amber-50 border-amber-200 hover:bg-amber-100';
      case 'Poor':
        return 'bg-red-50 border-red-200 hover:bg-red-100';
      default:
        return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
    }
  };

  const getQualityTextClass = (quality: string) => {
    switch (quality) {
      case 'Excellent':
        return 'text-green-700';
      case 'Good':
        return 'text-blue-700';
      case 'Fair':
        return 'text-amber-700';
      case 'Poor':
        return 'text-red-700';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <div
      className={`
        p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer
        ${getQualityBgClass(window.quality)}
        ${onClick ? 'hover:shadow-md' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getQualityIcon(window.quality)}
          <span className={`font-semibold ${getQualityTextClass(window.quality)}`}>
            {window.quality} Quality
          </span>
        </div>
        {window.isRecommended && (
          <div className="flex items-center space-x-1">
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-600">Recommended</span>
          </div>
        )}
      </div>

      {/* Venue Name */}
      {venueName && (
        <div className="mb-2">
          <span className="text-sm font-medium text-gray-900">{venueName}</span>
        </div>
      )}

      {/* Description */}
      <div className="mb-3">
        <h3 className="text-base font-medium text-gray-900 mb-1">
          {window.description}
        </h3>
      </div>

      {/* Time Information */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex items-center space-x-2">
          <ClockIcon className="h-4 w-4 text-gray-500" />
          <div className="text-sm">
            <div className="font-medium text-gray-900">
              {formatTime(window.localStartTime)} - {formatTime(window.localEndTime)}
            </div>
            <div className="text-gray-500">
              Duration: {formatDuration(window.duration)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <SunIcon className="h-4 w-4 text-yellow-500" />
          <div className="text-sm">
            <div className="font-medium text-gray-900">
              Peak: {window.peakExposure.toFixed(0)}%
            </div>
            <div className="text-gray-500">
              at {formatTime(window.localPeakExposureTime)}
            </div>
          </div>
        </div>
      </div>

      {/* Sun Exposure Details */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Sun Exposure Range:</span>
          <span className="font-medium text-gray-900">
            {window.minExposurePercent.toFixed(0)}% - {window.maxExposurePercent.toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Average Exposure:</span>
          <span className="font-medium text-gray-900">
            {window.averageExposurePercent.toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Confidence:</span>
          <span className="font-medium text-gray-900">
            {window.confidence.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Priority Score Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Priority Score</span>
          <span>{window.priorityScore.toFixed(1)}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              window.priorityScore >= 80 
                ? 'bg-green-500' 
                : window.priorityScore >= 60 
                ? 'bg-blue-500' 
                : window.priorityScore >= 40 
                ? 'bg-amber-500' 
                : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(window.priorityScore, 100)}%` }}
          />
        </div>
      </div>

      {/* Recommendation Reason */}
      {window.recommendationReason && (
        <div className="text-xs text-gray-600 italic">
          "{window.recommendationReason}"
        </div>
      )}
    </div>
  );
};

interface SunWindowGridProps {
  windows: SunWindow[];
  venueNames?: { [patioId: number]: string };
  onWindowClick?: (window: SunWindow) => void;
  maxItems?: number;
  className?: string;
}

export const SunWindowGrid: React.FC<SunWindowGridProps> = ({
  windows,
  venueNames = {},
  onWindowClick,
  maxItems,
  className = ''
}) => {
  const displayWindows = maxItems ? windows.slice(0, maxItems) : windows;

  if (windows.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <SunIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">No sun windows found</p>
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${className}`}>
      {displayWindows.map((window, index) => (
        <SunWindowCard
          key={`${window.patioId}-${index}`}
          window={window}
          venueName={venueNames[window.patioId]}
          onClick={() => onWindowClick?.(window)}
        />
      ))}
      
      {maxItems && windows.length > maxItems && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">
            Showing {maxItems} of {windows.length} sun windows
          </p>
        </div>
      )}
    </div>
  );
};