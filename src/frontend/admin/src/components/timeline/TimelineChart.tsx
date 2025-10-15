import React, { useMemo } from 'react';
import type { SunExposureTimeline } from '../../types';

interface TimelineChartProps {
  timeline: SunExposureTimeline;
  showConfidence?: boolean;
  showSunWindows?: boolean;
  height?: number;
  className?: string;
}

export const TimelineChart: React.FC<TimelineChartProps> = ({
  timeline,
  showConfidence = true,
  showSunWindows = true,
  height = 400,
  className = ''
}) => {
  const chartData = useMemo(() => {
    if (!timeline.points || timeline.points.length === 0) {
      return null;
    }

    const points = timeline.points;
    const maxExposure = Math.max(...points.map(p => p.sunExposurePercent));
    const chartHeight = height - 80; // Leave space for labels
    const chartWidth = 800; // Fixed width, will be responsive
    
    // Create SVG path for sun exposure
    const sunExposurePath = points.map((point, index) => {
      const x = (index / (points.length - 1)) * chartWidth;
      const y = chartHeight - (point.sunExposurePercent / 100) * chartHeight;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    // Create SVG path for confidence if enabled
    const confidencePath = showConfidence ? points.map((point, index) => {
      const x = (index / (points.length - 1)) * chartWidth;
      const y = chartHeight - (point.confidence / 100) * chartHeight;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ') : '';

    return {
      points,
      sunExposurePath,
      confidencePath,
      chartWidth,
      chartHeight,
      maxExposure
    };
  }, [timeline.points, showConfidence, height]);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!chartData) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-gray-500">No timeline data available</p>
      </div>
    );
  }

  const { points, sunExposurePath, confidencePath, chartWidth, chartHeight } = chartData;

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-semibold mb-4">
          Sun Exposure Timeline - Patio {timeline.patioId}
        </h3>
        
        {/* SVG Chart */}
        <div className="w-full overflow-x-auto">
          <svg
            width={chartWidth}
            height={height - 60}
            viewBox={`0 0 ${chartWidth} ${height - 60}`}
            className="w-full"
            style={{ minWidth: '600px' }}
          >
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(percentage => (
              <g key={percentage}>
                <line
                  x1="0"
                  y1={chartHeight - (percentage / 100) * chartHeight}
                  x2={chartWidth}
                  y2={chartHeight - (percentage / 100) * chartHeight}
                  stroke="#f3f4f6"
                  strokeWidth="1"
                />
                <text
                  x="-5"
                  y={chartHeight - (percentage / 100) * chartHeight + 4}
                  fontSize="12"
                  fill="#6b7280"
                  textAnchor="end"
                >
                  {percentage}%
                </text>
              </g>
            ))}

            {/* Sun Exposure Line */}
            <path
              d={sunExposurePath}
              stroke="#f59e0b"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Sun Exposure Area Fill */}
            <path
              d={`${sunExposurePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`}
              fill="rgba(245, 158, 11, 0.2)"
            />

            {/* Confidence Line */}
            {showConfidence && confidencePath && (
              <path
                d={confidencePath}
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
                strokeDasharray="5,5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Points */}
            {points.map((point, index) => {
              const x = (index / (points.length - 1)) * chartWidth;
              const y = chartHeight - (point.sunExposurePercent / 100) * chartHeight;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#f59e0b"
                  stroke="white"
                  strokeWidth="2"
                  className="hover:r-6 cursor-pointer"
                >
                  <title>{`${formatTime(point.localTime)}: ${point.sunExposurePercent.toFixed(1)}% (${point.state})`}</title>
                </circle>
              );
            })}

            {/* Time Labels */}
            {points.filter((_, i) => i % Math.ceil(points.length / 8) === 0).map((point, index) => {
              const originalIndex = points.findIndex(p => p === point);
              const x = (originalIndex / (points.length - 1)) * chartWidth;
              return (
                <text
                  key={index}
                  x={x}
                  y={chartHeight + 20}
                  fontSize="10"
                  fill="#6b7280"
                  textAnchor="middle"
                  transform={`rotate(-45 ${x} ${chartHeight + 20})`}
                >
                  {formatTime(point.localTime)}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center mt-4 space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-1 bg-amber-500 rounded"></div>
            <span className="text-sm text-gray-600">Sun Exposure</span>
          </div>
          {showConfidence && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-blue-500 rounded" style={{ borderStyle: 'dashed', borderWidth: '1px 0' }}></div>
              <span className="text-sm text-gray-600">Confidence</span>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-center">
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-lg font-semibold text-gray-900">
              {Math.max(...points.map(p => p.sunExposurePercent)).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-600">Max Exposure</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-lg font-semibold text-gray-900">
              {(points.reduce((sum, p) => sum + p.sunExposurePercent, 0) / points.length).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-600">Avg Exposure</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-lg font-semibold text-gray-900">
              {timeline.sunWindows?.length || 0}
            </div>
            <div className="text-xs text-gray-600">Sun Windows</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-lg font-semibold text-gray-900">
              {timeline.averageConfidence.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-600">Avg Confidence</div>
          </div>
        </div>
      </div>

      {/* Sun Windows Overlay */}
      {showSunWindows && timeline.sunWindows && timeline.sunWindows.length > 0 && (
        <div className="absolute top-16 left-4 right-4">
          <div className="flex flex-wrap gap-1">
            {timeline.sunWindows.slice(0, 3).map((window, index) => (
              <div
                key={index}
                className={`px-2 py-1 rounded text-xs font-medium ${getQualityBgClass(window.quality)}`}
                title={`${window.description} - ${window.recommendationReason}`}
              >
                {window.description}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function for quality background classes
function getQualityBgClass(quality: string): string {
  const classes = {
    'Excellent': 'bg-green-100 text-green-800 border border-green-200',
    'Good': 'bg-blue-100 text-blue-800 border border-blue-200',
    'Fair': 'bg-amber-100 text-amber-800 border border-amber-200',
    'Poor': 'bg-red-100 text-red-800 border border-red-200'
  };
  
  return classes[quality as keyof typeof classes] || 'bg-gray-100 text-gray-800 border border-gray-200';
}