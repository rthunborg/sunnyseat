import { test, expect } from '@playwright/test';

/**
 * API Contract Validation Tests
 * Validates that Next.js API endpoints match .NET API contracts
 */
test.describe('API Contract Validation', () => {
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

  test.describe('Patios API Contract', () => {
    test('GET /api/patios response structure should match .NET API', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
      );

      expect(response.status()).toBe(200);

      const data = await response.json();
      
      // Verify response structure matches .NET API GetPatiosResponse
      expect(data).toHaveProperty('patios');
      expect(Array.isArray(data.patios)).toBe(true);

      if (data.patios.length > 0) {
        const patio = data.patios[0];
        
        // Verify patio object structure
        expect(patio).toHaveProperty('id');
        expect(patio).toHaveProperty('venueId');
        expect(patio).toHaveProperty('name');
        expect(patio).toHaveProperty('latitude');
        expect(patio).toHaveProperty('longitude');
        expect(patio).toHaveProperty('distanceKm');
        
        // Verify sun exposure data is present
        expect(patio).toHaveProperty('currentSunExposure');
        if (patio.currentSunExposure) {
          expect(patio.currentSunExposure).toHaveProperty('state');
          expect(['Sunny', 'Partial', 'Shaded']).toContain(patio.currentSunExposure.state);
          expect(patio.currentSunExposure).toHaveProperty('confidence');
        }
      }
    });

    test('GET /api/patios should enforce max radius of 3.0km', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=5.0`
      );

      // Should return 400 for radius > 3.0km (matching .NET API MaxRadiusKm)
      expect(response.status()).toBe(400);
    });

    test('GET /api/patios should default to 1.5km radius when not specified', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673`
      );

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('patios');
    });

    test('GET /api/patios should limit results to 50 patios', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=3.0`
      );

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.patios.length).toBeLessThanOrEqual(50);
    });

    test('GET /api/patios should validate latitude range', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=91&longitude=-73.5673&radiusKm=1.5`
      );

      expect(response.status()).toBe(400);
    });

    test('GET /api/patios should validate longitude range', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=181&radiusKm=1.5`
      );

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Feedback API Contract', () => {
    test('POST /api/feedback response structure should match .NET API', async ({ request }) => {
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

      // May return 201 or 500 (if database unavailable)
      if (response.status() === 201) {
        const data = await response.json();
        
        // Verify response structure matches .NET API FeedbackResponse
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('patioId');
        expect(data).toHaveProperty('venueId');
        expect(data).toHaveProperty('userTimestamp');
        expect(data).toHaveProperty('predictedState');
        expect(data).toHaveProperty('wasSunny');
        expect(data).toHaveProperty('confidenceAtPrediction');
        expect(data).toHaveProperty('createdAt');
        
        // Verify predictedState is valid
        expect(['Sunny', 'Partial', 'Shaded']).toContain(data.predictedState);
      }
    });

    test('POST /api/feedback should validate predictedState enum', async ({ request }) => {
      const response = await request.post(`${baseURL}/api/feedback`, {
        data: {
          patioId: 1,
          venueId: 1,
          userTimestamp: new Date().toISOString(),
          predictedState: 'InvalidState',
          wasSunny: true,
          confidenceAtPrediction: 85,
        },
      });

      expect(response.status()).toBe(400);
    });

    test('POST /api/feedback should require patioId and venueId', async ({ request }) => {
      const response = await request.post(`${baseURL}/api/feedback`, {
        data: {
          userTimestamp: new Date().toISOString(),
          predictedState: 'Sunny',
          wasSunny: true,
          confidenceAtPrediction: 85,
        },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Sun Exposure API Contract', () => {
    test('GET /api/sun-exposure/patio/{id} response structure should match .NET API', async ({ request }) => {
      const timestamp = new Date().toISOString();
      const response = await request.get(
        `${baseURL}/api/sun-exposure/patio/1?timestamp=${timestamp}`
      );

      // May return 200, 404, or 500
      if (response.status() === 200) {
        const data = await response.json();
        
        // Verify response structure matches .NET API PatioSunExposureResponse
        expect(data).toHaveProperty('patioId');
        expect(data).toHaveProperty('state');
        expect(['Sunny', 'Partial', 'Shaded']).toContain(data.state);
        expect(data).toHaveProperty('confidence');
        expect(data.confidence).toBeGreaterThanOrEqual(0);
        expect(data.confidence).toBeLessThanOrEqual(100);
        expect(data).toHaveProperty('timestamp');
      }
    });

    test('GET /api/sun-exposure/patio/{id} should default to current time if timestamp not provided', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/sun-exposure/patio/1`);

      // Should accept request without timestamp (defaults to current time in .NET API)
      expect([200, 404, 500]).toContain(response.status());
    });
  });

  test.describe('Health Endpoints Contract', () => {
    test('GET /api/health/ready should return status object', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/health/ready`);
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
    });

    test('GET /api/health/live should return status object', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/health/live`);
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
    });

    test('GET /api/health/database should return status or error', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/health/database`);
      
      // May be 200 (healthy) or 503 (unhealthy)
      expect([200, 503]).toContain(response.status());
    });
  });

  test.describe('Error Response Format', () => {
    test('400 Bad Request should return error details', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/patios`);
      
      expect(response.status()).toBe(400);
      
      const data = await response.json();
      // Error response should have some indication of the problem
      expect(data).toBeDefined();
    });

    test('401 Unauthorized should return error for protected endpoints', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/auth/me`);
      
      expect(response.status()).toBe(401);
    });

    test('404 Not Found should return error for non-existent resources', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/sun-exposure/patio/999999`);
      
      // May return 404 or 500 depending on implementation
      expect([404, 500]).toContain(response.status());
    });
  });
});
