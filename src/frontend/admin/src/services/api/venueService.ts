import type { VenueDetails } from '../../types';

/**
 * API client instance
 * Note: Using fetch API directly since we need this to work independently
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

/**
 * Service for venue-related API calls
 */

/**
 * Fetch venue details by ID with sun forecast data
 */
export const getVenueById = async (
  id: number,
  includeForecasts: boolean = true
): Promise<VenueDetails> => {
  const params = new URLSearchParams();
  if (includeForecasts) {
    params.append('includeForecasts', 'true');
  }

  return await fetchWithAuth(`/api/venues/${id}?${params.toString()}`);
};

/**
 * Fetch venue details by slug with sun forecast data
 * Uses efficient backend slug endpoint (O(1) lookup)
 */
export const getVenueBySlug = async (
  slug: string,
  includeForecasts: boolean = true
): Promise<VenueDetails> => {
  const params = new URLSearchParams();
  if (includeForecasts) {
    params.append('includeForecasts', 'true');
  }

  try {
    // Use new slug endpoint for O(1) lookup
    return await fetchWithAuth(`/api/venues/slug/${slug}?${params.toString()}`);
  } catch (error) {
    // If backend doesn't support slug endpoint yet, fallback to old method
    console.warn('Slug endpoint not available, falling back to ID extraction');
    
    // Extract venue ID from slug if present (handles collision format: "cafe-husaren-123")
    const slugParts = slug.split('-');
    const lastPart = slugParts[slugParts.length - 1];
    const possibleId = parseInt(lastPart, 10);

    // If slug ends with a number, try to fetch by ID
    if (!isNaN(possibleId)) {
      return await getVenueById(possibleId, includeForecasts);
    }

    throw new Error(`Venue with slug "${slug}" not found`);
  }
};

/**
 * Generate a URL-friendly slug from venue name
 * Handles collisions by appending venue ID
 */
export const generateSlug = (venueName: string, venueId?: number): string => {
  const baseSlug = venueName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Append ID to handle collision scenarios
  return venueId ? `${baseSlug}-${venueId}` : baseSlug;
};
