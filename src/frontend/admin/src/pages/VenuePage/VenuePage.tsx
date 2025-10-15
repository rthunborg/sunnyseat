import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useVenueDetails } from '../../hooks/useVenueDetails';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useShareLink } from '../../hooks/useShareLink';
import { useFeedback } from '../../hooks/useFeedback';
import { useFeedbackPrompt } from '../../hooks/useFeedbackPrompt';
import { SunWindowsTable } from '../../components/patio/SunWindowsTable';
import { NoSunExpected } from '../../components/patio/NoSunExpected';
import { FeedbackButton } from '../../components/patio/FeedbackButton';
import { FeedbackConfirmation } from '../../components/patio/FeedbackConfirmation';
import { generateVenueMeta, updateMetaTags } from '../../utils/seo';

/**
 * VenuePage displays detailed venue information with sun forecasts
 * for today and tomorrow, supporting deep links and auto-refresh.
 */
export const VenuePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Parse selected date from query parameter
  const selectedDateParam = searchParams.get('date');
  const selectedDate = selectedDateParam ? new Date(selectedDateParam) : new Date();

  // Fetch venue details with sun forecast
  const { data: venue, isLoading, isError, error, refetch } = useVenueDetails(slug || '');

  // Setup auto-refresh (5 minutes)
  const { lastRefresh } = useAutoRefresh({
    intervalMs: 300000, // 5 minutes
    enabled: !!venue && !isLoading,
    onRefresh: () => refetch(),
  });

  // Setup share link functionality
  const { share } = useShareLink(venue, selectedDate);

  // Track page open time for feedback prompt
  const [pageOpenedAt] = useState(() => new Date());

  // Get first patio for feedback (assuming single patio for MVP)
  const firstPatio = venue?.patios?.[0];
  const patioId = firstPatio?.id;
  const venueId = venue?.id;

  // Get current sun window from today's forecast
  const currentSunWindow = venue?.sunForecast?.today?.sunWindows?.[0];

  // Feedback submission logic (must be before prompt to get hasSubmittedToday)
  const {
    submitFeedbackAction,
    isSubmitting: isFeedbackSubmitting,
    hasSubmittedToday,
  } = useFeedback({
    venueId: venueId || 0,
    patioId: patioId || 0,
    predictedSunExposure: currentSunWindow?.averageExposurePercent || 0,
    predictedConfidence: currentSunWindow?.confidence || 0,
  });

  // Feedback prompt logic (uses hasSubmittedToday from useFeedback)
  const { showPrompt: shouldShowFeedbackPrompt } = useFeedbackPrompt({
    venueLocation: venue?.location || { latitude: 0, longitude: 0 },
    currentSunWindow,
    pageOpenedAt,
    predictedConfidence: currentSunWindow?.confidence || 0,
    hasSubmittedToday,
  });

  const [showFeedbackConfirmation, setShowFeedbackConfirmation] = useState(false);

  // Handle feedback submission
  const handleFeedbackSubmit = async (wasActuallySunny: boolean) => {
    await submitFeedbackAction(wasActuallySunny);
    setShowFeedbackConfirmation(true);
  };

  // Handle feedback confirmation close
  const handleConfirmationClose = () => {
    setShowFeedbackConfirmation(false);
  };

  // Determine if feedback prompt should be shown
  const showFeedbackPrompt = 
    shouldShowFeedbackPrompt && 
    !hasSubmittedToday && 
    !!venueId && 
    !!patioId && 
    !!currentSunWindow;


  // Update SEO meta tags when venue data is loaded
  useEffect(() => {
    if (venue) {
      const meta = generateVenueMeta({
        name: venue.name,
        slug: venue.slug,
        address: venue.address,
        location: venue.location,
      });
      updateMetaTags(meta);
    }
  }, [venue]);

  // Handle invalid venue slug
  useEffect(() => {
    if (isError && error) {
      // Navigate to 404 page after a brief delay
      const timer = setTimeout(() => {
        navigate('/404', { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isError, error, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Skeleton loader */}
          <div className="animate-pulse" data-testid="venue-skeleton">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !venue) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Venue Not Found</h1>
          <p className="text-gray-600 mb-4">
            The venue you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const hasSunToday = venue.sunForecast?.today?.sunWindows?.length > 0;
  const hasSunTomorrow = venue.sunForecast?.tomorrow?.sunWindows?.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Search
          </button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{venue.name}</h1>
              <p className="text-gray-600 mt-1">{venue.address}</p>
            </div>
            
            <button
              onClick={share}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              title="Share this venue"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>

          {/* Last refresh indicator */}
          <div className="mt-4 text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Map preview placeholder - to be implemented */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="h-48 bg-gray-100 rounded flex items-center justify-center">
            <p className="text-gray-500">Map preview (Location: {venue.location.latitude.toFixed(4)}, {venue.location.longitude.toFixed(4)})</p>
          </div>
        </div>

        {/* Today's sun windows */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Today</h2>
          {hasSunToday ? (
            <SunWindowsTable
              windows={venue.sunForecast.today.sunWindows}
              date={new Date(venue.sunForecast.today.date)}
              noSunReason={venue.sunForecast.today.noSunReason}
            />
          ) : (
            <NoSunExpected
              reason={venue.sunForecast?.today?.noSunReason || 'Unknown'}
              nextSunWindow={venue.sunForecast?.today?.nextSunWindow}
              date={new Date(venue.sunForecast?.today?.date || new Date())}
            />
          )}
        </div>

        {/* Tomorrow's sun windows */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Tomorrow</h2>
          {hasSunTomorrow ? (
            <SunWindowsTable
              windows={venue.sunForecast.tomorrow.sunWindows}
              date={new Date(venue.sunForecast.tomorrow.date)}
              noSunReason={venue.sunForecast.tomorrow.noSunReason}
            />
          ) : (
            <NoSunExpected
              reason={venue.sunForecast?.tomorrow?.noSunReason || 'Unknown'}
              nextSunWindow={venue.sunForecast?.tomorrow?.nextSunWindow}
              date={new Date(venue.sunForecast?.tomorrow?.date || new Date())}
            />
          )}
        </div>
      </div>

      {/* Feedback Prompt */}
      {showFeedbackPrompt && venueId && patioId && (
        <FeedbackButton
          venueId={venueId}
          patioId={patioId}
          predictedSunExposure={currentSunWindow?.averageExposurePercent || 0}
          predictedConfidence={currentSunWindow?.confidence || 0}
          onSubmit={handleFeedbackSubmit}
          showPrompt={true}
          isSubmitting={isFeedbackSubmitting}
        />
      )}

      {/* Feedback Confirmation */}
      <FeedbackConfirmation
        show={showFeedbackConfirmation}
        onClose={handleConfirmationClose}
        undoTimeoutMs={5000}
      />
    </div>
  );
};
