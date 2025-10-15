import React, { useState } from 'react';
import { 
  CalendarIcon, 
  ClockIcon, 
  CogIcon, 
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import type { TimelineViewOptions } from '../../types';

interface TimelineControlsProps {
  options: TimelineViewOptions;
  onOptionsChange: (options: TimelineViewOptions) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

export const TimelineControls: React.FC<TimelineControlsProps> = ({
  options,
  onOptionsChange,
  onRefresh,
  isLoading = false,
  className = ''
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleTimeRangeChange = (timeRange: TimelineViewOptions['timeRange']) => {
    const newOptions = { ...options, timeRange };
    
    // Clear custom times when switching away from custom
    if (timeRange !== 'custom') {
      newOptions.customStart = undefined;
      newOptions.customEnd = undefined;
    }
    
    onOptionsChange(newOptions);
  };

  const handleResolutionChange = (resolution: TimelineViewOptions['resolution']) => {
    onOptionsChange({ ...options, resolution });
  };

  const handleCustomTimeChange = (start?: string, end?: string) => {
    onOptionsChange({
      ...options,
      customStart: start,
      customEnd: end
    });
  };

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getDefaultCustomStart = (): string => {
    if (options.customStart) return options.customStart.slice(0, 16);
    return formatDateTimeLocal(new Date());
  };

  const getDefaultCustomEnd = (): string => {
    if (options.customEnd) return options.customEnd.slice(0, 16);
    const end = new Date();
    end.setHours(end.getHours() + 12);
    return formatDateTimeLocal(end);
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* Time Range Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <CalendarIcon className="inline h-4 w-4 mr-1" />
          Time Range
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { value: 'today', label: 'Today' },
            { value: 'tomorrow', label: 'Tomorrow' },
            { value: 'next12h', label: 'Next 12h' },
            { value: 'custom', label: 'Custom' }
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleTimeRangeChange(value as TimelineViewOptions['timeRange'])}
              className={`
                px-3 py-2 text-sm font-medium rounded-md border transition-colors
                ${options.timeRange === value
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Time Range Inputs */}
      {options.timeRange === 'custom' && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="datetime-local"
                value={getDefaultCustomStart()}
                onChange={(e) => handleCustomTimeChange(e.target.value, options.customEnd)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="datetime-local"
                value={getDefaultCustomEnd()}
                onChange={(e) => handleCustomTimeChange(options.customStart, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Resolution and Options */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <ClockIcon className="inline h-4 w-4 mr-1" />
              Resolution
            </label>
            <select
              value={options.resolution}
              onChange={(e) => handleResolutionChange(Number(e.target.value) as TimelineViewOptions['resolution'])}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <CogIcon className="h-4 w-4" />
            <span>Advanced</span>
          </button>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className={`
              flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md
              hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors
            `}
          >
            <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Loading...' : 'Refresh'}</span>
          </button>
        )}
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={options.showConfidence}
                onChange={(e) => onOptionsChange({ ...options, showConfidence: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show Confidence</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={options.showSunWindows}
                onChange={(e) => onOptionsChange({ ...options, showSunWindows: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show Sun Windows</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={options.showRecommendations}
                onChange={(e) => onOptionsChange({ ...options, showRecommendations: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show Recommendations</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};