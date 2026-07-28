import { expect, test, type Page, type Route } from '@playwright/test';
import { FIRST_RUN_GUIDE_SEEN_KEY, ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import type { GetVenuesResponse, VenueDataDto, VenueDaySeriesEntry, VenueSunStatus } from '@/lib/types/api';

type WeatherGateState = 'gated' | 'not_gated' | 'unknown';
type StoryStep = VenueDaySeriesEntry & { weatherGateState: WeatherGateState };
type StoryVenue = VenueDataDto & {
  weatherGateState: WeatherGateState;
  sunDaySeries: StoryStep[];
};

type VenueSpec = {
  id: string;
  name: string;
  exposure: number;
  gate: WeatherGateState;
  status: VenueSunStatus;
  offset: number;
};

const SPECS: VenueSpec[] = [
  { id: 'low-partial', name: 'Lag partial', exposure: 40, gate: 'not_gated', status: 'Partial', offset: 0 },
  { id: 'exact-fifty', name: 'Exakt femtio', exposure: 50, gate: 'not_gated', status: 'Partial', offset: 0.001 },
  { id: 'over-fifty', name: 'Precis over', exposure: 51, gate: 'not_gated', status: 'Partial', offset: 0.002 },
  { id: 'gated-high', name: 'Molngatad hog', exposure: 95, gate: 'gated', status: 'CloudObscured', offset: 0.003 },
  { id: 'unknown-high', name: 'Okant vader', exposure: 80, gate: 'unknown', status: 'Sunny', offset: 0.004 },
];
const STORY_BASE_URL = process.env.STORY_12_6_E2E_BASE_URL ?? '';

function venue(spec: VenueSpec): StoryVenue {
  return {
    id: spec.id,
    venueId: spec.id,
    venueName: spec.name,
    venueSlug: spec.id,
    slug: spec.id,
    neighborhood: 'Centrum',
    location: { lat: 57.7089 + spec.offset, lng: 11.9746 + spec.offset },
    currentSunStatus: spec.status,
    weatherGateState: spec.gate,
    isPartner: false,
    confidence: spec.id === 'over-fifty' ? 1 : 99,
    distanceMeters: 100 + spec.offset * 1000,
    sunExposurePercent: spec.exposure,
    skyCondition: spec.gate === 'unknown' ? 'unavailable' : spec.gate === 'gated' ? 'overcast' : 'clear',
    tags: [],
    sunDaySeries: [
      {
        minutes: 14 * 60,
        sunExposurePercent: spec.exposure,
        currentSunStatus: spec.status,
        weatherGateState: spec.gate,
        skyCondition: spec.gate === 'unknown' ? 'unavailable' : spec.gate === 'gated' ? 'overcast' : 'clear',
      },
    ],
  };
}

function response(): GetVenuesResponse {
  return {
    venues: SPECS.map(venue),
    meta: { count: SPECS.length, radiusKm: 3, sunDataSource: 'geometry-only' },
    timestamp: '2026-07-18T12:00:00.000Z',
    totalCount: SPECS.length,
  } as GetVenuesResponse;
}

async function arrangeMap(page: Page): Promise<string[]> {
  const metnoHits: string[] = [];
  await page.addInitScript(
  ({ onboardedKey, guideSeenKey }) => {
    window.sessionStorage.clear();
    window.localStorage.setItem(onboardedKey, '1');
    window.localStorage.setItem(guideSeenKey, '1');
  },
  { onboardedKey: ONBOARDED_FLAG_KEY, guideSeenKey: FIRST_RUN_GUIDE_SEEN_KEY },
);
  await page.route('**://api.met.no/**', (route: Route) => {
    metnoHits.push(route.request().url());
    return route.abort();
  });
  await page.route(/\/api\/venues(?:\?.*)?$/, async (route: Route) => {
    await route.fulfill({ json: response() });
  });
  await page.goto(`${STORY_BASE_URL}/?_time=14:00`);
  await expect(page.getByTestId('venue-pin')).toHaveCount(SPECS.length, { timeout: 15_000 });
  return metnoHits;
}

async function pinSnapshot(pin: ReturnType<Page['getByRole']>) {
  return pin.evaluate((button) => ({
    aria: button.getAttribute('aria-label'),
    state: button.getAttribute('data-pin-state'),
    text: button.textContent,
    icon: button.querySelector('[data-pin-icon]')?.getAttribute('data-pin-icon'),
    tail: button.querySelector('[data-pin-tail]') !== null,
  }));
}

test.describe('Story 12.6 - deterministic public-sun pin journey', () => {
  test('[P0] renders the 40/50/51/gated/unknown matrix honestly on mobile and desktop', async ({ page }) => {
    const metnoHits = await arrangeMap(page);
    const low = page.getByRole('button', { name: /Lag partial.*inte soligt vid vald tid/i });
    const exact = page.getByRole('button', { name: /Exakt femtio.*inte soligt vid vald tid/i });
    const gated = page.getByRole('button', { name: /Molngatad hog.*inte soligt vid vald tid/i });
    const over = page.getByRole('button', { name: /Precis over.*soligt vid vald tid.*51/i });
    const unknown = page.getByRole('button', { name: /Okant vader.*soligt vid vald tid.*80.*v.der.*(saknas|otillg.nglig|ok.nt)/i });

    for (const grey of [low, exact, gated]) {
      await expect(grey).toBeVisible();
      await expect(grey).not.toContainText(/\d+%/);
      await expect(grey.locator('[data-pin-icon="cloud"]')).toHaveCount(1);
      expect(await grey.evaluate((button) => button.querySelector('.bg-pin-shaded') !== null)).toBe(true);
    }

    for (const amber of [over, unknown]) {
      await expect(amber).toBeVisible();
      await expect(amber.locator('[data-pin-icon="sun"]')).toHaveCount(1);
      const box = await amber.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      await expect(amber).not.toHaveAccessibleName(/s.kerhet|confidence/i);
    }

    expect(metnoHits).toEqual([]);
  });

  test('[P0] selection preserves the same amber semantic shape and marker root', async ({ page }) => {
    await arrangeMap(page);
    const pin = page.getByRole('button', { name: /Precis over.*soligt vid vald tid.*51/i });
    await expect(pin).toBeVisible();
    const handle = await pin.elementHandle();
    const before = await pinSnapshot(pin);

    await pin.click({ force: true });

    await expect(pin).toBeVisible();
    expect(await handle!.evaluate((element) => element.isConnected)).toBe(true);
    expect(await pinSnapshot(pin)).toEqual(before);
  });
});
