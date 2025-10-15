// MiniTimeline Component
// Story 4.2: Patio Information Cards & Results
// Displays 2-hour sun forecast as a mini bar chart

import React from 'react';
import type { MiniTimelineData } from '../../../types/timeline';
import { getSunStatusColor } from '../../../utils/sunWindowUtils';

export interface MiniTimelineProps {
  patioId: string;
  startTime: Date;
  duration?: number; // minutes (default 120)
  resolution?: number; // minutes per bar (default 10)
  timelineData?: MiniTimelineData;
  isLoading?: boolean;
}

export const MiniTimeline: React.FC<MiniTimelineProps> = ({
  startTime,
  duration = 120,
  resolution = 10,
  timelineData,
  isLoading = false,
}) => {
  const barCount = Math.floor(duration / resolution); // 12 bars for 2 hours

  // Generate time labels (show every 30 minutes)
  const getTimeLabel = (index: number): string | null => {
    const minutesFromStart = index * resolution;
    if (minutesFromStart % 30 === 0) {
      const time = new Date(startTime.getTime() + minutesFromStart * 60000);
      return time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
    return null;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-end gap-1 h-16" role="status" aria-label="Loading timeline">
        {Array.from({ length: barCount }).map((_, index) => (
          <div
            key={index}
            className="flex-1 bg-gray-200 animate-pulse rounded-t"
            style={{ height: '60%' }}
          />
        ))}
      </div>
    );
  }

  // Empty state
  if (!timelineData || !timelineData.slots || timelineData.slots.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-16 text-gray-400 text-sm"
        role="status"
        aria-label="No timeline data available"
      >
        No forecast data available
      </div>
    );
  }

  return (
    <div className="space-y-2" role="region" aria-label="2-hour sun forecast">
      {/* Timeline bars */}
      <div className="flex items-end gap-1 h-16">
        {timelineData.slots.slice(0, barCount).map((slot, index) => {
          const heightPercent = Math.max(10, slot.sunExposure); // Min 10% for visibility
          const colorClass = getSunStatusColor(slot.sunStatus);

          return (
            <div
              key={index}
              className={`flex-1 ${colorClass} rounded-t transition-all hover:opacity-80`}
              style={{ height: `${heightPercent}%` }}
              role="presentation"
              aria-label={`${slot.sunStatus} - ${slot.sunExposure}% sun exposure at ${slot.timestamp.toLocaleTimeString()}`}
              title={`${slot.sunStatus} - ${slot.sunExposure}% at ${slot.timestamp.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}`}
            />
          );
        })}
      </div>

      {/* Time labels */}
      <div className="flex justify-between text-xs text-gray-500">
        {Array.from({ length: barCount }).map((_, index) => {
          const label = getTimeLabel(index);
          return (
            <div key={index} className="flex-1 text-center">
              {label || ''}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Sunny</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-amber-500 rounded"></div>
          <span>Partial</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-400 rounded"></div>
          <span>Shaded</span>
        </div>
      </div>
    </div>
  );
};
