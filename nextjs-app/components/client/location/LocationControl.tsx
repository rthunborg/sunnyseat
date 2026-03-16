'use client';

import React from 'react';
import { MAP_DEFAULTS } from '@/lib/constants/mapDefaults';

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
    <div className="location-control bg-surface-primary p-4 rounded-card shadow-card space-y-4">
      <div>
        <label htmlFor="radius-slider" className="block text-body font-semibold mb-2 text-text-primary">
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
          className="w-full h-2 bg-border-default rounded-lg appearance-none cursor-pointer accent-brand-primary"
        />
        <div className="flex justify-between text-caption text-text-muted mt-1">
          <span>{MAP_DEFAULTS.minRadiusKm} km</span>
          <span>{MAP_DEFAULTS.maxRadiusKm} km</span>
        </div>
      </div>

      <button
        onClick={onRequestLocation}
        disabled={isLoadingLocation}
        className="w-full min-h-[var(--spacing-touch-min)] px-4 py-2 bg-brand-primary text-white rounded-button hover:bg-brand-primary-dark disabled:bg-border-default disabled:cursor-not-allowed transition-colors"
      >
        {isLoadingLocation ? 'Getting Location...' : 'Use My Location'}
      </button>
    </div>
  );
};

export default LocationControl;
