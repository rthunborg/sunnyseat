import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AdminMap } from '../components/map/AdminMap';
import { VenueList } from '../components/venue/VenueList';
import { PatioMetadataForm } from '../components/patio/PatioMetadataForm';
import { FileUpload } from '../components/import/FileUpload';
import { Navigation } from '../components/navigation/Navigation';
import type { Venue, Patio, PatioMetadataForm as PatioMetadata } from '../types';
import { adminApi } from '../services/adminApi';

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedPatio, setSelectedPatio] = useState<Patio | null>(null);
  const [patios, setPatios] = useState<Patio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'map' | 'venues' | 'import'>('map');
  const [showMetadataForm, setShowMetadataForm] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const venuesResponse = await adminApi.getVenues({ limit: 100 });
      
      // Handle both array response and paginated response
      const venuesData = Array.isArray(venuesResponse) ? venuesResponse : (venuesResponse.data || []);
      setVenues(venuesData);
      
      // Load all patios for map display
      const allPatios = venuesData.flatMap(venue => venue.patios || []);
      setPatios(allPatios);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      // Set empty arrays on error so UI doesn't break
      setVenues([]);
      setPatios([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVenueSelect = async (venue: Venue) => {
    setSelectedVenue(venue);
    setSelectedPatio(null);
    
    try {
      const fullVenue = await adminApi.getVenue(venue.id);
      setPatios(fullVenue.patios);
    } catch (error) {
      console.error('Failed to load venue patios:', error);
    }
  };

  const handlePatioSelect = (patio: Patio | null) => {
    setSelectedPatio(patio);
  };

  const handlePolygonCreate = async (polygon: GeoJSON.Polygon) => {
    if (!selectedVenue) {
      alert('Please select a venue first');
      return;
    }

    setShowMetadataForm(true);
    // Store the polygon temporarily for when metadata is submitted
    (window as any).__tempPolygon = polygon;
  };

  const handleMetadataSubmit = async (metadata: PatioMetadata) => {
    const polygon = (window as any).__tempPolygon;
    if (!polygon || !selectedVenue) return;

    try {
      const newPatio = await adminApi.createPatio(selectedVenue.id, polygon, metadata);
      setPatios(prev => [...prev, newPatio]);
      setSelectedPatio(newPatio);
      setShowMetadataForm(false);
      delete (window as any).__tempPolygon;
    } catch (error) {
      console.error('Failed to create patio:', error);
      alert('Failed to create patio. Please try again.');
    }
  };

  const handlePolygonUpdate = async (patioId: number, polygon: GeoJSON.Polygon) => {
    try {
      const updatedPatio = await adminApi.updatePatioPolygon(patioId, polygon);
      setPatios(prev => prev.map(p => p.id === patioId ? updatedPatio : p));
      setSelectedPatio(updatedPatio);
    } catch (error) {
      console.error('Failed to update polygon:', error);
      alert('Failed to update polygon. Please try again.');
    }
  };

  const handleImportComplete = () => {
    // Reload data after import
    loadInitialData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">SunnySeat Admin</h1>
              <div className="hidden sm:flex space-x-4">
                <button
                  onClick={() => setActiveTab('map')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'map'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Map Editor
                </button>
                <button
                  onClick={() => setActiveTab('venues')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'venues'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Venues
                </button>
                <button
                  onClick={() => setActiveTab('import')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'import'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Import Data
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.username}
              </span>
              <button
                onClick={logout}
                className="btn btn-secondary text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <Navigation />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'map' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <div className="card p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Venues</h3>
                <VenueList
                  venues={venues}
                  selectedVenue={selectedVenue}
                  onVenueSelect={handleVenueSelect}
                  className="max-h-64 overflow-y-auto"
                />
              </div>

              {selectedPatio && (
                <div className="card p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Patio Details</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Quality:</span>{' '}
                      <span className={`inline-block w-3 h-3 rounded-full ml-1 ${
                        selectedPatio.polygonQuality >= 0.8 ? 'bg-green-500' :
                        selectedPatio.polygonQuality >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></span>
                      {' '}{Math.round(selectedPatio.polygonQuality * 100)}%
                    </div>
                    <div>
                      <span className="font-medium">Height Source:</span>{' '}
                      {selectedPatio.heightSource}
                    </div>
                    <div>
                      <span className="font-medium">Review Needed:</span>{' '}
                      {selectedPatio.reviewNeeded ? 'Yes' : 'No'}
                    </div>
                    {selectedPatio.notes && (
                      <div>
                        <span className="font-medium">Notes:</span>{' '}
                        {selectedPatio.notes}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Map */}
            <div className="lg:col-span-3">
              <div className="card h-full">
                <AdminMap
                  patios={patios}
                  selectedPatio={selectedPatio}
                  onPatioSelect={handlePatioSelect}
                  onPolygonCreate={handlePolygonCreate}
                  onPolygonUpdate={handlePolygonUpdate}
                  className="w-full h-full rounded-lg overflow-hidden"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'venues' && (
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Venue Management</h2>
            <VenueList
              venues={venues}
              selectedVenue={selectedVenue}
              onVenueSelect={handleVenueSelect}
              showDetails={true}
            />
          </div>
        )}

        {activeTab === 'import' && (
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Import Polygon Data</h2>
            <FileUpload onImportComplete={handleImportComplete} />
          </div>
        )}
      </div>

      {/* Metadata Form Modal */}
      {showMetadataForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Set Patio Metadata
            </h3>
            <PatioMetadataForm
              onSubmit={handleMetadataSubmit}
              onCancel={() => {
                setShowMetadataForm(false);
                delete (window as any).__tempPolygon;
              }}
            />
          </div>
        </div>
      )}

      {/* Mobile Tab Navigation */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="grid grid-cols-3">
          <button
            onClick={() => setActiveTab('map')}
            className={`py-3 px-4 text-center ${
              activeTab === 'map' ? 'text-primary-600' : 'text-gray-500'
            }`}
          >
            <div className="text-xs">Map</div>
          </button>
          <button
            onClick={() => setActiveTab('venues')}
            className={`py-3 px-4 text-center ${
              activeTab === 'venues' ? 'text-primary-600' : 'text-gray-500'
            }`}
          >
            <div className="text-xs">Venues</div>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 px-4 text-center ${
              activeTab === 'import' ? 'text-primary-600' : 'text-gray-500'
            }`}
          >
            <div className="text-xs">Import</div>
          </button>
        </div>
      </div>
    </div>
  );
}