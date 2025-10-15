import { useEffect, useState } from 'react';
import { getVenueBySlug } from '../services/api/venueService';
import type { VenueDetails } from '../types';

interface UseVenueDetailsResult {
  data: VenueDetails | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Custom hook for fetching venue details with sun forecast data
 * Implements basic caching and refetching capabilities
 * 
 * @param slug - Venue slug from URL parameter
 * @returns Query result with venue details
 */
export const useVenueDetails = (slug: string): UseVenueDetailsResult => {
  const [data, setData] = useState<VenueDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    if (!slug) {
      setIsLoading(false);
      return;
    }

    const fetchVenue = async () => {
      setIsLoading(true);
      setIsError(false);
      setError(null);

      try {
        const venueData = await getVenueBySlug(slug, true);
        setData(venueData);
      } catch (err) {
        setIsError(true);
        setError(err instanceof Error ? err : new Error('Failed to fetch venue'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchVenue();
  }, [slug, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
  };
};
