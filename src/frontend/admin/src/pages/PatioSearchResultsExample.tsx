// Example Usage: Patio Search Results Page
// Story 4.2: Patio Information Cards & Results
// This file demonstrates how to use the patio card components together

import React, { useState } from 'react';
import { PatioList } from '../components/patio/PatioList';
import type { PatioData } from '../types/timeline';

/**
 * Example page demonstrating the patio search results interface
 * This would typically be integrated with a map view and search functionality
 */
export const PatioSearchResultsExample: React.FC = () => {
  const [selectedPatioId, setSelectedPatioId] = useState<string | null>(null);

  // Example mock data - in production this would come from API
  const mockPatios: PatioData[] = [
    {
      id: '1',
      venueId: 101,
      venueName: 'Sunny Terrace Cafe',
      address: '123 Main Street, Stockholm',
      coordinates: [18.0686, 59.3293],
      distanceMeters: 450,
      currentSunStatus: 'Sunny',
      currentSunExposure: 85,
      confidence: 78,
      isWithinGeofence: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      miniTimeline: {
        patioId: '1',
        slots: Array.from({ length: 12 }, (_, i) => ({
          timestamp: new Date(Date.now() + i * 10 * 60000),
          sunStatus: i < 8 ? 'Sunny' : 'Partial',
          sunExposure: i < 8 ? 80 : 50,
          confidence: 75,
        })),
        generatedAt: new Date(),
      },
      nextSunWindow: {
        startTime: new Date(Date.now() + 30 * 60000),
        duration: 90,
      },
    },
    {
      id: '2',
      venueId: 102,
      venueName: 'Garden Bistro',
      address: '456 Park Avenue, Stockholm',
      coordinates: [18.0706, 59.3313],
      distanceMeters: 650,
      currentSunStatus: 'Sunny',
      currentSunExposure: 90,
      confidence: 82,
      isWithinGeofence: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      miniTimeline: {
        patioId: '2',
        slots: Array.from({ length: 12 }, (_, i) => ({
          timestamp: new Date(Date.now() + i * 10 * 60000),
          sunStatus: 'Sunny',
          sunExposure: 90,
          confidence: 80,
        })),
        generatedAt: new Date(),
      },
    },
    {
      id: '3',
      venueId: 103,
      venueName: 'Riverside Lounge',
      address: '789 River Road, Stockholm',
      coordinates: [18.0726, 59.3333],
      distanceMeters: 850,
      currentSunStatus: 'Partial',
      currentSunExposure: 55,
      confidence: 65,
      isWithinGeofence: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      miniTimeline: {
        patioId: '3',
        slots: Array.from({ length: 12 }, (_, i) => ({
          timestamp: new Date(Date.now() + i * 10 * 60000),
          sunStatus: i % 3 === 0 ? 'Sunny' : 'Partial',
          sunExposure: i % 3 === 0 ? 70 : 50,
          confidence: 60,
        })),
        generatedAt: new Date(),
      },
      nextSunWindow: {
        startTime: new Date(Date.now() + 45 * 60000),
        duration: 60,
      },
    },
  ];

  const handlePatioSelect = (patioId: string) => {
    setSelectedPatioId(patioId);
    console.log('Selected patio:', patioId);
    // In production, this might:
    // - Highlight the patio on a map
    // - Open a detail view
    // - Navigate to a detail page
  };

  const handleAdjustLocation = () => {
    console.log('Adjust location clicked');
    // In production, this might:
    // - Open location picker
    // - Trigger map interaction
    // - Update search parameters
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sunny Patios Near You
          </h1>
          <p className="text-gray-600">
            Showing patios with current sun status and 2-hour forecast
          </p>
        </div>

        {/* Search Results */}
        <PatioList
          patios={mockPatios}
          onPatioSelect={handlePatioSelect}
          onAdjustLocation={handleAdjustLocation}
          isLoading={false}
          maxGeofenceKm={10}
          itemsPerPage={20}
        />

        {/* Selected patio indicator (optional) */}
        {selectedPatioId && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            Selected: {mockPatios.find((p) => p.id === selectedPatioId)?.venueName}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Usage Notes:
 * 
 * 1. Import this component in your routing setup or main app
 * 2. The PatioList component handles:
 *    - Sorting (sunny patios first, then by distance)
 *    - Geofence filtering (>10km excluded by default)
 *    - Empty state when <3 sunny patios
 *    - Pagination/load more
 *    - Loading states
 * 
 * 3. Each PatioCard shows:
 *    - Venue name and address
 *    - Distance from user
 *    - Current sun status with color coding
 *    - Confidence badge with tooltip
 *    - Mini timeline (2-hour forecast)
 *    - Geofence warning if applicable
 * 
 * 4. Integration with API:
 *    - Replace mockPatios with data from /api/patios endpoint
 *    - Use useMiniTimeline hook if timeline data needs separate fetch
 *    - Implement error handling and retry logic
 * 
 * 5. Integration with Map:
 *    - Pass selectedPatioId to map component for highlighting
 *    - Listen to map click events to update selectedPatioId
 *    - Sync zoom/pan between map and list
 */
