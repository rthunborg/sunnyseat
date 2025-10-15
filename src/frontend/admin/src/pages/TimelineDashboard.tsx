import { useState, useEffect } from 'react';
import { 
  SunIcon, 
  ChartBarIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Navigation } from '../components/navigation/Navigation';
import { TimelineChart } from '../components/timeline/TimelineChart';
import { SunWindowGrid } from '../components/timeline/SunWindowCards';
import { TimelineControls } from '../components/timeline/TimelineControls';
import { useTimeline } from '../hooks/useTimeline';
import { apiService } from '../services/api';
import type { 
  TimelineViewOptions, 
  Venue, 
  Patio,
  SunWindow,
  TimelineQualityAssessment 
} from '../types';

export const TimelineDashboard: React.FC = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedPatio, setSelectedPatio] = useState<Patio | null>(null);
  const [sunWindows, setSunWindows] = useState<SunWindow[]>([]);
  const [qualityAssessment, setQualityAssessment] = useState<TimelineQualityAssessment | null>(null);
  const [isLoadingVenues, setIsLoadingVenues] = useState(true);
  const [isLoadingSunWindows, setIsLoadingSunWindows] = useState(false);
  const [isLoadingQuality, setIsLoadingQuality] = useState(false);

  const { timeline, isLoading, error, loadTimeline, clearTimeline } = useTimeline();

  const [viewOptions, setViewOptions] = useState<TimelineViewOptions>({
    timeRange: 'today',
    resolution: 10,
    showConfidence: true,
    showSunWindows: true,
    showRecommendations: true
  });

  // Load venues on component mount
  useEffect(() => {
    loadVenues();
  }, []);

  // Load timeline when patio selection changes
  useEffect(() => {
    if (selectedPatio) {
      handleLoadTimeline();
      loadSunWindows();
    } else {
      clearTimeline();
      setSunWindows([]);
      setQualityAssessment(null);
    }
  }, [selectedPatio, viewOptions]);

  const loadVenues = async () => {
    try {
      setIsLoadingVenues(true);
      // Assuming venues API exists
      const venuesData = await apiService.get<Venue[]>('/api/venues?includePatios=true');
      setVenues(venuesData);
      
      // Auto-select first venue with patios
      const venueWithPatios = venuesData.find(v => v.patios && v.patios.length > 0);
      if (venueWithPatios) {
        setSelectedVenue(venueWithPatios);
        setSelectedPatio(venueWithPatios.patios[0]);
      }
    } catch (err) {
      console.error('Failed to load venues:', err);
    } finally {
      setIsLoadingVenues(false);
    }
  };

  const handleLoadTimeline = async () => {
    if (!selectedPatio) return;
    
    try {
      await loadTimeline(selectedPatio.id, viewOptions);
      loadQualityAssessment();
    } catch (err) {
      console.error('Failed to load timeline:', err);
    }
  };

  const loadSunWindows = async () => {
    if (!selectedPatio) return;

    try {
      setIsLoadingSunWindows(true);
      
      let startTime: string;
      let endTime: string;
      
      if (viewOptions.timeRange === 'custom' && viewOptions.customStart && viewOptions.customEnd) {
        startTime = new Date(viewOptions.customStart).toISOString();
        endTime = new Date(viewOptions.customEnd).toISOString();
      } else {
        // Use default times based on range
        const now = new Date();
        startTime = now.toISOString();
        
        const end = new Date();
        switch (viewOptions.timeRange) {
          case 'today':
            end.setHours(23, 59, 59, 999);
            break;
          case 'tomorrow':
            end.setDate(end.getDate() + 1);
            end.setHours(23, 59, 59, 999);
            break;
          case 'next12h':
            end.setHours(end.getHours() + 12);
            break;
          default:
            end.setHours(end.getHours() + 12);
        }
        endTime = end.toISOString();
      }

      const windows = await apiService.getBestSunWindows(selectedPatio.id, {
        start: startTime,
        end: endTime,
        maxWindows: 5
      });
      
      setSunWindows(windows);
    } catch (err) {
      console.error('Failed to load sun windows:', err);
    } finally {
      setIsLoadingSunWindows(false);
    }
  };

  const loadQualityAssessment = async () => {
    if (!selectedPatio || !timeline) return;

    try {
      setIsLoadingQuality(true);
      const quality = await apiService.validateTimelineQuality(
        selectedPatio.id,
        timeline.startTime,
        timeline.endTime
      );
      setQualityAssessment(quality);
    } catch (err) {
      console.error('Failed to load quality assessment:', err);
    } finally {
      setIsLoadingQuality(false);
    }
  };

  const handleVenueChange = (venue: Venue) => {
    setSelectedVenue(venue);
    setSelectedPatio(venue.patios && venue.patios.length > 0 ? venue.patios[0] : null);
  };

  const handlePatioChange = (patio: Patio) => {
    setSelectedPatio(patio);
  };

  const handleRefresh = () => {
    handleLoadTimeline();
    loadSunWindows();
  };

  if (isLoadingVenues) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Loading venues...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <SunIcon className="h-8 w-8 text-yellow-500 mr-3" />
            Sun Timeline Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Analyze sun exposure patterns and find the best times to visit patios
          </p>
        </div>

        {/* Venue and Patio Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Venue
            </label>
            <select
              value={selectedVenue?.id || ''}
              onChange={(e) => {
                const venue = venues.find(v => v.id === Number(e.target.value));
                if (venue) handleVenueChange(venue);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a venue...</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name} ({venue.patios?.length || 0} patios)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Patio
            </label>
            <select
              value={selectedPatio?.id || ''}
              onChange={(e) => {
                const patio = selectedVenue?.patios?.find(p => p.id === Number(e.target.value));
                if (patio) handlePatioChange(patio);
              }}
              disabled={!selectedVenue || !selectedVenue.patios || selectedVenue.patios.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select a patio...</option>
              {selectedVenue?.patios?.map((patio) => (
                <option key={patio.id} value={patio.id}>
                  Patio {patio.id} ({patio.heightSource})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedPatio && (
          <>
            {/* Timeline Controls */}
            <TimelineControls
              options={viewOptions}
              onOptionsChange={setViewOptions}
              onRefresh={handleRefresh}
              isLoading={isLoading}
              className="mb-6"
            />

            {/* Error Display */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error Loading Timeline</h3>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Timeline Chart - Takes 2/3 width */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <ChartBarIcon className="h-5 w-5 mr-2" />
                    Sun Exposure Timeline
                  </h2>
                  
                  {timeline ? (
                    <TimelineChart
                      timeline={timeline}
                      showConfidence={viewOptions.showConfidence}
                      showSunWindows={viewOptions.showSunWindows}
                      height={400}
                    />
                  ) : isLoading ? (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-gray-500">Loading timeline...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-96 text-gray-500">
                      <div className="text-center">
                        <SunIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p>Select options and click Refresh to load timeline</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                {/* Quality Assessment */}
                {qualityAssessment && (
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <InformationCircleIcon className="h-5 w-5 mr-2" />
                      Data Quality
                      {isLoadingQuality && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 ml-2"></div>
                      )}
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Quality Score</span>
                        <span className={`font-semibold ${
                          qualityAssessment.qualityScore >= 80 ? 'text-green-600' :
                          qualityAssessment.qualityScore >= 60 ? 'text-blue-600' :
                          qualityAssessment.qualityScore >= 40 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {qualityAssessment.qualityScore.toFixed(0)}/100
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Completeness</span>
                        <span className="font-semibold text-gray-900">
                          {qualityAssessment.completenessPercent.toFixed(0)}%
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Standards Met</span>
                        <span className={`font-semibold ${
                          qualityAssessment.meetsQualityStandards ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {qualityAssessment.meetsQualityStandards ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline Stats */}
                {timeline && (
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <ClockIcon className="h-5 w-5 mr-2" />
                      Timeline Stats
                    </h3>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Data Points:</span>
                        <span className="font-medium">{timeline.pointCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Sun Windows:</span>
                        <span className="font-medium">{timeline.sunWindows?.length || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Avg Confidence:</span>
                        <span className="font-medium">{timeline.averageConfidence.toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Precomputed:</span>
                        <span className="font-medium">{timeline.precomputedPointsCount}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sun Windows Section */}
            {viewOptions.showSunWindows && (
              <div className="mt-8">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <SunIcon className="h-5 w-5 mr-2" />
                    Best Sun Windows
                    {isLoadingSunWindows && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 ml-2"></div>
                    )}
                  </h2>

                  <SunWindowGrid
                    windows={sunWindows}
                    venueNames={{ [selectedPatio.id]: selectedVenue?.name || 'Unknown Venue' }}
                    maxItems={3}
                    className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* No Selection State */}
        {!selectedPatio && !isLoadingVenues && (
          <div className="text-center py-12">
            <SunIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Patio Selected</h3>
            <p className="text-gray-500">
              Choose a venue and patio from the dropdowns above to start analyzing sun exposure patterns.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};