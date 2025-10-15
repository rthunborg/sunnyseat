// Geolocation Service - Reusable proximity detection and location utilities

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeolocationService {
  getCurrentPosition(): Promise<GeolocationPosition | null>;
  isNearVenue(venueCoords: Coordinates, threshold?: number): Promise<boolean>;
  requestPermission(): Promise<PermissionState | null>;
  hasPermission(): Promise<boolean>;
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
}

/**
 * Calculates distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Geolocation service for proximity detection and location utilities
 * Provides graceful fallback when geolocation is unavailable or denied
 */
export const geolocationService: GeolocationService = {
  /**
   * Gets the user's current position with error handling
   * @returns GeolocationPosition or null if unavailable/denied
   */
  async getCurrentPosition(): Promise<GeolocationPosition | null> {
    if (!('geolocation' in navigator)) {
      console.warn('Geolocation is not supported by this browser');
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => {
          console.log('Geolocation error:', error.message);
          resolve(null); // Graceful failure - return null instead of throwing
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000, // Cache for 1 minute
        }
      );
    });
  },

  /**
   * Checks if user is near a venue location
   * @param venueCoords - Venue coordinates to check proximity to
   * @param threshold - Distance threshold in meters (default: 100m)
   * @returns true if within threshold, false if beyond, or null if location unavailable
   */
  async isNearVenue(
    venueCoords: Coordinates,
    threshold = 100
  ): Promise<boolean> {
    const position = await this.getCurrentPosition();
    if (!position) return false;

    const distance = calculateDistance(
      position.coords.latitude,
      position.coords.longitude,
      venueCoords.latitude,
      venueCoords.longitude
    );

    return distance <= threshold;
  },

  /**
   * Requests geolocation permission from the user
   * @returns Permission state or null if Permissions API not supported
   */
  async requestPermission(): Promise<PermissionState | null> {
    if (!('permissions' in navigator)) {
      console.warn('Permissions API not supported');
      return null;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state;
    } catch (error) {
      console.warn('Error querying geolocation permission:', error);
      return null;
    }
  },

  /**
   * Checks if geolocation permission has been granted
   * @returns true if granted, false otherwise
   */
  async hasPermission(): Promise<boolean> {
    const state = await this.requestPermission();
    return state === 'granted';
  },

  /**
   * Utility function to calculate distance between two coordinates
   * Exposed for testing and advanced use cases
   */
  calculateDistance,
};
