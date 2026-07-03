/**
 * ATDD RED-PHASE scaffold — Story 10.5 AC1: the deterministic mocked-weather
 * end-to-end matrix (the R-005 fix).
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
 * `page.route` DTO fulfillment (RECOMMENDED default): intercept the list route
 * `**​/api/venues*` and the detail route `**​/api/venues/*` and `fulfill` a
 * hand-crafted `GetVenuesResponse` / `GetVenueDetailResponse` per scenario with
 * the fields the render surfaces branch on (`currentSunStatus`, `skyCondition`,
 * `sunExposurePercent`, `sunWindow`, `confidence`, freshness meta). This exercises
 * the REAL card/pin/detail render path, is fully deterministic, needs NO real
 * engine and NO live Met.no, and stays green on CI's seed path. `?_time=13:00`
 * pins the wall clock; the route mock pins the SKY — together fully deterministic.
 *
 * The engine gate itself is ALREADY exhaustively unit-tested (10.1–10.4). AC1 is a
 * PRESENTATION matrix, so mocking at the DTO/route boundary is the right altitude.
 *
 * NO LIVE MET.NO: because the route mock fulfills the DTO, the venues route handler
 * (and therefore the engine + Met.no) never runs. As a belt-and-braces assertion,
 * the spec also FAILS if any outbound `api.met.no` request is observed.
 *
 * =========================================================================
 * RED-PHASE STATUS
 * =========================================================================
 * `test.describe.skip`-gated. The DTO-mock helpers below are scaffolds the DEV
 * fleshes out against the exact `VenueDataDto` / `VenueDetailDto` shape
 * (`lib/types/api.ts`) and the exact render `data-testid`s. Un-skip once the
 * scenario DTOs + assertions are complete; each scenario should render correctly
 * against the SHIPPED surfaces (this is a verification story — the surfaces exist).
 *
 * RELATIVE-BOUNDARY DISCIPLINE: assert RELATIVE presentation (muted-vs-amber,
 * sky-line-present-vs-absent, obscured-testid present-vs-absent), NEVER a hardcoded
 * cloud % or the 80 threshold, so a future re-tune survives.
 *
 * BOTH BREAKPOINTS: run under `--project=desktop` AND `--project=mobile`
 * (Design Gate: "both breakpoints"). The obscured detail overlay differs by
 * breakpoint (`desktop-venue-detail-panel` on desktop; the mobile sheet on
 * mobile) — branch the detail assertion on `testInfo.project.name`.
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

// --- Scenario DTO builders (DEV: match lib/types/api.ts exactly) -------------
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
  /** Card/pin DTO override for the venues list response. */
  venue: Partial<VenueDataDto>;
  /** Detail DTO override for the venue detail response. */
  detail: Partial<VenueDetailDto>;
  expectObscured: boolean;
}

// DEV: flesh out `venue`/`detail` from the fixture shape (venues-fixture.ts) +
// lib/types/api.ts. The GEOMETRY fields (sunExposurePercent, sunWindow) MUST be
// identical across every scenario — only currentSunStatus / skyCondition /
// confidence change. Keep skyCondition ABSENT for weather-missing (⇒ no sky line).
const SCENARIOS: ScenarioSpec[] = [
  {
    id: 'overcast',
    venue: { currentSunStatus: 'CloudObscured', skyCondition: 'overcast', confidence: 40 },
    detail: { currentSunStatus: 'CloudObscured', skyCondition: 'overcast', confidence: 40 },
    expectObscured: true,
  },
  {
    id: 'clear',
    venue: { currentSunStatus: 'Sunny', skyCondition: 'clear', confidence: 92 },
    detail: { currentSunStatus: 'Sunny', skyCondition: 'clear', confidence: 92 },
    expectObscured: false,
  },
  {
    id: 'high-cirrus-only',
    // Total cloud can be near-100 but effective (0.25·high) stays < threshold ⇒
    // NOT gated. skyCondition reads the RAW total ⇒ NOT 'overcast', NOT obscured.
    venue: { currentSunStatus: 'Sunny', skyCondition: 'partly-cloudy', confidence: 78 },
    detail: { currentSunStatus: 'Sunny', skyCondition: 'partly-cloudy', confidence: 78 },
    expectObscured: false,
  },
  {
    id: 'active-rain',
    venue: { currentSunStatus: 'CloudObscured', skyCondition: 'rain', confidence: 35 },
    detail: { currentSunStatus: 'CloudObscured', skyCondition: 'rain', confidence: 35 },
    expectObscured: true,
  },
  {
    id: 'weather-missing',
    // No fabricated clear sky: geometry governs (Sunny), skyCondition ABSENT
    // ('unavailable' ⇒ never rendered) ⇒ NO sky line. Freshness/uncertainty
    // signal should reflect the missing weather (DEV: set meta accordingly).
    venue: { currentSunStatus: 'Sunny', skyCondition: undefined, confidence: 55 },
    detail: { currentSunStatus: 'Sunny', skyCondition: undefined, confidence: 55 },
    expectObscured: false,
  },
];

/**
 * Install `page.route` DTO fulfillment for both the list and detail endpoints so
 * the app renders the scenario deterministically with NO engine / NO Met.no.
 * DEV: build the full `GetVenuesResponse` / `GetVenueDetailResponse` bodies from
 * the fixture (the seed venue) merged with the scenario override, so the response
 * deserializes cleanly and the geometry stays identical across scenarios.
 */
async function mockWeatherScenario(page: Page, scenario: ScenarioSpec): Promise<void> {
  await page.route('**/api/venues?**', async (route: Route) => {
    const body = buildVenuesResponse(scenario); // DEV: implement
    await route.fulfill({ json: body });
  });
  await page.route('**/api/venues*', async (route: Route) => {
    // List route WITHOUT query string (defensive — some callers omit params).
    if (route.request().url().includes(`/api/venues/${SEED_SLUG}`)) return route.fallback();
    const body = buildVenuesResponse(scenario);
    await route.fulfill({ json: body });
  });
  await page.route(`**/api/venues/${SEED_SLUG}*`, async (route: Route) => {
    const body = buildVenueDetailResponse(scenario); // DEV: implement
    await route.fulfill({ json: body });
  });
}

// DEV STUBS — implement against lib/types/api.ts + venues-fixture.ts. Left as
// throwing stubs so the red scaffold cannot silently pass with an empty body.
function buildVenuesResponse(_scenario: ScenarioSpec): GetVenuesResponse {
  throw new Error('DEV: build GetVenuesResponse from the seed fixture + scenario override');
}
function buildVenueDetailResponse(_scenario: ScenarioSpec): GetVenueDetailResponse {
  throw new Error('DEV: build GetVenueDetailResponse from the seed fixture + scenario override');
}

// --- Reusable presentation assertions ---------------------------------------
async function assertCardAndPin(page: Page, scenario: ScenarioSpec): Promise<void> {
  await page.locator('[data-testid="venue-pin"]').first().waitFor({ state: 'visible' });
  // Select the seed venue to reveal the quick-info card.
  await page.goto(`/?venue=${SEED_SLUG}`);
  await page.locator('[data-testid="venue-quick-info"]:visible').waitFor({ state: 'visible' });

  const obscured = page.locator('[data-testid="quick-info-obscured"]:visible');
  if (scenario.expectObscured) {
    // Muted "Sol bakom moln" chrome present; the geometric % is still reframed
    // as clear-sky potential (retro: obscured surface keeps the % visible).
    await expect(obscured).toBeVisible();
  } else {
    await expect(obscured).toHaveCount(0);
  }
}

async function assertDetail(
  page: Page,
  scenario: ScenarioSpec,
  projectName: string,
): Promise<void> {
  await page.goto(`/?venue=${SEED_SLUG}`);
  // DEV: on desktop the detail overlay is `desktop-venue-detail-panel`; on mobile
  // it is the mobile sheet. Branch the wait accordingly.
  const detailPanel =
    projectName === 'desktop'
      ? page.locator('[data-testid="desktop-venue-detail-panel"]:visible')
      : page.locator('[data-testid="venue-detail-panel"]:visible');
  await detailPanel.waitFor({ state: 'visible', timeout: APP_SETTLE_TIMEOUT_MS });

  const obscured = page.locator('[data-testid="venue-detail-obscured"]:visible');
  if (scenario.expectObscured) {
    await expect(obscured).toBeVisible();
  } else {
    await expect(obscured).toHaveCount(0);
  }

  // Sky-line copy assertions (RELATIVE, per scenario):
  //  - active-rain ⇒ the rain plain-language copy ("Regn" / "Rain") renders
  //  - weather-missing ⇒ NO sky line at all (skyCondition 'unavailable' ⇒ never rendered)
  //  - high-cirrus-only ⇒ if a sky line renders it is NOT the overcast/obscured copy
  // DEV: assert against the sky-line data-testid/copy the 10.2 surface uses.
}

// ---------------------------------------------------------------------------
// The matrix — one test per scenario, running under desktop + mobile projects.
// ---------------------------------------------------------------------------
test.describe.skip('[10.5 AC1] deterministic mocked-weather e2e matrix', () => {
  for (const scenario of SCENARIOS) {
    test(`scenario "${scenario.id}" renders the correct card + pin + detail (both breakpoints)`, async ({
      page,
    }, testInfo) => {
      const metnoHits = await forbidLiveMetno(page);
      await bypassOnboarding(page);
      await forceMiddayTime(page);
      await mockWeatherScenario(page, scenario);

      await page.goto('/');

      await assertCardAndPin(page, scenario);
      await assertDetail(page, scenario, testInfo.project.name);

      // Belt-and-braces: NO outbound Met.no request may have fired.
      expect(metnoHits, `outbound api.met.no requests during "${scenario.id}"`).toEqual([]);
    });
  }
});
