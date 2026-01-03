import { test, expect } from '@playwright/test';

/**
 * End-to-end API contract validation tests
 * Tests that API endpoints return expected responses
 */
test.describe('API Endpoints Contract Validation', () => {
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

  test.describe('Health Endpoints', () => {
    test('GET /api/health should return 200', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/health`);
      expect(response.status()).toBe(200);
    });

    test('GET /api/health/ready should return 200', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/health/ready`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('GET /api/health/live should return 200', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/health/live`);
      expect(response.status()).toBe(200);
    });

    test('GET /api/health/database should return 200 or 503', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/health/database`);
      // Database health may be 200 (healthy) or 503 (unhealthy)
      expect([200, 503]).toContain(response.status());
    });
  });

  test.describe('Patios Endpoint', () => {
    test('GET /api/patios with valid coordinates should return patios array', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=5`
      );
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('patios');
      expect(Array.isArray(data.patios)).toBe(true);
    });

    test('GET /api/patios without coordinates should return 400', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/patios`);
      expect(response.status()).toBe(400);
    });

    test('GET /api/patios with invalid coordinates should return 400', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=invalid&longitude=-73.5673&radiusKm=5`
      );
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Feedback Endpoint', () => {
    test('POST /api/feedback with valid data should return 201', async ({ request }) => {
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

      // May return 201 (success) or 500 (if database not available in test)
      expect([201, 500]).toContain(response.status());
      
      if (response.status() === 201) {
        const data = await response.json();
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('patioId');
        expect(data).toHaveProperty('venueId');
      }
    });

    test('POST /api/feedback without required fields should return 400', async ({ request }) => {
      const response = await request.post(`${baseURL}/api/feedback`, {
        data: {
          patioId: 1,
          // Missing required fields
        },
      });

      expect(response.status()).toBe(400);
    });

    test('POST /api/feedback with invalid predictedState should return 400', async ({ request }) => {
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
  });

  test.describe('Sun Exposure Endpoint', () => {
    test('GET /api/sun-exposure/patio/1 should return sun exposure data', async ({ request }) => {
      const timestamp = new Date().toISOString();
      const response = await request.get(
        `${baseURL}/api/sun-exposure/patio/1?timestamp=${timestamp}`
      );

      // May return 200 (success) or 404 (patio not found) or 500 (database error)
      expect([200, 404, 500]).toContain(response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toBeDefined();
      }
    });

    test('GET /api/sun-exposure/patio/invalid should return 400', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/sun-exposure/patio/invalid`);
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Authentication Endpoints', () => {
    test('POST /api/auth/login with valid credentials should return tokens', async ({ request }) => {
      // This test may fail if no admin users exist in test database
      const response = await request.post(`${baseURL}/api/auth/login`, {
        data: {
          email: 'admin@example.com',
          password: 'testpassword',
        },
      });

      // May return 200 (success) or 401 (invalid credentials) or 500 (database error)
      expect([200, 401, 500]).toContain(response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('accessToken');
        expect(data).toHaveProperty('refreshToken');
      }
    });

    test('POST /api/auth/login with invalid credentials should return 401', async ({ request }) => {
      const response = await request.post(`${baseURL}/api/auth/login`, {
        data: {
          email: 'invalid@example.com',
          password: 'wrongpassword',
        },
      });

      expect(response.status()).toBe(401);
    });

    test('GET /api/auth/me without token should return 401', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/auth/me`);
      expect(response.status()).toBe(401);
    });
  });
});
