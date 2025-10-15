// EmptyState Component
// Story 4.2: Patio Information Cards & Results
// Displays when fewer than 3 patios are sunny with ETA to next sun window

import React from 'react';
import type { PatioData } from '../../../types/timeline';
import { calculateNextSunETA } from '../../../utils/sunWindowUtils';

export interface EmptyStateProps {
  patios: PatioData[];
  onAdjustLocation?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  patios,
  onAdjustLocation,
}) => {
  const eta = calculateNextSunETA(patios);
  const sunnyCount = patios.filter((p) => p.currentSunStatus === 'Sunny').length;

  // Find nearby shaded patios as alternatives
  const shadedPatios = patios
    .filter((p) => p.currentSunStatus === 'Shaded' || p.currentSunStatus === 'Partial')
    .slice(0, 3);

  return (
    <div className="bg-white rounded-2xl shadow-md p-8 text-center space-y-6">
      {/* Icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
          <svg
            className="w-12 h-12 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </div>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-gray-900">
          Limited Sunny Patios Right Now
        </h3>
        <p className="text-gray-600">
          {sunnyCount === 0
            ? 'No patios are currently sunny in your area.'
            : `Only ${sunnyCount} ${sunnyCount === 1 ? 'patio is' : 'patios are'} currently sunny.`}
        </p>
      </div>

      {/* ETA to next sun window */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="text-sm text-blue-900 font-medium mb-1">
          ☀️ Next Sun Window
        </div>
        <div className="text-lg font-semibold text-blue-700">{eta}</div>
      </div>

      {/* Alternative suggestions */}
      {shadedPatios.length > 0 && (
        <div className="text-left space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">
            Nearby Alternatives
          </h4>
          <div className="space-y-2">
            {shadedPatios.map((patio) => (
              <div
                key={patio.id}
                className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-900">{patio.venueName}</div>
                  <div className="text-gray-600 text-xs">
                    {patio.currentSunStatus} • {Math.round(patio.distanceMeters)}m away
                  </div>
                </div>
                {patio.nextSunWindow && (
                  <div className="text-xs text-gray-500">
                    Sun in{' '}
                    {Math.round(
                      (patio.nextSunWindow.startTime.getTime() - Date.now()) / 60000
                    )}
                    min
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {onAdjustLocation && (
        <div className="pt-4">
          <button
            onClick={onAdjustLocation}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Adjust Search Location
          </button>
        </div>
      )}

      {/* Helper text */}
      <p className="text-xs text-gray-500">
        Try adjusting your location or check back later for more sunny options
      </p>
    </div>
  );
};
