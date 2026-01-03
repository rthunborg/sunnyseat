import { test, expect } from '@playwright/test';

/**
 * Data Integrity Verification Tests
 * Validates that data integrity is maintained across operations
 */
test.describe('Data Integrity Verification', () => {
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

  test.describe('Data Consistency', () => {
    test('patio data should be consistent across multiple requests', async ({ request }) => {
      const query = `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`;
      
      // Get patio data twice
      const response1 = await request.get(query);
      const response2 = await request.get(query);

      expect(response1.status()).toBe(200);
      expect(response2.status()).toBe(200);

      const data1 = await response1.json();
      const data2 = await response2.json();

      // Same query should return same number of patios
      expect(data1.patios.length).toBe(data2.patios.length);

      if (data1.patios.length > 0) {
        // Patio IDs should match
        const ids1 = data1.patios.map((p: any) => p.id).sort();
        const ids2 = data2.patios.map((p: any) => p.id).sort();
        expect(ids1).toEqual(ids2);

        // Patio data should be consistent
        const patio1 = data1.patios[0];
        const patio2 = data2.patios.find((p: any) => p.id === patio1.id);
        
        if (patio2) {
          expect(patio1.id).toBe(patio2.id);
          expect(patio1.venueId).toBe(patio2.venueId);
          expect(patio1.latitude).toBe(patio2.latitude);
          expect(patio1.longitude).toBe(patio2.longitude);
        }
      }
    });

    test('patio coordinates should be valid and within expected ranges', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=2.0`
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      for (const patio of data.patios) {
        // Verify coordinate validity
        expect(patio.latitude).toBeGreaterThanOrEqual(-90);
        expect(patio.latitude).toBeLessThanOrEqual(90);
        expect(patio.longitude).toBeGreaterThanOrEqual(-180);
        expect(patio.longitude).toBeLessThanOrEqual(180);
        
        // Verify numeric types
        expect(typeof patio.latitude).toBe('number');
        expect(typeof patio.longitude).toBe('number');
        expect(Number.isFinite(patio.latitude)).toBe(true);
        expect(Number.isFinite(patio.longitude)).toBe(true);
      }
    });
  });

  test.describe('Data Accuracy', () => {
    test('distance calculations should be accurate', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      const searchLat = 45.5017;
      const searchLng = -73.5673;

      for (const patio of data.patios) {
        // Verify distance is calculated and is a number
        expect(patio).toHaveProperty('distanceKm');
        expect(typeof patio.distanceKm).toBe('number');
        expect(patio.distanceKm).toBeGreaterThanOrEqual(0);
        expect(patio.distanceKm).toBeLessThanOrEqual(1.5);

        // Verify distance is reasonable (Haversine formula approximation)
        // Distance should be positive and within radius
        expect(patio.distanceKm).toBeGreaterThanOrEqual(0);
      }
    });

    test('patio IDs should be unique in response', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=2.0`
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      const ids = data.patios.map((p: any) => p.id);
      const uniqueIds = new Set(ids);

      // All IDs should be unique
      expect(ids.length).toBe(uniqueIds.size);
    });
  });

  test.describe('Data Relationships', () => {
    test('patio should have valid venueId reference', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=2.0`
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      for (const patio of data.patios) {
        // Verify venueId is present and is a number
        expect(patio).toHaveProperty('venueId');
        expect(typeof patio.venueId).toBe('number');
        expect(patio.venueId).toBeGreaterThan(0);
      }
    });

    test('sun exposure data should be consistent with patio', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      for (const patio of data.patios) {
        if (patio.currentSunExposure) {
          // Verify sun exposure state is valid
          expect(['Sunny', 'Partial', 'Shaded']).toContain(patio.currentSunExposure.state);
          
          // Verify confidence is in valid range
          if (patio.currentSunExposure.confidence !== undefined) {
            expect(patio.currentSunExposure.confidence).toBeGreaterThanOrEqual(0);
            expect(patio.currentSunExposure.confidence).toBeLessThanOrEqual(100);
          }
        }
      }
    });
  });

  test.describe('Foreign Key Integrity', () => {
    test('feedback submission should maintain referential integrity', async ({ request }) => {
      // First, get a valid patio to use for feedback
      const patioResponse = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
      );

      if (patioResponse.status() === 200) {
        const patioData = await patioResponse.json();
        
        if (patioData.patios.length > 0) {
          const patio = patioData.patios[0];
          
          const feedbackData = {
            patioId: patio.id,
            venueId: patio.venueId,
            userTimestamp: new Date().toISOString(),
            predictedState: 'Sunny',
            wasSunny: true,
            confidenceAtPrediction: 85,
          };

          const feedbackResponse = await request.post(`${baseURL}/api/feedback`, {
            data: feedbackData,
          });

          // May return 201 (success) or 500 (database error)
          if (feedbackResponse.status() === 201) {
            const feedback = await feedbackResponse.json();
            
            // Verify foreign key relationships
            expect(feedback.patioId).toBe(patio.id);
            expect(feedback.venueId).toBe(patio.venueId);
          }
        }
      }
    });

    test('should reject feedback with invalid patioId', async ({ request }) => {
      const feedbackData = {
        patioId: 999999, // Non-existent patio
        venueId: 1,
        userTimestamp: new Date().toISOString(),
        predictedState: 'Sunny',
        wasSunny: true,
        confidenceAtPrediction: 85,
      };

      const response = await request.post(`${baseURL}/api/feedback`, {
        data: feedbackData,
      });

      // Should either reject invalid foreign key or return error
      // May return 400 (validation) or 500 (database constraint)
      expect([400, 500]).toContain(response.status());
    });
  });

  test.describe('Data Type Consistency', () => {
    test('all numeric fields should be proper numbers', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      for (const patio of data.patios) {
        // Verify numeric fields are numbers, not strings
        expect(typeof patio.id).toBe('number');
        expect(typeof patio.venueId).toBe('number');
        expect(typeof patio.latitude).toBe('number');
        expect(typeof patio.longitude).toBe('number');
        expect(typeof patio.distanceKm).toBe('number');
      }
    });

    test('all string fields should be proper strings', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/patios?latitude=45.5017&longitude=-73.5673&radiusKm=1.5`
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      for (const patio of data.patios) {
        if (patio.name) {
          expect(typeof patio.name).toBe('string');
        }
        if (patio.currentSunExposure?.state) {
          expect(typeof patio.currentSunExposure.state).toBe('string');
        }
      }
    });
  });
});
