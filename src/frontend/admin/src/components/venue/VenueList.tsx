import { useState } from 'react';
import type { Venue } from '../../types';

interface VenueListProps {
  venues: Venue[];
  selectedVenue?: Venue | null;
  onVenueSelect: (venue: Venue) => void;
  showDetails?: boolean;
  className?: string;
}

export function VenueList({
  venues,
  selectedVenue,
  onVenueSelect,
  showDetails = false,
  className = '',
}: VenueListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMapped, setFilterMapped] = useState<'all' | 'mapped' | 'unmapped'>('all');

  const filteredVenues = venues.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         venue.address.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterMapped === 'all' ||
                         (filterMapped === 'mapped' && venue.isMapped) ||
                         (filterMapped === 'unmapped' && !venue.isMapped);

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: venues.length,
    mapped: venues.filter(v => v.isMapped).length,
    unmapped: venues.filter(v => !v.isMapped).length,
  };

  return (
    <div className={className}>
      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search venues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setFilterMapped('all')}
            className={`px-3 py-1 rounded-full text-sm ${
              filterMapped === 'all'
                ? 'bg-primary-100 text-primary-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilterMapped('mapped')}
            className={`px-3 py-1 rounded-full text-sm ${
              filterMapped === 'mapped'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Mapped ({stats.mapped})
          </button>
          <button
            onClick={() => setFilterMapped('unmapped')}
            className={`px-3 py-1 rounded-full text-sm ${
              filterMapped === 'unmapped'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Unmapped ({stats.unmapped})
          </button>
        </div>
      </div>

      {/* Venue List */}
      <div className="space-y-2">
        {filteredVenues.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery || filterMapped !== 'all' ? 'No venues match your filters' : 'No venues found'}
          </div>
        ) : (
          filteredVenues.map(venue => (
            <div
              key={venue.id}
              onClick={() => onVenueSelect(venue)}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedVenue?.id === venue.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {venue.name}
                  </h4>
                  <p className="text-sm text-gray-500 truncate">
                    {venue.address}
                  </p>
                  
                  {showDetails && (
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                      <span>
                        Patios: {venue.patios.length}
                      </span>
                      <span>
                        Created: {new Date(venue.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {/* Mapping Status */}
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      venue.isMapped
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {venue.isMapped ? 'Mapped' : 'Unmapped'}
                  </span>

                  {/* Patio Count Badge */}
                  {venue.patios.length > 0 && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {venue.patios.length} patio{venue.patios.length !== 1 ? 's' : ''}
                    </span>
                  )}

                  {/* Review Needed Indicator */}
                  {venue.patios.some(p => p.reviewNeeded) && (
                    <div className="flex items-center" title="Has patios needing review">
                      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More Button (for pagination) */}
      {showDetails && filteredVenues.length > 0 && (
        <div className="mt-6 text-center">
          <button className="btn btn-secondary">
            Load More Venues
          </button>
        </div>
      )}
    </div>
  );
}