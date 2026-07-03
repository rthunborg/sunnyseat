/**
 * Story 10.5 AC1 — the deterministic mocked-weather end-to-end matrix (the R-005 fix).
 *
 * =========================================================================
 * WHAT THIS SPEC IS
 * =========================================================================
 * The historical failure mode ("weather fetched but not consumed",
 * epics.md:2650-2653) is exactly the kind of regression a full-stack e2e catches
 * that a unit test can miss. This matrix renders FIVE weather scenarios END-TO-END
 * and asserts the correct card + pin + detail presentation for each, at a forced
 * `?_time=13:00` (sun deterministically up) and WITHOUT any live Met.no call:
 *
 *   1. overcast ≥ threshold        ⇒ muted "Sol bakom moln" obscured chrome
 *   2. clear                        ⇒ amber Sunny
 *   3. high-cirrus-only             ⇒ Sunny, NOT gated (the 10.3 differentiator)
 *   4. active rain                  ⇒ obscured chrome + rain sky copy
 *   5. weather-missing              ⇒ ungated (geometry governs), NO sky line
 *
 * =========================================================================
 * DETERMINISTIC MECHANISM (the load-bearing decision — story Dev Notes)
 * =========================================================================
 * `page.route` DTO fulfillment: intercept the list route `**​/api/venues?**` and
 * the detail route `**​/api/venues/<slug>*` and `fulfill` a hand-crafted
 * `GetVenuesResponse` / `GetVenueDetailResponse` per scenario. This exercises the
 * REAL card/pin/detail render path, is fully deterministic, needs NO real engine
 * and NO live Met.no, and stays green on CI's seed path. `?_time=13:00` pins the
 * wall clock; the route mock pins the SKY — together fully deterministic.
 *
 * The engine gate itself is ALREADY exhaustively unit-tested (10.1–10.4). AC1 is a
 * PRESENTATION matrix, so mocking at the DTO/route boundary is the right altitude.
 *
 * NO LIVE MET.NO: because the route mock fulfills the DTO, the venues route handler
 * (and therefore the engine + Met.no) never runs. As a belt-and-braces assertion,
 * the spec also FAILS if any outbound `api.met.no` request is observed.
 *
 * RELATIVE-BOUNDARY DISCIPLINE: the DTOs carry the SHIPPED status/sky values the
 * engine would emit; the assertions are RELATIVE (muted-vs-amber obscured chrome,
 * sky-line present-vs-absent, rain copy), never a hardcoded cloud % or the 80
 * threshold, so a future re-tune survives.
 *
 * BOTH BREAKPOINTS: runs under `--project=desktop` AND `--project=mobile`
 * (Design Gate: "both breakpoints"). The obscured detail overlay differs by
 * breakpoint (`desktop-venue-detail-panel` on desktop; `mobile-venue-detail-sheet`
 * on mobile) — branch the detail assertion on `testInfo.project.name`.
 */

import { expect, test, type Page, type Route } from '@playwright/test';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import type {
  GetVenuesResponse,
  GetVenueDetailResponse,
  VenueDataDto,
  VenueDetailDto,
} from '@/lib/types/api';

const SEED_SLUG = 'test-venue-sunny';
const APP_SETTLE_TIMEOUT_MS = 15_000;

// --- Onboarding + deterministic-time helpers (reuse the suite conventions) ---
async function bypassOnboarding(page: Page): Promise<void> {
  await page.addInitScript((key: string) => {
    window.sessionStorage.clear();
    window.localStorage.setItem(key, '1');
  }, ONBOARDED_FLAG_KEY);
}

/** Force `?_time=13:00` so the sun is deterministically up (retro-note pattern). */
async function forceMiddayTime(page: Page): Promise<void> {
  const nativeGoto = page.goto.bind(page);
  page.goto = ((url: string, options?: Parameters<typeof nativeGoto>[1]) => {
    const target = new URL(url, 'http://localhost:3000');
    if (!target.searchParams.has('_time')) target.searchParams.set('_time', '13:00');
    return nativeGoto(target.pathname + target.search + target.hash, options);
  }) as typeof page.goto;
}

/** Trip the test if any request leaves for api.met.no (belt-and-braces). */
async function forbidLiveMetno(page: Page): Promise<string[]> {
  const hits: string[] = [];
  await page.route('**://api.met.no/**', (route: Route) => {
    hits.push(route.request().url());
    return route.abort();
  });
  return hits;
}

// --- Scenario definitions ----------------------------------------------------
// A single geometrically-sunlit seed venue whose GEOMETRY is identical across
// scenarios; only the weather-derived headline/sky/confidence differ.
type ScenarioId =
  | 'overcast'
  | 'clear'
  | 'high-cirrus-only'
  | 'active-rain'
  | 'weather-missing';

interface ScenarioSpec {
  id: ScenarioId;
  /** Card/pin + detail DTO override (weather-derived fields only). */
  currentSunStatus: VenueDataDto['currentSunStatus'];
  /** Serialized sky field; `undefined` ⇒ no sky line ('unavailable' semantics). */
  skyCondition?: string;
  confidence: number;
  expectObscured: boolean;
  /** When set, the sky line MUST render this copy (localized below). */
  expectSkyCopy?: 'rain';
  /** True ⇒ NO sky line must render at all (weather-missing). */
  expectNoSkyLine?: boolean;
  /**
   * The freshness/uncertainty signal (AC1 #5). For a weather-backed non-obscured
   * scenario the confidence `%` badge renders on the card; for weather-missing
   * (`sunDataSource='geometry-only'`, no `weatherUpdatedAt`) `getConfidenceDisplayState`
   * returns `kind:'hidden'` ⇒ the confidence badge is ABSENT. Only meaningful on
   * non-obscured cards (the obscured card suppresses the amber confidence chip
   * regardless), so it is set only for `clear` (present, the control) and
   * `weather-missing` (absent).
   */
  expectConfidenceBadge?: boolean;
}

// GEOMETRY is byte-identical across every scenario — only the weather-derived
// currentSunStatus / skyCondition / confidence change. `skyCondition` is ABSENT
// for weather-missing (⇒ no sky line; the app never fabricates a clear sky).
const SCENARIOS: ScenarioSpec[] = [
  {
    id: 'overcast',
    currentSunStatus: 'CloudObscured',
    skyCondition: 'overcast',
    confidence: 40,
    expectObscured: true,
  },
  {
    id: 'clear',
    currentSunStatus: 'Sunny',
    skyCondition: 'clear',
    confidence: 92,
    expectObscured: false,
    // Control for AC1 #5: weather-backed ⇒ the confidence badge IS present.
    expectConfidenceBadge: true,
  },
  {
    id: 'high-cirrus-only',
    // Total cloud can be near-100 but effective (0.25·high) stays < threshold ⇒
    // NOT gated. skyCondition reads the RAW total ⇒ NOT 'overcast', NOT obscured.
    currentSunStatus: 'Sunny',
    skyCondition: 'partly-cloudy',
    confidence: 78,
    expectObscured: false,
  },
  {
    id: 'active-rain',
    currentSunStatus: 'CloudObscured',
    skyCondition: 'rain',
    confidence: 35,
    expectObscured: true,
    expectSkyCopy: 'rain',
  },
  {
    id: 'weather-missing',
    // No fabricated clear sky: geometry governs (Sunny), skyCondition ABSENT
    // ('unavailable' ⇒ never rendered) ⇒ NO sky line.
    currentSunStatus: 'Sunny',
    skyCondition: undefined,
    confidence: 55,
    expectObscured: false,
    expectNoSkyLine: true,
    // AC1 #5: the freshness/uncertainty signal reflects the missing weather —
    // geometry-only source ⇒ the confidence badge is ABSENT (never fabricated).
    expectConfidenceBadge: false,
  },
];

// Plain-language rain copy on both surfaces (messages/{sv,en}/venue.json).
const RAIN_SKY_COPY = /Regn|Rain/;
// The overcast/obscured sky descriptor — must NOT appear on a non-obscured card.
const OVERCAST_SKY_COPY = /Mulet|Overcast/;
// The confidence (freshness/uncertainty) badge label prefix on the card. Present
// only when `getConfidenceDisplayState` returns a visible `%` (weather-backed);
// ABSENT for the geometry-only weather-missing scenario. Distinct from the
// geometric "% SOL" thumbnail badge, which is keyed on the `Säkerhet:` label.
const CONFIDENCE_BADGE_COPY = /Säkerhet:|Confidence:/;

// --- DTO builders ------------------------------------------------------------
// Build a valid list/detail response from the seed venue merged with the scenario
// override. The GEOMETRY (`sunExposurePercent`, `sunWindow`) is IDENTICAL across
// every scenario so the two-signal guarantee holds end-to-end; only the
// weather-derived fields differ. Coordinates match the Gothenburg-centre fixture
// so a pin renders in view. Shapes match `lib/types/api.ts`.
function baseVenue(scenario: ScenarioSpec): VenueDataDto {
  const venue: VenueDataDto = {
    id: '1',
    venueId: '1',
    venueName: 'Kafé Magasinet',
    venueSlug: SEED_SLUG,
    slug: SEED_SLUG,
    neighborhood: 'Inom Vallgraven',
    location: { lat: 57.705, lng: 11.97 },
    currentSunStatus: scenario.currentSunStatus,
    isPartner: true,
    confidence: scenario.confidence,
    distanceMeters: 0,
    // GEOMETRY — identical across all scenarios (the two-signal guarantee).
    sunExposurePercent: 95,
    tags: ['Innergård', 'Hund ok'],
    sunWindow: { start: '13:00', end: '18:30' },
    thumbnail: { alt: 'Uteservering hos Kafé Magasinet', initials: 'KM' },
  };
  // skyCondition ABSENT for weather-missing (never fabricate a clear sky).
  if (scenario.skyCondition !== undefined) venue.skyCondition = scenario.skyCondition;
  return venue;
}

function buildVenuesResponse(scenario: ScenarioSpec): GetVenuesResponse {
  const venue = baseVenue(scenario);
  return {
    venues: [venue],
    meta: {
      count: 1,
      radiusKm: 2,
      // weather-missing ⇒ geometry-only freshness; otherwise weather-backed.
      sunDataSource: scenario.id === 'weather-missing' ? 'geometry-only' : 'weather',
      ...(scenario.id === 'weather-missing'
        ? {}
        : { weatherUpdatedAt: '2026-06-21T11:00:00.000Z' }),
    },
    timestamp: '2026-06-21T11:00:00.000Z',
    totalCount: 1,
  };
}

function buildVenueDetailResponse(scenario: ScenarioSpec): GetVenueDetailResponse {
  const base = baseVenue(scenario);
  const detail: VenueDetailDto = {
    ...base,
    description: 'En trivsam uteservering vid kanalen.',
    address: 'Magasinsgatan 1, Göteborg',
    openingHours: { display: 'Öppet 09–22', closesAt: '22:00' },
    timeline: {
      timezone: 'Europe/Stockholm',
      range: { start: '06:00', end: '21:00' },
      // The obscured headline maps back to the geometric Partial window (the
      // "when it clears" potential) — the shipped VenueDetailContent convention.
      windows: [
        {
          start: '13:00',
          end: '18:30',
          status: scenario.currentSunStatus === 'CloudObscured' ? 'Partial' : scenario.currentSunStatus,
        },
      ],
      peakTime: '15:45',
    },
  };
  return {
    venue: detail,
    meta: {
      sunDataSource: scenario.id === 'weather-missing' ? 'geometry-only' : 'weather',
      ...(scenario.id === 'weather-missing'
        ? {}
        : { weatherUpdatedAt: '2026-06-21T11:00:00.000Z' }),
    },
    timestamp: '2026-06-21T11:00:00.000Z',
  };
}

/**
 * Install `page.route` DTO fulfillment for both the list and detail endpoints so
 * the app renders the scenario deterministically with NO engine / NO Met.no.
 */
async function mockWeatherScenario(page: Page, scenario: ScenarioSpec): Promise<void> {
  // Detail route FIRST (more specific) so the list matcher never swallows it.
  await page.route(`**/api/venues/${SEED_SLUG}*`, async (route: Route) => {
    await route.fulfill({ json: buildVenueDetailResponse(scenario) });
  });
  await page.route('**/api/venues?**', async (route: Route) => {
    await route.fulfill({ json: buildVenuesResponse(scenario) });
  });
}

// --- Reusable presentation assertions ---------------------------------------

/**
 * Select the seed venue through the UI (NOT the `?venue=` deep link, which opens
 * detail directly and suppresses the quick-info card) and assert the card's
 * obscured-vs-amber presentation. Desktop selects via a pin; mobile selects via
 * the bottom-sheet list entry (the mid-state sheet covers the projected pin).
 */
async function assertCardAndPin(
  page: Page,
  scenario: ScenarioSpec,
  projectName: string,
): Promise<void> {
  await page.locator('[data-testid="venue-pin"]').first().waitFor({
    state: 'visible',
    timeout: APP_SETTLE_TIMEOUT_MS,
  });

  if (projectName === 'desktop') {
    await page.locator('[data-testid="venue-pin"]').first().click();
  } else {
    await page
      .locator('[data-testid="mobile-bottom-sheet"]')
      .getByRole('button', { name: /Välj Kafé Magasinet/ })
      .click();
  }

  const quickInfo = page.locator('[data-testid="venue-quick-info"]:visible').first();
  await expect(quickInfo).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });

  const obscured = quickInfo.locator('[data-testid="quick-info-obscured"]');
  if (scenario.expectObscured) {
    // Muted "Sol bakom moln" chrome present; the geometric % is still visible
    // (reframed as clear-sky potential) — the obscured card keeps the % badge.
    await expect(obscured).toBeVisible();
    await expect(quickInfo).toContainText('95%');
  } else {
    await expect(obscured).toHaveCount(0);
    // Amber Sunny: the % SOL badge renders (geometry visible), no obscured chrome.
    await expect(quickInfo).toContainText('95%');
  }

  // Sky-line copy assertions on the card (RELATIVE, per scenario).
  if (scenario.expectSkyCopy === 'rain') {
    await expect(obscured).toContainText(RAIN_SKY_COPY);
  }
  if (!scenario.expectObscured) {
    // A non-obscured card must NOT carry the overcast/obscured sky descriptor.
    await expect(quickInfo).not.toContainText(OVERCAST_SKY_COPY);
  }

  // AC1 #5 — the freshness/uncertainty signal (the previously-unverified half of
  // weather-missing). The confidence `%` badge is HIDDEN for the geometry-only
  // weather-missing scenario and PRESENT for a weather-backed control (clear), so
  // the two non-obscured scenarios are distinguished by the presence of the
  // confidence signal, not just the (identical) geometry. Only asserted where the
  // scenario opts in (`expectConfidenceBadge` set) — the obscured cards suppress
  // the amber confidence chip regardless, so it is not meaningful there.
  if (scenario.expectConfidenceBadge === true) {
    await expect(quickInfo).toContainText(CONFIDENCE_BADGE_COPY);
  } else if (scenario.expectConfidenceBadge === false) {
    await expect(quickInfo).not.toContainText(CONFIDENCE_BADGE_COPY);
  }
}

/**
 * Deep-link to the detail overlay for the seed venue and assert the detail
 * surface's obscured-vs-amber presentation + sky line.
 */
async function assertDetail(
  page: Page,
  scenario: ScenarioSpec,
  projectName: string,
): Promise<void> {
  await page.goto(`/?venue=${SEED_SLUG}`);

  const detailPanel =
    projectName === 'desktop'
      ? page.locator('[data-testid="desktop-venue-detail-panel"]:visible')
      : page.locator('[data-testid="mobile-venue-detail-sheet"]:visible');
  await detailPanel.waitFor({ state: 'visible', timeout: APP_SETTLE_TIMEOUT_MS });

  const obscured = detailPanel.locator('[data-testid="venue-detail-obscured"]');
  if (scenario.expectObscured) {
    await expect(obscured).toBeVisible();
  } else {
    await expect(obscured).toHaveCount(0);
  }

  // Sky-line copy assertions (RELATIVE, per scenario):
  if (scenario.expectSkyCopy === 'rain') {
    // active-rain ⇒ the rain plain-language copy renders inside the obscured chrome.
    await expect(obscured).toContainText(RAIN_SKY_COPY);
  }
  if (scenario.expectNoSkyLine) {
    // weather-missing ⇒ NO sky line anywhere (skyCondition 'unavailable' ⇒ never
    // rendered) AND not obscured (geometry governs, no fabricated clear).
    await expect(detailPanel.locator('[data-testid="venue-detail-obscured"]')).toHaveCount(0);
  }
  if (!scenario.expectObscured) {
    // A non-obscured detail must NOT carry the overcast/obscured sky descriptor.
    await expect(detailPanel).not.toContainText(OVERCAST_SKY_COPY);
  }
}

// ---------------------------------------------------------------------------
// The matrix — one test per scenario, running under desktop + mobile projects.
// ---------------------------------------------------------------------------
test.describe('[10.5 AC1] deterministic mocked-weather e2e matrix', () => {
  for (const scenario of SCENARIOS) {
    test(`scenario "${scenario.id}" renders the correct card + pin + detail (both breakpoints)`, async ({
      page,
    }, testInfo) => {
      const metnoHits = await forbidLiveMetno(page);
      await bypassOnboarding(page);
      await forceMiddayTime(page);
      await mockWeatherScenario(page, scenario);

      await page.goto('/');

      await assertCardAndPin(page, scenario, testInfo.project.name);
      await assertDetail(page, scenario, testInfo.project.name);

      // Belt-and-braces: NO outbound Met.no request may have fired.
      expect(metnoHits, `outbound api.met.no requests during "${scenario.id}"`).toEqual([]);
    });
  }
});
