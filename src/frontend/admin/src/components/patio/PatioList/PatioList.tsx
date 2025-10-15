// PatioList Component
// Story 4.2: Patio Information Cards & Results
// Displays list of patio cards with sorting, filtering, and empty states

import React, { useState, useEffect } from 'react';
import type { PatioData } from '../../../types/timeline';
import { PatioCard } from '../PatioCard';
import { EmptyState } from '../EmptyState';
import {
  sortPatiosByPriority,
  hasEnoughSunnyPatios,
} from '../../../utils/sunWindowUtils';

export interface PatioListProps {
  patios: PatioData[];
  onPatioSelect: (patioId: string) => void;
  onAdjustLocation?: () => void;
  isLoading?: boolean;
  maxGeofenceKm?: number;
  itemsPerPage?: number;
}

export const PatioList: React.FC<PatioListProps> = ({
  patios,
  onPatioSelect,
  onAdjustLocation,
  isLoading = false,
  maxGeofenceKm = 10,
  itemsPerPage = 20,
}) => {
  const [displayedPatios, setDisplayedPatios] = useState<PatioData[]>([]);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    // Filter out patios beyond geofence and sort
    const filteredPatios = patios.filter(
      (p) => p.distanceMeters <= maxGeofenceKm * 1000
    );
    const sortedPatios = sortPatiosByPriority(filteredPatios);

    // Initial display
    setDisplayedPatios(sortedPatios.slice(0, itemsPerPage));
    setHasMore(sortedPatios.length > itemsPerPage);
  }, [patios, maxGeofenceKm, itemsPerPage]);

  const loadMore = () => {
    const filteredPatios = patios.filter(
      (p) => p.distanceMeters <= maxGeofenceKm * 1000
    );
    const sortedPatios = sortPatiosByPriority(filteredPatios);
    const nextBatch = sortedPatios.slice(0, displayedPatios.length + itemsPerPage);

    setDisplayedPatios(nextBatch);
    setHasMore(nextBatch.length < sortedPatios.length);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading patios">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl shadow-md p-4 space-y-4 animate-pulse"
          >
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  // No results
  if (patios.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No patios found in your area.</p>
        {onAdjustLocation && (
          <button
            onClick={onAdjustLocation}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Adjust Search Location
          </button>
        )}
      </div>
    );
  }

  // Count patios beyond geofence
  const beyondGeofenceCount = patios.filter(
    (p) => p.distanceMeters > maxGeofenceKm * 1000
  ).length;

  // Check if we should show empty state
  const showEmptyState = !hasEnoughSunnyPatios(displayedPatios);

  return (
    <div className="space-y-4">
      {/* Show empty state if fewer than 3 sunny patios */}
      {showEmptyState && (
        <EmptyState patios={patios} onAdjustLocation={onAdjustLocation} />
      )}

      {/* Results header */}
      {displayedPatios.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Showing {displayedPatios.length} of {patios.length} patios
          </div>
          {beyondGeofenceCount > 0 && (
            <div className="text-amber-600">
              {beyondGeofenceCount} venue{beyondGeofenceCount !== 1 ? 's' : ''} beyond{' '}
              {maxGeofenceKm}km radius
            </div>
          )}
        </div>
      )}

      {/* Patio cards */}
      <div className="space-y-4" role="list" aria-label="Patio results">
        {displayedPatios.map((patio) => (
          <div key={patio.id} role="listitem">
            <PatioCard patio={patio} onClick={onPatioSelect} showTimeline={true} />
          </div>
        ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={loadMore}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Load More Patios
          </button>
        </div>
      )}

      {/* Geofence message at bottom */}
      {beyondGeofenceCount > 0 && displayedPatios.length > 0 && (
        <div className="text-center text-sm text-gray-500 pt-4">
          <p>
            {beyondGeofenceCount} additional venue{beyondGeofenceCount !== 1 ? 's are' : ' is'}{' '}
            beyond the {maxGeofenceKm}km search radius
          </p>
        </div>
      )}
    </div>
  );
};
