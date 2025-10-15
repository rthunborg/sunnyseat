import React from 'react';
import type { DaySunForecast } from '../../../types';

export interface NoSunExpectedProps {
  reason: 'Shadow' | 'Cloud' | 'Weather' | 'Unknown';
  nextSunWindow?: DaySunForecast['nextSunWindow'];
  date: Date;
}

/**
 * NoSunExpected displays a helpful message when no sun is expected
 * with clear reasoning and alternative suggestions
 */
export const NoSunExpected: React.FC<NoSunExpectedProps> = ({
  reason,
  nextSunWindow,
  date,
}) => {
  const getReasonBadge = (reasonType: typeof reason) => {
    switch (reasonType) {
      case 'Shadow':
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: '🏢',
          title: 'Building Shadows',
          description: 'Nearby buildings will block sunlight throughout the day.',
        };
      case 'Cloud':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: '☁️',
          title: 'Cloud Cover',
          description: 'Heavy cloud cover is expected all day.',
        };
      case 'Weather':
        return {
          color: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: '🌧️',
          title: 'Poor Weather',
          description: 'Weather conditions are not favorable for sunny patios.',
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: '❓',
          title: 'No Sun Expected',
          description: 'Sun exposure is not expected for this date.',
        };
    }
  };

  const badge = getReasonBadge(reason);
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      {/* Icon and title */}
      <div className="text-center mb-4">
        <div className="text-6xl mb-2">{badge.icon}</div>
        <h3 className="text-xl font-semibold text-gray-900">{badge.title}</h3>
      </div>

      {/* Reason badge */}
      <div
        className={`inline-block px-4 py-2 rounded-lg border ${badge.color} text-sm font-medium mb-4`}
      >
        {badge.description}
      </div>

      {/* Date context */}
      <p className="text-gray-600 mb-4">
        Unfortunately, we don't expect any sunny periods at this patio on{' '}
        <span className="font-medium">{dateStr}</span>.
      </p>

      {/* Next sun window if available */}
      {nextSunWindow && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm font-medium text-green-800 mb-2">
            ☀️ Good news! Sun expected soon:
          </p>
          <p className="text-sm text-green-700">
            {new Date(nextSunWindow.date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}{' '}
            from{' '}
            {new Date(nextSunWindow.window.localStartTime).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}{' '}
            to{' '}
            {new Date(nextSunWindow.window.localEndTime).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}
          </p>
        </div>
      )}

      {/* Helpful suggestions */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Suggestions:</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>Try searching for other venues nearby with different patio orientations</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>Check back tomorrow or later in the week</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>Consider visiting during different times of day</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
