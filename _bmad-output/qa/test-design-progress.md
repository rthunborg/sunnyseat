---
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-04-09'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - 'nextjs-app/docs/design/DESIGN.md'
  - '_bmad-output/planning-artifacts/epics/'
  - '.claude/scripts/visual-validate.sh'
  - '.claude/scripts/sprint-status-gate.sh'
  - '.claude/scripts/epic-done.sh'
  - '.claude/skills/test-gate/SKILL.md'
  - '.claude/skills/visual-validation/SKILL.md'
  - '.claude/skills/frontend-component/SKILL.md'
  - '.claude/skills/bmad-story-brief/SKILL.md'
  - 'knowledge/adr-quality-readiness-checklist.md'
  - 'knowledge/test-levels-framework.md'
  - 'knowledge/risk-governance.md'
  - 'knowledge/test-quality.md'
---

# Test Design Progress — SunnySeat

> **Superseded for active MVP scope (2026-05-19):** This progress log was generated against PRD v3.0 and still treats premium/Swish/payment tests as active. It remains useful as historical TEA context and Future Monetization input, but active MVP QA planning now uses `_bmad-output/qa/mvp-test-design-scope-correction-2026-05-19.md`, PRD v3.1, and current `epics.md`.

## Step 1: Mode Detection & Prerequisites

**Mode:** System-Level Test Design

**Rationale:** Full system-level artifacts available — PRD v3.0, Architecture Decision Document, UX Design Specification, DESIGN.md, 11 epics, 62+ Figma references.

### Prerequisites Verified

| Artifact | Path | Status |
|----------|------|--------|
| PRD v3.0 | `_bmad-output/planning-artifacts/prd.md` | Complete (50 FRs, 37 NFRs) |
| Architecture | `_bmad-output/planning-artifacts/architecture.md` | Complete (8 steps) |
| UX Design Spec | `_bmad-output/planning-artifacts/ux-design-specification.md` | Complete |
| Design System | `nextjs-app/docs/design/DESIGN.md` | Complete (tokens, components, patterns) |
| Epics | `_bmad-output/planning-artifacts/epics/` | 11 epics defined |
| Screen references | `nextjs-app/docs/design/references/screens/` | 21 PNGs (13 mobile, 8 desktop) |
| Component references | `nextjs-app/docs/design/references/components/` | 41+ PNGs |

### Existing Test Infrastructure

| Asset | Type | Notes |
|-------|------|-------|
| `visual-validate.sh` | Script | Claude API vision-based screenshot comparison against Figma refs |
| `sprint-status-gate.sh` | Script | PreToolUse hook blocking `review` transitions until visual validation passes |
| `epic-done.sh` | Script | Manual review checkpoint after all stories in an epic pass |
| `test-gate` skill | Policy | Defines test requirements: type check, lint, unit/integration, visual validation |
| `visual-validation` skill | Policy | Documents the screenshot comparison system and PASS/FAIL criteria |
| `frontend-component` skill | Policy | Enforces design-system-first development with Figma reference reads |
| `bmad-story-brief` skill | Policy | Story format, acceptance criteria structure, definition of done |
| Vitest | Test runner | Installed, no test files yet |
| Playwright | E2E runner | Installed, no test files yet |
| 22 sun/shadow engine tests | Existing | Backend Epics 1-7 (retained) |

### Project State

- Backend Epics 1-7: Complete and deployed (Vercel/Supabase)
- Front-end: Cleared for rebuild — `app/`, `components/`, front-end tests all removed
- Sprint status: No active sprint. Epic 8 (front-end) and Epic 9 (growth) not started
- Old QA test strategy (`qa-test-strategy.md`): Outdated (Sept 2025, .NET references). To be superseded.

## Step 2: Context & Knowledge Loaded

**Stack detected:** fullstack (Next.js 16+ App Router + Supabase backend)
**Config:** All TEA flags default (no `.bmad-config`). Playwright Utils, Pact.js, browser automation — all disabled.
**Knowledge loaded:** adr-quality-readiness-checklist, test-levels-framework, risk-governance, test-quality

---

## Step 3: Testability & Risk Assessment

### Testability Review

#### 1. Controllability (State Seeding, Mockability, Fault Injection)

| Criterion | Status | Evidence | Gap/Action |
|-----------|--------|----------|------------|
| API-accessible business logic | ✅ Covered | All 50 FRs backed by REST API routes (`/api/venues`, `/api/sun-exposure`, `/api/payments`, etc.) | N/A |
| State seeding via API | ✅ Covered | Existing Supabase RPCs + admin API routes can seed venues, sun data, feedback | Production APIs usable for test setup; no dedicated test-data endpoint needed due to admin routes |
| External service mockability | ⚠️ Gap | Met.no weather API, Swish payment API, MapTiler tiles — three external dependencies with no mock layer | **ACTIONABLE:** Need MSW (Mock Service Worker) or similar for network-level mocking in E2E tests |
| Premium state injection | ✅ Covered | JWT in localStorage — directly injectable in test setup. Server-signed but test can craft tokens for UI-only tests | For premium API calls, tests need server-issued tokens or mock the verification endpoint |
| Fault injection | ⚠️ Gap | No circuit breaker or fault-injection mechanism for testing degraded states (Met.no down, Swish timeout, stale weather) | **ACTIONABLE:** Design test scenarios that intercept/mock API responses to simulate failures |
| Geolocation control | ✅ Covered | Playwright `geolocation` context option provides deterministic location. Architecture has Gothenburg centrum fallback for denied permission | N/A |
| Time control | ⚠️ Gap | Sun calculations are time-dependent. Tests need deterministic "now" for reproducible sun states | **ACTIONABLE:** Tests should use fixed timestamps + precomputed sun data fixtures, or mock Date.now() |

#### 2. Observability (Logs, Metrics, Traces, Deterministic Assertions)

| Criterion | Status | Evidence | Gap/Action |
|-----------|--------|----------|------------|
| API response freshness headers | ✅ Covered | `X-Weather-Updated-At` and `X-Sun-Data-Source` in API responses — assertable in integration tests | N/A |
| Core Web Vitals | ✅ Covered | Vercel Analytics tracks LCP, INP, CLS. Lighthouse CI planned as merge gate | N/A |
| Bundle size monitoring | ✅ Covered | `@next/bundle-analyzer` listed as dev dependency. 400KB budget defined | CI gate needed (not yet configured) |
| Error tracking | ⚠️ Gap | Vercel Analytics only at launch. No structured error logging. Sentry deferred | **FYI:** Acceptable for launch, but limits test-time error assertion capability |
| Accessibility audit | ✅ Covered | axe-core + eslint-plugin-jsx-a11y planned. WCAG 2.1 AA target. CI gate defined in architecture | N/A |
| Visual regression | ✅ Covered | `visual-validate.sh` uses Claude API vision comparison against Figma PNGs. Sprint-status gate enforces on story completion | Unique project-specific asset — strong visual QA |

#### 3. Reliability (Isolation, Reproducibility, Parallel Safety)

| Criterion | Status | Evidence | Gap/Action |
|-----------|--------|----------|------------|
| Stateless architecture | ✅ Covered | Serverless (Vercel), no server-side session state. All client state in localStorage/sessionStorage | N/A |
| Zero PII | ✅ Covered | No user accounts, no personal data stored. IP hashed for rate limiting only | Clean isolation — no user-scoped test data pollution |
| Client state isolation | ✅ Covered | localStorage (favourites, premium JWT), sessionStorage (feedback, language). Easily cleared between tests | N/A |
| Database isolation | ⚠️ Gap | Supabase shared database. No per-test schema isolation or transaction rollback strategy documented | **ACTIONABLE:** E2E tests that mutate data (feedback, reviews) need cleanup strategy. API tests should use unique identifiers and clean up after |
| Weather data non-determinism | ⚠️ Gap | Met.no data refreshes every 5 minutes. Real API calls in tests produce non-deterministic confidence scores | **ACTIONABLE:** Mock weather API in tests. Use fixtures for deterministic weather states |
| Precomputed sun data | ✅ Covered | Sun exposure data is precomputed daily. For a given venue+time, result is deterministic within the day | Reliable for testing — fixture a specific date's precomputed data |
| Parallel test safety | ✅ Covered | Stateless API, no shared mutable state on server. Client tests use isolated browser contexts (Playwright default) | N/A |

---

### Architecturally Significant Requirements (ASRs)

| # | ASR | Type | Test Implication |
|---|-----|------|-----------------|
| ASR-1 | **Map-as-persistent-canvas** — MapLibre never unmounted, all UI overlays map | ACTIONABLE | E2E tests must handle map initialization wait, pin rendering assertions, overlay interaction on top of live map. Component tests cannot isolate map-dependent components without MapLibre mock or stub |
| ASR-2 | **Dual viewport architecture** — Mobile bottom-sheet + drag vs Desktop side-panel + overlay | ACTIONABLE | Every frontend E2E test must run at both mobile (390×844) and desktop (1440×900) viewports. Component tests need viewport-aware fixtures |
| ASR-3 | **400KB JS budget** — Hard constraint (MapLibre ~200KB, React/Next ~90KB, app ~40KB, motion ~15KB) | ACTIONABLE | CI merge gate: `@next/bundle-analyzer` output must be asserted ≤400KB gzipped. Every new dependency evaluated against budget |
| ASR-4 | **Premium JWT without accounts** — Session-based, server-signed, localStorage-persisted | ACTIONABLE | Test premium flows: purchase → JWT issued → stored → verified on premium API calls. Test recovery flow (transaction ID lookup). Test expiry handling |
| ASR-5 | **Visual validation gate** — `sprint-status-gate.sh` blocks story completion on visual diff failure | FYI | Already enforced by infrastructure. Test design should account for this existing gate — not duplicate its coverage |
| ASR-6 | **5-minute auto-refresh cycle** — TanStack Query stale time for venue/sun data | ACTIONABLE | Integration tests for: stale data display, background refetch, staleness indicator when weather data >2 hours old |
| ASR-7 | **WCAG 2.1 AA compliance** — All customer-facing screens | ACTIONABLE | axe-core in CI (zero critical/serious violations). Keyboard navigation tests for all interactive elements. ARIA live regions for sun state updates. Focus management across sheet transitions |
| ASR-8 | **Swish dual payment flow** — Mobile deep-link (`swish://`) vs Desktop QR code | ACTIONABLE | Two distinct E2E paths. Mobile: deep-link generation + polling for confirmation. Desktop: QR render + polling. Both: timeout handling, failure recovery |
| ASR-9 | **Emotional design fidelity** — Warm amber palette, frosted glass, sun-tinted shadows are brand identity | FYI | Visual validation gate (ASR-5) covers this. Design token compliance enforced by `frontend-component` skill |
| ASR-10 | **Custom font loading** — Plus Jakarta Sans + Manrope via next/font | ACTIONABLE | CLS test: fonts must load without layout shift >0.1. Lighthouse CI gate covers this. Verify `display: 'swap'` + `size-adjust` |

---

### Risk Assessment Matrix

#### HIGH Risk (Score ≥ 6) — Require Mitigation

| ID | Risk | Cat | P | I | Score | Mitigation | Owner | Timeline |
|----|------|-----|---|---|-------|------------|-------|----------|
| R-01 | **MapLibre GL JS performance on low-end Android** — 60fps target may not hold on budget 2022 Android devices with 50+ venue pins | PERF | 2 | 3 | **6** | Pin clustering when >50 venues. Test on real budget Android device (BrowserStack/manual). Lighthouse mobile throttling in CI. Fallback: reduce pin detail at low zoom | Dev (Rasmus) | Before Epic 8 story that renders map pins |
| R-02 | **Shadow accuracy trust erosion** — derived open-data shadow casters, missing caster coverage, or unmodelled trees/awnings/bridges produce incorrect predictions. One bad experience and user trust collapses | BUS | 2 | 3 | **6** | Complete Epic 3 Prelude shadow-data trust stories before Story 3.1. Runtime uses filtered active casters only. High confidence requires cluster spot-check gates: 10 checks/cluster, 70+ central checks, 3 sun conditions, about 85-90% obvious building-shadow agreement. Feedback flow ("Var det soligt?") surfaces bad venues and time windows. | Dev (Rasmus) | Before Epic 3 feature work resumes |

#### MEDIUM Risk (Score 4–5) — Monitor, Test Coverage Required

| ID | Risk | Cat | P | I | Score | Mitigation |
|----|------|-----|---|---|-------|------------|
| R-03 | **External API degradation** — Met.no down or slow degrades confidence scores, stale weather indicators shown | OPS | 2 | 2 | 4 | Graceful degradation designed (sun predictions without weather). Test: mock Met.no failure → verify capped confidence + staleness UI |
| R-04 | **Swish payment flow failure** — Complex dual-flow (mobile deep-link + desktop QR), external API dependency, 5-min polling timeout | TECH | 2 | 2 | 4 | Swish test environment for development. Mock Swish API in E2E. Test: timeout → clear error + retry. Test: webhook idempotency |
| R-05 | **Bundle size budget breach** — MapLibre ~200KB leaves only ~200KB for everything else. Motion, cmdk, next-intl, TanStack Query all add up | PERF | 2 | 2 | 4 | `@next/bundle-analyzer` CI gate. Code-split all non-map features. Async-load MapLibre. Test: CI rejects PR if >400KB |
| R-06 | **CLS from custom font loading** — Two Google Fonts (Plus Jakarta Sans + Manrope). Swap strategy may cause layout shift | PERF | 2 | 2 | 4 | next/font self-hosts with `display: 'swap'` + automatic `size-adjust`. Test: Lighthouse CLS ≤0.1 in CI |
| R-07 | **Accessibility on map-heavy SPA** — MapLibre canvas inherently inaccessible. Complex overlays (sheets, modals) need careful focus management | BUS | 2 | 2 | 4 | axe-core CI gate. Keyboard navigation tests. ARIA labels on all non-text interactive elements. Screen reader test for venue list/detail. Pin differentiation by shape, not just colour |
| R-08 | **Premium persistence loss** — User clears browser data or switches device, loses premium status | TECH | 2 | 2 | 4 | Recovery flow via Swish transaction ID lookup. Test: clear localStorage → recovery form → re-issued JWT → premium restored |
| R-09 | **Geolocation denial** — User denies location permission. Default Gothenburg centrum fallback must work | BUS | 2 | 2 | 4 | Fallback designed in architecture. Test: deny geolocation → map centers on default → venues still discoverable |
| R-10 | **Swish payment status polling timeout** — 5-minute timeout for payment confirmation. Race between Swish app and polling | TECH | 2 | 2 | 4 | Clear "payment not confirmed" message + retry option. Test: simulate timeout → verify error state + retry button |

#### LOW Risk (Score 1–3) — Accept, Minimal Testing

| ID | Risk | Cat | P | I | Score | Notes |
|----|------|-----|---|---|-------|-------|
| R-11 | Weather data staleness | DATA | 1 | 3 | 3 | Met.no generally reliable. Staleness indicator + capped confidence designed. Low probability |
| R-12 | Rate limiting under sunny-day 5x spikes | PERF | 1 | 3 | 3 | Vercel auto-scaling + Supabase connection pooling. Precomputed data reduces load. Low probability at ≤10K MAU |
| R-13 | Cross-browser PWA install inconsistencies | TECH | 2 | 1 | 2 | iOS Safari PWA quirks. Nice-to-have, not core. Manual testing sufficient |
| R-14 | Visual regression between Figma updates and code | TECH | 1 | 2 | 2 | Visual validation gate catches this automatically |
| R-15 | Premium JWT forgery | SEC | 1 | 2 | 2 | Server-signed JWT with signature verification on premium API calls. Difficult to forge |
| R-16 | i18n missing translations | BUS | 1 | 1 | 1 | Swedish-first, small translation surface. TypeScript key references catch missing keys at build time |

---

### Risk Summary

**2 HIGH risks** require active mitigation and dedicated test coverage:
1. **R-01 MapLibre performance** — Performance testing on constrained devices is critical. CI Lighthouse gate + manual device testing before launch.
2. **R-02 Shadow accuracy trust** — The product's moat depends on prediction accuracy. Feedback flow testing and accuracy reporting validation are P0.

**8 MEDIUM risks** require test coverage but have designed mitigations:
- External API failures (R-03, R-04) — Mock-based testing for graceful degradation paths
- Performance budget (R-05, R-06) — CI gates (bundle size, Lighthouse CLS)
- Accessibility (R-07) — axe-core CI gate + keyboard navigation E2E tests
- Premium persistence (R-08, R-10) — Recovery flow E2E test + timeout handling
- Geolocation (R-09) — Denied-permission E2E test path

**6 LOW risks** accepted with minimal testing.

---

## Step 4: Coverage Plan & Execution Strategy

### Coverage Matrix

Test level selection follows `test-levels-framework.md`: Unit for pure logic, API for endpoint contracts, Component for isolated UI, E2E for critical user journeys only. No duplicate coverage across levels.

---

#### P0 — Core Functionality (Blocks launch if failing)

**P0-UNIT: Pure Logic**

| ID | Scenario | Level | FRs/Risks | File Target |
|----|----------|-------|-----------|-------------|
| P0-U-01 | Sun exposure classification: given solar altitude + shadow intersection → sunny/shaded state | Unit | FR7, R-02 | `lib/solar/` (existing 22 tests — verify coverage) |
| P0-U-02 | Confidence score blending: geometric certainty × weather cloud cover → final percentage | Unit | FR12, R-02 | `lib/solar/` or `lib/weather/` |
| P0-U-03 | Sun window calculation: given venue + date → array of {start, end, confidence} time ranges | Unit | FR8 | `lib/solar/` |
| P0-U-04 | Premium JWT encode/decode: create token with txn ID + activation + expiry, verify signature | Unit | FR22, R-08 | `lib/services/premium-token.ts` |
| P0-U-05 | Swish deep-link URL generation: given amount + payee → valid `swish://` URI | Unit | FR23 | `lib/services/swish-client.ts` |
| P0-U-06 | Pin classification logic: venue sun state + partner status → pin type (amber/grey/golden) | Unit | FR1, FR27 | Pin rendering utility |

**P0-API: Endpoint Contracts**

| ID | Scenario | Level | FRs/Risks | Endpoint |
|----|----------|-------|-----------|----------|
| P0-A-01 | Venue search returns paginated results with sun state for given lat/lng/radius | API | FR1, FR2 | `GET /api/venues` |
| P0-A-02 | Venue search with invalid params returns 400 + Zod error details | API | FR1 | `GET /api/venues` |
| P0-A-03 | Sun exposure for venue returns current state + confidence + time ranges | API | FR7, FR8 | `GET /api/sun-exposure/venue/[id]` |
| P0-A-04 | Feedback submission accepts valid payload, rejects duplicate from same session | API | FR17 | `POST /api/venues/[id]/feedback` |
| P0-A-05 | Payment creation initiates Swish transaction, returns payment ID for polling | API | FR22, R-04 | `POST /api/payments/create` |
| P0-A-06 | Payment status returns current state (pending/completed/failed/expired) | API | FR24, R-10 | `GET /api/payments/status/[id]` |
| P0-A-07 | Payment webhook processes callback idempotently (duplicate = no side effect) | API | FR24, R-04 | `POST /api/payments/webhook` |
| P0-A-08 | Premium recovery validates Swish txn ID → re-issues JWT for valid, current-season purchase | API | FR25, R-08 | `POST /api/payments/recover` |
| P0-A-09 | Rate limiting returns 429 + Retry-After header when threshold exceeded | API | NFR12 | Any endpoint at >100 req/min |

**P0-E2E: Critical User Journeys**

| ID | Scenario | Level | Journeys/FRs | Viewports |
|----|----------|-------|-------------|-----------|
| P0-E-01 | **"Sun Right Now" (Lina):** Onboarding → grant location → map loads → amber pins visible → tap pin → quick-info card → tap for detail → sun timeline visible | E2E | Journey 1, FR1-FR8, FR46 | Mobile + Desktop |
| P0-E-02 | **"The Redirect" (Erik):** Map loaded → multiple amber pins nearby → tap venue A → see details → back to map → tap venue B → compare | E2E | Journey 2, FR5, FR14 | Mobile |
| P0-E-03 | **Feedback flow:** View venue detail → "Var det soligt?" prompt → tap Ja/Nej → confirmation | E2E | FR17, FR18, R-02 | Mobile |
| P0-E-04 | **Geolocation denied:** Deny location permission → map centers on Gothenburg centrum → venues still visible and interactive | E2E | FR6, R-09 | Mobile |

---

#### P1 — Critical Paths + Medium/High Risk

**P1-UNIT: Business Logic**

| ID | Scenario | Level | FRs/Risks |
|----|----------|-------|-----------|
| P1-U-01 | Time slider value ↔ time conversion (slider position → HH:MM, HH:MM → slider position) | Unit | FR9 |
| P1-U-02 | Venue distance calculation from user position (haversine) | Unit | FR2 |
| P1-U-03 | Favourites localStorage: add, remove, list, persist across sessions | Unit | FR31 |
| P1-U-04 | QR code payload generation for desktop Swish payment | Unit | FR23 |
| P1-U-05 | Weather staleness detection: data age > 2 hours → cap confidence | Unit | NFR34, R-03 |
| P1-U-06 | i18n locale resolution chain: URL param → sessionStorage → navigator.language → SV default | Unit | Architecture |

**P1-COMPONENT: UI Component Isolation**

| ID | Scenario | Level | Component | States Tested |
|----|----------|-------|-----------|---------------|
| P1-C-01 | VenueCard renders with sun status, name, distance, confidence, time range | Component | VenueCard.tsx | Sunny, shaded, partner, loading skeleton |
| P1-C-02 | SunTimeline renders correctly for different sun window arrays | Component | SunTimeline.tsx | Full sun, partial sun, no sun, multiple windows |
| P1-C-03 | TimeSlider allows scrubbing, updates displayed time, respects min/max | Component | TimeSlider.tsx | Default, dragging, at boundaries |
| P1-C-04 | FeedbackPrompt shows question, handles Ja/Nej tap, shows confirmation | Component | FeedbackPrompt.tsx | Initial, submitted-yes, submitted-no |
| P1-C-05 | PremiumPaywall renders upsell card with Swish CTA, blocks premium features | Component | PremiumPaywall.tsx | Free user, premium user |
| P1-C-06 | PaymentStatus renders all payment states correctly | Component | PaymentStatus.tsx | Pending, processing, success, failed, timeout |
| P1-C-07 | VenueDetail renders full venue info including all sections | Component | VenueDetail.tsx | Loaded, loading skeleton, error |
| P1-C-08 | OnboardingScreen renders branded splash, triggers location permission request | Component | OnboardingScreen.tsx | Initial, permission-granted, permission-denied |
| P1-C-09 | MobileBottomSheet supports peek/expanded/full states with drag gesture | Component | MobileBottomSheet.tsx | Peek, expanded, full, dragging |
| P1-C-10 | SearchCombobox filters venues by name, handles empty results | Component | SearchCombobox.tsx | Empty, typing, results, no-match |

**P1-API: Integration Points**

| ID | Scenario | Level | FRs/Risks |
|----|----------|-------|-----------|
| P1-A-01 | Future sun exposure (premium) returns predictions for selected date + rejects non-premium JWT | API | FR10, FR11 |
| P1-A-02 | Review submission creates review, returns created review with ID | API | FR20 |
| P1-A-03 | Reviews list for venue returns paginated results | API | FR19 |
| P1-A-04 | Partner sunny-now returns currently-sunny partner venues | API | FR28 |
| P1-A-05 | Health endpoint returns 200 with system status | API | Ops |

**P1-E2E: Critical Paths**

| ID | Scenario | Level | FRs/Risks | Viewports |
|----|----------|-------|-----------|-----------|
| P1-E-01 | **Time slider scrubbing:** Move slider → pin colours update (some become amber, some grey) | E2E | FR9 | Mobile |
| P1-E-02 | **Swish purchase (mobile):** Tap upsell → paywall → tap "Betala med Swish" → deep-link generated → mock payment success → premium unlocked | E2E | FR22-FR24, R-04 | Mobile |
| P1-E-03 | **Swish purchase (desktop):** Paywall → QR code rendered → mock payment success → premium unlocked | E2E | FR22-FR24, R-04 | Desktop |
| P1-E-04 | **Premium recovery:** Clear localStorage → open recovery form → enter valid txn ID → premium restored | E2E | FR25, R-08 | Mobile |
| P1-E-05 | **Venue detail (desktop):** Click venue in side panel → 390px detail overlay opens → sun timeline + info + route button visible | E2E | FR14, ASR-2 | Desktop |
| P1-E-06 | **Review submission:** Open venue detail → write review → submit → review appears in list | E2E | FR19, FR20 | Mobile |
| P1-E-07 | **Met.no degradation:** Mock weather API failure → app still shows sun predictions → confidence capped → staleness indicator visible | E2E | R-03, NFR34 | Mobile |

---

#### P2 — Secondary Flows + Low/Medium Risk

**P2-COMPONENT:**

| ID | Scenario | Level | Component |
|----|----------|-------|-----------|
| P2-C-01 | SwishQRCode renders valid QR image for given payment payload | Component | SwishQRCode.tsx |
| P2-C-02 | ReviewCard renders review with author, date, text | Component | ReviewCard.tsx |
| P2-C-03 | PremiumPlanner renders date picker (premium) or upsell (free) | Component | PremiumPlanner.tsx |
| P2-C-04 | PartnerBadge renders Golden Pin styling and SOL NU badge | Component | PartnerBadge.tsx |
| P2-C-05 | RouteButton renders with distance/ETA, opens native maps on tap | Component | RouteButton.tsx |
| P2-C-06 | ShareButton invokes navigator.share API (or fallback) | Component | ShareButton.tsx |
| P2-C-07 | MapControls (zoom, locate-me) render and are interactive | Component | MapControls.tsx |
| P2-C-08 | DesktopNavBar renders logo, search, time slider correctly | Component | DesktopNavBar.tsx |
| P2-C-09 | MobileNavBar renders 40px bar with active/inactive tab states | Component | MobileNavBar.tsx |
| P2-C-10 | Error boundary catches render error → friendly fallback + reload | Component | Error boundary |

**P2-E2E:**

| ID | Scenario | Level | FRs/Risks | Viewports |
|----|----------|-------|-----------|-----------|
| P2-E-01 | **Routing:** Tap "Visa Rutt" → external maps app opens with venue coordinates | E2E | FR15, FR16 | Mobile |
| P2-E-02 | **Favourites:** Save venue → navigate away → return → saved venue in favourites | E2E | FR31 | Mobile |
| P2-E-03 | **Share:** Tap share button → native share dialog invoked (or fallback) | E2E | FR35 | Mobile |
| P2-E-04 | **About page:** Navigate to /about → content renders with data sources and accuracy info | E2E | FR47 | Mobile + Desktop |
| P2-E-05 | **404 page:** Navigate to invalid route → friendly 404 → link back to map works | E2E | FR48 | Mobile |
| P2-E-06 | **Partner venue visibility:** Partner venue shows Golden Pin + SOL NU badge when sunny | E2E | FR27, FR28 | Mobile |
| P2-E-07 | **Payment failure:** Mock Swish failure → error screen renders → retry button works | E2E | FR26, R-04 | Mobile |
| P2-E-08 | **Premium date picker:** After purchase → select future date → pin states update for that date | E2E | FR10, FR11 | Mobile |
| P2-E-09 | **Search:** Type venue name → results appear → select → map centers on venue | E2E | FR3 | Desktop |
| P2-E-10 | **Auto-refresh:** After 5 minutes → venue sun states refresh without user action | E2E | FR13, ASR-6 | Mobile |

---

#### P3 — Nice-to-Have, Benchmarks, Exploratory

**P3-PERF: Performance Benchmarks**

| ID | Scenario | Level | NFRs |
|----|----------|-------|------|
| P3-PF-01 | Lighthouse Performance score ≥ 90 (mobile, 4G throttled) | Perf | NFR2-NFR4 |
| P3-PF-02 | Lighthouse Accessibility score ≥ 95 | Perf | NFR22 |
| P3-PF-03 | Bundle size ≤ 400KB gzipped (total JS) | Perf | NFR8, R-05 |
| P3-PF-04 | Map pin rendering for 50 venues completes within 100ms | Perf | NFR6, R-01 |
| P3-PF-05 | LCP ≤ 2.5s on simulated 4G | Perf | NFR2 |
| P3-PF-06 | CLS ≤ 0.1 across all pages (font loading, dynamic content) | Perf | NFR4, R-06 |

**P3-A11Y: Accessibility**

| ID | Scenario | Level | NFRs |
|----|----------|-------|------|
| P3-AX-01 | axe-core scan: zero critical/serious violations on map view | A11y | NFR22, R-07 |
| P3-AX-02 | axe-core scan: zero critical/serious violations on venue detail | A11y | NFR22 |
| P3-AX-03 | Keyboard navigation: tab through all map controls, venue list, detail sheet | A11y | NFR23 |
| P3-AX-04 | Screen reader: venue list announces venue names, sun status, distance | A11y | NFR24 |
| P3-AX-05 | Colour contrast: amber text on cream backgrounds meets 4.5:1 ratio | A11y | NFR25 |
| P3-AX-06 | Reduced motion: `prefers-reduced-motion` disables sheet transitions and animations | A11y | NFR26 |
| P3-AX-07 | Pin shape differentiation: sunny vs shaded distinguishable without colour (sun icon present) | A11y | NFR27 |

**P3-MISC:**

| ID | Scenario | Level | FRs |
|----|----------|-------|-----|
| P3-M-01 | PWA installability: Lighthouse PWA score ≥ 90 | E2E | FR49, NFR |
| P3-M-02 | Offline shell: app shell loads when offline, shows "no connection" message | E2E | FR50 |
| P3-M-03 | Deep-link URL state: `/?venue=slug&t=14:30` restores correct venue + time on load | E2E | Architecture |
| P3-M-04 | Language switching: toggle SV ↔ EN → all UI text updates | E2E | Architecture |

---

### Coverage Summary

| Priority | Unit | Component | API | E2E | Perf/A11y | Total |
|----------|------|-----------|-----|-----|-----------|-------|
| P0 | 6 | 0 | 9 | 4 | 0 | **19** |
| P1 | 6 | 10 | 5 | 7 | 0 | **28** |
| P2 | 0 | 10 | 0 | 10 | 0 | **20** |
| P3 | 0 | 0 | 0 | 4 | 13 | **17** |
| **Total** | **12** | **20** | **14** | **25** | **13** | **84** |

---

### Execution Strategy

**On PR (target: <12 minutes):**
- All Unit tests (P0-P1-P2) — Vitest, ~30 seconds
- All Component tests (P0-P1-P2) — Vitest + Testing Library, ~2 minutes
- All API tests (P0-P1) — Vitest + supertest or Playwright API, ~3 minutes
- P0 E2E tests (4 journeys, mobile viewport only) — Playwright, ~5 minutes
- Bundle size assertion — `@next/bundle-analyzer`, ~30 seconds
- TypeScript type check — `tsc --noEmit`, ~30 seconds
- ESLint — ~30 seconds

**On merge to main (nightly equivalent, target: <25 minutes):**
- Everything from PR gate
- All P1 E2E tests (7 scenarios, both viewports) — ~8 minutes
- All P2 E2E tests (10 scenarios) — ~5 minutes
- axe-core accessibility scan (P3-AX-01, P3-AX-02) — ~2 minutes
- Lighthouse Performance + Accessibility audit — ~3 minutes

**Weekly (manual or scheduled):**
- Full P3 suite including PWA, offline, deep-link, language, colour contrast
- MapLibre pin rendering benchmark (P3-PF-04) on throttled connection
- Cross-browser smoke test (Chrome, Safari, Firefox) — manual or BrowserStack

---

### Resource Estimates

| Priority | Test Count | Estimated Effort |
|----------|-----------|-----------------|
| P0 | 19 tests | ~20–30 hours (critical paths, API contracts, 2 E2E journeys with both viewports) |
| P1 | 28 tests | ~25–40 hours (10 component tests, 7 E2E scenarios, mock setup for weather/Swish) |
| P2 | 20 tests | ~15–25 hours (10 component + 10 E2E secondary flows) |
| P3 | 17 tests | ~8–15 hours (performance benchmarks, a11y scans, PWA/offline, mostly config) |
| **Infrastructure** | CI config, mock setup, fixtures | ~10–15 hours (Vitest config, Playwright config, MSW setup, test fixtures, CI pipeline) |
| **Total** | **84 tests** | **~78–125 hours** |

**Timeline:** P0 tests written alongside Epic 8 stories (each story's tests are part of the story). P1 follows immediately. P2 in parallel with Epic 9. P3 before production launch.

---

### Quality Gates

| Gate | Threshold | Enforcement |
|------|-----------|-------------|
| P0 pass rate | **100%** — all P0 tests must pass | PR merge blocked |
| P1 pass rate | **≥95%** — at most 1 P1 failure tolerated with documented reason | PR merge blocked (nightly gate for full P1 suite) |
| P2 pass rate | **≥90%** | Nightly — failures tracked, not blocking |
| Type check | **0 errors** — `tsc --noEmit` | PR merge blocked (PostToolUse hook also enforces per-write) |
| Lint | **0 errors** | PR merge blocked (PostToolUse hook auto-fixes) |
| Bundle size | **≤400KB gzipped** | PR merge blocked |
| Lighthouse Performance | **≥90** (mobile) | Merge to main gate |
| Lighthouse Accessibility | **≥95** | Merge to main gate |
| axe-core | **0 critical/serious violations** | Merge to main gate |
| Visual validation | **PASS** per screen | Sprint-status gate (existing `sprint-status-gate.sh`) |
| High-risk mitigations | R-01, R-02 addressed before launch | Manual review gate (`epic-done.sh`) |

---

### Existing Infrastructure Integration

The coverage plan builds on SunnySeat's existing test infrastructure:

| Existing Asset | How Coverage Plan Uses It |
|---------------|--------------------------|
| `sprint-status-gate.sh` | Visual validation for frontend stories (enforces P0 visual fidelity per story) |
| `visual-validate.sh` | Called by gate — compares implementation screenshots against Figma PNGs |
| `epic-done.sh` | Manual review checkpoint after all stories pass — enforces high-risk review |
| `test-gate` skill | Defines per-story test requirements (type check + lint + tests + visual) — each story's tests contribute to coverage plan |
| `frontend-component` skill | Enforces design token compliance during development — prevents visual regression at source |
| `bmad-story-brief` skill | Story acceptance criteria map directly to test scenarios — traceability from story → test |
| 22 existing backend tests | Cover P0-U-01 through P0-U-03 partially — verify and extend as needed |

---

## Step 5: Generate Outputs & Validate

**Status:** COMPLETE

### Output Files Generated

| Document | Path | Lines |
|----------|------|-------|
| Architecture Concerns | `_bmad-output/qa/test-design-architecture.md` | ~194 |
| QA Execution Recipe | `_bmad-output/qa/test-design-qa.md` | ~410 |
| BMAD Handoff | `_bmad-output/qa/test-design/sunnyseat-handoff.md` | ~120 |

### Checklist Validation Summary

- **Prerequisites:** All 4 system-level prerequisites met
- **Process Steps:** All 4 step sections validated (context loading, risk assessment, coverage design, deliverables)
- **Output Validation:** All matrices, execution strategy, resource estimates, quality gates validated
- **Quality Checks:** Evidence-based assessment, accurate risk classification, correct priority assignment, proper test level selection
- **Cross-Document Consistency:** Matching risk IDs (R-01 to R-16), priorities (P0-P3), blockers, dates, references
- **Architecture Doc Validation:** Actionable-first structure, 3-tier Quick Guide, no test code/scripts, ~194 lines
- **QA Doc Validation:** All required sections present, no bloat sections, interval-based estimates
- **BMAD Handoff Validation:** Artifacts inventory, epic/story integration guidance, risk mapping, workflow sequence, phase gates
- **Anti-Bloat Check:** No repeated notes, no excessive detail, professional tone, clear separation (arch=WHAT/WHY, QA=HOW)

### Polish Applied

1. Added week-range timeline to QA effort estimate (~2-3 weeks)
2. Added Playwright parallelization note to execution strategy

### Key Risks Identified

| Risk | Score | Owner |
|------|-------|-------|
| R-01: MapLibre performance on low-end Android | 6 | Rasmus |
| R-02: Shadow accuracy trust erosion | 6 | Rasmus |

### Open Assumptions Requiring Decision

1. **External service mock strategy** — MSW vs Playwright route interception (before first E2E test)
2. **Time determinism** — Date.now() mocks vs precomputed fixtures (before first frontend test)
3. **Database cleanup** — Unique test IDs + cleanup API vs dedicated test venue IDs (before mutating E2E tests)

### Workflow Complete

All 5 steps of the `bmad-testarch-test-design` workflow have been executed in System-Level mode. The three output documents are ready for team review.
