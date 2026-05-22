---
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-04-09'
workflowType: 'testarch-test-design'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - 'nextjs-app/docs/design/DESIGN.md'
---

# Test Design for QA: SunnySeat Front-End

> **Superseded for active MVP scope (2026-05-19):** This April test-design recipe still contains active premium/Swish/payment assumptions from the pre-correction plan. It is preserved as historical/Future Monetization input only. Use `_bmad-output/qa/mvp-test-design-scope-correction-2026-05-19.md` plus current `epics.md` story acceptance criteria for active MVP QA planning.

**Purpose:** Test execution recipe. Defines what to test, how to test it, and what infrastructure is needed.

**Date:** 2026-04-09
**Author:** TEA (Master Test Architect)
**Status:** Draft
**Project:** SunnySeat (Gothenburg)

**Related:** See Architecture doc (`test-design-architecture.md`) for testability concerns and blockers.

---

## Executive Summary

**Scope:** Full customer-facing front-end (Epics 8-11), 50 functional requirements, 37 non-functional requirements.

**Risk Summary:**
- Total Risks: 16 (2 high-priority >=6, 8 medium, 6 low)
- Critical Categories: PERF (MapLibre performance, bundle size, CLS), BUS (shadow accuracy, accessibility, geolocation)

**Coverage Summary:**
- P0 tests: ~19 (core journeys, API contracts, sun logic)
- P1 tests: ~28 (components, integration, premium flows)
- P2 tests: ~20 (secondary flows, UI components)
- P3 tests: ~17 (performance benchmarks, accessibility audits, PWA)
- **Total**: ~84 tests (~78-125 hours)

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Admin UI (Phase 2)** | Not designed yet — no UX resources | Admin APIs functional via direct API calls |
| **Push notifications** | Epic 9 scope, Web Push API — deferred | Manual testing when implemented |
| **Multi-city expansion** | Gothenburg-only for this PRD | N/A |
| **OSM ingestion pipeline** | Backend data operation, no frontend UI | Covered by existing backend tests |
| **Load/stress testing** | <=10K MAU at launch, Vercel auto-scales | Monitor via Vercel Analytics. Revisit at scale |

---

## Dependencies & Test Blockers

### Pre-Implementation Setup

1. **External service mocking** — Rasmus — Before first E2E test
   - **Decided:** Playwright `route.fulfill()` with fixture JSON files in `test/fixtures/` (per-service: `met-no.json`, `swish.json`, `maptiler.json`)
   - No MSW dependency — Playwright already in stack

2. **Time determinism** — Rasmus — Before first frontend test
   - **Decided:** `vi.useFakeTimers()` for unit/component tests. Precomputed fixture data for known dates (e.g., 2026-06-21 summer solstice) for E2E tests
   - Fixture files include expected sun states for specific venue + date combinations

3. **Database cleanup strategy** — Rasmus — Before mutating E2E tests
   - **Decided:** Unique `test-{uuid}` identifiers for all test-created data + cleanup via admin API in `afterEach`/`afterAll` hooks

### Test Infrastructure Setup

1. **Vitest configuration** — `vitest.config.ts` with React + jsdom, path aliases, coverage
2. **Playwright configuration** — `playwright.config.ts` with mobile (390x844) + desktop (1440x900) projects, base URL, Chromium
3. **Test fixtures** — Venue data factory, sun exposure fixtures for known dates, premium JWT factory
4. **CI pipeline** — GitHub Actions with Vitest, Playwright, Lighthouse, bundle analyzer

**Example test setup (Vitest + Testing Library):**

```typescript
// test/components/VenueCard.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { VenueCard } from '@/components/composed/VenueCard'
import { createVenueFixture } from '../fixtures/venue'

describe('VenueCard', () => {
  it('renders sunny venue with confidence and time range', () => {
    const venue = createVenueFixture({ sunStatus: 'sunny', confidence: 85 })
    render(<VenueCard venue={venue} />)

    expect(screen.getByText(venue.name)).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
  })
})
```

**Example E2E test (Playwright):**

```typescript
// test/e2e/sun-discovery.spec.ts
import { test, expect } from '@playwright/test'

test('@P0 map loads with amber pins after granting location', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 57.7089, longitude: 11.9746 })

  // Mock external APIs
  await page.route('**/api.met.no/**', route =>
    route.fulfill({ json: { properties: { timeseries: [{ data: { instant: { details: { cloud_area_fraction: 10 } } } }] } } })
  )

  await page.goto('/')
  await page.waitForSelector('[data-testid="map-loaded"]')

  const amberPins = page.locator('[data-testid="venue-pin-sunny"]')
  await expect(amberPins.first()).toBeVisible()
})
```

---

## Risk Assessment

Full risk details in Architecture doc. This section summarizes QA coverage per risk.

### High-Priority Risks (Score >=6)

| Risk ID | Category | Description | Score | QA Test Coverage |
|---------|----------|-------------|-------|-----------------|
| **R-01** | PERF | MapLibre performance on low-end Android | **6** | Lighthouse CI gate (mobile throttled). P3-PF-04: pin rendering benchmark. Manual device test pre-launch |
| **R-02** | BUS | Shadow accuracy trust erosion | **6** | P0-E-03: feedback flow E2E. P0-A-04: feedback API contract. P0-U-01/02: sun + confidence unit tests |

### Medium/Low-Priority Risks

| Risk ID | Category | Description | Score | QA Test Coverage |
|---------|----------|-------------|-------|-----------------|
| R-03 | OPS | Met.no API degradation | 4 | P1-E-07: mock Met.no failure, verify graceful degradation |
| R-04 | TECH | Swish payment complexity | 4 | P1-E-02/03: mobile + desktop Swish E2E. P0-A-05/06/07: payment API tests |
| R-05 | PERF | Bundle size breach | 4 | P3-PF-03: bundle <=400KB CI gate |
| R-06 | PERF | CLS from fonts | 4 | P3-PF-06: Lighthouse CLS <=0.1 |
| R-07 | BUS | Map accessibility | 4 | P3-AX-01 to P3-AX-07: axe-core + keyboard nav + screen reader |
| R-08 | TECH | Premium persistence loss | 4 | P1-E-04: premium recovery E2E |
| R-09 | BUS | Geolocation denial | 4 | P0-E-04: denied permission E2E |
| R-10 | TECH | Swish polling timeout | 4 | P2-E-07: payment failure E2E |
| R-11 to R-16 | Various | Low risks | 1-3 | Minimal or no dedicated tests — accepted |

---

## Entry Criteria

- [ ] Vitest + Playwright configured and running locally
- [ ] Test fixture factories created (venue, sun exposure, premium JWT)
- [ ] External service mock strategy implemented (MSW or route interception)
- [ ] CI pipeline running tests on PR
- [ ] Dev server running at `localhost:3000` for E2E tests

## Exit Criteria

- [ ] All P0 tests passing (100%)
- [ ] All P1 tests passing (>=95%)
- [ ] No open P0/P1 severity bugs
- [ ] Bundle size <=400KB gzipped
- [ ] Lighthouse Performance >=90, Accessibility >=95 (mobile)
- [ ] axe-core: zero critical/serious violations
- [ ] Visual validation passing for all implemented screens

---

## Test Coverage Plan

**IMPORTANT:** P0/P1/P2/P3 = **priority and risk level**, NOT execution timing. See "Execution Strategy" for when tests run.

### P0 (Critical)

**Criteria:** Blocks core functionality + High risk (>=6) + No workaround

| Test ID | Requirement | Test Level | Risk Link | Notes |
|---------|-------------|------------|-----------|-------|
| **P0-U-01** | Sun exposure classification (sunny/shaded) | Unit | R-02 | Verify existing 22 backend tests cover this |
| **P0-U-02** | Confidence score blending (geometric x weather) | Unit | R-02 | |
| **P0-U-03** | Sun window calculation (venue + date -> time ranges) | Unit | R-02 | |
| **P0-U-04** | Premium JWT encode/decode/verify | Unit | R-08 | `lib/services/premium-token.ts` |
| **P0-U-05** | Swish deep-link URL generation | Unit | R-04 | `lib/services/swish-client.ts` |
| **P0-U-06** | Pin classification (sun state + partner -> pin type) | Unit | R-01 | |
| **P0-A-01** | Venue search returns paginated results with sun state | API | — | `GET /api/venues` |
| **P0-A-02** | Venue search invalid params -> 400 + Zod error | API | — | |
| **P0-A-03** | Sun exposure returns state + confidence + ranges | API | R-02 | `GET /api/sun-exposure/venue/[id]` |
| **P0-A-04** | Feedback submission + duplicate rejection | API | R-02 | `POST /api/venues/[id]/feedback` |
| **P0-A-05** | Payment creation initiates Swish transaction | API | R-04 | `POST /api/payments/create` |
| **P0-A-06** | Payment status returns current state | API | R-10 | `GET /api/payments/status/[id]` |
| **P0-A-07** | Payment webhook idempotent | API | R-04 | `POST /api/payments/webhook` |
| **P0-A-08** | Premium recovery validates txn ID -> re-issues JWT | API | R-08 | `POST /api/payments/recover` |
| **P0-A-09** | Rate limiting returns 429 + Retry-After | API | — | Any endpoint >100 req/min |
| **P0-E-01** | "Sun Right Now" journey: onboarding -> map -> pins -> detail | E2E | R-01, R-02 | Mobile + Desktop |
| **P0-E-02** | "The Redirect": compare multiple nearby venues | E2E | — | Mobile |
| **P0-E-03** | Feedback flow: venue detail -> "Var det soligt?" -> confirm | E2E | R-02 | Mobile |
| **P0-E-04** | Geolocation denied -> Gothenburg fallback -> venues visible | E2E | R-09 | Mobile |

**Total P0:** ~19 tests

---

### P1 (High)

**Criteria:** Important features + Medium risk (3-4) + Common workflows

| Test ID | Requirement | Test Level | Risk Link | Notes |
|---------|-------------|------------|-----------|-------|
| **P1-U-01** | Time slider value <-> time conversion | Unit | — | |
| **P1-U-02** | Venue distance calculation (haversine) | Unit | — | |
| **P1-U-03** | Favourites localStorage CRUD | Unit | — | |
| **P1-U-04** | QR code payload for desktop Swish | Unit | R-04 | |
| **P1-U-05** | Weather staleness detection (>2hr -> cap confidence) | Unit | R-03 | |
| **P1-U-06** | i18n locale resolution chain | Unit | — | |
| **P1-C-01** | VenueCard: sunny, shaded, partner, skeleton | Component | — | |
| **P1-C-02** | SunTimeline: full sun, partial, no sun, multi-window | Component | — | |
| **P1-C-03** | TimeSlider: scrubbing, boundaries | Component | — | |
| **P1-C-04** | FeedbackPrompt: question, Ja/Nej, confirmation | Component | — | |
| **P1-C-05** | PremiumPaywall: free user vs premium user | Component | — | |
| **P1-C-06** | PaymentStatus: pending, processing, success, failed, timeout | Component | R-10 | |
| **P1-C-07** | VenueDetail: loaded, skeleton, error | Component | — | |
| **P1-C-08** | OnboardingScreen: initial, granted, denied | Component | R-09 | |
| **P1-C-09** | MobileBottomSheet: peek, expanded, full, drag | Component | — | |
| **P1-C-10** | SearchCombobox: typing, results, no-match | Component | — | |
| **P1-A-01** | Future sun exposure (premium) + non-premium rejection | API | — | |
| **P1-A-02** | Review submission creates review | API | — | |
| **P1-A-03** | Reviews list paginated | API | — | |
| **P1-A-04** | Partner sunny-now returns sunny partners | API | — | |
| **P1-A-05** | Health endpoint returns 200 | API | — | |
| **P1-E-01** | Time slider scrubbing updates pin colours | E2E | — | Mobile |
| **P1-E-02** | Swish purchase (mobile): upsell -> paywall -> deep-link -> premium unlocked | E2E | R-04 | Mobile |
| **P1-E-03** | Swish purchase (desktop): paywall -> QR -> premium unlocked | E2E | R-04 | Desktop |
| **P1-E-04** | Premium recovery: clear data -> enter txn ID -> premium restored | E2E | R-08 | Mobile |
| **P1-E-05** | Venue detail (desktop): side panel -> overlay -> sun timeline | E2E | — | Desktop |
| **P1-E-06** | Review submission: write -> submit -> appears in list | E2E | — | Mobile |
| **P1-E-07** | Met.no degradation: mock failure -> capped confidence -> staleness indicator | E2E | R-03 | Mobile |

**Total P1:** ~28 tests

---

### P2 (Medium)

**Criteria:** Secondary features + Low risk + Edge cases

| Test ID | Requirement | Test Level | Risk Link | Notes |
|---------|-------------|------------|-----------|-------|
| **P2-C-01** | SwishQRCode renders valid QR | Component | R-04 | |
| **P2-C-02** | ReviewCard renders review content | Component | — | |
| **P2-C-03** | PremiumPlanner: date picker (premium) or upsell (free) | Component | — | |
| **P2-C-04** | PartnerBadge: Golden Pin + SOL NU | Component | — | |
| **P2-C-05** | RouteButton: distance/ETA, opens native maps | Component | — | |
| **P2-C-06** | ShareButton: navigator.share or fallback | Component | — | |
| **P2-C-07** | MapControls: zoom, locate-me interactive | Component | — | |
| **P2-C-08** | DesktopNavBar: logo, search, time slider | Component | — | |
| **P2-C-09** | MobileNavBar: 40px, active/inactive tabs | Component | — | |
| **P2-C-10** | Error boundary: catch -> fallback + reload | Component | — | |
| **P2-E-01** | Routing: "Visa Rutt" opens external maps | E2E | — | Mobile |
| **P2-E-02** | Favourites: save -> return -> saved venue present | E2E | — | Mobile |
| **P2-E-03** | Share: tap share -> native dialog | E2E | — | Mobile |
| **P2-E-04** | About page renders with data sources | E2E | — | Mobile + Desktop |
| **P2-E-05** | 404 page: invalid route -> friendly 404 -> link to map | E2E | — | Mobile |
| **P2-E-06** | Partner venue: Golden Pin + SOL NU when sunny | E2E | — | Mobile |
| **P2-E-07** | Payment failure: mock Swish failure -> error screen -> retry | E2E | R-04 | Mobile |
| **P2-E-08** | Premium date picker: select future date -> pins update | E2E | — | Mobile |
| **P2-E-09** | Search: type name -> results -> select -> map centers | E2E | — | Desktop |
| **P2-E-10** | Auto-refresh: 5-min -> sun states refresh | E2E | — | Mobile |

**Total P2:** ~20 tests

---

### P3 (Low)

**Criteria:** Nice-to-have + Benchmarks + Accessibility audits

| Test ID | Requirement | Test Level | Notes |
|---------|-------------|------------|-------|
| **P3-PF-01** | Lighthouse Performance >=90 (mobile, 4G) | Perf | CI gate |
| **P3-PF-02** | Lighthouse Accessibility >=95 | Perf | CI gate |
| **P3-PF-03** | Bundle size <=400KB gzipped | Perf | CI gate |
| **P3-PF-04** | Map pin rendering 50 venues <=100ms | Perf | Benchmark |
| **P3-PF-05** | LCP <=2.5s on simulated 4G | Perf | Via Lighthouse |
| **P3-PF-06** | CLS <=0.1 across all pages | Perf | Via Lighthouse |
| **P3-AX-01** | axe-core: zero critical/serious on map view | A11y | CI gate |
| **P3-AX-02** | axe-core: zero critical/serious on venue detail | A11y | CI gate |
| **P3-AX-03** | Keyboard navigation: all controls + venue list + detail | A11y | |
| **P3-AX-04** | Screen reader: venue list announces names, sun, distance | A11y | |
| **P3-AX-05** | Colour contrast: amber on cream meets 4.5:1 | A11y | |
| **P3-AX-06** | prefers-reduced-motion disables animations | A11y | |
| **P3-AX-07** | Pin shape differentiation (not colour-only) | A11y | |
| **P3-M-01** | PWA installability: Lighthouse PWA >=90 | E2E | |
| **P3-M-02** | Offline shell: loads offline, shows "no connection" | E2E | |
| **P3-M-03** | Deep-link URL state restores venue + time | E2E | |
| **P3-M-04** | Language switching SV <-> EN | E2E | |

**Total P3:** ~17 tests

---

## Execution Strategy

**Philosophy:** Run everything in PRs if <15 minutes. Defer only expensive or long-running suites. Playwright parallelization keeps E2E suites fast — 25+ tests in under 5 minutes.

### Every PR: Vitest + Playwright (~12 min)

- **Vitest** (~3 min): All unit tests (P0-U, P1-U) + all component tests (P1-C, P2-C)
- **Playwright** (~5 min): P0 E2E tests (4 journeys, mobile viewport)
- **Playwright API** (~2 min): All API contract tests (P0-A, P1-A)
- **Bundle analyzer** (~30s): Assert <=400KB gzipped
- **tsc --noEmit** (~30s): Zero type errors
- **ESLint** (~30s): Zero errors

### On Merge to Main (~25 min)

All PR tests plus:
- **Playwright** (~8 min): P1 + P2 E2E tests, both mobile + desktop viewports
- **axe-core** (~2 min): Accessibility scan on map view + venue detail
- **Lighthouse CI** (~3 min): Performance >=90, Accessibility >=95, CLS <=0.1

### Weekly

- Full P3 suite: PWA, offline shell, deep-link, language switching
- Cross-browser smoke: Chrome + Safari + Firefox (manual or BrowserStack)
- Pin rendering benchmark on throttled connection

---

## QA Effort Estimate

| Priority | Count | Effort Range | Notes |
|----------|-------|-------------|-------|
| P0 | ~19 | ~20-30 hours | API contracts, 2 viewport E2E journeys, sun logic unit tests |
| P1 | ~28 | ~25-40 hours | 10 component tests, 7 E2E with mock setup (Swish, Met.no) |
| P2 | ~20 | ~15-25 hours | 10 component + 10 secondary E2E flows |
| P3 | ~17 | ~8-15 hours | Lighthouse/axe config, PWA/offline tests, mostly CI setup |
| Infrastructure | — | ~10-15 hours | Vitest config, Playwright config, MSW setup, fixtures, CI pipeline |
| **Total** | **~84** | **~78-125 hours** | **Solo developer, tests written alongside story implementation** |

**Timeline:** ~2-3 weeks of dedicated QA effort (spread across story implementation, not a separate phase).

**Assumptions:**
- Tests written incrementally per story (not as a separate phase)
- Existing 22 backend tests provide partial P0-U coverage
- Test infrastructure (fixtures, mocks) amortized across all tests

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope | Validation |
|-------------------|--------|-----------------|------------|
| **Backend APIs (Epics 1-7)** | Front-end consumes all existing endpoints | 22 existing sun/shadow tests must pass on every PR | Run existing test suite in CI |
| **Supabase (PostGIS)** | Venue data, feedback, reviews, payments stored | Database schema unchanged — no migration regression risk | API contract tests validate response shapes |
| **Vercel deployment** | Auto-deploy on push to main | Preview deployments for PRs enable visual review | Lighthouse CI on preview URLs |

---

## Appendix A: Code Examples & Tagging

**Vitest tags for selective execution:**

```typescript
// Unit test
describe('sun-classification @P0 @Unit', () => {
  it('classifies venue as sunny when solar altitude > threshold', () => { ... })
})

// Component test
describe('VenueCard @P1 @Component', () => {
  it('renders sunny state with confidence percentage', () => { ... })
})
```

**Playwright tags:**

```typescript
// E2E test
test('@P0 @E2E sun discovery journey', async ({ page }) => { ... })
test('@P1 @E2E @Premium swish mobile purchase', async ({ page }) => { ... })
```

**Run specific priorities:**

```bash
# Vitest: run P0 unit tests only
npx vitest run --grep "@P0"

# Playwright: run P0 E2E only
npx playwright test --grep "@P0"

# Playwright: run mobile viewport only
npx playwright test --project=mobile
```

---

## Appendix B: Knowledge Base References

- **Risk Governance**: `risk-governance.md` — Risk scoring (P x I), gate decisions, traceability
- **Test Levels Framework**: `test-levels-framework.md` — Unit/integration/E2E selection
- **Test Quality**: `test-quality.md` — No hard waits, <300 lines, <1.5 min, explicit assertions
- **ADR Readiness**: `adr-quality-readiness-checklist.md` — 8-category, 29-criteria testability framework

---

**Generated by:** BMad TEA Agent
**Workflow:** `bmad-testarch-test-design`
