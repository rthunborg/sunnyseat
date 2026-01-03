import { test, expect } from '@playwright/test';

/**
 * Spatial Query Accuracy Tests
 * Validates that spatial queries produce accurate results matching .NET API
 */
test.describe('Spatial Query Accuracy', () => {
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
  
  // Test coordinates (Montreal area)
  const testCoordinates = [
    { lat: 45.5017, lng: -73.5673, name: 'Montreal Downtown' },
    { lat: 45.5088, lng: -73.5878, name: 'Montreal Old Port' },
    { lat: 45.4972, lng: -73.5794, name: 'Montreal Plateau' },
  ];

  test.describe('Distance Calculations', () => {
    test('should calculate distance correctly for patios within radius', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=${testCoordinates[0].lat}&longitude=${testCoordinates[0].lng}&radiusKm=1.5`
      );

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      
      if (data.patios.length > 0) {
        // Verify all returned patios are within the specified radius
        for (const patio of data.patios) {
          expect(patio).toHaveProperty('distanceKm');
          expect(patio.distanceKm).toBeGreaterThanOrEqual(0);
          expect(patio.distanceKm).toBeLessThanOrEqual(1.5);
        }
      }
    });

    test('should return patios ordered by distance (closest first)', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=${testCoordinates[0].lat}&longitude=${testCoordinates[0].lng}&radiusKm=2.0`
      );

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      
      if (data.patios.length > 1) {
        // Verify patios are sorted by distance (ascending)
        for (let i = 1; i < data.patios.length; i++) {
          expect(data.patios[i].distanceKm).toBeGreaterThanOrEqual(data.patios[i - 1].distanceKm);
        }
      }
    });

    test('should exclude patios outside search radius', async ({ request }) => {
      const smallRadius = 0.5; // 500m radius
      const response = await request.get(
        `${baseURL}/api/patios?latitude=${testCoordinates[0].lat}&longitude=${testCoordinates[0].lng}&radiusKm=${smallRadius}`
      );

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      
      // Verify all patios are within the small radius
      for (const patio of data.patios) {
        expect(patio.distanceKm).toBeLessThanOrEqual(smallRadius);
      }
    });
  });

  test.describe('Coordinate Accuracy', () => {
    test('should return accurate patio coordinates', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=${testCoordinates[0].lat}&longitude=${testCoordinates[0].lng}&radiusKm=2.0`
      );

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      
      if (data.patios.length > 0) {
        for (const patio of data.patios) {
          // Verify coordinates are valid
          expect(patio).toHaveProperty('latitude');
          expect(patio).toHaveProperty('longitude');
          expect(patio.latitude).toBeGreaterThanOrEqual(-90);
          expect(patio.latitude).toBeLessThanOrEqual(90);
          expect(patio.longitude).toBeGreaterThanOrEqual(-180);
          expect(patio.longitude).toBeLessThanOrEqual(180);
        }
      }
    });

    test('should handle different coordinate systems correctly', async ({ request }) => {
      // Test with coordinates in different regions
      const testCases = [
        { lat: 40.7128, lng: -74.0060, name: 'New York' },
        { lat: 51.5074, lng: -0.1278, name: 'London' },
        { lat: -33.8688, lng: 151.2093, name: 'Sydney' },
      ];

      for (const testCase of testCases) {
        const response = await request.get(
          `${baseURL}/api/patios?latitude=${testCase.lat}&longitude=${testCase.lng}&radiusKm=1.0`
        );

        // Should handle coordinates correctly (may return empty results if no patios in area)
        expect([200, 400]).toContain(response.status());
        
        if (response.status() === 200) {
          const data = await response.json();
          expect(data).toHaveProperty('patios');
          expect(Array.isArray(data.patios)).toBe(true);
        }
      }
    });
  });

  test.describe('Spatial Query Consistency', () => {
    test('should return consistent results for same query', async ({ request }) => {
      const query = `${baseURL}/api/patios?latitude=${testCoordinates[0].lat}&longitude=${testCoordinates[0].lng}&radiusKm=1.5`;
      
      // Execute same query twice
      const response1 = await request.get(query);
      const response2 = await request.get(query);

      expect(response1.status()).toBe(200);
      expect(response2.status()).toBe(200);

      const data1 = await response1.json();
      const data2 = await response2.json();

      // Results should be consistent (same number of patios)
      expect(data1.patios.length).toBe(data2.patios.length);
      
      // If patios exist, verify they're the same
      if (data1.patios.length > 0) {
        expect(data1.patios[0].id).toBe(data2.patios[0].id);
      }
    });

    test('should handle edge cases at coordinate boundaries', async ({ request }) => {
      const edgeCases = [
        { lat: 90, lng: 0, name: 'North Pole' },
        { lat: -90, lng: 0, name: 'South Pole' },
        { lat: 0, lng: 180, name: 'International Date Line' },
        { lat: 0, lng: -180, name: 'International Date Line West' },
      ];

      for (const testCase of edgeCases) {
        const response = await request.get(
          `${baseURL}/api/patios?latitude=${testCase.lat}&longitude=${testCase.lng}&radiusKm=1.0`
        );

        // Should handle edge cases without errors (may return empty results)
        expect([200, 400]).toContain(response.status());
      }
    });
  });

  test.describe('Radius Validation', () => {
    test('should handle zero radius', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=${testCoordinates[0].lat}&longitude=${testCoordinates[0].lng}&radiusKm=0`
      );

      // Zero radius should either return empty results or 400 error
      expect([200, 400]).toContain(response.status());
    });

    test('should handle maximum radius correctly', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=${testCoordinates[0].lat}&longitude=${testCoordinates[0].lng}&radiusKm=3.0`
      );

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      
      // Verify all patios are within 3.0km
      for (const patio of data.patios) {
        expect(patio.distanceKm).toBeLessThanOrEqual(3.0);
      }
    });

    test('should reject radius greater than maximum', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=${testCoordinates[0].lat}&longitude=${testCoordinates[0].lng}&radiusKm=5.0`
      );

      // Should reject radius > 3.0km (MaxRadiusKm from .NET API)
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Spatial Index Performance', () => {
    test('should return results quickly for spatial queries', async ({ request }) => {
      const startTime = Date.now();
      
      const response = await request.get(
        `${baseURL}/api/patios?latitude=${testCoordinates[0].lat}&longitude=${testCoordinates[0].lng}&radiusKm=1.5`
      );
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status()).toBe(200);
      
      // Spatial queries should be fast (< 1 second for p95 target)
      expect(responseTime).toBeLessThan(2000); // 2 second max for E2E test
    });
  });
});
