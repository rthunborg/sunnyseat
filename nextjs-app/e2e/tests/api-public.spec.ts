import { test, expect } from '@playwright/test';

// Gothenburg center coordinates for testing
const GOTHENBURG_LAT = 57.7089;
const GOTHENBURG_LNG = 11.9746;

// ============================================================================
// 1. GET /api/patios
// ============================================================================
test.describe('GET /api/patios', () => {
  test('returns 200 with valid lat and lng params', async ({ request }) => {
    const response = await request.get(
      `/api/patios?lat=${GOTHENBURG_LAT}&lng=${GOTHENBURG_LNG}`
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.patios).toBeDefined();
    expect(Array.isArray(body.patios)).toBe(true);
  });

  test('returns 200 with valid latitude and longitude params', async ({ request }) => {
    const response = await request.get(
      `/api/patios?latitude=${GOTHENBURG_LAT}&longitude=${GOTHENBURG_LNG}`
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.patios).toBeDefined();
  });

  test('response shape matches spec: patios[] with required fields', async ({ request }) => {
    const response = await request.get(
      `/api/patios?lat=${GOTHENBURG_LAT}&lng=${GOTHENBURG_LNG}`
    );
    const body = await response.json();

    if (body.patios.length > 0) {
      const patio = body.patios[0];
      expect(patio).toHaveProperty('id');
      expect(patio).toHaveProperty('venueId');
      expect(patio).toHaveProperty('venueName');
      expect(patio).toHaveProperty('venueSlug');
      expect(patio).toHaveProperty('neighborhood');
      expect(patio).toHaveProperty('distanceMeters');
      expect(patio).toHaveProperty('currentSunStatus');
      expect(patio).toHaveProperty('sunExposurePercent');
      expect(patio).toHaveProperty('isPartner');
      expect(patio).toHaveProperty('location');
      expect(patio.location).toHaveProperty('lat');
      expect(patio.location).toHaveProperty('lng');
      expect(typeof patio.isPartner).toBe('boolean');
      expect(['Sunny', 'Partial', 'Shaded']).toContain(patio.currentSunStatus);
    }
  });

  test('meta object includes count and radiusKm', async ({ request }) => {
    const response = await request.get(
      `/api/patios?lat=${GOTHENBURG_LAT}&lng=${GOTHENBURG_LNG}`
    );
    const body = await response.json();
    expect(body.meta).toBeDefined();
    expect(typeof body.meta.count).toBe('number');
    expect(typeof body.meta.radiusKm).toBe('number');
  });

  test('sort order: sunny first, then partial, then shaded; distance secondary', async ({
    request,
  }) => {
    const response = await request.get(
      `/api/patios?lat=${GOTHENBURG_LAT}&lng=${GOTHENBURG_LNG}&radiusKm=3`
    );
    const body = await response.json();

    if (body.patios.length >= 2) {
      const statusOrder: Record<string, number> = { Sunny: 0, Partial: 1, Shaded: 2 };
      for (let i = 1; i < body.patios.length; i++) {
        const prev = body.patios[i - 1];
        const curr = body.patios[i];
        const prevRank = statusOrder[prev.currentSunStatus] ?? 2;
        const currRank = statusOrder[curr.currentSunStatus] ?? 2;
        if (prevRank === currRank) {
          expect(prev.distanceMeters).toBeLessThanOrEqual(curr.distanceMeters);
        } else {
          expect(prevRank).toBeLessThanOrEqual(currRank);
        }
      }
    }
  });

  test('default radiusKm is 1.5 when not specified', async ({ request }) => {
    const response = await request.get(
      `/api/patios?lat=${GOTHENBURG_LAT}&lng=${GOTHENBURG_LNG}`
    );
    const body = await response.json();
    expect(body.meta.radiusKm).toBe(1.5);
  });

  test('custom radiusKm parameter works', async ({ request }) => {
    const response = await request.get(
      `/api/patios?lat=${GOTHENBURG_LAT}&lng=${GOTHENBURG_LNG}&radiusKm=0.5`
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.meta.radiusKm).toBe(0.5);
  });

  test('returns empty array (not error) when no venues in radius', async ({ request }) => {
    // Use a remote location where no venues exist
    const response = await request.get('/api/patios?lat=0.0&lng=0.0&radiusKm=0.1');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.patios).toEqual([]);
    expect(body.meta.count).toBe(0);
  });

  test('missing lat/lng returns 400 error with descriptive message', async ({ request }) => {
    const response = await request.get('/api/patios');
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.detail).toBeDefined();
  });

  test('missing lat returns 400', async ({ request }) => {
    const response = await request.get(`/api/patios?lng=${GOTHENBURG_LNG}`);
    expect(response.status()).toBe(400);
  });

  test('missing lng returns 400', async ({ request }) => {
    const response = await request.get(`/api/patios?lat=${GOTHENBURG_LAT}`);
    expect(response.status()).toBe(400);
  });

  test('invalid coordinates return 400 error', async ({ request }) => {
    const response = await request.get('/api/patios?lat=999&lng=999');
    expect(response.status()).toBe(400);
  });

  test('cache headers present: s-maxage=30', async ({ request }) => {
    const response = await request.get(
      `/api/patios?lat=${GOTHENBURG_LAT}&lng=${GOTHENBURG_LNG}`
    );
    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toBeDefined();
    expect(cacheControl).toContain('s-maxage=30');
  });
});

// ============================================================================
// 2. GET /api/sun-exposure/patio/[id]
// ============================================================================
test.describe('GET /api/sun-exposure/patio/[id]', () => {
  // Helper: get a known venue ID from the patios endpoint
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function getKnownVenueId(request: any): Promise<string | null> {
    const response = await request.get(
      `/api/patios?lat=${GOTHENBURG_LAT}&lng=${GOTHENBURG_LNG}&radiusKm=3`
    );
    const body = await response.json();
    return body.patios?.[0]?.id ?? null;
  }

  test('returns 200 for a known venue ID', async ({ request }) => {
    const venueId = await getKnownVenueId(request);
    test.skip(!venueId, 'No venues in database to test');

    const response = await request.get(`/api/sun-exposure/patio/${venueId}`);
    expect(response.status()).toBe(200);
  });

  test('response includes sun exposure data', async ({ request }) => {
    const venueId = await getKnownVenueId(request);
    test.skip(!venueId, 'No venues in database to test');

    const response = await request.get(`/api/sun-exposure/patio/${venueId}`);
    const body = await response.json();

    expect(body).toHaveProperty('venueId');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('state');
    expect(body).toHaveProperty('sunExposurePercent');
    expect(body).toHaveProperty('confidence');
    expect(body).toHaveProperty('solarElevation');
    expect(body).toHaveProperty('solarAzimuth');
    expect(['Sunny', 'Partial', 'Shaded', 'NoSun']).toContain(body.state);
    expect(typeof body.sunExposurePercent).toBe('number');
  });

  test('invalid patio ID returns 404 or 400', async ({ request }) => {
    const response = await request.get('/api/sun-exposure/patio/999999');
    expect([400, 404]).toContain(response.status());
  });

  test('non-numeric patio ID returns 400', async ({ request }) => {
    const response = await request.get('/api/sun-exposure/patio/not-a-number');
    expect(response.status()).toBe(400);
  });

  test('cache headers present: s-maxage=300', async ({ request }) => {
    const venueId = await getKnownVenueId(request);
    test.skip(!venueId, 'No venues in database to test');

    const response = await request.get(`/api/sun-exposure/patio/${venueId}`);
    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toBeDefined();
    expect(cacheControl).toContain('s-maxage=300');
  });
});

// ============================================================================
// 3. POST /api/feedback
// ============================================================================
test.describe('POST /api/feedback', () => {
  test('submitting valid feedback returns 201', async ({ request }) => {
    const response = await request.post('/api/feedback', {
      data: {
        venueId: 1,
        predictedState: 'Sunny',
        wasSunny: true,
        userTimestamp: new Date().toISOString(),
        confidenceAtPrediction: 85,
      },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('venueId');
    expect(body).toHaveProperty('predictedState');
    expect(body).toHaveProperty('wasSunny');
  });

  test('missing venueId returns 400', async ({ request }) => {
    const response = await request.post('/api/feedback', {
      data: {
        predictedState: 'Sunny',
        wasSunny: true,
        userTimestamp: new Date().toISOString(),
        confidenceAtPrediction: 85,
      },
    });
    expect(response.status()).toBe(400);
  });

  test('missing predictedState returns 400', async ({ request }) => {
    const response = await request.post('/api/feedback', {
      data: {
        venueId: 1,
        wasSunny: true,
        userTimestamp: new Date().toISOString(),
        confidenceAtPrediction: 85,
      },
    });
    expect(response.status()).toBe(400);
  });

  test('invalid predictedState returns 400', async ({ request }) => {
    const response = await request.post('/api/feedback', {
      data: {
        venueId: 1,
        predictedState: 'InvalidState',
        wasSunny: true,
        userTimestamp: new Date().toISOString(),
        confidenceAtPrediction: 85,
      },
    });
    expect(response.status()).toBe(400);
  });
});

// ============================================================================
// 4. POST /api/venues/[id]/confirm
// ============================================================================
test.describe('POST /api/venues/[id]/confirm', () => {
  test('submitting venue confirmation returns 200', async ({ request }) => {
    // Use venue ID 1 (seed data)
    const response = await request.post('/api/venues/1/confirm');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('confirmed', true);
    expect(body).toHaveProperty('totalConfirmations');
    expect(typeof body.totalConfirmations).toBe('number');
  });

  test('confirmation count is returned', async ({ request }) => {
    const response = await request.post('/api/venues/1/confirm');
    const body = await response.json();
    expect(body.totalConfirmations).toBeGreaterThanOrEqual(1);
  });

  test('nonexistent venue returns 404', async ({ request }) => {
    const response = await request.post('/api/venues/999999/confirm');
    expect(response.status()).toBe(404);
  });
});

// ============================================================================
// 5. GET /api/partners/sunny-now
// ============================================================================
test.describe('GET /api/partners/sunny-now', () => {
  test('returns partner venues with current sun status', async ({ request }) => {
    const response = await request.get('/api/partners/sunny-now');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('venues');
    expect(Array.isArray(body.venues)).toBe(true);
    expect(body).toHaveProperty('timestamp');
  });

  test('response shape includes partner-specific fields', async ({ request }) => {
    const response = await request.get('/api/partners/sunny-now');
    const body = await response.json();

    if (body.venues.length > 0) {
      const venue = body.venues[0];
      expect(venue).toHaveProperty('id');
      expect(venue).toHaveProperty('name');
      expect(venue).toHaveProperty('slug');
      expect(venue).toHaveProperty('sunStatus');
      expect(venue).toHaveProperty('sunPercentage');
      expect(['Sunny', 'Partial']).toContain(venue.sunStatus);
      expect(venue.sunPercentage).toBeGreaterThanOrEqual(50);
    }
  });

  test('cache headers present', async ({ request }) => {
    const response = await request.get('/api/partners/sunny-now');
    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toBeDefined();
    expect(cacheControl).toContain('s-maxage=300');
  });
});

// ============================================================================
// 6. Health Endpoints
// ============================================================================
test.describe('Health Endpoints', () => {
  test('GET /api/health returns 200 with status ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.version).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  test('GET /api/health/ready returns valid status', async ({ request }) => {
    const response = await request.get('/api/health/ready');
    expect([200, 503]).toContain(response.status());
    const body = await response.json();
    expect(['ready', 'not_ready']).toContain(body.status);
    expect(body.timestamp).toBeDefined();
  });

  test('GET /api/health/live returns valid response', async ({ request }) => {
    const response = await request.get('/api/health/live');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('live');
    expect(body.timestamp).toBeDefined();
  });
});

// ============================================================================
// 7. Cron Endpoints Auth Tests
// ============================================================================
test.describe('Cron Endpoints Auth', () => {
  test('POST /api/cron/weather-ingestion without CRON_SECRET returns 401', async ({
    request,
  }) => {
    const response = await request.post('/api/cron/weather-ingestion');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  test('GET /api/cron/osm-ingestion without CRON_SECRET returns 401', async ({ request }) => {
    const response = await request.get('/api/cron/osm-ingestion');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  test('POST /api/cron/accuracy-metrics without CRON_SECRET returns 401', async ({
    request,
  }) => {
    const response = await request.post('/api/cron/accuracy-metrics');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  test('POST /api/cron/cache-warmup without CRON_SECRET returns 401', async ({ request }) => {
    const response = await request.post('/api/cron/cache-warmup');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });
});
