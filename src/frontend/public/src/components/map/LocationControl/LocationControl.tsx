// components/map/LocationControl/LocationControl.tsx
import React from 'react';
import { MAP_DEFAULTS } from '../../../constants/mapDefaults';

interface LocationControlProps {
  radius: number;
  onRadiusChange: (radius: number) => void;
  isLoadingLocation: boolean;
  onRequestLocation: () => void;
}

const LocationControl: React.FC<LocationControlProps> = ({
  radius,
  onRadiusChange,
  isLoadingLocation,
  onRequestLocation,
}) => {
  return (
    <div className="location-control bg-white p-4 rounded-lg shadow-md space-y-4">
      <div>
        <label htmlFor="radius-slider" className="block text-body font-semibold mb-2">
          Search Radius: {radius.toFixed(1)} km
        </label>
        <input
          id="radius-slider"
          type="range"
          min={MAP_DEFAULTS.minRadiusKm}
          max={MAP_DEFAULTS.maxRadiusKm}
          step={0.1}
          value={radius}
          onChange={(e) => onRadiusChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between text-caption text-gray-500 mt-1">
          <span>{MAP_DEFAULTS.minRadiusKm} km</span>
          <span>{MAP_DEFAULTS.maxRadiusKm} km</span>
        </div>
      </div>

      <button
        onClick={onRequestLocation}
        disabled={isLoadingLocation}
        className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isLoadingLocation ? 'Getting Location...' : 'Use My Location'}
      </button>
    </div>
  );
};

export default LocationControl;
