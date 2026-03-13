# Epic 7: Public Launch — Frontend, CI/CD, Testing & SEO

**Duration:** Estimated 3–4 weeks  
**Priority:** Critical Path  
**Status:** 📋 **READY TO START**

**Dependency:** Epic 6 (Platform Migration) — Complete; Sun/shadow engine ported to TypeScript  
**Note:** Vercel deployment is handled by the user outside this epic.

## Epic Goal

Complete the public-facing application and ship it: finish the frontend, modernize CI/CD, achieve adequate test coverage, add SEO/performance foundations, and prepare for production.

## Epic Description

Epics 1–6 established the full platform: sun/shadow engine, weather integration, database, APIs, and the initial home page with map. This epic completes the public user experience and makes the app production-ready. Admin UI, PWA, and monetization are handled in Epics 8 and 9.

**What This Epic Delivers:**

- Complete public frontend (patio detail, venue pages, about page)
- Interactive UI components (PatioCard, SunTimeline, ConfidenceBadge)
- Modern CI/CD pipeline targeting Next.js/Vercel
- Comprehensive test suite (unit, integration, E2E)
- SEO foundations (sitemap, robots, OpenGraph, dynamic metadata)
- Performance optimizations and production environment setup
- Updated documentation and launch checklist

---

## Stories

### Story 7.1: Patio Detail Page & Venue SEO Pages

**Goal:** Build `/patios/[id]` so users can see full sun exposure info for a specific patio.

**Acceptance Criteria:**

1. Route `/patios/[venueId]-[patioId]` renders patio detail page
2. Page shows venue name, patio name, address, and distance from user
3. Current sun status displayed prominently with confidence %
4. Sun exposure timeline shows hourly status for today (8:00–20:00)
5. Tomorrow's sun forecast shown below today's
6. Solar elevation and azimuth shown for current time
7. Weather data (cloud cover, temperature) displayed when available
8. `generateMetadata` produces unique title, description, and OpenGraph per venue
9. Page handles loading and error states gracefully
10. "Back to Map" link navigates to home with preserved search state

---

### Story 7.2: PatioCard, PatioList & Home Page Integration

**Goal:** Add patio listing alongside the map so users can browse patios as a scrollable list.

**Acceptance Criteria:**

1. PatioCard displays venue name, sun status (color-coded), distance, and confidence
2. PatioList renders sorted by distance, with "Sunny" patios promoted to top
3. ConfidenceBadge shows High/Medium/Low with appropriate color
4. EmptyState shown when no patios in radius with helpful message
5. Clicking a PatioCard navigates to `/patios/[id]`
6. Clicking a map marker highlights the corresponding PatioCard in the list
7. Layout is responsive: stacked on mobile, side-by-side on desktop
8. List shows loading skeleton while data is fetching

---

### Story 7.3: SunTimeline Component

**Goal:** Build a reusable sun timeline visualization for hourly sun exposure.

**Acceptance Criteria:**

1. Timeline displays 8:00–20:00 in local Stockholm time
2. Each hour block is color-coded by sun status
3. Current time marked with a vertical indicator line
4. Hovering/tapping a block shows tooltip with exposure % and confidence
5. Mini-timeline variant (compact) available for PatioCard usage
6. Renders gracefully when loading or data unavailable
7. Screen reader labels for each hour block

---

### Story 7.4: About Page & Global Navigation

**Goal:** Add About page and consistent navigation across the app.

**Acceptance Criteria:**

1. About page explains the sun/shadow algorithm in user-friendly terms
2. Data source attributions displayed (Met.no, Lantmäteriet, OSM)
3. Navigation header on all pages with Home and About links
4. Active page visually indicated in navigation
5. Responsive navigation (hamburger on mobile)
6. Footer on all pages with copyright and data attribution
7. Legal disclaimer about accuracy present

---

### Story 7.5: CI/CD — Next.js Build, Test & Deploy Pipeline

**Goal:** Replace .NET/Azure CI/CD with Next.js/Vercel pipeline.

**Acceptance Criteria:**

1. `build-and-test-nextjs.yml` runs on every PR and push to main
2. Workflow runs `type-check`, `lint`, `build`, and `test`
3. Workflow fails if any step fails (blocks merge)
4. Old .NET/Azure workflows archived to `.github/workflows/archived/`
5. `vercel.json` includes cron configuration for scheduled jobs
6. `"test": "vitest run"` script added to `package.json`
7. Preview deployment triggers on PR via Vercel GitHub integration

---

### Story 7.6: E2E Tests with Playwright

**Goal:** Add end-to-end test coverage for critical user flows.

**Acceptance Criteria:**

1. Playwright configured with chromium
2. E2E tests run against local dev server
3. Home page: map renders, patios appear for default location
4. Search: changing location updates results
5. Navigation: clicking patio goes to detail page
6. Detail: sun timeline renders with hourly blocks
7. About: page loads with expected content
8. Health: `/api/health` returns 200
9. All E2E tests pass in CI

---

### Story 7.7: API & Component Unit Tests

**Goal:** Expand unit test coverage for API routes and components.

**Acceptance Criteria:**

1. API route tests use mocked Supabase (no real DB)
2. Component tests verify rendering, props, click handlers
3. Service tests verify calculation logic and error handling
4. Existing skipped tests fixed or documented
5. Coverage report generated (`vitest --coverage`)
6. At least 60% line coverage on `lib/solar/` modules
7. All tests pass in CI

---

### Story 7.8: SEO & Performance Foundations

**Goal:** SEO essentials and performance optimizations for production.

**Acceptance Criteria:**

1. `/sitemap.xml` returns valid XML with all page URLs
2. `/robots.txt` allows crawling with sitemap reference
3. Root layout has OpenGraph image, title, description, Twitter card
4. Patio detail pages have unique OpenGraph metadata
5. MapTiler API key loaded from `NEXT_PUBLIC_MAPTILER_KEY` env var
6. API responses include appropriate Cache-Control headers
7. No hardcoded API keys in source code

---

### Story 7.9: Production Environment & Monitoring

**Goal:** Environment variables, seed data, and monitoring for production.

**Acceptance Criteria:**

1. `.env.example` includes ALL variables: Supabase, JWT, CRON_SECRET, MapTiler, Weather
2. `seed-dev.sql` creates 5+ sample venues with patios and buildings
3. Error monitoring captures unhandled exceptions
4. API routes log method, path, duration, status code
5. `/api/health` returns app version, Supabase status, last weather ingestion
6. `/api/health/ready` returns false if Supabase unreachable
7. README updated with complete setup instructions

---

### Story 7.10: Documentation & Launch Checklist

**Goal:** Align documentation and create launch verification checklist.

**Acceptance Criteria:**

1. README describes current stack: Next.js 16, Supabase, Vercel, TypeScript
2. Setup instructions work end-to-end for new developers
3. References to old .NET/Azure/Docker removed or marked archived
4. Launch checklist covers: Vercel deploy, Supabase config, env vars, DNS, smoke tests
5. Architecture docs reference `lib/solar/` and `lib/weather/`
6. Story status tracking reflects actual implementation state

---

## Story Dependency Graph

```
7.1 (Detail Page)   ───┐
7.2 (Cards/List)    ───┤──→ 7.6 (E2E Tests)
7.3 (SunTimeline)   ───┤
7.4 (Navigation)    ───┘

7.5 (CI/CD)         ──→ 7.6 (E2E Tests) ──→ 7.7 (Unit Tests)

7.8 (SEO/Perf)      ──┐
7.9 (Env/Monitor)   ──┤──→ 7.10 (Docs/Launch)
```

## Epic Definition of Done

- [ ] All 10 stories completed with acceptance criteria met
- [ ] All pages render correctly (Home, Detail, About)
- [ ] CI/CD pipeline runs green on every PR
- [ ] E2E tests pass for critical user flows
- [ ] SEO metadata present on all pages
- [ ] No hardcoded secrets in source code
- [ ] Documentation current and accurate
- [ ] Launch checklist verified
