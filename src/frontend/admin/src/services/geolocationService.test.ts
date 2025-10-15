// Geolocation Service Tests

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { geolocationService } from './geolocationService';

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

// Mock permissions API
const mockPermissions = {
  query: vi.fn(),
};

describe('geolocationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup geolocation mock
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });

    // Setup permissions mock
    Object.defineProperty(global.navigator, 'permissions', {
      value: mockPermissions,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCurrentPosition', () => {
    it('should return position when geolocation succeeds', async () => {
      const mockPosition: GeolocationPosition = {
        coords: {
          latitude: 57.7,
          longitude: 11.9,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const result = await geolocationService.getCurrentPosition();

      expect(result).toEqual(mockPosition);
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000,
        })
      );
    });

    it('should return null when user denies permission', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error({
          code: 1,
          message: 'User denied geolocation',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError);
      });

      const result = await geolocationService.getCurrentPosition();

      expect(result).toBeNull();
    });

    it('should return null when geolocation times out', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error({
          code: 3,
          message: 'Timeout',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError);
      });

      const result = await geolocationService.getCurrentPosition();

      expect(result).toBeNull();
    });

    it('should return null when geolocation is not supported', async () => {
      // Delete the geolocation property to simulate unsupported browsers
      const originalGeolocation = global.navigator.geolocation;
      
      // @ts-expect-error - Intentionally deleting to test unsupported scenario
      delete global.navigator.geolocation;

      const result = await geolocationService.getCurrentPosition();

      expect(result).toBeNull();
      
      // Restore for other tests
      Object.defineProperty(global.navigator, 'geolocation', {
        value: originalGeolocation,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('isNearVenue', () => {
    it('should return true when user is within threshold (100m default)', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: 57.7001, // Very close to venue
            longitude: 11.9001,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
      });

      const result = await geolocationService.isNearVenue({
        latitude: 57.7,
        longitude: 11.9,
      });

      expect(result).toBe(true);
    });

    it('should return false when user is beyond threshold', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: 57.8, // Far from venue (~11km away)
            longitude: 12.0,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
      });

      const result = await geolocationService.isNearVenue({
        latitude: 57.7,
        longitude: 11.9,
      });

      expect(result).toBe(false);
    });

    it('should return false when location is unavailable', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error({
          code: 1,
          message: 'Permission denied',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError);
      });

      const result = await geolocationService.isNearVenue({
        latitude: 57.7,
        longitude: 11.9,
      });

      expect(result).toBe(false);
    });

    it('should respect custom threshold', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: 57.7005, // ~55m away
            longitude: 11.9005,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
      });

      // Should be false with 50m threshold
      const result1 = await geolocationService.isNearVenue(
        { latitude: 57.7, longitude: 11.9 },
        50
      );
      expect(result1).toBe(false);

      // Should be true with 100m threshold
      const result2 = await geolocationService.isNearVenue(
        { latitude: 57.7, longitude: 11.9 },
        100
      );
      expect(result2).toBe(true);
    });
  });

  describe('requestPermission', () => {
    it('should return permission state when API is available', async () => {
      mockPermissions.query.mockResolvedValue({ state: 'granted' });

      const result = await geolocationService.requestPermission();

      expect(result).toBe('granted');
      expect(mockPermissions.query).toHaveBeenCalledWith({ name: 'geolocation' });
    });

    it('should return null when Permissions API is not supported', async () => {
      Object.defineProperty(global.navigator, 'permissions', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = await geolocationService.requestPermission();

      expect(result).toBeNull();
    });

    it('should return null when query fails', async () => {
      mockPermissions.query.mockRejectedValue(new Error('Query failed'));

      const result = await geolocationService.requestPermission();

      expect(result).toBeNull();
    });
  });

  describe('hasPermission', () => {
    it('should return true when permission is granted', async () => {
      mockPermissions.query.mockResolvedValue({ state: 'granted' });

      const result = await geolocationService.hasPermission();

      expect(result).toBe(true);
    });

    it('should return false when permission is denied', async () => {
      mockPermissions.query.mockResolvedValue({ state: 'denied' });

      const result = await geolocationService.hasPermission();

      expect(result).toBe(false);
    });

    it('should return false when permission is prompt', async () => {
      mockPermissions.query.mockResolvedValue({ state: 'prompt' });

      const result = await geolocationService.hasPermission();

      expect(result).toBe(false);
    });

    it('should return false when Permissions API is not available', async () => {
      Object.defineProperty(global.navigator, 'permissions', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = await geolocationService.hasPermission();

      expect(result).toBe(false);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points accurately', () => {
      // Gothenburg coordinates (approximately)
      const lat1 = 57.7089;
      const lon1 = 11.9746;
      
      // Stockholm coordinates (approximately)
      const lat2 = 59.3293;
      const lon2 = 18.0686;

      const distance = geolocationService.calculateDistance(lat1, lon1, lat2, lon2);

      // Distance between Gothenburg and Stockholm is approximately 400km
      expect(distance).toBeGreaterThan(390000); // 390km
      expect(distance).toBeLessThan(410000); // 410km
    });

    it('should return 0 for identical coordinates', () => {
      const distance = geolocationService.calculateDistance(57.7, 11.9, 57.7, 11.9);

      expect(distance).toBe(0);
    });

    it('should calculate small distances accurately', () => {
      // Two points ~100m apart
      const lat1 = 57.7;
      const lon1 = 11.9;
      const lat2 = 57.7009; // ~100m north
      const lon2 = 11.9;

      const distance = geolocationService.calculateDistance(lat1, lon1, lat2, lon2);

      expect(distance).toBeGreaterThan(95);
      expect(distance).toBeLessThan(105);
    });
  });
});
