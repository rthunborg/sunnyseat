import { test, expect } from '@playwright/test';

/**
 * CandidateCard Component E2E Tests
 *
 * CandidateCard is shown for unverified venues (verification_status === 0).
 * It allows users to confirm the venue exists via POST /api/venues/[id]/confirm.
 */

const GOTHENBURG_LAT = 57.7089;
const GOTHENBURG_LNG = 11.9746;

/** Helper: find a valid venue ID from the venues API */
async function getKnownVenueId(request: import('@playwright/test').APIRequestContext): Promise<string | null> {
  const res = await request.get(
    `/api/venues?lat=${GOTHENBURG_LAT}&lng=${GOTHENBURG_LNG}&radiusKm=3`
  );
  if (!res.ok()) return null;
  const body = await res.json();
  return body.venues?.[0]?.venueId ?? body.venues?.[0]?.id ?? null;
}

test.describe('CandidateCard — Venue Confirm API', () => {
  test('POST /api/venues/[id]/confirm returns confirmation data for known venue', async ({
    request,
  }) => {
    const venueId = await getKnownVenueId(request);
    test.skip(!venueId, 'No venues in database');

    const response = await request.post(`/api/venues/${venueId}/confirm`);
    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body).toHaveProperty('confirmed', true);
    expect(body).toHaveProperty('totalConfirmations');
    expect(typeof body.totalConfirmations).toBe('number');
    expect(body.totalConfirmations).toBeGreaterThanOrEqual(1);
  });

  test('confirm is idempotent — multiple calls succeed', async ({ request }) => {
    const venueId = await getKnownVenueId(request);
    test.skip(!venueId, 'No venues in database');

    const res1 = await request.post(`/api/venues/${venueId}/confirm`);
    expect(res1.status()).toBe(200);
    const body1 = await res1.json();

    const res2 = await request.post(`/api/venues/${venueId}/confirm`);
    expect(res2.status()).toBe(200);
    const body2 = await res2.json();

    expect(body2.totalConfirmations).toBeGreaterThanOrEqual(body1.totalConfirmations);
  });

  test('confirm nonexistent venue returns 404', async ({ request }) => {
    const response = await request.post('/api/venues/999999/confirm');
    expect(response.status()).toBe(404);
  });
});

test.describe('CandidateCard — Component Rendering', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('candidate cards (if present) have proper ARIA role', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: GOTHENBURG_LAT, longitude: GOTHENBURG_LNG });

    await page.goto('/');
    await page.locator('[role="application"]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(5000);

    // All venue-related cards (both VenueCard and CandidateCard) use role="article"
    const allArticles = page.locator('[role="article"]');
    const count = await allArticles.count();

    if (count > 0) {
      // Every card-like element should have an aria-label
      for (let i = 0; i < Math.min(count, 5); i++) {
        const article = allArticles.nth(i);
        const ariaLabel = await article.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel!.length).toBeGreaterThan(0);
      }
    }
  });
});
