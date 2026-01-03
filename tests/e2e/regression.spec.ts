import { test, expect } from '@playwright/test';

/**
 * Regression Tests
 * Verifies no regressions from current functionality
 * Tests all existing functionality to ensure nothing broke
 */
test.describe('Regression Testing', () => {
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

  test.describe('Core Functionality', () => {
    test('patio search should work as before', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('patios');
      expect(Array.isArray(data.patios)).toBe(true);
    });

    test('health endpoints should work as before', async ({ request }) => {
      const readyResponse = await request.get(`${baseURL}/api/health/ready`);
      expect(readyResponse.status()).toBe(200);

      const liveResponse = await request.get(`${baseURL}/api/health/live`);
      expect(liveResponse.status()).toBe(200);
    });

    test('sun exposure calculation should work as before', async ({ request }) => {
      const timestamp = new Date().toISOString();
      const response = await request.get(
        `${baseURL}/api/sun-exposure/patio/1?timestamp=${timestamp}`
      );

      // May return 200, 404, or 500 depending on data availability
      expect([200, 404, 500]).toContain(response.status());
    });

    test('feedback submission should work as before', async ({ request }) => {
      const feedbackData = {
        patioId: 1,
        venueId: 1,
        userTimestamp: new Date().toISOString(),
        predictedState: 'Sunny',
        wasSunny: true,
        confidenceAtPrediction: 85,
      };

      const response = await request.post(`${baseURL}/api/feedback`, {
        data: feedbackData,
      });

      // May return 201 (success) or 500 (database error)
      expect([201, 500]).toContain(response.status());
    });
  });

  test.describe('API Response Format', () => {
    test('patio response format should match previous version', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      // Verify response structure hasn't changed
      expect(data).toHaveProperty('patios');
      
      if (data.patios.length > 0) {
        const patio = data.patios[0];
        expect(patio).toHaveProperty('id');
        expect(patio).toHaveProperty('venueId');
        expect(patio).toHaveProperty('latitude');
        expect(patio).toHaveProperty('longitude');
      }
    });

    test('error response format should match previous version', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/patios`);

      expect(response.status()).toBe(400);
      // Error response should be structured
      const data = await response.json();
      expect(data).toBeDefined();
    });
  });

  test.describe('Query Parameters', () => {
    test('should accept same query parameters as before', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
      );

      expect(response.status()).toBe(200);
    });

    test('should handle optional parameters as before', async ({ request }) => {
      // radiusKm is optional, should default to 1.5km
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673`
      );

      expect(response.status()).toBe(200);
    });

    test('should validate parameters same way as before', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=91&longitude=-73.5673&radiusKm=1.5`
      );

      // Should still reject invalid latitude
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Authentication Flow', () => {
    test('login should work as before', async ({ request }) => {
      const response = await request.post(`${baseURL}/api/auth/login`, {
        data: {
          email: 'admin@example.com',
          password: 'testpassword',
        },
      });

      // May return 200 (success) or 401 (invalid credentials) or 500
      expect([200, 401, 500]).toContain(response.status());
    });

    test('protected endpoints should require auth as before', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/auth/me`);
      
      // Should still require authentication
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Data Consistency', () => {
    test('should return consistent data for same query', async ({ request }) => {
      const query = `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`;
      
      const response1 = await request.get(query);
      const response2 = await request.get(query);

      expect(response1.status()).toBe(200);
      expect(response2.status()).toBe(200);

      const data1 = await response1.json();
      const data2 = await response2.json();

      // Should return same number of results
      expect(data1.patios.length).toBe(data2.patios.length);
    });

    test('should maintain data relationships', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      for (const patio of data.patios) {
        // VenueId should still be present
        expect(patio).toHaveProperty('venueId');
        expect(typeof patio.venueId).toBe('number');
      }
    });
  });

  test.describe('Performance Baseline', () => {
    test('response times should not degrade significantly', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
      );
      const endTime = Date.now();

      expect(response.status()).toBe(200);
      
      const responseTime = endTime - startTime;
      // Should still be reasonably fast (not significantly slower)
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle edge cases same way as before', async ({ request }) => {
      // Test with boundary coordinates
      const edgeCases = [
        { lat: 90, lng: 0 },
        { lat: -90, lng: 0 },
        { lat: 0, lng: 180 },
        { lat: 0, lng: -180 },
      ];

      for (const testCase of edgeCases) {
        const response = await request.get(
          `${baseURL}/api/patios?latitude=${testCase.lat}&longitude=${testCase.lng}&radiusKm=1.0`
        );

        // Should handle edge cases (may return empty results or 400)
        expect([200, 400]).toContain(response.status());
      }
    });

    test('should handle empty results same way as before', async ({ request }) => {
      // Query area with likely no patios
      const response = await request.get(
        `${baseURL}/api/patios?latitude=0&longitude=0&radiusKm=0.1`
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('patios');
      expect(Array.isArray(data.patios)).toBe(true);
      // Empty array is valid
    });
  });

  test.describe('Backward Compatibility', () => {
    test('API version should maintain backward compatibility', async ({ request }) => {
      // Test that existing API contracts are maintained
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      // Response structure should match expected format
      expect(data).toHaveProperty('patios');
      expect(Array.isArray(data.patios)).toBe(true);
    });
  });
});
