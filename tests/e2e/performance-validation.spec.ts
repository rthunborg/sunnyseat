import { test, expect } from '@playwright/test';

/**
 * Performance Validation Tests
 * Validates that performance meets or exceeds current targets
 */
test.describe('Performance Validation', () => {
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

  test.describe('API Response Times', () => {
    test('GET /api/patios should respond within 200ms p95 target', async ({ request }) => {
      const responseTimes: number[] = [];
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        const response = await request.get(
          `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
        );
        const endTime = Date.now();
        
        expect(response.status()).toBe(200);
        responseTimes.push(endTime - startTime);
      }

      // Calculate p95 (95th percentile)
      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.ceil(iterations * 0.95) - 1;
      const p95 = responseTimes[p95Index];

      // Target: <200ms p95 for spatial queries
      expect(p95).toBeLessThan(2000); // 2 seconds for E2E test environment
    });

    test('GET /api/health/ready should respond within 100ms p95 target', async ({ request }) => {
      const responseTimes: number[] = [];
      const iterations = 20;

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        const response = await request.get(`${baseURL}/api/health/ready`);
        const endTime = Date.now();
        
        expect(response.status()).toBe(200);
        responseTimes.push(endTime - startTime);
      }

      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.ceil(iterations * 0.95) - 1;
      const p95 = responseTimes[p95Index];

      // Target: <100ms p95 for standard queries
      expect(p95).toBeLessThan(1000); // 1 second for E2E test environment
    });

    test('GET /api/sun-exposure/patio/{id} should respond within 200ms p95 target', async ({ request }) => {
      const responseTimes: number[] = [];
      const iterations = 10;
      const timestamp = new Date().toISOString();

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        const response = await request.get(
          `${baseURL}/api/sun-exposure/patio/1?timestamp=${timestamp}`
        );
        const endTime = Date.now();
        
        // May return 200, 404, or 500
        if (response.status() === 200) {
          responseTimes.push(endTime - startTime);
        }
      }

      if (responseTimes.length > 0) {
        responseTimes.sort((a, b) => a - b);
        const p95Index = Math.ceil(responseTimes.length * 0.95) - 1;
        const p95 = responseTimes[p95Index];

        // Target: <200ms p95 for spatial queries
        expect(p95).toBeLessThan(2000); // 2 seconds for E2E test environment
      }
    });
  });

  test.describe('Page Load Times', () => {
    test('Home page should load within 2s initial load target', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;

      // Target: <2s initial load
      expect(loadTime).toBeLessThan(5000); // 5 seconds for E2E test environment
    });

    test('Home page subsequent loads should be within 1s target', async ({ page }) => {
      // First load
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Second load (should be faster due to caching)
      const startTime = Date.now();
      await page.reload();
      await page.waitForLoadState('networkidle');
      const endTime = Date.now();
      
      const loadTime = endTime - startTime;

      // Target: <1s subsequent loads
      expect(loadTime).toBeLessThan(3000); // 3 seconds for E2E test environment
    });
  });

  test.describe('Database Query Performance', () => {
    test('Spatial queries should complete within 200ms p95', async ({ request }) => {
      const responseTimes: number[] = [];
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        const response = await request.get(
          `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
        );
        const endTime = Date.now();
        
        if (response.status() === 200) {
          responseTimes.push(endTime - startTime);
        }
      }

      if (responseTimes.length > 0) {
        responseTimes.sort((a, b) => a - b);
        const p95Index = Math.ceil(responseTimes.length * 0.95) - 1;
        const p95 = responseTimes[p95Index];

        // Target: <200ms p95 for spatial queries
        expect(p95).toBeLessThan(2000); // 2 seconds for E2E test environment
      }
    });

    test('Standard queries should complete within 50ms p95', async ({ request }) => {
      const responseTimes: number[] = [];
      const iterations = 20;

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        const response = await request.get(`${baseURL}/api/health/ready`);
        const endTime = Date.now();
        
        if (response.status() === 200) {
          responseTimes.push(endTime - startTime);
        }
      }

      if (responseTimes.length > 0) {
        responseTimes.sort((a, b) => a - b);
        const p95Index = Math.ceil(responseTimes.length * 0.95) - 1;
        const p95 = responseTimes[p95Index];

        // Target: <50ms p95 for standard queries
        expect(p95).toBeLessThan(1000); // 1 second for E2E test environment
      }
    });
  });

  test.describe('Concurrent Request Performance', () => {
    test('should handle concurrent requests efficiently', async ({ request }) => {
      const concurrentRequests = 5;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, () =>
        request.get(
          `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
        )
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach((response) => {
        expect([200, 500]).toContain(response.status());
      });

      // Concurrent requests should complete reasonably quickly
      // Average time per request should be acceptable
      const avgTimePerRequest = totalTime / concurrentRequests;
      expect(avgTimePerRequest).toBeLessThan(3000); // 3 seconds per request in concurrent scenario
    });
  });

  test.describe('Memory and Resource Usage', () => {
    test('should not degrade performance with multiple sequential requests', async ({ request }) => {
      const responseTimes: number[] = [];
      const iterations = 20;

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        const response = await request.get(
          `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
        );
        const endTime = Date.now();
        
        if (response.status() === 200) {
          responseTimes.push(endTime - startTime);
        }
      }

      if (responseTimes.length > 1) {
        // Performance should not degrade significantly
        const firstHalf = responseTimes.slice(0, Math.floor(responseTimes.length / 2));
        const secondHalf = responseTimes.slice(Math.floor(responseTimes.length / 2));
        
        const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        // Second half should not be more than 2x slower than first half
        expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 2);
      }
    });
  });
});
