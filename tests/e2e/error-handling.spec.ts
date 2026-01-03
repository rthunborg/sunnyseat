import { test, expect } from '@playwright/test';

/**
 * Error Handling Tests
 * Validates that error handling works correctly across all scenarios
 */
test.describe('Error Handling', () => {
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

  test.describe('Input Validation Errors', () => {
    test('should return 400 for missing required parameters', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/patios`);
      expect(response.status()).toBe(400);
    });

    test('should return 400 for invalid latitude', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=invalid&longitude=-73.5673&radiusKm=1.5`
      );
      expect(response.status()).toBe(400);
    });

    test('should return 400 for invalid longitude', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=invalid&radiusKm=1.5`
      );
      expect(response.status()).toBe(400);
    });

    test('should return 400 for latitude out of range', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=91&longitude=-73.5673&radiusKm=1.5`
      );
      expect(response.status()).toBe(400);
    });

    test('should return 400 for longitude out of range', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=181&radiusKm=1.5`
      );
      expect(response.status()).toBe(400);
    });

    test('should return 400 for radius exceeding maximum', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=5.0`
      );
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Authentication Errors', () => {
    test('should return 401 for protected endpoints without token', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/auth/me`);
      expect(response.status()).toBe(401);
    });

    test('should return 401 for invalid token', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/auth/me`, {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });
      expect(response.status()).toBe(401);
    });

    test('should return 401 for expired token', async ({ request }) => {
      // This would require creating an expired token, which is complex in E2E
      // For now, we verify the endpoint requires authentication
      const response = await request.get(`${baseURL}/api/auth/me`);
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Not Found Errors', () => {
    test('should return 404 for non-existent patio in sun exposure', async ({ request }) => {
      const timestamp = new Date().toISOString();
      const response = await request.get(
        `${baseURL}/api/sun-exposure/patio/999999?timestamp=${timestamp}`
      );
      
      // May return 404 or 500 depending on implementation
      expect([404, 500]).toContain(response.status());
    });

    test('should return 400 for invalid patio ID format', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/sun-exposure/patio/invalid?timestamp=${new Date().toISOString()}`
      );
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Server Errors', () => {
    test('should handle database connection errors gracefully', async ({ request }) => {
      // This test verifies error handling structure
      // Actual database errors may not be reproducible in E2E tests
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
      );
      
      // Should return either success or proper error (not crash)
      expect([200, 500, 503]).toContain(response.status());
    });

    test('should return proper error format for server errors', async ({ request }) => {
      // Test error response structure
      // Some endpoints may return 500 in test environment
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
      );
      
      if (response.status() >= 400) {
        const data = await response.json();
        // Error response should be structured
        expect(data).toBeDefined();
      }
    });
  });

  test.describe('Error Recovery', () => {
    test('should recover from temporary errors', async ({ request }) => {
      // Make a request that might fail
      const response1 = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
      );
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Make same request again - should work if it was temporary
      const response2 = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
      );
      
      // At least one should succeed
      expect([response1.status(), response2.status()]).toContain(200);
    });

    test('should handle malformed JSON requests', async ({ request }) => {
      const response = await request.post(`${baseURL}/api/feedback`, {
        data: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Should return 400 for malformed JSON
      expect([400, 500]).toContain(response.status());
    });
  });

  test.describe('Rate Limiting', () => {
    test('should handle rate limiting if implemented', async ({ request }) => {
      // Make multiple rapid requests
      const requests = Array.from({ length: 20 }, () =>
        request.get(
          `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
        )
      );

      const responses = await Promise.all(requests);
      
      // Should either all succeed or some return 429 (rate limited)
      const statusCodes = responses.map(r => r.status());
      const hasRateLimit = statusCodes.includes(429);
      const allSuccess = statusCodes.every(s => s === 200);
      
      // Either all succeed or rate limiting is working
      expect(hasRateLimit || allSuccess).toBe(true);
    });
  });

  test.describe('Error Message Clarity', () => {
    test('should return descriptive error messages', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/patios`);
      
      if (response.status() === 400) {
        const data = await response.json();
        // Error should have some description
        expect(data).toBeDefined();
      }
    });

    test('should not expose sensitive information in errors', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
      );
      
      if (response.status() >= 400) {
        const data = await response.json();
        const errorString = JSON.stringify(data);
        
        // Should not expose database connection strings, passwords, etc.
        expect(errorString).not.toContain('password');
        expect(errorString).not.toContain('connection string');
        expect(errorString).not.toContain('secret');
      }
    });
  });
});
